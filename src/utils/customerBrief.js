/* What the salesman should know before he opens the shop door.

   Deliberately built from the transactions ALREADY loaded in memory — the app's live 7-day
   window — rather than a new per-customer query. Most stores on a route are visited weekly,
   so the data is already paid for, and the common case costs zero extra reads. A store
   visited less often than that simply reports "no recent order", which is honest and is
   still useful: it tells him this is a stale account.

   Adding a per-customer fetch for older history is a later, separate change, and it needs an
   index decision. See project-kpm-cost-fix-workflow. */

export const briefSeconds = (tx) => {
    const t = tx?.timestamp;
    if (!t) return null;
    if (typeof t.seconds === 'number') return t.seconds;
    if (typeof t.toMillis === 'function') return Math.floor(t.toMillis() / 1000);
    if (t instanceof Date) return Math.floor(t.getTime() / 1000);
    return null;
};

/* Names are typed by hand at the counter, so "Warung Bu Sari" and "warung bu sari " are the
   same shop. Matching on the raw string would split one customer's history in two and
   under-report what they usually buy.

   🚀 This file used to carry its OWN copy of that rule — trim and lowercase, and nothing else.
   It stopped one step short: the sale engine used to weld the price tier onto a store name, so
   a shop's older rows say "Warung Bu Sari (Retail)". Asked for the clean name, the private rule
   found none of them and the panel reported "no recent order" — the salesman walking into a shop
   he sold to last week with nothing in front of him. The shared storeKey strips that suffix. A
   private copy of a shared rule is how a fixed bug comes back one file over. */
/* `.js` on purpose — this module is executed directly by node in customerBrief.selfcheck.mjs,
   and node's ESM resolver does not add the extension the way Vite does. */
import { storeKey as key } from './helpers.js';

export function customerBrief(transactions = [], customerName = '') {
    const want = key(customerName);
    if (!want) return null;

    const mine = [];
    for (const tx of transactions) {
        if (key(tx?.customerName) !== want) continue;
        const s = briefSeconds(tx);
        if (s == null) continue;                 // unresolved serverTimestamp — skip, not zero
        mine.push({ tx, s });
    }
    if (!mine.length) return null;

    mine.sort((a, b) => b.s - a.s);

    /* A "visit" is a day, not a transaction. Two sales to the same shop in one afternoon —
       a sale then a retur, say — is one visit, and counting it as two would quietly inflate
       how often he goes there. */
    const days = new Set(
        mine.map(m => new Date(m.s * 1000).toLocaleDateString('en-CA'))
    );

    /* Returns carry a negative total. Averaging them in would understate the basket, so the
       usual basket is built from money coming IN only. */
    const positives = mine.filter(m => (Number(m.tx.total) || 0) > 0);
    const spend = positives.reduce((a, m) => a + (Number(m.tx.total) || 0), 0);

    const last = mine[0].tx;

    return {
        lastAt: mine[0].s,
        last,
        lastItems: Array.isArray(last.items) ? last.items : [],
        lastTotal: Number(last.total) || 0,
        visits: days.size,
        orders: mine.length,
        avgBasket: positives.length ? Math.round(spend / positives.length) : 0,
        spend,
    };
}

/* Turn a past order back into cart lines.

   Two guards, both of which change what the salesman is allowed to promise:
     · a ware no longer in the vehicle is dropped, not silently zeroed
     · a quantity above what is on board is clamped to what is on board
   Without them the button would load a basket he cannot actually hand over, and he would
   only find out at the commit. What was dropped or clamped is returned so the UI can say so
   rather than quietly handing him a different order than the one he asked for. */
export function reorderFromLast(lastItems = [], inventory = []) {
    const byId = new Map(inventory.map(p => [p.id, p]));
    const lines = [];
    const dropped = [];
    const clamped = [];

    for (const item of lastItems) {
        const product = byId.get(item?.productId);
        if (!product) { dropped.push(item?.name || 'unknown item'); continue; }

        const stock = Number(product.stock) || 0;
        if (stock <= 0) { dropped.push(product.name); continue; }

        /* Everything is re-priced from TODAY's product record, never from the old line.
           Replaying a stored price would resurrect whatever it cost last month. */
        const wanted = Math.max(1, Math.floor(Number(item?.qty) || 1));
        const qty = Math.min(wanted, stock);
        if (qty < wanted) clamped.push({ name: product.name, wanted, qty });

        lines.push({ product, qty, unit: item?.unit || 'Bks' });
    }

    return { lines, dropped, clamped };
}
