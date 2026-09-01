import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer } from 'lucide-react';

/* THE SLIP THAT TRAVELS WITH THE BOX, and the barcode the branch scans when it lands.

   Aldi, 2026-09-01: *"i want u to add barcode to scan and print for restock vault so that when it
   scanned it can auto confirm that the shipment is arrived"*, and then, asked what "arrived" should
   mean: *"the scan said that the shipment is arrived but the blind counting on the shipment should
   still be exist"*.

   🔴 SO THIS PAPER CONFIRMS THAT THE BOX IS HERE, AND NOTHING ELSE. It carries no quantities. The
   arrival check is partially blind on purpose — a counter who can read HQ's figures off the slip in
   their hand stops counting and starts copying, and the whole variance record becomes a rubber
   stamp. The route, the date and the code are all it may say.

   ⚠️ THE ENCODER IS A LIBRARY, DELIBERATELY. A Code 128 symbol is a lookup table of 107 patterns,
   and a single wrong digit produces a barcode that looks perfectly fine on screen and refuses to
   scan at the warehouse door — a failure nobody discovers until the goods are already there, and
   one this environment cannot test for: `BarcodeDetector` is an Android Chrome API and is absent
   from the desktop browser available here. JsBarcode is MIT, pure JS, bundles offline, and costs no
   request at runtime.

   CODE 128 rather than QR: it is the format printed on every courier label in the country, it reads
   from a longer distance on a phone, and `BarcodeDetector` on Android supports it natively. */
export default function ShipmentLabel({ shipment, onClose, companyName }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!shipment || !svgRef.current) return;
    JsBarcode(svgRef.current, String(shipment.id), {
      format: 'CODE128',
      /* Wide and tall enough to read from a hand's distance on a phone, with a quiet zone —
         a barcode printed flush to an edge is a barcode a scanner refuses. */
      width: 2,
      height: 90,
      margin: 12,
      displayValue: true,
      fontOptions: 'bold',
      fontSize: 15,
      textMargin: 6,
      background: '#ffffff',
      lineColor: '#000000',
    });
  }, [shipment]);

  if (!shipment) return null;

  const items = shipment.fulfilledItems || shipment.requestedItems || shipment.items || [];
  const when = shipment.timestamp?.seconds
    ? new Date(shipment.timestamp.seconds * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

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

      {/* No entrance animation — his locked rule that an animation must never own an element's
          visibility, and a document about to be printed gains nothing from one. */}
      <div className="print-receipt bg-white text-black w-full max-w-lg shadow-2xl relative flex flex-col border-t-8 border-orange max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="no-print absolute top-4 right-4 text-gray-500 hover:text-gray-900 transition-colors"><X size={22}/></button>

        <div className="px-8 pt-8 pb-7">
          <header className="border-b-2 border-black pb-4 pr-8">
            <h2 className="font-display text-xl font-black uppercase tracking-[0.14em] leading-none text-black">
              {companyName || 'KPM INVENTORY'}
            </h2>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
              Label Pengiriman · Shipment Label
            </p>
          </header>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-5 border-b border-gray-300">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500">Dari</p>
              <p className="font-bold text-sm break-words">Gudang Pusat</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500">Tujuan</p>
              <p className="font-bold text-sm break-words">Gudang {shipment.branch}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500">Tanggal</p>
              <p className="font-mono tabular-nums text-sm">{when}</p>
            </div>
            <div>
              {/* HOW MANY KINDS, NEVER HOW MANY PACKS. The count at the door has to be the
                  counter's own; a total printed here is the anchor the blind check exists to
                  remove. Naming the products is what makes a missing one countable as 0. */}
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500">Jenis barang</p>
              <p className="font-mono tabular-nums text-sm">{items.length}</p>
            </div>
          </div>

          <div className="py-6 flex flex-col items-center">
            <svg ref={svgRef} className="max-w-full" />
          </div>

          <div className="border-2 border-black px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest">Scan saat barang sampai</p>
            <p className="text-[11px] leading-relaxed mt-1 text-gray-700">
              Scan kode ini di layar Incoming untuk menandai barang sudah sampai. <b className="text-black">Menandai sampai bukan menerima</b> — jumlah barang tetap harus dihitung satu per satu di gudang, dan stok baru bertambah setelah hitungan itu disimpan.
            </p>
          </div>

          {items.length > 0 && (
            <div className="pt-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500 mb-2">Isi kiriman</p>
              <ul className="text-[12px] leading-relaxed list-disc pl-5">
                {items.map(i => <li key={i.productId || i.id} className="break-words">{i.name}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="no-print border-t border-gray-300 px-8 py-4 flex justify-end">
          <button onClick={() => window.print()}
            className="bg-black text-white px-5 py-2.5 rounded font-bold uppercase tracking-widest text-[11px] flex items-center gap-2 active:scale-[0.98] transition-transform">
            <Printer size={14}/> Cetak label
          </button>
        </div>
      </div>
    </div>
  );
}
