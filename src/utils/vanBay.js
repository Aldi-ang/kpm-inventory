/* The van-loading bay's arithmetic (components/LoadingBay.jsx), kept pure so the self-check can
   re-run it on real numbers. Everything is in packs (Bks) through the app's own convertToBks, so
   the "= N Bks" he reads in the HOW MANY panel is exactly what MUAT VAN moves. */
import { convertToBks, storeKey, storeLabel, isPromo } from './helpers.js';
import { debtCredit, isTitip } from './revenueRule.js';

export const PER = 6;          // squares on a page
export const CELLS = 18;       // the van's layout: three pages, and a hole means something
/* a promo item is counted in pieces (stage 3): convertToBks already returns its plain count, this is only the word */
export const unitOf = (product) => (isPromo(product) ? 'pcs' : 'Bks');

/* THE VAN'S PROMO GOODS (stage 3, his answer 3b "leftovers return to the Master Vault at EOD"): their own field on the
   motorist doc, `promoCanvas`, never inside activeCanvas - fourteen screens and every sale read activeCanvas as Bks, and a
   phone on an older build would sell a T-shirt from it at Rp 0. One line per product, in pcs, no price. A negative delta
   takes pieces off; more than the van holds returns null. The list it is given is never changed. */
export function movePromo(canvas, product, delta) {
  const list = (canvas || []).map(l => ({ ...l }));
  const i = list.findIndex(l => l.productId === product.id);
  const have = i >= 0 ? Number(list[i].qty) || 0 : 0;
  if (have + delta < 0) return null;
  if (i < 0) list.push({ productId: product.id, name: product.name, qty: delta, unit: 'pcs', promo: true });
  else list[i].qty = have + delta;
  return list.filter(l => l.qty > 0);
}

/* GIVING (stage 4, his answers 1a "only with a sale" and 5 "they buy more = receive more"): what a sale hands over is its
   own list, `promoGiven` on the receipt, never a line of `items` - every revenue, target and pita cukai sum reads items.
   Whole pieces only; nothing at zero. */
export const giveLines = (give) => (give || [])
  .map(g => ({ productId: g?.productId, name: g?.name, qty: Math.floor(Number(g?.qty) || 0) }))
  .filter(g => g.productId && g.qty > 0);

/* The given pieces off the van's promoCanvas. A give the van cannot cover takes what is there and is named in `short`
   (missingPcs) - the offline replay keeps the money and reports the gap, like settleSale. */
export function settlePromo(canvas, given) {
  let list = canvas || [];
  const short = [];
  for (const g of given || []) {
    const have = Number(list.find(l => l.productId === g.productId)?.qty) || 0;
    const take = Math.min(have, g.qty);
    if (take < g.qty) short.push({ productId: g.productId, name: g.name, missingPcs: g.qty - take });
    if (take > 0) list = movePromo(list, { id: g.productId, name: g.name }, -take);
  }
  return { canvas: list.map(l => ({ ...l })), short };
}

/* The online sale's form: a short van refuses the whole sale before anything is written. */
export const applyGiveToPromo = (canvas, given) => {
  const { canvas: left, short } = settlePromo(canvas, given);
  if (short.length) throw `Not enough ${short[0].name} in the van to give (${short[0].missingPcs} pcs short)!`;
  return left;
};

/* What the van holds on THIS phone: the server's promoCanvas minus this van's gives still waiting in the Ghost Ledger
   (the promo twin of vanSync's canvasWithPending). */
export const promoWithPending = (canvas, pendingTxs, vanId) => (pendingTxs || [])
  .filter(tx => tx.vanPending && vanId && tx.agentId === vanId && tx.promoGiven?.length)
  .reduce((list, tx) => settlePromo(list, tx.promoGiven).canvas, canvas || []);

/* A FACTORY OFFER - "buy 1 Bal, get 1 T-shirt" (his 2026-10-26: "price is only recorded from the cigarette price only and
   the promotional goods is just for bonus"). A recipe on settings/general.promoBundles, `{ id, name, lines: [{ productId,
   qty, unit }], gives: [{ productId, qty }] }`, with NO price of its own: the terminal turns it into ordinary cart lines at
   the shop's tier plus pieces in the give box, so every money path stays as it was. Can THIS van cover it on top of what
   the cart and the give box already hold? `why` names the first thing missing, in his words. */
export function bundleCheck(bundle, inventory, promoVan, cart = [], give = {}) {
  const lines = [], gives = [];
  for (const l of bundle?.lines || []) {
    const product = (inventory || []).find(p => p.id === l.productId);
    if (!product) return { ok: false, why: `${bundle.name}: a product in it is not in this van's list any more.` };
    const bks = convertToBks(Number(l.qty) || 0, l.unit || 'Bks', product);
    const inCart = (cart || []).filter(i => i.productId === product.id).reduce((s, i) => s + convertToBks(i.qty, i.unit, i.product || product), 0);
    if (inCart + bks > (Number(product.stock) || 0)) return { ok: false, why: `Not enough ${product.name} in the van for ${bundle.name} (needs ${bks} Bks).` };
    lines.push({ product, qty: Number(l.qty) || 0, unit: l.unit || 'Bks', bks });
  }
  for (const g of bundle?.gives || []) {
    const van = (promoVan || []).find(v => v.productId === g.productId);
    const qty = Math.floor(Number(g.qty) || 0);
    const left = (Number(van?.qty) || 0) - (Number(give?.[g.productId]) || 0);
    if (qty > left) return { ok: false, why: left > 0
      ? `Only ${left} pcs ${van.name} left in the van - ${bundle.name} gives ${qty}.`
      : `No ${van?.name || g.name || 'promo piece'} left in the van for ${bundle.name}.` };
    if (qty > 0) gives.push({ productId: g.productId, name: van.name, qty });   // van is set: qty > left above refuses a missing one
  }
  if (!lines.length) return { ok: false, why: `${bundle?.name || 'This bundle'} has no cigarettes in it.` };
  return { ok: true, why: '', lines, gives };
}

/* ONE LINE PER PRODUCT, SIGNED: dir +1 goes into the van, dir -1 back to the warehouse. */
export const lineBks = (line, product) => convertToBks(line.qty, line.unit, product);
export const netBks = (lines, id, product) => {
  const l = lines.find(x => x.id === id);
  return l ? l.dir * lineBks(l, product) : 0;
};
/* the most a new drag can still move: what the warehouse holds less what the muatan already takes;
   what the van holds plus what the muatan already brings */
export const loadCap = (stockBks, net) => stockBks - net;
export const backCap = (vanBks, net) => vanBks + net;

/* A confirmed HOW MANY folds into the muatan. Same direction and unit adds up; a second unit or a
   drag the other way folds the line into signed packs; a net of zero drops the line. */
export function foldLine(lines, { id, qty, unit, dir, bks }, product, mode = 'add') {
  const line = lines.find(l => l.id === id);
  if (mode === 'edit') return lines.map(l => (l.id === id ? { ...l, qty, unit, reason: undefined } : l));
  if (!line) return [...lines, { id, qty, unit, dir }];
  if (line.dir === dir && line.unit === unit) return lines.map(l => (l === line ? { ...l, qty: l.qty + qty, reason: undefined } : l));
  const net = line.dir * lineBks(line, product) + dir * bks;
  if (net === 0) return lines.filter(l => l !== line);
  return lines.map(l => (l === line ? { id, dir: net > 0 ? 1 : -1, qty: Math.abs(net), unit: unitOf(product) } : l));
}

/* The van's squares. The saved layout comes first, holes and all; a square whose product has left
   the van (and is not planned) goes back to empty; every product with no square takes the first
   empty one. More products than squares grows a page - a chest never hides stock. `per` is the squares on a
   page: 6 on the PC, 4 on the phone (his 07:50 "make per page 4 box only"), so the phone's van has 20. */
export function vanCells(layout, keepIds, per = PER) {
  const keep = new Set(keepIds);
  const size = Math.max(Math.ceil(CELLS / per) * per, Math.ceil(keepIds.length / per) * per);
  const cells = Array.from({ length: size }, (_, i) => (layout && keep.has(layout[i]) ? layout[i] : null));
  cells.forEach((id, i) => { if (id && cells.indexOf(id) !== i) cells[i] = null; });   // one product, one square
  for (const id of keepIds) {
    if (cells.includes(id)) continue;
    const empty = cells.indexOf(null);
    if (empty < 0) break;
    cells[empty] = id;
  }
  return cells;
}

/* WHERE A LOAD LANDS: a product already in a square joins it (one product, one square, one line -
   the same merge handleLoadCanvas does on the van row); else the empty square under the finger,
   then the first empty square on this page, then anywhere. -1 = the van is full. */
export function landingCell(cells, id, under, page, per = PER) {
  const own = cells.indexOf(id);
  if (own >= 0) return own;
  if (under >= 0 && under < cells.length && !cells[under]) return under;
  for (let c = page * per; c < page * per + per && c < cells.length; c++) if (!cells[c]) return c;
  return cells.indexOf(null);
}

/* HIS USUAL LOAD, put back in the muatan. His rule, 2026-09-24: "A preset only fills the muatan, the same way
   a drag does. That keeps the rule that only MUAT VAN moves stock, so a wrong preset can never change real
   numbers by itself." So each saved line folds in through foldLine, capped at what the warehouse can still
   give (loadCap), and a new product takes its square through landingCell. Every line that did not go in
   whole comes back in `cut` with its reason: short (cut to what is left), planned (all of it is already in
   the muatan), dry (the shelf is empty), missing (this warehouse does not carry it), full (no square). */
export function applyPreset(lines, cells, preset, P, page = 0, per = PER) {
  let L = lines;
  const C = [...cells], cut = [];
  for (const { id, qty, unit } of preset || []) {
    const p = P[id];
    if (!p) { cut.push({ id, why: 'missing' }); continue; }
    const want = convertToBks(qty, unit, p);
    if (!(want > 0)) continue;
    const got = Math.min(want, loadCap(p.stock || 0, netBks(L, id, p)));
    if (got <= 0) { cut.push({ id, want, got: 0, why: p.stock ? 'planned' : 'dry' }); continue; }
    if (!C.includes(id)) {
      const c = landingCell(C, id, -1, page, per);
      if (c < 0) { cut.push({ id, want, got: 0, why: 'full' }); continue; }
      C[c] = id;
    }
    L = foldLine(L, got < want ? { id, qty: got, unit: unitOf(p), dir: 1, bks: got } : { id, qty, unit, dir: 1, bks: want }, p);
    if (got < want) cut.push({ id, want, got, why: 'short' });
  }
  return { lines: L, layout: C, cut };
}

/* THE TEAM: one row per other van in this place with the goods it carries, in the row's own unit (his 12:50 "1 personnel
   and list of the products they bring"), biggest van first - the same packs the roster cards count (FleetCanvasManager
   loadOf). An empty van is left out. The items are also what "Salin" copies into this muatan. */
export function teamLoad(people, P) {
  const vans = [];
  for (const m of people) {
    const by = {};
    for (const r of m.activeCanvas || []) {
      const qty = Number(r.qty) || 0, unit = r.unit || 'Bks', bks = convertToBks(qty, unit, P[r.productId]);
      if (!(bks > 0)) continue;
      const it = by[r.productId];
      if (!it) by[r.productId] = { id: r.productId, name: P[r.productId]?.name || r.name || r.productId, qty, unit, bks };
      else if (it.unit === unit) { it.qty += qty; it.bks += bks; }
      else { it.bks += bks; it.qty = it.bks; it.unit = 'Bks'; }          // two units of one product read as packs
    }
    const items = Object.values(by).sort((a, b) => b.bks - a.bks);
    if (items.length) vans.push({ id: m.id, name: m.name, bks: items.reduce((s, x) => s + x.bks, 0), items });
  }
  return vans.sort((a, b) => b.bks - a.bks);
}

/* The damaged row: what came back broken today. A damaged RETUR never goes back to stock
   (useTransactionEngine isReturnedToStock), so it rides in the van until the EOD settles it. */
export function damagedInVan(sales, inventory) {
  const by = {};
  for (const t of sales) {
    if (t.type !== 'RETUR') continue;
    for (const it of t.items || []) {
      if (it.condition !== 'DAMAGED') continue;
      const p = inventory.find(x => x.id === it.productId);
      const row = by[it.productId] || (by[it.productId] = { id: it.productId, name: it.name || p?.name || '', bks: 0, why: '' });
      row.bks += convertToBks(it.qty, it.unit, p);
      if (!row.why && it.returnReason) row.why = it.returnReason;
    }
  }
  return Object.values(by);
}

/* TITIP behind the van chest: the shops this person holds that still owe money or still hold goods. The same sums as
   the consignment screen (ConsignmentFinanceView customerData) and the dashboard's receivable (revenueRule
   outstandingTitip): a Titip sale is owed, a payment or a return is paid (debtCredit), floored per shop so one shop's
   overpayment never cancels another's debt. The holder is the shop record's ownerAgentId after a hand-off, else
   whoever made its newest Titip sale. Packs left = the Titip goods less what was paid for or came back. */
export function titipOf(transactions, customers, agentId, inventory) {
  const P = new Map(inventory.map(p => [p.id, p]));
  const handed = new Map(customers.filter(c => c.ownerAgentId).map(c => [storeKey(c.name), c.ownerAgentId]));
  const bks = (i) => convertToBks(i.qty, i.unit, P.get(i.productId));
  const line = (i) => `${i.productId}-${i.priceTier || 'Standard'}`;
  const shops = new Map();
  const rows = transactions.filter(t => t?.customerName).sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
  for (const t of rows) {
    const k = storeKey(t.customerName);
    if (!shops.has(k)) shops.set(k, { key: k, name: storeLabel(t.customerName), owed: 0, paid: 0, left: {}, seller: t.agentId || 'ADMIN' });
    const s = shops.get(k);
    if (t.type === 'SALE' && isTitip(t)) {
      s.owed += Number(t.total) || 0;
      s.seller = t.agentId || 'ADMIN';
      for (const i of t.items || []) s.left[line(i)] = (s.left[line(i)] || 0) + bks(i);
    } else if (t.type === 'CONSIGNMENT_PAYMENT' || t.type === 'RETURN') {
      s.paid += debtCredit(t);
      const back = t.type === 'RETURN' ? t.items || [] : [...(t.itemsPaid || []), ...(t.itemsReturned || [])];
      for (const i of back) if (s.left[line(i)] !== undefined) s.left[line(i)] -= bks(i);
    }
  }
  return [...shops.values()]
    .filter(s => (handed.get(s.key) || s.seller) === agentId)
    .map(s => ({ key: s.key, name: s.name, rp: Math.max(0, s.owed - s.paid), bks: Object.values(s.left).reduce((a, q) => a + Math.max(0, q), 0) }))
    .filter(s => s.rp > 0 || s.bks > 0)
    .sort((a, b) => b.rp - a.rp || b.bks - a.bks);
}

/* THE WAREHOUSE'S QUARANTINE (Fleet & Roster's switch, 2026-09-30): the products with damaged stock in the warehouse the
   van loads from, read the way Stock Opname reads it - HQ = the product's own damagedStock, a BRANCH = its own
   branches/<loc>/inventory row, never the master product's (that is HQ's number). The master row gives the name and box. */
export function quarantineOf(inventory, branchRows) {
  const br = branchRows && Object.fromEntries(branchRows.map(r => [r.id, r]));
  return inventory.map(p => ({ ...p, damagedStock: (br ? br[p.id]?.damagedStock : p.damagedStock) || 0 })).filter(p => p.damagedStock > 0);
}

/* A branch's shelf for the regional warehouse's chest: each of the branch's OWN rows on its master product - the master
   gives the name, pictures and size for the 3D box; the branch gives the numbers. stock and damagedStock are always the
   branch's, 0 when it has none: the master row carries HQ's damagedStock, which must never show as this branch's. */
export function shelfOf(inventory, branchRows) {
  const m = Object.fromEntries((inventory || []).map(p => [p.id, p]));
  return (branchRows || []).map(r => ({ ...m[r.productId || r.id], ...r, stock: r.stock || 0, damagedStock: r.damagedStock || 0 }));
}

/* THE QUARANTINE CRATE'S RADIATION SIGN (Agent Inventory v4, his 2026-09-27 reference picture): three blades - top-left,
   top-right, bottom, 60 degrees each - and the dot in the middle, on a 15 x 15 grid, square by square so it stays crisp at
   any size. [x, y] cells, y down. */
export const HAZARD_SIGN = (() => {
  const N = 15, c = 7, out = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x - c, dy = c - y, r = Math.hypot(dx, dy), a = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const blade = r >= 2.9 && r <= 7.3 && [30, 150, 270].some(m => { const d = Math.abs(a - m); return Math.min(d, 360 - d) <= 30; });
    if (r <= 1.6 || blade) out.push([x, y]);
  }
  return out;
})();
