import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';

export default function NotificationBell({ notifications = [], onNotificationClick }) {
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 bg-black/40 hover:bg-white/10 rounded-full border border-white/10 transition-colors">
                <Bell size={20} className="text-slate-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full animate-bounce shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[100] custom-scrollbar">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 sticky top-0 backdrop-blur-md z-10">
                        <h3 className="font-black text-white uppercase tracking-widest text-sm">Inbox</h3>
                        <button onClick={() => setIsOpen(false)}><X size={16} className="text-slate-400 hover:text-white"/></button>
                    </div>
                    <div className="p-2 space-y-1">
                        {notifications.length === 0 ? (
                            <p className="text-center text-xs text-slate-500 py-6 uppercase tracking-widest">All caught up!</p>
                        ) : notifications.map(n => (
                            <div key={n.id} onClick={() => { onNotificationClick(n); setIsOpen(false); }} className={`p-3 rounded-xl cursor-pointer transition-all border ${n.read ? 'bg-black/20 border-transparent opacity-60' : 'bg-slate-800 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] hover:bg-slate-700'}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`text-xs font-bold ${n.read ? 'text-slate-400' : 'text-indigo-400'}`}>{n.title}</h4>
                                    <span className="text-[9px] text-slate-500">{n.timestamp?.seconds ? new Date(n.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Now'}</span>
                                </div>
                                <p className={`text-[10px] ${n.read ? 'text-slate-500' : 'text-slate-300'}`}>{n.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}