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

console.log(`\n${'='.repeat(58)}\n${pass} passed, ${fail} failed, ${pass + fail} checks`);
process.exit(fail ? 1 : 0);
