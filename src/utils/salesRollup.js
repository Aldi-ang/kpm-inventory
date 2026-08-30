/* HOW MUCH OF EACH PRODUCT SOLD, PER DAY, WITHOUT PAYING TO ASK.
   ────────────────────────────────────────────────────────────────────────────
   Aldi, 2026-08-30: *"the total performance per day per week/ month or year for products right,
   like how many product is actually sold per timeframe specific for each of the product? well
   basically the performance for each product in overall through all region"*.

   And then, when the cost of answering it live was explained: *"we should use older data to avoid
   high cost right, we just need to see the data thats auto update for every sales so we can see
   the latest sales and have all the number isnt? btw right just do whatever to save cost, u know
   the method better"*. He described a running total, and a running total is the right answer.

   THE SHAPE. One document per calendar month, `sales_stats/{YYYY-MM}`:

     byProduct: { <productId>: { qty, revenue } }          the month
     byDay:     { <YYYY-MM-DD>: { <productId>: { qty, revenue } } }

   A day costs one document read. A week costs one or two. A month, one. A year, twelve. The live
   alternative reads every transaction in the range, which for a year is thousands.

   🔴 THE ROLLUP IS A CACHE. IT IS NEVER THE TRUTH.
   `transactions` stays the only record of what happened. Every figure here can be rebuilt from it,
   which is what makes the whole design safe to ship: a bug costs a rebuild, never data. Nothing in
   the app may ever read a number from here and write it back into stock, money or a nota.

   🔴 AND THE COUNTER IS THE EASY HALF. Three paths already change a sale after the fact — an edit
   and a delete on the history screen, and a consignment return. Every one of them must apply the
   NEGATIVE of what the sale applied, or the totals drift with nothing on screen to say so. That is
   why `salesDelta` takes a sign instead of there being an `addSale` and a separate `removeSale`:
   one function, one arithmetic, and an edit is a −1 of the old plus a +1 of the new.

   ⚠️ QUANTITIES ARE STORED IN BKS. A transaction line records the unit it was sold in — Slop, Bal,
   Karton — and mixing those before the end is how a figure comes out twenty times too big. The
   conversion runs through `convertToBks`, the same function the dashboard and Sebaran Stok use.

   ⚠️ THE DAY A SALE BELONGS TO COMES FROM ITS OWN `date` FIELD, not from the clock at write time
   and not from the timestamp. That field is written by `getLocalDayKey`, which is the one day
   boundary this app has after the 7am-rollover fix. Deriving a second one here would put the same
   sale in two different days depending on which screen asked.                                   */
import { convertToBks } from './helpers.js';
import { txSeconds } from './dayStats.js';

/* Only these count as revenue. A SAMPLING record is stock leaving the shelf, not a sale, and a
   RETURN is handled by its own negative delta rather than by being counted here. */
export const SALE_TYPES = ['SALE'];

export const isSale = (tx) => !!tx && SALE_TYPES.includes(tx.type || 'SALE');

/* 'YYYY-MM-DD' → 'YYYY-MM'. Deliberately string arithmetic: parsing the day back into a Date to
   read its month would re-introduce a timezone, which is the thing `date` exists to have settled
   once already. */
export const monthOf = (dayKey) =>
    typeof dayKey === 'string' && dayKey.length >= 7 ? dayKey.slice(0, 7) : null;

/* The day a transaction belongs to. `date` first because it is the field the rest of the app files
   by; the timestamp is a fallback for a record written before `date` existed, and null when
   neither can answer — a sale nobody can date must be left out rather than guessed into today. */
export const dayOf = (tx) => {
    if (typeof tx?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tx.date)) return tx.date;
    const secs = txSeconds(tx);
    if (secs == null) return null;
    const d = new Date(secs * 1000);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/* What one transaction adds to (sign 1) or takes away from (sign -1) a month's totals.
   Returns null when the transaction cannot be counted at all, so a caller can skip it rather than
   write a document full of zeroes: not a sale, no date, or no lines. */
export const salesDelta = (tx, productsById = {}, sign = 1) => {
    if (!isSale(tx)) return null;
    const day = dayOf(tx);
    if (!day) return null;
    const month = monthOf(day);
    const lines = Array.isArray(tx.items) ? tx.items : [];
    if (lines.length === 0) return null;

    const byProduct = {};
    for (const line of lines) {
        const id = line?.productId;
        if (!id) continue;
        const bks = convertToBks(Number(line.qty) || 0, line.unit, productsById[id]);
        /* `calculatedPrice` is per unit sold, not per pack, so the money is qty x price and must
           NOT be multiplied by the pack conversion. Getting this backwards inflates revenue by the
           pack size, which is the same class of error as mixing units on the quantity. */
        const money = (Number(line.qty) || 0) * (Number(line.calculatedPrice) || 0);
        if (!Number.isFinite(bks) || !Number.isFinite(money)) continue;
        if (bks === 0 && money === 0) continue;
        const row = byProduct[id] || (byProduct[id] = { qty: 0, revenue: 0 });
        row.qty += bks * sign;
        row.revenue += money * sign;
    }
    if (Object.keys(byProduct).length === 0) return null;
    return { month, day, byProduct };
};

/* ── READING IT BACK ──────────────────────────────────────────────────────────────────────────
   Which month documents a range needs. Returned oldest first so a partial failure reads as a
   truncated history rather than a shuffled one. A year is twelve ids; nothing here fetches. */
export const monthsInRange = (fromDay, toDay) => {
    const a = monthOf(fromDay), b = monthOf(toDay);
    if (!a || !b || a > b) return [];
    const out = [];
    let [y, m] = a.split('-').map(Number);
    const [ey, em] = b.split('-').map(Number);
    while (y < ey || (y === ey && m <= em)) {
        out.push(`${y}-${String(m).padStart(2, '0')}`);
        m += 1;
        if (m > 12) { m = 1; y += 1; }
    }
    return out;
};

/* Sum the month documents down to one row per product for the days between `fromDay` and `toDay`
   inclusive. Whole months short-circuit onto `byProduct`, which is the reason the month total is
   stored at all rather than being summed from its days every time.
   ⚠️ A MISSING MONTH IS NOT A ZERO MONTH. It is a month the rollup has never been written for, and
   the caller is told how many are missing so the screen can say "belum lengkap" instead of
   printing a total that is quietly short. */
export const sumRange = (docs = [], fromDay, toDay) => {
    const wanted = monthsInRange(fromDay, toDay);
    const byId = new Map(docs.filter(Boolean).map(d => [d.id || d.month, d]));
    const rows = new Map();
    let missing = 0;

    for (const key of wanted) {
        const doc = byId.get(key);
        if (!doc) { missing += 1; continue; }
        const wholeMonth = key > monthOf(fromDay) && key < monthOf(toDay);
        const add = (id, qty, revenue) => {
            const r = rows.get(id) || { id, qty: 0, revenue: 0 };
            r.qty += Number(qty) || 0;
            r.revenue += Number(revenue) || 0;
            rows.set(id, r);
        };
        if (wholeMonth) {
            for (const [id, v] of Object.entries(doc.byProduct || {})) add(id, v.qty, v.revenue);
            continue;
        }
        for (const [day, products] of Object.entries(doc.byDay || {})) {
            if (day < fromDay || day > toDay) continue;
            for (const [id, v] of Object.entries(products || {})) add(id, v.qty, v.revenue);
        }
    }
    return { rows: [...rows.values()].sort((a, b) => b.qty - a.qty), missing, months: wanted.length };
};

/* The day-by-day line for one product inside a range, oldest first. Feeds a sparkline and answers
   "which week was the good one" without a second query. */
export const dailySeries = (docs = [], productId, fromDay, toDay) => {
    const out = [];
    for (const doc of docs.filter(Boolean)) {
        for (const [day, products] of Object.entries(doc.byDay || {})) {
            if (day < fromDay || day > toDay) continue;
            const v = (products || {})[productId];
            if (!v) continue;
            out.push({ day, qty: Number(v.qty) || 0, revenue: Number(v.revenue) || 0 });
        }
    }
    return out.sort((a, b) => a.day.localeCompare(b.day));
};

/* ── THE RANGES HE ASKED FOR ───────────────────────────────────────────────────────────────────
   *"per day per week/ month or year"*. Week runs Monday to Sunday, which is how his branches
   already talk about a week; the ISO convention and the Indonesian one agree here.
   `today` is passed in rather than read, so a check can pin a range without owning the clock. */
export const RANGES = ['day', 'week', 'month', 'year'];

export const rangeDays = (range, today) => {
    const p = (n) => String(n).padStart(2, '0');
    const key = (d) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (range === 'day') return { from: key(base), to: key(base) };
    if (range === 'week') {
        const dow = (base.getDay() + 6) % 7;          // Monday = 0
        const start = new Date(base); start.setDate(base.getDate() - dow);
        const end = new Date(start); end.setDate(start.getDate() + 6);
        return { from: key(start), to: key(end) };
    }
    if (range === 'year') {
        return { from: `${base.getFullYear()}-01-01`, to: `${base.getFullYear()}-12-31` };
    }
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return { from: key(first), to: key(last) };
};

/* ── REBUILDING FROM THE TRUTH ─────────────────────────────────────────────────────────────────
   Every month document a list of transactions implies, built from scratch. This is the backfill
   for every month before the counter shipped AND the repair if the counter ever drifts, and its
   existence is what makes the cache safe: nothing here can be lost in a way a rebuild cannot fix.
   Returned as plain objects so the caller decides how to write them. */
export const rebuildMonths = (transactions = [], productsById = {}) => {
    const months = new Map();
    for (const tx of transactions) {
        const delta = salesDelta(tx, productsById, 1);
        if (!delta) continue;
        const m = months.get(delta.month) || { month: delta.month, byProduct: {}, byDay: {} };
        const day = m.byDay[delta.day] || (m.byDay[delta.day] = {});
        for (const [id, v] of Object.entries(delta.byProduct)) {
            const mp = m.byProduct[id] || (m.byProduct[id] = { qty: 0, revenue: 0 });
            mp.qty += v.qty; mp.revenue += v.revenue;
            const dp = day[id] || (day[id] = { qty: 0, revenue: 0 });
            dp.qty += v.qty; dp.revenue += v.revenue;
        }
        months.set(delta.month, m);
    }
    return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
};
