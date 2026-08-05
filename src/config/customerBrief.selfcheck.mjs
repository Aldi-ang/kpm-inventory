/* Self-check for the customer brief and the reorder button.
   Run: node src/config/customerBrief.selfcheck.mjs

   This is what a salesman reads before he walks in, and what the one-tap reorder loads into
   his manifest. Both are quiet failures: a wrong "usual basket" makes him negotiate badly,
   and a reorder that promises stock he does not have is found out in front of the customer. */
import assert from 'node:assert';
import { customerBrief, reorderFromLast, briefSeconds } from '../utils/customerBrief.js';

const at = (d, h) => Math.floor(new Date(2026, 7, d, h, 0, 0, 0).getTime() / 1000);
const tx = (sec, name, total, items = []) =>
  ({ timestamp: { seconds: sec }, customerName: name, total, items });

/* ---------- the brief ---------- */

/* 1. only this customer's history, newest first */
const rows = [
  tx(at(1, 9),  'Warung Bu Sari', 300000),
  tx(at(4, 10), 'Toko Melati',    999999),
  tx(at(3, 15), 'Warung Bu Sari', 500000, [{ productId: 'p1', name: 'Chocolate', qty: 2, unit: 'Karton' }]),
];
const b = customerBrief(rows, 'Warung Bu Sari');
assert.equal(b.orders, 2);
assert.equal(b.lastTotal, 500000, 'the newest order is the last one by TIME, not by position');
assert.equal(b.lastItems[0].name, 'Chocolate');

/* 2. names are typed by hand — case and stray spaces must not split one shop in two */
const messy = [tx(at(1, 9), '  warung BU sari ', 100000), tx(at(2, 9), 'Warung Bu Sari', 100000)];
assert.equal(customerBrief(messy, 'WARUNG BU SARI').orders, 2);

/* 3. a visit is a DAY, not a transaction. A sale and a retur on one afternoon is one visit,
      and counting two would inflate how often he goes there. */
const sameDay = [
  tx(at(5, 9),  'Bu Sari', 200000),
  tx(at(5, 16), 'Bu Sari', 150000),
  tx(at(6, 11), 'Bu Sari', 100000),
];
const sd = customerBrief(sameDay, 'Bu Sari');
assert.equal(sd.orders, 3);
assert.equal(sd.visits, 2, 'two sales in one day is ONE visit');

/* 4. a retur is negative and must not drag the usual basket down */
const withRetur = [
  tx(at(5, 9),  'Bu Sari', 400000),
  tx(at(5, 16), 'Bu Sari', -100000),
];
assert.equal(customerBrief(withRetur, 'Bu Sari').avgBasket, 400000,
  'the usual basket is money coming IN, not the net of a refund');

/* 5. nothing to report is null, never a fake zero */
assert.equal(customerBrief(rows, 'Never Heard Of Them'), null);
assert.equal(customerBrief([], 'Bu Sari'), null);
assert.equal(customerBrief(rows, ''), null);
assert.equal(customerBrief(rows, null), null);

/* 6. an unresolved serverTimestamp is skipped, never counted as 1970 */
assert.equal(customerBrief([{ timestamp: null, customerName: 'Bu Sari', total: 5 }], 'Bu Sari'), null);
assert.equal(briefSeconds({ timestamp: { toMillis: () => 8000 } }), 8);
assert.equal(briefSeconds({ timestamp: new Date(8000) }), 8);

/* ---------- the reorder button ---------- */

const inventory = [
  { id: 'p1', name: 'Chocolate',  stock: 500, priceRetail: 12000 },
  { id: 'p2', name: 'Teh Manis',  stock: 3,   priceRetail: 9000  },
  { id: 'p3', name: 'Green',      stock: 0,   priceRetail: 9000  },
];

/* 7. the happy path carries qty and unit through */
const ok = reorderFromLast([{ productId: 'p1', qty: 12, unit: 'Slop' }], inventory);
assert.equal(ok.lines.length, 1);
assert.equal(ok.lines[0].qty, 12);
assert.equal(ok.lines[0].unit, 'Slop');
assert.equal(ok.lines[0].product.id, 'p1');

/* 8. THE ONES THAT MATTER: never load a basket he cannot hand over.
      A discontinued ware and an empty ware are dropped; an over-order is clamped to what is
      actually on the van — and both are reported, not silently swallowed. */
const guarded = reorderFromLast([
  { productId: 'p1', qty: 2,  unit: 'Bks' },
  { productId: 'p2', qty: 50, unit: 'Bks' },   // only 3 on board
  { productId: 'p3', qty: 1,  unit: 'Bks' },   // empty
  { productId: 'gone', name: 'Old Ware', qty: 1 },
], inventory);
assert.equal(guarded.lines.length, 2, 'empty and discontinued wares must not become lines');
assert.equal(guarded.lines[1].qty, 3, 'over-order clamps to stock on board');
assert.deepEqual(guarded.clamped, [{ name: 'Teh Manis', wanted: 50, qty: 3 }]);
assert.deepEqual(guarded.dropped.sort(), ['Green', 'Old Ware']);

/* 9. junk quantities become a sane line rather than zero or NaN */
assert.equal(reorderFromLast([{ productId: 'p1', qty: 0 }], inventory).lines[0].qty, 1);
assert.equal(reorderFromLast([{ productId: 'p1', qty: 'x' }], inventory).lines[0].qty, 1);
assert.equal(reorderFromLast([{ productId: 'p1', qty: -4 }], inventory).lines[0].qty, 1);
assert.deepEqual(reorderFromLast([], inventory).lines, []);
assert.deepEqual(reorderFromLast(undefined, inventory).lines, []);

console.log('customer-brief self-check: 9/9 pass');
