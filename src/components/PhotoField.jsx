import React, { useEffect, useState } from 'react';
import { Camera, RefreshCcw } from 'lucide-react';
import Lamp from './Lamp.jsx';
import { scanNotaToBase64 } from '../utils/helpers.js';

/* ONE photo box for every form that takes a picture. Aldi, 2026-09-15: "add animation and
   preview window on the scanner before the user attach it just to make sure that the picture
   is fine, also add preview on all photo attachment on this app especially the foto barang on
   the restock vault".

   Before this the box showed a filename and "Hapus" — a name is not a picture, and nobody can
   tell from "IMG_4021.jpg" that the nota was blurred or the box was cut off. Now the chosen
   photo is SHOWN, large enough to judge (full width of the box, up to 176 px tall), with
   GANTI / HAPUS under it. With `scan`, the box shows the SCAN — what the app will actually
   store — and says "Memindai nota…" with a sweeping line while helpers.scanNotaToBase64 works,
   so a bad scan is caught before Save, not found in the book a week later. The scan result is
   handed back through `onFile(file, scan)` so the save path does not pay for it twice.

   Motion: the preview enters with a short fade + scale (kpmPhotoIn, .2 s); the scanning line
   sweeps (kpmScanline). Lite Mode's `html.lite-mode *` completes both at once — the colour and
   the words carry the meaning, never the motion (his law). */
export default function PhotoField({ label, file, onFile, scan = false, galleryOk = true, icon: Icon = Camera, pickLabel, className = '' }) {
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
        if (!file) { setPreview(null); setBusy(false); return undefined; }
        let alive = true;
        if (scan) {
            setBusy(true); setPreview(null);
            scanNotaToBase64(file).then((dataUrl) => {
                if (!alive) return;
                setPreview(dataUrl); setBusy(false);
                onFile(file, dataUrl);
            }).catch(() => { if (alive) { setBusy(false); setPreview(null); setFailed(true); } });
            return () => { alive = false; };
        }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => { alive = false; URL.revokeObjectURL(url); };
    // onFile is the parent's setter; the scan result goes back once per file, not per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file, scan]);

    const pick = (e) => { const f = e.target.files?.[0] || null; e.target.value = ''; onFile(f, null); };
    const input = <input type="file" accept="image/*" {...(galleryOk ? {} : { capture: 'environment' })} className="hidden" onChange={pick} />;
    const on = !!file;

    return (
        <div className={`border rounded-lg bg-panel p-2.5 flex flex-col gap-1.5 transition-colors ${on ? 'border-orange' : 'border-line-2'} ${className}`}>
            <div className="flex items-center gap-2"><Lamp tone={on ? 'on' : 'off'} /><span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">{label}</span></div>
            {!on ? (
                <label className="min-h-[44px] border border-dashed border-line-3 rounded bg-inset flex items-center justify-center gap-2 cursor-pointer text-[10.5px] font-mono text-ink-muted hover:text-ink hover:border-orange transition-colors">
                    <Icon size={13}/> {pickLabel || (galleryOk ? 'ambil / pilih foto' : 'ambil foto')}
                    {input}
                </label>
            ) : (
                <>
                    {busy ? (
                        <div className="relative h-24 border border-orange rounded bg-inset overflow-hidden flex items-center justify-center text-[10.5px] font-mono text-accent-ink">
                            <span className="kpm-scanline absolute left-0 right-0 h-px bg-orange" aria-hidden="true" />
                            <RefreshCcw size={13} className="animate-spin mr-2" /> Memindai nota…
                        </div>
                    ) : preview ? (
                        <img src={preview} alt="" className="kpm-photo-in w-full max-h-44 object-contain rounded border border-orange bg-inset" />
                    ) : failed ? (
                        /* the file could not be read as a picture — say so; a bare filename would look attached */
                        <div className="h-11 px-2 border border-dashed border-accent-ink rounded bg-inset flex items-center text-[10.5px] font-mono text-accent-ink">Tidak terbaca sebagai foto — ganti atau ambil ulang.</div>
                    ) : null}
                    <div className="flex items-center justify-between gap-2 min-h-[36px]">
                        <span className="text-[10.5px] font-mono text-ink-muted truncate">{scan && preview ? 'hasil scan — yang akan tersimpan' : file.name}</span>
                        <span className="flex items-center gap-3 shrink-0">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-ink cursor-pointer hover:text-orange">Ganti{input}</label>
                            <button type="button" onClick={() => onFile(null, null)} className="text-[10px] font-bold uppercase tracking-widest text-danger-text">Hapus</button>
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
