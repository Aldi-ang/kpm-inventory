/* The van-loading bay's arithmetic (components/LoadingBay.jsx), kept pure so the self-check can
   re-run it on real numbers. Everything is in packs (Bks) through the app's own convertToBks, so
   the "= N Bks" he reads in the HOW MANY panel is exactly what MUAT VAN moves. */
import { convertToBks, storeKey, storeLabel } from './helpers.js';
import { debtCredit, isTitip } from './revenueRule.js';

export const PER = 6;          // squares on a page
export const CELLS = 18;       // the van's layout: three pages, and a hole means something

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
  return lines.map(l => (l === line ? { id, dir: net > 0 ? 1 : -1, qty: Math.abs(net), unit: 'Bks' } : l));
}

/* The van's squares. The saved layout comes first, holes and all; a square whose product has left
   the van (and is not planned) goes back to empty; every product with no square takes the first
   empty one. More products than squares grows a page - a chest never hides stock. */
export function vanCells(layout, keepIds) {
  const keep = new Set(keepIds);
  const size = Math.max(CELLS, Math.ceil(keepIds.length / PER) * PER);
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
export function landingCell(cells, id, under, page) {
  const own = cells.indexOf(id);
  if (own >= 0) return own;
  if (under >= 0 && under < cells.length && !cells[under]) return under;
  for (let c = page * PER; c < page * PER + PER && c < cells.length; c++) if (!cells[c]) return c;
  return cells.indexOf(null);
}

/* HIS USUAL LOAD, put back in the muatan. His rule, 2026-09-24: "A preset only fills the muatan, the same way
   a drag does. That keeps the rule that only MUAT VAN moves stock, so a wrong preset can never change real
   numbers by itself." So each saved line folds in through foldLine, capped at what the warehouse can still
   give (loadCap), and a new product takes its square through landingCell. Every line that did not go in
   whole comes back in `cut` with its reason: short (cut to what is left), planned (all of it is already in
   the muatan), dry (the shelf is empty), missing (this warehouse does not carry it), full (no square). */
export function applyPreset(lines, cells, preset, P, page = 0) {
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
      const c = landingCell(C, id, -1, page);
      if (c < 0) { cut.push({ id, want, got: 0, why: 'full' }); continue; }
      C[c] = id;
    }
    L = foldLine(L, got < want ? { id, qty: got, unit: 'Bks', dir: 1, bks: got } : { id, qty, unit, dir: 1, bks: want }, p);
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
