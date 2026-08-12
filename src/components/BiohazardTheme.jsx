import React, { useState, useEffect, useRef } from 'react';
import { X, Menu, Lock, LogOut, LogIn, ArrowRight, Trophy, Sun, Moon,
         User, LayoutGrid, Map, Route, Truck, Package, Boxes, PackagePlus, Store,
         Receipt, Wallet, ClipboardList, Users, Gift, BarChart3, ScrollText, Settings } from 'lucide-react';
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

    /* THE EDGE PANEL — his call, 2026-08-12: "replace the side panel button into smaller size
       that is dragable from the side but not really visible from the side, the idea is like
       samsung edge panel ... when we pull it what showing instead is this kind of logo with
       brief info of what we hovering at".

       PHONE ONLY. A desk has room for the 256px panel of words and always has; every `lg:`
       below is that panel, untouched. What changes under lg is the way IN (a ribbon on the
       edge instead of an orange square in the corner) and the way it READS (a 76px rail of
       marks, with the name of the one you are touching printed beside it).

       `railPull` is 0..1 — how far out the finger has dragged it — and it is the only reason
       this feels like Samsung's rather than a button that toggles a class: the panel is under
       the finger the whole way, and where it lands is decided on release.

       THE RIGHT EDGE, NOT THE LEFT, and that is not a style choice. He is on iOS, where a drag
       that starts at the left edge is Safari's own BACK gesture. A navigation panel that
       sometimes leaves the app instead of opening is worse than no panel; the right edge on
       iOS is forward, which does nothing when there is no forward history — which there never
       is here. Samsung's own edge panel is on the right for the mirror of this reason. The
       desk is untouched: every `lg:` below still puts the panel on the left, in the flow. */
    const [railPull, setRailPull] = useState(null);   // null = not dragging
    const [peek, setPeek] = useState(null);           // which mark is being touched
    const pullRef = useRef(null);
    const RAIL_W = 76;

    /* NO setPointerCapture. It was here and it was a liability: the pointer has to be active
       for it, and when it is not it THROWS, which kills the handler before a single listener
       is attached — the gesture then does nothing at all, with no error anyone would see.
       Listening on window covers the finger leaving the ribbon just as well. */
    const startRailPull = (e) => {
        if (pullRef.current) return;
        pullRef.current = { startX: e.clientX, moved: false, wasOpen: isMobileMenuOpen };
        setRailPull(isMobileMenuOpen ? 1 : 0);

        const onMove = (ev) => {
            const d = pullRef.current;
            if (!d) return;
            const dx = d.startX - ev.clientX;          // pulling LEFT opens it
            if (Math.abs(dx) > 4) d.moved = true;
            const base = d.wasOpen ? RAIL_W : 0;
            setRailPull(Math.max(0, Math.min(1, (base + dx) / RAIL_W)));
        };
        const onEnd = (ev) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onEnd);
            window.removeEventListener('pointercancel', onEnd);
            const d = pullRef.current;
            pullRef.current = null;
            if (!d) return;
            /* A tap is a toggle. A drag lands wherever it was let go of, past the halfway
               mark — the same rule the manifest drawer uses, so the two gestures in this app
               do not disagree about what "far enough" means. `wasOpen` is read off the drag
               and not off state: the handler that started the drag closed over the old value,
               and a stale one here is how a tap stops toggling after the first open. */
            setIsMobileMenuOpen(d.moved
                ? ((d.wasOpen ? RAIL_W : 0) + (d.startX - ev.clientX)) > RAIL_W / 2
                : !d.wasOpen);
            setRailPull(null);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onEnd);
        window.addEventListener('pointercancel', onEnd);
    };

    // 🚀 LINK EACH TAB TO A PERMISSION STRING
    /* `icon` is the phone's whole label, so it has to say the thing the words said. */
    const allMenuItems = [
        { id: 'agent_profile', label: 'Agent Profile', feature: 'view_agent_profile', icon: User },
        { id: 'dashboard', label: 'Command Center', feature: 'view_dashboard', icon: LayoutGrid },
        { id: 'map_war_room', label: 'Map System', feature: 'view_map', icon: Map },
        { id: 'journey', label: 'Journey Plan', feature: 'view_journey', icon: Route },
        { id: 'fleet', label: 'Fleet & Canvas', feature: 'view_fleet', icon: Truck },
        { id: 'inventory', label: 'Master Vault', feature: 'view_master_vault', icon: Package },
        { id: 'agent_inventory', label: 'Agent Inventory', feature: 'view_agent_inventory', icon: Boxes },
        { id: 'restock_vault', label: 'Restock Vault', feature: 'view_restock_vault', icon: PackagePlus },
        { id: 'sales', label: 'Sales Terminal', feature: 'view_sales', icon: Store },
        { id: 'receivables', label: 'Receivables & Consignment', feature: 'view_receivables', icon: Receipt },
        { id: 'eod', label: 'EOD Setoran', feature: 'view_eod', icon: Wallet },
        { id: 'stock_opname', label: 'Stock Opname', feature: 'view_stock_opname', icon: ClipboardList },
        { id: 'customers', label: 'Customers', feature: 'view_customers', icon: Users },
        { id: 'sampling', label: 'Sampling', feature: 'view_sampling', icon: Gift },
        { id: 'transactions', label: 'Reports', feature: 'view_reports', icon: BarChart3 },
        { id: 'audit', label: 'Audit Logs', feature: 'view_audit_logs', icon: ScrollText },
        { id: 'settings', label: 'Settings', feature: 'view_settings', icon: Settings }
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
                    /* DESK ONLY now. On a desk this square also has a second job the phone
                       never had — it gives the panel's 256px back to the content — so it stays,
                       in the app's own colours instead of the stock orange it was built in. */
                    className="hide-on-print hidden lg:block fixed top-3 left-3 z-[100] p-2.5 bg-[#0f0e0d]/95 backdrop-blur-md text-[#ff9d00] rounded-xl shadow-[0_0_15px_rgba(255,157,0,0.28)] border border-[#5c4b3a] hover:border-[#8b7256] active:scale-90 transition-all"
                >
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            )}

            {/* THE RIBBON — the phone's way in. A 14px sliver on the edge that breathes, so it
                reads as "pull me" without ever being a thing on the screen. It is a drag first
                and a tap second: `startRailPull` keeps the panel under the finger and decides
                where it lands on release. touchAction none or the browser claims the gesture
                for a page scroll before the first move event arrives. */}
            {!showAdminLogin && (
                <button
                    onPointerDown={startRailPull}
                    aria-label={isMobileMenuOpen ? 'Close navigation' : 'Open navigation'}
                    aria-expanded={isMobileMenuOpen}
                    style={{ touchAction: 'none' }}
                    className="kpm-edge-ribbon hide-on-print lg:hidden fixed right-0 top-1/2 -translate-y-1/2 z-[100] w-[14px] h-[132px]"
                >
                    <span className="kpm-edge-grip"></span>
                </button>
            )}

            {/* The scrim is the way OUT, and it is phone-only: on a desk the panel is in the
                flow and nothing is covered, so there is nothing to dismiss. */}
            {isMobileMenuOpen && (
                <div
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hide-on-print lg:hidden fixed inset-0 z-[85] bg-black/60 backdrop-blur-[2px] animate-fade-in"
                ></div>
            )}

            {/* What the mark under the finger is called. Fixed, not inside the rail — the rail
                clips its own overflow, so a plate parented to a mark would be cut off at 76px.
                It rides the finger's y, which is what makes it read as a label and not a menu. */}
            {peek && (
                <div
                    className="hide-on-print lg:hidden fixed z-[95] pointer-events-none kpm-rail-say"
                    style={{ right: RAIL_W + 10, top: Math.max(8, peek.y - 18) }}
                >
                    <span className="block px-3 py-2 rounded bg-[#0f0e0d] border border-[#5c4b3a] text-[10px] font-black uppercase tracking-widest text-[#f5e6c8] shadow-[0_4px_20px_rgba(0,0,0,.6)]">
                        {peek.label}
                    </span>
                </div>
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
            {/* 76px of marks on a phone, 256px of words on a desk — one element, because two
                would mean two copies of the permission filter and eventually two answers to
                "which tabs may this tier see". While a drag is live the inline transform wins
                and the CSS transition is off, so the panel tracks the finger exactly; on
                release railPull goes back to null and the class transition carries it home. */}
            <div
                style={railPull === null ? undefined : { transform: `translateX(${(1 - railPull) * RAIL_W}px)`, transition: 'none' }}
                /* overflow-visible ONLY WHILE OPEN, and on a phone only. It is what lets the
                   music player's body escape a 76px rail — but the body is anchored to the
                   rail's own left edge, so a rail that is closed AND visible-overflow leaves an
                   orphan panel floating over the app once you have expanded the player. The
                   desk keeps overflow-hidden throughout, because there the panel collapses by
                   WIDTH (lg:w-0) and its contents must not spill while it does. */
                className={`hide-on-print fixed inset-y-0 right-0 z-[90] w-[76px] lg:w-64 bg-[#0b0a09]/97 lg:bg-black/95 backdrop-blur-xl border-l lg:border-l-0 lg:border-r border-[#3e3226] lg:border-white/10 flex flex-col pt-5 lg:pt-8 px-0 lg:pl-4 lg:pr-4 lg:overflow-hidden
                             transition-[transform,width,padding,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)] lg:relative lg:translate-x-0
                             ${isMobileMenuOpen
                                ? 'overflow-visible translate-x-0 lg:w-64 lg:opacity-100'
                                : 'overflow-hidden translate-x-full lg:w-0 lg:px-0 lg:border-r-0 lg:opacity-0 lg:pointer-events-none'}`}>

                {/* ml-12 on a desk: the toggle is fixed at top-left there, so the brand has to
                    clear it or the button lands on the name. A 76px rail has no room for a
                    name at all, and does not need one — you opened it, you know where you are. */}
                <div key={`brand-${isAdmin}`} className="hidden lg:block mb-6 ml-12 mt-0.5 lg:mt-0 boot-1">
                    <h1 className="text-sm lg:text-xl font-bold text-white font-mono border-b-2 border-white/50 pb-1 lg:pb-2 inline-block shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        {appSettings?.companyName || "KPM SYSTEM"}
                    </h1>
                    {/* was text-blue-400 — palette law, and it was the last blue in this file */}
                    <p className="text-[10px] font-mono text-[#8b7256] tracking-widest mt-1">BUILD {appVersion}</p>
                </div>

                {user ? (
                    <nav key={`nav-${isAdmin}`} className="space-y-0.5 lg:space-y-0.5 flex-1 overflow-y-auto scrollbar-hide boot-2">
                        {visibleMenu.map(item => {
                            const Mark = item.icon;
                            const on = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                                    /* The name appears on PRESS, before the finger lifts — that is
                                       the "brief info of what we hovering at" on a screen with no
                                       hover. Lifting navigates; sliding off cancels the label. */
                                    onPointerDown={(e) => setPeek({ id: item.id, label: item.label, y: e.clientY })}
                                    onPointerUp={() => setPeek(null)}
                                    onPointerCancel={() => setPeek(null)}
                                    onPointerLeave={() => setPeek(null)}
                                    title={item.label}
                                    className={`kpm-rail-mark relative w-full flex items-center justify-center h-14 lg:h-auto lg:block lg:text-left lg:py-2 lg:px-3 text-xs font-bold transition-all duration-200 uppercase tracking-widest lg:clip-path-polygon ${
                                        on
                                        ? 'text-[#ff9d00] lg:bg-white lg:text-black lg:pl-6 lg:shadow-[0_0_10px_rgba(255,255,255,0.8)] lg:border-l-4 lg:border-orange-500'
                                        : 'text-[#6b5845] lg:text-gray-500 lg:hover:text-white lg:hover:pl-4 lg:hover:bg-white/5'
                                    }`}
                                >
                                    <Mark
                                        size={21}
                                        strokeWidth={on ? 2.4 : 2}
                                        className={`lg:hidden transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${on ? 'scale-[1.22] drop-shadow-[0_0_8px_rgba(255,157,0,0.55)]' : ''}`}
                                    />
                                    <span className="hidden lg:inline">{item.label}</span>
                                    {on && <span className="lg:hidden absolute right-0 top-2 bottom-2 w-[3px] rounded-l-full bg-[#ff9d00] shadow-[0_0_10px_rgba(255,157,0,.6)]"></span>}
                                </button>
                            );
                        })}
                    </nav>
                ) : (
                    <div className="flex-1 flex flex-col items-center lg:items-start pt-10 opacity-50 px-2">
                        <div className="text-xs text-red-500 font-mono mb-2 text-center">ACCESS<br className="lg:hidden"/> DENIED</div>
                        <div className="h-0.5 w-10 bg-red-800 mb-4"></div>
                        {/* was text-slate-400 — slate IS the blue */}
                        <p className="hidden lg:block text-[10px] text-[#8b7256]">Authentication required.</p>
                    </div>
                )}

                <div key={`bot-${isAdmin}`} className="mt-auto mb-2 border-t border-[#3e3226] lg:border-white/10 pt-3 boot-3">
                    {/* 🚀 HIDDEN DOOR: Show Master Vault button if they aren't fully unlocked but have Tier 2 settings */}
                    {hasClearance(userRole, 'view_master_vault') && !isAdmin && (
                        <div className="px-0 lg:px-2 mb-3">
                            <button
                                onClick={() => { if (setShowAdminLogin) setShowAdminLogin(true); setIsMobileMenuOpen(false); }}
                                onPointerDown={(e) => setPeek({ id: 'unlock', label: 'Unlock Master Vault', y: e.clientY })}
                                onPointerUp={() => setPeek(null)}
                                onPointerCancel={() => setPeek(null)}
                                title="Unlock Master Vault"
                                className="w-full bg-[#ff9d00]/10 hover:bg-[#ff9d00]/20 border border-[#8b7256] lg:border-orange-500/50 text-[#ff9d00] p-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
                            >
                                <Lock size={14} /> <span className="hidden lg:inline">Unlock Master Vault</span>
                            </button>
                        </div>
                    )}

                    {/* HIS CALL: "nah bro bring back that music player man". It is here at every
                        width now. A 76px rail genuinely cannot hold the transport and the volume
                        slider, so on a phone the player keeps only its head — the note and
                        play/pause — and opens its body to the LEFT of the rail, into the screen
                        it has plenty of. See the note on `right-full` in MusicPlayer. */}
                    {isAdmin && <MusicPlayer />}

                    {user ? (
                        <div className="flex flex-col lg:flex-row items-center gap-2">
                            <img
                                src={appSettings?.mascotImage || "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"}
                                className="w-8 h-8 lg:w-7 lg:h-7 rounded border border-[#5c4b3a] lg:border-white/30 object-cover bg-black"
                                alt="avatar"
                            />
                            <div className="hidden lg:block flex-1 min-w-0">
                                <p className="text-[11px] text-gray-400 uppercase font-bold leading-none mb-0.5">OPERATIVE</p>
                                <p className="text-[10px] text-white font-mono truncate leading-none">{user.email?.split('@')[0]}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                onPointerDown={(e) => setPeek({ id: 'out', label: 'Terminate session', y: e.clientY })}
                                onPointerUp={() => setPeek(null)}
                                onPointerCancel={() => setPeek(null)}
                                className="text-red-500 hover:text-red-400 p-1.5 rounded transition-colors" title="Logout"
                            >
                                <LogOut size={16}/>
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
                {/* pt-4, not pt-16: the 64px used to be there to clear the orange square in the
                    corner, and on a phone that square is a ribbon on the edge now. Sixty-four
                    pixels of a phone screen back, for nothing. The desk still pays it, in CSS,
                    because the square is still up there — see kpm-topbar in theme.css. */}
                <div className={`kpm-topbar hide-on-print pt-4 lg:pt-6 px-4 lg:px-8 pb-2 flex justify-between items-end gap-3 border-b border-[#3e3226] shrink-0 relative`}>
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
                        <div className="text-xl lg:text-2xl text-white font-bold tracking-[0.15em] uppercase text-shadow-glow truncate">
                            {activeTab.replace(/_/g, ' ')}
                        </div>
                        {/* Re-keyed on the tab, so the rule redraws itself every time you move.
                            It is the only motion in this row and it is the one that carries
                            meaning: something changed, and this is what it changed to. */}
                        <span key={activeTab} className="kpm-title-rule"></span>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                        {/* Sync/offline pill lives in this row on purpose. It used to be a `fixed`
                            element with a hardcoded right offset, which drifted into the theme
                            toggle at tablet widths because the two used different positioning
                            systems. As a flex child it just sits next to the bell at every width. */}
                        {/* All three controls wear .kpm-chip now — one plate, one size, one hover,
                            one press. They were three different shapes in three different palettes
                            (a green pill, a white-outlined square, a bare icon) sitting 12px apart. */}
                        {syncIndicator}

                        {setDarkMode && (
                            <button
                                onClick={() => setDarkMode(prev => !prev)}
                                className="kpm-chip"
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