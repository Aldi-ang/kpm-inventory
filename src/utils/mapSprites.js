/* Journey Plan's map objects. A shop still to visit is a round pin, a visit plants a flag with its result's word (his
   2026-11-13 pick, shopHtml / groupHtml at the end), a salesman is a pixel person in his squad colour who plants it (his
   2026-11-14 pick, planterHtml). The 2026-10-03 pixel chests and the bubble slot went with 7a3dc370; the visit signs stay
   as the Day Replay's still pictures (.kx-sgn-*). Strings, because Leaflet's divIcon takes HTML. CSS lives in
   src/styles/expedition.css (.kx-c5 = the shop marker's root, .kx-fl, .kx-pn, .kx-grp, .kx-sm). */

/* one letter per pixel, '.' = empty; a run of one colour becomes one rect */
export const px = (rows, pal) => {
    let out = '';
    rows.forEach((row, y) => {
        for (let x = 0; x < row.length;) {
            const ch = row[x]; let w = 1;
            while (row[x + w] === ch) w++;
            if (ch !== '.') out += `<rect x="${x}" y="${y}" width="${w}" height="1" ${pal[ch]}/>`;
            x += w;
        }
    });
    return out;
};
const at = (rows, y0) => Array(y0).fill('').concat(rows);

/* colours reach innerHTML: only a plain hex gets through (squad colours come from the database) */
export const safeHex = (c, fallback = '#6A645C') => (/^#[0-9a-f]{6}$/i.test(String(c)) ? c : fallback);
const darker = (hex, k = 0.7) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');

/* ---- the visit signs, his look C (2026-10-04 18:30, "C is the best because it is really clear"; drawn and checked on A-Brain
   Raw/2026-10-04-day-replay/day-replay.html v3). No board: each status is its own 12 x 12 object (the outline tells them apart
   without colour), and the family and the word ride with it. Since the flags (7a3dc370) they are the Day Replay's still
   pictures only (SPRITE_CSS .kx-sgn-*: its Day Log rows, chips and notches); sale is the app's own coin there ---- */
const SP6 = Object.fromEntries(Object.entries({ K: '#0A0908', w: '#F0E2BC', v: '#D9C597', W: '#FFF8E6', G: '#E2A12E', Y: '#FFF4CF', g: '#9C6A1E',
    R: '#B3261E', r: '#E0473C', b: '#C98A4A', B: '#8A5A2C', s: '#A9A49A', S: '#6E6A62', t: '#E8E4DC', y: '#E4B04A' }).map(([k, v]) => [k, `fill="${v}"`]));
const E12 = Array(12).fill('............');
const rowsAt = (rows, y0) => E12.slice(0, y0).concat(rows, E12.slice(0, Math.max(0, 12 - y0 - rows.length)));
/* crossed swords for the competitor (a flag already means "nobody's shop" here), drawn by rule so both blades are mirrors */
const sword = (flip) => { const g = E12.map((r) => r.split('')); const put = (x, y, c) => { g[y][flip ? 11 - x : x] = c; };
    for (let i = 0; i <= 6; i++) { put(i, i, 't'); put(i + 1, i, 'S'); if (i < 6) put(i, i + 1, 'K'); }
    put(8, 6, 'G'); put(7, 7, 'G'); put(6, 8, 'G'); put(8, 8, 'B'); put(9, 9, 'B'); put(10, 10, 'R'); put(11, 11, 'K');
    return g.map((r) => r.join('')); };
/* m / x = the parts that move; mo / xo = where each one turns from; xAt = drawn off its box; xHide = gone at rest */
const PIC6 = {
    order: { m: ['............', '...KKK.KKK..', 'KK.KGK.KYK..', '.K.KGK.KGK..', '.KKKKKKKKKKK', '.KbbbbbbbbbK', '.KbBbBbBbBbK', '..KbbbbbbbK.', '..KKKKKKKKK.', '.KKK....KKK.', '.KsK....KsK.', '.KKK....KKK.'] },
    full: { m: ['KKKKKKKKKKKK', 'KBBKBBKBBKBK', 'KwwKwwKwwKwK', 'KwwKwwKwwKwK', 'KbbbbbbbbbbK', 'KBBKBBKBBKBK', 'KwwKwwKwwKwK', 'KwwKwwKwwKwK', 'KbbbbbbbbbbK', 'KKKKKKKKKKKK', 'KbK......KbK', 'KKK......KKK'],
        x: ['KKK', 'KBK', 'KwK', 'KwK', 'KKK'], xAt: [-3, 0], xHide: true },
    issue: { m: sword(true), mo: '0% 100%', x: sword(false), xo: '100% 100%' },
    request: { m: ['............', '..KKKKKKKK..', '..KwwwwwwK..', '..KwSSSSwK..', '..KwwwwwwK..', '..KwSSSSwK..', '..KwwwwwwK..', '..KwSSSwwK..', '..KwwwwwvK..', '..KwwwwvKK..', '..KKKKKKK...', '............'], mo: '50% 0%',
        x: rowsAt(['.....rr.....', '.....RR.....'], 0) },
    /* a little shop under its roof (without it the shop read as the full shelf), shutter down, padlock on */
    closed: { body: ['.....KK.....', '....KBBK....', '...KBbbBK...', '..KBbbbbBK..', '.KKKKKKKKKK.'].concat(Array(6).fill('.K........K.'), ['.KKKKKKKKKK.']),
        m: rowsAt(['..ssssssss..', '..SSSSSSSS..', '..ssssssss..', '..SSSSSSSS..', '..ssssssss..', '..SSSSSSSS..'], 5), mo: '50% 0%',
        x: rowsAt(['....KKKK....', '....K..K....', '...KGGGGK...', '...KGKKGK...', '...KGGGGK...', '...KKKKKK...'], 6), xo: '50% 0%' },
    routine: { m: ['...KKKK.....', '..KWwwwK....', '.KWwwwwwK...', '.KwwwwwwK...', '.KwwwwwwK...', '.KwwwwwvK...', '..KwwvvKK...', '...KKKKBBK..', '.......KBBK.', '........KBBK', '.........KBK', '..........K.'], mo: '50% 50%',
        x: rowsAt(['......g.....', '...g.g......', '....g.......'], 3) },
    /* the taped crate (Quarantine's band) goes out, a clean one comes in */
    swap: { body: ['.........w..', '.........w..', '.........w..', '.......wwwww', '........www.', '.........w..', '..w.........', '.www........', 'wwwww.......', '..w.........', '..w.........', '..w.........'],
        m: rowsAt(['KKKKKKK', 'KbbbbbK', 'KyKyKyK', 'KKyKyKK', 'KBBBBBK', 'KKKKKKK'].map((r) => r + '.....'), 0),
        x: rowsAt(['KKKKKKK', 'KbbbbbK', 'KBBBBBK', 'KbbbbbK', 'KBBBBBK', 'KKKKKKK'].map((r) => '.....' + r), 6) },
};
const part = (cls, rows, o, at2, hide) => `<g${at2 ? ` transform="translate(${at2[0]} ${at2[1]})"` : ''}><g class="${cls}" style="transform-origin:${o || '50% 100%'}${hide ? ';opacity:0' : ''}">${px(rows, SP6)}</g></g>`;
export const SIGNS = ['sold', 'order', 'full', 'issue', 'request', 'closed', 'routine', 'swap'];
export const SIGN_FAMILY = { sold: 'money', order: 'money', full: 'plain', request: 'plain', routine: 'plain', issue: 'problem', swap: 'problem', closed: 'closed' };
/* one word each, the Visit Report's own names (QUICK_TAGS) cut to their first word */
export const SIGN_WORD = { sold: 'SALE', order: 'ORDER', full: 'FULL', issue: 'COMPETITOR', request: 'REQUEST', closed: 'CLOSED', routine: 'CHECK', swap: 'EXCHANGE' };
export const SIGN5 = Object.fromEntries(SIGNS.map((k) => { const p = PIC6[k];
    return [k, k === 'sold' ? '<i class="kpm-coin lg"></i>'
        : `<svg class="px" viewBox="0 0 12 12" width="24" height="24">${p.body ? px(p.body, SP6) : ''}${part('m', p.m, p.mo)}${p.x ? part('x', p.x, p.xo, p.xAt, p.xHide) : ''}</svg>`]; }));

/* the visit's outcome -> its sign. A real sale through the terminal today wins, then an exchange (a RETUR: it showed the
   sale coin until look C gave it its own sign); otherwise the report's tag (QUICK_TAGS in src/JourneyView.jsx, matched on
   their emoji like the pins always were); no tag = Routine Check */
export const signFor = (tag, sold, swap = false) => {
    if (sold) return 'sold';
    if (swap) return 'swap';
    const t = String(tag || '');
    return t.includes('📦') ? 'order' : t.includes('🛑') ? 'full' : t.includes('⚠️') ? 'issue'
        : t.includes('📝') ? 'request' : t.includes('🔒') ? 'closed' : 'routine';
};
/* what the terminal recorded at each shop today: 'sold' if any record is not an exchange, else 'swap' */
export const kindByShop = (transactions, day, key) => {
    const k = {};
    (transactions || []).forEach((t) => {
        if (t?.date !== day || !t.customerName) return;
        const id = key(t.customerName), retur = t.type === 'RETUR' || t.paymentType === 'Retur/BS';
        k[id] = k[id] === 'sold' || !retur ? 'sold' : 'swap';
    });
    return k;
};

const uri = (body, w, h) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${body}</svg>`)}")`;
/* AT REST a sign is ONE cached picture, not ~150 pixel squares (his "zoomed out ... so much lag on the phone", 2026-10-03) */
export const SPRITE_CSS = Object.keys(PIC6).map((k) => `.kx-sgn-${k}{background-image:${uri(SIGN5[k].replace(/^<svg[^>]*>|<\/svg>$/g, ''), 12, 12)}}`).join('\n');
if (typeof document !== 'undefined' && !document.getElementById('kx-sprites')) {
    const s = document.createElement('style'); s.id = 'kx-sprites'; s.textContent = SPRITE_CSS; document.head.append(s);
}

/* a pressed salesman's name tag and the shop's name reach innerHTML: escaped */
const escTag = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/* ---- the salesman: 10 x 14 pixel person, the shirt in his squad colour, two leg frames for walking ---- */
export const HAIR = ['#2B1A0E', '#151210', '#5A3418'];   /* picked by the length of his id: Expedition's men and the Day Replay's man match */
const HEAD = ['..OOOOOO..', '.OhhhhhhO.', '.OhsssshO.', '.OsessesO.', '.OsszzssO.'];
const TORSO = ['OccccccccO', 'OcCccccCcO', 'OcCccccCcO', 'OsCccccCsO', 'OOppppppOO'];
const LEGS_A = ['.OppOOppO.', '.OppOOffO.', '.OffO.OO..', '.OOOO.....'];   /* left foot down, right foot lifted */
const LEGS_B = ['.OppOOppO.', '.OffOOppO.', '..OO.OffO.', '.....OOOO.'];   /* the other way round */
const LEGS_S = ['.OppOOppO.', '.OppOOppO.', '.OffO.OffO', '.OOOO.OOOO'];   /* both feet down: standing in a crowd */
const STAND = HEAD.concat(TORSO, LEGS_S);
const pal = (hair, shirt) => {
    const c = safeHex(shirt, '#E8E4DE');
    return { O: 'fill="#0A0908"', h: `fill="${safeHex(hair, '#2B1A0E')}"`, s: 'fill="#E2AE80"', z: 'fill="#C48C5E"', e: 'fill="#2A1A10"',
        c: `fill="${c}"`, C: `fill="${darker(c)}"`, p: 'fill="#3A3530"', f: 'fill="#17130F"' };
};
export const personSvg = (hair, shirt) => {
    const P = pal(hair, shirt);
    return `<svg class="px" viewBox="0 0 10 14" width="30" height="42"><g class="legsA">${px(at(LEGS_A, 10), P)}</g><g class="legsB">${px(at(LEGS_B, 10), P)}</g>`
        + `<g>${px(HEAD.concat(TORSO), P)}</g></svg>`;
};

/* PLANTING THE FLAG (his 2026-11-14 "instead of opening chest we should do something to make it look like its interacting
   with the flag", then "plant it looks the best"; board A-Brain Raw/2026-11-14-man-flag/board.html): he lifts the pole
   high, stabs it into the ground, then keeps his fist on it. 11 columns: the 11th is the fist on the pole. The resting
   picture is the fist on the pole, so Lite and a freshly opened map show it. Motion: expedition.css .kx-sm.plant. */
const pad11 = (rows) => rows.map((r) => r.padEnd(11, '.'));
const REACH = pad11(['..OOOOOO.ss', '.OhhhhhhOcs', '.OhsssshOc', '.OsessesOc', '.OsszzssOc', 'OccccccccO', 'OcCccccCcO', 'OcCccccCcO', 'OsCccccCcO', 'OOppppppOO'].concat(LEGS_S));
const HOLD = pad11(HEAD.concat(['Occcccccccs', 'OcCccccCccs', 'OcCccccCcO', 'OsCccccCcO', 'OOppppppOO'], LEGS_S));
export const planterHtml = (hair, shirt) => {
    const P = pal(hair, shirt);
    return `<svg class="px" viewBox="0 0 11 14" width="33" height="42"><g class="pReach">${px(REACH, P)}</g><g class="pHold">${px(HOLD, P)}</g></svg>`;
};

/* THE CROWD ON A BUBBLE (his "group of 8bit character", 2026-10-03 20:15): every man whose marker the bubble holds,
   standing on its top edge - a front row of 3, a back row of 2 between them, then "+N". Each figure is ONE cached
   picture per hair + shirt (a class added to the sprite style the first time that look is seen), never pixel squares:
   inline squares cost 236-346 ms frames zoomed out (the 17:53 lag fix). Still on purpose - no loop per bubble. */
const figs = new Map();
const figClass = (hair, shirt) => {
    const h = safeHex(hair, '#2B1A0E'), c = safeHex(shirt, '#E8E4DE'), k = h + c;
    if (!figs.has(k)) {
        figs.set(k, `kx-fg${figs.size}`);
        if (typeof document !== 'undefined') document.getElementById('kx-sprites')?.append(`\n.${figs.get(k)}{background-image:${uri(px(STAND, pal(h, c)), 10, 14)}}`);
    }
    return figs.get(k);
};
const FRONT = { 1: [0], 2: [-7, 7], 3: [-14, 0, 14] }, BACK = { 1: [-7], 2: [-7, 7] };
export const crowdHtml = (people, feetY = 0) => {
    if (!people.length) return '';
    const f = people.slice(0, 3), b = people.slice(3, 5), more = people.length - 5;
    const fig = ([hair, shirt], x, back) => `<i class="kx-fig ${figClass(hair, shirt)}${back ? ' back' : ''}" style="left:${21 + x}px"></i>`;
    return `<div class="kx-crowd" style="top:${feetY}px">${b.map((p, i) => fig(p, BACK[b.length][i], 1)).join('')}`
        + `${f.map((p, i) => fig(p, FRONT[f.length][i])).join('')}${more > 0 ? `<b>+${more}</b>` : ''}</div>`;
};
/* ==== THE PROFESSIONAL MAP PINS (his 2026-11-13: "better professional pin looking but stays animated", then "what if some
   flag", picked B "because it is clear", then "looks like the words and symbol is knitted on the flag ... more realism").
   Board: A-Brain Raw/2026-11-13-map-pins/board.html (artifact CAdePSN2SQamUsQv5BJoBs, round 3). A shop still to visit is a
   small round pin in its salesman's colour (no salesman = dashed red with ?); a visit plants a flag whose cloth, stitched
   edge, picture and word are ONE svg, so they bend, move and shade together. Only the flag just planted (`play`) gets the
   gust: SMIL frames, because the marker is an HTML string and CSS cannot bend a path; Lite and reduced motion get none
   (CSS cannot stop SMIL). The root keeps .kx-c5 / .art / .kx-otag / .kx-snm, the hooks ShopNames, the focus dim and the
   Day Replay already use. CSS: expedition.css, "the professional map pins". ==== */
const PIN_PATH = 'M9.5 24.12 A12 12 0 1 1 18.5 24.12 L14 31 Z';
const FLAG_PIC = {
    sold: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/>',
    order: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    full: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M4 9.5h16M4 15h16"/>',
    request: '<path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>',
    routine: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    issue: '<path d="M5 5l11 11M19 5 8 16M13 19l5-5M6 14l5 5M17.5 17.5l2.5 2.5M6.5 17.5 4 20"/>',
    swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    closed: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
};
const FH = 25, NOTCH = 6, GUST = 2.0;   // cloth height, swallowtail depth, seconds the gust lasts
const EMB = { money: -0.5, plain: -0.5, problem: 0.6, closed: 0.6 };   // the thread's light edge above, or its shadow below
const n1 = (v) => String(+v.toFixed(1)), n2 = (v) => String(+v.toFixed(2)), n3 = (v) => String(+v.toFixed(3));
export const flagWidth = (outcome) => Math.round(40 + 5.7 * SIGN_WORD[outcome].length);   // the word fits: a mono letter is 0.6 em
/* where a shop's marker sits: the pin's tip, or the flag pole's foot */
export const shopIconBox = (outcome) => (outcome && SIGN_WORD[outcome] ? { size: [10 + flagWidth(outcome), 46], anchor: [7, 44] } : { size: [28, 34], anchor: [14, 31] });
const stillMotion = () => typeof document === 'undefined' || document.documentElement.classList.contains('lite-mode')
    || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
/* d(x, y, t, e): how far a point of the cloth sits above or below its place. The wave starts at the pole and runs to the tip;
   the pole side never moves; e is the gust (0 calm, 1 strongest); at rest soft folds stay */
const cloth = (W) => {
    const A = 2.2 + 0.01 * W, k = 2 * Math.PI / 26, w = 2 * Math.PI / 0.44, kr = 2 * Math.PI / 30;
    const prof = (x) => Math.pow(Math.max(0, x) / W, 1.15);
    const raw = (t) => (1 - Math.exp(-t / 0.08)) * Math.exp(-t / 0.55);
    let top = 0; for (let t = 0; t < 1; t += 0.005) top = Math.max(top, raw(t));
    return { env: (t) => raw(t) / top,
        d: (x, y, t, e) => { const u = x + 0.35 * (y - FH / 2); return prof(x) * (0.9 * Math.sin(kr * u + 0.8) + A * e * Math.sin(k * u - w * t)); } };
};
let flagUid = 0;
const flagSvg = (outcome, moving, begin = 0.24) => {   // begin: when the gust starts (0.52 s on a flag he plants)
    const fam = SIGN_FAMILY[outcome], up = SIGN_WORD[outcome], W = flagWidth(outcome), id = 'kxf' + (++flagUid);
    const { d, env } = cloth(W);
    const F = moving ? 41 : 1;
    const ts = Array.from({ length: F }, (_, i) => (F > 1 ? i * GUST / (F - 1) : 0));
    const es = ts.map((t, i) => (i === F - 1 ? 0 : env(t)));
    const frames = (fn) => ts.map((_, i) => fn(i));
    const at2 = (x, y, i) => [x * (1 - 0.03 * es[i]), y + d(x, y, ts[i], es[i])];
    const slope = (x, i) => (d(x + 0.6, FH / 2, ts[i], es[i]) - d(x - 0.6, FH / 2, ts[i], es[i])) / (1.2 * (1 - 0.03 * es[i]));
    const time = `begin="${begin}s" dur="2s" fill="freeze"`;
    const anim = (attr, v) => (moving ? `<animate attributeName="${attr}" values="${v.join(';')}" ${time}/>` : '');
    const turn = (type, v) => (moving ? `<animateTransform attributeName="transform" type="${type}" values="${v.join(';')}" ${time}/>` : '');
    const M = Math.ceil(W / 4.5);
    const edge = (i, x0, x1, yT, yB, xn, close) => {
        const p = [];
        for (let j = 0; j <= M; j++) p.push(at2(x0 + (x1 - x0) * j / M, yT, i));
        p.push(at2(xn, FH / 2, i));
        for (let j = M; j >= 0; j--) p.push(at2(x0 + (x1 - x0) * j / M, yB, i));
        return 'M' + p.map(([x, y]) => n1(x) + ' ' + n1(y)).join('L') + (close ? 'Z' : '');
    };
    const body = frames((i) => edge(i, 0, W, 0, FH, W - NOTCH, true));
    const hem = frames((i) => edge(i, 5.2, W - 3.2, 2, FH - 2, W - 8.2, false));
    /* the picture and the word: each one rides the cloth at its own spot and tilts with it */
    const LW = 5.7, LS = 0.4, GS = 15, GAP = 4;
    const x0 = (W - 2) / 2 - (GS + GAP + up.length * LW + (up.length - 1) * LS) / 2, lift = EMB[fam];
    const piece = (x, inner) => {
        const tr = frames((i) => at2(x, FH / 2, i).map(n1).join(','));
        const ro = frames((i) => n1(Math.atan(slope(x, i)) * 180 / Math.PI));
        return `<g transform="translate(${tr[0].replace(',', ' ')})">${turn('translate', tr)}<g transform="rotate(${ro[0]})">${turn('rotate', ro)}${inner}</g></g>`;
    };
    const pic = (cls, dy) => `<g class="${cls}" transform="translate(0 ${dy}) scale(.625) translate(-12 -12)">${FLAG_PIC[outcome]}</g>`;
    const pieces = piece(x0 + GS / 2, pic('gp em', lift) + pic('gp', 0))
        + [...up].map((ch, j) => piece(x0 + GS + GAP + j * (LW + LS) + LW / 2, `<text class="tx em" y="${n2(3.35 + lift)}">${ch}</text><text class="tx" y="3.35">${ch}</text>`)).join('');
    /* the folds: dark where the cloth turns away, light where it turns up - laid over the word and the picture too */
    const S = Math.ceil(W / 4);
    const fold = (gid, sign, k, max) => `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="${FH / 2}" x2="${n1(W / 1.1225)}" y2="${n1(FH / 2 + 0.35 * W / 1.1225)}">`
        + Array.from({ length: S + 1 }, (_, s) => {
            const v = frames((i) => n2(Math.min(max, Math.max(0, sign * k * slope(W * s / S, i)))));
            return `<stop offset="${n3(s / S)}" stop-color="${sign > 0 ? '#000' : '#fff'}" stop-opacity="${v[0]}">${anim('stop-opacity', v)}</stop>`;
        }).join('') + '</linearGradient>';
    return `<svg class="kx-sf" viewBox="0 0 ${W} ${FH}" width="${W}" height="${FH}" aria-hidden="true"><defs>`
        + `<path id="${id}" d="${body[0]}">${anim('d', body)}</path>${fold(id + 's', 1, 0.42, 0.3)}${fold(id + 'h', -1, 0.34, 0.22)}</defs>`
        + `<use href="#${id}" class="cl"/><rect class="ho" x=".75" y=".75" width="3.5" height="23.5"/>`
        + `<path class="hm" d="${hem[0]}">${anim('d', hem)}</path>${pieces}`
        + `<use href="#${id}" fill="url(#${id}s)"/><use href="#${id}" fill="url(#${id}h)"/><use href="#${id}" class="ed"/></svg>`;
};
/* a shop on the map. outcome = null (still to visit) or a SIGN; play = 'plant' (Journey Plan, planted now: the man's pole
   stab, see planterHtml), 'burst' (the Day Replay: rises, then the gust) or 'resign' (the result changed: the gust only); tag = the pressed salesman's "BS · 3"; free = no salesman yet; req = an
   open request; name = the shop's name under it */
export const shopHtml = (outcome, ring, play = '', tag = '', free = false, req = false, name = '') => {
    const c = safeHex(ring), nm = name ? `<span class="kx-snm"><i>${escTag(name)}</i></span>` : '';
    const otag = (left) => (tag ? `<span class="kx-otag"${left ? ` style="left:${left}px"` : ''}><i style="background:var(--c)"></i>${escTag(tag)}</span>` : '');
    const bang = req ? '<i class="kx-bd req">!</i>' : '';
    if (!outcome || !SIGN_WORD[outcome]) {
        return `<div class="kx-c5 kx-pn${free ? ' nb' : ''}${tag ? ' mine' : ''}" style="--c:${c}">${otag()}`
            + `<div class="art"><svg viewBox="0 0 28 33" width="28" height="33" aria-hidden="true"><path d="${PIN_PATH}"/></svg>${free ? '<b class="q">?</b>' : '<i class="dot"></i>'}</div>`
            + bang + nm + '</div>';
    }
    const W = flagWidth(outcome), moving = !!play && !stillMotion();
    return `<div class="kx-c5 kx-fl v f-${SIGN_FAMILY[outcome]}${play ? ` ${play}` : ''}${tag ? ' mine' : ''}" style="--c:${c};width:${10 + W}px">${otag(8 + W / 2)}`
        + `<div class="art"><svg class="pole" viewBox="0 0 14 46" aria-hidden="true"><path class="d" d="M7 4V44"/><path class="l" d="M7 4V44"/></svg><i class="rip"></i><i class="base"></i>`
        + `<div class="bn" style="width:${W}px">${flagSvg(outcome, moving, play === 'plant' ? 0.52 : 0.24)}${bang}${free ? '<i class="kx-bd nb">?</i>' : ''}</div></div>`
        + nm + '</div>';
};
/* a group of shops: the count, and a ring that fills gold with the share already visited today */
export const groupHtml = (n, visited, free = false, req = false) =>
    `<div class="kx-grp" style="--f:${n ? (visited / n).toFixed(3) : 0}">${free ? '<i class="kx-bd nb">?</i>' : ''}${req ? '<i class="kx-bd req">!</i>' : ''}<b>${n}</b></div>`;

export const QUEST = `<svg class="px quest" viewBox="0 0 6 5" width="12" height="10"><path d="M0 0h6v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h-1z" fill="#E4B04A"/><path d="M0 0h6v1h-6z" fill="#FFE2A0"/></svg>`;
