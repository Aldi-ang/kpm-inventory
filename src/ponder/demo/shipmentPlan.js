/* The fixed world the Shipment Plan tutorial plays in.

   Same rule as `warehouses.js`: a brand-new user's own branches are empty, so a live-data tour of
   this panel would teach a wall of dashes. Every number below is chosen to carry a beat.

   🔴 DO NOT "TIDY" THESE:

   - **Cello Chocolate is the whole panel.** The master vault holds 900 and the three branches need
     1.400 between them, so `short` is 500. That single row is the only thing in the entire app
     that says "this cannot all be sent", and it is the case Aldi described the factory not always
     covering: *"if there is not enough/ minimal goods are being sent then this features actually
     come in handy, especially with company that have limited production capabilities"*.
   - **Cello Mint is covered**, so the contrast is visible on the same screen: plenty in the vault,
     one branch needs a little, nothing to decide.
   - **Cello Kopi is all em-dashes.** Nothing about it can be measured yet. It is kept rather than
     hidden precisely because "we cannot see this one" is worth knowing — and it is the beat that
     separates `—` from `0`.
   - **Cello Menthol has a real zero everywhere and is therefore ABSENT from this list on purpose.**
     The panel drops products nobody needs; adding it here would break the beat that explains why
     the list is short.

   Shapes match what `BranchWarehouseManager` transposes out of `logistics`, so the real table
   renders these without knowing the difference. `null` never means zero anywhere in here. */
export const DEMO_PLAN_BRANCHES = ['BANDUNG', 'SOLO', 'SEMARANG'];

export const DEMO_PLAN_ROWS = [
  { id: 'plan-choco', name: 'Cello Chocolate', hq: 900,
    byBranch: { BANDUNG: 440, SOLO: 610, SEMARANG: 350 }, needed: 1400, short: 500 },
  { id: 'plan-mint', name: 'Cello Mint', hq: 12921,
    byBranch: { BANDUNG: 120, SOLO: 0, SEMARANG: null }, needed: 120, short: 0 },
  { id: 'plan-kopi', name: 'Cello Kopi', hq: 0,
    byBranch: { BANDUNG: null, SOLO: null, SEMARANG: null }, needed: null, short: null },
];
