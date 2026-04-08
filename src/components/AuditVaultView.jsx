import React, { useState, useEffect } from 'react';
import { Folder, Calendar, RotateCcw, ShieldCheck } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';

export default function AuditVaultView({ db, storage, appId, user, isAdmin, logAudit, setBackupToast, auditLogs }) {
    const [path, setPath] = useState({ year: null, month: null, day: null });
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    const years = ["2025", "2026"];
    const months = Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0'));
    const days = Array.from({length: 31}, (_, i) => (i + 1).toString().padStart(2, '0'));

    const handleRestoreFromSnapshot = async (logEntry) => {
        if (!isAdmin || !logEntry.snapshotPath) return;
        
        const confirmMsg = `[RE TERMINAL]: DOWNLOADING CLOUD ARCHIVE...\n\nTarget: ${logEntry.action}\n\nProceed with reconstruction?`;
        
        if (window.confirm(confirmMsg)) {
            try {
                setLoading(true);
                const fileRef = storageRef(storage, logEntry.snapshotPath);
                const downloadUrl = await getDownloadURL(fileRef);
                const response = await fetch(downloadUrl);
                const snapshot = await response.json();

                await logAudit("PRE_REVERT_SAFETY", `Auto-archived before reverting to ${logEntry.action}`, true);

                const batch = writeBatch(db);
                
                if (snapshot.inventory) {
                    snapshot.inventory.forEach(item => {
                        batch.set(doc(db, `artifacts/${appId}/users/${user.uid}/products`, item.id), item);
                    });
                }
                if (snapshot.customers) {
                    snapshot.customers.forEach(c => {
                        batch.set(doc(db, `artifacts/${appId}/users/${user.uid}/customers`, c.id), c);
                    });
                }

                await batch.commit();
                setBackupToast(true); 
                setTimeout(() => window.location.reload(), 2000);
                
            } catch (err) {
                console.error("CLOUD_REVERSION_FAILURE:", err);
                setLoading(false);
                alert("SYSTEM ERROR: Cloud data packet corrupted.");
            }
        }
    };

    useEffect(() => {
        if (path.year && path.month && path.day && user?.uid) {
            setLoading(true);
            const dateKey = `${path.year}-${path.month}-${path.day}`;
            const vaultPath = `artifacts/${appId}/users/${user.uid}/audit_vault/${dateKey}/logs`;
            
            const q = query(collection(db, vaultPath), orderBy('timestamp', 'desc'));
            const unsub = onSnapshot(q, (snap) => {
                setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
            }, (err) => {
                console.error("Vault Error:", err);
                setLoading(false);
            });
            return () => unsub();
        }
    }, [path, db, appId, user?.uid]);

    const formatM = (m) => new Date(2000, parseInt(m) - 1).toLocaleString('default', { month: 'long' });

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4">
            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="text-orange-500"/> Audit Vault
                    </h2>
                    <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em]">Immutable Operation Archive</p>
                </div>
            </div>
            
            <div className="bg-black/20 border border-white/10 rounded-2xl p-6 min-h-[400px] font-mono text-xs">
                {/* Breadcrumbs */}
                <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6 border-b border-white/5 pb-2">
                    <button onClick={() => setPath({year:null, month:null, day:null})} className="hover:text-white">VAULT</button>
                    {path.year && <><span>/</span><button onClick={() => setPath({...path, month:null, day:null})} className="text-orange-500">{path.year}</button></>}
                    {path.month && <><span>/</span><button onClick={() => setPath({...path, day:null})} className="text-orange-500">{formatM(path.month)}</button></>}
                    {path.day && <><span>/</span><span className="text-white">{path.day}</span></>}
                </div>

                {/* Folder Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {!path.year && years.map(y => (
                        <button key={y} onClick={() => setPath({...path, year: y})} className="flex flex-col items-center p-4 bg-white/5 border border-white/10 rounded-xl hover:border-orange-500 group transition-all">
                            <Folder size={24} className="text-orange-500 mb-2 group-hover:scale-110 transition-transform"/>
                            <span className="text-white font-bold">{y}</span>
                        </button>
                    ))}
                    {path.year && !path.month && months.map(m => (
                        <button key={m} onClick={() => setPath({...path, month: m})} className="flex flex-col items-center p-4 bg-white/5 border border-white/10 rounded-xl hover:border-blue-500 group transition-all">
                            <Calendar size={24} className="text-blue-500 mb-2"/>
                            <span className="text-white">{formatM(m)}</span>
                        </button>
                    ))}
                    {path.month && !path.day && days.map(d => (
                        <button key={d} onClick={() => setPath({...path, day: d})} className="flex flex-col items-center p-4 bg-white/5 border border-white/10 rounded-xl hover:border-emerald-500 group transition-all">
                            <div className="text-lg font-black text-white/20 group-hover:text-emerald-500">{d}</div>
                            <span className="text-[8px] text-slate-500 uppercase">DAY</span>
                        </button>
                    ))}
                </div>

                {/* Log List */}
                {path.day && (
                    <div className="mt-4 space-y-2 animate-fade-in">
                        {loading ? <p className="text-orange-500 animate-pulse text-center py-10 uppercase tracking-widest">/// Decrypting Sector ///</p> : logs.map(log => (
                            <div key={log.id} className="p-3 bg-white/5 border-l-2 border-orange-500 flex justify-between items-center group">
                                <div className="flex-1">
                                    <p className="text-white font-bold uppercase flex items-center gap-2">
                                        {log.action}
                                        {log.snapshotId && (
                                            <span className="text-[7px] bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded tracking-tighter animate-pulse">
                                                REMOTE SNAPSHOT LOADED
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-slate-400 text-[10px]">{log.details}</p>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    {log.snapshotId && isAdmin && (
                                        <button 
                                            onClick={() => handleRestoreFromSnapshot(log)}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white text-[9px] font-bold uppercase hover:bg-emerald-500 transition-colors shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                        >
                                            <RotateCcw size={10}/> Revert
                                        </button>
                                    )}
                                    <span className="text-slate-600 text-[9px]">{log.timeStr}</span>
                                </div>
                            </div>
                        ))}
                        {!loading && logs.length === 0 && <p className="text-slate-600 italic py-10 text-center uppercase tracking-widest">/// Sector Empty ///</p>}
                    </div>
                )}
            </div>

            {/* Recent System Activity Table */}
            <div className="mt-10">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 opacity-50">Recent System Activity</h3>
                <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden font-mono text-[10px]">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-slate-500">
                            <tr><th className="p-3">Action</th><th className="p-3">Details</th><th className="p-3 text-right">Time</th></tr>
                        </thead>
                        <tbody>
                            {auditLogs.slice(0, 8).map(log => (
                                <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="p-3 text-orange-500 font-bold">{log.action}</td>
                                    <td className="p-3 text-slate-300">{log.details}</td>
                                    <td className="p-3 text-right text-slate-500">
                                        {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString() : 'Just now'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}