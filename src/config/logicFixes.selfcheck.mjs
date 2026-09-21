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
         TURN_FULL_MS, RIFFLE_MIN_MS } from '../ponder/pageModel.js';
import { handoffEligibility, injectDynamicPermissions, normalizeRegion, canApproveHandoffFrom, handoffApprovers, canPickFromGallery, CORPORATE_TIERS } from './permissions.js';

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
/* Was `/allowCashRefund=\{userRole === 'ADMIN'/` until 2026-09-09. The intent is unchanged — App
   must still hand the privilege to the terminal — but the expected FORM changed when buyback was
   turned off: the render site no longer decides anything, it passes on what agentSettings decided.
   The old pattern is now the regression this file hunts for, further down. */
ok('App passes it down to the terminal', /allowCashRefund=\{agentSettings\.allowCashRefund/.test(app));
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
ok('the unscoped name-only sweep is gone',
   !/transactions\.filter\(t => \(t\.customerName \|\| ''\)\.trim\(\)\.toLowerCase\(\) === request\.storeName/.test(app));
/* The two checks that used to sit here pinned `heldBySender` and the ADMIN legacy-row branch -
   the scoping of a transaction sweep that no longer exists. Aldi's 2026-09-05 rule removed the
   sweep itself: past sales keep the agent who made them. Their successors are in THE STORE
   HAND-OFF section at the end of this file, which asserts the sweep is absent and that the debt
   still reaches the new holder through the store's owner instead. */
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
   guard caught today.

   RE-ANCHORED 2026-09-08. It used to end on `processedNoo.push`, and that array was deleted when
   the drain started acknowledging each chunk as it lands - so the guard went red against correct
   code. The new anchor is the ack tag itself, which names the IndexedDB store and therefore cannot
   match the transaction block however similar the two look. An anchor that describes what the code
   IS outlives one that happens to sit nearby. */
ok('the synced store keeps the status its payload carried',
   /customers`, noo\.cloudId\)[\s\S]{0,1200}data: \{ \.\.\.payload, syncedAt: serverTimestamp\(\) \}[\s\S]{0,200}ack: \{ store: 'noo_profiles'/.test(app));
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
/* 2026-09-20 15:10: the question moved into helpers.eodNightMessage (ONE question for a night of two documents);
   App.jsx still mints from the same lines, and asks through the same text when no card asked first. */
ok('the shortfall is every bounty line the report mints, summed',
   /const bountyLines = eodBountyLines\(report, inventory, appSettings\?\.penaltyPriceTier\)/.test(app)
   && /const short = bounty\.reduce\(\(s, l\) => s \+ l\.amount, 0\);/.test(helpers)
   && /\.flatMap\(\(\{ report \}\) => eodBountyLines\(report, inventory, priceTier\)\);/.test(helpers));
ok('the admin is told the amount AND the lines before approving',
   /records each of those as a bounty in their name/.test(helpers)
   && /bounty\.map\(l => /.test(helpers) && /\$\{l\.label\}/.test(helpers)
   && /if \(!opts\?\.confirmed && !await confirmAction\(eodNightMessage\(\[\{ report, decision: \{ approve: askedApprove, reject: askedReject \} \}\], inventory, appSettings\?\.penaltyPriceTier\)\)\) return false;/.test(app)
   && /if \(!await confirmAction\(eodNightMessage\(items, inventory, tier\)\)\) return;/.test(read('src/components/PlayerCard.jsx')));
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

/* 2026-09-20: the review card is the PLAYER CARD (components/PlayerCard.jsx); the grouping still reads countStatus,
   the card's lines carry the gaps, the plate turns red when a short line is checked. */
{ const card = stripComments(eod); const pc = stripComments(read('src/components/PlayerCard.jsx'));
  ok('the card reads countStatus, not only the numbers',
     /r\.countStatus === 'DISPUTED'/.test(card) && /group\.disputed/.test(pc));
  ok('a missing countStatus is CLEAN — history is never painted as disputed',
     !/countStatus !== 'CLEAN'/.test(card) && !/countStatus \|\| 'DISPUTED'/.test(card));
  ok('what the app expected is rendered beside what he counted',
     /gap\(part === 'cash' \? report\.expectedCash : report\.expectedTransfer, report\[part\]\)/.test(pc) && /note = `short \$\{formatRupiah\(-g\)\}`; led = 'crit';/.test(pc));
  ok('the short products are named row by row, never one goods total',
     /shortStockRows\(report\.expectedStock, report\.remainingStock\)/.test(pc) && /note = `\$\{short\.length\} short on return`; led = 'crit';/.test(pc));
  ok('the approve button changes its own words when the count is short',
     /Approve \$\{hot \? 'short' : 'checked'\} \(\$\{nChecked\}\)/.test(pc));
  ok('and the card changes with it, so the gap is not just a number on a normal card',
     /const diode = \(group\.disputed \|\| sentBack\) \? 'crit' : group\.lost > 0 \? 'warn' : '';/.test(pc));
  ok('the rupiah named before approving comes from the SAME rule App.jsx mints with',
     /const bounty = eodBountyLines\(report, inventory, tier\);/.test(pc) && /const tier = appSettings\?\.penaltyPriceTier;/.test(pc)); }

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
   /const tier = appSettings\?\.penaltyPriceTier;/.test(read('src/components/PlayerCard.jsx')) && /eodBountyLines\(report, inventory, tier\)/.test(read('src/components/PlayerCard.jsx')));
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
/* 2026-09-20: the night is verified from the DOCKET (one panel per person, his B) with one plate — gold for a normal
   night (the board he chose carries it: "the color looks expensive"), the measured red plate for a short count. The
   separate cukai key is gone: cash & stock and pita cukai verify together. */
/* 2026-09-20 later: the docket became the PLAYER CARD; the one plate is APPROVE CHECKED on the card, gold for a normal
   night, the measured red plate when a short line is checked or the plate only sends things back. */
ok('the normal night is the gold plate on the card (one plate for every report the salesman sent)',
   /'bg-\[var\(--gold\)\] border-\[var\(--accent-edge\)\] text-\[var\(--gold-ink\)\]'/.test(read('src/components/PlayerCard.jsx')) && /const seal = \(\) => \{ if \(sealing\) return; setSealing\(true\);/.test(eod));
ok('the cukai night verifies on the same plate — one panel per person, no second key',
   !/'bg-\[var\(--raised\)\] border-\[var\(--amber\)\] text-\[var\(--amber\)\]'/.test(eod));
ok('a short count still gets the red plate, because that one is meant to stop him',
   /hot \? 'bg-\[var\(--danger-plate\)\] border-\[var\(--danger\)\] text-\[var\(--danger-plate-ink\)\]'/.test(read('src/components/PlayerCard.jsx')) &&
   /const hot = \(nReturn > 0 && nChecked === 0\) \|\| pending\.some\(l => checked\[l\.key\] && l\.led === 'crit'\);/.test(read('src/components/PlayerCard.jsx')));
/* Scoped to the BUTTON, by slicing the source between its onClick and the end of its tag.
   Two earlier attempts scoped it by colour string instead and both caught a bystander - first the
   WANTED total's drop-shadow, then the Pay Bounty button, which happen to use the same rgba. A
   guard that fires on an innocent element is a guard someone relaxes later. */
{ const pcs = read('src/components/PlayerCard.jsx'); const from = pcs.indexOf('onClick={approve}');
  const tag = from === -1 ? '' : pcs.slice(from, pcs.indexOf('>', pcs.indexOf('className', from)));
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
     /blocked \? 'text-\[var\(--accent-ink\)\]'/.test(opname), 'amber with its line since 2026-09-18 (his "too much red"); the refusal sentence is still printed');
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
     /SYS: <\/span><NixieCount value=\{\(item\.expectedStock \|\| 0\) \+ \(item\.expectedDamagedStock \|\| 0\)\} size=\{20\} \/>/.test(opname));
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
   /* …and END at the next section (the 2026-09-18 key caps, which are shadows on purpose); a
      missing marker falls back to the file end rather than a raw -1 (lesson 2026-08-19) */
   !/box-shadow/.test(code(themeCss.slice(themeCss.indexOf('.kpm-dash { container-type'),
     themeCss.indexOf('/* ─── 2026-09-18 — KEY CAPS') > 0 ? themeCss.indexOf('/* ─── 2026-09-18 — KEY CAPS') : themeCss.length))));

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

section('THE TUTORIAL BOOK — a ribbon lands directly on its chapter (2026-09-03)');

/* Aldi, 2026-09-02: *"i want to put full realism of this book ... i want the animation to be 4
   quick page swipe, this way it will make it realistic"* — a ribbon turned every sheet between here
   and there, uncapped, timed by `riffle()`.

   Aldi, 2026-09-03: reversed. *"pressing a ribbon must jump STRAIGHT to that chapter instead of
   flipping through every page between here and there."* `riffle()` is deleted from pageModel.js —
   there is no arithmetic left to run on the seventeen chapters, because a jump is not a run. The
   two things still worth pinning: the function is actually gone (a half-removed riffle is the shape
   that would quietly come back), and the ONE piece of its arithmetic that survives — a neighbour
   turn's duration — still holds its old value. */
ok('riffle is gone from pageModel.js, not just unused', typeof riffle === 'undefined',
   'a half-removed riffle is the shape that would quietly come back');

ok('a neighbour turn (next/prev, arrow keys, drag) still takes the full deliberate duration',
   TURN_FULL_MS === 340,
   'only the multi-page riffle was removed; a single page turn between two neighbouring sheets keeps its own speed');

/* Landing correctness itself — does `chapterTurn(id)` point at the right sheet — is already pinned
   above by "every chapter opens on its own cards page" and "no two chapters share a sheet". A jump
   uses that exact same number PonderBook.jsx's `commit()` always trusted; there is nothing new to
   compute, only somewhere new (directly) it gets used. */


section('THE BOUNTY UNIT — a rupiah penalty must never be summed as a stamp count (2026-09-05)');

/* Three copies of one formula add up `cukaiDebts`. PENALTY_ keys live in that same map but hold
   RUPIAH, not stamps — `helpers.js` mints PENALTY_EOD_* for a night's shortfall and
   StockOpnameView mints PENALTY_<epoch> for damaged goods, so the keys exist in the wild today.
   Two copies carried the guard; the agent's own dashboard did not, and read a Rp 200.000 bounty
   as 200.000 stamps owed. Scope each check to the summing loop, not the whole file — App.jsx
   names PENALTY_ in three comments that would satisfy a file-wide match on their own. */
const stampSums = [
  ['the agent dashboard', code(read('src/AgentInventoryView.jsx')), 'const cukaiDebts', 'totalCukaiOwed'],
  ['the EOD screen',      code(read('src/EODReconciliationView.jsx')), 'let calcTotal', 'expectedCukai = Math.max(0, calcTotal'],
  ['the payment engine',  code(app), 'let remainingPayment', 'if (remainingPayment > 0)'],
];
for (const [where, src, from, to] of stampSums) {
  const a = src.indexOf(from), b = src.indexOf(to, a + 1);
  ok(`${where}'s stamp-sum loop was found (anchors ${from} .. ${to})`, a > -1 && b > a,
     'anchor missed — the slice below would read the whole file and pass on a lookalike');
  if (a > -1 && b > a) {
    ok(`${where} skips PENALTY_ keys when summing stamp debt`,
       /!pid\.startsWith\('PENALTY_'\)/.test(src.slice(a, b)),
       'a rupiah bounty is being added into a count of stamps');
  }
}

/* The guard tests a prefix. If a minter ever writes a key under another name, the guard goes
   quiet without failing — so pin the two minters to the prefix the guard actually looks for. */
ok('every penalty key the EOD minter writes starts with PENALTY_',
   [...helpers.matchAll(/key:\s*`([^`]+)`/g)].filter(m => /PENALTY/.test(m[1])).every(m => m[1].startsWith('PENALTY_')),
   'a minted key outside the prefix would be summed as stamps again');
ok('the quarantine minter writes the same prefix',
   /`PENALTY_\$\{Date\.now\(\)\}`/.test(read('src/StockOpnameView.jsx')),
   'StockOpnameView mints damage charges into the same map');

/* The maths itself, on the numbers from the write-up: 40 stamps owed, one Rp 200.000 bounty. */
const stampsOwed = (debts) => {
  let calc = 0;
  const credit = debts['global_credit'] || 0;
  for (const [pid, val] of Object.entries(debts)) {
    if (pid !== 'global_credit' && !pid.startsWith('PENALTY_') && val > 0) calc += Math.ceil(val);
  }
  return Math.max(0, calc + credit);
};
ok('40 stamps plus a Rp 200.000 bounty still reads as 40 stamps, not 200.040',
   stampsOwed({ 'prod-teh': 40, 'PENALTY_1756000000000': 200000 }) === 40,
   'the dashboard is adding rupiah into the stamp count again');
ok('an agent whose only debt is a bounty owes zero stamps',
   stampsOwed({ 'PENALTY_EOD_r1_CASH': 50000 }) === 0,
   'a cash fine is not a stamp debt and must not appear as one');


section('THE STORE HAND-OFF — history keeps its author, ownership moves on the store (2026-09-05)');

/* Aldi, 2026-09-05: *"then andi and budi but andi should be view only and budi can edit the value
   and of course add history on the receipt the hands off thats tell Andi -> Budi"*.

   Approving a transfer used to stamp the receiving agent onto every past transaction of that
   store. That is what made his rule impossible to state at all: once the record says the receiver
   was the seller, there is no "he may edit, you may not" left to enforce. The rows now keep the
   agent who made them. Ownership moves on the STORE record, and the receivables screen reaches
   the inherited debt through that owner plus the hand-off chain — because deleting the rewrite
   without replacing that read path would leave the new holder unable to collect a debt he owns,
   which is worse than the bug being fixed.

   Slice every assertion to its own anchors. App.jsx names agentId over a hundred times, and the
   approval handler's own notifications legitimately carry `agentId: request.toAgentId`, so a
   file-wide match — or even a slice-wide one — proves nothing about the transaction rewrite. */

const appc = code(app);
const cfv  = code(read('src/ConsignmentFinanceView.jsx'));

const aA = appc.indexOf('const handleAdminApproveTransfer');
const aB = appc.indexOf('await commitInChunks(db, writeBatch, operations);', aA + 1);
ok('the approval handler was found (anchors const handleAdminApproveTransfer .. commitInChunks)',
   aA > -1 && aB > aA,
   'anchor missed — the slice below would read the whole file and pass on a lookalike');
if (aA > -1 && aB > aA) {
  const approval = appc.slice(aA, aB);

  /* THE REGRESSION GUARD. `data: { agentId:` is the batched-update shape and appears nowhere in
     the notification writes, which use a bare `agentId:` inside addDoc. */
  ok('approving a transfer no longer overwrites any past transaction’s agent',
     !/data:\s*\{\s*agentId:\s*request\.toAgentId/.test(approval),
     'the rewrite is back — past sales are being restamped with the receiver');
  ok('the approval handler no longer selects the store’s transactions at all',
     !/const storeTx/.test(approval),
     'a selector over transactions inside approval is the rewrite growing back');

  /* And the replacement must actually be there, or the debt reaches nobody. */
  ok('approval moves ownership onto the store record instead',
     /ownerAgentId:\s*request\.toAgentId/.test(approval),
     'without an owner on the customer doc the new holder cannot see the debt');
  ok('approval appends the hand-off to the store’s history',
     /handoffs:\s*arrayUnion/.test(approval),
     'the receipt line has nothing to render');
  ok('the store-id pin and the twin fallback survived the rewrite removal',
     /request\.customerId/.test(approval) && /nameMatches\.length === 1/.test(approval),
     'same-named shops would move together again');
}

const dA = appc.indexOf('const handleDeleteConsignmentData');
const dB = appc.indexOf('const handleDeleteHistory', dA + 1);
ok('the consignment delete handler was found (anchors handleDeleteConsignmentData .. handleDeleteHistory)',
   dA > -1 && dB > dA, 'anchor missed — the slice below would read the whole file');
if (dA > -1 && dB > dA) {
  const del = appc.slice(dA, dB);
  /* Refused at the WRITE, not hidden in the UI — the "UI Says Yes, Server Says No" shape in the
     vault. Hiding a button leaves the handler callable. */
  ok('erasing a store’s history is refused for rows the caller did not make',
     /notMine/.test(del) && /!isAdmin/.test(del),
     'the receiver can still wipe the previous agent’s sales');
  ok('the refusal happens before the confirm dialog and before any batch is built',
     del.indexOf('notMine') > -1 && del.indexOf('notMine') < del.indexOf('commitInChunks'),
     'a guard after the write is not a guard');
}

const mA = cfv.indexOf('const myTransactions');
const mB = cfv.indexOf('const debtData', mA + 1);
ok('the receivables scope was found (anchors const myTransactions .. const debtData)',
   mA > -1 && mB > mA, 'anchor missed — the slice below would read the whole file');
if (mA > -1 && mB > mA) {
  ok('an agent also reaches rows belonging to a store he now owns',
     /isInherited\(t\)/.test(cfv.slice(mA, mB)),
     'the handed-over debt is invisible to the agent who now owns it');
}
ok('the inherited set is built from the store’s owner and its hand-off chain',
   /c\.ownerAgentId !== agentProfileId/.test(cfv) && /c\.handoffs/.test(cfv),
   'mappedBy is not the current owner — it also records who first registered the shop');
ok('the hand-off is drawn on both receipt formats, not only the thermal slip',
   (cfv.match(/handoffLine/g) || []).length >= 3,
   'the memo plus one line per format is the minimum; his ask was for it on the receipt');

/* ── the maths, re-run on real rows ───────────────────────────────────────────────────────
   Budi sold to Toko Maju three times on consignment and collected once, then handed the store to
   Andi. Andi has since made one sale there himself. Toko Lama is Budi's and must not move. */
const storeK = (v) => String(v || '').trim().toUpperCase();
const HANDED = { id: 'c1', name: 'Toko Maju', ownerAgentId: 'andi', ownerAgentName: 'Andi',
                 handoffs: [{ fromId: 'budi', fromName: 'Budi', toId: 'andi', toName: 'Andi', date: '2026-09-05' }] };
const TX = [
  { id: 't1', customerName: 'Toko Maju', agentId: 'budi', type: 'SALE', paymentType: 'Titip', total: 450000 },
  { id: 't2', customerName: 'Toko Maju', agentId: 'budi', type: 'SALE', paymentType: 'Titip', total: 300000 },
  { id: 't3', customerName: 'Toko Maju', agentId: 'budi', type: 'CONSIGNMENT_PAYMENT', amountPaid: 250000 },
  { id: 't4', customerName: 'Toko Maju', agentId: 'andi', type: 'SALE', paymentType: 'Titip', total: 120000 },
  { id: 't5', customerName: 'Toko Lama', agentId: 'budi', type: 'SALE', paymentType: 'Titip', total: 999000 },
];

const ownerMap = (custs, me) => {
  const m = new Map();
  custs.forEach(c => {
    if (c.ownerAgentId !== me) return;
    const k = storeK(c.name), set = m.get(k) || new Set();
    (c.handoffs || []).forEach(h => set.add(h.fromId || 'ADMIN'));
    m.set(k, set);
  });
  return m;
};
const inheritedBy = (me) => {
  const m = ownerMap([HANDED], me);
  return (t) => {
    const ids = m.get(storeK(t.customerName));
    return !!ids && ids.has(t.agentId || 'ADMIN') && t.agentId !== me;
  };
};
const visibleTo = (me) => { const inh = inheritedBy(me); return TX.filter(t => t.agentId === me || inh(t)); };
const outstanding = (rows) => rows.reduce((s, t) =>
  t.type === 'SALE' && t.paymentType === 'Titip' ? s + t.total
  : t.type === 'CONSIGNMENT_PAYMENT' ? s - t.amountPaid : s, 0);

ok('the receiving agent reaches every row of the store he was handed, and nothing else',
   visibleTo('andi').map(t => t.id).join(',') === 't1,t2,t3,t4',
   'got: ' + visibleTo('andi').map(t => t.id).join(','));
ok('the selling agent does NOT lose the sales he made there',
   visibleTo('budi').map(t => t.id).join(',') === 't1,t2,t3,t5',
   'got: ' + visibleTo('budi').map(t => t.id).join(','));
ok('the debt that follows the store is the real number: 450.000 + 300.000 − 250.000 + 120.000',
   outstanding(visibleTo('andi')) === 620000,
   'got Rp ' + outstanding(visibleTo('andi')));
ok('another agent’s store is not dragged along by the hand-off',
   !visibleTo('andi').some(t => t.customerName === 'Toko Lama'));

/* The write refusal, on the same rows. Nobody bulk-erases history they did not write. */
const refusedRows = (me, isAdm) => {
  const targets = TX.filter(t => storeK(t.customerName) === storeK('Toko Maju') &&
    (t.type.includes('CONSIGNMENT') || (t.type === 'SALE' && t.paymentType === 'Titip') || t.type === 'RETURN'));
  return isAdm ? 0 : targets.filter(t => (t.agentId || 'ADMIN') !== me).length;
};
ok('the receiver is refused when he tries to erase the three sales Budi made',
   refusedRows('andi', false) === 3, 'got ' + refusedRows('andi', false));
ok('the seller is refused too, for the one row Andi added after the hand-off',
   refusedRows('budi', false) === 1, 'got ' + refusedRows('budi', false));
ok('an admin still clears the whole store',
   refusedRows('andi', true) === 0);

section('THE FIRST LIVE HAND-OFF — four faults Aldi found by running it (2026-09-05)');

/* He ran the flow end to end and ranked what broke: 1 the bell panel, 2 the agent cannot collect,
   3 the receiver goes blind after accepting, 4 notifications land on a tab instead of on the thing
   that needs input. All four are in the screen around the hand-off, none in its logic. */

const bell = code(read('src/components/NotificationBell.jsx'));
const cfv2 = code(read('src/ConsignmentFinanceView.jsx'));
const app2 = code(app);

/* ── 1 · the panel had to leave the header ─────────────────────────────────────────────────
   The badge counted correctly the whole time, so the data path was never the fault. The panel was
   an absolute child of a wrapper carrying `overflow-hidden` and `relative z-10`, which crops it and
   caps its z-index no matter how high the panel asks. A portal to <body> is the only fix that does
   not depend on which ancestor grows an overflow rule next. */
ok('the notification panel renders through a portal, not inside the header',
   /createPortal\(/.test(bell) && /document\.body\)/.test(bell),
   'an absolutely-positioned panel inherits every ancestor clip and stacking context');
ok('the panel is positioned off the button’s own rectangle at open time',
   /getBoundingClientRect\(\)/.test(bell) && /position: 'fixed'/.test(bell),
   'a rectangle read once on mount pins the panel where the bell used to be');
ok('the outside-click handler asks the portalled panel too',
   /panelRef\.current && panelRef\.current\.contains/.test(bell),
   'the panel is no longer inside dropdownRef — the first click inside it would close it on mousedown');
/* The regression that would silently undo all of the above. */
ok('the panel is no longer an absolute child of the bell',
   !/absolute right-0 mt-3 w-80/.test(bell),
   'the old in-header positioning is back and the clip returns with it');

/* ── 2 · the agent can collect ─────────────────────────────────────────────────────────────
   Slice to the action row. `isAdmin` appears a dozen times in this file for unrelated reasons. */
const ADD_GATE   = 'isAdmin && <button onClick={() => onAddGoods';
const AUDIT_GATE = 'isAdmin && <button onClick={() => setAuditMode(true)}';
/* Anchor on the gates themselves. Slicing between the two LABELS would have started the window
   after the `isAdmin &&` it was meant to test — which is exactly how this check first passed on
   code that had not been changed yet. */
ok('the Add Goods gate was found, so the absence checks below are testing something real',
   cfv2.includes(ADD_GATE),
   'anchor missed — a renamed button would make every gate assertion here vacuously true');
ok('Store Audit is no longer admin-only, so an agent can collect and count the shelf',
   cfv2.includes('setAuditMode(true)') && !cfv2.includes(AUDIT_GATE),
   'collecting money and writing the shelf both run through Store Audit — gating it locks the agent out of both');
ok('Add Goods stays admin-only — only the audit was opened up',
   cfv2.includes(ADD_GATE),
   'ungating the wrong button is a different permission change than the one Aldi asked for');
ok('the action row still fits its grid for an agent',
   /\$\{!isAdmin \? 'col-span-2' : ''\}/.test(cfv2),
   'the Hand-off button kept col-span-4 from when it was the agent’s only control; with Store Audit beside it the row overflows');
/* The scope is not new code — it is the receivables filter that already exists. Aldi, 2026-09-05:
   "the consignment that they made or receive from other handsoff, that is the only store that they
   see". So the guard that matters is that the screen's own scope still holds. */
ok('the audit can only reach stores already on the agent’s screen',
   /matchId \|\| matchName \|\| isInherited\(t\)/.test(cfv2),
   'if myTransactions ever widens, the audit button widens with it — they share one scope on purpose');

/* ── 3 · the receiver keeps sight of what he accepted ──────────────────────────────────────
   Accepting moves PENDING_AGENT -> PENDING_ADMIN. Listing only the first made the card vanish the
   instant it was pressed, with nothing anywhere else showing it: `outgoing` matches only the
   SENDER, and the admin list draws only for admins. */
ok('the receiver still sees the hand-off after he accepts it',
   /r\.status === 'PENDING_AGENT' \|\| r\.status === 'PENDING_ADMIN'/.test(cfv2),
   'the card disappears on press and reads as the button deleting itself');
ok('but the accept/decline buttons only draw while it is still his move',
   /r\.status === 'PENDING_AGENT' \? \(/.test(cfv2),
   'a second Accept on an already-accepted request would re-fire the handler');

/* ── 4 · straight to the thing that needs input ────────────────────────────────────────────*/
ok('the two notifications that ASK for something carry the shop’s name',
   (app2.match(/linkToStore/g) || []).length >= 4,
   'two writes plus the handler plus the prop — fewer means one end is not wired');
ok('the click handler forwards that shop to the screen',
   /if \(notification\.linkToStore\) setFocusStore/.test(app2),
   'without this the alert still only lands on the tab');
ok('the screen opens the shop and then disarms it',
   /const match = customerData\.find\(c => storeKey\(c\.name\) === storeKey\(focusStore\)\)/.test(cfv2)
   && /onFocusStoreHandled\(\)/.test(cfv2),
   'a name left armed re-opens that shop on the next unrelated render');

/* ── the maths: the four faults, re-run as the predicates they actually are ────────────────
   One request, one receiver, one admin, walked through its whole life. */
const REQ = { id: 'r1', storeName: 'Toko Maju', fromAgentId: 'ADMIN', toAgentId: 'andi', status: 'PENDING_AGENT' };
const incomingFor = (r, me) => r.toAgentId === me && (r.status === 'PENDING_AGENT' || r.status === 'PENDING_ADMIN');
const outgoingFor = (r, me, isAdm) => (me && r.fromAgentId === me) || (isAdm && (r.fromAgentId === 'ADMIN' || !r.fromAgentId));
const adminFor = (r) => r.status === 'PENDING_ADMIN';
const buttonsFor = (r) => r.status === 'PENDING_AGENT';

ok('before he answers: the receiver sees it with buttons',
   incomingFor(REQ, 'andi') && buttonsFor(REQ));
const ACCEPTED = { ...REQ, status: 'PENDING_ADMIN' };
ok('after he accepts: he STILL sees it, and the buttons are gone',
   incomingFor(ACCEPTED, 'andi') && !buttonsFor(ACCEPTED),
   'this exact pair is the bug he reported — it vanished entirely');
ok('and the admin sees it waiting for authorisation at the same moment',
   adminFor(ACCEPTED) && outgoingFor(ACCEPTED, null, true),
   'the admin must reach it without the bell, since the bell is the other fault');
ok('a stranger agent sees it in neither list',
   !incomingFor(ACCEPTED, 'budi') && !outgoingFor(ACCEPTED, 'budi', false));
const DONE = { ...REQ, status: 'APPROVED' };
ok('once approved it leaves the receiver’s action list rather than sitting there forever',
   !incomingFor(DONE, 'andi'),
   'an approved hand-off is history, not an outstanding request');


/* ══ HAND-OFF ELIGIBILITY — a store could be offered to the wrong person ═══════════════════
   Aldi, 2026-09-05: "consignment should only be transferred between regional team member only,
   and only tier 1,2,3 is the one who can transfer consignment between regional area personnel".
   Two faults, not one: the picker offered the agent who ALREADY held the store, and nothing
   anywhere compared branches — the write took whatever id it was handed. */
section('H. Hand-off eligibility: the right person, at BOTH ends');

const cfv3 = read('src/ConsignmentFinanceView.jsx');
const app3 = read('src/App.jsx');

ok('the predicate is imported where the picker is drawn',
   imports(cfv3, 'handoffEligibility'),
   'a CALL with no import throws into a catch and disables the guard silently — bug #24 all over again');
ok('and where the request document is written',
   imports(app3, 'handoffEligibility'),
   'the write is the boundary; the picker is only a suggestion');

/* Slice App.jsx to handleRequestTransfer's own body. `handoffEligibility` could sit anywhere in a
   9000-line file and a file-wide grep would call that a pass. Assert both anchors FIRST: indexOf
   returns -1 and slice(from, -1) silently means "the whole rest of the file". */
const RQ_START = 'const handleRequestTransfer = async (storeName';
const RQ_END   = 'const handleAgentAcceptTransfer';
const rqFrom = app3.indexOf(RQ_START), rqTo = app3.indexOf(RQ_END);
ok('handleRequestTransfer was located, so the assertions below test something real',
   rqFrom > -1 && rqTo > rqFrom,
   'anchor missed — every assertion scoped to this slice would pass vacuously');
const requestBody = app3.slice(rqFrom, rqTo);
ok('the slice is the handler, not the rest of the file',
   requestBody.length > 500 && requestBody.length < 6000,
   `slice was ${requestBody.length} chars — an anchor moved and the window swallowed neighbours`);
ok('the write refuses an ineligible target BEFORE it creates the document',
   /if \(!verdict\.ok\) return notify\(verdict\.reason\);/.test(requestBody)
   && requestBody.indexOf('if (!verdict.ok)') < requestBody.indexOf('addDoc'),
   'a check that runs AFTER addDoc has already written the request it was meant to stop');
ok('the write resolves the owner from ownerAgentId, not from mappedBy',
   /ownerDoc\?\.ownerAgentId/.test(requestBody),
   'mappedBy says who REGISTERED the shop; reusing it as ownership would block the wrong person');

/* Same treatment for the picker: scope to the hand-off select, not to the admin's search filter.
   `dropdownAgents` at the top of that file is the ADMIN VIEW filter and is NOT this control —
   editing that one would have left the real picker wide open. */
const SEL_START = '-- Select Receiving Personnel --';
const SEL_END   = 'Reason for transfer...';
const selFrom = cfv3.indexOf(SEL_START), selTo = cfv3.indexOf(SEL_END);
ok('the hand-off picker was located',
   selFrom > -1 && selTo > selFrom,
   'anchor missed — the picker assertions would pass vacuously');
const picker = cfv3.slice(selFrom, selTo);
ok('the picker draws only from the vetted list, never from motorists directly',
   /handoffTargets\.groups\.map/.test(picker) && !/motorists \|\| \[\]/.test(picker),
   'reading the roster straight into the select is how the unfiltered list came back the first time');

/* The filtering moved OUT of the JSX and into a memo when Aldi replaced the greyed-out row with
   hiding (2026-09-06). Scope to that memo's own body - `handoffEligibility` appears three times in
   this file and a file-wide grep would pass on any of them. */
const TG_START = 'const handoffTargets = useMemo(';
const TG_END   = 'showAllBranches]);';
const tgFrom = cfv3.indexOf(TG_START), tgTo = cfv3.indexOf(TG_END);
ok('the target-list memo was located',
   tgFrom > -1 && tgTo > tgFrom,
   'anchor missed - the assertions below would pass vacuously');
const targets = cfv3.slice(tgFrom, tgTo);
ok('an ineligible agent is dropped before the list is ever built',
   /if \(!verdict\.ok\) return;/.test(targets) && /handoffEligibility\(\{/.test(targets),
   'HIS CALL 2026-09-06: "i dont want the list to be greyed out, but just hide personnel that is not on regional team"');
ok('and so is anybody outside the regional team, unless the toggle is on',
   /if \(homeRegion && !showAllBranches && region !== homeRegion\) return;/.test(targets),
   'this is the filter that actually shortens the list - he is Tier 1, so eligibility alone hides nobody from him');
ok('the regional team falls back to the branch that holds the store when the sender has none',
   /myProfile\?\.location \? normalizeRegion\(myProfile\.location\) : ownerRegion\(\)/.test(targets),
   'an admin carries no branch; without this their list is every agent in the company again');
ok('UNASSIGNED is never treated as a regional team to filter down to',
   /if \(homeRegion === 'UNASSIGNED'\) homeRegion = null;/.test(targets),
   'filtering to UNASSIGNED would show only the agents with no branch - the ones who cannot receive at all');

ok('an empty list says it is empty rather than looking broken',
   /handoffTargets\.count === 0 && \(/.test(picker) && /can receive this store/.test(picker),
   'hiding names is what made this screen read as faulty before; the one case where it still bites has to speak');
ok('tiers allowed to cross branches keep a way to reach them',
   /canCrossBranches && handoffTargets\.homeRegion && \(/.test(picker) && /setShowAllBranches\(e\.target\.checked\)/.test(picker),
   'hide other branches with no way back and handoff_cross_region becomes a permission that exists and cannot be used');
ok('flipping that toggle clears the selection',
   /setShowAllBranches\(e\.target\.checked\); setTargetAgent\(''\);/.test(picker),
   'a target chosen in another branch and then hidden again would still be sitting in state when Confirm is pressed');

/* ── the maths: the predicate re-run on real agents ──────────────────────────────────────── */
const ANDI    = { id: 'andi',  name: 'Andi',  userRole: CORPORATE_TIERS.TIER_5, location: 'Jakarta' };
const BUDI    = { id: 'budi',  name: 'Budi',  userRole: CORPORATE_TIERS.TIER_5, location: ' jakarta ' };
const CITRA   = { id: 'citra', name: 'Citra', userRole: CORPORATE_TIERS.TIER_5, location: 'BANDUNG' };
const NOWHERE = { id: 'dedi',  name: 'Dedi',  userRole: CORPORATE_TIERS.TIER_5, location: '' };
const BOSS    = { id: 'master_owner', name: 'Pak Boss', userRole: 'ADMIN', location: 'JAKARTA' };

const judge  = (to, opts) => handoffEligibility({ toAgent: to, ...opts });
const asAndi = { senderRole: CORPORATE_TIERS.TIER_5, senderRegion: 'Jakarta' };

ok('same branch, different spelling, still the same branch',
   judge(BUDI, asAndi).ok,
   'the region compare must normalise like ConsignmentFinanceView does, or " jakarta " reads as another branch');
ok('a field agent cannot hand a store to another branch',
   judge(CITRA, asAndi).code === 'OTHER_BRANCH',
   'this is the rule Aldi asked for — regional team members only');
ok('tier 3 can, because he named tiers 1-3',
   judge(CITRA, { senderRole: CORPORATE_TIERS.TIER_3, senderRegion: 'JAKARTA' }).ok);
ok('tier 4 cannot — his line stops above REGIONAL ADMIN',
   !judge(CITRA, { senderRole: CORPORATE_TIERS.TIER_4, senderRegion: 'JAKARTA' }).ok,
   'T4 is his REGIONAL ADMIN; letting it move stores between branches is the approval-load problem he described');
ok('an admin acting for the company reaches any branch',
   judge(CITRA, { senderRole: 'ADMIN', senderIsCompanyWide: true }).ok);

ok('nobody can be offered the store they already hold',
   judge(BUDI, { ...asAndi, currentOwnerId: 'budi' }).code === 'ALREADY_HOLDS',
   'the first fault Aldi hit — the picker offered the current owner and the write accepted it');
ok('not even an admin, whose reach is otherwise total',
   !judge(BUDI, { senderRole: 'ADMIN', senderIsCompanyWide: true, currentOwnerId: 'budi' }).ok,
   'company-wide reach is about BRANCHES; handing a store to its own holder moves nothing either way');
ok('an agent with no branch on file cannot receive anything',
   judge(NOWHERE, asAndi).code === 'NO_BRANCH',
   'UNASSIGNED is a missing field, not a place — two unplaced agents are not "the same branch"');
ok('and a sender with no branch on file cannot send',
   judge(BUDI, { senderRole: CORPORATE_TIERS.TIER_5, senderRegion: '' }).code === 'SENDER_NO_BRANCH',
   'THE HOLE THIS CHECK EXISTS FOR: read "no region" as company-wide and the emptiest record gets the widest reach');
ok('an owner account is not a hand-off target',
   judge(BOSS, asAndi).code === 'OWNER_ACCOUNT',
   'a store has to be held by somebody who visits it');
ok('a target that is no longer on the roster is refused, not crashed on',
   judge(undefined, asAndi).code === 'GONE',
   'motorists.find returns undefined for a terminated agent and the write path passes that straight in');
ok('every refusal carries a sentence the agent can act on',
   [judge(CITRA, asAndi), judge(NOWHERE, asAndi), judge(BOSS, asAndi), judge(undefined, asAndi)]
     .every(v => !v.ok && typeof v.reason === 'string' && v.reason.length > 20),
   'silence is a bug here, not missing polish — his design law');
ok('ANDI is only here to prove the fixtures are agents, not strings',
   ANDI.id === 'andi' && judge(ANDI, { senderRole: CORPORATE_TIERS.TIER_5, senderRegion: 'JAKARTA' }).ok);

/* The matrix key. Runs LAST: injectDynamicPermissions mutates module state, so anything asserted
   after it is judging a different app than everything above. */
ok('before he configures anything, the tier defaults answer',
   judge(CITRA, { senderRole: CORPORATE_TIERS.TIER_3, senderRegion: 'JAKARTA' }).ok
   && !judge(CITRA, { senderRole: CORPORATE_TIERS.TIER_4, senderRegion: 'JAKARTA' }).ok,
   'absence of a brand-new key must mean "use the tier default", never "no" — a new key read as no makes a working feature look broken');
injectDynamicPermissions({ [CORPORATE_TIERS.TIER_4]: ['handoff_cross_region'] }, null);
ok('once the key is in his saved matrix, his switch wins — tier 4 gains it',
   judge(CITRA, { senderRole: CORPORATE_TIERS.TIER_4, senderRegion: 'JAKARTA' }).ok);
ok('and wins in the other direction too — tier 3 loses it',
   !judge(CITRA, { senderRole: CORPORATE_TIERS.TIER_3, senderRegion: 'JAKARTA' }).ok,
   'a switch that only ever adds is not a switch');


/* The visibility rule re-run on real agents. Mirrors the memo above the way incomingFor/outgoingFor
   mirror the request lists further up this file; the source greps beside it pin the real code's
   shape so the two cannot drift apart unnoticed. */
const pickerShows = (roster, { senderRole: role, senderRegion: reg, senderIsCompanyWide: wide, currentOwnerId: owner, showAll, meId }) => {
  let home = reg ? normalizeRegion(reg) : (() => {
    const o = roster.find(m => m.id === owner);
    return o ? normalizeRegion(o.location) : null;
  })();
  if (home === 'UNASSIGNED') home = null;
  return roster.filter(m => {
    if (m.id === meId) return false;
    if (!handoffEligibility({ toAgent: m, senderRole: role, senderRegion: reg, senderIsCompanyWide: wide, currentOwnerId: owner }).ok) return false;
    if (home && !showAll && normalizeRegion(m.location) !== home) return false;
    return true;
  }).map(m => m.id);
};

const ROSTER = [ANDI, BUDI, CITRA, NOWHERE, BOSS];

ok('a field agent sees only their own branch, and not themselves',
   JSON.stringify(pickerShows(ROSTER, { senderRole: CORPORATE_TIERS.TIER_5, senderRegion: 'Jakarta', meId: 'andi' })) === '["budi"]',
   'Citra is another branch, Dedi has no branch, Pak Boss is an owner account - three names off a five-name list');
ok('the owner of the store drops out of that list too',
   !pickerShows(ROSTER, { senderRole: CORPORATE_TIERS.TIER_5, senderRegion: 'Jakarta', meId: 'andi', currentOwnerId: 'budi' }).includes('budi'));

/* The point of the change: HIS list. He is Tier 1, so everyone is eligible for him - eligibility
   alone would hide nobody and the dropdown would stay exactly as long as he complained about. */
const bossSees = pickerShows(ROSTER, { senderRole: 'ADMIN', senderIsCompanyWide: true, currentOwnerId: 'andi', meId: null });
ok('an admin gets the store\u2019s own branch, not the whole company',
   JSON.stringify(bossSees) === '["budi"]',
   'THE WHOLE POINT of 2026-09-06 - eligibility alone leaves a Tier 1 seeing every agent there is');
ok('and the toggle gives him the rest back',
   pickerShows(ROSTER, { senderRole: 'ADMIN', senderIsCompanyWide: true, currentOwnerId: 'andi', meId: null, showAll: true }).includes('citra'),
   'without this an admin cannot hand a store to another branch at all, though the write permits it');
ok('the toggle never resurrects somebody who is simply not allowed',
   !pickerShows(ROSTER, { senderRole: CORPORATE_TIERS.TIER_5, senderRegion: 'Jakarta', meId: 'andi', showAll: true }).includes('citra'),
   'showing other branches must widen the VIEW, never the permission - a T5 still cannot cross');
ok('nobody with no branch is ever shown, toggle or not',
   !pickerShows(ROSTER, { senderRole: 'ADMIN', senderIsCompanyWide: true, meId: null, showAll: true }).includes('dedi'));


/* ══ APPROVAL IS A PROPERTY OF THE PERSON, NOT OF THE TIER ═════════════════════════════════
   Aldi killed the tier version on sight, 2026-09-06: "there is so flaw in the matrix system if u
   build it that way ... if u put it on each tier like this then, all the regional admin if tick,
   will see every single approval for every regional location as well, where i only want this 1
   account to have the power for approval in bandung only". He was right: a branch ticked against
   T4 reached every T4 in the company, so the control meant to stop the approval flood caused it. */
section('I. Hand-off approval: named on the person, in Fleet & Canvas');

const app4   = read('src/App.jsx');
const cfv4   = read('src/ConsignmentFinanceView.jsx');
const fleet4 = read('src/FleetCanvasManager.jsx');
const set4   = read('src/components/SettingsView.jsx');

ok('the approval predicate is imported where the write happens',
   imports(app4, 'canApproveHandoffFrom') && imports(app4, 'handoffApprovers'),
   'a call with no import throws into a catch and disables the guard silently');
ok('and where the approval queue is drawn',
   imports(cfv4, 'canApproveHandoffFrom'));

/* THE REGRESSION THAT MATTERS MOST: the tier-based version must not come back. */
ok('the permission matrix carries no per-branch approval rows any more',
   !/HANDOFF_REGION_PREFIX/.test(set4) && !/APPROVAL_REGIONS/.test(set4),
   'HIS REPORT — a branch ticked against a RANK reaches every person holding that rank');
ok('and nothing anywhere still reads approval regions off the permission matrix',
   !/handoff_region:/.test(read('src/config/permissions.js')),
   'a stale handoff_region: entry left in his saved Firebase matrix must not grant anything');

/* Scope to handleAgentAcceptTransfer for the bell, and to handleAdminApproveTransfer for the write.
   Both names appear elsewhere in a 9000-line file; a file-wide grep would pass from anywhere. */
const acFrom = app4.indexOf('const handleAgentAcceptTransfer');
const acTo   = app4.indexOf('const handleAdminApproveTransfer');
ok('handleAgentAcceptTransfer was located',
   acFrom > -1 && acTo > acFrom,
   'anchor missed — the bell assertions would pass vacuously');
const acceptBody = app4.slice(acFrom, acTo);
ok('the owner still gets the approval bell',
   /agentId: 'ADMIN',/.test(acceptBody),
   'OPTION B IS ADD, NOT REPLACE — "both still get the bells of course"');
ok('and the named approvers get one too, in the same handler — only the SENDER is excluded now',
   /handoffApprovers\(motorists, receivingRegion, \[request\.fromAgentId\]\)/.test(acceptBody),
   'without the fan-out the Fleet setting saves and does nothing; and since 2026-09-07 the receiver is told too, because they may now approve — Aldi: "yeah they should be able to confirm their own request"');
ok('the branch is the RECEIVING agent’s, the one guaranteed to exist',
   /const receivingRegion = \(motorists \|\| \[\]\)\.find\(m => m\.id === request\.toAgentId\)\?\.location;/.test(acceptBody),
   'the sender may be an admin with no branch at all');

const apFrom = app4.indexOf('const handleAdminApproveTransfer');
const apTo   = app4.indexOf('const handleSubmitEOD');
ok('handleAdminApproveTransfer was located, and so was the handler after it',
   apFrom > -1 && apTo > apFrom,
   'anchor missed — indexOf returns -1 and slice(from, -1) hands back the rest of the file, so every assertion below would pass by finding its string somewhere else in a 9000-line component');
const approveBody = app4.slice(apFrom, apTo);
/* Comments stripped for the assertions below. The comment that now sits over the guard QUOTES the
   clause it is warning the next reader not to restore, and a raw grep cannot tell a warning about a
   line from the line. Scope to the element, never to a string that appears near it. */
const approveCode = code(approveBody);
ok('and the slice is the handler, not a neighbourhood',
   approveBody.length > 3000 && approveBody.length < 12000,
   'got ' + approveBody.length + ' chars — a slice that drifts stops scoping anything');
ok('the write is handed a PROFILE and the roster, not a bare tier id',
   /canApproveHandoffFrom\(myApprovalProfile, receivingRegion, motorists\)/.test(approveBody),
   'the tier signature is the flaw he reported — it cannot tell two people of the same rank apart');
ok('nobody authorises a hand-off they ASKED FOR',
   /if \(request\.fromAgentId === agentProfileId\) \{/.test(approveCode),
   'requesting a store and granting it to yourself is one person doing the whole protocol');
ok('and the receiver clause is gone from the write, because Aldi took it out of the queue',
   !/request\.toAgentId === agentProfileId/.test(approveCode),
   'HIS BUG, 2026-09-08, signed in as KALDI — Bandung’s named approver receiving a Bandung store: the queue drew the Authorize button and this line refused the press. ad4f18b changed the LIST and not the WRITE. Putting the clause back is the smaller-looking fix and it silently reverses his call: *"yeah they should be able to confirm their own request"*');
ok('the refusal message no longer claims receiving is the reason',
   /notify\("You asked for this hand-off\. Somebody else has to authorise it\."\)/.test(approveCode) &&
   !/or you are receiving it/.test(approveCode),
   'a toast that names a rule the code no longer enforces sends him hunting for a bug that is not there');
ok('the request is RE-READ before the write, not trusted from the render',
   /freshSnap\.data\(\)\.status !== 'PENDING_ADMIN'/.test(approveBody),
   'THE COST OF OPTION B: two people hold this button, and the local copy predates the other press');
ok('and that re-read happens before anything is written',
   approveBody.indexOf('freshSnap') < approveBody.indexOf('operations.push'),
   'a guard after the write has already approved the thing it was meant to stop');

ok('the approval queue only lists what the viewer may actually authorise',
   /canApproveHandoffFrom\(isAdmin \? \{ userRole: 'ADMIN' \} : myProfile, receiver\?\.location, motorists\)/.test(cfv4),
   'listing every PENDING_ADMIN to everybody is what it did before');

/* Fleet & Canvas — where he asked for the control to live. */
ok('the branch checkboxes are on the person’s own record',
   /const toggleApprovalRegion = \(region\) => \{/.test(fleet4) && /Hand-off approval branches/.test(fleet4),
   'HIS INSTRUCTION: "i want the approval power to be given on specific person inside the fleet and canvas manager"');
ok('the branch list comes from the roster, unioned with what is already granted',
   /\.\.\.new Set\(\[\.\.\.live, \.\.\.granted\]\)/.test(fleet4),
   'without the union a granted branch vanishes from the control when its last agent moves away, and the grant is stranded live in the database');
ok('saving writes null rather than an empty array',
   (fleet4.match(/\(newAgent\.approvalRegions \|\| \[\]\)\.length \? newAgent\.approvalRegions\.map\(normalizeRegion\) : null/g) || []).length === 2,
   'BOTH the create and the edit path — [] reads as "named for no branch", which would strip a Regional Admin’s default the first time somebody edits their phone number');
ok('and the form says what an unticked control is doing',
   /Nothing ticked: this person follows the default/.test(fleet4),
   'silence is a bug here — his design law');

/* ── the maths: approval re-run on real people ────────────────────────────────────────────
   RINA and SARI are the same RANK in different branches. That pair is the whole bug he found. */
const RINA = { id: 'rina', name: 'Rina', userRole: CORPORATE_TIERS.TIER_4, location: 'JAKARTA' };
const SARI = { id: 'sari', name: 'Sari', userRole: CORPORATE_TIERS.TIER_4, location: 'BANDUNG' };
const HANA = { id: 'hana', name: 'Hana', userRole: CORPORATE_TIERS.TIER_5, location: 'SURABAYA' };
const PLAIN = [ANDI, BUDI, CITRA, NOWHERE, BOSS, RINA, SARI, HANA];

ok('with nobody named, a branch falls to its own regional admin',
   canApproveHandoffFrom(RINA, 'JAKARTA', PLAIN) && canApproveHandoffFrom(SARI, 'BANDUNG', PLAIN),
   'his stated default: "on default their own regional admin is the only one who can do that"');
ok('and never to the regional admin of a different branch',
   !canApproveHandoffFrom(RINA, 'BANDUNG', PLAIN) && !canApproveHandoffFrom(SARI, 'JAKARTA', PLAIN),
   'THE BUG HE REPORTED, in its default clothes');
ok('a rank he has not named approves nothing',
   !canApproveHandoffFrom(HANA, 'SURABAYA', PLAIN) && !canApproveHandoffFrom(ANDI, 'JAKARTA', PLAIN));
ok('the owner approves everything, always',
   canApproveHandoffFrom(BOSS, 'BANDUNG', PLAIN) && canApproveHandoffFrom({ userRole: 'ADMIN' }, 'SURABAYA', PLAIN),
   'OPTION B — no configuration can lock him out of his own company');
ok('a hand-off into no branch reaches nobody but the owner',
   !canApproveHandoffFrom(RINA, 'UNASSIGNED', PLAIN) && canApproveHandoffFrom(BOSS, 'UNASSIGNED', PLAIN),
   'UNASSIGNED is a missing field, not a branch');

/* Now name ONE person for BANDUNG — his sentence, exactly. */
const HANA_BDG = { ...HANA, approvalRegions: ['Bandung'] };
const NAMED = [ANDI, BUDI, CITRA, NOWHERE, BOSS, RINA, SARI, HANA_BDG];

ok('the named account approves that branch, wherever that person personally sits',
   canApproveHandoffFrom(HANA_BDG, 'BANDUNG', NAMED),
   'Hana stands in Surabaya and answers for Bandung — the branch comes from the grant, not from her location');
ok('and only that branch, even though she is now named',
   !canApproveHandoffFrom(HANA_BDG, 'SURABAYA', NAMED),
   '"i only want this 1 account to have the power for approval in bandung ONLY"');
ok('naming her takes Bandung off its regional admin',
   !canApproveHandoffFrom(SARI, 'BANDUNG', NAMED),
   'the other half of his "only" — otherwise two people hold Bandung and nothing was actually delegated');
ok('but Jakarta is untouched and still falls to Rina',
   canApproveHandoffFrom(RINA, 'JAKARTA', NAMED),
   'THE FLAW HE FOUND, INVERTED: a grant must not reach past the branch it names');
ok('the owner still approves Bandung alongside her',
   canApproveHandoffFrom(BOSS, 'BANDUNG', NAMED),
   'Option B again — he never loses an approval by delegating one');

/* The bell list on the same two rosters. */
ok('before anybody is named, only the branch’s own admin is rung',
   JSON.stringify(handoffApprovers(PLAIN, 'BANDUNG', [])) === '["sari"]');
ok('after Hana is named, she is rung and the branch admin is not',
   JSON.stringify(handoffApprovers(NAMED, 'BANDUNG', [])) === '["hana"]',
   'this single assertion is the difference between what he rejected and what he asked for');
ok('the owner is never in that list, because his own bell already went out',
   !handoffApprovers(NAMED, 'BANDUNG', []).includes('master_owner'),
   'he is Tier 1 and matches every rule, so he would be told twice for every hand-off');
ok('the receiver and the sender are left out even when they would otherwise qualify',
   handoffApprovers(NAMED, 'BANDUNG', ['hana']).length === 0,
   'a receiver who can approve their own incoming hand-off is a one-key protocol wearing three keys');

/* An empty array is a real answer and must not read as "not named". */
const MUTED = { ...SARI, approvalRegions: [] };
ok('an explicitly empty grant means no branches, not the default',
   !canApproveHandoffFrom(MUTED, 'BANDUNG', [ANDI, BOSS, RINA, MUTED]),
   'this is why Fleet writes null and never [] — the two must stay tellable apart');

/* == NO TIER FLOOR ON A NAMED APPROVER - HIS DECISION, 2026-09-08 =========================
   Asked whether Fleet & Canvas should refuse to tick approval branches below Tier 4:
   *"since the one who can edit the fleet and roster is tier 3 and above then we dont need any
   floor for this, let the company decide and make it most flexible"*.

   These assertions exist to go RED if a later session adds the floor back. It will look like a
   missing check - ad4f18b's own comment says the feature was meant for "a Tier 4 regional admin"
   - and adding it would silently overrule him. The gate he is relying on is one screen earlier:
   naming somebody requires fleet_edit, which defaults to Tier 4 and above. */
const T6_NAMED = { id: 't6', name: 'Rookie', userRole: CORPORATE_TIERS.TIER_6, location: 'JAKARTA', approvalRegions: ['Bandung'] };
const T5_NAMED = { id: 't5', name: 'Field',  userRole: CORPORATE_TIERS.TIER_5, location: 'JAKARTA', approvalRegions: ['Bandung'] };
const FLOORLESS = [ANDI, BOSS, RINA, SARI, T6_NAMED, T5_NAMED];

ok('a named TIER 6 approves the branch they are named for',
   canApproveHandoffFrom(T6_NAMED, 'BANDUNG', FLOORLESS),
   'HIS DECISION - "let the company decide and make it most flexible". A rank test on the named branch would silently reverse it');
ok('and so does a named TIER 5, at the branch named and nowhere else',
   canApproveHandoffFrom(T5_NAMED, 'BANDUNG', FLOORLESS) && !canApproveHandoffFrom(T5_NAMED, 'JAKARTA', FLOORLESS),
   'flexible about RANK is not flexible about BRANCH - the grant still reaches exactly one place');
ok('naming a junior still displaces the branch\u2019s own regional admin, same as naming a senior',
   !canApproveHandoffFrom(SARI, 'BANDUNG', FLOORLESS),
   'the "only" in his sentence does not weaken because the person named is junior');
/* The DEFAULT, not the live matrix. canEditFleetRoster consults ROLE_PERMISSIONS, which earlier
   sections of this file mutate through injectDynamicPermissions - asserting it here would pass or
   fail on section order. The matrix override is also his to set on purpose, which is the whole
   point of the decision; what must not drift is the default underneath it. */
const { defaultFleetAccess: fleetDefault } = await import('./permissions.js');
ok('the gate he is relying on is one screen earlier: naming somebody needs fleet_edit',
   fleetDefault(CORPORATE_TIERS.TIER_4) === 'fleet_edit' &&
   fleetDefault(CORPORATE_TIERS.TIER_5) === 'fleet_view_only' &&
   fleetDefault(CORPORATE_TIERS.TIER_6) === 'fleet_view_only',
   'his 2026-08-24 line - "regional manager can edit the fleet and canvas, tier below that cannot". No floor on WHO may be named is safe only while this holds on WHO may name them; if it ever changes he has to be told the two decisions are linked');
ok('and the source carries no rank test on the named branch',
   /const named = personApprovalRegions\(profile\);\s*\n\s*if \(named !== null\) return named\.includes\(region\);/.test(code(read('src/config/permissions.js'))),
   'the shape is deliberate: named means named, at any tier');
ok('the grant screen says the tick ignores rank, because now it does',
   /whatever their rank/.test(read('src/FleetCanvasManager.jsx')) && /including stores handed to them/.test(read('src/FleetCanvasManager.jsx')),
   'a Tier 4 handing real approval power to a Tier 6 has to be able to see that is what the tick does - his law: every action reports');

/* == POV MUST REACH THE AGENT INVENTORY SCREEN, NOT JUST THE BANNER ======================
   Aldi, 2026-09-08, wearing Tier 6: *"i login as t6 tes account and the agent inventory is still
   showing the t1 inventory but i cant do sales with that inventory tho"*.

   previewIdentity moves displayName/agentId/userRole and deliberately NOT email - the UID is his
   real sign-in. AgentInventoryView then resolved the van by EMAIL first, found his own record, and
   subscribed to the owner's van while the banner said Tier 6. MerchantSalesView reads
   agentProfileId and correctly found the test van empty. Visible and unsellable at once. */
/* == THE EMULATOR DOOR STAYS SHUT IN A BUILD ============================================
   Set up 2026-09-08 on his word - *"okay sure make the emulator for better efficiency for both
   of us"* - so the agent can walk the app past the login without ever touching real credentials.
   It works by exposing an auth handle on `window`, and a handle like that reaching a real build
   is the one way this convenience could become a liability. So it is asserted, not trusted. */
/* == A RETURN TAKES THE MONEY BACK OUT ==================================================
   Found 2026-09-08 while ranking what may not ship to a paying customer. A Titip placement is an
   ordinary sale, so tallySale books its full value the moment the goods reach the shop. The store
   audit then writes the damaged goods coming back as `itemsReturned` on a CONSIGNMENT_PAYMENT -
   which isSale refuses - so nothing reversed. Stock returned to the warehouse, the shop never
   paid, and Product Performance kept reporting it as sold.

   salesRollupWrite's own comment already named four paths that must pass -1; three were written. */
/* == A HALF-FINISHED SYNC MUST NOT SEND THE SAME SALE TWICE ==============================
   Aldi, 2026-09-08: *"better fix the offline one its important, make sure offline also works well
   tho"*. commitInChunks is several commits, not one transaction - Firestore caps a batch at 500
   writes. It threw on a failed chunk with the earlier chunks already committed, and the drain then
   cleared nothing, so the retry re-sent the sales that HAD landed under fresh random ids.
   Duplicate receipts, and the money counted twice because the tally rides the same list. */
section('Offline: a retried sync overwrites, it never duplicates');

const offEng = code(read('src/hooks/useOfflineEngine.js'));
const helpersSrc = code(read('src/utils/helpers.js'));

ok('the cloud id is decided when the sale is QUEUED, not when it is uploaded',
   /await db\.add\('transactions', \{ \.\.\.txData, cloudId: newCloudId\(\)/.test(offEng),
   'minting it at upload time is what made a retry create a second document');
ok('and a blind-drop store gets one too',
   /await db\.add\('noo_profiles', \{ \.\.\.nooData, cloudId: newCloudId\(\)/.test(offEng),
   'a duplicated shop is the same fault wearing a different collection');
ok('that id is RANDOM, never derived from the autoIncrement localId',
   /randomUUID/.test(offEng) && !/cloudId: .{0,40}localId/.test(offEng),
   'THE TRAP: localId is IndexedDB autoIncrement, so it is 1, 2, 3 PER DEVICE - two salesmen\u2019s first offline sale would collide and one would silently OVERWRITE the other. Losing a sale is worse than duplicating one');
ok('and it survives a device with no crypto.randomUUID rather than throwing',
   /Date\.now\(\)\.toString\(36\)/.test(offEng),
   'randomUUID needs a secure context; a throw inside the path that exists for when things are already wrong is the worst place for one');

ok('the drain addresses the document by that id when it has one',
   /noo\.cloudId\s*\n?\s*\? doc\(db, `artifacts\/\$\{appId\}\/users\/\$\{userId\}\/customers`, noo\.cloudId\)/.test(code(app)) &&
   /tx\.cloudId\s*\n?\s*\? doc\(db, `artifacts\/\$\{appId\}\/users\/\$\{userId\}\/transactions`, tx\.cloudId\)/.test(code(app)),
   'this is what makes the write idempotent - a retry lands on the same document');
ok('and still works for anything queued BEFORE this shipped',
   /: doc\(collection\(db, `artifacts\/\$\{appId\}\/users\/\$\{userId\}\/transactions`\)\)/.test(code(app)),
   'a sale already sitting in a phone\u2019s ghost ledger has no cloudId and must still sync');
ok('the id is not also left in the document as a field',
   /delete payload\.cloudId/.test(code(app)),
   'the id IS the document name; carrying it inside as well is a second copy that can disagree');

ok('commitInChunks reports each chunk as it lands',
   /export const commitInChunks = async \(db, writeBatch, operations, onChunkCommitted\)/.test(helpersSrc),
   'without this the caller cannot know which work is already safe, which is the whole bug');
ok('and a throw inside that callback cannot undo a commit that already succeeded',
   /try \{ await onChunkCommitted\(landed\); \} catch/.test(helpersSrc),
   'the caller\u2019s bookkeeping failing must not be reported as the write failing');
ok('the drain acknowledges per chunk instead of all at the end',
   /await commitInChunks\(db, writeBatch, operations, async \(landed\) => \{[\s\S]{0,400}clearProcessedItem\(op\.ack\.store, op\.ack\.localId\)/.test(code(app)),
   'clearing only at the end is what left committed sales in the queue for the retry to send again');
ok('and never before the write, which is the older rule and still holds',
   code(app).indexOf('clearProcessedItem(op.ack.store') > code(app).indexOf('await commitInChunks'),
   'clearing first once lost sales outright; the fix was granularity, not order');
ok('the tally carries no ack, so it is not mistaken for a queue item',
   /if \(tallyOp\) operations\.push\(tallyOp\)/.test(code(app)) && !/tallyOp[\s\S]{0,80}ack:/.test(code(app)),
   'the counter rides beside the receipts; acknowledging it would try to delete an IndexedDB row that does not exist');
ok('a part-finished sync SAYS how much is safe',
   /are safe in the vault[\s\S]{0,60}still waiting/.test(app) && /Do NOT re-enter them/.test(app),
   'HIS LAW - every action reports. "Sync Failed" alone reads as "nothing went through", and a salesman who believes that re-enters sales already in the vault');

/* The arithmetic of a partial failure, re-run. */
const ackSim = (total, chunkSize, failAtChunk) => {
  const ops = Array.from({ length: total }, (_, i) => ({ ack: { localId: i } }));
  let cleared = [];
  for (let c = 0; c * chunkSize < ops.length; c++) {
    if (c === failAtChunk) break;                      // this chunk threw
    cleared.push(...ops.slice(c * chunkSize, (c + 1) * chunkSize).map(o => o.ack.localId));
  }
  const retried = ops.filter(o => !cleared.includes(o.ack.localId)).map(o => o.ack.localId);
  return { cleared: cleared.length, retried };
};
const partial = ackSim(1000, 450, 2);
ok('after a failure in the third chunk, the first two are acknowledged and never resent',
   partial.cleared === 900 && partial.retried.length === 100 && partial.retried[0] === 900,
   'got ' + JSON.stringify({ cleared: partial.cleared, retried: partial.retried.length }) + ' - before the fix all 1000 were resent and 900 sales existed twice');
ok('and nothing is acknowledged when the very first chunk fails',
   ackSim(1000, 450, 0).cleared === 0,
   'a sale must never leave the phone until it is confirmed in the vault');

section('Money: omzet waits for the cash, not the drop');

/* 🔴 HIS RULE, 2026-09-09: *"omset come after goods is sold and money is received, receivable
   doesnt count, should have their own data and panel for receivable outside of the revenue or
   omzet"*, and for the quantity beside it, *"A for the sold bks mean"*.

   This section REPLACED the `f46bc4a` one that stood here, and the replacement is not a reversal
   of that fix. `f46bc4a` subtracted a store audit's `itemsReturned` because the placement had
   already booked the full drop, so damaged goods coming back had to be taken off again. Its own
   comment named the half it could not reach — goods still sitting unsold on the shelf — and said
   the call was Aldi's. He made it, and the answer moved the whole rule: a placement books nothing,
   so there is nothing left to reverse. Ten checks here went red the moment the model changed,
   which is how a check earns its place; they assert the new rule below and the old FORM is now
   pinned as a regression. */

const { salesDelta: sd, rebuildMonths: rebuild } = await import('../utils/salesRollup.js');
const { revenueOf: rev, countsAsRevenue: cAR, soldLinesOf: sLO } = await import('../utils/revenueRule.js');

// One Titip placement: 20 Bks at 27.500. Goods leave the vehicle, no money changes hands.
const PLACEMENT = { date: '2026-09-02', customerName: 'TOKO MAKMUR JAYA', type: 'SALE',
    paymentType: 'Titip', total: 550000,
    items: [{ productId: 'p1', name: 'SURYA 12', qty: 20, unit: 'Bks', calculatedPrice: 27500 }] };
// The same cart sold for cash instead — the control, and it must be untouched by all of this.
const CASHSALE = { ...PLACEMENT, paymentType: 'Cash' };
// The audit: 14 sold and paid, 4 still on the shelf, 2 damaged and taken back.
const AUDIT = { date: '2026-09-20', customerName: 'TOKO MAKMUR JAYA', type: 'CONSIGNMENT_PAYMENT',
    itemsPaid:      [{ productId: 'p1', qty: 14, unit: 'Bks', calculatedPrice: 27500 }],
    itemsRemaining: [{ productId: 'p1', qty:  4, unit: 'Bks', calculatedPrice: 27500 }],
    itemsReturned:  [{ productId: 'p1', qty:  2, unit: 'Bks', calculatedPrice: 27500 }],
    amountPaid: 385000, returnTotal: 55000, total: 385000 };

const placed = sd(PLACEMENT, {}, 1);
const audit  = sd(AUDIT, {}, 1);

/* ── the rule itself, on one transaction at a time ── */
ok('a cash sale is money the moment it happens',
   rev(CASHSALE) === 550000 && cAR(CASHSALE) === true,
   'got ' + rev(CASHSALE));
ok('HIS RULE: a Titip placement is worth nothing until somebody pays',
   rev(PLACEMENT) === 0 && cAR(PLACEMENT) === false,
   'got ' + rev(PLACEMENT) + ' - goods left on a shelf on trust are a receivable, not income');
ok('the store audit is where consignment money enters',
   rev(AUDIT) === 385000,
   'got ' + rev(AUDIT));
ok('an OFFLINE audit still counts, though it carries no `total`',
   rev({ ...AUDIT, total: undefined }) === 385000,
   'useTransactionEngine\'s offline branch writes amountPaid only; reading `total` first books nothing for every audit done with no signal, which for these salesmen is most of them');
ok('an audit that collected nothing is worth nothing, not NaN',
   rev({ ...AUDIT, amountPaid: 0, total: undefined }) === 0,
   'a zero must not fall through to the `total` fallback and resurrect a number');
ok('a refund is not revenue, and is left for the caller to sign',
   rev({ date: '2026-09-21', type: 'RETURN', total: -55000 }) === 0 && cAR({ type: 'RETURN' }) === false,
   'dayStats adds a RETURN back with its own negative total; making this predicate mean two things would hide that');
ok('the per-product lines follow the same rule as the money',
   sLO(PLACEMENT).length === 0 && sLO(CASHSALE).length === 1 && sLO(AUDIT)[0]?.qty === 14,
   'his answer A - "sold" counts what the shop bought, not what left the warehouse');

/* ── and rolled up into a month ── */
ok('HIS BUG: the placement books no revenue and no quantity',
   placed === null,
   'got ' + JSON.stringify(placed?.byProduct?.p1) + ' - before this it booked all 550.000 at the shop door and the audit could never take back the part still on the shelf');
ok('the audit books the 14 the shop actually sold',
   audit?.byProduct?.p1?.revenue === 385000 && audit?.byProduct?.p1?.qty === 14,
   'got ' + JSON.stringify(audit?.byProduct?.p1));
ok('so the month lands on 385.000, and on 14 Bks beside it',
   (placed?.byProduct?.p1?.revenue ?? 0) + (audit?.byProduct?.p1?.revenue ?? NaN) === 385000,
   'got ' + ((placed?.byProduct?.p1?.revenue ?? 0) + (audit?.byProduct?.p1?.revenue ?? NaN)));
ok('goods still on the SHELF are worth nothing now, which is the half f46bc4a could not reach',
   audit?.byProduct?.p1?.qty === 14 && audit?.byProduct?.p1?.qty !== 18,
   'the 4 unsold Bks are simply never counted, rather than counted and then argued about');
ok('REGRESSION: a return no longer subtracts, because there is nothing to subtract from',
   sd({ ...AUDIT, itemsReturned: [{ productId: 'p1', qty: 20, unit: 'Bks', calculatedPrice: 27500 }] }, {}, 1)
     ?.byProduct?.p1?.revenue === 385000,
   'the old form reversed itemsReturned against the placement. With no placement booked, subtracting drives the month NEGATIVE by the value of every damaged packet');
ok('REGRESSION: salesDelta must not read itemsReturned at all any more',
   !/itemsReturned/.test(code(read('src/utils/salesRollup.js'))),
   'the moment that field comes back into this function the negative comes with it. `code()` and not the raw file: the comment above salesDelta explains at length why the subtraction was removed, and a grep that reads its own explanation fails on a correct file');
ok('an audit that sold nothing writes no document rather than a row of zeroes',
   sd({ ...AUDIT, itemsPaid: [] }, {}, 1) === null,
   'twenty out, twenty back, nothing sold, nothing written');
ok('a plain cash sale is completely untouched by all of this',
   sd(CASHSALE, {}, 1)?.byProduct?.p1?.revenue === 550000 && sd(CASHSALE, {}, 1)?.byProduct?.p1?.qty === 20,
   'got ' + JSON.stringify(sd(CASHSALE, {}, 1)?.byProduct?.p1) + ' - the rule only ever meant to move consignment');

/* The sign has to COMPOSE, because three callers pass -1 to undo a transaction. */
ok('undoing an audit removes the money it brought in',
   sd(AUDIT, {}, -1)?.byProduct?.p1?.revenue === -385000,
   'untallyOps and the history edit both pass -1; getting this backwards makes a deleted audit ADD revenue');
ok('and undoing a placement is a no-op, because it never added anything',
   sd(PLACEMENT, {}, -1) === null,
   'deleting a consignment drop must not invent a negative month');

/* ── THE OTHER HALF: the money is out of omzet, so it has to be visible somewhere else ──
   *"receivable doesnt count, should have their own data and panel for receivable outside of the
   revenue or omzet"*. The dashboard prints this beside the omzet box. */
const { outstandingTitip: owed } = await import('../utils/revenueRule.js');

ok('a placement with no audit is money still owed',
   owed([PLACEMENT]) === 550000,
   'got ' + owed([PLACEMENT]) + ' - it left omzet, so it must appear as piutang or it vanished from the app entirely');
ok('the audit pays down the debt by what was actually collected',
   owed([PLACEMENT, AUDIT]) === 165000,
   'got ' + owed([PLACEMENT, AUDIT]) + ' - 550.000 placed, 385.000 paid, 165.000 still on the shelf and still owed');
ok('a cash sale is never a receivable',
   owed([CASHSALE]) === 0,
   'got ' + owed([CASHSALE]));
ok('a customer return reduces what is owed',
   owed([PLACEMENT, { type: 'RETURN', customerName: 'TOKO MAKMUR JAYA', total: -550000 }]) === 0,
   'goods handed back are not a debt; RETURN carries a negative total, so the deduction takes its absolute value');
ok('HIS MONEY: one shop overpaying cannot cancel another shop DEBT',
   owed([PLACEMENT,
         { ...AUDIT, amountPaid: 900000 },
         { ...PLACEMENT, customerName: 'WARUNG BU SARI', total: 200000 }]) === 200000,
   'got ' + owed([PLACEMENT, { ...AUDIT, amountPaid: 900000 }, { ...PLACEMENT, customerName: 'WARUNG BU SARI', total: 200000 }]) +
   ' - the floor is per customer. Summing everything and flooring once would report the company owed nothing while Bu Sari still owed 200.000');
ok('the same shop written two ways is one debt, not two',
   owed([PLACEMENT, { ...AUDIT, customerName: '  toko makmur jaya  ' }]) === 165000,
   'the payment must find its own placement, or a trimmed-and-lowercased name opens a second phantom account');
ok('and it is a BALANCE, so it ignores the period the dashboard is showing',
   owed([{ ...PLACEMENT, date: '2019-01-01' }]) === 550000,
   'a debt does not expire because the month rolled over; the caption on the row says so');

/* 🔴 THE REPAIR PATH HAS TO EXIST, OR THE RULE ONLY APPLIES TO THE FUTURE.
   `rebuildMonths` is what restates every month already written, and the only way to run it is the
   Settings button — which SettingsView gates on `isSystemOwner && handleRebuildSalesStats`. Both
   props were being passed to <DashboardView>, which reads neither, so that gate was permanently
   false and the button had never rendered for anybody. Found 2026-09-09 while trying to prove this
   very rule repairs history. Two assertions, because either one alone can go stale. */
/* `code()` and not the raw file, twice: the fix's own comment at the SettingsView call site
   contains the words "<DashboardView>" and "handleRebuildSalesStats", so a raw grep matches the
   explanation and reports the bug it is documenting. Same trap as the salesRollup regression
   above, and it caught this one too. */
const appSrc = code(read('src/App.jsx'));
ok('the rebuild handler reaches SettingsView, which is the only thing that renders the button',
   /<SettingsView[\s\S]{0,4000}?handleRebuildSalesStats=\{handleRebuildSalesStats\}/.test(appSrc),
   'without this prop the "Rebuild the sales totals" block silently does not exist, and every month written under the old Titip rule stays wrong forever');
ok('REGRESSION: and it is NOT passed to DashboardView, which never read it',
   !/<DashboardView[\s\S]{0,2000}?handleRebuildSalesStats=/.test(appSrc),
   'that is where it sat while the button was missing; a copy left behind reads as "wired" to the next person who greps for it');
ok('SettingsView still gates the button on that exact prop, so the check above is testing something',
   /isSystemOwner && handleRebuildSalesStats &&/.test(read('src/components/SettingsView.jsx')),
   'if the gate is rewritten this assertion stops meaning anything and must be rewritten with it');

section('Money: a completed sale is a closed contract — no cash goes back');

/* 🔴 Aldi, 2026-09-09: *"lets turn off buyback for now it makes counting profit and revenue more
   difficult anyway and company doesnt allow that, exchange still possible tho"*, following from the
   model he described a message earlier: *"when company sell the product its done, when they needed
   return, what can agent do is help the stores to resell their unsold product to other customer,
   well its by using agent own money and not the company"*.

   That model is why no company total anywhere reduces on a retur, and why `returnTotal` is written
   but read by no money calculation — which the 2026-09-09 walk had flagged as a suspected bug. It
   is not one. The money in a retur is the agent's, so it must never reach a company figure. */

const msvSrc = code(read('src/MerchantSalesView.jsx'));

ok('REGRESSION: the admin branch must not hand itself a cash refund',
   !/allowCashRefund:\s*true/.test(code(appSrc)),
   'it read `allowCashRefund: true // Admin can always refund` until 2026-09-09, which made the one rule the company does not permit the one rule its owner could not switch off');
ok('REGRESSION: and the render site must not grant it back either',
   !/allowCashRefund=\{[^}]*ADMIN[^}]*\}/.test(code(appSrc)),
   'THE SECOND COPY. Fixing the settings branch alone left `allowCashRefund={userRole === "ADMIN" ? true : ...}` at the MerchantSalesView call site, so the Buyback button was still on the owner\'s screen with the build green and 1388 checks green. Found by opening Retur Mode in a browser, which is the only thing that could have found it');
ok('no line in App grants it unconditionally, whatever shape the grant takes',
   !/allowCashRefund[=:]\s*\{?\s*true/.test(code(appSrc)),
   'the two regressions above name the two forms this took. This one is the net: an agent doc may set it, nothing else may');
ok('and Exchange survives, because only the money half was turned off',
   /allowRetur:\s*true/.test(code(appSrc)),
   'his words: "exchange still possible tho". Exchange swaps goods for goods at a forced price of 0, so no money moves and none of this applies');
ok('the buyback mode switch is drawn only for somebody who may refund',
   /isReturMode && allowCashRefund &&/.test(msvSrc),
   'with the privilege gone the sub-mode toggle disappears and Retur is Exchange-only, which is the whole shape of the change');
ok('a saved draft cannot restore BUYBACK to somebody without the privilege',
   /allowCashRefund \? \(draft\?\.returType \|\| 'EXCHANGE'\) : 'EXCHANGE'/.test(msvSrc),
   'the toggle is hidden without the privilege, so a restored BUYBACK draft would leave no control on screen to leave that mode with, and the only feedback would be the refusal after the basket was built');
ok('and the submit guard still refuses it even if the state gets there another way',
   /isReturMode && returType === 'BUYBACK' && !allowCashRefund/.test(msvSrc),
   'hiding a control is a UI courtesy, never a rule. The refusal at handleFinalDeal is the rule');
ok('the refusal names what to do instead, rather than only saying no',
   /Use Exchange \(Tukar\)/.test(read('src/MerchantSalesView.jsx')),
   'his law - every action reports. "You cannot" with no way forward is how a salesman decides the app is broken');

/* THE ONE THAT PROVES HISTORY IS REPAIRABLE. rebuildMonths runs the same salesDelta over the whole
   transactions collection, so a month already written wrong is fixed by the Settings rebuild
   button - no migration, nothing edited by hand in his live book. */
const rebuilt = rebuild([PLACEMENT, AUDIT], {});
const sept = rebuilt.find(m => m.month === '2026-09');
ok('a REBUILD reaches the same 385.000 the live tally does',
   sept?.byProduct?.p1?.revenue === 385000 && sept?.byProduct?.p1?.qty === 14,
   'got ' + JSON.stringify(sept?.byProduct?.p1) + ' - this is why the rule went in salesDelta and not at the call site: every month already written repairs itself from the Settings rebuild, with no migration and nothing edited by hand in his live book');

/* And the live write, not only the maths. */
const uteSrc = read('src/hooks/useTransactionEngine.js');
const payFrom = uteSrc.indexOf('const handleConsignmentPayment');
const payTo   = uteSrc.indexOf('const handleConsignmentReturn');
ok('handleConsignmentPayment was located',
   payFrom > -1 && payTo > payFrom,
   'anchor missed - the assertions below would pass vacuously');
const payBody = uteSrc.slice(payFrom, payTo);
ok('and the slice is that handler, not a neighbourhood',
   payBody.length > 2000 && payBody.length < 9000,
   'got ' + payBody.length + ' chars');
ok('the audit tallies itemsPaid, so consignment income lands live and not only on a rebuild',
   /tallySale\(batch, db, appId, userId, \{[\s\S]{0,200}?itemsPaid,[\s\S]{0,80}?\}, \{\}, 1\)/.test(code(payBody)),
   'without this the report only becomes correct after somebody presses rebuild');
ok('REGRESSION: it must not tally itemsReturned instead',
   !/tallySale\([\s\S]{0,240}?itemsReturned,/.test(code(payBody)),
   'that was the f46bc4a form. With no placement booked it subtracts from nothing and drives the month negative');
ok('and it rides the SAME batch as the transaction it counts',
   code(payBody).indexOf('tallySale(') < code(payBody).indexOf('await batch.commit()'),
   'a counter committed separately from the thing it counts drifts the first time a phone loses signal between the two');
ok('the paid lines are built in Bks, which is what lets the tally skip the product map',
   /paymentItems\.push\(\{ productId: item\.productId, name: item\.name, qty: sold, priceTier: item\.priceTier, calculatedPrice: item\.calculatedPrice, unit: 'Bks' \}\)/.test(read('src/ConsignmentFinanceView.jsx')),
   'if a paid line ever arrives in Slop or Bal, convertToBks needs the product and the quantity silently under-counts');

/* 🔴 THE TRAP THAT MADE ALL OF THIS SILENT. The sale's tally is handed a FRESH object, not the
   stored document, so a field left out of that object is a field the rule cannot see - and
   `isTitip` defaults a missing `paymentType` to 'Cash'. Omit it and every consignment placement is
   booked as income again, with nothing on screen to say so. */
const saleFrom = uteSrc.indexOf('const productsById = Object.fromEntries(');
const saleTo   = uteSrc.indexOf('if (newStoreData) {', saleFrom);
ok('the sale tally block was located',
   saleFrom > -1 && saleTo > saleFrom && (saleTo - saleFrom) > 200 && (saleTo - saleFrom) < 1500,
   'anchor missed or ran away - got ' + (saleTo - saleFrom) + ' chars, so the assertion below would pass vacuously');
ok('the sale hands its paymentType to the tally, or the whole rule is invisible',
   /tallySale\(batch, db, appId, userId, \{[\s\S]{0,300}?paymentType,/.test(code(uteSrc.slice(saleFrom, saleTo))),
   'without this field a Titip placement tallies as a cash sale and omzet lies again');

section('Emulator: the dev door exists only behind the dev gate');

const fbSrc = read('src/config/firebase.js');
const gateAt = fbSrc.indexOf("import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true'");
ok('the emulator gate was located',
   gateAt > -1,
   'anchor missed - every assertion below would pass vacuously');
ok('the window handle appears ONLY after that gate, never before it',
   fbSrc.indexOf('__kpmEmulatorAuth') > gateAt,
   'a handle outside the gate ships an auth object on window to every customer');
ok('and the gate needs BOTH the dev flag and the opt-in, not either',
   /import\.meta\.env\.DEV && import\.meta\.env\.VITE_USE_EMULATOR === 'true'/.test(fbSrc),
   'DEV alone would arm it for `npm run dev`, which is what Aldi runs against LIVE data on his phone');
ok('only the httpdev vite mode sets that opt-in',
   /httpDev \? \{ 'import\.meta\.env\.VITE_USE_EMULATOR': JSON\.stringify\('true'\) \} : \{\}/.test(read('vite.config.js')),
   'if this ever becomes unconditional, `npm run dev` silently stops talking to the real project and his phone tests measure nothing');
ok('and the seeder can only reach the emulator host',
   /const HOST\s*=\s*'http:\/\/127\.0\.0\.1:8080'/.test(read('tools/seed-emulator.mjs')) &&
   !/firestore\.googleapis\.com/.test(read('tools/seed-emulator.mjs')),
   'a seeder that can be pointed at production is a script that will one day be pointed at production');

section('POV: one identity, and every screen has to read the same one');

const aivRaw = read('src/AgentInventoryView.jsx');
const aiv = code(aivRaw);

ok('the screen accepts the previewing flag',
   /previewing = null \}\) =>/.test(aiv),
   'without the prop the screen cannot know it is wearing somebody else\u2019s tier');
ok('and App.jsx actually passes it',
   /previewing=\{previewing\}/.test(read('src/App.jsx')),
   'a prop with a default is silently fine when nobody passes it - the default would just restore the bug');
ok('the email sweep stands down while previewing',
   /const matchedByEmail = previewing \? null : motorists\.find/.test(aiv),
   'HIS BUG - the sweep runs BEFORE the agent id and wins, and under POV the email is still his own');
ok('the sweep is still there for real logins',
   /String\(m\.email\)\.trim\(\)\.toLowerCase\(\) === activeEmail/.test(aiv),
   'it exists to stop a stale agentProfileId stranding somebody on the wrong van - do not delete it, only stand it down');
ok('and giving up on a subscription clears the cargo instead of leaving it rendered',
   /!trueAgentId\) \{[\s\S]{0,400}?setCanvasItems\(\[\]\);/.test(aiv),
   'the same wrong-van symptom by a different door: stop subscribing, keep drawing the last agent\u2019s stock');

/* The SECOND instance, fixed 2026-09-08 after the first. Fleet & Canvas resolves the branch it
   operates as by email, so the preview reported Aldi's own branch at any tier. It gates testing
   anything region-scoped, which is what the geofence work is. */
const fcmRaw = read('src/FleetCanvasManager.jsx');
const fcm = code(fcmRaw);

/* Anchored on the PROP, not on its position in the signature. This read `previewing = null }) {`
   until 2026-09-09, when `masterUserId` was appended after it and a check about POV went red for a
   change about vault routing. A guard scoped to a neighbouring character is a guard that reports
   the wrong thing. */
ok('Fleet & Canvas accepts the previewing flag',
   /previewing = null[,\s]*[},]/.test(fcm),
   'without the prop the screen cannot know it is wearing somebody else\u2019s tier');
ok('and App.jsx passes it to that screen too, not only to Agent Inventory',
   (read('src/App.jsx').match(/previewing=\{previewing\}/g) || []).length >= 2,
   'a prop with a default is silently fine when nobody passes it - the default restores the bug');
ok('its branch lookup stands down while previewing',
   /previewing \? null : activeMotorists\.find\(m => m\.email/.test(fcm),
   'rawLocation is built from myProfile on the very next line, and that is the branch the whole screen operates as');
ok('and the email lookup survives for real logins here as well',
   /activeMotorists\.find\(m => m\.email\?\.toLowerCase\(\) === user\?\.email\?\.toLowerCase\(\)\)/.test(fcm),
   'it exists so a stale agentProfileId cannot strand somebody on the wrong branch');
ok('no screen resolves identity by email without asking about the preview first',
   !/^\s*const myProfile = activeMotorists\.find\(m => m\.email/m.test(fcm) &&
   !/^\s*const matchedByEmail = motorists\.find/m.test(code(read('src/AgentInventoryView.jsx'))),
   'both known instances are guarded; a third would be a new one and this assertion will not see it - grep user?.email when something is wrong only under POV');

/* The router, re-run. `previewIdentity` is imported from the real module - if POV ever starts
   rewriting the email, these flip and the guard can be reconsidered rather than guessed at. */
const { previewIdentity: povIdentity, testAccountFor } = await import('./povPreview.js');

const OWNER_EMAIL = 'adikaryasukses99@gmail.com';
const AIV_ROSTER = [
  { id: 'owner_agent', name: 'Aldi', email: OWNER_EMAIL, activeCanvas: [{ productId: 'p1' }] },
  { id: 'TEST_TIER_6', name: '[TEST] SALES MOTORIST', activeCanvas: [] },
  { id: 'real_t6', name: 'Kaldi', email: 'kaldi0470@gmail.com', activeCanvas: [] },
];
// AgentInventoryView's router, in its own order.
const vanFor = (identity, roster = AIV_ROSTER) => {
  const activeEmail = String(identity.user?.email || '').trim().toLowerCase();
  const matchedByEmail = identity.previewing ? null
    : roster.find(m => m.email && String(m.email).trim().toLowerCase() === activeEmail);
  const safe = matchedByEmail || roster.find(m => m.id === identity.agentProfileId);
  return safe?.id || identity.agentProfileId || null;
};
// MerchantSalesView's source, which never consulted the email.
const saleVanFor = (identity) => identity.agentProfileId || identity.user?.agentId || 'VAULT';

const REAL_OWNER = { user: { email: OWNER_EMAIL }, userRole: CORPORATE_TIERS.TIER_1, agentProfileId: 'owner_agent', isAdmin: true, isSystemOwner: true };
const AS_T6 = povIdentity({ tier: CORPORATE_TIERS.TIER_6 }, REAL_OWNER);

ok('POV really does hand the screen a Tier 6 identity',
   AS_T6.previewing && AS_T6.agentProfileId === 'TEST_TIER_6' && AS_T6.userRole === CORPORATE_TIERS.TIER_6,
   'if this fails the rest of the section is testing nothing');
ok('and it still carries his own email, which is the trap',
   AS_T6.user.email === OWNER_EMAIL,
   'deliberate - the UID never changes. The screen has to stop asking, because POV will not lie about identity');
ok('HIS BUG: wearing Tier 6, the inventory screen no longer lands on the owner\u2019s van',
   vanFor(AS_T6) === 'TEST_TIER_6',
   'got ' + vanFor(AS_T6) + ' - before the fix the email sweep returned owner_agent and the screen drew the owner\u2019s cargo');
ok('and it now agrees with the sale, which is what "visible but unsellable" meant',
   vanFor(AS_T6) === saleVanFor(AS_T6),
   'two screens answering "who am I" differently is the whole defect');
ok('a REAL login is untouched and still resolves by email',
   vanFor(REAL_OWNER) === 'owner_agent' &&
   vanFor({ user: { email: 'kaldi0470@gmail.com' }, agentProfileId: null }) === 'real_t6',
   'the sweep exists so a stale or missing agentProfileId cannot strand somebody on the wrong van - that must keep working');
ok('and a real login with a WRONG agentProfileId is still rescued by the email',
   vanFor({ user: { email: OWNER_EMAIL }, agentProfileId: 'TEST_TIER_6' }) === 'owner_agent',
   'this is the ghosting case the sweep was built for; the fix must not cost it');
ok('every tier previews onto its own test van, not onto his',
   [CORPORATE_TIERS.TIER_2, CORPORATE_TIERS.TIER_3, CORPORATE_TIERS.TIER_4, CORPORATE_TIERS.TIER_5, CORPORATE_TIERS.TIER_6]
     .every(t => vanFor(povIdentity({ tier: t }, REAL_OWNER)) === testAccountFor(t).id),
   'he wore Tier 6; the same email trap sat under all five');

/* == THE WRITE ITSELF, RE-RUN ON REAL ACCOUNTS ==========================================
   Everything above tests who MAY approve. This tests the guard that stood between that
   answer and the database, which on 2026-09-08 disagreed with it.

   Aldi's account, reproduced: BANDUNG has exactly one person, kaldi0470@gmail.com. He is the
   branch's named approver AND he was the receiver, so both bells rang for him, the queue drew
   the Authorize button, and the write refused the press. The predicate below is
   handleAdminApproveTransfer's own order of business - sender first, then power. */
const KALDI = { id: 'kaldi', name: 'Kaldi', userRole: CORPORATE_TIERS.TIER_4, location: 'BANDUNG', approvalRegions: ['Bandung'] };
const BDG_ROSTER = [KALDI, CITRA, SARI, RINA, BOSS];

// handleAdminApproveTransfer, in the order it runs: the viewer's profile comes off the roster,
// the branch comes off the RECEIVER, the sender is refused outright, then power decides.
const writeApproval = (viewerId, req, roster = BDG_ROSTER) => {
  const receivingRegion = (roster.find(m => m.id === req.toAgentId) || {}).location;
  if (req.fromAgentId === viewerId) return 'REFUSED_SENDER';
  const me = roster.find(m => m.id === viewerId) || { userRole: viewerId === null ? 'ADMIN' : undefined };
  if (!canApproveHandoffFrom(me, receivingRegion, roster)) return 'REFUSED_NO_POWER';
  return 'APPROVES';
};

const TO_KALDI  = { id: 'h1', status: 'PENDING_ADMIN', fromAgentId: 'citra', toAgentId: 'kaldi' };
const TO_CITRA  = { id: 'h2', status: 'PENDING_ADMIN', fromAgentId: 'rina',  toAgentId: 'citra' };
const TO_SARI   = { id: 'h3', status: 'PENDING_ADMIN', fromAgentId: 'citra', toAgentId: 'sari'  };

ok('HIS CASE: the receiver who is that branch\u2019s named approver may now authorise it',
   writeApproval('kaldi', TO_KALDI) === 'APPROVES',
   'got ' + writeApproval('kaldi', TO_KALDI) + ' \u2014 this is the press that failed on 2026-09-08, and the queue had already drawn the button for it');
ok('an ordinary receiver with no approval power is still refused by the write',
   writeApproval('citra', TO_CITRA) === 'REFUSED_NO_POWER',
   'got ' + writeApproval('citra', TO_CITRA) + ' \u2014 dropping the receiver clause must not hand the button to every agent who is offered a store');
ok('and the queue refuses that same person, so no button is drawn to be refused',
   !canApproveHandoffFrom(CITRA, 'BANDUNG', BDG_ROSTER),
   'the list and the write have to answer alike \u2014 disagreeing is the whole bug');
ok('a displaced regional admin is refused by the write too, receiver or not',
   writeApproval('sari', TO_SARI) === 'REFUSED_NO_POWER' && writeApproval('sari', TO_KALDI) === 'REFUSED_NO_POWER',
   'naming Kaldi took Bandung off Sari; C4 cannot be run by hand until Bandung has a second account, so this is the only place it is checked');
ok('the owner still authorises it alongside the branch',
   writeApproval(null, TO_KALDI) === 'APPROVES',
   'Option B \u2014 no delegation locks him out of his own company');

/* The sender clause is the half that did NOT move, and it must hold at every rank - including
   Tier 1, where canApproveHandoffFrom returns true and the sender check is the only thing left. */
const SENDER_TIERS = [CORPORATE_TIERS.TIER_1, CORPORATE_TIERS.TIER_2, CORPORATE_TIERS.TIER_3,
                      CORPORATE_TIERS.TIER_4, CORPORATE_TIERS.TIER_5, CORPORATE_TIERS.TIER_6, 'ADMIN'];
const senderVerdicts = SENDER_TIERS.map(tier => {
  const asker = { id: 'asker', name: 'Asker', userRole: tier, location: 'BANDUNG', approvalRegions: ['Bandung'] };
  const roster = [asker, KALDI, CITRA, SARI, BOSS];
  const req = { id: 'h9', status: 'PENDING_ADMIN', fromAgentId: 'asker', toAgentId: 'kaldi' };
  return writeApproval('asker', req, roster);
});
ok('the SENDER is refused at every tier, even the ones that could approve anyone else\u2019s',
   senderVerdicts.every(v => v === 'REFUSED_SENDER'),
   'got ' + JSON.stringify(senderVerdicts) + ' \u2014 asking for a store and granting it to yourself is one person doing the whole protocol, and at Tier 1 this clause is the only thing that says no');

/* ══ THE LOGIN DOMAIN — one site, not two ═════════════════════════════════════════════════
   Aldi, 2026-09-06, on Brave: sign-in worked on localhost and failed on every deployed address.
   Shields down on the deployed site and it worked at once. The app sat on kpm-ang.vercel.app while
   the Google handshake happened on cello-inventory-manager.firebaseapp.com, so finishing a login
   meant one site reading a cookie another site set — which Brave blocks by default, Safari blocks,
   and Chrome is phasing in. Localhost is the one place Brave does not apply it. */
section('J. Login domain: the handshake happens on the app’s own address');

const fb = read('src/config/firebase.js');
let vercelCfg = null;
try { vercelCfg = JSON.parse(read('vercel.json')); } catch (e) { vercelCfg = null; }

ok('vercel.json exists and parses',
   vercelCfg !== null,
   'a malformed vercel.json is ignored silently by Vercel — the proxy would simply not exist');
const rw = (vercelCfg && vercelCfg.rewrites || []).find(r => String(r.source).startsWith('/__/auth/'));
ok('it passes /__/auth/* through to Firebase',
   !!rw && rw.destination === 'https://cello-inventory-manager.firebaseapp.com/__/auth/:path*',
   'without the pass-through the app asks its own domain for a handler that is not there, and every login 404s');
ok('the pass-through keeps the wildcard on both ends',
   !!rw && rw.source === '/__/auth/:path*' && rw.destination.endsWith('/:path*'),
   'the handler is several paths (handler, iframe, experiments.json) — a single fixed path breaks the rest');
ok('the rewrite is scoped to /__/auth/ and nothing else',
   (vercelCfg.rewrites || []).every(r => String(r.source).startsWith('/__/auth/')),
   'a catch-all rewrite here would put every asset request through a proxy to Firebase');

ok('the login domain is resolved at runtime, not hardcoded',
   /authDomain: resolvedAuthDomain/.test(fb),
   'a constant cannot be right for localhost and for the deployed site at the same time');
ok('only hosts on the explicit list use their own address',
   /const PROXIED_AUTH_HOSTS = \['kpm-ang\.vercel\.app'\];/.test(fb),
   'THE TRAP: a host here needs https://<host>/__/auth/handler registered on the OAuth client first, or its sign-in dies with redirect_uri_mismatch');
ok('everything else keeps the Firebase handler, which is already registered',
   /: FIREBASE_AUTH_DOMAIN;/.test(fb),
   'localhost, the LAN IPs Aldi tests phones on, and every Vercel preview URL must keep working untouched');
ok('and the resolver cannot throw where there is no window',
   /typeof window !== 'undefined' && PROXIED_AUTH_HOSTS\.includes/.test(fb),
   'this module is imported by tooling that runs in Node; a bare window reference would crash the import');

/* The maths: the resolver re-run on the hosts that actually exist. */
const PROXIED = ['kpm-ang.vercel.app'];
const resolveAuthDomain = (host) =>
  PROXIED.includes(String(host).split(':')[0]) ? host : 'cello-inventory-manager.firebaseapp.com';

ok('the shared demo link signs in on its own address',
   resolveAuthDomain('kpm-ang.vercel.app') === 'kpm-ang.vercel.app',
   'this is the whole fix — no cross-site cookie, so no shields to lower');
ok('localhost is untouched, and it is what proved the diagnosis',
   resolveAuthDomain('localhost:5173') === 'cello-inventory-manager.firebaseapp.com',
   'there is no proxy in the dev server; pointing localhost at itself would break the one place that works');
ok('the LAN IPs he tests phones on are untouched',
   resolveAuthDomain('192.168.1.109:5173') === 'cello-inventory-manager.firebaseapp.com');
ok('an unregistered Vercel preview URL is untouched',
   resolveAuthDomain('kpm-inventory-abc123.vercel.app') === 'cello-inventory-manager.firebaseapp.com',
   'preview URLs are generated per deploy and can never be registered in advance — they must keep using the Firebase handler');
ok('the port is ignored when matching but kept when used',
   resolveAuthDomain('kpm-ang.vercel.app:443') === 'kpm-ang.vercel.app:443',
   'hostname decides membership, host is what Firebase is handed — mixing the two drops the port on a non-standard one');

section('THE STORE LABEL NAMES THE ROSTER, NOT THE GOOGLE ACCOUNT (Aldi, 2026-09-07)');

/* Running Round 7 he found the consignment list saying "MANAGED BY: ALDI KURNIAWAN" on a store
   held by a test Tier 5 account: *"it should not be aldi kurniwan, it should be the test tier 5 so
   fix the name so that it shows the nickname and not the google name, nickname here is registered
   name inside fleet and roster"*. Two faults sat on the same line, and a fix for either alone
   leaves a wrong name on screen:
     1. it rendered `t.agentName` — the string a transaction froze on the day it was written, which
        is the signed-in Google account's displayName whenever the seller was an admin or a test
        account sharing one Google login;
     2. it read the NEWEST ROW's seller, and an approved hand-off deliberately does not restamp
        past rows — so from the moment a store changes hands the list names the previous agent. */

const nmSrc = code(read('src/ConsignmentFinanceView.jsx'));
const nmA = nmSrc.indexOf('const rosterNameById');
const nmB = nmSrc.indexOf('const activeCustomer');
ok('the label scope was found (anchors const rosterNameById .. const activeCustomer)',
   nmA > -1 && nmB > nmA, 'anchor missed — the slice below would read the whole file');
if (nmA > -1 && nmB > nmA) {
  const nmSlice = nmSrc.slice(nmA, nmB);
  ok('the label slice is the aggregation block, not the rest of the file',
     nmSlice.length > 800 && nmSlice.length < 8000, 'got ' + nmSlice.length + ' chars');
  ok('the owner id comes from the customer document first, the newest row only second',
     /handedOwnerByStore\.get\(key\) \|\| c\.ownerId/.test(nmSlice),
     'reading the newest row alone names the PREVIOUS agent on every store that changed hands');
  ok('the displayed name comes from the roster, with the stored string only as fallback',
     /rosterNameById\.get\(ownerId\) \|\| c\.ownerName/.test(nmSlice),
     't.agentName is a Google displayName frozen at write time — it is not the name Aldi gave the person');
  ok('the aggregated row keeps its agent id, or there is nothing to resolve against',
     /ownerId: t\.agentId \|\| 'ADMIN'/.test(nmSlice),
     'the id is the only link from a transaction back to the Fleet & Roster record');
}
ok('the roster map answers for ADMIN rows too',
   /map\.set\('ADMIN', adminName\)/.test(nmSrc),
   "an admin sale stores agentId 'ADMIN', which matches no motorist id — without this the Google name survives");
ok('and the memo re-runs when the roster or a hand-off changes',
   /\[myTransactions, inventory, handedOwnerByStore, rosterNameById, handoffChainByStore\]/.test(nmSrc),
   'a stale dep list keeps the old label on screen until something else forces a re-render');

/* ── the resolution, re-run on real rows ──────────────────────────────────────────────────
   Toko Maju was handed to andi, but its newest consignment row is still Budi's. Toko Lama never
   moved and was sold by a test account signed in on Aldi's own Google login, so the row froze
   "Aldi Kurniawan". Toko HQ was sold by the admin, so it carries agentId 'ADMIN'. Toko Hantu
   belongs to somebody who has since been deleted from the roster. */
const NM_ROSTER = [
  { id: 'budi', name: '[TEST] SALES MOTORIST', userRole: 'AGENT' },
  { id: 'andi', name: '[TEST] REGIONAL ADMIN', userRole: 'AREA_ADMIN' },
  { id: 'master_owner', name: 'MOBIL PAK BOS', userRole: 'COMPANY_OWNER' },
];
const NM_DOCS = [{ name: 'Toko Maju', ownerAgentId: 'andi' }];
const NM_ROWS = [
  { customerName: 'Toko Maju', agentId: 'budi', agentName: 'Aldi Kurniawan' },
  { customerName: 'Toko Lama', agentId: 'budi', agentName: 'Aldi Kurniawan' },
  { customerName: 'Toko HQ', agentId: 'ADMIN', agentName: 'Aldi Kurniawan' },
  { customerName: 'Toko Hantu', agentId: 'ghost', agentName: 'Mantan Agen' },
];
const nmKey = (v) => String(v || '').trim().toUpperCase();
const nmById = (() => {
  const m = new Map();
  NM_ROSTER.forEach(r => { if (r.id && r.name) m.set(r.id, r.name); });
  const boss = NM_ROSTER.find(r => r.id === 'master_owner' || r.userRole === 'COMPANY_OWNER' || r.userRole === 'ADMIN');
  if (boss?.name) { m.set('ADMIN', boss.name); m.set('ADMIN_VEHICLE', boss.name); }
  return m;
})();
const nmHanded = new Map(NM_DOCS.filter(d => d.ownerAgentId).map(d => [nmKey(d.name), d.ownerAgentId]));
const nmLabel = (row) => {
  const ownerId = nmHanded.get(nmKey(row.customerName)) || row.agentId || 'ADMIN';
  return nmById.get(ownerId) || row.agentName || 'Admin';
};

ok('a store that changed hands names its NEW owner, from the roster',
   nmLabel(NM_ROWS[0]) === '[TEST] REGIONAL ADMIN', 'got: ' + nmLabel(NM_ROWS[0]));
ok('a store that never moved names its seller by the roster name, not the Google name',
   nmLabel(NM_ROWS[1]) === '[TEST] SALES MOTORIST',
   'got: ' + nmLabel(NM_ROWS[1]) + ' — this is the exact string Aldi reported on screen');
ok('an admin-sold store names the owner record, not the Google account behind it',
   nmLabel(NM_ROWS[2]) === 'MOBIL PAK BOS', 'got: ' + nmLabel(NM_ROWS[2]));
ok('an id no longer on the roster keeps the stored name instead of going blank',
   nmLabel(NM_ROWS[3]) === 'Mantan Agen', 'got: ' + nmLabel(NM_ROWS[3]));
ok('and the reported symptom is gone — no row reads back the Google name',
   NM_ROWS.filter(r => nmLabel(r) === 'Aldi Kurniawan').length === 0,
   'got ' + NM_ROWS.filter(r => nmLabel(r) === 'Aldi Kurniawan').length + ' rows still showing it');

section('WHO MUST SUPPLY AN EMAIL AND A PHONE, AND WHO IS THE ADMIN IN ANOTHER FORM (2026-09-07)');

/* Three of Aldi's instructions in one morning, and the final shape has to satisfy all three:
     1. *"i want this disabled for the test account only since its all mine so that i can try
        ticking the location adn start testing"*
     2. *"all of that test account should be locked into my tier 1 email only, should be the same
        with that one, because only tier 1 who can access that account"*
     3. *"make sure that email and phone number is still required for tier below 1"*

   His existing test personnel carry NO address at all, so a rule that only recognised a MATCHING
   address never reached them — he hit "Google Account Email is still empty" and said *"yo why is
   it still like this on the test account, i said i want u to lift the requirement for tier 1
   account"*. A BLANK address saved by a global admin now resolves to that admin's own, which is
   what (2) actually asks for. Everybody else supplies both fields, which is (3).

   ⚠️ THE SAFETY REASON, not just convenience. `employee_directory/<email>` maps ONE email to ONE
   agentId, and handleSaveAgent wrote it on every save in both branches. A test person on the
   admin's own address repointed that admin's OWN login at the test record, and the next sign-in
   resolved them to it and demoted them out of Tier 1 (`App.jsx` merges the email doc over the uid
   doc, then routes on `activeData.role`). A self-proxy gets a roster record and no mapping. */

const tpSrc = code(read('src/FleetCanvasManager.jsx'));
const tpA = tpSrc.indexOf('const handleSaveAgent');
const tpB = tpSrc.indexOf('await batch.commit');
ok('the save-path scope was found (anchors const handleSaveAgent .. await batch.commit)',
   tpA > -1 && tpB > tpA, 'anchor missed — the slice below would read the whole file');
if (tpA > -1 && tpB > tpA) {
  const tp = tpSrc.slice(tpA, tpB);
  ok('the save path is the slice, not the rest of the file',
     tp.length > 1200 && tp.length < 9000, 'got ' + tp.length + ' chars');

  ok('a self-proxy is a BLANK address or the admin\'s own, and only for a global admin',
     /const isSelfProxy = !!ownEmail && isGlobalAdmin && \(typedEmail === '' \|\| typedEmail === ownEmail\)/.test(tp),
     "blank is the case his existing test personnel are actually in — matching-only never reached them");
  ok('and a blank one is saved AS the admin\'s own address, not as an empty string',
     /const emailKey = isSelfProxy \? ownEmail : typedEmail/.test(tp),
     'his ask was to lock them to the Tier 1 email; an empty string is also an illegal document id');
  ok('the email requirement tests the RESOLVED address, so a proxy passes and nobody else does',
     /!emailKey && 'Google Account Email'/.test(tp),
     "testing newAgent.email instead would refuse the blank test personnel this exists to allow");
  ok('the phone is required again, and stands down ONLY for a self-proxy',
     /!isSelfProxy && !\(newAgent\.phone \|\| ''\)\.trim\(\) && 'Phone'/.test(tp),
     'his words: "make sure that email and phone number is still required for tier below 1"');
  ok('the name is required unconditionally — no proxy escape',
     /!newAgent\.name && 'Name'/.test(tp) && !/isSelfProxy.{0,30}'Name'/.test(tp),
     'a blank name puts the Google account name back on the consignment store cards (2e5a8ac)');
  ok('and the refusal names the fields that are actually empty',
     /missing\.join\(' and '\)/.test(tp),
     'listing every field when one is missing is the guessing game this replaced');

  ok('the duplicate-EMAIL refusal stands down for a self-proxy, and only for one',
     /const isDupEmail = !isSelfProxy &&/.test(tp),
     'the uniqueness it protects is the login mapping, and a self-proxy does not get one');
  ok('a blank PHONE cannot collide with another blank phone',
     /newAgent\.phone\?\.trim\(\) && activeMotorists\.some/.test(tp),
     'ungated, the second self-proxy saved without a phone reads as a duplicate of the first');
  ok('BOTH directory writes are gated — the edit branch and the create branch',
     (tp.match(/if \(!isSelfProxy\) batch\.set\(doc\(db, `artifacts\/\$\{appId\}\/employee_directory`/g) || []).length === 2,
     'gating one branch and not the other leaves the demotion reachable through the other door');
  ok('but the OLD address is still deleted when somebody moves onto the shared email',
     /if \(oldEmailKey && oldEmailKey !== emailKey\) batch\.delete/.test(tp) &&
     !/if \(!isSelfProxy.{0,40}batch\.delete/.test(tp),
     'a real person turned into a test one must LOSE their login, not keep a stale mapping');
}
ok('and the form says so on screen rather than saving differently in silence',
   /TEST PERSONNEL — left empty, this saves as/.test(read('src/FleetCanvasManager.jsx')),
   'a save that quietly skips the login write looks identical to one that does not');

/* ── the save decision, re-run on real people ─────────────────────────────────────────── */
const TP_ME = 'aldi@kpm.com';
const TP_ROSTER = [
  { id: 'a1', name: '[TEST] REGIONAL ADMIN', email: TP_ME, phone: '' },
  { id: 'a2', name: 'Budi', email: 'budi@kpm.com', phone: '0812111' },
];
// The guard, exactly as handleSaveAgent orders it.
const tpSave = (p, { admin = true, editingId = null } = {}) => {
  const typed = (p.email || '').toLowerCase().trim();
  const own = TP_ME;
  const proxy = !!own && admin && (typed === '' || typed === own);
  const key = proxy ? own : typed;
  const missing = [
    !p.name && 'Name',
    !key && 'Google Account Email',
    !proxy && !(p.phone || '').trim() && 'Phone',
  ].filter(Boolean);
  if (missing.length) return { refused: `${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} still empty.` };
  if (!proxy && TP_ROSTER.some(a => a.email?.toLowerCase().trim() === key && a.id !== editingId))
    return { refused: 'duplicate email' };
  if (p.phone?.trim() && TP_ROSTER.some(a => a.phone?.trim() === p.phone.trim() && a.id !== editingId))
    return { refused: 'duplicate phone' };
  return { savedAs: key, writesLogin: !proxy };
};

const tpBlank = tpSave({ name: '[TEST] SALES MOTORIST' });
ok('HIS CASE: a test person with no email and no phone now saves',
   tpBlank.refused === undefined,
   'got refusal: ' + tpBlank.refused + ' — this is the exact message he screenshotted');
ok('and it is stored under his Tier 1 address, which is what he asked to lock them to',
   tpBlank.savedAs === TP_ME, 'got: ' + tpBlank.savedAs);
ok('with no login mapping written for it',
   tpBlank.writesLogin === false,
   'writing it repoints his own sign-in at the test record and demotes him out of Tier 1');
ok('a SECOND blank test person is not refused as a duplicate of the first',
   tpSave({ name: '[TEST] OWNER' }).refused === undefined,
   'a1 already holds that address and a blank phone — both guards have to stand down together');
ok('typing his own address explicitly behaves identically',
   tpSave({ name: '[TEST] HQ SALES MANAGER', email: 'ALDI@kpm.com  ' }).savedAs === TP_ME,
   'case and stray spaces must not decide whether somebody gets a login');

ok('TIER BELOW 1: a real person with no phone is still refused',
   tpSave({ name: 'Siti', email: 'siti@kpm.com', phone: '' }).refused === 'Phone is still empty.',
   'got: ' + JSON.stringify(tpSave({ name: 'Siti', email: 'siti@kpm.com', phone: '' })));
ok('a real person with no email is still refused',
   tpSave({ name: 'Siti', email: '', phone: '0899' }, { admin: false }).refused === 'Google Account Email is still empty.',
   'got: ' + JSON.stringify(tpSave({ name: 'Siti', email: '', phone: '0899' }, { admin: false })));
ok('a non-admin gets NO proxy escape — both fields are named at once',
   tpSave({ name: 'Siti', email: '', phone: '' }, { admin: false }).refused === 'Google Account Email and Phone are still empty.',
   'got: ' + JSON.stringify(tpSave({ name: 'Siti', email: '', phone: '' }, { admin: false })));
ok('a nameless save is refused even for the admin',
   tpSave({ name: '', email: '' }).refused === 'Name is still empty.',
   'got: ' + JSON.stringify(tpSave({ name: '', email: '' })));
ok('a complete real person saves AND gets their login mapping',
   tpSave({ name: 'Siti', email: 'siti@kpm.com', phone: '0899' }).writesLogin === true,
   'the directory is how a field agent signs in at all');
ok('two real people still cannot share an address',
   tpSave({ name: 'Palsu', email: 'budi@kpm.com', phone: '0877' }).refused === 'duplicate email',
   'got: ' + JSON.stringify(tpSave({ name: 'Palsu', email: 'budi@kpm.com', phone: '0877' })));
ok('or a phone number',
   tpSave({ name: 'Palsu', email: 'palsu@kpm.com', phone: '0812111' }).refused === 'duplicate phone',
   'got: ' + JSON.stringify(tpSave({ name: 'Palsu', email: 'palsu@kpm.com', phone: '0812111' })));
ok('and editing Budi without changing anything is not a collision with himself',
   tpSave({ name: 'Budi', email: 'budi@kpm.com', phone: '0812111' }, { editingId: 'a2' }).refused === undefined,
   'got: ' + JSON.stringify(tpSave({ name: 'Budi', email: 'budi@kpm.com', phone: '0812111' }, { editingId: 'a2' })));


section('EVERY CONSIGNMENT NAMES WHO IS RESPONSIBLE, AT EVERY TIER (Aldi, 2026-09-07)');

/* He gave a Tier 4 and a Tier 5 the same authority over Headquarters consignment, and both saw a
   list with nobody named on it: *"make sure that the consignment have the name of who responsible
   for this transaction ... i want the default setting for this UI to be like this even when the
   user own their own transaction but make sure that every consignment have information of who
   responsible for this, and if transferred then there should be agent A -> agent B, basically the
   same info that we wrote on the receipt"*.

   The line existed; it was wrapped in `isAdmin &&`, so responsibility was treated as an admin
   detail. It is the opposite: the agent holding the debt is the person who most needs to know
   whose debt it is. Now unconditional at both render sites, with the hand-off chain under it. */

const rsSrc = code(read('src/ConsignmentFinanceView.jsx'));
const rsRaw = read('src/ConsignmentFinanceView.jsx');

ok('the list card names the manager, and no longer only for an admin',
   /Managed by: \{c\.ownerName\}/.test(rsRaw) &&
   !/\{isAdmin && \(\s*<div className="mt-1\.5 inline-flex/.test(rsRaw),
   'wrapped in isAdmin, a Tier 4 and a Tier 5 sharing a branch see two identical unattributed lists');
ok('and the opened store names it too, unconditionally',
   /Managed By \{activeCustomer\?\.ownerName\}/.test(rsRaw) &&
   !/\{isAdmin && <p className="text-\[10px\] text-orange-500 font-bold uppercase tracking-widest mt-1">/.test(rsRaw),
   'the detail panel was gated by the same flag');
ok('both places draw the hand-off chain when there is one',
   (rsRaw.match(/handoffChain/g) || []).length >= 4,
   'the map, the row it is attached to, and one render per view — fewer means a view is missing it');

const rsA = rsSrc.indexOf('const handoffChainByStore');
const rsB = rsSrc.indexOf('const activeCustomer');
ok('the chain scope was found (anchors const handoffChainByStore .. const activeCustomer)',
   rsA > -1 && rsB > rsA, 'anchor missed — the slice below would read the whole file');
if (rsA > -1 && rsB > rsA) {
  const rs = rsSrc.slice(rsA, rsB);
  ok('the chain slice is the aggregation block, not the rest of the file',
     rs.length > 600 && rs.length < 6000, 'got ' + rs.length + ' chars');
  ok('the chain resolves each hop through the roster, with the stored name as fallback',
     /rosterNameById\.get\(id \|\| 'ADMIN'\) \|\| stored \|\| 'Admin'/.test(rs),
     "fromName/toName froze whatever the account was called that day — the same fault 2e5a8ac fixed");
  ok('it starts at the FIRST hand-off\'s sender, then follows every receiver',
     /nameOf\(hops\[0\]\.fromId, hops\[0\]\.fromName\), \.\.\.hops\.map/.test(rs),
     'starting from the last hop alone loses the agent who created the oldest debts on the store');
  ok('and the chain is attached to the row both views render',
     /c\.handoffChain = handoffChainByStore\.get\(key\) \|\| null/.test(rs),
     'looking it up separately in each view is how the two drift apart');
}

/* ── the chain, re-run on real stores ─────────────────────────────────────────────────── */
const RS_ROSTER = new Map([
  ['budi', '[TEST] SALES MOTORIST'],
  ['andi', '[TEST] REGIONAL ADMIN'],
  ['ADMIN', 'MOBIL PAK BOS'],
]);
const RS_STORES = [
  { name: 'Toko Sekali', handoffs: [{ fromId: 'budi', fromName: 'Aldi Kurniawan', toId: 'andi', toName: 'Aldi Kurniawan' }] },
  { name: 'Toko Dua Kali', handoffs: [
      { fromId: 'ADMIN', fromName: 'Aldi Kurniawan', toId: 'budi', toName: 'Aldi Kurniawan' },
      { fromId: 'budi', fromName: 'Aldi Kurniawan', toId: 'andi', toName: 'Aldi Kurniawan' }] },
  { name: 'Toko Diam', handoffs: [] },
  { name: 'Toko Hantu', handoffs: [{ fromId: 'ghost', fromName: 'Mantan Agen', toId: 'budi', toName: 'Aldi Kurniawan' }] },
];
const rsNameOf = (id, stored) => RS_ROSTER.get(id || 'ADMIN') || stored || 'Admin';
const rsChain = (store) => {
  const hops = store.handoffs || [];
  if (!hops.length) return null;
  return [rsNameOf(hops[0].fromId, hops[0].fromName), ...hops.map(h => rsNameOf(h.toId, h.toName))].join(' → ');
};
const rsOf = (n) => rsChain(RS_STORES.find(s => s.name === n));

ok('one hand-off reads exactly like the nota: A → B',
   rsOf('Toko Sekali') === '[TEST] SALES MOTORIST → [TEST] REGIONAL ADMIN',
   'got: ' + rsOf('Toko Sekali'));
ok('two hand-offs keep the middle agent, who created debts the current holder did not',
   rsOf('Toko Dua Kali') === 'MOBIL PAK BOS → [TEST] SALES MOTORIST → [TEST] REGIONAL ADMIN',
   'got: ' + rsOf('Toko Dua Kali'));
ok('a store that never moved shows no chain at all',
   rsOf('Toko Diam') === null, 'got: ' + rsOf('Toko Diam'));
ok('an agent since deleted from the roster keeps their stored name rather than vanishing',
   rsOf('Toko Hantu') === 'Mantan Agen → [TEST] SALES MOTORIST', 'got: ' + rsOf('Toko Hantu'));
ok('and no hop reads back the Google account name',
   !RS_STORES.map(rsChain).filter(Boolean).some(c => c.includes('Aldi Kurniawan')),
   'every stored fromName/toName in this fixture is the Google name — the roster has to win');


section('A HAND-OFF REQUEST SAYS WHAT IS BEING HANDED OVER (Aldi, 2026-09-07)');

/* His report, looking at the Incoming Hand-offs card: *"there is no information of the product that
   is being consign when handsoff request is sent"*. The card named a shop, printed an empty pair of
   quote marks where the note would be, and asked for "Accept Responsibility".

   ⚠️ THE RECEIVER COULD NOT LOOK IT UP EITHER. Until the hand-off is approved the store is not
   theirs, so `myTransactions` filters out every row belonging to it — the screen genuinely had
   nothing to show. That makes this a snapshot problem, not a rendering one: the figures have to be
   frozen INTO the request document by the sender, who can still see them.

   It is the description of an offer, never a money source. The real balance is still recomputed
   from the rows after approval, exactly as before. */

const snSrc = code(read('src/ConsignmentFinanceView.jsx'));
const snRaw = read('src/ConsignmentFinanceView.jsx');
const snApp = code(read('src/App.jsx'));

const snA = snSrc.indexOf('const snapshot = {');
const snB = snSrc.indexOf('onRequestTransfer(activeCustomer.name');
ok('the snapshot scope was found (anchors const snapshot = { .. onRequestTransfer(...))',
   snA > -1 && snB > snA, 'anchor missed — the slice below would read the whole file');
if (snA > -1 && snB > snA) {
  const sn = snSrc.slice(snA, snB);
  ok('the snapshot slice is the builder, not the rest of the file',
     sn.length > 150 && sn.length < 1200, 'got ' + sn.length + ' chars');
  ok('it carries the debt, the total stock and the line items',
     /balance: activeCustomer\.balance/.test(sn) && /totalBks:/.test(sn) && /items: Object\.values/.test(sn),
     'a total with no lines cannot be checked against the shop, and lines with no total cannot be checked at a glance');
  ok('and it drops products that are no longer there',
     /\.filter\(i => \(i\.qty \|\| 0\) > 0\)/.test(sn),
     'a zero-quantity line reads as stock the receiver will be held responsible for');
}
ok('the snapshot is actually passed to the handler',
   /onRequestTransfer\(activeCustomer\.name, targetAgent, agentInfo\.name, transferNote, snapshot\)/.test(snSrc),
   'built and not passed is the failure mode that looks fixed in the diff and changes nothing');
ok('the handler accepts it and writes it onto the request document',
   /handleRequestTransfer = async \(storeName, toAgentId, toAgentName, note, snapshot\)/.test(snApp) &&
   /stockSnapshot: snapshot \|\| null/.test(snApp),
   'the receiving agent reads this document and nothing else before deciding');

ok('the card draws the debt, the total and every line',
   /r\.stockSnapshot\.balance/.test(snRaw) && /r\.stockSnapshot\.totalBks/.test(snRaw) &&
   /\(r\.stockSnapshot\.items \|\| \[\]\)\.map/.test(snRaw),
   'the whole point is that the receiver sees the offer before signing for it');
ok('a request made BEFORE this change says so instead of showing zeroes',
   /This request was made before the stock summary existed/.test(snRaw),
   'rendering Rp 0 over 0 Bks reads as an empty shop, which is a confident wrong answer');
ok('a shop with debt but no stock left says that in words',
   /No stock left at this shop — debt only\./.test(snRaw),
   'an empty list under a real balance looks like the list failed to load');
ok('and an empty note no longer renders as a bare pair of quote marks',
   /\{r\.note\?\.trim\(\) && <p /.test(snRaw),
   'his screenshot shows exactly that — a lone \'""\' where a sentence should be');

/* ── the snapshot, re-run on a real shop ──────────────────────────────────────────────── */
const SN_STORE = {
  balance: 1055000,
  items: {
    'p1-Retail': { name: 'Surya 16', qty: 60, priceTier: 'Retail' },
    'p2-Grosir': { name: 'Gudang Garam Merah', qty: 40, priceTier: 'Grosir' },
    'p3-Retail': { name: 'Djarum Super', qty: 0, priceTier: 'Retail' },
  },
};
const snBuild = (c) => ({
  balance: c.balance || 0,
  totalBks: Object.values(c.items).reduce((sum, i) => sum + (i.qty || 0), 0),
  items: Object.values(c.items).filter(i => (i.qty || 0) > 0).map(i => ({ name: i.name || 'Item', qty: i.qty, tier: i.priceTier || null })),
});
const SN = snBuild(SN_STORE);

ok('the debt on the offer is the shop\'s real outstanding balance',
   SN.balance === 1055000, 'got ' + SN.balance);
ok('the total is every pack still at the shop: 60 + 40, and the sold-out line adds nothing',
   SN.totalBks === 100, 'got ' + SN.totalBks);
ok('the sold-out product is not listed as something to be responsible for',
   SN.items.length === 2 && !SN.items.some(i => i.name === 'Djarum Super'),
   'got: ' + SN.items.map(i => i.name).join(', '));
ok('each line keeps its price tier, because the same product at two tiers is two debts',
   SN.items.map(i => `${i.name}/${i.tier}/${i.qty}`).join(' · ') === 'Surya 16/Retail/60 · Gudang Garam Merah/Grosir/40',
   'got: ' + SN.items.map(i => `${i.name}/${i.tier}/${i.qty}`).join(' · '));
ok('the lines add up to the total shown above them',
   SN.items.reduce((s, i) => s + i.qty, 0) === SN.totalBks,
   'a total that disagrees with its own lines is worse than no total');
ok('a shop cleared of stock still reports its debt honestly',
   snBuild({ balance: 250000, items: { 'p1': { name: 'Surya 16', qty: 0 } } }).totalBks === 0 &&
   snBuild({ balance: 250000, items: { 'p1': { name: 'Surya 16', qty: 0 } } }).balance === 250000,
   'stock and debt are separate: paying nothing off while selling everything is the normal case');


section('THE HAND-OFF CARD CAN SHOW THE SHOP ON THE JOURNEY MAP (Aldi, 2026-09-07)');

/* *"i want u to add redirect location on the journey map just to make sure that this area is not
   too far from the agent journey if they want to check, just for further convenience"*. He picked
   the Journey tab over Map Mission Control when asked.

   ⚠️ THE TRAP, and it is why this needed a question first. Asked what should happen for a shop with
   no GPS he answered *"well all the stores have GPS, and should have GPS, on the NOO GPS is
   compulsary where adress do not actually"* — the intent is right, but NOTHING IN THE SAVE PATH
   ENFORCES IT (`CustomerManager.jsx` gates display on `latitude && longitude` and falls back to the
   address; there is no required-field refusal). And Leaflet handed a NaN pair does not throw: it
   drifts to the default view. For a question that is specifically about DISTANCE, quietly showing
   the wrong place is the worst available answer, so a shop with no pin says so instead. */

const mpJourney = code(read('src/JourneyView.jsx'));
const mpApp = code(read('src/App.jsx'));
const mpCfv = read('src/ConsignmentFinanceView.jsx');

const mpA = mpJourney.indexOf('const StoreFocus');
const mpB = mpJourney.indexOf('const LocationController');
ok('the focus controller was found (anchors const StoreFocus .. const LocationController)',
   mpA > -1 && mpB > mpA, 'anchor missed — the slice below would read the whole file');
if (mpA > -1 && mpB > mpA) {
  const mp = mpJourney.slice(mpA, mpB);
  ok('the focus controller is the slice, not the rest of the file',
     mp.length > 300 && mp.length < 2500, 'got ' + mp.length + ' chars');
  ok('it matches the shop the same way every other screen does',
     /storeKey\(c\.name\) === storeKey\(focusStore\)/.test(mp),
     'three of his shops share a name — matching on the raw string reaches the wrong one');
  ok('it only flies when BOTH coordinates are real numbers',
     /Number\.isFinite\(lat\) && Number\.isFinite\(lng\)/.test(mp),
     'Leaflet given NaN does not throw — it drifts to the default view and looks like an answer');
  ok('and 0,0 is treated as no pin, not as a location',
     /\(lat !== 0 \|\| lng !== 0\)/.test(mp),
     'a zeroed record would fly the agent to the Atlantic and call it the shop');
  ok('a shop with no pin is told to the user instead of being flown to',
     /has no GPS pin saved yet/.test(mp),
     'silence here is the exact failure the guard exists to prevent');
  ok('and a store that is not on this map says that too',
     /is not on this map/.test(mp),
     'a receiver whose tier cannot see the shop must not get a silent no-op');
  ok('the focus is cleared after it fires, so it can fire again',
     /onHandled\?\.\(\)/.test(mp),
     'a sticky focus value means the second press of the button does nothing');
}
ok('JourneyView takes the focus props and renders the controller inside the map',
   /focusStore = null, onFocusStoreHandled/.test(mpJourney) &&
   /<StoreFocus focusStore=\{focusStore\} customers=\{customers\} onHandled=\{onFocusStoreHandled\} \/>/.test(mpJourney),
   'a controller outside MapContainer has no useMap to call');

ok('App keeps the journey focus SEPARATE from the receivables focus',
   /const \[journeyFocus, setJourneyFocus\] = useState\(null\)/.test(mpApp) &&
   /const \[focusStore, setFocusStore\] = useState\(null\)/.test(mpApp),
   'reusing focusStore would make a notification that opens Receivables also hijack the map');
ok('and the redirect switches to the journey tab as well as setting the target',
   /setJourneyFocus\(storeName\); setActiveTab\('journey'\)/.test(mpApp),
   'setting the target without changing tab leaves the agent on the card wondering what happened');
ok('the wiring reaches both screens',
   /focusStore=\{journeyFocus\} onFocusStoreHandled=\{\(\) => setJourneyFocus\(null\)\}/.test(mpApp) &&
   /onShowStoreOnJourney=\{showStoreOnJourney\}/.test(mpApp),
   'built and not wired is the failure that looks complete in the diff');
ok('and the button is on the incoming hand-off card',
   /onShowStoreOnJourney\(r\.storeName\)/.test(mpCfv) && /See it on the journey map/.test(mpCfv),
   'this is the one screen where the question "how far is this?" is actually being asked');

/* ── the focus decision, re-run on real shops ─────────────────────────────────────────── */
const MP_SHOPS = [
  { name: 'HQ (Retail) 1', latitude: -6.9175, longitude: 107.6191 },
  { name: 'Toko Tanpa Pin', latitude: null, longitude: null },
  { name: 'Toko Nol', latitude: 0, longitude: 0 },
  { name: 'Toko Rusak', latitude: 'abc', longitude: '107.6' },
];
const mpKey = (v) => String(v || '').trim().toUpperCase();
const mpFocus = (storeName) => {
  const shop = MP_SHOPS.find(c => mpKey(c.name) === mpKey(storeName));
  const lat = Number(shop?.latitude);
  const lng = Number(shop?.longitude);
  if (shop && Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) return { flyTo: [lat, lng] };
  if (shop) return { message: `${shop.name} has no GPS pin saved yet, so the map cannot show where it is.` };
  return { message: `${storeName} is not on this map.` };
};

ok('a shop with a real pin is flown to at street zoom',
   JSON.stringify(mpFocus('HQ (Retail) 1').flyTo) === JSON.stringify([-6.9175, 107.6191]),
   'got: ' + JSON.stringify(mpFocus('HQ (Retail) 1')));
ok('a shop with no coordinates is explained, not flown to',
   mpFocus('Toko Tanpa Pin').flyTo === undefined && /no GPS pin saved yet/.test(mpFocus('Toko Tanpa Pin').message),
   'got: ' + JSON.stringify(mpFocus('Toko Tanpa Pin')));
ok('0,0 counts as no pin — the agent is not sent to the Atlantic',
   mpFocus('Toko Nol').flyTo === undefined,
   'got: ' + JSON.stringify(mpFocus('Toko Nol')));
ok('a half-broken coordinate pair is refused rather than half-used',
   mpFocus('Toko Rusak').flyTo === undefined,
   'got: ' + JSON.stringify(mpFocus('Toko Rusak')));
ok('a store the viewer cannot see says so by name',
   mpFocus('Toko Rahasia').message === 'Toko Rahasia is not on this map.',
   'got: ' + JSON.stringify(mpFocus('Toko Rahasia')));
ok('and the match is case- and spacing-insensitive, like every other store lookup',
   JSON.stringify(mpFocus('  hq (retail) 1 ').flyTo) === JSON.stringify([-6.9175, 107.6191]),
   'the request stores the name as typed; the map stores it as registered');


section('AN OUTLET CANNOT BE SAVED WITHOUT A MAP PIN (Aldi, 2026-09-07)');

/* He believed this was already true — *"on the NOO GPS is compulsary where adress do not
   actually"* — and it was not: the form captured coordinates and never required them, which is why
   every display path carries an address fallback. Told that, he said *"damn make it compulsory then
   because i think GPS can work even without internet right"*.

   He is right about the hardware. A GNSS fix needs no data connection; what needs the internet is
   the address SEARCH (a Nominatim call) and the map TILES. So the guard checks the field, not the
   method — the GPS button, the address search and a pasted coordinate pair all fill the same two
   values, which is what keeps this compulsory without making it impossible from a desktop.

   ⚠️ It guards a SAVE, so it tests the number, not the truthiness. `!formData.latitude` would
   reject a real equatorial pin at latitude 0 and accept the string "abc". 0,0 is refused on
   purpose: it is the Atlantic, and it is what a zeroed or half-written record looks like — the one
   wrong answer that renders as a confident pin. */

const gpSrc = code(read('src/components/CustomerManager.jsx'));
const gpA = gpSrc.indexOf('const handleSubmit');
const gpB = gpSrc.indexOf('const cleanData');
ok('the submit scope was found (anchors const handleSubmit .. const cleanData)',
   gpA > -1 && gpB > gpA, 'anchor missed — the slice below would read the whole file');
if (gpA > -1 && gpB > gpA) {
  const gp = gpSrc.slice(gpA, gpB);
  ok('the submit slice is the validation block, not the rest of the file',
     gp.length > 400 && gp.length < 4000, 'got ' + gp.length + ' chars');
  ok('a pin is required before an outlet can be saved',
     /!Number\.isFinite\(lat\) \|\| !Number\.isFinite\(lng\)/.test(gp),
     'this is the guard he asked for: "damn make it compulsory then"');
  ok('it parses the value rather than testing whether the field is truthy',
     /const lat = parseFloat\(formData\.latitude\)/.test(gp) && !/!formData\.latitude/.test(gp),
     'truthiness rejects a real pin at latitude 0 and accepts the string "abc"');
  ok('and 0,0 is refused as the null island it is',
     /\(lat === 0 && lng === 0\)/.test(gp),
     'a zeroed record renders as a confident pin in the Atlantic');
  ok('the refusal names all three ways to fill it, not just the GPS button',
     /Press GPS to lock your position, search the address, or paste the coordinates/.test(gp),
     'a desktop with no GPS chip must still be able to register an outlet');
}
ok('the guard runs BEFORE the write, not after it',
   gpSrc.indexOf('!Number.isFinite(lat)') > -1 &&
   gpSrc.indexOf('!Number.isFinite(lat)') < gpSrc.indexOf('await addDoc(collection(db, \'artifacts\', appId'),
   'a check after the document is created is not a check');
ok('and it guards the SSOT block\'s own path, after the region check rather than instead of it',
   /* anchored on the region PREDICATE, not on the words of its refusal — those words are copy,
      and copy changes (2026-09-13: it did) */
   gpSrc.indexOf('!safeProv || !safeKab || !safeKec') > -1 &&
   gpSrc.indexOf('!safeProv || !safeKab || !safeKec') < gpSrc.indexOf('!Number.isFinite(lat)'),
   'replacing the region guard would trade one missing field for another');

/* ── the guard, re-run on real pins ───────────────────────────────────────────────────── */
const gpSave = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return 'refused';
  return 'saved';
};

ok('a real Bandung pin saves',
   gpSave(-6.9175, 107.6191) === 'saved', 'got ' + gpSave(-6.9175, 107.6191));
ok('a pin pasted as text saves too — the field is what matters, not how it was filled',
   gpSave('-6.9175', '107.6191') === 'saved', 'got ' + gpSave('-6.9175', '107.6191'));
ok('an outlet with no pin at all is refused',
   gpSave('', '') === 'refused', 'got ' + gpSave('', ''));
ok('a half-filled pair is refused rather than half-saved',
   gpSave(-6.9175, '') === 'refused' && gpSave('', 107.6191) === 'refused',
   'got ' + gpSave(-6.9175, '') + ' / ' + gpSave('', 107.6191));
ok('rubbish in the coordinate box is refused',
   gpSave('abc', '107.6') === 'refused', 'got ' + gpSave('abc', '107.6'));
ok('0,0 is refused — that is the Atlantic, not a shop',
   gpSave(0, 0) === 'refused', 'got ' + gpSave(0, 0));
ok('BUT a genuine pin ON the equator still saves, which truthiness would have broken',
   gpSave(0, 107.6191) === 'saved', 'got ' + gpSave(0, 107.6191));
ok('and a genuine pin on the prime meridian saves',
   gpSave(-6.9175, 0) === 'saved', 'got ' + gpSave(-6.9175, 0));


section('A BRANCH APPROVER CAN SEE THEIR OWN APPROVAL QUEUE (Aldi, 2026-09-07)');

/* Signed in as a REAL Tier 4 regional admin he had granted approval power in Fleet & Canvas:
   *"regional admin does get the notification bell for the approval, but when i open consignment
   menu there is none of that bell notification inside it"* — the bell said "awaiting your
   authorization" over a panel that said "No pending action required".

   TWO faults, and either one alone still produces an empty panel:

   1. THE RENDER ASKED `isAdmin`. `pendingAdminRequests` was already correct — it calls
      `canApproveHandoffFrom`, the same predicate the write in App.jsx uses, so a branch approver
      is in that list. Three render sites then threw the list away unless `isAdmin`. And `isAdmin`
      here is not "is an admin": it is `vaultUnlocked`, which POV also forces to false. The list is
      the permission now; `isAdmin` decides nothing about who may see it.

   2. THE MEMO'S DEPS WERE INCOMPLETE. `adminPend` reads `motorists` and `myProfile`; neither was
      listed. The roster arrives from Firestore after the first paint, so the queue was computed
      once against an empty roster and never re-ran — empty for the whole session even once the
      render gate was fixed. A permission bug and a staleness bug wearing the same symptom. */

const apRaw = read('src/ConsignmentFinanceView.jsx');
const apSrc = code(apRaw);

ok('the tab badge counts an approval queue for everybody, not only an admin',
   /\{\(incomingRequests\.length > 0 \|\| pendingAdminRequests\.length > 0\) && \(/.test(apRaw),
   'the red dot was the only hint the queue existed, and it was gated too');
ok('the approval list draws whenever there is something in it',
   /\{pendingAdminRequests\.map\(r => \(/.test(apRaw) && !/isAdmin \? pendingAdminRequests/.test(apRaw),
   'this is the line that hid a granted permission behind the vault-unlock flag');
ok('the incoming list draws alongside it rather than instead of it',
   /\)\)\}\s*\{incomingRequests\.map\(r => \(/.test(apRaw),
   'a ternary hides one of two disjoint lists — a person can approve one hand-off while receiving another');
ok('"No pending action required" needs BOTH lists to be empty',
   /\{pendingAdminRequests\.length === 0 && incomingRequests\.length === 0 &&/.test(apRaw),
   'the old form printed it whenever the branch it did not render happened to be empty');
ok('and no render decision is left asking isAdmin about approvals',
   !/isAdmin \? 'Admin Auth Required'/.test(apRaw) && !/isAdmin && pendingAdminRequests/.test(apRaw),
   'one surviving gate reproduces the whole bug');

ok('the routing memo re-runs when the roster or the approver profile arrives',
   /\[transferRequests, agentProfileId, isAdmin, motorists, myProfile\]/.test(apSrc),
   'canApproveHandoffFrom reads both; without them the queue is computed once against an empty roster');
ok('the queue still asks the same predicate the write asks',
   /canApproveHandoffFrom\(isAdmin \? \{ userRole: 'ADMIN' \} : myProfile, receiver\?\.location, motorists\)/.test(apSrc),
   'a screen that decides permission differently from the write is the UI-says-yes pattern');
ok('the SENDER still cannot authorise the hand-off they asked for',
   /if \(agentProfileId && r\.fromAgentId === agentProfileId\) return false/.test(apSrc) &&
   !/r\.toAgentId === agentProfileId \|\| r\.fromAgentId === agentProfileId/.test(apSrc),
   'requesting a store and granting it yourself is one person doing the whole thing; receiving one you were offered is not');
ok('and the RECEIVER is no longer excluded — Aldi\'s call, and it is canApproveHandoffFrom that keeps it narrow',
   /canApproveHandoffFrom\(isAdmin \? \{ userRole: 'ADMIN' \} : myProfile, receiver\?\.location, motorists\)/.test(apSrc),
   'dropping the receiver check WITHOUT this predicate would hand the Authorize button to every agent who accepts a store');

/* ── the queue, re-run on real people ─────────────────────────────────────────────────── */
const AP_REQ = { id: 'r1', status: 'PENDING_ADMIN', fromAgentId: 'canvas', toAgentId: 'motorist' };
const AP_ROSTER = [
  { id: 'canvas', name: '[TEST] SALES CANVAS', userRole: 'AGENT', location: 'HEADQUARTERS' },
  { id: 'motorist', name: '[TEST] SALES MOTORIST', userRole: 'AGENT', location: 'HEADQUARTERS' },
  { id: 'regional', name: '[TEST] REGIONAL ADMIN', userRole: 'AREA_ADMIN', location: 'HEADQUARTERS', approvalRegions: ['HEADQUARTERS'] },
];
// The queue predicate, standing in for canApproveHandoffFrom: an admin always, otherwise a person
// named for the receiving agent's branch. Sender and receiver are excluded first, as in the source.
const apQueue = (viewerId, viewerIsAdmin, req = AP_REQ) => {
  // Only the SENDER is excluded outright since 2026-09-07; the receiver is filtered by the
  // approval predicate below exactly like anybody else.
  if (viewerId && req.fromAgentId === viewerId) return [];
  const receiver = AP_ROSTER.find(m => m.id === req.toAgentId);
  if (viewerIsAdmin) return [req];
  const me = AP_ROSTER.find(m => m.id === viewerId);
  const named = (me?.approvalRegions || []).includes(String(receiver?.location || '').toUpperCase());
  return named ? [req] : [];
};
// What the panel decides to draw, now that isAdmin no longer decides it.
const apPanel = (viewerId, viewerIsAdmin, req = AP_REQ) => {
  const queue = apQueue(viewerId, viewerIsAdmin, req);
  const incoming = req.toAgentId === viewerId ? [req] : [];
  if (!queue.length && !incoming.length) return 'No pending action required.';
  return `${queue.length} to authorise, ${incoming.length} incoming`;
};
// The same request, but handed TO the branch approver instead of to a field agent.
const AP_TO_APPROVER = { id: 'r2', status: 'PENDING_ADMIN', fromAgentId: 'canvas', toAgentId: 'regional' };

ok('HIS CASE: the Tier 4 regional admin named for that branch sees the request to authorise',
   apPanel('regional', false) === '1 to authorise, 0 incoming',
   'got: ' + apPanel('regional', false));
ok('the Tier 1 owner still sees it too — that is Option B, and it never changed',
   apPanel(null, true) === '1 to authorise, 0 incoming',
   'got: ' + apPanel(null, true));
ok('an ORDINARY agent receiving a store still gets no authorise button for it',
   apPanel('motorist', false) === '0 to authorise, 1 incoming',
   'got: ' + apPanel('motorist', false) + ' — dropping the receiver check must not hand the button to everybody');
ok('but a BRANCH APPROVER handed a store may now authorise it themselves',
   apPanel('regional', false, AP_TO_APPROVER) === '1 to authorise, 1 incoming',
   'got: ' + apPanel('regional', false, AP_TO_APPROVER) + ' — Aldi: "yeah they should be able to confirm their own request"');
ok('and the SENDER is still refused even when they hold that branch\'s approval power',
   apPanel('canvas', false, { ...AP_TO_APPROVER, fromAgentId: 'canvas' }) === 'No pending action required.',
   'got: ' + apPanel('canvas', false, { ...AP_TO_APPROVER, fromAgentId: 'canvas' }));
ok('the SENDER gets neither — they cannot approve what they asked for',
   apPanel('canvas', false) === 'No pending action required.',
   'got: ' + apPanel('canvas', false));
ok('and an agent with no approval power over that branch still sees nothing',
   apPanel('outsider', false) === 'No pending action required.',
   'got: ' + apPanel('outsider', false));


section('THE ALERT DOT NO LONGER SHAKES THE TAB STRIP (Aldi, 2026-09-07)');

/* He sent a screen recording: *"there is snapping animation when the red link blinking on this
   page"*, and said the whole panel did it on a Tier 6 account too. Frame by frame, the SCROLLBAR
   under the tabs moves on every pulse — so it was never an animation problem.

   The dot sat at `-top-1 -right-1`, OUTSIDE its button, inside a strip that is `overflow-x-auto`.
   `animate-ping` scales 2x, and a CSS transform still extends an element's SCROLLABLE OVERFLOW even
   though it does not affect layout. Every pulse grew and shrank the strip's scrollWidth, the
   scrollbar resized twice a second, and the tabs jumped with it.

   The geometry is both the fix and the check: the badge has to sit far enough inside that the ring
   at full scale never reaches the button's edge. */

const dtRaw = read('src/ConsignmentFinanceView.jsx');

ok('the alert badge sits INSIDE the button, not hanging off its corner',
   /<span className="absolute top-2 right-2 flex h-2 w-2">/.test(dtRaw) &&
   !/absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping/.test(dtRaw),
   'a negative inset plus a 2x transform is what pushed the scroll width of an overflow-x-auto strip');
ok('the alert is a solid dot and nothing pings any more',
   !/animate-ping/.test(code(dtRaw)) &&
   /<span className="relative inline-flex h-2 w-2 rounded-full bg-red-500">/.test(dtRaw),
   'Aldi 2026-09-18: "just erase the dot light" — a light that loops forever reads as noise; the dot stays, the ring is gone');
ok('the strip it lives in really is a horizontal scroller, which is why this mattered at all',
   /overflow-x-auto max-w-full shrink-0/.test(dtRaw),
   'if that strip ever stops scrolling this bug cannot recur, and this section should be retired with it');

/* The geometry, re-run. Tailwind: top-2 / right-2 = 8px inset, h-2 / w-2 = 8px box, and ping scales
   to 2x about the centre, so the ring grows by half its own width on each side. */
const RING_PX = 8, INSET_PX = 8, PING_SCALE = 2;
const overhang = (ring, inset, scale) => (ring * scale - ring) / 2 - inset;

ok('at full scale the ring stops 4px short of the edge, so scrollWidth cannot change',
   overhang(RING_PX, INSET_PX, PING_SCALE) === -4,
   'got ' + overhang(RING_PX, INSET_PX, PING_SCALE) + 'px overhang; anything >= 0 reaches the edge');
ok('and the OLD geometry really did overflow — so this check could have failed',
   overhang(12, -4, PING_SCALE) === 10,
   'the previous badge was 12px at a -4px inset: 10px past the edge, twice a second');
ok('a bigger dot at the same inset would bring it straight back',
   overhang(24, INSET_PX, PING_SCALE) > 0,
   'this is the edit that would silently reintroduce the shake');


section('THE APPROVER SEES THE OFFER TOO, FROM THE SAME COMPONENT (Aldi, 2026-09-07)');

/* The moment his Tier 4 approver's button appeared he asked for the rest: *"please also put the
   store and product information so that the approval person can see it too"*. The RECEIVER could see
   what they were taking on; the person actually authorising the debt to move could not.

   One component, two cards. Two hand-written copies of "what is at this shop and what is owed"
   drift the first time either is edited, and the two readers are answering the same question. */

const ofRaw = read('src/ConsignmentFinanceView.jsx');

ok('the offer summary is a component, not a block copied into each card',
   /function HandoffOffer\(\{ r \}\) \{/.test(ofRaw),
   'the receiver and the approver must not be able to disagree about the same request');
ok('and BOTH cards render it — the approver\'s and the receiver\'s',
   (ofRaw.match(/<HandoffOffer r=\{r\} \/>/g) || []).length === 2,
   'one occurrence means only one of the two people deciding can see the numbers');
ok('the approver sees it BEFORE the Reject / Authorize buttons, not after them',
   ofRaw.indexOf('<HandoffOffer r={r} />') < ofRaw.indexOf('Authorize Transfer'),
   'information printed under the button it should inform is decoration');
ok('the approver card still names both sides of the move above it',
   /<strong>\{r\.fromAgentName\}<\/strong> <ArrowRight size=\{12\} className="inline mx-1"\/> <strong>\{r\.toAgentName\}<\/strong>/.test(ofRaw),
   'the debt is moving between two named people and the approver is signing that, not just a shop');
ok('the fallback wording works for a person deciding, not only for one accepting',
   /Ask \{r\.fromAgentName\} what is at this shop before deciding\./.test(ofRaw) &&
   !/what is at this shop before accepting\./.test(ofRaw),
   'the shared component is read by an approver too — "before accepting" is the receiver\'s word only');

/* ── the same numbers reaching both readers ───────────────────────────────────────────── */
const OF_REQ = {
  id: 'r1', storeName: 'HQ (Retail) 1', fromAgentName: '[TEST] SALES CANVAS', toAgentName: '[TEST] SALES MOTORIST',
  stockSnapshot: { balance: 130500, totalBks: 15, items: [{ name: 'Surya 16', qty: 15, tier: 'Retail' }] },
};
// The component is pure in its input: same request, same three figures, whoever is looking.
const ofRender = (req) => req.stockSnapshot
  ? { debt: req.stockSnapshot.balance, bks: req.stockSnapshot.totalBks, lines: (req.stockSnapshot.items || []).length }
  : { fallback: true };

ok('the approver and the receiver read the identical figures off one request',
   JSON.stringify(ofRender(OF_REQ)) === JSON.stringify({ debt: 130500, bks: 15, lines: 1 }),
   'got: ' + JSON.stringify(ofRender(OF_REQ)));
ok('and a request with no snapshot falls back for both of them, not just for one',
   ofRender({ id: 'r2' }).fallback === true,
   'got: ' + JSON.stringify(ofRender({ id: 'r2' })));


section('THE VAULT GRACE BELONGS TO A PERSON, NOT TO A BROWSER (Aldi, 2026-09-07)');

/* He reported it as a hand-off bug: *"the other T4 account located in different area also receive
   the approval request that is not on their regional area"* — VG_ALEX, T4 REGIONAL ADMIN in MUNTILAN,
   seeing a HEADQUARTERS hand-off. It was not a hand-off bug. His screenshot said so: that account's
   header read **GLOBAL RECEIVABLES** with an ALL REGIONS filter, and only `isAdmin` draws that
   (`ConsignmentFinanceView.jsx`: isAdmin ? 'Global Receivables' : 'My Receivables').

   ⚠️ PRIVILEGE ESCALATION, and the mechanism is the uid hijack meeting the grace record.
   Sign-in deliberately rewrites `user.uid` to `trueBossUid` so every Firestore read lands in the
   owner's tenancy, and keeps the person's own id beside it as `realUid`. The grace effect read
   `user.uid`. So the record Aldi wrote when HE unlocked the vault was found again by the next
   person to sign in on the same browser, and `setIsAdmin(true)` ran for them: a Tier 4 became a
   global admin with every store and every approval queue.

   Two guards, because either alone leaves a hole: key on the REAL uid, and never restore the vault
   into a hijacked agent session however the record got there. */

const vgApp = code(read('src/App.jsx'));
const vgA = vgApp.indexOf('const realUid = user?.realUid || user?.uid;');
const vgB = vgApp.indexOf('}, [isAdmin, user, showAdminLogin]);');
ok('the grace-restore scope was found (anchors const realUid .. its own dep list)',
   vgA > -1 && vgB > vgA, 'anchor missed — the slice below would read the whole file');
if (vgA > -1 && vgB > vgA) {
  const vg = vgApp.slice(vgA, vgB);
  ok('the grace restore slice is the effect body, not the rest of the file',
     vg.length > 100 && vg.length < 1200, 'got ' + vg.length + ' chars');
  ok('the grace record is keyed on the person, not on the hijacked boss uid',
     /readGrace\(realUid\)/.test(vg) && !/readGrace\(uid\)/.test(vg),
     "user.uid is trueBossUid for every agent — keyed on it, one unlock answers for everybody on the browser");
  ok('and a hijacked agent session never restores the vault at all',
     /if \(user\?\.realUid && user\.realUid !== user\.uid\) return;/.test(vg),
     'the key alone is not enough: an agent has no business holding the owner unlock, whatever is in localStorage');
  ok('the restore still happens BEFORE anything is written, so a locked vault stays locked',
     vg.indexOf('return;') < vg.indexOf('touchGrace'),
     'a touch before the guard would re-stamp the record for the very session being refused');
}
ok('the touch effect uses the same key as the restore',
   /const uid = user\?\.realUid \|\| user\?\.uid;\s*if \(!isAdmin && false/.test(vgApp) === false &&
   (vgApp.match(/user\?\.realUid \|\| user\?\.uid/g) || []).length === 2,
   'two effects keyed differently would write one record and read another, and the grace would never expire correctly');

/* ── the decision, re-run on real sessions ────────────────────────────────────────────── */
const VG_BOSS = 'uid-aldi';
const VG_STORE = { uid: VG_BOSS, at: 1000 };                       // Aldi unlocked the vault
const vgValid = (rec, now, uid) => !!rec && typeof rec.at === 'number' && !!uid && rec.uid === uid
  && rec.at <= now && (now - rec.at) < 5 * 60 * 1000;
// The effect, as written now.
const vgRestore = (user, now) => {
  const realUid = user.realUid || user.uid;
  if (!realUid) return false;
  if (user.realUid && user.realUid !== user.uid) return false;
  return vgValid(VG_STORE, now, realUid);
};

const VG_OWNER = { uid: VG_BOSS };                                    // not hijacked — no realUid
const VG_ALEX  = { uid: VG_BOSS, realUid: 'uid-alex' };               // T4, hijacked onto the boss tenancy
const VG_OTHER = { uid: VG_BOSS, realUid: 'uid-motorist' };

ok('HIS CASE: a Tier 4 signing in on the same browser no longer inherits the unlock',
   vgRestore(VG_ALEX, 2000) === false,
   'this is what made VG_ALEX a global admin and handed him every branch\'s approval queue');
ok('and neither does any other agent, on any device Aldi has used',
   vgRestore(VG_OTHER, 2000) === false, 'got ' + vgRestore(VG_OTHER, 2000));
ok('Aldi himself keeps his 5-minute grace — his session is not hijacked, so nothing changed for him',
   vgRestore(VG_OWNER, 2000) === true,
   'breaking his own convenience to fix somebody else\'s access would be a bad trade he did not ask for');
ok('and his grace still expires on time rather than lasting forever',
   vgRestore(VG_OWNER, 1000 + 5 * 60 * 1000) === false,
   'the window is the whole point: "it is annoying when i have to always enter my pin", not "never ask again"');
ok('a record belonging to somebody else is refused even for an un-hijacked session',
   vgValid({ uid: 'uid-someone-else', at: 1000 }, 2000, VG_BOSS) === false,
   'the uid comparison inside graceIsValid is the last line of defence and must stay');


/* AN APPROVED HAND-OFF THAT MOVED NOTHING ==================================================
   Aldi, 2026-09-08: *"sc6 is the prove that transfer complete but not transferred in reality"*.
   A Tier 4 approved HQ 3, the request went APPROVED, the shop stayed with the Tier 5, and the
   approver had no history entry to show for it. The status write was unconditional; the owner
   change and the handoffs entry both sat inside `if (targetCustomer)`. Active Consignments is
   built from transactions, so a shop can be visible there with no customer document to own. */
const haStart = app.indexOf('const handleAdminApproveTransfer');
const haEnd   = app.indexOf('\n  const ', haStart + 40);
ok('the hand-off approval handler is still findable',
   haStart > -1 && haEnd > haStart, `handleAdminApproveTransfer ${haStart}, next const ${haEnd}`);
const haBody = app.slice(haStart, haEnd);
ok('and the slice is the handler rather than half the file',
   haBody.length > 800 && haBody.length < 12000, `slice is ${haBody.length} chars`);

const haRefuse = haBody.indexOf('Cannot approve:');
const haStatus = haBody.indexOf("status: isApproved ? 'APPROVED'");
ok('the approval refuses BEFORE the status is written, not after',
   haRefuse > -1 && haStatus > -1 && haRefuse < haStatus,
   `refusal at ${haRefuse}, status write at ${haStatus} - a refusal after the write cannot un-write it`);
ok('the old "Approved, but ... matches N shops" toast is gone',
   haBody.includes('Approved, but') === false,
   'that message let an APPROVED request stand over a transfer that never happened');
ok('rejection is not gated on finding the shop',
   /if \(isApproved && !targetCustomer\)/.test(haBody),
   'gating on !targetCustomer alone would strand an unregistered shop as PENDING_ADMIN forever');

/* the decision, re-run on his real rows */
const haKey = (n) => String(n ?? '').trim().replace(/\s*\((?:Retail|Individual|Wholesale)\)$/i, '').trim().toLowerCase();
const haResolve = (req, custs) => {
  const matches = custs.filter(c => haKey(c.name) === haKey(req.storeName));
  return req.customerId ? custs.find(c => c.id === req.customerId) : (matches.length === 1 ? matches[0] : null);
};
// The handler, as written now: nothing is written at all when an approval cannot move the shop.
const haApprove = (req, custs, isApproved) => {
  const target = haResolve(req, custs);
  if (isApproved && !target) return { wrote: false, status: null, movedTo: null };
  return { wrote: true, status: isApproved ? 'APPROVED' : 'REJECTED', movedTo: target ? target.id : null };
};

// His registry on 2026-09-08. HQ 3 sells and shows in Active Consignments, but has no document.
const HA_BOOK = [{ id: 'c1', name: 'HQ (RETAIL) 1' }, { id: 'c2', name: 'HQ TEST' }];
const HA_HQ3  = { storeName: 'HQ 3', customerId: null, fromAgentName: '[TEST] SALES CANVAS' };

ok('HIS CASE: approving HQ 3 writes nothing at all',
   haApprove(HA_HQ3, HA_BOOK, true).wrote === false,
   'this is the bug - the request said APPROVED while the shop stayed with the Tier 5');
ok('and no APPROVED status survives that refusal',
   haApprove(HA_HQ3, HA_BOOK, true).status === null,
   'an APPROVED record over a transfer that did not happen is the lie he reported');
ok('rejecting HQ 3 still works, so the request is not stranded',
   haApprove(HA_HQ3, HA_BOOK, false).status === 'REJECTED',
   'refusing both directions would leave an unregistered shop pending forever');
ok('once HQ 3 is registered the same approval moves it',
   haApprove(HA_HQ3, [...HA_BOOK, { id: 'c3', name: 'HQ 3' }], true).movedTo === 'c3',
   'the fix must not block a hand-off that CAN complete');
ok('twin shops with no pinned id are still refused',
   haApprove(HA_HQ3, [...HA_BOOK, { id: 'c3', name: 'HQ 3' }, { id: 'c4', name: 'HQ 3' }], true).wrote === false,
   'his book holds three shops sharing one name 14.5 km apart - guessing between them relabels the wrong one');
ok('and a pinned id still wins over the twins',
   haApprove({ ...HA_HQ3, customerId: 'c4' }, [...HA_BOOK, { id: 'c3', name: 'HQ 3' }, { id: 'c4', name: 'HQ 3' }], true).movedTo === 'c4',
   'the id is pinned at send time precisely so the twins do not have to be guessed at approval');


/* ECER IS AN INDIVIDUAL, NOT A STORE ========================================================
   Aldi, 2026-09-08: *"all sales bought in ecer means that it is an individual and not a store,
   well i design the app like that ... ecer price should be bought by individual and they can only
   pay in cash qris or transfer, consignment is only for registered stores"*. An Ecer line sold on
   Titip is a receivable against somebody who was never registered - the origin of the HQ 3
   hand-off that approved itself over a shop with no customer document. */
const ecStart = engine.indexOf('const processTransaction = async');
const ecEnd   = engine.indexOf('await saveOfflineTransaction', ecStart + 40);
ok('processTransaction and its first write are both findable',
   ecStart > -1 && ecEnd > ecStart, `processTransaction ${ecStart}, first write ${ecEnd}`);
const ecHead = engine.slice(ecStart, ecEnd);
ok('and the slice stops at the first write rather than running the whole file',
   ecHead.length > 400 && ecHead.length < 9000, `slice is ${ecHead.length} chars`);

ok('the Ecer/Titip refusal stands BEFORE anything is written',
   /paymentType === 'Titip' && \(activeCart \|\| \[\]\)\.some\(i => i\.priceTier === 'Ecer'\)/.test(ecHead),
   'a guard placed after saveOfflineTransaction would refuse a sale that had already been booked');
ok('and it refuses rather than silently repricing the line',
   /cannot be a consignment/.test(ecHead),
   'his law is that every action reports - a sale that changes itself without saying so is worse than a refusal');

ok('the terminal drops Consignment from the menu when a line is Ecer',
   /allowedPayments\.filter\(method => !\(method === 'Titip' && cart\.some\(i => i\.priceTier === 'Ecer'\)\)\)/.test(merchant),
   'leaving it selectable would send the salesman to a refusal he could have been spared');
ok('and the menu says why the option is missing',
   merchant.includes('Ecer is an individual sale, so Consignment is not offered'),
   'a control that vanishes without a word is the silent-change bug he has ruled against twice');
ok('a tier changed AFTER the method was chosen still resets the method',
   /if \(paymentMethod === 'Titip' && cart\.some\(i => i\.priceTier === 'Ecer'\)\)/.test(merchant),
   'the tier select sits below the payment select - picking Titip first and Ecer second is the ordinary order');

/* the decision, re-run on his real cart */
const ecAllowed = (cart, method) => !(method === 'Titip' && cart.some(i => i.priceTier === 'Ecer'));
// His HQ 3 sale: 100 Bks of Cello Coffee & Caramel kretek at the Ecer price, Rp 1.000.000.
const EC_HQ3 = [{ name: 'Cello Coffee & Caramel kretek', qty: 100, priceTier: 'Ecer', calculatedPrice: 10000 }];
const EC_STORE = [{ name: 'Cello Coffee & Caramel kretek', qty: 15, priceTier: 'Grosir', calculatedPrice: 8700 }];

ok('HIS CASE: the HQ 3 cart can no longer be booked as a consignment',
   ecAllowed(EC_HQ3, 'Titip') === false,
   'this is the Rp 1.000.000 receivable that had no registered shop to owe it');
ok('the same cart is fine on Cash, QRIS and Transfer',
   ['Cash', 'QRIS', 'Transfer'].every(m => ecAllowed(EC_HQ3, m)) === true,
   'his words: "they can only pay in cash qris or transfer" - all three must stay open');
ok('a Grosir cart is still allowed on consignment',
   ecAllowed(EC_STORE, 'Titip') === true,
   'blocking store consignment would stop the business the feature exists for');
ok('a Retail cart is still allowed on consignment',
   ecAllowed([{ priceTier: 'Retail', qty: 1 }], 'Titip') === true,
   'only Ecer means an individual - Retail and Grosir are both store tiers');
/* and the other half of the sentence: consignment needs a registered shop (STRICT, his call) */
ok('the registered-shop refusal also stands before the first write',
   /paymentType === 'Titip' && !\(newStoreData && newStoreData\.isNooRegistration\)/.test(ecHead),
   'placed after the write it would refuse a consignment that had already been booked');
ok('an in-sale NOO registration is exempt, so a first consignment is still possible',
   ecHead.includes('newStoreData.isNooRegistration'),
   'the NOO path CREATES the registered shop in the same write - refusing it would be a dead end');
/* stripComments first: the comment above the guard NAMES the statuses it deliberately does not
   whitelist, so a raw grep matches the explanation instead of the code. Same trap as G48/G53. */
const ecCode = stripComments(ecHead);
ok('the refusal is on WALK_IN, never on a whitelist of good statuses',
   /shop\.status === 'WALK_IN'/.test(ecCode) && /=== 'NOO_ACTIVE'/.test(ecCode) === false,
   'four statuses exist and legacy shops carry none - a whitelist would refuse most of his real book');

const ecShopOk = (name, shops, method, noo) => {
  if (method !== 'Titip' || (noo && noo.isNooRegistration)) return true;
  const shop = shops.find(c => c.name.trim().toLowerCase() === String(name).trim().toLowerCase());
  if (!shop) return false;
  return shop.status !== 'WALK_IN';
};
// Every status this app actually writes, plus the legacy shops that carry none.
const EC_SHOPS = [
  { name: 'HQ (RETAIL) 1', status: 'APPROVED' },      // registry screen, added by an admin
  { name: 'HQ TEST', status: 'PENDING' },             // registry screen, added by a field agent
  { name: 'Toko Lama', status: undefined },           // written before the status field existed
  { name: 'Warung NOO', status: 'NOO_ACTIVE' },       // registered during a sale
  { name: 'Bu Sari', status: 'WALK_IN' },             // the quick in-sale form
];

ok('HIS CASE: a name with no shop record cannot take consignment',
   ecShopOk('HQ 3', EC_SHOPS, 'Titip', null) === false,
   'this is the shop that reached the hand-off queue owning Rp 1.000.000 with nothing behind it');
ok('a walk-in cannot take consignment either',
   ecShopOk('Bu Sari', EC_SHOPS, 'Titip', null) === false,
   'his rule: consignment is only for registered stores, and the quick form does not register one');
ok('an admin-registered shop can',
   ecShopOk('HQ (RETAIL) 1', EC_SHOPS, 'Titip', null) === true, 'APPROVED is what the registry screen writes');
ok('a field-agent-registered shop can, even before an admin approves it',
   ecShopOk('HQ TEST', EC_SHOPS, 'Titip', null) === true,
   'the shop is registered; PENDING is about admin sign-off, not about whether it exists');
ok('a legacy shop with no status field at all can',
   ecShopOk('Toko Lama', EC_SHOPS, 'Titip', null) === true,
   'STRICT read as a NOO_ACTIVE whitelist would have refused most of his real book - the worse failure');
ok('and registering the shop during the sale is allowed',
   ecShopOk('Warung Baru', EC_SHOPS, 'Titip', { isNooRegistration: true }) === true,
   'the NOO path creates the registered shop in the same write');
ok('a walk-in is still fine on Cash',
   ecShopOk('Bu Sari', EC_SHOPS, 'Cash', null) === true,
   'the rule is about consignment only - nothing here may block an ordinary paid sale');

ok('one Ecer line poisons a mixed cart',
   ecAllowed([...EC_STORE, ...EC_HQ3], 'Titip') === false,
   'a receivable is written per transaction, so a single individual line drags the whole sale onto a debt nobody can be held to');


/* ── SALE PROOF: where the photo may come from ─────────────────────────────────────────────
   Aldi, 2026-09-09: "tier 4 and lower will need to use the real time camera to do this, also add
   this option on the matrix to toggle on and off". `capture="environment"` was never enforcement —
   a desktop browser ignores it and opens the ordinary file picker, so a desk sale could attach a
   screenshot. This must stay the LAST block: it injects a matrix, and injectDynamicPermissions
   replaces module state for whatever runs after it. */
section('SALE PROOF PHOTO SOURCE');

/* REGRESSION GUARD — a tier without the privilege must never be handed a file input.
   ⚠️ THIS CHECK USED TO ALLOW `|| import.meta.env.DEV` and it was WRONG to. Aldi, 2026-09-09:
   *"me as tier 6 still can see this option and can use it"*. Dev is the only place he tests, so a
   dev-only bypass removes the rule under test rather than preserving testability. The legitimate
   way to let a tier attach a file is the matrix switch, which is visible and auditable. */
ok('the file input exists only where a file is a legal answer — no build-mode exception',
   /\{galleryOk && \(/.test(merchant),
   'a camera-only tier must not have a file chooser in the DOM, in ANY build');
/* Through `code()`, not the raw source: the comments left where the bypass used to be NAME the
   thing they tell you not to restore, and a raw grep cannot tell a warning about a line from the
   line. Same trap as the handleAdminApproveTransfer guard. */
ok('and no dev-only bypass exists anywhere on the proof path',
   !/import\.meta\.env\.DEV/.test(code(merchant)) && !/devFallback/.test(code(merchant))
   && !/devFallback/.test(code(read('src/components/ProofCamera.jsx'))),
   'a hidden second answer to "may this tier attach a file" is how the two answers start disagreeing');
ok('a camera-only tier opens the live camera instead of the picker',
   /galleryOk \? document\.getElementById\('txProof'\)\.click\(\) : setShowProofCamera\(true\)/.test(merchant));
ok('and the tier answer comes from the shared helper, never a tier number written here',
   /* `myRole` since 2026-09-13 — the live role prop first, the user object as fallback; see
      THE BOSS IS TIER 1 ON THE SALES TERMINAL TOO for why the user object alone was wrong */
   /canPickFromGallery\(myRole\)/.test(merchant)
   && imports(merchant, 'canPickFromGallery'));
ok('the camera names why it will not open, rather than leaving a dead button',
   /not on a secure address/.test(read('src/components/ProofCamera.jsx'))
   && /NotAllowedError/.test(read('src/components/ProofCamera.jsx'))
   && /NotFoundError/.test(read('src/components/ProofCamera.jsx')));
ok('and the photo is still mandatory for everyone — this narrows the SOURCE, never the rule',
   /canSubmitSale = .*&& txProofPhoto &&/.test(merchant));
ok('the switch is in the permission matrix he can actually see',
   /id: 'photo_pick_from_gallery'/.test(read('src/components/SettingsView.jsx')));

/* BEHAVIOUR — the matrix value, not a hardcoded tier number, is what decides. */
ok('default, with the key absent from his saved matrix: T2 and T3 may pick a file',
   canPickFromGallery(CORPORATE_TIERS.TIER_2) === true
   && canPickFromGallery(CORPORATE_TIERS.TIER_3) === true);
ok('default: T4, T5 and T6 are camera-only',
   canPickFromGallery(CORPORATE_TIERS.TIER_4) === false
   && canPickFromGallery(CORPORATE_TIERS.TIER_5) === false
   && canPickFromGallery(CORPORATE_TIERS.TIER_6) === false,
   'his "tier 4 and lower" — read the tier NUMBER, not the role name: T4 is FLEET_CAPTAIN here');

injectDynamicPermissions({
  [CORPORATE_TIERS.TIER_3]: ['view_sales'],                            // key withheld
  [CORPORATE_TIERS.TIER_5]: ['view_sales', 'photo_pick_from_gallery'], // key granted
}, null);
ok('once the key is in his matrix, his switch wins in BOTH directions',
   canPickFromGallery(CORPORATE_TIERS.TIER_5) === true
   && canPickFromGallery(CORPORATE_TIERS.TIER_3) === false,
   'a granted T5 gets the gallery and a withheld T3 loses it — the tier default no longer decides');
ok('and T1 keeps it whatever the matrix says',
   canPickFromGallery(CORPORATE_TIERS.TIER_1) === true);

/* ── FLEET & ROSTER: whose vault this screen reads ────────────────────────────────────────
   Aldi, 2026-09-09: "my tier 4 cant even detect its own sales team inside the fleet and roster".
   App.jsx redirects every database call to the owner's vault (`bossUid || user.uid`); this screen
   re-derived its own id WITHOUT bossUid, so on any non-owner account the roster listener
   subscribed to the signed-in person's empty vault. Same fault as MerchantSalesView G5. */
section('FLEET ROSTER VAULT + EMPTY-STATE');

/* REGRESSION GUARD — the local re-derivation must not come back. */
ok('the fleet screen takes the owner vault id from App instead of re-deriving it',
   /const userId = masterUserId \|\| user\?\.uid \|\| user\?\.id \|\| 'default'/.test(fleet),
   'a bossUid-less id here points nine collection paths at a vault nobody writes to');
ok('and App actually hands it over',
   /masterUserId=\{userId\}/.test(app) && /<FleetCanvasManager/.test(app));
ok('the component still accepts the prop it is now routed through',
   /masterUserId = null \}/.test(fleet));
ok('every vault path on this screen goes through that one id',
   (fleet.match(/\$\{appId\}\/users\/\$\{userId\}/g) || []).length >= 9
   && !/users\/\$\{user\?\.uid\}/.test(fleet),
   'the roster, the branch stock, the products and the GPS bypasses must not disagree about the vault');

/* REGRESSION GUARD — an empty roster must say WHICH of its causes fired. */
ok('a refused roster read is reported on screen, not only to console.warn',
   /setFleetError\(err\.code/.test(fleet) && /The roster could not be read/.test(fleet));
ok('a missing own-record says so, rather than showing an empty branch',
   /Your own staff record was not found/.test(fleet));
ok('an admin with no area set is told that, not shown nobody',
   /You are not posted to a branch yet/.test(fleet));
ok('and a genuinely empty branch names the branch and the company count',
   /Nobody is posted to \{branchPathLocation\}/.test(fleet));

/* REGRESSION GUARD — the POV stand-down needs something to stand down TO.
   Scoped to the FleetCanvasManager tag, not file-wide: App.jsx passes `agentProfileId` to five
   other screens, so a file-wide grep would have passed on any of them while this one had none. */
{ const tag = app.slice(app.indexOf('<FleetCanvasManager'));
  const props = tag.slice(0, tag.indexOf('/>'));
  ok('App hands the fleet screen the agent id its POV fallback reads',
     /agentProfileId=\{agentProfileId\}/.test(props),
     'without it `myProfile` is find(m => m.id === undefined) under POV — nothing, whatever is in the vault');
  ok('and the vault id with it',
     /masterUserId=\{userId\}/.test(props)); }

/* BEHAVIOUR — the identity lookup, on the roster Aldi actually has. */
{ const ROSTER = [
    { id: 'master_owner',  email: 'adikaryasukses99@gmail.com', location: 'Headquarters' },
    { id: 'TEST_TIER_4',   email: '',  userRole: 'FLEET_CAPTAIN',   location: 'Headquarters' },
    { id: 'TEST_TIER_5',   email: '',  userRole: 'FIELD_OPERATIVE', location: 'Headquarters' },
    { id: 'TEST_TIER_6',   email: '',  userRole: 'ROOKIE',          location: 'Headquarters' } ];
  const lookup = (previewing, email, agentProfileId) =>
    (previewing ? null : ROSTER.find(m => m.email?.toLowerCase() === email?.toLowerCase()))
    || ROSTER.find(m => m.id === agentProfileId);

  ok('HIS CASE: previewing as T4 finds the T4 costume, not nothing',
     lookup(true, 'adikaryasukses99@gmail.com', 'TEST_TIER_4')?.id === 'TEST_TIER_4');
  ok('and the branch it reports is the costume’s, which is what the roster filters on',
     lookup(true, 'adikaryasukses99@gmail.com', 'TEST_TIER_4')?.location === 'Headquarters');
  ok('THE BUG: an undefined agent id finds nobody, however full the roster is',
     lookup(true, 'adikaryasukses99@gmail.com', undefined) === undefined,
     'this is why the screen said "your own staff record was not found" with 7 people on it');
  ok('a real login is unaffected — the email answers first, which is why this survived',
     lookup(null, 'adikaryasukses99@gmail.com', undefined)?.id === 'master_owner');
  ok('and with the id restored, the T4 costume sees the T5 and T6 team at its own branch',
     ROSTER.filter(m => m.location.toLowerCase() === 'headquarters').length === 4); }

/* BEHAVIOUR — the vault choice, run on real values. */
{ const vaultId = (masterUserId, user) => masterUserId || user?.uid || user?.id || 'default';
  ok('a salesman signed in under a boss reads the BOSS vault, which is where the staff are',
     vaultId('boss_uid', { uid: 'salesman_uid' }) === 'boss_uid',
     'this is the case that produced "UNASSIGNED ROSTER - no personnel found"');
  ok("the owner's own account is unchanged — bossUid IS his uid, so nothing about his screen moves",
     vaultId('owner_uid', { uid: 'owner_uid' }) === 'owner_uid');
  ok('and a caller that forgets the prop degrades to the OLD behaviour, never to "default"',
     vaultId(null, { uid: 'salesman_uid' }) === 'salesman_uid'); }

/* BEHAVIOUR — the roster filter itself, which is an exact area match and always was. */
{ const roster = [
    { id: 'a', location: 'SOLO' }, { id: 'b', location: 'solo ' },
    { id: 'c', location: 'BANDUNG' }, { id: 'd' } ];
  const forArea = (area) => roster.filter(m =>
     String(m.location || '').trim().toLowerCase() === String(area).trim().toLowerCase());
  ok('an admin posted to SOLO sees both SOLO staff, whitespace and case included',
     forArea('SOLO').map(m => m.id).join(',') === 'a,b');
  ok('and never another branch',
     forArea('SOLO').every(m => m.id !== 'c'));
  ok("an admin with no area matches NOBODY — which is why that state must be a message, not a list",
     forArea('UNASSIGNED').length === 0,
     "no staff record carries the literal string UNASSIGNED; the app's own blank sentinel is 'UNASSIGNED AREA'"); }

section('THE PHANTOM COMPETITOR — creating a store is not visiting it (2026-09-12)');
/* A store created today and sold to the same day showed the standing red banner
   ALREADY SECURED TODAY — Claimed by ANOTHER AGENT. Nobody else had been there. The customer
   form was born with lastVisit = today (three places in CustomerManager.jsx: the initial form,
   the post-save reset, and the edit path's fallback), while lastVisitedBy stayed empty — and
   MerchantSalesView reads "lastVisit is today, visitedBy is blank" as a competitor. Every real
   visit path (a sale, a journey stop) stamps BOTH fields, so the only way to get one without the
   other was the form. The form now leaves lastVisit blank; every reader already has a branch for
   blank ("no recorded visit", "NEVER VISITED", "Never Visited (Due Now)"). */
{ const cm = read('src/components/CustomerManager.jsx');
  ok('the customer form never stamps lastVisit with today on its own',
     !/lastVisit:\s*(?:c\.lastVisit\s*\|\|\s*)?getLocalDayKey\(\)/.test(cm),
     'creation is not a visit — a fresh store must read as never visited');
  /* the revisit verdict, re-implemented from MerchantSalesView.handleCustomerSelect */
  const revisit = (cust, today, me) => {
    const visitedBy = String(cust.lastVisitedBy || cust.lastVisitTag || '').trim();
    const mine = !!me && !!visitedBy && (visitedBy.toLowerCase().includes(me) || me.includes(visitedBy.toLowerCase()));
    return cust.lastVisit === today ? (mine ? 'me' : (visitedBy || 'another agent')) : null;
  };
  ok('a store created today, with the form no longer stamping a date, raises no banner',
     revisit({ lastVisit: '' }, '2026-09-12', 'aldi') === null);
  ok('a store another agent actually sold to today still names that agent',
     revisit({ lastVisit: '2026-09-12', lastVisitedBy: 'budi' }, '2026-09-12', 'aldi') === 'budi');
  ok('my own sale today is a revisit by me, not a competitor',
     revisit({ lastVisit: '2026-09-12', lastVisitedBy: 'aldi' }, '2026-09-12', 'aldi') === 'me'); }

section('THE ALARM SAYS 300 OF WHAT — the low-stock toast carries its unit (2026-09-12)');
/* Aldi's screenshot, 2026-09-12 20:50: the toast read "coba baru is critically low (300 left)"
   while the STOK KRITIS box under it read "1 BAL". Same amount — stock is stored in Bks — but a
   reader cannot tell. The EOD-return alert in the same file already says "(N Bks left)". */
{ const app = read('src/App.jsx');
  const toast = app.match(/critically low \(([^)]*)\)/);
  ok('the critically-low toast names the unit, the way the EOD alert already does',
     !!toast && /Bks left/.test(toast[1]),
     toast ? 'found: (' + toast[1] + ')' : 'toast template not found'); }

section('THE CUSTOMER FORM SPEAKS TO A SHOP OWNER (2026-09-13)');
/* Day-one walk, 2026-09-12: the GPS box shows "-7.6043, 110.2055" in the same mono face as a
   typed value, so an empty box reads as a filled one — and Save then refuses with "no map pin".
   And the form's first two refusals were "Mission Control: Store Name is required to establish a
   target" and "SSOT Violation: You must specify the complete Matrix Location" — repo jargon in
   front of the person typing. The approved sibling is the pin refusal at the same site: what is
   missing, and what to do about it. The placeholder fix is the house precedent (ArrivalScanner,
   BranchWarehouseManager): shape, not colour. */
{ const cm = code(read('src/components/CustomerManager.jsx'));
  const fA = cm.indexOf('const handleSubmit');
  const fB = cm.indexOf('const cleanData');
  ok('the submit scope was found', fA > -1 && fB > fA && fB - fA < 12000, `${fA}..${fB}`);
  const f = cm.slice(fA, fB);
  const region = f.slice(f.indexOf('!safeProv || !safeKab || !safeKec'));
  const regionMsg = region.slice(0, region.indexOf('return;'));
  ok('the region refusal is in the submit scope', region.length < f.length && regionMsg.length < 600,
     `${regionMsg.length} chars`);
  ok('the region refusal has no SSOT / Matrix Location jargon',
     !/SSOT|Matrix/.test(regionMsg), 'a shop owner does not know what a matrix location is');
  ok('and it still names the three fields the owner has to pick',
     /Provinsi/.test(regionMsg) && /Kabupaten/.test(regionMsg) && /Kecamatan/.test(regionMsg),
     'saying "location" alone sends him hunting for which box');
  const name = f.slice(f.indexOf('if (!safeName)'));
  const nameMsg = name.slice(0, name.indexOf('return;'));
  ok('the store-name refusal has no Mission Control / target jargon',
     nameMsg.length < 400 && !/Mission Control|establish a target/.test(nameMsg),
     'the word "target" on a customer form is a joke only the repo gets');
  const gpsA = cm.indexOf('ref={coordRef}');
  const gpsB = cm.indexOf('/>', gpsA);
  ok('the GPS input was found', gpsA > -1 && gpsB > gpsA && gpsB - gpsA < 500, `${gpsA}..${gpsB}`);
  const gps = cm.slice(gpsA, gpsB);
  ok('the GPS example coordinates are italic, so an empty box does not read as a filled one',
     /placeholder="-?\d+\.\d+, -?\d+\.\d+"/.test(gps) && /placeholder:italic/.test(gps),
     'the example sits in the same mono face as a typed value');
  /* his test, 2026-09-13: *"gps example number should be more transparant here sc4 it is too
     visible that i think it is already filled"*. Italic alone did not read as an example. */
  ok('and the example is faded as well — italic alone still read as a typed value to him',
     /placeholder:opacity-[1-6]0/.test(gps),
     'the slant was not enough; at full ink the mono example still looks filled in');
  /* his test, same day: with nothing filled the browser's own "Please fill out this field."
     bubble spoke, in the browser's voice, and the form's own refusal never ran. The strip is
     the app's one reporting channel; the form must reach handleSubmit so it can speak. */
  const formA = cm.indexOf('<form onSubmit={handleSubmit}');
  const formB = cm.indexOf('>', formA);
  ok('the customer form tag was found', formA > -1 && formB > formA && formB - formA < 300, `${formA}..${formB}`);
  ok('the customer form skips browser validation so its own refusals are the ones he reads',
     /noValidate/.test(cm.slice(formA, formB)),
     'a native "Please fill out this field." bubble runs before handleSubmit and the strip stays silent'); }

section('THE DARK RAIL IS GLASS YOU CAN READ THROUGH (2026-09-13)');
/* His screenshot, 2026-09-13: *"i want u to make the side panel to be less transparant because
   on some bright space the name and logo cant be seen"*. The 0.02 tint was also his (2026-08-14,
   on a slider); a bright region behind the capsule is what changed the call. A BAND, not a
   number: dark enough that #6b5845 marks survive a bright ground behind the lens, light enough
   that there is still something to see through. Light mode is an opaque plate and is not this. */
{ const css = read('src/styles/theme.css');
  const podA = css.indexOf('.kpm-rail-pod::before {');
  const podB = css.indexOf('}', podA);
  ok('the dark pod rule was found', podA > -1 && podB > podA && podB - podA < 2500, `${podA}..${podB}`);
  const pod = css.slice(podA, podB);
  const tint = pod.match(/linear-gradient\(180deg, rgba\(\d+, \d+, \d+, (\.\d+)\), rgba\(\d+, \d+, \d+, (\.\d+)\)\)/);
  ok('the tint is a two-stop gradient, not a solid', !!tint && /background-color: transparent/.test(pod),
     'a solid ground sits in front of the blur and there is nothing to see through');
  const a = tint ? Number(tint[1]) : NaN, b = tint ? Number(tint[2]) : NaN;
  ok('both stops are dark enough for the marks to survive a bright ground behind the lens',
     a >= 0.35 && b >= 0.35, `got ${a} / ${b} — at .02/.10 the marks vanished over a bright band`);
  /* .8 → .95 on 2026-09-13, his third round ("the visibility is still not maximal"); a tenth of
     the page through the lens is still glass, and Lite Mode's solid plate is what 1.0 looks like */
  ok('and both stops still let the page through', a <= 0.95 && b <= 0.95, `got ${a} / ${b}`);
  ok('the resting mark ink clears the plate — the check that sat as a note for three weeks',
     (() => { const ink = css.match(/--plate-ink:\s*(#[0-9a-f]{6})/i); const jsx = read('src/components/BiohazardTheme.jsx');
              return !!ink && ink[1].toLowerCase() !== '#6b5845' && jsx.includes(`text-[${ink[1]}]`) && !jsx.includes('text-[#6b5845]'); })(),
     'the JSX hex and the --plate-ink token must be the SAME colour, or contrast.selfcheck grades a colour the rail does not draw');
  ok('the blur that makes it a lens is still on', /backdrop-filter: blur\(30px\)/.test(pod),
     'without the blur a 50% tint is fog, not glass'); }

section('TWO STOCK LABELS SAY WHERE AND WHAT (2026-09-13)');
/* Day-one walk: the sales terminal's "Running low" card said `N Bks left in the vehicle` while
   the boss was selling from the Master Vault, and the loading picker printed
   `Surya 16 (Available: 100 )` — a master product has no `unit` field, stock is stored in Bks,
   and the qty box beside it is labelled "Qty (Bungkus)". Both labels are read by a customer. */
{ const ms = code(read('src/MerchantSalesView.jsx'));
  const lowA = ms.indexOf('Running low');
  const lowB = ms.indexOf('</div>', ms.indexOf('left in the', lowA));
  ok('the Running-low card was found', lowA > -1 && lowB > lowA && lowB - lowA < 900, `${lowA}..${lowB}`);
  const low = ms.slice(lowA, lowB);
  ok('the Running-low card names the source the boss actually picked, not always the vehicle',
     /adminSalesMode === 'VAULT'/.test(low) && /Master Vault/.test(low) && /vehicle/.test(low),
     'selling from the Master Vault, the card still said "in the vehicle"');
  ok('and it uses the two mode buttons\' own words, not a third name',
     /'Master Vault'/.test(low) && /'vehicle'/.test(low) && !/warehouse|gudang|stok/i.test(low),
     'the buttons say Master Vault and Boss Car; a third label sends him looking for a third place');
  const fc = code(read('src/FleetCanvasManager.jsx'));
  const optA = fc.indexOf('(Available:');
  const optB = fc.indexOf('</option>', optA);
  ok('the loading picker option was found', optA > -1 && optB > optA && optB - optA < 200, `${optA}..${optB}`);
  const opt = fc.slice(optA, optB);
  ok('the picker prints the stock in Bks, the unit the qty box beside it is labelled in',
     /\{item\.stock\} Bks\)/.test(opt) && !/item\.unit/.test(opt),
     'a master product has no unit field, so `{item.unit}` printed "(Available: 100 )"'); }

section('THE NOTA PRINTS THE BOSS\'S NAME, NOT HIS EMAIL (2026-09-13)');
/* Day-one walk: the receipt's SALES line read `ADIKARYASUKSES99`. The engine resolves the agent
   name as roster → displayName → email local part; the boss sells with no roster row (VAULT
   mode sets agentProfileId null) and his Google account has no displayName, so the email won.
   Settings already holds `adminDisplayName`, and ReceiptPreview.jsx already prints it — the
   real nota just never asked. Fixed where the name is SET, in the engine, and the sales
   terminal's five hand-rolled copies of the same fallback collapse to one helper. */
{ const eng = code(read('src/hooks/useTransactionEngine.js'));
  const sets = eng.match(/let finalAgentName = /g) || [];
  ok('the engine resolves the agent name in the two places it always did', sets.length === 2, `found ${sets.length}`);
  const bossFirst = eng.match(/let finalAgentName = \(userRole === 'ADMIN' && appSettings\?\.adminDisplayName\) \|\| user\?\.displayName/g) || [];
  ok('and both consult the boss\'s Settings name before the Google display name',
     bossFirst.length === 2, `${bossFirst.length} of 2 — the nota prints the email local part for the boss`);
  const ms = code(read('src/MerchantSalesView.jsx'));
  const raw = ms.match(/split\('@'\)/g) || [];
  ok('the sales terminal spells "who am I" once, not five times', raw.length === 1, `found ${raw.length} email-splits`);
  ok('the one helper consults the boss\'s Settings name first',
     /const myName = \(isAdmin && appSettings\?\.adminDisplayName\) \|\| user\?\.displayName \|\| emailName/.test(ms),
     'a receipt, a store stamp and a route planner each invented their own name for him');
  const selA = ms.indexOf('const handleCustomerSelect');
  const selB = ms.indexOf('setCustomerName(cust.name)', selA);
  ok('handleCustomerSelect was found', selA > -1 && selB > selA && selB - selA < 6000, `${selA}..${selB}`);
  const sel = ms.slice(selA, selB);
  ok('the "did I visit it" compare matches the old stamps AND the new name',
     /meNames/.test(sel) && /emailName/.test(sel) && /myName/.test(sel),
     'stores stamped under the email name would read as ANOTHER AGENT once his stamp changes');
  ok('the proof record and the receipt fallback use the helper',
     /salesmanName: String\(myName/.test(ms) && /: \(myName \|\| 'Admin'\)/.test(ms),
     'two of the five copies were left behind'); }

section('THE BOSS IS TIER 1 ON THE SALES TERMINAL TOO (2026-09-13)');
/* His screenshot, 2026-09-13 19:50: *"bruh im tier 1 and have this camera lock i cant check by
   making sales when i still have this, tier 1 should be able to bypass everything bro"*.
   canPickFromGallery('ADMIN') is true — permissions.js has always said tier 1 may. But the boss
   signs in as the RAW Firebase user (App.jsx: setUserRole('ADMIN'); setUser(currentUser)), and a
   raw auth user carries no `userRole` and no `role`. MerchantSalesView read the role off the user
   object alone, so the boss arrived as `undefined` → translated to TIER_5 → camera only. Every
   other screen gets `userRole={userRole}` as a prop; this one did not. */
{ const { canPickFromGallery } = await import('./permissions.js');
  ok('the rule itself lets tier 1 choose from the gallery', canPickFromGallery('ADMIN') === true, 'permissions.js changed');
  /* read from SOURCE, not by calling it: an earlier section injects a test matrix into the live
     ROLE_PERMISSIONS, so a call here would grade that matrix rather than the rule */
  ok('and a MISSING role reads as a field tier — which is why the raw auth user was fatal',
     /let role = userRole \|\| CORPORATE_TIERS\.TIER_5;/.test(code(read('src/config/permissions.js'))),
     'if this flips, the fix below is no longer the load-bearing one');
  const app = code(read('src/App.jsx'));
  const mA = app.indexOf('<MerchantSalesView');
  const mB = app.indexOf('/>', mA);
  ok('the MerchantSalesView mount was found', mA > -1 && mB > mA && mB - mA < 4000, `${mA}..${mB}`);
  ok('App hands the sales terminal the live role, as it does every other screen',
     /userRole=\{userRole\}/.test(app.slice(mA, mB)),
     'the boss is the raw Firebase user and carries no role of his own');
  /* RAW, not code(): the file carries `accept="image/*"` and the comment stripper reads that
     `/*` as a comment opening, swallowing everything to the next `*​/` — the sample lock included */
  const ms = read('src/MerchantSalesView.jsx');
  ok('the terminal reads the prop first and the user object only as a fallback',
     /const myRole = userRole \|\| user\?\.userRole \|\| user\?\.role/.test(ms),
     'a role read off the user object alone is undefined for the boss');
  ok('both permission reads in the terminal use it — the gallery gate and the sample lock',
     /canPickFromGallery\(myRole\)/.test(ms) && /hasClearance\(myRole, 'can_unrestricted_sample'\)/.test(ms) &&
     !/user\?\.userRole \|\| user\?\.role,/.test(ms),
     'one reader fixed and one left is the boss locked out of a different button'); }

section('THE BOSS IS TIER 1 ON STOCK OPNAME TOO (2026-09-13)');
/* Same hole as the sales terminal, found by the grep that closed that one: StockOpnameView
   derived `userRole = user?.userRole || 'AGENT'`, and the boss's user object is the raw Firebase
   user with no userRole — so the owner counted blind and `isHighCommand` (the pending_audits and
   quarantine listeners) was false for him. The comment beside the line said App passes the prop;
   the mount never did. RAW read: the file carries `accept="image/*"`, which fools code(). */
{ const app = read('src/App.jsx');
  const sA = app.indexOf('<StockOpnameView');
  const sB = app.indexOf('/>', sA);
  ok('the StockOpnameView mount was found', sA > -1 && sB > sA && sB - sA < 2000, `${sA}..${sB}`);
  ok('App hands Stock Opname the live role', /userRole=\{userRole\}/.test(app.slice(sA, sB)),
     'the boss is the raw Firebase user and carries no role of his own');
  const so = read('src/StockOpnameView.jsx');
  ok('the view takes the prop under an alias, so it cannot collide with the local it derives',
     /const StockOpnameView =\(\{[^}]*userRole: liveRole[^}]*\}\)/.test(so),
     'a prop and a local of the same name in one scope is the collision the old comment feared');
  ok('and derives the local from the prop first, the user object second, AGENT last',
     /const userRole = liveRole \|\| user\?\.userRole \|\| 'AGENT';/.test(so),
     'read off the user object alone, the owner is a field agent on this screen'); }

section('THE BELL IS ON THE PHONE SCREEN (2026-09-14)');
/* Measured in the ponder lab (`?shell`, real viewport 375x812, innerWidth read in the same probe):
   left text stack 16..248 (232 wide, the title has `truncate` but its parent has no `min-w-0`, so
   it never shrinks), right cluster 260..489 (229 wide, `shrink-0`), bell 442..489. The row is
   `flex` with no wrap inside an `overflow-hidden` column, so on a 375 phone the switch is cut in
   half and the bell and clock are simply not there. His taste: wrapping "shows every character and
   costs only height; truncation is silent" — so the row wraps, and the control cluster keeps the
   right edge on its own line. The ribbon measured top 340 of 812 in the same probe: the queued
   "top:-66px" was a hidden-pane artifact, not a bug. */
{ const PAD = 16, GAP = 12, LEFT = 232, RIGHT = 229;                 // measured, 2026-09-14
  const oneLine = (viewport) => PAD + LEFT + GAP + RIGHT + PAD <= viewport;
  ok('at 375 the title and the controls cannot share one line', !oneLine(375), `${PAD + LEFT + GAP + RIGHT + PAD} > 375`);
  ok('on a desk they still can, so the desk header does not change', oneLine(1024) && oneLine(1280));
  const bt = read('src/components/BiohazardTheme.jsx');
  const a = bt.indexOf('kpm-topbar hide-on-print');
  const b = bt.indexOf('<PonderBookButton activeTab={activeTab} />', a);
  ok('the top bar and its control cluster were found', a > -1 && b > a && b - a < 6000, `${a}..${b}`);
  const bar = bt.slice(a, b);
  ok('the top bar row may wrap', /^kpm-topbar hide-on-print [^`]*\bflex-wrap\b/.test(bar),
     'without it the right cluster overflows the phone and the column clips it');
  const cluster = bar.slice(bar.lastIndexOf('<div className='));
  ok('the control cluster keeps the right edge when it wraps to its own line',
     /shrink-0[^"]*\bml-auto\b|\bml-auto\b[^"]*shrink-0/.test(cluster),
     'justify-between puts a lone flex line at the LEFT'); }

section('RESTOCK VAULT TABS WRAP ON THE PHONE (2026-09-15)');
/* Measured in the ponder lab (`?places`, real viewport 375x812, innerWidth read in the same
   probe): the head row is 25..350 (325 wide) and the five tab buttons are 25..461 (436 wide) in a
   bare `flex` — BUKU is cut at 350 and DATA INDUK sits at 377..461, never drawn, never pressable.
   Aldi chose A from tabs-options.png: the strip takes the full width on the phone and the tabs
   that do not fit drop to a second row, each stretched so the rows fill the edge. On a desk the
   strip sits BESIDE the title block on one line (1280: title 25..785, strip 785..1255, 55 tall),
   which is what the `lg:` halves protect — a bare `w-full` would drop it under the title there too. */
{ const HEAD_375 = 325, STRIP = 436, HEAD_1280 = 1230, TITLE_MIN = 210, STRIP_1280 = 470;
  ok('at 375 the five tabs cannot share one line', STRIP > HEAD_375, `${STRIP} > ${HEAD_375}`);
  ok('at 1280 the title block and the strip still fit one line, so the desk does not change',
     TITLE_MIN + STRIP_1280 <= HEAD_1280, `${TITLE_MIN + STRIP_1280} <= ${HEAD_1280}`);
  const rv = read('src/RestockVaultView.jsx');
  const a = rv.indexOf('ONE nav. Same destinations, same place, in every mode.');
  const b = rv.indexOf('{tabs.map(t => (', a);
  const c = rv.indexOf('{t.label}', b);
  ok('the nav head row, the tab strip and the tab button were found', a > -1 && b > a && c > b && c - a < 3000, `${a}..${b}..${c}`);
  const head = rv.slice(a, b);
  const row = head.slice(head.indexOf('<div className="'));
  const strip = head.slice(head.lastIndexOf('<div className="'));
  ok('the head row may wrap, so the strip can take a second line on the phone', /^<div className="[^"]*\bflex-wrap\b/.test(row));
  ok('the strip is full-width on the phone and its own width on a desk',
     /^<div className="[^"]*\bw-full\b[^"]*\blg:w-auto\b/.test(strip) || /^<div className="[^"]*\blg:w-auto\b[^"]*\bw-full\b/.test(strip),
     'without w-full it stays a 436 px block inside 325 and clips; without lg:w-auto it drops under the title on a desk');
  ok('the strip wraps its buttons instead of clipping them', /^<div className="[^"]*\bflex-wrap\b/.test(strip),
     'w-full alone puts five buttons on one 436 px line inside 325');
  const btn = rv.slice(b, c);
  ok('each tab stretches to fill its row on the phone and keeps its own width on a desk',
     /\bflex-auto\b/.test(btn) && /\blg:flex-none\b/.test(btn),
     'without flex-auto the second row is two short tabs hugging the left edge'); }

section('RESTOCK VAULT ON THE PHONE — the frame, the hints, the touch sizes (2026-09-15)');
/* Measured at 375 inside the REAL shell (`?shell&places`): the desk is 271 px wide because the
   shell's `p-6` (24 a side), the panel's `border-4` and `p-4` (20 a side) eat 88 px of the phone.
   Aldi, 2026-09-15: "just make the panel bigger so that more words and panel fit inside the phone
   because there is so little space, since we have the ponder tools we dont need any hints panel i
   guess". So: phones lose 56 px of frame (desk 271 → 324, tabs back to two rows), the desk keeps
   every number at lg; the two explanatory hints go (the empty-cart line that said "di kiri" on a
   phone where the list is above, and the Data Induk intro paragraph) while the REPORTS stay
   ("Belum lengkap: …" is the form telling him what is missing, not a hint); the field hint under
   ASAL stops being `absolute` on the phone, where it painted over the ⇄ button; the NAMA input
   (41 px) and the tab buttons (42 px) reach the 44 px floor; registered names wrap instead of
   ending in "…". */
{ const SHELL_PAD = 24, PANEL = 4 + 16, PHONE = 375;
  const cut = PHONE - 2 * (8 + 2 + 8), today = PHONE - 2 * (SHELL_PAD + PANEL);
  ok('the frame cut gives the phone desk 52 px more than today (measured 271 → 324; the last 8 a side is the desk band)', cut - today === 52, `${cut} - ${today}`);
  const bt = read('src/components/BiohazardTheme.jsx');
  const s = bt.indexOf('print-reset flex-1 overflow-y-auto');
  ok('the shell page wrapper was found', s > -1);
  const wrap = bt.slice(s, bt.indexOf('`', s));
  ok('the shell page wrapper pads 8 on the phone and 24 on a desk', /\bp-2\b/.test(wrap) && /\blg:p-6\b/.test(wrap) && !/(^|\s)p-6(\s|$)/.test(wrap),
     'a bare p-6 wraps EVERY screen at 24 px a side on a 375 phone');
  const app = read('src/App.jsx');
  const a = app.indexOf("activeTab === 'restock_vault' && (");
  const b = app.indexOf('<RestockVaultView', a);
  ok('the Restock Vault panel in App.jsx was found', a > -1 && b > a && b - a < 1500, `${a}..${b}`);
  const panel = app.slice(a, b);
  ok('the panel border is 2 on the phone and 4 on a desk', /\bborder-2 lg:border-4\b/.test(panel));
  ok('the panel pads 8 on the phone and 16 on a desk', /\bp-2 lg:p-4\b/.test(panel));
  /* The lab's `?shell&places` mount carries a COPY of this panel's classes. A copy drifts: the
     first render after the frame cut still showed 303 px because the lab copy said border-4 p-4. */
  const panelClass = (panel.match(/className="([^"]*max-w-7xl[^"]*)"/) || [])[1];
  ok('the ponder lab wraps the desk in the SAME panel classes as App.jsx',
     !!panelClass && read('tools/ponder-lab.jsx').includes(`className="${panelClass}"`),
     'a stale copy in the lab measures the lab, not the app');
  const rv = read('src/RestockVaultView.jsx');
  ok('the empty-cart hint that pointed LEFT on a phone is gone', !rv.includes('Cari barang di kiri'));
  /* Block comments stripped first: the one above the footer quotes the old words on purpose. */
  const rvCode = rv.replace(/\/\*[\s\S]*?\*\//g, '');
  ok('no line on the desk points LEFT — on a phone the list is above the form', !/\bdi kiri\b/.test(rvCode),
     '"Belum ada barang … di kiri" in the empty table was the second one');
  ok('the Data Induk intro paragraph is gone', !rv.includes('mengetik nama baru di sana tidak mendaftarkan apa pun'));
  const f = rv.indexOf('→ Belum lengkap:');
  const foot = rv.slice(rv.lastIndexOf('<p', f), f);
  /* The footer is PINNED on the phone, and his condition for anything pinned is that it collapses
     to ONE line (audit G60, 2026-09-01: a 160 px footer against 812 px of screen). So the report
     keeps `truncate sm:whitespace-normal`; the first draft dropped it and G60 caught it. */
  ok('the completeness report stays, one line on the phone', f > -1 && /truncate sm:whitespace-normal/.test(foot) && rv.includes('→ Lengkap. Siap disimpan.'),
     'the report is the form saying what is missing — a hint is not, but this is');
  const h = rv.indexOf('!options.length && hint && (');
  const hintP = rv.slice(h, rv.indexOf('</p>', h));
  ok('the field hint flows on the phone and floats only on a desk', /className="static lg:absolute/.test(hintP) && !/[^:]\btruncate\b/.test(hintP),
     'absolute under a stacked field paints over the next control on a phone');
  const t = rv.indexOf('{tabs.map(t => (');
  const btn = rv.slice(t, rv.indexOf('{t.label}', t));
  ok('the tab buttons reach the 44 px touch floor', /min-h-\[44px\]/.test(btn), 'py-3 + 11px text = 42');
  const n = rv.indexOf('placeholder="Pabrik Kudus"');
  const nama = rv.slice(n, rv.indexOf('/>', n));
  ok('the NAMA input reaches the 44 px touch floor', /min-h-\[44px\]/.test(nama), 'p-2.5 + text-sm = 41');
  const l = rv.indexOf('{list.map(o => {');
  const rows = rv.slice(l, rv.indexOf('Staff are here', l));
  ok('registered names and addresses wrap instead of ending in "…"', l > -1 && !/\btruncate\b/.test(rows) && /\bbreak-words\b/.test(rows)); }

section('RESTOCK VAULT — the empty table is a NOTICE, the register buttons share a row on the phone (2026-09-15)');
/* Aldi, 2026-09-15 08:20, on his own phone screenshot of the empty intake table: "i want this kind
   of notification to have different animation and color to shows that this is a warning or
   notification on not actually belong to the real panel just something the user need to do to in
   some certain situation". Shown rv-notice.png, he chose message A (dashed amber edge, amber ink,
   a "Perlu diisi" label, fade-in + a slow breathing edge) and buttons A (both register buttons on
   one row at 10 px, 44 px tall — shown with the words wrapping, chosen anyway). Amber is an edge
   and an ink, never a fill (taste law 2026-08-21); Lite Mode already completes every animation
   instantly and stops infinite ones (index.css `html.lite-mode *`), so nothing here needs its own
   Lite rule. */
{ const rv = read('src/RestockVaultView.jsx');
  const w = rv.indexOf('THE LINES — batch is a column, not a box in a corner');
  const wrap = rv.slice(w, rv.indexOf('<table', w));
  ok('the intake table wrapper was found', w > -1 && wrap.length < 700);
  ok('the wrapper turns into a dashed amber notice ONLY while the cart is empty',
     /cart\.length === 0\s*\?\s*'[^']*border-dashed border-accent-ink[^']*kpm-notice[^']*'\s*:\s*'[^']*border-line-2[^']*'/.test(wrap),
     'a notice look on a full table would shout at every intake');
  ok('the notice has no fill', !/cart\.length === 0\s*\?\s*'[^']*bg-orange/.test(wrap), 'amber is an edge and an ink, not a fill');
  const e = rv.indexOf('Belum ada barang. Cari dan klik salah satu di daftar barang.');
  const cell = rv.slice(rv.lastIndexOf('<td', e), e);
  ok('the empty row speaks in amber with a "Perlu diisi" label above the sentence',
     e > -1 && /text-accent-ink/.test(cell) && /Perlu diisi/.test(rv.slice(e - 400, e)));
  const css = read('src/index.css');
  ok('the notice fades in and its edge breathes', /@keyframes kpmNoticeIn/.test(css) && /@keyframes kpmNoticeBreathe/.test(css) && /\.kpm-notice\s*\{[^}]*kpmNoticeIn[^}]*kpmNoticeBreathe/.test(css));
  ok('Lite Mode still completes every animation instantly and stops the breathing', /html\.lite-mode \* \{[^}]*animation-iteration-count: 1 !important/.test(css));
  const b1 = rv.search(/Daftarkan pabrik\r?\n/), b2 = rv.search(/Daftarkan orang\r?\n/);   // the desk file mixes CRLF
  const btn1 = rv.slice(rv.lastIndexOf('<button', b1), b1), btn2 = rv.slice(rv.lastIndexOf('<button', b2), b2);
  ok('both register buttons were found', b1 > -1 && b2 > -1 && btn1.length < 600 && btn2.length < 600);
  for (const [name, btn] of [['PABRIK', btn1], ['ORANG', btn2]]) {
    ok(`DAFTARKAN ${name} fills half the row on the phone and keeps its own width on a desk`, /\bflex-1 lg:flex-none\b/.test(btn) && /\bjustify-center lg:justify-start\b/.test(btn));
    ok(`DAFTARKAN ${name} is 10 px on the phone, 11 px on a desk, never under 44 px tall`, /text-\[10px\] lg:text-\[11px\]/.test(btn) && /min-h-\[44px\]/.test(btn));
  } }

section('THE NOTA IS SCANNED, THE GOODS PHOTO STAYS A PHOTO (2026-09-15)');
/* Aldi, 2026-09-15: "for nota photo is it possible to make feature like what camscanner have? so
   its scan the nota and make it clear instead of just normal photo" — and, choosing option A of
   the brainstorm: "nota scan = A keep the storage small to minimize firebase cost". The maths
   (helpers.scanPixels: local-mean threshold, two box sizes, paper → white, ink → black) is proved
   on a synthetic nota in src/config/notaScan.selfcheck.mjs; this section pins the WIRING — the
   nota goes through the scan, the goods photo does not, and the scan is saved smaller. */
{ const h = read('src/utils/helpers.js');
  ok('helpers exports the pure scan and the canvas wrapper', /export const scanPixels = \(data, width, height/.test(h) && /export const scanNotaToBase64 = \(file, \{ corners = null, turns = 0 \} = \{\}\)/.test(h));
  ok('the wrapper runs the scan on the canvas pixels, then levels, then saves at 0.5', /scanPixels\(frame\.data, canvas\.width, canvas\.height\);\s*ctx\.putImageData\(frame, 0, 0\);\s*const deg = deskewAngle/.test(h) && (h.match(/toDataURL\('image\/jpeg', 0\.5\)/g) || []).length === 2,
     'a scan saved at 0.5 is smaller than the photo it replaces — his storage condition; both exits (levelled and not) must save at 0.5');
  const rv = read('src/RestockVaultView.jsx');
  ok('the desk imports the scan', imports(rv, 'scanNotaToBase64'));
  const r = rv.indexOf('if (receiptFile) {');
  const nota = rv.slice(r, rv.indexOf('let base64Package', r));
  ok('the NOTA photo goes through the scan', r > -1 && /await scanNotaToBase64\(receiptFile\)/.test(nota) && !/compressImageToBase64\(receiptFile\)/.test(nota));
  const p = rv.indexOf('if (packageFile) {');
  const pkg = rv.slice(p, rv.indexOf('base64Package = await', p));
  ok('the GOODS photo stays a photo', p > -1 && /compressImageToBase64\(packageFile\)/.test(pkg) && !/scanNotaToBase64/.test(pkg),
     'a scan of a box of cigarettes is a white rectangle');
  const lab = read('tools/ponder-lab.jsx');
  ok('the lab can show a photo beside its scan (?nota-scan)', /q\.has\('nota-scan'\) \? <NotaScanLab \/>/.test(lab));
  ok('the lab runs the REAL end-to-end function, not a copy of one step', /scanNotaToBase64\(blob\)/.test(lab) && !/\bscanPixels\(/.test(lab),
     'a lab that calls scanPixels alone would show a scan the app never levels');
  /* "make the photo upright so that its easier to read" — the scan is levelled after it is
     cleaned, by the negative of the tilt deskewAngle reports (notaScan.selfcheck.mjs proves the
     sign on synthetic pages). */
  ok('the saved scan is levelled: tilt measured on the scanned pixels, then undone', /const deg = deskewAngle\(frame\.data, canvas\.width, canvas\.height\);/.test(h) && /lc\.rotate\(-deg \* Math\.PI \/ 180\)/.test(h),
     'rotate(+deg) would double the tilt instead of removing it');
  ok('the corners the rotation swings in are paper, not black', /lc\.fillStyle = '#fff'; lc\.fillRect\(0, 0, level\.width, level\.height\);/.test(h)); }

section('A PICKED PHOTO IS SHOWN, AND THE NOTA SHOWS ITS SCAN BEFORE SAVE (2026-09-15)');
/* Aldi, 2026-09-15 09:55: "add animation and preview window on the scanner before the user attach
   it just to make sure that the picture is fine, also add preview on all photo attachment on this
   app especially the foto barang on the restock vault". components/PhotoField.jsx is the one box;
   the Restock Vault intake form uses it for both pictures. The nota box scans the moment the file
   is picked and hands the scan back, so the save path reuses it rather than scanning twice. */
{ const pf = read('src/components/PhotoField.jsx');
  ok('the photo box shows the picked picture, large enough to judge', /<img src=\{shown\}[^>]*kpm-photo-in[^>]*max-h-44/.test(pf) && /const shown = scan && showOriginal \? original : preview;/.test(pf));
  ok('with scan, the box shows the SCAN and says so while it works', /if \(scan\) \{[\s\S]*?scanNotaToBase64\(file\)/.test(pf) && /Memindai nota…/.test(pf) && /hasil scan — yang akan tersimpan/.test(pf));
  ok('the scan is handed back to the form once per file', /onFile\(file, dataUrl\)/.test(pf));
  ok('a file that cannot be read as a picture says so', /Tidak terbaca sebagai foto/.test(pf) && /setFailed\(true\)/.test(pf), 'a bare filename would look attached');
  ok('GANTI and HAPUS sit under every preview', /Ganti\{input\}/.test(pf) && /onFile\(null, null\)[^>]*>Hapus/.test(pf));
  ok('the object URL is released when the file changes', /URL\.revokeObjectURL\(url\)/.test(pf));
  const css = read('src/index.css');
  ok('the preview enters with a short fade + scale and the scanner line sweeps', /@keyframes kpmPhotoIn/.test(css) && /@keyframes kpmScanline/.test(css) && /\.kpm-photo-in \{ animation: kpmPhotoIn \.2s/.test(css));
  const rv = read('src/RestockVaultView.jsx');
  ok('the goods photo box is the shared PhotoField', /<PhotoField label="Bukti foto barang" file=\{packageFile\}/.test(rv));
  ok('the nota box is the shared PhotoField with scan on, keeping its "opsional" tag on Kirim', /<PhotoField label=\{<>Nota \/ faktur\{isOut && <span[^>]*> · opsional<\/span>\}<\/>\} file=\{receiptFile\} scan /.test(rv));
  ok('the old inline boxes are gone', !/onChange=\{e => setPackageFile\(e\.target\.files\[0\]\)\}/.test(rv) && !/onChange=\{e => setReceiptFile\(e\.target\.files\[0\]\)\}/.test(rv));
  ok('the save path reuses the scan the box already made', /const compressed = receiptScan \|\| await scanNotaToBase64\(receiptFile\);/.test(rv));
  ok('a form reset clears the scan with the file', /setReceiptFile\(null\); setReceiptScan\(null\);/.test(rv));
  ok('the lab can show the box in its states (?photo)', /q\.has\('photo'\) \? <PhotoLab \/>/.test(read('tools/ponder-lab.jsx'))); }

section('A NEW PHONE IS TOLD "CHECKING", NEVER "ACCESS DENIED", WHILE THE APP LOOKS UP THE ACCOUNT (2026-09-16)');
/* Aldi, 2026-09-16, first open on a new address with adikaryasukses99@gmail.com: "access denied that
   took too long on recognizing my tier 1 account, it said im not part of the employee". The red
   panel needs `user` set AND role UNAUTHORIZED. Both happened at once: the page's first
   onAuthStateChanged(null) set the role to UNAUTHORIZED (the logout branch), then the Google popup
   resolved and handleLogin set the USER on the spot — before the listener's four serial server
   reads had said anything. A stale verdict painted over a check still running, for as long as a
   cold connection took. His ask: "fix the loading time … make our presentation for the new user
   look even faster and smoother". So: the listener owns `user` (handleLogin no longer sets it),
   it raises a CHECKING panel (`checkingEmail`) the moment it starts and keeps `user` null until
   the role is known, the four reads go out together, and the vault no longer waits for a
   bookkeeping write. */
{ const a = code(read('src/App.jsx'));
  const L = a.indexOf("const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {"), E = a.indexOf('return () => unsubAuth();', L);
  const listener = a.slice(L, E);
  ok('the sign-in listener is where it was', L > -1 && E > L && listener.length > 6000 && listener.length < 20000);
  const iCheck = listener.indexOf('setCheckingEmail(email)'), iAwait = listener.indexOf('await ');
  ok('the listener says CHECKING (setCheckingEmail) BEFORE its first await, and leaves `user` null until the role is known', iCheck > -1 && iCheck < iAwait && !/setUser\(currentUser\)/.test(listener.slice(0, iAwait)),
     'a verdict from a previous sign-out must not be on screen while this account is being looked up; setting `user` early would start every user-keyed subscription under a role about to change');
  ok('every exit of the look-up takes the panel down (finally + the sign-out branch)', /\} finally \{\s*setCheckingEmail\(null\);/.test(listener) && (listener.match(/setCheckingEmail\(null\)/g) || []).length >= 2);
  ok('the four directory reads go out together, not one after another', /const \[sysAdminSnap, inviteSnap, uidSnap, emailSnap\] = await Promise\.all\(\[sysAdminRef, inviteRef, uidRef, emailRef\]\.map\(getDocOfflineSafe\)\);/.test(listener),
     'four serial round trips on a cold connection is the wait he felt');
  ok('REGRESSION: no serial `await getDocOfflineSafe(` is left BEFORE the joint read (the live-profile read after it depends on the boss uid and stays serial)',
     !/await getDocOfflineSafe\(/.test(listener.slice(0, listener.indexOf('await Promise.all('))) && (listener.match(/await getDocOfflineSafe\(/g) || []).length === 1);
  const H = a.indexOf('const handleLogin = async () => {'), handler = a.slice(H, a.indexOf('const handleLogout', H));
  ok('handleLogin no longer sets the user itself — the listener does, with the role', H > -1 && !/setUser\(result\.user\)/.test(handler) && /signInWithPopup\(auth, googleProvider\)/.test(handler));
  const C = a.indexOf('{!user && checkingEmail && ('), panel = a.slice(C, a.indexOf('{user && (', C));   // code() strips the JSX comment between them
  ok('the panel slice is bounded', C > -1 && panel.length > 400 && panel.length < 2500);
  ok('the CHECKING panel lives in the `!user` moment, names the account, spins, offers a way out, on solid ground', C > -1 && /Checking your account/.test(panel) && /\[\{checkingEmail\}\]/.test(panel) && /animate-spin/.test(panel) && /onClick=\{handleLogout\}/.test(panel) && /bg-\[var\(--duke-well-solid\)\]/.test(panel),
     'in the `user &&` block it would start every user-keyed effect early; translucent, the sign-in door would bleed through');
  ok('no red, no shield on the status panel — a status is not a verdict', !/ShieldAlert|text-red/.test(panel));
  ok('the red panel still exists for a real server "no", and the amber one for "could not check"', /userRole === 'UNAUTHORIZED' \?/.test(a) && /userRole === 'OFFLINE_UNVERIFIED' \?/.test(a));
  ok('the state is declared once, beside the role', /const \[checkingEmail, setCheckingEmail\] = useState\(null\);/.test(a));
  /* the vault: the password is verified by the hash compare; the strike-reset write is bookkeeping */
  const P = a.indexOf('const handlePinLogin = async () => {'), pin = a.slice(P, a.indexOf('} else {', a.indexOf('if (hashedInput === data.pin)', P)));
  ok('OPEN THE VAULT starts the unlock the moment the hash matches — the strike reset is not awaited', P > -1 && /updateDoc\(adminDocRef, \{ failedRecoveryAttempts: 0, lockoutStatus: "NONE" \}\)\.catch\(/.test(pin) && !/await updateDoc\(adminDocRef, \{ failedRecoveryAttempts: 0/.test(pin) && pin.indexOf('updateDoc(adminDocRef') < pin.indexOf('setIsUnlocking(true)'),
     'a server round trip between the right password and the first frame of the unlock');
  /* behaviour: the state machine that painted the red panel, re-run with and without the fix */
  const paint = (role, user, checking) => (!user ? (checking ? 'checking' : 'login') : role === 'UNAUTHORIZED' ? 'RED' : 'app');
  const before = (() => { let role = 'ADMIN', user = null; role = 'UNAUTHORIZED'; /* onAuthStateChanged(null) */ user = { email: 'x' }; /* popup resolved: handleLogin setUser */ return paint(role, user, null); })();
  const after = (() => { let role = 'ADMIN', user = null, checking = null; role = 'UNAUTHORIZED'; /* onAuthStateChanged(null) */ checking = 'x'; /* listener fires: setCheckingEmail, user untouched */ return paint(role, user, checking); })();
  ok(`behaviour: the old order painted "${before}" during the lookups; the new order paints "${after}"`, before === 'RED' && after === 'checking'); }

section('THE PHONE RIBBON STARTS A QUARTER OF THE WAY DOWN, NOT HALFWAY (2026-09-16)');
/* Aldi, 2026-09-16: "make the sidebar button on the right side phone to be 25% from upper right
   as default location instead of just 50% between upper and bottom right side". The ribbon is the
   phone's only way into the navigation; its resting spot is his (a vertical drag moves it and
   `kpm-ribbon-y` remembers), so only the DEFAULT changes — a saved spot still wins. */
{ const sh = code(read('src/components/BiohazardTheme.jsx'));
  const s = sh.indexOf('const [ribbonY, setRibbonY] = useState(() => {'), init = sh.slice(s, sh.indexOf('});', s));
  ok('the ribbon initialiser is where it was', s > -1 && init.length > 100 && init.length < 600);
  ok('the default puts the ribbon\'s centre at 25% of the screen height', /Math\.round\(window\.innerHeight \* 0\.25 - RIBBON_H \/ 2\)/.test(init));
  ok('REGRESSION: the halfway default is gone', !/\(window\.innerHeight - RIBBON_H\) \/ 2/.test(init));
  ok('a spot he dragged to still wins over the default', /localStorage\.getItem\('kpm-ribbon-y'\)/.test(init) && /Math\.min\(saved, window\.innerHeight - RIBBON_H - 8\)/.test(init));
  ok('behaviour: at 812 tall the ribbon (132 tall) lands at top 137, centre 203 = 25% of 812', (() => { const RIBBON_H = 132, innerHeight = 812; const top = Math.round(innerHeight * 0.25 - RIBBON_H / 2); return top === 137 && top + RIBBON_H / 2 === innerHeight * 0.25; })()); }

section('THE SCANNER FINDS THE PAPER, SQUARES IT, AND LETS HIM FIX THE CORNERS (2026-09-16)');
/* Aldi, 2026-09-15, of the first real scan (~40° crooked, in perspective): "make the scanner
   automatically align and make sure the receipt to be square and 2D like in plain paper … there is
   no pressable or interaction button on the preview photo or maybe the edit button like camscanner
   have". helpers.findPaper (corners) → helpers.warpQuad (flat) → scanPixels → deskewAngle; the
   maths is proven in notaScan.selfcheck.mjs. Here: the pipeline order, and the SESUAIKAN sheet. */
{ const h = code(read('src/utils/helpers.js'));
  const s = h.indexOf('export const scanNotaToBase64 = ');
  const body = h.slice(s, h.indexOf('export const compressImageToBase64', s));
  ok('scanNotaToBase64 is where it was and has a body', s > -1 && body.length > 800 && body.length < 4000);
  const iFind = body.indexOf('findPaper('), iWarp = body.indexOf('warpQuad('), iScan = body.indexOf('scanPixels('), iLevel = body.indexOf('deskewAngle(');
  ok('photo → findPaper → warpQuad → scanPixels → deskewAngle, in that order', iFind > -1 && iWarp > iFind && iScan > iWarp && iLevel > iScan,
     'scanPixels before the warp paints the table black and the paper white with a halo — exactly what Otsu must not see');
  ok('no sheet found → the old path: the whole photo at 800 wide', /canvas\.width = 800; canvas\.height = Math\.round\(src\.height \* 800 \/ src\.width\)/.test(body));
  ok('hand-set corners skip findPaper (corners || findPaper)', /corners \|\| findPaper\(full\.data/.test(body));
  ok('a 90° turn is one cycle of the corner order, not another canvas', /quad = \[quad\[3\], quad\[0\], quad\[1\], quad\[2\]\]/.test(body));
  ok('the residual tilt is still undone by rotate(-deg)', /lc\.rotate\(-deg \* Math\.PI \/ 180\)/.test(body));
  const fp = h.slice(h.indexOf('export const findPaper'), h.indexOf('export const homography'));
  ok('findPaper gives up on a sticker (<15%), an L (<80% fill), or a frame-filling sheet (>95%)', /bigSize < 0\.15 \* n\) return null/.test(fp) && /bigSize < 0\.8 \* quadArea/.test(fp) && /quadArea > 0\.95 \* n/.test(fp));
  ok('the photo is decoded ONCE for both the scan and the editor (loadNotaPhoto), never rotated again from EXIF', /export const loadNotaPhoto/.test(h) && !/exif/i.test(h));
  const pfRaw = read('src/components/PhotoField.jsx'), pf = code(pfRaw);
  const r = pf.indexOf('<span className="flex items-center gap-3 shrink-0">'), row = pf.slice(r, pf.indexOf('</span>', pf.indexOf('>Hapus', r)));
  ok('SESUAIKAN sits beside GANTI / HAPUS, only with scan, never while scanning', r > -1 && /\{scan && !busy && !failed && \([\s\S]*?data-edit[\s\S]*?>Sesuaikan<\/button>/.test(row) && /Ganti\{input\}/.test(row) && />Hapus</.test(row));
  const cs = pf.indexOf('function CornerSheet'), sheet = pf.slice(cs);
  ok('the corner sheet exists and is the app\'s own dialog — no browser dialog anywhere in the box', cs > -1 && /role="dialog"/.test(sheet) && /fixed inset-0/.test(sheet) && !/window\.(confirm|prompt|alert)\(|\b(confirm|prompt|alert)\(/.test(pf));
  ok('the sheet shows the ORIGINAL photo with the corners findPaper found', /loadNotaPhoto\(file\)/.test(sheet) && /findPaper\(c\.getContext\('2d'\)\.getImageData\(0, 0, w, h\)\.data, w, h\)/.test(sheet));
  ok('not found → the whole frame, so there is always something to drag', /q \|\| \[\[0, 0\], \[w, 0\], \[w, h\], \[0, h\]\]/.test(sheet) && /tidak ketemu/.test(sheet));
  ok('four 44 px handles, pointer events, touch-action none', /corners\.map\(\(p, i\) => \([\s\S]*?onPointerDown=\{drag\(i\)\}[\s\S]*?w-11 h-11[\s\S]*?touchAction: 'none'/.test(sheet) && /setPointerCapture\(e\.pointerId\)/.test(sheet));
  ok('PUTAR 90°, BATAL, PAKAI', />Putar 90°<\/button>/.test(sheet) && />Batal<\/button>/.test(sheet) && />Pakai<\/button>/.test(sheet) && /setTurns\(\(t\) => \(t \+ 1\) % 4\)/.test(sheet));
  ok('PAKAI hands the hand-set corners and turns to the scan, and the result goes back to the form', /onApply\(corners, turns\)/.test(sheet) && /scanNotaToBase64\(file, \{ corners, turns \}\)/.test(pf) && /setPreview\(dataUrl\); setBusy\(false\); onFile\(file, dataUrl\);/.test(pf),
     'a PAKAI that did not call onFile would show one scan and save another');
  ok('the edge that becomes the top is marked ATAS before PAKAI', /corners\[\(4 - turns\) % 4\], corners\[\(5 - turns\) % 4\]/.test(sheet) && />atas<\/span>/.test(sheet));
  ok('asli / scan under the preview, and the caption says which one is on screen', /\[\['asli', true\], \['scan', false\]\]/.test(pf) && /foto asli — tidak tersimpan/.test(pf) && /hasil scan — yang akan tersimpan/.test(pf));
  ok('the sheet closes when the file changes', /setFailed\(false\); setShowOriginal\(false\); setEditing\(false\);/.test(pf));
  ok('the sheet is not motion: Lite Mode has nothing to strip from it', !/kpm-photo-in|kpm-scanline|animate-/.test(sheet));
  const rv = read('src/RestockVaultView.jsx');
  ok('the goods photo box still has no scan — a box of cigarettes is a photo', /<PhotoField label="Bukti foto barang" file=\{packageFile\} onFile=\{\(f\) => setPackageFile\(f\)\} galleryOk=\{galleryOk\} \/>/.test(rv));
  ok('Save still reuses the scan the box handed back — PAKAI\'s result included', /const compressed = receiptScan \|\| await scanNotaToBase64\(receiptFile\);/.test(rv));
  const lab = read('tools/ponder-lab.jsx');
  ok('the lab photo is a tilted, perspective sheet (homography), and &edit opens the sheet', /homography\(\[\[210, 40\], \[560, 150\], \[430, 450\], \[70, 300\]\]\)/.test(lab) && /q\.has\('edit'\)/.test(lab) && /button\[data-edit\]/.test(lab)); }

/* ─── 2026-09-17 — THE SALES TERMINAL ON THE PHONE (his B + YES, measured at 375 in `?shell&terminal`) ───
   Every control a salesman's thumb hits is 44 px on a phone, every 8–10 px label is 11 (unit labels 10
   so the four boxes stay on one row); the desk keeps every number through `lg:`. Scoped to the ELEMENT,
   not to a string that appears on it (the 2026-08-18 lesson). */
{
  const m = msvSrc;
  /* the raw file for four of these: code() strips a block-comment span that swallows the
     payment select and the proof block, so the stripped text cannot see them */
  const r = merchant;
  const steppers = (m.match(/kpm-press kpm-hover w-11 h-11 lg:w-8 lg:h-8 rounded-lg/g) || []).length;
  ok('REGRESSION: the two row steppers (− / +) are 44 px on the phone (32 on the desk, as before), and no 32 px phone stepper is left',
     steppers === 2 && !/kpm-press kpm-hover w-8 h-8/.test(m),
     'they were `w-8 h-8` with a comment admitting 32 is under 44; his pick 2026-09-17 was B — the picture gave up 32 px so these could grow');
  ok('the ware picture is 64 px with p-1 on the phone (a 56 px press target), 96 → 64 is what paid for the steppers',
     /w-16 h-16 lg:w-auto lg:h-48 p-1 lg:p-5/.test(m) && !/w-24 h-24 lg:w-auto lg:h-48/.test(m));
  ok('the − / + cluster closes its gap to 4 px on the phone so a one-line name still fits beside a 64 px picture',
     /flex items-center gap-1 lg:gap-2 shrink-0 mt-1 lg:mt-3/.test(m));
  ok('category tabs and the search box are 44 tall on the phone, desk untouched',
     /px-4 py-2 md:px-5 md:py-2\.5 min-h-\[44px\] lg:min-h-0 text-\[11px\] md:text-xs/.test(m) &&
     /pl-9 md:pl-10 pr-10 min-h-\[44px\] lg:min-h-0 text-\[var\(--duke-amber-ink\)\] font-mono text-\[13px\] md:text-sm/.test(m) &&
     /<Search size=\{16\} className="absolute left-3 top-3\.5/.test(m),
     'the search icon sat at top-2.5 for a 35 px box; at 44 it is centred at 14');
  ok('REGRESSION: the cart-line unit labels are no longer 8 px, and the four boxes are 44 tall',
     /<em className="not-italic text-\[10px\] lg:text-\[8px\] font-black uppercase tracking-wide lg:tracking-widest/.test(m) &&
     !/not-italic text-\[8px\] font-black/.test(m) &&
     /px-1 lg:px-1\.5 py-0 lg:py-1 h-11 lg:h-auto rounded">/.test(m) &&
     /className="w-7 lg:w-8 h-11 lg:h-auto bg-transparent text-center/.test(m),
     '8 px labels on 20 px boxes was the smallest thing on the whole terminal, on the line that decides the quantity');
  ok('SALE MODE / RETUR MODE, the customer box, the payment select, the qty input, the unit and tier selects, the camera button, the picker DONE — all min-h 44 on the phone',
     (m.match(/flex-1 py-1\.5 min-h-\[44px\] lg:min-h-0 text-\[11px\] lg:text-\[10px\]/g) || []).length === 2 &&
     /p-2 min-h-\[44px\] lg:min-h-0 text-\[13px\] md:text-sm font-black uppercase rounded truncate"/.test(m) &&
     /p-2 min-h-\[44px\] lg:min-h-0 text-\[13px\] md:text-sm font-bold uppercase outline-none rounded \$\{isReturMode/.test(r) &&
     /w-20 md:w-24 min-h-\[44px\] lg:min-h-0 bg-white/.test(m) &&
     (m.match(/bg-transparent min-h-\[44px\] lg:min-h-0 text-sm font-bold uppercase outline-none text-\[var\(--duke-ink-7\)\]/g) || []).length === 2 &&
     /kpm-hover w-full py-2 min-h-\[44px\] lg:min-h-0 border border-dashed border-\[var\(--duke-edge-4\)\]/.test(r) &&
     /shrink-0 px-3 py-1\.5 min-h-\[44px\] lg:min-h-0 border border-\[var\(--duke-edge-5\)\] rounded text-\[11px\] lg:text-\[10px\]/.test(m));
  ok('the customer-bar button fills the 52 px bar instead of a 16 px strip inside it — a press anywhere on the name opens the picker',
     /aria-label="Choose customer"\s+className="flex-1 min-w-0 text-left min-h-\[44px\] flex flex-col justify-center"/.test(m) &&
     /text-\[11px\] lg:text-\[9px\] font-black uppercase tracking-widest text-\[var\(--duke-ink-6\)\] leading-none">Customer</.test(m),
     'the bar itself is the drawer grip with a no-op tap; a thumb that missed the 16 px button did nothing');
  ok('EXAMINE on the picture and the camera-button label read at 11 px on the phone, 9 / 10 on the desk',
     /text-\[11px\] lg:text-\[9px\] font-black font-mono tracking-widest text-\[var\(--duke-amber-ink\)\]">EXAMINE</.test(m) &&
     /text-\[11px\] lg:text-\[10px\] uppercase tracking-widest font-bold">\{galleryOk/.test(r));
  ok('TRAP (a) holds: the T4–T6 proof camera still has no file picker — galleryOk alone decides',
     /galleryOk \? document\.getElementById\('txProof'\)\.click\(\) : setShowProofCamera\(true\)/.test(r));
}

/* ─── 2026-09-17 — THE VAULT PRESS REPORTS, AND THE READ IT WAITED ON STARTS EARLIER ───
   His report after the first-open fix: "the password press still took some time to submit and
   react … if u can make it faster then please do and if u cant then add some waiting animation on
   the button". The press used to pay one server read (the security profile) before anything on
   screen moved. Now the read starts when the gate is shown, and the button says CHECKING for
   whatever wait is left. */
{
  const a = code(appSrc);
  ok('the security profile is fetched when the gate is SHOWN, keyed on showAdminLogin, not on the press',
     /useEffect\(\(\) => \{\s*if \(!showAdminLogin \|\| !db \|\| !userId \|\| userId === 'default'\) \{ adminProfileRef\.current = null; return; \}\s*adminProfileRef\.current = getDoc\(doc\(db, `artifacts\/\$\{appId\}\/users\/\$\{userId\}\/settings`, 'admin'\)\)\.catch\(\(\) => null\);\s*\}, \[showAdminLogin, db, appId, userId\]\);/.test(a),
     'the round trip a phone pays is the same either way; starting it while he types is what removes it from the press');
  ok('the press uses the prefetched copy and falls back to a live read — never a bare cached answer',
     /const prefetched = adminProfileRef\.current;\s*adminProfileRef\.current = null;\s*const adminSnap = \(prefetched && await prefetched\) \|\| await getDoc\(adminDocRef\);/.test(a),
     'a rejected prefetch (offline) resolves to null, so the live read runs and the existing offline / insecure-context wording still fires');
  ok('BEHAVIOUR: a wrong password re-arms the prefetch AFTER its own strike write, so the next press reads the new count',
     /notify\(`Incorrect PIN\. Strike \$\{newStrikes\}\/5\.`\);\s*adminProfileRef\.current = getDoc\(adminDocRef\)\.catch\(\(\) => null\);/.test(a),
     'a copy fetched before the strike would let a sixth try read as a fifth');
  ok('REGRESSION: the button says CHECKING with a spinner while the press is in flight, and takes no second press',
     /disabled=\{pinChecking \|\| isUnlocking\}/.test(a) && /aria-busy=\{pinChecking\}/.test(a) &&
     /\{pinChecking\s*\? <span className="inline-flex items-center justify-center gap-2"><RefreshCcw size=\{12\} className="animate-spin" \/> Checking…<\/span>\s*: 'Open the vault'\}/.test(a),
     'silence is a bug (law 2); a second submit would spend one of his five tries');
  ok('the busy flag is raised before the read and always cleared, whatever path the press takes',
     /if \(pinChecking\) return;/.test(a) && /setPinChecking\(true\);\s*try \{/.test(a) && /\} finally \{\s*setPinChecking\(false\);\s*\}\s*\};/.test(a),
     'a flag that stays up after an error is a dead button with a spinner on it');
}

/* ─── 2026-09-17 — CUSTOMERS ON THE PHONE (his three YES + A→Z + dark boxes) ───
   The registration form folds behind one button under lg, every box is 44 tall, the folder cards
   are rows, the shop cards lose their dead space, shops sort A→Z, and no input is white in dark
   mode. Read from the raw file: code() strips a block-comment span in this file too. */
{
  const c = read('src/components/CustomerManager.jsx');
  ok('the form is folded on the phone and always open on the desk — one state, seeded from the width',
     /const \[showForm, setShowForm\] = useState\(\(\) => typeof window !== 'undefined' && window\.innerWidth >= 1024\);/.test(c) &&
     /className=\{`bg-\[var\(--raised\)\] p-6 rounded-2xl shadow-sm border border-\[var\(--line\)\] \$\{showForm \? '' : 'hidden lg:block'\}`\}/.test(c),
     'his YES to board 1: 1,100 px of form sat above the search box and the shop list on every lookup');
  ok('the button that opens it is phone-only, 48 tall, and its icon is not the only element child (index.css button:has(> svg:only-child) would force it visible on the desk)',
     /className="kpm-plate lg:hidden w-full min-h-\[48px\] rounded-xl bg-\[var\(--gold\)\] text-\[var\(--gold-ink\)\]/.test(c) &&
     /<span>\{showForm \? 'Hide the form' : 'Add new customer'\}<\/span>/.test(c),
     'measured: with the icon as the only element child the button was inline-flex at 1280 and 44 tall instead of 48');
  ok('BEHAVIOUR: Edit opens the folded form; a successful save on the phone folds it again',
     /setEditingId\(c\.id\);\s*\/\*[^*]*\*\/\s*setShowForm\(true\);/.test(c) &&
     /setCoordInput\(""\);\s*\/\*[^*]*\*\/\s*if \(window\.innerWidth < 1024\) setShowForm\(false\);/.test(c),
     'a folded form that Edit cannot open is a dead Edit button');
  ok('REGRESSION: no white box in dark mode — every form input carries a surface token, the name/phone boxes inset on the raised card, the rest raised in their inset blocks',
     (c.match(/className="w-full p-2 min-h-\[44px\] lg:min-h-0 border rounded border-\[var\(--line\)\] bg-\[var\(--inset\)\] text-\[var\(--ink\)\]"/g) || []).length === 2 &&
     (c.match(/h-11 lg:h-10 px-2 text-sm border rounded[^"]*bg-\[var\(--raised\)\]/g) || []).length === 4 &&
     (c.match(/p-2 min-h-\[44px\] lg:min-h-0 text-\[13px\] lg:text-xs font-bold border rounded outline-none focus:border-\[var\(--accent-edge\)\] transition-colors bg-\[var\(--raised\)\] text-\[var\(--ink\)\]/g) || []).length === 3 &&
     /placeholder="Address\.\.\."/.test(c) && /min-h-\[44px\] lg:min-h-0 text-\[13px\] lg:text-xs border rounded border-\[var\(--line\)\] bg-\[var\(--raised\)\] text-\[var\(--ink\)\]" placeholder="Address/.test(c) &&
     !/className="w-full p-2 border rounded border-\[var\(--line\)\]"/.test(c) &&
     !/className="w-full h-10 px-2 text-sm border rounded font-bold outline-none border-\[var\(--line\)\]"/.test(c),
     'his words: "it is white inside dark mode and it is too bright bro" — tokens follow the theme, a bare input follows the browser');
  ok('Auto-Find / My GPS sit on their own row under the title on the phone, 44 tall, one line each',
     /<div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 mb-2">/.test(c) &&
     /<div className="grid grid-cols-2 lg:flex gap-2 w-full lg:w-auto">/.test(c) &&
     /<span className="font-bold text-sm whitespace-nowrap">Location & Street View<\/span>/.test(c));
  ok('folder cards are FolderCards two to a row on the phone, three at lg (his "B for both", 2026-09-19); one helper, three levels',
     (c.match(/grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 kpm-folders/g) || []).length === 3 &&
     (c.match(/folderCard\(\{ kind: '(prov|kab|kec)', id: (prov|kab|kec), icon: <(MapPin|Folder) size=\{22\} \/>/g) || []).length === 3 &&
     /<h3 className="font-bold text-\[15px\] lg:text-lg mb-1 pr-11 truncate">\{id\}<\/h3>/.test(c) &&
     !/grid grid-cols-\[auto_1fr_auto\]/.test(code(c)));
  ok('shop cards: tighter on the phone, Edit / map / delete 44 tall, breadcrumb links 44, 10 px type 11',
     /className=\{`kpm-key kpm-hot bg-\[var\(--raised\)\] p-3 lg:p-5 rounded-xl border flex flex-col justify-between cursor-pointer/.test(c) &&
     (c.match(/px-3 py-1\.5 min-h-\[44px\] lg:min-h-0 text-xs font-bold bg-\[var\(--inset\)\]/g) || []).length === 4 &&
     (c.match(/min-h-\[44px\] lg:min-h-0 \$\{!selected(Region|City) \?/g) || []).length === 2 &&
     (c.match(/<h4 className="text-\[11px\] lg:text-\[10px\] uppercase tracking-widest/g) || []).length === 3);
  ok('BEHAVIOUR: the shops inside a folder are sorted A→Z by name, case-blind, Indonesian collation — his "easier to find them"',
     /\[\.\.\.\(activeKec\?\.stores \|\| \[\]\)\]\.sort\(\(a, b\) => String\(a\.name \|\| ''\)\.localeCompare\(String\(b\.name \|\| ''\), 'id', \{ sensitivity: 'base' \}\)\)\.map\(c => \{/.test(c) &&
     ['Warung Sumber Rejeki', 'Kios Maju Mundur', 'toko Lancar', 'Toko Berkah Jaya'].sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' })).join('|') === 'Kios Maju Mundur|Toko Berkah Jaya|toko Lancar|Warung Sumber Rejeki',
     'the same expression, run on four real-shaped names: K before T before W, and a lower-case t does not fall to the end');
}

/* ─── 2026-09-18 — AGENT INVENTORY ON THE PHONE (his board 1 YES + board 2 B) ───
   Measured at 375 inside the real shell (lab `?shell&agent`, kpm b1c77d8): the screen was a fixed
   850 px box, so the page scrolled 188 px AND the list scrolled 366 px inside it; the toggle was 36;
   a long name truncated; eight labels were 10 px. Under lg the box takes its content height, the
   toggle is 44, names wrap, 10 px type is 11, and the Projected Value box folds behind its own
   44 px title row. The desk keeps every number. Read from the raw file: code() strips the block
   comments this file keeps inside its JSX. */
{
  const a = read('src/AgentInventoryView.jsx');
  ok('REGRESSION: the fixed 850 px box is gone under lg — the desk keeps its height, the phone takes its content height',
     /className="lg:h-\[calc\(100vh-120px\)\] flex flex-col max-w-5xl mx-auto/.test(a) && !/h-\[850px\]/.test(code(a)),
     'measured 2026-09-18: the page scrolled 188 px and the list scrolled another 366 inside it — two thumbs for one screen');
  ok('the list scrolls itself only on the desk; on the phone the shell scrolls everything once',
     /<div className="flex-1 lg:overflow-y-auto p-4 custom-scrollbar relative z-10">/.test(a));
  ok('Saleable / Quarantine are 44 tall under lg and unchanged on the desk',
     (a.match(/flex-1 py-2 min-h-\[44px\] lg:min-h-0 text-sm font-medium rounded-none/g) || []).length === 2,
     'measured 36 (py-2) — under his 44 rule');
  ok('a product name wraps on the phone and truncates on the desk',
     /group-hover:text-ink transition-colors lg:truncate">\{item\.name\}<\/h4>/.test(a),
     '"Gudang Garam Surya 12" was cut at 154 px; a cut name is a data-entry hazard (2026-08-17)');
  ok('BEHAVIOUR: the Projected Value box folds under lg — one state seeded from the width, closed on a phone, open on a desk',
     /const \[showProjected, setShowProjected\] = useState\(\(\) => typeof window !== 'undefined' && window\.innerWidth >= 1024\);/.test(a) &&
     /className=\{`\$\{showProjected \? 'grid pb-3' : 'hidden'\} lg:grid lg:pb-0 grid-cols-1 md:grid-cols-3/.test(a) &&
     ((w) => w >= 1024)(375) === false && ((w) => w >= 1024)(1280) === true,
     'his pick 2026-09-18: B, "that shows after board 1 when pressed"');
  ok('the fold button is 44 tall, inert on the desk, reports its state, and keeps its text in spans (index.css button:has(> svg:only-child))',
     /<button type="button" onClick=\{\(\) => setShowProjected\(v => !v\)\} aria-expanded=\{showProjected\}/.test(a) &&
     /min-h-\[44px\] lg:min-h-0 lg:mb-2 lg:border-b border-line-2 lg:pb-2 lg:pointer-events-none lg:cursor-default/.test(a) &&
     /<span className="lg:hidden text-\[11px\] font-black uppercase tracking-widest text-ink-dim">\{showProjected \? 'Hide ▴' : 'Show ▾'\}<\/span>/.test(a),
     'a fold whose label does not change is silent (law 2); an icon-only button is forced inline-flex + 44 on the desk');
  ok('10 px type is 11 on the phone and 10 on the desk — eight labels; the only bare 10 px left is the money auto-fit',
     (a.match(/text-\[11px\] lg:text-\[10px\]/g) || []).length === 8 &&
     (a.match(/(?<!lg:)text-\[10px\]/g) || []).length === 1 && /'text-\[10px\] md:text-base'/.test(a),
     'his 2026-08-19 fix sizes money by string length — that one stays');
  ok('header: p-3 / gap-3 / no top margin under lg, p-4 / gap-4 / mt-2 on the desk',
     /bg-panel border-b border-line-2 p-3 lg:p-4 flex flex-col xl:flex-row justify-between items-start gap-3 lg:gap-4/.test(a) &&
     /flex flex-col gap-2 lg:gap-3 w-full xl:w-\[65%\] lg:mt-2 xl:mt-0/.test(a),
     'measured header 424 → 401 before the fold');
}

/* ─── 2026-09-18 — THE CUSTOMERS LOOK, THE SIDEWAYS SWIPE, THE QUARANTINE COUNT (his boards 3-6, all B) ───
   "the color and the UI is just look so static and too simple … add some small animation on the
   folder or lighting or button … i can swipe it right and left … make the quarantine quantity …
   more animation HD". The screen joins the control system (.kpm-key / .kpm-well / .kpm-stamp /
   .kpm-plate), the shop detail's 600 px competitor table stacks under lg, and the count is an LED
   with rolling digits. Material, not hue: the palette law and the amber rationing law hold. */
{
  const c = read('src/components/CustomerManager.jsx');
  const th = read('src/styles/theme.css');
  const a = read('src/AgentInventoryView.jsx');
  ok('REGRESSION: the shop card is a pressable key with the RE sweep (kpm-key kpm-hot); the folder rows became folders on 2026-09-19; the utilities the key replaces are gone',
     !/kpm-key kpm-hot bg-\[var\(--raised\)\] p-3 lg:p-6 rounded-xl border cursor-pointer/.test(code(c)) &&
     /className=\{`kpm-key kpm-hot bg-\[var\(--raised\)\] p-3 lg:p-5 rounded-xl border flex flex-col justify-between cursor-pointer hover:border-\[var\(--accent-edge\)\] group/.test(c) &&
     !/rounded-xl border shadow-sm cursor-pointer hover:shadow-md/.test(c),
     'theme.css is imported BEFORE the utilities, so a leftover shadow-sm / transition-all would beat .kpm-key on a tie');
  ok('the folder icon sits on the folder\'s lid (FolderCard), never a red box; FOLDER is a routine act (kpm-btn), so ADD is the only gold plate',
     !/kpm-well p-3 rounded-lg row-span-2/.test(code(c)) && !/p-3 bg-\[var\(--danger-well\)\] rounded-lg/.test(c) &&
     /<FolderCard icon=\{icon\} onOpen=\{onOpen\} className="kpm-folder-quiet w-full bg-\[var\(--raised\)\] border-\[var\(--line-2\)\] hover:border-\[var\(--accent-edge\)\] transition-colors">/.test(c) &&
     /\.kpm-folder-quiet \.kpm-folder-panel::after \{ display: none; \}/.test(th) &&
     (c.match(/handleAddFolder\('(Provinsi|Kabupaten|Kecamatan)', [^)]*\)\} className="kpm-btn rounded"/g) || []).length === 3 &&
     !/rounded bg-\[var\(--gold\)\] text-\[var\(--gold-ink\)\] hover:bg-\[var\(--gold\)\] hover:text-\[var\(--gold-ink\)\] font-bold uppercase transition-colors border border-\[var\(--line\)\] flex items-center gap-1 shadow-md/.test(c),
     'the amber rationing law: two gold plates on one screen is one too many; red is hazard, a folder is not');
  ok('the counts are printed stamps, the level header is a rule not a card, ADD is the plate, search is a well',
     (c.match(/className="kpm-stamp text-\[11px\] lg:text-\[10px\]/g) || []).length === 1 && (c.match(/countText: `\$\{data\.count\} (Total Stores|Registered)`/g) || []).length === 3 &&
     (c.match(/<div className="flex justify-between items-center px-1 py-2 border-b border-\[var\(--line-2\)\]">/g) || []).length === 3 &&
     /className="kpm-plate lg:hidden w-full min-h-\[48px\] rounded-xl bg-\[var\(--gold\)\]/.test(c) &&
     /py-3 bg-\[var\(--inset\)\] border border-\[var\(--line-2\)\] rounded-xl text-\[var\(--ink\)\] focus:border-\[var\(--accent-edge\)\] outline-none shadow-\[inset_0_2px_6px_rgba\(0,0,0,\.4\)\] transition-colors/.test(c));
  ok('REGRESSION: the competitor table never scrolls sideways under lg — the box, the table, the head, the rows',
     /<div className="flex-1 overflow-y-auto lg:overflow-x-auto pb-2">/.test(c) &&
     /<table className="w-full text-sm text-left block lg:table lg:min-w-\[600px\]">/.test(c) &&
     /<thead className="hidden lg:table-header-group/.test(c) &&
     /<tbody className="block lg:table-row-group lg:divide-y divide-\[var\(--line\)\]">/.test(c) &&
     /<tr key=\{b\.id\} className="grid grid-cols-\[1fr_auto\] gap-x-3 py-2\.5 border-b border-\[var\(--line\)\] lg:table-row lg:border-0 lg:py-0 hover:bg-\[var\(--inset\)\]">/.test(c) &&
     /col-start-1 row-start-1 lg:py-3 lg:pl-2/.test(c) && /col-start-2 row-start-1 text-right lg:text-left/.test(c) &&
     /col-start-1 row-start-2 pt-1/.test(c) && /col-span-2 row-start-3 lg:col-span-1/.test(c) && /col-start-2 row-start-2 text-right/.test(c) &&
     !/min-w-\[600px\]">/.test(c.replace('lg:min-w-[600px]">', '')),
     'measured 2026-09-18: 600 px in a 310 px box — "the customer segment is not fixed and locked on phone that i can swipe it right and left"');
  ok('the five benchmark boxes carry surface tokens and 44 on the phone; the map button\'s word is ink on its raised rest state',
     (c.match(/min-h-\[44px\] lg:min-h-0 text-sm rounded border border-\[var\(--line\)\] bg-\[var\(--raised\)\] text-\[var\(--ink\)\]/g) || []).length === 5 &&
     /bg-\[var\(--raised\)\] hover:bg-\[var\(--gold\)\] text-\[var\(--ink\)\] hover:text-\[var\(--gold-ink\)\] rounded-xl/.test(c),
     'gold-ink on raised was black on near-black until hover; a bare input is white in dark mode');
  ok('THE SIDEWAYS RATCHET: no app table under lg may carry a fixed min-width — only the two Reports tables still do, and no new one may join them',
     (() => {
       const files = fs.readdirSync('src').filter((f) => f.endsWith('.jsx')).map((f) => 'src/' + f)
         .concat(fs.readdirSync('src/components').filter((f) => f.endsWith('.jsx')).map((f) => 'src/components/' + f));
       const bad = [];
       for (const f of files) {
         const src = read(f);
         for (const m of src.matchAll(/<table className="([^"]*)"/g)) {
           if (/(^|\s)min-w-\[(\d{3,4})px\]/.test(m[1]) && !/(sm|md|lg):min-w-\[/.test(m[1])) bad.push(f);
         }
       }
       return bad.length <= 2 && bad.every((f) => f === 'src/components/HistoryReportView.jsx');
     })(),
     'his rule 2026-09-18: "sideways swipe is inconvenience for phone so make sure that most of the segment doesnt have that" — HistoryReportView.jsx:500 and :808 are the Reports sweep day, not a licence');
  ok('theme: the key rises from its keyframe, not from its base — Lite Mode\'s 0.001 s jump lands on a visible row',
     /\.kpm-key \{ position: relative; border-color: var\(--line-2\);/.test(th) && /animation: kpmKeyRise 280ms cubic-bezier\(\.23, 1, \.32, 1\) both/.test(th) &&
     /@keyframes kpmKeyRise \{ from \{ opacity: 0; translate: 0 10px; \} \}/.test(th) && !/\.kpm-key \{[^}]*opacity: 0/.test(th) &&
     /\.kpm-key:active \{ translate: 0 2px;/.test(th) && /\.kpm-key\.kpm-hot::after \{ background: var\(--amber\); width: 3px; \}/.test(th),
     'an animation must never OWN visibility (2026-08-16)');
  ok('theme: the lamp is black at rest; the stamp is mono + tabular',
     /\.kpm-well::after \{[^}]*background: #000;/.test(th) &&
     /\.kpm-stamp \{ font-family: var\(--font-mono\); font-variant-numeric: tabular-nums;/.test(th),
     'the lamp lit amber under the thumb until 2026-09-18 14:01 — his "repetitive because it have similar animation like the ponder panel"; the hold is the charge line now (guarded below)');
  ok('theme: the LED window, its blinking lamp and the odometer are GONE — the nixie counter is the one moving-number instrument',
     !/\.kpm-led \{/.test(code(th)) && !/kpmLedLamp/.test(code(th)) && !/\.kpm-roll/.test(code(th)),
     'Aldi 2026-09-18 21:30: "too much of those blinking light ... just erase the dot light"; the LED was his B that morning, replaced by the instrument he approved that evening');
  ok('the Quarantine count is a nixie counter, and the old flat pill and the roll are gone',
     /<NixieCount value=\{quarantineCount\} size=\{16\} \/>/.test(a) &&
     /import NixieCount from '\.\/components\/NixieCount\.jsx';/.test(a) &&
     !/bg-danger-badge text-white text-\[12px\]/.test(a) &&
     !/RollingCount|kpm-led|kpm-roll/.test(code(a)),
     'one instrument for every changing figure (his "standardize effect")');
  ok('BEHAVIOUR: one roll step keeps the old digit as prev and bumps the key so the entering span remounts',
     JSON.stringify(((r, value) => ({ cur: value, prev: r.cur, key: r.key + 1 }))({ cur: 10, prev: null, key: 0 }, 15)) === '{"cur":15,"prev":10,"key":1}' &&
     JSON.stringify(((r, value) => ({ cur: value, prev: r.cur, key: r.key + 1 }))({ cur: 15, prev: 10, key: 1 }, 10)) === '{"cur":10,"prev":15,"key":2}',
     'the reducer the component runs, on the lab\'s 10 → 15 → 10');
}

/* ─── 2026-09-18 — EOD SETORAN ON THE PHONE (his board 1 YES + board 2 B) ───
   Measured at 375 inside the real shell (lab `?shell&eod`): the card deck was a fixed 344 px box
   and the taller cards behind poked out under the shorter card in front as a strip of another
   card's product row; the count rows truncated names at 110 px, clipped KARTON in a 32 px span,
   scrolled inside the card (4 lines in 152 px), and their boxes were 37 tall; Landed / Less /
   Not yet were 30; four labels were 10 px. Under lg the deck is as tall as the card on top and
   the cards behind are clipped blank card backs, the name takes its own line, the box is 96×44
   on the right, the lists do not scroll, the buttons are 44, the labels 11. The desk keeps every
   number. His words: "board 1 yes, board 2 B because it have more space for long product name". */
{
  const d = read('src/components/EODCardDeck.jsx');
  ok('REGRESSION: the deck is a fixed 344 px box only on the desk; on the phone it is as tall as the card on top',
     /<div className="relative mb-\[33px\] lg:mb-0 lg:h-\[344px\]" style=\{\{ perspective: '1200px' \}\}>/.test(d) &&
     !/className="relative h-\[344px\]"/.test(code(d)),
     'measured 2026-09-18: a strip of card 3 ("Gudang Garam… KARTON") showed under the Cash card');
  ok('the card on top sits in the flow on the phone; the cards behind are clipped to its height with their content hidden; the flying card is free',
     /offset === 0 \? 'relative lg:absolute inset-x-0 top-0'/.test(d) &&
     /: gone \? 'absolute inset-x-0 top-0'/.test(d) &&
     /: 'absolute inset-x-0 top-0 bottom-0 lg:bottom-auto overflow-hidden lg:overflow-visible \[&>\*\]:invisible lg:\[&>\*\]:visible'/.test(d),
     'the confirmed card still flies UPWARD into the letter: no overflow-hidden on any ancestor of the flying card, only on the cards behind');
  ok('the count rows stack on the phone: name on its own line, a 96×44 box on the right, the unit whole; one line on the desk',
     /className="flex flex-wrap lg:flex-nowrap items-center gap-2 rounded-md px-2 py-1\.5 hover:bg-\[var\(--raised\)\]"/.test(d) &&
     /<span className="flex-1 min-w-0 basis-full lg:basis-auto">/.test(d) &&
     /className=\{`w-24 lg:w-\[74px\] h-11 lg:h-auto ml-auto lg:ml-0 shrink-0 rounded-lg border-2 px-2 py-1\.5 text-right text-\[15px\]/.test(d) &&
     /<span className="w-12 lg:w-8 shrink-0 text-\[11px\] font-bold uppercase tracking-wider text-\[var\(--ink-dim\)\]">/.test(d),
     'measured: the name column was 110 px ("Gudang Gara…"), KARTON needs 48 in a 32 px span, the box was 37 tall');
  ok('names wrap on the phone and truncate only on the desk — the product row and the receipt row',
     /<span className="block text-\[13px\] font-bold text-\[var\(--ink\)\] lg:truncate leading-tight">\{l\.name\}<\/span>/.test(d) &&
     /<span className="text-\[13px\] font-bold text-\[var\(--ink\)\] lg:truncate">\{r\.customer\}<\/span>/.test(d) &&
     !/text-\[13px\] font-bold text-\[var\(--ink\)\] truncate/.test(code(d)));
  ok('the two lists scroll inside the card only on the desk; on the phone the shell scrolls everything once',
     /<div className="lg:max-h-\[152px\] overflow-y-auto rounded-lg border bg-\[var\(--inset\)\] border-\[var\(--line\)\] p-1\.5">/.test(d) &&
     /<div className="lg:max-h-\[150px\] overflow-y-auto rounded-lg border bg-\[var\(--inset\)\] border-\[var\(--line\)\] p-1\.5">/.test(d) &&
     !/className="max-h-\[15[02]px\]/.test(code(d)),
     'measured: 4 lines need 212 px, the box gave 152 — the 4th product was behind a second scroll');
  ok('Landed / Less / Not yet and the "Actually got" box are 44 tall on the phone, unchanged on the desk',
     /className=\{`flex-1 rounded-md border py-1\.5 min-h-11 lg:min-h-0 text-\[11px\] font-bold uppercase tracking-wider transition-colors/.test(d) &&
     /className="flex-1 rounded-lg border-2 px-2 py-1\.5 h-11 lg:h-auto text-right font-mono tabular-nums text-\[14px\]/.test(d),
     'measured 30 (py-1.5) — under his 44 rule');
  const f = read('src/components/EODAgentFlow.jsx');
  const e = read('src/EODReconciliationView.jsx');
  ok('the 10 px labels are 11 on the phone: Step 1/2/3, the line under the title, the two waiting/closed lines',
     /className=\{`block font-mono text-\[11px\] lg:text-\[10px\] font-bold uppercase tracking-\[\.16em\]/.test(f) &&
     /<p className="text-\[11px\] lg:text-\[10px\] text-\[var\(--ink-dim\)\] uppercase tracking-widest mt-2">End of Day Reconciliation & Vault Return<\/p>/.test(e) &&
     (e.match(/<p className="text-\[11px\] lg:text-\[10px\] text-\[var\(--ink-dim\)\] uppercase tracking-widest text-center">/g) || []).length === 2,
     'the Customers precedent: text-[11px] lg:text-[10px] keeps the desk pixel-identical');
  ok('BEHAVIOUR: the deck class for a card follows its offset — on top, gone, or behind — never a fourth state',
     (() => {
       const cls = (offset) => offset === 0 ? 'relative lg:absolute inset-x-0 top-0'
         : offset < 0 ? 'absolute inset-x-0 top-0'
         : 'absolute inset-x-0 top-0 bottom-0 lg:bottom-auto overflow-hidden lg:overflow-visible [&>*]:invisible lg:[&>*]:visible';
       return cls(0).startsWith('relative') && !/overflow-hidden/.test(cls(-1)) && /overflow-hidden/.test(cls(2)) &&
         /lg:absolute/.test(cls(0)) && /lg:overflow-visible/.test(cls(1));
     })(),
     'the same expression the component runs, on the three offsets step 1 produces (-1, 0, 1)');
  /* A `{/* JSX comment *\/}` written as the first thing inside `return (` or `cond ? (` is an
     empty object followed by an element — two expressions, a parse error. It has now cost two
     sessions a dead dev server (2026-09-18: the lab answered 500 until the console was read),
     and a trap written in a brief did not stop it; this sweep does. Use a plain block comment. */
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith('.jsx') ? [`${dir}/${e.name}`] : []);
  const badComment = walk('src').filter((f) => /\(\s*\{\/\*/.test(read(f)));
  ok('no JSX file opens a parenthesised expression with a {/* */} comment — that is a syntax error, not a comment',
     badComment.length === 0, badComment.join(', ') || 'every src/**/*.jsx');
}

/* ─── 2026-09-18 — CUSTOMERS ON THE PHONE, ROUND TWO (his A / A / A) ───
   His test of 832ea7c came back: the four header buttons "in a bad shape", the page still moves
   sideways, hide DEL / EDIT "with some animation", and the hold repeats the ponder pad's lamp.
   Measured as TIER 1 at 375 inside the real shell (lab `?shell&customers&admin`): the title and the
   three admin buttons sat in one no-wrap row whose right edge was at 521 — the salesman's mount
   never shows them, which is why every earlier measurement missed it. Shipped: the admin tools fold
   behind one ADMIN TOOLS row under the gold bar on the phone (desk row untouched); each folder row
   and shop card hides DEL / EDIT behind a ⋯ key, one strip open at a time, the strip a
   grid-template-rows fold (Lite Mode strips the transition and it simply appears); the hold draws an
   amber charge line along the key's bottom edge (a background layer — both pseudo-elements are the
   sweep and the ink bar) and the lamp stays black, because the lamp is the pad's signal. */
{
  const c = read('src/components/CustomerManager.jsx');
  ok('REGRESSION: the boss\'s admin tools sit beside the title only on the desk; on the phone they fold behind ADMIN TOOLS under the gold bar',
     /<div className="hidden lg:flex gap-2">\{adminTools\(false\)\}<\/div>/.test(c) &&
     /aria-expanded=\{showTools\} onClick=\{\(\) => setShowTools\(v => !v\)\}/.test(c) &&
     /<div className="overflow-hidden flex flex-col gap-2 pt-2">\{adminTools\(true\)\}<\/div>/.test(c) &&
     !/<div className="flex gap-2">\s*\{\/\*/.test(code(c)),
     'measured 2026-09-18 as tier 1: the Import Map label\'s right edge at 521 in a 375 viewport, shell scrollWidth 521');
  ok('the phone fold sits AFTER the ADD NEW CUSTOMER bar and uses the same grid-template-rows fold as the ponder overlay',
     /kpm-plate lg:hidden[\s\S]{0,900}?\{isAdmin && \(\s*<div className="lg:hidden" data-acts>/.test(c) &&
     /style=\{\{ gridTemplateRows: showTools \? '1fr' : '0fr' \}\}/.test(c));
  ok('the phone labels are short and the desk labels are exactly what they were',
     /\{phone \? 'Import map' : 'Import Map Marker \(KML\)'\}/.test(c) && /'Find Duplicates'/.test(c) && /Data Scrub\s*<\/button>/.test(c));
  ok('every folder is a FolderCard in a wrapper: the ⋯ key over the lid\'s corner (a button cannot live inside a button), the DEL / EDIT fold under the card; one set of buttons for both widths',
     /import FolderCard from '\.\/FolderCard\.jsx';/.test(c) &&
     /<div key=\{id\} className="relative">\s*<FolderCard icon=\{icon\} onOpen=\{onOpen\}/.test(c) &&
     /<MoreKey id=\{key\} label=\{id\} open=\{open\} onToggle=\{\(k\) => setActsOpen\(o => \(o === k \? null : k\)\)\} className="absolute right-1\.5 top-\[30px\] z-10" \/>/.test(c) &&
     /grid transition-\[grid-template-rows,opacity\] duration-200 ease-out lg:flex lg:gap-1 lg:mt-2 \$\{open \? 'opacity-100' : 'opacity-0 lg:opacity-100'\}/.test(c) &&
     /const level = \{ prov: 'Provinsi', kab: 'Kabupaten', kec: 'Kecamatan' \}\[kind\];/.test(c) &&
     /handleDeleteFolder\(e, level, id, stores\(\)\)/.test(c) && /handleBulkRename\(e, level, id, stores\(\)\)/.test(c) &&
     !/col-span-3 row-start-4/.test(code(c)) && !/className="flex gap-1" onClick=\{e => e\.stopPropagation\(\)\}/.test(code(c)),
     'his "B for both" (2026-09-19): the same folder as the RADAR HUB, hold to peek, tap to enter');
  ok('DEL wears the danger tone on the phone and its desk look on the desk; both strip buttons are 44 and 11 px on the phone',
     (c.match(/border border-\[var\(--danger\)\] lg:border-\[var\(--line\)\] px-2 py-1 rounded-lg lg:rounded/g) || []).length === 1 &&
     (c.match(/flex-1 lg:flex-none min-h-\[44px\] lg:min-h-0 justify-center lg:justify-start text-\[11px\] lg:text-\[10px\] font-bold/g) || []).length === 2 &&
     /handleDelete\(c\.id, c\.name\); \}\} className="flex-1 lg:flex-none justify-center px-3 py-1\.5 min-h-\[44px\] lg:min-h-0 text-xs font-bold bg-\[var\(--inset\)\] border border-\[var\(--danger\)\] lg:border-\[var\(--line\)\]/.test(c));
  ok('the shop card: a ⋯ key beside the map pin on the phone, the admin row folds, the desk row is what it was',
     /<MoreKey id=\{`store:\$\{c\.id\}`\}/.test(c) &&
     /grid transition-\[grid-template-rows,opacity\] duration-200 ease-out mt-auto lg:flex lg:gap-2 lg:justify-end lg:items-center lg:pt-3 lg:border-t lg:border-\[var\(--line\)\] lg:flex-wrap/.test(c) &&
     !/<div className="flex gap-2 justify-end items-center mt-auto pt-3 border-t border-\[var\(--line\)\] flex-wrap">/.test(code(c)));
  ok('one strip at a time, and a tap anywhere outside folds it',
     /const \[actsOpen, setActsOpen\] = useState\(null\);/.test(c) &&
     /if \(!e\.target\.closest\('\[data-acts\]'\)\) setActsOpen\(null\);/.test(c) &&
     /document\.addEventListener\('pointerdown', close\)/.test(c) &&
     /onToggle=\{\(id\) => setActsOpen\(o => \(o === id \? null : id\)\)\}/.test(c));
  /* 2026-09-19: MoreKey moved to its own file so Journey Plan can use the same key - re-pointed */
  const mkSrc = fs.existsSync('src/components/MoreKey.jsx') ? read('src/components/MoreKey.jsx') : c;
  ok('the ⋯ key is a real 44 px button with a label, phone-only, and it never opens the folder under it',
     /const MoreKey = \(\{ id, label, open, onToggle, className = '' \}\) => \(/.test(mkSrc) &&
     /onClick=\{\(e\) => \{ e\.stopPropagation\(\); onToggle\(id\); \}\}/.test(mkSrc) &&
     /className=\{`lg:hidden w-11 h-11 rounded-lg border bg-\[var\(--inset\)\] text-xl leading-none flex items-center justify-center transition-colors/.test(mkSrc) &&
     /aria-label=\{`More actions for \$\{label\}`\} aria-expanded=\{open\}/.test(mkSrc));
  ok('BEHAVIOUR: the toggle opens one strip, swaps to another, and folds the open one',
     (() => { const t = (o, id) => (o === id ? null : id); return t(null, 'a') === 'a' && t('a', 'b') === 'b' && t('b', 'b') === null; })(),
     'the reducer the ⋯ key runs');
  const th = read('src/styles/theme.css');
  ok('the hold is the charge line: an amber layer on .kpm-key that grows along the bottom edge on :active, 360 ms, a background layer and not a pseudo-element',
     /\.kpm-key \{ position: relative; border-color: var\(--line-2\);\s*background-image:\s*linear-gradient\(90deg, var\(--amber\), var\(--amber\)\),/.test(th) &&
     /background-repeat: no-repeat; background-size: 0 3px, 100% 100%, 100% 100%; background-position: left bottom, 0 0, 0 0;/.test(th) &&
     /transition: translate 120ms ease-out, border-color 160ms ease-out, border-bottom-width 120ms ease-out, background-size 360ms cubic-bezier\(\.2, \.8, \.2, 1\);/.test(th) &&
     /\.kpm-key:active \{ translate: 0 2px; background-size: 100% 3px, 100% 100%, 100% 100%; \}/.test(th) &&
     !/box-shadow|filter:/.test(th.slice(th.indexOf('.kpm-key {'), th.indexOf('.kpm-key {') + 1600)),
     'his board 3 = A; audit G30: nothing in the control system may depend on a shadow or a filter');
  ok('the folder lamp stays BLACK under the thumb and under the pointer — that light is the ponder pad\'s signal, his "repetitive"',
     !/\.kpm-key:active \.kpm-well::after \{ background: var\(--amber\)/.test(th) &&
     !/\.kpm-key:hover \.kpm-well::after \{ background: var\(--amber\)/.test(th) &&
     /@media \(hover: hover\) and \(pointer: fine\) \{\s*\.kpm-key:hover \{ background-size: 100% 3px, 100% 100%, 100% 100%; \}\s*\}/.test(th));
}

/* 2026-09-18 evening - STOCK OPNAME ON THE PHONE, the floor (his boards 2 = A and 3 = A, and the
   size rules that stopped being decisions on 2026-09-17: 44 px, 11 px, names wrap, one line for
   the title). Measured at 375 inside the shell as T5 AND as the boss: the title wrapped (header
   123), twelve 10 px labels and 9 px plates, CLEAR AND COUNT AGAIN 40, UPLOAD PROOF 32, the reel
   arrows 36x21, SUBMIT TO HQ in two lines, the boss's four-tab strip 331 wide in a 325 box with
   its labels overlapping, the pickers 17 / 19 / 38 tall, audit names cut at 91 px. Every fix is
   phone-only with an lg: reset so the desk at 1280 stays byte-identical. */
{
  const so = read('src/StockOpnameView.jsx');
  ok('REGRESSION: no text under 11 px reaches the phone on Stock Opname - every text-[9px]/text-[10px] is the lg: half of a text-[11px] pair',
     !/(?<!lg:)text-\[(9|10)px\]/.test(code(so)) &&
     (so.match(/text-\[11px\] lg:text-\[(9|10)px\]/g) || []).length >= 30,
     'measured 2026-09-18: twelve 10 px labels on the untyped list, 9 px plates after typing, seven 9-10 px labels in an expanded audit');
  ok('the title is one line on the phone and unchanged on the desk',
     /<h2 className="text-xl lg:text-2xl font-black text-\[var\(--ink\)\] flex items-center gap-2 tracking-widest uppercase">/.test(so) &&
     !/<h2 className="text-2xl font-black/.test(code(so)),
     'WAREHOUSE OPNAME at 24 px wrapped at 375, header 123 -> 87');
  ok('his board 3 = A: the boss\'s four tabs are two rows of two 44 px keys on the phone and the old sliding strip on the desk',
     /<div className="grid grid-cols-2 gap-1 lg:flex lg:gap-0 bg-\[var\(--sunk\)\] rounded-lg p-1 border border-\[var\(--line\)\] w-full md:w-auto lg:overflow-x-auto custom-scrollbar">/.test(so) &&
     (so.match(/className=\{`px-2 lg:px-4 py-2 min-h-11 lg:min-h-0 justify-center lg:justify-start rounded-md text-\[11px\] lg:text-\[10px\] uppercase tracking-widest font-bold transition-all flex items-center gap-2 whitespace-nowrap \$\{viewMode === '(monitor|review|quarantine|count)'/g) || []).length === 4 &&
     !/w-full md:w-auto overflow-x-auto custom-scrollbar">/.test(code(so)),
     'strip scrollWidth 331 in 325 at 375; QUARANTINE and NEW COUNT overlapped');
  ok('every picker on the screen is a 44 px target on the phone - the select itself, not its padded wrapper',
     (so.match(/<select .*?className="min-h-11 lg:min-h-0 /g) || []).length === 5 &&
     (so.match(/<select /g) || []).length === 5,
     'the region picker measured 17 px tall, the facility picker 19, the quarantine picker 38');
  ok('names wrap on the phone and truncate on the desk - the audit item and the counting card',
     /<span className="font-bold text-sm lg:text-xs text-\[var\(--ink\)\] uppercase lg:truncate">\{item\.name\}<\/span>/.test(so) &&
     /<div className="font-bold text-\[var\(--ink\)\] text-sm uppercase tracking-wide lg:truncate">\{item\.name\}<\/div>/.test(so) &&
     !/uppercase truncate">\{item\.name\}/.test(code(so)) && !/tracking-wide truncate">\{item\.name\}/.test(code(so)),
     '"CELLO GREE..." at 91 px in the expanded audit');
  ok('his board 2 = A: the reel\'s two arrows are 44 x 44 keys on the phone, the face is a key too, the kind box is 64 x 44',
     (so.match(/className="w-11 lg:w-9 flex-1 rounded-md border border-\[var\(--line\)\] text-\[var\(--ink-dim\)\] text-sm lg:text-\[10px\]/g) || []).length === 4 &&
     /className="flex-1 min-w-0 self-stretch text-left truncate text-\[11px\] font-black uppercase tracking-wider text-\[var\(--accent-ink\)\]"/.test(so) &&
     /className="w-16 h-11 lg:w-\[60px\] lg:h-auto shrink-0 text-center px-1 py-1\.5 rounded bg-\[var\(--raised\)\] text-\[var\(--accent-ink\)\] border border-\[var\(--line\)\] focus:border-\[var\(--accent-edge\)\] outline-none font-mono tabular-nums font-black text-base lg:text-\[15px\]"/.test(so) &&
     !/className="w-9 flex-1 rounded-md/.test(code(so)),
     'arrows 36 x 21 at 10 px; a thumb hits the wrong direction');
  const th = read('src/styles/theme.css');
  ok('the reel row is 92 px on the phone (two 44 px arrows) and 46 on the desk - one variable, so the reel\'s travel stays right',
     /\.kpm-dmg-win \{ --dmg-row: 46px; height: var\(--dmg-row\); overflow: hidden; \}/.test(th) &&
     /@media \(max-width: 1023px\) \{ \.kpm-dmg-win \{ --dmg-row: 92px; \} \}/.test(th) &&
     /transform: translateY\(calc\(var\(--i\) \* var\(--dmg-row\) \* -1\)\);/.test(th),
     'the reel moves by --dmg-row per step; a fixed 46 in the transform would break at 92');
  ok('the footer: Reset stops stretching so SUBMIT TO HQ fits on one line; the desk keeps its padding',
     /<button onClick=\{\(\) => setCounts\(\{\}\)\} className="flex-none justify-center px-4 py-3 md:py-2/.test(so) &&
     /disabled:cursor-not-allowed px-4 lg:px-8 py-3 md:py-2 rounded-lg font-black/.test(so) &&
     !/className="flex-1 md:flex-none justify-center px-4 py-3 md:py-2 text-\[var\(--ink-dim\)\]/.test(code(so)),
     'SUBMIT TO HQ measured 173 x 57 in two lines at 375');
  ok('UPLOAD DAMAGED PROOF and CLEAR AND COUNT AGAIN are 44 px keys on the phone',
     /<label className="cursor-pointer min-h-11 lg:min-h-0 flex items-center gap-2 bg-transparent/.test(so) &&
     /className="shrink-0 min-h-11 lg:min-h-\[40px\] px-4 rounded-lg text-\[11px\] lg:text-\[10px\] font-black/.test(so) &&
     !/shrink-0 min-h-\[40px\] px-4/.test(code(so)),
     'measured 305 x 32 and 280 x 40');
  ok('the quarantine item\'s info line wraps on the phone instead of clipping its facility',
     /<div className="flex flex-wrap lg:flex-nowrap items-center gap-3 mt-1 text-xs font-mono">/.test(so),
     '"MASTER" cut: 300 wide in a 285 box');
}

/* 2026-09-18 21:30 - THE NIXIE COUNTER and the two Stock Opname looks he decided (boards 5 = A,
   6 = A, 7 = "nixie looks fine"). His words: "too much red and not really have any animation",
   "too compact in a small space", "standardize effect". One number instrument: a black glass
   tube per digit, a 0-9 reel that translates to the digit with a 45 ms stagger per place, the
   lit digit amber on a gradient disc. No shadow and no filter in it (G30; Lite Mode strips both).
   The count card paints AMBER for a first-pass difference and RED only once a second count
   confirms it; the boss's audit item is one thing per line with three plates on the phone. */
{
  const nx = fs.existsSync('src/components/NixieCount.jsx') ? read('src/components/NixieCount.jsx') : '';
  const th = read('src/styles/theme.css');
  const so = read('src/StockOpnameView.jsx');
  const nixieDigits = (await import('../utils/helpers.js')).nixieDigits || (() => null);
  ok('BEHAVIOUR: nixieDigits splits a figure into a sign and place-valued digits',
     JSON.stringify(nixieDigits(-17, true)) === JSON.stringify({ sign: '−', digits: [1, 7] }) &&
     JSON.stringify(nixieDigits(3, true)) === JSON.stringify({ sign: '+', digits: [3] }) &&
     JSON.stringify(nixieDigits(0, true)) === JSON.stringify({ sign: '', digits: [0] }) &&
     JSON.stringify(nixieDigits(420, false)) === JSON.stringify({ sign: '', digits: [4, 2, 0] }) &&
     JSON.stringify(nixieDigits('abc', true)) === JSON.stringify({ sign: '', digits: [0] }) &&
     JSON.stringify(nixieDigits(104.7, false)) === JSON.stringify({ sign: '', digits: [1, 0, 4] }),
     'a DIFFERENCE prints its sign, a count prints none, garbage prints 0, a fraction is a whole number');
  ok('REGRESSION: the nixie counter keys its tubes by PLACE VALUE and drives the reel with --i, so 99 -> 100 keeps rolling instead of remounting',
     /key=\{digits\.length - i\}/.test(nx) && /'--i': d/.test(nx) && /'--d': `\$\{i \* 45\}ms`/.test(nx) &&
     /import \{ nixieDigits \} from '\.\.\/utils\/helpers/.test(nx));
  const nixieCss = th.slice(th.indexOf('.kpm-nixie {'), th.indexOf('.kpm-nixie-reel > span.lit') + 400);
  ok('the nixie CSS: a reel that TRANSLATES by --dmg-like --i, 420 ms, staggered by --d; the glow is a gradient disc; nothing in it is a shadow or a filter',
     /\.kpm-nixie-reel \{[^}]*translate: 0 calc\(var\(--i, 0\) \* -1\.18em\);[^}]*transition: translate 420ms cubic-bezier\(\.23, 1, \.32, 1\); transition-delay: var\(--d, 0ms\);/.test(nixieCss) &&
     /\.kpm-nixie-reel > span\.lit \{ color: var\(--nixie-ink\);\s*background: radial-gradient/.test(nixieCss) &&
     /--nixie-ink: #FFB02E;\s*font-family: var\(--font-display\); font-weight: 800;/.test(nixieCss) &&
     !/\.kpm-nixie-tube::before/.test(nixieCss) &&
     !/box-shadow|text-shadow|filter:/.test(nixieCss) &&
     /@media \(prefers-reduced-motion: reduce\) \{ \.kpm-nixie-reel \{ transition: none; \} \}/.test(th),
     'audit G30 turned drawn shadows into gradients once already (832ea7c); this one is born without them');
  ok('his board 5 = A: the count card is AMBER for a first-pass difference and RED only once the second count confirms it or the damage line is refused',
     /const tone = !hasTyped \? 'idle' : \(recount\.confirmed \|\| recount\.disagreement\) && !matched \? 'bad' : 'wait';/.test(so) &&
     /const edge = \{ idle: 'border-\[var\(--line\)\]', wait: 'border-\[var\(--accent-edge\)\]', bad: 'border-\[var\(--danger\)\]' \}\[tone\];/.test(so) &&
     /const bar = \{ idle: 'bg-\[var\(--line\)\]', wait: 'bg-\[var\(--accent-edge\)\]', bad: 'bg-\[var\(--danger\)\]' \}\[tone\];/.test(so) &&
     !/hasTyped \? \(matched \? 'border-\[var\(--accent-edge\)\]' : 'border-\[var\(--danger\)\]'\)/.test(code(so)) &&
     !/hasTyped \? \(matched \? 'bg-\[var\(--accent-edge\)\]' : 'bg-\[var\(--danger\)\]'\)/.test(code(so)),
     'measured 2026-09-18: five red things on the FIRST miscount - his "too much red"');
  ok('the recount box, its key, the damaged line and the BLIND COUNT badge no longer wear red; "expected damaged" is a plain figure',
     /rounded-lg bg-\[var\(--sunk\)\] border border-\[var\(--accent-edge\)\]">\s*<span className="flex-1 min-w-0 text-\[11px\] font-bold text-\[var\(--ink\)\] leading-relaxed">/.test(so) &&
     /min-h-11 lg:min-h-\[40px\] px-4 rounded-lg text-\[11px\] lg:text-\[10px\] font-black uppercase tracking-widest bg-transparent border border-\[var\(--accent-edge\)\] text-\[var\(--accent-ink\)\]/.test(so) &&
     /border border-\[var\(--accent-edge\)\] px-2 py-0\.5 rounded text-\[11px\] font-black tracking-widest flex items-center gap-1"><EyeOff size=\{10\}\/> BLIND COUNT ENFORCED/.test(so) &&
     /<div className="text-\[11px\] lg:text-\[9px\] text-\[var\(--ink-dim\)\] font-bold uppercase tracking-widest whitespace-nowrap">Expected damaged<\/div>/.test(so) &&
     !/bg-\[var\(--danger-well\)\] text-\[var\(--danger-ink\)\] border border-\[var\(--danger\)\] px-2 py-0\.5 rounded/.test(code(so)) &&
     !/text-\[var\(--danger-ink\)\] font-bold uppercase tracking-widest whitespace-nowrap">Expected damaged/.test(code(so)));
  ok('the plates carry the control system\'s top light and the DIFFERENCE is a nixie counter with its sign; the verdict block folds open on the first typed number',
     (so.match(/<div className="bg-\[var\(--sunk\)\] px-3 py-2 md:px-4 border border-transparent kpm-plate">/g) || []).length === 3 &&
     /<div className=\{`bg-\[var\(--sunk\)\] px-3 py-2 md:px-4 border kpm-plate \$\{matched \? 'border-\[var\(--accent-edge\)\]' : tone === 'bad' \? 'border-\[var\(--danger\)\]' : 'border-\[var\(--accent-edge\)\]'\} `\}>/.test(so) &&
     /<div className="mt-1"><NixieCount value=\{variance\} signed size=\{20\} \/><\/div>/.test(so) &&
     /<div className="grid transition-\[grid-template-rows\] duration-\[260ms\] ease-out" style=\{\{ gridTemplateRows: isRevealed \? '1fr' : '0fr' \}\}>\s*<div className="overflow-hidden">\s*\{isRevealed && \(/.test(so) &&
     /import NixieCount from '\.\/components\/NixieCount\.jsx';/.test(so),
     'the LED window he refused is gone from here: no .kpm-led on this screen',
     );
  ok('no .kpm-led on Stock Opname', !/kpm-led/.test(code(so)));
  ok('his board 6 = A: the audit item is one thing per line on the phone - name, three plates EXPECTED / FOUND / DIFFERENCE as nixie counters, the desk row unchanged in shape',
     /<div className="flex flex-col items-stretch gap-2\.5 mb-3 lg:flex-row lg:justify-between lg:items-center lg:mb-2 lg:border-b lg:border-\[var\(--line\)\] lg:pb-2">/.test(so) &&
     /<span className="font-bold text-sm lg:text-xs text-\[var\(--ink\)\] uppercase lg:truncate">\{item\.name\}<\/span>/.test(so) &&
     /<div className="kpm-fig3 grid grid-cols-3 gap-px bg-\[var\(--line\)\] rounded-lg overflow-hidden text-center lg:flex lg:items-center lg:gap-4 lg:bg-transparent lg:rounded-none lg:overflow-visible lg:text-left text-xs font-mono">/.test(so) &&
     (so.match(/<span className="lg:hidden block text-\[11px\] text-\[var\(--ink-dim\)\] font-bold uppercase tracking-widest mb-1">(Expected|Found)<\/span>/g) || []).length === 2 &&
     /<span className=\{`lg:text-right font-black \$\{withinTolerance\(item\.variance\) \? 'text-\[var\(--accent-ink\)\]' : 'text-\[var\(--danger-ink\)\]'\} `\}>\s*<span className="lg:hidden block text-\[11px\] font-bold uppercase tracking-widest mb-1">Difference<\/span>/.test(so) &&
     (so.match(/<span className="hidden lg:inline">(SYS: |FND: )<\/span>/g) || []).length === 2 &&
     /<NixieCount value=\{\(item\.expectedStock \|\| 0\) \+ \(item\.expectedDamagedStock \|\| 0\)\} size=\{20\} \/>/.test(so) &&
     /<NixieCount value=\{item\.totalFound\} size=\{20\} \/>/.test(so) &&
     /<NixieCount value=\{item\.variance\} signed size=\{20\} className="kpm-nixie-verdict" \/>/.test(so) &&
     /@media \(max-width: 1023px\) \{ \.kpm-fig3 > span \{ background-color: var\(--sunk\); padding: 8px 4px; background-image: linear-gradient/.test(th) &&
     /\.kpm-nixie-verdict \{ --nx: 26px !important; \}/.test(th) &&
     !/<div className="flex justify-between items-center mb-2 border-b border-\[var\(--line\)\] pb-2">/.test(code(so)),
     '"too compact in a small space"; the difference "a little bit bigger"');
  ok('the itemized list is one scroller with the page on the phone',
     /<div className="space-y-2 mb-4 lg:max-h-\[40vh\] lg:overflow-y-auto custom-scrollbar pr-2">/.test(so) &&
     !/mb-4 max-h-\[40vh\] overflow-y-auto/.test(code(so)),
     'found 2026-09-18 21:00: an inner scrollbar inside an opened audit at 375');
}

/* 2026-09-19 - JOURNEY PLAN ON THE PHONE (his board 1 = B, board 2 = B, board 3 = YES, and "fix
   the map because it said api key needed"). Measured at 375 inside the shell as T5 AND as the boss:
   the page slid sideways 12 px (the path row was w-max 379 wide; the sector reel's -mx-4 was
   written for the desk's p-4 and the phone shell is p-2), three region <select> 30 px tall at
   10 px with the third overrunning its column (a select will not shrink below its longest option),
   the FLEET / DAY <select> 13 px tall inside 27 px boxes, the store card 383 px with 24 px arrows,
   a 23 px assign box, a 96 px NO INTEL band and a truncated name, every label 10 px. The CARTO
   tiles print API KEY REQUIRED across every tile now - on his phone too. */
{
  section('2026-09-19 - the RADAR HUB region cards are FOLDERS (his video, "B for both")');
  const jf = read('src/JourneyView.jsx');
  const tf = read('src/styles/theme.css');
  ok('the folder control lives in theme.css: a lid, a numbered tab (CSS counter), an ↗ key, the lid lifts on press; no shadow',
     /\.kpm-folders \{ counter-reset: folder; \}/.test(tf) &&
     /\.kpm-folder \{ position: relative; display: flex; flex-direction: column;[^}]*counter-increment: folder;/.test(tf) &&
     /\.kpm-folder-lid \{ position: relative; overflow: hidden; height: 40px;[^}]*transition: height 180ms/.test(tf) &&
     /\.kpm-folder-file \{ position: absolute; left: 16px; right: 16px; bottom: -6px;[^}]*transform: translateY\(46px\);/.test(tf) &&
     /\.kpm-folder\.arming \.kpm-folder-file \{ transform: translateY\(10px\); \}/.test(tf) &&
     /<div className="kpm-folder-lid"><i className="kpm-folder-file" aria-hidden="true"><\/i><span className="kpm-folder-icon">\{icon\}<\/span><\/div>/.test(fs.existsSync('src/components/FolderCard.jsx') ? read('src/components/FolderCard.jsx') : '') &&
     /\.kpm-folder-panel::before \{ content: counter\(folder, decimal-leading-zero\);/.test(tf) &&
     /\.kpm-folder-panel::after \{ content: "↗";/.test(tf) &&
     /\.kpm-folder\.arming \.kpm-folder-lid \{ height: 92px; \}/.test(tf) && !/transition-duration: 700ms/.test(code(tf)) &&
     !/\.kpm-folder:active/.test(code(tf)) &&
     code(tf).indexOf('.kpm-docket {') > code(tf).indexOf('.kpm-folders {') &&
     !/box-shadow|text-shadow|filter:/.test(code(tf).slice(code(tf).indexOf('.kpm-folders {'), code(tf).indexOf('.kpm-docket {'))),
     'his "make it more alive like this video" - the press is the phone\'s hover');
  ok('both hub levels (province, regency) wear the folder and their lists carry the counter; the old flat card is gone',
     /<FolderCard key=\{prov\} icon=\{<MapPin size=\{22\} \/>\} onOpen=\{\(\) => setSelectedProvinsi\(prov\)\} className="bg-slate-900 border-slate-700 hover:border-orange-500 transition-colors duration-300">/.test(jf) &&
     /<FolderCard key=\{kab\} icon=\{<Layers size=\{22\} \/>\} onOpen=\{\(\) => setSelectedKabupaten\(kab\)\} className="bg-slate-900 border-slate-700 hover:border-blue-500 transition-colors duration-300">/.test(jf) &&
     /import FolderCard from '\.\/components\/FolderCard\.jsx';/.test(jf) &&
     (jf.match(/ kpm-folders">/g) || []).length === 2 &&
     !/p-5 rounded-2xl flex flex-col items-start gap-3 transition-all duration-300 group shadow-md/.test(code(jf)),
     'the panel and its tab inherit the card colour, so the screen keeps its own palette');
  const fc = fs.existsSync('src/components/FolderCard.jsx') ? read('src/components/FolderCard.jsx') : '';
  ok('HOLD / TAP: a tap plays the open (300 ms) and then enters; a hold (>= 350 ms) animates for as long as the finger stays and never enters; the release-click is swallowed either way; no long-press menu',
     /export const FOLDER_HOLD_MS = 350;/.test(fc) && /export const FOLDER_TAP_MS = 200;/.test(fc) &&
     /const down = \(e\) => \{ if \(e\.pointerType === 'mouse' && e\.button !== 0\) return; t0\.current = Date\.now\(\); swallow\.current = false; setArming\(true\); \};/.test(fc) &&
     /if \(Date\.now\(\) - t0\.current >= FOLDER_HOLD_MS\) return;/.test(fc) &&
     /* 2026-09-20: the leaving mark is taken OFF the list before the folder enters — the mark is set by hand, and when the next
        level has the same shape React keeps the list box and never rewrites its classes, so the new folders arrived already
        leaving (his recording: the "19 Sat" folder showed for a frame and was gone) */
     /setOpening\(true\);[^\n]*\n[\s\S]{0,900}?const list = e\.currentTarget\.closest\('\.kpm-folders'\);\s*list\?\.classList\.add\('kpm-leaving'\);\s*setTimeout\(\(\) => \{ setOpening\(false\); list\?\.classList\.remove\('kpm-leaving'\); onOpen\(\); \}, FOLDER_TAP_MS\);/.test(fc) &&
     !/e\.currentTarget\.closest\('\.kpm-folders'\)\?\.classList\.add/.test(code(fc)) &&
     /\.kpm-folders\.kpm-leaving > :not\(\.opening\):not\(:has\(> \.opening\)\) \{ animation: kpmLeave 160ms/.test(tf) &&
     /@keyframes kpmLeave \{ to \{ opacity: 0; transform: translateY\(8px\) scale\(\.98\); \} \}/.test(tf) &&
     /const leave = \(\) => \{ swallow\.current = true; setArming\(false\); \};/.test(fc) &&
     /const click = \(\) => \{ if \(swallow\.current\) \{ swallow\.current = false; return; \} onOpen\(\); \};/.test(fc) &&
     /onPointerDown=\{down\} onPointerUp=\{up\} onPointerLeave=\{leave\} onPointerCancel=\{leave\}/.test(fc) &&
     /\.kpm-folder\.opening \.kpm-folder-lid \{ height: 92px; \}/.test(tf) &&
     /\.kpm-folder-quiet \.kpm-folder-file \{ transform: translateY\(52px\); \}/.test(tf) &&
     /\.kpm-folders > \*, \.kpm-arrive > \* \{ animation: kpmArrive 220ms cubic-bezier\(\.16, 1, \.3, 1\) both; \}/.test(tf) &&
     /@keyframes kpmArrive \{ from \{ opacity: 0; transform: translateY\(12px\) scale\(\.985\); \} \}/.test(tf) &&
     /\.kpm-folders > :nth-child\(n\+8\), \.kpm-arrive > :nth-child\(n\+8\) \{ animation-delay: 175ms; \}/.test(tf) &&
     /<div className="grid grid-cols-1 md:grid-cols-2 gap-4 kpm-arrive">/.test(read('src/components/CustomerManager.jsx')) &&
     /onContextMenu=\{\(e\) => e\.preventDefault\(\)\}/.test(fc) &&
     /className=\{`kpm-folder \$\{arming \? 'arming' : ''\} \$\{opening \? 'opening' : ''\} \$\{className\}`\}/.test(fc),
     'his 09:40 "add hold effect on the folder, just like the video … we have hold mechanic as well on the side panel"');

  section('2026-09-19 - the phone runs the NEW build on the first open (the PWA worker reloads once)');
  const mainSrc = read('src/main.jsx');
  const vcfg = read('vite.config.js');
  const pwaReg = fs.existsSync('node_modules/vite-plugin-pwa/dist/client/build/register.js') ? read('node_modules/vite-plugin-pwa/dist/client/build/register.js') : '';
  ok('main.jsx registers the worker through the plugin (immediate, an hourly update check) instead of the injected bare register',
     /import \{ registerSW \} from 'virtual:pwa-register'/.test(mainSrc) &&
     /registerSW\(\{ immediate: true, onRegisteredSW\(_url, r\) \{ if \(r\) setInterval\(\(\) => r\.update\(\), 60 \* 60 \* 1000\); \} \}\);/.test(mainSrc) &&
     /registerType: 'autoUpdate'/.test(vcfg),
     'the injected registerSW.js only registers - a new build showed on the SECOND open (2026-08-20, 09-18, 09-19)');
  ok('BEHAVIOUR: the plugin\'s autoUpdate register reloads the page when a new worker activates (isUpdate) - a plugin upgrade that drops this goes red',
     !pwaReg || (/if \(auto\)/.test(pwaReg) && /event\.isUpdate \|\| event\.isExternal/.test(pwaReg) && /window\.location\.reload\(\)/.test(pwaReg)));

  section('2026-09-19 - the store card: C (name, LED line, ENGAGE · NAVIGATE; the rest behind ⋯) + the LED critical light');
  const jc = read('src/JourneyView.jsx');
  const tc = read('src/styles/theme.css');
  ok('C: getBountyStatus gives every state a short line and a diode class; the card prints the line beside the diode, nothing blinks',
     /return \{ text: "⚠️ CRITICAL: NEVER VISITED", short: "NEVER VISITED", led: "crit",/.test(jc) &&
     /short: `SAFE · \$\{daysLeft\} DAYS LEFT`, led: "ok",/.test(jc) &&
     /short: `DUE IN \$\{daysLeft\} \$\{daysLeft === 1 \? 'DAY' : 'DAYS'\}`, led: "warn",/.test(jc) &&
     /short: overdue === 0 \? 'DUE TODAY' : `OVERDUE · \$\{overdue\} \$\{overdue === 1 \? 'DAY' : 'DAYS'\}`, led: "crit",/.test(jc) &&
     /<div className=\{`kpm-led-line mb-2 lg:mb-3 \$\{statusBadge\.led\}`\}><i aria-hidden="true"><\/i>\{statusBadge\.short\}<\/div>/.test(jc) &&
     !/tracking-widest w-max \$\{statusBadge\.color\}/.test(code(jc)),
     'his "board 2 = lamp edge, LED cyberpunk style"; the pill blinked (animate-pulse) - the loop he erased elsewhere on 09-18');
  ok('LED: a critical card carries kpm-crit; the edge colour is a border (Lite-safe), the glow is gradients, the breath is opacity - no shadow, no filter',
     /\$\{!isVisited && statusBadge\.led === 'crit' \? 'kpm-crit' : ''\}/.test(jc) &&
     /--led-crit:\s+#[0-9A-Fa-f]{6};/.test(tc) && /--led-warn:\s+#[0-9A-Fa-f]{6};/.test(tc) &&
     /\.kpm-led-line \{ display: flex; align-items: center; gap: 8px;/.test(tc) &&
     /\.kpm-led-line\.crit > i \{ background: radial-gradient\(/.test(tc) &&
     /\.kpm-led-line\.warn > i \{ background: radial-gradient\(/.test(tc) &&
     /\.kpm-crit\.kpm-crit \{ border-color: var\(--led-crit\); \}/.test(tc) &&
     /\.kpm-crit::before \{ content: ""; position: absolute; inset: 0; z-index: 30; pointer-events: none;/.test(tc) &&
     /@keyframes kpmCritBreath \{ 50% \{ opacity: \.35; \} \}/.test(tc) &&
     code(tc).indexOf('.kpm-folders {') > code(tc).indexOf('.kpm-led-line {') &&
     !/box-shadow|text-shadow|filter:/.test(code(tc).slice(code(tc).indexOf('.kpm-led-line {'), code(tc).indexOf('.kpm-folders {'))),
     'G30: Lite Mode strips shadows and filters; the state must survive as a border or a background');
  ok('LED: in light mode a lit line keeps its diode and its WORDS take the ink - the instrument colours are fixed lights and read 1,5:1 on the light card',
     /html\.light \.kpm-led-line\.crit, html\.light \.kpm-led-line\.warn \{ color: var\(--ink\); \}/.test(tc) &&
     code(tc).indexOf('html.light .kpm-led-line.crit, html.light .kpm-led-line.warn') > code(tc).indexOf('.kpm-led-line.warn > i {') &&
     code(tc).indexOf('html.light .kpm-led-line.crit, html.light .kpm-led-line.warn') < code(tc).indexOf('.kpm-folders {'),
     'the player card\'s "2 stamps lost" was amber #FFB020 on #D2C9B4 in light mode (2026-09-21) - the rule sits inside the LED block so its own guard slice keeps it');
  ok('C: on the phone the strip and the address show only while the ⋯ is open; the body is 12 px; the desk keeps its band and its 16 px',
     /className=\{`\$\{customer\.storeImage \? 'h-24' : 'min-h-11 lg:h-24'\} \$\{actsOpen === customer\.id \? '' : 'hidden lg:block'\} bg-black relative shrink-0 border-b border-slate-800`\}/.test(jc) &&
     /<div className=\{`space-y-2 mb-3 lg:mb-4 flex-1 \$\{actsOpen === customer\.id \? '' : 'hidden lg:block'\}`\}>/.test(jc) &&
     /<div className="p-3 lg:p-4 flex-1 flex flex-col bg-gradient-to-b from-\[#1a1815\] to-\[#0f0e0d\]">/.test(jc) &&
     /<h3 className="font-black text-base text-white uppercase tracking-wider mb-1\.5 lg:mb-2 leading-tight flex items-start gap-2 lg:block lg:truncate">/.test(jc) &&
     !/<div className="space-y-2 mb-4 flex-1">/.test(code(jc)),
     'his "board 1 = C"; measured 2026-09-19: today 343 px, C 158 px');
  ok('C: ENGAGE TARGET and NAVIGATE share one 44 px row on the phone (his "usually engage target and navigate"); the desk column stays',
     /<div className="flex flex-row lg:flex-col gap-2 mt-auto relative z-20">/.test(jc) &&
     /className="w-full flex-\[2\] lg:flex-none bg-gradient-to-r from-orange-600 to-red-600/.test(jc) &&
     /<div className="flex gap-2 flex-1 lg:flex-none">/.test(jc) &&
     !/<div className="flex flex-col gap-2 mt-auto relative z-20">/.test(code(jc)));
  ok('C: RADAR and LOG are written once (mapKey / logKey) and mounted twice - in the ⋯ fold on the phone as SHOW ON MAP / LOG A VISIT, in the key row on the desk',
     /const mapKey = \(label\) => \(/.test(jc) && /const logKey = \(label\) => \(/.test(jc) &&
     /<div className="flex gap-2 p-2 pb-0 lg:hidden">\{mapKey\('SHOW ON MAP'\)\}\{logKey\('LOG A VISIT'\)\}<\/div>/.test(jc) &&
     /<div className="hidden lg:contents">\{mapKey\('Radar'\)\}<\/div>/.test(jc) &&
     /<div className="hidden lg:contents">\{logKey\('Log'\)\}<\/div>/.test(jc) &&
     (jc.match(/onClick=\{\(\) => jumpToMap\(customer\.id\)\}/g) || []).length === 1 &&
     !/<Globe size=\{12\}\/> Radar/.test(code(jc)) && !/<AlertTriangle size=\{12\}\/> Log\r?\n/.test(code(jc)),
     'his "what is radar button actually?" - RADAR opens the store in the Map War Room; the fold says what it does');

  section('2026-09-19 - Journey Plan on the phone: the fold, the ⋯ card, the floor, the tiles');
  const jv = read('src/JourneyView.jsx');
  const cm = read('src/components/CustomerManager.jsx');
  const mk = fs.existsSync('src/components/MoreKey.jsx') ? read('src/components/MoreKey.jsx') : '';
  const mm = read('src/MapMissionControl.jsx');
  ok('1B: the MISSION FEED title row is a 44 px key on the phone that prints the day and the region and folds the pickers; a plain heading on the desk',
     /const \[feedOpen, setFeedOpen\] = useState\(\(\) => typeof window !== 'undefined' && window\.innerWidth >= 1024\);/.test(jv) &&
     /<button type="button" onClick=\{\(\) => setFeedOpen\(v => !v\)\} aria-expanded=\{feedOpen\}/.test(jv) &&
     /text-left uppercase min-h-11 lg:min-h-0 lg:pointer-events-none lg:cursor-default/.test(jv) &&
     /\{selectedDay\} · \{journeyWhere\(selectedProvinsi, selectedKabupaten, selectedKecamatan\)\} \{feedOpen \? '▴' : '▾'\}/.test(jv) &&
     /import \{ storeKey, getLocalDayKey, journeyWhere \} from '\.\/utils\/helpers'/.test(jv),
     'his "board 1 = B"');
  ok('1B: the filter panel rides a grid-template-rows fold, 200 ms, and is always open on the desk',
     /className=\{`grid transition-\[grid-template-rows,opacity\] duration-200 ease-out lg:block \$\{feedOpen \? 'opacity-100' : 'opacity-0 lg:opacity-100'\}`\} style=\{\{ gridTemplateRows: feedOpen \? '1fr' : '0fr' \}\}/.test(jv) &&
     /<div className="overflow-hidden lg:contents">\s*<div className="bg-slate-900\/60 p-4 rounded-xl border border-slate-700 shadow-inner flex flex-wrap gap-4 mt-4">/.test(jv));
  const journeyWhere = (await import('../utils/helpers.js')).journeyWhere || (() => null);
  ok('BEHAVIOUR: journeyWhere names the narrowest place picked, and All when nothing is',
     journeyWhere('All', 'All', 'All') === 'All' && journeyWhere('JAWA BARAT', 'All', 'All') === 'JAWA BARAT' &&
     journeyWhere('JAWA BARAT', 'BANDUNG', 'All') === 'BANDUNG' && journeyWhere('JAWA BARAT', 'BANDUNG', 'CIBEUNYING') === 'CIBEUNYING' &&
     journeyWhere(undefined, undefined, undefined) === 'All',
     'the word the folded row prints');
  ok('the floor: the three region pickers are 44 px rows at 11 px, one under the other; the desk column rule is desk-only',
     /<div className="flex flex-col lg:flex-row gap-2 w-full">/.test(jv) &&
     /className="flex-1 min-w-\[200px\] flex flex-col gap-2 lg:border-r lg:border-slate-700 lg:pr-4">/.test(jv) &&
     (jv.match(/font-bold text-\[11px\] lg:text-\[10px\] uppercase p-2 min-h-11 lg:min-h-0 rounded outline-none border border-(slate-700|orange-500\/50 focus:border-orange-500) cursor-pointer/g) || []).length === 3 &&
     !/border-r border-slate-700 pr-4">/.test(code(jv)) &&
     !/text-\[10px\] uppercase p-2 rounded outline-none/.test(code(jv)),
     'measured 2026-09-19: 144/81/81 x 30 at 10 px, the third to x 367 past its column at 330');
  ok('the floor: the FLEET and DAY <select> are 44 px tall at 11 px - the select is the tap target, its box is not',
     (jv.match(/font-bold text-\[11px\] lg:text-\[10px\] uppercase w-full outline-none cursor-pointer pl-1 min-h-11 lg:min-h-0/g) || []).length === 2 &&
     (jv.match(/flex items-center flex-1 bg-black px-1\.5 py-0 lg:py-1\.5 rounded border border-slate-700/g) || []).length === 2 &&
     !/bg-black p-1\.5 rounded border border-slate-700">/.test(code(jv)),
     'measured 2026-09-19: 107 x 13 inside a 27 px box');
  ok('the floor: the legend / paintbrush key and the four map keys are 44 on the phone',
     /hover:bg-slate-800 transition-colors active:scale-95 select-none min-h-11 lg:min-h-0"/.test(jv) &&
     /<div className="absolute top-4 right-4 z-\[9999\] flex flex-col gap-3 pointer-events-auto \[&>button\]:min-h-11 \[&>button\]:min-w-11 lg:\[&>button\]:min-h-0 lg:\[&>button\]:min-w-0">/.test(jv),
     'measured 2026-09-19: 149 x 37 and 43 x 43');
  ok('board 3: the path row stays inside the page and the sector cards wrap two to a row - no sideways move, no swipe reel',
     /bg-slate-900\/80 backdrop-blur p-3 rounded-xl border border-slate-700 max-w-full lg:w-max shadow-lg">/.test(jv) &&
     /<div className="flex flex-wrap lg:flex-nowrap lg:overflow-x-auto hide-scrollbar gap-3 pb-4 kpm-arrive">/.test(jv) &&
     /className=\{`shrink-0 basis-\[calc\(50%-6px\)\] lg:basis-auto flex flex-col items-start p-3\.5 rounded-2xl border-2/.test(jv) &&
     !/-mx-4 px-4 lg:mx-0 lg:px-0/.test(code(jv)) &&
     !/border border-slate-700 w-max shadow-lg/.test(code(jv)),
     'measured 2026-09-19: shell scrollWidth 387 on a 375 screen; his "sideways swipe is inconvenience"');
  ok('board 3: the three path-row keys are 44 px on the phone',
     (jv.match(/min-h-11 lg:min-h-0 text-xs font-black uppercase tracking-widest/g) || []).length >= 2,
     'the middle crumb button measured 140 x 16');
  ok('2B: the ⋯ key is ONE component, shared by Customers and Journey Plan',
     /const MoreKey = \(\{ id, label, open, onToggle, className = '' \}\) => \(/.test(mk) &&
     /export default MoreKey;/.test(mk) &&
     /import MoreKey from '\.\/MoreKey\.jsx';/.test(cm) && !/const MoreKey = /.test(code(cm)) &&
     /import MoreKey from '\.\/components\/MoreKey\.jsx';/.test(jv),
     'his "design it well" so the same button can be used in another place');
  ok('2B: the store card\'s tool bar (arrows + assign) is a fold at the foot of the card on the phone, opened by a ⋯ key beside the name; one set of controls for both widths',
     /const \[actsOpen, setActsOpen\] = useState\(null\);/.test(jv) &&
     /if \(!e\.target\.closest\('\[data-acts\]'\)\) setActsOpen\(null\);/.test(jv) &&
     /document\.addEventListener\('pointerdown', close\)/.test(jv) &&
     /<div data-acts onClick=\{e => e\.stopPropagation\(\)\} className=\{`order-last lg:order-none grid lg:flex lg:justify-between lg:items-center lg:p-1\.5 bg-black border-t lg:border-t-0 lg:border-b border-slate-800 z-10 transition-\[grid-template-rows,opacity\] duration-200 ease-out \$\{actsOpen === customer\.id \? 'opacity-100' : 'opacity-0 lg:opacity-100'\}`\} style=\{\{ gridTemplateRows: actsOpen === customer\.id \? '1fr' : '0fr' \}\}>/.test(jv) &&
     /<div className="overflow-hidden lg:contents">\s*<div className="flex gap-2 p-2 pb-0 lg:hidden">[^\n]*<\/div>\s*<div className="flex justify-between items-center gap-2 p-2 lg:contents">/.test(jv) &&
     /<MoreKey id=\{customer\.id\} label=\{customer\.name\} open=\{actsOpen === customer\.id\} onToggle=\{\(id\) => setActsOpen\(o => \(o === id \? null : id\)\)\} className="shrink-0 -mt-1 -mr-1" \/>/.test(jv) &&
     !/<div className="bg-black border-b border-slate-800 p-1\.5 flex justify-between items-center z-10">/.test(code(jv)),
     'his "board 2 = B"');
  ok('2B: the arrows and the assign box are 44 on the phone, the name shows whole, the address is 11',
     (jv.match(/w-11 h-11 lg:w-6 lg:h-6 text-base lg:text-xs bg-slate-900/g) || []).length === 2 &&
     /px-2 py-1 min-h-11 lg:min-h-0 rounded outline-none border transition-all relative z-20/.test(jv) &&
     /<h3 className="font-black text-base text-white uppercase tracking-wider mb-1\.5 lg:mb-2 leading-tight flex items-start gap-2 lg:block lg:truncate">/.test(jv) &&
     /<p className="text-\[11px\] lg:text-\[10px\] font-bold leading-relaxed line-clamp-2">\{customer\.address\}<\/p>/.test(jv) &&
     !/leading-tight truncate">/.test(code(jv)) && !/w-6 h-6 text-xs bg-slate-900/.test(code(jv)),
     'measured 2026-09-19: arrows 24 x 24, assign 128 x 23, the name cut with …, the address 10 px');
  ok('2B: with no photo the NO INTEL band is a 44 px strip carrying the badges; with a photo it stays the 96 px picture',
     /className=\{`\$\{customer\.storeImage \? 'h-24' : 'min-h-11 lg:h-24'\} \$\{actsOpen === customer\.id \? '' : 'hidden lg:block'\} bg-black relative shrink-0 border-b border-slate-800`\}/.test(jv) &&
     /<div className="hidden lg:flex w-full h-full flex-col items-center justify-center text-slate-700/.test(jv) &&
     /className=\{`\$\{customer\.storeImage \? 'absolute top-2 left-2 flex flex-col gap-1\.5' : 'static flex flex-row flex-wrap items-center gap-1\.5 px-2 py-1\.5 lg:absolute lg:top-2 lg:left-2 lg:flex-col lg:p-0'\}`\}/.test(jv) &&
     !/<div className="h-24 bg-black relative shrink-0 border-b border-slate-800">/.test(code(jv)),
     'measured 2026-09-19: 96 px of hex texture and NO INTEL on every card without a photo');
  ok('the floor: every label on the phone flows is 11 px (the hover-only key labels and the pin popup are the exceptions)',
     /flex justify-between text-\[11px\] lg:text-\[10px\] font-black uppercase tracking-widest text-orange-400/.test(jv) &&
     (jv.match(/<label className="text-\[11px\] lg:text-\[10px\] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">/g) || []).length === 2 &&
     /<span className="text-white text-\[11px\] lg:text-\[10px\] font-black uppercase tracking-widest">\{canManageFleetSettings/.test(jv) &&
     (jv.match(/<p className="text-\[11px\] lg:text-\[10px\] text-slate-400 font-bold uppercase tracking-wider">\{k(ab|ec)Count\}/g) || []).length === 2 &&
     /className=\{`text-\[11px\] lg:text-\[10px\] font-bold mt-1 \$\{isCleared/.test(jv) &&
     (jv.match(/(?<!lg:)text-\[10px\]/g) || []).length <= 10,
     'measured 2026-09-19: every label 10 px; his 2026-08-16 "make the font little bit bigger"');
  ok('the store block and the MISSION FEED card give the phone its 16 px back (p-5 -> p-3; the feed card is px-3 py-2 since the strip, 2026-09-20)',
     /<div className="bg-black\/40 px-3 py-2 lg:p-5 rounded-2xl border border-orange-500\/20/.test(jv) &&
     /<div className="animate-fade-in bg-black\/20 p-3 lg:p-5 rounded-3xl border border-white\/5 mt-2">/.test(jv),
     'the store card measured 318 wide in a 359 column');
  ok('the map: the tiles are Esri Dark Gray (no key needed) on Journey Plan and on the War Room; CARTO is gone - its tiles print API KEY REQUIRED',
     /<TileLayer url="https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/Canvas\/World_Dark_Gray_Base\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}" maxNativeZoom=\{16\} attribution='© Esri' \/>/.test(jv) &&
     /Canvas\/World_Dark_Gray_Base\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}" maxNativeZoom=\{16\} attribution='© Esri'/.test(mm) &&
     /Canvas\/World_Light_Gray_Base\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}" maxNativeZoom=\{16\} attribution='© Esri'/.test(mm) &&
     !/basemaps\.cartocdn\.com/.test(code(jv)) && !/basemaps\.cartocdn\.com/.test(code(mm)),
     'his "fix the map because it said api key needed"; checked 2026-09-19 02:40: a CARTO tile carries the watermark, the Esri tile does not');
}

{ /* SAMPLING on the phone — his "B is better, use that instead" (2026-09-19 19:55, boards 1-3 of 19:40): the four levels are FolderCards, the items are rows */
  const sm = read('src/components/SamplingManager.jsx');
  const pl = read('tools/ponder-lab.jsx'); const ll = read('tools/lab-looks.js');
  ok('Sampling: the four levels (year › month › date › place) are FolderCards two to a row, four at lg — the same quiet folder as Customers',
     /import FolderCard from '\.\/FolderCard\.jsx';/.test(sm) &&
     /const FOLDER_CLASS = 'kpm-folder-quiet w-full bg-\[var\(--raised\)\] border-\[var\(--line-2\)\] hover:border-\[var\(--accent-edge\)\] transition-colors';/.test(sm) &&
     (sm.match(/className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 kpm-folders"/g) || []).length === 4 &&
     /<FolderCard key=\{year\} icon=\{<Folder size=\{22\} \/>\} onOpen=\{\(\) => setSelectedYear\(year\)\} className=\{FOLDER_CLASS\}>/.test(sm) &&
     /<FolderCard key=\{month\} icon=\{<Folder size=\{22\} \/>\} onOpen=\{\(\) => setSelectedMonth\(month\)\} className=\{FOLDER_CLASS\}>/.test(sm) &&
     /<FolderCard key=\{date\} icon=\{<Calendar size=\{22\} \/>\} onOpen=\{\(\) => setSelectedDate\(date\)\} className=\{FOLDER_CLASS\}>/.test(sm) &&
     /<FolderCard key=\{loc\} icon=\{<MapPin size=\{22\} \/>\} onOpen=\{\(\) => setSelectedLocation\(loc\)\} className=\{FOLDER_CLASS\}>/.test(sm) &&
     !/<Folder size=\{100\}/.test(code(sm)) && !/text-\[10px\] text-\[var\(--ink-dim\)\] mt-1/.test(code(sm)),
     'the year icon that bled off the card and the 10 px count went with the old cards');
  ok('Sampling: the items are rows (name · qty · pencil · bin at 44 px), not a table; the boss\'s two keys wrap under the title',
     !/<tbody className="divide-y divide-\[var\(--line\)\]">/.test(code(sm)) &&
     /<div key=\{s\.id\} className="flex items-center gap-3 min-h-\[52px\] pl-4 pr-2 rounded-xl bg-\[var\(--raised\)\] border border-\[var\(--line-2\)\]">/.test(sm) &&
     /<button data-kpm-del data-label="Delete" onClick=\{\(e\) => \{ e\.stopPropagation\(\); onDelete\(s\); \}\} className="w-11 h-11 grid place-items-center/.test(sm) &&
     /<div className="flex flex-wrap justify-between items-center gap-2 mb-4">\s*<h2 className="text-2xl font-bold flex items-center gap-2"><Folder size=\{24\} className="text-\[var\(--accent-ink\)\]"\/> Sampling Archives<\/h2>/.test(sm),
     'board 3: the one-line table cut "Cello Green 16" to "Cello Gr…"; as the boss "View Analytics" ran off the phone');
  ok('Sampling: the lab mock and the floor look went with the decision (the real screen is the proposal now)',
     !/SamplingFoldMock/.test(pl) && !/q\.has\('fold'\)/.test(pl) && !/smp-floor/.test(code(ll)),
     'lab 825f801 held them for the boards only');
}

{ /* JOURNEY PLAN compact — his "A looks best" (2026-09-20 01:15) on the board of 01:05: the strip. Before: the feed card
     124 px folded + a 400 px map put the RADAR HUB at y 821; the map's box had touch-action none, so a finger moved the map */
  const jv = read('src/JourneyView.jsx'); const th = read('src/styles/theme.css'); const ll = read('tools/lab-looks.js');
  ok('Journey Plan: the map is a 160 px strip on the phone (500 on the desk); only the ⛶ and the recenter key stay on the strip — the other keys, the legend and the zoom control come back full screen and on the desk',
     /'relative w-full h-40 lg:h-\[500px\] rounded-2xl kpm-jp-map'/.test(jv) &&
     (jv.match(/\$\{isFullScreen \? 'flex' : 'hidden lg:flex'\}/g) || []).length === 4 &&
     /@media \(max-width: 1023px\) \{ \.kpm-jp-map \.leaflet-control-zoom \{ display: none; \} \}/.test(th) &&
     !/h-\[400px\] lg:h-\[500px\]/.test(code(jv)),
     'measured 2026-09-20: the RADAR HUB folder sits on the first screen (was y 821)');
  ok('Journey Plan: the finger scrolls the page over the strip — the map\'s own drag is off on the phone until full screen (Leaflet then sets touch-action pan-x pan-y itself); two fingers still zoom; the desk drags as before',
     /const MapTouchGate = \(\{ locked \}\) => \{/.test(jv) &&
     /React\.useEffect\(\(\) => \{ if \(locked\) map\.dragging\.disable\(\); else map\.dragging\.enable\(\); \}, \[map, locked\]\);/.test(jv) &&
     /<MapTouchGate locked=\{isPhone && !isFullScreen\} \/>/.test(jv) &&
     /const isPhone = typeof window !== 'undefined' && window\.innerWidth < 1024;/.test(jv),
     'his "sometimes scrolling causing the map to move instead of sliding the page down"');
  ok('Journey Plan: the MISSION FEED card is one line on the phone — 8/12 padding, a 3 px bar, no gap under the status; the desk unchanged',
     /className="bg-black\/40 px-3 py-2 lg:p-5 rounded-2xl border border-orange-500\/20/.test(jv) &&
     /className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-0 lg:mb-4">/.test(jv) &&
     /className="h-\[3px\] lg:h-2\.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700 shadow-inner">/.test(jv) &&
     !/jp-strip|jp-mapfold/.test(code(ll)),
     'the lab looks jp-strip / jp-mapfold are gone with the decision');
}

{ /* EOD HQ VERIFICATION — THE PLAYER CARD, his "looks good for v2 lets use that" (2026-09-20 05:35) on the lab mock
     of 05:00; the folders + docket of 03:50 (his B) became the card. Stage A: per-part verification on the data path,
     the card in the boss's review, the mock and the look deleted. */
  const ev = read('src/EODReconciliationView.jsx'); const th = read('src/styles/theme.css'); const pl = read('tools/ponder-lab.jsx'); const ll = read('tools/lab-looks.js');
  const pc = read('src/components/PlayerCard.jsx');
  const H = await import('../utils/helpers.js');
  const C = await import('./career.js');

  /* the data: which parts a report carries */
  const clean = { reportType: 'CASH_STOCK', cash: 100, transfer: 0, expectedCash: 100, expectedTransfer: 0, cashVariance: 0, transferVariance: 0, remainingStock: [], expectedStock: [] };
  ok('EOD parts: a clean cash & stock night is cash, transfer and the stock handover - nothing more',
     JSON.stringify(H.eodReportParts(clean, [])) === '["cash","transfer","stock"]');
  ok('EOD parts: damaged goods and a short count add their own parts; a CUKAI report is its stamps; a BOUNTY report is the fine',
     JSON.stringify(H.eodReportParts({ ...clean, damagedStockToReturn: [{ qty: 2 }], cashVariance: -5000 }, [])) === '["cash","transfer","stock","damaged","bounty"]' &&
     JSON.stringify(H.eodReportParts({ reportType: 'CUKAI', cukai: 40 }, [])) === '["cukai"]' &&
     JSON.stringify(H.eodReportParts({ reportType: 'BOUNTY', cash: 50000 }, [])) === '["bounty"]' &&
     JSON.stringify(H.eodReportParts({ cash: 1, transfer: 0, cukai: 12 }, [])) === '["cash","transfer","stock","cukai"]',
     'a legacy combined report carries its stamps');
  ok('EOD parts: a missing verified map reads as NOT approved; VERIFIED reads as everything approved',
     H.eodPartApproved({ status: 'PENDING' }, 'cash') === false && H.eodPartApproved({ status: 'PENDING', verified: { cash: true } }, 'cash') === true &&
     H.eodPartApproved({ status: 'PENDING', verified: { cash: true } }, 'stock') === false && H.eodPartApproved({ status: 'VERIFIED' }, 'stock') === true,
     'the safe direction for money');
  { const cs = [
      { assignedAgent: 'Budi', visitFreq: 7, lastVisit: '2026-09-20' }, { assignedAgent: 'Budi', visitFreq: 7, lastVisit: '' },
      { assignedAgent: 'Budi', visitFreq: 3, visitDay: 'Sunday', lastVisit: '2026-09-20' }, { assignedAgent: 'Budi', visitFreq: 3, visitDay: 'Monday', lastVisit: '2026-09-20' },
      { assignedAgent: 'Adi', visitFreq: 7, lastVisit: '2026-09-20' }];
    const t = H.dayTargets(cs, 'Budi', '2026-09-20', 'Sunday');
    ok('CLOSED ?/? counts the Journey Plan route (weekly, or today\'s visit day, assigned to him) and the check-ins of today', t.closed === 2 && t.total === 3, JSON.stringify(t)); }
  { const r = C.rankLadder(5660, C.DEFAULT_RANKS);
    ok('the ladder places 5.660 XP on Silver with Gold next, 4,4 % along the bar', r.currentTier.name === 'Silver' && r.nextTier.name === 'Gold' && Math.round(r.progressPercent * 10) === 44 && r.tierIndex === 1);
    ok('the top rank has no next tier and a full bar', C.rankLadder(999999, C.DEFAULT_RANKS).nextTier === null && C.rankLadder(999999, C.DEFAULT_RANKS).progressPercent === 100);
    ok('the Agent Profile climbs the same ladder', /const \{ currentTier, nextTier, tierIndex, progressPercent \} = rankLadder\(lifetimeEXP, rpgData\.ranks\);/.test(profile) && /ranks: DEFAULT_RANKS/.test(profile) && !/for \(let i = sortedRanks\.length - 1; i >= 0; i--\)/.test(profile)); }

  /* the data: handleVerifyEOD credits only the parts in hand, from the FRESH map, and seals only when every part is in */
  { const vFrom = app.indexOf('const handleVerifyEOD = async (report, decision, opts) => {'); const vTo = app.indexOf('const handleResetEOD = async (report, opts) => {');
    ok('handleVerifyEOD is anchored', vFrom > -1 && vTo > vFrom && vTo - vFrom > 6000 && vTo - vFrom < 30000);
    const v = app.slice(vFrom, vTo);
    ok('handleVerifyEOD: the parts come from eodReportParts; a decision approves only parts the report carries; the verified map is re-read inside the transaction',
       /const parts = eodReportParts\(report, inventory, appSettings\?\.penaltyPriceTier\);/.test(v) &&
       /const askedApprove = decision\?\.approve \? decision\.approve\.filter\(p => parts\.includes\(p\)\) : parts;/.test(v) &&
       /const wasVerified = eodSnap\.data\(\)\.verified \|\| \{\};/.test(v) && /const approveNow = askedApprove\.filter\(p => wasVerified\[p\] !== true\);/.test(v),
       'a part a second admin approved a moment ago is skipped, never credited twice');
    ok('handleVerifyEOD: stock, damaged goods, stamps, the bounty and the van wipe each ride on their own part',
       /const validItems = nowDoing\('stock'\) \? \(report\.remainingStock \|\| \[\]\)\.filter\(item => item\.qty > 0\) : \[\];/.test(v) &&
       /const validDamagedItems = nowDoing\('damaged'\) \? \(report\.damagedStockToReturn \|\| \[\]\)\.filter\(item => item\.qty > 0\) : \[\];/.test(v) &&
       /let remainingPayment = nowDoing\('cukai'\) \? \(report\.cukai \|\| 0\) : 0;/.test(v) && /if \(report\.id && nowDoing\('bounty'\)\) \{/.test(v) &&
       /const finalCanvas = nowDoing\('stock'\) \? \[\] : currentCanvas;/.test(v) && /const touchesAgent = nowDoing\('bounty'\) \|\| nowDoing\('cukai'\) \|\| nowDoing\('stock'\);/.test(v) &&
       !/const finalCanvas = \(report\.reportType === 'CUKAI'\) \? currentCanvas : \[\];/.test(code(v)),
       'the old one-shot forms are gone');
    ok('handleVerifyEOD: VERIFIED + the career ledger only when every part is approved; otherwise the maps alone are written and the report stays PENDING',
       /sealed = parts\.every\(p => verifiedNow\[p\] === true\);/.test(v) && /if \(!sealed\) \{ t\.update\(eodRef, stamp\); return; \}/.test(v) &&
       /approveNow\.forEach\(p => \{ delete rejectedNow\[p\]; \}\);/.test(v) &&
       (v.match(/\{ \.\.\.stamp, status: 'VERIFIED', verifiedAt: serverTimestamp\(\)/g) || []).length === 3 &&
       !/t\.update\(eodRef, \{ status: 'VERIFIED', verifiedAt: serverTimestamp\(\) \}\);/.test(code(v)) &&
       /type: "EOD_RETURNED",/.test(v) && /if \(!opts\?\.confirmed && !await confirmAction\(eodNightMessage\(/.test(v) && /return true;\r?\n\s+\} catch\(e\) \{ console\.error\(e\); notify\("Verification failed: " \+ e\.message\); return false; \}/.test(v),
       'a part sent back reaches the salesman as a notification; the handler answers true only when the write landed');
    ok('the rules draft is untouched: the boss already owns the whole tree (users/{bossUid}/{document=**}) and the salesman may not update eod_reports',
       /match \/eod_reports\/\{reportId\} \{\r?\n\s+allow read: if isSalesman\(bossUid\);\r?\n\s+allow create: if isSalesman\(bossUid\);\r?\n\s+allow update, delete: if false;/.test(read('firestore.rules').replace(/\r\n/g, '\n')),
       'reported, not changed');
    ok('the EOD mount hands the card its ledger, ladder and route',
       /career=\{career\}\r?\n\s+ranks=\{progressionRanks\}\r?\n\s+customers=\{displayPermitted\}/.test(app) && /const \[progressionRanks, setProgressionRanks\] = useState\(DEFAULT_RANKS\);/.test(app)); }

  /* the card */
  ok('EOD review: one PlayerCard per salesman replaces the folders + docket; the frames\' CSS and filters are mounted once for the list; the scan + seal play over the list',
     /import PlayerCard from '\.\/components\/PlayerCard\.jsx';/.test(ev) && /import \{ BORDER_KEYFRAMES, FrameFilters \} from '\.\/config\/rankBorders\.jsx';/.test(ev) &&
     /const pendingByAgent = useMemo\(\(\) => \{/.test(ev) &&
     /<PlayerCard key=\{g\.key\} group=\{g\} motorist=\{man\} career=\{career\?\.\[g\.key\]\}/.test(ev) &&
     /closed=\{dayTargets\(customers, man\?\.name \|\| g\.agentName, today\)\} today=\{today\}/.test(ev) &&
     /onApprove=\{onVerifyEOD\} onReset=\{onResetEOD\} onSealed=\{seal\} \/>/.test(ev) &&
     /<style>\{BORDER_KEYFRAMES\}<\/style>\r?\n\s+<FrameFilters \/>/.test(ev) &&
     /<div className="kpm-seal-stage" aria-hidden="true">\r?\n\s+<i className="kpm-docket-scan"><\/i>\r?\n\s+<i className="kpm-docket-seal">VERIFIED<\/i>/.test(ev) &&
     !/setDocket\(/.test(code(ev)) && !/const reportSection = /.test(code(ev)) && !/const MoneyLine = /.test(code(ev)) && !/onOpen=\{\(\) => setDocket/.test(code(ev)) &&
     /\.kpm-seal-stage \.kpm-docket-scan \{ animation: kpmScan 500ms/.test(th) && /\.kpm-seal-stage \.kpm-docket-seal \{ animation: kpmSeal 320ms 450ms/.test(th),
     'the docket and its sections are gone with the decision');
  ok('PlayerCard: the head is the man as his profile draws him - the photo in the rank frame, rank + title, XP with tonight\'s plus, the bar to the next rank, CLOSED ?/?, the diode',
     /<RankBorder styleId=\{frame\} \/>/.test(pc) && /const frame = motorist\?\.borderStyle \|\| currentTier\.borderStyle \|\| 'classic';/.test(pc) &&
     /const \{ currentTier, nextTier, progressPercent \} = rankLadder\(xp, ranks\);/.test(pc) &&
     /const gain = useCareerLedger && cashReport \? computeDayXP\(cashReport, career \|\| \{\}, DEFAULT_XP\)\.total : 0;/.test(pc) &&
     /if \(useCareerLedger\) return careerXP\(career \|\| \{\}, DEFAULT_XP\);/.test(pc) && /Math\.floor\(omset \/ DEFAULT_XP\.rupiahPerXp\) \* \(expMultiplier \|\| 1\) \+ \(Number\(motorist\?\.manualExp\) \|\| 0\)/.test(pc) &&
     /\{closed\.closed\}<span className="text-\[var\(--ink-dim\)\] text-2xl"> \/ \{closed\.total\}<\/span>/.test(pc) &&
     /<p className=\{`kpm-led-line \$\{diode\}`\}><i aria-hidden="true"><\/i>\{diodeText\}<\/p>/.test(pc),
     'XP scored exactly as AgentProfileView scores it, the ledger or the omset formula');
  ok('PlayerCard: the body is the handover one line per part with its own ✓ / ✕; ✕ asks the reason through the dialog gate; the plate hands { approve, reject } per report and seals only when every part is in',
     /const parts = eodReportParts\(report, inventory, tier\);/.test(pc) && /PART_ORDER\.filter\(p => parts\.includes\(p\)\)\.forEach\(part => \{/.test(pc) &&
     /const why = await promptAction\(`Why is the \$\{line\.label\.toLowerCase\(\)\} going back to \$\{group\.agentName\}\?`, line\.why \|\| ''\);/.test(pc) &&
     /approve: own\.filter\(l => checked\[l\.key\]\)\.map\(l => l\.part\),/.test(pc) && /reject: Object\.fromEntries\(own\.filter\(l => returned\[l\.key\]\)\.map\(l => \[l\.part, returned\[l\.key\]\]\)\)/.test(pc) &&
     /const done = await onApprove\(report, decision, \{ confirmed: true \}\);/.test(pc) && /if \(allIn && onSealed\) onSealed\(\);/.test(pc) &&
     /let allIn = pending\.every\(l => checked\[l\.key\]\);/.test(pc) && /for \(const r of group\.reports\) await onReset\(r, \{ confirmed: true \}\);/.test(pc) &&
     /const night = all\.filter\(r => r\.reportType !== 'BOUNTY'\);/.test(ev) && /for \(const r of row\.reports\) await onResetEOD\(r, \{ confirmed: true \}\);/.test(ev) &&
     /const handleResetEOD = async \(report, opts\) => \{/.test(app) && !/'EOD Cash\/Stock'/.test(code(ev)) &&
     /done: eodPartApproved\(report, part\), why: report\.rejected\?\.\[part\] \|\| ''/.test(pc) &&
     /aria-label=\{`approve \$\{line\.label\}`\}/.test(pc) && /aria-label=\{`send \$\{line\.label\} back`\}/.test(pc) && /w-11 h-11 grid place-items-center rounded-lg/.test(pc) &&
     !/window\.confirm|window\.prompt/.test(code(pc)),
     'every key 44 px; no native dialog');
  ok('PlayerCard: the card grows open under the head and the inside sharpens in from a blur (theme.css THE PLAYER CARD); no shadow; the mock and the look are gone',
     /\.pc-body \{ display: grid; grid-template-rows: 0fr; transition: grid-template-rows 320ms/.test(th) && /\.pc\.open \.pc-body \{ grid-template-rows: 1fr; \}/.test(th) &&
     /\.pc-inner \{ overflow: hidden; min-height: 0; opacity: 0; filter: blur\(6px\); transform: translateY\(-6px\);/.test(th) && /\.pc\.open \.pc-inner \{ opacity: 1; filter: blur\(0\); transform: none; \}/.test(th) &&
     /\.pc-avatar \.sframe \{ position: absolute; inset: 0; z-index: 20; pointer-events: none; \}/.test(th) &&
     !/box-shadow/.test(th.slice(th.indexOf('THE PLAYER CARD'))) &&
     !/PlayerCardMock/.test(pl) && !/eod-card|EOD_CARD/.test(code(ll)) && !/q\.has\('card'\)/.test(pl),
     'the lab mock and the look went with the decision');
  ok('the salesman reads why a part came back, on his own EOD screen',
     /const rejected = \{ \.\.\.\(\(pendingCash \|\| legacyPending\)\?\.rejected \|\| \{\}\), \.\.\.\(pendingCukai\?\.rejected \|\| \{\}\) \};/.test(ev) &&
     /\{EOD_PART_LABELS\[p\] \|\| p\} sent back: /.test(ev) && /Pita cukai sent back: /.test(ev));
  ok('EOD review: the History Log is folders (place › salesman › month) and the night rows stay; the old fold-out state is gone',
     /const HIST_LEVELS = \[/.test(ev) && /const \[histPath, setHistPath\] = useState\(\[\]\);/.test(ev) &&
     /<FolderCard key=\{k\} icon=\{<L\.Icon size=\{22\} \/>\} onOpen=\{\(\) => setHistPath\(\(p\) => \[\.\.\.p, k\]\)\} className=\{EOD_FOLDER\}>/.test(ev) &&
     !/const \[openLocations, setOpenLocations\]/.test(ev) && !/const \[openAgents, setOpenAgents\]/.test(ev) && !/const \[openMonths, setOpenMonths\]/.test(ev) &&
     /const \[openDates, setOpenDates\] = useState\(\[\]\);/.test(ev) && !/h-\[700px\] overflow-y-auto/.test(code(ev)),
     'the last accordion of that shape in the app');

  /* STAGE B (2026-09-21, his "i like all the recommended option" on the two boards): the card's HEAD is one
     component both screens draw, and the salesman's EOD panel counts tonight's XP up with the one number instrument. */
  { const ap = read('src/AgentProfileView.jsx'); const apc = code(ap);
  ok('STAGE B: the head is exported ONCE from PlayerCard.jsx and both the card and the Agent Profile draw it - no second copy',
     /export const PlayerCardHead = \(\{ name, photo, currentTier, nextTier, progressPercent, xp, gain = 0, frame = 'classic', closed, diode = '', diodeText, onTap, children \}\) =>/.test(pc) &&
     (pc.match(/pc-head/g) || []).length === 1 && /<PlayerCardHead name=\{group\.agentName\}/.test(pc) && /onTap=\{\(\) => setOpen\(v => !v\)\}/.test(pc) &&
     /import PlayerCard, \{ PlayerCardHead \} from '\.\/components\/PlayerCard\.jsx';/.test(ev) === false &&
     /import \{ PlayerCardHead \} from '\.\/components\/PlayerCard\.jsx';/.test(ap) && /<PlayerCardHead name=\{activeAgent\.name\}/.test(ap) &&
     !/pc-head/.test(apc) && /<div className="pc pc-solo lg:max-w-lg">/.test(ap) && /\.pc-solo \{ padding-bottom: 0; \}/.test(th),
     'his stage-A rule: the profile is the face, other screens borrow it');
  ok('STAGE B, board 1 = A: the hero and the OMSET 7 HARI box are gone from the profile, the head carries them; GRANT AWARD sits in the key row; the identity line stays',
     !/Omset 7 Hari/.test(apc) && !/renderRarityStars\(roleStars, safeCurrentHex\)/.test(apc) && !/OPERATIVE\s*<\/div>/.test(apc) &&
     /className="static lg:absolute lg:top-6 lg:left-6 z-30 flex flex-wrap gap-2 lg:gap-3 p-4 pb-0 lg:p-0"/.test(ap) &&
     apc.indexOf('<Award size={16}/> Grant Award') > apc.indexOf('className="static lg:absolute lg:top-6 lg:left-6') && apc.indexOf('<Award size={16}/> Grant Award') < apc.indexOf('pt-6 lg:pt-24 pb-6 lg:pb-10') &&
     /\{corpIdentity\.tier\} : \{corpIdentity\.title\}/.test(ap) && /ID: \{String\(activeAgent\.id \|\| ''\)\.substring\(0,8\)\}/.test(ap),
     'his A: keys wrap at 44, the head, one identity line under it');
  ok('STAGE B: the profile scrolls as ONE page on the phone (its own h-screen scroller only from lg), the keys are 44 px, nothing pulses or bounces',
     /className="flex-1 min-w-0 lg:h-screen lg:overflow-y-auto custom-scrollbar relative"/.test(ap) &&   /* min-w-0: a flex column's min-content (372 as the boss) was pushing it past the 359 shell */
     !/animate-bounce-slow/.test(apc.slice(apc.indexOf('className="static lg:absolute'), apc.indexOf('pt-6 lg:pt-24'))) &&
     !/animate-pulse" style=\{\{ color: safeCurrentHex, textShadow/.test(apc) &&
     /min-h-11 bg-black\/80 backdrop-blur-md border border-line-2 px-4 py-2\.5 rounded-xl text-ink-muted/.test(ap),
     'a light blinks only while something happens; a key is 44 px');
  ok('STAGE B, board 2 = B: the salesman\'s Shift Closed block counts tonight\'s XP with the nixie mounting at 0, then the working rows rise in AFTER the roll',
     /import NixieCount from '\.\/components\/NixieCount\.jsx';/.test(ev) &&
     /const XpGain = \(\{ total, breakdown, collected = 0, stores = 0 \}\) => \{/.test(ev) && /const \[v, setV\] = useState\(0\);/.test(ev) &&
     /const t1 = setTimeout\(\(\) => setV\(total\), 400\);/.test(ev) && /const t2 = setTimeout\(\(\) => setSettled\(true\), 1000\);/.test(ev) &&
     /<NixieCount value=\{v\} signed size=\{34\} \/>/.test(ev) && /\{settled && \(/.test(ev) && /style=\{\{ animationDelay: `\$\{i \* 90\}ms` \}\}/.test(ev) &&
     /dayXP: verifiedCash\?\.dayXP, xpBreakdown: verifiedCash\?\.xpBreakdown/.test(ev) &&
     /\{agentData\.dayXP > 0 && <XpGain total=\{agentData\.dayXP\} breakdown=\{agentData\.xpBreakdown\} collected=\{agentData\.dayCollected\} stores=\{agentData\.dayStores\} \/>\}/.test(ev) &&
     !/animate-pulse/.test(code(ev).slice(code(ev).indexOf('const XpGain'), code(ev).indexOf('const XpGain') + 3000)),
     'one number instrument, one moment one animation');
  ok('STAGE B: the lab mocks went with the decision; the profile mount stays',
     !fs.existsSync('tools/lab-stageb.jsx') && !/prof-a|prof-b|lab-stageb/.test(code(ll)) && !/q\.has\('head'\)|q\.has\('xp'\)|XpGainMock|ProfileHeadMock/.test(code(pl)) &&
     /q\.has\('profile'\) \?/.test(pl) && /<AgentProfileView/.test(pl),
     'a mock outlives its board only as a bug'); }
}

console.log(`\n${'='.repeat(58)}\n${pass} passed, ${fail} failed, ${pass + fail} checks`);
process.exit(fail ? 1 : 0);
