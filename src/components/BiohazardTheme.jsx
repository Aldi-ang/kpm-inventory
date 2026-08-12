import React, { useState, useEffect, useRef } from 'react';
/* `Menu` and `X` went with the three-line square — nothing else in this file drew either. */
import { Lock, LogOut, LogIn, ArrowRight, Trophy, Sun, Moon,
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
    darkMode, setDarkMode, syncIndicator, agentPhoto
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
    /* 152, not 76: two columns of marks. His reason, and it is the right one — "there is so
       many features, especially for higher tier", and a single column of seventeen made the
       rail a scrolling list, which is the thing a rail exists to avoid. Two columns fit a
       Tier-1 menu on one screen with nothing to scroll past. */
    const RAIL_W = 176;
    const RIBBON_H = 132;

    /* WHY DRAGGING ACROSS THE MARKS ONLY EVER LIT THE FIRST ONE — his report: "i press and drag
       but it only show the first button that i press, it didnt show anything else when i drag".

       This is not a styling bug. On touch, the browser gives the pointerdown target IMPLICIT
       POINTER CAPTURE: every pointermove for that finger is delivered to the button you first
       pressed, no matter what the finger is actually over. So per-button handlers are deaf by
       design once a finger is down, and no amount of :hover CSS can help — a phone has no hover.

       One listener on the nav, and the mark is found by asking the document what is under the
       finger. That is what a rail like this always has to do. */
    const scrubRef = useRef(null);
    const markAt = (x, y) => {
        const el = typeof document === 'undefined' ? null : document.elementFromPoint(x, y);
        return el && el.closest ? el.closest('[data-mark]') : null;
    };
    const scrubTo = (ev) => {
        const el = markAt(ev.clientX, ev.clientY);
        const s = scrubRef.current;
        if (!el) { setPeek(null); return; }
        if (s && s.startId && el.dataset.mark !== s.startId) s.jumped = true;
        setPeek({ id: el.dataset.mark, label: el.dataset.label, y: ev.clientY });
    };
    const startScrub = (ev) => {
        const el = markAt(ev.clientX, ev.clientY);
        scrubRef.current = { startId: el ? el.dataset.mark : null, jumped: false, ghost: 0 };
        scrubTo(ev);
    };
    const endScrub = (ev) => {
        const s = scrubRef.current;
        setPeek(null);
        if (!s) return;
        const el = markAt(ev.clientX, ev.clientY);
        /* Lifting off a DIFFERENT mark than you pressed goes to that one. The click that follows
           still fires on the mark you pressed, so it has to be swallowed — same 120ms ghost
           window the manifest drawer uses for exactly the same reason. */
        if (s.jumped && el && el.dataset.mark) {
            s.ghost = Date.now() + 120;
            setActiveTab(el.dataset.mark);
            setIsMobileMenuOpen(false);
        }
    };
    const swallowedByScrub = () => Date.now() < (scrubRef.current?.ghost || 0);

    /* WHERE THE RIBBON SITS IS HIS, NOT MINE. His words: "our thumb usually position
       differently when using phone right". A vertical drag moves it and remembers; a
       horizontal drag opens the panel. The axis is decided once, on the first 6px of
       movement, and then held for the rest of the gesture — deciding it per-event makes a
       diagonal thumb-swipe stutter between the two. */
    /* null | 'arming' | 'armed'. Drives the swell that tells him the hold is being counted, and
       then that it has landed. The timer is cleared on unmount as well as on release — a ribbon
       that leaves the screen mid-hold must not fire into a dead component. */
    const RIBBON_HOLD_MS = 3000;
    const [ribbonHold, setRibbonHold] = useState(null);
    const holdRef = useRef(null);
    useEffect(() => () => clearTimeout(holdRef.current), []);

    const [ribbonY, setRibbonY] = useState(() => {
        if (typeof window === 'undefined') return 0;
        const saved = Number(localStorage.getItem('kpm-ribbon-y'));
        return Number.isFinite(saved) && saved > 0
            ? Math.min(saved, window.innerHeight - RIBBON_H - 8)
            : Math.round((window.innerHeight - RIBBON_H) / 2);
    });

    /* NO setPointerCapture. It was here and it was a liability: the pointer has to be active
       for it, and when it is not it THROWS, which kills the handler before a single listener
       is attached — the gesture then does nothing at all, with no error anyone would see.
       Listening on window covers the finger leaving the ribbon just as well. */
    const startRailPull = (e) => {
        if (pullRef.current) return;
        pullRef.current = { startX: e.clientX, startY: e.clientY, startTop: ribbonY, axis: null, moved: false, wasOpen: isMobileMenuOpen, armed: false };
        setRailPull(isMobileMenuOpen ? 1 : 0);

        /* HOLD THREE SECONDS TO MOVE IT. His report: "sidebar hold button is too easy to be
           moved". It was — ANY vertical drag repositioned it, so reaching for the menu with a
           slightly slanted thumb dragged the thing instead of opening it.

           Moving is a rare, deliberate act; opening is the everyday one. So moving now has to be
           asked for: hold still for three seconds and the ribbon ARMS — it swells while you wait,
           which is both the "we know that we holding it" he asked for and a progress bar for how
           much longer. Any movement before it fires cancels the hold, because a finger that is
           travelling is opening the panel, not settling in to reposition it. */
        setRibbonHold('arming');
        holdRef.current = setTimeout(() => {
            if (pullRef.current) pullRef.current.armed = true;
            setRibbonHold('armed');
        }, RIBBON_HOLD_MS);
        const cancelHold = () => { clearTimeout(holdRef.current); holdRef.current = null; };

        const onMove = (ev) => {
            const d = pullRef.current;
            if (!d) return;
            const dx = d.startX - ev.clientX;          // pulling LEFT opens it
            const dy = ev.clientY - d.startY;          // dragging UP/DOWN moves the ribbon

            if (d.armed) {                              // held long enough: the ribbon follows
                setRibbonY(Math.max(8, Math.min(window.innerHeight - RIBBON_H - 8, d.startTop + dy)));
                setRailPull(d.wasOpen ? 1 : 0);         // hold the panel still while it is moved
                return;
            }
            if (!d.axis && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
                d.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
                d.moved = true;
                cancelHold();                           // a travelling finger is not a hold
                setRibbonHold(null);
            }
            /* A vertical drag that never earned the hold does NOTHING — it does not move the
               ribbon and it does not open the panel. That is the whole point of his report. */
            if (d.axis === 'y') return;
            if (Math.abs(dx) > 4) d.moved = true;
            const base = d.wasOpen ? RAIL_W : 0;
            setRailPull(Math.max(0, Math.min(1, (base + dx) / RAIL_W)));
        };
        const onEnd = (ev) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onEnd);
            window.removeEventListener('pointercancel', onEnd);
            cancelHold();
            setRibbonHold(null);
            const d = pullRef.current;
            pullRef.current = null;
            if (!d) return;
            /* Moving the ribbon is not opening the panel, and a three-second hold is not a tap
               either. Remembered across sessions, because a position you have to set every time
               you pick the phone up is not a preference. */
            if (d.armed) {
                setRailPull(null);
                try { localStorage.setItem('kpm-ribbon-y', String(Math.max(8, Math.min(window.innerHeight - RIBBON_H - 8, d.startTop + (ev.clientY - d.startY))))); } catch { /* private mode */ }
                return;
            }
            if (d.axis === 'y') { setRailPull(null); return; }
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
            {/* THE THREE-LINE SQUARE IS DELETED, at every width — his call: "the 3 lines sidebar
                button is still exist make sure u delete it". The ribbon is the only way in on a
                phone, and on a desk the panel is simply always open: it is in the flow there, so
                nothing is covered and there was never anything to dismiss. `Menu` and `X` are no
                longer imported for this reason. */}

            {/* THE RIBBON — the phone's way in. A 14px sliver on the edge that breathes, so it
                reads as "pull me" without ever being a thing on the screen. Drag it SIDEWAYS to
                open the panel, UP or DOWN to move the ribbon itself to wherever your thumb
                actually rests. touchAction none or the browser claims the gesture for a page
                scroll before the first move event arrives. */}
            {!showAdminLogin && (
                <button
                    onPointerDown={startRailPull}
                    aria-label={isMobileMenuOpen ? 'Close navigation' : 'Open navigation'}
                    aria-expanded={isMobileMenuOpen}
                    style={{ touchAction: 'none', top: ribbonY, '--hold-ms': `${RIBBON_HOLD_MS}ms` }}
                    className={`kpm-edge-ribbon ${ribbonHold || ''} hide-on-print lg:hidden fixed right-0 z-[100] w-[14px] h-[132px]`}
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
                /* HIS REPORT: "sometimes there is a bug and the sidepanel show a while until i
                   refresh on the phone then its gone".

                   Nothing opens it — it is never open. The app imports its stylesheet from
                   main.jsx, so on the DEV SERVER Vite injects that CSS with JavaScript, AFTER
                   React has already painted. For that window this element has no `fixed`, no
                   `translate-x-full` and no width: it is a plain block sitting in the document,
                   in full view, until the styles land and it snaps off screen. A refresh warms
                   the modules, the window shrinks to nothing, and the bug "goes away" — which is
                   exactly the shape of his report.

                   `data-kpm-rail` is hidden by the inline <style> in index.html, which is in the
                   document before anything loads, and unhidden by theme.css, which arrives with
                   the rest of the app's CSS. Scoped to this one element on purpose: a guard that
                   hides #root would blank the whole app if the stylesheet ever failed. */
                data-kpm-rail
                style={railPull === null ? undefined : { transform: `translateX(${(1 - railPull) * RAIL_W}px)`, transition: 'none' }}
                /* overflow-hidden throughout, at every width, again. It was briefly conditional
                   so the music panel could escape sideways out of the rail; the panel is a
                   portalled pill now and escapes nothing, so the exception and the orphan-panel
                   trap that came with it are both gone. */
                className={`hide-on-print fixed inset-y-0 right-0 z-[90] w-[176px] lg:w-64 bg-[#0b0a09]/97 lg:bg-black/95 backdrop-blur-xl border-l lg:border-l-0 lg:border-r border-[#3e3226] lg:border-white/10 flex flex-col pt-5 lg:pt-8 px-0 lg:pl-4 lg:pr-4 overflow-hidden
                             transition-[transform,width,padding,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)] lg:relative lg:translate-x-0
                             ${isMobileMenuOpen
                                ? 'translate-x-0 lg:w-64 lg:opacity-100'
                                : 'translate-x-full lg:w-0 lg:px-0 lg:border-r-0 lg:opacity-0 lg:pointer-events-none'}`}>

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

                {/* TWO COLUMNS ON A PHONE, one on a desk. Seventeen marks in a single file made
                    the rail a list you had to scroll, and a menu you scroll is a menu you search
                    — which is the opposite of what a fixed rail is for. Two columns put a full
                    tier's menu on one screen. `content-start` so a short menu sits at the top
                    instead of being spread down the whole rail. */}
                {user ? (
                    <nav
                        key={`nav-${isAdmin}`}
                        onPointerDown={startScrub}
                        onPointerMove={(e) => { if (scrubRef.current) scrubTo(e); }}
                        onPointerUp={endScrub}
                        onPointerCancel={() => { scrubRef.current = null; setPeek(null); }}
                        /* NO SCROLLING, at any tier, on any phone — his call: "there is still
                           scroll feature inside sidebar, i dont want that, find another solution
                           to fit it there".

                           The solution is to stop giving the rows a fixed height and let them
                           SHARE what there is. `auto-rows-[minmax(0,1fr)]` divides the column
                           evenly between however many marks this tier can see, so seventeen fit
                           on a tall phone and nine fit on a short one without either ever
                           scrolling. minmax(0,…) rather than plain 1fr is load-bearing: a grid
                           row's default minimum is its content, so without the 0 the rows refuse
                           to shrink and the overflow comes straight back.

                           touchAction is 'none' now, not 'pan-y'. With nothing to scroll, pan-y
                           only gave the browser a reason to steal a slow vertical drag from the
                           scrub. */
                        style={{ touchAction: 'none' }}
                        className="grid grid-cols-2 gap-2 p-2 auto-rows-[minmax(0,1fr)] overflow-hidden lg:block lg:space-y-0.5 lg:p-0 lg:overflow-y-auto flex-1 min-h-0 scrollbar-hide boot-2"
                    >
                        {visibleMenu.map(item => {
                            const Mark = item.icon;
                            const on = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    /* data-mark is how the nav's single listener finds this button
                                       under a finger — see the note on implicit pointer capture.
                                       The per-button pointer handlers that used to live here are
                                       gone: on touch they only ever fired for the first mark. */
                                    data-mark={item.id}
                                    data-label={item.label}
                                    onClick={() => { if (swallowedByScrub()) return; setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                                    title={item.label}
                                    className={`kpm-rail-mark ${on ? 'on' : ''} ${peek?.id === item.id ? 'hot' : ''} relative w-full flex items-center justify-center h-full min-h-0 lg:h-auto lg:block lg:text-left lg:py-2 lg:px-3 text-xs font-bold transition-all duration-200 uppercase tracking-widest lg:clip-path-polygon ${
                                        on
                                        ? 'text-[#ff9d00] lg:bg-white lg:text-black lg:pl-6 lg:shadow-[0_0_10px_rgba(255,255,255,0.8)] lg:border-l-4 lg:border-orange-500'
                                        : 'text-[#6b5845] lg:text-gray-500 lg:hover:text-white lg:hover:pl-4 lg:hover:bg-white/5'
                                    }`}
                                >
                                    {/* The lift lives on the ICON and the plate on ::before, and the
                                        two run on different clocks — that separation is what reads
                                        as weight instead of a box changing colour. */}
                                    <Mark
                                        size={23}
                                        strokeWidth={peek?.id === item.id || on ? 2.4 : 2}
                                        className="kpm-rail-icon lg:hidden"
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
                    {/* The rail gets out of the way when the pill opens — his rule from the
                        island ask, and it holds for the pill too: pressing music should hand the
                        screen to the player, not stack it on top of the menu. */}
                    {isAdmin && <MusicPlayer onOpen={() => setIsMobileMenuOpen(false)} />}

                    {user ? (
                        <div className="flex flex-col lg:flex-row items-center gap-2">
                            {/* HIS CALL: "my profile picture above the logout button should follow
                                the one each email have on the agent profile ... we dont need that
                                mascott profile anymore". So: the agent's own uploaded photo, then
                                the Google account picture, then a plain mark. The dicebear robot
                                and appSettings.mascotImage are both gone — one of them was a
                                network request on every load for a face nobody chose. */}
                            {agentPhoto || user?.photoURL ? (
                                <img
                                    src={agentPhoto || user.photoURL}
                                    className="w-9 h-9 lg:w-7 lg:h-7 rounded border border-[#5c4b3a] lg:border-white/30 object-cover bg-black shrink-0"
                                    alt="Profile"
                                />
                            ) : (
                                <div className="w-9 h-9 lg:w-7 lg:h-7 rounded border border-[#5c4b3a] lg:border-white/30 bg-black text-[#8b7256] flex items-center justify-center shrink-0">
                                    <User size={16} />
                                </div>
                            )}
                            <div className="hidden lg:block flex-1 min-w-0">
                                <p className="text-[11px] text-gray-400 uppercase font-bold leading-none mb-0.5">OPERATIVE</p>
                                <p className="text-[10px] text-white font-mono truncate leading-none">{user.email?.split('@')[0]}</p>
                            </div>
                            {/* The reference he sent for this one, in the app's colours: black at
                                rest with the rest of the panel, red only once you are on it. The
                                name plate is gone from here — this button says its own word now. */}
                            <button
                                onClick={handleLogout}
                                className="kpm-expand danger"
                                data-label="Log out"
                                title="Logout"
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

                        {/* A SWITCH, not a chip. His note: "make sure that it background change
                            from white to black according to the changes" — so the track itself
                            carries the answer. Black track with the knob left means you are in
                            the dark; white track with the knob right means you are in the light.
                            The knob shows the state you are IN, not the one you would get: a
                            switch that displays its destination is the oldest way to make a
                            toggle unreadable. `role="switch"` so it is announced as one. */}
                        {setDarkMode && (
                            <button
                                onClick={() => setDarkMode(prev => !prev)}
                                role="switch"
                                aria-checked={!darkMode}
                                aria-label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                                className={`kpm-theme-switch ${darkMode ? '' : 'is-light'}`}
                            >
                                <span className="knob">{darkMode ? <Moon size={12} /> : <Sun size={12} />}</span>
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