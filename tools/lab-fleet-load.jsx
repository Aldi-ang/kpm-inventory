/* LAB ONLY — the two shapes for the van-loading flow, for the 2026-09-22 talk:
   "is it better to make another segment or just make another panel inside the fleet and roster".

   Neither of these is product code and neither touches handleLoadCanvas / handleClearCanvas —
   they are pictures of where the job would LIVE, drawn in the app's own palette (slate + gold,
   no blue, no green) because the Fleet & Roster repaint follows whichever shape he picks.

   ?shell&fleet&mock=panel   → option A, the loading bay as a panel inside Fleet & Roster
   ?shell&fleet&mock=module  → option B, van loading as its own segment in the sidebar

   Delete this file when the shape ships. */
import React from 'react';
import { Truck, PackagePlus, ArrowLeft, Search, Check, ChevronRight, User, FileText, Trash2 } from 'lucide-react';

const PRODUCTS = [
  { id: 'p-cg16', name: 'Cello Green 16', stock: 420, perSlop: 10, perBal: 200 },
  { id: 'p-cm12', name: 'Cello Merah 12', stock: 168, perSlop: 10, perBal: 200 },
  { id: 'p-djar', name: 'Djarum Coklat 12', stock: 240, perSlop: 10, perBal: 200 },
  { id: 'p-gg12', name: 'Gudang Garam Surya 12', stock: 900, perSlop: 10, perBal: 200 },
  { id: 'p-smp16', name: 'Sampoerna Mild 16', stock: 600, perSlop: 10, perBal: 200 },
];
const CREW = [
  { id: 'f-b1', name: 'Budi Santoso', vehicle: 'HONDA VARIO D 5521 XY', loaded: 484 },
  { id: 'f-d1', name: 'Dedi Kurniawan', vehicle: 'HONDA BEAT D 9080 KL', loaded: 200 },
  { id: 'f-a1', name: 'Adi Nugroho', vehicle: 'SUZUKI CARRY D 7714 MN', loaded: 0 },
];
/* the basket the admin builds before ANY write — three lines, mixed units, so the "= N Bks"
   column has something to convert and the total is not a single row's number */
const BASKET = [
  { id: 'p-cg16', name: 'Cello Green 16', qty: 3, unit: 'Bal', bks: 600, stock: 420 },
  { id: 'p-djar', name: 'Djarum Coklat 12', qty: 12, unit: 'Slop', bks: 120, stock: 240 },
  { id: 'p-smp16', name: 'Sampoerna Mild 16', qty: 40, unit: 'Bks', bks: 40, stock: 600 },
];
const TOTAL = BASKET.reduce((n, b) => n + b.bks, 0);

/* ── the basket: the part that is IDENTICAL in both options ───────────────────────────────── */
function Basket({ compact }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--line-2)] bg-[var(--raised)] p-3 lg:p-4">
        <p className="text-[11px] lg:text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)] font-bold mb-2">
          Ambil dari gudang BANDUNG
        </p>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-dim)]" />
          <input
            readOnly value="cello"
            className="w-full bg-[var(--inset)] border border-[var(--line-2)] rounded-lg py-2.5 pl-9 pr-3 text-[13px] font-bold text-[var(--ink)] outline-none"
          />
        </div>
        <div className="mt-2 space-y-1.5">
          {PRODUCTS.slice(0, 2).map((p) => (
            <div key={p.id} className="kpm-key flex items-center justify-between gap-3 rounded-lg border border-[var(--line-2)] bg-[var(--panel)] px-3 py-2.5 min-h-[44px]">
              <div className="min-w-0">
                <p className="text-[13px] font-black text-[var(--ink)] truncate">{p.name}</p>
                <p className="text-[11px] lg:text-[10px] uppercase tracking-widest text-[var(--ink-dim)] font-bold">Sisa {p.stock} Bks</p>
              </div>
              <span className="shrink-0 rounded-md border border-[var(--accent-edge)] px-2 py-1 text-[11px] lg:text-[10px] font-black uppercase tracking-widest text-[var(--accent-ink)]">
                + Tambah
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--line-2)] bg-[var(--raised)] overflow-hidden">
        <div className="flex items-center justify-between px-3 lg:px-4 py-2.5 border-b border-[var(--line-2)]">
          <p className="text-[11px] lg:text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)] font-bold">
            Muatan hari ini · {BASKET.length} barang
          </p>
          <p className="kpm-stamp text-[11px] font-black font-mono tabular-nums text-[var(--ink)]">{TOTAL} Bks</p>
        </div>
        <div className="divide-y divide-[var(--line-2)]">
          {BASKET.map((b) => (
            <div key={b.id} className="flex items-center gap-2 px-3 lg:px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black text-[var(--ink)] truncate">{b.name}</p>
                <p className="text-[11px] lg:text-[10px] uppercase tracking-widest text-[var(--ink-dim)] font-bold">
                  Sisa gudang {b.stock} Bks
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span style={{ minWidth: 42 }} className="rounded-md border border-[var(--line-2)] bg-[var(--panel)] px-2 py-1.5 text-[13px] font-black font-mono tabular-nums text-[var(--ink)] text-center">
                  {b.qty}
                </span>
                <span className="rounded-md border border-[var(--line-2)] bg-[var(--panel)] px-2 py-1.5 text-[11px] font-black uppercase tracking-widest text-[var(--ink-muted)]">
                  {b.unit}
                </span>
                <span style={{ width: 62 }} className="text-[11px] font-black font-mono tabular-nums text-[var(--ink-dim)] text-right">= {b.bks} Bks</span>
                <span style={{ width: 34, height: 34 }} className="grid place-items-center rounded-md border border-[var(--line-2)] text-[var(--ink-dim)]"><Trash2 size={13} /></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="kpm-plate w-full min-h-[52px] rounded-xl bg-[var(--gold)] text-[var(--gold-ink)] font-black text-[13px] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
        <Truck size={16} /> Muat van — {TOTAL} Bks {compact ? '' : '· 3 barang'}
      </button>
      <p className="text-center text-[11px] lg:text-[10px] uppercase tracking-widest text-[var(--ink-dim)] font-bold">
        satu tekan · satu surat jalan · van tercatat sekali
      </p>
    </div>
  );
}

/* ── OPTION A — a panel inside Fleet & Roster ─────────────────────────────────────────────── */
export function LoadBayPanelMock({ phone }) {
  const crew = CREW[0];
  const roster = (
    <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--raised)] overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--line-2)] flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-black uppercase tracking-widest text-[var(--ink)] flex items-center gap-2">
            <Truck size={16} className="text-[var(--ink-muted)]" /> Roster BANDUNG
          </h2>
          <p className="text-[11px] lg:text-[10px] uppercase tracking-widest text-[var(--ink-dim)] font-bold mt-0.5">4 orang aktif</p>
        </div>
        <span style={{ width: 40, height: 40 }} className="grid place-items-center rounded-lg border border-[var(--line-2)] text-[var(--ink-muted)]"><User size={16} /></span>
      </div>
      <div className="p-3 space-y-2 flex-1">
        {CREW.map((m, i) => (
          <div key={m.id} style={{ minHeight: 60 }} className={`kpm-key rounded-xl border px-3 py-3 flex items-center justify-between gap-2 ${i === 0 ? 'border-[var(--accent-edge)] bg-[var(--panel)]' : 'border-[var(--line-2)] bg-[var(--panel)]'}`}>
            <div className="min-w-0">
              <p className="text-[14px] font-black text-[var(--ink)] truncate">{m.name}</p>
              <p className="text-[11px] lg:text-[10px] uppercase tracking-widest text-[var(--ink-dim)] font-bold truncate">{m.vehicle}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="kpm-stamp text-[11px] font-black font-mono tabular-nums text-[var(--ink-muted)]">{m.loaded || '—'}</span>
              <span className="rounded-md border border-[var(--line-2)] px-2 py-1.5 text-[11px] lg:text-[10px] font-black uppercase tracking-widest text-[var(--ink)] flex items-center gap-1">
                <PackagePlus size={12} /> Muat
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const bay = (
    <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--panel)] overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--line-2)] flex items-center gap-3">
        {phone && <span style={{ width: 40, height: 40 }} className="grid place-items-center rounded-lg border border-[var(--line-2)] text-[var(--ink)]"><ArrowLeft size={16} /></span>}
        <div className="min-w-0">
          <p className="text-[11px] lg:text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)] font-bold">Muat van</p>
          <h2 className="text-[20px] lg:text-[26px] font-black text-[var(--ink)] leading-tight truncate">{crew.name}</h2>
          <p className="text-[11px] lg:text-[10px] uppercase tracking-widest text-[var(--ink-dim)] font-bold truncate">{crew.vehicle}</p>
        </div>
      </div>
      <div className="p-3 lg:p-4 flex-1 overflow-hidden"><Basket compact={phone} /></div>
    </div>
  );

  if (phone) {
    return (
      <div className="p-3 space-y-3">
        <div style={{ maxHeight: 120 }} className="opacity-30 pointer-events-none overflow-hidden">{roster}</div>
        <div className="rounded-2xl border border-[var(--line-2)] shadow-2xl">{bay}</div>
      </div>
    );
  }
  return (
    <div className="p-6 h-full">
      {/* inline, not a class: tailwind.config.js scans ./src only, so an arbitrary value that
          appears nowhere in the app is never generated and the columns would stack silently */}
      <div className="h-full" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>{roster}{bay}</div>
    </div>
  );
}

/* ── OPTION B — its own segment in the sidebar ────────────────────────────────────────────── */
export function LoadModuleMock({ phone }) {
  const step = (n, label, done, now) => (
    <div className="flex items-center gap-2 shrink-0">
      <span className={`grid place-items-center w-[26px] h-[26px] rounded-full border text-[11px] font-black font-mono ${now ? 'border-[var(--accent-edge)] text-[var(--ink)]' : 'border-[var(--line-2)] text-[var(--ink-dim)]'}`}>
        {done ? <Check size={13} /> : n}
      </span>
      <span className={`text-[11px] lg:text-[10px] uppercase tracking-[0.2em] font-black ${now ? 'text-[var(--ink)]' : 'text-[var(--ink-dim)]'}`}>{label}</span>
    </div>
  );
  const head = (
    <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--raised)] px-4 py-3 mb-4">
      <h1 className="text-[15px] lg:text-[22px] font-black uppercase tracking-widest text-[var(--ink)] flex items-center gap-2">
        <PackagePlus size={18} className="text-[var(--ink-muted)]" /> Muat Van
      </h1>
      <p className="text-[11px] lg:text-[10px] uppercase tracking-widest text-[var(--ink-dim)] font-bold mt-0.5 mb-3">
        Gudang BANDUNG · {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
      </p>
      <div className={`flex items-center gap-3 ${phone ? 'overflow-x-auto' : 'gap-6'}`}>
        {step(1, 'Orang', true, false)}
        <ChevronRight size={14} className="text-[var(--ink-dim)] shrink-0" />
        {step(2, 'Muatan', false, true)}
        <ChevronRight size={14} className="text-[var(--ink-dim)] shrink-0" />
        {step(3, 'Surat jalan', false, false)}
      </div>
    </div>
  );
  const chosen = (
    <div className="rounded-xl border border-[var(--accent-edge)] bg-[var(--raised)] px-3 py-2.5 mb-3 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[11px] lg:text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)] font-bold">Orang</p>
        <p className="text-[14px] font-black text-[var(--ink)] truncate">{CREW[0].name} · {CREW[0].vehicle}</p>
      </div>
      <span className="shrink-0 rounded-md border border-[var(--line-2)] px-2 py-1.5 text-[11px] lg:text-[10px] font-black uppercase tracking-widest text-[var(--ink)]">Ganti</span>
    </div>
  );
  const sheet = (
    <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--panel)] p-3 lg:p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={14} className="text-[var(--ink-dim)]" />
        <p className="text-[11px] lg:text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)] font-bold">Riwayat muat hari ini</p>
      </div>
      {CREW.slice(1).map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-2 py-2 border-t border-[var(--line-2)]">
          <p className="text-[13px] font-black text-[var(--ink)] truncate">{m.name}</p>
          <span className="kpm-stamp text-[11px] font-black font-mono tabular-nums text-[var(--ink-muted)] shrink-0">{m.loaded} Bks · 06:40</span>
        </div>
      ))}
    </div>
  );

  if (phone) {
    return <div className="p-3">{head}{chosen}<Basket compact />{<div className="mt-3">{sheet}</div>}</div>;
  }
  return (
    <div className="p-6 h-full">
      {head}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
        <div>{chosen}<Basket /></div>
        {sheet}
      </div>
    </div>
  );
}
