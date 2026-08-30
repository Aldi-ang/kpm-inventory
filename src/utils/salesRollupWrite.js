/* WRITING THE SALES ROLLUP — the Firestore half, kept away from the arithmetic.

   `salesRollup.js` holds the maths and imports nothing from Firebase, which is what lets the
   self-checks run it in plain node against real numbers. This file is the thin layer that turns
   one delta into one batched write, and it is the only place in the app that touches
   `sales_stats`.

   🔴 THE WRITE GOES IN THE SAME BATCH AS THE SALE. Not after it, not in a `.then`. A counter
   updated separately from the thing it counts is a counter that drifts the first time a phone
   loses signal between the two calls, and offline is the normal case for these salesmen. One
   batch: the sale and its tally either both land or neither does.

   🔴 NESTED OBJECT LITERALS, NOT DOTTED FIELD PATHS. `{ 'byProduct.abc.qty': increment(1) }` reads
   `abc` as a path segment, so a product id containing a dot would write to the wrong place and
   never say so. A nested literal under `merge: true` treats every key as a key. It also creates
   the month document on first write, which is why there is no "does this month exist yet" read.

   ⚠️ THE SIGN IS THE CALLER'S JOB, and every path that removes or changes a sale must pass -1.
   Those paths are: the history screen's edit and delete, the folder delete, and a consignment
   return. An edit is a -1 of the old document plus a +1 of the new one. */
import { doc, increment } from 'firebase/firestore';
import { salesDelta } from './salesRollup.js';

export const statsPath = (appId, userId, month) =>
    `artifacts/${appId}/users/${userId}/sales_stats/${month}`;

/* One delta as the document to merge. Null when the transaction is not a countable sale — no
   date, empty basket, not a SALE. Shared by both writers below so a queued sale and a live one
   cannot be tallied two different ways. */
const statsWrite = (db, appId, userId, tx, productsById, sign) => {
    const delta = salesDelta(tx, productsById, sign);
    if (!delta) return null;

    const byProduct = {};
    const byDay = { [delta.day]: {} };
    for (const [id, v] of Object.entries(delta.byProduct)) {
        byProduct[id] = { qty: increment(v.qty), revenue: increment(v.revenue) };
        byDay[delta.day][id] = { qty: increment(v.qty), revenue: increment(v.revenue) };
    }
    return {
        ref: doc(db, statsPath(appId, userId, delta.month)),
        data: { month: delta.month, byProduct, byDay },
    };
};

/* Adds the tally for one transaction to an open batch. Returns true when something was written,
   false when the transaction is not a countable sale — the caller does not need to know which
   cases those are, only that nothing happened.
   `batch` may be a writeBatch or a transaction; both expose `.set`. */
export const tallySale = (batch, db, appId, userId, tx, productsById, sign = 1) => {
    const w = statsWrite(db, appId, userId, tx, productsById, sign);
    if (!w) return false;
    batch.set(w.ref, w.data, { merge: true });
    return true;
};

/* The same write as an operation descriptor, for the offline drain — which collects operations
   and hands them to `commitInChunks` rather than holding a batch open. `options.merge` matters:
   without it the month document would be REPLACED by whatever one sale happened to touch.

   ⚠️ A QUEUED SALE IS FILED ON THE DAY IT WAS MADE, not the day the signal came back. The drain
   stamps `timestamp` with `serverTimestamp()` so the receipt sorts correctly, but `date` still
   carries the original day and `dayOf` reads `date` first. A week of offline sales landing all at
   once must not all pile onto the Monday somebody finally got signal. */
export const tallySaleOp = (db, appId, userId, tx, productsById, sign = 1) => {
    const w = statsWrite(db, appId, userId, tx, productsById, sign);
    return w ? { type: 'set', ref: w.ref, data: w.data, options: { merge: true } } : null;
};
