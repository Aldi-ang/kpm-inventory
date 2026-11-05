import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Newspaper, X } from 'lucide-react';
import { PATCH_NOTES, PATCH_STAMP } from '../config/patchNotes.js';
import { getLang, tr } from '../config/lang.js';

const SEEN_KEY = 'kpm_patch_seen';
const readSeen = () => { try { return localStorage.getItem(SEEN_KEY); } catch { return null; } };
const isEnglish = getLang() === 'en';
const dayWord = (date) => new Date(`${date}T00:00:00`).toLocaleDateString(isEnglish ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

/* The top bar's PATCH NOTES plate: every tier, a gold dot until the newest line has been opened on this phone. The list and its
   words live in config/patchNotes.js. */
export default function PatchNotesButton() {
    const [open, setOpen] = useState(false);
    const [seen, setSeen] = useState(readSeen);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    const show = () => {
        setOpen(true);
        setSeen(PATCH_STAMP);
        try { localStorage.setItem(SEEN_KEY, PATCH_STAMP); } catch { /* storage blocked: the dot comes back next load */ }
    };

    return (
        <>
            <button type="button" onClick={show} aria-label={tr('Patch notes')} className="kpm-chip relative">
                <Newspaper size={20} aria-hidden="true" />
                <span className="text-[10px] font-black tracking-widest hidden md:inline">{tr('PATCH NOTES')}</span>
                {seen !== PATCH_STAMP && <span aria-hidden="true" className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--duke-amber-ink)]" />}
            </button>

            {open && createPortal((
                <div onClick={() => setOpen(false)} className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
                    <div role="dialog" aria-modal="true" aria-label={tr('Patch notes')} onClick={(e) => e.stopPropagation()}
                        className="bg-[var(--duke-well-solid)] border border-[var(--duke-edge-1)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="bg-[var(--duke-fill-well)] p-4 border-b border-[var(--duke-edge-1)] flex justify-between items-start gap-3 shrink-0">
                            <div className="min-w-0">
                                <h3 className="text-[var(--duke-ink-hi)] font-black uppercase tracking-widest flex items-center gap-2"><Newspaper size={18} aria-hidden="true" className="text-[var(--duke-amber-ink)] shrink-0" /> {tr('Patch notes')}</h3>
                                <p className="text-xs text-[var(--duke-ink-3)] mt-1">{tr('What changed in the app, newest first.')}</p>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} aria-label={tr('Close')} className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center shrink-0 text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]"><X size={20} aria-hidden="true" /></button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar p-4 space-y-5">
                            {PATCH_NOTES.map((day) => (
                                <section key={day.date}>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--duke-ink-3)] mb-2">{dayWord(day.date)}</h4>
                                    <ul className="space-y-3">
                                        {day.items.map((item) => (
                                            <li key={item.en} className="flex items-start gap-2.5">
                                                <span className={`shrink-0 mt-0.5 w-[84px] text-center text-[10px] font-black uppercase tracking-wider py-0.5 rounded border ${item.kind === 'new' ? 'border-[var(--duke-amber-edge)] text-[var(--duke-amber-ink)]' : 'border-[var(--duke-edge-2)] text-[var(--duke-ink-3)]'}`}>{tr(item.kind === 'new' ? 'New' : 'Fixed')}</span>
                                                <span className="min-w-0 text-sm leading-relaxed text-[var(--duke-ink-hi)]">{isEnglish ? item.en : item.id}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    </div>
                </div>
            ), document.body)}
        </>
    );
}
