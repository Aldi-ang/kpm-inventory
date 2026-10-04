/* Journey Plan's map objects, pixel art (his settled design 2026-10-03, prototype A-Brain
   Raw/2026-10-03-map-keys/round5/map-chest-r5.html): a shop is a 14 x 14 chest, a visit plants a lit sign beside it,
   a bubble is an inventory slot, a salesman is a pixel person in his squad colour. Strings, because Leaflet's
   divIcon takes HTML. CSS lives in src/styles/expedition.css (.kx-c5, .kx-slot, .kx-sm). */

/* one letter per pixel, '.' = empty; a run of one colour becomes one rect */
const px = (rows, pal) => {
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

/* ---- the chest: a 17-row canvas; closed = rows 3-16, open = the lid's dark inside face standing at rows 0-4 ---- */
const W5DIM = { O: 'fill="#160E07"', H: 'fill="#7A5A38"', W: 'fill="#644629"', M: 'fill="#53391F"', D: 'fill="#3F2A15"', S: 'fill="#2C1C0D"',
    k: 'fill="#1C1814"', L: 'fill="#A8A296"', l: 'fill="#6E6A62"', K: 'fill="#0D0804"' };
const W5 = { O: 'fill="#24160A"', H: 'fill="#E0A55C"', W: 'fill="#BF8240"', M: 'fill="#9C6630"', D: 'fill="#74481C"', S: 'fill="#4E3012"',
    k: 'fill="#2A2622"', L: 'fill="#F2EEE4"', l: 'fill="#A9A49A"', K: 'fill="#120A04"' };
const BODY5 = ['OSSSSSSSSSSSSO', 'OHHHHHHHHHHHHO', 'OWWWWWWWWWWWMO', 'OMWWWWWWWWWWMO', 'OSSSSSSSSSSSSO', 'OHWWWWWWWWWWWO', 'OMWWWWWWWWWWMO', 'ODDDDDDDDDDDDO', '.OOOOOOOOOOOO.'];
const LID5 = ['.OOOOOOOOOOOO.', 'OHHHHHHHHHHHHO', 'OWWWWWWWWWWWMO', 'OMWWWkkkkWWWMO', 'ODDDDkLLkDDDDO', '.....kLlk.....', '.....kllk.....', '.....kkkk.....'];
const UNDER5 = ['.OOOOOOOOOOOO.', 'ODDDDDDDDDDDDO', 'ODMMMMMMMMMMDO', 'ODSSSSSSSSSSDO', 'ODDDDDDDDDDDDO'];
const INSIDE5 = ['.OOOOOOOOOOOO.', 'OKKKKKKKKKKKKO', 'OKKKKKKKKKKKKO'];
const CHEST5 = `<svg class="px chest" viewBox="0 0 14 17" width="28" height="34">`
    + `<g>${px(at(BODY5, 8), W5DIM)}</g><g class="bright">${px(at(BODY5, 8), W5)}</g>`
    + `<g>${px(at(INSIDE5, 5), W5)}</g><g class="lidU">${px(UNDER5, W5)}</g>`
    + `<g class="lidF"><g>${px(LID5, W5DIM)}</g><g class="bright">${px(LID5, W5)}</g></g></svg>`;

/* ---- the lit sign: a pale board on a post, a 9 x 6 picture per visit outcome ---- */
const SP5 = { O: 'fill="#3F2C18"', w: 'fill="#F0E2BC"', v: 'fill="#D9C597"', P: 'fill="#5B3F22"', K: 'fill="#221509"', R: 'fill="#B3261E"',
    G: 'fill="#E2A12E"', Y: 'fill="#FFF4CF"', b: 'fill="#A8743A"' };
const BOARD5 = ['.OOOOOOOOO.', 'OwwwwwwwwwO', 'OwwwwwwwwwO', 'OwwwwwwwwwO', 'OwwwwwwwwwO', 'OwwwwwwwwwO', 'OvvvvvvvvvO', '.OOOOOOOOO.', '.....P.....', '.....P.....', '....PPP....'];
const PIC5 = {
    sold:    ['...KKK...', '..KGGGK..', '.KGYGGGK.', '.KGGGGGK.', '..KGGGK..', '...KKK...'],
    order:   ['.KKKKKKK.', '.KbbKbbK.', '.KKKKKKK.', '.KbbbbbK.', '.KbbbbbK.', '.KKKKKKK.'],
    routine: ['........K', '.......KK', '.K....KK.', '.KK..KK..', '..KKKK...', '...KK....'],
    full:    ['.K.K.K.K.', '.K.K.K.K.', 'KKKKKKKKK', '.K.K.K.K.', '.K.K.K.K.', 'KKKKKKKKK'],
    issue:   ['....R....', '...RKR...', '..RRKRR..', '..RRKRR..', '.RRRRRRR.', 'RRRRKRRRR'],
    request: ['.KKKKKKK.', 'K.......K', 'K.K.K.K.K', 'K.......K', '.KKKKKKK.', '..KK.....'],
    closed:  ['...RRR...', '..R...R..', '..R...R..', '.RRRRRRR.', '.RRRKRRR.', '.RRRRRRR.'],
};
export const SIGN5 = Object.fromEntries(Object.entries(PIC5).map(([k, pic]) => [k,
    `<svg class="px" viewBox="0 0 11 11" width="22" height="22">${px(BOARD5, SP5)}${px(['...........'].concat(pic.map((r) => '.' + r + '.')), SP5)}</svg>`]));

/* the visit's outcome -> its sign. A real sale through the terminal today wins; otherwise the report's tag
   (QUICK_TAGS in src/JourneyView.jsx, matched on their emoji like the pins always were); no tag = Routine Check */
export const signFor = (tag, sold) => {
    if (sold) return 'sold';
    const t = String(tag || '');
    return t.includes('📦') ? 'order' : t.includes('🛑') ? 'full' : t.includes('⚠️') ? 'issue'
        : t.includes('📝') ? 'request' : t.includes('🔒') ? 'closed' : 'routine';
};

/* sparks: only on an element born to play the moment */
const SPARKS = '<span class="fx">' + [[-14, -16], [12, -18], [-6, -24], [16, -6], [-17, -4], [5, -27]].map(([dx, dy]) => `<i style="--dx:${dx}px;--dy:${dy}px"></i>`).join('') + '</span>';

/* AT REST a chest or a sign is ONE cached picture, not ~150 pixel squares (his "zoomed out ... so much lag on the
   phone", 2026-10-03 17:30: every zoom rebuilt ~1,700-2,600 squares, frames up to 346 ms at phone speed). The same
   pixel rows as the animated chest, frozen in each end state, so the swap after the moment is invisible. */
const STILL = {
    closed: px(at(BODY5, 8), W5DIM) + px(at(INSIDE5, 5), W5) + px(at(LID5, 3), W5DIM),   // not visited: dim, lid down
    shut: px(at(BODY5, 8), W5) + px(at(INSIDE5, 5), W5) + px(at(LID5, 3), W5),           // closed store (and a bubble's chest)
    open: px(at(BODY5, 8), W5) + px(at(INSIDE5, 5), W5) + px(UNDER5, W5),                // visited: lid up, dark inside
};
const uri = (body, w, h) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${body}</svg>`)}")`;
export const SPRITE_CSS = Object.entries(STILL).map(([k, b]) => `.kx-spr-${k}{background-image:${uri(b, 14, 17)}}`)
    .concat(Object.keys(PIC5).map((k) => `.kx-sgn-${k}{background-image:${uri(SIGN5[k].replace(/^<svg[^>]*>|<\/svg>$/g, ''), 11, 11)}}`)).join('\n');
if (typeof document !== 'undefined' && !document.getElementById('kx-sprites')) {
    const s = document.createElement('style'); s.id = 'kx-sprites'; s.textContent = SPRITE_CSS; document.head.append(s);
}

/* a shop: not visited = dim closed chest; visited = lid open, dark inside, a lit sign; closed store = lid down + lock.
   `play` = 'burst' (first visit) or 'resign' (the outcome changed) - only while the map is open, and only then is the
   chest built from its animated parts */
/* `tag`: the pressed salesman's own name tag with the stop number ("BS · 3", his look B 2026-10-04, "Name tags is easier
   to see") - ownership in words, never only the ring's colour */
const escTag = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const chestHtml = (outcome, ring, play = '', tag = '') =>
    `<div class="kx-c5${outcome ? ' v' : ''}${outcome === 'closed' ? ' shut' : ''}${play ? ` ${play}` : ''}${tag ? ' mine' : ''}" style="--c:${safeHex(ring)}"><i class="kx-ring"></i>`
    + (tag ? `<span class="kx-otag"><i style="background:var(--c)"></i>${escTag(tag)}</span>` : '')
    + `<div class="art"><div class="hop">${play ? CHEST5 : `<i class="kx-spr kx-spr-${!outcome ? 'closed' : outcome === 'closed' ? 'shut' : 'open'}"></i>`}</div></div>`
    + (outcome ? `<i class="sign5"><i class="lamp"></i>${play ? SIGN5[outcome] : `<i class="kx-sgn kx-sgn-${outcome}"></i>`}</i>` : '') + (play ? SPARKS : '') + '</div>';

/* a bubble: an inventory slot, the shop count like an item stack, a bar filling amber with the visited share */
export const slotHtml = (n, visited) =>
    `<div class="kx-slot${n && visited === n ? ' full' : ''}" style="--f:${n ? (visited / n).toFixed(3) : 0}"><div class="hop">`
    + `<span class="kx-c5"><i class="kx-spr kx-spr-${n && visited === n ? 'open' : 'shut'}"></i></span><b class="cnt" data-n="${n}">${n}</b></div><i class="dur"><i></i></i></div>`;

/* ---- the salesman: 10 x 14 pixel person, the shirt in his squad colour, two leg frames for walking ---- */
const HEAD = ['..OOOOOO..', '.OhhhhhhO.', '.OhsssshO.', '.OsessesO.', '.OsszzssO.'];
const TORSO = ['OccccccccO', 'OcCccccCcO', 'OcCccccCcO', 'OsCccccCsO', 'OOppppppOO'];
const LEGS_A = ['.OppOOppO.', '.OppOOffO.', '.OffO.OO..', '.OOOO.....'];   /* left foot down, right foot lifted */
const LEGS_B = ['.OppOOppO.', '.OffOOppO.', '..OO.OffO.', '.....OOOO.'];   /* the other way round */
const LEGS_S = ['.OppOOppO.', '.OppOOppO.', '.OffO.OffO', '.OOOO.OOOO'];   /* both feet down: standing in a crowd */
const STAND = HEAD.concat(TORSO, LEGS_S);
const ARMS = ['s.OOOOOO.s', 'cOhhhhhhOc', 'cOhsssshOc', 'cOsessesOc', 'cOsszzssOc',   /* both hands up, holding the coin */
    'OccccccccO', 'OcCccccCcO', 'OcCccccCcO', 'OcCccccCcO', 'OOppppppOO'].concat(LEGS_S);
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

/* SELLING AT A SHOP (his pick B "paid", with "coin animation that used on the agent inventory and receipt", 2026-10-03
   23:05): hands up holding Agent Inventory's spinning coin (.kpm-coin, theme.css). Standing is the moment's first frame
   only; the resting picture is the held coin, so Lite and a freshly opened map show it. Motion in expedition.css. */
export const sellerHtml = (hair, shirt) => {
    const P = pal(hair, shirt);
    return `<svg class="px" viewBox="0 0 10 14" width="30" height="42"><g class="pStand">${px(STAND, P)}</g><g class="pArms">${px(ARMS, P)}</g></svg>`
        + '<span class="kx-cx"><span class="kx-cy"><i class="kpm-coin"></i></span></span>';
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
export const QUEST = `<svg class="px quest" viewBox="0 0 6 5" width="12" height="10"><path d="M0 0h6v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h-1z" fill="#E4B04A"/><path d="M0 0h6v1h-6z" fill="#FFE2A0"/></svg>`;
