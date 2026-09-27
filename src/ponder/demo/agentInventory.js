/* The fixed world the Agent Chest page plays in: Budi's van seen as the chest (LoadingBay vanOnly).

   Same rule as `loadingBay.js`: a live-data tour would teach whatever the van holds that day. Every figure below carries
   a beat (logicFixes "THE AGENT INVENTORY CHEST" re-runs the paging on them):

   - **Nine products**, so the chest really pages: six squares on page 1, the rest on page 2, page 3 empty.
   - **A hole on page 1** (the fourth square), so page 1 holds five and the beat about an empty square staying where it
     is has one to point at. The pages then read 1 · 5, 2 · 4, 3 · 0, and the beat quotes **2 · 4**.
   - **Mixed units** in the van rows, so the Bks on each square is a conversion, the way a real van reads.
   - **Three quarantine lines, each with its own shop and reason**, the quarantinedCargo shape Agent Inventory hands the
     crate (v4, 2026-09-27: the damaged row became the second chest).
   - **Four sales with their lines and two samples**, so the book has entries on both ribbons.

   The millimetres are the ones the chest v3 prototype drew, so a 16-stick pack stands fatter than a 12. */
const U = { packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4 };
const product = (id, name, [w, h, d]) => ({ id, name, stock: 0, dimensions: { w, h, d }, ...U });

export const DEMO_CHEST = {
  stock: [
    product('cello-green-16', 'Cello Green 16', [55, 90, 22]),
    product('djarum-coklat-12', 'Djarum Coklat 12', [52, 86, 24]),
    product('sampoerna-mild-16', 'Sampoerna Mild 16', [54, 92, 21]),
    product('gudang-garam-12', 'Gudang Garam 12', [56, 88, 26]),
    product('cello-merah-12', 'Cello Merah 12', [50, 88, 20]),
    product('cello-filter-20', 'Cello Filter 20', [57, 94, 23]),
    product('djarum-super-12', 'Djarum Super 12', [53, 87, 25]),
    product('sampoerna-kretek', 'Sampoerna Kretek', [58, 90, 27]),
    product('cello-green-12', 'Cello Green 12', [50, 86, 19]),
  ],
  agent: {
    id: 'demo-budi', name: 'Budi', vehicle: 'Grand Max',
    activeCanvas: [
      { productId: 'cello-green-16', qty: 3, unit: 'Bal' },
      { productId: 'djarum-coklat-12', qty: 12, unit: 'Slop' },
      { productId: 'sampoerna-mild-16', qty: 40, unit: 'Bks' },
      { productId: 'gudang-garam-12', qty: 20, unit: 'Slop' },
      { productId: 'cello-merah-12', qty: 80, unit: 'Bks' },
      { productId: 'cello-filter-20', qty: 6, unit: 'Slop' },
      { productId: 'djarum-super-12', qty: 45, unit: 'Bks' },
      { productId: 'sampoerna-kretek', qty: 30, unit: 'Bks' },
      { productId: 'cello-green-12', qty: 24, unit: 'Bks' },
    ],
    vanLayout: ['cello-green-16', 'djarum-coklat-12', 'sampoerna-mild-16', null, 'gudang-garam-12', 'cello-merah-12',
      'cello-filter-20', 'djarum-super-12', 'sampoerna-kretek', 'cello-green-12'],
  },
  quarantine: [
    { id: 'q-1', productId: 'djarum-coklat-12', itemName: 'Djarum Coklat 12', qty: 5, unit: 'Bks', returnReason: 'Kemasan rusak', customerOrigin: 'Warung Bu Sri' },
    { id: 'q-2', productId: 'cello-merah-12', itemName: 'Cello Merah 12', qty: 2, unit: 'Bks', returnReason: 'Basah', customerOrigin: 'Toko Makmur' },
    { id: 'q-3', productId: 'cello-green-16', itemName: 'Cello Green 16', qty: 12, unit: 'Bks', returnReason: 'Pita cukai', customerOrigin: 'Toko Sumber Rejeki' },
  ],
  sales: [
    { id: 's-1', type: 'SALE', customerName: 'Toko Sumber Rejeki', paymentType: 'Cash', total: 1850000,
      items: [{ productId: 'cello-green-16', qty: 40, unit: 'Bks', calculatedPrice: 27500, priceTier: 'Retail' }, { productId: 'djarum-coklat-12', qty: 6, unit: 'Slop', calculatedPrice: 125000 }] },
    { id: 's-2', type: 'SALE', customerName: 'Warung Bu Sri', paymentType: 'Titip', total: 640000,
      items: [{ productId: 'cello-green-16', qty: 20, unit: 'Bks', calculatedPrice: 27500 }, { productId: 'djarum-coklat-12', qty: 1, unit: 'Slop', calculatedPrice: 90000 }] },
    { id: 's-3', type: 'SALE', customerName: 'Toko Berkah Jaya', paymentType: 'Transfer', total: 425000,
      items: [{ productId: 'sampoerna-mild-16', qty: 15, unit: 'Bks', calculatedPrice: 28333 }] },
    { id: 's-4', type: 'SALE', customerName: 'Toko Makmur', paymentType: 'Cash', total: 212000,
      items: [{ productId: 'gudang-garam-12', qty: 8, unit: 'Bks', calculatedPrice: 26500 }] },
  ],
  samples: [
    { reason: 'Warung Pak Darto', productName: 'Cello Green 16', qty: 1.25, sticksPerPack: 16 },
    { reason: 'Toko Makmur', productName: 'Sampoerna Mild 16', qty: 0.375, sticksPerPack: 16 },
  ],
};
