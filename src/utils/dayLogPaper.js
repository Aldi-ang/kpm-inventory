/* THE DAY LOG ON PAPER (his 2026-11-14 "add paper like Todays log that can be printed when admin doesnt want to see the
   whole animation ... in a single paper page"; he picked "both C and B one to see all and one to see each person, B is a
   good dashboard, buth make sure that u make it clean and clear"). Board: A-Brain Raw/2026-11-14-day-log-paper/board.html.
   - C, ONE SALESMAN: the day's numbers, his route drawn from the shops' pins, the ruled list with what was sold or said
     under each shop, the shops of his round he did not reach.
   - B, THE TEAM: one line per man (his round as one row of even marks, shops x/y, sales, total, first-last), the totals
     line at the bottom.
   Pure: the Day Log (dayLog.js) in, a whole HTML page out - JourneyView shows it in a frame over the app and prints that
   frame (the receipt's own path, SaleReceipt.jsx; a new tab was tried first and a blocked pop-up stopped it). Black ink on
   white, gold only as a line (palette law; it is not the receipt, so not company blue). Every shown string is escaped:
   the page shares the app's origin, and a shop's name or a note is typed by a salesman. */
import { dayLog } from './dayLog.js';
import { roundOf } from './expedition.js';
import { storeKey, formatRupiah } from './helpers.js';
import { SIGN_WORD, SIGN_FAMILY } from './mapSprites.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const noon = (day) => new Date(`${day}T12:00:00`);
export const longDay = (day) => noon(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const pinOf = (c) => (Number(c?.latitude) && Number(c?.longitude) ? { lat: Number(c.latitude), lng: Number(c.longitude) } : {});
const MONEY = ['sold', 'order'];

/* one man's day for the paper: the Day Log + his round for that weekday (expedition.js's own rule) */
export function paperDay({ man, day, transactions = [], logs = [], customers = [] }) {
    const log = dayLog({ man, day, transactions, logs, customers });
    const round = roundOf(customers, man?.name, noon(day).toLocaleDateString('en-US', { weekday: 'long' }));
    const seen = new Map();   // shop key -> one stop, numbered in the order he first reached it
    log.events.forEach((e) => {
        if (!seen.has(e.key)) seen.set(e.key, { key: e.key, name: e.name, lat: e.lat, lng: e.lng, n: seen.size + 1, money: false });
        if (MONEY.includes(e.kind)) seen.get(e.key).money = true;
    });
    const missed = round.filter((c) => !seen.has(storeKey(c.name))).map((c) => ({ key: storeKey(c.name), name: c.name, ...pinOf(c) }));
    const sales = log.events.filter((e) => e.kind === 'sold');
    return {
        man, day, log, shops: [...seen.values()], missed, planned: round.length > 0, of: seen.size + missed.length,
        sales: sales.length, total: sales.reduce((s, e) => s + (Number(e.tx?.total) || 0), 0),
        first: log.events[0]?.time || null, last: log.events[log.events.length - 1]?.time || null,
    };
}

const shopsLine = (d) => (d.planned ? `${d.shops.length} of ${d.of}` : `${d.shops.length}`);
const span = (d) => (d.first ? (d.first === d.last ? d.first : `${d.first} – ${d.last}`) : '–');
const items = (tx) => (tx?.items || []).map((i) => `${i.qty ?? ''} ${i.unit || ''} ${i.name || ''}`.replace(/\s+/g, ' ').trim()).filter(Boolean).join(', ');
const head = (title, who, right) => `<header class="ph"><div><h1>${title}</h1>${who ? `<div class="who">${esc(who)}</div>` : ''}</div><div class="m">${right}</div></header>`;
const sign = '<div class="sig"><span>Checked by</span><span>Salesman</span></div>';
const foot = (meta) => `<footer class="pf"><span>Printed ${esc(meta.printed)} · Journey Plan${meta.company ? ` · ${esc(meta.company)}` : ''}</span><span>A time is when the sale was saved or the visit reported, not when he arrived.</span></footer>`;

/* HIS ROUTE ON THE REAL MAP (his 2026-11-14 "should also show the map in full and its regional information, because
   drawing of map pins and lines doesnt give any information really"; "make sure all the borders for kecamatan inside the
   map ... also showed"; "make sure that there is no intersection in words and make sure it looks the best for phone and
   pc"): Esri's street map in grey, every Journey Plan border that touches it, his shops numbered in the order he first
   reached them, the shops he missed. Drawn twice - the A4 / PC frame and a taller phone frame - so a phone reads it at
   its own size instead of shrunk. The line joins the shops in order: drawn, never tracked. */
const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile';
const merc = (lat, lng, z) => { const n = 256 * 2 ** z, s = Math.sin(lat * Math.PI / 180); return [(lng + 180) / 360 * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n]; };
const ringsOf = (g) => (!g ? [] : g.type === 'FeatureCollection' ? (g.features || []).flatMap((f) => ringsOf(f.geometry))
    : g.type === 'GeometryCollection' ? (g.geometries || []).flatMap(ringsOf) : g.type === 'Feature' ? ringsOf(g.geometry)
    : g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? g.coordinates.flat() : []);
/* even-odd over every ring: inside a hole or in two parts at once = outside. Reads [lng, lat] and [x, y] alike */
const inRings = (x, y, rings) => rings.reduce((inn, r) => {
    let c = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > y) !== (r[j][1] > y) && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
    return inn !== c;
}, false);
/* a border's points, at least 1.5 units from the last one KEPT (against the previous point, a dense border thinned to
   nothing when the map zoomed out) */
const thin = (r) => r.reduce((out, p) => { const q = out[out.length - 1]; if (!q || Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= 1.5) out.push(p); return out; }, []);
export const boxesTouch = (a, b, m = 0) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
const SLOT = 22;   // one marker's square: its 10-unit circle and the gap around it
const rank = (it) => (it.s ? -1 : it.m ? 1e6 : it.n);

/* NO WORD ON ANOTHER - one layout per frame size, pure, so a check can prove it:
   - markers whose squares would touch sit side by side in ONE row at their spot (S first, his numbers in order, then
     the missed ones); rows that would touch merge; a row stays inside the frame and wraps when it is wider than it
   - an area's name takes the free spot inside its own border nearest that border's middle: touching no marker, no
     other name and no edge, all four corners inside the border. No such spot = no name on the map; the caption under
     it still names every area */
export function mapLayout(d, borders = [], W = 700, H = 195) {
    const start = d.log?.start?.lat ? [{ ...d.log.start, s: true }] : [];
    const pins = [...start, ...d.shops.filter((s) => s.lat), ...d.missed.filter((s) => s.lat).map((s) => ({ ...s, m: true }))];
    if (!d.shops.some((s) => s.lat)) return null;
    const P = Math.round(Math.min(W, H) * 0.15);
    const span = (k) => { const ps = pins.map((p) => merc(p.lat, p.lng, k)), xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]); return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]; };
    /* the exact zoom at which every pin just fits (a whole-number zoom left them in a corner), never past 16 */
    const [a0, b0, c0, e0] = span(0), z = Math.min(16, Math.log2(Math.min((W - 2 * P) / (b0 - a0 || 1e-12), (H - 2 * P) / (e0 - c0 || 1e-12))));
    const [a, b, c, e] = span(z), ox = (a + b) / 2 - W / 2, oy = (c + e) / 2 - H / 2;
    const xy = (lat, lng) => { const [x, y] = merc(lat, lng, z); return [x - ox, y - oy]; };
    /* the nearest whole tile zoom, drawn at 0.7-1.4x its own size, so street and place names stay readable */
    const tz = Math.round(z), T = 256 * 2 ** (z - tz), n = 2 ** tz, tiles = [];
    for (let tx = Math.floor(ox / T); tx * T < ox + W; tx++) for (let ty = Math.max(0, Math.floor(oy / T)); ty * T < oy + H && ty < n; ty++)
        tiles.push({ href: `${TILES}/${tz}/${ty}/${((tx % n) + n) % n}`, x: tx * T - ox, y: ty * T - oy, size: T + 0.5 });

    const items = pins.map((p) => { const [x, y] = xy(p.lat, p.lng); return { ...p, tx: x, ty: y }; });
    const boxOf = (g) => {
        const cols = Math.max(1, Math.min(g.items.length, Math.floor((W - 4) / SLOT))), w = cols * SLOT, h = Math.ceil(g.items.length / cols) * SLOT;
        return { x: Math.min(Math.max(2, g.cx - w / 2), W - 2 - w), y: Math.min(Math.max(2, g.cy - h / 2), H - 2 - h), w, h, cols };
    };
    const groups = items.map((it) => ({ items: [it], cx: it.tx, cy: it.ty }));
    for (let merged = true; merged;) {
        merged = false;
        groups.forEach((g) => { g.box = boxOf(g); });
        for (let i = 0; i < groups.length && !merged; i++) for (let j = i + 1; j < groups.length && !merged; j++) {
            if (!boxesTouch(groups[i].box, groups[j].box, 2)) continue;
            const its = [...groups[i].items, ...groups[j].items].sort((p, q) => rank(p) - rank(q));
            groups[i] = { items: its, cx: its.reduce((s, t) => s + t.tx, 0) / its.length, cy: its.reduce((s, t) => s + t.ty, 0) / its.length };
            groups.splice(j, 1); merged = true;
        }
    }
    groups.forEach((g) => g.items.forEach((it, k) => { it.x = g.box.x + (k % g.box.cols) * SLOT + SLOT / 2; it.y = g.box.y + Math.floor(k / g.box.cols) * SLOT + SLOT / 2; }));

    /* every border that touches the frame, however small; which area each of his shops lies in */
    const areas = (borders || []).map((bd) => ({ name: String(bd?.name || '').trim(), rings: ringsOf(bd?.feature || bd?.geometry) })).filter((r) => r.name && r.rings.length);
    const drawn = areas.map((ar) => {
        const pts = ar.rings.map((r) => thin(r.map(([lng, lat]) => xy(lat, lng)))), all = pts.flat();
        const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
        const bb = [Math.max(0, Math.min(...xs)), Math.max(0, Math.min(...ys)), Math.min(W, Math.max(...xs)), Math.min(H, Math.max(...ys))];
        return bb[2] > bb[0] && bb[3] > bb[1] ? { ...ar, pts, bb } : null;
    }).filter(Boolean);
    const count = {};
    items.filter((it) => !it.s).forEach((it) => { const ar = areas.find((r) => inRings(it.lng, it.lat, r.rings)); if (ar) count[ar.name] = (count[ar.name] || 0) + 1; });
    const spots = drawn.map((ar) => {
        const c = []; let sx = 0, sy = 0;
        for (let y = ar.bb[1] + 4; y < ar.bb[3]; y += 8) for (let x = ar.bb[0] + 4; x < ar.bb[2]; x += 8) if (inRings(x, y, ar.pts)) { c.push([x, y]); sx += x; sy += y; }
        return { ar, c, mx: sx / (c.length || 1), my: sy / (c.length || 1) };
    }).filter((s) => s.c.length);
    const taken = groups.map((g) => g.box), labels = [];
    [...spots].sort((p, q) => (count[q.ar.name] || 0) - (count[p.ar.name] || 0) || q.c.length - p.c.length).forEach(({ ar, c, mx, my }) => {
        const w = ar.name.length * 10 + 12, h = 18;
        c.sort((p, q) => Math.hypot(p[0] - mx, p[1] - my) - Math.hypot(q[0] - mx, q[1] - my));
        for (const [x, y] of c) {
            const box = { x: x - w / 2, y: y - h / 2, w, h };
            if (box.x < 2 || box.y < 2 || box.x + w > W - 2 || box.y + h > H - 2 || taken.some((t) => boxesTouch(box, t, 3))) continue;
            if (![[box.x, box.y], [box.x + w, box.y], [box.x, box.y + h], [box.x + w, box.y + h]].every(([px, py]) => inRings(px, py, ar.pts))) continue;
            labels.push({ name: ar.name, x, y, box }); taken.push(box); return;
        }
    });
    return { W, H, tiles, drawn, items, groups, labels, count, visible: drawn.map((ar) => ar.name) };   // the caption names every border drawn, a sliver at the edge too
}

const r1 = (v) => +v.toFixed(1);
const frame = (L, cls) => {
    const route = L.items.filter((it) => !it.m).sort((p, q) => rank(p) - rank(q));
    const mark = (it) => (it.m ? `<circle cx="${r1(it.x)}" cy="${r1(it.y)}" r="6" fill="#fff" stroke="#1b1917" stroke-width="1.5" stroke-dasharray="2.5 2"/>`
        : `<circle cx="${r1(it.x)}" cy="${r1(it.y)}" r="10" fill="${it.money && !it.s ? '#1b1917' : '#fff'}" stroke="#1b1917" stroke-width="2"/>`
        + `<text x="${r1(it.x)}" y="${r1(it.y + 4)}" text-anchor="middle" class="pn" fill="${it.money && !it.s ? '#fff' : '#1b1917'}">${it.s ? 'S' : it.n}</text>`);
    return `<svg class="${cls}" viewBox="0 0 ${L.W} ${L.H}" role="img" aria-label="His route on the map">`
        + `<defs><filter id="kx-grey-${cls}"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope=".78" intercept=".22"/><feFuncG type="linear" slope=".78" intercept=".22"/><feFuncB type="linear" slope=".78" intercept=".22"/></feComponentTransfer></filter></defs>`
        + `<rect width="${L.W}" height="${L.H}" fill="#f2f0eb"/><g filter="url(#kx-grey-${cls})">${L.tiles.map((t) => `<image href="${t.href}" x="${r1(t.x)}" y="${r1(t.y)}" width="${r1(t.size)}" height="${r1(t.size)}"/>`).join('')}</g>`
        + L.drawn.map((ar) => `<path d="${ar.pts.map((r) => `M${r.map((p) => `${r1(p[0])},${r1(p[1])}`).join('L')}Z`).join('')}" fill="none" stroke="#1b1917" stroke-width="1.4" stroke-dasharray="7 4" opacity=".75"/>`).join('')
        + (route.length > 1 ? `<polyline points="${route.map((it) => `${r1(it.x)},${r1(it.y)}`).join(' ')}" fill="none" stroke="#1b1917" stroke-width="2" stroke-dasharray="6 4"/>` : '')
        + L.items.map(mark).join('')
        + L.labels.map((l) => `<text x="${r1(l.x)}" y="${r1(l.y + 4.5)}" text-anchor="middle" class="ar">${esc(l.name.toUpperCase())}</text>`).join('') + '</svg>';
};
export function mapSvg(d, borders = []) {
    const pc = mapLayout(d, borders, 700, 195), ph = mapLayout(d, borders, 360, 250);
    if (!pc) return '';
    const names = [...Object.entries(pc.count).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${esc(k)} ${v}`), ...[...new Set(pc.visible)].filter((v) => !pc.count[v]).map(esc)].join(' · ');
    return `<figure class="route">${frame(pc, 'pc')}${frame(ph, 'ph')}`
        + `<figcaption><span><i class="k s"></i>sale or order</span><span><i class="k v"></i>visited, no sale</span>${pc.items.some((it) => it.m) ? '<span><i class="k m"></i>not visited</span>' : ''}${pc.items.some((it) => it.s) ? '<span><b>S</b> his first position</span>' : ''}`
        + `${names ? `<span><b>Areas on this map:</b> ${names}</span>` : ''}<span>Shops a few metres apart sit side by side. The line joins the shops in order; it is not the road he rode. Map © Esri</span></figcaption></figure>`;
}

/* C: one salesman */
export function manSheet(d, meta) {
    const ev = d.log.events, today = d.day === meta.today, stop = new Map(d.shops.map((s) => [s.key, s]));
    const rows = ev.map((e) => {
        const sub = [e.kind === 'sold' || e.kind === 'swap' ? items(e.tx) : '', e.note].filter(Boolean).map(esc).join(' · ');
        return `<tr><td class="t">${e.time}</td><td class="t">${stop.get(e.key)?.lat ? stop.get(e.key).n : '–'}</td><td><b>${esc(e.name)}</b>${sub ? `<span class="sub">${sub}</span>` : ''}</td>`
            + `<td><span class="res${SIGN_FAMILY[e.kind] === 'money' ? ' money' : ''}">${SIGN_WORD[e.kind] || esc(e.kind)}</span></td><td class="n">${e.kind === 'sold' ? formatRupiah(e.tx?.total) : ''}</td></tr>`;
    }).join('');
    const missed = d.planned ? `<p class="miss">${d.missed.length ? `<b>Not visited${today ? ' today' : ''} (${d.missed.length}):</b> ${d.missed.map((m) => esc(m.name)).join(', ')}` : '<b>Every shop on his round was visited.</b>'}</p>` : '';
    return `<section class="sheet">${head('Day Log', d.man?.name, `<b>${longDay(d.day)}</b>${esc(d.man?.location || '')}`)}`
        + `<div class="sum"><div><small>Shops visited</small><b>${shopsLine(d)}</b></div><div><small>Sales</small><b>${d.sales}</b></div><div><small>Total sold</small><b>${formatRupiah(d.total)}</b></div><div><small>First – last</small><b>${span(d)}</b></div></div>`
        + (ev.length ? mapSvg(d, meta.borders)
            + `<table class="log"><thead><tr><th>Time</th><th>No.</th><th>Shop</th><th>Result</th><th class="n">Amount</th></tr></thead><tbody>${rows}</tbody>`
            + `<tfoot><tr><td></td><td></td><td>${d.shops.length} ${d.shops.length === 1 ? 'shop' : 'shops'} · ${d.sales} ${d.sales === 1 ? 'sale' : 'sales'}</td><td></td><td class="n">${formatRupiah(d.total)}</td></tr></tfoot></table>`
            : `<p class="none">No sales and no visit reports from ${esc(d.man?.name)} on this day.</p>`)
        + (d.log.skipped ? `<p class="miss">${d.log.skipped} visit report${d.log.skipped > 1 ? 's' : ''} could not be read and ${d.log.skipped > 1 ? 'are' : 'is'} not on this paper.</p>` : '')
        + missed + (meta.warn ? `<p class="miss"><b>${esc(meta.warn)}</b></p>` : '') + sign + foot(meta) + '</section>';
}

/* B: the whole team, one line each */
const marks = (d) => `<span class="marks">${d.shops.map((s) => `<i class="${s.money ? 's' : 'v'}"></i>`).join('')}${d.missed.map(() => '<i class="m"></i>').join('')}</span>`;
export function teamSheet(days, meta) {
    const out = days.filter((d) => d.log.events.length), sum = (f) => days.reduce((s, d) => s + f(d), 0);
    const firsts = out.map((d) => d.first).sort(), lasts = out.map((d) => d.last).sort();
    const rows = days.map((d) => `<tr><td><b>${esc(d.man?.name)}</b>${d.shops.length || d.missed.length ? marks(d) : ''}${d.log.events.length ? '' : '<span class="sub">No sale and no visit report</span>'}</td>`
        + `<td class="n">${shopsLine(d)}</td><td class="n">${d.sales}</td><td class="n">${d.total ? formatRupiah(d.total) : '–'}</td><td class="t">${span(d)}</td></tr>`).join('');
    const ofAll = days.some((d) => d.planned) ? ` of ${sum((d) => (d.planned ? d.of : d.shops.length))}` : '';
    return `<section class="sheet">${head('Team Day Log', null, `<b>${longDay(meta.day)}</b>${esc(meta.where || '')}`)}`
        + `<table class="team"><thead><tr><th>Salesman · his round</th><th class="n">Shops</th><th class="n">Sales</th><th class="n">Total</th><th>First – last</th></tr></thead><tbody>${rows}</tbody>`
        + `<tfoot><tr><td>Team · ${out.length} of ${days.length} out</td><td class="n">${sum((d) => d.shops.length)}${ofAll}</td><td class="n">${sum((d) => d.sales)}</td><td class="n">${formatRupiah(sum((d) => d.total))}</td>`
        + `<td class="t">${firsts.length ? `${firsts[0]} – ${lasts[lasts.length - 1]}` : '–'}</td></tr></tfoot></table>`
        + `<p class="key"><span><i class="k s"></i>sale or order</span><span><i class="k v"></i>visited, no sale</span><span><i class="k m"></i>on his round, not visited</span></p>`
        + (meta.warn ? `<p class="miss"><b>${esc(meta.warn)}</b></p>` : '') + sign + foot(meta) + '</section>';
}

const CSS = `
:root { --ink: #1b1917; --dim: #6b655d; --rule: #dcd7ce; --gold: #e4b04a; }
* { box-sizing: border-box; }
html { background: #e9e6e1; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; color: var(--ink); font: 10pt/1.4 system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; font-variant-numeric: tabular-nums; }
.keys { position: sticky; top: 0; z-index: 1; display: flex; gap: 10px; justify-content: center; padding: 10px 16px; background: #1b1917; }
.keys button { min-height: 44px; padding: 0 22px; border-radius: 8px; border: 1px solid #5e5a55; background: #1b1917; color: #f2eee4; font: 700 15px/1 system-ui, sans-serif; letter-spacing: .04em; cursor: pointer; }
.keys .go { background: #f2eee4; border-color: #f2eee4; color: #1b1917; }
.sheet { width: 210mm; max-width: calc(100% - 24px); margin: 16px auto; padding: 14mm 13mm; background: #fff; box-shadow: 0 2px 14px rgba(0,0,0,.16); }
.ph { display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; padding-bottom: 3mm; border-bottom: .6mm solid var(--ink); }
.ph h1 { margin: 0; font: 800 19pt/1 system-ui, sans-serif; letter-spacing: .05em; text-transform: uppercase; }
.ph .who { margin-top: 2mm; font-weight: 700; font-size: 12pt; }
.ph .m { text-align: right; color: var(--dim); font-size: 9pt; }
.ph .m b { display: block; color: var(--ink); font-size: 10.5pt; }
.sum { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-top: 4mm; padding-top: 2.5mm; border-top: .5mm solid var(--gold); }
small, th { font: 700 7pt/1 ui-monospace, Consolas, monospace; letter-spacing: .12em; text-transform: uppercase; color: var(--dim); }
.sum small { display: block; }
.sum b { display: block; margin-top: 1.6mm; font-size: 13pt; white-space: nowrap; }
.route { margin: 4mm 0 0; }
.route svg { display: block; width: 100%; height: auto; font-family: system-ui, sans-serif; }
.route .ph { display: none; }
.route .pn { font: 700 11px ui-monospace, Consolas, monospace; }
.route .ar { font: 800 12px system-ui, sans-serif; letter-spacing: .1em; fill: #1b1917; stroke: #fff; stroke-width: 3.5px; stroke-linejoin: round; paint-order: stroke; }
figcaption, .key { display: flex; flex-wrap: wrap; gap: 1.5mm 5mm; margin-top: 2mm; font-size: 8pt; color: var(--dim); }
i.k { display: inline-block; width: 3mm; height: 3mm; margin-right: 1.4mm; vertical-align: -.4mm; border: .35mm solid var(--ink); border-radius: 50%; }
.key i.k { border-radius: 0; }
i.k.s { background: var(--ink); } i.k.m { border: .3mm dashed #a39d94; }
table { width: 100%; border-collapse: collapse; margin-top: 4mm; }
thead { display: table-header-group; } tr { break-inside: avoid; }
th { text-align: left; padding: 0 3mm 2mm 0; border-bottom: .4mm solid var(--ink); }
td { padding: .8mm 3mm .8mm 0; line-height: 1.3; vertical-align: top; border-bottom: .2mm solid var(--rule); }
.n { text-align: right; padding-right: 0; white-space: nowrap; }
.n + td, .n + th { padding-left: 6mm; }
td.t { font-family: ui-monospace, Consolas, monospace; white-space: nowrap; }
.sub { display: block; margin-top: .3mm; color: var(--dim); font-size: 8.5pt; line-height: 1.15; }
.res { font: 700 8pt/1.2 ui-monospace, Consolas, monospace; letter-spacing: .06em; white-space: nowrap; }
.res.money { text-decoration: underline .5mm var(--gold); text-underline-offset: 1.2mm; }
tfoot td { border-bottom: 0; border-top: .4mm solid var(--ink); font-weight: 700; padding-top: 2.6mm; }
.team td { padding-block: 3.4mm; border-bottom: 0; }
.team tbody tr + tr td { border-top: .2mm solid var(--rule); }
.marks { display: flex; flex-wrap: wrap; gap: 1.1mm; margin-top: 1.8mm; max-width: 80mm; }
.marks i { width: 3.2mm; height: 3.2mm; border: .35mm solid var(--ink); }
.marks i.s { background: var(--ink); } .marks i.m { border: .3mm dashed #a39d94; }
.miss, .none { margin: 4mm 0 0; font-size: 9pt; color: var(--dim); } .miss b { color: var(--ink); } .none { margin-top: 8mm; font-size: 11pt; }
.sig { display: grid; grid-template-columns: 1fr 1fr; gap: 14mm; margin-top: 4mm; font-size: 8.5pt; color: var(--dim); break-inside: avoid; }
.sig span { border-top: .3mm solid var(--ink); padding-top: 1.6mm; }
.pf { display: flex; justify-content: space-between; gap: 6mm; margin-top: 3mm; padding-top: 1.6mm; border-top: .2mm solid var(--rule); font: 400 7pt/1.4 system-ui, sans-serif; color: var(--dim); }
@page { size: A4; margin: 12mm; }
@media print { html { background: none; } .keys { display: none; } .sheet { width: auto; max-width: none; margin: 0; padding: 0; box-shadow: none; } }
/* THE PHONE'S SCREEN (not its print): the A4 columns do not fit 375 px, so each row becomes two lines - time and stop
   number on the left, the shop and what happened in the middle, the result and the amount on the right */
@media screen and (max-width: 640px) {
  body { font-size: 9pt; } .sheet { padding: 6mm 4.5mm; margin: 10px auto; }
  .ph { flex-direction: column; align-items: flex-start; gap: 2mm; } .ph .m { text-align: left; } .ph h1 { font-size: 16pt; }
  .sum { grid-template-columns: 1fr 1fr; } .pf { flex-direction: column; gap: 1mm; }
  .route .pc { display: none; } .route .ph { display: block; }
  thead { display: none; }
  tr { display: grid; column-gap: 3mm; padding: 2mm 0; border-bottom: .2mm solid var(--rule); }
  td, .n + td { padding: 0; border: 0; } tbody tr:last-child { border-bottom: 0; } tfoot tr { border-bottom: 0; border-top: .4mm solid var(--ink); }
  .log tr { grid-template-columns: auto 1fr auto; }
  .log td:nth-child(1) { grid-area: 1 / 1; } .log td:nth-child(2) { grid-area: 2 / 1; color: var(--dim); } .log tbody td:nth-child(2)::before { content: "No. "; }
  .log td:nth-child(3) { grid-area: 1 / 2 / 3; } .log td:nth-child(4) { grid-area: 1 / 3; text-align: right; } .log td:nth-child(5) { grid-area: 2 / 3; }
  .team tr { grid-template-columns: 1fr auto; } .team tbody tr + tr td { border: 0; }
  .team td:first-child { grid-area: 1 / 1 / 5; } .team td:not(:first-child) { grid-column: 2; text-align: right; }
  .team td:nth-child(2)::after { content: " shops"; } .team td:nth-child(3)::after { content: " sales"; }
}`;

/* the whole page; its Print and Close keys are wired by JourneyView (no script in the page). `wait` = Close only */
export const paperDoc = (title, sheets, wait) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style></head>`
    + `<body><div class="keys">${wait ? '' : '<button type="button" class="go" id="kx-print">Print</button>'}<button type="button" id="kx-close">Close</button></div>${sheets}</body></html>`;
export const paperWait = paperDoc('Day Log', '<p class="none" style="text-align:center">Reading the day…</p>', true);
