/* Self-check for the mixed-unit calculator in MerchantSalesView.
   Run: node src/config/mixedUnits.selfcheck.mjs

   This is the arithmetic a salesman would otherwise do in his head while a customer
   waits, so it gets a test even though it is only a few lines. The conversion mirrors
   the multipliers already used for pricing at MerchantSalesView :47, :343 and :408. */
import assert from 'node:assert';
import { convertToBks, splitToUnits } from '../utils/helpers.js';

/* Mirrors MerchantSalesView :392 — the multipliers come from helpers.convertToBks so the
   per-product packing saved in the master vault is the single source of truth. */
const bksPerUnit = (prod) => ({
  Karton: convertToBks(1, 'Karton', prod || {}),
  Bal:    convertToBks(1, 'Bal',    prod || {}),
  Slop:   convertToBks(1, 'Slop',   prod || {}),
  Bks:    1,
});

/* Mirrors the packing guard in App.handleSaveProduct. */
const savePacking = (form) => {
  const packing = { packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4 };
  const out = {};
  for (const [field, fallback] of Object.entries(packing)) {
    const n = Number(form[field]);
    out[field] = (Number.isFinite(n) && n > 0) ? n : fallback;
  }
  return out;
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

/* 6. Aldi's real-world packing: a Bal of 100 Bks, a Karton of 5 Bal */
const real = { packsPerSlop: 10, slopsPerBal: 10, balsPerCarton: 5 };
assert.deepEqual(bksPerUnit(real), { Karton: 500, Bal: 100, Slop: 10, Bks: 1 });
assert.equal(totalBks(real, { Karton: 1, Bal: 1 }), 600);

/* 7. the master-vault guard: a blank, zero or junk packing box must NEVER store 0.
      A 0 multiplier would charge nothing and deduct nothing for every Bal or Karton
      sale of that product - a free-sale bug, so this is the assertion that matters. */
assert.deepEqual(savePacking({}), { packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4 });
assert.deepEqual(savePacking({ packsPerSlop: '', slopsPerBal: '0', balsPerCarton: 'abc' }),
                 { packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4 });
assert.deepEqual(savePacking({ packsPerSlop: '-5' }).packsPerSlop, 10);

/* 8. a real entry is kept verbatim, not silently defaulted */
assert.deepEqual(savePacking({ packsPerSlop: '16', slopsPerBal: '10', balsPerCarton: '5' }),
                 { packsPerSlop: 16, slopsPerBal: 10, balsPerCarton: 5 });

/* 9. splitToUnits is the inverse of the calculator: a flat Bks figure back into the units a
      salesman counts in. It must round-trip, or the rail would describe stock he does not
      have. Aldi's Cello Chocolate packing: 10 bks/slop, 10 slop/bal, 6 bal/karton. */
const cello = { packsPerSlop: 10, slopsPerBal: 10, balsPerCarton: 6 };
assert.deepEqual(splitToUnits(0, cello),    { Karton: 0, Bal: 0, Slop: 0, Bks: 0 });
assert.deepEqual(splitToUnits(711, cello),  { Karton: 1, Bal: 1, Slop: 1, Bks: 1 });
assert.deepEqual(splitToUnits(600, cello),  { Karton: 1, Bal: 0, Slop: 0, Bks: 0 });
assert.deepEqual(splitToUnits(599, cello),  { Karton: 0, Bal: 5, Slop: 9, Bks: 9 });
assert.deepEqual(splitToUnits(9, cello),    { Karton: 0, Bal: 0, Slop: 0, Bks: 9 });

/* 10. every split must add back up to exactly what went in — this is the property that
       matters, because a rail that under-reports stock loses a sale and one that
       over-reports promises goods that are not on the van. */
const back = (m, prod) => m.Karton * convertToBks(1, 'Karton', prod)
                        + m.Bal    * convertToBks(1, 'Bal', prod)
                        + m.Slop   * convertToBks(1, 'Slop', prod)
                        + m.Bks;
for (const prod of [cello, d, custom, { packsPerSlop: 16, slopsPerBal: 5, balsPerCarton: 3 }]) {
  for (const n of [0, 1, 7, 99, 200, 799, 800, 1011, 9892, 123456]) {
    assert.equal(back(splitToUnits(n, prod), prod), n, `round-trip failed at ${n}`);
  }
}

/* 11. Nonsense packing must still produce a finite, round-tripping answer. Zeros do NOT
       divide by zero here: convertToBks treats 0 as falsy and falls back to 10/20/4, which
       is the same guard the master-vault form applies on save. The property that matters is
       that nothing comes back Infinity or NaN and the total is preserved. */
for (const junk of [ { packsPerSlop: 0, slopsPerBal: 0, balsPerCarton: 0 },
                     { packsPerSlop: 0 }, {}, null, undefined ]) {
  const m = splitToUnits(50, junk);
  for (const u of ['Karton', 'Bal', 'Slop', 'Bks']) {
    assert.ok(Number.isFinite(m[u]), `${u} came back non-finite for junk packing`);
    assert.ok(m[u] >= 0, `${u} came back negative`);
  }
  assert.equal(back(m, junk || {}), 50, 'junk packing must still preserve the total');
}
/* negatives and rubbish clamp to zero rather than producing negative cartons */
assert.deepEqual(splitToUnits(-5, cello), { Karton: 0, Bal: 0, Slop: 0, Bks: 0 });
assert.deepEqual(splitToUnits('abc', cello), { Karton: 0, Bal: 0, Slop: 0, Bks: 0 });

console.log('mixed-unit self-check: 11/11 pass');
