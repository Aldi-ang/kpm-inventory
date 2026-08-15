import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { WATERMARK_STYLE, WATERMARK_POSITION, watermarkFrom } from '../config/receiptWatermark';

/* ── "VIEW RECEIPT", THE BUTTON UNDER THE WATERMARK PANEL ──────────────────────────────────────
 *
 * His ask, 2026-08-15: *"can u add view receipt button just below the mascot watermark photo
 * panel?"* — sitting directly under the picker, so the question it answers is obvious: **is my
 * mark in the right place, and is it the right weight?** Before this the only way to find out
 * was to leave Settings, find a real transaction, open its nota, and squint — or print a page.
 *
 * ⚠️ THE ITEMS ARE A SAMPLE AND THE PAGE SAYS SO, LOUDLY. This is not a real transaction and it
 * must never be mistaken for one: a preview that looks like a genuine nota is a document someone
 * eventually hands to a customer. The letterhead, the signature, the bank block and the mark are
 * all HIS REAL SETTINGS — those are the parts he is checking. Only the goods are invented.
 *
 * ⚠️ NOT APP UI BELOW THE SHEET'S EDGE. The nota is KPM's business document and keeps the company
 * blue; the palette law stops here. The chrome AROUND the sheet — backdrop, close button — is app
 * UI and uses app tokens, which is why the two look nothing alike on purpose.
 *
 * The mark's geometry is imported, never retyped. See config/receiptWatermark.js: a preview that
 * disagrees with what prints is worse than no preview, because he would trust it.
 */

// A4 at 96dpi is 794x1123. Drawing the sheet at full size and scaling the whole thing keeps every
// proportion honest -- including the watermark's size relative to the page, which is the one
// number this screen exists to show. Scaling a rebuilt "small nota" instead would need the mark
// re-measured by hand, which is exactly the drift the shared constants prevent.
const PAGE_W = 794;
const PAGE_H = 1123;
const SCALE = 0.42;   // 794 -> 333px, fits a 375px phone with room for the frame

const SAMPLE_ROWS = [
    { no: 1, name: 'SAMPLE — Gudang Garam Surya 16', qty: '10 slop', amount: 'Rp 2.150.000' },
    { no: 2, name: 'SAMPLE — Djarum Super 12',        qty: '4 slop',  amount: 'Rp 780.000' },
];

export default function ReceiptPreview({ appSettings, editCompanyProfile, onClose }) {
    const watermarkSrc = watermarkFrom(appSettings);
    const companyName = appSettings?.companyName || editCompanyProfile?.name || 'PT KARYAMEGA PUTERA MANDIRI';
    const companyAddress = appSettings?.companyAddress || editCompanyProfile?.address || 'Jl. Raya Magelang - Purworejo Km. 11';

    return createPortal(
        <div className="fixed inset-0 z-[9998] bg-black/85 flex flex-col items-center justify-start gap-3 p-4 overflow-y-auto"
            onClick={onClose}>
            <div className="w-full max-w-[360px] flex items-center justify-between shrink-0 pt-2">
                <span className="kpm-read on">Watermark preview · sample nota</span>
                <button type="button" className="kpm-btn" onClick={onClose} aria-label="Close preview">
                    <X size={14} /> Close
                </button>
            </div>

            {/* the frame is exactly the scaled page, so the sheet does not float in dead space */}
            <div style={{ width: PAGE_W * SCALE, height: PAGE_H * SCALE }}
                className="shrink-0 overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}>
                <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${SCALE})`, transformOrigin: 'top left',
                              backgroundColor: '#ffffff', color: '#000000', boxSizing: 'border-box' }}
                    className="p-12 font-sans relative">

                    {/* letterhead — his real one, and the rule is the nota's company blue */}
                    <div className="border-b-4 pb-4 mb-6 flex justify-between items-end gap-8" style={{ borderColor: '#1e40af' }}>
                        <div className="flex-1">
                            <h1 className="text-3xl font-black tracking-widest uppercase break-words" style={{ color: '#1e3a8a' }}>{companyName}</h1>
                            <p className="text-sm font-bold mt-1 whitespace-pre-line" style={{ color: '#334155' }}>{companyAddress}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <h2 className="text-2xl font-bold uppercase tracking-widest" style={{ color: '#1e40af' }}>NOTA PENJUALAN</h2>
                            <p className="text-[10px] uppercase font-bold tracking-widest mt-1" style={{ color: '#94a3b8' }}>PREVIEW ONLY</p>
                        </div>
                    </div>

                    {/* the loud part. A preview that can be mistaken for a real nota is a document
                        somebody eventually hands to a customer. */}
                    <div className="mb-6 p-3 text-center text-sm font-black uppercase tracking-widest"
                        style={{ border: '2px dashed #b91c1c', color: '#b91c1c' }}>
                        Sample only · not a real transaction
                    </div>

                    <table className="w-full text-sm border-collapse mb-8" style={{ border: '2px solid #1e293b' }}>
                        <thead style={{ backgroundColor: '#eff6ff', color: '#1e3a8a' }}>
                            <tr>
                                <th className="p-3 text-center w-12 font-black" style={{ border: '2px solid #1e293b' }}>NO</th>
                                <th className="p-3 text-left font-black" style={{ border: '2px solid #1e293b' }}>MACAM BARANG</th>
                                <th className="p-3 text-center w-24 font-black" style={{ border: '2px solid #1e293b' }}>QTY</th>
                                <th className="p-3 text-right w-40 font-black" style={{ border: '2px solid #1e293b' }}>JUMLAH</th>
                            </tr>
                        </thead>
                        <tbody>
                            {SAMPLE_ROWS.map(r => (
                                <tr key={r.no}>
                                    <td className="p-3 text-center" style={{ border: '2px solid #1e293b' }}>{r.no}</td>
                                    <td className="p-3" style={{ border: '2px solid #1e293b' }}>{r.name}</td>
                                    <td className="p-3 text-center" style={{ border: '2px solid #1e293b' }}>{r.qty}</td>
                                    <td className="p-3 text-right" style={{ border: '2px solid #1e293b' }}>{r.amount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* signature and bank — the panel directly above this button in Settings, which
                        is why they are worth showing: he can check both in one look. */}
                    <div className="flex justify-between gap-8 text-sm">
                        <div className="whitespace-pre-line" style={{ color: '#334155' }}>
                            {appSettings?.bankDetails || 'BCA 0301138379\nA/N ABEDNEGO YB'}
                        </div>
                        <div className="text-center shrink-0 w-56">
                            <p style={{ color: '#334155' }}>Hormat kami,</p>
                            <div className="h-16" />
                            <p className="font-bold uppercase border-t pt-1" style={{ borderColor: '#94a3b8' }}>
                                {appSettings?.adminDisplayName || 'Admin'}
                            </p>
                        </div>
                    </div>

                    {watermarkSrc && <img src={watermarkSrc} alt="" className={WATERMARK_POSITION} style={WATERMARK_STYLE} />}
                </div>
            </div>

            {/* says what to do about it, rather than leaving him to guess whether it is adjustable */}
            <p className="kpm-desc max-w-[360px] text-center shrink-0 pb-4">
                {watermarkSrc
                    ? 'This is the size and weight your mark prints at on A4. Thermal slips never carry it. If it looks too faint or too strong on paper, say so and it is one number to change.'
                    : 'No watermark set yet — choose a picture above and it will appear in this corner.'}
            </p>
        </div>,
        document.body
    );
}
