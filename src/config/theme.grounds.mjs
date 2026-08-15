/* theme.grounds.mjs — WHICH ACCENTS ACTUALLY HAVE TO CHANGE, AND WHICH ARE ALREADY RIGHT
   =============================================================================================
   Run:  node src/config/theme.grounds.mjs src/SomeView.jsx

   🔑 THE ONE IDEA. A colour is not convertible on its own. `text-orange-400` is CORRECT on a
   black disc and INVISIBLE on the cream panel — same class, opposite verdict — so the thing that
   decides is the GROUND it sits on, not the colour itself. This walks the JSX by indentation,
   resolves each accent site's nearest ancestor background, and groups the sites by that ground.

   🔴 THIS EXISTS BECAUSE THE BLIND SWEEPS COST TWO SESSIONS. A global search-and-replace does
   two kinds of damage at once: it converts accents on plates, which is work that changes nothing
   and risks screens Aldi has already signed off, and it MISSES nothing — which sounds fine until
   you notice it also cannot tell you what it missed. Read the output, then convert by group.

   How to read the output:
     ground: bg-black / bg-red-600 / bg-[rgba(...)]  -> a PLATE. Leave it. It carries its own
                                                        colour and never touches the page.
     ground: bg-[var(--duke-well-solid)] etc.        -> FLIPS. Every accent here must become an
                                                        -ink (text) or an -edge (boundary).
     ground: PAGE                                    -> FLIPS, hardest case: nothing between the
                                                        text and the page background.
   ⚠️ Two things it cannot see, so check them by hand:
     · a subtree wearing `.kpm-dark-island` stays DARK whatever its tokens say — leave those.
     · a `dark:` variant already present means the bare class IS the light value. Leave those.  */

import fs from 'node:fs';

const FILE = process.argv[2];
if (!FILE) { console.error('usage: node src/config/theme.grounds.mjs <file.jsx>'); process.exit(2); }

const ACCENT = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|' +
               'cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const V = '(?:hover:|focus:|active:|group-hover:|group-open:)?';
const inkRe  = new RegExp(`(?:^|[\\s"'\`])(${V}text-(?:${ACCENT})-\\d+(?:\\/\\d+)?)`, 'g');
const edgeRe = new RegExp(`(?:^|[\\s"'\`])(${V}border(?:-[btlrxy])?-(?:${ACCENT})-\\d+(?:\\/\\d+)?)`, 'g');
const bgRe   = new RegExp(
  `(?:^|[\\s"'\`])(${V}bg-(?:(?:${ACCENT})-\\d+|\\[[^\\]\\s]+\\]|black|white)(?:\\/\\d+)?)`, 'g');
const isState = (c) => /^(hover|focus|active|group-hover|group-open):/.test(c);

const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/);
const stack = [];   // {indent, bg, line} — the open elements that painted a background
const rows = [];

lines.forEach((raw, i) => {
  const ind = raw.search(/\S/);
  if (ind < 0) return;
  while (stack.length && stack[stack.length - 1].indent >= ind) stack.pop();

  const own = [...raw.matchAll(bgRe)].map(m => m[1]).filter(c => !isState(c));
  const hits = [...[...raw.matchAll(inkRe)].map(m => m[1]),
                ...[...raw.matchAll(edgeRe)].map(m => m[1])];
  if (hits.length) {
    /* a background on the SAME element beats any ancestor — that is the ground it truly sits on */
    const anc = stack[stack.length - 1];
    rows.push({ line: i + 1, what: hits.join(' '),
                ground: own[0] || (anc ? anc.bg : 'PAGE'),
                via: own[0] ? '' : (anc ? ` (line ${anc.line})` : '') });
  }
  if (own.length) stack.push({ indent: ind, bg: own[0], line: i + 1 });
});

/* ⚠️ THREE VERDICTS, NOT TWO — and the third one is the one that matters most.
   The first version of this file had only PLATE and FLIPS, and it reported MapMissionControl as
   "187 on plates, 4 to convert", which read as *almost done*. It is the opposite: those 187 sit
   on `bg-slate-800` and `bg-slate-900`, a hardcoded dark panel that has never been converted at
   all. The accents on it are correct RELATIVE TO THAT PANEL, and the panel is the work. Calling
   an unconverted surface a plate turns a whole untouched screen into a green tick. */
const NEUTRAL = 'slate|gray|zinc|neutral|stone';
const verdictOf = (g) => {
  if (new RegExp(`^bg-(?:${NEUTRAL})-\\d+`).test(g) || /^bg-(black|white)\/\d/.test(g))
    return ['SURFACE — the panel itself is unconverted', 'surface'];
  if (new RegExp(`^bg-(?:${ACCENT})-\\d+`).test(g) || /^bg-(black|white)$/.test(g) ||
      /^bg-\[(?:#|rgba?\()/.test(g))
    return ['PLATE — leave, it carries its own colour', 'plate'];
  return ['FLIPS — convert to an ink or an edge', 'flips'];
};

const byGround = new Map();
for (const r of rows) {
  if (!byGround.has(r.ground)) byGround.set(r.ground, []);
  byGround.get(r.ground).push(r);
}
const tally = { surface: 0, plate: 0, flips: 0 };
for (const [g, rs] of [...byGround].sort((a, b) => b[1].length - a[1].length)) {
  const [label, key] = verdictOf(g);
  tally[key] += rs.length;
  console.log(`\n### ${g}   (${rs.length})   ${label}`);
  for (const r of rs) console.log(`  ${String(r.line).padStart(5)}  ${r.what}${r.via}`);
}
console.log(`\n${rows.length} accent sites · ${tally.flips} on a ground that flips · ` +
            `${tally.surface} on a panel that was never converted · ${tally.plate} on plates`);
