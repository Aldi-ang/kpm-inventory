import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, AlertTriangle } from 'lucide-react';

/* THE LIVE CAMERA THAT TAKES A SALE PROOF. It opens a real video stream, grabs one frame, and
   hands back the same compressed base64 JPEG a file upload would have produced. It decides
   nothing about who may open it — `canPickFromGallery` does that, in permissions.js.

   ⚠️ WHY THIS EXISTS AT ALL, when the file input already carried `capture="environment"`:
   `capture` is a request, not a lock. A phone honours it and opens the camera; a desktop browser
   IGNORES it and opens the ordinary file picker. So on a PC the proof photo could be any image on
   disk, including a screenshot — the exact thing the photo is there to rule out. Aldi, 2026-09-09:
   *"tier 4 and lower will need to use the real time camera to do this"*. A live stream is the only
   thing that is a camera on both platforms.

   ⚠️ `getUserMedia` NEEDS A SECURE CONTEXT — https, or localhost. The live site is https and the
   dev server on localhost qualifies by specification, so the state that actually bites is the app
   opened over a LAN http address. It fails SILENTLY there unless we say so, and a control that
   cannot say why it will not work is the silence Aldi calls a bug. Every refusal below names its
   cause: not a secure page, no camera on this machine, or permission denied.

   ⚠️ THERE IS NO ESCAPE HATCH HERE, AND THERE WAS ONE FOR AN HOUR. A "dev only — pick a file
   instead" button lived below, gated on `import.meta.env.DEV` so a machine with no webcam could
   still finish a sale. Aldi killed it on sight: *"me as tier 6 still can see this option and can
   use it"*. Dev is the only place he tests, so a dev-only bypass does not preserve testability —
   it removes the one thing under test. To let a tier attach a file, turn `photo_pick_from_gallery`
   ON for that tier in Settings → Permission Matrix. That control is visible, auditable and shipped;
   a hidden second answer to the same question is how the two start disagreeing. */
export default function ProofCamera({ open, onClose, onPhoto }) {
    const videoRef = useRef(null);
    const [state, setState] = useState('starting');   // starting · live · blocked
    const [detail, setDetail] = useState('');

    useEffect(() => {
        if (!open) return;
        let stream = null, dead = false;

        (async () => {
            if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
                setState('blocked');
                setDetail('This page is not on a secure address (https), so the browser will not open a camera. Open the app on its normal https link.');
                return;
            }
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (dead) { stream.getTracks().forEach(t => t.stop()); return; }
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setState('live');
            } catch (e) {
                setState('blocked');
                setDetail(e?.name === 'NotAllowedError'
                    ? 'Camera permission was refused. Allow the camera for this site in the browser address bar, then open this again.'
                    : e?.name === 'NotFoundError'
                        ? 'No camera was found on this device. This sale needs a photo taken now, so it cannot be completed here.'
                        : 'The camera could not be opened: ' + (e?.message || 'reason unknown') + '.');
            }
        })();

        return () => {
            dead = true;
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [open]);

    /* Same 600px / quality 0.6 compression as handleTxPhotoCapture, so a camera photo and an
       uploaded one are the same weight in Firestore. */
    const snap = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / video.videoWidth;
        canvas.width = MAX_WIDTH;
        canvas.height = video.videoHeight * scaleSize;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        onPhoto(canvas.toDataURL('image/jpeg', 0.6));
    };

    if (!open) return null;

    /* Portalled to <body> on purpose. This is opened from inside the manifest drawer, which is a
       scrolling flex column — a `position: fixed` child of a transformed ancestor is positioned
       against that ancestor, not the viewport, and the camera would open half off-screen. */
    return createPortal((
        <div className="fixed inset-0 z-[300] bg-[var(--duke-scrim-hi)] flex items-center justify-center p-4 font-sans backdrop-blur-md">
            <div className="bg-[var(--duke-fill-ground)] w-full max-w-md border-2 border-[var(--duke-amber-edge)] rounded-2xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(255,157,0,0.2)]">

                <div className="p-4 border-b border-[var(--duke-edge-1)] bg-[var(--duke-bar)] flex justify-between items-center">
                    <h2 className="text-sm font-black text-[var(--duke-ink-hi)] flex items-center gap-2 uppercase tracking-wider">
                        <Camera size={16} className="text-[var(--duke-amber-ink-2)]"/> Take the handover photo
                    </h2>
                    <button onClick={onClose} className="text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)]"><X size={20}/></button>
                </div>

                <div className="p-4 space-y-3">
                    {state === 'blocked' ? (
                        <div className="border-l-[3px] border-[var(--danger)] bg-[var(--danger-well)] px-3 py-3">
                            <div className="font-mono text-[9.5px] font-black uppercase tracking-[0.16em] text-[var(--duke-danger-ink)] mb-1 flex items-center gap-1.5">
                                <AlertTriangle size={12}/> Camera unavailable
                            </div>
                            <p className="font-mono text-[10px] leading-snug text-[var(--ink-muted)]">{detail}</p>
                        </div>
                    ) : (
                        <div className="rounded-lg overflow-hidden border border-[var(--duke-edge-4)] bg-[var(--duke-stage)] aspect-video flex items-center justify-center">
                            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
                        </div>
                    )}

                    {state === 'live' && (
                        <button onClick={snap}
                            className="kpm-hover w-full py-3 bg-gradient-to-r from-[var(--duke-amber)] to-[var(--duke-amber-2)] border-2 border-[var(--duke-brass-edge-3)] text-black rounded font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2">
                            <Camera size={18}/> Take photo
                        </button>
                    )}
                </div>
            </div>
        </div>
    ), document.body);
}
