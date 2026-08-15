import React, { useState } from 'react';

/* the mascot-peek notice's timer. Module scope, not a useRef, on purpose: every hook in this
   file below line ~95 sits AFTER `if (!isAdmin) return (...)`, so each one added there is one
   more conditional hook on a pile eslint already flags ten times. Only one SettingsView is ever
   mounted, so a module-level handle is exactly as correct here and costs no hook at all. */
let capyPeekTimer = null;
/* `TrendingUp` and `Package` went with the tiers conversion: they were the two glyphs stuffed
   inside the old omset/volume select, which is a labelled field now. Removed because THIS change
   orphaned them — no other dead import in this file was touched. */
import { Lock, ShieldCheck, ShieldAlert, UploadCloud, Copy, User, Settings, Trash2, ScanFace, Plus, Tag, Download, Upload, Image as ImageIcon, Edit, Save, X, Music, ChevronLeft, ChevronRight, LayoutDashboard, ToggleLeft, ToggleRight, BarChart2, Store } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';

import LandlordDashboard from './LandlordDashboard';
import CrownTransferProtocol from './CrownTransferProtocol';
import AchievementTester from './AchievementTester';
import CareerDevTools from './CareerDevTools';
import HoldButton from './HoldButton';
import ReceiptPreview from './ReceiptPreview';
import AuthoritySelect from './AuthoritySelect';

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
    /* ⚠️ DECLARED UP HERE, ABOVE `if (!isAdmin) return (...)` on purpose — see the module-level
       timer at the top of the file. Everything below that return is a conditionally-called hook. */
    const [capyOut, setCapyOut] = useState(false);
    /* ⚠️ THE `|| mascotImage` IS A MIGRATION, NOT A DEFAULT — do not "tidy" it away. Until today
       this picture lived at `mascotImage` and doubled as the mascot's face. Anyone who uploaded
       one before the split would otherwise open Settings to an empty watermark and think their
       picture had been thrown away. New crops write `receiptWatermark`, so this fallback goes
       quiet on its own the first time he replaces the image. */
    const watermarkSrc = appSettings?.receiptWatermark || appSettings?.mascotImage;
    /* ⚠️ ABOVE `if (!isAdmin) return (...)` with the others — every hook below that line is a
       conditionally-called one, and this file already has ten. */
    const [showReceiptPreview, setShowReceiptPreview] = useState(false);

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
                {/* ⚠️ THE MEDALLION ABOVE IS LEFT ALONE ON PURPOSE. A black disc with a red lock
                    on it is a PLATE — it reads on cream exactly as it reads on the bench, and its
                    red sits on its own black, not on the page. What could not stay is everything
                    below it: this block sits directly on the PAGE, which now goes pale, so white
                    text and slate text were both invisible the moment light mode came on.
                    (`slate` is also the blue the palette law bans — it was the last of it here.) */}
                <h2 className="text-3xl font-black text-[var(--duke-ink-hi)] uppercase tracking-[0.25em] mb-2 font-mono">Restricted Access</h2>
                <p className="text-[var(--duke-ink-3)] text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed mb-8">Admin Clearance Required</p>
                <button onClick={() => setShowAdminLogin(true)} className="px-10 py-4 border-2 border-[var(--duke-edge-4)] text-[var(--duke-ink-hi)] font-black uppercase text-xs hover:bg-[var(--duke-amber)] hover:text-black transition-all">Unlock System</button>
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

    /* which mascot line the dropdown is pointing at. His call, 2026-08-15: *"for the capybara
       dialogue u might need to make it dropdown menu instead, too many conversation for it"* — a
       scrolling list of every line was taller than the module that held it. */
    const [pickedMsg, setPickedMsg] = useState(0);
    /* clamped on every render, not on delete: removing the last line would otherwise leave the
       index pointing past the end and the next Delete would act on `undefined`. */
    const pick = Math.min(pickedMsg, Math.max(0, activeMessages.length - 1));

    /* ⚠️ HIS SECOND REPORT ON THE SAME FEATURE: *"can u fix the size slider please, it still
       didnt show the mascot when i interact with it"*. Two things were wrong with the first
       attempt, and this is both fixes.

       ONE — ORDER. The dispatch was the LAST statement in the slider's onChange, behind
       `setDoc(doc(...))`. `doc()` throws SYNCHRONOUSLY on a malformed path, and `user.uid` is
       not guaranteed at every render — so any throw there killed the handler before the mascot
       was ever called, while `setAppSettings` had already run one line earlier. That is his
       symptom exactly: the number moves, the mascot never hears about it. The call now goes
       FIRST and nothing can get in front of it.

       TWO — HE HAD NO WAY TO KNOW WHERE TO LOOK. The mascot appears in the BOTTOM-RIGHT CORNER
       of the window, and the slider is in the middle of a long settings page — on a desktop
       browser that can be several hundred pixels away and outside where his eyes are. This
       line says he was called and where he went, which is his own law ("every action must
       report") and also settles the question if it still looks broken: **if this line appears
       and no capybara does, the event fired and the fault is in the mascot, not the slider.** */
    const callMascot = () => {
        window.dispatchEvent(new CustomEvent('CAPY_COMMS', { detail: { peek: 5000 } }));
        setCapyOut(true);
        clearTimeout(capyPeekTimer);
        // matches the 5000 above, so the notice and the mascot leave together
        capyPeekTimer = setTimeout(() => setCapyOut(false), 5000);
    };

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
          
          {/* ── THE COMMAND CENTER HEADER ─────────────────────────────────────────────────
              His screenshot (sc2). The clearance line pulsed in red forever, which is the
              always-on red he ruled out — *"i dont want red color to dominate certain
              features of the app"* — and a fact does not need to blink to stay true. Lock
              Terminal was the only red thing that had a claim to it and it was the same red
              as everything else, so nothing stood out. Amber now marks the ACT; red is left
              for the clearance line, where it is one short line of text and not a fill. */}
          <div className="kpm-cmd">
              <div>
                  <h2>Command Center</h2>
                  <p className={`clearance ${isSystemOwner ? 'tier1' : ''}`}>
                      {isSystemOwner ? 'Clearance: Tier 1 (Overseer)' : 'Clearance: Tier 2 (Manager)'}
                  </p>
              </div>
              <div className="kpm-acts">
                  <button type="button" onClick={handleResetIndicators} className="kpm-btn">
                      Reset indicators
                  </button>
                  {/* ⚠️ AMBER, NOT RED. Locking the terminal PROTECTS the app — it is the
                      opposite of destructive, and red here taught the eye that red means
                      "important" rather than "this cannot be undone". */}
                  <button type="button" onClick={handleAdminLogout} className="kpm-btn key">
                      Lock terminal
                  </button>
              </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
              {/* ── THE TAB LIST (sc1) ────────────────────────────────────────────────────
                  The open tab was a `bg-blue-600` pill: the palette law's headline example,
                  in the most-looked-at spot on the screen. It also carried `shadow-md` — and
                  Lite Mode strips shadow, so there the ONLY thing telling the open tab from
                  the closed ones vanished completely.
                  Selection is material first now: the open row comes forward onto `--raised`
                  and grows a rail the flat rows do not have. Strip every colour and it is
                  still obviously the open row. `aria-current` carries the state to a screen
                  reader AND drives the CSS, so the two can never disagree. */}
              <div className="w-full md:w-56 shrink-0 kpm-nav">
                  {navTabs.map(tab => (
                      <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          aria-current={activeTab === tab.id ? 'page' : undefined}
                          className={tab.id === 'architect' ? 'tier1' : undefined}
                      >
                          {tab.icon}
                          <span>{tab.label}</span>
                      </button>
                  ))}
              </div>

              <div className="flex-1 min-w-0 space-y-6">

                  {/* ---------------------------------------------------- */}
                  {/* WORKSPACE: GENERAL & BRAND */}
                  {/* ---------------------------------------------------- */}
                  {activeTab === 'general' && (
                      /* THE RACK, THIRD TAB. Conversion, not redesign — his instruction: *"we have
                         the theme set yet, other will just follow"*. Grouped by consequence like
                         Security: what only this device sees, then what the whole company sees. */
                      <div className="animate-fade-in">

                          <div className="kpm-band">This device · nothing here leaves the phone</div>

                          {/* ⚠️ ONE WRITER (`writeLiteMode`), and both positions drawn. The old
                              toggle asked him to remember which way "on" pointed on a setting whose
                              whole job is to be found by someone whose phone is struggling. */}
                          <div className="kpm-mod bench">
                              <div className="kpm-head">
                                  <span className="slot">Device · 01</span>
                                  <div className="line">
                                      <h3>Graphics</h3>
                                      <span className={`kpm-read ${isLiteMode ? 'on' : ''}`}>{isLiteMode ? 'Lite' : 'Full'}</span>
                                  </div>
                                  <p className="kpm-desc">
                                      <b>Lite</b> drops blur, animation and the heavy effects so a cheap phone stays
                                      quick and the battery lasts. Nothing is hidden and no data changes — it is only
                                      how this one device draws the app.
                                  </p>
                              </div>
                              <div className="kpm-shelf split">
                                  <div className="kpm-switch" role="group" aria-label="Graphics mode">
                                      <button type="button" aria-pressed={!isLiteMode}
                                          onClick={() => writeLiteMode(false, { setIsLiteMode, triggerCapy })}>Full</button>
                                      <button type="button" aria-pressed={!!isLiteMode}
                                          onClick={() => writeLiteMode(true, { setIsLiteMode, triggerCapy })}>Lite</button>
                                  </div>
                              </div>
                          </div>

                          <div className="kpm-band">Company · printed on every invoice you hand out</div>

                          <div className="kpm-mod live">
                              <div className="kpm-head">
                                  <span className="slot">Company · 01</span>
                                  <div className="line">
                                      <h3>Letterhead</h3>
                                      <span className="kpm-read">Save to apply</span>
                                  </div>
                                  <p className="kpm-desc">
                                      The name, address and number printed at the top of every nota. These three wait
                                      for <b>Save</b>; the two below save the moment you stop typing.
                                  </p>
                              </div>
                              <div className="kpm-shelf split">
                                  <label className="kpm-field">
                                      <span>Company name</span>
                                      <input value={editCompanyProfile.name} onChange={e => setEditCompanyProfile({...editCompanyProfile, name: e.target.value})}/>
                                  </label>
                                  <label className="kpm-field">
                                      <span>Official address</span>
                                      <input value={editCompanyProfile.address} onChange={e => setEditCompanyProfile({...editCompanyProfile, address: e.target.value})} placeholder="Jl. Jendral Sudirman No.123, Jakarta"/>
                                  </label>
                                  <label className="kpm-field">
                                      <span>Contact number</span>
                                      <input value={editCompanyProfile.phone} onChange={e => setEditCompanyProfile({...editCompanyProfile, phone: e.target.value})} placeholder="(021) 1234567"/>
                                  </label>
                                  <div className="kpm-acts">
                                      <button type="button" className="kpm-btn key" onClick={handleSaveCompanyProfile}>Save letterhead</button>
                                  </div>
                              </div>
                          </div>

                          <div className="kpm-mod live">
                              <div className="kpm-head">
                                  <span className="slot">Company · 02</span>
                                  <div className="line">
                                      <h3>Signature &amp; bank</h3>
                                      <span className="kpm-read on">Saves as you type</span>
                                  </div>
                                  <p className="kpm-desc">
                                      Who the nota is signed by, and where customers send the money. Both are written
                                      the moment you change them — there is no Save button and none is needed.
                                  </p>
                              </div>
                              <div className="kpm-shelf split">
                                  <label className="kpm-field">
                                      <span>Signed by</span>
                                      <input value={appSettings.adminDisplayName || ''}
                                          onChange={(e) => {
                                              const val = e.target.value;
                                              setAppSettings(prev => ({...prev, adminDisplayName: val}));
                                              if (user) setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { adminDisplayName: val }, {merge: true});
                                          }}
                                          placeholder="Abednego YB"/>
                                  </label>
                                  <label className="kpm-field">
                                      <span>Bank details · invoice footer</span>
                                      <textarea rows={3} value={appSettings.bankDetails || ''}
                                          onChange={(e) => {
                                              const val = e.target.value;
                                              setAppSettings(prev => ({...prev, bankDetails: val}));
                                              if (user) setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { bankDetails: val }, {merge: true});
                                          }}
                                          placeholder={"BCA 0301138379\nA/N ABEDNEGO YB"}/>
                                  </label>
                              </div>
                          </div>

                          {/* 📍 IT SITS HERE ON HIS INSTRUCTION, 2026-08-15: *"i want u to move the
                              watermark panel just below the signature and bank panel"*. It belongs to
                              this band and not to the Mascot band it came from — everything under
                              "Company" is a thing that ends up printed on a nota, and the watermark is
                              now exactly that. It was the mascot's picture until today; see the note in
                              App.jsx on why the two were split. */}
                          <div className="kpm-mod live">
                              <div className="kpm-head">
                                  <span className="slot">Company · 03</span>
                                  <div className="line">
                                      <h3>Receipt watermark</h3>
                                      <span className={`kpm-read ${watermarkSrc ? 'on' : ''}`}>{watermarkSrc ? 'Set' : 'None'}</span>
                                  </div>
                                  <p className="kpm-desc">
                                      A small mark printed in the bottom corner of the A4 nota. You crop it after
                                      choosing, so it does not matter how the photo is framed. Leave it empty and
                                      nothing is printed — the nota is unchanged.
                                  </p>
                              </div>
                              <div className="kpm-shelf split">
                                  <div className="kpm-portrait">
                                      {/* only when there IS one. A stand-in picture here would promise a mark
                                          that never prints, which is worse than an empty frame. */}
                                      {watermarkSrc && <img alt="Current receipt watermark" src={watermarkSrc} />}
                                      <div className="kpm-acts">
                                          <label className="kpm-btn">
                                              {watermarkSrc ? 'Replace' : 'Choose'} &amp; crop
                                              <input type="file" accept="image/*" onChange={handleMascotSelect} className="hidden" />
                                          </label>
                                      </div>
                                  </div>
                              </div>
                              {/* 📍 HIS ASK, 2026-08-15: *"can u add view receipt button just below the
                                  mascot watermark photo panel?"* — its own shelf under the picker, because
                                  the question it answers belongs to the picker: is the mark in the right
                                  place and the right weight? Checking that used to mean leaving Settings
                                  to hunt down a real transaction, or printing a page to find out.
                                  It stays enabled with no picture set: the preview then shows the empty
                                  corner and says so, which is a real answer to "where would it go?". */}
                              <div className="kpm-shelf split">
                                  <div className="kpm-acts">
                                      <button type="button" className="kpm-btn" onClick={() => setShowReceiptPreview(true)}>
                                          View receipt
                                      </button>
                                  </div>
                              </div>
                              {/* rendered right here rather than at the bottom of the file: it portals to
                                  <body> itself, so its position in the tree costs nothing and keeping it
                                  beside its button is one less thing to find later. */}
                              {showReceiptPreview && (
                                  <ReceiptPreview appSettings={appSettings} editCompanyProfile={editCompanyProfile}
                                      onClose={() => setShowReceiptPreview(false)} />
                              )}
                          </div>

                          {/* 🚀 TIER 1 ONLY. This one charges a salesman real money, so it gets its
                              own module and says so, instead of hiding under a divider inside the
                              letterhead card where it read as one more invoice field. */}
                          {isSystemOwner && (
                              <div className="kpm-mod live">
                                  <div className="kpm-head">
                                      <span className="slot">Company · 04</span>
                                      <div className="line">
                                          <h3>Lost pita cukai fine</h3>
                                          <span className="kpm-read on">Charges salesmen</span>
                                      </div>
                                      <p className="kpm-desc">
                                          What a salesman is charged for every tax stamp that goes missing. This comes
                                          out of a real person's pay, so it is Tier 1 only and it saves immediately.
                                      </p>
                                  </div>
                                  <div className="kpm-shelf split">
                                      <label className="kpm-field">
                                          <span>Rupiah per stamp</span>
                                          <input type="number" min="0" value={appSettings?.cukaiFinePrice || 5000}
                                              onChange={(e) => {
                                                  const val = parseInt(e.target.value) || 0;
                                                  setAppSettings(prev => ({...prev, cukaiFinePrice: val}));
                                                  if (user) setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { cukaiFinePrice: val }, {merge: true});
                                              }}
                                              placeholder="5000"/>
                                      </label>
                                  </div>
                              </div>
                          )}

                          <div className="kpm-band">Mascot · the face and the lines it says</div>

                          <div className="kpm-mod live">
                              <div className="kpm-head">
                                  <span className="slot">Mascot · 01</span>
                                  <div className="line">
                                      <h3>Size</h3>
                                      <span className="kpm-read on">{appSettings.mascotScale || 1}&times;</span>
                                  </div>
                                  <p className="kpm-desc">How big the mascot is drawn on screen. Saves as you drag, and he steps out for five seconds so you can see the size you picked.</p>
                              </div>
                              <div className="kpm-shelf split">
                                  <label className="kpm-field">
                                      <span>Scale · 0.5&times; to 2&times;</span>
                                      <input type="range" min="0.5" max="2.0" step="0.1" className="kpm-slider"
                                          value={appSettings.mascotScale || 1}
                                          /* HIS REPORT that made this necessary: *"slider moved but mascot
                                             still not showing"*. The mascot is rendered app-wide and its
                                             gate IS open here — but it spends almost all of its life parked
                                             off-screen right at opacity 0, appearing only on its own 90-210s
                                             timer. Sizing something invisible is guesswork, so the slider
                                             now calls him out. `peek` with no `message`: no bubble, no
                                             talking sprite, just the idle animation he asked for.
                                             ⚠️ `callMascot()` IS DELIBERATELY THE FIRST STATEMENT — see the
                                             note where it is defined. Behind the Firestore write it could be
                                             skipped by a synchronous throw, which is what broke it once. */
                                          onChange={(e) => { callMascot(); const scale = parseFloat(e.target.value); setAppSettings(prev => ({ ...prev, mascotScale: scale })); setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { mascotScale: scale }, { merge: true }); }}/>
                                  </label>
                              </div>
                              {/* tells him WHERE the mascot went. He is fixed to the bottom-right of the
                                  window, which on a desktop is a long way from this slider. */}
                              {capyOut && (
                                  <div className="kpm-shelf split">
                                      <span className="kpm-read on">Mr. Capy is out — bottom-right corner of the screen</span>
                                  </div>
                              )}
                          </div>

                          {/* ⚠️ the delete stays an ICON with `data-kpm-del` — it sits in a cramped
                              row, not a record's action strip, so the expanding control is what
                              gives it a label. A worded button here would not fit at 375px. */}
                          <div className="kpm-mod live">
                              <div className="kpm-head">
                                  <span className="slot">Mascot · 02</span>
                                  <div className="line">
                                      <h3>Dialogue</h3>
                                      <span className={`kpm-read ${activeMessages.length ? 'on' : ''}`}>{activeMessages.length} line{activeMessages.length === 1 ? '' : 's'}</span>
                                  </div>
                                  <p className="kpm-desc">What the mascot says. One is picked at random each time it speaks.</p>
                              </div>
                              <div className="kpm-shelf split">
                                  <label className="kpm-field">
                                      <span>New line</span>
                                      <input placeholder="Type a message…" value={newMascotMessage}
                                          onChange={(e) => setNewMascotMessage(e.target.value)}
                                          onKeyDown={(e) => e.key === 'Enter' && handleAddMascotMessage()}/>
                                  </label>
                                  <div className="kpm-acts">
                                      <button type="button" className="kpm-btn key" onClick={handleAddMascotMessage}>Add line</button>
                                  </div>
                                  {/* 🔑 A DROPDOWN, NOT A LIST. His call: *"too many conversation for
                                      it"* — every line rendered as its own row, so the module grew
                                      without limit and needed an inner scrollbar to survive, which
                                      is the one thing he has banned twice. One picker plus two acts
                                      is a fixed height no matter how many lines he writes.
                                      ⚠️ "Delete" carries its own word now, so it must NOT wear
                                      `data-kpm-del` — that marker prints the label a second time. */}
                                  {activeMessages.length > 0 && (editingMsgIndex >= 0 ? (
                                      <>
                                          <label className="kpm-field">
                                              <span>Editing line {editingMsgIndex + 1} of {activeMessages.length}</span>
                                              <input autoFocus value={editMsgText}
                                                  onChange={(e) => setEditMsgText(e.target.value)}
                                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEditedMessage(editingMsgIndex)}/>
                                          </label>
                                          <div className="kpm-acts">
                                              <button type="button" className="kpm-btn" onClick={() => setEditingMsgIndex(-1)}>Cancel</button>
                                              <button type="button" className="kpm-btn key" onClick={() => handleSaveEditedMessage(editingMsgIndex)}>Save line</button>
                                          </div>
                                      </>
                                  ) : (
                                      <>
                                          <label className="kpm-field">
                                              <span>Existing lines · pick one to change</span>
                                              <select value={pick} onChange={(e) => setPickedMsg(Number(e.target.value))}>
                                                  {activeMessages.map((msg, idx) => (
                                                      <option key={idx} value={idx}>{msg}</option>
                                                  ))}
                                              </select>
                                          </label>
                                          <div className="kpm-acts">
                                              <button type="button" className="kpm-btn hazard"
                                                  onClick={() => handleDeleteMascotMessage(activeMessages[pick])}>Delete</button>
                                              <button type="button" className="kpm-btn"
                                                  onClick={() => { setEditingMsgIndex(pick); setEditMsgText(activeMessages[pick]); }}>Edit</button>
                                          </div>
                                      </>
                                  ))}
                              </div>
                          </div>

                      </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* WORKSPACE: TIERS & LOGIC */}
                  {/* ---------------------------------------------------- */}
                  {activeTab === 'tiers' && (
                      /* THE RACK, FOURTH AND LAST TAB. Conversion, not redesign — his instruction:
                         *"we have the theme set yet, other will just follow make it somewhat follow
                         that"*. Grouped by consequence like the three before it: what a customer
                         wears, then what a whole company is allowed to do, then the automation that
                         moves people between ranks on its own. */
                      <div className="animate-fade-in">

                          <div className="kpm-band">Ranks · the badge a customer wears on the map</div>

                          <div className="kpm-mod live">
                              <div className="kpm-head">
                                  <span className="slot">Rank · 01</span>
                                  <div className="line">
                                      <h3>Customer tiers</h3>
                                      <span className="kpm-read on">{tierSettings.length} defined</span>
                                  </div>
                                  <p className="kpm-desc">
                                      One line each: <b>badge · colour · name · kind</b>. The colour is the customer's
                                      pin on the map and the badge sits beside it. Everything saves the moment you
                                      change it — there is no Save button.
                                  </p>
                              </div>
                              <div className="kpm-shelf split">
                                  <div className="kpm-acts">
                                      <button type="button" onClick={() => {
                                          const hasUnranked = tierSettings.some(t => t.id.toLowerCase() === 'unranked');
                                          /* ⚠️ THESE TWO ARE DATA, NOT STYLING — the colour a new rank is BORN with,
                                             and Aldi can change either one in the picker straight afterwards. They
                                             were slate-600 and slate-400, which is the blue the palette law bans, so
                                             a rank created today started off-palette until someone noticed. Warm
                                             mid-browns instead: both read as a swatch on the bench AND on cream,
                                             which a colour picked for one theme would not. */
                                          const newTier = !hasUnranked
                                              ? { id: 'Unranked', label: 'Unranked', color: '#6b5a40', iconType: 'emoji', value: '🪵' }
                                              : { id: `Tier_${Date.now()}`, label: 'New Rank', color: '#a89070', iconType: 'emoji', value: '❓' };

                                          const newTiers = [...tierSettings, newTier];
                                          setTierSettings(newTiers);
                                          handleSaveTiers(newTiers);
                                      }} className="kpm-btn key">
                                          <Plus size={14}/> Add tier
                                      </button>
                                      {/* ⚠️ WORDS, NOT BARE ICONS. A lone download glyph and a lone upload glyph
                                          sat side by side here and were indistinguishable at a glance — and one
                                          of them REPLACES every tier you have. */}
                                      <button type="button" onClick={handleExportTiers} className="kpm-btn"><Download size={14}/> Export</button>
                                      <label className="kpm-btn"><Upload size={14}/> Import
                                          <input type="file" accept=".json" onChange={handleImportTiers} className="hidden" />
                                      </label>
                                  </div>
                              </div>
                              {/* 🚫 NO `min-w-[650px]` AND NO INNER SCROLLBAR. The row was a fixed 650px sled
                                  that a phone could only reach by dragging sideways — the pattern he has
                                  rejected twice. Each tier is a record now and its fields wrap. */}
                              <div className="kpm-shelf split">
                                  {tierSettings.map((tier, idx) => (
                                      /* 📏 ONE LINE PER RANK. His report, 2026-08-15: *"customer tier panel is
                                         too large, better redesign it to make it smaller compact
                                         minimalistic"*. It was a stacked record per rank — five labelled
                                         fields and a full action strip — so six ranks filled a screen and a
                                         half to edit six words and six colours.
                                         A rank is really four small facts: a colour, a name, what kind of
                                         badge, and the badge itself. They fit on one row, and the labels
                                         that explained them go to the caption line above, said once, instead
                                         of being repeated six times down the panel. */
                                      <div key={tier.id || idx} className="kpm-rank">
                                          <div className="kpm-swatch sm" style={{ borderColor: tier.color }}>
                                              {tier.iconType === 'image'
                                                  ? (tier.value ? <img src={tier.value} alt="" /> : <ImageIcon size={12} className="opacity-30"/>)
                                                  : <span>{tier.value}</span>}
                                          </div>
                                          {/* ⚠️ `type="color"` KEEPS ITS OWN CHROME and takes no token. That is
                                              correct: it is the operating system's picker, and the value it
                                              returns is the customer's real pin colour, which by definition is
                                              not on this palette. */}
                                          <input type="color" value={tier.color} className="kpm-swatch-input" aria-label={`Pin colour for ${tier.label}`}
                                              onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].color = e.target.value; handleSaveTiers(newTiers); }} />
                                          <input className="kpm-inline name" value={tier.label} aria-label="Rank name"
                                              onChange={(e) => {
                                                  const newTiers = [...tierSettings];
                                                  newTiers[idx].label = e.target.value;
                                                  if (tier.id.startsWith('Tier_')) newTiers[idx].id = e.target.value.replace(/\s+/g, '_');
                                                  setTierSettings(newTiers);
                                              }}
                                              onBlur={() => handleSaveTiers(tierSettings)} />
                                          <select className="kpm-inline kind" value={tier.iconType} aria-label="Badge kind"
                                              onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].iconType = e.target.value; handleSaveTiers(newTiers); }}>
                                              <option value="emoji">Emoji</option>
                                              <option value="image">Logo</option>
                                          </select>
                                          {tier.iconType === 'image' ? (
                                              <label className="kpm-btn" htmlFor={`tier-upload-${idx}`}>
                                                  <Upload size={12}/> {tier.value?.startsWith('data:') ? 'Change' : 'Upload'}
                                                  <input id={`tier-upload-${idx}`} type="file" accept="image/*" className="hidden"
                                                      onChange={(e) => handleTierIconSelect(e, idx)} />
                                              </label>
                                          ) : (
                                              <input className="kpm-inline badge" value={tier.value} placeholder="Emoji" aria-label="Badge emoji"
                                                  onChange={(e) => { const newTiers = [...tierSettings]; newTiers[idx].value = e.target.value; handleSaveTiers(newTiers); }} />
                                          )}
                                          {/* the delete goes back to the icon-and-sweep — a one-line row has no
                                              room for a word, which is exactly what `data-kpm-del` is for, and
                                              the confirm dialog still names the rank before anything happens */}
                                          <div className="kpm-rowacts">
                                              <button data-kpm-del data-label="Delete" type="button" title={`Delete ${tier.label}`}
                                                  onClick={async () => {
                                                      if(await confirmAction(`Are you sure you want to delete the tier: ${tier.label}?`)) {
                                                          const newTiers = tierSettings.filter((_, i) => i !== idx);
                                                          setTierSettings(newTiers);
                                                          handleSaveTiers(newTiers);
                                                      }
                                                  }}>
                                                  <Trash2 size={14}/>
                                              </button>
                                          </div>
                                      </div>
                                  ))}
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
                              <>
                              <div className="kpm-band">Company · what everyone under you is allowed to do</div>

                              <div className="kpm-mod live">
                                  <div className="kpm-head">
                                      <span className="slot">Company · 01</span>
                                      <div className="line">
                                          <h3>Fleet paintbrush</h3>
                                          {/* the STATE, which is what amber is for. It was a glowing orange toggle
                                              plus an orange panel plus orange heading text — three things saying
                                              one thing, on a screen where nothing else was allowed to speak. */}
                                          <span className={`kpm-read ${appSettings.enableFleetPaintbrush !== false ? 'on' : ''}`}>
                                              {appSettings.enableFleetPaintbrush !== false ? 'On' : 'Off'}
                                          </span>
                                      </div>
                                      <p className="kpm-desc">
                                          When on, Tier 1-4 (Developer, Company Owner, Area Admin, Fleet Captain) can paint
                                          squad colours and map boundaries on Journey Plan. When off it is hidden for
                                          everyone, whatever their tier.
                                      </p>
                                  </div>
                                  <div className="kpm-shelf split">
                                      <div className="kpm-acts">
                                          {/* ⚠️ A BUTTON THAT SAYS WHAT PRESSING IT DOES, not a toggle glyph that
                                              only shows where it currently is. The readout above already carries
                                              the state; a switch repeating it left the act unnamed. */}
                                          <button type="button" className="kpm-btn"
                                              onClick={() => {
                                                  const newVal = !(appSettings.enableFleetPaintbrush !== false);
                                                  setAppSettings(prev => ({ ...prev, enableFleetPaintbrush: newVal }));
                                                  if (user) setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/settings/general`), { enableFleetPaintbrush: newVal }, { merge: true });
                                                  triggerCapy(newVal ? "Fleet Paintbrush Enabled for Tier 1-4! 🖌️" : "Fleet Paintbrush Disabled Company-Wide.");
                                              }}>
                                              {appSettings.enableFleetPaintbrush !== false
                                                  ? <><ToggleRight size={14}/> Turn it off</>
                                                  : <><ToggleLeft size={14}/> Turn it on</>}
                                          </button>
                                      </div>
                                  </div>
                              </div>
                              </>
                          )}

                          {/* AUTOMATED PERFORMANCE TIERS (TIER 1 OVERSEER ONLY) */}
                          {isSystemOwner && (
                              <>
                              {/* 🚀 TIER 1 ONLY, and the band says so rather than a red panel implying it.
                                  These rules PROMOTE AND DEMOTE REAL CUSTOMERS on their own, with nobody
                                  pressing anything — which is why this is the one group on the tab that
                                  earns the hazard mark. */}
                              <div className="kpm-band hazard">Automatic · moves customers between ranks without asking</div>

                              <div className="kpm-mod hazard">
                                  <div className="kpm-head">
                                      <span className="slot">Automatic · 01</span>
                                      <div className="line">
                                          <h3>Performance tier logic</h3>
                                          <span className="kpm-read alert">Tier 1 only</span>
                                      </div>
                                      <p className="kpm-desc">
                                          What a customer has to buy to hold each rank. Unlike the rest of this tab these
                                          wait for <b>Save logic</b> — a half-typed target that promoted people the
                                          moment you paused would be worse than a button.
                                      </p>
                                  </div>

                                  {tierSettings.map((tier) => {
                                      const rule = tierRules[tier.id] || defaultLogic;
                                      const isOmset = rule.type === 'omset';

                                      return (
                                          <div key={tier.id} className="kpm-shelf split">
                                              <div className="kpm-rec">
                                                  <div className="who kpm-line">
                                                      {/* the tier's own colour, which is customer data and not on this
                                                          palette — same reason the picker above keeps its native chrome */}
                                                      <b><span className="kpm-dot" style={{ backgroundColor: tier.color }}></span> {tier.label}</b>
                                                      <code>{isOmset ? 'by money spent' : 'by volume bought'}</code>
                                                  </div>
                                                  <div className="kpm-shelf">
                                                      <label className="kpm-field">
                                                          <span>Measured by</span>
                                                          <select value={rule.type} onChange={(e) => handleUpdateTierRule(tier.id, 'type', e.target.value)}>
                                                              <option value="omset">Total omset</option>
                                                              <option value="volume">Total volume</option>
                                                          </select>
                                                      </label>
                                                      {isOmset ? (
                                                          <label className="kpm-field">
                                                              <span>Target · rupiah</span>
                                                              <input type="text" inputMode="numeric"
                                                                  value={rule.omsetTarget === '' ? '' : new Intl.NumberFormat('en-US').format(rule.omsetTarget || 0)}
                                                                  onChange={(e) => {
                                                                      const val = e.target.value.replace(/[^0-9]/g, '');
                                                                      handleUpdateTierRule(tier.id, 'omsetTarget', val === '' ? '' : Number(val));
                                                                  }} />
                                                          </label>
                                                      ) : (
                                                          <>
                                                          <label className="kpm-field">
                                                              <span>Target · quantity</span>
                                                              <input type="text" inputMode="numeric"
                                                                  value={rule.volumeTarget === '' ? '' : new Intl.NumberFormat('en-US').format(rule.volumeTarget || 0)}
                                                                  onChange={(e) => {
                                                                      const val = e.target.value.replace(/[^0-9]/g, '');
                                                                      handleUpdateTierRule(tier.id, 'volumeTarget', val === '' ? '' : Number(val));
                                                                  }} />
                                                          </label>
                                                          <label className="kpm-field">
                                                              <span>Counted in</span>
                                                              <select value={rule.volumeUnit} onChange={(e) => handleUpdateTierRule(tier.id, 'volumeUnit', e.target.value)}>
                                                                  <option value="Bks">Bks</option>
                                                                  <option value="Slop">Slop</option>
                                                                  <option value="Bal">Bal</option>
                                                                  <option value="Karton">Karton</option>
                                                              </select>
                                                          </label>
                                                          </>
                                                      )}
                                                      <label className="kpm-field">
                                                          <span>Within</span>
                                                          <select value={rule.timeframe} onChange={(e) => handleUpdateTierRule(tier.id, 'timeframe', e.target.value)}>
                                                              <option value="30">1 Bulan</option>
                                                              <option value="90">3 Bulan</option>
                                                              <option value="180">6 Bulan</option>
                                                              <option value="365">1 Tahun</option>
                                                          </select>
                                                      </label>
                                                  </div>
                                              </div>
                                          </div>
                                      );
                                  })}

                                  {/* the Save sits at the BOTTOM, after the rules it commits — it used to be in
                                      the header, above everything it applies to */}
                                  <div className="kpm-shelf split">
                                      <div className="kpm-acts">
                                          <button type="button" className="kpm-btn key" onClick={handleSaveTierRules} disabled={isSavingTierRules}>
                                              <Save size={14} /> {isSavingTierRules ? 'Saving…' : 'Save logic'}
                                          </button>
                                      </div>
                                  </div>
                              </div>
                              </>
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

/* ONE WRITER for the graphics mode. Device-local, so there is no Firestore write here — but the
   two-position switch still needs a single function behind both buttons for the same reason as the
   others: two copies of a write drift, and the one that drifts is always the one nobody tests. */
const writeLiteMode = (newVal, { setIsLiteMode, triggerCapy }) => {
    setIsLiteMode(newVal);
    triggerCapy(newVal
        ? "Lite mode on. Blur and animation off, battery saved. ⚡"
        : "Full graphics restored.");
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

    /* ⚠️ ONE LIST EACH, USED BY BOTH THE PHONE AND THE DESKTOP. There used to be two copies of
       every option with different wording, which is how two lines came to read "Global (default)"
       in one of them and not the other. `short` is what fits in a rank column; `label` is the
       whole sentence, and the open list is wide enough to hold it — that is the point of drawing
       the list ourselves instead of letting the OS draw it. */
    const CUSTOMER_ACCESS_OPTIONS = [
        { value: 'customers_edit_global',     short: 'Global',     label: 'Global — edit any customer (default)' },
        { value: 'customers_edit_own_region', short: 'Own region', label: 'Own region only — edit customers in their own region' },
        { value: 'customers_view_only',       short: 'View only',  label: 'View only — can look, cannot edit' },
    ];
    /* ⚠️ 'none' IS A REAL CHOICE HERE AND A FORBIDDEN ONE ABOVE. Reporting really can be switched
       off; customer access cannot, because an unset tier resolves to Global. */
    const REPORT_ACCESS_OPTIONS = [
        { value: 'none',                  short: 'No access', label: 'No access — reports stay hidden' },
        { value: 'view_reports_personal', short: 'Personal',  label: 'Lone Wolf — their own numbers only' },
        { value: 'view_reports_regional', short: 'Regional',  label: 'Regional Command — their branch' },
        { value: 'view_reports_global',   short: 'Global',    label: 'God Mode — the global master data' },
    ];

    const togglePermission = (tierId, featureId) => {
        const newMatrix = { ...matrix };
        const tierPerms = [...(newMatrix[tierId] || [])];
        if (tierPerms.includes(featureId)) newMatrix[tierId] = tierPerms.filter(f => f !== featureId);
        else newMatrix[tierId] = [...tierPerms, featureId];
        setMatrix(newMatrix);
    };

    // 🚀 CUSTOMER DIRECTORY ACCESS.
    // ⚠️ THIS DROPDOWN HAS NO "not set" LINE, AND MUST NEVER GET ONE BACK. An absent
    // customer-edit permission is NOT a locked-out state: config/permissions.js's
    // getCustomerAccessLevel() returns 'global' when it finds none of the three, so "never set"
    // and "Global" are ONE state wearing two names. Listing both put two identical lines in the
    // menu — his find, 2026-08-15: *"there is 2 default here"*, and the second was unreachable.
    // ⚠️ THE FIX IS ON THE READ SIDE, NOT THE MENU. Each <select> below now falls back to
    // 'customers_edit_global', so a tier that was never set lands ON the Global line. Deleting
    // the duplicate <option> alone would have left every unset tier valued at a choice that no
    // longer exists — a blank box on the screen that decides who may edit customers.
    // Reporting Authority's 'none' is a DIFFERENT thing: there it really means no access, which
    // is why that dropdown keeps its option and this one does not.
    // The 'none' guard below stays as a floor: if that value ever reaches here again it must
    // clear the permission, never be pushed into the array as a permission named "none".
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
        /* ⚠️ NO `color:` ANY MORE. It held a raw Tailwind class ('text-cyan-400') and the matrix
           painted each rank's name in it — which is how purple, yellow, cyan and emerald rank
           labels were on this screen at once, none of them from the palette. The conversion
           stopped rendering it, so THIS change orphaned the field and it goes with it.
           Nothing reads `.color` on a permission tier anywhere in the app (the map's pin colour
           is `tierSettings`, a different list, and that one is real customer data and stays).
           Seeded tiers in permissions.js still carry the field; it is inert there too. */
        const newTiers = [...tiers, { id: newId, label: `T${tiers.length + 2}: ${name.toUpperCase().trim()}` }];
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
        <>
        {/* ⚠️ HAZARD, AND IT IS THE MOST EARNED HAZARD MARK IN THE APP. Everything else red
            marks destroys DATA; this decides who is allowed to. A wrong toggle here hands a
            salesman the power to edit any customer in the country, and nothing about the app
            will look broken afterwards. */}
        <div className="kpm-band hazard">Authority · who is allowed to do what, company-wide</div>

        <div className="kpm-mod hazard">
            <div className="kpm-head">
                <span className="slot">Authority · 01</span>
                <div className="line">
                    <h3>Global permission matrix</h3>
                    <span className="kpm-read alert">Tier 1 only</span>
                </div>
                <p className="kpm-desc">
                    Every rank below Tier 1, and what each one can reach. On a phone, pick a rank and
                    work down its list; on a wide screen the whole grid is here and the column headers
                    drag to reorder the hierarchy. <b>Nothing is live until you press Deploy.</b>
                </p>
            </div>

            {/* ========================================= */}
            {/* 📱 MOBILE VIEW (Hidden on large screens)  */}
            {/* ========================================= */}
            <div className="block lg:hidden">
                {/* the rank strip. A snapping chip row, NOT a content list — this is the phone's
                    equivalent of the desktop table's column headers, and panning a tab strip is
                    the point of it rather than a workaround for a cramped layout. */}
                <div className="kpm-shelf split">
                    <div className="kpm-chips">
                        {tiers.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                aria-pressed={activeMobileTierId === t.id}
                                onClick={() => setActiveMobileTierId(t.id)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active Tier Controls */}
                {activeTier && (
                    <div className="kpm-shelf split">
                        <div className="kpm-rec">
                            <div className="who kpm-line">
                                <b>{activeTier.label}</b>
                                <code>rank {activeTierIdx + 1} of {tiers.length}</code>
                            </div>
                            <div className="acts">
                                <button type="button" className="kpm-btn" onClick={() => handleShiftTier(activeTier.id, -1)} disabled={activeTierIdx === 0}>
                                    <ChevronLeft size={14}/> Up
                                </button>
                                <button type="button" className="kpm-btn" onClick={() => handleShiftTier(activeTier.id, 1)} disabled={activeTierIdx === tiers.length - 1}>
                                    <ChevronRight size={14}/> Down
                                </button>
                                <button type="button" className="kpm-btn" onClick={() => handleRenameTier(activeTier.id)}>
                                    <Edit size={14}/> Rename
                                </button>
                                {/* worded, so deliberately NOT `data-kpm-del` — the mark prints
                                    "Delete" on hover and would say it twice */}
                                {activeTier.id.startsWith('CUSTOM_') && (
                                    <button type="button" className="kpm-btn hazard" onClick={() => handleDeleteTier(activeTier.id)}>
                                        <Trash2 size={14}/> Delete
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Toggle List */}
                        <div className="kpm-permlist">
                            {ALL_FEATURES.map(feature => {
                                const hasAccess = (matrix[activeTier.id] || []).includes(feature.id);
                                return (
                                    <React.Fragment key={feature.id}>
                                        <div className="kpm-permrow">
                                            <span className={feature.id.includes('edit_') ? 'feat edit' : 'feat'}>{feature.label}</span>
                                            {/* aria-pressed is the state for BOTH the CSS and a screen reader, so
                                                what is drawn and what is announced cannot disagree — on a
                                                permissions grid that pair going out of step is a security bug */}
                                            {/* the switch is drawn in CSS, not by an icon swap: two different
                                                glyphs cannot slide into one another, and the SLIDE is what
                                                makes the state readable without colour */}
                                            <button type="button" className="kpm-toggle" aria-pressed={hasAccess}
                                                aria-label={`${feature.label}: ${hasAccess ? 'allowed' : 'blocked'}`}
                                                onClick={() => togglePermission(activeTier.id, feature.id)}>
                                                <span className="kpm-sw" aria-hidden="true" />
                                            </button>
                                        </div>
                                        {/* 🚀 CUSTOMER DIRECTORY ACCESS: sits right after the Customers toggle */}
                                        {feature.id === 'view_customers' && (
                                            /* a div, not a label: the control inside is a button now, and a label
                                               wrapping a button forwards its click to nothing */
                                            <div className="kpm-field kpm-authority">
                                                <span><Store size={12}/> Customer directory access</span>
                                                <AuthoritySelect
                                                    label={`Customer directory access for ${activeTier.label}`}
                                                    options={CUSTOMER_ACCESS_OPTIONS}
                                                    value={(matrix[activeTier.id] || []).find(p => CUSTOMER_EDIT_PERMS.includes(p)) || 'customers_edit_global'}
                                                    onChange={(v) => changeCustomerAccess(activeTier.id, v)}
                                                />
                                            </div>
                                        )}
                                        {/* 🚀 REPORTING AUTHORITY: sits right after Sampling, replacing the old Reports + View Team History toggles */}
                                        {feature.id === 'view_sampling' && (
                                            <div className="kpm-field kpm-authority">
                                                <span><BarChart2 size={12}/> Reporting authority</span>
                                                <AuthoritySelect
                                                    label={`Reporting authority for ${activeTier.label}`}
                                                    options={REPORT_ACCESS_OPTIONS}
                                                    value={(matrix[activeTier.id] || []).find(p => REPORT_PERMS.includes(p)) || 'none'}
                                                    onChange={(v) => changeReportAccess(activeTier.id, v)}
                                                />
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
            {/* the grid keeps its horizontal scroll, and that is not the banned pattern: a
                permissions matrix is features × ranks, so its width is the DATA's width and
                there is nothing to reflow. Desktop only — the phone gets the rank picker above. */}
            <div className="hidden lg:block overflow-x-auto custom-scrollbar kpm-shelf split">
                <table className="kpm-matrix">
                    <thead>
                        <tr>
                            <th>Feature / module</th>
                            {tiers.map((tier, idx) => {
                                const cleanName = tier.label.replace(/^T\d+:\s*/, '');
                                return (
                                    <th
                                        key={tier.id} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragOver={(e) => handleDragOver(e, idx)} onDrop={(e) => handleDrop(e, idx)} onDragEnd={handleDragEnd}
                                        className={`${dragOverIdx === idx ? 'drop' : ''} ${draggedIdx === idx ? 'dragging' : ''}`.trim() || undefined}
                                        title="Drag to adjust Rank Hierarchy"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                            <span>T{idx + 2} Rank</span>
                                            <div className="kpm-rowacts">
                                                <button type="button" onClick={() => handleRenameTier(tier.id)} title="Rename Tier">
                                                    {cleanName} <Edit size={10} className="inline"/>
                                                </button>
                                                {/* ⚠️ `data-kpm-del` MUST BE THE FIRST ATTRIBUTE ON THE TAG. The group-25
                                                    needle anchors on it immediately after the tag name, so slipping
                                                    `type` in front silently unmarks the button — the sweep stops
                                                    applying, the hover label never appears, and nothing fails to say
                                                    so. Caught on this conversion's first run.
                                                    (The needle is deliberately not written out here: the count reads
                                                    raw source, so quoting it in a comment adds a phantom button.)
                                                    This one stays icon-only — a 12px glyph in a table header with no
                                                    room for a word. */}
                                                {tier.id.startsWith('CUSTOM_') && <button data-kpm-del data-label="Delete" type="button" onClick={() => handleDeleteTier(tier.id)}><Trash2 size={12}/></button>}
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
                                <tr>
                                    <td className={feature.id.includes('edit_') ? 'feat edit' : 'feat'}>{feature.label}</td>
                                    {tiers.map(tier => {
                                        const hasAccess = (matrix[tier.id] || []).includes(feature.id);
                                        return (
                                            <td key={`${tier.id}-${feature.id}`} className="text-center">
                                                <button type="button" className="kpm-toggle" aria-pressed={hasAccess}
                                                    aria-label={`${feature.label} for ${tier.label}: ${hasAccess ? 'allowed' : 'blocked'}`}
                                                    onClick={() => togglePermission(tier.id, feature.id)}>
                                                    <span className="kpm-sw" aria-hidden="true" />
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                                {/* 🚀 CUSTOMER DIRECTORY ACCESS: sits right after the Customers toggle */}
                                {feature.id === 'view_customers' && (
                                    <tr className="authority">
                                        <td className="feat"><Store size={14} className="inline"/> Customer directory access</td>
                                        {tiers.map(tier => {
                                            const currentCustomerAccess = (matrix[tier.id] || []).find(p => CUSTOMER_EDIT_PERMS.includes(p)) || 'customers_edit_global';
                                            return (
                                                <td key={`customer-access-${tier.id}`} className="text-center">
                                                    <AuthoritySelect
                                                        label={`Customer directory access for ${tier.label}`}
                                                        options={CUSTOMER_ACCESS_OPTIONS}
                                                        value={currentCustomerAccess}
                                                        onChange={(v) => changeCustomerAccess(tier.id, v)}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )}
                                {/* 🚀 REPORTING AUTHORITY: sits right after Sampling, replacing the old Reports + View Team History toggles */}
                                {feature.id === 'view_sampling' && (
                                    <tr className="authority">
                                        <td className="feat"><BarChart2 size={14} className="inline"/> Reporting authority</td>
                                        {tiers.map(tier => {
                                            const currentReportAccess = (matrix[tier.id] || []).find(p => REPORT_PERMS.includes(p)) || 'none';
                                            return (
                                                <td key={`report-${tier.id}`} className="text-center">
                                                    <AuthoritySelect
                                                        label={`Reporting authority for ${tier.label}`}
                                                        options={REPORT_ACCESS_OPTIONS}
                                                        value={currentReportAccess}
                                                        onChange={(v) => changeReportAccess(tier.id, v)}
                                                    />
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

            {/* ⚠️ DEPLOY SITS AT THE BOTTOM, AFTER THE GRID IT COMMITS. It was in the header,
                above everything it applies to, wearing a red glow — so the loudest thing on the
                panel was a button you should only reach once you are finished. Amber: it is the
                ACT, and the panel's own hazard mark already carries the danger. */}
            <div className="kpm-shelf split">
                <div className="kpm-acts">
                    <button type="button" className="kpm-btn" onClick={handleAddTier}>
                        <Plus size={14}/> Add rank
                    </button>
                    <button type="button" className="kpm-btn key" onClick={saveMatrixToFirebase} disabled={isSaving}>
                        <Save size={14}/> {isSaving ? 'Deploying…' : 'Deploy matrix'}
                    </button>
                </div>
            </div>
        </div>
        </>
    );
};