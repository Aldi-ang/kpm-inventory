import React from 'react';
import { Eye, X, ShieldOff, CornerUpLeft, Lock, MapPin } from 'lucide-react';
import { TEST_ACCOUNTS, tierLabel } from '../config/povPreview.js';

/* ============================================================================
   THE COSTUME RACK, and the label that says you are wearing one.

   Two things live here because they are two halves of one idea and neither is
   safe without the other: the picker that puts a tier on, and the banner that
   never lets him forget he has one on. Forgetting the costume is the whole risk
   of this feature.

   PALETTE LAW: no blue, no green, and gold never as text on light. Every colour
   below is a --duke token, which flips with the theme, so the amber that reads
   as #ff9d00 on the dark bench reads as a brown #7a3e00 on cream.

   LITE MODE: `html.lite-mode *` cuts every transition to 0.001s. So nothing here
   is ONLY visible while animating — each plate carries its border, its mark and
   its words at rest, and the sweep is decoration on top of a control that was
   already finished. Borders survive Lite Mode; that is why the emphasis is one.
   ============================================================================ */

/* `tierLabel` is IMPORTED, not defined here, and that is the fix for the bug the
   first live run found: this file had its own copy of the naming rule while the
   created agent used a different one, so the banner said HQ SALES MANAGER and the
   receipt said [TEST] REGIONAL ADMIN — one tier, two names on screen at once.
   One function now, in povPreview.js, read by the banner, the picker, the toast
   and the document that gets written. */

export function PovBanner({ account, onExit }) {
    if (!account) return null;
    return (
        <>
            <style>{`
                @keyframes kpm-pov-breathe {
                    0%, 100% { opacity: .55; }
                    50%      { opacity: 1; }
                }
            `}</style>
            {/* BOTTOM, not top: the header is already crowded and a bar that covers it
                would be read as a broken layout rather than as a warning. Bottom-centre
                is empty at every width in this app.
                z-[95] clears the rail (z-90) and sits under the picker (z-[9998]), so
                opening the rack does not stack two golds on each other. */}
            <div
                role="status"
                className="hide-on-print fixed bottom-3 left-1/2 -translate-x-1/2 z-[95] flex items-center gap-3
                           px-4 py-2.5 max-w-[calc(100vw-1.5rem)]
                           bg-[var(--duke-fill-panel)] border-2 border-[var(--duke-amber-edge)]
                           rounded-full font-mono"
            >
                <Eye size={16} className="text-[var(--duke-amber-ink)] shrink-0" style={{ animation: 'kpm-pov-breathe 2.4s ease-in-out infinite' }} />
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.14em] text-[var(--duke-ink-3)] truncate">
                    Melihat sebagai:{' '}
                    <span className="text-[var(--duke-amber-ink)]">{tierLabel(account)}</span>
                </span>
                {/* UNDISMISSABLE. There is no close button here on purpose — the only
                    way out of the banner is the way out of the costume. */}
                <button
                    onClick={onExit}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-[var(--duke-edge-4)]
                               text-[10px] font-black uppercase tracking-[0.12em] text-[var(--duke-ink-hi)]
                               hover:bg-[var(--duke-amber)] hover:text-[var(--duke-on-fill)] hover:border-[var(--duke-amber)]
                               transition-colors"
                >
                    <CornerUpLeft size={13} />
                    Kembali ke Owner
                </button>
            </div>
        </>
    );
}

export default function TierPovSwitch({ open, current, places = [], onPick, onExit, onClose }) {
    /* Declared ABOVE the early return, because a hook after one is a hook that stops being
       called the moment the rack closes. */
    const [place, setPlace] = React.useState('');
    if (!open) return null;

    /* `places` is Headquarters plus every cabang on the roster, computed by App.jsx from
       `warehouseList` — the same function the Tujuan picker uses, so the rack can never offer
       a destination the shipping form does not know. The fallback is not decoration: an empty
       array would render a select with nothing in it and no way to say why. */
    const options = places.length > 0 ? places : ['Headquarters'];
    const chosen = options.includes(place) ? place : options[0];

    return (
        <div className="hide-on-print fixed inset-0 z-[9998] bg-[var(--duke-scrim-hi)] flex items-center justify-center p-4 font-mono animate-fade-in">
            <style>{`
                /* THE SWEEP. A gold wash crosses the plate from the left when you are on
                   it. It is a ::before rather than a background-position trick so that
                   Lite Mode, which flattens the transition to nothing, simply shows the
                   finished state instantly instead of showing a half-painted plate. */
                .kpm-pov-plate { position: relative; overflow: hidden; }
                .kpm-pov-plate::before {
                    content: ''; position: absolute; inset: 0;
                    background: var(--duke-amber);
                    transform: translateX(-101%);
                    transition: transform .32s cubic-bezier(.22,1,.36,1);
                    z-index: 0;
                }
                .kpm-pov-plate:hover::before, .kpm-pov-plate:focus-visible::before { transform: translateX(0); }
                .kpm-pov-plate > * { position: relative; z-index: 1; }
                .kpm-pov-plate:hover .kpm-pov-txt,
                .kpm-pov-plate:focus-visible .kpm-pov-txt { color: var(--duke-on-fill); }
                .kpm-pov-plate:hover .kpm-pov-num,
                .kpm-pov-plate:focus-visible .kpm-pov-num { color: var(--duke-on-fill); border-color: var(--duke-on-fill); }
                /* Someone who asked for less motion gets the colour and none of the travel. */
                @media (prefers-reduced-motion: reduce) {
                    .kpm-pov-plate::before { transition: none; }
                }
            `}</style>

            <div className="w-full max-w-lg bg-[var(--duke-fill-panel)] border-2 border-[var(--duke-edge-4)] rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">

                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b-2 border-[var(--duke-edge-2)]">
                    <div className="min-w-0">
                        <h2 className="text-base font-black uppercase tracking-[0.2em] text-[var(--duke-ink-hi)] flex items-center gap-2">
                            <Eye size={18} className="text-[var(--duke-amber-ink)] shrink-0" />
                            Lihat Sebagai
                        </h2>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--duke-ink-3)] leading-relaxed">
                            Pakai layar tier lain tanpa logout
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Tutup"
                        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border-2 border-[var(--duke-edge-2)] text-[var(--duke-ink-3)] hover:text-[var(--duke-ink-hi)] hover:border-[var(--duke-edge-4)] transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* WHERE THE COSTUME IS POSTED. One control for the whole rack rather than one
                    per plate: he wears a tier at a place, and two selects saying the same thing
                    is how they end up disagreeing.
                    ⚠️ HEADQUARTERS IS THE MASTER VAULT, NOT A CABANG — a costume left there sees
                    an empty branch warehouse forever, because `branches/Headquarters/inventory`
                    does not exist and no stock_request can name it. That is exactly what made
                    this feature look broken, so the reason is printed under the control instead
                    of being something he has to rediscover. */}
                <div className="px-3 pt-3">
                    <label className="block">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--duke-ink-3)] mb-1.5">
                            <MapPin size={12} className="shrink-0" />
                            Tempat tugas
                        </span>
                        <select
                            value={chosen}
                            onChange={(e) => setPlace(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border-2 border-[var(--duke-edge-2)] bg-[var(--duke-well-solid)]
                                       text-[12px] font-black uppercase tracking-[0.1em] text-[var(--duke-ink-hi)]
                                       outline-none focus:border-[var(--duke-amber-edge)] transition-colors"
                        >
                            {options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </label>
                    <p className="mt-1.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[var(--duke-ink-3)] leading-relaxed">
                        {options.length > 1
                            ? 'Headquarters = gudang pusat, bukan cabang. Pilih cabang kalau mau lihat layar gudang cabang.'
                            : 'Belum ada cabang di roster — hanya Headquarters. Daftarkan tim di Fleet & Roster dulu.'}
                    </p>
                </div>

                <div className="overflow-y-auto p-3 flex flex-col gap-2">
                    {TEST_ACCOUNTS.map((account) => {
                        const isOn = current?.id === account.id;
                        return (
                            <button
                                key={account.id}
                                onClick={() => onPick(account, chosen)}
                                className={`kpm-pov-plate w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors
                                            ${isOn ? 'border-[var(--duke-amber-edge)]' : 'border-[var(--duke-edge-2)]'}`}
                            >
                                <span className={`kpm-pov-num shrink-0 w-9 h-9 rounded-lg border-2 flex items-center justify-center text-[13px] font-black
                                                  ${isOn ? 'border-[var(--duke-amber-edge)] text-[var(--duke-amber-ink)]' : 'border-[var(--duke-edge-4)] text-[var(--duke-ink-3)]'}`}>
                                    {account.id.slice(-1)}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="kpm-pov-txt block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--duke-ink-hi)] truncate">
                                        {tierLabel(account)}
                                    </span>
                                    {/* THE UNDERLYING ROLE, not a description. Each plate used to carry a
                                        sentence about what that tier does — written against the code's
                                        role names, so once he renamed his tiers the sentence described
                                        one thing and the heading above it named another. This line is
                                        the role id the permission rules actually answer to, which is
                                        always true and is the thing worth knowing when a rename and a
                                        behaviour disagree. */}
                                    <span className="kpm-pov-txt block mt-0.5 text-[10px] font-bold font-mono text-[var(--duke-ink-3)] leading-snug truncate">
                                        {account.tier}
                                    </span>
                                </span>
                                {isOn && <Eye size={15} className="kpm-pov-txt shrink-0 text-[var(--duke-amber-ink)]" />}
                            </button>
                        );
                    })}
                </div>

                <div className="px-5 py-4 border-t-2 border-[var(--duke-edge-2)] flex flex-col gap-3">
                    {/* THE HONEST LIMIT, said once, where he is about to act on it — not
                        buried in a file he will never open. A preview that pretends to be
                        a permission test is worse than no preview. */}
                    <p className="flex gap-2 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[var(--duke-ink-3)] leading-relaxed">
                        <ShieldOff size={13} className="shrink-0 mt-px" />
                        <span>Ini mengubah tampilan, bukan izin server. Firestore tetap membaca akun tier 1 asli.</span>
                    </p>
                    <p className="flex gap-2 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[var(--duke-ink-3)] leading-relaxed">
                        <Lock size={13} className="shrink-0 mt-px" />
                        <span>Penjualan tercatat atas nama akun [TEST], bukan agen asli. Data masuk ke database sungguhan.</span>
                    </p>
                    {current && (
                        <button
                            onClick={onExit}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[var(--duke-edge-4)]
                                       text-[11px] font-black uppercase tracking-[0.16em] text-[var(--duke-ink-hi)]
                                       hover:bg-[var(--duke-amber)] hover:text-[var(--duke-on-fill)] hover:border-[var(--duke-amber)] transition-colors"
                        >
                            <CornerUpLeft size={15} />
                            Kembali ke Owner
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
