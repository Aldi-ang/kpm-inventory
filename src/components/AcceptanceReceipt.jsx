/* THE SURAT JALAN — the printed goods-received note.

   Pulled out of RestockVaultView, for one reason: the modal could not be LOOKED at. It lives
   behind a Google sign-in, then the Master Vault gate, then a delivery record that has to be
   accepted first, so "it renders transparent" survived as a report nobody could reproduce. As its
   own component it mounts in the Ponder lab against a fixed record — `?nota` — and a frame settles
   what a paragraph could not. (Aldi, 2026-08-31: *"we need to redesign the receipt for this
   because it looks awful and i dont know why is it transparant look at the SC"*.)

   ⚠️ PALETTE EXCEPTION, and it is deliberate. This card is a printed document, not app UI, so it
   is white paper in both themes. The theme tokens must NOT reach in here — `--ink-muted` is a
   light warm grey that prints at about 2.3:1 on white.

   ⚠️ AND THE OPPOSITE HAZARD, which is what made it see-through: the app shell repaints every
   plain `.bg-white` inside `.biohazard-content`. That rule is now scoped away from
   `.print-receipt` in BiohazardTheme.jsx. Anything added here that needs to stay paper-white
   belongs INSIDE this card, so that scope covers it.

   TYPE RULE: monospace is for codes, quantities and money — things that are read digit by digit or
   compared down a column. The company name, the labels and the signatures are ordinary text. The
   old version set the whole document in mono, which is what made a delivery note read like a till
   slip. */
import React from 'react';
import { X, Printer } from 'lucide-react';
import { formatNumber } from '../utils/helpers';
import { MASTER } from '../utils/supply.js';

/* One label/value pair. `nowrap` on the value is load-bearing: the old totals block let
   "TOTAL LANDED VALUE" and its own number break onto separate lines mid-figure. */
const Field = ({ label, value, mono = false, align = 'left' }) => (
  <div className={align === 'right' ? 'text-right' : ''}>
    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500">{label}</p>
    <p className={`mt-0.5 font-bold text-gray-900 ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</p>
  </div>
);

const Money = ({ label, value, strong = false }) => (
  <div className={`flex items-baseline justify-between gap-6 ${strong ? 'pt-2 mt-1 border-t-2 border-black' : ''}`}>
    <span className={strong ? 'text-[11px] font-black uppercase tracking-[0.14em] text-gray-900' : 'text-[11px] text-gray-600'}>
      {label}
    </span>
    <span className={`font-mono tabular-nums whitespace-nowrap ${strong ? 'text-base font-black' : 'text-xs'}`}>
      Rp {formatNumber(value)}
    </span>
  </div>
);

export default function AcceptanceReceipt({ acceptance, onClose, receivedBy, companyName }) {
  if (!acceptance) return null;

  const origin = acceptance.supplierName || 'Pabrik Internal';
  const shipping = (Number(acceptance.shippingCost) || 0) + (Number(acceptance.laborCost) || 0);
  const rows = acceptance.items || [];
  const totalQty = rows.length;

  return (
    <div className="fixed inset-0 z-[200] bg-sunk/80 flex items-center justify-center p-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* NO `animate-fade-in`, on purpose. His locked rule: an animation must never OWN an
          element's visibility. `fadeIn` is opacity-only, so for half a second the paper is
          semi-transparent and the page reads through it — the same appearance as the bug above,
          which is how one report became a session of chasing two different things. A document you
          are about to print gains nothing from an entrance. */}
      <div className="print-receipt bg-white text-black w-full max-w-2xl shadow-2xl relative flex flex-col text-sm border-t-8 border-orange max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="no-print absolute top-4 right-4 text-gray-500 hover:text-gray-900 transition-colors"><X size={22}/></button>

        <div className="px-10 pt-9 pb-8">
          {/* WHO ISSUED IT comes first. The old header led with the FACTORY name in the largest
              type on the page, so his own delivery note looked like it belonged to the supplier. */}
          {/* pr-8 on the whole header keeps everything clear of the close button, which floats over
              this corner. Stacked on a phone: side by side, the title and the number each squeeze
              the other into three wrapped lines at 375px. */}
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6 border-b-2 border-black pb-4 pr-8">
            <div>
              <h2 className="font-display text-xl font-black uppercase tracking-[0.14em] leading-none text-black">
                {companyName || 'KPM INVENTORY'}
              </h2>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gray-600">
                Surat Jalan · Goods Received Note
              </p>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500">No. Surat Jalan</p>
              <p className="font-mono tabular-nums text-lg font-black leading-tight">{acceptance.poNumber}</p>
            </div>
          </header>

          {/* Four facts, one row, no boxes. The two grey panels were the same four fields wearing
              furniture, and on a phone they stacked into eight lines. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 py-5 border-b border-gray-300">
            <Field label="Asal" value={origin} />
            <Field label="Tujuan" value={acceptance.destination || MASTER} />
            <Field label="Tanggal" value={acceptance.date} mono />
            <Field label="Jumlah Item" value={`${totalQty} baris`} mono align="right" />
          </div>

          <table className="w-full text-left border-collapse mt-7">
            <thead>
              <tr className="border-b-2 border-black text-[9px] uppercase tracking-[0.18em] text-gray-500">
                <th className="pb-2 font-bold">Item Description</th>
                <th className="pb-2 font-bold text-right">Batch</th>
                <th className="pb-2 font-bold text-right">Qty Received</th>
              </tr>
            </thead>
            <tbody className="border-b-2 border-black">
              {rows.map((i, idx) => (
                <tr key={idx} className="border-b border-gray-200 last:border-b-0">
                  <td className="py-2.5 pr-4 font-bold text-gray-900">{i.name}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-xs text-gray-600 whitespace-nowrap">{i.batchNo || '—'}</td>
                  <td className="py-2.5 pl-4 text-right font-mono tabular-nums font-bold whitespace-nowrap">{i.qtyReceived}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-6">
            <div className="w-full sm:w-[62%] space-y-1.5">
              <Money label="Total Wares Base" value={acceptance.totalBasePrice} />
              <Money label="Shipping / Labor" value={shipping} />
              <Money label="Tax / Cukai" value={acceptance.exciseTax || 0} />
              <Money label="Total Landed Value" value={acceptance.trueLandedTotal} strong />
            </div>
          </div>

          {/* A signature line needs room to sign in, not a whole screen of it. The old block spent
              `mb-12` above each name and `mt-12 pt-8` above the pair, which pushed both names off
              the first view on a laptop. */}
          <div className="grid grid-cols-2 gap-10 mt-12 text-center text-[11px]">
            <div>
              <p className="text-gray-600">Dikirim oleh</p>
              <p className="mt-10 border-t border-black pt-1.5 font-bold">Factory Logistics</p>
            </div>
            <div>
              <p className="text-gray-600">Diterima &amp; diperiksa oleh</p>
              <p className="mt-10 border-t border-black pt-1.5 font-bold">{receivedBy}</p>
            </div>
          </div>
        </div>

        <div className="no-print bg-gray-100 px-6 py-4 border-t border-gray-300 mt-auto">
          <button onClick={() => window.print()} className="w-full bg-black text-white py-3.5 rounded font-bold uppercase tracking-[0.2em] text-xs flex justify-center items-center gap-2 hover:bg-gray-800 active:scale-[0.99] transition-transform">
            <Printer size={15}/> Print Document
          </button>
        </div>
      </div>
    </div>
  );
}
