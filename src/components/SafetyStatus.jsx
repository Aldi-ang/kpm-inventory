import React from 'react';
import { ShieldCheck, ShieldAlert, History } from 'lucide-react';

export default function SafetyStatus({ auditLogs = [], sessionStatus }) {
    // 1. Get Limits
    const resetThreshold = parseInt(localStorage.getItem('indicator_reset_time') || '0');
    const now = new Date();
    const todayStr = now.toLocaleDateString();

    // 2. CLOUD SYNC LOGIC (Matches Settings)
    const confirmedMirror = auditLogs.find(log => 
        (log.action === "DATABASE_MIRROR" || log.action === "MASTER_BACKUP") && 
        log.timestamp && 
        (log.timestamp.seconds * 1000 > resetThreshold)
    );
    const isCloudSecure = sessionStatus?.cloud || !!confirmedMirror;

    // 3. USB SAFE LOGIC (Matches Settings)
    const lastUSB = parseInt(localStorage.getItem('last_usb_backup') || '0');
    const isUsbValidInDb = lastUSB > resetThreshold && (now.getTime() - lastUSB) < (7 * 24 * 60 * 60 * 1000);
    const isUsbSecure = sessionStatus?.usb || isUsbValidInDb;

    // 4. SNAPSHOT LOGIC
    const todaySnapshots = auditLogs.filter(log => {
        if (!log.isSavePoint || !log.timestamp || !log.timestamp.seconds) return false;
        try {
            const logDate = new Date(log.timestamp.seconds * 1000).toLocaleDateString();
            return logDate === todayStr;
        } catch (e) { return false; }
    }).length;
    const isRecoverySecure = sessionStatus?.recovery || todaySnapshots > 0;

    return (
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm flex gap-6 shadow-lg mb-6">
            <div className="flex-1">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-widest">Cloud Sync</p>
                <div className={`text-sm font-black flex items-center gap-2 ${isCloudSecure ? 'text-emerald-500' : 'text-red-500'}`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isCloudSecure ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    {isCloudSecure ? 'SECURE' : 'REQUIRED'}
                </div>
            </div>
            
            <div className="w-[1px] bg-white/10"></div>
            
            <div className="flex-1 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-widest">USB Safe</p>
                <div className={`text-sm font-black flex justify-center items-center gap-2 ${isUsbSecure ? 'text-emerald-500' : 'text-orange-500'}`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isUsbSecure ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                    {isUsbSecure ? 'SECURE' : 'OUTDATED'}
                </div>
            </div>
            
            <div className="w-[1px] bg-white/10"></div>
            
            <div className="flex-1 text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-widest">Save Points</p>
                <div className={`text-sm font-black flex justify-end items-center gap-2 font-mono ${isRecoverySecure ? 'text-emerald-400' : 'text-slate-400'}`}>
                    <History size={14} className={isRecoverySecure ? "animate-pulse" : "opacity-30"}/>
                    {todaySnapshots.toString().padStart(2, '0')} <span className="text-[8px] text-slate-600">TODAY</span>
                </div>
            </div>
        </div>
    );
}