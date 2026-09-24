/* The van-loading bay's arithmetic (components/LoadingBay.jsx), kept pure so the self-check can
   re-run it on real numbers. Everything is in packs (Bks) through the app's own convertToBks, so
   the "= N Bks" he reads in the HOW MANY panel is exactly what MUAT VAN moves. */
import { convertToBks } from './helpers.js';

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
