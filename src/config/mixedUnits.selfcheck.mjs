/* Self-check for the mixed-unit calculator in MerchantSalesView.
   Run: node src/config/mixedUnits.selfcheck.mjs

   This is the arithmetic a salesman would otherwise do in his head while a customer
   waits, so it gets a test even though it is only a few lines. The conversion mirrors
   the multipliers already used for pricing at MerchantSalesView :47, :343 and :408. */
import assert from 'node:assert';

const bksPerUnit = (prod) => {
  const pps = prod?.packsPerSlop || 10;
  const spb = prod?.slopsPerBal || 20;
  const bpc = prod?.balsPerCarton || 4;
  return { Karton: bpc * spb * pps, Bal: spb * pps, Slop: pps, Bks: 1 };
};

const totalBks = (prod, mix) => {
  const per = bksPerUnit(prod);
  return Object.keys(per).reduce((a, u) => a + (Number(mix[u]) || 0) * per[u], 0);
};

/* 1. defaults: 10 packs a slop, 20 slops a bal, 4 bals a karton */
const d = {};
assert.deepEqual(bksPerUnit(d), { Karton: 800, Bal: 200, Slop: 10, Bks: 1 });

/* 2. Aldi's own example: "2 karton, 3 slop, 17 bungkus" */
assert.equal(totalBks(d, { Karton: 2, Slop: 3, Bks: 17 }), 1600 + 30 + 17);

/* 3. empty and blank boxes count as zero, never NaN - a NaN here would silently
      zero a real sale, which is the failure worth testing for */
assert.equal(totalBks(d, {}), 0);
assert.equal(totalBks(d, { Karton: '', Bal: '', Slop: '', Bks: '' }), 0);
assert.equal(totalBks(d, { Karton: 'x', Bks: 5 }), 5);

/* 4. a product with its own packing beats the defaults */
const custom = { packsPerSlop: 16, slopsPerBal: 10, balsPerCarton: 5 };
assert.deepEqual(bksPerUnit(custom), { Karton: 800, Bal: 160, Slop: 16, Bks: 1 });
assert.equal(totalBks(custom, { Bal: 1, Slop: 1, Bks: 1 }), 160 + 16 + 1);

/* 5. one unit at a time still works, so the old single-unit habit is unaffected */
assert.equal(totalBks(d, { Bks: 12 }), 12);
assert.equal(totalBks(d, { Karton: 1 }), 800);

console.log('mixed-unit self-check: 5/5 pass');
