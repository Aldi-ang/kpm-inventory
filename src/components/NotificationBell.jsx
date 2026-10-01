import React, { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { getMissed, subscribeMissed, unseenCount, markMissedSeen, clearMissed } from '../utils/missedLog.js';

/* THE BELL HAS TWO PARTS - his design, 2026-10-02: *"1 is for the confirmation request or handsoff request
   and all of the urgent notification, and the other one is for temporary notification that can be cleared,
   this is just to record all the missed notification"*. Drawn as pictures and picked *"phone A pc B"*:
     - NEEDS YOU: what this bell always held (App.jsx combinedNotifications) - Firestore requests + logistics.
     - MISSED: every top strip and capybara line (utils/missedLog.js), on his account, kept 7 days.
     - Phone (A, under lg): one box and a switch - one list at a time, like his Master Vault pick.
     - PC (B, lg and up): both lists side by side, nothing to press. Both are the same markup; `lg:` decides.
   The red number counts Needs you and is the only thing that lights the plate or rings; the small gold
   number under it counts Missed lines that came after he last looked. */
const fmtTime = (ms) => {
    const d = new Date(ms);
    const hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === new Date().toDateString() ? hm : `${d.toLocaleDateString([], { weekday: 'short' })} ${hm}`;
};

const Count = ({ n, tone }) => n > 0 && (
    <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-black leading-none flex items-center justify-center ${tone === 'red'
        ? 'bg-red-600 text-white' : 'border border-[var(--duke-amber-edge)] text-[var(--duke-amber-ink)] bg-[var(--duke-fill-deep)]'}`}>{n}</span>
);

/* the PC's column heads; on the phone the switch names the list instead */
const ColumnTitle = ({ children, n, tone }) => (
    <div className="hidden lg:flex items-center gap-2 min-h-11 pl-3 pr-1 bg-black/60 border-b border-[var(--duke-edge-1)]">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--duke-ink-1)]">{children}</h3>
        <Count n={n} tone={tone} />
    </div>
);

/* A Missed row reads as the strip it came from: the strip's ink, a red edge for a failure, xN when the
   same words came back. `fresh` = arrived since he last looked. */
const MissedRow = ({ m, fresh }) => (
    <div className={`flex items-start gap-3 border-l-[3px] px-3 py-2.5 ${fresh ? 'bg-[#14100e]' : 'opacity-55'}`}
        style={{ borderLeftColor: m.bad ? '#b4524a' : fresh ? '#ff9d00' : 'transparent' }}>
        <p className="min-w-0 flex-1 whitespace-pre-line break-words text-[12px] leading-snug text-[#cfc6ba]">{m.text}</p>
        <div className="shrink-0 flex flex-col items-end gap-1">
            <span className="text-[11px] text-[var(--duke-ink-3)] tabular-nums">{fmtTime(m.ts)}</span>
            {m.count > 1 && <span className="px-1.5 rounded border border-[var(--duke-edge-2)] text-[10px] font-black text-[var(--duke-ink-2)]">×{m.count}</span>}
        </div>
    </div>
);

const Empty = ({ children }) => (
    <div className="py-8 text-center text-[var(--duke-ink-3)] text-[11px] uppercase tracking-widest">{children}</div>
);

const NotificationBell = ({ notifications = [], onNotificationClick }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    /* THE PANEL LEAVES THE HEADER. It used to be an absolutely-positioned child of the bell, which
       put it inside `BiohazardTheme.jsx:941` — a wrapper carrying `overflow-hidden` (which crops
       anything reaching past its box) and `relative z-10` (which caps how far above its siblings
       any descendant can be lifted, so the panel's own z-[9999] could never win). The badge counted
       correctly the whole time, so the mail was arriving and nobody could open it.

       A portal renders it as a child of <body> instead, where no ancestor can crop or cap it, and
       `position: fixed` off the button's own rectangle keeps it under the bell. This is the fix that
       holds no matter which ancestor grows an overflow rule next — the class of bug already fought
       once on this same bell (see the comment at BiohazardTheme.jsx:1032). */
    const panelRef = useRef(null);
    const btnRef = useRef(null);
    const [pos, setPos] = useState(null);

    const missed = useSyncExternalStore(subscribeMissed, getMissed);
    const missedCount = unseenCount(missed.items, missed.seenAt);
    /* which rows count as new is fixed when the box opens, so they keep their highlight while he reads
       even though looking moves seenAt (and clears the gold number) */
    const [seenAtOpen, setSeenAtOpen] = useState(0);
    const [side, setSide] = useState('needs');

    // 🚀 THE FIX: Handle null timestamps (pending Firebase server sync) so fresh alerts go to the TOP
    const sortedNotifs = [...notifications].sort((a, b) => {
        const timeA = a.timestamp?.seconds || (a.timestamp ? new Date(a.timestamp).getTime() / 1000 : Infinity);
        const timeB = b.timestamp?.seconds || (b.timestamp ? new Date(b.timestamp).getTime() / 1000 : Infinity);
        return timeB - timeA;
    });

    const unreadCount = sortedNotifs.filter(n => !n.read && n.isRead !== true).length;

    /* RING WHEN SOMETHING ARRIVES, not only when you touch it. The swing itself is CSS; this is
       just the 900ms window it runs in. Only on an INCREASE — reading your mail drops the count
       and must not set the bell off, which is what comparing against a ref rather than against
       zero buys. The timeout is cleared on unmount so a bell that leaves mid-ring cannot set
       state on a dead component. Missed lines never ring: every strip lands there. */
    const [ringing, setRinging] = useState(false);
    const prevUnread = useRef(unreadCount);
    useEffect(() => {
        const rose = unreadCount > prevUnread.current;
        prevUnread.current = unreadCount;
        if (!rose) return;
        setRinging(true);
        const t = setTimeout(() => setRinging(false), 900);
        return () => clearTimeout(t);
    }, [unreadCount]);

    /* The Missed list counts as looked at while it is on screen: always on the PC (both columns show),
       on the phone only with the switch on Missed. */
    useEffect(() => {
        if (isOpen && (side === 'missed' || window.innerWidth >= 1024) && missedCount > 0) markMissedSeen();
    }, [isOpen, side, missedCount]);

    // Close dropdown when clicking anywhere outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            // The panel is no longer inside dropdownRef - it lives on <body> - so it has to be
            // asked separately, or the first click inside it closes the panel before the row's
            // own onClick can run.
            const inBell = dropdownRef.current && dropdownRef.current.contains(event.target);
            const inPanel = panelRef.current && panelRef.current.contains(event.target);
            if (!inBell && !inPanel) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const phone = pos?.phone;
    const freshRows = missed.items.filter((m) => m.ts > seenAtOpen);
    const oldRows = missed.items.filter((m) => m.ts <= seenAtOpen);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* 🚀 THE BELL BUTTON */}
            <button
                ref={btnRef}
                aria-label={`Inbox: ${unreadCount} need you, ${missedCount} missed`}
                onClick={() => {
                    if (isOpen) return setIsOpen(false);
                    // Measured at open time, not on mount: the header moves with the layout, and a
                    // rectangle read once would pin the panel to where the bell used to be.
                    const r = btnRef.current?.getBoundingClientRect();
                    if (r) setPos({ top: r.bottom + 12, right: Math.max(8, window.innerWidth - r.right), phone: window.innerWidth < 1024 });
                    setSeenAtOpen(missed.seenAt || 0);
                    /* opens where the news is: Needs you while it has a red number */
                    setSide(unreadCount > 0 || missedCount === 0 ? 'needs' : 'missed');
                    setIsOpen(true);
                }}
                /* was `text-slate-400` and a bare 24px icon — slate IS the blue, and it was the
                   only control in the header wearing no plate at all. .kpm-chip is the shared
                   one; `.on` is what the unread state lights up. */
                className={`kpm-chip kpm-bell relative ${unreadCount > 0 ? 'on' : ''} ${ringing ? 'ringing' : ''}`}
            >
                {/* the permanent `animate-pulse` is gone with this: a loop that never stops is
                    not news, and the gold `on` plate already says there is unread mail. */}
                {/* 22, up from 18 — the plate went 36 -> 44 and an icon left at its old size
                    turns a bigger button into a bigger EMPTY button. */}
                <Bell size={22} />

                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-[0_0_10px_red]">
                        {unreadCount}
                    </span>
                )}
                {missedCount > 0 && (
                    <span className="absolute bottom-0 right-0 min-w-4 h-4 px-1 rounded-full border border-[var(--duke-amber-edge)] bg-[var(--duke-fill-deep)] text-[var(--duke-amber-ink)] text-[10px] font-black leading-none flex items-center justify-center">
                        {missedCount}
                    </span>
                )}
            </button>

            {/* 🚀 THE DROPDOWN NOTIFICATION CENTER */}
            {isOpen && createPortal((
                <div ref={panelRef}
                    style={{ position: 'fixed', top: pos?.top ?? 64, right: phone ? 8 : (pos?.right ?? 8), left: phone ? 8 : 'auto', maxHeight: 'min(72vh, 600px)' }}
                    className="lg:w-[680px] bg-[#0f0e0d] border border-[var(--duke-edge-2)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[9999] overflow-hidden flex flex-col font-mono">

                    {/* the phone's switch: one list at a time */}
                    <div className="lg:hidden p-2 bg-black/60 border-b border-[var(--duke-edge-1)]">
                        <div role="tablist" className="relative grid grid-cols-2 h-12 rounded-lg border border-[var(--duke-edge-1)] bg-black/50">
                            <span aria-hidden="true" className="absolute top-1 bottom-1 left-1 rounded-md border border-[var(--duke-amber-edge)] bg-[var(--duke-fill-panel)] shadow-[inset_0_1px_0_rgba(255,228,175,.15),0_0_12px_rgba(255,157,0,.18)] transition-transform duration-200 ease-out"
                                style={{ width: 'calc(50% - 4px)', transform: side === 'missed' ? 'translateX(100%)' : 'none' }} />
                            {[['needs', 'Needs you', unreadCount, 'red'], ['missed', 'Missed', missedCount, 'gold']].map(([k, label, n, tone]) => (
                                <button key={k} role="tab" aria-selected={side === k} onClick={() => setSide(k)}
                                    className={`relative z-10 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest ${side === k ? 'text-[var(--duke-amber-ink)]' : 'text-[var(--duke-ink-3)]'}`}>
                                    {label}<Count n={n} tone={tone} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
                        {/* NEEDS YOU */}
                        <section className={`${side === 'needs' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0 lg:w-1/2 lg:border-r border-[var(--duke-edge-1)]`}>
                            <ColumnTitle n={unreadCount} tone="red">Needs you</ColumnTitle>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 bg-black/40">
                                {sortedNotifs.length === 0 ? <Empty>Nothing needs you</Empty> : sortedNotifs.map(notif => {
                                    const isUnread = !notif.read && notif.isRead !== true;
                                    return (
                                        <div
                                            key={notif.id}
                                            onClick={() => {
                                                if (onNotificationClick) onNotificationClick(notif);
                                                setIsOpen(false);
                                            }}
                                            /* tokens, not orange-400/500: `orange` is ONE colour in tailwind.config.js,
                                               so those classes were never generated and the new titles printed black */
                                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                                isUnread
                                                ? 'bg-[#1a1510] border-[var(--duke-edge-5)] hover:border-[var(--duke-amber-edge)]'
                                                : 'bg-black/30 border-[var(--duke-edge-1)] opacity-50 hover:opacity-100'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                <h4 className={`text-[11px] font-black uppercase tracking-wider ${isUnread ? 'text-[var(--duke-amber-ink)]' : 'text-[var(--duke-ink-3)]'}`}>
                                                    {notif.title || "Alert"}
                                                </h4>
                                                <span className="text-[11px] text-[var(--duke-ink-3)] font-mono shrink-0">
                                                    {notif.timestamp?.seconds ? fmtTime(notif.timestamp.seconds * 1000) : 'Just now'}
                                                </span>
                                            </div>
                                            {/* 12, up from 10 - his "bigger small type", 2026-08-16 */}
                                            <p className="text-[12px] text-[var(--duke-ink-1)] leading-relaxed font-sans">
                                                {notif.message}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* MISSED */}
                        <section className={`${side === 'missed' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0 lg:w-1/2`}>
                            <ColumnTitle n={missedCount} tone="gold">Missed</ColumnTitle>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between pl-3 pr-1 border-b border-[var(--duke-edge-1)]">
                                    <span className="text-[10px] uppercase tracking-widest text-[var(--duke-ink-3)]">Kept 7 days</span>
                                    {missed.items.length > 0 && (
                                        <button onClick={clearMissed} className="h-11 px-3 text-[11px] font-black uppercase tracking-widest text-[var(--duke-ink-2)] hover:text-[var(--duke-amber-ink)]">Clear all</button>
                                    )}
                                </div>
                                {missed.items.length === 0 ? <Empty>Nothing missed</Empty> : (
                                    <>
                                        <div className="divide-y divide-[var(--duke-edge-1)]">{freshRows.map((m) => <MissedRow key={m.text} m={m} fresh />)}</div>
                                        {oldRows.length > 0 && <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-widest text-[var(--duke-ink-3)]">Earlier</div>}
                                        <div className="divide-y divide-[var(--duke-edge-1)]">{oldRows.map((m) => <MissedRow key={m.text} m={m} />)}</div>
                                    </>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            ), document.body)}
        </div>
    );
};

export default NotificationBell;
