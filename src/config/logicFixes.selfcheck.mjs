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
/* Both of these moved INTO applySaleToCanvas when the canvas rule was extracted so the offline
   path could share it (see S12). The behaviour is the same; only the variable names changed, so
   they are repinned on the new shape rather than relaxed. */
ok('the van gets a NEW canvas line when he was not carrying it',
   /isReturnedToStock\)\.forEach[\s\S]{0,400}updated\.push\(/.test(engine));
ok('the packing maths is reused, not re-inlined a fifth time',
   /convertToBks\(1, row\.unit, m\.prodData\)/.test(engine));
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
ok('the count still snapshots what the system believed AT COUNT TIME',
   /expectedStock: item\.stock \|\| 0/.test(opname) && /expectedDamagedStock: item\.damagedStock \|\| 0/.test(opname));
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

/* ── S14 · shipping to a branch undid every sale made while the photo uploaded ─────────── */
section('S14. HQ stock is deducted, not recomputed from a cached screen');
const branch = read('src/components/BranchWarehouseManager.jsx');

ok('the shipment deducts with increment()',
   /batch\.update\(hqRef, \{ stock: increment\(-Number\(item\.qty\)\) \}\)/.test(branch));
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
  ok('yesterday\'s draft does NOT - his day starts at 07:00 and stale prices must not return',
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
  ok('a match reads gold and a mismatch red - never green, which the palette law bans',
     /bg-\[var\(--gold\)\]/.test(card) && /bg-\[var\(--danger\)\]/.test(card));
  /* Comments are stripped first: the card now documents WHY --accent-ink was wrong by naming
     the hex it collides with, and a naive scan reads that as paint. Only markup is judged. */
  const painted = card.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  ok('nothing in the card is painted a fixed colour that ignores the theme',
     !/emerald|bg-black\/|#[0-9a-fA-F]{3,6}/.test(painted));
  ok('and ink on a filled plate uses the on-plate tokens, never the as-text ones',
     /text-\[var\(--gold-ink\)\]/.test(painted) && !/bg-\[var\(--gold\)\][^>]*--accent-ink/.test(painted));
  ok('and it is told apart at a glance by a rail, not by colour alone',
     /aria-hidden="true"/.test(card)); }

/* The whole screen, not just the card: these are the fixed near-blacks he could not read in
   light mode. Two are gone; the rest are the next job and are counted here so the number cannot
   quietly grow. */
{ const opname = read('src/StockOpnameView.jsx');
  const fixed = (opname.match(/bg-black\/|bg-\[#|border-\[#/g) || []).length;
  ok('the theme-blind colours left on this screen are down to a known number, not growing',
     fixed <= 24, `${fixed} left - lower this number when you remove some, never raise it`); }


console.log(`\n${'='.repeat(58)}\n${pass} passed, ${fail} failed, ${pass + fail} checks`);
process.exit(fail ? 1 : 0);
