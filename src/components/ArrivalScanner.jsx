import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Keyboard } from 'lucide-react';

/* THE CAMERA THAT MARKS A BOX AS ARRIVED. It reads the code off the shipment label and hands the
   string back; it decides nothing and writes nothing.

   ⚠️ `BarcodeDetector` IS NOT EVERYWHERE, and pretending otherwise ships a dead button. It is
   native on Android Chrome — which is where a warehouse worker actually stands — and absent from
   desktop Chromium and from iOS Safari. Measured in this environment on 2026-09-01:
   `'BarcodeDetector' in window` is **false** on the desktop browser available here.

   So the typed fallback is not a nicety, it is the path most of the people reading this screen will
   take. It is offered ALWAYS, not only after the camera fails: a phone with a cracked lens, a label
   smudged by rain, a box already opened — none of those should end with a warehouse worker unable
   to record that goods arrived. Silence is a bug in this app; a control that cannot say why it will
   not work is the same thing wearing a camera icon.

   ⚠️ THE CAMERA NEEDS A SECURE CONTEXT. `getUserMedia` is HTTPS-or-localhost only, and the failure
   is silent rather than an error — the exact class of bug that made the phone look broken while the
   PC worked. Production is HTTPS on Vercel and the dev server runs basic-ssl, so this is a reported
   state rather than a blocker. */
export default function ArrivalScanner({ open, onClose, onCode, expecting = [] }) {
    const videoRef = useRef(null);
    const [state, setState] = useState('starting');   // starting · scanning · unsupported · denied
    const [typed, setTyped] = useState('');
    const [detail, setDetail] = useState('');

    useEffect(() => {
        if (!open) return;
        let stream = null, raf = 0, dead = false;

        (async () => {
            if (!('BarcodeDetector' in window)) {
                setState('unsupported');
                setDetail('Browser ini tidak bisa membaca barcode. Buka di Chrome pada HP Android, atau ketik nomornya.');
                return;
            }
            if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
                setState('denied');
                setDetail('Kamera hanya bisa dipakai lewat alamat HTTPS. Ketik nomor kiriman di bawah.');
                return;
            }
            try {
                const detector = new window.BarcodeDetector({ formats: ['code_128'] });
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (dead) { stream.getTracks().forEach(t => t.stop()); return; }
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setState('scanning');

                const tick = async () => {
                    if (dead) return;
                    try {
                        const found = await detector.detect(videoRef.current);
                        if (found.length) {
                            const value = String(found[0].rawValue || '').trim();
                            if (value) { onCode(value); return; }
                        }
                    } catch { /* a frame that cannot be decoded is the normal case, not an error */ }
                    raf = requestAnimationFrame(tick);
                };
                raf = requestAnimationFrame(tick);
            } catch (e) {
                setState('denied');
                setDetail(e?.name === 'NotAllowedError'
                    ? 'Izin kamera ditolak. Ketik nomor kiriman di bawah.'
                    : 'Kamera tidak bisa dibuka: ' + (e?.message || 'sebab tidak diketahui') + '. Ketik nomor kiriman di bawah.');
            }
        })();

        return () => {
            dead = true;
            cancelAnimationFrame(raf);
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [open, onCode]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[220] bg-sunk/90 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-panel w-full max-w-md rounded-2xl border border-line-2 overflow-hidden flex flex-col shadow-[0_1px_1px_rgba(0,0,0,0.20),0_18px_40px_-28px_rgba(0,0,0,0.85)]">

                <div className="flex items-center justify-between px-5 py-4 border-b border-line-2 bg-raised">
                    <h3 className="font-display text-sm font-black uppercase tracking-[0.15em] text-ink flex items-center gap-2">
                        <Camera size={16} className="text-accent-ink"/> Scan barang sampai
                    </h3>
                    <button onClick={onClose} className="text-ink-muted hover:text-ink"><X size={20}/></button>
                </div>

                <div className="p-5 space-y-4">
                    {state === 'scanning' || state === 'starting' ? (
                        <div className="rounded-xl overflow-hidden border border-line-2 bg-sunk aspect-video flex items-center justify-center">
                            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <p className="text-[12px] text-ink-muted leading-relaxed border border-line-2 rounded-lg px-3 py-2.5">{detail}</p>
                    )}

                    <div>
                        <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <Keyboard size={12}/> Atau ketik nomor kiriman
                        </label>
                        <div className="grid grid-cols-[1fr,auto] gap-2">
                            <input value={typed} onChange={e => setTyped(e.target.value)}
                                placeholder="REQ_..."
                                className="placeholder:text-ink-dim placeholder:opacity-100 placeholder:italic w-full bg-inset border border-line-3 rounded-lg p-3 text-sm text-ink font-mono outline-none focus:border-orange"/>
                            <button type="button" disabled={!typed.trim()}
                                onClick={() => onCode(typed.trim())}
                                className="bg-orange disabled:opacity-40 text-orange-ink px-4 rounded-lg font-black uppercase tracking-widest text-[11px] active:scale-[0.98] transition-transform">
                                Tandai
                            </button>
                        </div>
                        {/* The numbers it would accept, printed. A scanner that says only "wrong
                            code" leaves a person holding a box with no way to find the right one. */}
                        {expecting.length > 0 && (
                            <p className="text-[10px] text-ink-muted font-mono mt-2 leading-relaxed break-words">
                                Menunggu: {expecting.join(' · ')}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
