/* The fixed world the Product Performance tutorial plays in.

   Same rule as the other demo worlds: a new company's own figures are empty, and a live-data tour
   of this panel would teach a blank screen. Every number below carries a beat.

   🔴 DO NOT "TIDY" THESE:

   - **Cello Chocolate is most of the period.** Its share bar is the one the beat about share
     points at, and the reason the bar means "how much of what moved", not "how much of a target".
   - **Cello Mint sold well but earned less per pack**, so its revenue column does not sit in the
     same order as its quantity column. That is the beat that stops the two being read as one
     number twice.
   - **Cello Kopi sold three packs.** A row that would be tempting to hide, kept because a product
     that has nearly stopped selling is exactly what this panel is for.
   - **`missing: 1` is deliberate.** The banner about an incomplete range is a real state, not an
     error, and it is the one thing on this panel that a reader must not learn by being surprised
     by it in production. */
export const DEMO_PERFORMANCE_ROWS = [
  { id: 'perf-choco', name: 'Cello Chocolate', qty: 12400, revenue: 186000000 },
  { id: 'perf-mint',  name: 'Cello Mint',      qty: 5100,  revenue: 51000000 },
  { id: 'perf-teh',   name: 'Cello Teh Manis', qty: 2050,  revenue: 30750000 },
  { id: 'perf-kopi',  name: 'Cello Kopi',      qty: 3,     revenue: 45000 },
];

/* One month of the three the range spans has never been written, which is what the banner is for. */
export const DEMO_PERFORMANCE_MISSING = 1;
export const DEMO_PERFORMANCE_MONTHS = 3;
