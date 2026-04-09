import React, { useState, useRef, useEffect } from 'react';
import { Bell, CircleAlert } from 'lucide-react';

const NotificationBell = ({ notifications = [], onNotificationClick }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    
    // Sort newest first and count unread alerts
    const sortedNotifs = [...notifications].sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    const unreadCount = sortedNotifs.filter(n => !n.read && n.isRead !== true).length;

    // Close dropdown when clicking anywhere outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* 🚀 THE BELL BUTTON */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
            >
                <Bell size={24} className={unreadCount > 0 ? "animate-pulse text-orange-500" : ""} />
                
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-[0_0_10px_red]">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* 🚀 THE DROPDOWN NOTIFICATION CENTER */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-[#0f0e0d] border border-orange-500/30 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[9999] overflow-hidden flex flex-col max-h-[80vh] font-mono">
                    
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
                            <div className="py-8 text-center text-slate-600 text-[10px] uppercase tracking-widest">
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
                                            <span className="text-[9px] text-slate-500 font-mono">
                                                {notif.timestamp?.seconds ? new Date(notif.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Now'}
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
            )}
        </div>
    );
};

export default NotificationBell;