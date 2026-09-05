import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CircleAlert } from 'lucide-react';

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
       state on a dead component. */
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

    return (
        <div className="relative" ref={dropdownRef}>
            {/* 🚀 THE BELL BUTTON */}
            <button
                ref={btnRef}
                onClick={() => {
                    if (isOpen) return setIsOpen(false);
                    // Measured at open time, not on mount: the header moves with the layout, and a
                    // rectangle read once would pin the panel to where the bell used to be.
                    const r = btnRef.current?.getBoundingClientRect();
                    if (r) setPos({ top: r.bottom + 12, right: Math.max(8, window.innerWidth - r.right) });
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
            </button>

            {/* 🚀 THE DROPDOWN NOTIFICATION CENTER */}
            {isOpen && createPortal((
                <div ref={panelRef} style={{ position: 'fixed', top: pos?.top ?? 64, right: pos?.right ?? 8 }} className="w-80 max-w-[calc(100vw-1rem)] bg-[#0f0e0d] border border-orange-500/30 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[9999] overflow-hidden flex flex-col max-h-[80vh] font-mono">
                    
                    {/* Header */}
                    <div className="p-3 bg-black/80 border-b border-orange-500/20 flex justify-between items-center">
                        <h3 className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <CircleAlert size={14} className="text-orange-500"/>
                            Inbox Alerts
                        </h3>
                    </div>
                    
                    {/* Notification List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 bg-black/40 backdrop-blur-md">
                        {sortedNotifs.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-[10px] uppercase tracking-widest">
                                No new alerts
                            </div>
                        ) : (
                            sortedNotifs.map(notif => {
                                const isUnread = !notif.read && notif.isRead !== true;
                                
                                return (
                                    <div 
                                        key={notif.id} 
                                        onClick={() => {
                                            if (onNotificationClick) onNotificationClick(notif);
                                            setIsOpen(false);
                                        }}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                            isUnread 
                                            ? 'bg-[#1a1510] border-orange-500/50 hover:border-orange-500 shadow-sm' 
                                            : 'bg-black/30 border-white/5 opacity-50 hover:opacity-100'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-[11px] font-black uppercase tracking-wider ${isUnread ? 'text-orange-400' : 'text-slate-400'}`}>
                                                {notif.title || "Alert"}
                                            </h4>
                                            <span className="text-[11px] text-slate-400 font-mono">
                                                {notif.timestamp?.seconds ? new Date(notif.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                                            {notif.message}
                                        </p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            ), document.body)}
        </div>
    );
};

export default NotificationBell;