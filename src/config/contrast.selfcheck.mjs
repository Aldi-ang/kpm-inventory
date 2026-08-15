/* CONTRAST SELF-CHECK — reads the real tokens out of src/styles/theme.css and measures every
   text-on-surface pair the control system actually uses, in BOTH themes.

   Why this file exists: Aldi, 2026-08-13 — *"dont use yellow color for text on light mode because
   its hard to see, red color is some place also not visible"*. He was right, and the palette law
   in theme.css already said it ("gold is DECORATION ... never a text colour"), yet `.kpm-btn.key`
   shipped with `color: var(--gold)`. A law in a comment did not stop it; a number will.

   WCAG 2.1 contrast: 4.5:1 for body text, 3:1 for large/bold text and for UI boundaries.
   Run: node src/config/contrast.selfcheck.mjs                                                  */
import fs from 'node:fs';

const css = fs.readFileSync('src/styles/theme.css', 'utf8');

/* :root holds dark; html.light overrides. Read each block separately so a token that is only
   defined in one of them still resolves for both. */
/* ⚠️ EVERY block, not the first one. The Duke's Ledger palette (2026-08-15) added a SECOND
   `:root {` and a second `:root.light,` further down the file, and an indexOf that stopped at the
   first match read none of it — 54 tokens would have gone unmeasured while this still printed
   "all pairs pass". A measuring tool that quietly measures less than it claims is worse than none. */
const blocks = (start) => {
  const out = [];
  for (let i = css.indexOf(start); i !== -1; i = css.indexOf(start, i + 1))
    out.push(css.slice(i, css.indexOf('}', i)));
  return out.join('\n');
};
const parse = (text) => Object.fromEntries(
  [...text.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map(m => [m[1], m[2]]));

const dark = parse(blocks(':root {'));
const light = { ...dark, ...parse(blocks(':root.light,')) };

const srgb = (hex) => {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6);
  return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255);
};
const lum = (hex) => {
  const [r, g, b] = srgb(hex).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* every pair the control system puts on screen. `min` is 4.5 for text, 3 for large/bold text
   and for a control's own boundary. */
const PAIRS = [
  ['module title on panel',        'ink',            'panel',        4.5],
  ['description on panel',         'ink-muted',      'panel',        4.5],
  ['rail title on inset',          'ink',            'inset',        4.5],
  ['readout on inset',             'ink-muted',      'inset',        4.5],
  ['readout ON the gold plate',    'gold-ink',       'gold',         4.5],
  ['readout ON the danger plate',  'danger-plate-ink', 'danger-plate', 4.5],
  ['band caption',                 'ink',            'inset',        4.5],
  ['hazard band caption',          'danger-ink',     'danger-well',  4.5],
  ['hazard TITLE on its head',     'danger-ink',     'danger-well',  4.5],
  ['hazard description on head',   'ink-muted',      'danger-well',  4.5],
  ['button label on raised',       'ink',            'raised',       4.5],
  ['KEY button label on raised',   'accent-ink',     'raised',       4.5],
  ['HAZARD button label on raised','danger-ink',     'raised',       4.5],
  ['field text on inset',          'ink',            'inset',        4.5],
  ['field label on panel',         'ink-muted',      'panel',        4.5],
  ['record name on raised',        'ink',            'raised',       4.5],
  ['record email on raised',       'ink-muted',      'raised',       4.5],
  ['control edge on panel',        'line-3',         'panel',        3],
  ['gold EDGE on panel',           'accent-edge',    'panel',        3],

  /* ── THE DUKE'S LEDGER, the sales terminal's own palette (2026-08-15) ──────────────────────
     Same lesson as the one at the top of this file, and it landed again on the first pass: the
     amber ink looked right at #8a4f00 and measured 3,03:1 on the panel. Gold and red are the two
     he has reported unreadable in light mode; they are the ones to measure, never to eyeball. */
  ['Duke text on a panel',         'duke-ink-3',       'duke-fill-panel',  4.5],
  ['Duke text on the bench',       'duke-ink-3',       'duke-fill-ground', 4.5],
  ['Duke text on paper',           'duke-ink-1',       'duke-paper',       4.5],
  ['Duke secondary text',          'duke-ink-2',       'duke-fill-panel',  4.5],
  ['Duke dim text',                'duke-ink-4',       'duke-fill-panel',  4.5],
  ['Duke meta text',               'duke-ink-8',       'duke-fill-panel',  4.5],
  ['Duke text on a plank',         'duke-ink-6',       'duke-fill-plank',  4.5],
  ['Duke cream-role text',         'duke-paper-ink',   'duke-fill-panel',  4.5],
  ['Duke AMBER text',              'duke-amber-ink',   'duke-fill-panel',  4.5],
  ['Duke amber text, deep',        'duke-amber-ink-2', 'duke-fill-panel',  4.5],
  ['Duke BRASS text',              'duke-brass-ink',   'duke-fill-panel',  4.5],
  ['Duke brass text, deep',        'duke-brass-ink-2', 'duke-fill-panel',  4.5],
  ['Duke RED text',                'duke-danger-ink',  'duke-fill-panel',  4.5],
  ['Duke red text, deep',          'duke-danger-ink-2','duke-fill-panel',  4.5],
  /* ink ON a plate — the plate is the same colour in both themes, so this pair must hold twice */
  ['Duke ink on the amber plate',  'duke-on-plate',    'duke-amber',       4.5],
  ['Duke ink on the brass plate',  'duke-on-plate',    'duke-brass',       4.5],
  ['Duke structural line',         'duke-edge-1',      'duke-fill-panel',  3],
  ['Duke second line',             'duke-edge-2',      'duke-fill-panel',  3],
  ['Duke light rule',              'duke-edge-3',      'duke-fill-panel',  3],
  ['Duke faint rule',              'duke-edge-4',      'duke-fill-panel',  3],
  ['Duke tan rule',                'duke-edge-5',      'duke-fill-panel',  3],
  ['Duke amber border',            'duke-amber-edge',  'duke-fill-panel',  3],
  ['Duke amber border, deep',      'duke-amber-edge-2','duke-fill-panel',  3],
  ['Duke brass border',            'duke-brass-edge',  'duke-fill-panel',  3],
  ['Duke brass border 2',          'duke-brass-edge-2','duke-fill-panel',  3],
  ['Duke brass border, bright',    'duke-brass-edge-3','duke-fill-panel',  3],
  ['Duke brass border, dull',      'duke-brass-edge-4','duke-fill-panel',  3],
  ['Duke red border',              'duke-danger-edge', 'duke-fill-panel',  3],
];

/* ⚠️ THE DUKE PAIRS ARE ENFORCED IN LIGHT AND ONLY REPORTED IN DARK, ON PURPOSE.
   The light values were designed here and are ours to hold to a number. The DARK values are
   Aldi's own Duke's Ledger, shipped and hand-tested, and they were carried across unchanged so
   that dark mode could not move — the whole safety property of that change. Several of them do
   not clear 4,5:1, and that is a real finding worth acting on, but "improve the terminal's dark
   contrast" is a decision he has to make, because it costs him a re-test. Failing the build on
   it would be this file overruling him rather than informing him. Reported loudly, not enforced. */
const softInDark = (what) => what.startsWith('Duke ');

let fail = 0, noted = 0;
for (const [theme, tokens] of [['DARK ', dark], ['LIGHT', light]]) {
  console.log(`\n${theme}`);
  for (const [what, fg, bg, min] of PAIRS) {
    const a = tokens[fg], b = tokens[bg];
    if (!a || !b) { fail++; console.log(`  MISSING  ${what} (--${fg} / --${bg})`); continue; }
    const r = ratio(a, b);
    const ok = r >= min;
    const soft = !ok && theme === 'DARK ' && softInDark(what);
    if (soft) noted++; else if (!ok) fail++;
    console.log(`  ${ok ? ' ok ' : soft ? 'note' : 'FAIL'}  ${r.toFixed(2)}:1  (needs ${min})  ${what}  ${a} on ${b}`);
  }
}
if (noted) console.log(`\n${noted} pre-existing DARK pair(s) below target in the Duke's Ledger — ` +
  `his design, carried across unchanged. Reported, not enforced. Changing them costs a re-test.`);
console.log(`\n${fail ? `${fail} FAILED` : 'all pairs pass'}`);
process.exit(fail ? 1 : 0);
