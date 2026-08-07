/* Integration audit for the sales terminal.

   Checks the BUILT output, not the source. Source can contain a class Tailwind never emitted
   or a rule the minifier dropped — that has already happened twice on this project, and both
   times a source grep said everything was fine.

   Needles are built literally where escaping matters (Tailwind escapes ':' as '\:', and the
   minifier rewrites '::before' to ':before'), because loose substring checks have produced
   false passes here before. */
import fs from 'node:fs';

const D = 'dist/assets/';
const files = fs.readdirSync(D);
const css = files.filter(f => f.endsWith('.css')).map(f => fs.readFileSync(D + f, 'utf8')).join('\n');
const allJs = files.filter(f => f.endsWith('.js')).map(f => fs.readFileSync(D + f, 'utf8')).join('\n');
const term = fs.readFileSync(D + files.find(f => f.startsWith('MerchantSalesView-')), 'utf8');
const src = fs.readFileSync('src/MerchantSalesView.jsx', 'utf8');
/* The sale is assembled here, not in the view — so the territory stamp has to be asserted
   here too, in BOTH the offline and the online payload. */
const engine = fs.readFileSync('src/hooks/useTransactionEngine.js', 'utf8');
const BS = String.fromCharCode(92);

let pass = 0, fail = 0;
const results = [];
const check = (group, label, ok, detail = '') => {
  ok ? pass++ : fail++;
  results.push({ group, label, ok, detail });
};
const inCss = (g, l, n) => check(g, l, css.includes(n), n);
const inJs  = (g, l, n) => check(g, l, term.includes(n), n);

/* ── 1. THE MERCHANT ─────────────────────────────────────────────────────── */
const G1 = '1. The merchant';
inCss(G1, 'alcove (his cave)',            '.kpm-alcove');
inCss(G1, 'torches',                      '.kpm-torch');
inCss(G1, 'flame',                        '.kpm-flame');
inCss(G1, 'cast shadows',                 '.kpm-alcove .cast');
inCss(G1, 'idle sheet',                   '.kpm-merch-idle');
inCss(G1, 'talking sheet',                '.kpm-merch-talk');
inCss(G1, 'deal pose',                    '.kpm-merch-deal');
inCss(G1, 'coin in his hand',             '.kpm-merch-hold');
inCss(G1, 'travelling merchant',          '.kpm-merch-float');
inCss(G1, 'cave speech bubble',           '.kpm-alcove .says');
inCss(G1, 'corner speech bubble',         '.kpm-merch-float .bubble');
inCss(G1, 'arrives / leaves',             '@keyframes kpmMerchArrive');
check(G1, 'both figures 200px',
  (css.match(/width:200px;height:200px/g) || []).length >= 1 &&
  /\.kpm-alcove \.fig\{[^}]*width:200px/.test(css));
check(G1, 'both bubbles at 214px',
  (css.match(/bottom:214px/g) || []).length >= 2, 'need 2 occurrences');
inJs(G1, 'no duplicate capybara (handshake)', 'CAPY_SUPPRESS');
inJs(G1, 'customer lines (not "one more")',   'Their page, then.');

/* ── 2. THE WARES ────────────────────────────────────────────────────────── */
const G2 = '2. The wares';
inCss(G2, '3D box',                       '.kpm-cube');
inCss(G2, 'sized from real millimetres',  '--mm-h');
inCss(G2, 'turns on hover',               '@keyframes kpm-turn');
inJs (G2, 'six faces from the vault',     'useFrontForBack');
inJs (G2, 'press picture to pin/expand',  'Show what is left of ');
inJs (G2, 'examine button',               'Examine ');
check(G2, 'hover-to-rail removed', !term.includes('onMouseEnter'));
check(G2, 'no fixed card width in grid', !term.includes('lg:w-[260px]'));
check(G2, 'three per row emitted', css.includes('@media(min-width:1400px)'));
check(G2, 'three-per-row wins the cascade',
  css.indexOf('@media(min-width:1400px)') > css.indexOf('@media(min-width:1024px)'));

/* ── 3. THE RAIL ─────────────────────────────────────────────────────────── */
const G3 = '3. The rail';
inCss(G3, 'rail',                         '.kpm-rail');
inCss(G3, 'crossfade between states',     '@keyframes kpmRailIn');
inJs (G3, 'state: examine',               'In vehicle');
inJs (G3, 'state: customer brief',        'Before you go in');
inJs (G3, 'state: today',                 'Stores done');
inJs (G3, 'same as last time',            'Same as last time');
inJs (G3, 'no-history state',             'No order in the last 7 days.');
inJs (G3, 'today vs yesterday',           'vs yesterday');
inJs (G3, 'stock in units he counts in',  'Bks total');
inJs (G3, 'reorder guarded by stock',     'on the vehicle today');
inJs (G3, 'next stop',                    'Next stop');
inJs (G3, 'how many are left today',      'left today');
check(G3, 'directions opens maps', term.includes('maps/dir/?api=1'));
/* It leaves the app, and an app that leaves cannot finish a sale — so it must open in a new
   tab and must never carry primary weight. */
check(G3, 'directions opens in a new tab', term.includes('noopener noreferrer'));
/* Two shops sharing a wall is a real situation in a pasar; three is a menu. */
/* State names are minified away, so the source is the honest place to assert the mechanism
   and the built chunk is where to assert it actually renders. */
check(G3, 'two-store swap exists', src.includes('nearbyStores') && src.includes('renderStoreSwap'));
check(G3, 'swap renders on both surfaces',
  (src.match(/\{renderStoreSwap\(\)\}/g) || []).length === 2, 'rail + phone strip');
check(G3, 'swap capped at two', /slice\(0,\s*2\)/.test(src));
check(G3, 'swap reaches the bundle', term.includes('min-w-0 flex-1 truncate rounded border'));
/* Showing nothing when there is no GPS fix read as "the feature is missing". */
inJs (G3, 'next stop explains a missing fix', 'Needs a GPS fix');
inJs (G3, 'next stop explains a finished round', 'Nothing left nearby');
/* A revisit by the SAME agent is reported, not blocked — blocking it silently was the
   "I pick a customer and nothing happens" bug. Another agent's claim keeps the hard gate. */
inJs (G3, 'own revisit is reported',      'Already sold here today');
inJs (G3, "another agent's claim is reported", 'Already secured today');
/* window.confirm returns false SILENTLY once a browser has been told to suppress dialogs,
   so a guard built on it fails closed and invisibly — selecting a store simply does nothing.
   The claim must be a banner, which cannot be suppressed. */
check(G3, 'no blocking dialog guards customer selection',
  !/window\.confirm\([^)]*DOUBLE-TAP/.test(src),
  'the double-tap dialog must not come back');
/* The brief must wait until he has SETTLED on a customer. Rendering on raw keystrokes put a
   brief on screen for "HQ" while he was typing his way to "HQ 1", and reported "no order in
   the last 7 days" about a store that does not exist — indistinguishable from a real record. */
check(G3, 'brief waits for a settled customer', src.includes('customerSettled'));
/* "Search is closed" was not strong enough — clicking away closes it, and a typed name that
   happens to match old walk-in transactions then filled the brief with real figures for a
   store nobody chose. A brief needs a CHOSEN customer. */
check(G3, 'a brief requires a chosen customer',
  /customerSettled\s*=\s*!!selectedCustomerInfo\s*&&\s*!!customerName\.trim\(\)/.test(src));
check(G3, 'no surface still keys off raw typing',
  !/\) : customerName\.trim\(\) \? \(/.test(src) && !/\{customerName\.trim\(\) && \(\n\s*<div className="kpm-strip/.test(src));

/* ── 4. THE LEDGER ───────────────────────────────────────────────────────── */
const G4 = '4. The ledger';
inCss(G4, 'parchment',                    '.kpm-parchment');
inCss(G4, 'parchment scrollbar',          '.kpm-scroll');
inJs (G4, 'mixed units Karton/Bal/Slop',  'Karton');
inJs (G4, 'conversion readout',           '1 KARTON = ');
inJs (G4, 'geofence block',               'Location verified');
inJs (G4, 'commit button',                'SIGN MANIFEST');

/* ── 5. FEEL ─────────────────────────────────────────────────────────────── */
const G5 = '5. Feel';
check(G5, 'hover = corner brackets', /\.kpm-hover:hover::?before/.test(css));
check(G5, 'old sweep gone', !/\.kpm-hover[^{]*\{[^}]*linear-gradient\(105deg/.test(css));
inCss(G5, 'reticle cursor',               'kpm-cursor');
inCss(G5, 'cursor gold survives encoding','%23ffca28');
inCss(G5, 'inputs keep the I-beam',       'cursor:text');
inCss(G5, 'key badge for "/"',            '.kpm-kbd');
inCss(G5, 'press feedback',               '.kpm-press');
check(G5, 'louder SFX (gain stage)', allJs.includes('createMediaElementSource'));
check(G5, 'lite mode still answers hover', css.includes('lite-mode .kpm-hover'));
inCss(G5, 'examine opens with motion',    '@keyframes kpmExamineObject');
check(G5, 'examine never scales from zero',
  /@keyframes kpmExamineObject\{[^}]*scale\(\.94\)/.test(css), 'must start at .94, not 0');
check(G5, 'examine motion respects lite mode', css.includes('lite-mode .kpm-examine-in'));

/* ── 6. SIDEBAR AWARENESS ────────────────────────────────────────────────── */
const G6 = '6. Sidebar';
inCss(G6, 'app knows the nav is open',    'kpm-nav-open');
inCss(G6, 'rail yields when cramped',     'max-width:1535px');
inCss(G6, 'grid yields when cramped',     'max-width:1659px');
check(G6, 'sidebar collapses its width', css.includes('.lg' + BS + ':w-0'));
/* With the panel closed the fixed menu button landed on "System Active". */
check(G6, 'menu button does not sit on the header', css.includes('html:not(.kpm-nav-open) .kpm-topbar'));
/* The bell is z-[9999]; a "full screen" 3D view at z-[60] was never actually on top. */
check(G6, '3D view outranks the notification bell', allJs.includes('z-[10000]'));

/* ── 7. NOTHING LOST ─────────────────────────────────────────────────────── */
const G7 = '7. Old features intact';
const CENSUS = { isReturMode: 42, returType: 29, nooForm: 21, priceTier: 15, gpsStatus: 10,
                 txProofPhoto: 9, fulfillment: 10, handleFulfillIOU: 2, updateCartItem: 14,
                 handleFinalDeal: 2, renderManifestUI: 2, onInspect: 3 };
for (const [id, expected] of Object.entries(CENSUS)) {
  const n = (src.match(new RegExp(id, 'g')) || []).length;
  check(G7, `${id} (>= ${expected})`, n >= expected, `found ${n}`);
}
for (const [label, needle] of [
  ['retur: buyback',      'Buyback (Refund)'],
  ['retur: exchange',     'Exchange (Tukar)'],
  ['retur: damage reason','Select Reason'],
  ['IOU: pending banner', 'IOU Pending Fulfillment'],
  ['IOU: hutang barang',  'Hutang Barang (IOU)'],
  ['NOO registration',    'Outlet Registration'],
  ['NOO: live photo',     'Capture Live Photo'],
  ['sampling',            'Deploy Marketing Sample'],
  ['geofence bypass',     'Request 100m HQ Bypass'],
  ['printed receipt',     'print-receipt'],
]) inJs(G7, label, needle);

/* ── 7b. THE PHONE ───────────────────────────────────────────────────────── */
const G7b = '7b. Phone';
inCss(G7b, 'context strip',               '.kpm-strip');
inCss(G7b, 'strip enters',                '@keyframes kpmStripIn');
inJs (G7b, 'brief on the phone',          'Before you go in');
inJs (G7b, 'collapses while selling',     'Selling to');
check(G7b, 'strip animates transform/opacity only, never height',
  !/\.kpm-strip\{[^}]*height/.test(css) && !/@keyframes kpmStripIn\{[^}]*height/.test(css));
/* A touch screen fires :hover on tap and KEEPS it. Ungated hover rules latch onto whatever
   was last pressed — brackets stuck on, a ware spinning forever. */
check(G7b, 'hover gated behind a real pointer',
  (css.match(/@media\(hover:hover\)and \(pointer:fine\)/g) || []).length >= 2,
  'need the bracket hover AND the cube spin gated');
check(G7b, 'reorder button meets the 44px touch minimum', term.includes('h-11'));
inJs (G7b, 'stock breakdown on the card',  'In vehicle');
check(G7b, 'card wraps so the breakdown gets its own row', term.includes('flex-wrap lg:flex-col'));
/* Three targets never fit an 80px square. The eye moved into the panel; the picture keeps
   the square to itself and grew to 96px. */
inJs (G7b, 'examine moved into the panel', 'Examine in 3D');
/* Stronger than "the eye is desktop-only": NOTHING may be absolutely positioned over the
   picture, because the picture is the press target for opening a ware's detail at every
   width. Anything on top of it competes with it. */
check(G7b, 'nothing overlaps the picture', !/absolute bottom-\d+ left-\d+[^"]*z-20/.test(term));
check(G7b, 'examine reachable in BOTH panels',
  (term.match(/Examine in 3D/g) || []).length >= 2, 'rail panel + phone card panel');
check(G7b, 'picture target grew to 96px', term.includes('w-24 h-24 lg:w-auto'));
/* The state the phone spends most of its day in: driving, no customer chosen. */
check(G7b, 'driving state shows the next stop', term.includes('!customerName.trim()') || term.includes('Next stop'));
check(G7b, 'Go button meets the touch minimum', /h-11 shrink-0 items-center/.test(term));

/* ── 8. PALETTE LAW ──────────────────────────────────────────────────────── */
const G8 = '8. Palette law';
const beforeNota = src.slice(0, src.indexOf('print-receipt'));
const offPalette = (beforeNota.match(/(^|["' ])(slate|blue|emerald|indigo|teal|cyan|green)-[a-z0-9]/g) || [])
  .filter(m => !m.includes('translate'));
check(G8, 'no blue/green in the app UI', offPalette.length === 0,
  offPalette.length ? offPalette.slice(0, 6).join(' ') : '');
check(G8, 'printed nota keeps KPM blue (deliberate)', src.includes('!text-blue-900'));

/* ── 9. GUARDS RENDER, THEY NEVER DIALOG ─────────────────────────────────── */
/* window.confirm returns false WITHOUT drawing anything in a browser where the user ticked
   "prevent this page from creating more dialogues" — Aldi's has. Both guards in the terminal
   used one, so both failed closed AND invisibly: picking another agent's store did nothing at
   all, and registering an outlet near an existing one did nothing at all, each with no message
   and no reason. A comment warning about this already sat nine lines above one of them and did
   not stop it, which is exactly why this is a check and not another paragraph. */
const G9 = '9. Guards render, never dialog';
/* Comments stripped first, deliberately. The reason these dialogs are banned has to stay
   written next to the code that used to hold them, and a plain substring test would fail on
   its own explanation — which it did, the first time this check ran. Banned is the CALL. */
const srcCode = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
check(G9, 'no confirm() dialog in the terminal', !/window\.confirm\s*\(/.test(srcCode),
  'a suppressed dialog answers false invisibly — render the guard instead');
inJs (G9, 'territory reported on screen',     'Another agent handles this store');
inJs (G9, 'territory sale still allowed',     'territory override');
inJs (G9, 'proximity reported on screen',     'would create a duplicate');
inJs (G9, 'proximity has a visible way past', 'This is a different building');
/* The stamp is the entire anti-fraud mechanism now that the block is gone. A sale made
   offline must carry the same evidence as one made online, so BOTH payloads need it. */
check(G9, 'override reaches the saved sale, offline and online',
  (engine.match(/territoryOverride:/g) || []).length >= 2,
  'offline payload AND online batch must both carry it');
check(G9, 'terminal sends the override with the sale',
  src.includes('territoryOverride: territoryClaim'));
/* territoryClaim is written only by handleCustomerSelect, so both paths that clear the chosen
   customer must clear it too — the post-sale reset and typing over a chosen store. Miss either
   and the next hand-typed walk-in is stamped with the previous store's owner. The built bundle
   mangles the setter name so this cannot be checked there; the source is where it is checkable. */
check(G9, 'territory claim cleared on both customer-clearing paths',
  (src.match(/setTerritoryClaim\(null\)/g) || []).length >= 2,
  'post-sale reset AND handleManualCustomerType must both clear it');

/* ── 10. no browser dialog anywhere in the app ─────────────────────────────
   Group 9 proved the sales terminal was clean. It was the only clean file: 58 more of these
   were live across 16 others, every one of them dead on a browser with the dialog box ticked.
   They now route through src/components/ConfirmGate.jsx, which draws the question on the page.
   These checks are what stop the next one being added. */
const G10 = '10. No browser dialog anywhere';
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const p = `${d}/${e.name}`;
  if (e.isDirectory()) return e.name === '.claude' || e.name === 'node_modules' ? [] : walk(p);
  return /\.(jsx?|mjs)$/.test(e.name) ? [p] : [];
});
/* src/.claude/worktrees/ holds three whole copies of this app. They are not shipped and their
   confirms are not this app's problem, so the walk skips any .claude directory. */
const appFiles = walk('src').filter(f => !f.includes('config/'));
const offenders = appFiles.filter(f => /window\.confirm\s*\(/.test(strip(fs.readFileSync(f, 'utf8'))));
check(G10, 'no window.confirm left in src/', offenders.length === 0,
  offenders.length ? `still present in: ${offenders.join(', ')}` : '');

const gate = fs.readFileSync('src/components/ConfirmGate.jsx', 'utf8');
const mainJsx = fs.readFileSync('src/main.jsx', 'utf8');
check(G10, 'the gate is mounted, or every confirm in the app refuses',
  /<ConfirmHost\s*\/>/.test(mainJsx) && /from\s+['"]\.\/components\/ConfirmGate/.test(mainJsx),
  'main.jsx must render <ConfirmHost /> — without it confirmAction resolves false every time');
check(G10, 'gate refuses loudly, never silently', gate.includes('console.error'),
  'the whole point is that a refusal is findable');
check(G10, 'gate offers a way through and a way out',
  gate.includes('Cancel') && /Yes, do it|Confirm</.test(gate));
/* A file that awaits confirmAction without importing it throws at runtime, in a click handler,
   where nobody sees it until the button is dead. Cheap to assert, so assert it. */
const users = appFiles.filter(f => /await confirmAction\s*\(/.test(fs.readFileSync(f, 'utf8')));
const missing = users.filter(f => !/from\s+['"][^'"]*ConfirmGate/.test(fs.readFileSync(f, 'utf8')));
check(G10, 'every caller imports the gate', missing.length === 0,
  missing.length ? `missing import: ${missing.join(', ')}` : `${users.length} files call it`);
/* allJs, not inJs: inJs searches the MerchantSalesView chunk alone, and the gate is its own
   chunk. Asserting the built output rather than the source is what proves it actually ships. */
check(G10, 'the gate reached the built bundle',
  allJs.includes('Yes, do it') && allJs.includes('is not mounted'),
  'ConfirmGate is not in dist/ — it would be missing from the app entirely');

/* prompt() is the same failure one step worse: suppressed, it returns null, and every caller
   reads null as "he cancelled". So renaming a folder or giving a rejection reason silently did
   nothing, with no box ever drawn. The lookbehind is what keeps this from matching the
   replacement, promptAction( — without it the check passes on the very thing it bans. */
const BARE_PROMPT = /(?<![.\w$])(?:window\.)?prompt\s*\(/;
const promptLeft = appFiles.filter(f => BARE_PROMPT.test(strip(fs.readFileSync(f, 'utf8'))));
check(G10, 'no window.prompt left in src/', promptLeft.length === 0,
  promptLeft.length ? `still present in: ${promptLeft.join(', ')}` : '');
const pUsers = appFiles.filter(f => /await promptAction\s*\(/.test(fs.readFileSync(f, 'utf8')));
const pMissing = pUsers.filter(f => !/promptAction[^}]*}\s*from\s+['"][^'"]*ConfirmGate/.test(fs.readFileSync(f, 'utf8')));
check(G10, 'every prompt caller imports promptAction', pMissing.length === 0,
  pMissing.length ? `missing import: ${pMissing.join(', ')}` : `${pUsers.length} files call it`);
/* A prompt with no field to type in is just a confirm that throws the answer away. */
check(G10, 'the typing field reached the built bundle',
  allJs.includes('Type it in') && gate.includes('inputRef'),
  'promptAction would resolve empty every time');
check(G10, 'a cancelled prompt answers null, not empty string', gate.includes("? (inputRef.current?.value ?? '') : null"),
  'callers guard with `if (name && ...)` — null is what they expect from a cancel');

/* ── report ──────────────────────────────────────────────────────────────── */
let last = '';
for (const r of results) {
  if (r.group !== last) { console.log('\n' + r.group); last = r.group; }
  const mark = r.ok ? '  ok  ' : ' FAIL ';
  console.log(`${mark} ${r.label}${r.ok ? '' : `   <-- ${r.detail}`}`);
}
console.log(`\n${'='.repeat(58)}`);
console.log(`${pass} passed, ${fail} failed, ${pass + fail} checks`);
process.exit(fail ? 1 : 0);
