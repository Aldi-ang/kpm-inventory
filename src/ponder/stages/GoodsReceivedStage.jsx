/* The Goods Received stage — a SCHEMATIC, not the real form, and that is a decision not a shortcut.

   `RestockVaultView`'s intake form writes stock into Firestore and computes landed cost. It is a
   money path with the heaviest check coverage in the repo, and pulling its visual half out would
   mean touching the arithmetic. `.claude/NEXT-SESSION.md` set the rule before this was written:
   **if extracting the visual half starts touching anything that computes a total, build a
   schematic instead.** Ponder's own world is a schematic and not your base, so this is the
   faithful option rather than the lazy one.

   What it must NOT do is invent numbers that lie. Every figure below is arithmetically real:
     900 × Rp 8.500                       = Rp 7.650.000   base
     + 250.000 + 180.000 + 90.000         = Rp 8.170.000   trueLandedTotal
     ÷ 900                                = Rp 9.078       landed per Bks
   which is exactly `totalBasePrice + shippingCost + exciseTax + laborCost`, then divided by the
   packs received — the same two lines `RestockVaultView` runs. A tutorial that rounds its own
   example into nonsense teaches someone to distrust the screen. */
import React from 'react';

const rp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

const Field = ({ k, label, value, mono = true, dim = false }) => (
  <div data-ponder={k} className="min-w-0">
    <span className="block text-[9.5px] font-bold text-ink-muted uppercase tracking-widest mb-1">{label}</span>
    <div className={`border border-line-2 rounded-lg bg-inset px-3 py-2 text-[13px] truncate
                     ${mono ? 'font-mono' : ''} ${dim ? 'text-ink-muted' : 'text-ink'}`}>{value}</div>
  </div>
);

export default function GoodsReceivedStage() {
  return (
    <div className="p-5 space-y-4 min-w-[720px]">

      <div data-ponder="f:target" className="flex items-center gap-2">
        <span className="text-[9.5px] font-bold text-ink-muted uppercase tracking-widest">Target produksi bulan ini</span>
        <span className="text-[9.5px] font-display font-bold uppercase tracking-widest text-accent-ink">+ Set</span>
        <span className="flex-1 border border-line-2 rounded-lg bg-panel px-3 py-1.5 text-[12px] text-ink-muted">Belum ada target bulan ini.</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
        <Field k="f:asal" label="Asal" value="Pabrik Kudus" />
        <span className="pb-2 text-ink-muted">⇄</span>
        <Field k="f:tujuan" label="Tujuan" value="Gudang Pusat (HQ)" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field k="f:sj-app" label="Delivery note (app)" value="SJ-185108" />
        <Field k="f:sj-factory" label="Delivery note (factory)" value="PK/26/0812" />
        <Field k="f:tanggal" label="Tanggal" value="27/08/2026" />
      </div>

      <div className="border border-line-2 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_110px_90px_120px] gap-3 px-4 py-2 border-b border-line-2 bg-raised
                        text-[9.5px] font-bold text-ink-muted uppercase tracking-widest">
          <span data-ponder="t:barang">Barang</span>
          <span data-ponder="t:batch">Batch</span>
          <span data-ponder="t:jumlah" className="text-right">Jumlah</span>
          <span data-ponder="t:landed" className="text-right">@ Landed</span>
        </div>
        <div className="grid grid-cols-[1fr_110px_90px_120px] gap-3 px-4 py-3 items-center">
          <span data-ponder="t:barang" className="text-[13px] font-bold text-ink truncate">Cello Chocolate</span>
          <span data-ponder="t:batch" className="font-mono text-[12px] text-ink-muted">B-2608</span>
          <span data-ponder="t:jumlah" className="font-mono text-[13px] text-ink text-right">900</span>
          <span data-ponder="t:landed" className="font-mono text-[13px] text-accent-ink text-right">{rp(9078)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field k="c:ongkir" label="Ongkos kirim" value={rp(250000)} />
        <Field k="c:cukai" label="Pita cukai" value={rp(180000)} />
        <Field k="c:bongkar" label="Upah bongkar" value={rp(90000)} />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-line-2 pt-4">
        <div data-ponder="sum:total">
          <span className="block text-[9.5px] font-bold text-ink-muted uppercase tracking-widest mb-0.5">Total landed value</span>
          <span className="block font-mono text-[20px] font-bold text-ink">{rp(8170000)}</span>
        </div>
        <div data-ponder="sum:perbks">
          <span className="block text-[9.5px] font-bold text-ink-muted uppercase tracking-widest mb-0.5">Landed / Bks</span>
          <span className="block font-mono text-[20px] font-bold text-accent-ink">{rp(9078)}</span>
        </div>
      </div>
    </div>
  );
}
