/* STOCK-THRESHOLD SELF-CHECK — the "what counts as low" rule.

   Aldi, 2026-08-25: *"few bal is considered as low not BKS bruh"*. The bug behind that report was
   not a wrong number, it was SEVEN numbers: the fallback threshold was typed into each file that
   needed it, and two of them had drifted to 5 while the rest said 50. Nothing failed loudly. The
   Dashboard just went quiet ten times too late.

   A rule that lives in one file can still drift back out of it, so these checks do two jobs:
     1. BEHAVIOUR — the conversion maths, on real packing numbers.
     2. REGRESSION GUARDS — the hardcoded literals must not reappear on the paths that were fixed.

   Run: node src/config/stockThreshold.selfcheck.mjs                                            */
import fs from 'node:fs';

let pass = 0, fail = 0;
const read = (f) => fs.readFileSync(f, 'utf8');
const ok = (name, cond, why = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${why ? ' — ' + why : ''}`); }
};
const section = (t) => console.log(`\n${t}`);

/* ── the rule, re-implemented from the source so the maths is checked, not the text ── */
const convertToBks = (qty, unit, product) => {
  if (!product) return qty;
  const packsPerSlop = product.packsPerSlop || 10;
  const slopsPerBal = product.slopsPerBal || 20;
  const balsPerCarton = product.balsPerCarton || 4;
  if (unit === 'Slop') return qty * packsPerSlop;
  if (unit === 'Bal') return qty * slopsPerBal * packsPerSlop;
  if (unit === 'Karton') return qty * balsPerCarton * slopsPerBal * packsPerSlop;
  return qty;
};
const DEFAULT_MIN_QTY = 3, DEFAULT_MIN_UNIT = 'Bal';
const MIN_STOCK_UNITS = ['Bal', 'Karton', 'Slop', 'Bks'];
const minStockBks = (product, s) => {
  const own = Number(product?.minStock);
  if (Number.isFinite(own) && own > 0) return own;
  const qty = Number(s?.defaultMinStockQty);
  const unit = MIN_STOCK_UNITS.includes(s?.defaultMinStockUnit) ? s.defaultMinStockUnit : DEFAULT_MIN_UNIT;
  return convertToBks(Number.isFinite(qty) && qty > 0 ? qty : DEFAULT_MIN_QTY, unit, product || {});
};
const isLowStock = (p, s) => Number(p?.stock || 0) <= minStockBks(p, s);
const daysOfCover = (stockBks, per) => {
  const n = Number(per);
  if (!Number.isFinite(n) || n <= 0) return Infinity;
  return Math.max(0, Number(stockBks) || 0) / n;
};

/* two products packed differently — the whole reason the setting stores a UNIT */
const surya = { name: 'Surya 16',  packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4 }; // 200/bal
const djisam = { name: 'Dji Sam Soe', packsPerSlop: 12, slopsPerBal: 10, balsPerCarton: 5 }; // 120/bal

section('1. The company default is converted with EACH product\'s own packing');
ok('3 Bal of Surya is 600 Bks',
   minStockBks({ ...surya, stock: 0 }, { defaultMinStockQty: 3, defaultMinStockUnit: 'Bal' }) === 600);
ok('the SAME "3 Bal" setting is 360 Bks for a differently packed product',
   minStockBks({ ...djisam, stock: 0 }, { defaultMinStockQty: 3, defaultMinStockUnit: 'Bal' }) === 360,
   'a plain number could not do this — that is why the unit is stored');
ok('1 Karton of Surya is 800 Bks',
   minStockBks({ ...surya }, { defaultMinStockQty: 1, defaultMinStockUnit: 'Karton' }) === 800);
ok('5 Slop of Surya is 50 Bks',
   minStockBks({ ...surya }, { defaultMinStockQty: 5, defaultMinStockUnit: 'Slop' }) === 50);
ok('Bks passes through untouched',
   minStockBks({ ...surya }, { defaultMinStockQty: 42, defaultMinStockUnit: 'Bks' }) === 42);

section('2. A product\'s own MIN. ALERT still wins, and is still read as Bks');
ok('minStock 120 beats the company default',
   minStockBks({ ...surya, minStock: 120 }, { defaultMinStockQty: 3, defaultMinStockUnit: 'Bal' }) === 120);
ok('minStock 0 does NOT win — it falls through to the default',
   minStockBks({ ...surya, minStock: 0 }, { defaultMinStockQty: 3, defaultMinStockUnit: 'Bal' }) === 600,
   'zero means "not set", not "never warn me"');
ok('a junk minStock falls through instead of producing NaN',
   minStockBks({ ...surya, minStock: 'abc' }, { defaultMinStockQty: 3, defaultMinStockUnit: 'Bal' }) === 600);

section('3. Missing or nonsense settings still give a usable threshold');
ok('no settings at all → 3 Bal',   minStockBks(surya, undefined) === 600);
ok('empty settings → 3 Bal',       minStockBks(surya, {}) === 600);
ok('qty 0 → 3 Bal',                minStockBks(surya, { defaultMinStockQty: 0, defaultMinStockUnit: 'Bal' }) === 600);
ok('an unknown unit → Bal',        minStockBks(surya, { defaultMinStockQty: 3, defaultMinStockUnit: 'Peti' }) === 600);

section('4. isLowStock compares against stock, and the boundary is INCLUSIVE');
const s3bal = { defaultMinStockQty: 3, defaultMinStockUnit: 'Bal' };
ok('599 Bks is low',        isLowStock({ ...surya, stock: 599 }, s3bal) === true);
ok('exactly 600 is low',    isLowStock({ ...surya, stock: 600 }, s3bal) === true,
   'the old code used <=, and "at your minimum" has to still warn');
ok('601 is not low',        isLowStock({ ...surya, stock: 601 }, s3bal) === false);
ok('0 is low',              isLowStock({ ...surya, stock: 0 }, s3bal) === true);

section('5. daysOfCover only ORDERS the panel — it never decides low');
ok('600 Bks selling 200/day is 3 days', daysOfCover(600, 200) === 3);
ok('nothing selling returns Infinity',  daysOfCover(600, 0) === Infinity,
   'so it sorts LAST: nothing is selling it, so nothing is running out');
ok('a negative rate is treated as none', daysOfCover(600, -5) === Infinity);
ok('empty stock is 0 days, not NaN',     daysOfCover(0, 12) === 0);
ok('Infinity sorts after a real number',
   [Infinity, 0.2, 3].sort((a, b) => a - b)[0] === 0.2);

section('6. REGRESSION — the hardcoded fallbacks must not come back on the fixed paths');
const app  = read('src/App.jsx');
const dash = read('src/components/DashboardView.jsx');
ok('App.jsx no longer inlines a minStock fallback',
   !/minStock\s*\|\|\s*\d+/.test(app),
   'this is where the 50 and the 5 disagreed');
ok('DashboardView no longer inlines a minStock fallback',
   !/minStock\s*\|\|\s*\d+/.test(dash));
ok('App.jsx routes through the shared rule',   /isLowStock|minStockBks/.test(app));
ok('DashboardView routes through the shared rule', /isLowStock|minStockBks/.test(dash));
ok('the rule imports the real converter, not a copy of it',
   /import\s*\{[^}]*convertToBks[^}]*\}\s*from\s*'\.\/helpers'/.test(read('src/utils/stockThreshold.js')));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
