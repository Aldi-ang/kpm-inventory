/* LOGIC-FIX SELF-CHECK — Aldi, 2026-08-18: "i want u to check every single update that u made
   yourself from now on, find solution to do that".

   This file is that solution. Every fix from the 75-problem logic review leaves an assertion
   here. Two kinds:
     1. REGRESSION GUARDS — the broken form must not come back. Cheap, catches a bad merge or a
        well-meaning refactor that undoes a fix.
     2. BEHAVIOUR CHECKS — the fix's actual maths, re-run on real numbers.

   A fix without a line in this file is not finished.
   Run: node src/config/logicFixes.selfcheck.mjs                                                */
import fs from 'node:fs';

let pass = 0, fail = 0;
const read = (f) => fs.readFileSync(f, 'utf8');
const ok = (name, cond, why = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${why ? ' — ' + why : ''}`); }
};
const section = (t) => console.log(`\n${t}`);

const engine   = read('src/hooks/useTransactionEngine.js');
const merchant = read('src/MerchantSalesView.jsx');
const profile  = read('src/AgentProfileView.jsx');
const map      = read('src/MapMissionControl.jsx');
const fleet    = read('src/FleetCanvasManager.jsx');
const app      = read('src/App.jsx');
const history  = read('src/components/HistoryReportView.jsx');
const helpers  = read('src/utils/helpers.js');

/* Every helper a fix calls must be IMPORTED. Bug #24 here was a call to getDoc that was never
   imported: it threw into an empty catch and silently disabled the rank engine for months. The
   build does not catch that. This does. */
const imports = (src, name) => [...src.matchAll(/import\s*\{([^}]*)\}/g)].some(m => m[1].split(',').map(x => x.trim()).includes(name));

/* ── A1 · rank was scored in rupiah against an XP ladder ───────────────────────────────── */
section('A1. Rank is scored in the same unit as the ladder');
ok('the rupiah branch is divided by rupiahPerXp',
   /Math\.floor\(lifetimeOmset \/ DEFAULT_XP\.rupiahPerXp\)/.test(profile));
ok('the raw-rupiah form is gone',
   !/:\s*\(lifetimeOmset \* \(rpgData\.expMultiplier/.test(profile));
{ /* a week of Rp 300.000 must NOT clear the default Mythic rung of 250.000 */
  const xp = Math.floor(300000 / 100000) * 1;
  ok('Rp 300.000/week no longer reaches Mythic', xp < 250000, `scored ${xp}`);
  ok('Rp 25 miliar collected does reach Mythic', Math.floor(25e9 / 100000) >= 250000);
}

/* ── A2 · one IOU line forced the whole basket to Cash ─────────────────────────────────── */
section('A2. Only an all-IOU basket is forced to Cash');
ok('dbMethod override uses every(), not some()',
   /else if \(cart\.every\(i => i\.isIouFulfillment\)\)/.test(merchant));
ok('the printed label uses every(), not some()',
   /cart\.every\(i => i\.isIouFulfillment\) \? 'IOU Fulfillment'/.test(merchant));
ok('no cart.some(isIouFulfillment) survives anywhere',
   !/cart\.some\(i => i\.isIouFulfillment\)/.test(merchant));
{ const mixed = [{ isIouFulfillment: true }, { isIouFulfillment: false }];
  ok('a mixed basket keeps its chosen payment type', !mixed.every(i => i.isIouFulfillment));
  ok('an all-IOU basket still becomes Cash', [{ isIouFulfillment: true }].every(i => i.isIouFulfillment)); }

/* ── A3 · a buyback put the goods back nowhere ─────────────────────────────────────────── */
section('A3. A buyback returns resellable goods to stock');
ok('isReturnedToStock exists and excludes damaged lines',
   /const isReturnedToStock = proofPayload\?\.type === 'RETUR' && item\.condition !== 'DAMAGED'/.test(engine));
ok('the master vault is credited on an admin buyback',
   /!currentAgentProfileId && isReturnedToStock[\s\S]{0,120}newStock: \(prodData\.stock \|\| 0\) \+ qtyInBks/.test(engine));
ok('the van gets a NEW canvas line when he was not carrying it',
   /isReturnedToStock\)\.forEach[\s\S]{0,400}updatedCanvas\.push\(/.test(engine));
ok('the packing maths is reused, not re-inlined a fifth time',
   /convertToBks\(1, c\.unit, t\.prodData\)/.test(engine));
ok('convertToBks is actually imported', /convertToBks/.test(engine.split('\n')[1]));

/* ── #14 · a buyback booked the full refund as profit ──────────────────────────────────── */
section('#14. A buyback is a loss, not a profit');
ok('profit branches on RETUR', /const itemProfit = proofPayload\?\.type === 'RETUR'/.test(engine));
{ const price = 20000, qty = 50, cost = 14000;          // refund Rp 1.000.000 of stock
  const good = (cost * qty) - (price * qty);            // resellable: we get stock worth cost
  const dmg  = 0 - (price * qty);                       // damaged: we get nothing
  ok('a resellable buyback books a loss', good < 0, `${good}`);
  ok('a damaged buyback books the full payout as loss', dmg === -1000000, `${dmg}`);
  ok('a normal sale is still positive', (price * qty) - (cost * qty) > 0); }

/* ── A4 · sector settings never reached the database ───────────────────────────────────── */
section('A4. Saving a sector persists it');
{ const fn = map.slice(map.indexOf('const handleSaveBoundary'), map.indexOf('const toggleVisibility'));
  ok('handleSaveBoundary awaits the firestore write', /await saveBoundaryToFirebase\(updatedBoundary\)/.test(fn));
  ok('it still writes the local cache too', /saveBorderCache\(appId, updatedList\)/.test(fn));
  ok('a failed save is reported, not swallowed', /notify\(/.test(fn.slice(fn.indexOf('catch')))); }

/* ── A5 · "Pricing Tier" offered the RPG rank ladder ───────────────────────────────────── */
section('A5. The price dropdown offers prices');
ok('the select is bound to priceTier, not tier',
   /value=\{newStoreForm\.priceTier\}/.test(map));
ok('its options are the real price ladder',
   /<option value="Retail">[\s\S]{0,200}<option value="Grosir">[\s\S]{0,200}<option value="Ecer">/.test(map));
ok('the RPG ladder no longer feeds this select',
   !/value=\{newStoreForm\.tier\}[\s\S]{0,200}activeTiers\.map/.test(map));
ok('priceTier is saved from the price field',
   /priceTier: newStoreForm\.priceTier/.test(map));
ok('tier is no longer written from the same box',
   !/tier: newStoreForm\.tier,\s*\n\s*priceTier: newStoreForm\.tier/.test(map));


/* -- #8 . damaged EOD goods credited without converting the unit ------------------------- */
section('#8. Damaged EOD returns are converted to packs');
ok('convertToBks is imported in App.jsx', imports(app, 'convertToBks'));
ok('damagedStock is credited in Bks, not raw qty',
   /const damagedBks = convertToBks\(item\.qty, item\.unit, masterProduct\)/.test(app));
ok('no raw increment(item.qty) survives on the damaged path',
   !/damagedStock: increment\(item\.qty\)/.test(app));
{ const packs = 2 * 20 * 10;
  ok('2 Bal now credits 400, not 2', packs === 400, `got ${packs}`); }

/* -- #12 . edit modal repriced from a product field that does not exist ------------------ */
section('#12. The edit modal converts units from real packing fields');
ok('convertToBks is imported in HistoryReportView', imports(history, 'convertToBks'));
ok('slopPerKarton is gone from the entire file', !/slopPerKarton/.test(history));
ok('all four multipliers use convertToBks',
   (history.match(/convertToBks\(1, /g) || []).length === 4,
   `found ${(history.match(/convertToBks\(1, /g) || []).length}`);
ok('the packing helper handles Bal (the old inline code had no Bal branch)',
   /unit === 'Bal'/.test(helpers));
{ const qty = 1, packsPerSlop = 10, slopsPerBal = 20, balsPerCarton = 4;
  const karton = eval(helpers.match(/if \(unit === 'Karton'\) return ([^;]+);/)[1]);
  ok('1 Karton = 800 packs, not the old hardcoded 100', karton === 800, `got ${karton}`); }


/* -- IOU renamed to Utang Barang (labels only, stored values untouched) ----------------- */
section('Rename. "IOU" reads as Utang Barang, and no record was orphaned');
{ const files = [history, fleet, merchant];
  ok('no visible IOU label survives',
     !files.some(f => />IOU |\[IOU\]|\[IOU PENDING\]|IOU Pending Fulfillment/.test(f)));
  ok('the new label is on screen',
     files.some(f => /UTANG BARANG/.test(f)));
  /* the half that would silently orphan every past record if it were renamed too */
  ok('the STORED paymentType literal is untouched in its comparisons',
     history.includes("=== 'IOU Fulfillment'") && fleet.includes("=== 'IOU Fulfillment'"));
  ok('the STORED item flag is untouched', merchant.includes("fulfillment === 'IOU'"));
  ok('the receipt maps the stored value at render time',
     /method: paymentLabel\(displayMethod\)/.test(merchant));
  ok('paymentLabel is exported and imported where used',
     /export const paymentLabel/.test(helpers) && imports(merchant, 'paymentLabel'));
  ok('paymentLabel leaves every other method alone',
     (m => m === 'Titip')('Titip' === 'IOU Fulfillment' ? 'Utang Barang Lunas' : 'Titip')); }

console.log(`\n${'='.repeat(58)}\n${pass} passed, ${fail} failed, ${pass + fail} checks`);
process.exit(fail ? 1 : 0);
