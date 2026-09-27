/* The fixed world the Agent Chest page plays in: Budi's van seen as the chest (LoadingBay vanOnly).

   Same rule as `loadingBay.js`: a live-data tour would teach whatever the van holds that day. Every figure below carries
   a beat (logicFixes "THE AGENT INVENTORY CHEST" re-runs the paging on them):

   - **Nine products**, so the chest really pages: six squares on page 1, the rest on page 2, page 3 empty.
   - **A hole on page 1** (the fourth square), so page 1 holds five and the beat about an empty square staying where it
     is has one to point at. The pages then read 1 · 5, 2 · 4, 3 · 0, and the beat quotes **2 · 4**.
   - **Mixed units** in the van rows, so the Bks on each square is a conversion, the way a real van reads.
   - **Three damaged lines, each with its own reason**, the shape `damagedInVan` hands the chest.

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
  damaged: [
    { id: 'djarum-coklat-12', name: 'Djarum Coklat 12', bks: 5, why: 'Kemasan rusak' },
    { id: 'cello-merah-12', name: 'Cello Merah 12', bks: 2, why: 'Basah' },
    { id: 'cello-green-16', name: 'Cello Green 16', bks: 12, why: 'Pita cukai' },
  ],
};
