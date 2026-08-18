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
/* 🔴 MATCHED ON THE SELECTOR, NOT ON THE LITERAL STRING `:root {` — 2026-08-16. The dark blocks
   grew a second selector (`.kpm-dark-island`, so a subtree can keep the dark values), which made
   the exact text `:root {` vanish from the file. This script then parsed ZERO dark tokens and
   reported 88 failures — it was measuring an empty palette, not a broken one.
   ⚠️ The same class of fault this file's own comment warns about, one level up: an anchor that
   depends on incidental formatting rather than on the thing it means. */
const blocks = (re) => {
  const out = [];
  for (const m of css.matchAll(re)) {
    const open = css.indexOf('{', m.index);
    if (open !== -1) out.push(css.slice(open, css.indexOf('}', open)));
  }
  return out.join('\n');
};
const parse = (text) => Object.fromEntries(
  [...text.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map(m => [m[1], m[2]]));

/* `(?![.\w-])` keeps the DARK matcher off `:root.light` and `:root.dark`, while still allowing
   `:root {` and `:root,` — the two shapes a dark block is allowed to take. */
const dark = parse(blocks(/(^|\n):root(?![.\w-])[^{]*\{/g));
const light = { ...dark, ...parse(blocks(/(^|\n):root\.light[^{]*\{/g)) };
if (Object.keys(dark).length < 50) {
  console.error(`only ${Object.keys(dark).length} dark tokens parsed — the block matcher is ` +
    'broken, and every "pass" below would be measuring a palette that is not there.');
  process.exit(1);
}

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

  /* 🔴 THE PLATE ITSELF, NOT JUST THE INK ON IT — the gap that produced *"the settingview still
     looks unclear on the light mode"*. Every pair above asks whether text on a surface can be
     read. None of them asked whether the STATE can be seen: a gold plate marks every ON in this
     app, and in light mode it stood off the panel at 1,61:1 while measuring perfectly for its
     own ink. An unreadable state is as broken as unreadable text and nothing here was watching
     for it. 3:1 is the WCAG floor for a non-text indicator. */
  ['the gold PLATE against a panel','gold',           'panel',        3],
  ['the gold PLATE against a well', 'gold',           'inset',        3],
  ['the gold PLATE against raised', 'gold',           'raised',       3],
  /* ⚠️ THE KNOB-AGAINST-TRACK RATIO IS DELIBERATELY NOT CHECKED. In dark it is 2,25:1 and has
     been since the switch was built from his video — because the state is carried by WHERE THE
     KNOB IS, not by how it contrasts with the track. That is the entire reason it is a sliding
     knob and not a colour swap, and it is why the switch survives Lite Mode stripping colour.
     Asserting 3:1 here would fail a control that works, which is how a real check turns into
     noise someone learns to ignore. What DOES matter is that the knob stays pale on a dark
     light-mode track, and that is covered by the plate pairs above. */
  ['rank name on the grid header',  'ink',            'sunk',         4.5],
  ['hold label before it fills',    'danger-ink',     'panel',        4.5],

  /* 🔴 THE QUIET TEXT — 89 uses across every screen, and it was never measured here until
     2026-08-15. It sat at 4,0:1 under a comment reading "meta text only", which reads like an
     exemption and is not one: a 10px label is small text and owes 4,5:1 exactly like body copy.
     It is checked on the five grounds it actually lands on, in both themes, so it cannot drift
     back down quietly. `--ink-disabled` is NOT here on purpose — WCAG exempts disabled controls,
     and looking unavailable is that token's entire job. */
  ['quiet text on panel',          'ink-dim',        'panel',        4.5],
  ['quiet text on raised',         'ink-dim',        'raised',       4.5],
  ['quiet text on inset',          'ink-dim',        'inset',        4.5],
  ['quiet text on the ground',     'ink-dim',        'ground',       4.5],
  ['quiet text in the red well',   'ink-dim',        'danger-well',  4.5],
  /* the EOD/opname screens moved every red panel off --danger and onto the well, 2026-08-18 */
  ['plain text in the red well',   'ink',            'danger-well',  4.5],
  ['gold text in the red well',    'accent-ink',     'danger-well',  4.5],
  ['quiet text on the bench',      'ink-dim',        'duke-fill-ground', 4.5],
  ['quiet text in a Duke well',    'ink-dim',        'duke-fill-well',   4.5],
  ['quiet text on a Duke panel',   'ink-dim',        'duke-fill-panel',  4.5],

  /* 🔴 THE SIDEBAR'S "YOU ARE HERE", 2026-08-16 — *"yellow color glow inside the sidebar on
     light mode is not good because it is not clear, feels like the color is menyatu with the
     background"*. Nothing here was watching the rail, because the rail was not using tokens:
     its ON state was a gold bloom written as rgba literals in this stylesheet and a #ff9d00
     in the JSX, so both themes got the value that was tuned for the black one. --glass-solid
     is the rail's own surface. 3:1 is the floor for a non-text indicator, same as the plate
     pairs above, and for the same reason: an unreadable STATE is as broken as unreadable text. */
  ['the ON plate against the rail', 'gold',          'glass-solid',  3],
  ['the ON icon on its plate',      'gold-ink',      'gold',         4.5],

  /* ── THE DUKE'S LEDGER, the sales terminal's own palette ──────────────────────────
     WARNING: THESE PAIRS WERE DISCOVERED, NOT INVENTED. The first version of this block listed
     pairs I assumed the screen rendered, and several of them did not exist. A check that asserts
     a pairing the UI never draws is worse than no check, because someone eventually "fixes" a
     colour that was fine. These come from walking the JSX for every ink and the surface it
     actually sits on. BOTH themes are enforced.
     Two kinds of thing are deliberately NOT here: pairs that exist only inside opposite branches
     of one conditional (the scan sees a base text colour beside a hover background), and the
     `--ink-*` SYSTEM tokens, which every screen in the app uses and which are not the terminal's
     to change. Those are an open question for Aldi — see PROGRESS.md. */
  ['Duke text on the bench',       'duke-ink-3',         'duke-fill-ground', 4.5],
  ['Duke text on a panel',         'duke-ink-3',         'duke-fill-panel',  4.5],
  ['Duke text on the deep',        'duke-ink-3',         'duke-fill-deep',   4.5],
  ['Duke text in a well',          'duke-ink-3',         'duke-fill-well',   4.5],
  ['Duke dim text',                'duke-ink-4',         'duke-fill-ground', 4.5],
  ['Duke dim text 2',              'duke-ink-5',         'duke-fill-panel',  4.5],
  ['Duke faint text',              'duke-ink-6',         'duke-fill-ground', 4.5],
  ['Duke faint text, deep',        'duke-ink-6',         'duke-fill-deep',   4.5],
  ['Duke faint text, well',        'duke-ink-6',         'duke-fill-well',   4.5],
  ['Duke meta text',               'duke-ink-8',         'duke-fill-ground', 4.5],
  ['Duke bright text on a panel',  'duke-ink-1',         'duke-fill-panel',  4.5],
  ['Duke bright text in a well',   'duke-ink-1',         'duke-fill-well',   4.5],
  ['Duke bright text on a plank',  'duke-ink-1',         'duke-fill-plank',  4.5],
  ['Duke white-role on a panel',   'duke-ink-hi',        'duke-fill-panel',  4.5],
  ['Duke white-role on the bench', 'duke-ink-hi',        'duke-fill-ground', 4.5],
  ['Duke white-role in an input',  'duke-ink-hi',        'duke-well-solid',  4.5],
  ['Duke white-role on a stage',   'duke-ink-hi',        'duke-stage',       4.5],
  ['Duke white-role on a bar',     'duke-ink-hi',        'duke-bar-solid',   4.5],
  ['Duke AMBER on the bench',      'duke-amber-ink',     'duke-fill-ground', 4.5],
  ['Duke AMBER on a panel',        'duke-amber-ink',     'duke-fill-panel',  4.5],
  ['Duke AMBER in a well',         'duke-amber-ink',     'duke-fill-well',   4.5],
  ['Duke amber 2 on the bench',    'duke-amber-ink-2',   'duke-fill-ground', 4.5],
  ['Duke BRASS on the bench',      'duke-brass-ink',     'duke-fill-ground', 4.5],
  ['Duke BRASS on a panel',        'duke-brass-ink',     'duke-fill-panel',  4.5],
  ['Duke BRASS in a well',         'duke-brass-ink',     'duke-fill-well',   4.5],
  ['Duke RED in the red well',     'duke-danger-ink',    'danger-well',      4.5],
  ['Duke RED in a well',           'duke-danger-ink',    'duke-fill-well',   4.5],
  ['Duke red 2 on the bench',      'duke-danger-ink-2',  'duke-fill-ground', 4.5],
  ['Duke cream-role on the deep',  'duke-paper-ink',     'duke-fill-deep',   4.5],
  ['Duke cream-role on the bench', 'duke-paper-ink',     'duke-fill-ground', 4.5],
  ['Duke cream-role in an input',  'duke-paper-ink',     'duke-well-solid',  4.5],
  /* the cream cards are light in BOTH themes, so the ink laid on them is dark in both */
  ['Duke ink on a card',           'duke-on-paper',      'duke-paper',       4.5],
  ['Duke ink on a card 2',         'duke-on-paper',      'duke-paper-2',     4.5],
  ['Duke dim ink on a card',       'duke-on-paper-dim',  'duke-paper',       4.5],
  ['Duke dim ink on a card 2',     'duke-on-paper-dim',  'duke-paper-2',     4.5],
  ['Duke amber ink on a card',     'duke-amber-on-paper','duke-paper',       4.5],
  ['Duke amber ink on a card 2',   'duke-amber-on-paper','duke-paper-2',     4.5],
  ['Duke dark ink on a card',      'duke-ink-7',         'duke-paper',       4.5],
  ['Duke dark ink on a card 3',    'duke-ink-7',         'duke-paper-3',     4.5],
  ['Duke dark ink on a card 5',    'duke-ink-7',         'duke-paper-5',     4.5],
  /* ink ON a plate: the plate is the same colour in both themes, so this must hold twice */
  ['Duke ink on the amber plate',  'duke-on-plate',      'duke-amber',       4.5],
  ['Duke ink on the brass plate',  'duke-on-plate',      'duke-brass',       4.5],
  ['Duke ink on brass plate 2',    'duke-on-plate',      'duke-brass-2',     4.5],
  /* 3:1 IS THE RIGHT FLOOR ONLY HERE — the running total and the ware's price are large and
     black-weight, the band WCAG allows it in. It is what lets a price read as amber, not brown. */
  ['Duke PRICE on the bench',      'duke-price-ink',     'duke-fill-ground', 3],
  ['Duke PRICE on a panel',        'duke-price-ink',     'duke-fill-panel',  3],
  ['Duke PRICE in a well',         'duke-price-ink',     'duke-fill-well',   3],
  /* A CONTROL'S EDGE OWES 3:1; A DIVIDER OWES NOTHING. `--duke-edge-1` stays the decorative seam
     it always was, at 1,28:1 against the wood, and that is not a defect — raising it would turn
     every seam into a bright line and rebuild a look he has already signed off. Only the boundary
     of something you can type in or press is checked here. */
  ['Duke control edge, panel',     'duke-edge-ctl',      'duke-fill-panel',  3],
  ['Duke control edge, bench',     'duke-edge-ctl',      'duke-fill-ground', 3],
  ['Duke control edge, plank',     'duke-edge-ctl',      'duke-fill-plank',  3],
  ['Duke control edge, input',     'duke-edge-ctl',      'duke-well-solid',  3],
  ['Duke control edge on a card',  'duke-edge-on-paper', 'duke-paper',       3],
  ['Duke control edge on card 2',  'duke-edge-on-paper', 'duke-paper-2',     3],
  ['Duke amber edge, panel',       'duke-amber-edge',    'duke-fill-panel',  3],
  ['Duke amber edge, bench',       'duke-amber-edge',    'duke-fill-ground', 3],
  ['Duke brass edge, panel',       'duke-brass-edge',    'duke-fill-panel',  3],
  ['Duke brass edge, bench',       'duke-brass-edge',    'duke-fill-ground', 3],
];

/* ⚠️ THE DUKE PAIRS ARE ENFORCED IN LIGHT AND ONLY REPORTED IN DARK, ON PURPOSE.
   The light values were designed here and are ours to hold to a number. The DARK values are
   Aldi's own Duke's Ledger, shipped and hand-tested, and they were carried across unchanged so
   that dark mode could not move — the whole safety property of that change. Several of them do
   not clear 4,5:1, and that is a real finding worth acting on, but "improve the terminal's dark
   contrast" is a decision he has to make, because it costs him a re-test. Failing the build on
   it would be this file overruling him rather than informing him. Reported loudly, not enforced. */
const softInDark = () => false;   // nothing is exempt any more — see the note in PAIRS

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
