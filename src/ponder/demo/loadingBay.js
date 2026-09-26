/* The fixed world the Loading Bay tutorial plays in: Budi's van at Gudang Bandung.

   Same rule as `warehouses.js`: a new branch's bay is empty, so a live-data tour would teach empty squares. Every
   figure below carries a beat:

   - **Cello Menthol is at zero**, so the warehouse chest shows a box that reads "habis" next to the ones that can move.
   - **Budi's van already holds two products**, so the plan has something to send back as well as something to load.
   - **DEMO_BAY_PLAN is two lines out and one line back.** The muatan shows a + and a − side by side, which is the beat
     about one surat jalan for what goes out and one bukti kembali for what comes back.
   - **DEMO_BAY_FAILED is what stays after a press where one line did not land**: that line alone, with its reason.
   - **Sari and Andi are the Tim**, two other vans in the same place with different goods, so Salin has a real choice.
   - **One geofence request is still PENDING**, so the beat that sends approval to the queue has something waiting.

   Shapes are what FleetCanvasManager hands the bay, so the real component renders them without knowing. */
const U = { packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4 };
const product = (id, name, stock) => ({ id, name, stock, ...U });

export const DEMO_BAY = {
  warehouse: 'Bandung',
  stock: [
    product('cello-choco', 'Cello Chocolate', 900),
    product('cello-mint', 'Cello Mint', 1240),
    product('cello-kopi', 'Cello Kopi', 360),
    product('cello-grape', 'Cello Grape', 480),
    product('cello-lemon', 'Cello Lemon', 150),
    product('cello-menthol', 'Cello Menthol', 0),
  ],
  agent: {
    id: 'demo-budi', name: 'Budi', vehicle: 'Grand Max',
    activeCanvas: [{ productId: 'cello-mint', qty: 4, unit: 'Slop' }, { productId: 'cello-kopi', qty: 30, unit: 'Bks' }],
    vanLayout: ['cello-mint', 'cello-kopi'],
    loadPreset: [{ id: 'cello-choco', qty: 5, unit: 'Slop' }, { id: 'cello-mint', qty: 2, unit: 'Slop' }, { id: 'cello-grape', qty: 20, unit: 'Bks' }],
  },
  team: [
    { id: 'demo-sari', name: 'Sari', activeCanvas: [{ productId: 'cello-choco', qty: 3, unit: 'Slop' }, { productId: 'cello-lemon', qty: 40, unit: 'Bks' }] },
    { id: 'demo-andi', name: 'Andi', activeCanvas: [{ productId: 'cello-grape', qty: 6, unit: 'Slop' }] },
  ],
  bypasses: [
    { id: 'geo-1', storeName: 'Toko Makmur', timestamp: '2026-09-25T10:12:00', distance: 240, status: 'PENDING' },
    { id: 'geo-2', storeName: 'Warung Bu Tini', timestamp: '2026-09-24T15:40:00', distance: 180, status: 'APPROVED' },
  ],
  titip: [
    { key: 'toko makmur', name: 'Toko Makmur', bks: 60, rp: 780000 },
    { key: 'warung sinar', name: 'Warung Sinar', bks: 20, rp: 250000 },
  ],
  bounties: [{ key: 'PENALTY_EOD_demo', label: 'End-of-day shortfall', date: '2026-09-22', amount: 50000 }],
};

export const DEMO_BAY_PLAN = [
  { id: 'cello-choco', qty: 3, unit: 'Slop', dir: 1 },
  { id: 'cello-grape', qty: 40, unit: 'Bks', dir: 1 },
  { id: 'cello-kopi', qty: 10, unit: 'Bks', dir: -1 },
];
export const DEMO_BAY_FAILED = [{ id: 'cello-grape', qty: 40, unit: 'Bks', dir: 1, reason: 'stok gudang tidak cukup' }];
export const DEMO_BAY_PRESET = DEMO_BAY.agent.loadPreset.map(l => ({ ...l, dir: 1 }));
