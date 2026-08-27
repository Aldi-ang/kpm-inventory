/* The fixed world the tutorial plays in.

   Ponder builds its scene from a schematic, not from your base, and this is the same idea: the
   tutorial must teach a brand-new user whose own warehouses are empty. On 2026-08-27 Bandung was
   all zeros, so a live-data tour of this panel would have taught a wall of dashes.

   🔴 EVERY NUMBER HERE IS CHOSEN TO CARRY A BEAT. Do not "tidy" them:

   - GUDANG PUSAT looks comfortable at warehouse level and is not. Its rate is almost entirely
     Cello Chocolate; Cello Mint sells nothing at all. That is the 348-days trap that shipped for
     real and that Aldi caught on screen — the whole reason there is no warehouse-level days-left.
   - BANDUNG has 400 packs in transit and nothing on the shelf. It exists so the beat about
     Shipping has something to point at, and so the drawer proves a product in transit to an empty
     branch still appears.
   - SOLO has one product under a week. It is the red number the last beat is about.

   🔴 PRODUCT IDS ARE UNIQUE ACROSS WAREHOUSES, not 'd1' in each. A scene focuses an item with
   `item:<id>`, and the overlay lights EVERY element wearing that key — three warehouses sharing
   an id would light three unrelated rows and the beat would point at the wrong thing.

   Shapes match what supplyByProduct returns, so the real table renders these without knowing the
   difference: transit === null means "this question does not apply here", never zero. */
export const DEMO_WAREHOUSES = [
  {
    name: 'GUDANG PUSAT',
    shelf: 1240, transit: null, field: 180, sold: 56, perMonth: 240,
    detail: [
      { id: 'pusat-choco', name: 'Cello Chocolate', shelf: 160, transit: 0, field: 40, sold: 56, perMonth: 240, daysLeft: 20, days: 12, drops: 2, unexplained: 0 },
      { id: 'pusat-mint', name: 'Cello Mint',      shelf: 1080, transit: 0, field: 140, sold: 0, perMonth: 0, daysLeft: null, days: 61, drops: 1, unexplained: 0 },
    ],
  },
  {
    name: 'BANDUNG',
    shelf: 0, transit: 400, field: 0, sold: 0, perMonth: 0,
    detail: [
      { id: 'bandung-choco', name: 'Cello Chocolate', shelf: 0, transit: 400, field: 0, sold: 0, perMonth: 0, daysLeft: null, days: null, drops: 0, unexplained: 0 },
    ],
  },
  {
    name: 'SOLO',
    shelf: 96, transit: 0, field: 40, sold: 49, perMonth: 210,
    detail: [
      { id: 'solo-choco', name: 'Cello Chocolate', shelf: 28, transit: 0, field: 40, sold: 49, perMonth: 210, daysLeft: 4, days: 3, drops: 1, unexplained: 0 },
      { id: 'solo-mint', name: 'Cello Mint',      shelf: 68, transit: 0, field: 0, sold: 0, perMonth: 0, daysLeft: null, days: 40, drops: 1, unexplained: 0 },
    ],
  },
];

/* The company row is summed here rather than inside the table, for the same reason the real screen
   sums it outside: a total computed by the thing that displays it can disagree with the rows above
   it and nothing would ever say so. */
export const DEMO_TOTALS = ['shelf', 'transit', 'field', 'sold', 'perMonth'].reduce((acc, k) => {
  acc[k] = DEMO_WAREHOUSES.reduce((s, r) => s + (r[k] || 0), 0);
  return acc;
}, {});

/* Which warehouse the scene opens in its drawer beat. Named, not indexed, so reordering the list
   above cannot silently point the beat at a different warehouse. */
export const DEMO_OPEN = 'GUDANG PUSAT';
