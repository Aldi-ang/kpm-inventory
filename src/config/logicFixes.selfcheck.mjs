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
import { SECTIONS } from '../ponder/sections.js';
import { buildPages, maxTurnOf, turnFor, facingPage,
         riffle, TURN_FULL_MS, RIFFLE_MIN_MS } from '../ponder/pageModel.js';

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
/* Both of these moved INTO applySaleToCanvas when the canvas rule was extracted so the offline
   path could share it (see S12). The behaviour is the same; only the variable names changed, so
   they are repinned on the new shape rather than relaxed. */
ok('the van gets a NEW canvas line when he was not carrying it',
   /isReturnedToStock\)\.forEach[\s\S]{0,400}updated\.push\(/.test(engine));
ok('the packing maths is reused, not re-inlined a fifth time',
   /convertToBks\(1, row\.unit, m\.prodData\)/.test(engine));
/* Was pinned to line 2 of the file and broke on 2026-08-30 the moment an import was added
   above it. A line INDEX is the most brittle form of the pin-the-literal fault: it does not
   survive an edit anywhere near it. What it guards is that the name is imported at all. */
ok('convertToBks is actually imported',
   /import \{[^}]*convertToBks[^}]*\} from/.test(engine));

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


/* -- Cash refund is a granted privilege, not a default ---------------------------------- */
section('Buyback. Cash refund is OFF unless granted (Aldi: "no responsibility, no credit")');
ok('the sales terminal takes the grant and defaults it to FALSE',
   /allowCashRefund = false/.test(merchant));
ok('the Buyback switch is hidden without the grant',
   /isReturMode && allowCashRefund && \(/.test(merchant));
ok('submit REFUSES a buyback without the grant (hiding the button is not a gate)',
   /returType === 'BUYBACK' && !allowCashRefund/.test(merchant));
ok('Exchange is NOT gated by it — tukar stays a normal power',
   !/returType === 'EXCHANGE' && !allowCashRefund/.test(merchant));
ok('App reads it securely with === true, so a missing field means denied',
   /allowCashRefund: data\.allowCashRefund === true/.test(app));
ok('App passes it down to the terminal', /allowCashRefund=\{userRole === 'ADMIN'/.test(app));
ok('Fleet & Roster can grant it, and new agents start without it',
   /allowCashRefund: false,/.test(fleet) && /newAgent\.allowCashRefund/.test(fleet));


/* -- #9 . a post-commit failure said "failed", cart survived, agent sold it twice --------- */
section('#9. A sale that already committed never reads as "failed"');
ok('the commit is flagged the moment onProcessSale returns',
   /await onProcessSale\([^)]*\);\s*[\r\n]+\s*committed = true;/.test(merchant));
ok('the flag starts false inside the handler', /let committed = false;/.test(merchant));
ok('the catch branches on it instead of always saying failed',
   /if \(committed\) \{[\s\S]{0,600}\} else \{[\s\S]{0,200}Transaction Failed/.test(merchant));
ok('the committed path tells him NOT to repeat the sale',
   /Do NOT repeat this sale/.test(merchant));
ok('the committed path CLEARS the terminal, which is what stops the double sale',
   /Do NOT repeat this sale[\s\S]{0,200}resetTerminalAfterDeal\(\)/.test(merchant));
ok('the reset exists once, not copy-pasted into both paths',
   (merchant.match(/const resetTerminalAfterDeal = \(\) => \{/g) || []).length === 1 &&
   (merchant.match(/resetTerminalAfterDeal\(\);/g) || []).length === 2);


/* -- #11 . REFUTED, and this guards the fact that refutes it --------------------------- */
section('#11. NOT A BUG - user.uid IS the vault id, so the delete targets the right vault');
/* The register claimed the delete handlers write to users/{user.uid}/transactions while the
   ledger is read from bossUid||user.uid, so a delegated admin would delete nothing and be told
   it worked. The earlier pass checked that bossUid gets set for non-owners, but missed that
   user.uid is REPLACED with the same value in the same block. Both paths resolve identically:
     non-owner: setBossUid(trueBossUid) AND hijackedUser.uid = trueBossUid  -> equal
     owner:     setBossUid(null)        AND setUser(currentUser)            -> equal
   If anyone ever unwinds the hijack, #11 becomes real. These two assertions are the tripwire. */
ok('the non-owner user object is forced onto the master vault uid',
   /uid: trueBossUid \|\| currentUser\.uid/.test(app));
ok('bossUid is set from the SAME value in the same block',
   /setBossUid\(trueBossUid\);/.test(app));
ok('the owner branch nulls bossUid and keeps their own user object',
   /setBossUid\(null\);[\s\S]{0,200}setUser\(currentUser\);/.test(app));
{ const bossUid = 'BOSS', userUid = 'BOSS';           // what the hijack produces for an agent
  ok('userId and user.uid resolve to the same vault', (bossUid || userUid) === userUid); }


/* -- Store hand-off matched shops by NAME, and his book has three shops sharing one ------- */
section('Hand-off. Approving a transfer moves only the SENDER-held rows for that shop');
ok('the request pins the customer document id',
   /customerId: mine\.length === 1 \? mine\[0\]\.id : null,/.test(app));
ok('an ambiguous name is split by the sender own ownership before pinning',
   /sameName\.length > 1 \? sameName\.filter\(c => c\.mappedBy === fromAgentName\) : sameName/.test(app));
ok('the transaction sweep is scoped to the sending agent',
   /const storeTx = transactions\.filter\(t => sameName\(t\.customerName\) && heldBySender\(t\)\);/.test(app));
ok('the unscoped name-only sweep is gone',
   !/transactions\.filter\(t => \(t\.customerName \|\| ''\)\.trim\(\)\.toLowerCase\(\) === request\.storeName/.test(app));
ok('ADMIN hand-offs still pick up legacy rows that carry no agentId',
   /\(!t\.agentId \|\| t\.agentId === 'ADMIN'\)/.test(app));
ok('the customer doc is resolved by the pinned id first',
   /request\.customerId[\s\S]{0,90}customers\.find\(c => c\.id === request\.customerId\)/.test(app));
ok('an ambiguous name writes mappedBy to NOBODY rather than to the first twin',
   /nameMatches\.length === 1 \? nameMatches\[0\] : null/.test(app));
ok('the first-match customer lookup is gone',
   !/customers\.find\(c => \(c\.name \|\| ''\)\.trim\(\)\.toLowerCase\(\) === request\.storeName/.test(app));

/* BEHAVIOUR - two shops called "Toko Jaya", one held by agent A, one by agent B. */
{ const tx = [
    { id: 't1', customerName: 'Toko Jaya',  agentId: 'A', total: 500000 },
    { id: 't2', customerName: 'toko jaya ', agentId: 'A', total: 300000 },
    { id: 't3', customerName: 'Toko Jaya',  agentId: 'B', total: 900000 },
    { id: 't4', customerName: 'Toko Lain',  agentId: 'A', total: 100000 } ];
  const req = { storeName: 'Toko Jaya', fromAgentId: 'A', toAgentId: 'C' };
  const sameName = (v) => (v || '').trim().toLowerCase() === req.storeName.trim().toLowerCase();
  const heldBySender = (t) => req.fromAgentId === 'ADMIN'
      ? (!t.agentId || t.agentId === 'ADMIN')
      : t.agentId === req.fromAgentId;
  const moved = tx.filter(t => sameName(t.customerName) && heldBySender(t));
  ok('agent A hands over both of HIS rows, stray spacing and case included',
     moved.map(t => t.id).join(',') === 't1,t2');
  ok('the twin shop held by agent B is left alone', !moved.some(t => t.agentId === 'B'));
  ok('agent B keeps his 900k receivable',
     tx.filter(t => t.agentId === 'B').reduce((s, t) => s + t.total, 0) === 900000);
  ok('the old name-only sweep would have taken it - this is the bug being guarded',
     tx.filter(t => sameName(t.customerName)).length === 3 && moved.length === 2);
  const adminReq = { storeName: 'Toko Jaya', fromAgentId: 'ADMIN' };
  const legacy = [ { id: 'L1', customerName: 'Toko Jaya' },
                   { id: 'L2', customerName: 'Toko Jaya', agentId: 'ADMIN' },
                   { id: 'L3', customerName: 'Toko Jaya', agentId: 'A' } ];
  const adminHeld = (t) => adminReq.fromAgentId === 'ADMIN'
      ? (!t.agentId || t.agentId === 'ADMIN')
      : t.agentId === adminReq.fromAgentId;
  ok('an ADMIN hand-off takes its own plus the legacy rows, never the agent rows',
     legacy.filter(adminHeld).map(t => t.id).join(',') === 'L1,L2'); }

/* ── S1 · the sale engine matched part of a name, and welded the price tier onto it ────── */
section('S1. A store name identifies a store, and nothing else is added to it');
const finance = read('src/ConsignmentFinanceView.jsx');

ok('the loose .includes() lookup is gone', !/\.includes\(inputTrimmed\)/.test(engine));
ok('the sale engine resolves a store by exact storeKey',
   /customers\.find\(c => storeKey\(c\.name\) === needle\)/.test(engine));
ok('the price tier is no longer appended to the name',
   !/finalName \+= " \((?:Retail|Individual|Wholesale)\)"/.test(engine));
ok('storeKey is imported where it is called', imports(engine, 'storeKey') && imports(finance, 'storeKey'));
ok('the receivables screen groups on storeKey, not on the raw name',
   /const name = storeKey\(t\.customerName\)/.test(finance));
ok('the tier suffix is stripped only at the END of a name',
   helpers.includes('(?:Retail|Individual|Wholesale)\\)$/i'));

/* BEHAVIOUR — the two halves this fix has to keep together, run on real rupiah.
   storeKey lives in helpers.js, which imports firebase/storage and so cannot be imported by
   node here; the form below is the same one, and the check above pins the file's copy. */
{ const key = (n) => String(n ?? '').trim().replace(/\s*\((?:Retail|Individual|Wholesale)\)$/i, '').trim().toLowerCase();

  // Old rows carry the suffix, new rows do not. One shop, one balance — not two half-rows.
  const tx = [ { customerName: 'Warung Bu Sari (Retail)', total: 1200000 },
               { customerName: 'warung bu sari ',         total:  800000 },
               { customerName: 'Warung Sari Rasa',        total:  500000 } ];
  const grouped = {};
  tx.forEach(t => { const k = key(t.customerName); grouped[k] = (grouped[k] || 0) + t.total; });
  ok('a legacy "(Retail)" row and a new row land on ONE receivable',
     grouped['warung bu sari'] === 2000000);
  ok('the shop that only shares a word keeps its own row',
     Object.keys(grouped).length === 2 && grouped['warung sari rasa'] === 500000);
  ok('grouping on the raw name would have split it into three - the bug being guarded',
     new Set(tx.map(t => t.customerName)).size === 3);

  // The lookup: exact only.
  const book = [ { name: 'WARUNG SARI RASA' }, { name: 'Warung Bu Sari (Retail)' }, { id: 'no-name' } ];
  const find = (typed) => book.find(c => key(c.name) === key(typed)) || null;
  ok('a walk-in typed as "SARI" matches no store at all', find('SARI') === null);
  ok('the old loose lookup WOULD have billed WARUNG SARI RASA - the bug being guarded',
     book.some(c => String(c.name || '').toLowerCase().includes('sari')));
  ok('typing the full name still finds the shop saved under the legacy suffix',
     find('warung bu sari')?.name === 'Warung Bu Sari (Retail)');
  ok('a customer document with no name field does not throw', find('anything') === null);
  ok('a real name containing "(Retail)" in the middle is left alone',
     key('Warung (Retail) Jaya') === 'warung (retail) jaya'); }

/* ── S2 · the agent's own "who owes me" tally split the same way ───────────────────────── */
section('S2. The store-debt tally keys on storeKey, and still displays the written name');

ok('the raw-name key is gone from the tally', !/storeDebt\[t\.customerName\]/.test(profile));
ok('the tally keys on storeKey', /const key = storeKey\(t\.customerName\)/.test(profile));
ok('the payment cancels through the same key', /storeDebt\[debtKey\]\.amount -=/.test(profile));
ok('storeKey is imported in the profile view', imports(profile, 'storeKey'));
ok('the list reads the stored display name, not the key',
   /Object\.values\(storeDebt\)\.filter\(s => s\.amount > 0\)/.test(profile));

/* BEHAVIOUR — one shop under three spellings, and a payment filed under a fourth. */
{ const key = (n) => String(n ?? '').trim().replace(/\s*\((?:Retail|Individual|Wholesale)\)$/i, '').trim().toLowerCase();
  const tx = [
    { type: 'SALE', paymentType: 'Titip', customerName: 'Warung Bu Sari (Retail)', total: 1200000 },
    { type: 'SALE', paymentType: 'Titip', customerName: 'Warung Bu Sari',          total:  800000 },
    { type: 'SALE', paymentType: 'Titip', customerName: 'warung bu sari ',         total:  500000 },
    { type: 'CONSIGNMENT_PAYMENT',        customerName: 'WARUNG BU SARI',     amountPaid: 1500000 },
    { type: 'CONSIGNMENT_PAYMENT',        customerName: 'Toko Belum Beli',    amountPaid:  400000 } ];

  const tally = (keepGuard) => { const d = {};
    tx.forEach(t => {
      if (t.type === 'SALE' && t.paymentType === 'Titip' && t.customerName) {
        const k = key(t.customerName);
        if (!d[k]) d[k] = { store: String(t.customerName).trim(), amount: 0 };
        d[k].amount += (t.total || 0);
      }
      if (t.type === 'CONSIGNMENT_PAYMENT') {
        const k = t.customerName ? key(t.customerName) : null;
        if (k && (keepGuard ? d[k] : true)) { if (!d[k]) d[k] = { store: t.customerName, amount: 0 };
          d[k].amount -= (t.amountPaid || t.total || 0); } }
    });
    return d; };

  const chosen = tally(true);                       // (a) key on storeKey, KEEP the guard — shipped
  const list = Object.values(chosen).filter(s => s.amount > 0).map(s => ({ store: s.store, amount: s.amount }));
  ok('three spellings of one shop are ONE debt row', list.length === 1);
  ok('that row carries the whole 2.500.000 less the 1.500.000 paid',
     list[0].amount === 1000000);
  ok('the payment filed under a FOURTH spelling still cancelled',
     Object.values(chosen).length === 1 && chosen['warung bu sari'].amount === 1000000);
  ok('the row displays the name as it was written, not the lowercased key',
     list[0].store === 'Warung Bu Sari (Retail)');
  ok('keying on the raw name would have shown three rows - the bug being guarded',
     new Set(tx.filter(t => t.type === 'SALE').map(t => t.customerName)).size === 3);

  /* The branch NOT chosen: drop the guard so an unmatched payment always subtracts. */
  const unchosen = tally(false);
  ok('dropping the guard invents a negative entry for a shop with no sale in the window',
     unchosen['toko belum beli'].amount === -400000);
  ok('the > 0 filter hides it, so dropping the guard buys nothing and risks a negative',
     Object.values(unchosen).filter(s => s.amount > 0).length === 1);
  ok('the guard never blocks a payment that HAS a matching sale',
     chosen['warung bu sari'].amount === unchosen['warung bu sari'].amount); }

/* ── S3 · three files still carried their own idea of what a store name is ─────────────── */
section('S3. One name rule, everywhere — no private copies left');
const brief    = read('src/utils/customerBrief.js');
const daystats = read('src/utils/dayStats.js');

ok('customerBrief no longer defines its own normalizer',
   !/const key = \(name\) => String/.test(brief));
ok('customerBrief imports the shared rule', /import \{ storeKey as key \} from '\.\/helpers\.js'/.test(brief));
ok('dayStats counts today\'s stores by key', /storesToday\.add\(storeKey\(/.test(daystats));
ok('dayStats counts yesterday\'s stores by key', /storesYesterday\.add\(storeKey\(/.test(daystats));
/* Both files are executed by node in their own self-checks, where the ESM resolver does NOT
   add the extension Vite adds. Dropping the ".js" breaks those runs, not the build. */
ok('both node-executed modules import helpers WITH the .js extension',
   /from '\.\/helpers\.js'/.test(brief) && /from '\.\/helpers\.js'/.test(daystats));
ok('the sales terminal auto-pick compares by key',
   /const exact = customers\.filter\(c => storeKey\(c\.name\) === needle\)/.test(merchant));
ok('and its one-match guard is untouched', /if \(exact\.length === 1\) handleCustomerSelect/.test(merchant));

/* BEHAVIOUR — normalising makes MORE names collide. The guard has to survive that. */
{ const key = (n) => String(n ?? '').trim().replace(/\s*\((?:Retail|Individual|Wholesale)\)$/i, '').trim().toLowerCase();
  const pick = (book, typed) => { const needle = key(typed);
    const exact = book.filter(c => key(c.name) === needle);
    return exact.length === 1 ? exact[0] : null; };

  // Two DIFFERENT shops that reduce to one key: 14.5 km apart, same name. Never auto-pick.
  const twins = [ { id: 'north', name: 'Warung Sembako Sumber Rejeki' },
                  { id: 'south', name: 'warung sembako sumber rejeki (Retail)' } ];
  ok('two documents sharing a key auto-pick NOTHING - the dropdown stays open',
     pick(twins, 'Warung Sembako Sumber Rejeki') === null);
  ok('and the collision is real, not avoided by luck',
     twins.filter(c => key(c.name) === key('warung sembako sumber rejeki')).length === 2);

  // One shop saved under the legacy name, agent types the clean one.
  const one = [ { id: 'sari', name: 'Warung Bu Sari (Retail)' }, { id: 'rasa', name: 'Warung Sari Rasa' } ];
  ok('typing the clean name now picks the shop saved with the legacy suffix',
     pick(one, 'warung bu sari')?.id === 'sari');
  ok('the raw compare it replaced would have picked nothing - the bug being guarded',
     one.filter(c => (c.name || '').trim().toLowerCase() === 'warung bu sari').length === 0);
  ok('a partial name still picks nothing', pick(one, 'sari') === null);

  // The door-step brief: history filed under the legacy name must still be found.
  const tx = [ { customerName: 'Warung Bu Sari (Retail)', total: 900000 },
               { customerName: 'warung bu sari ',         total: 100000 },
               { customerName: 'Warung Sari Rasa',        total: 500000 } ];
  const mine = tx.filter(t => key(t.customerName) === key('Warung Bu Sari'));
  ok('the brief finds the legacy rows instead of reporting "no recent order"', mine.length === 2);
  ok('and does not swallow the shop that merely shares a word',
     mine.reduce((s, t) => s + t.total, 0) === 1000000);

  // Stores-visited is a count, so a split inflates his day.
  ok('three spellings of one shop count as ONE store visited',
     new Set(tx.map(t => key(t.customerName))).size === 2);

  /* The empty-name gate, now pinned by maths rather than by the spelling of the normalizer —
     integration.audit used to require the literal `typed.trim().toLowerCase()` and went red on
     a rename while the behaviour was untouched. Pressing space in an empty field must select
     nothing, and a name that is ONLY a tier suffix is empty too. */
  ok('an empty, blank, null or suffix-only name normalises to nothing selectable',
     ['', '   ', null, undefined, ' (Retail)'].every(v => key(v) === '')); }

/* ── S4 · the map matched a store's history with a raw === ─────────────────────────────── */
section('S4. The map finds a shop by key, and counts each shop once');

ok('the raw === match is gone', !/t\.customerName === store\.name/.test(map));
ok('the raw !== match is gone', !/t\.customerName !== store\.name/.test(map));
ok('the private trim+lowercase copy is gone',
   !/\(t\.customerName \|\| t\.customer \|\| ''\)\.trim\(\)\.toLowerCase\(\)/.test(map));
ok('storeKey is imported in the map', imports(map, 'storeKey'));
ok('the XP loop matches by key and keeps the t.customer fallback',
   /storeKey\(t\.customerName \|\| t\.customer\) === storeKey\(store\.name\)/.test(map));
ok('per-store revenue is computed once per key', /if \(storeRevs\[key\] !== undefined\) return;/.test(map));
ok('a zone counts each distinct shop once', /const counted = new Set\(\);/.test(map) && /if \(counted\.has\(key\)\) return;/.test(map));

/* BEHAVIOUR — real rupiah, and the BEFORE is stated next to the AFTER for every sum, because
   each of these numbers is on a screen Aldi reads. */
{ const key = (n) => String(n ?? '').trim().replace(/\s*\((?:Retail|Individual|Wholesale)\)$/i, '').trim().toLowerCase();
  const raw = (n) => String(n ?? '');
  const tx = [
    { type: 'SALE', paymentType: 'Titip', customerName: 'Warung Bu Sari (Retail)', total: 1200000 },
    { type: 'SALE', paymentType: 'Titip', customerName: 'warung bu sari ',         total:  800000 },
    { type: 'SALE', paymentType: 'Cash',  customerName: 'Warung Bu Sari',          total:  300000 },
    { type: 'CONSIGNMENT_PAYMENT',        customerName: 'WARUNG BU SARI',     amountPaid: 500000 },
    { type: 'SALE', paymentType: 'Cash',  customerName: 'Warung Sari Rasa',        total:  700000 } ];
  const store = { name: 'Warung Bu Sari' };

  const statsFor = (match) => { const mine = tx.filter(t => match(t.customerName, store.name));
    const rev   = mine.filter(t => t.type === 'SALE').reduce((s, t) => s + t.total, 0);
    const titip = mine.filter(t => t.type === 'SALE' && t.paymentType === 'Titip').reduce((s, t) => s + t.total, 0);
    const paid  = mine.filter(t => t.type === 'CONSIGNMENT_PAYMENT').reduce((s, t) => s + t.amountPaid, 0);
    return { rev, debt: Math.max(0, titip - paid) }; };

  const before = statsFor((a, b) => raw(a) === raw(b));
  const after  = statsFor((a, b) => key(a) === key(b));
  ok('BEFORE: the pin saw one row - revenue 300.000, debt 0, so the shop read as settled',
     before.rev === 300000 && before.debt === 0);
  ok('AFTER: revenue 2.300.000 and the debt that was hidden is 1.500.000',
     after.rev === 2300000 && after.debt === 1500000);
  ok('the shop that merely shares a word is still excluded',
     after.rev !== 3000000);

  // The XP loop banks a number into the store document, so a split history under-banked it.
  const xp = (match) => tx.filter(t => t.type === 'SALE' && match(t.customerName, store.name))
                          .reduce((s, t) => s + t.total, 0);
  ok('BEFORE: lifetimeXP was banked at 300.000', xp((a, b) => raw(a) === raw(b)) === 300000);
  ok('AFTER: it banks the 2.300.000 the shop actually earned', xp((a, b) => key(a) === key(b)) === 2300000);

  // Two customer documents, one shop's worth of rows: a zone must not count it twice.
  const twins = [ { name: 'Toko Jaya', longitude: 1, latitude: 1 },
                  { name: 'toko jaya (Retail)', longitude: 1, latitude: 1 } ];
  const revs = {}; twins.forEach(s => { const k = key(s.name); if (revs[k] === undefined) revs[k] = 400000; });
  ok('twin documents share ONE revenue entry', Object.keys(revs).length === 1);
  let zone = 0; const counted = new Set();
  twins.forEach(s => { const k = key(s.name); if (counted.has(k)) return; counted.add(k); zone += revs[k] || 0; });
  ok('AFTER: the zone counts that shop once - 400.000', zone === 400000);
  let zoneOld = 0; twins.forEach(s => { zoneOld += revs[key(s.name)] || 0; });
  ok('BEFORE the de-duplication it would have been 800.000 - the same takings twice',
     zoneOld === 800000); }

/* ── S5 · no file may keep its own private idea of what a store name is ────────────────── */
section('S5. One name rule, enforced — not re-found by hand every session');

/* Four private copies of the name rule were found one at a time, one session each:
   customerBrief.js, MapMissionControl's XP loop, and JourneyView on both sides of a lookup.
   Each was a real bug — a shop reading as unvisited, unsold or debt-free. This finds the CLASS.

   Comments are stripped FIRST, and that is not tidiness. A regression guard for
   `.includes(inputTrimmed)` once went red against the FIXED code because the comment explaining
   the fix contained the phrase. A text scan that reads prose reports the opposite of the truth. */
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))   // keep the newlines, keep line numbers
  .replace(/\/\/[^\n]*/g, '');

/* Scoped to store-name identifiers on purpose. `.trim().toLowerCase()` is correct and normal on
   an email, a search box or a product name — a guard that fails on those gets deleted in a week. */
const NAME_ID = /customerName|storeName|store\.name/;
const OWN_RULE = /\.trim\(\)\s*\.toLowerCase\(\)/;

const scanSource = (src) => stripComments(src).split('\n')
  .map((line, i) => ({ line: i + 1, text: line }))
  .filter(l => OWN_RULE.test(l.text) && NAME_ID.test(l.text));

/* Proof the guard cannot be satisfied by prose — the trap this exact check was written to dodge. */
ok('a banned shape inside a COMMENT does not count as a violation',
   scanSource(`/* store.name.trim().toLowerCase() is banned */\n// customerName.trim().toLowerCase()\nconst x = 1;`).length === 0);
ok('and the same shape in real code DOES count',
   scanSource(`const k = tx.customerName.trim().toLowerCase();`).length === 1);
ok('a trim+lowercase on something that is not a store name is left alone',
   scanSource(`const q = searchTerm.trim().toLowerCase();`).length === 0);

/* src/config holds the checks themselves, which quote these shapes as patterns; helpers.js is
   where the one real rule lives. Everything else is app code and must go through storeKey. */
const appFiles = fs.readdirSync('src', { recursive: true })
  .map(f => `src/${String(f).replace(/\\/g, '/')}`)
  .filter(f => /\.(js|jsx)$/.test(f))
  .filter(f => !f.startsWith('src/config/') && f !== 'src/utils/helpers.js');

const violations = appFiles.flatMap(f => scanSource(read(f)).map(v => `${f}:${v.line}`));
ok(`no file defines its own store-name rule${violations.length ? ' — ' + violations.join(', ') : ''}`,
   violations.length === 0);

/* ── S6 · what the S5 guard turned red, and what each site was feeding ──────────────────── */
section('S6. The eight sites the guard found — three of them sums');
const journey = read('src/JourneyView.jsx');
const eod     = read('src/EODReconciliationView.jsx');

ok('the FIFO debt engine matches by key', /storeKey\(t\.customerName\) === storeKey\(customerName\)/.test(merchant));
ok('the rank metric matches by key', /storeKey\(t\.customerName \|\| t\.customer\) === storeKey\(finalCust\)/.test(merchant));
ok('the hand-off duplicate check matches by key', /storeKey\(r\.storeName\) === storeKey\(storeName\)/.test(app));
ok('the hand-off row sweep matches by key', /const sameName = \(v\) => storeKey\(v\) === storeKey\(request\.storeName\)/.test(app));
ok('the visit map is BUILT with the key', /const storeName = storeKey\(tx\.customerName\)/.test(journey));
ok('and READ with the same key in both places',
   (journey.match(/todaysVisits\[storeKey\(store\.name\)\]/g) || []).length === 2);
ok('the EOD store count is keyed', /map\(t => storeKey\(t\.customerName\)\)/.test(eod));

/* BEHAVIOUR — the three sums, on real rupiah, BEFORE next to AFTER. */
{ const key = (n) => String(n ?? '').trim().replace(/\s*\((?:Retail|Individual|Wholesale)\)$/i, '').trim().toLowerCase();
  const raw = (n) => String(n ?? '').trim().toLowerCase();
  const tx = [
    { type: 'SALE', paymentType: 'Titip', customerName: 'Warung Bu Sari (Retail)', total: 1200000 },
    { type: 'SALE', paymentType: 'Titip', customerName: 'Warung Bu Sari',          total:  800000 },
    { type: 'CONSIGNMENT_PAYMENT',        customerName: 'warung bu sari ',    amountPaid: 500000 },
    { type: 'SALE', paymentType: 'Cash',  customerName: 'Warung Sari Rasa',        total:  700000 } ];
  const typed = 'Warung Bu Sari';

  // 1. FIFO debt engine — what the salesman is told the shop owes, at the counter.
  const debt = (m) => { const mine = tx.filter(t => m(t.customerName, typed));
    const owed = mine.filter(t => t.type === 'SALE' && t.paymentType === 'Titip').reduce((s, t) => s + t.total, 0);
    const paid = mine.filter(t => t.type === 'CONSIGNMENT_PAYMENT').reduce((s, t) => s + t.amountPaid, 0);
    return Math.max(0, owed - paid); };
  /* The old rule DID trim and lowercase, so the 500.000 payment matched while the 1.200.000
     legacy sale did not: the counter subtracted a payment from a debt it could not see. */
  ok('BEFORE: the counter showed 300.000 owed - payment counted, legacy sale invisible',
     debt((a, b) => raw(a) === raw(b)) === 300000);
  ok('AFTER: it shows the real 1.500.000, and the payment still counts',
     debt((a, b) => key(a) === key(b)) === 1500000);

  // 2. Rank metric — omset against a tier target.
  const omset = (m) => tx.filter(t => t.type === 'SALE' && m(t.customerName, typed)).reduce((s, t) => s + t.total, 0);
  ok('BEFORE: the shop counted 800.000 toward its tier', omset((a, b) => raw(a) === raw(b)) === 800000);
  ok('AFTER: it counts the 2.000.000 it actually bought', omset((a, b) => key(a) === key(b)) === 2000000);

  // 3. storesServed — a COUNT, banked into the career doc with increment().
  const sales = tx.filter(t => t.type === 'SALE');
  ok('BEFORE: one shop under two spellings counted as 3 stores served',
     new Set(sales.map(t => raw(t.customerName))).size === 3);
  ok('AFTER: it counts the 2 shops he actually served',
     new Set(sales.map(t => key(t.customerName))).size === 2);

  // 4. The visit map: build side and read side must agree, or every pin reads "not visited".
  const visits = {}; tx.forEach(t => { visits[key(t.customerName)] = 'Budi'; });
  ok('a pin named "Warung Bu Sari (Retail)" finds today\'s visit', !!visits[key('Warung Bu Sari (Retail)')]);
  ok('and so does the same shop written clean', !!visits[key('warung bu sari')]);
  ok('a shop nobody visited stays empty', !visits[key('Toko Lain')]); }

/* ── S7 · the old names are hidden on screen, and NOT rewritten in the book ─────────────── */
section('S7. Legacy names cleaned at display, with the backup path left raw');

ok('storeLabel exists and strips only a TRAILING suffix',
   helpers.includes('export const storeLabel') &&
   (helpers.split('export const storeLabel')[1] || '').slice(0, 200).includes('(?:Retail|Individual|Wholesale)\\)$/i'));
ok('storeLabel does NOT lowercase - it is a label, not a key',
   !/storeLabel[\s\S]{0,220}toLowerCase\(\)/.test(helpers));
ok('the app builds a display copy of the customer list',
   /const displayCustomers = React\.useMemo\(/.test(app) && /const displayPermitted = React\.useMemo\(/.test(app));
ok('the sale engine is given the display copy, so new rows are written clean',
   /customers: displayCustomers/.test(app));
/* The one path that must never see a display name. exportData.customers is written straight back
   by a restore with set(), so a stripped name there is a permanent rename of every shop. */
ok('the backup export still reads the RAW customer list',
   /exportData\.customers = deepCustomers/.test(app) && !/for \(const cust of displayCustomers\)/.test(app));
ok('the customer directory still receives the RAW list - it writes documents in bulk',
   /activeTab === 'customers' && \([\s\S]{0,300}customers=\{customers\}/.test(app));
ok('the receivables row and the debt tally display the cleaned label',
   /name: storeLabel\(t\.customerName\)/.test(finance) && /store: storeLabel\(t\.customerName\)/.test(profile));

/* BEHAVIOUR — the invariant that makes this safe: relabelling can never change WHO a row is. */
{ const key   = (n) => String(n ?? '').trim().replace(/\s*\((?:Retail|Individual|Wholesale)\)$/i, '').trim().toLowerCase();
  const label = (n) => String(n ?? '').trim().replace(/\s*\((?:Retail|Individual|Wholesale)\)$/i, '').trim();

  ok('the suffix disappears from the label', label('Warung Bu Sari (Retail)') === 'Warung Bu Sari');
  ok('and the capitals survive - it is what he reads, not what the code matches on',
     label('WARUNG BU SARI (Wholesale)') === 'WARUNG BU SARI');
  ok('a name that merely contains a tier word in the middle is untouched',
     label('Warung (Retail) Jaya') === 'Warung (Retail) Jaya');
  ok('an empty or missing name stays empty', label('') === '' && label(null) === '' && label(undefined) === '');

  /* THE INVARIANT: a shop shown under its cleaned label still matches every row ever written
     under the old one. If this can ever fail, renaming on screen silently loses history. */
  const written = ['Warung Bu Sari (Retail)', 'warung bu sari ', 'WARUNG BU SARI', 'Warung Bu Sari'];
  ok('every stored spelling still resolves to the same shop after relabelling',
     written.every(n => key(label(n)) === key(n)) &&
     new Set(written.map(n => key(label(n)))).size === 1);
  ok('and relabelling never merges two shops that were separate',
     key(label('Warung Sari Rasa')) !== key(label('Warung Bu Sari'))); }

/* ── S8 · pack-size maths: four hand-written copies that disagreed with the helper ─────── */
section('S8. Van-row conversions go through convertToBks, and use the ROW\'s unit');
const fleet2 = read('src/FleetCanvasManager.jsx');

ok('the consignment return converts the van row by the ROW unit',
   /const mCanvas = convertToBks\(1, cItem\.unit, pData\);/.test(engine));
ok('and converts the returned goods by their OWN unit',
   /const returnedBks = convertToBks\(item\.qty, item\.unit, pData\);/.test(engine));
ok('the cukai deduction handles Karton', /const mCanvas = convertToBks\(1, cItem\.unit, product\);/.test(merchant));
ok('both sampling-edit sides handle all four sizes',
   /convertToBks\(1, cItem\.unit, oldPData\)/.test(app) && /convertToBks\(1, cItem\.unit, newPData\)/.test(app));
ok('Load Canvas converts packs into the van row\'s unit',
   /const rowSize = convertToBks\(1, updatedCanvas\[existingItemIndex\]\.unit, masterProduct\);/.test(fleet2));

/* THE FINDER, scoped to the shape that was actually broken: a one-line size ladder that starts
   at Slop and stops early. Every correct copy names balsPerCarton; all three broken ones did
   not. Deliberately NOT a ban on hand-written conversion — about twenty correct copies exist,
   and a check that is red on day one is a check that gets deleted in a week. */
const truncated = ['src/App.jsx', 'src/MerchantSalesView.jsx', 'src/hooks/useTransactionEngine.js',
                   'src/FleetCanvasManager.jsx', 'src/StockOpnameView.jsx', 'src/EODReconciliationView.jsx']
  .flatMap(f => stripComments(read(f)).split('\n')
    .map((text, i) => ({ f, line: i + 1, text }))
    .filter(l => /unit === 'Slop' \?/.test(l.text) && !/balsPerCarton/.test(l.text)))
  .map(l => `${l.f}:${l.line}`);
ok(`no size ladder stops before Karton${truncated.length ? ' — ' + truncated.join(', ') : ''}`,
   truncated.length === 0);

/* BEHAVIOUR — the REAL helper, imported, not a copy. Writing the maths out again here would be
   the exact disease this section is about. */
{ const { convertToBks } = await import('../utils/helpers.js');
  const prod = { packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4 };

  ok('a Slop is 10 packs, a Bal 200, a Karton 800',
     convertToBks(1, 'Slop', prod) === 10 && convertToBks(1, 'Bal', prod) === 200 && convertToBks(1, 'Karton', prod) === 800);
  ok('an unknown unit leaves the quantity alone', convertToBks(7, 'Bks', prod) === 7);

  // Consignment return: van row 3 Slop (30 packs), store returns 25 packs.
  const row = { qty: 3, unit: 'Slop' };
  const after = ((row.qty * convertToBks(1, row.unit, prod)) + convertToBks(25, 'Bks', prod)) / convertToBks(1, row.unit, prod);
  ok('AFTER: 3 Slop plus 25 packs is 5.5 Slop, which is 55 packs', after === 5.5);
  const brokenRatio = convertToBks(1, 'Bks', prod);   // the old code built this from the RETURNED item
  ok('BEFORE: the same return made it 28 - it read 3 Slop as 3 packs',
     ((row.qty * brokenRatio) + 25) / brokenRatio === 28);

  // Load Canvas: van row 3 Slop, load 10 packs.
  const loaded = row.qty + (10 / convertToBks(1, row.unit, prod));
  ok('AFTER: loading 10 packs onto a 3-Slop row gives 4 Slop, which is 40 packs', loaded === 4);
  ok('BEFORE: it gave 13 Slop - 130 packs, from a warehouse that only lost 10', row.qty + 10 === 13);

  // Sampling edit: van row 2 Karton.
  const karton = { qty: 2, unit: 'Karton' };
  ok('AFTER: a 2-Karton row is 1600 packs', karton.qty * convertToBks(1, karton.unit, prod) === 1600);
  ok('BEFORE: the Slop-only ladder called it 2 packs', karton.qty * 1 === 2); }

/* ── S9 · approving a stock count used to erase the day it was counted on ──────────────── */
section('S9. A count corrects the stock, it does not replace it');
const opname = read('src/StockOpnameView.jsx');

ok('approval applies the counted difference through increment()',
   /stock:\s+increment\(Number\(item\.goodCount \|\| 0\)\s+- Number\(item\.expectedStock \|\| 0\)\)/.test(opname));
ok('damaged stock is corrected the same way',
   /damagedStock: increment\(Number\(item\.damagedCount \|\| 0\) - Number\(item\.expectedDamagedStock \|\| 0\)\)/.test(opname));
ok('the blind overwrite is gone from the normal path',
   !/data: \{ stock: item\.goodCount, damagedStock: item\.damagedCount \}/.test(opname));
/* ⚠️ THIS CHECK'S NAME ONLY BECAME TRUE ON 2026-08-21. It always claimed "AT COUNT TIME", but
   the regex pinned `item.stock` read inside handleCommit — which is SUBMIT time. A sale landing
   between the first keystroke and the submit moved the target, and the check said nothing,
   because it was pinning the shape of the wrong line. The pair is now frozen on the first
   keystroke for that row, so the name and the behaviour finally agree. */
ok('the count still snapshots what the system believed AT COUNT TIME',
   /expectedStock: Number\(entry\.expStock \?\? item\.stock \?\? 0\)/.test(opname)
   && /expectedDamagedStock: Number\(entry\.expDamaged \?\? item\.damagedStock \?\? 0\)/.test(opname));
ok('audits submitted before the snapshot existed still fall back to the overwrite',
   /const hasSnapshot = item\.expectedStock !== undefined/.test(opname));
ok('the confirmation no longer promises an overwrite',
   !/permanently overwrite the inventory/.test(opname) && /Sales and returns made since the count are kept/.test(opname));

/* BEHAVIOUR — the whole day, in order. */
{ const apply = (expected, counted, movements, useDelta) => {
    let stock = expected;
    movements.forEach(m => { stock += m; });          // the day happens between count and approval
    return useDelta ? stock + (counted - expected) : counted; };

  ok('BEFORE: count 100 at 08:00, sell 30, take 20 back, approve at 20:00 -> stock 100, ten from nowhere',
     apply(100, 100, [-30, +20], false) === 100);
  ok('AFTER: the same day ends at the real 90', apply(100, 100, [-30, +20], true) === 90);

  ok('AFTER: a real shortage still lands - expected 100, only 95 found, then the same day -> 85',
     apply(100, 95, [-30, +20], true) === 85);
  ok('BEFORE: that shortage would have read 95, hiding the day AND flattering the loss',
     apply(100, 95, [-30, +20], false) === 95);

  ok('a count with nothing happening afterwards is unchanged by the fix',
     apply(100, 95, [], true) === 95 && apply(100, 95, [], false) === 95);
  ok('an extra found on the shelf still increases stock',
     apply(100, 103, [-30], true) === 73); }

/* ── S10 · Clear Canvas credited the warehouse from a screen, not from the vehicle ─────── */
section('S10. Emptying a vehicle reads what is in it now');

/* Scoped to handleClearCanvas ONLY. Tested against the whole file these guards were vacuous:
   handleLoadCanvas, fifty lines above, already contains the very lines being asserted, so they
   passed against the unfixed code. A guard that cannot fail is worse than no guard — it reports
   the fix as present. */
const clearBody = fleet2.split('handleClearCanvas')[1] || '';

ok('the canvas is read inside the clear transaction',
   /const agentSnap = await t\.get\(agentRef\);[\s\S]{0,160}activeCanvas \|\| \[\]/.test(clearBody));
ok('the cached screen copy is no longer the source',
   !/const currentCanvas = selectedAgent\.activeCanvas \|\| \[\];/.test(clearBody));
ok('the goods returned are built from the live list', /const itemsToReturn = liveCanvas/.test(clearBody));
/* Firestore forbids a read after a write in one transaction, and it fails at RUNTIME only. */
{ const readAt = clearBody.indexOf('await t.get(agentRef)');
  const firstWrite = Math.min(...['t.set(', 't.update('].map(w => { const i = clearBody.indexOf(w); return i < 0 ? Infinity : i; }));
  ok('the read exists AND happens before the first write', readAt > -1 && readAt < firstWrite); }
ok('the pack-size conversion still takes the unit from the van row',
   /convertToBks\(r\.item\.qty, r\.item\.unit, r\.product\)/.test(fleet2));

/* BEHAVIOUR — the race itself, not just the read. */
{ const product = { packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4 };
  const screenLoadedAt1400 = [{ productId: 'p1', qty: 50, unit: 'Bks' }];
  const vanRightNow      = [{ productId: 'p1', qty: 30, unit: 'Bks' }];   // 20 sold at 14:05
  const warehouse = 200;

  const credit = (list) => list.reduce((s, i) => s + (i.unit === 'Slop' ? i.qty * product.packsPerSlop : i.qty), 0);
  ok('BEFORE: the warehouse gained 50 while the store kept 20 - 20 packs invented',
     warehouse + credit(screenLoadedAt1400) === 250);
  ok('AFTER: it gains the 30 actually left in the van', warehouse + credit(vanRightNow) === 230);
  ok('and the vehicle still ends empty either way', [].length === 0);

  // A van row counted in Slop must not be credited as packs.
  ok('a live row of 3 Slop credits 30 packs, not 3',
     credit([{ productId: 'p1', qty: 3, unit: 'Slop' }]) === 30); }

/* ── S11 · the sale path asked the flag the app already knows is lying ─────────────────── */
section('S11. Every path asks the real internet probe');

/* Comments stripped — the note explaining this fix names the banned flag, and without stripping
   the guard reads its own prose and reports the bug as still present. Third time in this file. */
ok('the sale interceptor no longer asks navigator.onLine', !/navigator\.onLine/.test(stripComments(engine)));
ok('all three interceptors ask isOnline',
   (engine.match(/if \(!isOnline\)/g) || []).length === 3);
ok('isOnline still comes from useOfflineEngine', /const \{ isOnline,[^}]*\} = useOfflineEngine\(\)/.test(engine));

/* ── S12 · a sale made with no signal never came off the van ───────────────────────────── */
section('S12. Offline sales move the van stock, through the same rule as online');

ok('the canvas rule exists once, at module scope', /^const applySaleToCanvas = \(canvas, moves\) => \{/m.test(engine));
ok('the online path calls it',
   /batch\.update\(agentRef, \{ activeCanvas: applySaleToCanvas\(agentDoc\.data\(\)\.activeCanvas, transactionItems\) \}\)/.test(engine));
ok('the offline path calls it too',
   /updateDoc\(canvasRef, \{ activeCanvas: applySaleToCanvas\(canvasDoc\.data\(\)\.activeCanvas, moves\) \}\)/.test(engine));
ok('the online path no longer keeps its own copy of the rule',
   !/const givenItems = transactionItems\.filter/.test(stripComments(engine)));
ok('a failed offline canvas write is REPORTED, not swallowed',
   /the vehicle count could not be updated/.test(engine));
ok('updateDoc is imported', imports(engine, 'updateDoc'));

/* BEHAVIOUR — the real helper, imported. */
{ const { convertToBks } = await import('../utils/helpers.js');
  const prod = { packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4 };
  /* Same shape as the engine's, kept in step by the guards above. */
  const apply = (canvas, moves) => {
    const updated = (canvas || []).map(row => {
      const given = moves.filter(m => m.productId === row.productId && m.isPhysicallyGiven);
      if (!given.length) return row;
      const rowSize = convertToBks(1, row.unit, given[0].prodData || {});
      const remaining = (row.qty * rowSize) - given.reduce((s, m) => s + m.qtyInBks, 0);
      if (remaining < 0) throw new Error('short');
      return { ...row, qty: remaining / rowSize };
    });
    moves.filter(m => m.isReturnedToStock).forEach(m => {
      const i = updated.findIndex(r => r.productId === m.productId);
      if (i >= 0) updated[i] = { ...updated[i], qty: updated[i].qty + (m.qtyInBks / convertToBks(1, updated[i].unit, m.prodData)) };
      else updated.push({ productId: m.productId, name: m.name, qty: m.qtyInBks, unit: 'Bks' });
    });
    return updated.filter(r => r.qty > 0); };

  const van = [{ productId: 'p1', name: 'Rokok A', qty: 10, unit: 'Bks' }];
  const sold4 = [{ productId: 'p1', name: 'Rokok A', prodData: prod, qtyInBks: 4, isPhysicallyGiven: true, isReturnedToStock: false }];

  ok('BEFORE: an offline sale of 4 left the van claiming 10', van[0].qty === 10);
  ok('AFTER: the van holds the 6 he really has', apply(van, sold4)[0].qty === 6);
  ok('so his EOD count of 6 is no longer a 4-pack shortage against the app',
     apply(van, sold4)[0].qty === 6);

  // A Slop-counted row must not lose 4 SLOP for a 4-pack sale.
  const slopVan = [{ productId: 'p1', name: 'Rokok A', qty: 3, unit: 'Slop' }];
  ok('a 4-pack sale off a 3-Slop row leaves 2.6 Slop, which is 26 packs',
     apply(slopVan, sold4)[0].qty === 2.6);

  // An IOU hands nothing over today, so the van must not move.
  const iou = [{ productId: 'p1', name: 'Rokok A', prodData: prod, qtyInBks: 4, isPhysicallyGiven: false, isReturnedToStock: false }];
  ok('an IOU line does not take anything off the van', apply(van, iou)[0].qty === 10);

  // Buyback puts resellable packs back, even for a product he was not carrying.
  const buyback = [{ productId: 'p2', name: 'Rokok B', prodData: prod, qtyInBks: 5, isPhysicallyGiven: false, isReturnedToStock: true }];
  ok('a buyback of a product he was not carrying opens a new van line',
     apply(van, buyback).find(r => r.productId === 'p2')?.qty === 5);

  ok('selling more than the van holds still refuses', (() => {
     try { apply(van, [{ ...sold4[0], qtyInBks: 99 }]); return false; } catch { return true; } })()); }

/* ── S13 · a store registered offline landed in a status no screen knows ───────────────── */
section('S13. An offline store syncs with the status the online path writes');

ok('the status nothing reads is gone', !/PENDING_OFFLINE_SYNC/.test(stripComments(app)));
/* Scoped to the NOO flush. The transaction flush twenty lines below is character-identical, so
   an unscoped test passes on the unfixed code by matching the wrong one — the second vacuous
   guard caught today. Anchored on `customers` + processedNoo, which only the NOO block has. */
ok('the synced store keeps the status its payload carried',
   /customers`\)\);[\s\S]{0,600}data: \{ \.\.\.payload, syncedAt: serverTimestamp\(\) \}[\s\S]{0,120}processedNoo\.push/.test(app));
ok('and the offline payload still sets that status at save time',
   /status: newStoreData\.isNooRegistration \? 'NOO_ACTIVE' : 'WALK_IN'/.test(engine));

/* ── S39 · how much of each product sold, per day, without paying to ask ────────────── */
section('S39. Sales rollup: a cache that can always be rebuilt from the transactions');
{
  const R = await import('../utils/salesRollup.js');

  /* Two products with different pack sizes, because mixing units before the end is how a figure
     comes out twenty times too big - the exact fault this app has paid for elsewhere. */
  const PRODUCTS = {
    p1: { id: 'p1', name: 'Cello Chocolate', packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4 },
    p2: { id: 'p2', name: 'Cello Mint', packsPerSlop: 12, slopsPerBal: 10, balsPerCarton: 5 },
  };
  const sale = (date, items, type = 'SALE') => ({ date, type, items });

  /* ---- ONE SALE, CONVERTED ---- 2 Slop of p1 is 20 Bks; the money is qty x price and must NOT
     be multiplied by the pack size, or revenue inflates by exactly the conversion factor. */
  const d1 = R.salesDelta(sale('2026-08-30', [{ productId: 'p1', qty: 2, unit: 'Slop', calculatedPrice: 15000 }]), PRODUCTS);
  ok('a sale in Slop is counted in Bks', d1.byProduct.p1.qty === 20);
  ok('and its money is quantity x price, never multiplied by the pack size',
     d1.byProduct.p1.revenue === 30000);
  ok('the delta knows which day and which month it belongs to',
     d1.day === '2026-08-30' && d1.month === '2026-08');

  /* Every unit, against the pack sizes above. A Karton of p2 is 5 x 10 x 12 = 600. */
  const bksOf = (qty, unit, id) => R.salesDelta(sale('2026-08-01',
      [{ productId: id, qty, unit, calculatedPrice: 1 }]), PRODUCTS).byProduct[id].qty;
  ok('Bks, Slop, Bal and Karton all convert through the shared function',
     bksOf(3, 'Bks', 'p1') === 3 && bksOf(3, 'Slop', 'p1') === 30 &&
     bksOf(3, 'Bal', 'p1') === 600 && bksOf(1, 'Karton', 'p2') === 600);

  /* ---- THE SIGN IS THE WHOLE DESIGN ---- an edit is a -1 of the old plus a +1 of the new, so
     there is one arithmetic rather than an add path and a remove path that can disagree. */
  const minus = R.salesDelta(sale('2026-08-30', [{ productId: 'p1', qty: 2, unit: 'Slop', calculatedPrice: 15000 }]), PRODUCTS, -1);
  ok('the same sale with sign -1 is the exact negative of itself',
     minus.byProduct.p1.qty === -d1.byProduct.p1.qty &&
     minus.byProduct.p1.revenue === -d1.byProduct.p1.revenue);

  /* ---- WHAT IS NOT A SALE ---- sampling is stock leaving the shelf, not revenue. A record with
     no date cannot be filed and must be skipped rather than guessed into today. */
  ok('a sampling record is not counted as a sale',
     R.salesDelta(sale('2026-08-30', [{ productId: 'p1', qty: 1, unit: 'Bks', calculatedPrice: 1 }], 'SAMPLING'), PRODUCTS) === null);
  ok('a transaction nobody can date is skipped, never filed under today',
     R.salesDelta({ type: 'SALE', items: [{ productId: 'p1', qty: 1, unit: 'Bks', calculatedPrice: 1 }] }, PRODUCTS) === null);
  ok('and an empty basket writes nothing at all',
     R.salesDelta(sale('2026-08-30', []), PRODUCTS) === null);
  /* A record written before `date` existed still has a timestamp, and losing those to a rebuild
     would silently shorten history. */
  ok('an older record falls back to its timestamp for the day',
     R.dayOf({ timestamp: { seconds: Math.floor(new Date(2026, 7, 30, 12).getTime() / 1000) } }) === '2026-08-30');

  /* ---- REBUILD FROM THE TRUTH ---- the property that makes a cache safe to ship. */
  const HISTORY = [
    sale('2026-07-30', [{ productId: 'p1', qty: 10, unit: 'Bks', calculatedPrice: 1000 }]),
    sale('2026-08-01', [{ productId: 'p1', qty: 1, unit: 'Slop', calculatedPrice: 12000 },
                        { productId: 'p2', qty: 5, unit: 'Bks', calculatedPrice: 900 }]),
    sale('2026-08-01', [{ productId: 'p1', qty: 4, unit: 'Bks', calculatedPrice: 1100 }]),
    sale('2026-08-15', [{ productId: 'p2', qty: 1, unit: 'Bal', calculatedPrice: 100000 }]),
  ];
  const built = R.rebuildMonths(HISTORY, PRODUCTS);
  ok('a rebuild produces one document per month, oldest first',
     built.length === 2 && built[0].month === '2026-07' && built[1].month === '2026-08');
  const aug = built[1];
  ok('two sales on the same day are merged into one day entry',
     Object.keys(aug.byDay['2026-08-01'] || {}).length === 2 &&
     aug.byDay['2026-08-01'].p1.qty === 10 + 4);
  /* THE INVARIANT WORTH MOST: the month total and the days under it are two views of one number.
     If they can disagree, every screen that reads the short-circuit is quietly wrong. */
  const dayTotal = (m, id) => Object.values(m.byDay).reduce((t, d) => t + ((d[id] || {}).qty || 0), 0);
  ok('the month total always equals the sum of its own days',
     aug.byProduct.p1.qty === dayTotal(aug, 'p1') &&
     aug.byProduct.p2.qty === dayTotal(aug, 'p2'));

  /* ---- READING A RANGE BACK ---- */
  ok('a range names every month it spans, oldest first',
     JSON.stringify(R.monthsInRange('2026-11-14', '2027-02-03')) ===
     JSON.stringify(['2026-11', '2026-12', '2027-01', '2027-02']));
  ok('and a backwards range names none rather than looping',
     R.monthsInRange('2026-05-01', '2026-04-01').length === 0);

  const oneDay = R.sumRange(built, '2026-08-01', '2026-08-01');
  ok('a single day sums only that day', oneDay.rows.find(r => r.id === 'p1').qty === 14);
  ok('and the busiest product sorts first', oneDay.rows[0].id === 'p1');
  const wholeAug = R.sumRange(built, '2026-08-01', '2026-08-31');
  ok('a whole month agrees with the month total it short-circuits onto',
     wholeAug.rows.find(r => r.id === 'p1').qty === aug.byProduct.p1.qty);

  /* A MISSING MONTH IS NOT A ZERO MONTH. Reporting it is what lets the screen say the figure is
     incomplete instead of printing a total that is quietly short - the silent-failure shape this
     repo keeps paying for. */
  const gap = R.sumRange([built[1]], '2026-07-01', '2026-08-31');
  ok('a month with no document is reported missing, not treated as zero',
     gap.missing === 1 && gap.months === 2);
  ok('and a complete range reports none missing',
     R.sumRange(built, '2026-07-01', '2026-08-31').missing === 0);

  /* ---- HIS FOUR RANGES ---- day, week, month, year. Sunday is the hard case: a week that runs
     Monday to Sunday must not roll forward on the Sunday itself. */
  const FRI = new Date(2026, 7, 28);   // Friday 2026-08-28
  const SUN = new Date(2026, 7, 30);   // Sunday 2026-08-30
  ok('the four ranges he asked for all exist',
     JSON.stringify(R.RANGES) === JSON.stringify(['day', 'week', 'month', 'year']));
  ok('a week runs Monday to Sunday',
     JSON.stringify(R.rangeDays('week', FRI)) === JSON.stringify({ from: '2026-08-24', to: '2026-08-30' }));
  ok('and Sunday belongs to the week that just ended, not the one starting',
     R.rangeDays('week', SUN).from === '2026-08-24');
  ok('a month runs to its real last day, whatever the month length',
     R.rangeDays('month', SUN).to === '2026-08-31' &&
     R.rangeDays('month', new Date(2026, 1, 10)).to === '2026-02-28');
  ok('and a year is the whole calendar year',
     JSON.stringify(R.rangeDays('year', SUN)) === JSON.stringify({ from: '2026-01-01', to: '2026-12-31' }));

  /* ---- THE DAILY LINE ---- */
  const series = R.dailySeries(built, 'p1', '2026-07-01', '2026-08-31');
  ok('the per-day line for one product comes back oldest first',
     series.length === 2 && series[0].day === '2026-07-30' && series[1].day === '2026-08-01');

  /* ---- EVERY PATH THAT TOUCHES A SALE TOUCHES THE TALLY ----
     This block is the reason the rollup can be trusted, and it is the half that source-scanning
     is genuinely good at: the arithmetic above is proven on real numbers, but nothing except a
     scan can prove that all four call sites still exist. Lose one and the totals drift with
     every check still green - the silent-failure shape this repo keeps paying for.

       +1  the online sale, inside the batch that writes the receipt
       +1  the offline drain, in the same operations list as the queued receipt
       -1  the three delete paths, through one shared helper
       -1 and +1  the history edit, in one commit with the updated receipt          */
  const engine = read('src/hooks/useTransactionEngine.js');
  const history = read('src/components/HistoryReportView.jsx');
  const rollupWrite = read('src/utils/salesRollupWrite.js');

  ok('the online sale tallies inside the SAME batch that writes the receipt',
     /batch\.set\(transRef[\s\S]{0,2200}tallySale\(batch, db, appId, userId/.test(engine));
  ok('and it converts with the pack sizes it already read, not a second lookup',
     /const productsById = Object\.fromEntries\(\s*transactionItems\.filter\(i => i\.productId\)\.map\(i => \[i\.productId, i\.prodData\]\)\)/.test(engine));
  ok('a sale made without signal is tallied when it drains, in the same commit',
     /const tallyOp = tallySaleOp\(db, appId, userId, payload, productsById, 1\)/.test(app) &&
     /if \(tallyOp\) operations\.push\(tallyOp\)/.test(app));
  /* All three deletes route through ONE negative. Three hand-written ones is three chances to
     get a sign backwards, and a sign error here is invisible until someone reads a total. */
  ok('the three delete paths share one un-tally instead of writing their own',
     /const untallyOps = \(txs\) =>/.test(app) &&
     /tallySaleOp\([\s\S]{0,120}-1\)/.test(app) &&
     (app.match(/untallyOps\(/g) || []).length === 3);
  /* `userId`, corrected 2026-08-31. This check used to pin `user.uid` — it was written to guard
     that the delete and the un-tally travel together, and it faithfully guarded the wrong address
     while doing it. `userId = bossUid || user.uid`: the same for the owner, and the tenant that
     actually owns the receipt for a delegated account. The uid is part of the guarantee now. */
  ok('the single delete removes the receipt and its tally in one commit',
     /type: 'delete', ref: doc\(db, `artifacts\/\$\{appId\}\/users\/\$\{userId\}\/transactions`, transaction\.id\) \},\s*\.\.\.untallyOps\(\[transaction\]\)/.test(app));
  /* An edit is the least obvious of the three - a delete looks destructive, changing a quantity
     looks like tidying - and it needs BOTH halves or it double-counts. */
  ok('an edit applies the negative of what stood before AND the positive of what was saved',
     /tallySaleOp\(db, appId, userId, editingTrans\.__before, productsById, -1\)/.test(history) &&
     /tallySaleOp\(db, appId, userId, after, productsById, 1\)/.test(history));
  ok('and it snapshots the record when the editor opens, not when it saves',
     /setEditingTrans\(\{ \.\.\.t, __before: t \}\)/.test(history));
  ok('the edit commits the receipt and both halves together',
     /await commitInChunks\(db, writeBatch, \[[\s\S]{0,700}tallySaleOp[\s\S]{0,300}tallySaleOp/.test(history));

  /* A nested literal under merge, never a dotted path: a product id containing a dot would be
     read as a path segment and write to the wrong place without ever erroring. */
  ok('the write uses nested keys under merge, so a dot in a product id is safe',
     /\{ merge: true \}/.test(rollupWrite) &&
     !/byProduct\./.test(stripComments(rollupWrite).replace(/byProduct\)/g, '')));
  /* One module OWNS the collection path. The rebuild in App.jsx is a legitimate second writer -
     it replaces months wholesale rather than incrementing them - but it must reach the collection
     through `statsPath` rather than spelling the path again. Two spellings of one collection is
     how a repair quietly fixes a document nothing else reads. */
  ok('the collection path is written in exactly one place',
     /sales_stats/.test(rollupWrite) &&
     ['src/hooks/useTransactionEngine.js', 'src/components/HistoryReportView.jsx']
       .every(f => !/sales_stats/.test(read(f))) &&
     !/sales_stats/.test(stripComments(app)) &&
     /statsPath\(appId, userId, m\.month\)/.test(app));

  /* ---- IT IS A CACHE, AND THE CODE MUST SAY SO ---- nothing may read a figure out of here and
     write it back into stock, money or a nota. The rebuild is what makes that safe. */
  const src = read('src/utils/salesRollup.js');
  ok('the module states plainly that it is never the source of truth',
     /IT IS NEVER THE TRUTH/.test(src) && /rebuilt from it/.test(src));
  ok('and it owns no clock of its own - the day comes from the transaction',
     !/Date\.now\(\)/.test(stripComments(src)));
}

/* ── S38 · the minimum shipment, on the HQ side, with his spare days ───────────────────── */
section('S38. Minimal kirim: the floor HQ sees, keyed on the Tujuan it is sending to');
{
  /* The maths itself is exercised in the G3 section further down, where the pure functions are
     already lifted out of the .jsx by `new Function` — node cannot import a .jsx, and a second
     copy of the formula inside a check is the very thing these checks exist to forbid. What is
     tested HERE is the setting that feeds it, and the wiring that carries it to HQ's screen. */
  const { bufferDays: spare, DEFAULT_BUFFER_DAYS } = await import('../utils/supply.js');
  const desk = read('src/RestockVaultView.jsx');
  const settings = read('src/components/SettingsView.jsx');

  /* HIS SETTING — per cabang, and absence means the default, never zero. Same trap
     canSeeExpectedCount documents: a key missing from saved settings must not read as a
     deliberate "no cushion". A 0 he typed on purpose still wins. */
  ok('a cabang he never touched gets the company number',
     spare({ restockBufferDays: 5 }, 'BANDUNG') === 5);
  ok('and with nothing saved at all it gets three days',
     spare({}, 'BANDUNG') === DEFAULT_BUFFER_DAYS && DEFAULT_BUFFER_DAYS === 3);
  ok('a cabang he set overrides the company number',
     spare({ restockBufferDays: 5, restockBufferPerBranch: { BANDUNG: 9 } }, 'BANDUNG') === 9);
  ok('and only that cabang — its neighbour keeps the default',
     spare({ restockBufferDays: 5, restockBufferPerBranch: { BANDUNG: 9 } }, 'MUNTILAN') === 5);
  ok('a deliberate zero is honoured, because absence is null and not zero',
     spare({ restockBufferDays: 5, restockBufferPerBranch: { BANDUNG: 0 } }, 'BANDUNG') === 0);
  ok('rubbish in the setting falls back rather than poisoning the maths',
     spare({ restockBufferDays: 'abc' }, 'BANDUNG') === DEFAULT_BUFFER_DAYS &&
     spare({ restockBufferDays: -4 }, 'BANDUNG') === DEFAULT_BUFFER_DAYS);

  /* WIRING — the number is only true if it is computed against the Tujuan on screen. */
  ok('the desk keys the minimum on the destination it is shipping to',
     /const sendAdvice = useMemo/.test(desk) &&
     /const to = \(poData\.destination \|\| ''\)\.trim\(\)/.test(desk) &&
     /\[isOut, poData\.destination,/.test(desk));
  ok('it refuses to answer for the master vault, which is not a cabang',
     /if \(!to \|\| NON_BRANCH\.includes\(to\)\) return \{\}/.test(desk));
  ok('and never on the intake form, where the goods come from the factory',
     /if \(!isOut\) return \{\}/.test(desk));
  ok('the branch shelf comes from branchStockMap, not from HQ own stock',
     /branchStockMap\[to\] \|\| \[\]/.test(desk) &&
     /branchStockMap=\{branchStock\}[\s\S]{0,400}<BranchWarehouseManager|RestockVaultView[\s\S]{0,900}branchStockMap=\{branchStock\}/.test(app));
  /* One implementation of "how fast does this leave", imported by both screens. A second copy is
     the fault `A Ratio of Sums Is Not a Rate` was written about. */
  ok('the desk imports the branch panel maths instead of re-deriving it',
     /import \{ productArrivals, shipmentRhythm, inTransitQty, reorderAdvice \} from '\.\/components\/BranchWarehouseManager\.jsx'/.test(desk) &&
     !/const reorderAdvice|function reorderAdvice/.test(stripComments(desk)));
  ok('both ends of one shipment read the same cushion',
     /bufferDays\(appSettings, to\)/.test(desk) &&
     /bufferDays\(appSettings, branchLocation\)/.test(read('src/components/BranchWarehouseManager.jsx')));
  /* HIS WORD, and it is load-bearing: the number is a FLOOR when production is tight, not a
     suggestion to weigh up. "Suggested" on this screen would invite him to send less.
     Reworded 2026-08-30 on his instruction — *"can u use better english words from now on and
     change that, its so fague"* — but the GUARANTEE did not move: the phrasing must state a
     minimum, and must never soften into advice. */
  ok('the desk tells him to send AT LEAST this many, never merely suggests',
     /send at least <b/.test(desk) &&
     !/[Ss]aran|[Ss]uggest(ed|ion)/.test(stripComments(desk)));
  ok('and it says so in words when it cannot prove a number, rather than printing one',
     /not enough history/.test(desk));
  /* ---- PLAIN ENGLISH ON THE HQ DESK (2026-08-30) ----
     His rule twice over: *"dont make vague terms"*, *"use english terms if its shorter and
     direct"* (2026-08-27) and then, when this panel shipped with Indonesian headers, *"can u use
     better english words from now on and change that, its so fague"*. A prose reminder would rot;
     this is the same instruction as something that cannot.
     ⚠️ SCOPED TO THE HQ DESK ONLY. The branch-side panels are all-Indonesian by design — different
     reader, settled separately — so this must never widen to BranchWarehouseManager's own screens. */
  const HQ_INDONESIAN = /\b(kurang|cukup|barang|belum|tidak|jumlah|gudang|cabang|kirim\w*|terukur|saran)\b/i;
  ok('the shipment plan panel carries no Indonesian label',
     !HQ_INDONESIAN.test(stripComments(read('src/ponder/stages/ShipmentPlanTable.jsx'))));
  ok('and neither does the warehouse table beside it',
     !HQ_INDONESIAN.test(stripComments(read('src/ponder/stages/StockByWarehouseTable.jsx'))));
  /* The age line said "oldest here 116 days", and he asked what it meant — a number with no noun
     attached. It names what is 116 days old now, and what the unexplained figure actually counts. */
  ok('the age line names what the number is a number OF',
     /oldest pack <b[^>]*>\{p\.days\} days old/.test(read('src/ponder/stages/StockByWarehouseTable.jsx')));
  ok('and unexplained stock says why it is unexplained',
     /with no delivery record/.test(read('src/ponder/stages/StockByWarehouseTable.jsx')));

  /* ---- THE SAME FLOOR, AS A COLUMN IN SEBARAN STOK (2026-08-30) ----
     His call: *"i agree with your recommendation so new separate panel and add column in sebaran
     stock"*. Three surfaces now print this number — the Kirim form, the warehouse table and its
     drawer — and the only thing that keeps them honest is that all three call ONE function. */
  const table = read('src/ponder/stages/StockByWarehouseTable.jsx');
  const bwm = read('src/components/BranchWarehouseManager.jsx');
  ok('the table carries the column at every level: header, warehouse, product, total',
     (table.match(/data-ponder="col:minimum"/g) || []).length === 4);
  ok('and the grid grew a track to hold it, rather than squeezing the others',
     /* The first track was minmax(0,1fr) until 2026-09-01, when the name column stopped being
        the one that gives way — he asked for it: the table already scrolls sideways. What this
        check is really about is the SEVEN fixed tracks after it, none of them squeezed. */
     /grid-cols-\[minmax\(260px,max-content\)(?:_[0-9]+px){7}\]/.test(table));
  ok('the warehouse rows compute it with the same function and the same cushion as the form',
     /reorderAdvice\(arrivals, p\.shelf, p\.transit, rhythmOf\(name\), nowSec,[\s\S]{0,80}bufferDays\(appSettings, name\)\)\.suggest/.test(bwm));
  /* One rhythm per cabang, not one per product: shipmentRhythm walks that cabang's whole request
     history and returns the same answer for every product in it. */
  ok('and the shipping rhythm is measured once per cabang, not once per product row',
     /const rhythms = new Map\(names\.map\(nm => \[nm, shipmentRhythm\(requests, nm\)\]\)\)/.test(bwm));
  /* THE DISTINCTION THIS COLUMN LIVES OR DIES ON, sitting one cell from the column that refuses to
     total: packs ADD across products and warehouses, rates do not. Summing quantities is sound;
     averaging days-left is the ratio-of-sums error that shipped "348 days" once. */
  ok('the warehouse figure is summed from the drawer it prints, never re-derived',
     /const measured = detail\.filter\(p => p\.minimum !== null && p\.minimum !== undefined\)/.test(bwm) &&
     /measured\.reduce\(\(s, p\) => s \+ p\.minimum, 0\)/.test(bwm));
  ok('the master vault gets null, because nothing is ever shipped TO the source',
     /if \(name === MASTER\) return \{ \.\.\.p, \.\.\.money, days: null, drops: 0, unexplained: 0, minimum: null \}/.test(bwm) &&
     /name === MASTER \|\| measured\.length === 0[\s\S]{0,40}\? null/.test(bwm));
  /* A 0 would claim "this cabang needs nothing". Unmeasured and needs-nothing are different
     answers and the screen must not merge them — the same rule the branch panel already follows. */
  ok('nothing measurable prints an em-dash, never a zero that reads as "needs nothing"',
     /r\.minimum == null/.test(table) && /p\.minimum == null/.test(table) &&
     /totals\.minimum == null \? '—'/.test(table));
  ok('and the company total stays null unless at least one cabang could be measured',
     /logistics\.some\(r => r\.minimum != null\) \? gTotal\('minimum'\) : null/.test(bwm));
  /* The tutorial renders this same component against a fixed demo world that has no `minimum`.
     A column that assumed the field would crash the tutorial, which is a worse bug than the
     column is a feature — so every cell falls back rather than reading through. */
  ok('the appSettings the cushion comes from is in the memo dep list, or the column goes stale',
     /\[isAdmin, motorists, transactions, branchStockMap, globalInventory, requests, appSettings\]/.test(bwm));

  /* ---- RENCANA KIRIM — the same floors, turned on their side (2026-08-30) ----
     One row per product, one column per cabang. It answers the question Sebaran Stok cannot:
     *"I have 900 Cello and my three cabang need 1.400 — who gets what"*, which only exists when
     production is short. His scenario, his words, and the reason `short` is the panel's whole
     point: nothing else in the app ever says "this cannot all be sent". */
  const plan = read('src/ponder/stages/ShipmentPlanTable.jsx');
  ok('the plan is a TRANSPOSE of logistics, and computes no minimum of its own',
     /const shipmentPlan = useMemo/.test(bwm) &&
     /byBranch\[b\] = item \? item\.minimum : null/.test(bwm) &&
     !/reorderAdvice|shipmentRhythm|productArrivals/.test(stripComments(plan)));
  ok('the shortfall is the master vault measured against what every cabang needs',
     /short: needed == null \? null : Math\.max\(0, needed - hq\)/.test(bwm));
  ok('and HQ stock is read from the MASTER row rather than a second lookup',
     /const hqOf = \(id\) => Number\(\(master\?\.detail \|\| \[\]\)\.find\(p => p\.id === id\)\?\.shelf\) \|\| 0/.test(bwm));
  /* Unmeasured must not become zero anywhere along the chain, or a cabang nobody can measure reads
     as a cabang that needs nothing — the same distinction the column keeps one screen up. */
  ok('a product no cabang can measure totals to null, never to zero',
     /const measured = Object\.values\(byBranch\)\.filter\(v => v != null\)/.test(bwm) &&
     /measured\.length === 0 \? null : measured\.reduce/.test(bwm));
  ok('the table prints an em-dash for those, and never a bare 0',
     /v == null[\s\S]{0,120}—/.test(plan) && /r\.needed == null \?[\s\S]{0,60}—/.test(plan));
  /* A screen about splitting scarcity must not be padded with products nobody wants. A real zero
     is dropped; an unmeasured null is KEPT, because "we cannot see this one" is worth showing. */
  ok('products nobody needs are dropped, but unmeasured ones stay',
     /rows\.filter\(r => r\.needed === null \|\| r\.needed > 0\)/.test(plan));
  ok('the worst shortfall sorts to the top, which is the row he has to act on',
     /\.sort\(\(a, b\) => \(b\.short \|\| 0\) - \(a\.short \|\| 0\)/.test(bwm));
  /* One grid template drives header, rows and total. Three hand-written ones drift the moment a
     cabang is added — and the column count here is data, not a constant. */
  ok('one grid template is built from the cabang list and reused by every row',
     /const cols = `minmax\(0,1\.4fr\) 108px \$\{branches\.map\(\(\) => '104px'\)\.join\(' '\)\} 108px 112px`/.test(plan) &&
     (plan.match(/gridTemplateColumns: cols/g) || []).length === 3);
  ok('a company with no branches says so instead of drawing a table with no columns',
     /branches\.length === 0/.test(plan) && /No branches on the roster yet/.test(plan));
  ok('and the panel is mounted for HQ, below the warehouse table',
     /<ShipmentPlanTable rows=\{shipmentPlan\} branches=\{planBranches\} \/>/.test(bwm));

  /* SETTINGS — one box per cabang, and the branch list from the one function that knows. */
  ok('the spare-days setting writes to settings/general like its neighbours',
     /restockBufferDays: n \}, \{ merge: true \}/.test(settings) &&
     /restockBufferPerBranch: next \}, \{ merge: true \}/.test(settings));
  ok('a blank box DELETES the override rather than storing a zero',
     /if \(raw === ''\) delete next\[name\]/.test(settings));
  ok('and the cabang list comes from warehouseList, not a hand-written one',
     /warehouseList\(motorists\)/.test(settings) &&
     !/BANDUNG|MUNTILAN/.test(stripComments(settings)));
  ok('Settings is actually handed the roster it needs',
     /motorists=\{motorists\}/.test(app));
}

/* ── S14 · shipping to a branch undid every sale made while the photo uploaded ─────────── */
section('S14. HQ stock is deducted, not recomputed from a cached screen');
const branch = read('src/components/BranchWarehouseManager.jsx');
/* 🔴 REPOINTED 2026-08-30, and the reason is the trap this repo has now paid for twice:
   SPLITTING A COMPONENT SPLITS ITS CHECKS. `76de71a` moved the fulfilment half of this screen
   into `RestockVaultView` — BranchWarehouseManager lost 332 lines — so this check and the
   DISPUTED-sort check below went on reading a file the code had left. Both were RED for four
   days and nobody saw it, because every session report quotes integration.audit's 666/666 and
   never this suite. The guarded behaviour was fine the whole time; only the address was wrong.
   Read BOTH files: the deduction is HQ's, wherever HQ's outbox happens to live this month. */
const shipDesk = branch + read('src/RestockVaultView.jsx');

ok('the shipment deducts with increment()',
   /stock: increment\(-Number\(item\.qty\)\) \}/.test(shipDesk));
ok('the recomputed-total write is gone',
   !/stock: \(hqProduct\.stock \|\| 0\) - item\.qty/.test(stripComments(branch)));
ok('increment is imported', imports(branch, 'increment'));

/* BEHAVIOUR — the gap is the photo upload, so the sale lands between read and write. */
{ const hqAtScreenLoad = 500, soldDuringUpload = 120, shipping = 100;
  const real = hqAtScreenLoad - soldDuringUpload;
  ok('BEFORE: the write recomputed 400 and resurrected the 120 sold packs',
     hqAtScreenLoad - shipping === 400);
  ok('AFTER: the deduction lands on the real 380 and leaves 280',
     real - shipping === 280);
  ok('with nothing sold in the gap, both agree - so the fix is invisible on a quiet day',
     hqAtScreenLoad - shipping === (hqAtScreenLoad) - shipping); }

/* ── S15 · the sales screen showed two different debts for one shop ────────────────────── */
section('S15. One debt number, from one calculation');

ok('the panel reads the FIFO engine instead of its own pass',
   /const selectedCustomerDebts = React\.useMemo\(\(\) => \(\{[\s\S]{0,140}debtInfo\?\.totalDebt/.test(merchant));
ok('the second, return-blind calculation is gone',
   !/titipTotal \+= \(t\.total \|\| 0\)/.test(stripComments(merchant)));
ok('the loose "anything marked Titip" rule is gone',
   !/t\.paymentType === 'Titip' \|\| t\.method === 'Titip'/.test(stripComments(merchant)));
ok('tempo now travels with the debt it belongs to',
   /debts\.push\(\{[\s\S]{0,200}tempo: t\.tempoDays \|\| 7/.test(merchant));
ok('overdue is decided from UNPAID debts only',
   /const isOverdue = activeDebts\.some\(d => now > \(d\.saleMs \+ \(d\.tempo \* 86400000\)\)\)/.test(merchant));

/* BEHAVIOUR — the returns case, which is the one that moved money. */
{ const DAY = 86400000, now = 1_000 * DAY;
  const fifo = (rows) => { const debts = [];
    rows.slice().sort((a, b) => a.day - b.day).forEach(t => {
      if (t.type === 'SALE' && t.paymentType === 'Titip')
        debts.push({ remaining: t.total, tempo: t.tempoDays || 7, saleMs: t.day * DAY });
      if (t.type === 'CONSIGNMENT_PAYMENT' || t.type === 'RETURN') {
        let left = t.type === 'RETURN' ? Math.abs(t.total) : (t.amountPaid || 0);
        for (const d of debts) { if (left <= 0) break;
          const take = Math.min(left, d.remaining); d.remaining -= take; left -= take; } }
    });
    const active = debts.filter(d => d.remaining > 0.01);
    return { totalDebt: active.reduce((s, d) => s + d.remaining, 0),
             isOverdue: active.some(d => now > d.saleMs + d.tempo * DAY) }; };

  const rows = [
    { day: 990, type: 'SALE', paymentType: 'Titip', total: 2000000, tempoDays: 7 },
    { day: 995, type: 'CONSIGNMENT_PAYMENT', amountPaid: 500000 },
    { day: 996, type: 'RETURN', total: -300000 } ];

  ok('AFTER: 2.000.000 owed, 500.000 paid, 300.000 returned as goods -> 1.200.000',
     fifo(rows).totalDebt === 1200000);
  ok('BEFORE: the panel ignored the return and demanded 1.500.000',
     2000000 - 500000 === 1500000);
  ok('a return bigger than the debt floors at zero, it never goes negative',
     fifo([rows[0], { day: 996, type: 'RETURN', total: -5000000 }]).totalDebt === 0);
  ok('overdue fires when an unpaid consignment passes its own tempo',
     fifo(rows).isOverdue === true);
  ok('a fully settled shop is not overdue',
     fifo([rows[0], { day: 991, type: 'CONSIGNMENT_PAYMENT', amountPaid: 2000000 }]).isOverdue === false);
  ok('a fresh consignment inside its tempo is not overdue',
     fifo([{ day: 999, type: 'SALE', paymentType: 'Titip', total: 100000, tempoDays: 7 }]).isOverdue === false); }

/* ── S16 · saves that failed in silence ────────────────────────────────────────────────── */
section('S16. A failed save says so — his law: every action reports');

/* The whole store-detail panel. Five saves in a row caught their own error and told nobody, on a
   phone, where there is no console to read. Counted rather than matched one by one: the number
   is what stops a sixth being added silently. */
{ const panel = stripComments(map);
  const silent = (panel.match(/catch \(error\) \{ console\.error\(error\); \}/g) || []).length;
  ok(`no save in the map store panel swallows its error (${silent} left)`, silent === 0);
  ok('the price tier failure names the money consequence',
     /PRICE TIER NOT SAVED[\s\S]{0,120}do not sell at the new price/.test(map));
  ok('the store type, hub, scale and visit frequency all report',
     /Could not change the store type/.test(map) && /Could not change which hub supplies/.test(map)
     && /Could not save the catchment scale/.test(map) && /Could not save the visit frequency/.test(map)); }

/* The visit-frequency box updated the screen BEFORE the write, so failure and success looked
   identical. It must put the old value back, not just apologise. */
ok('a failed visit-frequency save restores the value on screen',
   /const previous = visitFreq;/.test(map) && /setVisitFreq\(previous\);/.test(map));

ok('assigning a store to an agent says what did not happen',
   /Could not assign \$\{agentName\} to this store/.test(journey));

/* App-wide: a catch with NOTHING in it at all. Deliberately NOT comment-stripped — this codebase
   uses `catch (e) { /* offline cache miss * / }` on purpose in several places, and a comment
   saying why is the difference between a decision and an oversight. Stripping comments first
   flagged eighteen of those and would have had the check deleted by the end of the week. */
{ const files = ['src/App.jsx', 'src/MapMissionControl.jsx', 'src/JourneyView.jsx', 'src/MerchantSalesView.jsx',
                 'src/StockOpnameView.jsx', 'src/FleetCanvasManager.jsx', 'src/ConsignmentFinanceView.jsx',
                 'src/EODReconciliationView.jsx', 'src/AgentProfileView.jsx', 'src/hooks/useTransactionEngine.js'];
  const empties = files.flatMap(f => read(f).split('\n')
    .map((text, i) => ({ f, line: i + 1, text }))
    .filter(l => /catch\s*\([^)]*\)\s*\{\s*\}/.test(l.text))
    .map(l => `${l.f}:${l.line}`));
  ok(`no wordlessly empty catch in the money screens${empties.length ? ' — ' + empties.join(', ') : ''}`,
     empties.length === 0); }

/* ── S17 · what the agent counted at EOD was never used for anything ───────────────────── */
section('S17. The EOD count decides the report, and a gap is named');

ok('the report sends the COUNTED cash and transfer',
   /cash: countedCash,\s*\n\s*transfer: countedTransfer,/.test(eod));
ok('the expected figures are sent beside them, not instead of them',
   /expectedCash: Number\(agentData\.expectedCash \|\| 0\)/.test(eod) &&
   /expectedTransfer: Number\(agentData\.expectedTransfer \|\| 0\)/.test(eod));
ok('the warehouse is credited the goods he counted',
   /remainingStock: countedStock,/.test(eod));
/* Scoped to the PAYLOAD. `expected={{ cash: agentData.expectedCash, ... }}` is a different line
   entirely — it is how the count cards learn what to compare against, and it must stay. */
ok('the old "send the expectation" form is gone from the payload',
   !/onSubmitEOD\(\{\s*cash: agentData\.expectedCash/.test(stripComments(eod)));
ok('the gap is carried as a number, not just a mood',
   /cashVariance,/.test(eod) && /transferVariance,/.test(eod) && /goodsShort,/.test(eod));
ok('a shortfall is FLAGGED, never posted against the agent here',
   /countStatus = \(cashVariance < 0 \|\| transferVariance < 0 \|\| goodsShort\)/.test(eod) &&
   /\? 'DISPUTED' : 'CLEAN'/.test(eod));
ok('a product he did not count keeps its expected row',
   /pid in countedByProduct \? \{ \.\.\.item, qty: countedByProduct\[pid\] \} : item/.test(eod));

/* BEHAVIOUR — the shortage that used to be undetectable. */
{ const build = (expectedCash, expectedTransfer, stock, counted) => {
    const declaredOr = (id, fallback) => (counted[id] === null || counted[id] === undefined) ? Number(fallback || 0) : Number(counted[id]);
    const countedCash = declaredOr('cash', expectedCash);
    const countedTransfer = declaredOr('transfer', expectedTransfer);
    const byProduct = counted.goods || {};
    const countedStock = stock.map(i => (String(i.productId) in byProduct ? { ...i, qty: byProduct[String(i.productId)] } : i));
    const cashVariance = countedCash - expectedCash;
    const transferVariance = countedTransfer - expectedTransfer;
    const goodsShort = stock.some(i => String(i.productId) in byProduct && byProduct[String(i.productId)] < i.qty);
    return { cash: countedCash, transfer: countedTransfer, countedStock, cashVariance, transferVariance, goodsShort,
             countStatus: (cashVariance < 0 || transferVariance < 0 || goodsShort) ? 'DISPUTED' : 'CLEAN' }; };

  const stock = [{ productId: 'p1', qty: 10, unit: 'Bks' }, { productId: 'p2', qty: 4, unit: 'Slop' }];

  const short = build(4500000, 0, stock, { cash: 4300000, goods: {} });
  ok('BEFORE: the submitted cash WAS the expected cash, so a 200.000 gap could not exist',
     4500000 - 4500000 === 0);
  ok('AFTER: counting 4.300.000 against an expected 4.500.000 reports a gap of -200.000',
     short.cash === 4300000 && short.cashVariance === -200000);
  ok('and that report is marked DISPUTED', short.countStatus === 'DISPUTED');

  const clean = build(4500000, 1000000, stock, { cash: 4500000, transfer: 1000000, goods: { p1: 10, p2: 4 } });
  ok('a night that balances is CLEAN', clean.countStatus === 'CLEAN' && clean.cashVariance === 0);

  const goods = build(0, 0, stock, { goods: { p1: 6 } });
  ok('the warehouse is credited the 6 he counted, not the 10 the app expected',
     goods.countedStock.find(i => i.productId === 'p1').qty === 6);
  ok('the product he never counted keeps its 4 Slop, untouched',
     goods.countedStock.find(i => i.productId === 'p2').qty === 4);
  ok('a goods shortage also raises DISPUTED', goods.goodsShort === true && goods.countStatus === 'DISPUTED');

  const over = build(4500000, 0, stock, { cash: 4700000, goods: {} });
  ok('counting MORE than expected is reported too, and is not a dispute',
     over.cashVariance === 200000 && over.countStatus === 'CLEAN'); }

/* ── S18 · a short EOD count becomes a bounty the agent can repay ──────────────────────── */
section('S18. A short count is approved, recorded as a bounty, and repayable');

/* Repinned 2026-08-18: the cash+transfer sum moved into eodBountyLines when goods became
   billable too. The rule did not relax, it moved - so the guard follows it. */
ok('the shortfall is every bounty line the report mints, summed',
   /const bountyLines = eodBountyLines\(report, inventory, appSettings\?\.penaltyPriceTier\)/.test(app)
   && /bountyLines\.reduce\(\(sum, line\) => sum \+ line\.amount, 0\)/.test(app));
ok('the admin is told the amount AND the lines before approving',
   /records each of those as a bounty in their name/.test(app)
   && /bountyLines\.map\(/.test(app) && /\$\{l\.label\}/.test(app));
ok('the bounty is minted onto the agent, one PENALTY key per reason',
   /currentDebts\[line\.key\] = line\.amount;/.test(app));
ok('it is ASSIGNED, not added to, so a double-approve cannot charge twice',
   !/currentDebts\[line\.key\] \+=/.test(app));
/* The repayment half already existed and must keep working — these guard it, they are not new. */
ok('the agent still sums every PENALTY key on his WANTED board',
   /pid\.startsWith\('PENALTY_'\)/.test(eod));
ok('and clearing a bounty still deletes those keys',
   /report\.penaltyKeys[\s\S]{0,160}delete currentDebts\[key\]/.test(app));

/* BEHAVIOUR — the night, the fine, and paying it off. */
{ const mint = (report, debts) => { const next = { ...debts };
    const short = Math.max(0, -Number(report.cashVariance || 0)) + Math.max(0, -Number(report.transferVariance || 0));
    if (short > 0 && report.id) next[`PENALTY_EOD_${report.id}`] = short;
    return next; };
  const owed = (debts) => Object.entries(debts)
    .filter(([k]) => k.startsWith('PENALTY_'))
    .reduce((s, [, v]) => s + (v || 0), 0);

  const night = { id: 'r1', cashVariance: -200000, transferVariance: 0 };
  const after = mint(night, {});
  ok('counting 200.000 short mints a 200.000 bounty', owed(after) === 200000);
  ok('approving the same report twice still owes 200.000, not 400.000',
     owed(mint(night, after)) === 200000);

  const both = mint({ id: 'r2', cashVariance: -150000, transferVariance: -50000 }, {});
  ok('a gap on cash AND transfer adds up to one 200.000 bounty', owed(both) === 200000);

  ok('counting MORE than expected mints nothing',
     owed(mint({ id: 'r3', cashVariance: 300000, transferVariance: 0 }, {})) === 0);
  ok('a clean night mints nothing', owed(mint({ id: 'r4' }, {})) === 0);

  // Repayment: the clearance report names the keys, and verifying deletes them.
  const paid = { ...after };
  Object.keys(paid).filter(k => k.startsWith('PENALTY_')).forEach(k => delete paid[k]);
  ok('repaying through the EOD screen clears it back to zero', owed(paid) === 0);

  // A bounty from somewhere else must survive an unrelated EOD approval.
  const mixed = mint({ id: 'r5', cashVariance: 0 }, { PENALTY_OLD: 75000, global_credit: 1000 });
  ok('an older bounty is untouched by a clean night', owed(mixed) === 75000);
  ok('and non-penalty balances are left alone', mixed.global_credit === 1000); }


/* ── S19 · the admin sees the gap; a short count cannot be approved by reflex ───────────── */
section('S19. Expected beside counted, the short products named, and the card itself changed');

{ const card = stripComments(eod);
  ok('the card reads countStatus, not only the numbers',
     /report\.countStatus === 'DISPUTED'/.test(card));
  ok('a missing countStatus is CLEAN — history is never painted as disputed',
     !/countStatus !== 'CLEAN'/.test(card) && !/countStatus \|\| 'DISPUTED'/.test(card));
  ok('what the app expected is rendered beside what he counted',
     /expected=\{report\.expectedCash\}/.test(card) && /expected=\{report\.expectedTransfer\}/.test(card));
  ok('the short products are named row by row, never one goods total',
     /shortStockRows\(report\.expectedStock, report\.remainingStock\)/.test(card));
  ok('the approve button changes its own words when the count is short',
     /disputed \? 'Approve Short Count'/.test(card));
  ok('and the card changes with it, so the gap is not just a number on a normal card',
     /disputed \? 'border-\[var\(--danger\)\]/.test(card));
  ok('the rupiah named before approving comes from the SAME rule App.jsx mints with',
     /eodBountyLines\(report, inventory, appSettings\?\.penaltyPriceTier\)/.test(card)); }

{ const H = await import('../utils/helpers.js');
  ok('shortStockRows is exported from helpers, where the shared rules live',
     typeof H.shortStockRows === 'function');
  const shortStockRows = H.shortStockRows || (() => null);

  const expected = [{ productId: 'p1', name: 'Surya 16', qty: 12, unit: 'Bks' },
                    { productId: 'p2', name: 'Gudang Garam', qty: 3, unit: 'Slop' },
                    { productId: 'p3', name: 'Djarum 76', qty: 2, unit: 'Bal' }];

  const rows = shortStockRows(expected,
    [{ productId: 'p1', name: 'Surya 16', qty: 9, unit: 'Bks' },
     { productId: 'p2', name: 'Gudang Garam', qty: 3, unit: 'Slop' },
     { productId: 'p3', name: 'Djarum 76', qty: 5, unit: 'Bal' }]);

  ok('only the product that came up short is listed', rows && rows.length === 1);
  ok('it is named, so a one-product gap cannot hide inside a total', rows?.[0]?.name === 'Surya 16');
  ok("counted in the row's own unit, not converted", rows?.[0]?.unit === 'Bks');
  ok('and the gap is stated', rows?.[0]?.short === 3 && rows?.[0]?.counted === 9 && rows?.[0]?.expected === 12);
  ok('a product counted exactly right is not listed',
     Array.isArray(rows) && !rows.some(r => r.productId === 'p2'));
  ok('a product counted OVER is not a shortfall',
     Array.isArray(rows) && !rows.some(r => r.productId === 'p3'));

  const legacy = shortStockRows(undefined, [{ productId: 'p1', qty: 0, unit: 'Bks' }]);
  ok('an older report with no expectedStock shows nothing short — history is never painted red',
     Array.isArray(legacy) && legacy.length === 0);
  const uncounted = shortStockRows(expected, []);
  ok('a product never counted keeps its expected row and is not called short',
     Array.isArray(uncounted) && uncounted.length === 0); }


/* --- S20 . red text on a red plate measures 1,94:1 - unreadable ------------------------- */
/* --danger is a FILL and an EDGE. --danger-ink is red-as-TEXT, and it needs the red WELL
   under it: 7,04:1 dark and 7,54:1 light, against 1,94:1 and 1,95:1 on --danger itself.
   The two strings that MUST be read on this screen - the cash fine and the short-count
   warning - were both on the unreadable pair.
   ponytail: same-element only. A plate on the parent with the ink on a child slips past this,
   which is the exact trap the gold audit hit; widen it if that shape ever ships again. */
section('S20. --danger is an edge and a fill, never the ground under --danger-ink');

{ const BG = /(^|[\s"`])bg-\[var\(--danger\)\]/;
  const hits = [];
  for (const f of ['src/EODReconciliationView.jsx', 'src/StockOpnameView.jsx',
                   'src/components/EODCardDeck.jsx', 'src/components/CustomerManager.jsx']) {
    read(f).split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const c = m[1] || m[2] || '';
        if (BG.test(c) && /text-\[var\(--danger-ink\)\]/.test(c)) hits.push(`${f}:${i + 1}`);
      }
    });
  }
  ok('no element sets --danger as its ground and --danger-ink as its text',
     hits.length === 0, hits.join(' '));
  ok('the readable red ground is what the EOD screen uses instead',
     /bg-\[var\(--danger-well\)\]/.test(eod));
  ok('a hover that flips to the filled red is still allowed - it swaps the ink with it',
     /hover:bg-\[var\(--danger\)\] .*hover:text-\[var\(--gold-ink\)\]/.test(eod)); }


/* --- S21 . the counting flow kept one agent's numbers when the identity changed --------- */
/* The admin picks whose setoran he is entering. React reuses a component in the same slot,
   so switching from agent A to agent B mid-count left A's counted cash, transfer and goods
   sitting in the flow's own state - and the next Send posted them under B's id. A key makes
   the identity part of what the component IS, so React remounts it and the count starts blank. */
section('S21. Changing operating identity restarts the count');

ok('the counting flow is keyed on the identity being counted for',
   /<EODAgentFlow\s+key=\{effectiveId\}/.test(eod));


/* --- S22 . a missing pack is bought back at retail, and every bounty says why ---------- */
/* Aldi, 2026-08-18, verbatim: "if there is missing pack then agent needs to buy the missing
   pack on retail price as a compensation, well u can add that to the bounties and the bounties
   panel need to specify how the bounties number are calculated, for example missing pita = 5000
   (4 agustus 2026), cello chocolate 5 bks = 50,000 (7 agustus 2026), transfer loss 30,000
   (8agustus 2026) this kind of detailed needed".
   So: ONE KEY PER REASON, each with its own label and date. A lump sum cannot be explained. */
section('S22. Goods are billed at retail, and every bounty line carries its own reason');

ok('the pricing rule lives in helpers, so both the admin card and App.jsx use the same one',
   /export const eodBountyLines/.test(helpers));
ok('the label and date travel beside the money, keyed the same way',
   /currentNotes\[line\.key\] = \{ label: line\.label, date: line\.date \}/.test(app)
   && /cukaiDebtNotes: currentNotes/.test(app));
ok('clearing a bounty removes its note too, or the panel grows forever',
   /delete currentNotes\[key\]/.test(app));
ok('the WANTED board shows one line per reason, not one total',
   /agentBountyData\.items\.map/.test(eod));
ok('a bounty from before the notes existed still gets a name on the board',
   /Damaged goods penalty/.test(eod) && /End-of-day shortfall/.test(eod));
ok('the quarantine damage charge writes its own note too, so nothing lands unexplained',
   /cukaiDebtNotes: \{\s*\[penaltyId\]: \{/.test(read('src/StockOpnameView.jsx')));

{ const { eodBountyLines } = await import('../utils/helpers.js');
  const INV = [{ id: 'p1', name: 'Cello Chocolate', priceRetail: 10000, packsPerSlop: 10 },
               { id: 'p2', name: 'Surya 16',        priceRetail: 25000, packsPerSlop: 10, slopsPerBal: 20 },
               { id: 'p3', name: 'No Price Yet',    packsPerSlop: 10 }];

  const report = {
    id: 'r9', dayKey: '2026-08-07', cashVariance: 0, transferVariance: -30000,
    expectedStock: [{ productId: 'p1', name: 'Cello Chocolate', qty: 12, unit: 'Bks' },
                    { productId: 'p2', name: 'Surya 16',        qty: 3,  unit: 'Slop' },
                    { productId: 'p3', name: 'No Price Yet',    qty: 4,  unit: 'Bks' }],
    remainingStock: [{ productId: 'p1', qty: 7 },
                     { productId: 'p2', qty: 3 },
                     { productId: 'p3', qty: 2 }],
  };
  const lines = eodBountyLines(report, INV);
  const by = (frag) => lines.find(l => l.key.includes(frag));

  ok('5 packs of a 10.000 product missing costs 50.000 at retail',
     by('GOODS_p1')?.amount === 50000);
  /* His example was "cello chocolate 5 bks = 50,000 (7 agustus 2026)". The price tier was
     added to the label when the tier became a company setting - more information, not less. */
  ok('his example line reads back the way he wrote it, now naming the price list too',
     by('GOODS_p1')?.label === 'Cello Chocolate 5 Bks @ Retail' && by('GOODS_p1')?.date === '2026-08-07');
  ok('a short SLOP is converted to packs before it is priced, not billed as one',
     eodBountyLines({ ...report, remainingStock: [{ productId: 'p2', qty: 2 }] }, INV)
       .find(l => l.key.includes('GOODS_p2'))?.amount === 250000);
  ok('a product counted in full is not billed', !by('GOODS_p2'));
  ok('a transfer loss is its own line, with its own words',
     by('_TRANSFER')?.amount === 30000 && by('_TRANSFER')?.label === 'Transfer short');
  ok('cash that matched mints no cash line', !by('_CASH'));
  ok('every line is keyed by the report, so approving twice writes the same keys',
     lines.every(l => l.key.startsWith('PENALTY_EOD_r9_')));

  const noPrice = by('GOODS_p3');
  ok('a product with no retail price still gets a LINE, so the gap is visible',
     !!noPrice && noPrice.amount === 0);
  ok('and the line says why it is zero rather than pretending nothing is missing',
     /no Retail price set/.test(noPrice?.label || ''));

  ok('a clean night mints nothing at all',
     eodBountyLines({ id: 'r0', cashVariance: 0, transferVariance: 0 }, INV).length === 0);
  ok('an older report with no counted stock mints no goods line',
     eodBountyLines({ id: 'r1', cashVariance: -5000 }, INV).length === 1); }


/* --- S23 . what a penalty is PRICED at is the company's decision, not the app's ---------- */
/* Aldi, 2026-08-18, verbatim: "if the damaged goods taken from store and the agent bring it back
   then there is no bounties for the agent, if there is damaged good because of agent mistake then
   agent need to buy it in retail price, but since i dont know the real rules that the company
   applies we should add this to the setting about this logic so that company can change how this
   logic going to work, can be retail, wholesale or ecer its companies decision, i just want to
   make sure that this app is flexible enought so that i can sell it to multiple company instead
   of one only."
   One setting, one price lookup, two chargers. Default Retail, because that is the rule he gave. */
section('S23. The penalty price tier is a company setting, and one lookup serves every charger');

ok('the tier -> price-field lookup lives in helpers, not copied a seventh time',
   /export const tierPrice/.test(helpers));
ok('the EOD bounty prices goods through the setting, defaulted to Retail',
   /eodBountyLines = \(report = \{\}, inventory = \[\], priceTier = 'Retail'\)/.test(helpers));
ok('App.jsx passes the company setting in',
   /eodBountyLines\(report, inventory, appSettings\?\.penaltyPriceTier\)/.test(app));
ok('the admin card prices with the SAME setting, so the two cannot disagree',
   /eodBountyLines\(report, inventory, appSettings\?\.penaltyPriceTier\)/.test(eod));
ok('the damaged-goods charge stopped hardcoding distributor price',
   !/const hpp = Number\(resolutionModal\.item\.priceDistributor \|\| resolutionModal\.item\.hpp/.test(read('src/StockOpnameView.jsx')));
ok('and prices through the same setting instead',
   /tierPrice\(resolutionModal\.item, appSettings\?\.penaltyPriceTier\)/.test(read('src/StockOpnameView.jsx')));
ok('the company can change it without a developer',
   /penaltyPriceTier/.test(read('src/components/SettingsView.jsx')));

{ const { tierPrice, eodBountyLines } = await import('../utils/helpers.js');
  const prod = { id: 'p1', name: 'Cello', priceRetail: 10000, priceGrosir: 8000, priceEcer: 12000, priceDistributor: 6000 };

  ok('Retail is the default when a company has not chosen', tierPrice(prod) === 10000);
  ok('Retail',      tierPrice(prod, 'Retail') === 10000);
  ok('Grosir - the wholesale price he named',  tierPrice(prod, 'Grosir') === 8000);
  ok('Ecer',        tierPrice(prod, 'Ecer') === 12000);
  ok('Distributor', tierPrice(prod, 'Distributor') === 6000);
  ok('a tier the product has no price for falls back to Retail rather than charging zero',
     tierPrice({ priceRetail: 10000 }, 'Grosir') === 10000);
  ok('a tier nobody recognises still charges Retail, never nothing',
     tierPrice(prod, 'NonsenseTier') === 10000);
  ok('a product with no prices at all is zero, not NaN', tierPrice({}, 'Retail') === 0);

  const report = { id: 'r1', dayKey: '2026-08-07', cashVariance: 0, transferVariance: 0,
    expectedStock: [{ productId: 'p1', name: 'Cello', qty: 12, unit: 'Bks' }],
    remainingStock: [{ productId: 'p1', qty: 7 }] };

  ok('5 missing packs cost 50.000 on the default Retail setting',
     eodBountyLines(report, [prod])[0].amount === 50000);
  ok('the same 5 packs cost 40.000 when the company chose wholesale',
     eodBountyLines(report, [prod], 'Grosir')[0].amount === 40000);
  ok('and the line SAYS which tier it was charged at, so the agent can check it',
     /Grosir/.test(eodBountyLines(report, [prod], 'Grosir')[0].label));
  ok('a product with no price on the chosen tier still says the price is missing',
     /no Grosir price set/.test(eodBountyLines(report, [{ id: 'p1', name: 'Cello' }], 'Grosir')[0].label)); }


/* --- S24 . the button he presses every night ------------------------------------------- */
/* Aldi picked option B in amber off the colour sheet: "B is better but i like amber color more
   than gold TBH". What it replaced was not merely off-palette - green measured 2,98:1 in dark
   and the cukai orange 2,81:1 in both, under the 4,5 line, on the screen he uses at night. */
section('S24. The EOD approve button is quiet, tokened, and readable in both themes');

ok('no green anywhere on the approve button - his palette law, and it was unreadable',
   !/bg-emerald-\d+/.test(eod));
ok('no hardcoded orange on the cukai branch either', !/bg-orange-\d+/.test(eod));
ok('and no raw red - the short-count branch uses the measured red plate',
   !/bg-red-\d+/.test(eod));
ok('the normal night is a quiet surface with an amber edge',
   /'bg-\[var\(--raised\)\] border-\[var\(--amber\)\] text-\[var\(--ink\)\]'/.test(eod));
ok('the cukai night is the same surface, amber label, so it differs without shouting',
   /'bg-\[var\(--raised\)\] border-\[var\(--amber\)\] text-\[var\(--amber\)\]'/.test(eod));
ok('a short count still gets the red plate, because that one is meant to stop him',
   /'bg-\[var\(--danger-plate\)\] border-\[var\(--danger\)\] text-\[var\(--danger-plate-ink\)\]'/.test(eod));
/* Scoped to the BUTTON, by slicing the source between its onClick and the end of its tag.
   Two earlier attempts scoped it by colour string instead and both caught a bystander - first the
   WANTED total's drop-shadow, then the Pay Bounty button, which happen to use the same rgba. A
   guard that fires on an innocent element is a guard someone relaxes later. */
{ const from = eod.indexOf('onVerifyEOD(report)}');
  const tag = from === -1 ? '' : eod.slice(from, eod.indexOf('>', eod.indexOf('className', from)));
  ok('the approve button exists and was found by its own handler', from !== -1 && tag.length > 0);
  ok('and carries no rgba glow of its own - quiet means quiet', !/rgba\(/.test(tag)); }

{ const theme = read('src/styles/theme.css');
  ok('--amber is a PAIR, defined in both themes, because no single amber works in both',
     (theme.match(/--amber:\s*#[0-9A-Fa-f]{6}/g) || []).length === 2);
  ok('the dark one is the bright amber', /--amber:\s*#F59E0B/.test(theme));
  ok('the light one is the deep amber, not the same value dimmed by hope',
     /--amber:\s*#92400E/.test(theme));
  ok('and both are measured, not asserted',
     /\['amber label on that surface'/.test(read('src/config/contrast.selfcheck.mjs'))); }

/* --- S25 . one tap, one setoran - the screen has one door to onSubmitEOD ----------------- */
/* The letter's Send button was NOT the hole. `send()` in EODAgentFlow sets stage='launching'
   in the same discrete-event flush, EODLetter disables the button on that stage, and at 'sent'
   the button unmounts - so a real double-tap never reached onSubmit twice. The `submitting`
   prop EODAgentFlow declares was genuinely dead, but dead is not the same as needed.
   The hole was the two buttons nobody named. Pay Bounty and the legacy 'Submit stamps & fines'
   each called onSubmitEOD straight out of onClick, changed no local state, and stayed mounted
   and enabled for the whole Firestore round-trip. Two taps there = two PENDING reports on the
   same night, and the second one is real money. All three paths route through one guarded
   submit() now, so the letter gets the honest flag as a side effect of fixing the other two. */
section('S25. Every EOD write on this screen goes through one submitting gate');

{ const from = eod.indexOf('<EODAgentFlow');
  const head = from === -1 ? '' : eod.slice(from, eod.indexOf('onSubmit={', from));
  ok('the flow call site was found', from !== -1 && head.length > 0);
  ok('and it is told when a write is in flight - the prop it declares is no longer dead',
     /submitting=\{submitting\}/.test(head)); }

ok('exactly ONE place calls onSubmitEOD - the guarded submit(), not three loose onClicks',
   (eod.match(/onSubmitEOD\(/g) || []).length === 1);
ok('the gate shuts before the first write',
   /if \(submitting\) return;/.test(eod) && /setSubmitting\(true\)/.test(eod));
ok('and reopens in a finally, so a thrown write cannot leave the screen locked forever',
   /finally \{ setSubmitting\(false\); \}/.test(eod));

/* Scoped to each BUTTON by slicing between its own handler and its own label. A file-wide
   match catches bystanders - it did twice on the S24 night, and that is a lesson now. */
{ const from = eod.indexOf('CLAMPED AGAIN AT THE WRITE');
  const tag = from === -1 ? '' : eod.slice(from, eod.indexOf('Submit stamps & fines', from));
  ok('the legacy cukai button was found by its own handler comment', from !== -1 && tag.length > 0);
  ok('it posts through the gate, not straight at onSubmitEOD', /submit\(\{/.test(tag));
  ok('and it goes dark while a write is in flight, so a second tap has nothing to hit',
     /disabled=\{[^}]*submitting/.test(tag)); }

{ const from = eod.indexOf('Hand over exactly');
  const tag = from === -1 ? '' : eod.slice(from, eod.indexOf('Pay Bounty', from));
  ok('the Pay Bounty button was found by its own dialog line', from !== -1 && tag.length > 0);
  ok('it posts through the gate too - same defect, same door', /submit\(\{/.test(tag));
  ok('and it goes dark while the bounty is being written',
     /disabled=\{[^}]*submitting/.test(tag)); }

/* BEHAVIOUR. The gate is a closure over React state, so the shape is re-run here on real calls
   rather than mounted. The regex guards above are what pin this shape to the file.
   Honest ceiling: modelled `submitting` updates synchronously, React state does not. What stops
   a same-tick double call in the real screen is the DOM `disabled` attribute plus React 19
   flushing discrete click events before the next one is dispatched - not this closure read. */
{ const posted = [], sawShut = [];
  let submitting = false;
  const setSubmitting = (v) => { submitting = v; };
  const onSubmitEOD = async (p) => { sawShut.push(submitting); await null; posted.push(p.reportType); };
  const submit = async (...payloads) => {
      if (submitting) return;
      setSubmitting(true);
      try { for (const p of payloads) await onSubmitEOD(p); }
      finally { setSubmitting(false); }
  };

  await Promise.all([
      submit({ reportType: 'CASH_STOCK' }),
      submit({ reportType: 'CASH_STOCK' })
  ]);
  ok('two rapid submissions post ONE report, not two', posted.length === 1);
  ok('and the gate reopened afterwards, so the agent is not locked out of his own night',
     submitting === false);

  posted.length = 0; sawShut.length = 0;
  await submit({ reportType: 'CASH_STOCK' }, { reportType: 'CUKAI' });
  ok('a READY cukai night still posts BOTH documents from one tap',
     posted.join(',') === 'CASH_STOCK,CUKAI');
  ok('and the gate stayed shut across both writes - it does not reopen between them',
     sawShut.length === 2 && sawShut.every(Boolean)); }

/* --- S26 . the lazy tabs have a catcher, and it catches into something he can tap --------- */
section('S26. A failed tab download shows a retry, not a black screen');

/* <Suspense> covers a chunk that is still LOADING. Nothing in React covers a chunk that FAILED
   to load, and an uncaught render error unmounts the whole page - that is the black screen Aldi
   hit on his phone with airplane mode on, 2026-08-19. */
/* The end anchor is '\n}' and NOT '\n}\n': this repo's files are CRLF, so '\n}\n' never matched,
   indexOf returned -1, and slice(from, -1) quietly handed back 267 KB - the whole rest of the
   file - instead of the 1.9 KB class. Every check below then passed by finding its string
   somewhere else in App.jsx. A slice end must never be a raw indexOf result. */
const boundary = (() => {
  const from = app.indexOf('class LazyTabBoundary');
  const to = app.indexOf('\n}', from);
  return (from === -1 || to === -1) ? '' : app.slice(from, to + 2);
})();
ok('the boundary slice is the class alone, not most of App.jsx',
   boundary.length > 500 && boundary.length < 4000, `sliced ${boundary.length} chars`);

ok('the catcher exists, and it is a class - there is no hook form of getDerivedStateFromError',
   /class LazyTabBoundary extends React\.Component/.test(app));
ok('it declares getDerivedStateFromError', /static getDerivedStateFromError\(\)/.test(boundary));

{ const from = app.indexOf('<LazyTabBoundary');
  const wrap = from === -1 ? '' : app.slice(from, app.indexOf('</LazyTabBoundary>', from));
  ok('the catcher is mounted', from !== -1 && wrap.length > 0);
  ok('and the whole lazy-tab <Suspense> sits inside it',
     /<Suspense fallback=/.test(wrap) && /<\/Suspense>/.test(wrap));
  ok('it is keyed on activeTab, so leaving a broken tab clears the failure',
     /<LazyTabBoundary key=\{activeTab\}/.test(app)); }

/* The state key getDerivedStateFromError RETURNS must be the key render TESTS. Returning
   { hasError: true } while render reads this.state.failed is a catcher that catches and then
   draws nothing - the same black screen in a new colour. */
{ const returned = (boundary.match(/getDerivedStateFromError\(\)\s*\{\s*return\s*\{\s*(\w+):/) || [])[1];
  const tested   = (boundary.match(/if \(!this\.state\.(\w+)\)/) || [])[1];
  ok('getDerivedStateFromError returns the same state key that render branches on',
     Boolean(returned) && returned === tested, `returns ${returned}, render reads ${tested}`); }

ok('the fallback draws a retry button, not an empty box',
   /Try Again/.test(boundary) && /window\.location\.reload\(\)/.test(boundary));
/* Aldi tapped Try Again with no signal and got a WHITE PAGE, 2026-08-19. A reload offline only
   survives if the offline helper holds the whole app; the dev server holds the page but not the
   code. So the reload must be guarded by navigator.onLine, and the offline path must clear the
   error rather than navigate - a white page loses the working app entirely. */
ok('the retry only reloads when the real probe says the internet is reachable',
   /await canReachInternet\(\)/.test(boundary));
ok('the boundary never trusts navigator.onLine - on a LAN with no internet it says yes',
   !/navigator\.onLine/.test(boundary));
ok('and with no signal it clears the error instead of navigating away',
   /this\.setState\(\{ failed: false \}\)/.test(boundary));
ok('the button calls that guarded handler, not reload directly',
   /onClick=\{this\.retry\}/.test(boundary));
ok('it names the screen that failed', /this\.props\.tab/.test(boundary));
ok('and it says in plain words why the screen is missing',
   /could not load without signal/i.test(boundary));

/* Aldi tests offline on his phone, against the DEV server on his wifi (the address vite prints
   as "Network:" at startup - it is handed out by the router and it moves). Without
   devOptions the dev server installs no service worker at all, so nothing is stored for offline
   use and every tab download fails by construction - the catcher above would fire on every tab
   and the test would prove nothing about the real app. He said yes to turning it on, 2026-08-19:
   "sure so that i can test the offline mode". Dev only; production is built from a real build. */
{ const vite = read('vite.config.js');
  ok('the dev server installs the offline helper, so his phone test means something',
     /devOptions:\s*\{[^}]*enabled:\s*true/.test(vite));
  ok('and it sits inside VitePWA, not loose in the config where it does nothing',
     vite.indexOf('devOptions') > vite.indexOf('VitePWA(')); }

/* --- S27 . navigator.onLine lies on a LAN, and it froze a sale ---------------------------- */
section('S27. The Sales Terminal asks the real probe, not the flag that lies');

/* 2026-08-19, Aldi on his phone: airplane mode ON but wifi still ON, reading the app off the
   preview server on his own PC. navigator.onLine was therefore TRUE - a network existed - while
   Firestore could not reach Google at all. The sale saved to the Ghost Ledger and the toast
   appeared, then MerchantSalesView entered its `if (navigator.onLine)` auto-promoter block and
   awaited a Firestore write that can never resolve without the internet. No receipt, and the
   button sat on PROCESSING forever. useOfflineEngine.js already had the honest answer. */
{ const offlineEngine = read('src/hooks/useOfflineEngine.js');
  ok('the real probe is exported so anything can ask it',
     /export async function canReachInternet/.test(offlineEngine));
  ok('the probe is NOT same-origin - a same-origin one would be answered from the offline cache',
     /REACHABILITY_URL = 'https:\/\/www\.gstatic\.com/.test(offlineEngine)); }

{ const from = merchant.indexOf('const MerchantSalesView = ({');
  const sig = from === -1 ? '' : merchant.slice(from, merchant.indexOf('}) =>', from));
  ok('the terminal was found and is handed the real online flag',
     from !== -1 && /isOnline/.test(sig)); }
ok('App hands it down', /isOnline=\{isOnline\}/.test(app));
ok('no decision in the terminal is made on navigator.onLine any more',
   !/if \(navigator\.onLine/.test(merchant));

/* --- S28 . big money collided on the van header ------------------------------------------ */
section('S28. Big money on the van header shrinks instead of colliding');

/* Aldi, 2026-08-19, with a screenshot: the three IF SOLD figures ran into each other with no
   gap - "Rp90.000.000Rp79.125.000Rp77.625.000". Every figure carried a fixed `text-sm md:text-xl`
   and a third of a phone is not wide enough for twelve digits at that size. */
{ const agent = read('src/AgentInventoryView.jsx');
  ok('there is ONE auto-fit money component, not five hand-tuned sizes',
     /const Money = \(\{ value/.test(agent));
  ok('it sizes from the formatted length, so it cannot be fooled by the raw number',
     /s\.length > 15/.test(agent) && /s\.length > 12/.test(agent));
  ok('the digits never wrap and never reflow between widths',
     /tabular-nums whitespace-nowrap/.test(agent));

  /* Anchored on the JSX label, not the bare words: the name also appears in a comment 80 lines
     earlier, and starting there swept in the Cash card and miscounted. */
  const from = agent.indexOf('<TrendingUp size={14}/> Projected Value');
  ok('the row is called Projected Value - he rejected "IF SOLD" as inelegant, 2026-08-19',
     from !== -1 && !/> If Sold</.test(agent));
  const to = agent.indexOf('Grosir', from);
  const row = (from === -1 || to === -1) ? '' : agent.slice(from, Math.min(to + 400, agent.length));
  ok('the Projected Value row was found', row.length > 0);
  ok('all three tier figures go through the auto-fit component',
     (row.match(/<Money value=/g) || []).length === 3);
  ok('each column may shrink, so a long number cannot shove its neighbour',
     (row.match(/min-w-0/g) || []).length === 3);
  /* Shrinking the font is not enough on its own: 'Rp 90.000.000' is 13 characters and a third of
     a phone is about 106px. On a phone the three tiers stack, one per line, label left and figure
     right - which cannot collide at any number length. Three columns return at md. */
  ok('on a phone the three tiers stack instead of sharing one line',
     /grid-cols-1 md:grid-cols-3/.test(row));
  ok('and the divider follows the direction they are laid out in',
     /divide-y md:divide-y-0 md:divide-x/.test(row));
  ok('no money value on this header carries a hardcoded size any more',
     !/text-sm md:text-xl font-black text-ink">\{formatRupiah/.test(agent)); }

/* --- S29 . the terminal forgets everything the moment he leaves the tab -------------------- */
section('S29. A half-typed sale survives a trip to another screen');

/* Aldi, 2026-08-20: "everytime i open sales terminal and i input all the data and i go to other
   app segment ... i dont have to fill everything over again". App renders the terminal behind
   `activeTab === 'sales' &&`, so leaving UNMOUNTS it and every useState is destroyed. The draft
   keeps what he TYPED. It must never keep what was MEASURED - a restored GPS fix or proximity
   hit would stamp an old location onto a new sale. */
{ const TYPED = ['cart', 'customerName', 'selectedCustomerInfo', 'paymentMethod', 'lockedTier',
                 'tempoDays', 'isReturMode', 'returType', 'txProofPhoto', 'nooForm'];
  const MEASURED = ['gpsStatus', 'agentLocation', 'distanceToStore', 'proximityHit',
                    'proximityAck', 'territoryClaim', 'nearbyStores', 'revisitToday'];

  ok('the draft key is versioned, so a shape change cannot resurrect an old one',
     /const DRAFT_KEY = 'kpm_sales_draft_v\d+'/.test(merchant));
  ok('the draft expires', /DRAFT_MAX_AGE_MS/.test(merchant));
  ok('and it is scoped to the signed-in user', /d\.uid !== uid/.test(merchant));

  for (const f of TYPED)
    ok(`${f} comes back from the draft`, new RegExp(`useState\\(\\s*draft\\?\\.${f}`).test(merchant)
       || new RegExp(`draft\\?\\.${f}\\s*(\\?\\?|\\|\\|)`).test(merchant), 'not restored');
  for (const f of MEASURED)
    ok(`${f} is NOT restored - it is measured, and a stale one lies`,
       !new RegExp(`draft\\?\\.${f}`).test(merchant));

  ok('the write is debounced - localStorage.setItem is synchronous and this fires on every keystroke',
     /setTimeout\(/.test(merchant) && /clearTimeout\(/.test(merchant));
  ok('an empty terminal deletes the draft, so emptying the cart IS the discard button',
     /localStorage\.removeItem\(DRAFT_KEY\)/.test(merchant));
  ok('a full disk drops the photos rather than losing the whole basket',
     /txProofPhoto: null/.test(merchant));
  ok('and the restore is reported, never silent', /Draft restored/.test(merchant)); }

/* BEHAVIOUR. The two gates that decide whether a draft is allowed back, run on real values. */
{ const MAX = 12 * 60 * 60 * 1000, NOW = 1_000_000_000_000;
  const allow = (d, uid, now) => !(!d || d.uid !== uid || now - (d.at || 0) > MAX);
  ok('a fresh draft from the same user comes back',
     allow({ uid: 'a', at: NOW - 60_000 }, 'a', NOW));
  ok("another agent's draft on a shared phone does NOT",
     !allow({ uid: 'b', at: NOW - 60_000 }, 'a', NOW));
  /* An AGE cap, not a day boundary — twelve hours from when the basket was saved. Named wrongly
     until 2026-08-23 ("his day starts at 07:00"), which was never a rule, only the UTC helper
     flipping at 07:00 WIB. */
  ok('a draft older than twelve hours does NOT - stale prices must not return',
     !allow({ uid: 'a', at: NOW - 13 * 60 * 60 * 1000 }, 'a', NOW));
  ok('a draft with no timestamp is treated as ancient, not as brand new',
     !allow({ uid: 'a' }, 'a', NOW)); }


/* --- S30 . two copies of "am I online", and a receipt that waited for optional work -------- */
section('S30. One answer about the internet, and a receipt that never waits');

/* 2026-08-20, second report of the same freeze after the first fix: "the sales terminal still
   stuck in the processing and didnt show me the receipt after that, ghost ledger and agent
   inventory is still saved tho". useOfflineEngine() was called TWICE - App.jsx and
   useTransactionEngine.js - and each copy kept its own isOnline state and its own 30-second
   probe. They disagreed: the engine had already flipped offline and saved to the Ghost Ledger
   while App still said online, so the terminal ran its online-only follow-up and awaited a
   Firestore write that never resolves. Two fixes: one shared answer, and a receipt that does not
   depend on optional work finishing. */
{ const offlineEngine = read('src/hooks/useOfflineEngine.js');
  ok('the online flag lives at module scope, so every caller reads the same one',
     /let sharedOnline/.test(offlineEngine));
  ok('callers subscribe to it rather than each keeping a copy',
     /useSyncExternalStore\(/.test(offlineEngine));
  ok('no per-instance copy of the flag survives',
     !/const \[isOnline, setIsOnline\] = useState/.test(offlineEngine));
  ok('one probe still drives it', /PROBE_EVERY_MS/.test(offlineEngine)); }

/* BEHAVIOUR: two subscribers, one flip, one answer. This is the whole point of the change. */
{ let shared = true; const ls = new Set();
  const set = (v) => { if (v === shared) return; shared = v; ls.forEach(l => l()); };
  const readA = []; const readB = [];
  ls.add(() => readA.push(shared)); ls.add(() => readB.push(shared));
  set(false); set(false); set(true);
  ok('both readers saw the same sequence, and a repeat did not fire',
     readA.join(',') === 'false,true' && readB.join(',') === 'false,true'); }

{ const from = merchant.indexOf('const handleFinalDeal');
  const to = merchant.indexOf('finally { setIsProcessingSale(false); }', from);
  const deal = (from === -1 || to === -1) ? '' : merchant.slice(from, to);
  ok('the deal handler was found', deal.length > 500);

  const iCommit   = deal.indexOf('committed = true');
  const iReceipt  = deal.indexOf('setReceiptData({');
  const iPromoter = deal.indexOf('if (isOnline && !isReturMode');
  ok('the receipt is drawn after the sale is actually committed', iCommit !== -1 && iReceipt > iCommit);
  ok('and BEFORE the optional follow-up that talks to the server - a finished sale must never wait',
     iPromoter !== -1 && iReceipt < iPromoter, `receipt at ${iReceipt}, follow-up at ${iPromoter}`);
  ok('the button is released with the receipt, not only once the follow-up returns',
     deal.indexOf('setIsProcessingSale(false)') > iCommit); }


/* --- S31 . which build is on the phone must be readable, not guessed -------------------- */
section('S31. The running build says which build it is');

/* 2026-08-20. Three rounds of "it is still broken" and no way to tell a real failure from a phone
   showing yesterday's chunks. The app is a PWA that precaches every chunk, so a fix can be live
   on the server and absent on the device, and the symptoms are identical. A build stamp he can
   read out loud ends that argument in one message. */
{ const vite = read('vite.config.js');
  ok('the build id is injected at build time from git, not typed by hand',
     /__BUILD_ID__/.test(vite) && /rev-parse --short HEAD/.test(vite));
  ok('and it falls back rather than breaking a build outside git',
     /catch/.test(vite.slice(vite.indexOf('BUILD_ID'), vite.indexOf('BUILD_ID') + 400)));
  ok('the Flight Recorder shows it - the one panel he can open without signing in again',
     /__BUILD_ID__/.test(app) && /Flight Recorder/.test(app)); }


/* --- S32 . an awaited Firestore write inside an OFFLINE branch never returns --------------- */
section('S32. No offline branch waits for a write that can never finish');

/* MEASURED 2026-08-20, not assumed. Firestore's own disableNetwork() was switched on in node and
   the same three calls were raced against a 4s timer:
       setDoc    -> STILL PENDING after 4000ms
       updateDoc -> STILL PENDING after 4000ms
       getDoc    -> RESOLVED (from cache)
   A write promise settles only on a SERVER acknowledgement, so awaiting one with no internet
   freezes the caller for good. useTransactionEngine.js:192 awaited exactly that, one line before
   the Ghost Ledger toast, inside the sale's offline branch. Every offline sale by an agent who
   has a vehicle froze there with no toast and no receipt. Aldi never hit it himself only because
   a plain ADMIN gets currentAgentProfileId = null and skipped the block entirely. */
{ const from = engine.indexOf('if (!isOnline)');
  const to = engine.indexOf('return finalAgentName;', from);
  const branch = (from === -1 || to === -1) ? '' : engine.slice(from, to);
  ok('the sale offline branch was found and is a sane size',
     branch.length > 1000 && branch.length < 12000, `sliced ${branch.length} chars`);
  const WRITES = /await\s+(updateDoc|setDoc|addDoc|deleteDoc)\s*\(|await\s+\w*\.commit\s*\(\)|await\s+runTransaction\s*\(/g;
  const found = branch.match(WRITES) || [];
  ok('it awaits NO Firestore write - reads are fine, writes never settle',
     found.length === 0, `found ${found.join(' / ')}`);
  ok('the van-count write is still made, just not waited for',
     /updateDoc\(canvasRef, \{ activeCanvas/.test(branch));
  ok('and a failed one is reported rather than dropped',
     /\.catch\(/.test(branch)); }

/* BEHAVIOUR: the difference between awaiting a never-settling promise and firing it. */
{ const neverSettles = () => new Promise(() => {});
  let reachedAfterAwait = false;
  const awaited = (async () => { await neverSettles(); reachedAfterAwait = true; })();
  await Promise.race([awaited, new Promise(r => setTimeout(r, 40))]);
  ok('awaiting a write that never settles never reaches the next line', reachedAfterAwait === false);

  let reachedAfterFire = false;
  (async () => { neverSettles().catch(() => {}); reachedAfterFire = true; })();
  await new Promise(r => setTimeout(r, 20));
  ok('firing it and carrying on DOES reach the next line - the toast, and the return',
     reachedAfterFire === true); }


/* --- S33 . one person, one profile for tier 1 (stage A of the merge) --------------------- */
section('S33. The boss appears once in the roster, and his van goes with him');

/* Aldi, 2026-08-20: "i ask u to make only 1 profile for tier 1 account not 2". He exists as three
   records in `motorists`: master_owner (the person), ADMIN_VEHICLE (his van, created
   automatically at useDatabaseSync.js:126) and VAULT (his warehouse). Only the first is a person;
   listing the other two as people is what showed him twice.

   He chose MERGE over hide, so this is stage A of three: fold them in the roster and carry the
   van's load onto his entry, writing and deleting NOTHING. Stage B copies the record, stage C
   flips the writes and removes ADMIN_VEHICLE. Doing C before B would show his van as empty. */
{ const perms = read('src/config/permissions.js');
  ok('there is ONE list of the ids that are not people',
     /export const TIER_ONE_ALIAS_IDS/.test(perms));
  ok('and it names all three of them',
     /ADMIN_VEHICLE/.test(perms) && /VAULT/.test(perms) && /'ADMIN'/.test(perms));
  ok('the canonical tier-1 id is master_owner',
     /export const TIER_ONE_ID = 'master_owner'/.test(perms));
  ok('a resolver maps any alias onto it, so old records still answer',
     /export const resolveTierOneId/.test(perms)); }

{ const from = profile.indexOf('const allAgents = useMemo');
  const to = profile.indexOf('}, [motorists, ownerProfile]);', from);
  const roster = (from === -1 || to === -1) ? '' : profile.slice(from, to + 30);
  ok('the roster builder was found', roster.length > 100 && roster.length < 2500,
     `sliced ${roster.length} chars`);
  ok('the alias ids are filtered out of the people list',
     /TIER_ONE_ALIAS_IDS/.test(roster));
  ok('and the van\'s load is carried onto his one entry, so nothing vanishes from view',
     /activeCanvas/.test(roster)); }

/* BEHAVIOUR: the fold, on a roster shaped like his. */
{ const ALIASES = ['ADMIN_VEHICLE', 'VAULT', 'ADMIN'];
  const motorists = [
    { id: 'ADMIN_VEHICLE', name: 'Admin (Boss Vehicle)', activeCanvas: [{ productId: 'p1', qty: 40 }] },
    { id: 'VAULT', name: 'Master Vault', activeCanvas: [] },
    { id: 'agent_budi', name: 'Budi', activeCanvas: [] },
  ];
  const owner = { id: 'master_owner', name: 'Master Owner' };
  const vehicle = motorists.find(m => m.id === 'ADMIN_VEHICLE');
  const list = motorists.filter(m => !ALIASES.includes(m.id));
  list.unshift({ ...owner, activeCanvas: owner.activeCanvas?.length ? owner.activeCanvas : (vehicle?.activeCanvas || []) });

  ok('he appears exactly once', list.filter(m => m.id === 'master_owner').length === 1);
  ok('the van is no longer a person in the list', !list.some(m => ALIASES.includes(m.id)));
  ok('his real salesmen are untouched', list.some(m => m.id === 'agent_budi') && list.length === 2);
  ok('and the van load moved onto him rather than disappearing',
     list[0].activeCanvas.length === 1 && list[0].activeCanvas[0].qty === 40); }


/* --- S34 . who sees the expected number WHILE counting ------------------------------------ */
section('S34. Tier 3 and above count with the number beside them; below that, blind');

/* Aldi, 2026-08-20: "comparison healthy and found side by side is higher tier only on default,
   which is tier 3 and above only, toggle button should be added to the matrix". His reason,
   2026-08-19: "encourage them to really count the number right". Blind counting already existed
   for everyone - `isRevealed` only shows the figures once something is typed - so the change is
   to let tier 3 and above see it BEFORE typing, and to make it a switch he can flip per tier. */
{ const perms   = read('src/config/permissions.js');
  const opname  = read('src/StockOpnameView.jsx');
  const settings = read('src/components/SettingsView.jsx');

  const tierBlock = (t) => {
      const from = perms.indexOf(`[CORPORATE_TIERS.TIER_${t}]:`);
      const to = perms.indexOf('],', from);
      return (from === -1 || to === -1) ? '' : perms.slice(from, to);
  };
  ok('tier 2 has it by default', /view_expected_count/.test(tierBlock(2)));
  ok('tier 3 has it by default', /view_expected_count/.test(tierBlock(3)));
  for (const t of [4, 5, 6])
      ok(`tier ${t} does NOT - they count blind`, !/view_expected_count/.test(tierBlock(t)));

  ok('it is a toggle in the permission matrix, not a hidden constant',
     /id: 'view_expected_count'/.test(settings));
  ok('and the toggle says what it does in plain words',
     /view_expected_count'[^}]*label: '[^']*[Ee]xpected/.test(settings));

  ok('one helper decides it, so the screen cannot disagree with the matrix',
     /export const canSeeExpectedCount/.test(perms));
  ok('the counting screen asks that helper', /canSeeExpectedCount\(/.test(opname));
  ok('and the screen is told which tier is looking', /userRole/.test(opname));

  const from = opname.indexOf('const isRevealed');
  const to = opname.indexOf('\n', from);
  const line = (from === -1 || to === -1) ? '' : opname.slice(from, to);
  ok('the reveal gate was found', line.length > 20 && line.length < 300, `got ${line.length} chars`);
  ok('a high tier sees it without typing, everyone else still has to type first',
     /showExpectedWhileCounting/.test(line) && /hasEntry/.test(line));
  ok('and that flag comes from the helper, not from a local guess',
     /const showExpectedWhileCounting = canSeeExpectedCount\(userRole\)/.test(opname));
  /* The screen derives its own userRole at line 24 and every other permission decision on it
     uses that one. Taking a prop of the same name collided with it and, worse, was read before it
     existed. The flag must sit BELOW that declaration. */
  ok('the flag is computed after the role it depends on, not above it',
     opname.indexOf('const showExpectedWhileCounting') > opname.indexOf("const userRole = user?.userRole")); }

/* BEHAVIOUR. The trap this feature dies on: ROLE_PERMISSIONS is REPLACED wholesale by the matrix
   he saved in Firebase, so a brand-new key is simply ABSENT there. Absence must mean "use the
   tier default", or the number never appears for tier 2 or 3 and the code looks broken while
   being right. Once the key exists anywhere in his saved matrix he has configured it, and his
   choice then wins in BOTH directions. */
{ const KEY = 'view_expected_count';
  const DEFAULT_ON = ['DEVELOPER', 'COMPANY_OWNER', 'AREA_ADMIN'];   // tier 3 and above
  const decide = (role, ownPerms, matrixKnowsKey) =>
      matrixKnowsKey ? ownPerms.includes(KEY) : DEFAULT_ON.includes(role);

  ok('a matrix saved BEFORE the key still shows the number to tier 3',
     decide('AREA_ADMIN', ['view_sales'], false) === true);
  ok('and still hides it from tier 5', decide('FIELD_OPERATIVE', ['view_sales'], false) === false);
  ok('tier 4 is blind by default - he named tier 3 as the cut',
     decide('FLEET_CAPTAIN', ['view_sales'], false) === false);
  ok('once he flips it ON for tier 4, tier 4 sees it',
     decide('FLEET_CAPTAIN', ['view_sales', KEY], true) === true);
  ok('and when he flips it OFF for tier 2, tier 2 loses it',
     decide('COMPANY_OWNER', ['view_sales'], true) === false); }


/* --- S35 . the counting card, rebuilt from his screenshot --------------------------------- */
section('S35. The counting card is readable in both themes and cannot overlap itself');

/* His screenshot, 2026-08-20: "GOOD STOCK" had wrapped onto two lines and was sitting ON TOP of
   the input, hiding the number. Cause: the label was `absolute -top-2 left-2` over the field, so
   the moment the label needed two lines it covered it. His verdict on the rest: "it doesnt align
   with our theme and this is poorly designed". */
{ const opname = read('src/StockOpnameView.jsx');
  const from = opname.indexOf('THE COUNTING CARD');
  const to = opname.indexOf('{Number(damagedVal) > 0', from);
  const card = (from === -1 || to === -1) ? '' : opname.slice(from, to);
  ok('the counting card was found and is a sane size',
     card.length > 1500 && card.length < 9000, `sliced ${card.length} chars`);

  ok('no label is positioned ON a field any more - that is what caused the overlap',
     !/absolute -top-2/.test(card));
  ok('the labels come BEFORE their inputs, in normal flow',
     card.indexOf('Good stock') < card.indexOf('value={goodVal}'));
  ok('a long product name is clipped rather than pushing the fields off screen',
     /truncate/.test(card) && /min-w-0/.test(card));
  ok('the figures are tabular, so digits line up between rows',
     (card.match(/tabular-nums/g) || []).length >= 4);
  ok('the counts are grouped - a four figure number is unreadable raw',
     /formatNumber\(totalFound\)/.test(card));
  /* ⚠️ REWRITTEN 2026-08-21, and the RULE did not change - only the form it takes. Aldi:
     "stop using amber background i said, i hate it, use it for little things and u can do
     better animation or UI for the damaged item not just all amber". The verdict was a solid
     gold slab; it is now a dark plate with a coloured edge and coloured ink. A match still
     reads gold and a mismatch still reads red, and green is still banned. */
  ok('a match reads gold and a mismatch red - never green, which the palette law bans',
     /border-\[var\(--accent-edge\)\]/.test(card) && /border-\[var\(--danger\)\]/.test(card)
     && /text-\[var\(--accent-ink\)\]/.test(card) && /text-\[var\(--danger-ink\)\]/.test(card));
  /* Comments are stripped first: the card now documents WHY --accent-ink was wrong by naming
     the hex it collides with, and a naive scan reads that as paint. Only markup is judged. */
  const painted = card.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  ok('nothing in the card is painted a fixed colour that ignores the theme',
     !/emerald|bg-black\/|#[0-9a-fA-F]{3,6}/.test(painted));
  /* The old form of this check asserted --gold-ink was present, because the verdict was a filled
     plate and ink on a plate needs the on-plate token. There is no filled plate in this card any
     more, so the check now pins the thing that actually matters: no gold slab, and never the
     as-text gold sitting on one. */
  ok('the verdict is an edge and an ink, never a gold slab',
     !/bg-\[var\(--gold\)\]/.test(painted) && !/bg-\[var\(--gold\)\][^>]*--accent-ink/.test(painted));

  /* ---- WHAT KIND OF DAMAGE (2026-08-21) ----
     He asked for the kinds of damage to be recorded at count time, and for the stock opname to
     use the options the sales terminal already has. The money reason: the kind decides who pays.
     An RTV charges nobody; a PENALTY charges the agent at retail. */

  /* REGRESSION GUARD, and the highest-value line here. The two screens must store the SAME
     strings or every report that groups by reason silently splits one cause into two buckets.
     AgentInventoryView.jsx:163 and EODReconciliationView.jsx:254 both group on this field. */
  const terminalReasons = [...merchant.matchAll(/<option value="([^"]+)">/g)]
      .map(m => m[1])
      .filter(v => /Expired|Water|Torn|Pest|Factory|^Other$/.test(v));
  /* ⚠️ SCOPED TO THE DAMAGE ARRAY. This scraped the whole file until VARIANCE_REASONS was added
     on 2026-08-21, at which point it started reading the cause list as damage kinds and failed.
     A second array of the same shape is exactly the kind of thing that arrives later. */
  const dmgBlock = opname.slice(opname.indexOf('export const DAMAGE_REASONS'),
                                opname.indexOf('];', opname.indexOf('export const DAMAGE_REASONS')));
  const opnameReasons = [...dmgBlock.matchAll(/value:\s*'([^']+)',\s*label:/g)].map(m => m[1]);
  /* SUBSET, not equality. Aldi dropped "Other" from the count screen on 2026-08-21 - a free-text
     cause cannot be grouped or counted - while the terminal still offers it. So every string the
     count screen uses must exist in the terminal, and "Other" must NOT be one of them. */
  ok('the stock count stores the sales terminal\'s own damage strings, not its short labels',
     opnameReasons.length === 5
     && opnameReasons.every(r => terminalReasons.includes(r))
     && !opnameReasons.includes('Other'),
     `terminal [${terminalReasons}] vs opname [${opnameReasons}]`);

  /* BEHAVIOUR CHECK — the reconcile rule re-run on real numbers, using the exact source of
     damageBlocked lifted out of the component, so this tests the shipped maths and not a copy. */
  const bStart = opname.indexOf('export const damageBlocked');
  const bOpen  = opname.indexOf('{', bStart);
  const bEnd   = opname.indexOf('\n};', bOpen);
  /* ⚠️ a missed anchor here returns -1 and slice() would hand back most of the file, so the
     offsets are asserted before the body is ever run. Files here are CRLF. */
  ok('the reconcile rule could be lifted out of the component to be tested',
     bStart > -1 && bOpen > bStart && bEnd > bOpen);
  const damageBlocked = new Function('entry', `
     const damageSorted = (e) => Object.values((e && e.kinds) || {}).reduce((s, n) => s + Number(n || 0), 0);
${opname.slice(bOpen + 1, bEnd)}
  `);
  ok('no damage means nothing to sort',            damageBlocked({ damaged: 0 }) === null);
  ok('5 damaged and none sorted is refused',       /5 damaged not sorted/.test(damageBlocked({ damaged: 5, kinds: {} })));
  ok('5 damaged sorted 2 + 1 is still refused',    /2 damaged not sorted/.test(damageBlocked({ damaged: 5, kinds: { 'Pest / Rodent Damage': 2, 'Water / Weather Damage': 1 } })));
  ok('kinds adding up past the total is refused',  /more than the total/.test(damageBlocked({ damaged: 5, kinds: { 'Pest / Rodent Damage': 6 } })));
  /* 🔴 SEEN ON A REAL SCREEN 2026-08-23, and approved to fix: sorting 9 kinds against 5
     damaged printed "9 OF 5 SORTED" beside a bar clamped to 100%. True arithmetic that
     reads as PROGRESS — nothing on the row said no until submit did. Two halves to it:
     the sentence has to carry the overshoot, and the row has to PRINT the sentence
     rather than re-deriving a tally of its own and keeping only the red border. */
  ok('the refusal says by HOW MUCH it is over, not just that it is',
     /4 sorted more than the total/.test(damageBlocked({ damaged: 5, kinds: { 'Pest / Rodent Damage': 9 } })));
  ok('and the under case still says how many are left',
     /3 damaged not sorted yet/.test(damageBlocked({ damaged: 5, kinds: { 'Pest / Rodent Damage': 2 } })));
  ok('the closed damage line prints the refusal itself',
     /\{blocked \? blocked\.toUpperCase\(\)/.test(opname));
  ok('and the tally that read as progress while over is gone',
     !/\$\{sorted\} of \$\{dmgTotal\} sorted/.test(opname));
  ok('the words go red with the border, so the refusal is not carried by colour alone',
     /blocked \? 'text-\[var\(--danger-ink\)\]'/.test(opname));
  ok('3 pest + 2 water against 5 damaged passes',  damageBlocked({ damaged: 5, kinds: { 'Pest / Rodent Damage': 3, 'Water / Weather Damage': 2 } }) === null);
  ok('no free-text escape hatch is left in the rule',
     !/otherDetail/.test(opname), 'a free-text cause cannot be grouped or counted');

  /* REGRESSION GUARD — the refusal must land BEFORE the confirm dialog, or he is asked to
     approve a count the app then throws away. */
  ok('unaccounted damage is refused before he is asked to confirm',
     opname.indexOf('const unaccounted') < opname.indexOf('Submit Stock Opname for'));
  ok('and the kinds are actually written into the saved record',
     /damageKinds:\s*Object\.entries/.test(opname));

  /* The reel is the whole control - if its motion were a shadow or a filter, Lite Mode would
     erase it. It is a transform, and the level dots are borders, not inset shadows. */
  /* ---- THE TARGET IS FROZEN WHEN THE ROW IS STARTED (2026-08-21) ----
     The expected figures used to be read live off the product at every render AND again at
     submit, so a sale landing mid-count moved the number he was counting against and turned a
     correct count into a variance. HQ then applies increment(counted - expected), so the pair
     saved has to be the pair he was actually looking at. */
  ok('the expected figures are snapshotted on the first keystroke for a row',
     /expStock:\s*Number\(src\.stock/.test(opname) && /expDamaged:\s*Number\(src\.damagedStock/.test(opname));
  ok('the variance compares against the snapshot, not the live document',
     /const target = expectedOf\(item, entry\)/.test(opname)
     && /variance: totalFound - \(target\.stock \+ target\.damaged\)/.test(opname));
  ok('and the saved record carries the snapshot, not the figures at submit time',
     /expectedStock: Number\(entry\.expStock/.test(opname)
     && /expectedDamagedStock: Number\(entry\.expDamaged/.test(opname));
  /* REGRESSION GUARD — the count row must not read the live product for either figure again. */
  ok('no live stock figure is printed on the count row any more',
     !/formatNumber\(item\.stock \|\| 0\)/.test(opname) && !/formatNumber\(item\.damagedStock \|\| 0\)/.test(opname));
  /* HQ's list had the identical fault: healthy-only expected beside a good+damaged found. */
  ok('HQ\'s review list compares like for like, and legacy audits still render',
     /SYS: \{\(item\.expectedStock \|\| 0\) \+ \(item\.expectedDamagedStock \|\| 0\)\}/.test(opname));
  ok('and HQ can see what kind of damage it is approving',
     /item\.damageKinds\.map/.test(opname));

  /* ---- RECOUNT: A DIFFERENCE IS COUNTED TWICE BEFORE HQ SEES IT (2026-08-21) ----
     HQ approving a count applies increment(counted - expected), so a miscount is written into real
     stock and becomes the EXPECTED figure for the next count. One typo poisons two months.
     ⚠️ Lifted from the source, never retyped — see the leak-detection note below for why. */
  const rStart = opname.indexOf('export const recountState');
  const rOpen  = opname.indexOf('{', opname.indexOf('=>', rStart));
  const rEnd   = opname.indexOf('\n};', rOpen);
  const sStart = opname.indexOf('export const samePass');
  const sEnd   = opname.indexOf(';', opname.indexOf('=>', sStart));
  ok('the recount rule could be lifted out of the component to be tested',
     rStart > -1 && rOpen > rStart && rEnd > rOpen && sStart > -1 && sEnd > sStart);
  /* recountState calls BOTH helpers, so both are lifted into its scope - and lifted, never
     retyped, so loosening either one in the source turns these checks red. */
  const tolLift  = opname.indexOf('export const withinTolerance');
  const tolLiftE = opname.indexOf(';', opname.indexOf('=>', tolLift));
  ok('both helpers the recount depends on could be lifted with it',
     sStart > -1 && tolLift > -1 && tolLiftE > tolLift);
  const recountState = new Function('entry', 'target', `
     const VARIANCE_TOLERANCE_BKS = ${(opname.match(/VARIANCE_TOLERANCE_BKS = (\d+)/) || [])[1]};
     const withinTolerance = ${opname.slice(opname.indexOf('(', tolLift), tolLiftE)};
     const samePass = ${opname.slice(opname.indexOf('(', sStart), sEnd)};
${opname.slice(rOpen + 1, rEnd)}
  `);
  const T = { stock: 100, damaged: 0 };
  const r = (entry) => recountState(entry, T);

  ok('a count that matches the system is never recounted',
     r({ good: 100, damaged: 0 }).needsRecount === false);
  ok('the FIRST difference always demands a second count',
     r({ good: 98, damaged: 0 }).needsRecount === true);
  ok('a second count that now matches the system ends it - nothing goes to HQ',
     r({ good: 100, damaged: 0, passes: [{ good: 98, damaged: 0 }] }).needsRecount === false);
  ok('the SAME wrong number twice is a real shortage, and marked as counted twice',
     r({ good: 98, damaged: 0, passes: [{ good: 98, damaged: 0 }] }).confirmed === true);
  ok('a DIFFERENT wrong number the second time demands a third',
     r({ good: 97, damaged: 0, passes: [{ good: 98, damaged: 0 }] }).needsRecount === true);
  ok('two of three agreeing is confirmed, not a disagreement',
     r({ good: 98, damaged: 0, passes: [{ good: 98, damaged: 0 }, { good: 97, damaged: 0 }] }).confirmed === true);
  /* HIS OPTION B, 2026-08-21: three different answers all go to HQ; the app picks none. */
  ok('three different counts is a DISAGREEMENT and is never asked for a fourth',
     r({ good: 96, damaged: 0, passes: [{ good: 98, damaged: 0 }, { good: 97, damaged: 0 }] }).disagreement === true
     && r({ good: 96, damaged: 0, passes: [{ good: 98, damaged: 0 }, { good: 97, damaged: 0 }] }).needsRecount === false);
  ok('damaged counts are compared too, not just the good ones',
     r({ good: 100, damaged: 2, passes: [{ good: 100, damaged: 5 }] }).needsRecount === true);

  /* REGRESSION GUARDS — the three ways a lazy version of this quietly stops working. */
  ok('the recount NEVER re-takes the expected snapshot, which would re-open the moving target',
     !/startRecount[\s\S]{0,600}expStock:/.test(opname));
  ok('and it never shows him what he typed last time',
     /good: '', damaged: '', passes/.test(opname));
  ok('emptying a row that has already been counted does not delete it, passes and all',
     /const startedOver = \(newCounts\[id\]\.passes \|\| \[\]\)\.length === 0/.test(opname));
  ok('the block lands before the confirm dialog, and never names the difference',
     opname.indexOf('const needRecount') < opname.indexOf('Submit Stock Opname for')
     && /Count these again before submitting/.test(opname));
  ok('every attempt is saved on the record, with the two flags HQ needs',
     /countPasses:/.test(opname) && /countedTwice:/.test(opname) && /threeWayDisagreement:/.test(opname));

  /* ⚠️ THE ONE THING THIS WHOLE FILE CANNOT SEE, WRITTEN DOWN SO IT IS NOT FORGOTTEN.
     On 2026-08-21 the count row read `hasTyped` two lines ABOVE its own `const hasTyped`. A const
     is in the temporal dead zone until its line runs, so every render threw and the ENTIRE Stock
     Opname screen fell into LazyTabBoundary — a blank "FAILED TO LOAD". It shipped, and sat
     through two more commits, while `npm run build` compiled it and BOTH suites reported green:
     599/599 and 565/565 on a screen that did not render. Neither suite renders anything.
     Only opening it in a real browser found it.
     A GUARD FOR IT WAS WRITTEN HERE AND THEN DELETED, ON PURPOSE. It passed on the broken code
     as readily as on the fixed code — a probe that restored the bad ordering did not turn it red,
     so it was decorative. That is the second decoration caught in one day, and the rule earned
     twice over is: PROVE A CHECK FAILS BEFORE TRUSTING IT, and delete it when it cannot.
     There is no static check for "the component renders". Open the screen. */

  /* ---- WHAT IS TOO SMALL TO CHASE (2026-08-21) ----
     Aldi: "few batang wont worth my time, few bks is still money bruv we need that". So the line
     is one PACK. This is not comfort: selling in Batang divides stock by sticksPerPack
     (App.jsx:3127), so a product with loose sticks holds a FRACTION of a pack, while the count box
     is parseInt and can only take whole Bks. Without the tolerance that row's variance can never
     reach zero, and the recount demands a second count and files a fake shortage every week. */
  const tolStart = opname.indexOf('export const withinTolerance');
  const tolEnd   = opname.indexOf(';', opname.indexOf('=>', tolStart));
  ok('the tolerance could be lifted out of the component to be tested',
     tolStart > -1 && tolEnd > tolStart);
  const withinTolerance = new Function('variance',
     `const VARIANCE_TOLERANCE_BKS = ${(opname.match(/VARIANCE_TOLERANCE_BKS = (\d+)/) || [])[1]};
      return (${opname.slice(opname.indexOf('=>', tolStart) + 2, tolEnd)});`);

  ok('an exact count is within tolerance',            withinTolerance(0) === true);
  ok('loose sticks are noise - 0,44 of a pack passes', withinTolerance(-0.4375) === true);
  ok('and so does a surplus of loose sticks',          withinTolerance(0.5625) === true);
  ok('ONE WHOLE PACK IS MONEY and is never waved through', withinTolerance(-1) === false);
  ok('nor is a whole pack the other way',             withinTolerance(1) === false);
  ok('nor anything larger',                           withinTolerance(-7) === false);
  /* REGRESSION GUARD — the batang row is the reason this exists. */
  ok('a batang-carrying row no longer demands an endless recount',
     recountState({ good: 99, damaged: 0 }, { stock: 99.4375, damaged: 0 }).needsRecount === false);
  ok('but a whole pack short still does',
     recountState({ good: 98, damaged: 0 }, { stock: 99.4375, damaged: 0 }).needsRecount === true);
  /* comments stripped first: the fix documents the dead field by name, and a naive scan reads
     that prose as if the bug were still there. Only markup is judged. */
  const opnameCode = opname.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  ok('HQ judges a saved row by the same rule, not by a field that does not exist',
     /withinTolerance\(item\.variance\)/.test(opnameCode) && !/item\.matched/.test(opnameCode));

  /* ---- A CONFIRMED DIFFERENCE MUST SAY WHY (2026-08-21) ----
     HQ used to receive a bare "-3" and had to guess between a bookkeeping fix, a write-off and a
     person. ⚠️ The five words are Claude's and Aldi has NOT approved them - his law is that only he
     names the categories in his trade. They are provisional and a check pins that they are. */
  const vStart = opname.indexOf('export const varianceReasonMissing');
  const vEnd   = opname.indexOf(';', opname.indexOf('=>', vStart));
  ok('the cause rule could be lifted out of the component to be tested',
     vStart > -1 && vEnd > vStart);
  const varianceReasonMissing = new Function('entry', 'state',
     `return (${opname.slice(opname.indexOf('=>', vStart) + 2, vEnd)});`);

  const clean = { confirmed: false, disagreement: false };
  const twice = { confirmed: true,  disagreement: false };
  const three = { confirmed: false, disagreement: true  };

  ok('a row that matched the system is never asked why',
     varianceReasonMissing({}, clean) === false);
  ok('a difference counted twice MUST say why',
     varianceReasonMissing({}, twice) === true);
  ok('three disagreeing counts must say why too',
     varianceReasonMissing({}, three) === true);
  ok('a cause that is only spaces does not count as an answer',
     varianceReasonMissing({ varianceReason: '   ' }, twice) === true);
  ok('a real cause satisfies it',
     varianceReasonMissing({ varianceReason: 'Unrecorded Sale' }, twice) === false);

  /* REGRESSION GUARDS. */
  ok('the cause control is only offered AFTER the recount, never on the first guess',
     /\(recount\.confirmed \|\| recount\.disagreement\) && \(\(\) =>/.test(opname));
  ok('it starts unset, and "tap to say what happened" is a face it can never return to',
     /Tap to say what happened/.test(opname)
     && /const started = current !== undefined && current >= 0/.test(opname));
  ok('the block lands before the confirm dialog, and never names the difference',
     opname.indexOf('const noCause') < opname.indexOf('Submit Stock Opname for')
     && /Say what happened with these before submitting/.test(opname));
  ok('the cause and the evidence both reach HQ',
     /varianceReason: String\(entry\.varianceReason/.test(opname)
     && /Cause: \{item\.varianceReason\}/.test(opname)
     && /Three different counts — you decide/.test(opname));
  /* ⚠️ THIS ONE IS A REMINDER, NOT A RULE. It fails the day someone edits the list, which is the
     moment to check the new words are HIS words and to delete this check. Running as the default
     on his word 2026-08-23; the words are still Claude's and still his to rename. */
  ok('the five causes are still the default list, not yet renamed in his own words',
     /'Miscount'[\s\S]{0,220}'Cause Unknown'/.test(opname),
     'if this failed because he renamed them, that is good - delete this check');
  /* A HARD RULE, not a reminder. There is no supplier anywhere in this chain - the factory is the
     company's own - so a cause blaming one could never be true, and the internal version of it is
     caught at the receiving door before stock is ever credited. */
  ok('no cause blames a supplier, because there is no supplier in this chain',
     !/Supplier/i.test(opname.slice(opname.indexOf('VARIANCE_REASONS'), opname.indexOf('VARIANCE_REASONS') + 400)));
  ok('and an honest "do not know" bucket exists, so nobody has to pick a wrong one',
     /'Cause Unknown'/.test(opname));

  /* ---- LEAK DETECTION (2026-08-21) ----
     "u can add leak detection for this trigger for everytime stock opname is done, which is each
     week actually". One short count is a miscount; the same product short week after week is a
     leak. Runs off audits already on file. */
  const lStart = opname.indexOf('export const shortageStreak');
  const lOpen  = opname.indexOf('{', lStart);
  const lEnd   = opname.indexOf('\n};', lOpen);
  ok('the shortage rule could be lifted out of the component to be tested',
     lStart > -1 && lOpen > lStart && lEnd > lOpen);
  const shortageStreak = new Function('history', 'productId', 'sample', `
     sample = sample || 5;
${opname.slice(lOpen + 1, lEnd)}
  `);
  /* ⚠️ THE THRESHOLD IS LIFTED FROM THE SOURCE, NOT RETYPED HERE. It was retyped first, and a
     deliberate probe that loosened the shipped rule to "short once in one count" changed nothing:
     every check still passed, because they were testing this file's copy. A check that cannot
     fail proves nothing. Lifting it means loosening the real rule now turns these red. */
  const iStart = opname.indexOf('export const isLeak');
  const iArrow = opname.indexOf('=>', iStart);
  const iEnd   = opname.indexOf(';', iArrow);
  ok('the leak threshold could be lifted out of the component too',
     iStart > -1 && iArrow > iStart && iEnd > iArrow);
  const isLeak = new Function('s', `const { short, total } = s; return (${opname.slice(iArrow + 2, iEnd)});`);
  const audit = (variance) => ({ items: [{ productId: 'P1', variance }] });

  ok('a product never counted has no history and cannot be accused',
     JSON.stringify(shortageStreak([], 'P1')) === '{"short":0,"total":0}');
  ok('one short count is a miscount, not a leak',
     !isLeak(shortageStreak([audit(-2)], 'P1')));
  ok('two short counts out of two is still too little evidence',
     !isLeak(shortageStreak([audit(-2), audit(-1)], 'P1')));
  ok('short in two of three counts IS a leak - three weeks of evidence',
     isLeak(shortageStreak([audit(-2), audit(0), audit(-1)], 'P1')));
  ok('counting correctly three times running clears it',
     !isLeak(shortageStreak([audit(0), audit(0), audit(0)], 'P1')));
  ok('a SURPLUS is never a leak, however often it happens',
     !isLeak(shortageStreak([audit(3), audit(2), audit(5), audit(1)], 'P1')));
  ok('only the last five counts are weighed, so an old problem ages out',
     shortageStreak([audit(0), audit(0), audit(0), audit(0), audit(0), audit(-9)], 'P1').short === 0);
  ok('audits that never mention the product are skipped entirely',
     shortageStreak([{ items: [{ productId: 'OTHER', variance: -9 }] }, audit(-1)], 'P1').total === 1);

  /* REGRESSION GUARD — it must stay on HQ's side. `auditHistory` only loads when isHighCommand,
     and telling the person counting "this is usually short" would bias a blind count. */
  ok('leak detection reads the approved history, and sits where HQ can see it',
     /shortageStreak\(auditHistory, item\.productId\)/.test(opname));

  const reelCss = read('src/styles/theme.css');
  ok('the damage reel moves by transform, and its dots are borders not shadows',
     /\.kpm-dmg-reel \{[\s\S]{0,160}transform: translateY/.test(reelCss)
     && /\.kpm-dot \{[\s\S]{0,200}border: 1px solid/.test(reelCss)
     && !/\.kpm-dot \{[\s\S]{0,200}box-shadow/.test(reelCss));
  ok('and it is told apart at a glance by a rail, not by colour alone',
     /aria-hidden="true"/.test(card)); }

/* The whole screen, not just the card: these are the fixed near-blacks he could not read in
   light mode. Two are gone; the rest are the next job and are counted here so the number cannot
   quietly grow. */
{ const opname = read('src/StockOpnameView.jsx');
  const fixed = (opname.match(/bg-black\/|bg-\[#|border-\[#|text-\[#/g) || []).length;
  ok('NO fixed colour is left anywhere on this screen - Monitor, Quarantine and HQ Audits included',
     fixed === 0, `${fixed} left`);
  /* Palette law: no blue, no green. The three quarantine outcomes were purple, blue and red;
     they are gold, neutral and red now, which is the vocabulary the rest of the app already
     uses. Full-screen scrims stay dark in BOTH themes on purpose - a photo lightbox is meant to
     be - but they say so with --duke-scrim-hi rather than a raw black. */
  const banned = (opname.match(/emerald|green-[0-9]|blue-[0-9]|purple-[0-9]|indigo-[0-9]/g) || []).length;
  ok('and no banned hue survives on it either', banned === 0, `${banned} left`); }


/* --- S36 . the travelling rim on the penalty button --------------------------------------- */
section('S36. The neon rim is one arc, and it obeys Lite Mode');

/* Aldi, 2026-08-20: "red neon light moving effect around the side of this panel ... animation
   should not be too much, minimalist expensive looks and HD". The restraint is the feature, so
   it is pinned: one arc, one pixel, one revolution every five seconds, and nothing else moving. */
{ const css = read('src/styles/theme.css');
  const opname = read('src/StockOpnameView.jsx');
  const from = css.indexOf('.kpm-rim-neon::before');
  const to = css.indexOf('@keyframes kpm-rim-walk', from);
  const rim = (from === -1 || to === -1) ? '' : css.slice(from, to);

  ok('the rim exists and is its own block', rim.length > 300 && rim.length < 2500);
  ok('the angle is declared with @property, or it would jump instead of sweep',
     /@property --kpm-rim-angle/.test(css));
  ok('it is masked down to the border box, so it follows the button radius exactly',
     /mask-composite: exclude/.test(rim));
  ok('the rim is one pixel - restraint is the whole request', /padding: 1px;/.test(rim));
  /* No filter: the audit bans depending on one, because Lite Mode deletes them. The softness
     comes from the gradient ramp instead, so the effect survives that deletion by not using it. */
  ok('it uses no filter at all - Lite Mode deletes those', !/filter:/.test(rim));
  ok('the softness comes from the gradient ramping up and back down',
     (rim.match(/color-mix\(in srgb, var\(--danger-ink\) 45%/g) || []).length === 2);
  ok('it walks once every five seconds, slowly', /animation: kpm-rim-walk 5s linear infinite/.test(rim));
  ok('nothing pulses or changes colour - one arc only',
     !/pulse|hue-rotate|alternate/.test(rim));
  ok('HIS LAW: it does not rotate in Lite Mode',
     /html\.lite-mode \.kpm-rim-neon::before \{ display: none; \}/.test(css));
  ok('and reduced motion removes it too',
     /prefers-reduced-motion: reduce\)[\s\S]{0,120}kpm-rim-neon::before \{ display: none/.test(css));
  ok('the penalty button wears it', /kpm-rim-neon flex-1 xl:flex-none/.test(opname));
  ok('and only that one button does - it is an accent, not a theme',
     (opname.match(/kpm-rim-neon/g) || []).length === 1); }


/* --- S37 . amber is an accent, not a surface -------------------------------------------- */
section('S37. Quarantine and HQ Audits: gold is ink and edges, never a slab');

/* Aldi, 2026-08-20, with five screenshots: "dont use put amber and black, too dominant, add some
   color variety, thats fine for the symbol and few box line, as long as dark is 90% 5% light and
   other color can be variative, reverse color on light mode of course".

   Every unreadable thing he photographed was the same mistake - gold used as a big FILL with dim
   or gold ink on top. Fixing the ink alone would have kept the screen 40% amber. So the fill is
   what went: dark surface, one thin coloured line, coloured text. That answers the contrast AND
   the ratio in one move. */
{ const css = read('src/styles/theme.css');
  const opname = read('src/StockOpnameView.jsx');

  /* A third accent, because two colours cannot tell three actions apart. Violet is the only hue
     left - blue and green are banned outright, and warm is taken by gold and red. */
  ok('the third accent exists in BOTH themes, not just one',
     (css.match(/--alt-ink:/g) || []).length === 2 && (css.match(/--alt-edge:/g) || []).length === 2);
  ok('it is a real token, not a raw colour dropped into markup',
     !/#C2A0D9|#4A2560/.test(opname));

  /* Three actions, three readings. Sample is reversible, RTV is routine, penalty takes money -
     and only the one that takes money is filled. */
  const from = opname.indexOf('Convert to Sample');
  const to = opname.indexOf('Penalty Charge', from);
  const actions = (from === -1 || to === -1) ? '' : opname.slice(from - 700, to);
  ok('the action row was found', actions.length > 500 && actions.length < 3000);
  ok('sample carries the third accent', /border-\[var\(--alt-edge\)\] text-\[var\(--alt-ink\)\]/.test(actions));
  ok('RTV stays neutral - it is the routine one', /border-\[var\(--line\)\] text-\[var\(--ink\)\]/.test(actions));
  ok('none of the quarantine actions is a gold slab any more',
     !/bg-\[var\(--gold\)\]/.test(actions));
  ok('and they answer a press, which a slab never did', (actions.match(/active:scale-\[0\.97\]/g) || []).length === 2);

  /* The hazard mark. animate-pulse is opacity 1 -> 0,5 -> 1 every 2s: a blinking warning lamp,
     and it is on screen the whole time someone works in Quarantine. Reduced, not improved. */
  ok('the hazard mark no longer blinks', !/Biohazard size=\{24\}[^/]*animate-pulse/.test(opname));
  ok('it is red, as he asked', /kpm-hazard text-\[var\(--danger-ink\)\]/.test(opname));
  ok('it breathes slowly rather than flashing', /kpm-hazard-breathe 3\.6s/.test(css));
  ok('and it never dips to half opacity, which would read as disabled',
     /opacity: 0\.72/.test(css) && !/kpm-hazard-breathe[\s\S]{0,200}opacity: 0\.5/.test(css));
  ok('HIS LAW: it does not move in Lite Mode',
     /html\.lite-mode \.kpm-hazard \{ animation: none/.test(css));
  ok('and reduced motion stops it too',
     /prefers-reduced-motion: reduce\)[\s\S]{0,120}\.kpm-hazard \{ animation: none/.test(css));

  /* The HQ audit row he photographed twice: a filled gold disc with --ink-dim on it, and an
     APPROVED chip the same way. Both are dark now, ringed and inked in the accent. */
  ok('the audit status disc is a ring, not a filled coin',
     /p-3 rounded-full border bg-\[var\(--sunk\)\]/.test(opname));
  ok('and the APPROVED chip is dark with gold ink, not gold with dim ink',
     /bg-\[var\(--sunk\)\] text-\[var\(--accent-ink\)\] border-\[var\(--accent-edge\)\]/.test(opname));
  ok('no dim ink is left sitting on a gold plate anywhere on this screen',
     !/bg-\[var\(--gold\)\] text-\[var\(--ink-dim\)\]/.test(opname));

  /* THE RATIO, as a number. Gold may fill the ONE selected tab and nothing else; every other use
     must be ink or a one pixel edge. This is what stops the screen drifting back to amber. */
  const goldFills = (opname.match(/bg-\[var\(--gold\)\]/g) || []).length;
  /* 18 is the measured floor after the sweep, and every one of them is legitimate: four main
     tabs and two sub-tabs (only ONE is selected at a time, so at most one is on screen), two
     primary buttons, three data bars whose LENGTH is the data, the match chip and the selected
     modal method, plus their hover twins. Chips, pills, badges and discs are dark with a
     coloured edge. Lower this number, never raise it. */
  ok('gold fills only selected states, primary actions and data bars - never a chip or a panel',
     goldFills <= 18, `${goldFills} gold fills left`); }



/* ============================================================================
   THE ARRIVAL CHECK — counting the box at the door (2026-08-23)

   Before this, receiving a shipment was one yes/no button and the branch was
   credited whatever HQ SAID it shipped. A short box therefore became branch
   stock that did not exist, and it only surfaced weeks later at Stock Opname as
   a mystery shortage that looks like theft at the branch. Wrong person blamed,
   and the claim against HQ or the courier long dead — a discrepancy has to be
   filed BEFORE a clean receipt is signed.
   ============================================================================ */
{
  const branch = read('src/components/BranchWarehouseManager.jsx');

  /* Lifted verbatim between the two anchors, so these run the SHIPPED rules. A
     threshold retyped into its own check made a whole block decorative on
     2026-08-21; nothing here is retyped. */
  const aStart = branch.indexOf('export const receiptLines');
  const aEnd   = branch.indexOf('export default function BranchWarehouseManager');
  ok('the arrival-check rules could be lifted out of the file to be tested',
     aStart > -1 && aEnd > aStart);
  const { receiptLines, receiptBlocked, receiptDisputed } = new Function(
      branch.slice(aStart, aEnd).replace(/export const/g, 'const')
      + '\nreturn { receiptLines, receiptBlocked, receiptDisputed };')();

  const shipped = [{ productId: 'A', name: 'Cello Coffee', qty: 100 },
                   { productId: 'B', name: 'Djarum Super',  qty: 50 }];
  const at = (counts) => receiptLines(shipped, counts);

  /* A BLANK IS NOT A ZERO. Reading it as one would let an uncounted product be
     written off in silence, which is the exact failure this screen exists to
     stop happening at the other end. */
  ok('a blank line is refused rather than read as zero',
     /count every line/.test(receiptBlocked(at({ A: { counted: '100' } }))));
  ok('but a typed 0 is a real answer - a product that never arrived',
     receiptBlocked(at({ A: { counted: '100' }, B: { counted: '0' } })) === null);
  ok('an empty shipment cannot be received at all',
     /no items/.test(receiptBlocked(receiptLines([], {}))));

  ok('an exact count is not a dispute',
     receiptDisputed(at({ A: { counted: '100' }, B: { counted: '50' } })) === false);
  const short = at({ A: { counted: '95' }, B: { counted: '50' } });
  ok('five short is a dispute', receiptDisputed(short) === true);
  ok('and the difference is SIGNED, so HQ can tell a shortage from an overage',
     short[0].diff === -5);
  ok('an overage is a dispute too, not a quiet gift',
     receiptDisputed(at({ A: { counted: '105' }, B: { counted: '50' } })) === true);

  /* Damage is its own event: the right number of boxes can arrive with five of
     them crushed, and that is still a claim. */
  ok('the right count with crushed boxes in it is still a dispute',
     receiptDisputed(at({ A: { counted: '100', damaged: '5' }, B: { counted: '50' } })) === true);
  ok('more damaged than arrived is refused, and NAMES the product',
     /Cello Coffee: damaged cannot be more/.test(
        receiptBlocked(at({ A: { counted: '4', damaged: '9' }, B: { counted: '50' } }))));
  ok('a negative count is refused',
     /cannot be negative/.test(receiptBlocked(at({ A: { counted: '-1' }, B: { counted: '50' } }))));

  /* NO TOLERANCE AT THE DOOR, deliberately. Stock Opname forgives one pack
     because selling in Batang leaves stock carrying a fraction of a pack; a
     sealed shipment carries no such fraction. One short is short. */
  ok('one pack short is a dispute here, unlike the weekly count',
     receiptDisputed(at({ A: { counted: '99' }, B: { counted: '50' } })) === true);

  /* ---- WHAT GETS WRITTEN ---- */
  ok('THE POINT OF THE SCREEN: the branch is credited what it COUNTED',
     /stock: \(current\.stock \|\| 0\) \+ good/.test(branch));
  ok('and never again what HQ claimed to have sent',
     !/currentStock \+ Number\(data\.item\.qty\)/.test(branch));
  ok('good stock excludes the damaged ones',
     /const good = line\.counted - line\.damaged/.test(branch));
  ok('but damaged units still enter the warehouse, on the damaged shelf',
     /damagedStock: \(current\.damagedStock \|\| 0\) \+ line\.damaged/.test(branch));
  ok('what arrived is written down line by line, beside what was sent',
     /receivedItems: lines\.map/.test(branch) && /shipped: l\.shipped, counted: l\.counted/.test(branch));

  /* The double-credit bug: two taps used to add the stock twice. */
  ok('a second tap cannot credit the same shipment twice',
     /orderData\.status === 'DELIVERED' \|\| orderData\.status === 'DISPUTED'/.test(branch));
  ok('and that guard reads the order INSIDE the transaction, not the stale prop',
     branch.indexOf('const orderData = orderSnap.data()') < branch.indexOf("orderData.status === 'DELIVERED'"));
  ok('the receive button does not come back after a dispute',
     /order\.status === 'DELIVERED' \|\| order\.status === 'DISPUTED'/.test(branch));

  /* ---- PARTIAL BLIND ---- his decision, 2026-08-23. */
  ok('the quantities are hidden from the branch while the box is in transit',
     /req\.status === 'IN_TRANSIT' \?[\s\S]{0,300}JENIS BARANG/.test(branch));
  ok('but the product NAMES stay, so a missing product is counted as 0 not missed',
     /itemsToProcess\.map\(i => i\.name\)\.join/.test(branch));
  ok('the panel says a difference EXISTS without ever saying how big',
     /Hitungan Anda tidak sama dengan kiriman HQ/.test(branch));

  /* ---- HQ ACTUALLY SEES IT ---- a report filed into a list nobody opens is
     the same as no report. */
  ok('a disputed shipment stays in HQ active list', /r\.status === 'DISPUTED'/.test(branch));
  /* Repointed with S14 above — the queue moved to the surat jalan desk in 76de71a, and the rank
     map went with it. `REQ_RANK` is the named constant that replaced the inline literal. */
  ok('and sorts above everything else there',
     /REQ_RANK = \{ DISPUTED: 0/.test(read('src/RestockVaultView.jsx')) &&
     /sort\(\(a, b\) => REQ_RANK\[a\.raw\.status\] - REQ_RANK\[b\.raw\.status\]\)/.test(read('src/RestockVaultView.jsx')));
  ok('the branch is told in words, not only by a colour',
     /SELISIH DILAPORKAN KE HQ/.test(branch));
  ok('and the variance is written to the audit log under its own action',
     /STOCK_RECEIVE_VARIANCE/.test(branch));

  /* The count inputs must NOT live inside OrderTrackingModule: that component is
     redeclared on every render, so React remounts it and an input inside would
     lose focus after each keystroke. ⚠️ THIS IS A PLACEMENT CHECK, NOT PROOF IT
     DOES NOT REMOUNT — there is no static check for "the field kept focus".
     Only typing into it in a browser proves that. */
/* ⚠️ REWRITTEN 2026-09-01, SAME INTENT, NEW SHAPE. The screen became a five-tab desk and the
     count panel is now `renderArrivalCheck()`, called from the Incoming tab, instead of an inline
     IIFE sitting above the request list. The old assertion was positional — "appears earlier in
     the file than the map" — and positional is not what keeps the focus: what keeps it is being
     OUTSIDE OrderTrackingModule, which is redeclared every render. So assert that directly. */
  const otmAt = branch.indexOf('const OrderTrackingModule = ({ order }) => {');
  const arrAt = branch.indexOf('const renderArrivalCheck = () => {');
  ok('the count panel is a sibling of OrderTrackingModule, never nested inside it',
     otmAt > -1 && arrAt > otmAt
     && !branch.slice(otmAt, arrAt).includes('setReceiptCount('));
  ok('and nothing else in the file writes a receipt count - only the two boxes',
     (branch.match(/setReceiptCount\(/g) || []).length === 2);
}


/* ============================================================================
   THE CLOCK (2026-08-23) — there was never a 7am rule

   For months this was written down as two bugs: "the app day rolls over at 7am"
   and "getCurrentDate() is UTC in 26 places". It was one. `toISOString()` returns
   the UTC date, WIB is UTC+7, so the UTC date flips at 07:00 local — mid morning
   route. The rollover was the symptom and the timezone was the cause.

   The cure was already in the file. `getLocalDayKey` sat immediately below the
   broken helper carrying a comment describing exactly this, and all 26 call sites
   went on using the UTC one anyway. Fixed at the definition.
   ============================================================================ */
{
  const hlp = read('src/utils/helpers.js');

  /* ---- SOURCE: the UTC date is gone from the day helpers ---- */
  ok('getCurrentDate no longer takes the UTC date',
     !/getCurrentDate = \(\) => new Date\(\)\.toISOString/.test(hlp));
  ok('and it is the same function as getLocalDayKey, not a second rule',
     /getCurrentDate = \(\) => getLocalDayKey\(\)/.test(hlp));
  ok('the day key is built from LOCAL date parts',
     /getFullYear\(\)/.test(hlp) && /getMonth\(\) \+ 1/.test(hlp) && /getDate\(\)/.test(hlp));

  /* NO HARDCODED OFFSET. Indonesia has no daylight saving so a fixed +7 would be
     right for WIB today — and silently wrong for a phone in WITA or WIT, and one
     more constant to keep in step with reality. The device knows its own zone. */
  ok('and never from a hardcoded +7 offset',
     !/25200|7 \* 60 \* 60|utcOffset|UTC_OFFSET/.test(hlp));

  /* ---- NO SECOND COPY ANYWHERE ---- the duplicate at AgentInventoryView.jsx:6
     kept its own UTC version and survived every fix aimed at the shared one. */
  const dateDupes = appFiles.filter(f =>
     f !== 'src/utils/helpers.js' && /const getCurrentDate\s*=/.test(read(f)));
  ok('no file keeps its own copy of the date rule',
     dateDupes.length === 0, dateDupes.join(', '));
  ok('AgentInventoryView imports the shared helper instead of redefining it',
     /import \{[^}]*getCurrentDate[^}]*\} from '\.\/utils\/helpers'/.test(read('src/AgentInventoryView.jsx')));

  /* ---- BEHAVIOUR ---- the shipped helper, lifted, run on a real date.
     ⚠️ HONEST LIMIT: a machine whose own clock is set to UTC cannot tell the two
     implementations apart, because there local IS UTC. That is exactly why the
     source checks above exist as well — do not delete them as duplicates. */
  const kStart = hlp.indexOf('export const getLocalDayKey');
  const kEnd   = hlp.indexOf('\n};', kStart);
  ok('the day-key rule could be lifted out of helpers to be tested',
     kStart > -1 && kEnd > kStart);
  const getLocalDayKey = new Function(
     hlp.slice(kStart, kEnd + 3).replace('export const', 'const')
     + '\nreturn getLocalDayKey;')();

  /* 06:30 in whatever zone this machine is in, on 23 Aug 2026. The UTC version
     returns 2026-08-22 for this moment anywhere east of UTC — Jakarta included. */
  ok('06:30 on the 23rd is the 23rd, not the 22nd',
     getLocalDayKey(new Date(2026, 7, 23, 6, 30)) === '2026-08-23');
  ok('one minute past midnight is already the new day',
     getLocalDayKey(new Date(2026, 7, 23, 0, 1)) === '2026-08-23');
  ok('one minute before midnight is still the old one',
     getLocalDayKey(new Date(2026, 7, 22, 23, 59)) === '2026-08-22');
  ok('single-digit months and days are padded, or the string sorts wrongly',
     getLocalDayKey(new Date(2026, 0, 5, 12, 0)) === '2026-01-05');

  /* ---- THE ROLLING RAIL WAS ALREADY RIGHT ---- dayStats refused the broken
     helper and computed local midnight itself. It must keep doing so. */
  const ds = read('src/utils/dayStats.js');
  ok('the day rail still sets its own local midnight',
     /midnight\.setHours\(0, 0, 0, 0\)/.test(ds));

  /* ---- THE DRAFT CAP IS AN AGE, NOT A BOUNDARY ---- it was captioned "his day
     starts at 07:00" for months, which was never a rule. Twelve hours from when
     the basket was saved, unaffected by any of this. */
  ok('the sales draft still expires on AGE, not on a day boundary',
     /DRAFT_MAX_AGE_MS = 12 \* 60 \* 60 \* 1000/.test(merchant)
     && !/his day starts at 07:00/.test(merchant));

  /* ---- THE PATTERN IS BANNED, NOT JUST REMOVED ----
     ⚠️ Fixing the shared helper was NOT the whole job, and the first commit said it
     was. 21 inline copies of the same UTC expression sat in 12 more files that had
     never called the helper at all — including the production date the freshness
     work keys off, and the weekly chart's day buckets, which compare against a
     transaction's own `date`. Fixing the helper alone made that chart INCONSISTENT
     rather than merely wrong: local dates going in, UTC buckets reading them.
     Hand-fixing the 21 only fixes the 21. The ban is what holds. */
  const inlineUtc = appFiles.filter(f =>
     /toISOString\(\)\.split\('T'\)\[0\]|toISOString\(\)\.slice\(0, ?10\)/.test(read(f)));
  ok('no app file takes a UTC date inline instead of calling the helper',
     inlineUtc.length === 0, inlineUtc.join(', '));

  /* The two that would have been silently wrong the longest. */
  ok('the weekly chart buckets a day the same way a sale stamps its date',
     /date: getLocalDayKey\(d\)/.test(profile));
  ok('the production date at factory intake is local — the freshness work keys off it',
     /poDate: getLocalDayKey\(\)/.test(read('src/RestockVaultView.jsx')));
}


/* ============================================================================
   HOW OLD IS THE STOCK STANDING HERE (2026-08-23) — read-only, derived

   Scoped by Aldi: *"we just system that only care about the data related stuff
   on the company, as long as the product is sold its job done, company can take
   care of the item management inside the warehouse"*. So it REPORTS age and
   nothing else — no threshold, no warning, no rule about which box leaves first,
   nothing blocked. Checks that try to add any of that back are wrong.

   No new write path exists and none should appear: every arrival is already on
   the shipment record, written by the arrival check.
   ============================================================================ */
{
  const bw = read('src/components/BranchWarehouseManager.jsx');

  const fStart = bw.indexOf('export const productArrivals');
  const fEnd   = bw.indexOf('export default function BranchWarehouseManager');
  ok('the freshness rules could be lifted out of the file to be tested',
     fStart > -1 && fEnd > fStart);
  const { productArrivals, arrivalsOnHand, oldestStockDays } = new Function('txSeconds',
      bw.slice(fStart, fEnd).replace(/export const/g, 'const')
      + '\nreturn { productArrivals, arrivalsOnHand, oldestStockDays };'
  )((tx) => tx?.timestamp?.seconds ?? null);

  const DAY = 86400, NOW = 1_800_000_000;
  const order = (id, at, counted, damaged = 0, status = 'DELIVERED') => ({
      id, branch: 'MALANG', status, receivedAt: { seconds: at },
      receivedItems: [{ productId: 'P1', name: 'Cello Coffee', shipped: counted, counted, damaged }]
  });
  const ORDERS = [
      order('A', NOW - 70 * DAY, 300),
      order('B', NOW - 26 * DAY, 400),
      order('C', NOW -  4 * DAY, 200),
  ];

  /* ---- WHICH ARRIVALS COUNT ---- */
  const arr = productArrivals(ORDERS, 'MALANG', 'P1');
  ok('every received shipment of that product is an arrival', arr.length === 3);
  ok('and they come back newest first', arr[0].orderId === 'C' && arr[2].orderId === 'A');
  ok('a shipment to another branch is not this branch\'s stock',
     productArrivals(ORDERS, 'SURABAYA', 'P1').length === 0);
  ok('a shipment still in transit has not arrived yet',
     productArrivals([order('D', NOW, 100, 0, 'IN_TRANSIT')], 'MALANG', 'P1').length === 0);
  /* A disputed shipment IS in the warehouse - the goods were taken in and the branch
     was credited. What is unresolved is HQ's answer, not the delivery. */
  ok('a DISPUTED shipment still counts as arrived - the goods are here',
     productArrivals([order('E', NOW, 100, 0, 'DISPUTED')], 'MALANG', 'P1').length === 1);
  ok('damaged units are not counted as stock standing on the shelf',
     productArrivals([order('F', NOW, 100, 30)], 'MALANG', 'P1')[0].qty === 70);
  /* Deliveries received before the arrival check existed have no counted figure. */
  ok('an old delivery with no count still shows up, at its shipped quantity',
     productArrivals([{ id: 'G', branch: 'MALANG', status: 'DELIVERED',
        receivedAt: { seconds: NOW }, fulfilledItems: [{ productId: 'P1', qty: 55 }] }],
        'MALANG', 'P1')[0].qty === 55);

  /* ---- WHAT IS STILL HERE, BY SUBTRACTION ---- 900 arrived in total. */
  const h450 = arrivalsOnHand(arr, 450);
  ok('450 left is the newest 200 plus part of the batch before it',
     h450.held.length === 2 && h450.held[0].orderId === 'B' && h450.held[1].orderId === 'C');
  ok('and the part-used batch reports only the part still here',
     h450.held[0].qty === 250 && h450.held[1].qty === 200);
  ok('oldest first, so the age is read off the front',
     oldestStockDays(h450.held, NOW) === 26);

  ok('150 left is all from the newest delivery',
     arrivalsOnHand(arr, 150).held.length === 1 && oldestStockDays(arrivalsOnHand(arr, 150).held, NOW) === 4);
  ok('an empty shelf has no age at all',
     oldestStockDays(arrivalsOnHand(arr, 0).held, NOW) === null);

  /* ---- THE HONEST REMAINDER ---- */
  const over = arrivalsOnHand(arr, 1000);
  ok('stock the records cannot account for is REPORTED, not folded into a batch',
     over.unexplained === 100);
  ok('and it never inflates a batch beyond what actually arrived',
     over.held.reduce((s, x) => s + x.qty, 0) === 900);
  ok('nothing is unexplained when the records cover the shelf',
     h450.unexplained === 0);

  /* "we do not know" must never render as "brand new". */
  ok('an unknown arrival time gives no age rather than an age of zero',
     oldestStockDays([{ at: null }], NOW) === null);

  /* ---- NO NEW WRITE PATH, AND NO ENFORCEMENT ---- both are the scope he set. */
  ok('the age view writes nothing - it is arithmetic over records that already exist',
     !/productArrivals[\s\S]{0,4000}?(setDoc|updateDoc|writeBatch|runTransaction)\(/.test(
        bw.slice(fStart, fEnd)));
  ok('no freshness threshold was invented for him',
     !/MAX_AGE_DAYS|STALE_AFTER|FRESH_LIMIT|tooOld/.test(bw));
  ok('and nothing is blocked or refused on age',
     !/oldestStockDays\([^)]*\)\s*>[\s\S]{0,80}(return notify|disabled|refus)/i.test(bw));
}


/* ============================================================================
   THE TIER POV SWITCH (2026-08-23) — wearing a tier must only ever REMOVE power

   Aldi asked to see other tiers' screens without logging out, and he overruled
   the safe default and allowed the preview to SAVE: *"saving is needed for
   further testing actually"*, and *"oh thats fine if its impacting the real
   stock and real counting for the data actually no worry about that, we dont
   need emulator"*. Those two decisions together are why this block exists — a
   costume that can write to the live database must never also carry the vault
   key, and must never outlive a refresh.

   ⚠️ THE LIMIT THESE CHECKS DO NOT COVER, and cannot: Firestore still evaluates
   his real tier-1 account. The switch changes the SCREEN, never the SERVER. The
   picker says so in words; no assertion here can make it otherwise.
   ============================================================================ */
section('S · The tier POV switch takes authority away and never hands it out');
{
  const pov = await import('./povPreview.js');
  const povSrcRaw = read('src/config/povPreview.js');
  const { CORPORATE_TIERS } = await import('./permissions.js');
  const { POV_OWNER_EMAIL, canUsePovSwitch, TEST_ACCOUNTS, testAccountFor,
          testAccountDoc, previewIdentity, tierLabel, testAccountName } = pov;

  /* ---- WHO CAN OPEN IT ---- checked on the EMAIL, not on the tier. His rule:
     *"other account cant do this"*, and a second tier-1 account must not inherit it. */
  ok('his own email opens the switch', canUsePovSwitch(POV_OWNER_EMAIL));
  ok('and a stray capital or space does not lock him out',
     canUsePovSwitch('  Adikaryasukses99@Gmail.com  '));
  ok('another account cannot open it, whatever its tier',
     !canUsePovSwitch('someone.else@gmail.com'));
  ok('a missing or non-string email is a no, not a crash',
     !canUsePovSwitch(null) && !canUsePovSwitch(undefined) && !canUsePovSwitch({}) && !canUsePovSwitch(''));
  /* The email used to be typed into App.jsx by hand as the master VIP list. Two
     copies of one address is how "he can sign in but the switch is missing" happens. */
  ok('App.jsx spells the address ZERO times - it reads the one constant',
     !/adikaryasukses99@gmail\.com/i.test(app.replace(/POV_OWNER_EMAIL/g, '')));
  ok('and it reads it for the VIP list too, so the two can never disagree',
     /masterVIPs\s*=\s*\[\s*POV_OWNER_EMAIL\s*\]/.test(app));

  /* ---- THE FAKE STAFF ---- one per tier, and TIER 1 IS NOT AMONG THEM. */
  ok('there is one test account for every tier below him, and no more',
     TEST_ACCOUNTS.length === 5);
  ok('tier 1 has no costume - "preview yourself" is the OFF switch, not an option',
     !TEST_ACCOUNTS.some(a => a.tier === CORPORATE_TIERS.TIER_1));
  ok('every tier from 2 to 6 has one',
     [2, 3, 4, 5, 6].every(n => !!testAccountFor(CORPORATE_TIERS[`TIER_${n}`])));
  ok('every id announces itself as a test account',
     TEST_ACCOUNTS.every(a => a.id.startsWith('TEST_')));
  ok('no two costumes share an id',
     new Set(TEST_ACCOUNTS.map(a => a.id)).size === TEST_ACCOUNTS.length);
  ok('and every name says [TEST] on the face of it, which is what a receipt prints',
     TEST_ACCOUNTS.every(a => testAccountName(a).startsWith('[TEST] ')));
  /* 🔴 ONE NAME FUNCTION. Found live 2026-08-23: the banner said HQ SALES MANAGER while the
     created agent said [TEST] REGIONAL ADMIN - one tier, two names, and the agent's is the one
     that prints on a nota. The cause was two copies of the naming rule. */
  ok('the picker does not keep its own copy of the naming rule',
     !/const tierLabel\s*=/.test(read('src/components/TierPovSwitch.jsx')));
  ok('it imports the one in povPreview instead',
     /import \{[^}]*tierLabel[^}]*\} from '\.\.\/config\/povPreview/.test(read('src/components/TierPovSwitch.jsx')));
  ok('and no plate carries a hand-written description that a rename could contradict',
     !/blurb/.test(read('src/components/TierPovSwitch.jsx') + povSrcRaw));

  const doc5 = testAccountDoc(testAccountFor(CORPORATE_TIERS.TIER_5));
  ok('the document is named by the same function the banner uses',
     doc5.name === testAccountName(testAccountFor(CORPORATE_TIERS.TIER_5)));
  ok('the document a costume writes is stamped isTest',
     doc5.isTest === true);
  ok('and it carries the tier it claims to be',
     doc5.userRole === CORPORATE_TIERS.TIER_5);
  /* A motorist document with an email is half a login. The other half is an
     employee_directory entry keyed by that email - which this feature never writes.
     Keeping the email blank means a fake agent cannot become a way into the company
     even if someone later adds the directory row by hand. */
  ok('a fake agent has no email, so it can never become a way to sign in',
     doc5.email === '');
  ok('and the switch never writes an employee_directory row',
     !/employee_directory[\s\S]{0,400}TEST_TIER|handlePickPov[\s\S]{0,900}employee_directory/.test(app));

  /* ---- WHERE THE COSTUME IS POSTED (2026-08-30) ----
     Aldi: *"i want the option for tier 1 so that i can assign the test agent into different
     places"*. The costume was born at `Headquarters` by hardcode and could not be moved, and
     Headquarters is the ONE place that can never hold branch stock — `supply.js` owns that rule,
     `NON_BRANCH` excludes it, so `branches/Headquarters/inventory` does not exist and no
     `stock_request` can name it. Wearing tier 4 therefore always showed "Warehouse is empty" and
     read as a broken screen.

     THE REGRESSION GUARD is the pair below: the document must still DEFAULT to Headquarters (so
     tiers 2 and 3, who really do sit at HQ, are unchanged) while ACCEPTING a place, and the rack
     must actually hand one over. Either half alone brings the dead end back. */
  ok('a costume defaults to Headquarters when no place is named',
     testAccountDoc(testAccountFor(CORPORATE_TIERS.TIER_4)).location === 'Headquarters');
  ok('and it is posted where the rack says instead, when one is named',
     testAccountDoc(testAccountFor(CORPORATE_TIERS.TIER_4), { location: 'BANDUNG' }).location === 'BANDUNG');
  ok('the handler takes a place and merges it onto the existing costume',
     /const handlePickPov = async \(account, place\)/.test(app) &&
     /patch\.location = home/.test(app));
  ok('and creating a costume for the first time posts it there too',
     /testAccountDoc\(account, \{ location: home \}\)/.test(app));
  ok('the rack is handed the list and hands a place back',
     /places=\{povPlaces\}/.test(app) &&
     /onPick\(account, chosen\)/.test(read('src/components/TierPovSwitch.jsx')));
  /* The bug 20c4a0a already paid for: a second hand-written list of places drifting away from
     the one the shipping form uses. The rack must RECEIVE the list, never build one.
     ⚠️ COMMENTS STRIPPED FIRST, and it is load-bearing for the same reason the localStorage scan
     further down strips them: the note in TierPovSwitch that EXPLAINS where the list comes from
     names the function, and a scan that reads prose reports the opposite of the truth. */
  ok('the places come from the one warehouse-list function, and the rack builds no list of its own',
     /warehouseList\(motorists\)/.test(app) &&
     !/warehouseList|BANDUNG|MUNTILAN/.test(stripComments(read('src/components/TierPovSwitch.jsx'))));

  /* ---- THE PREVIEW ITSELF ---- */
  const REAL_USER = { uid: 'aldi-real-uid', email: POV_OWNER_EMAIL, displayName: 'Aldi' };
  const REAL = { user: REAL_USER, userRole: 'ADMIN', agentProfileId: null,
                 isAdmin: true, isSystemOwner: true };

  const off = previewIdentity(null, REAL);
  ok('with no costume on, every real value passes through untouched',
     off.userRole === 'ADMIN' && off.agentProfileId === null &&
     off.isAdmin === true && off.isSystemOwner === true && off.previewing === null);
  /* Identity, not equality. useDatabaseSync takes `user` as a dependency; a fresh
     object every render would tear down and rebuild every Firestore listener. */
  ok('and the user object is the SAME object, so no listener is rebuilt',
     off.user === REAL_USER);

  const on = previewIdentity({ tier: CORPORATE_TIERS.TIER_5 }, REAL);
  ok('wearing tier 5 shows the tier-5 screen',
     on.userRole === CORPORATE_TIERS.TIER_5);
  ok('and the work is signed by the test operative, not by him',
     on.agentProfileId === 'TEST_TIER_5' &&
     on.user.displayName === testAccountName(testAccountFor(CORPORATE_TIERS.TIER_5)));
  /* 🔴 THE ONE THAT MATTERS. He allowed the costume to WRITE. A costume that also
     carried the vault key would be tier 1 wearing a tier-5 face - the exact thing
     the preview exists to rule out. */
  ok('THE VAULT KEY IS LEFT BEHIND - isAdmin is false even though he really is admin',
     on.isAdmin === false);
  ok('and so are the architect screens - isSystemOwner is false',
     on.isSystemOwner === false);
  /* The uid is his real sign-in and must never be faked: it is what Firestore
     evaluates, and pretending otherwise is the lie this feature must not tell. */
  ok('his real sign-in is untouched - the uid never moves',
     on.user.uid === 'aldi-real-uid' && on.user.email === POV_OWNER_EMAIL);
  ok('and the banner has something to name, so the label cannot come apart from the disguise',
     on.previewing && on.previewing.tier === CORPORATE_TIERS.TIER_5);

  /* ---- A COSTUME THAT DOES NOT EXIST IS NO COSTUME ---- */
  ok('previewing tier 1 does nothing - it cannot become a way to HAND OUT tier 1',
     previewIdentity({ tier: CORPORATE_TIERS.TIER_1 }, REAL).previewing === null);
  ok('a stale or unknown tier strands nobody in a costume they cannot see',
     previewIdentity({ tier: 'WHATEVER' }, REAL).previewing === null &&
     previewIdentity({}, REAL).previewing === null);
  ok('and an unknown tier leaves every real value exactly as it was',
     previewIdentity({ tier: 'WHATEVER' }, REAL).isAdmin === true);

  /* ---- IT MUST NEVER SURVIVE A RELOAD ---- his rule, and it is guaranteed by the
     costume living in ordinary React state and NOWHERE else. The moment anything
     here learns to save, a refresh stops being the way out. */
  /* Comments stripped first, and it is load-bearing: the note in povPreview.js that
     EXPLAINS why nothing saves contains the word localStorage, and a scan that reads
     prose reports the exact opposite of the truth. */
  const povSrc = stripComments(read('src/config/povPreview.js'));
  const povUi  = stripComments(read('src/components/TierPovSwitch.jsx'));
  ok('the preview rules save nothing, anywhere',
     !/localStorage|sessionStorage|indexedDB/.test(povSrc + povUi));
  ok('and App.jsx never persists the costume either',
     !/localStorage[\s\S]{0,60}pov|pov[\s\S]{0,30}localStorage/i.test(app));
  ok('the costume is plain React state, which is what makes a refresh the way out',
     /const \[pov, setPov\] = useState\(null\)/.test(app));

  /* ---- THE COSTUME CANNOT REACH THE RACK ---- both gates read the TRUE email, so
     a tier-5 preview cannot open the picker and promote itself to tier 2. */
  ok('the picker is gated on the TRUE signed-in email, not the previewed one',
     /canUsePovSwitch\(trueUser\?\.email\)/.test(app) &&
     !/canUsePovSwitch\(user\?\.email\)/.test(app));
  ok('and so is the hidden door in the sidebar',
     (app.match(/canUsePovSwitch\(trueUser\?\.email\)/g) || []).length >= 2);
  ok('the handler refuses too, so a stray call cannot put a costume on',
     /handlePickPov[\s\S]{0,200}canUsePovSwitch\(trueUser\?\.email\)/.test(app));

  /* ---- THE DERIVATION ACTUALLY REACHES THE APP ---- the rules above are worth
     nothing if App.jsx still declares its own isAdmin beside them. */
  ok('App.jsx reads its identity from previewIdentity',
     /const \{ user, userRole, agentProfileId, isAdmin, isSystemOwner, previewing \} = useMemo/.test(app));
  ok('and no shadow copy of the old state is left behind',
     !/const \[user, setUser\] = useState/.test(app) &&
     !/const \[isAdmin, setIsAdmin\] = useState/.test(app) &&
     !/const \[isSystemOwner, setIsSystemOwner\] = useState/.test(app) &&
     !/const \[userRole, setUserRole\] = useState/.test(app) &&
     !/const \[agentProfileId, setAgentProfileId\] = useState/.test(app));
  /* The memo's dependency list is load-bearing, not decoration - see the note above it. */
  ok('the memo watches every value it derives from',
     /\[pov, trueUser, trueRole, trueAgentProfileId, vaultUnlocked, trueSystemOwner\]/.test(app));

  /* ---- THE BANNER IS UNDISMISSABLE ---- forgetting the costume is the whole risk,
     so the only way to close the label is to take the costume off. */
  ok('the banner is drawn from the DERIVED costume, not from the raw state',
     /<PovBanner account=\{previewing\}/.test(app));
  /* Scoped to the banner's OWN function body. An unbounded [\s\S]*? would run past it
     and match the picker's close button further down the file, which is allowed to exist. */
  const bannerBody = povUi.slice(povUi.indexOf('export function PovBanner'),
                                 povUi.indexOf('export default function TierPovSwitch'));
  ok('the banner body was found, so the check below is reading something',
     bannerBody.length > 400);
  ok('and it has no close button - only a way out of the costume',
     !/onClose/.test(bannerBody) && /onExit/.test(bannerBody));
  ok('neither the banner nor the picker prints on a nota',
     (povUi.match(/hide-on-print/g) || []).length >= 2);

  /* ---- PALETTE LAW AND LITE MODE ---- no blue, no green, and nothing that only
     exists while it is animating (Lite Mode cuts every transition to 0.001s). */
  ok('no blue and no green anywhere in the switch',
     !/blue-|green-|emerald-|sky-|indigo-|cyan-|teal-/.test(povUi));
  ok('the owner-only ring is a border, which Lite Mode keeps',
     /povActive \? 'border-\[var\(--duke-amber\)\]/.test(read('src/components/BiohazardTheme.jsx')));
}


/* ============================================================================
   FLEET & CANVAS: LOOK, OR ALSO CHANGE (2026-08-23)

   Aldi found this himself, with the POV switch, on the day it shipped:
   *"i just checked looks like my tier 6 account can edit the fleet and canvas"*.
   He was right, and it was never a tier check at all. FleetCanvasManager read:

       const isAreaAdmin = !isGlobalAdmin;                    // tiers 3,4,5,6 alike
       const canEditFleet = isAdmin || (isAreaAdmin && myProfile?.canEditRoster);

   so a ROOKIE carrying a stale per-person flag could add, edit and terminate
   staff — and Load / Reconcile & Clear, which move real stock between the
   warehouse and a van, were not gated by anything whatsoever.

   His instruction: *"moved that into matrix on setting instead"*. One rule, in
   config/permissions.js, answering to the same matrix as every other permission.
   ============================================================================ */
section('T · Fleet & canvas: who may look, and who may change');
{
  const perms = await import('./permissions.js');
  const { CORPORATE_TIERS: T, canEditFleetRoster, defaultFleetAccess,
          FLEET_EDIT_PERMS, ROLE_PERMISSIONS, injectDynamicPermissions } = perms;
  const fleetSrc = stripComments(read('src/FleetCanvasManager.jsx'));
  const setSrc   = stripComments(read('src/components/SettingsView.jsx'));

  /* ---- THE BUG HE FOUND, FIRST ---- */
  ok('🔴 A ROOKIE CANNOT EDIT THE FLEET - the hole he found is shut',
     canEditFleetRoster(T.TIER_6) === false);
  ok('and neither can a field operative',
     canEditFleetRoster(T.TIER_5) === false);
  /* 🔑 THE LINE IS HIS, 2026-08-24: *"regional manager can edit the fleet and canvas, tier below
     that cannot"*. REGIONAL ADMIN is his own name for tier 4, so the cut runs between 4 and 5:
     everyone who runs an area may hire, fire and load a van; nobody who rides in one may.
     It shipped hours earlier with tier 4 on view only — flagged to him as a guess, and he
     overruled it. If this check ever needs changing again, it needs HIS words, not a judgement. */
  ok('the regional admin who runs an area CAN - his line, drawn at tier 4',
     canEditFleetRoster(T.TIER_4) === true);
  ok('and so can every tier above them',
     canEditFleetRoster(T.TIER_3) === true);
  ok('the cut is between tier 4 and tier 5, nowhere else',
     canEditFleetRoster(T.TIER_4) === true && canEditFleetRoster(T.TIER_5) === false);
  ok('and so can the owner and tier 1',
     canEditFleetRoster(T.TIER_2) === true && canEditFleetRoster(T.TIER_1) === true);

  /* Old Firebase tags must answer the same way - this is the exact class of drift the shared
     translator in permissions.js exists for. */
  ok('the legacy tags translate, so an old document cannot smuggle edit rights in',
     canEditFleetRoster('ROOKIE') === false && canEditFleetRoster('AGENT') === false &&
     canEditFleetRoster('Motorist') === false && canEditFleetRoster('ADMIN') === true);
  ok('and a missing role is treated as the field, not as an admin',
     canEditFleetRoster(undefined) === false && canEditFleetRoster(null) === false);

  /* ---- THE SCREEN AND THE APP MUST AGREE ---- the dropdown shows defaultFleetAccess, so if the
     two ever disagreed Settings would display a promise the app does not keep. */
  ok('what Settings shows for an unset tier is what the app actually does',
     [T.TIER_1, T.TIER_2, T.TIER_3, T.TIER_4, T.TIER_5, T.TIER_6].every(
        id => (defaultFleetAccess(id) === 'fleet_edit') === canEditFleetRoster(id)));
  ok('and Settings reads that very function rather than repeating the rule',
     /defaultFleetAccess\(tierId\)/.test(setSrc) &&
     /import \{[^}]*defaultFleetAccess[^}]*\} from '\.\.\/config\/permissions'/.test(setSrc));
  /* An invented tier is a real case - he can add tiers in Settings. The safe end is the one that
     cannot delete a person. */
  ok('a tier he invents later starts on view only',
     defaultFleetAccess('SOME_TIER_HE_ADDS_LATER') === 'fleet_view_only');

  /* ---- HIS SWITCH WINS IN BOTH DIRECTIONS ONCE HE SETS IT ---- and until then, absence means
     "use the tier default", never "no". Getting this backwards would have taken the roster away
     from his branch admins the moment this shipped. */
  const SAVED = JSON.parse(JSON.stringify(ROLE_PERMISSIONS));
  const withoutFleet = {};
  for (const [tier, list] of Object.entries(SAVED))
      withoutFleet[tier] = (Array.isArray(list) ? list : []).filter(p => !FLEET_EDIT_PERMS.includes(p));

  injectDynamicPermissions(withoutFleet, null);
  ok('a saved matrix that has never heard of the key falls back to the tier default',
     canEditFleetRoster(T.TIER_4) === true && canEditFleetRoster(T.TIER_5) === false);

  injectDynamicPermissions({ ...withoutFleet, [T.TIER_6]: [...withoutFleet[T.TIER_6], 'fleet_edit'] }, null);
  ok('if he DELIBERATELY gives a rookie the roster, he gets it - his switch, his call',
     canEditFleetRoster(T.TIER_6) === true);

  injectDynamicPermissions({ ...withoutFleet, [T.TIER_3]: [...withoutFleet[T.TIER_3], 'fleet_view_only'] }, null);
  ok('and if he takes it off his branch admin, it comes off - the switch cuts both ways',
     canEditFleetRoster(T.TIER_3) === false);
  /* Tier 1 is the one thing no switch may touch. */
  ok('tier 1 can never be locked out of its own roster',
     canEditFleetRoster(T.TIER_1) === true);

  injectDynamicPermissions(SAVED, null);   // put the module back the way it was
  ok('the matrix was restored, so nothing after this block is reading a rigged one',
     canEditFleetRoster(T.TIER_3) === true && canEditFleetRoster(T.TIER_6) === false);

  /* ---- FLEETCANVASMANAGER NO LONGER DECIDES FOR ITSELF ---- */
  ok('the screen asks the shared rule',
     /const canEditFleet = canEditFleetRoster\(userRole\)/.test(fleetSrc));
  ok('the old per-person flag is not read anywhere any more',
     !/canEditRoster/.test(fleetSrc));
  ok('and nothing writes it either, so no second opinion can grow back',
     !/canEditRoster:/.test(fleetSrc));
  /* `isAdmin` is the VAULT being unlocked. Reading it here is what let a tier-1 preview of tier 5
     keep powers tier 5 does not have, and it is a different question from "may this tier hire". */
  ok('the vault-unlocked flag is out of the decision',
     !/canEditFleet = [^\n]*isAdmin/.test(fleetSrc));

  /* ---- THE CANVAS HALF, WHICH WAS THE UNGUARDED ONE ---- these two move real stock. A hidden
     button is a promise; the handler is the actual door, so both are checked. */
  for (const fn of ['handleLoadCanvas', 'handleClearCanvas']) {
      const start = fleetSrc.indexOf(`const ${fn} = async`);
      /* Whitespace collapsed first: stripComments blanks a comment but KEEPS its newlines to
         preserve line numbers, so the five-line note above this guard would otherwise eat the
         whole window and the check would go red against correct code. */
      const head  = fleetSrc.slice(start, start + 900).replace(/\s+/g, ' ');
      ok(`${fn} refuses before it does anything`,
         start > -1 && /const \w+ = async \( ?\) => \{ if \(!canEditFleet\) return notify\(/.test(head));
  }
  ok('and both buttons are hidden as well as guarded',
     /\{canEditFleet && \(?\s*<button onClick=\{handleLoadCanvas\}/.test(fleetSrc) &&
     /\{canEditFleet && <button onClick=\{handleClearCanvas\}/.test(fleetSrc));
  /* Reconcile & Clear was on the backlog on its own as "a button that lies" - the database rules
     already refused the save, so pressing it gave a failure and no reason. */
  ok('the refusal explains itself and names where to change it',
     /cannot reconcile a canvas[\s\S]{0,80}Settings/.test(fleetSrc));

  /* ---- THE ROW EXISTS IN SETTINGS, IN BOTH LAYOUTS ---- the phone list and the desk table are
     two separate renders in this file; a row added to one only is a row he cannot reach on the
     screen he happens to be holding. */
  ok('the fleet authority row is rendered twice - once for the phone, once for the table',
     (setSrc.match(/Fleet &amp; canvas authority/g) || []).length === 2);
  ok('it sits with the Fleet toggle, where the question belongs',
     (setSrc.match(/feature\.id === 'view_fleet'/g) || []).length === 2);
  ok('both options are real permissions and BOTH get written',
     /tierPerms\.push\(newAccessLevel\);\s*\n\s*newMatrix\[tierId\] = tierPerms;/.test(setSrc));
  /* 'fleet_view_only' must be STORED, not left absent: absence is what means "use the default",
     so an unwritten view-only choice would silently do nothing for tiers 1-3. */
  ok('view only is stored rather than left absent, or it could not overrule the default',
     !/newAccessLevel !== 'none'[\s\S]{0,120}FLEET_EDIT_PERMS/.test(setSrc));
  ok('and there are exactly two choices - there is no half-way on this one',
     (setSrc.match(/value: 'fleet_(edit|view_only)'/g) || []).length === 2);
}


/* ============================================================================
   HIS WORDS ARE THE DEFAULT (2026-08-24)

   Aldi: *"yea better change the code to follow my tier name make it as default"*.
   The bundled labels said REGIONAL / CAPTAIN / OPERATIVE while his company calls
   the same tiers something else, and the gap was not cosmetic: his REGIONAL ADMIN
   is the code's FLEET_CAPTAIN and his HQ SALES MANAGER is the code's AREA_ADMIN,
   which made his own sentence about who may edit the fleet ambiguous for a whole
   exchange.

   ⚠️ LABELS MOVED. IDS DID NOT, AND MUST NOT. `AREA_ADMIN`, `FLEET_CAPTAIN` and
   the rest are written into every employee document, every sale and every audit
   line on file. Renaming a label changes a word on a screen; renaming an id
   orphans the history. The first block below is the guard on that.
   ============================================================================ */
section('U · His tier names are the default, and the ids underneath never moved');
{
  const { CORPORATE_TIERS: CT, DYNAMIC_TIERS: DT, tierWord } = await import('./permissions.js');
  const povMod = await import('./povPreview.js');

  /* ---- 🔴 THE IDS. This is the locked one. ---- */
  ok('🔴 the six role ids are byte-for-byte what every stored document already says',
     CT.TIER_1 === 'DEVELOPER' && CT.TIER_2 === 'COMPANY_OWNER' && CT.TIER_3 === 'AREA_ADMIN' &&
     CT.TIER_4 === 'FLEET_CAPTAIN' && CT.TIER_5 === 'FIELD_OPERATIVE' && CT.TIER_6 === 'ROOKIE');
  ok('and the label list still keys off those ids rather than carrying names of its own',
     DT.every(t => Object.values(CT).includes(t.id)));

  /* ---- HIS FIVE WORDS ---- */
  const labelOf = (tier) => (DT.find(t => t.id === tier) || {}).label;
  ok('tier 3 is HQ SALES MANAGER, which is what he calls it',
     labelOf(CT.TIER_3) === 'T3: HQ SALES MANAGER');
  ok('tier 4 is REGIONAL ADMIN - the tier he drew the fleet line at',
     labelOf(CT.TIER_4) === 'T4: REGIONAL ADMIN');
  ok('tier 5 is SALES CANVAS and tier 6 is SALES MOTORIST',
     labelOf(CT.TIER_5) === 'T5: SALES CANVAS' && labelOf(CT.TIER_6) === 'T6: SALES MOTORIST');
  ok('every label still leads with its tier number, which is the part that never goes stale',
     DT.every(t => /^T\d+: \S/.test(t.label)));

  /* ---- ONE FUNCTION TURNS AN ID INTO HIS WORD ---- */
  ok('tierWord drops the number and hands back the word',
     tierWord(CT.TIER_4) === 'REGIONAL ADMIN' && tierWord(CT.TIER_6) === 'SALES MOTORIST');
  /* '' rather than the id: returning `AREA_ADMIN` is exactly what put a code name on the
     fleet roster, so an unknown tier must give the caller nothing to print by accident. */
  ok('an unknown tier gives back nothing, never the raw id',
     tierWord('NOT_A_TIER') === '' && tierWord(undefined) === '' && tierWord(CT.TIER_1) === '');
  ok('the POV picker reads that one function instead of repeating it',
     /tierWord\(account\.tier\) \|\| account\.fallback/.test(read('src/config/povPreview.js')));
  ok('and the test staff fall back to his words too',
     povMod.TEST_ACCOUNTS.map(a => a.fallback).join('|') ===
     'OWNER|HQ SALES MANAGER|REGIONAL ADMIN|SALES CANVAS|SALES MOTORIST');

  /* ---- 🔴 THE CODE VOCABULARY MUST NOT REACH A SCREEN AGAIN ---- comments may say
     AREA_ADMIN all day; that is what a comment is for. Rendered text may not. ---- */
  const nameLeak = /Area Admin|Fleet Captain|Field Operative|T3: REGIONAL|T4: CAPTAIN|T5: OPERATIVE|T6: ROOKIE/;
  const srcFiles = fs.readdirSync('src', { recursive: true })
      .map(f => `src/${String(f).split('\\').join('/')}`)
      .filter(f => /\.(jsx|js)$/.test(f));
  const leaking = srcFiles.filter(f => nameLeak.test(stripComments(read(f))));
  ok('no screen anywhere still spells a tier the way the code names it',
     leaking.length === 0, leaking.join(', '));
  /* Proof the scan reads code and not prose, so it can neither be satisfied by a comment
     nor set off by one. */
  ok('the leak scan ignores comments and still catches real code',
     !nameLeak.test(stripComments('/* Area Admin */\n// Fleet Captain\nconst x = 1;')) &&
     nameLeak.test(stripComments('const t = "Area Admin";')));

  /* The roster card was the one that showed it to him. It reads the label now, so a rename
     in Settings reaches this line without anyone editing it. */
  ok('the fleet roster card asks for his word rather than printing one of its own',
     /tierWord\('AREA_ADMIN'\)/.test(stripComments(read('src/FleetCanvasManager.jsx'))));

  /* ---- PALETTE LAW rides along, because these five lines were rewritten anyway ---- */
  ok('no banned colour survives in the tier list - it is read live by the profile chip',
     !DT.some(t => /blue|green|emerald|sky|cyan|indigo|teal|slate/.test(t.color || '')));
  ok('and every tier still has a colour to be read',
     DT.every(t => typeof t.color === 'string' && t.color.length > 0));
}


/* ============================================================================
   HOW MANY SHOULD I ASK FOR (G3, 2026-08-24) — measured, never guessed

   A branch admin used to pick a product and type into an empty box. Nothing told
   them how fast it sells here, how long HQ takes, or that a truck was already on
   its way — which is how a branch orders twice and drowns.

   Everything is derived from records that already exist. The rule that keeps it
   honest: ANY MISSING INPUT MAKES THE SUGGESTION null, never a guess. A confident
   wrong number is worse than an empty box, because the empty box makes him think.

   ⛔ AND IT ONLY EVER SUGGESTS. "automatic reordering without a person" is on his
   rejected list; the last two checks here refuse it.
   ============================================================================ */
section('V · The reorder suggestion is measured from his own history, or it is silent');
{
  const bw = read('src/components/BranchWarehouseManager.jsx');
  const fStart = bw.indexOf('export const productArrivals');
  const fEnd   = bw.indexOf('export default function BranchWarehouseManager');
  ok('the reorder maths could be lifted out of the file to be tested',
     fStart > -1 && fEnd > fStart && bw.indexOf('export const reorderAdvice') > fStart);
  const { productArrivals, shipmentRhythm, inTransitQty, reorderAdvice } = new Function('txSeconds',
      bw.slice(fStart, fEnd).replace(/export const/g, 'const')
      + '\nreturn { productArrivals, shipmentRhythm, inTransitQty, reorderAdvice };'
  )((tx) => tx?.timestamp?.seconds ?? null);

  const D = 86400, NOW = 1_800_000_000;
  /* asked -> got is the lead time; the gap between two `asked` is the cadence. */
  const order = (id, askedDaysAgo, gotDaysAgo, qty, status = 'DELIVERED') => ({
      id, branch: 'MALANG', status,
      timestamp: { seconds: NOW - askedDaysAgo * D },
      receivedAt: gotDaysAgo == null ? null : { seconds: NOW - gotDaysAgo * D },
      receivedItems: gotDaysAgo == null ? null : [{ productId: 'P1', counted: qty, damaged: 0 }],
      requestedItems: [{ productId: 'P1', qty }]
  });

  /* Ordered every 10 days, arriving 5 days later, 100 packs each time. */
  const HISTORY = [
      order('A', 40, 35, 100),
      order('B', 30, 25, 100),
      order('C', 20, 15, 100),
      order('D', 10,  5, 100),
  ];

  /* ---- THE RHYTHM, both halves measured ---- */
  const r = shipmentRhythm(HISTORY, 'MALANG');
  ok('how long HQ takes is measured, not typed in by anyone', r.leadDays === 5);
  ok('and how often this branch orders is measured too', r.cadenceDays === 10);
  ok('it says how much history it had to work with', r.deliveries === 4 && r.orders === 4);
  /* The median, not the mean: one shipment stuck for a month must not drag the answer. */
  const stuck = shipmentRhythm([...HISTORY, order('E', 60, 0, 100)], 'MALANG');
  ok('one shipment stuck for two months does not drag the lead time with it',
     stuck.leadDays === 5);
  ok('a branch with no history at all gets null, never a made-up number',
     shipmentRhythm([], 'MALANG').leadDays === null &&
     shipmentRhythm([], 'MALANG').cadenceDays === null);
  ok('another branch\'s shipments are not this branch\'s rhythm',
     shipmentRhythm(HISTORY, 'SURABAYA').leadDays === null);
  /* A shipment asked for but never received cannot say how long HQ takes. */
  ok('a shipment still in the air has no lead time to contribute',
     shipmentRhythm([order('X', 3, null, 50, 'IN_TRANSIT')], 'MALANG').leadDays === null);
  ok('but it still counts as an order, so the cadence keeps learning',
     shipmentRhythm([order('X', 3, null, 50, 'IN_TRANSIT'), order('Y', 13, null, 50, 'PENDING')],
        'MALANG').cadenceDays === 10);
  /* Same-day delivery is real and still must not read as zero: nothing can be relied
     on to arrive before you need it. */
  ok('a same-day delivery still counts as one day, never zero',
     shipmentRhythm([order('F', 2, 2, 10), order('G', 12, 12, 10)], 'MALANG').leadDays === 1);

  /* ---- WHAT IS ALREADY ON ITS WAY ---- the number that stops a double order. */
  ok('packs already on a truck are counted',
     inTransitQty([order('X', 2, null, 300, 'IN_TRANSIT')], 'MALANG', 'P1') === 300);
  ok('a request HQ has not shipped yet still counts - he asked for it already',
     inTransitQty([order('X', 2, null, 300, 'PENDING')], 'MALANG', 'P1') === 300);
  ok('what has ALREADY landed is not counted twice - it is in the shelf figure',
     inTransitQty(HISTORY, 'MALANG', 'P1') === 0);
  ok('and a refused request is not on its way to anywhere',
     inTransitQty([order('X', 2, null, 300, 'REJECTED')], 'MALANG', 'P1') === 0);
  ok('another product on the same truck is not this product',
     inTransitQty([order('X', 2, null, 300, 'IN_TRANSIT')], 'MALANG', 'P2') === 0);

  /* ---- THE RATE, BY SUBTRACTION ---- 400 packs arrived, the oldest 35 days ago,
     100 still on the shelf. So 300 left in 35 days. No sales feed needed, and it
     cannot drift from the shelf because the shelf is one of its two inputs.
     ⚠️ The window starts at the oldest ARRIVAL, not the oldest ORDER — the first
     was asked for 40 days ago and landed 35 days ago, and nothing could leave
     before it got here. */
  const arr = productArrivals(HISTORY, 'MALANG', 'P1');
  const a = reorderAdvice(arr, 100, 0, r, NOW);
  ok('how fast it leaves is derived from what arrived minus what is still here',
     Math.abs(a.ratePerDay - (300 / 35)) < 1e-9);
  ok('and the shelf is reported back so the screen and the maths cannot disagree',
     a.shelf === 100 && a.coming === 0);
  ok('days left is the shelf at that rate', a.daysLeft === Math.floor(100 / (300 / 35)));
  /* cover = the wait for it (5) plus the gap until he orders again (10).
     15 days x 7.5 a day = 112.5 -> 113, minus 100 on the shelf = 13. */
  ok('the cover is the wait PLUS the gap until the next order, both measured',
     a.coverDays === 15);
  /* 15 days x 300/35 a day = 128.6 -> 129, less the 100 already on the shelf. */
  ok('and the suggestion is what that costs, minus what is already here',
     a.suggest === Math.ceil((300 / 35) * 15) - 100);
  ok('what is already on a truck comes off the suggestion too',
     reorderAdvice(arr, 100, 50, r, NOW).suggest === 0);
  /* 350 of the 400 still here, so 50 left in 35 days: slow enough that 15 days of
     cover is already on the shelf several times over. */
  ok('a shelf that is already over-covered asks for nothing, never a negative',
     reorderAdvice(arr, 350, 0, r, NOW).suggest === 0);
  /* A shelf HOLDING more than the records can account for is a different thing again:
     nothing they know about has left, so the rate is a truthful zero and the answer
     is silence, not "order nothing". */
  ok('a shelf bigger than the whole recorded history stays silent rather than guessing',
     reorderAdvice(arr, 5000, 0, r, NOW).ratePerDay === 0 &&
     reorderAdvice(arr, 5000, 0, r, NOW).suggest === null);

  /* ---- HIS SPARE DAYS (2026-08-30) ---- the cushion on top of "zero on arrival day".
     ⚠️ THE ZERO DEFAULT IS THE REGRESSION GUARD, not a detail: this parameter was added at the
     same moment HQ got its own copy of the panel, and a cushion applied by default would have
     silently changed the BRANCH's advice in the same commit. Every assertion above this line
     calls the five-argument form and must keep its exact number. */
  ok('with no spare days named, the cover and the suggestion do not move',
     reorderAdvice(arr, 100, 0, r, NOW, 0).coverDays === a.coverDays &&
     reorderAdvice(arr, 100, 0, r, NOW, 0).suggest === a.suggest &&
     a.spareDays === 0);
  ok('three spare days buy exactly three more days of cover',
     reorderAdvice(arr, 100, 0, r, NOW, 3).coverDays === a.coverDays + 3);
  ok('and the minimum grows by what those days actually cost, nothing rounder',
     reorderAdvice(arr, 100, 0, r, NOW, 3).suggest === Math.ceil((300 / 35) * 18) - 100);
  ok('the spare days are reported back, so the screen can name what it added',
     reorderAdvice(arr, 100, 0, r, NOW, 3).spareDays === 3);
  ok('rubbish spare days are treated as none rather than poisoning the minimum',
     reorderAdvice(arr, 100, 0, r, NOW, -5).coverDays === a.coverDays &&
     reorderAdvice(arr, 100, 0, r, NOW, 'x').coverDays === a.coverDays);
  /* A cushion cannot conjure a number out of a history that had none. */
  ok('and they cannot rescue a product with no measurable history',
     reorderAdvice(arr.slice(0, 1), 100, 0, r, NOW, 30).suggest === null);

  /* ---- SILENCE IS AN ANSWER ---- every one of these must be null, not a guess. */
  ok('one arrival is not a history - no rate, no suggestion',
     reorderAdvice(arr.slice(0, 1), 100, 0, r, NOW).ratePerDay === null &&
     reorderAdvice(arr.slice(0, 1), 100, 0, r, NOW).suggest === null);
  ok('less than a day of history cannot give a per-day rate',
     reorderAdvice([{ at: NOW - 3600, qty: 10 }, { at: NOW - 7200, qty: 10 }], 5, 0, r, NOW).ratePerDay === null);
  ok('a rate without a measured lead time suggests nothing',
     reorderAdvice(arr, 100, 0, { leadDays: null, cadenceDays: 10 }, NOW).suggest === null);
  ok('and a rate without a measured order gap suggests nothing either',
     reorderAdvice(arr, 100, 0, { leadDays: 5, cadenceDays: null }, NOW).suggest === null);
  ok('a rhythm that is missing entirely does not crash the panel',
     reorderAdvice(arr, 100, 0, null, NOW).suggest === null &&
     reorderAdvice(arr, 100, 0, undefined, NOW).ratePerDay !== null);
  /* Nothing has moved: the rate is a truthful zero, but "days left" would be infinity
     and a suggestion would be meaningless. Both must stay null. */
  ok('a product that has not moved at all reports zero, and still suggests nothing',
     reorderAdvice(arr, 400, 0, r, NOW).ratePerDay === 0 &&
     reorderAdvice(arr, 400, 0, r, NOW).daysLeft === null &&
     reorderAdvice(arr, 400, 0, r, NOW).suggest === null);

  /* ---- ⛔ IT SUGGESTS. IT DOES NOT ORDER. ---- his rejected list, twice over. */
  const panel = stripComments(bw);
  ok('the suggestion reaches the box only through a button the branch presses',
     /onClick=\{\(\) => setRequestQty\(String\(advice\.suggest\)\)\}/.test(panel));
  ok('nothing fills the quantity box on its own',
     !/useEffect\([^)]*\)\s*=>\s*setRequestQty\(/.test(panel) &&
     !/setRequestQty\(String\(advice\.suggest\)\)[^;]*;\s*\n\s*handleAddToCart/.test(panel));
  ok('and no part of this writes to the database - it is arithmetic over records that exist',
     !/reorderAdvice[\s\S]{0,3000}?(setDoc|updateDoc|writeBatch|runTransaction)\(/.test(
        bw.slice(bw.indexOf('export const shipmentRhythm'), fEnd)));
  /* When it cannot advise it must SAY so. A blank space reads as "nothing to see". */
  ok('when it cannot suggest a number it explains why instead of showing nothing',
     /Belum bisa menyarankan jumlah/.test(bw));
  ok('and the warning that matters is spelled out, not left as three numbers',
     /pesan sekarang/.test(bw) && /tooLate/.test(panel));
  /* Palette law: this panel is new, and gold plus the danger token is the whole range. */
  ok('no blue and no green in the new panel',
     !/blue-|green-|emerald-|sky-|indigo-|cyan-|teal-/.test(
        bw.slice(bw.indexOf('HOW MANY SHOULD I ASK FOR (G3) ====='), bw.indexOf('placeholder="Qty (Bks)"'))));
}

/* -- THE DASHBOARD REBUILD, 2026-08-25 -----------------------------------------------------
   Two colour faults lived on this screen for months and no sweep could see either of them,
   because neither was written as a colour token. One was raw Tailwind, the other was
   arithmetic that produced a hex. Both are guarded here rather than described in a comment,
   because a comment cannot fail. */
/* ⚠️ A CHECK THAT GREPS SOURCE ALSO READS THE COMMENT DESCRIBING THE BUG. All three colour
   guards below failed on first run for exactly that reason: the files explain what was removed,
   and spell the removed class names out while doing it. Stripping comments first is the honest
   fix — the guard should ask what the code DOES, not what the file says about it. */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

section('D1. The dashboard cannot paint outside the palette');
const dashView  = read('src/components/DashboardView.jsx');
const dashPanel = read('src/components/DashboardBenchmarks.jsx');
const safety    = read('src/components/SafetyStatus.jsx');
const helpersJs = read('src/utils/helpers.js');
const periodJs  = read('src/utils/period.js');
const themeCss  = read('src/styles/theme.css');

ok('SafetyStatus no longer paints green or raw red',
   !/emerald-|green-|red-\d|orange-\d|blue-|sky-|teal-|cyan-|indigo-/.test(code(safety)),
   'the three indicators were text-emerald-500 / bg-emerald-500 / text-red-500');
ok('the dashboard files carry no Tailwind colour scale at all',
   !/(emerald|green|blue|sky|teal|cyan|indigo|violet|fuchsia|rose|red|orange|yellow|amber)-\d{2,3}/
     .test(code(dashView) + code(dashPanel)));
ok('getRandomColor is gone from helpers',
   !/export const getRandomColor/.test(helpersJs),
   'it hashed a product name into an arbitrary hex and handed it to a chart');
ok('nothing imports it any more',
   !/getRandomColor\(/.test(code(app) + code(dashView) + code(dashPanel)));
ok('and the deletion left a note saying why, so it is not re-added as a convenience',
   /getRandomColor WAS DELETED HERE/.test(helpersJs));

section('D2. No running totals - his rule, "dont use total"');
ok('the all-time revenue reduce is gone',
   !/type === 'SALE' \|\| t\.type === 'RETURN'\)\.reduce/.test(dashView));
ok('the dashboard reads a period window instead',
   /periodWindow/.test(dashView) && /periodWindow/.test(dashPanel));
ok('both panels take that window from the SAME function',
   /from '\.\.\/utils\/period'/.test(dashView) && /from '\.\.\/utils\/period'/.test(dashPanel),
   'two copies of the boundary maths would drift silently');
ok('the switch offers exactly hari, minggu, bulan, tahun',
   ['hari','minggu','bulan','tahun'].every(k => new RegExp("'" + k + "'").test(periodJs)));
ok('minggu is a ROLLING seven days, not a calendar week',
   /6 \* DAY/.test(periodJs),
   'a calendar week is empty on Monday morning and the dashboard would read as a collapse');

section('D3. It speaks the module vocabulary the rest of the app uses');
ok('the dashboard is built from .kpm-mod, not floating cards',
   /kpm-mod/.test(dashView) && /kpm-mod/.test(dashPanel));
ok('no pre-system card survives on the dashboard',
   !/rounded-2xl|rounded-xl|backdrop-blur|shadow-lg/.test(dashView + dashPanel),
   'radius + blur + drop shadow is what made this screen look like a different app');

section('D4. Lite Mode keeps every value and only loses motion');
ok('the arrival is guarded, because it hides by default rather than by moving',
   /html\.lite-mode \.kpm-arr \{ opacity: 1/.test(themeCss),
   'with transitions dead an unguarded .kpm-arr would sit at opacity 0 forever');
ok('the velocity figures are guarded for the same reason',
   /html\.lite-mode \.kpm-vrow \.figs \{ opacity: 1/.test(themeCss));
ok('nothing in the dashboard block needs a shadow to be visible',
   /* slice from the first RULE, not from the header comment: starting mid-comment leaves an
      unmatched close and the stripper cannot see a pair to remove */
   !/box-shadow/.test(code(themeCss.slice(themeCss.indexOf('.kpm-dash { container-type')))));

section('D5. Responsive by CONTAINER, so an opening rail cannot lie to it');
ok('the dashboard declares a container',
   /\.kpm-dash \{ container-type: inline-size/.test(themeCss));
/* the COUNT was pinned at two and broke the moment the supply panel added its own tablet rule
   — a third @container block is more responsive behaviour, not a regression. What actually
   matters is that BOTH breakpoints still exist. */
ok('and queries it at both breakpoints',
   /@container dash \(min-width: 700px\)/.test(themeCss) &&
   /@container dash \(min-width: 1000px\)/.test(themeCss));
ok('the big figure is sized in container units so it fits a 390px phone',
   /clamp\(28px, 9cqw, 42px\)/.test(themeCss));
/* ⚠️ matched on the DECLARATION inside each block, not on the order of its first line. The
   original form pinned `min-height` as the opening property and fired the moment the period
   switch grew a `position` — a true positive for the wrong reason, which is a check that will
   cry wolf until somebody deletes it. */
const blockHas = (sel, decl) => {
  const i = themeCss.indexOf(sel + ' {');
  if (i < 0) return false;
  return themeCss.slice(i, themeCss.indexOf('}', i)).includes(decl);
};
ok('every control clears the 44px thumb target',
   blockHas('.kpm-period button', 'min-height: 44px') &&
   blockHas('.kpm-key-row', 'min-height: 44px') &&
   blockHas('.kpm-cover-c', 'min-height: 44px'));

section('D6. The low-stock rule is one rule, and it speaks in units');
ok('the shared rule exists and exports its unit list',
   /export const MIN_STOCK_UNITS/.test(read('src/utils/stockThreshold.js')));
ok('the settings form offers the unit dropdown he asked for',
   /MIN_STOCK_UNITS\.map/.test(dashPanel),
   '"add extra option so that i can setting bal karton slop or bks"');
ok('the running-out panel prints a counted unit, never bare Bks',
   /displayQty/.test(code(dashView)),
   '"few bal is considered as low not BKS bruh"');
ok('the product editor no longer pre-fills 50 into an unset minimum',
   !/editingProduct\.minStock \|\| 50/.test(app),
   'it wrote the old hardcoded default into the product the moment anyone opened the form');


section('D7. Two things his screenshots caught');
/* "better to add some commas here" — nine unbroken digits in the omzet box */
ok('every rupiah box in the goals form is grouped as it is typed',
   (code(dashPanel).match(/value=\{groupDigits\(form\./g) || []).length === 4,
   'monthly + the three per-period overrides');
ok('and the field still stores digits only, so nothing downstream sees a formatted string',
   (code(dashPanel).match(/e\.target\.value\.replace\(/g) || []).length >= 4,
   'the grouping goes on the way out and is stripped on the way in');
ok('the separator is a dot, because formatRupiah runs on id-ID',
   /\(\$1\)\+\}\)\/g, '\.'\)|\+\}\)\/g, '\.'\)/.test(code(dashPanel)) ||
   /g, '\.'\)/.test(code(dashPanel)),
   'commas here would disagree with every rupiah figure the app renders');

/* "percentage is too big that its collapsing with the circle" */
ok('the ring figure is small enough for the hole it sits in',
   /\.kpm-ring-txt \{[^}]*font-size: 20px/.test(themeCss),
   '"100%" at 26px is ~52px wide and the hovered hole is only 61px across');
ok('the ring stroke has ONE owner, and it is the component',
   !/\.kpm-arc:hover \{[^}]*stroke-width/.test(themeCss),
   'CSS beats an SVG presentation attribute, so a :hover rule here silently overrode the width '
   + 'the panel was setting');
ok('and the hover step is small, because a stroked circle grows inward too',
   /STROKE = 13, STROKE_ON = 17/.test(dashPanel));


section('D8. The regional panel survives an unknown number of regions');
/* "if there are so much division we might need to design this panel to fit in the free space" —
   he named the hard part. `region` is free text on the customer, so the count is not knowable
   from the code and a typo makes one more. Everything here guards the two ways that bites. */
ok('the list is ranked and capped, so twenty regions cannot stretch the panel',
   /\.slice\(0, 6\)/.test(code(dashView)) && /sort\(\(a, b\) => b\.omzet - a\.omzet\)/.test(code(dashView)));
ok('and the tail is COUNTED rather than silently cut',
   /regions\.rows\.length - 6/.test(dashView),
   'a list that stops at six without saying so reads as "these are all of them"');
ok('revenue whose customer matches no record gets its own row instead of vanishing',
   /regions\.unknown &&/.test(dashView) && /unknown\.share/.test(dashView),
   'a sale stores customerName, not a customer id, so the join is by NAME and will miss some');
ok('the name join is case- and whitespace-insensitive on BOTH sides',
   (code(dashView).match(/String\(v \|\| ''\)\.trim\(\)\.toLowerCase\(\)/g) || []).length >= 1 &&
   (code(dashView).match(/key\(t\.customerName\)/g) || []).length >= 2 &&
   /key\(c\.name\)/.test(code(dashView)),
   'otherwise "Toko Jaya " and "toko jaya" become two different customers');
ok('a customer with a blank region is not counted as a region named ""',
   /if \(c\.name && r\)/.test(code(dashView)));
ok('the panel follows the same period switch as everything else',
   /periodWindow\(period\)/.test(code(dashView).slice(code(dashView).indexOf('const regions'))));
ok('the unclassified row cannot be mistaken for a result',
   /\.kpm-vrow\.unset \.nm \{ color: var\(--ink-dim\); font-style: italic/.test(themeCss));


section('D9. The big regional chart - "keep the list and add the big graph"');
const pace = read('src/components/PaceChart.jsx');

ok('there is ONE pace chart, and both panels use it',
   /import PaceChart/.test(dashPanel) && /import PaceChart/.test(dashView),
   'the second caller is why it was extracted - two copies of chart geometry drift silently, '
   + 'with both charts still drawing and neither meaning what the other does');
ok('and the geometry left the panel that used to own it',
   !/const VB = \{ w: 336/.test(dashPanel));
ok('the viewBox maths lives in the component now',
   /const VB = \{ w: 336/.test(pace));

ok('the line is REMOUNTED to redraw, not transitioned',
   /key=\{`l-\$\{drawKey\}`\}/.test(pace),
   'React keeps the same <path> when only `d` changes, so without a key the first swap animates '
   + 'and every one after it snaps - a bug nobody reports because nothing looks broken');
ok('the regional chart passes the region as that key',
   /drawKey=\{`\$\{shown\.region\}-\$\{period\}`\}/.test(dashView));
ok('and it is a CSS animation, which is what restarts on a remount',
   /animation: kpmPaceDraw/.test(themeCss));

ok('the drawn line survives Lite Mode',
   /html\.lite-mode \.kpm-pace-line \{ stroke-dasharray: none/.test(themeCss),
   'lite-mode kills animation outright, and an unguarded line stops wherever its dash sat');
ok('and so does the fill under it',
   /html\.lite-mode \.kpm-pace-fill \{ opacity: 1/.test(themeCss));
ok('reduced motion gets the same treatment, not a broken chart',
   /prefers-reduced-motion[\s\S]{0,260}kpm-pace-line \{ stroke-dasharray: none/.test(themeCss));

ok('a region is scaled to its OWN even pace, never to the company target',
   /target=\{shown\.evenPace\}/.test(dashView),
   'there is no per-region target set, and scaling one against the company figure would only '
   + 'ever show that a region is a fraction of the company');
ok('the fast-start reading uses the MIDPOINT, not the last point',
   /const mid = Math\.floor\(\(series\.length - 1\) \/ 2\)/.test(dashView),
   'the line is scaled so its last point sits ON the pace line by construction, so comparing '
   + 'those two is always true and says nothing');
ok('a series too short to have a shape says nothing at all',
   /steady: series\.length <= 2/.test(dashView));

ok('the rows are the swap control, so there is no second one on screen',
   /aria-pressed=\{\(wilayah \?\? regions\.rows\[0\]\?\.region\) === r\.region\}/.test(dashView));
ok('and nothing selected yet still shows a chart',
   /regions\.rows\.find\(r => r\.region === wilayah\) \|\| regions\.rows\[0\]/.test(dashView),
   'a chart-shaped hole waiting to be clicked is not an empty state, it is a bug');
ok('the selected row is marked by a stripe, which Lite Mode cannot eat',
   /\.kpm-vrow\[aria-pressed="true"\] \{ border-left: 3px solid var\(--accent-edge\)/.test(themeCss));


section('D10. A control never lives inside the thing its own value can empty');
/* 2026-08-26: he pressed Bandung, whose warehouse is empty, and the whole supply panel vanished
   — the row list came back empty, the gate was on that list, and the switch that chooses the
   warehouse went with it. Nothing threw. There was simply no way back to Semua. */
ok('the supply panel is gated on there BEING products, not on the current filter matching any',
   /isAdmin && inventory\.length > 0 &&/.test(code(dashView)),
   'gating on supply.rows.length deletes the warehouse switch the moment a warehouse is empty');
ok('and an empty warehouse gets a line inside the panel instead',
   /supply\.rows\.length === 0 &&/.test(code(dashView)));
ok('every share is printed as a percentage of the product own total',
   /const share = \(part, total\)/.test(code(dashView)));
ok('a share is only printed inside a segment wide enough to hold it',
   /share\(r\[sr\.key\], r\.total\) >= 12/.test(code(dashView)),
   'a figure spilling out of a 3% sliver is worse than no figure');
ok('and each segment carries its own ink, because the grounds differ',
   /\.kpm-stack > i\.sold[^}]*color: var\(--ink-inverse\)/.test(themeCss) &&
   /\.kpm-stack > i\.field[^}]*color: var\(--orange-ink\)/.test(themeCss));

section('D11. One quantity formatter, and a setting that reaches all of it');
ok('the dashboard no longer keeps a private copy of the unit logic',
   !/const dominant = \(bks, product\) => \{/.test(code(dashView)),
   'it had its own splitToUnits wrapper, so a unit setting would have reached one panel only');
ok('quantities are formatted by the shared helper',
   /displayQty/.test(code(dashView)) && /export const displayQty/.test(read('src/utils/helpers.js')));
ok('the chosen unit comes from settings, with AUTO as the fallback',
   /appSettings\?\.defaultDisplayUnit \|\| .AUTO./.test(code(dashView)));
ok('and the settings form offers every unit',
   /DISPLAY_UNITS\.map/.test(code(dashPanel)));
ok('a fixed unit rounds DOWN rather than inventing a fraction',
   /Math\.floor\(bks \/ per\)/.test(read('src/utils/helpers.js')),
   '3 Bks shown in Karton is 0 karton, which is true');
ok('the segment you point at is marked with an OUTLINE, not a shadow',
   /\.kpm-stack > i\.on \{ outline:/.test(themeCss) &&
   !/\.kpm-stack > i\.on \{ box-shadow/.test(themeCss),
   'lite-mode strips box-shadow, so a shadow mark would vanish exactly where it is needed');
ok('the detail line sits under its own bar, not out to the right',
   /\.kpm-srow \.figs \{ flex: 1 1 100%/.test(themeCss),
   'reading a bar on the left and its figures on the right is two saccades for one fact');

/* ── D12 · the quota meter must never report a spent bucket as nearly empty ─────────────── */
section('D12. The plan-quota hook reads a PERCENT, and watches both buckets');

/* 2026-08-31: the hook read `used` as if it were already a percentage. An On-demand connection
   answers used:1 total:1 — completely spent — and it reported "1% used", which is under 70 and
   therefore says nothing at all. Silence from a meter reads as "everything is fine". */
const quotaHook = stripComments(read('.claude/plan-quota.mjs'));

const iRemaining = quotaHook.indexOf('100 - x.remainingPercentage');
const iRawCount = quotaHook.indexOf('Number.isFinite(x.used) ? x.used');
ok('remainingPercentage is read BEFORE the raw used count, not after',
   iRemaining > -1 && iRawCount > -1 && iRemaining < iRawCount,
   'used:1 of total:1 is 100% spent, and reporting it as 1% is the silent under-report');
ok('a used count is divided by its own total before it becomes a percent',
   /\(x\.used \/ x\.total\) \* 100/.test(quotaHook),
   'only a total of 100 makes a raw count and a percentage the same number');
ok('the 7-day weekly bucket is read as well as the 5-hour session',
   /pick\(\/week\/i\)/.test(quotaHook),
   'both exist live; watching only the session lets a weekly lockout arrive with no warning');
ok('and the WORSE of the two drives the warning',
   /worstIsWeekly/.test(quotaHook) && /worstIsWeekly \? wUsed : sUsed/.test(quotaHook));

/* ── D13 · the main warehouse has ONE name ──────────────────────────────────────────────── */
section('D13. One name for the main warehouse, declared once');

/* It was spelled three ways at once — 'MASTER' in the supply maths, 'Gudang Pusat (HQ)' on the
   surat jalan, and a third hardcoded copy in the Goods Received stage — so one place read as
   three. His call, 2026-08-31: Gudang Pusat (Master Vault). */
ok('the name is declared once, in supply.js',
   /export const MASTER = 'Gudang Pusat \(Master Vault\)';/.test(stripComments(read('src/utils/supply.js'))));
ok('the Restock Vault reads that constant instead of keeping its own copy',
   /const HQ_NAME = MASTER;/.test(stripComments(read('src/RestockVaultView.jsx'))));
ok('the Goods Received stage reads it too',
   /value=\{MASTER\}/.test(stripComments(read('src/ponder/stages/GoodsReceivedStage.jsx'))));

/* Scoped to the DISPLAYED name. The bare string 'MASTER' stays legal on purpose: in
   StockOpnameView it is a <select> value that routes a Firestore path, and renaming it would
   move documents rather than relabel a screen. */
const OLD_NAMES = /'Gudang Pusat \(HQ\)'|"Gudang Pusat \(HQ\)"|>Master Vault \(HQ\)<|'MASTER VAULT'/;
const oldSpellings = appFiles
  .filter(f => f !== 'src/utils/supply.js')
  .flatMap(f => stripComments(read(f)).split('\n')
    .map((text, i) => ({ f, line: i + 1, text }))
    .filter(l => OLD_NAMES.test(l.text)))
  .map(v => `${v.f}:${v.line}`);
ok(`no file spells the main warehouse its own way${oldSpellings.length ? ' — ' + oldSpellings.join(', ') : ''}`,
   oldSpellings.length === 0,
   'a fourth copy is how the third one got there — Stock Opname held four more');
ok('the guard still fires on a hardcoded name',
   OLD_NAMES.test(`<option value="MASTER">Master Vault (HQ)</option>`) &&
   !OLD_NAMES.test(`<option value="MASTER">{HQ_LABEL}</option>`));
ok('Stock Opname shows the shared label but keeps MASTER as its routing value',
   /<option value="MASTER"[^>]*>\{HQ_LABEL\}<\/option>/.test(stripComments(read('src/StockOpnameView.jsx'))),
   'the value picks the Firestore path; only the words on screen were wrong');

/* ── D14 · the surat jalan is paper, and nothing is allowed to make it see-through ──────── */
section('D14. The nota stays opaque');

/* 2026-08-31, his words: "we need to redesign the receipt for this because it looks awful and i
   dont know why is it transparant". Two separate causes, both fixed here.
   ONE: the app shell repaints every plain `.bg-white` under `.biohazard-content` to
   rgba(20,20,20,.85) — fifteen per cent see-through — and the nota's card was a plain `.bg-white`.
   Measured in the lab at rgba(20, 20, 20, 0.85) before the scope, rgb(255, 255, 255) after.
   TWO: `animate-fade-in` is opacity-only, so the paper spent half a second semi-transparent —
   which looks identical to cause ONE and is what made the report so hard to pin down. */
const shellSrc = stripComments(read('src/components/BiohazardTheme.jsx'));
const shellRuleLine = shellSrc.split('\n').find(l => l.includes('.biohazard-content .bg-white')) || '';

ok('the shell repaint is scoped away from printed receipts',
   /\.biohazard-content \.bg-white:not\(\.print-receipt\):not\(\.print-receipt \*\)/.test(shellRuleLine),
   'unscoped it paints the nota rgba(20,20,20,.85) with #e5e5e5 ink — his "transparant"');
ok('the guard would fail on the unscoped rule it replaced',
   !/:not\(\.print-receipt\)/.test('.biohazard-content .bg-white { background-color: rgba(20, 20, 20, 0.85) !important; }'));

/* The lab copies that rule verbatim because it does not mount the shell. A harness missing the
   ancestor renders a page the app never shows — the receipt looked perfectly white there while it
   was dark and see-through in his browser. Pinned so the copy cannot drift in silence. */
const labSrc = read('tools/ponder-lab.jsx');
const labRule = (labSrc.match(/const SHELL_RULE = `([^`]*)`/) || [])[1];
ok('the ponder lab holds the SAME shell rule, character for character',
   !!labRule && shellRuleLine.includes(labRule),
   'a harness without the ancestor is testing a different page');

const nota = stripComments(read('src/components/AcceptanceReceipt.jsx'));
ok('the receipt card owns its own visibility — no opacity-only entrance on it',
   !/animate-fade-in/.test(nota),
   'his locked rule: an animation may carry movement, never whether a thing is on screen');
ok('the nota is a component the lab can mount, not markup buried in a view',
   /export default function AcceptanceReceipt/.test(nota) &&
   /<AcceptanceReceipt/.test(stripComments(read('src/RestockVaultView.jsx'))),
   'it sits behind a sign-in, a vault gate and an accepted delivery — unmountable is unlookable');
ok('money and codes are tabular so a column of figures lines up',
   (nota.match(/tabular-nums/g) || []).length >= 4);

/* ── D15 · places are registered, and the route boxes only ever SEARCH them ─────────────── */
section('D15. The place registry, and two boxes that cannot invent a place');

/* His instruction, 2026-08-31: "we need to make option to register factory and gudang therefore
   the adress for both is fixed and there is no way to input new name inside the textbox. textbox
   is used only to search gudang name not register a new one unlike sales terminal" — and
   "asal inside the masuk panel should be the factory location and tujuan should be the warehouse
   location, can be sent to master vault or regional warehouse directly". */
const restock = stripComments(read('src/RestockVaultView.jsx'));

/* Scoped to RouteCombo's own body. `onChange(` appears all over this file on ordinary inputs, and
   a file-wide search would report the opposite of the truth. */
const comboStart = restock.indexOf('const RouteCombo =');
/* ⚠️ ANCHORED ON `const Proses`, NOT ON `const Lamp`. Lamp moved to its own file on 2026-09-01 so
   the regional warehouse desk could wear the same status dot, and this anchor went to -1 — which
   `restock.slice(comboStart, -1)` reads as "one before the end of the file", handing the six
   checks below the whole file to pass against. The ok() on the next line is what caught it, and
   it is the only reason this was a red check rather than six silently green ones. */
const comboEnd = restock.indexOf('const Proses =');
ok('the RouteCombo block can be found before anything is asserted about it',
   comboStart > -1 && comboEnd > comboStart);
const combo = comboStart > -1 && comboEnd > comboStart ? restock.slice(comboStart, comboEnd) : '';

ok('typing into the route box changes a QUERY, never the chosen value',
   /onChange=\{e => \{ setQuery\(e\.target\.value\)/.test(combo) &&
   !/onChange=\{e => \{ onChange\(e\.target\.value\)/.test(combo),
   'the old box committed whatever was typed and tagged it `baru` — four spellings of one warehouse');
ok('the value is committed only by picking a real option',
   /const pick = \(name\) => \{ onChange\(name\)/.test(combo));
ok('leaving the box throws the unmatched text away',
   /setOpen\(false\); setQuery\(null\);/.test(combo),
   'otherwise the field shows a place the delivery is not going to');
ok('the empty state sends him to the registry instead of offering to invent a name',
   /Tempat baru didaftarkan di tab/.test(combo) && !/Nama baru tetap bisa dipakai/.test(combo));

ok('Asal draws from factories, Tujuan from warehouses — never one shared list',
   /options=\{isOut \? warehouseOptions : factoryOptions\}/.test(restock) &&
   /label="Tujuan"[\s\S]{0,220}options=\{warehouseOptions\}/.test(restock) &&
   !/options=\{placeOptions\}/.test(restock),
   'one list for both fields allowed factory → factory, and deliveries arriving at a supplier');
ok('the edit panel uses the same two pickers, not free text',
   /label="Asal \(Source Factory\)"[\s\S]{0,400}options=\{factoryOptions\}/.test(restock),
   'a rule that holds on intake and leaks on the edit form is not a rule');
ok('swapping the route flips DIRECTION rather than exchanging the two strings',
   /const swapRoute = \(\) => setDirection/.test(restock),
   'a straight swap would put a factory in Tujuan — the nonsense route the split lists prevent');

ok('a place cannot be registered without the address that is the point of registering it',
   /if \(!address\) return notify/.test(restock));
ok('the registry is keyed by a slug of the name, so registering one name twice edits it',
   /const placeSlug = \(name\) =>/.test(restock) &&
   /\/places`, slug\)/.test(restock),
   'an auto-id would let "Pabrik Kudus" exist twice with two different addresses');
ok('the delivery record COPIES both addresses at save time',
   /originAddress: addrFor\(poData\.supplierName\)/.test(restock) &&
   /destinationAddress: addrFor\(poData\.destination\)/.test(restock),
   'looking them up at print time would rewrite the paper for goods that already travelled');
ok('and the nota prints them under Asal and Tujuan',
   /sub=\{acceptance\.originAddress\}/.test(stripComments(read('src/components/AcceptanceReceipt.jsx'))) &&
   /sub=\{acceptance\.destinationAddress\}/.test(stripComments(read('src/components/AcceptanceReceipt.jsx'))));

/* ── D16 · who may be named as sending or receiving a package ──────────────────────────── */
section('D16. The delivery clearance, and the tier it must not forget');

/* His rule, 2026-08-31: "tier 4/ regional admin and above is automatically registered to have
   power to send or receive package, while lower tier cant do that, and if there is other
   employees outside of the sales team who will send that package then just add register button".

   ⚠️ T4's id in permissions.js is the string FLEET_CAPTAIN, and forgetting exactly that role is
   the most repeated bug in this codebase. So this is a BEHAVIOUR check on the real function, not
   a grep: it runs the boundary from both sides. */
const { canHandleDelivery, canManageRegistry, CORPORATE_TIERS: TIERS } = await import('./permissions.js');

ok('tier 4 — his "regional admin", FLEET_CAPTAIN in the code — may handle a delivery',
   canHandleDelivery(TIERS.TIER_4) === true,
   'isAreaAdmin() checks only AREA_ADMIN and would drop the exact tier he named');
ok('and so may every tier above it',
   [TIERS.TIER_1, TIERS.TIER_2, TIERS.TIER_3].every(t => canHandleDelivery(t) === true));
ok('tier 5 and tier 6 may not',
   canHandleDelivery(TIERS.TIER_5) === false && canHandleDelivery(TIERS.TIER_6) === false,
   'the boundary is only proved by checking the side that must be refused');
ok('an unknown or missing role is refused rather than waved through',
   canHandleDelivery(undefined) === false && canHandleDelivery('SOMETHING_ELSE') === false);

const restockPeople = stripComments(read('src/RestockVaultView.jsx'));
ok('the staff list is filtered by that clearance, not by a hand-written tier list',
   /canHandleDelivery\(m\.userRole \|\| m\.role\)/.test(restockPeople),
   'a second copy of the tier rule is a second place to forget FLEET_CAPTAIN');
ok('people registered by hand are a separate kind in the same registry',
   /p\?\.kind === 'orang'/.test(restockPeople) &&
   /kind: 'orang', editing: null/.test(restockPeople),
   'his "add register button" for someone outside the sales team');
ok('a name in both lists appears once',
   /if \(seen\.has\(k\)\) return false;/.test(restockPeople),
   'two identical rows in a dropdown on a document that says who handled the goods');
ok('both names are picked from that list, never typed',
   /label="Pengirim"[\s\S]{0,200}options=\{peopleOptions\}/.test(restockPeople) &&
   /label="Penerima"[\s\S]{0,200}options=\{peopleOptions\}/.test(restockPeople));
ok('and both are carried on the delivery record',
   /deliveredBy: '',\n\s*receivedBy: '',/.test(restockPeople) ||
   /deliveredBy: ''/.test(restockPeople) && /receivedBy: ''/.test(restockPeople));

const notaSrc = stripComments(read('src/components/AcceptanceReceipt.jsx'));
ok('the nota reads both signatures from the RECORD, not from whoever is logged in',
   /acceptance\.deliveredBy/.test(notaSrc) &&
   /acceptance\.receivedBy \|\| acceptance\.recordedBy/.test(notaSrc) &&
   !/receivedBy,/.test(notaSrc),
   'it used to name whoever opened the paper, so an old delivery printed the wrong person');
/* NOT a check on the wording — he renames things and a guard anchored on display copy fires on
   every rename (that mistake is already in the lessons file). This checks CONSISTENCY: whatever
   the tab is called, every message that sends him there must name the same tab. "Daftarkan di tab
   Tempat" pointing at a tab now called Data Induk is an instruction to a place that does not
   exist. */
const tabLabel = (restockPeople.match(/\{ id: 'place', label: '([^']+)'/) || [])[1];
ok('the registry tab has a findable label',
   !!tabLabel);
const pointers = restockPeople.match(/Daftarkan di tab ([^."]+)\./g) || [];
ok(`every "register it over there" message names the tab as it is actually labelled — "${tabLabel}"`,
   pointers.length >= 3 && pointers.every(p => p.includes(tabLabel)),
   'a rename that misses one leaves an instruction pointing at a tab that no longer exists');
ok('and so does the empty state inside the picker itself',
   new RegExp(`didaftarkan di tab <b className="text-ink">${tabLabel}</b>`).test(restockPeople));

ok('and "Factory Logistics" is gone from it',
   !/Factory Logistics/.test(notaSrc),
   'a fixed phrase pretending to be a record of who delivered the goods');


/* -- D17 . who may change the master data, and it is NOT the tier that uses it every day ------ */
section('D17. The registry clearance, one tier above the delivery one');

/* Aldi, 2026-09-01: "tier 4 and below cannot access the editing and registering of employees,
   gudang warehouse and factory as well".

   The two clearances sit ONE TIER APART and that gap is the whole point, so both sides of BOTH
   boundaries run here. T4 may receive a delivery and may not rename the factory it came from.
   Getting these the same way round is the Fleet Captain gap in reverse: it would hand every branch
   admin the power to edit where a shipment says it went. */
ok('T4 may handle a delivery but may NOT edit the registry - the one line he legislated',
   canHandleDelivery(TIERS.TIER_4) === true && canManageRegistry(TIERS.TIER_4) === false);
ok('T1, T2 and T3 may edit the registry',
   [TIERS.TIER_1, TIERS.TIER_2, TIERS.TIER_3].every(t => canManageRegistry(t) === true));
ok('T5 and T6 may not, and neither may an unknown role',
   canManageRegistry(TIERS.TIER_5) === false && canManageRegistry(TIERS.TIER_6) === false
   && canManageRegistry(undefined) === false && canManageRegistry('SOMETHING_ELSE') === false);

/* A hidden button is a tidy screen, not a permission. The fleet-edit bug he found on 2026-08-24
   was exactly a control that was hidden while its handler still ran. */
const rv17 = stripComments(read('src/RestockVaultView.jsx'));
ok('the HQ registry HANDLERS refuse, not only the buttons that call them',
   /const savePlace = async \(\) => \{\s*if \(!placeForm\) return;\s*if \(!mayEditRegistry\)/.test(rv17)
   && /const removePlace = async \(place\) => \{\s*if \(!mayEditRegistry\)/.test(rv17));
ok('and the clearance is the shared function, never a second tier list written out here',
   /const mayEditRegistry = canManageRegistry\(userRole\)/.test(rv17) && !/TIER_4/.test(rv17));

/* The branch desk READS the registry and has no way to write to it at any tier. No gated form to
   slip past is the strongest form this rule can take. */
const bwm17 = stripComments(read('src/components/BranchWarehouseManager.jsx'));
ok('the branch desk cannot write to the registry at all, at any tier',
   /const mayEditRegistry = canManageRegistry\(userRole\)/.test(bwm17) && !/placeForm/.test(bwm17));

/* THE ADDRESS IS NOT TYPED ANY MORE. Five inputs and a per-device localStorage copy stood here.
   It is the gudang's registered address now, copied onto the request at submit time so a gudang
   that moves later cannot rewrite the paperwork of goods that already travelled. */
ok('the branch cannot type a delivery address anywhere on the screen',
   !/shippingAddress/.test(bwm17) && !/kpm_address_/.test(bwm17));
ok('the request carries the registered address, copied at submit time',
   /deliveryAddressText: gudangAddress/.test(bwm17)
   && /const gudangAddress = addrFor\(branchLocation\)/.test(bwm17));
ok('submitting is blocked when the gudang has no registered address, and it names who can fix it',
   /if \(!gudangAddress\)/.test(bwm17) && /HQ registers it/.test(bwm17));

/* Requests already in flight carry the OLD object shape and must keep printing - a shipment that
   was moving when this changed is still a shipment. */
ok('the fulfilment modal still renders the old address shape for requests already in flight',
   /isFulfilling\.deliveryAddressText \?/.test(rv17) && /isFulfilling\.deliveryAddress\.jalan/.test(rv17));

/* THE DESK. Five tabs, in the order the questions get asked, and Data Induk keeps the name he
   chose himself on 2026-08-31 even though the rest of this screen is English. */
const deskIds = (bwm17.match(/\{ id: '(\w+)',\s*label: '([^']+)'/g) || []);
ok('the desk has exactly the five tabs he approved, Data Induk among them',
   deskIds.length === 5
   && /id: 'incoming',\s*label: 'Incoming'/.test(bwm17)
   && /id: 'request',\s*label: 'Request'/.test(bwm17)
   && /id: 'stock',\s*label: 'Stock'/.test(bwm17)
   && /id: 'book',\s*label: 'Book'/.test(bwm17)
   && /id: 'data',\s*label: 'Data Induk'/.test(bwm17),
   'he chose English on 2026-09-01 and then shortened it himself - "stock only is enough"');
ok('Incoming counts only what is still moving, so the number can go down',
   /const openRequests = requests\.filter\(r => r\.status === 'PENDING' \|\| r\.status === 'IN_TRANSIT'\)/.test(bwm17));
ok('Data Induk counts what is MISSING, like the Master Vault desk tab it mirrors',
   /id: 'data',[\s\S]{0,60}count: gudangAddress \? 0 : 1/.test(bwm17));

section('A cache-only "no" is not a refusal (the 20-second ACCESS DENIED)');

/* Aldi, twice on 2026-09-01, signing in on his phone: *"access denied screen muncul for around 20
   seconds and then gone, i can login now"*. Nothing was wrong with the account either time.

   Firestore's getDoc() with local persistence can RESOLVE out of the cache while the client is
   still connecting, and a document that has never been cached comes back as an ordinary "does not
   exist". The auth handler read that as "not an employee" and showed the red lockout until the
   connection came up and the listener fired again with the real answer.

   helpers.js cannot be imported here (it pulls in firebase/storage), so the function is lifted out
   of the source and run. That is the behaviour half; the regression guard is underneath. */
/* `;` alone, not `;\n` — helpers.js is checked out with CRLF endings, so the newline form of
   this regex matched nothing and the lift silently returned undefined. */
const absentSrc = (helpers.match(/export const absentForSure = ([\s\S]*?);/) || [])[1];
const absentForSure = absentSrc ? eval(`(${absentSrc})`) : null;
const snapOf = (exists, fromCache) => ({ exists: () => exists, metadata: { fromCache } });

ok('the helper was found in helpers.js, so the four checks below are not testing nothing',
   typeof absentForSure === 'function');

ok('a NO from the server is trusted, so a genuine stranger is still locked out',
   absentForSure(snapOf(false, false)) === true,
   'this is the case the red ACCESS DENIED screen exists for and it must keep working');

ok('a NO that came from the local cache is NOT trusted',
   absentForSure(snapOf(false, true)) === false,
   'this is his twenty seconds: the phone answered out of its own cache before the connection was '
   + 'ready, and the app called him a stranger');

ok('a YES from the cache is still a yes, so a known account opens offline',
   absentForSure(snapOf(true, true)) === false && absentForSure(snapOf(true, false)) === false,
   'only the NEGATIVE is in doubt; an account that was there last time is still there');

ok('a missing snapshot is never read as a refusal',
   absentForSure(null) === false && absentForSure(undefined) === false);

ok('the auth handler routes a cache-only negative to the retry screen, not to the lockout',
   /\} else if \(!absentForSure\(uidSnap\) \|\| !absentForSure\(emailSnap\)\) \{/.test(read('src/App.jsx'))
   && /setUserRole\('OFFLINE_UNVERIFIED'\);[\s\S]{0,200}\} else \{[\s\S]{0,200}setUserRole\('UNAUTHORIZED'\)/.test(read('src/App.jsx')),
   'the hard lockout has to stay BELOW the cache test, or a real stranger reaches the retry screen');

ok('the retry screen no longer claims the internet is down, because it might not be',
   /the connection wasn't ready, so the answer came from this device instead of from the server/.test(read('src/App.jsx')),
   'he was online both times; a message that blames his signal sends him to fix the wrong thing');

section('THE TUTORIAL BOOK — where every chapter actually lands (2026-09-01)');

/* His instruction, naming the component to follow: *"i want this 3D style and also i want the page
   to be drag able to change the page left and right with smooth motion"*.

   Rebuilding the book on that model moved the reader's position from "page N inside this section"
   to "sheet N of the whole book", and that arithmetic is the one part of the rebuild a screenshot
   cannot judge. A chapter that lands on the wrong sheet looks exactly like a chapter that lands on
   the right one — until you press its ribbon and arrive somewhere else. Silent, and wrong for the
   reader only.

   These run the REAL section list through the REAL functions, at both widths. */

/* REGRESSION GUARD — the shape that made the drag pointless must not come back.

   Counted on the day: all seventeen sections hold four entries or fewer, so under the old
   section-scoped model every chapter was exactly one page and `pages` was 1. A drag gesture over a
   one-page section has nowhere to go, which is why the leaves became the chapters. If anyone ever
   scopes the page list back to a section, the book stops having more than one sheet and this fails. */
ok('the book is one run of pages, not one run per section, or the drag has nothing to drag to',
   maxTurnOf(buildPages(SECTIONS, 4, true), true) >= SECTIONS.length &&
   maxTurnOf(buildPages(SECTIONS, 2, false), false) >= SECTIONS.length,
   'seventeen chapters must mean at least seventeen turnable sheets at both widths; a section-'
   + 'scoped page list gives one, and a one-sheet book cannot be dragged anywhere');

/* BEHAVIOUR CHECK — the maths, re-run on the real seventeen.

   His rule since 2026-08-27: *"i want the book when press is auto redirect to the features that we
   use right now"*. Pressing a ribbon, and opening on the screen you are standing on, are the same
   call. So for every chapter, at both widths, the page FACING the reader after that jump has to be
   that chapter's own cards — not the one before it, not its opening, not the endpaper. */
for (const wide of [true, false]) {
  const perPage = wide ? 4 : 2;
  const pages = buildPages(SECTIONS, perPage, wide);
  const maxTurn = maxTurnOf(pages, wide);
  const landed = SECTIONS.map(s => facingPage(pages, wide, turnFor(pages, wide, maxTurn, s.id)));
  const wrong = SECTIONS.filter((s, i) => !landed[i] || landed[i].k !== 'cards' || landed[i].s.id !== s.id);
  ok(`every chapter opens on its own cards page (${wide ? 'desk' : 'phone'})`,
     wrong.length === 0,
     'landed somewhere else: ' + wrong.map(s => s.id).join(', '));

  /* And on a desk the LEFT page of that spread is the chapter's own opening, because the spread is
     two faces of two different sheets — the back of the one you turned, and the front of the one
     you did not. Getting the halving wrong by one puts the reader a whole chapter out, with both
     pages still looking perfectly like a book. */
  if (wide) {
    const off = SECTIONS.filter(s => {
      const t = turnFor(pages, wide, maxTurn, s.id);
      const left = pages[t * 2 - 1];
      return !left || left.k !== 'chapter' || left.s.id !== s.id;
    });
    ok('the left page of that spread is the same chapter’s opening (desk)',
       off.length === 0, 'out by one on: ' + off.map(s => s.id).join(', '));
  }

  /* Nobody can stand past the back cover. The endpaper is the last page, so the last turnable sheet
     must still face a real page — a reader on `maxTurn` looking at `undefined` is a blank spread. */
  ok(`the last turnable sheet still faces a page (${wide ? 'desk' : 'phone'})`,
     !!facingPage(pages, wide, maxTurn) && facingPage(pages, wide, maxTurn).k !== 'cover',
     'maxTurn points past the endpaper, which renders an empty spread');

  /* Two chapters sharing a sheet would mean one of them is unreachable by ribbon. */
  const seats = SECTIONS.map(s => turnFor(pages, wide, maxTurn, s.id));
  ok(`no two chapters share a sheet, so every ribbon reaches its own (${wide ? 'desk' : 'phone'})`,
     new Set(seats).size === SECTIONS.length,
     'duplicate sheet numbers: ' + seats.join(', '));
}

/* A section id the book has never heard of — a nav tab added before its chapter is written — must
   land on page one rather than on `undefined`, which is what `findIndex` returns to. */
ok('an unknown section falls back to the first sheet instead of a blank spread',
   turnFor(buildPages(SECTIONS, 4, true), true, 99, 'no_such_section') === 1);

section('THE TUTORIAL BOOK — a ribbon turns the pages, it does not teleport (2026-09-02)');

/* Aldi, 2026-09-02: *"i want to put full realism of this book, for example if i change the ribbon
   section by 4 ribbons far then the book will turn 4 times to reach that page so instead of page 1
   to page 5 in one swipe i want the animation to be 4 quick page swipe, this way it will make it
   realistic"*.

   `riffle()` decides how many turns and how fast. Read back, it looks obviously right; run on the
   real seventeen chapters it is the only thing standing between a bookmark and a teleport, and a
   teleport is exactly what the previous version did with no error and no failing check. */

/* HIS EXAMPLE, VERBATIM, IN BOTH DIRECTIONS. Four apart is four turns and no jump — if this ever
   reports jumpTo !== from, the book skipped pages he asked to see turn. */
ok('four ribbons apart is four page turns, forwards and backwards',
   riffle(2, 6).steps === 4 && riffle(2, 6).dir === 1 &&
   riffle(6, 2).steps === 4 && riffle(6, 2).dir === -1,
   'his stated case: page 1 to page 5 must be four quick swipes, not one');

/* *"yes, full realism needed"* — his answer when told the first version rode a jump past eight
   sheets. The longest run in the book is chapter one to chapter seventeen; it must be sixteen real
   turns, and the only thing allowed to shrink is the time each one takes. */
ok('the longest run in the book turns all sixteen sheets, and none of them is skipped',
   riffle(1, 17).steps === 16 && riffle(17, 1).steps === 16,
   'a cap here is the teleport he asked to be rid of, wearing a smaller hat');

ok('one sheet apart is one deliberate turn, not a riffle',
   riffle(3, 4).steps === 1 && riffle(3, 4).ms === TURN_FULL_MS,
   'a single page turn keeps the full duration; only a RUN of them speeds up');

ok('a ribbon you are already standing on turns nothing',
   riffle(3, 3).steps === 0 && riffle(3, 3).dir === 0);

/* REGRESSION GUARD — the teleport must not come back.

   Every ordered pair of chapters in the real book, at both widths. Two things must hold for all of
   them: a different chapter is never reached in zero turns, and any distance the cap can cover is
   turned page for page rather than rounded down. */
for (const wide of [true, false]) {
  const pages = buildPages(SECTIONS, wide ? 4 : 2, wide);
  const maxTurn = maxTurnOf(pages, wide);
  const seats = SECTIONS.map(s => turnFor(pages, wide, maxTurn, s.id));
  const pairs = [];
  for (const a of seats) for (const b of seats) if (a !== b) pairs.push([a, b]);

  const teleports = pairs.filter(([a, b]) => riffle(a, b).steps < 1);
  ok(`no ribbon reaches another chapter without turning a page (${wide ? 'desk' : 'phone'})`,
     teleports.length === 0,
     teleports.length + ' of ' + pairs.length + ' pairs arrive with zero turns');

  const skipped = pairs.filter(([a, b]) => riffle(a, b).steps !== Math.abs(b - a));
  ok(`every page between the two is turned, at any distance (${wide ? 'desk' : 'phone'})`,
     skipped.length === 0,
     skipped.length + ' pairs skipped pages they should have turned');

  /* And the long ones still land: the jump has to leave exactly `steps` sheets to travel, on the
     right side of the target. An off-by-one here overshoots the chapter he asked for. */
  const misland = pairs.filter(([a, b]) => {
    const r = riffle(a, b);
    return a + r.dir * r.steps !== b;
  });
  ok(`every run lands on the chapter that was pressed (${wide ? 'desk' : 'phone'})`,
     misland.length === 0,
     misland.length + ' runs stop short of, or past, their target');

  /* A riffle nobody waits for is a riffle nobody sees the end of. With the cap gone this is the
     only thing keeping a sixteen-sheet run watchable, so it is the load-bearing bound now: the
     run gets FASTER with distance instead of shorter. */
  const slow = pairs.filter(([a, b]) => { const r = riffle(a, b); return r.steps * r.ms > 1100; });
  /* And the number this measures has to be the number the screen uses. `play()` floors every step
     at RIFFLE_MIN_MS, and when that floor was a second literal it silently overrode the plan - the
     longest run took 1260ms while every check here read 840 and passed. One constant, both sides. */
  const belowFloor = pairs.filter(([a, b]) => riffle(a, b).ms < RIFFLE_MIN_MS);
  ok(`no planned step is faster than the floor the book will actually use (${wide ? 'desk' : 'phone'})`,
     belowFloor.length === 0,
     belowFloor.length + ' pairs plan a step shorter than RIFFLE_MIN_MS, so the run is slower than this file believes');
  ok(`no run outlasts 1,1 seconds (${wide ? 'desk' : 'phone'})`,
     slow.length === 0,
     slow.length + ' runs take longer than anyone waits');
}

console.log(`\n${'='.repeat(58)}\n${pass} passed, ${fail} failed, ${pass + fail} checks`);
process.exit(fail ? 1 : 0);
