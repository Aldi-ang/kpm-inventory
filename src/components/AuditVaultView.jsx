import React, { useState, useEffect } from 'react';
import { Folder, Calendar, RotateCcw, ShieldCheck } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { commitInChunks } from '../utils/helpers';
import { confirmAction } from './ConfirmGate.jsx';
import { notify } from './Toast.jsx';

export default function AuditVaultView({ db, storage, appId, user, userId, isAdmin, logAudit, setBackupToast, auditLogs }) {
    const [path, setPath] = useState({ year: null, month: null, day: null });
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // 🚀 FIX: Master-vault-scoped ID (mirrors `bossUid || user?.uid` in App.jsx) so a
    // restore always lands in the shared company vault, never a personal path.
    const masterUid = userId || user?.uid;

    const START_YEAR = 2025;
    const YEARS_AHEAD = 3;
    const years = Array.from(
        { length: (new Date().getFullYear() + YEARS_AHEAD) - START_YEAR + 1 },
        (_, i) => (START_YEAR + i).toString()
    );
    const months = Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0'));
    const days = Array.from({length: 31}, (_, i) => (i + 1).toString().padStart(2, '0'));

    const handleRestoreFromSnapshot = async (logEntry) => {
        if (!isAdmin || !logEntry.snapshotPath) return;
        
        const confirmMsg = `[RE TERMINAL]: DOWNLOADING CLOUD ARCHIVE...\n\nTarget: ${logEntry.action}\n\nProceed with reconstruction?`;
        
        if (await confirmAction(confirmMsg)) {
            try {
                setLoading(true);
                const fileRef = storageRef(storage, logEntry.snapshotPath);
                const downloadUrl = await getDownloadURL(fileRef);
                const response = await fetch(downloadUrl);
                const snapshot = await response.json();

                await logAudit("PRE_REVERT_SAFETY", `Auto-archived before reverting to ${logEntry.action}`, true);

                // 🚀 FIX: Build the full list of operations first, then let commitInChunks
                // split it into safe groups of 500 — no more silent failure on a big backup.
                const operations = [];

                if (snapshot.inventory) {
                    snapshot.inventory.forEach(item => {
                        operations.push({ type: 'set', ref: doc(db, `artifacts/${appId}/users/${masterUid}/products`, item.id), data: item });
                    });
                }
                if (snapshot.customers) {
                    snapshot.customers.forEach(c => {
                        operations.push({ type: 'set', ref: doc(db, `artifacts/${appId}/users/${masterUid}/customers`, c.id), data: c });
                    });
                }

                await commitInChunks(db, writeBatch, operations);
                setBackupToast(true); 
                setTimeout(() => window.location.reload(), 2000);
                
            } catch (err) {
                console.error("CLOUD_REVERSION_FAILURE:", err);
                setLoading(false);
                notify("SYSTEM ERROR: Cloud data packet corrupted.");
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
            <div className="flex justify-between items-end border-b border-[var(--line)] pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--ink)] flex items-center gap-2">
                        <ShieldCheck className="text-[var(--accent-ink)]"/> Audit Vault
                    </h2>
                    <p className="text-[var(--ink-dim)] text-[10px] uppercase tracking-[0.2em]">Immutable Operation Archive</p>
                </div>
            </div>
            
            <div className="bg-[var(--panel)] border border-[var(--line)] rounded-2xl p-6 min-h-[400px] font-mono text-xs">
                {/* Breadcrumbs */}
                <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--ink-dim)] mb-6 border-b border-[var(--line)] pb-2">
                    <button onClick={() => setPath({year:null, month:null, day:null})} className="hover:text-[var(--ink)]">VAULT</button>
                    {path.year && <><span>/</span><button onClick={() => setPath({...path, month:null, day:null})} className="text-[var(--accent-ink)]">{path.year}</button></>}
                    {path.month && <><span>/</span><button onClick={() => setPath({...path, day:null})} className="text-[var(--accent-ink)]">{formatM(path.month)}</button></>}
                    {path.day && <><span>/</span><span className="text-[var(--ink)]">{path.day}</span></>}
                </div>

                {/* Folder Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {!path.year && years.map(y => (
                        <button key={y} onClick={() => setPath({...path, year: y})} className="flex flex-col items-center p-4 bg-[var(--inset)] border border-[var(--line)] rounded-xl hover:border-[var(--accent-edge)] group transition-all">
                            <Folder size={24} className="text-[var(--accent-ink)] mb-2 group-hover:scale-110 transition-transform"/>
                            <span className="text-[var(--ink)] font-bold">{y}</span>
                        </button>
                    ))}
                    {/* blue was DECORATION here — the three folder levels differed only by hue, and
                        nothing was being said by it. One accent for all three levels; the level is
                        already carried by the breadcrumb above and by the icon shape. */}
                    {path.year && !path.month && months.map(m => (
                        <button key={m} onClick={() => setPath({...path, month: m})} className="flex flex-col items-center p-4 bg-[var(--inset)] border border-[var(--line)] rounded-xl hover:border-[var(--accent-edge)] group transition-all">
                            <Calendar size={24} className="text-[var(--accent-ink)] mb-2"/>
                            <span className="text-[var(--ink)]">{formatM(m)}</span>
                        </button>
                    ))}
                    {path.month && !path.day && days.map(d => (
                        <button key={d} onClick={() => setPath({...path, day: d})} className="flex flex-col items-center p-4 bg-[var(--inset)] border border-[var(--line)] rounded-xl hover:border-[var(--accent-edge)] group transition-all">
                            <div className="text-lg font-black text-[var(--ink-disabled)] group-hover:text-[var(--accent-ink)]">{d}</div>
                            <span className="text-[11px] text-[var(--ink-dim)] uppercase">DAY</span>
                        </button>
                    ))}
                </div>

                {/* Log List */}
                {path.day && (
                    <div className="mt-4 space-y-2 animate-fade-in">
                        {loading ? <p className="text-[var(--accent-ink)] animate-pulse text-center py-10 uppercase tracking-widest">/// Decrypting Sector ///</p> : logs.map(log => (
                            <div key={log.id} className="p-3 bg-[var(--inset)] border-l-2 border-[var(--accent-edge)] flex justify-between items-center group">
                                <div className="flex-1">
                                    <p className="text-[var(--ink)] font-bold uppercase flex items-center gap-2">
                                        {log.action}
                                        {/* ⚠️ EMERALD -> GOLD, AND THIS IS A PROVISIONAL CHOICE.
                                            Green is banned by the palette law, but the MEANING here
                                            ("a snapshot exists, this row can be reverted") has no
                                            token of its own — the app's only "yes" colour is gold.
                                            This is the same unanswered question as the emerald on
                                            EODReconciliationView; when Aldi settles that, settle
                                            this with it rather than inventing a second answer. */}
                                        {log.snapshotId && (
                                            <span className="text-[10px] bg-[var(--gold)] text-[var(--gold-ink)] border border-[var(--accent-edge)] px-1.5 py-0.5 rounded tracking-tighter animate-pulse">
                                                REMOTE SNAPSHOT LOADED
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-[var(--ink-dim)] text-[10px]">{log.details}</p>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    {log.snapshotId && isAdmin && (
                                        <button 
                                            onClick={() => handleRestoreFromSnapshot(log)}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-[var(--gold)] text-[var(--gold-ink)] text-[11px] font-bold uppercase hover:brightness-110 transition-[filter] border border-[var(--accent-edge)]"
                                        >
                                            <RotateCcw size={10}/> Revert
                                        </button>
                                    )}
                                    <span className="text-[var(--ink-dim)] text-[11px]">{log.timeStr}</span>
                                </div>
                            </div>
                        ))}
                        {!loading && logs.length === 0 && <p className="text-[var(--ink-dim)] italic py-10 text-center uppercase tracking-widest">/// Sector Empty ///</p>}
                    </div>
                )}
            </div>

            {/* Recent System Activity Table */}
            <div className="mt-10">
                {/* ⚠️ `opacity-50` DELETED, not re-coloured. It was halving an already-pale slate, so this
                    heading was landing near 1,8:1 on cream — the single worst thing in his screenshot.
                    Opacity applied to text is a contrast cut that no colour token can defend against. */}
                <h3 className="text-xs font-bold text-[var(--ink-muted)] uppercase mb-4">Recent System Activity</h3>
                <div className="bg-[var(--panel)] border border-[var(--line)] rounded-xl overflow-hidden font-mono text-[10px]">
                    <table className="w-full text-left">
                        <thead className="bg-[var(--inset)] text-[var(--ink-dim)]">
                            <tr><th className="p-3">Action</th><th className="p-3">Details</th><th className="p-3 text-right">Time</th></tr>
                        </thead>
                        <tbody>
                            {auditLogs.slice(0, 8).map(log => (
                                <tr key={log.id} className="border-b border-[var(--line)] hover:bg-[var(--inset)]">
                                    <td className="p-3 text-[var(--accent-ink)] font-bold">{log.action}</td>
                                    <td className="p-3 text-[var(--ink)]">{log.details}</td>
                                    <td className="p-3 text-right text-[var(--ink-dim)]">
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