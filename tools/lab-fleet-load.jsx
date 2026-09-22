/* LAB ONLY — the van-loading panel (his pick, 2026-09-22: "if we can put inside the fleet and
   roster then lets just do that"), plus the two things he asked for with it:
     "make sure that there is animation on doing loading"
     "i want better UI than that for our roster, cool if we have some 3D animation as well"

   Nothing here is product code, and nothing here goes near handleLoadCanvas / handleClearCanvas.
   The look lives in ONE <style> block with lab-* class names on purpose: tailwind.config.js scans
   ./src only, so an arbitrary utility with no twin in the app never generates and would silently
   do nothing.

   ?shell&fleet&mock=panel        the panel, roster look A (the bay plate)
       &r=b | &r=c                roster B (the 3D van crate) | C (the region folder)
       &phone                     the narrow arrangement (shoot at 518)
       &play=a | b | c            the loading motion, on mount — A the cargo flies /
                                  B the surat jalan stamps / C the roller door
       &at=420                    freeze every animation at 420 ms, for a still
   ?shell&fleet&mock=module       the segment shape, kept so the decided board still opens

   Delete this file when the look ships. */
import React from 'react';
import { Truck, PackagePlus, ArrowLeft, Search, Check, ChevronRight, User, FileText, Trash2 } from 'lucide-react';

const PRODUCTS = [
  { id: 'p-cg16', name: 'Cello Green 16', stock: 420 },
  { id: 'p-cm12', name: 'Cello Merah 12', stock: 168 },
];
const CREW = [
  { id: 'f-b1', name: 'Budi Santoso', initials: 'BS', plate: 'D 5521 XY', van: 'HONDA VARIO', loaded: 484, usual: 600 },
  { id: 'f-d1', name: 'Dedi Kurniawan', initials: 'DK', plate: 'D 9080 KL', van: 'HONDA BEAT', loaded: 200, usual: 520 },
  { id: 'f-a1', name: 'Adi Nugroho', initials: 'AN', plate: 'D 7714 MN', van: 'SUZUKI CARRY', loaded: 0, usual: 900 },
];
/* mixed units on purpose, so the "= N Bks" column converts instead of echoing the number */
const BASKET = [
  { id: 'p-cg16', name: 'Cello Green 16', qty: 3, unit: 'Bal', bks: 600, stock: 420, mm: { w: 55, h: 90, d: 22 } },
  { id: 'p-djar', name: 'Djarum Coklat 12', qty: 12, unit: 'Slop', bks: 120, stock: 240, mm: { w: 52, h: 86, d: 24 } },
  { id: 'p-smp16', name: 'Sampoerna Mild 16', qty: 40, unit: 'Bks', bks: 40, stock: 600, mm: { w: 54, h: 92, d: 21 } },
];
const TOTAL = BASKET.reduce((n, b) => n + b.bks, 0);

/* ── the look ─────────────────────────────────────────────────────────────────────────────────
   Every colour is a theme token, so light mode paints itself and the palette law holds (no blue,
   no green; gold never as text — the readable token is --accent-ink). Every glow is a gradient,
   never a shadow (audit G30). Lite Mode and reduced motion stop the motion through the app's own
   global rules; the 3D crate then parks at three-quarters exactly as .kpm-cube already does. */
const LOOK = `
.lab-card { background: linear-gradient(180deg, var(--raised), var(--sunk)); border: 1px solid var(--line-2); border-radius: 16px; }
.lab-sub  { background: var(--raised); border: 1px solid var(--line-2); border-radius: 12px; }
.lab-lbl  { font: 900 11px/1.2 var(--font-mono); letter-spacing: .2em; text-transform: uppercase; color: var(--ink-dim); }
@media (min-width: 1024px) { .lab-lbl { font-size: 10px; } }
.lab-name { font: 900 14px/1.2 system-ui, sans-serif; color: var(--ink); }
.lab-num  { font: 900 13px/1 var(--font-mono); font-variant-numeric: tabular-nums; color: var(--ink); }
.lab-row  { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-top: 1px solid var(--line-2); }
.lab-key  { min-height: 44px; min-width: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
            border: 1px solid var(--line-2); border-radius: 10px; background: var(--panel); color: var(--ink);
            font: 900 11px/1 var(--font-mono); letter-spacing: .18em; text-transform: uppercase; padding: 0 10px;
            transition: transform 120ms ease-out; }
.lab-key:active { transform: scale(.94); }
.lab-key.go { border-color: var(--accent-edge); color: var(--accent-ink); }
.lab-plate { display: inline-block; padding: 2px 7px; border: 2px solid var(--line-2); border-radius: 5px; background: var(--inset);
             font: 900 11px/1.3 var(--font-mono); letter-spacing: .12em; color: var(--ink-muted); white-space: nowrap; }
.lab-plate-go { width: 100%; min-height: 52px; border-radius: 12px; background: var(--gold); color: var(--gold-ink);
                font: 900 13px/1 var(--font-mono); letter-spacing: .2em; text-transform: uppercase;
                display: flex; align-items: center; justify-content: center; gap: 8px; border: 0; }

/* ── ROSTER A — THE BAY PLATE: the van's fill is the row ─────────────────────────────────── */
.lab-bay { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--line-2); border-radius: 14px;
           background: var(--panel); min-height: 68px; transition: transform 120ms ease-out, border-color 160ms; }
.lab-bay:active { transform: scale(.995); }
.lab-bay.on { border-color: var(--accent-edge); }
.lab-face { width: 44px; height: 44px; flex: 0 0 44px; border-radius: 50%; display: grid; place-items: center;
            background: linear-gradient(160deg, #E4C98E, #B8893A); color: #2a1d08; font: 900 15px/1 var(--font-mono); }
.lab-fill { position: relative; height: 6px; border-radius: 3px; background: var(--inset); overflow: hidden; display: block; }
.lab-fill > i { position: absolute; inset: 0 auto 0 0; border-radius: 3px; background: linear-gradient(90deg, var(--accent-edge), var(--amber)); }
.lab-fill.empty > i { background: var(--line-2); }
.lab-led { width: 8px; height: 8px; border-radius: 50%; background: var(--line-2); display: block; flex: 0 0 8px; }
.lab-led.on { background: radial-gradient(circle at 40% 35%, var(--amber), #7a4c05 70%); }

/* ── ROSTER B — THE VAN CRATE: the app's own .kpm-cube, one per person ───────────────────────
   Same geometry as the sales terminal's ware (theme.css .kpm-cube), so this is a REUSE, not a
   second 3D engine: --mm-w/h/d drive it, a loaded van gets a deep crate and an empty one a flat
   pallet — the DEPTH is the state, so the information survives with the turn switched off. */
.lab-crate { --kpm-slot-h: 42px; perspective: 260px; display: grid; place-items: center; width: 54px; flex: 0 0 54px; }
/* parked a little further round than the terminal's ware: at -24deg a shallow crate reads as a
   flat card, and the whole point here is that DEPTH carries the state */
.lab-crate .kpm-cube { transform: rotateX(-10deg) rotateY(-34deg); }
.lab-crate .kpm-cube > i { border-color: var(--line-2); }
.lab-crate .kpm-cube > .f  { background: linear-gradient(160deg, var(--inset), var(--sunk)); }
.lab-crate .kpm-cube > .t  { background: linear-gradient(160deg, var(--raised), var(--panel)); }
.lab-crate .kpm-cube > .l, .lab-crate .kpm-cube > .r { background: var(--panel); }
.lab-crate .kpm-cube > .bk, .lab-crate .kpm-cube > .bt { background: var(--sunk); }
.lab-crate .cap { display: grid; place-items: center; width: 100%; height: 100%; font: 900 8px/1 var(--font-mono);
                  letter-spacing: .06em; color: var(--ink-dim); overflow: hidden; }
/* THE TURN IS AN EVENT, NOT A STATE — his rule: a light blinks only while something happens, and
   a crate that spins for ever is the same fault. The selected van turns ONCE and parks at the
   three-quarter angle; a pointer that rests on a row may turn it slowly, which is what the sales
   terminal's ware already does and nobody has complained about. */
/* NOT kpm-turn: that one ends at rotateY(360), which is face-on — fine for a loop that never
   rests, wrong for a single turn, which has to come back to the parked three-quarter angle. */
.lab-bay.on .kpm-cube { animation: labCrateTurn 900ms cubic-bezier(.3, .9, .3, 1) 1 both; animation-delay: calc(0ms - var(--at, 0ms)); }
@keyframes labCrateTurn {
  from { transform: rotateX(-10deg) rotateY(-34deg); }
  to   { transform: rotateX(-10deg) rotateY(326deg); }
}
@media (hover: hover) and (pointer: fine) { .lab-bay:hover .kpm-cube { animation: kpm-turn 3.6s linear infinite; } }
.lab-bay:focus-within .kpm-cube { animation: kpm-turn 3.6s linear infinite; }

/* ── ROSTER C — THE REGION FOLDER: the shipped folder family, the people inside ─────────────── */
.lab-fold { border: 1px solid var(--line-2); border-radius: 14px; background: var(--raised); overflow: hidden; }
.lab-fold-tab { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px;
                background: linear-gradient(180deg, var(--panel), var(--raised)); border-bottom: 1px solid var(--line-2); }
.lab-stamp { font: 900 11px/1 var(--font-mono); letter-spacing: .12em; color: var(--ink-muted); border: 1px solid var(--line-2);
             border-radius: 6px; padding: 4px 7px; white-space: nowrap; }

/* ── MOTION A — THE CARGO FLIES ──────────────────────────────────────────────────────────────
   Each line's goods leave the list as a real crate and land on the van's tally, one after the
   other; the tally settles last and the van's MUAT key dips once on its suspension. */
/* the crates travel INSIDE the muatan box, up to the tally at its head — the box clips its own
   overflow, so a flight that left it would simply not be drawn */
.lab-fly { position: absolute; left: 12px; width: 60px; height: 60px; pointer-events: none; opacity: 0; }
/* Every delay below is written as its own stagger MINUS --at, so one still can be taken at any
   moment WITHOUT flattening the stagger: freeze only pauses, it never rewrites the delay, and the
   three crates sit at three points of the same flight — which is what the eye actually sees. */
.play-a .lab-fly { animation: labFly 760ms cubic-bezier(.4, 0, .2, 1) both; animation-delay: calc(var(--stag, 0ms) - var(--at, 0ms)); }
@keyframes labFly {
  0%   { opacity: 0; transform: translate(0, 0) scale(.85) rotateY(0); }
  10%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--dx, 260px), var(--dy, -220px)) scale(.55) rotateY(62deg) rotateX(-14deg); }
}
.play-a .lab-tally { display: inline-block; animation: labTallyPump 260ms ease-out both; animation-delay: calc(560ms - var(--at, 0ms)); }
@keyframes labTallyPump { 50% { transform: scale(1.14); } 100% { transform: none; } }
.play-a .lab-van-dip { animation: labDip 420ms cubic-bezier(.3, 1.4, .5, 1) both; animation-delay: calc(600ms - var(--at, 0ms)); }
@keyframes labDip { 40% { transform: translateY(3px); } 100% { transform: none; } }

/* ── MOTION B — THE SURAT JALAN STAMPS (the shipped docket vocabulary) ───────────────────────
   A gold hairline sweeps the list, each line strikes out in turn, the surat jalan seal lands.
   This is kpmScan / kpmSeal from theme.css pointed at the basket — almost nothing to build. */
.lab-scan { position: absolute; left: 0; right: 0; top: 0; height: 3px; opacity: 0; pointer-events: none;
            background: linear-gradient(90deg, transparent, var(--gold) 30%, var(--gold) 70%, transparent); }
.play-b .lab-scan { animation: labScan 520ms cubic-bezier(.2, .8, .3, 1) both; animation-delay: calc(0ms - var(--at, 0ms)); }
@keyframes labScan { from { transform: translateY(0); opacity: 1; } to { transform: translateY(var(--sweep, 210px)); opacity: 1; } }
.play-b .lab-line { animation: labStruck 240ms both; animation-delay: calc(var(--stag, 0ms) - var(--at, 0ms)); }
.play-b .lab-line:nth-child(1) { --stag: 140ms; }
.play-b .lab-line:nth-child(2) { --stag: 260ms; }
.play-b .lab-line:nth-child(3) { --stag: 380ms; }
@keyframes labStruck { to { background: linear-gradient(90deg, var(--inset), transparent 70%); } }
.lab-seal { position: absolute; left: 50%; top: 46%; opacity: 0; pointer-events: none; padding: 8px 14px; border: 3px solid var(--gold);
            border-radius: 8px; font: 900 18px/1 var(--font-mono); letter-spacing: .3em; color: var(--accent-ink);
            transform: translate(-50%, -50%) rotate(-8deg) scale(1.3); white-space: nowrap; }
.play-b .lab-seal { animation: labSeal 300ms cubic-bezier(.2, .8, .3, 1) both; animation-delay: calc(520ms - var(--at, 0ms)); }
@keyframes labSeal { from { opacity: 0; transform: translate(-50%, -50%) rotate(-8deg) scale(1.3); }
                     to   { opacity: 1; transform: translate(-50%, -50%) rotate(-8deg) scale(1); } }

/* ── MOTION C — THE ROLLER DOOR ──────────────────────────────────────────────────────────────
   The bay shutter comes down over the list, MEMUAT shows through the slats, the door lifts on a
   loaded van. The slats are a repeating gradient, so Lite Mode keeps the look and loses only the
   travel. */
.lab-door { position: absolute; inset: 0; transform-origin: top; transform: scaleY(0); pointer-events: none; border-radius: 12px;
            background: repeating-linear-gradient(180deg, var(--inset) 0 7px, var(--panel) 7px 14px); border: 1px solid var(--line-2); }
.play-c .lab-door { animation: labDoor 1100ms cubic-bezier(.4, 0, .2, 1) both; animation-delay: calc(0ms - var(--at, 0ms)); }
@keyframes labDoor { 0% { transform: scaleY(0); } 34% { transform: scaleY(1); } 72% { transform: scaleY(1); } 100% { transform: scaleY(0); } }
.lab-door-txt { position: absolute; left: 50%; top: 52%; transform: translate(-50%, -50%); opacity: 0; pointer-events: none;
                font: 900 12px/1 var(--font-mono); letter-spacing: .28em; color: var(--accent-ink); }
.play-c .lab-door-txt { animation: labDoorTxt 520ms both; animation-delay: calc(300ms - var(--at, 0ms)); }
@keyframes labDoorTxt { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0; } }
.play-c .lab-tally { display: inline-block; animation: labTallyPump 300ms ease-out both; animation-delay: calc(640ms - var(--at, 0ms)); }

/* a still of one moment: --at rewinds each animation by its own delay expression above, and this
   only STOPS the clock. It never rewrites a delay, so the stagger survives the freeze. */
.lab-frz * { animation-play-state: paused !important; }
/* …except the app's own arrival stagger: kpmArrive fills backwards from opacity 0, so pausing it
   at t=0 would empty the roster and the still would show a screen nobody ever sees. */
.lab-frz .kpm-arrive > * { animation: none !important; }

/* the goods in flight carry the gold edge — in transit is a state, and on the dark panel an
   untinted crate reads as a smudge */
.lab-fly .kpm-cube > i { border-color: var(--accent-edge); }
.lab-fly .kpm-cube > .f { background: linear-gradient(160deg, #3a2c16, var(--inset)); }
.lab-fly .cap { color: var(--accent-ink); }
`;

/* ── the basket — identical in every option; only the roster and the motion change ─────────── */
function Basket({ phone, play }) {
  return (
    <div style={{ position: 'relative' }}>
      <div className="lab-sub" style={{ padding: phone ? 12 : 16, marginBottom: 12 }}>
        <p className="lab-lbl" style={{ marginBottom: 8 }}>Ambil dari gudang BANDUNG</p>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-dim)' }} />
          <input readOnly value="cello" style={{ width: '100%', background: 'var(--inset)', border: '1px solid var(--line-2)', borderRadius: 10, padding: '10px 12px 10px 34px', font: '700 13px/1.2 system-ui, sans-serif', color: 'var(--ink)', outline: 'none' }} />
        </div>
        <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
          {PRODUCTS.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44, padding: '8px 12px', border: '1px solid var(--line-2)', borderRadius: 10, background: 'var(--panel)' }}>
              <div style={{ minWidth: 0 }}>
                <p className="lab-name">{p.name}</p>
                <p className="lab-lbl">Sisa {p.stock} Bks</p>
              </div>
              <span className="lab-key go" style={{ minHeight: 36 }}>+ Tambah</span>
            </div>
          ))}
        </div>
      </div>

      <div className="lab-sub" style={{ overflow: 'hidden', position: 'relative', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
          <p className="lab-lbl">Muatan hari ini · {BASKET.length} barang</p>
          <p className="lab-num"><span className="lab-tally">{TOTAL} Bks</span></p>
        </div>
        {/* the motion rides on the LIST, never on a number's visibility — a stopped animation must
            never be able to hide a figure (his Lite Mode law) */}
        <div style={{ position: 'relative' }}>
          {BASKET.map((b) => (
            <div key={b.id} className="lab-row lab-line">
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="lab-name">{b.name}</p>
                <p className="lab-lbl">Sisa gudang {b.stock} Bks</p>
              </div>
              <span className="lab-num" style={{ minWidth: 42, textAlign: 'center', padding: '7px 8px', border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--panel)' }}>{b.qty}</span>
              <span className="lab-key" style={{ minHeight: 34, minWidth: 0 }}>{b.unit}</span>
              <span className="lab-num" style={{ width: 62, textAlign: 'right', color: 'var(--ink-dim)' }}>= {b.bks} Bks</span>
              <span className="lab-key" style={{ minHeight: 34, minWidth: 34, padding: 0, color: 'var(--ink-dim)' }}><Trash2 size={13} /></span>
            </div>
          ))}
          {play === 'b' && <i className="lab-scan" style={{ '--sweep': '210px' }} />}
          {play === 'c' && (
            <>
              <i className="lab-door" />
              <span className="lab-door-txt">MEMUAT…</span>
            </>
          )}
          {play === 'a' && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {BASKET.map((b, i) => (
                <span key={b.id} className="lab-fly" style={{ top: 8 + i * 58, '--stag': 60 + i * 200 + 'ms', '--dx': (phone ? 320 : 1230) + 'px', '--dy': -(44 + i * 58) + 'px' }}>
                  <span className="lab-crate" style={{ '--kpm-slot-h': '56px', width: 60 }}>
                    <span className="kpm-cube" style={{ '--mm-w': b.mm.w, '--mm-h': b.mm.h, '--mm-d': b.mm.d }}>
                      <i className="f"><span className="cap">{b.unit}</span></i><i className="bk" /><i className="l" /><i className="r" /><i className="t" /><i className="bt" />
                    </span>
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
        {play === 'b' && <span className="lab-seal">SURAT JALAN</span>}
      </div>

      <button className="lab-plate-go"><Truck size={16} /> Muat van — {TOTAL} Bks{phone ? '' : ' · 3 barang'}</button>
      <p className="lab-lbl" style={{ textAlign: 'center', marginTop: 8 }}>satu tekan · satu surat jalan · van tercatat sekali</p>
    </div>
  );
}

/* ── the roster, three looks ───────────────────────────────────────────────────────────────── */
function Crate({ full }) {
  return (
    <span className="lab-crate">
      <span className="kpm-cube" style={{ '--mm-w': 58, '--mm-h': 74, '--mm-d': full ? 46 : 7 }}>
        <i className="f"><span className="cap">{full ? 'ISI' : 'NOL'}</span></i>
        <i className="bk" /><i className="l" /><i className="r" /><i className="t" /><i className="bt" />
      </span>
    </span>
  );
}

function RosterRows({ look, play }) {
  return CREW.map((m, i) => {
    const pct = Math.round((m.loaded / m.usual) * 100);
    return (
      <div key={m.id} className={`lab-bay${i === 0 ? ' on' : ''}`} tabIndex={0}>
        {look === 'b' ? <Crate full={m.loaded > 0} /> : <span className="lab-face">{m.initials}</span>}
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="lab-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span className="lab-plate">{m.plate}</span>
            <p className="lab-lbl">{m.van}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <i className={`lab-led${m.loaded ? ' on' : ''}`} />
            <p className="lab-lbl" style={{ flex: '0 0 auto' }}>{m.loaded ? `${m.loaded} / ${m.usual} Bks` : 'van kosong'}</p>
            <span className={`lab-fill${m.loaded ? '' : ' empty'}`} style={{ flex: 1, minWidth: 40 }}>
              <i style={{ width: Math.max(pct, 3) + '%' }} />
            </span>
          </div>
        </div>
        <span className={`lab-key go${i === 0 && play === 'a' ? ' lab-van-dip' : ''}`}><PackagePlus size={13} /> Muat</span>
      </div>
    );
  });
}

function Roster({ look, play, phone }) {
  const rows = <RosterRows look={look} play={play} />;
  if (look === 'c') {
    return (
      <div className="lab-card" style={{ padding: 12 }}>
        <div className="lab-fold">
          <div className="lab-fold-tab">
            <div>
              <p className="lab-name" style={{ fontSize: 15 }}>BANDUNG</p>
              <p className="lab-lbl">gudang · 4 orang</p>
            </div>
            <span className="lab-stamp">3 VAN · 1 KOSONG</span>
          </div>
          <div className="kpm-arrive" style={{ display: 'grid', gap: 8, padding: 10 }}>{rows}</div>
        </div>
        <div className="lab-fold" style={{ marginTop: 10, opacity: 0.55 }}>
          <div className="lab-fold-tab">
            <div>
              <p className="lab-name" style={{ fontSize: 15 }}>SEMARANG</p>
              <p className="lab-lbl">gudang · 2 orang</p>
            </div>
            <span className="lab-stamp">TUTUP</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="lab-card" style={{ overflow: 'hidden', height: phone ? 'auto' : '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ font: '900 15px/1.2 system-ui, sans-serif', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Truck size={16} style={{ color: 'var(--ink-muted)' }} /> Roster BANDUNG
          </h2>
          <p className="lab-lbl" style={{ marginTop: 2 }}>3 van · 1 kosong</p>
        </div>
        <span className="lab-key" style={{ padding: 0 }}><User size={16} /></span>
      </div>
      <div className="kpm-arrive" style={{ display: 'grid', gap: 8, padding: 12, flex: 1, alignContent: 'start' }}>{rows}</div>
    </div>
  );
}

/* ── HIS PICK — the loading bay as a panel inside Fleet & Roster ────────────────────────────── */
export function LoadBayPanelMock({ phone, look = 'a', play, at, rosterOnly }) {
  const crew = CREW[0];
  const bay = (
    <div className="lab-card" style={{ overflow: 'hidden', height: phone ? 'auto' : '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', gap: 12 }}>
        {phone && <span className="lab-key" style={{ padding: 0 }}><ArrowLeft size={16} /></span>}
        <div style={{ minWidth: 0 }}>
          <p className="lab-lbl">Muat van</p>
          <h2 style={{ font: `900 ${phone ? 20 : 26}px/1.15 system-ui, sans-serif`, color: 'var(--ink)' }}>{crew.name}</h2>
          <p className="lab-lbl" style={{ marginTop: 2 }}>{crew.van} · {crew.plate}</p>
        </div>
      </div>
      <div style={{ padding: phone ? 12 : 16, flex: 1 }}><Basket phone={phone} play={play} /></div>
    </div>
  );

  const cls = `${play ? 'play-' + play : ''}${at ? ' lab-frz' : ''}`.trim();
  const frz = at ? { '--at': at + 'ms' } : null;

  if (phone) {
    /* &roster shows the phone's FIRST screen — the roster on its own. Without it the roster sits
       dimmed behind the bay sheet, which is the true resting state but makes three roster looks
       impossible to tell apart on a board. */
    if (rosterOnly) {
      return (
        <div className={cls} style={{ ...frz, padding: 12 }}>
          <style>{LOOK}</style>
          <Roster look={look} play={play} phone />
        </div>
      );
    }
    return (
      <div className={cls} style={{ ...frz, padding: 12, display: 'grid', gap: 12 }}>
        <style>{LOOK}</style>
        <div style={{ maxHeight: 132, overflow: 'hidden', opacity: 0.35, pointerEvents: 'none' }}>
          <Roster look={look} play={play} phone />
        </div>
        {bay}
      </div>
    );
  }
  return (
    <div className={cls} style={{ ...frz, padding: 24, height: '100%' }}>
      <style>{LOOK}</style>
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20, height: '100%' }}>
        <Roster look={look} play={play} />
        {bay}
      </div>
    </div>
  );
}

/* ── the segment shape — kept so the decided board still opens; NOT the shape he chose ─────── */
export function LoadModuleMock({ phone }) {
  const step = (n, label, done, now) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', border: `1px solid ${now ? 'var(--accent-edge)' : 'var(--line-2)'}`, font: '900 11px/1 var(--font-mono)', color: now ? 'var(--ink)' : 'var(--ink-dim)' }}>
        {done ? <Check size={13} /> : n}
      </span>
      <span className="lab-lbl" style={{ color: now ? 'var(--ink)' : 'var(--ink-dim)' }}>{label}</span>
    </div>
  );
  const head = (
    <div className="lab-sub" style={{ padding: '12px 14px', marginBottom: 16 }}>
      <h1 style={{ font: `900 ${phone ? 17 : 22}px/1.2 system-ui, sans-serif`, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <PackagePlus size={18} style={{ color: 'var(--ink-muted)' }} /> Muat Van
      </h1>
      <p className="lab-lbl" style={{ margin: '2px 0 12px' }}>Gudang BANDUNG</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: phone ? 12 : 24, overflowX: phone ? 'auto' : 'visible' }}>
        {step(1, 'Orang', true, false)}<ChevronRight size={14} style={{ color: 'var(--ink-dim)', flex: '0 0 auto' }} />
        {step(2, 'Muatan', false, true)}<ChevronRight size={14} style={{ color: 'var(--ink-dim)', flex: '0 0 auto' }} />
        {step(3, 'Surat jalan', false, false)}
      </div>
    </div>
  );
  const chosen = (
    <div className="lab-sub" style={{ borderColor: 'var(--accent-edge)', padding: '10px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ minWidth: 0 }}>
        <p className="lab-lbl">Orang</p>
        <p className="lab-name">{CREW[0].name} · {CREW[0].van} {CREW[0].plate}</p>
      </div>
      <span className="lab-key">Ganti</span>
    </div>
  );
  const sheet = (
    <div className="lab-card" style={{ padding: 14 }}>
      <p className="lab-lbl" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><FileText size={14} /> Riwayat muat hari ini</p>
      {CREW.slice(1).map((m) => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderTop: '1px solid var(--line-2)' }}>
          <p className="lab-name">{m.name}</p>
          <span className="lab-num" style={{ color: 'var(--ink-muted)' }}>{m.loaded} Bks · 06:40</span>
        </div>
      ))}
    </div>
  );
  if (phone) {
    return (
      <div style={{ padding: 12 }}>
        <style>{LOOK}</style>
        {head}{chosen}<Basket phone />
        <div style={{ marginTop: 12 }}>{sheet}</div>
      </div>
    );
  }
  return (
    <div style={{ padding: 24, height: '100%' }}>
      <style>{LOOK}</style>
      {head}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
        <div>{chosen}<Basket /></div>
        {sheet}
      </div>
    </div>
  );
}
