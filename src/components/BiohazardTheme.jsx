import React, { useState, useEffect } from 'react';
import { X, Menu, Lock, LogOut, LogIn, ArrowRight, Trophy, Sun, Moon } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase'; 
import NotificationBell from './NotificationBell';
import MusicPlayer from '../MusicPlayer'; 

// 🚀 IMPORT THE BRAIN
import { hasClearance } from '../config/permissions'; 
import { confirmAction } from './ConfirmGate.jsx';

export default function BiohazardTheme({
    activeTab, setActiveTab, children, user, appSettings,
    isAdmin, onLogin, userRole, setShowAdminLogin, showAdminLogin, agentSettings,
    notifications, onNotificationClick, appVersion,
    darkMode, setDarkMode, syncIndicator
}) {
    /* Starts open on a desk and closed on a phone. One piece of state drives both, but the
       sensible default differs: a phone has no room to spend on navigation you are not
       using, a desk starts with it visible because that is where it has always been. */
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(
        () => typeof window !== 'undefined' && window.innerWidth >= 1024
    );

    /* Tell the rest of the app the sidebar is taking 256px.

       Tailwind's breakpoints measure the VIEWPORT, so a screen at 1400px looks identical to
       them whether this panel is open or shut — but the sales terminal only has 1144px to
       lay out in when it is open. That is why its shelf and rail collapsed into each other.
       A class on <html> is the smallest thing that lets CSS account for the difference; see
       the kpm-nav-open rules in theme.css. */
    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('kpm-nav-open', isMobileMenuOpen);
        return () => root.classList.remove('kpm-nav-open');
    }, [isMobileMenuOpen]);
    
    const handleLogout = async () => {
        if(await confirmAction("Terminate Session?")) {
            signOut(auth);
            window.location.reload();
        }
    };

    // 🚀 LINK EACH TAB TO A PERMISSION STRING
    const allMenuItems = [
        { id: 'agent_profile', label: 'Agent Profile', feature: 'view_agent_profile' },
        { id: 'dashboard', label: 'Command Center', feature: 'view_dashboard' },
        { id: 'map_war_room', label: 'Map System', feature: 'view_map' },
        { id: 'journey', label: 'Journey Plan', feature: 'view_journey' },
        { id: 'fleet', label: 'Fleet & Canvas', feature: 'view_fleet' }, 
        { id: 'inventory', label: 'Master Vault', feature: 'view_master_vault' },
        { id: 'agent_inventory', label: 'Agent Inventory', feature: 'view_agent_inventory' },
        { id: 'restock_vault', label: 'Restock Vault', feature: 'view_restock_vault' },
        { id: 'sales', label: 'Sales Terminal', feature: 'view_sales' },
        { id: 'receivables', label: 'Receivables & Consignment', feature: 'view_receivables' },
        { id: 'eod', label: 'EOD Setoran', feature: 'view_eod' },
        { id: 'stock_opname', label: 'Stock Opname', feature: 'view_stock_opname' },
        { id: 'customers', label: 'Customers', feature: 'view_customers' },
        { id: 'sampling', label: 'Sampling', feature: 'view_sampling' },
        { id: 'transactions', label: 'Reports', feature: 'view_reports' },
        { id: 'audit', label: 'Audit Logs', feature: 'view_audit_logs' },
        { id: 'settings', label: 'Settings', feature: 'view_settings' }
    ];

    // 🚀 THE 3 REPORT VISIBILITY MODES (matches Settings > Global Permission Matrix > Reporting Authority)
    const REPORT_PERMS = ['view_reports_global', 'view_reports_regional', 'view_reports_personal'];

    // 🚀 THE MAGIC: The Matrix automatically filters the sidebar based on their Corporate Tier
    const visibleMenu = allMenuItems.filter(item => {
        // Reports button: show it if the tier has ANY of the 3 report modes (the old single 'view_reports' toggle no longer exists in Settings)
        if (item.feature === 'view_reports') return REPORT_PERMS.some(p => hasClearance(userRole, p));
        return hasClearance(userRole, item.feature);
    });

    return (
        <div className="print-reset h-[100dvh] w-full bg-black text-gray-300 font-sans tracking-wide overflow-hidden flex relative">
            <style>{`
                @keyframes reRequiem {
                    0% { opacity: 0; transform: scale(0.98) translateY(10px); filter: blur(3px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
                }
                .boot-1 { animation: reRequiem 0.4s cubic-bezier(0.1, 0.9, 0.2, 1) 0.05s forwards; opacity: 0; }
                .boot-2 { animation: reRequiem 0.4s cubic-bezier(0.1, 0.9, 0.2, 1) 0.15s forwards; opacity: 0; }
                .boot-3 { animation: reRequiem 0.4s cubic-bezier(0.1, 0.9, 0.2, 1) 0.25s forwards; opacity: 0; }
                .boot-4 { animation: reRequiem 0.4s cubic-bezier(0.1, 0.9, 0.2, 1) 0.35s forwards; opacity: 0; }
            `}</style>
            
            <div className="hide-on-print absolute inset-0 bg-[url('https://wallpapers.com/images/hd/resident-evil-background-2834-x-1594-c7m6q8j3q8j3q8j3.jpg')] bg-cover bg-center opacity-40 pointer-events-none"></div>
            <div className="hide-on-print absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent pointer-events-none"></div>

            {/* NOT RENDERED while the vault gate is up, rather than hidden with a class.
                The class route was tried first and did not work in the DEV server: the prop
                arrived and React put `hidden` on the element, but computed display stayed
                `flex` because the dev stylesheet had no matching rule yet — Tailwind generates
                on demand and had not caught up with the new class. The production CSS does
                contain `.hidden{display:none}`, so that route would have worked in a build and
                failed in front of him while developing. Not rendering depends on no CSS at all,
                and takes a dead control out of the tab order as well as out of sight.
                Raising the gate's z-index is not an option either: this button sits in its own
                stacking context, so the gate's z-[9999] never beats its z-[100]. */}
            {!showAdminLogin && (
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label={isMobileMenuOpen ? 'Close navigation' : 'Open navigation'}
                    aria-expanded={isMobileMenuOpen}
                    className="hide-on-print fixed top-3 left-3 z-[100] p-2.5 bg-orange-600/90 backdrop-blur-md text-white rounded-xl shadow-[0_0_15px_rgba(234,88,12,0.5)] border border-orange-400/50 active:scale-90 transition-all"
                >
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            )}

            {/* 🔑 THE WAY IN. Aldi could not log in on his phone at all — his words: "there is no
                login button everywhere, i cant choose google account nor entering the password".
                The only SYSTEM LOGIN lived at the bottom of this sidebar, and the sidebar starts
                CLOSED on a phone (see the width check above), so the way into the app was hidden
                behind a small unlabelled square in the corner. A logged-out user has nothing else
                to do here — the main area is empty and every tab is gated — so the door belongs
                in the middle of the screen, not in a drawer.

                z-[80] on purpose: under the sidebar (90) and its toggle (100), so opening the
                drawer still works and this never traps anyone. */}
            {!user && (
                <div className="hide-on-print fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 bg-black/92 px-6 text-center">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.35em] text-[#6b6157] font-mono">{appSettings?.companyName || 'KPM Inventory'}</div>
                        <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.2em] text-[#f0e2c0] font-mono">Sign in to continue</h2>
                        <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-[#6b6157] font-mono">Use the Google account your name is registered under.</p>
                    </div>
                    <button
                        onClick={onLogin}
                        className="flex w-full max-w-[260px] items-center justify-center gap-3 border border-[#ff9d00] bg-transparent py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#ff9d00] transition-[background-color,transform] duration-150 ease-out hover:bg-[#ff9d00]/10 active:scale-[0.975]"
                    >
                        <LogIn size={15} /> Sign in with Google
                    </button>
                </div>
            )}

            {/* On a phone it slides over the content; on a desk it is in the flow, so closing
                it has to give its WIDTH back rather than just translate away — otherwise the
                space it occupied stays empty and the toggle achieves nothing. Padding has to
                collapse with it, or 32px of it survives at zero width. */}
            <div className={`hide-on-print fixed inset-y-0 left-0 z-[90] w-64 bg-black/95 backdrop-blur-xl border-r border-white/10 flex flex-col pt-5 lg:pt-8 pl-4 pr-4 overflow-hidden
                             transition-[transform,width,padding,opacity] duration-300 lg:relative lg:translate-x-0
                             ${isMobileMenuOpen
                                ? 'translate-x-0 lg:w-64 lg:opacity-100'
                                : '-translate-x-full lg:w-0 lg:px-0 lg:border-r-0 lg:opacity-0 lg:pointer-events-none'}`}>
                
                {/* ml-12 at every width now: the toggle is fixed at top-left on desktop too,
                    so the brand has to clear it there as well or the button lands on the name. */}
                <div key={`brand-${isAdmin}`} className="mb-6 ml-12 mt-0.5 lg:mt-0 boot-1">
                    <h1 className="text-sm lg:text-xl font-bold text-white font-mono border-b-2 border-white/50 pb-1 lg:pb-2 inline-block shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        {appSettings?.companyName || "KPM SYSTEM"}
                    </h1>
                    <p className="text-[10px] font-mono text-blue-400 tracking-widest mt-1">BUILD {appVersion}</p>
                </div>

                {user ? (
                    <nav key={`nav-${isAdmin}`} className="space-y-0.5 flex-1 overflow-y-auto scrollbar-hide boot-2">
                        {visibleMenu.map(item => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                                className={`w-full text-left py-2 px-3 text-xs font-bold transition-all duration-200 uppercase tracking-widest clip-path-polygon ${
                                    activeTab === item.id 
                                    ? 'bg-white text-black pl-6 shadow-[0_0_10px_rgba(255,255,255,0.8)] border-l-4 border-orange-500' 
                                    : 'text-gray-500 hover:text-white hover:pl-4 hover:bg-white/5'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}

                        
                    </nav>
                ) : (
                    <div className="flex-1 flex flex-col items-start pt-10 opacity-50">
                        <div className="text-xs text-red-500 font-mono mb-2">ACCESS DENIED</div>
                        <div className="h-0.5 w-10 bg-red-800 mb-4"></div>
                        <p className="text-[10px] text-slate-400">Authentication required.</p>
                    </div>
                )}

                <div key={`bot-${isAdmin}`} className="mt-auto mb-2 border-t border-white/10 pt-3 boot-3">
                    {/* 🚀 HIDDEN DOOR: Show Master Vault button if they aren't fully unlocked but have Tier 2 settings */}
                    {hasClearance(userRole, 'view_master_vault') && !isAdmin && (
                        <div className="px-2 mb-3">
                            <button 
                                onClick={() => { if (setShowAdminLogin) setShowAdminLogin(true); setIsMobileMenuOpen(false); }} 
                                className="w-full bg-orange-600/20 hover:bg-orange-600 border border-orange-500/50 text-orange-400 hover:text-white p-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20"
                            >
                                <Lock size={14} /> Unlock Master Vault
                            </button>
                        </div>
                    )}

                    {isAdmin && <MusicPlayer />}

                    {user ? (
                        <div className="flex items-center gap-2">
                            <img 
                                src={appSettings?.mascotImage || "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"} 
                                className="w-7 h-7 rounded border border-white/30 object-cover bg-black"
                                alt="avatar"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-gray-400 uppercase font-bold leading-none mb-0.5">OPERATIVE</p>
                                <p className="text-[10px] text-white font-mono truncate leading-none">{user.email?.split('@')[0]}</p>
                            </div>
                            <button onClick={handleLogout} className="text-red-500 hover:text-red-400 p-1.5 rounded transition-colors" title="Logout">
                                <LogOut size={14}/>
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={onLogin}
                            /* Was green. Palette law forbids it; gold outline instead. */
                            className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-[#ff9d00]/10 text-[#ff9d00] border border-[#ff9d00]/50 py-3 uppercase text-xs font-bold tracking-widest transition-[background-color,transform] duration-150 ease-out active:scale-[0.975]"
                        >
                            <LogIn size={14}/> System Login
                        </button>
                    )}
                </div>
            </div>

            <div className="print-reset relative z-10 flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-transparent to-black/80">
                {/* kpm-topbar: on a phone pt-16 already clears the fixed menu button. On a desk
                    the button used to be hidden, so lg:pt-6 reclaimed that space — but the
                    button is on desktop now too, and with the panel CLOSED it sits directly on
                    "System Active". CSS gives this a left inset in exactly that case; padding
                    the top instead would shove the whole header down at every width. */}
                <div className={`kpm-topbar hide-on-print pt-16 lg:pt-6 px-4 lg:px-8 pb-2 flex justify-between items-end border-b border-white/20 shrink-0 relative`}>
                    <h2 className="text-6xl font-bold text-white/5 uppercase select-none absolute top-2 right-8 pointer-events-none hidden lg:block">
                        {activeTab}
                    </h2>

                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            {/* Was a green pinging dot. Green is against the palette law, and the
                                ping looped forever to report a state that never changes while you
                                are looking at it. Calm cream when connected; red still earns
                                attention when it is not. */}
                            <div className={`h-1.5 w-1.5 rounded-full ${user ? 'bg-[#f0e2c0]' : 'bg-red-500 animate-pulse'}`}></div>
                            <span className={`text-[11px] font-mono uppercase ${user ? 'text-[#f0e2c0]/70' : 'text-red-500'}`}>{user ? "System Active" : "Disconnected"}</span>
                        </div>
                        <div className="text-2xl text-white font-bold tracking-[0.15em] uppercase text-shadow-glow">
                            {activeTab.replace(/_/g, ' ')}
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Sync/offline pill lives in this row on purpose. It used to be a `fixed`
                            element with a hardcoded right offset, which drifted into the theme
                            toggle at tablet widths because the two used different positioning
                            systems. As a flex child it just sits next to the bell at every width. */}
                        {syncIndicator}

                        {setDarkMode && (
                            <button
                                onClick={() => setDarkMode(prev => !prev)}
                                className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                            </button>
                        )}

                        {/* The wrapper this used to sit in carried `z-[9999]` and did nothing at
                            all — z-index is ignored on an element that is not positioned, so it
                            was only ever a decoy for the next person debugging the bell drawing
                            over the sales manifest. That overlap is fixed where it was caused:
                            the manifest sheet now stops below this header instead of growing
                            into it. */}
                        <NotificationBell notifications={notifications} onNotificationClick={onNotificationClick} />

                        <div className="text-[10px] text-gray-500 font-mono text-right hidden md:block">
                            <div>{new Date().toLocaleDateString()}</div>
                            <div className="text-sm text-white">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                    </div>
                </div>

                <div className={`print-reset flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/20`}>
                    <div className="biohazard-content max-w-full mx-auto">
                        {children}
                    </div>
                </div>

                <div className="hide-on-print hidden lg:flex h-8 border-t border-white/10 items-center px-6 gap-6 text-[10px] text-gray-500 font-bold uppercase bg-black/80 backdrop-blur shrink-0">
                    <span className="flex items-center gap-2"><span className="bg-white text-black px-1 rounded-[1px]">L-CLICK</span> SELECT</span>
                    <span className="flex items-center gap-2"><span className="bg-gray-700 text-white px-1 rounded-[1px]">SCROLL</span> NAVIGATE</span>
                </div>
            </div>
            
            <style>{`
                .biohazard-content .bg-white { background-color: rgba(20, 20, 20, 0.85) !important; border: 1px solid rgba(255,255,255,0.15) !important; color: #e5e5e5 !important; }
                .text-shadow-glow { text-shadow: 0 0 10px rgba(255,255,255,0.5); }
                .leaflet-container .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; border: none !important; padding: 0 !important; }
                .leaflet-container .leaflet-popup-tip-container { display: none !important; }
                .leaflet-container .leaflet-popup-content { margin: 0 !important; line-height: normal !important; width: auto !important; }
                .leaflet-container a.leaflet-popup-close-button { display: none !important; }

                @media print {
                    @page { margin: 0 !important; }
                    body, html, #root { background-color: white !important; color: black !important; height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; display: block !important; }
                    .print-reset { display: block !important; height: auto !important; min-height: auto !important; overflow: visible !important; position: static !important; }
                    nav, header, .hide-on-print, .no-print { display: none !important; }
                    .print-modal-wrapper { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: auto !important; background: white !important; display: block !important; padding: 0 !important; margin: 0 !important; z-index: 999999 !important; }
                    .print-receipt { background-color: white !important; color: black !important; box-shadow: none !important; border: none !important; margin: 0 auto !important; border-radius: 0 !important; overflow: visible !important; max-height: none !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
                    
                    .print-receipt.format-thermal { 
                        width: 100% !important; 
                        max-width: 55mm !important; 
                        padding: 2mm !important; 
                        margin: 0 !important;
                        box-sizing: border-box !important;
                    }
                    .print-receipt.format-thermal * {
                        word-wrap: break-word !important;
                        white-space: pre-wrap !important;
                    }

                    .print-receipt.format-a4 { width: 210mm !important; max-width: 210mm !important; padding: 10mm !important; box-sizing: border-box !important; }
                    .print-receipt * { color: black !important; border-color: black !important; }
                }
            `}</style>
        </div>
    );
}