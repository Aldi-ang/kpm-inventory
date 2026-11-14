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
   drawing of map pins and lines doesnt give any information really"): Esri's street map (the Journey map's own source,
   street version) in grey, the areas' borders and names Journey Plan draws (its `boundaries`), his shops numbered in
   the order he first reached them, the shops he missed, and the areas his round lies in. One SVG, so it scales to the
   phone and prints as it shows. The line joins the shops in order - drawn, never tracked; the caption says so. */
const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile';
const merc = (lat, lng, z) => { const n = 256 * 2 ** z, s = Math.sin(lat * Math.PI / 180); return [(lng + 180) / 360 * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n]; };
const ringsOf = (g) => (!g ? [] : g.type === 'FeatureCollection' ? (g.features || []).flatMap((f) => ringsOf(f.geometry))
    : g.type === 'Feature' ? ringsOf(g.geometry) : g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? g.coordinates.flat() : []);
/* even-odd over every ring: inside a hole or in two parts at once = outside */
const inRings = (lng, lat, rings) => rings.reduce((inn, r) => {
    let c = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > lat) !== (r[j][1] > lat) && lng < ((r[j][0] - r[i][0]) * (lat - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
    return inn !== c;
}, false);
export function mapSvg(d, borders = []) {
    const start = d.log.start ? [{ ...d.log.start, s: true }] : [];
    const stops = [...start, ...d.shops.filter((s) => s.lat)], miss = d.missed.filter((s) => s.lat), all = [...stops, ...miss];
    if (!d.shops.some((s) => s.lat)) return '';
    const W = 700, H = 195, P = 28;
    /* the exact zoom at which every pin just fits the box (a whole-number zoom left them in a corner), never past 16 */
    const span = (k) => { const ps = all.map((p) => merc(p.lat, p.lng, k)), xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]); return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]; };
    const [a0, b0, c0, e0] = span(0), z = Math.min(16, Math.log2(Math.min((W - 2 * P) / (b0 - a0 || 1e-12), (H - 2 * P) / (e0 - c0 || 1e-12))));
    const [a, b, c, e] = span(z), ox = (a + b) / 2 - W / 2, oy = (c + e) / 2 - H / 2;
    const xy = (lat, lng) => { const [x, y] = merc(lat, lng, z); return [+(x - ox).toFixed(1), +(y - oy).toFixed(1)]; };
    /* the nearest whole tile zoom, drawn at 0.7-1.4x its own size, so the street and place names stay readable on paper */
    const tz = Math.round(z), T = 256 * 2 ** (z - tz), n = 2 ** tz, tiles = [];
    for (let tx = Math.floor(ox / T); tx * T < ox + W; tx++) for (let ty = Math.max(0, Math.floor(oy / T)); ty * T < oy + H && ty < n; ty++)
        tiles.push(`<image href="${TILES}/${tz}/${ty}/${((tx % n) + n) % n}" x="${(tx * T - ox).toFixed(1)}" y="${(ty * T - oy).toFixed(1)}" width="${(T + 0.5).toFixed(1)}" height="${(T + 0.5).toFixed(1)}"/>`);
    /* the areas on this piece of map: outline + name; and which area each of his shops lies in */
    const areas = (borders || []).map((bd) => ({ name: String(bd?.name || '').trim(), rings: ringsOf(bd?.feature || bd?.geometry) })).filter((r) => r.name && r.rings.length);
    const drawn = areas.map((ar) => {
        const pts = ar.rings.map((r) => r.map(([lng, lat]) => xy(lat, lng)).filter((p, i, s) => !i || Math.abs(p[0] - s[i - 1][0]) + Math.abs(p[1] - s[i - 1][1]) >= 1.5));
        const xs = pts.flat().map((p) => p[0]), ys = pts.flat().map((p) => p[1]);
        const x0 = Math.max(0, Math.min(...xs)), x1 = Math.min(W, Math.max(...xs)), y0 = Math.max(0, Math.min(...ys)), y1 = Math.min(H, Math.max(...ys));
        /* the name in its corner, clear of the pins; an area too narrow for its name keeps the outline, the caption names it */
        return x1 - x0 > 20 && y1 - y0 > 10 ? { ...ar, d: pts.map((r) => `M${r.map((p) => p.join(',')).join('L')}Z`).join(''), lx: x0 + 6, ly: y0 + 16, fits: x1 - x0 > ar.name.length * 9.5 + 12 } : null;
    }).filter(Boolean);
    const count = {};
    all.filter((p) => !p.s).forEach((p) => { const ar = areas.find((r) => inRings(p.lng, p.lat, r.rings)); if (ar) count[ar.name] = (count[ar.name] || 0) + 1; });
    const dot = (p) => {
        const [x, y] = xy(p.lat, p.lng), fill = p.money && !p.s ? '#1b1917' : '#fff', ink = p.money && !p.s ? '#fff' : '#1b1917';
        return `<circle cx="${x}" cy="${y}" r="10" fill="${fill}" stroke="#1b1917" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" class="pn" fill="${ink}">${p.s ? 'S' : p.n}</text>`;
    };
    const inAreas = Object.entries(count).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${esc(k)} ${v}`).join(' · ');
    return `<figure class="route"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="His route on the map">`
        + '<defs><filter id="kx-grey"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope=".78" intercept=".22"/><feFuncG type="linear" slope=".78" intercept=".22"/><feFuncB type="linear" slope=".78" intercept=".22"/></feComponentTransfer></filter></defs>'
        + `<rect width="${W}" height="${H}" fill="#f2f0eb"/><g filter="url(#kx-grey)">${tiles.join('')}</g>`
        + drawn.map((ar) => `<path d="${ar.d}" fill="none" stroke="#1b1917" stroke-width="1.4" stroke-dasharray="7 4" opacity=".75"/>`).join('')
        + drawn.filter((ar) => ar.fits).map((ar) => `<text x="${ar.lx.toFixed(1)}" y="${ar.ly.toFixed(1)}" class="ar">${esc(ar.name.toUpperCase())}</text>`).join('')
        + miss.map((p) => { const [x, y] = xy(p.lat, p.lng); return `<circle cx="${x}" cy="${y}" r="6" fill="#fff" stroke="#1b1917" stroke-width="1.5" stroke-dasharray="2.5 2"/>`; }).join('')
        + (stops.length > 1 ? `<polyline points="${stops.map((p) => xy(p.lat, p.lng).join(',')).join(' ')}" fill="none" stroke="#1b1917" stroke-width="2" stroke-dasharray="6 4"/>` : '')
        + stops.map(dot).join('') + '</svg>'
        + `<figcaption><span><i class="k s"></i>sale or order</span><span><i class="k v"></i>visited, no sale</span>${miss.length ? '<span><i class="k m"></i>not visited</span>' : ''}${start.length ? '<span><b>S</b> his first position</span>' : ''}`
        + `${inAreas ? `<span><b>Areas:</b> ${inAreas}</span>` : ''}<span>The line joins the shops in order; it is not the road he rode. Map © Esri</span></figcaption></figure>`;
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
.route .pn { font: 700 11px ui-monospace, Consolas, monospace; }
.route .ar { font: 800 12px system-ui, sans-serif; letter-spacing: .1em; fill: #1b1917; stroke: #fff; stroke-width: 3.5px; stroke-linejoin: round; paint-order: stroke; }
figcaption, .key { display: flex; flex-wrap: wrap; gap: 1.5mm 5mm; margin-top: 2mm; font-size: 8pt; color: var(--dim); }
i.k { display: inline-block; width: 3mm; height: 3mm; margin-right: 1.4mm; vertical-align: -.4mm; border: .35mm solid var(--ink); border-radius: 50%; }
.key i.k { border-radius: 0; }
i.k.s { background: var(--ink); } i.k.m { border: .3mm dashed #a39d94; }
table { width: 100%; border-collapse: collapse; margin-top: 4mm; }
thead { display: table-header-group; } tr { break-inside: avoid; }
th { text-align: left; padding: 0 3mm 2mm 0; border-bottom: .4mm solid var(--ink); }
td { padding: 1.1mm 3mm 1.1mm 0; line-height: 1.3; vertical-align: top; border-bottom: .2mm solid var(--rule); }
.n { text-align: right; padding-right: 0; white-space: nowrap; }
.n + td, .n + th { padding-left: 6mm; }
td.t { font-family: ui-monospace, Consolas, monospace; white-space: nowrap; }
.sub { display: block; margin-top: .3mm; color: var(--dim); font-size: 8.5pt; line-height: 1.25; }
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
