/* Self-check for the transaction-document size fix.
   Run: node src/config/txSize.selfcheck.mjs

   A sale that cannot be written is the worst failure this app has, and it failed silently
   in review because a cart of one small product fits comfortably under the limit. It only
   breaks once real per-face photos exist — which is exactly when it reaches a customer.
   So the check builds a realistic basket and asserts the document fits. */
import assert from 'node:assert';
import { stripCartItemForStorage } from '../utils/helpers.js';

const FIRESTORE_MAX_BYTES = 1048576;

/* ~180 KB of base64 per face is what a phone photo compresses to at 600px/q0.6 */
const face = 'data:image/jpeg;base64,' + 'A'.repeat(180 * 1024);
const product = {
  id: 'p1', name: 'Cello Chocolate', priceDistributor: 8000, priceRetail: 10350,
  packsPerSlop: 10, slopsPerBal: 10, balsPerCarton: 6,
  dimensions: { w: 74, h: 90, d: 22 },
  images: { front: face, back: face, left: face, right: face, top: face, bottom: face },
};
const line = {
  productId: 'p1', name: 'Cello Chocolate', qty: 711, unit: 'Bks', priceTier: 'Grosir',
  calculatedPrice: 10350, condition: 'GOOD', fulfillment: 'NOW',
  mix: { Karton: '1', Bal: '1', Slop: '1', Bks: '1' },
  product, prodData: product, qtyInBks: 711, isPhysicallyGiven: true,
};

const size = (o) => Buffer.byteLength(JSON.stringify(o), 'utf8');

/* 1. the bug: three lines with the product embedded blow the limit */
const naive = [line, line, line];
assert.ok(size(naive) > FIRESTORE_MAX_BYTES,
  'the unstripped basket should exceed the limit - otherwise this test proves nothing');

/* 2. the fix: the same basket fits, with room to spare */
const stripped = naive.map(stripCartItemForStorage);
assert.ok(size(stripped) < FIRESTORE_MAX_BYTES,
  `stripped basket still too big: ${size(stripped)} bytes`);
assert.ok(size(stripped) < 4096, 'a three-line basket should be a couple of KB, not more');

/* 3. every scratch/embedded field is gone... */
for (const k of ['product', 'prodData', 'qtyInBks', 'isPhysicallyGiven']) {
  assert.ok(!(k in stripped[0]), `${k} should not reach the stored document`);
}

/* 4. ...and everything the receipt and the ledger actually read survives. Dropping one of
      these would turn a crash into silent data loss, which is worse. */
for (const k of ['productId', 'name', 'qty', 'unit', 'priceTier', 'calculatedPrice',
                 'condition', 'fulfillment', 'mix']) {
  assert.ok(k in stripped[0], `${k} must survive - the receipt and the ledger read it`);
}
assert.equal(stripped[0].qty, 711);
assert.deepEqual(stripped[0].mix, { Karton: '1', Bal: '1', Slop: '1', Bks: '1' });

/* 5. it must not mutate the live cart - the basket stays usable if the write fails */
assert.ok(line.product, 'stripping must copy, never mutate the cart item');

/* 6. a 20-line basket still fits, so a big wholesale order cannot resurrect this */
const big = Array.from({ length: 20 }, () => line).map(stripCartItemForStorage);
assert.ok(size(big) < FIRESTORE_MAX_BYTES, `20-line basket too big: ${size(big)} bytes`);

console.log(`tx-size self-check: 6/6 pass (3 lines: ${size(naive)} -> ${size(stripped)} bytes)`);
