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
const block = (start) => {
  const i = css.indexOf(start);
  const j = css.indexOf('}', i);
  return css.slice(i, j);
};
const parse = (text) => Object.fromEntries(
  [...text.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map(m => [m[1], m[2]]));

const dark = parse(block(':root {'));
const light = { ...dark, ...parse(block(':root.light,')) };

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
];

let fail = 0;
for (const [theme, tokens] of [['DARK ', dark], ['LIGHT', light]]) {
  console.log(`\n${theme}`);
  for (const [what, fg, bg, min] of PAIRS) {
    const a = tokens[fg], b = tokens[bg];
    if (!a || !b) { fail++; console.log(`  MISSING  ${what} (--${fg} / --${bg})`); continue; }
    const r = ratio(a, b);
    const ok = r >= min;
    if (!ok) fail++;
    console.log(`  ${ok ? ' ok ' : 'FAIL'}  ${r.toFixed(2)}:1  (needs ${min})  ${what}  ${a} on ${b}`);
  }
}
console.log(`\n${fail ? `${fail} FAILED` : 'all pairs pass'}`);
process.exit(fail ? 1 : 0);
