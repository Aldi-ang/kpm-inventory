import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCcw } from 'lucide-react';
import Lamp from './Lamp.jsx';
import { scanNotaToBase64, loadNotaPhoto, findPaper } from '../utils/helpers.js';

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

   With `scan` there is also SESUAIKAN (Aldi, 2026-09-15, of the first real scan: "there is no
   pressable or interaction button on the preview photo or maybe the edit button like camscanner
   have"): a full-screen sheet with the ORIGINAL photo and the four corners the scanner found as
   handles to drag, PUTAR 90°, PAKAI / BATAL. PAKAI scans again with the hand-set corners. An
   "asli / scan" switch under the preview shows the photo the scan came from, for comparing.

   Motion: the preview enters with a short fade + scale (kpmPhotoIn, .2 s); the scanning line
   sweeps (kpmScanline). Lite Mode's `html.lite-mode *` completes both at once — the colour and
   the words carry the meaning, never the motion (his law). The editor is not motion; Lite Mode
   never strips it. */
export default function PhotoField({ label, file, onFile, scan = false, galleryOk = true, icon: Icon = Camera, pickLabel, className = '' }) {
    const [preview, setPreview] = useState(null);
    const [original, setOriginal] = useState(null);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        setFailed(false); setShowOriginal(false); setEditing(false);
        if (!file) { setPreview(null); setOriginal(null); setBusy(false); return undefined; }
        let alive = true;
        const url = URL.createObjectURL(file);
        setOriginal(url);
        if (scan) {
            setBusy(true); setPreview(null);
            scanNotaToBase64(file).then((dataUrl) => {
                if (!alive) return;
                setPreview(dataUrl); setBusy(false);
                onFile(file, dataUrl);
            }).catch(() => { if (alive) { setBusy(false); setPreview(null); setFailed(true); } });
        } else setPreview(url);
        return () => { alive = false; URL.revokeObjectURL(url); };
    // onFile is the parent's setter; the scan result goes back once per file, not per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file, scan]);

    /* PAKAI from the corner sheet: scan again with the corners he set; the result replaces the
       preview and goes back to the form, so Save stores what he sees and never rescans */
    const rescan = (corners, turns) => {
        setEditing(false); setBusy(true); setShowOriginal(false);
        scanNotaToBase64(file, { corners, turns }).then((dataUrl) => {
            setPreview(dataUrl); setBusy(false); onFile(file, dataUrl);
        }).catch(() => { setBusy(false); setFailed(true); });
    };

    const pick = (e) => { const f = e.target.files?.[0] || null; e.target.value = ''; onFile(f, null); };
    const input = <input type="file" accept="image/*" {...(galleryOk ? {} : { capture: 'environment' })} className="hidden" onChange={pick} />;
    const on = !!file;
    const shown = scan && showOriginal ? original : preview;

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
                        <img src={shown} alt="" className="kpm-photo-in w-full max-h-44 object-contain rounded border border-orange bg-inset" />
                    ) : failed ? (
                        /* the file could not be read as a picture — say so; a bare filename would look attached */
                        <div className="h-11 px-2 border border-dashed border-accent-ink rounded bg-inset flex items-center text-[10.5px] font-mono text-accent-ink">Tidak terbaca sebagai foto — ganti atau ambil ulang.</div>
                    ) : null}
                    {scan && preview && !busy && (
                        /* asli / scan: the photo the scan came from, beside what will be stored */
                        <div className="flex items-center gap-1 text-[9.5px] font-mono uppercase tracking-widest">
                            {[['asli', true], ['scan', false]].map(([name, orig]) => (
                                <button key={name} type="button" onClick={() => setShowOriginal(orig)} aria-pressed={showOriginal === orig}
                                    className={`min-h-[28px] px-2 border rounded ${showOriginal === orig ? 'border-orange text-orange' : 'border-line-2 text-ink-muted'}`}>{name}</button>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center justify-between gap-2 min-h-[36px]">
                        <span className="text-[10.5px] font-mono text-ink-muted truncate">{scan && preview ? (showOriginal ? 'foto asli — tidak tersimpan' : 'hasil scan — yang akan tersimpan') : file.name}</span>
                        <span className="flex items-center gap-3 shrink-0">
                            {scan && !busy && !failed && (
                                <button type="button" data-edit onClick={() => setEditing(true)} className="text-[10px] font-bold uppercase tracking-widest text-orange">Sesuaikan</button>
                            )}
                            <label className="text-[10px] font-bold uppercase tracking-widest text-ink cursor-pointer hover:text-orange">Ganti{input}</label>
                            <button type="button" onClick={() => onFile(null, null)} className="text-[10px] font-bold uppercase tracking-widest text-danger-text">Hapus</button>
                        </span>
                    </div>
                    {editing && <CornerSheet file={file} onApply={rescan} onClose={() => setEditing(false)} />}
                </>
            )}
        </div>
    );
}

/* THE CORNER SHEET — full screen, in the app's dialog language (ConfirmGate.jsx: dim backdrop,
   the dark bordered panel, mono heading, CANCEL beside the accent button) — never a browser
   dialog. The ORIGINAL photo, the four corners helpers.findPaper found as 44 px handles to drag
   (pointer events, touch-action none — a finger on a handle must not scroll the page), PUTAR 90°
   for a sheet read the wrong way up, PAKAI / BATAL. The corners live in the photo's own pixel
   grid (loadNotaPhoto's canvas), so PAKAI hands helpers.warpQuad exactly what it drags. */
function CornerSheet({ file, onApply, onClose }) {
    const [photo, setPhoto] = useState(null);          // { url, width, height, found }
    const [corners, setCorners] = useState(null);
    const [turns, setTurns] = useState(0);
    const box = useRef(null);

    useEffect(() => {
        let alive = true;
        loadNotaPhoto(file).then((c) => {
            if (!alive) return;
            const { width: w, height: h } = c;
            const q = findPaper(c.getContext('2d').getImageData(0, 0, w, h).data, w, h);
            /* not found → the whole frame, so there is always something to drag */
            setCorners(q || [[0, 0], [w, 0], [w, h], [0, h]]);
            setPhoto({ url: c.toDataURL('image/jpeg', 0.7), width: w, height: h, found: !!q });
        }).catch(() => { if (alive) onClose(); });
        return () => { alive = false; };
    // onClose is the parent's setter, a new function each render; the photo loads once per file
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file]);

    /* a handle follows the pointer while it is held: capture on down, move maps the pointer to
       the photo's pixel grid through the box's on-screen size, clamped to the frame */
    const drag = (i) => (e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const move = (ev) => {
            if (!box.current) return;
            const r = box.current.getBoundingClientRect();
            const x = Math.min(photo.width, Math.max(0, (ev.clientX - r.left) / r.width * photo.width));
            const y = Math.min(photo.height, Math.max(0, (ev.clientY - r.top) / r.height * photo.height));
            setCorners((c) => c.map((p, j) => (j === i ? [x, y] : p)));
        };
        const up = (ev) => { ev.currentTarget.removeEventListener('pointermove', move); ev.currentTarget.removeEventListener('pointerup', up); ev.currentTarget.removeEventListener('pointercancel', up); };
        e.currentTarget.addEventListener('pointermove', move);
        e.currentTarget.addEventListener('pointerup', up);
        e.currentTarget.addEventListener('pointercancel', up);
    };

    /* which edge becomes the TOP of the scan after `turns` quarter turns — labelled ATAS on the
       photo so a turn is visible before PAKAI (warpQuad: one cycle of the corner order = 90°) */
    const topEdge = corners ? [corners[(4 - turns) % 4], corners[(5 - turns) % 4]] : null;
    const pct = (p) => ({ left: `${(p[0] / photo.width) * 100}%`, top: `${(p[1] / photo.height) * 100}%` });

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-3" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div role="dialog" aria-modal="true" aria-label="Sesuaikan sudut nota" className="w-full max-w-md max-h-full flex flex-col border border-[#a89070] bg-[#14100e] shadow-[0_0_40px_rgba(0,0,0,0.8)]">
                <div className="border-l-[3px] border-[#ff9d00] px-4 py-3">
                    <div className="mb-1 font-mono text-[9.5px] font-black uppercase tracking-[0.16em] text-[#ff9d00]">Sesuaikan sudut nota</div>
                    <div className="font-mono text-[11px] leading-relaxed text-[#cfc6ba]">
                        {!photo ? 'Memuat foto…' : photo.found ? 'Geser keempat sudut ke pojok kertas, lalu PAKAI.' : 'Sudut kertas tidak ketemu sendiri — geser keempat sudut ke pojok kertas, lalu PAKAI.'}
                    </div>
                </div>
                <div className="px-4 pb-3 overflow-auto">
                    {photo && corners && (
                        <div ref={box} className="relative mx-auto select-none" style={{ width: `min(100%, calc(62vh * ${photo.width / photo.height}))`, aspectRatio: `${photo.width} / ${photo.height}` }}>
                            <img src={photo.url} alt="" draggable={false} className="block w-full h-full" />
                            <svg viewBox={`0 0 ${photo.width} ${photo.height}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                                <polygon points={corners.map((p) => p.join(',')).join(' ')} fill="rgba(255,157,0,.12)" stroke="#ff9d00" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                <line x1={topEdge[0][0]} y1={topEdge[0][1]} x2={topEdge[1][0]} y2={topEdge[1][1]} stroke="#ff9d00" strokeWidth="5" vectorEffect="non-scaling-stroke" />
                            </svg>
                            <span className="absolute -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-[#ff9d00] text-[#14100e] font-mono text-[9px] font-black uppercase tracking-widest pointer-events-none"
                                style={pct([(topEdge[0][0] + topEdge[1][0]) / 2, (topEdge[0][1] + topEdge[1][1]) / 2])}>atas</span>
                            {corners.map((p, i) => (
                                <button key={i} type="button" aria-label={`sudut ${i + 1}`} data-corner={i} onPointerDown={drag(i)}
                                    className="absolute w-11 h-11 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-move"
                                    style={{ ...pct(p), touchAction: 'none' }}>
                                    <span className="block w-5 h-5 rounded-full border-2 border-[#ff9d00] bg-[#14100e]/80 shadow-[0_0_0_2px_rgba(0,0,0,.6)]" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex gap-2 border-t border-[#3a3128] p-3">
                    <button type="button" onClick={() => setTurns((t) => (t + 1) % 4)} disabled={!photo}
                        className="min-h-[44px] flex-1 border border-[#a89070] px-3 font-mono text-[11px] font-black uppercase tracking-wider text-[#cfc6ba] transition-colors hover:bg-[#241d18] disabled:opacity-50">Putar 90°</button>
                    <button type="button" onClick={onClose}
                        className="min-h-[44px] flex-1 border border-[#a89070] px-3 font-mono text-[11px] font-black uppercase tracking-wider text-[#cfc6ba] transition-colors hover:bg-[#241d18]">Batal</button>
                    <button type="button" onClick={() => onApply(corners, turns)} disabled={!corners}
                        className="min-h-[44px] flex-1 bg-[#ff9d00] px-3 font-mono text-[11px] font-black uppercase tracking-wider text-[#14100e] transition-opacity hover:opacity-85 disabled:opacity-50">Pakai</button>
                </div>
            </div>
        </div>
    );
}
