/* Integration audit for the sales terminal.

   Checks the BUILT output, not the source. Source can contain a class Tailwind never emitted
   or a rule the minifier dropped — that has already happened twice on this project, and both
   times a source grep said everything was fine.

   Needles are built literally where escaping matters (Tailwind escapes ':' as '\:', and the
   minifier rewrites '::before' to ':before'), because loose substring checks have produced
   false passes here before. */
import fs from 'node:fs';

const D = 'dist/assets/';

/* ── IS dist EVEN THIS BUILD? ──────────────────────────────────────────────
   Every check below reads dist/. When a build FAILS, dist keeps the previous output and this
   file cheerfully re-audits it — on 2026-08-10 a JSX syntax error killed the build and the
   audit still printed "191 passed, 0 failed" against the last good bundle. A green audit
   standing on a failed build is worse than a red one, because it is trusted.

   So: refuse to report anything if any source file is newer than the newest built asset. */
const newest = (dir, skip = /node_modules|\.git/) => {
  let t = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (skip.test(p)) continue;
    t = Math.max(t, e.isDirectory() ? newest(p, skip) : fs.statSync(p).mtimeMs);
  }
  return t;
};
if (!fs.existsSync(D)) {
  console.error('\nNO dist/ AT ALL. Run `npm run build` first — this audit reads the built output.');
  process.exit(1);
}
if (newest('src') > newest(D)) {
  console.error('\nSTALE BUILD: src/ is newer than dist/. Run `npm run build` and audit again.');
  console.error('Refusing to report — a pass here would be describing the PREVIOUS build.\n');
  process.exit(1);
}

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
/* Comments QUOTE the code they replaced — "it used to be `hidden md:flex`" is exactly the kind of
   sentence worth writing, and exactly the kind that fails a grep for `hidden md:flex`. Four checks
   went red on their own explanations on 2026-08-13. Structural tests run on the code, not the prose. */
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
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
/* INVERTED 2026-08-14. It used to require a 76px left inset on the desk header, to clear a menu
   button fixed at top-left. That button is deleted at every width and the desk navigation is now
   an 88px strip in the flow — so the inset became 76px of dead space on every desk screen, and he
   pointed straight at it: "i dont want this many spaces useless". */
check(G6, 'the header reserves no room for a menu button that no longer exists',
  !css.includes('html:not(.kpm-nav-open) .kpm-topbar'),
  'nothing is fixed over the header any more; the strip sits in the flow beside it');
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

/* ── 11. one spelling for the store's price level ──────────────────────────
   useTransactionEngine used to write `pricingTier` while the rest of the app reads
   `priceTier`. App.jsx's permittedCustomers filter only knew `priceTier`, so a store
   registered during a sale defaulted to 'Retail' and could vanish from the very agent who
   created it — who then created it again. That is where duplicate stores came from. */
const G11 = '11. Store price level has one spelling';
const engineCode = strip(engine);
check(G11, 'the sale path writes priceTier, never pricingTier',
  !/pricingTier\s*:/.test(engineCode),
  'pricingTier is invisible to the customer filter in App.jsx');
/* Same dual-payload rule as the territory stamp: a sale made offline must record the tier the
   same way as one made online, or the store is only half-registered. */
check(G11, 'both sale payloads carry the tier, offline and online',
  (engineCode.match(/priceTier\s*:/g) || []).length >= 3,
  'offline payload and both online branches must each set it');
const appCode = strip(fs.readFileSync('src/App.jsx', 'utf8'));
check(G11, 'the customer filter still reads the old spelling too',
  /c\.priceTier\s*\|\|\s*c\.pricingTier/.test(appCode),
  'this is what un-hides every store already saved the old way, without a migration');
/* The repair writes to live customer records. batch.set() would REPLACE each document with
   the single field it writes — name, address and GPS gone — because commitInChunks passes
   op.options, not op.merge, so a merge flag on the operation is silently ignored. */
const custMgr = fs.readFileSync('src/components/CustomerManager.jsx', 'utf8');
const repairBlock = custMgr.slice(custMgr.indexOf('handleRepairTierField'), custMgr.indexOf('handleEnterpriseDataScrub'));
check(G11, 'the tier repair updates fields, never overwrites the record',
  repairBlock.includes("type: 'update'") && !repairBlock.includes("type: 'set'"),
  'set() here would erase name/address/GPS on every store it touched');
check(G11, 'the tier repair never deletes anything',
  !/deleteDoc|type:\s*'delete'/.test(repairBlock),
  'merging or removing a duplicate store is a human decision, not this button');

/* ── 12. the duplicate finder reports and nothing else ─────────────────────
   Choosing which of two copies keeps its sales history and its outstanding debt is a decision
   about real money. The finder exists to put that choice in front of Aldi, never to make it. */
const G12 = '12. Duplicate finder is read-only';
const dup = fs.readFileSync('src/utils/findDuplicates.js', 'utf8');
check(G12, 'the finder cannot touch the database',
  !/deleteDoc|updateDoc|setDoc|writeBatch|addDoc|commitInChunks/.test(dup),
  'findDuplicates.js must stay a pure function over the customer list');
check(G12, 'the finder does not mutate the list it is given',
  dup.includes('[...members]') && !/customers\.sort\(|list\.sort\(/.test(dup),
  'it runs against live app state — sorting in place would reorder the directory');
/* A delete button here would be one misclick from destroying a store's history. */
/* Slice the PANEL only. Anchoring at handleFindDuplicates instead swept in the unrelated
   handleDelete defined between it and the JSX, and failed on code that has nothing to do
   with the report. */
const panelStart = custMgr.indexOf('dupReport && (');
const dupPanel = custMgr.slice(panelStart, custMgr.indexOf('CUSTOMER DIRECTORY PERMISSION TIER', panelStart));
/* Aldi asked for Open and Delete on each row (2026-08-07) so he could act without hunting for
   the record. Delete stays, but it is the only destructive control in the panel and it is
   one-at-a-time: no bulk delete, no auto-merge. Choosing which copy keeps its sales history and
   its debt is still his call, made per row, with the store named in front of him. */
check(G12, 'deleting from the report asks first, and names the exact store',
  /handleDeleteDuplicate/.test(dupPanel) &&
  /await confirmAction\(/.test(custMgr.slice(custMgr.indexOf('handleDeleteDuplicate'))) &&
  /id \$\{store\.id\}/.test(custMgr),
  'two rows share a name — the confirm must show the id or he cannot tell them apart');
check(G12, 'no bulk delete and no auto-merge',
  !/deleteAll|Merge All|mergeDuplicates|forEach\([^)]*deleteDoc/i.test(dupPanel),
  'one row at a time, decided by him, or a misclick takes out a whole group');
/* The false positive that started this: three "warung sembako sumber rejeki" 14.5km apart,
   matched on a name as generic as "corner shop". Without the warning, deleting two of them
   reads as tidying up and actually destroys two live stores. */
check(G12, 'name-only matches that are far apart are flagged as probably NOT duplicates',
  /sameNameFarApart/.test(dup) && /FAR_APART_METRES/.test(dup) &&
  /Probably NOT duplicates/.test(dupPanel),
  'a common shop name repeating across a city is a coincidence, not a duplicate');
check(G12, 'the delete confirm shouts louder on a coincidence group',
  /sameNameFarApart[\s\S]{0,400}PROBABLY NOT DUPLICATES/.test(custMgr),
  'the group that most needs the warning is the one he is most likely to delete from');
check(G12, 'every row says where it actually is',
  /dupPlace/.test(dupPanel) && /const dupPlace/.test(custMgr),
  'identical names in a list are why he could not tell the records apart');
check(G12, 'the finder reached the built bundle',
  allJs.includes('likely the original'),
  'findDuplicates is not in dist/ — the button would do nothing');
check(G12, 'the finder has a runnable self-check',
  fs.existsSync('src/config/findDuplicates.selfcheck.mjs'),
  'node src/config/findDuplicates.selfcheck.mjs');

/* ── 13. no message box anywhere ───────────────────────────────────────────
   The other half of group 10. A browser told to suppress dialogs suppresses the message box
   too, so 184 reports across 18 files — every "saved", every "failed to save", every "not
   enough stock" — could draw nothing on Aldi's machine and let the code carry straight on.
   They now route through src/components/Toast.jsx, which draws them on the page. These checks
   are what stop the next one being added. */
const G13 = '13. No message box anywhere';
const boxLeft = appFiles.filter(f => /(?<![.\w$])alert\s*\(/.test(strip(fs.readFileSync(f, 'utf8'))));
check(G13, 'no bare alert() left in src/', boxLeft.length === 0,
  boxLeft.length ? `still present in: ${boxLeft.join(', ')}` : '');

const toast = fs.readFileSync('src/components/Toast.jsx', 'utf8');
check(G13, 'the toast host is mounted, or every report goes to the console',
  /<ToastHost\s*\/>/.test(mainJsx) && /from\s+['"]\.\/components\/Toast/.test(mainJsx),
  'main.jsx must render <ToastHost /> — without it notify() only reaches console.error');
/* Several call sites are written `return alert(msg)`. That works only because both return
   undefined. Make notify async or promise-returning and those functions start returning a
   pending promise instead of exiting — a silent behaviour change at sites nobody would retest. */
check(G13, 'notify stays fire-and-forget', /export function notify\s*\(/.test(toast) &&
  !/export\s+async\s+function\s+notify/.test(toast) &&
  (toast.match(/return undefined;/g) || []).length >= 2,
  '`return alert(x)` call sites depend on notify returning undefined, not a promise');
/* THE trap in this job. Get this backwards and every failure message starts fading after 3.5
   seconds — the exact silent-failure class the whole thing existed to end. Unrecognised text
   must stay on screen; only a recognised success is allowed to clear itself. */
const sev = fs.readFileSync('src/utils/toastSeverity.js', 'utf8');
check(G13, 'the host asks the classifier, it does not judge for itself',
  /sticky:\s*isSticky\(text\)/.test(toast) && /from\s+['"][^'"]*toastSeverity\.js['"]/.test(toast),
  'the severity rule must stay in one testable place');
check(G13, 'anything not recognisably a success stays until clicked',
  /return\s+!SUCCESS\.test\(text\)/.test(sev),
  'the default must be sticky — a dropped failure message is the bug this replaced');
/* "Could not complete the sync" contains "complete". Checking SUCCESS first faded it — a sync
   failure vanishing unread. FAILURE returning true before SUCCESS is ever consulted is what
   stops that, so the order is asserted, not just commented. */
check(G13, 'a failure wins even when it also reads like a success',
  /if\s*\(FAILURE\.test\(text\)\)\s*return true;[\s\S]{0,120}return\s+!SUCCESS\.test/.test(sev),
  'FAILURE must be tested before SUCCESS — see toastSeverity.selfcheck.mjs');
check(G13, 'the severity rule has a runnable self-check',
  fs.existsSync('src/config/toastSeverity.selfcheck.mjs'),
  'node src/config/toastSeverity.selfcheck.mjs');
/* 68 reports in App.jsx speak only through the mascot, and some of them are failures. He holds
   a line 8 seconds, the next line can walk over it, and the sales terminal suppresses him
   entirely — so a failure announced only by him is a failure allowed to go unseen, which is the
   whole class of bug this group exists to close. A recognised failure must also raise a strip. */
const appSrc = fs.readFileSync('src/App.jsx', 'utf8');
check(G13, 'a failure the mascot reports also raises a strip',
  /const triggerCapy[\s\S]{0,400}?isFailure\(text\)\s*&&\s*notify\(text\)|const triggerCapy[\s\S]{0,400}?if\s*\(isFailure\(text\)\)\s*notify\(text\)/.test(appSrc) &&
  /from\s+['"][^'"]*toastSeverity\.js['"]/.test(appSrc),
  'the mascot is allowed to be missed; a failure is not');
check(G13, 'a stuck toast can always be cleared', /onClick=\{\(\)\s*=>\s*dismiss\(item\.id\)\}/.test(toast) &&
  /clearTimeout/.test(toast),
  'sticky with no way out would wall off the screen');
const nUsers = appFiles.filter(f => /(?<![.\w$])notify\s*\(/.test(fs.readFileSync(f, 'utf8')) &&
  f !== 'src/components/Toast.jsx');
const nMissing = nUsers.filter(f => !/from\s+['"][^'"]*\/Toast\.jsx['"]/.test(fs.readFileSync(f, 'utf8')));
check(G13, 'every caller imports notify', nMissing.length === 0,
  nMissing.length ? `missing import: ${nMissing.join(', ')}` : `${nUsers.length} files call it`);
check(G13, 'the toast reached the built bundle',
  allJs.includes('Message lost:'),
  'Toast.jsx is not in dist/ — every report in the app would vanish into the console');
/* Audio is locked until the page sees a real gesture. Before this, the ONLY caller of
   unlockSounds was MerchantSalesView, so a sound played from any other screen was silent
   forever — Aldi tested the strips from the Master Vault and reported no SFX at all. */
check(G13, 'audio is unlocked app-wide, not only by the sales terminal',
  /unlockSounds/.test(mainJsx),
  'main.jsx must unlock on the first gesture or every sound outside the terminal is a no-op');
/* `once: true` used to be asserted here. It was WRONG and it silenced his iPhone: one tap fires
   pointerdown AND touchstart, so a single touch removed all three listeners even when the unlock
   had failed — and on iOS the first touch of a session often does fail. The listener must survive
   a failed attempt and only stand down once the unlock reports success. */
/* Read the sound listener's OPTIONS specifically, not the whole file: the comment above it in
   main.jsx explains the bug and necessarily contains the words, so a file-wide text match would
   fail on the very explanation of the fix. */
const soundListenerOpts = (mainJsx.match(/window\.addEventListener\(evt, onGestureUnlock, \{([^}]*)\}/) || ['', 'MISSING'])[1];
check(G13, 'a failed unlock leaves the app still listening for the next gesture',
  !/once/.test(soundListenerOpts) && /removeEventListener\(evt, onGestureUnlock/.test(mainJsx),
  'main.jsx must keep listening until unlockSounds() actually returns true, or one bad first tap mutes the session');
/* Routing an element through createMediaElementSource moves its output into the Web Audio graph
   permanently. Do that while the context is suspended and the element is silent forever. */
const useSoundSrc = fs.readFileSync('src/hooks/useSound.js', 'utf8');
check(G13, 'the gain stage is only built once the audio context is running',
  /state\s*!==\s*'running'/.test(useSoundSrc) && /buildGainStage/.test(useSoundSrc),
  'boostElement must not run against a suspended context — that is what made every sound silent on his phone');
/* `tap` is 45ms. A sound that short is not quiet, it is inaudible, and choosing it for the
   most frequent toast is why the strips seemed to have no sound of their own. */
check(G13, 'the toast does not use the 45ms blip', !/playSound\([^)]*'tap'/.test(toast),
  'measure a sound before choosing it — tap.mp3 is 0.045s and cannot be heard');
/* The one behaviour the message box had that a toast does not: it blocked. Code written as
   `alert(msg); window.location.reload();` relied on that — the reload could not run until he
   clicked OK. Reloading destroys ToastHost with the rest of the page, so the same two lines
   with notify() show him nothing at all. Found once, in the crown transfer, where the lost
   message was the only confirmation that ownership of the whole system had changed hands.
   signOut() is NOT in this ban: ToastHost is a sibling of <App /> in main.jsx, so signing out
   re-renders App without unmounting the toast, and the message survives onto the login screen. */
const reloadRace = appFiles.filter(f =>
  /(?<![.\w$])notify\s*\([\s\S]{0,300}?\)\s*;\s*(?:\/\/[^\n]*\n\s*)?window\.location\.(?:reload\s*\(|href\s*=)/
    .test(strip(fs.readFileSync(f, 'utf8'))));
check(G13, 'no report is destroyed by the reload on the next line', reloadRace.length === 0,
  reloadRace.length ? `notify() then an immediate reload in: ${reloadRace.join(', ')}` : '');

/* ── 14. the unlock sequence ──────────────────────────────────────────────
   The "ACCESS GRANTED" screen broke two of Aldi's own locked laws at once — eight emerald
   classes against no-blue-no-green, and two counter-rotating rings against "nothing rotates".
   It also ran a 2.4s progress bar that measured nothing: both unlock paths had already awaited
   their Firestore write before this branch rendered, so the 2500ms timeout was pure waiting
   charged to every single login. Group 8's palette scan only reads MerchantSalesView, which is
   why none of that was ever caught. This group watches the branch itself. */
const G14 = '14. The vault opens without lying';

/* The condition gained `&& !gateIsRich()` on 2026-08-10 — his report: "there is split second of
   old access granted panel after i press the enter vault in phone". This block is now the LITE
   path only; the rich gate fades the card instead of swapping its contents. The match has to
   tolerate a guard here, or the whole group goes blind the next time the condition is touched. */
const unlockBlock = (appCode.match(/\{isUnlocking[^?]*\? \(([\s\S]*?)\n\s*\) : \(/) || ['', ''])[1];

check(G14, 'the old ACCESS GRANTED panel cannot flash over the rich gate',
  /\{isUnlocking && !gateIsRich\(\) \? \(/.test(appCode),
  'without the !gateIsRich() guard the card swaps to ACCESS GRANTED on the same frame it starts fading, and he sees it');

check(G14, 'the unlock sequence is where this group can see it', unlockBlock.length > 200,
  'could not find the isUnlocking branch in App.jsx — this whole group is blind, fix the match');
check(G14, 'no green while the vault opens', !/emerald|#10b981/i.test(unlockBlock),
  'palette law: slate is the blue and emerald is the green, neither belongs here');
check(G14, 'nothing rotates while the vault opens', !/animate-spin/.test(unlockBlock),
  'lite mode law: nothing rotates');
check(G14, 'no bar pretends to measure work that is not happening', !/fillBar/.test(unlockBlock),
  'the PIN is verified and the write awaited before this renders — a progress bar here is a lie');
check(G14, 'neither unlock path sits on a 2.5s timer', !/setIsUnlocking\(true\)[\s\S]{0,500}?\},\s*2500\s*\)/.test(appCode),
  'the hold must cover the animation, not invent a wait — 2500ms was 1.7s of nothing');
check(G14, 'the unlock animation respects reduced motion', /prefers-reduced-motion[\s\S]{0,300}kpm-unlock/.test(appCode),
  'a motion-sensitive user must be able to opt out of the sweep');

/* The gate is FIVE modes wearing one shell: standard login, first-time setup, recovery, OTP and
   unlock. The checks above read the isUnlocking branch ONLY, so when that branch went gold the
   group passed while first-time setup was still emerald and the whole OTP screen was still blue.
   A guard that watches one of five modes reports a law as kept when it is half-kept. These read
   the entire modal. */
const gateBlock = (appCode.match(/\{showAdminLogin && \(([\s\S]*?)\n {6}\)\}/) || ['', ''])[1];

check(G14, 'all five gate modes are where this group can see them', gateBlock.length > 2000,
  'could not find the showAdminLogin modal in App.jsx — the two checks below are blind, fix the match');
check(G14, 'no green in ANY gate mode, not just the unlock', !/emerald|#10b981/i.test(gateBlock),
  'setup mode was emerald long after the unlock went gold — palette law: no green');
check(G14, 'no blue in ANY gate mode, not just the unlock', !/\bblue-\d/.test(gateBlock),
  'the whole OTP screen was blue-500/blue-400 — palette law: slate is the only blue allowed');

/* ── 15. there is always a way in ──────────────────────────────────────────
   Aldi could not sign in on his phone and his testing stopped dead there: *"i cant even login,
   there is no login button everywhere, i cant choose google account nor entering the password"*.
   Two independent causes, both guarded here. The only SYSTEM LOGIN lived at the bottom of the
   sidebar, and the sidebar starts CLOSED below 1024px — so the way into the app was behind an
   unlabelled orange square in the corner. And the redirect fallback fired on exactly one error
   code while mobile browsers refuse popups under several. */
const G15 = '15. There is always a way in';
const themeSrc = fs.readFileSync('src/components/BiohazardTheme.jsx', 'utf8');

/* STRUCTURAL, not proximity. These two used a 900-character window between the anchor and the
   button, so the 2026-08-13 rebuild of the door failed them by adding a comment — the door was
   never gone. What matters is that the signed-out block CONTAINS a login control and that it
   renders before, and outside, the sidebar element. */
const doorSrc = (() => {
  const s = code(themeSrc);
  const i = s.indexOf('{!user && (');
  return i < 0 ? '' : s.slice(i, i + 3000);
})();
check(G15, 'a signed-out user sees a way in without opening the drawer',
  doorSrc.includes('onClick={onLogin}'),
  'the only login was inside a sidebar that starts closed on a phone');
check(G15, 'that way in is not inside the sidebar',
  /fixed inset-0 z-\[80\]/.test(doorSrc) &&
  code(themeSrc).indexOf('{!user && (') < code(themeSrc).indexOf('data-kpm-rail'),
  'it must render over the app, not in the panel that is hidden on a phone');
/* HIS REPORT, 2026-08-13: *"i dont want to see old UI here"*, pointing at the login screen —
   phone and desktop both. It was the last screen still wearing hand-picked hex and its own
   button shape while Settings had moved onto the control system. */
check(G15, 'the door is built from the control system, not hand-picked hex',
  /kpm-mod/.test(doorSrc) && /kpm-btn key block/.test(doorSrc) &&
  !/#f0e2c0|#6b6157|border-\[#ff9d00\]/.test(doorSrc),
  'this is the first screen anyone sees; if it looks like a different app, the app looks unfinished');
/* HIS CALL, 2026-08-14: *"remove the left sidebar then its old stuff already"* — while signed
   out the door in the middle is the only thing on the screen. The drawer's own System-login
   button went with it, so the old "both buttons wear the same shape" check has nothing left to
   compare. What replaces it is STRONGER: the drawer and its edge ribbon do not render at all
   until there is a user, so the way in cannot be hidden behind either of them.
   Comments are stripped by code(), so this window measures markup only — it cannot be pushed
   open by adding prose, which is what broke the two proximity needles above. */
const railGuardIdx = code(themeSrc).indexOf('data-kpm-rail');
/* TIGHTENED 2026-08-14: the drawer's own guard was `{user && (`, which is why it kept painting
   over the vault gate — see the z-10 stacking-context note in group 16. Both it and the ribbon
   now carry the same pair of conditions. */
check(G15, 'the drawer and its ribbon exist only when signed in AND not behind the gate',
  railGuardIdx > 0 &&
  /\{user && !showAdminLogin && \(/.test(code(themeSrc).slice(Math.max(0, railGuardIdx - 900), railGuardIdx)) &&
  (code(themeSrc).match(/\{user && !showAdminLogin && \(/g) || []).length >= 2 &&
  !/System login/.test(themeSrc),
  'a signed-out screen with a drawer on it is the old UI he asked to have removed — and the ' +
  'drawer login is dead code the moment the drawer cannot render');
/* HIS CALL, 2026-08-14: the sign-in screen and the Master Vault gate are the SAME screen with a
   different middle panel. Reused, not re-drawn — a second copy of the dot field or of the card's
   hex is how the two would drift the next time either is touched. */
check(G15, 'the door stands on the vault gate\'s own dot field',
  /import VaultGate, \{ gateCanvasOn \}/.test(code(themeSrc)) &&
  /gateCanvasOn\(\) && <VaultGate playing=\{false\}/.test(doorSrc),
  'playing={false} keeps the unlock sequence with the vault — here the field only lights under ' +
  'the pointer; gateCanvasOn() is the same Lite-Mode switch the vault uses');
/* theme.css is loaded as `themeCss` further down this file, AFTER group 15 — reaching for it here
   throws "Cannot access before initialization". Read it locally rather than reordering the file. */
const gateCss = fs.readFileSync('src/styles/theme.css', 'utf8');
check(G15, 'the door wears the gate card as a shared class, not a copy of its hex',
  /className="kpm-mod gate/.test(doorSrc) &&
  /\.kpm-mod\.gate \{[^}]*background: rgba\(4, 3, 2, \.9\)/s.test(gateCss) &&
  !/rgba\(4,\s*3,\s*2/.test(doorSrc),
  'the values are his signed-off variation-B ones; duplicating them in JSX is what lets the two ' +
  'locked screens drift');
/* HIS FOLLOW-UP the same night: the middle panel should have *"the same color theme of our panel
   inside vault gate as well, and similar format"*. Colour alone was not it — the module's default
   is a left-aligned head, a 19px display title and a ruled shelf, and the gate's panel is one
   centred mono column with no rules across it.
   🔑 The colours are LITERAL, not tokens, and that is the load-bearing half: this card is
   near-black in BOTH themes, so var(--ink) paints light mode's near-black ink onto it. Until this
   block, the title, the description and the button were invisible for anyone who last left the
   app in light mode. */
check(G15, 'the middle panel wears the gate panel\'s format, not the module default',
  /\.kpm-mod\.gate \{[^}]*text-align: center/s.test(gateCss) &&
  /\.kpm-mod\.gate \.kpm-head h3 \{[^}]*color: #f7e9c8/s.test(gateCss) &&
  /\.kpm-mod\.gate \.kpm-btn\.key \{[^}]*background: transparent/s.test(gateCss),
  'same colours AND same format as the vault gate panel — and a token here would be light ' +
  'mode\'s dark ink on a near-black card, i.e. nothing on the screen at all');

check(G15, 'the locked-out message is not dimmed to half contrast',
  !/opacity-50[\s\S]{0,120}ACCESS/.test(code(themeSrc)),
  'opacity-50 sat on the one message a locked-out user gets');

check(G15, 'no green on the shell a signed-out user is looking at',
  !/emerald/.test(themeSrc),
  'palette law: the SYSTEM LOGIN button used to be emerald');
check(G15, 'a refused popup falls back to redirect on more than one error code',
  /POPUP_FAILED[\s\S]{0,400}?popup-closed-by-user[\s\S]{0,400}?operation-not-supported/.test(appCode),
  'only auth/popup-blocked was handled; mobile refuses popups under several codes');
check(G15, 'the fallback actually redirects', /POPUP_FAILED\.includes\(error\.code\)[\s\S]{0,120}?signInWithRedirect/.test(appCode),
  'the list must be wired to signInWithRedirect, not just declared');

/* ── 16. the vault gate keeps the numbers he signed off ────────────────────
   The gate design took a whole session and closed with "okay i want u to make the wave little
   bit slower and we done bro". Four numbers came out of that, measured on sliders, and the
   sound file is cut to one of them — so a tweak to the wave silently desynchronises the audio
   from the picture with nothing failing. These pin the numbers, the two traps that each cost a
   session in the preview, and the fact that the hold and the animation share one constant. */
const G16 = '16. The vault gate keeps his signed-off numbers';
const gateSrc = fs.readFileSync('src/components/VaultGate.jsx', 'utf8');
/* Scan the CODE, not the prose. Three checks on this project have failed on their own
   explanatory comments, and the last one matched a phrase inside a comment describing the very
   rule it was asserting. */
const gateCode = gateSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

check(G16, 'the wave is still the 3.0s he chose', /T_WAVE_DUR\s*=\s*3\.00/.test(gateCode),
  'vault-b.mp3 is cut to 3.0s — change this and the tok no longer lands on his name');
check(G16, 'background spacing, letter density and name size are his',
  /GAP\s*=\s*26/.test(gateCode) && /DEN\s*=\s*7/.test(gateCode) && /TSIZE\s*=\s*0\.10/.test(gateCode),
  'spacing 26 / density 7 / size 0.10 were measured on the sliders, not chosen');
check(G16, 'ONE CLOCK: the ring is drawn on the canvas with the dots',
  /ctx\.arc\(cx,\s*cy,\s*front/.test(gateCode),
  'a CSS ring and canvas dots cannot be kept in step by hand — that pairing caused two bugs');
check(G16, 'no second animation mechanism for the ring', !/@keyframes[^}]*ring/i.test(gateSrc),
  'the ring must not become a keyframe again');
check(G16, 'a phone can reveal the field without hover', /addEventListener\('pointerdown'/.test(gateCode),
  'no pointerdown = a black rectangle on his phone and no way to find the password box');
check(G16, 'Lite Mode switches the canvas off', /gateCanvasOn[\s\S]{0,160}?lite-mode/.test(gateCode),
  'Lite Mode is the performance switch and a rAF loop is what it exists to stop');
/* Each function's OWN body, not a window of characters around its name — gateIsRich calls
   gateCanvasOn, so a proximity match sees both names next to each other and reports a fault
   that is not there. This is the third time on this project a check has failed on text near
   the code instead of the code. */
const canvasFn = (gateCode.match(/export function gateCanvasOn[\s\S]*?\n\}/) || ['', ''])[0];
const richFn = (gateCode.match(/export function gateIsRich[\s\S]*?\n\}/) || ['', ''])[0];

check(G16, 'reduced motion switches off the SEQUENCE, not the field',
  canvasFn.length > 20 && richFn.length > 20
  && /lite-mode/.test(canvasFn) && !/prefers-reduced-motion/.test(canvasFn)
  && /prefers-reduced-motion/.test(richFn),
  'Aldi has Reduce Motion on in iOS Accessibility. Gating the CANVAS on it removed his whole '
  + 'background and press-and-drag did nothing — the field does not move on its own, so it '
  + 'stays; only the 8.5s wave is motion');
check(G16, 'App mounts the field on the canvas rule, not the motion rule',
  /\{gateCanvasOn\(\) && \(\s*<VaultGate/.test(appCode)
  && /playing=\{isUnlocking && gateIsRich\(\)\}/.test(appCode),
  'mounting on gateIsRich() is what hid the background from him');
check(G16, 'the hold and the animation share one number',
  /export const GATE_UNLOCK_MS\s*=\s*OUT\s*\+/.test(gateCode),
  'a literal in App.jsx would drift from the animation the first time either moved');
check(G16, 'both unlock paths use that number, not a literal',
  (appCode.match(/setIsUnlocking\(true\)[\s\S]{0,400}?gateHoldMs\(\)/g) || []).length === 2,
  'PIN and biometric must both hold for the gate, or one of them cuts his name off mid-air');
check(G16, 'the gate sound is registered and points at the retimed file',
  /vaultb:\s*'\/sounds\/vault-b\.mp3'/.test(fs.readFileSync('src/hooks/useSound.js', 'utf8')),
  'vault.mp3 is the OLD cut and does not fit the 3.0s wave');
check(G16, 'the sound actually reaches the built bundle', /vault-b\.mp3/.test(allJs),
  'registering it in source proves nothing if the bundle never references it');
check(G16, 'App renders the gate behind the card', /<VaultGate\b/.test(appCode),
  'the component existing is not the same as it being mounted');
check(G16, 'the scramble letters keep a fixed cell, so spaces survive',
  /minWidth\s*=\s*'0\.62em'/.test(gateCode),
  'these spans are flex items — a lone space collapses to zero and "Welcome back" renders as '
  + 'WELCOMEBACK, which is exactly what he saw');
/* The master password must NEVER be readable on screen. The no-flash trick needs a text input,
   and a text input with no working CSS mask is plaintext — so the swap is feature-detected and
   these two checks exist to keep it that way. */
check(G16, 'the password field only becomes a text input where the mask works',
  /type=\{CAN_MASK_TEXT_INPUT \? 'text' : 'password'\}/.test(appCode)
  && /CSS\.supports\('-webkit-text-security', 'disc'\)/.test(appCode),
  'an unconditional text input renders his master password as readable plaintext');
check(G16, 'that field is kept away from autofill and spellcheck',
  /autoComplete="off"[\s\S]{0,200}?spellCheck=\{false\}/.test(appCode),
  'a text input is offered to autofill and spellcheck services; a password input is not');
check(G16, 'the mascot stays out of the login screen',
  /\{user && !showAdminLogin && \(\s*<CapybaraMascot/.test(appCode),
  'he saw the capybara standing beside the vault gate on his phone, telling him to run a backup '
  + 'he could not reach — the mascot belongs to the app, not to the door');
check(G16, 'the second line names the app, not the vault screen',
  /'KPM App access unlocked'/.test(gateCode) && !/'Master Vault unlocked'/.test(gateCode),
  'his wording: "master vault sentence should be KPM APP instead so kpm app access unlocked"');

/* Three things Aldi caught by looking at the running gate, which no check had been watching. */
/* Asserts it is NOT RENDERED, not merely class-hidden. The class version was measured live in
   the dev server with `hidden` on the element and computed display still `flex` — Tailwind
   generates on demand and the dev stylesheet had not caught up. The production CSS does carry
   `.hidden{display:none}`, so a class-hide would pass a build check and still be visible to him
   while developing. Not rendering it cannot fail that way, and it leaves the tab order too. */
/* The `user &&` in front is the 2026-08-14 addition — the ribbon also stays away while signed
   out, because there is no navigation to open then. Optional in the needle so this check keeps
   testing its own thing (the GATE hides it) rather than doubling as a test of that. */
check(G16, 'the nav button is not rendered at all while the gate is up',
  /\{(?:user && )?!showAdminLogin && \(/.test(strip(themeSrc)),
  'it sits in its own stacking context, so raising the gate z-index does NOT cover it, and a '
  + 'class-based hide is only as reliable as the stylesheet that happens to be loaded');
check(G16, 'App hands the theme the flag that hides it', /showAdminLogin=\{showAdminLogin\}/.test(appCode),
  'hiding it in the theme does nothing if the prop never arrives');
/* ⚠️ THE GATE CAN NEVER COVER THE NAVIGATION PANEL BY Z-INDEX, and raising its number is exactly
   the fix that will be reached for. The gate is rendered as a CHILD of <BiohazardTheme>, so it
   lands inside the content div — and that div is `relative z-10`, a STACKING CONTEXT. Every
   z-index within it, `z-[9999]` included, is resolved against its own siblings and then the whole
   context is stamped at 10. The panel is a sibling of that div at `z-[90]`, so 90 beats 10 and a
   menu paints over a full-screen lock screen. He reported it twice before the reason was found.
   The panel steps aside instead. If the content div ever stops being a stacking context, come
   back and re-read this check — do not delete it. */
check(G16, 'the navigation steps aside for the gate, because it can never be covered by it',
  (strip(themeSrc).match(/!showAdminLogin && \(/g) || []).length >= 2 &&
  /print-reset relative z-10 flex-1/.test(strip(themeSrc)),
  'the edge ribbon and the panel itself both need the guard — one without the other still leaves ' +
  'a control drawn over the lock screen');
check(G16, 'the gate backdrop is solid black', /z-\[9999\] bg-black flex/.test(appCode),
  'at bg-black/95 the app behind bleeds through as ghost text and competes with the dot field');
check(G16, 'the everyday login is the preview card, not the red alarm one',
  /Open the vault/.test(appCode) && !/bg-red-900\/20 hover:bg-red-900\/60/.test(appCode),
  'the red slab and ACCESS VAULT are the old panel he asked to be replaced');

/* ── 17. the offline badge tells the truth ─────────────────────────────────
   His report: "last time flight recorder will changed into red cloud logo but now its doesnt
   show it, instead it just stays green". `navigator.onLine` answers "is there an interface",
   not "can I reach anything" — his PC has a virtual WSL adapter, so the flag stays true with
   the wifi off. With the badge lying, he has no signal that work is being queued instead of
   saved, which is worse than a wrong colour. Each check below pins one thing that would
   silently restore the lie. */
const G17 = '17. The offline badge tells the truth';
const offlineSrc = strip(fs.readFileSync('src/hooks/useOfflineEngine.js', 'utf8'));

check(G17, 'there is a real reachability probe, not just the browser flag',
  /fetch\(REACHABILITY_URL/.test(offlineSrc),
  'navigator.onLine alone is what made the badge stay green with the wifi off');
check(G17, 'the probe does NOT ask this app, which a service worker could answer',
  /REACHABILITY_URL\s*=\s*'https:\/\//.test(offlineSrc)
  && !/REACHABILITY_URL\s*=\s*'\//.test(offlineSrc),
  'this is a PWA — a same-origin probe gets served from the precache with the wifi off and '
  + 'proves nothing');
check(G17, 'the probe cannot hang the badge forever', /AbortController/.test(offlineSrc)
  && /PROBE_TIMEOUT_MS/.test(offlineSrc),
  'a request that never settles leaves the badge on its last value indefinitely');
check(G17, 'something re-checks on a heartbeat', /setInterval\(probe, PROBE_EVERY_MS\)/.test(offlineSrc),
  'with the flag lying there is no offline event coming — nothing else would ever notice');
check(G17, 'a browser saying OFFLINE is still believed at once',
  /navigator\.onLine === false\) return false/.test(offlineSrc),
  'the flag lies by saying yes, never by saying no — trusting the no keeps it instant');
check(G17, 'the heartbeat is stopped on unmount',
  /clearInterval\(heartbeat\)/.test(offlineSrc),
  'a probe outliving the component keeps hitting the network for nothing');

/* ── 18. typing a store's name picks it — safely ───────────────────────────
   H2a, his words: "if i dont press anything from the dropdown then the stores wont be selected
   and it will just focused on that namebar". Selection required a click, so a fully typed name
   left no store chosen and the rail fell back to the default dashboard. */
const G18 = '18. Typing a store name selects it, without picking the wrong shop';
const termSrc = strip(src);

check(G18, 'a typed name can select a store at all',
  /const exact = customers\.filter/.test(termSrc),
  'without this, typing the whole name still leaves no store chosen');
check(G18, 'ONLY when exactly one store matches',
  /exact\.length === 1/.test(termSrc) && !/exact\[0\]\s*\)/.test(termSrc.replace(/exact\.length === 1\) handleCustomerSelect\(exact\[0\]\)/, '')),
  'he has three shops named "warung sembako sumber rejeki" 14.5km apart — auto-picking the '
  + 'first would bill the wrong one, which is real money and cannot be spotted afterwards');
check(G18, 'it goes through the same handler the dropdown uses',
  /exact\.length === 1\) handleCustomerSelect\(/.test(termSrc),
  'a second selection path that skips the tier mapping, territory bar or telemetry ping is '
  + 'exactly how the pricingTier bug got in');
check(G18, 'an empty or whitespace-only name never selects anything',
  /const needle = typed\.trim\(\)\.toLowerCase\(\);\s*if \(needle\)/.test(termSrc),
  'pressing space in an empty field must not match a store');

/* ── 19. the vault gate can never fail in silence ──────────────────────────
   2026-08-10. Aldi, on his phone: "i press open vault from my phone and its not doing anything,
   doesnt let me enter but no notification just nothing". Three exits in handlePinLogin reported
   nothing: an empty box, a missing settings doc, and the catch — which only did console.error,
   on a device where he cannot open a console.

   The catch was hiding the actual bug the whole time. `crypto.subtle` does not exist outside a
   SECURE CONTEXT, so hashing threw on his phone at http://192.168.1.141 and nothing happened.
   Months of "I can't log in on my phone" was this, invisible.

   This is the app's oldest disease — 58 confirms, 11 prompts and 184 alerts were replaced for
   the same reason — and it was still alive on the one screen every session starts at. */
const G19 = '19. The vault gate can never fail in silence';
const pinLogin = (appCode.match(/const handlePinLogin = async \(\) => \{([\s\S]*?)\n {2}\};/) || ['', ''])[1];

check(G19, 'the login handler is where this group can see it', pinLogin.length > 400,
  'could not find handlePinLogin — every check below is blind, fix the match');
check(G19, 'an empty password says so', /notify\("Type your master password first\."\)/.test(pinLogin),
  'a shake is not a report, and on a phone he may not even see it');
check(G19, 'a missing security profile says so', /!adminSnap\.exists\(\)\) \{[\s\S]{0,120}?notify\(/.test(pinLogin),
  'this was a bare return — the most invisible failure in the app');
check(G19, 'the catch reports to the SCREEN, not only the console',
  /catch \(error\) \{[\s\S]{0,900}?notify\(/.test(pinLogin),
  'console.error alone is invisible on a phone, and that is where he uses it');
check(G19, 'no bare `return;` is left in the handler',
  !/\n\s+return;\s*\n/.test(pinLogin.replace(/notify\([\s\S]*?\);\s*\n\s+return;/g, '')),
  'every exit must leave something on screen — silence is the bug being fixed');
check(G19, 'hashing refuses loudly outside a secure context',
  /if \(!globalThis\.crypto\?\.subtle\) throw new Error\('SECURE_CONTEXT_REQUIRED'\)/.test(appCode),
  'crypto.subtle is undefined over plain http, and the raw TypeError explains nothing to him');
check(G19, 'that case is translated into something he can act on',
  /SECURE_CONTEXT_REQUIRED[\s\S]{0,400}?https:\/\/ or localhost/.test(appCode),
  'telling him "undefined is not an object" is not a report');

/* ── 20. the terminal writes into the vault it read from ─────────────────────
   His G5 report was "no IOU banner". The banner was never missing: the terminal wrote the IOU
   to users/<salesmanUid>/customers and read the list from users/<bossUid>/customers, so the
   pendingIOUs it looked for could not exist. New outlets went to the same wrong place.
   Invisible on the boss's own account, where the two ids are the same value. */
const G20 = '20. The terminal writes into the vault it read from';
const merchSrc = fs.readFileSync('src/MerchantSalesView.jsx', 'utf8');

check(G20, 'App hands the terminal the same owner id it uses everywhere else',
  /masterUserId=\{userId\}/.test(appCode) && /const userId = bossUid \|\|/.test(appCode),
  'without masterUserId the terminal cannot know whose vault the customers came from');
check(G20, 'the terminal takes the owner id instead of re-deriving one',
  /const dataOwnerId = masterUserId \|\|/.test(merchSrc),
  'a locally derived id omits bossUid, which is the whole bug');
check(G20, 'no customer path is built from a re-derived id',
  !/const userId = user\?\.uid/.test(merchSrc),
  'every customers/ write in this file must resolve through dataOwnerId');
/* The three masterUid derivations are DELIBERATELY still local — products, motorists, samplings,
   photos and notifications are a separate question with a far larger blast radius. This check
   exists so that staying is a decision, and a future change to them is a visible one. */
check(G20, 'the product/motorist paths were left alone on purpose',
  (merchSrc.match(/const masterUid = user\?\.uid/g) || []).length === 3,
  'if these changed, the sale-commit blast radius changed with them — that needs Aldi, not a refactor');

/* ── 21. the admin field-mode bar stays behind the manifest ──────────────────
   His G5 report: "mastervault and bosscar button ... is collapsing infront of the manifest
   paper". The bar is an ordinary flex child above the terminal and needed no stacking order at
   all; z-[200] let it punch through a drawer that is fixed to the viewport and opens to 92% of
   the screen. Raising the drawer instead would repeat the vault gate's nav-button mistake. */
const G21 = '21. The stock-source switch lives inside the terminal, not the shell';
/* Anchored on real code, never on a comment: `appCode` is strip()ed, so the explanation above
   this bar in App.jsx does not exist by the time this runs. That cost two build cycles to learn.
   The window starts at the bar's own background colour, so the wrapper's class list — where the
   z-index used to be — is inside what gets tested. */
const adminBar = (termSrc.match(/onAdminSalesMode\('VAULT'\)[\s\S]{0,900}?Boss Car<\/button>/) || [''])[0];

check(G21, 'the field-mode toggle is present to check at all', adminBar.length > 300,
  'could not find the stock-source toggle in MerchantSalesView.jsx — this group is blind, fix the match');
/* THE FIX THAT DELETING z-[200] DID NOT MAKE. Twice he reported this bar drawing on top of the
   manifest paper, and twice the answer was assumed to be a stacking number. It was not: the bar
   lived in App's shell, ABOVE the terminal, while the manifest drawer is fixed to the viewport
   and opens across that same band — two subtrees under different positioned ancestors, with no
   z-index either of them states deciding which wins. Nothing in the shell may sit above the
   terminal on the sales tab; put a control there again and this check goes red. */
check(G21, 'App renders no stock-source bar of its own above the terminal',
  !/Boss Car<\/button>/.test(appCode) && !/setAdminSalesMode\('VEHICLE'\)/.test(appCode),
  'a shell row above the terminal shares a band with a viewport-fixed drawer — one of them always loses');
check(G21, 'the toggle is gated on the prop App hands only to the boss',
  /onAdminSalesMode=\{userRole === 'ADMIN' \? setAdminSalesMode : undefined\}/.test(appCode) &&
  /\{onAdminSalesMode && \(/.test(termSrc),
  'absent prop, absent switch — this is the same test that used to gate the bar in App');
check(G21, 'the toggle claims no stacking order of its own', !/z-\[\d+\]/.test(adminBar),
  'it is a plain row of the wares column now; a z-index means someone is fighting the drawer again');
check(G21, 'no blue on the field-mode toggle', !/blue-|slate-/.test(adminBar),
  'palette law: Boss Car was bg-blue-600 and both rest states were text-slate-400 — slate IS the blue');

/* ── 22. the customer picker is one bar at the top, and there is only one of it ──
   His call: "what if we put the customer on top instead just near the strip?" The picker left
   the manifest paper and became a 44px bar pinned above the grip. Two traps, both of which have
   already bitten this file once: a SECOND copy of the block (two `customerName` inputs, two
   `id="bypassPhotoCapture"` — the reason renderManifestUI takes a hardcoded `true`), and the
   three numbers that have to agree or the bar is hidden behind the wares list. */
const G22 = '22. The customer picker is one bar at the top of the column';
const custInputs = (termSrc.match(/onChange=\{handleManualCustomerType\}/g) || []).length;
const custLists  = (termSrc.match(/suggestedCustomers\.map/g) || []).length;

check(G22, 'exactly ONE customer input exists', custInputs === 1,
  `found ${custInputs} — a second copy means two inputs fighting over one customerName`);
check(G22, 'exactly ONE suggestion dropdown exists', custLists === 1,
  `found ${custLists} — the list moved to the bar, the paper's copy must be gone`);
/* The paper used to carry a dead label telling you to go and use the bar at the top — a sign,
   not a control. His ask: "the customer box inside the manifest paper should also be use to
   choose customer". It opens the SAME picker now. The one-input invariant is untouched, and that
   is the thing to keep checking: the only `customerName` input in this file lives in the picker
   sheet, and both openers are buttons. Add an input here and there are two fields fighting over
   one piece of state — which is the bug this group was written for. */
check(G22, 'the paper opens the same picker instead of telling you to go elsewhere',
  /Tap to choose the customer/.test(termSrc) &&
  !/Name the customer in the bar at the top/.test(termSrc) &&
  (termSrc.match(/onClick=\{\(\) => setShowCustomerDropdown\(true\)\}/g) || []).length >= 2,
  'a manifest with no name on it is wrong, so the paper still states who the deal is with — ' +
  'but stating it and being unable to change it is what he reported');
check(G22, 'the bar is rendered above the grip, not inside the paper',
  termSrc.indexOf('renderCustomerBar()') > 0 &&
  termSrc.indexOf('renderCustomerBar()') < termSrc.indexOf('startDrawerDrag}'),
  'below the grip it is inside the collapsed-away region and is not "on top" of anything');
/* The list used to be a strip that opened up or down depending on how far the drawer was
   dragged, and it opened directly over the 12px field you were typing into. His report:
   "too small and sempit". It is a sheet now, so there is no direction to get wrong. */
check(G22, 'the picker escapes this subtree through a portal',
  /createPortal\(/.test(termSrc) && /document\.body\s*\n?\s*\)\}/.test(termSrc),
  'it is the one overlay that must out-rank the app header; a portal settles that without ' +
  'asking any positioned ancestor in the terminal for permission');
/* iOS zooms the whole page into any focused input under 16px. text-base IS 16px. Drop below it
   and the page scales on focus — which is half of what "not satisfying" meant. */
check(G22, 'the picker field is 16px so iOS cannot zoom the page on focus',
  /placeholder="Type the shop name"[\s\S]{0,400}?text-base/.test(termSrc),
  'text-xs/text-sm here re-introduces the focus zoom that made typing a customer feel broken');
check(G22, 'both halves of the picker are inside the click-outside sanctuary',
  /manifest-dropdown-area hide-on-print shrink-0 h-\[52px\]/.test(termSrc) &&
  /manifest-dropdown-area hide-on-print fixed inset-0/.test(termSrc),
  'the document listener closes the picker for clicks outside .manifest-dropdown-area — ' +
  'drop it from the strip and tapping the strip opens and shuts the sheet in the same tick; ' +
  'drop it from the sheet and typing in the sheet closes it');
check(G22, 'closed height, initial height and wares padding all say 104',
  /const DRAWER_CLOSED = 104;/.test(termSrc) &&
  /useState\(104\)/.test(termSrc) &&
  /pb-\[104px\]/.test(termSrc),
  '104 = 52 grip + 52 bar; if these three disagree the bar is covered or a dead gap appears');
/* Two of his reports, and they only look like opposites: "the notification bell button is
   collapsing infront of the manifest paper", then "i can pull the manifest panel until the top
   of the app, so that the whole screen is full of manifest panel". The sheet goes all the way
   up AND nothing draws on it, because the header is faded out while the sheet is in its band
   rather than fought with for a z-index neither of them states. Both halves are checked: a
   sheet that cannot reach the top fails the first line, a class that is never set fails the
   rest, and the CSS that acts on it is asserted in its own file. */
check(G22, 'the sheet can be pulled to the full height of the screen',
  /const drawerMax = \(\) => window\.innerHeight;/.test(termSrc) &&
  !/innerHeight \* 0\.92/.test(termSrc),
  'his ask was the whole screen — any cap here silently takes it back');
check(G22, 'the header is told to stand down while the sheet is in its band',
  /const DRAWER_TOP_GAP = 84;/.test(termSrc) &&
  /classList\.toggle\('kpm-sheet-over-header', covering\)/.test(termSrc) &&
  /root\.classList\.remove\('kpm-sheet-over-header'\)/.test(termSrc),
  'without the class the bell is back on the paper; without the cleanup, leaving the tab ' +
  'mid-drag strands the app with no header at all');
const themeCss = fs.readFileSync('src/styles/theme.css', 'utf8');
check(G22, 'the rule that acts on that class exists in theme.css',
  /html\.kpm-sheet-over-header \.kpm-topbar \{[^}]*opacity: 0/.test(themeCss) &&
  /html\.kpm-sheet-over-header \.kpm-topbar \{[^}]*pointer-events: none/.test(themeCss),
  'the class is set by JS and does nothing on its own — pointer-events matters as much as ' +
  'opacity, or an invisible bell is still pressable through the paper');

/* ── 23. registering an outlet hands the screen back ─────────────────────────
   His G6 report: "it freeze my phone for a while tho maybe add some conveniency after we register
   new NOO, like close the manifest paper for example". Both NOO paths now collapse the drawer.
   This is only safe BECAUSE the customer bar lives inside the collapsed 96px — collapsing the
   drawer while the picker was still buried in the paper would hide the name he just registered,
   which is the "every action must report" law failing in a new place. Group 22 guards that. */
const G23 = '23. Registering an outlet hands the screen back to the wares';
const nooCollapses = (termSrc.match(/setDrawerH\(DRAWER_CLOSED\)/g) || []).length;

check(G23, 'both NOO paths collapse the manifest', nooCollapses === 2,
  `found ${nooCollapses} setDrawerH(DRAWER_CLOSED) calls, expected 2 — register-and-sell and register-only`);
check(G23, 'register-and-sell collapses AFTER the customer is selected',
  termSrc.indexOf('setSelectedCustomerInfo(newStoreData)') <
  termSrc.indexOf('setDrawerH(DRAWER_CLOSED)'),
  'collapsing before the selection lands would close the paper on a screen with no customer named');

/* ── 24. the customer listener does not rebuild 100 outlets per write ────────
   His G6 freeze, narrowed by his own answer: "freeze after just after the NOO is successful, it
   go back to the manifest paper right and it freeze there". Every outlet carries its store photo
   as base64 inside the document, and the listener re-ran `d.data()` over all ~100 of them on
   every single write. Only the customers listener changed — the rest carry small documents and
   are not worth the extra moving part, so this group pins that boundary too. */
const G24 = '24. The customer listener updates incrementally';
const syncSrc = strip(fs.readFileSync('src/hooks/useDatabaseSync.js', 'utf8'));

check(G24, 'the customers listener applies docChanges', /applyDocChanges\(prev, snap\.docChanges\(\)\)/.test(syncSrc),
  'without this every write re-materialises every outlet, base64 store photo and all');
check(G24, 'the first snapshot of a subscription is still a full re-map', /custFirst/.test(syncSrc),
  'a new subscription reports every doc as `added`; applied on top of the previous tenant it ' +
  'splices one company\'s outlets into another\'s');
check(G24, 'only the customers listener was changed',
  (syncSrc.match(/applyDocChanges\(/g) || []).length === 1 &&   // the import has no paren
  /setInventory\(snap\.docs\.map/.test(syncSrc) && /setMotorists\(snap\.docs\.map/.test(syncSrc),
  'inventory and motorists documents are small — converting them adds risk and buys nothing');
check(G24, 'the reducer has its own runnable proof',
  fs.existsSync('src/utils/docChanges.selfcheck.mjs'),
  'a silent drift here is a duplicated or missing outlet with nothing on screen to announce it');

/* ── 25. the phone's way into the navigation is an edge ribbon ──────────────
   His brief: "replace the side panel button into smaller size that is dragable from the side
   but not really visible from the side, the idea is like samsung edge panel ... when we pull it
   what showing instead is this kind of logo with brief info of what we hovering at".

   Three of these checks are scars, not preferences. Each one names something that made the
   gesture do NOTHING while looking perfectly correct in the source. */
const G25 = '25. The phone opens the navigation from the edge';
const shellSrc = strip(fs.readFileSync('src/components/BiohazardTheme.jsx', 'utf8'));

/* "the 3 lines sidebar button is still exist make sure u delete it" — deleted at EVERY width,
   not hidden on one. The ribbon is the only way in on a phone; on a desk the panel is in the
   flow and always open, so there was never anything to dismiss. */
check(G25, 'the three-line square is gone at every width',
  !/fixed top-3 left-3/.test(shellSrc) && !/<Menu\b/.test(shellSrc) && !/\bMenu,/.test(shellSrc),
  'he asked for it deleted, not hidden — and an unused Menu import is how it creeps back');
check(G25, 'the ribbon can be moved to wherever his thumb is, and stays there',
  /localStorage\.setItem\('kpm-ribbon-y'/.test(shellSrc) &&
  /d\.axis = Math\.abs\(dy\) > Math\.abs\(dx\) \? 'y' : 'x'/.test(shellSrc) &&
  /top: ribbonY, '--hold-ms'/.test(shellSrc),
  'his words: "our thumb usually position differently when using phone" — the axis must be ' +
  'decided ONCE per gesture or a diagonal thumb-swipe stutters between moving and opening');
/* HIS SECOND REPORT ON THE SAME CONTROL: "sidebar hold button is too easy to be moved, there
   should be like 3 second press and hold to move it instead". Moving is rare and deliberate;
   opening is the everyday act. So a vertical drag that has NOT earned the hold must do nothing
   at all — not move the ribbon, and not open the panel either. Drop the `d.armed` gate and a
   slanted thumb reaching for the menu drags the ribbon again, which is the whole bug. */
check(G25, 'moving the ribbon costs a three-second hold',
  /const RIBBON_HOLD_MS = 3000;/.test(shellSrc) &&
  /if \(pullRef\.current\) pullRef\.current\.armed = true;/.test(shellSrc) &&
  /if \(d\.armed\) \{/.test(shellSrc) &&
  /if \(d\.axis === 'y'\) return;/.test(shellSrc) &&
  /cancelHold\(\);\s*\n\s*setRibbonHold\(null\);/.test(shellSrc),
  'a travelling finger must cancel the hold, and an un-armed vertical drag must be inert');
check(G25, 'the hold is visible while it is being counted',
  /animation: kpmEdgeArm var\(--hold-ms, 3000ms\)/.test(themeCss) &&
  /\.kpm-edge-ribbon\.armed \.kpm-edge-grip/.test(themeCss),
  'his ask: "when we hold it, the sidebar button will become a little bit bigger so we know ' +
  'that we holding it" — the swell is the only signal that a 3s hold has landed, so it must ' +
  'survive lite mode and reduced motion, which is why those selectors are more specific');
/* "instead of 1 line of sidebar i want it to be 2 colomn per row, to eliminate scrolling
   because there is so many features, especially for higher tier" */
/* And from 2026-08-14 the DESK is one column of marks in an 88px strip, always visible — his
   call, with a reference component: "i want u to change the sidebar for pc to be like this, so it
   doesnt take so much space", plus "the sidebar u pull here is the sidebar for phone only dont use
   it on PC". So the ribbon is `lg:hidden` again, the panel carries no `lg:` open/closed variants,
   and no width at either size may bring back a scrollbar. */
/* ⚠️ REWRITTEN 2026-08-14 after a browser measurement. The old needle asserted the SOURCE STRING
   `w-[176px] lg:w-[144px]` was present — and it was, and the desk still resolved to 176px, the
   phone's width. A class being in the file says nothing about whether it wins the cascade, so the
   144px that was meant to stop the logout button being clipped never once applied on a desk.
   The width classes are gone; theme.css owns this property at every size, and RAIL_W (the drag
   maths, the name-plate offset) must equal the phone number it declares. */
check(G25, 'one owner for the panel width, and RAIL_W agrees with it',
  /const RAIL_W = 176;/.test(shellSrc) &&
  !/w-\[176px\]/.test(shellSrc) && !/lg:w-\[144px\]/.test(shellSrc) &&
  /\[data-kpm-rail\] \{ width: 176px; \}/.test(themeCss) &&
  /\[data-kpm-rail\] \{ width: 144px; \}/.test(themeCss) &&
  /grid grid-cols-2 gap-2 p-2 auto-rows-\[minmax\(0,1fr\)\]/.test(shellSrc) &&
  !/lg:overflow-y-auto/.test(shellSrc),
  'a width class on the element and a width rule in the stylesheet fighting over the same ' +
  'property is how a fix ships, passes its check, and never takes effect');
/* 🔴 THE BUG THAT HID EVERY DESK LABEL, 2026-08-14. `.kpm-rail-grid` carried `overflow-hidden`,
   and the hover label is a CHILD of the mark — so the grid clipped the label out of existence and
   the desk name plate had NEVER been visible, in the app or in the prototype. His report:
   *"sc2 is a prove that i cant see the hover text animation"*. The music and logout labels DID
   show, because the foot does not clip; that split is the fingerprint.
   The rows are `minmax(0,1fr)` and cannot overflow, so the clip guarded nothing.
   ⚠️ MEASUREMENT WILL NOT CATCH THIS. getBoundingClientRect reports layout position and knows
   nothing about an ancestor clipping you — it reported the label as perfectly placed while the
   label was invisible. This check exists because the browser could not be asked. */
check(G25, 'the nav grid does not clip the hover label out of existence',
  !/kpm-rail-grid[^`"]*overflow-hidden/.test(shellSrc),
  'the label lives INSIDE the mark, so any overflow clip on the grid erases it — and the ' +
  'symptom is not a broken label, it is no label at all, which reads as "the feature was never ' +
  'built" rather than as a bug');
check(G25, 'the hover label is positioned against the mark rule that would otherwise beat it',
  /\.kpm-rail-mark > \.kpm-rail-word \{\s*display: block; position: absolute;/.test(themeCss),
  '`.kpm-rail-mark > *` sets position: relative to lift the icon over its plate. At equal ' +
  'specificity it wins on order, and a RELATIVE label is a flex child: it lands inside the ' +
  'capsule and pushes the icon off centre. Measured in a browser, not reasoned about');
check(G25, 'the desk strip is always there and is never pulled open',
  /\$\{isMobileMenuOpen \? 'translate-x-0' : 'translate-x-full'\}/.test(shellSrc) &&
  /lg:relative lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto/.test(shellSrc) &&
  /kpm-edge-ribbon[^"]*lg:hidden/.test(shellSrc),
  'the pull gesture is the phone\'s; on a desk the strip is in the flow and opening it is not a ' +
  'thing you can do, so isMobileMenuOpen must not carry any lg: variant');
check(G25, 'the desk wears the same mark as the phone, not a white slab',
  !/lg:bg-white/.test(shellSrc) && !/lg:text-gray-500/.test(shellSrc) &&
  !/rounded-xl/.test(shellSrc),
  'the active tab was a white slab with a white glow and the unlock button a hand-rolled gold ' +
  'rounded slab — that pair is why his PC screenshot read as a different app');
/* 🎥 THE DESK CAPSULE — his video is the spec, 2026-08-14: "a sidebar that shrink in to 1 button
   big and when it hover it opens all the way to show all the button ... i want background for the
   sidebar to be transparant but blurred". Three states: one circle, then a full-height capsule,
   then the hovered mark's name printed on the app's own ground beside it.
   🔑 IT RESERVES NOTHING. His call, 2026-08-14 — *"the sidebar have it own space but it just
   blank while its closed"* — and the component's own instruction, *"set it to Fixed, and pin to
   your chosen edge"*. `position: fixed` takes it out of the flow, so the app keeps its full
   width and the dock floats. That retired an earlier `margin-right: -228px` trick whose only job
   was to hand back the column this no longer takes; if `position` ever goes back to relative,
   that trick has to come back with it or every hover will shove the app sideways.
   The pointer-events pair is load-bearing now, not a nicety: a fixed panel over the content with
   pointer events at rest would swallow every click down the left edge of every screen. */
const railGateAt = themeCss.search(/@media \(min-width: 1024px\) and \(hover: hover\) and \(pointer: fine\) \{[\s\S]{0,2400}?\[data-kpm-rail\]\[data-kpm-rail\] \{\s*position: fixed/);
check(G25, 'the desk rail collapses to one circle, and opening it moves nothing',
  /\.kpm-rail-pod \{ display: contents; \}/.test(themeCss) &&
  /position: fixed; left: 0; right: auto; top: 0; bottom: 0;\s*\n\s*width: 64px; margin-right: 0;/.test(themeCss) &&
  !/margin-right: -228px;/.test(themeCss) &&
  /\[data-kpm-rail\]\[data-kpm-rail\] \{ pointer-events: none; \}/.test(themeCss) &&
  /* right: 40px, not 4px — the pod went to 100px for the two columns, and 100 - 4 - 56 = 40 is
     what keeps the CLOSED capsule the same 56px circle in the same corner he signed off. Only
     the right edge and the height animate; the left edge never moves. */
  /\.kpm-rail-pod::before \{ left: 4px; right: 40px; top: 12px; height: 56px; border-radius: 999px; \}/.test(themeCss) &&
  /\.kpm-rail-totem \{[\s\S]{0,200}?top: 12px; left: 4px;/.test(themeCss) &&
  /\.kpm-topbar \{ padding-left: 76px; \}/.test(themeCss) &&
  /:focus-within \{ width: 351px/.test(themeCss) &&
  /\[data-kpm-rail\] \.kpm-rail-pod > \* \{ animation: none; \}/.test(themeCss) &&
  /<div className="kpm-rail-pod">/.test(shellSrc) &&
  /<span className="kpm-rail-totem"/.test(shellSrc),
  'the pod is `display: contents` on a phone, so none of this reaches the layout he already ' +
  'signed off; and :focus-within is not optional — at rest every mark is invisible but tabbable');
/* ⚠️ THE INVISIBLE-PANEL TRAP, SECOND SHAPE. The rail stopped painting its own background when
   the pod took over, so anything that hides the pod's surface hides the whole sidebar. The way
   that happens is putting the appearance behind the hover gate — a touch laptop matches `lg:`
   but not `hover: hover`, and would get nothing at all.
   🔵 THE BLUR IS BACK, and so is the second half of this trap. His call, 2026-08-14, after
   dragging a tint slider himself: *"i want the sidebar background to be more transparant than
   this, as transparan like apple liquid glass theme uknow"* — he landed on **0.02**. This
   REVERSES the "solid surface" note that used to sit here, which came off the Framer spec sheet;
   he has since looked at the real thing and chosen, and his eye on his own app outranks a
   component vendor's default.
   ⚠️ AT 0.02 THE LITE MODE FALLBACK IS NOT OPTIONAL. Lite Mode strips backdrop-filter — that is
   what Lite Mode is FOR — and a 2%-tinted capsule with no blur is a sidebar you cannot see. Both
   halves are asserted here so neither can ship without the other. */
check(G25, 'the capsule paints on a hoverless desk, in Lite Mode, and in a browser without blur',
  railGateAt > 0 &&
  /backdrop-filter: blur\(30px\) saturate\(1\.9\) brightness\(1\.06\)/.test(themeCss.slice(0, railGateAt)) &&
  /html\.lite-mode \.kpm-rail-pod::before \{[\s\S]{0,220}?backdrop-filter: none/.test(themeCss) &&
  /html\.lite-mode \.kpm-rail-pod::before \{\s*\n?\s*background-color: #14110e/.test(themeCss) &&
  /@supports not \(\(backdrop-filter: blur\(1px\)\)[\s\S]{0,220}?background-color: #14110e/.test(themeCss) &&
  !/lg:bg-black\/95/.test(shellSrc),
  'the panel itself paints nothing, so the pod IS the sidebar — leave the appearance behind the ' +
  'hover gate and a touch laptop gets nothing; leave out the Lite Mode ground and Lite Mode ' +
  'users get nothing');
/* HIS REPORT: "i press and drag but it only show the first button that i press, it didnt show
   anything else when i drag". On touch the browser gives the pointerdown target IMPLICIT POINTER
   CAPTURE, so every later move for that finger is delivered to the button first pressed — no
   matter what the finger is over. Per-button pointer handlers are deaf by design after the first
   one, and a phone has no :hover to fall back on. One listener, and ask the document what is
   under the finger. Put the handlers back on the buttons and this goes red. */
check(G25, 'the mark under a dragging finger is found by hit-test, not by per-button events',
  /document\.elementFromPoint\(x, y\)/.test(shellSrc) &&
  /onPointerMove=\{\(e\) => \{ if \(scrubRef\.current\) scrubTo\(e\); \}\}/.test(shellSrc) &&
  /data-mark=\{item\.id\}/.test(shellSrc) &&
  !/onPointerDown=\{\(e\) => setPeek\(\{ id: item\.id/.test(shellSrc),
  'implicit pointer capture means the second mark you slide onto never hears a single event');
check(G25, 'the click that follows a slid-to pick is swallowed',
  /swallowedByScrub\(\)/.test(shellSrc) && /s\.ghost = Date\.now\(\) \+ 120/.test(shellSrc),
  'the browser still fires click on the mark you PRESSED, so without the ghost window a drag ' +
  'to a different tab lands on the one you started from');
/* "we dont need that mascott profile anymore" */
check(G25, 'the face is the agent\'s own, not a mascot or a robot',
  !/mascotImage/.test(shellSrc) && !/dicebear/.test(shellSrc) &&
  /agentPhoto \|\| user\?\.photoURL/.test(shellSrc) &&
  /agentPhoto=\{motorists\.find/.test(appCode),
  'dicebear was a network request on every load for a face nobody chose');
/* THE iOS TRAP. A drag that starts on the LEFT edge is Safari's back gesture, so a left-hand
   ribbon sometimes leaves the app instead of opening the panel. Right edge is forward, which
   does nothing without forward history. Move it back to the left and this goes red. */
/* It was briefly on the desk too, on the left, for the hour between the desk no longer opening
   itself and his correction — *"the sidebar u pull here is the sidebar for phone only dont use it
   on PC"*. Back to `lg:hidden`, right edge, phone only. */
check(G25, 'the ribbon is on the RIGHT edge, away from Safari\'s back gesture',
  /kpm-edge-ribbon[^"]*lg:hidden fixed right-0/.test(shellSrc) &&
  /fixed inset-y-0 right-0 z-\[90\] bg-\[#0b0a09\]\/97/.test(shellSrc),
  'the left edge is iOS back — a navigation control that can exit the app is worse than none');
/* IT THREW AND THE WHOLE GESTURE DIED SILENTLY. setPointerCapture needs an active pointer;
   without one it raises, before a single listener is attached, and the ribbon does nothing. */
check(G25, 'the drag does not call setPointerCapture',
  !/setPointerCapture/.test(shellSrc),
  'it throws when the pointer is not active and kills startRailPull before it listens; ' +
  'the window listeners already cover the finger leaving the ribbon');
/* IT OPENED ONCE AND THEN STOPPED TOGGLING. onEnd read `isMobileMenuOpen` from the render that
   created the handler, so after the first open every tap re-computed against a stale `false`. */
check(G25, 'the release reads the state the drag started with, not the closure\'s',
  /wasOpen: isMobileMenuOpen/.test(shellSrc) && /: !d\.wasOpen\)/.test(shellSrc),
  'reading isMobileMenuOpen in onEnd is a stale closure — the tap stops toggling after the ' +
  'first open, with nothing on screen to say why');
check(G25, 'every menu item carries the mark the rail shows',
  (shellSrc.match(/icon: [A-Z]/g) || []).length === (shellSrc.match(/feature: 'view_/g) || []).length,
  'the icon IS the label at 76px wide — an item without one is an invisible tab');
check(G25, 'the name plate is rendered outside the rail, which clips',
  /fixed z-\[95\] pointer-events-none kpm-rail-say/.test(shellSrc) &&
  /right: RAIL_W \+ 10/.test(shellSrc),
  'the rail sets overflow-hidden, so a plate parented to a mark is cut off at 76px and the ' +
  '"brief info" he asked for is never seen');
check(G25, 'the ribbon breathes, and holds still when motion is off',
  /animation: kpmEdgeBreath/.test(themeCss) &&
  /lite-mode \.kpm-edge-grip \{ animation: none/.test(themeCss) &&
  /prefers-reduced-motion[\s\S]{0,80}\.kpm-edge-grip \{ animation: none/.test(themeCss),
  'a still 14px sliver on a black screen is invisible — the breath is the whole affordance, ' +
  'but it must not move for anyone who asked for no movement');
check(G25, 'the three header controls wear the one plate',
  /className=\{`kpm-chip kpm-bell relative \$\{unreadCount > 0 \? 'on' : ''\} \$\{ringing \? 'ringing' : ''\}`\}/.test(strip(fs.readFileSync('src/components/NotificationBell.jsx', 'utf8'))) &&
  /className=\{`kpm-chip relative \$\{isOnline \? '' : 'warn animate-pulse'\}`\}/.test(appCode) &&
  /className=\{`kpm-theme-switch \$\{darkMode \? '' : 'is-light'\}`\}/.test(shellSrc),
  'they were a green pill, a white-outlined square and a bare icon standing 24px apart');
/* "make sure that it background change from white to black according to the changes" — the TRACK
   is the readout, not just a housing for the knob, and the knob shows the state you are IN. A
   toggle that displays its destination instead is the oldest way to make one unreadable. */
check(G25, 'the theme switch turns white and black with the theme',
  /\.kpm-theme-switch \{[\s\S]{0,300}?background-color: #0f0e0d/.test(themeCss) &&
  /\.kpm-theme-switch\.is-light \{ background-color: #f3efe6/.test(themeCss) &&
  /role="switch"/.test(shellSrc) && /aria-checked=\{!darkMode\}/.test(shellSrc),
  'the track carries the answer; without is-light it is a knob sliding on a black bar and the ' +
  'change he asked for never happens');
/* Anchored on the Tailwind PREFIX, not on the colour name alone. A bare /slate-/ matches
   `translate-x-full` — tranSLATE-x — so the first version of this check failed on the panel's
   own slide animation and would have failed on any future one. */
const BANNED_HUE = /(?:bg|text|border|ring|from|via|to|shadow|fill|stroke|divide|outline)-(?:blue|slate|emerald|green)-/;
/* Scoped to the CHROME — this shell file and the sync pill it is handed. App.jsx still has
   emerald and slate further in (the boot spinner, the flight-recorder log rows); those are
   real palette-law breaches but they are not this change, and asserting them here would mean
   a check that has been red since the day it was written. */
const syncBlock = (appCode.match(/<button onClick=\{\(\) => setShowFlightRecorder\(true\)\}[\s\S]{0,900}?<\/button>/) || [''])[0];
/* "nah bro bring back that music player man" — it was desk-only for exactly one commit, on the
   grounds that a 76px rail cannot hold a volume slider. True, and beside the point: the rail is
   on the right, so the body opens LEFT into the screen and only the head stays in the rail. */
const musicSrc = strip(fs.readFileSync('src/MusicPlayer.jsx', 'utf8'));
check(G25, 'the music player is in the panel at every width',
  /\{isAdmin && <MusicPlayer onOpen=\{\(\) => setIsMobileMenuOpen\(false\)\} \/>\}/.test(shellSrc),
  'wrapping it in `hidden lg:block` takes it off the phone again — he asked for it back by name; ' +
  'and onOpen is what closes the rail when the pill opens, which was his rule for the island');
/* "music player is squeshed bro ... i rather make the music logo pressable like other
   components ... delete the music player button, like the forward backwar pause button in the
   sidebar ... make the music button spawn a panel beside it". */
/* INVERTED at the desk end, 2026-08-14: *"music player is not even the same UI like what we have
   in the phone mode"*. The desk used to keep a card, a "Cassette OS" label and an inline
   play/pause pair, because it had a 256px column. It has a 104px strip now, so the head is one
   mark at BOTH widths and every control lives in the pill. */
check(G25, 'the rail head is one mark, with no transport crammed beside it',
  /kpm-rail-mark \$\{isExpanded \? 'on' : ''\}/.test(musicSrc) &&
  !/hidden lg:flex items-center gap-3/.test(musicSrc) &&
  !/lg:bg-black\/40/.test(musicSrc),
  'play/skip in a rail cell is what squeezed it — every control belongs in the pill, and the ' +
  'desk wears the phone\'s shape now rather than a card of its own');
/* THE PILL MUST LEAVE THE RAIL, and by portal — not by CSS. The rail carries `backdrop-blur`,
   and a backdrop-filter makes its element the containing block for `position: fixed` descendants.
   A pill left inside would anchor to the rail instead of the screen and sit off the edge. This is
   the same class of trap that made the field-mode bar and the bell land on the manifest: an
   ancestor quietly deciding where a fixed child lives. */
check(G25, 'the pill is portalled out of the rail, not positioned inside it',
  /createPortal\(/.test(musicSrc) && /document\.body/.test(musicSrc) &&
  /kpm-music-pill[^"]*fixed z-\[95\] top-3 left-1\/2/.test(musicSrc) &&
  !/absolute right-full/.test(musicSrc),
  'backdrop-filter on the rail makes it the containing block for fixed children — a pill left ' +
  'inside anchors to the rail, not the screen');
/* INVERTED 2026-08-14: the desk had an in-flow accordion of its own and now it must not. It
   opened DOWNWARDS inside a panel that is 72px wide and — the moment the pointer leaves — 72px
   tall, so there is nowhere left for it to open into. His words: *"i want the initial position
   for the music player also the same with that"*, the music button being one more mark in the
   collapsed capsule, which means it also says its own name like one. */
check(G25, 'the pill is the answer at BOTH widths, with no desk accordion left behind',
  !/isPhone/.test(musicSrc) && !/max-h-\[300px\] opacity-100/.test(musicSrc) &&
  /kpm-rail-word/.test(musicSrc),
  'a second music layout on the desk is the thing he rejected by name, twice');
/* This used to be scoped to the chrome and the sync pill alone, because App.jsx still had
   emerald and slate deeper in — the boot spinner, the Flight Recorder, the setup screens, the
   password-strength meter. All 35 of those sites are swept now, so the check covers the WHOLE
   file. The narrow version was the honest thing to write while an exception existed; leaving it
   narrow once the exception is gone would just be somewhere for the next green to hide. */
/* NO SCROLLING IN THE RAIL — "there is still scroll feature inside sidebar, i dont want that,
   find another solution to fit it there". The solution is that the rows SHARE the column instead
   of each claiming a fixed height, so the same rail fits a Tier-1 menu on a tall phone and a
   short one without ever scrolling.

   Two things here are load-bearing and both look like noise:
   - `minmax(0, 1fr)`, not `1fr`. A grid row's default minimum is its CONTENT, so plain 1fr rows
     refuse to shrink and the overflow he reported comes straight back.
   - `min-h-0` on the marks and on the nav. A flex child's default minimum is its content too;
     this is the same trap twice, in the two layout systems.
   Putting a fixed cell height or a min-height floor back on the marks reintroduces the scroll on
   a short screen — or, worse, CLIPS a tab he can then never reach, since the nav is
   overflow-hidden by design. */
check(G25, 'the rail never scrolls — the rows share the height instead',
  /auto-rows-\[minmax\(0,1fr\)\]/.test(shellSrc) &&
  /flex-1 min-h-0 scrollbar-hide/.test(shellSrc) &&
  /justify-center h-full min-h-0/.test(shellSrc) &&
  /* From 2026-08-14 this holds at BOTH widths. The desk used to be allowed its own
     `lg:overflow-y-auto`, because 256px of text rows on a short monitor genuinely needed it —
     an 88px column of marks does not, and a scrollbar in this panel is a thing he rejected
     once already. So the exception is gone and any overflow-y-auto here is the bug. */
  !/grid[^"]*overflow-y-auto/.test(shellSrc),
  'a fixed cell height brings the scroll back on a short phone; a min-height floor clips a mark ' +
  'off the bottom instead, which is worse — the tab becomes unreachable, not just further down');
/* 📏 THE OTHER HALF OF THAT TRADE, his report of the same day: *"button for each should be
   spacier"*. With no scrollbar and no min-height allowed, the ONLY way a mark gets taller is if
   something else in the column stops spending the height. Measured in a browser on 1366x768 with
   all seventeen marks present: 21.8px plates around a 27px icon before, 29.9px after.
   Each number below is load-bearing, and raising any one of them takes the height straight back
   out of the marks:
     · gap 4px — at 8px the sixteen gaps alone ate 128px of a 515px column
     · padding 4px — 8px on a 64px-wide strip, and it also makes the plate 56px, the same width
       as the collapsed circle, so the open dock lines up with the closed one
     · icon 17px — the glyph was TALLER than its own plate, the actual defect in his screenshot
     · the foot's 36px marks — it was 221px of the 744px available, for four controls */
check(G25, 'the marks are spacier without a scrollbar and without a floor',
  /\[data-kpm-rail\] \.kpm-rail-grid \{ gap: 4px; padding: 4px; \}/.test(themeCss) &&
  /\[data-kpm-rail\] \.kpm-rail-icon \{ width: 17px; height: 17px; \}/.test(themeCss) &&
  /\[data-kpm-rail\] \.kpm-rail-foot \{ margin-bottom: 0; padding-top: 6px; \}/.test(themeCss) &&
  /\[data-kpm-rail\] \.kpm-rail-foot \.kpm-rail-mark \{ height: 36px; width: 56px; margin-inline: auto; \}/.test(themeCss) &&
  /className="kpm-rail-foot mt-auto/.test(shellSrc) &&
  /* the prefix is the whole reason these apply — `.kpm-rail-foot` alone ties with `mb-2` and
     loses on file order, which is the same tie that shipped twice this morning */
  !/\n  \.kpm-rail-foot \{/.test(themeCss),
  'every one of these is a Tailwind utility being overridden, so each needs the attribute ' +
  'prefix to outrank it — and each is height that the seventeen marks get to share instead');
/* 📏 THE LABEL PILL'S HEADROOM, measured the same way. The open panel is 292px only so the pill
   has somewhere to go: the pod keeps 64px and the remaining 228px is the pill's room. Measured
   with every real label, the longest — "Receivables & Consignment", 25 characters — draws a
   201px pill ending at x=271. That is **21px of headroom**, about two and a half characters.
   The panel sets overflow: hidden, so a longer tab name does not wrap or push — it is silently
   sliced off, and the only symptom is a hover label that reads wrong. Rename past this and
   widen the panel in the same commit. */
/* 📐 SQUARE CELLS ARE WHAT MAKE THE SPACING EVEN — his ask, 2026-08-14: *"make the sidebar
   thinner, and reduce space between each column ... make the space between columns to be the same
   with the row to be more even"*.
   Matching the two gaps was the SMALLER half and would not have worked alone. The cells were 54
   wide and 30 tall, so icon-to-icon the pitch was ~56 across and ~34 down — the unevenness was the
   CELL SHAPE, and no gap value could have fixed it. At a 100px pod the two columns come out
   44 x 44 and the pitch is 48px both ways: even by construction rather than by eye.
   ⚠️ `--cap` IS THE LOAD-BEARING HALF. `auto-rows: minmax(0,1fr)` lets rows share the whole
   column, so on a 768px screen nine rows stretch to ~65px tall against 44px wide and the cells
   quietly stop being square — the evenness undoes itself with nothing in the diff to show for it.
   Delete the cap and this check is the only thing that will notice. */
check(G25, 'the two columns are square cells, so the spacing is even in both directions',
  /\.kpm-rail-pod \{ width: 100px; flex: none; \}/.test(themeCss) &&
  /\[data-kpm-rail\] \.kpm-rail-grid\.is-two \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/.test(themeCss) &&
  /\[data-kpm-rail\] \.kpm-rail-grid \{ max-height: var\(--cap, none\); align-content: center; \}/.test(themeCss) &&
  /'--cap': visibleMenu\.length > 10/.test(shellSrc) &&
  /visibleMenu\.length > 10 \? 'is-two' : ''/.test(shellSrc),
  'a 1fr row grows to fill whatever height it is given, so without the cap the cells stretch back ' +
  'to oblong on a tall screen and the evenness he asked for disappears with no visible cause');
/* 🔑 "LABEL B", his pick of three shown side by side: *"Label B is good"* — the same square plate
   the PHONE already uses, which he had called clean. The old desk label was a rounded PILL with a
   140ms delay and he called it *"too cheap"*: the shape matched nothing else in the app, and the
   delay made the rail feel hesitant across seventeen buttons.
   The MOTION is Label A's, on his instruction: *"make the intro animation from label B text to
   looks like label A, it slides moving from left to right ... and slowdown the animation"*.
   ⚠️ THE TRAVEL MUST EQUAL THE GAP. It rests at -22px, which is exactly its own 22px margin, so it
   starts precisely ON the dock's edge and never paints over the glass. Shorten the gap without
   shortening the travel and it starts on top of the sidebar; shorten the travel without the gap
   and a 520ms slide covers almost no distance, which reads as sluggish rather than natural. */
check(G25, 'the hover label is the phone plate, sliding out from under the dock edge',
  /\.kpm-rail-mark > \.kpm-rail-word \{[\s\S]{0,320}?margin-left: 22px;[\s\S]{0,120}?transform: translate\(-22px, -50%\)/.test(themeCss) &&
  /\.kpm-rail-mark > \.kpm-rail-word \{[\s\S]{0,320}?border-radius: 4px;/.test(themeCss) &&
  /transition: opacity 300ms cubic-bezier\(\.22, 1, \.36, 1\),\s*\n\s*transform 520ms/.test(themeCss) &&
  !/transition-delay: 140ms/.test(themeCss) &&
  /* column 1's label must clear column 2 — anchored to its own right edge it lands ON column 2,
     which is the *"description is hiding inside the sidebar"* he photographed. Measured: 26px. */
  /\.kpm-rail-grid\.is-two \.kpm-rail-mark:nth-child\(odd\) > \.kpm-rail-word \{\s*\n?\s*left: calc\(200% \+ 8px\)/.test(themeCss),
  'the plate must start at the dock edge and travel the width of its own gap — and a column-1 ' +
  'label anchored to its own button lands on top of column 2');
/* ⚠️ TWO CASCADE TIES AND A FINGERTIP AFFORDANCE, all found on 2026-08-14 and all invisible in a
   diff. `transition-all duration-200` sat on the mark: one Tailwind class against one
   `.kpm-rail-mark` class, and Tailwind is emitted after theme.css, so it won the tie and every
   tuned per-property transition in that file never applied. It also animated `all`, dragging the
   background, the shadow and the blur along with it.
   `.hot` scales the icon 42% and lifts it 4px so the effect lands OUTSIDE the area a thumb covers.
   A mouse covers nothing, so on the desk it is just an icon jumping out of its own button — which
   is the overflow his screenshot caught. */
check(G25, 'no transition-all on the mark, and no fingertip pop on a desk',
  !/kpm-rail-mark[^`]*transition-all/.test(shellSrc) &&
  /\[data-kpm-rail\] \.kpm-rail-mark\.hot \.kpm-rail-icon \{\s*\n?\s*transform: none; filter: none;/.test(themeCss),
  '`transition-all` is one class and so is `.kpm-rail-mark`; Tailwind lands later, so the tie ' +
  'goes to Tailwind and the stylesheet is silently ignored. Count the specificity, do not eyeball');
const railLabels = (shellSrc.match(/label: '([^']*)'/g) || []).map(s => s.slice(8, -1));
check(G25, 'no tab name is long enough to be sliced off its own hover pill',
  railLabels.length >= 17 && railLabels.every(l => l.length <= 27),
  'the pill is measured in a browser, not guessed: 25 characters lands 21px short of the edge, ' +
  'so 27 is the last safe length before `:focus-within { width: 292px }` has to grow too — ' +
  'longest today: ' + railLabels.reduce((a, b) => (b.length > a.length ? b : a), ''));

/* THE DELETE SWEEP. Eighteen icon-only delete buttons across ten files wear the expanding control
   now, reached by ATTRIBUTE rather than by class — their className shapes differ (plain strings,
   template literals, ternaries) and merging a class into each mechanically is what broke two
   earlier attempts.

   The specificity is the load-bearing part: theme.css is imported BEFORE @tailwind utilities, so
   a bare `[data-kpm-del]` (0,1,0) would TIE with the `p-2` and `bg-...` classes still on those
   buttons and lose on source order. `button[data-kpm-del]` (0,1,1) wins; drop the element and the
   whole sweep silently reverts to looking like nothing happened. */
const DEL_FILES = ['src/AgentProfileView.jsx', 'src/FleetCanvasManager.jsx',
  'src/components/BranchWarehouseManager.jsx', 'src/MapMissionControl.jsx',
  'src/components/CustomerManager.jsx', 'src/RestockVaultView.jsx',
  'src/components/LandlordDashboard.jsx', 'src/components/HistoryReportView.jsx',
  'src/components/SamplingManager.jsx', 'src/components/SettingsView.jsx'];
const delMarks = DEL_FILES.reduce((n, f) =>
  n + (fs.readFileSync(f, 'utf8').match(/<button data-kpm-del data-label="Delete"/g) || []).length, 0);
/* 18 → 17 on 2026-08-13, and this is a REAL change, not a loosened needle: the tenant registry's
   delete button stopped being icon-only. It now reads "Delete" inside the record's action strip,
   and the rule above says a button carrying its own word must NOT be marked, or the label prints
   twice. If this number drops again without a word button appearing, something was lost. */
check(G25, 'every icon-only delete button in the app wears the expanding control', delMarks === 17,
  `found ${delMarks} marked, expected 18 — a new icon-only delete button needs ` +
  '`data-kpm-del data-label="Delete"` on it, and one that carries its own word ("Remove", "DEL") ' +
  'must NOT be marked or the label prints twice');
check(G25, 'the delete rules outrank the Tailwind classes still on those buttons',
  /button\[data-kpm-del\] \{/.test(themeCss) &&
  /button\[data-kpm-del\]:hover, button\[data-kpm-del\]:focus-visible, button\[data-kpm-del\]:active \{/.test(themeCss) &&
  /content: attr\(data-label\)/.test(themeCss),
  'theme.css loads before @tailwind utilities, so a bare [data-kpm-del] ties with p-2 and loses ' +
  'on source order — the `button` prefix is what makes the sweep visible at all');

/* THE FLASH. His report: "sometimes there is a bug and the sidepanel show a while until i refresh
   on the phone then its gone". Nothing opened it — the app imports its CSS from main.jsx, so the
   dev server injects that stylesheet with JS AFTER React paints, and for that window the panel has
   no `fixed` and no `translate-x-full`: a plain block, in the document, in full view.

   The guard is in TWO files and is worthless with either half missing — index.html hides it from
   the first byte, theme.css hands it back when the real styles land. Both are checked here
   because a future tidy-up that deletes "the duplicate rule" would silently restore the flash, or
   silently hide the navigation forever. */
const indexHtml = fs.readFileSync('index.html', 'utf8');
check(G25, 'the nav panel cannot flash before the stylesheet lands',
  /\[data-kpm-rail\] \{ visibility: hidden; \}/.test(indexHtml) &&
  /\[data-kpm-rail\] \{ visibility: visible; \}/.test(themeCss) &&
  /data-kpm-rail\b/.test(shellSrc),
  'both halves are required: index.html hides it before anything loads, theme.css un-hides it ' +
  'when the app CSS arrives. Delete the second and the navigation is invisible forever');

/* THE BELL. It rings on ARRIVAL, not only when touched — hover is a mouse idea and this button
   lives on a phone. The trap is the comparison: ring on an INCREASE only, held in a ref. Compare
   against zero instead and reading your mail sets the bell off on the way down. */
const bellSrc = strip(fs.readFileSync('src/components/NotificationBell.jsx', 'utf8'));
check(G25, 'the bell rings when mail arrives, not only when it is touched',
  /const rose = unreadCount > prevUnread\.current;/.test(bellSrc) &&
  /kpm-bell\.ringing > svg \{ animation: kpmBellRing/.test(themeCss) &&
  /transform-origin: top center/.test(themeCss),
  'transform-origin decides whether it swings like a bell or spins like a coin; and a count ' +
  'compared against zero rings again every time he READS his notifications');
check(G25, 'the bell holds still for anyone who asked for no motion',
  /lite-mode \.kpm-bell > svg \{ animation: none/.test(themeCss) &&
  /\.kpm-bell\.ringing \{ box-shadow/.test(themeCss),
  'reduced motion must still announce the arrival — it just stops swinging to do it');

/* THE EXPANDING BUTTON. Two traps, and the first one is the one that would go unnoticed for
   weeks: a phone has NO :hover, so a hover-only rule leaves this a plain circle forever on the
   only device he uses. :active has to be in the same selector. The second is the palette one —
   red at rest means a list of rows is a wall of red before you have gone near any of it. */
check(G25, 'the expanding button opens on touch, not only on hover',
  /\.kpm-expand:hover, \.kpm-expand:focus-visible, \.kpm-expand:active \{/.test(themeCss) &&
  /content: attr\(data-label\)/.test(themeCss),
  'hover-only leaves it a plain circle on a phone; data-label is what lets a site opt in ' +
  'without any JSX beyond two attributes');
check(G25, 'it is black at rest and red only under the finger',
  /\.kpm-expand \{[\s\S]{0,400}?background-color: #14110e/.test(themeCss) &&
  /\.kpm-expand\.danger:hover, \.kpm-expand\.danger:focus-visible, \.kpm-expand\.danger:active/.test(themeCss) &&
  /\.kpm-rail-mark\.danger:hover, \.kpm-rail-mark\.danger:focus-visible \{ color: #ff8175; \}/.test(themeCss) &&
  /* 🔄 LOGOUT WENT BACK TO `.kpm-expand` on his word, 2026-08-14: *"i like the old logout button
     animation better, can u revert that?"*. It had been flattened into a plain `.kpm-rail-mark`
     that morning when he asked for one hover language across the rail; he has since seen both
     side by side and picked this one back. It is the last control in the rail, so a second
     language costs nothing there. */
  /className="kpm-expand danger shrink-0"/.test(shellSrc) &&
  /* 📏 THE LABEL CLAIMS A DISTANCE, NOT A SHARE. It used to take `68%` of the button, so it grew
     as the capsule grew and kept crowding the glyph no matter how wide the capsule got — his
     report twice over: *"it looks collapsed"*, then *"give more space between text and logo"*.
     80px from the right edge leaves the icon 24px of clear air that holds at ANY width. Put a
     percentage back here and the crowding comes back with it. */
  /\.kpm-expand:hover::after,[\s\S]{0,120}?width: 80px; padding-right: 16px;/.test(themeCss) &&
  !/\.kpm-expand:hover::after,[\s\S]{0,120}?width: 68%/.test(themeCss),
  'a delete or logout button that is red before you reach for it turns every list into a wall ' +
  'of alarm');
check(G25, 'no blue, slate or green left in the shell, App or the player',
  !BANNED_HUE.test(shellSrc) && !BANNED_HUE.test(appCode) && !BANNED_HUE.test(musicSrc),
  'palette law: slate IS the blue. The print receipt is the ONLY exemption and it lives in its ' +
  'own @media print block in theme.css, not in any of these three files');

/* ── 26. the sales terminal still works after the UI rework ─────────────────
   His ask: "make another test make sure that all the sales terminal works fine, then we can move
   on to the crown plan again". Two days of UI churn went through this file — the picker became a
   sheet, the stock switch moved in, the drawer lost its cap, the customer bar became a drag
   handle, the paper's label became a button. None of that was supposed to touch the money path.

   This group is the boundary between "the terminal looks different" and "the terminal behaves
   differently". Every check is a thing a careless UI edit could plausibly break WITHOUT breaking
   the build — which is exactly the class of bug that reaches his phone. */
const G26 = '26. The sales terminal still behaves after the UI rework';

/* THE GATE ON A SALE. Seven conditions, and every one of them is somebody's money or somebody's
   accountability: no empty sale, no unnamed customer, no sale while GPS is still deciding, no
   sale without handover proof, no double-submit, no damaged return without a reason, no exchange
   the vehicle cannot cover. A UI tidy-up that drops one of these ships a hole in the ledger. */
check(G26, 'a sale still needs all seven of its gates',
  /const canSubmitSale = cart\.length > 0 && customerName\.trim\(\) && gpsStatus !== 'checking' && txProofPhoto && !isGpsRestricted && !isProcessingSale && !hasInvalidDamagedItems && !hasInsufficientStockForExchange;/.test(termSrc),
  'this one line is the difference between a manifest and a hole in the ledger — if it was ' +
  'reformatted, re-read every clause before changing this check to match');
check(G26, 'the deal still leaves through the one committed path',
  /onClick=\{handleFinalDeal\}/.test(termSrc) && /disabled=\{!canSubmitSale \|\| isProcessingSale\}/.test(termSrc),
  'a second submit path would bypass the gate above');

/* THE DRAWER. Both handles now, and the bar must pass an onTap or a tap on it toggles the
   manifest instead of reaching the picker button inside it. */
check(G26, 'the manifest can be dragged by the grip AND by the customer bar',
  /onPointerDown=\{startDrawerDrag\}/.test(termSrc) &&
  /onPointerDown=\{\(e\) => startDrawerDrag\(e, \(\) => \{\}\)\}/.test(termSrc) &&
  /if \(d\.onTap\) \{ d\.onTap\(\); return; \}/.test(termSrc),
  'without the onTap override a tap on the customer bar toggles the drawer, and the picker ' +
  'button inside it becomes unreachable on a phone');
check(G26, 'the clear-customer X does not start a drag',
  /data-no-drag/.test(termSrc) && /e\.target\.closest\('\[data-no-drag\]'\)/.test(termSrc),
  'it sits inside the drag surface — without the guard, clearing a customer drags the manifest');
check(G26, 'the drawer still snaps closed, half and full',
  /drawerSnaps\(\) = \(\) =>|const drawerSnaps = \(\) => \[DRAWER_CLOSED, Math\.round\(window\.innerHeight \* 0\.55\), drawerMax\(\)\]/.test(termSrc),
  'the three snap points are what make it a drawer rather than a thing that flops open');

/* THE STOCK SOURCE. The switch moved out of App's shell into the wares column; what must NOT
   have moved is which vault the terminal then reads and writes. */
check(G26, 'the stock switch still decides which vault the terminal uses',
  /agentProfileId=\{userRole === 'ADMIN' \? \(adminSalesMode === 'VEHICLE' \? 'ADMIN_VEHICLE' : 'VAULT'\) : agentProfileId\}/.test(appCode),
  'the toggle is cosmetic if this stops deriving agentProfileId — the boss would sell from the ' +
  'wrong stock with the right button lit');
check(G26, 'the terminal still writes into the vault it read from',
  /masterUserId=\{userId\}/.test(appCode) && /const dataOwnerId = masterUserId \|\|/.test(termSrc),
  'this is G20\'s bug: a salesman writing customers and IOUs into his own vault while reading ' +
  'the list out of the boss\'s');

/* THE PICKER. One input, two ways in, and the click-outside sanctuary intact. */
/* ONE WRITER, not one field. There are two `value={customerName}` inputs in this file and that is
   correct: the second (in the NOO block) is `disabled`, a read-back rather than a control. What
   must stay unique is the number of places that can CHANGE customerName from a keyboard —
   `handleManualCustomerType` carries the tier reset, the territory clear and the auto-select, so
   a second field wired straight to setCustomerName would skip all three silently. */
check(G26, 'exactly one field can write the customer name, reachable from both openers',
  (termSrc.match(/onChange=\{handleManualCustomerType\}/g) || []).length === 1 &&
  /autoFocus/.test(termSrc) &&
  (termSrc.match(/manifest-dropdown-area/g) || []).length >= 3,
  'two inputs fighting over one customerName is how the tier and the territory stamp drift ' +
  'apart; the sanctuary class is what stops the sheet closing as you type in it');
check(G26, 'registering an outlet still hands the screen back to the wares',
  (termSrc.match(/setDrawerH\(DRAWER_CLOSED\)/g) || []).length >= 2,
  'his G6 report — a NOO that leaves the paper open looks like a freeze');

/* ── 27. THE ARCHITECT TAB ────────────────────────────────────────────────
   Phase 5 of the UI plan. This tab was the last screen wearing another app's clothes: a red
   `font-serif` scanline card dropped into a blue settings page. Restyling a screen that holds
   the tenant switch, the ownership transfer and a data wipe is exactly where a cosmetic edit
   can quietly delete a control, so this group asserts BOTH halves — the palette, and that every
   child that was in the tab is still mounted. */
const G27 = '27. The architect tab is the same app as everything else';

const settingsSrc = fs.readFileSync('src/components/SettingsView.jsx', 'utf8');
const lordSrc = fs.readFileSync('src/components/LandlordDashboard.jsx', 'utf8');
/* Only the architect block — the other tabs in this file are Phase 6's job, and asserting them
   here would report a failure that is not this change. */
const archStart = settingsSrc.indexOf('WORKSPACE: ARCHITECT TERMINAL');
const archEnd = settingsSrc.indexOf('PLUG & PLAY: THE RESPONSIVE MATRIX EDITOR');
const arch = archStart > 0 && archEnd > archStart ? settingsSrc.slice(archStart, archEnd) : '';

check(G27, 'the architect block was found at all',
  arch.length > 1000,
  'the two markers this group slices between were renamed — every palette check below would ' +
  'pass on an empty string, which is the worst kind of green');

const offToken = /\b(?:bg|text|border|from|to|via)-(?:blue|emerald|green|slate|sky|indigo|teal|cyan)-\d/;
check(G27, 'the architect block carries no blue, no green, no slate',
  !offToken.test(arch),
  'palette law: slate IS the blue and emerald IS the green. This tab used bg-blue-900/20 for ' +
  'the photo-storage card and bg-black/border-slate-800 for the landlord panel');
check(G27, 'the landlord panel carries no blue, no green, no slate either',
  !offToken.test(lordSrc),
  'the tenant rows were emerald-for-active / red-for-locked and the edit button was blue-500');
/* STRONGER CLAIM after the 2026-08-13 rebuild. The old needles asserted a heading and a scanline
   that lived on the registry's own card; that card is gone, and both facts moved. What must stay
   true is the INTENT: nothing here is font-serif, and the screen names itself exactly once. */
check(G27, 'the registry does not name itself — the module rail does',
  !/font-serif/.test(code(lordSrc)) &&
  !/<h2/.test(code(lordSrc)) &&
  /<h3>Tenant registry<\/h3>/.test(settingsSrc),
  'it used to open with its own <h2>Architect Terminal</h2>, typographically louder than the ' +
  'tab it sits inside — the screen named itself twice and the child won');
check(G27, 'the house texture survives, on the band that carries it now',
  /\.kpm-band \{[^}]*background-image: var\(--hatch\)/s.test(themeCss),
  'the scanline was the one decoration in this tab that Lite Mode could not strip; it belongs ' +
  'on a printed caption strip, not on a card that no longer exists');

/* THE CONTROLS. Restyling must not drop a child. Each of these is Tier-1-only and has no other
   route in the app. */
for (const [what, needle] of [
  ['the achievement tester', '<AchievementTester'],
  ['career dev tools', '<CareerDevTools'],
  ['the landlord dashboard', '<LandlordDashboard'],
  ['the crown transfer button', 'setShowCrownTransfer(true)'],
  ['the crown transfer protocol itself', '<CrownTransferProtocol'],
  ['the disco protocol', 'triggerDiscoParty'],
]) check(G27, `${what} is still mounted in the tab`, arch.includes(needle),
  'this control has no other route in the app — losing it in a restyle is silent');

check(G27, 'the tab is still Tier 1 only',
  /activeTab === 'architect' && isSystemOwner/.test(settingsSrc),
  'the gate, not the look — dropping isSystemOwner hands the tenant switch to every owner');

/* The tokens have to exist in the BUILT css, not just in the source. */
/* Utility classes still in use in this tab. `.bg-inset` left the list on 2026-08-13: the rebuild
   consumes that token through `var(--inset)` in theme.css instead, so Tailwind correctly stops
   emitting the utility — asserting it would be asserting a class nobody asks for. */
for (const n of ['.bg-panel', '.bg-raised', '.bg-sunk', '.text-ink', '.text-gold',
                 '.text-danger-text', '.bg-danger-well', '.border-line-2', '.text-verified'])
  check(G27, `${n} survived the build`, css.includes(n + '{'),
    'Tailwind only emits a class it saw in source — a typo here paints nothing and looks ' +
    'like a transparent panel');
/* the tokens themselves must reach the built CSS, whichever way they are spent */
for (const v of ['--inset:', '--panel:', '--gold:', '--danger-plate:', '--line-3:'])
  check(G27, `${v} is defined in the built stylesheet`, css.includes(v),
    'the control system reads these through var() — an undefined token is a transparent control');

/* ── 28. THE CORNER MASCOT'S SIZE ─────────────────────────────────────────
   He has been reported cut THREE times. Twice it was a real geometry bug, and each fix was
   undone by the next change touching the same one property. `transform` is a single property:
   an animation that sets it replaces a static `scale()` entirely, and animations beat normal
   declarations. So the rule is structural — the scale lives on a wrapper nothing animates, and
   the sheet lives on its child. */
const G28 = '28. The corner mascot fits inside his corner';
const capySrc = fs.readFileSync('src/components/CapybaraMascot.jsx', 'utf8');
/* theme.css is already loaded as `themeCss` further up. `themeSrc` is BiohazardTheme.jsx, NOT
   the stylesheet — reaching for that name here is what made these checks read the wrong file. */

check(G28, 'the scale sits on a wrapper, not on the sheet element',
  /<div className="kpm-merch-corner">/.test(capySrc) &&
  /kpm-merch \$\{spriteToShow\}/.test(capySrc),
  'sharing one element means the deal breath (which animates transform) throws the scale away ' +
  'and he renders at his true 200px in the screen corner — feet and right side off the edge');
check(G28, 'the wrapper still carries the frame size and the corner origin',
  /\.kpm-merch-corner \{[^}]*width: 200px;[^}]*\}/s.test(themeCss) &&
  /\.kpm-merch-corner \{[^}]*transform: scale\(\.64\);[^}]*transform-origin: 100% 100%;/s.test(themeCss),
  'origin 100% 100% is what keeps the shrink pinned to the screen corner instead of the centre');
check(G28, 'the sheet child fills the wrapper',
  /\.kpm-merch-corner > \.kpm-merch \{ position: absolute; inset: 0; \}/.test(themeCss),
  'without it the child is width:100% of a 200px box, which happens to work — until someone ' +
  'changes .kpm-merch, and then he is silently a different size');
check(G28, 'the deal pose still breathes',
  /\.kpm-merch-deal \{[^}]*animation: kpmMerchBreathe/s.test(themeCss),
  'the wrapper exists so this animation can keep its own transform — if it went away, the ' +
  'wrapper is pointless indirection');

/* ── 29. THE CAVE ─────────────────────────────────────────────────────────
   Aldi sent a pixel-art dungeon and asked for the alcove to look like it, "but darker", with the
   torch fire matching a pixel flame. The flame is now a real sprite sheet, so it inherits every
   trap the other sheets have: pixel stepping, a held frame in Lite Mode, and offline precache. */
const G29 = '29. The cave, its dark doorway, and its pixel fire';
const sw = fs.readFileSync('dist/sw.js', 'utf8');

check(G29, 'the flame is the generated sprite, stepped in pixels',
  css.includes('/sprites/bluefire.png') &&
  css.includes('background-size:256px 56px') &&
  /steps\(8/.test(css),
  'a percentage background-size lands between frames and tears — every sheet in this file is ' +
  'stepped in pixels for that reason');
check(G29, 'the old three-gradient flame is gone from the markup',
  !/className="kpm-flame"><i/.test(termSrc),
  'the <i> layers styled nothing once the sprite took over — dead elements that read as ' +
  'deliberate to the next person');
check(G29, 'Lite Mode holds a lit frame instead of animating',
  /lite-mode \.kpm-flame \{ animation: none !important; background-position: 0 0/.test(themeCss),
  'without the held position Lite Mode leaves the sheet wherever it stopped, which can be a ' +
  'half-drawn frame');
check(G29, 'the flame still works with no network',
  sw.includes('sprites/bluefire.png'),
  'the app is installed as a PWA — a sprite outside the precache is a blank torch offline');
check(G29, 'the doorway exists in both the markup and the stylesheet',
  /className="arch"/.test(termSrc) && /\.kpm-alcove \.arch \{/.test(themeCss),
  'the arch is what gives the merchant a silhouette; without it he is a flat cut-out on rock');
check(G29, 'the cave got darker, not lighter',
  /\.kpm-alcove \{[^}]*background: #070605/s.test(themeCss),
  'his word was "darker" — this is the ground the masonry and the doorway are judged against');

/* THE WALL. His verdict on the gradient masonry was "unnatural", and the cause was that
   repeating-linear-gradients are a perfect grid. Both tiles are generated pixel art. */
check(G29, 'the wall and the floor are tiles, not repeating gradients',
  css.includes('/sprites/cave-wall.png') && css.includes('/sprites/cave-floor.png') &&
  !/\.kpm-alcove \.rock::before[^}]*repeating-linear-gradient/s.test(themeCss),
  'a gradient grid is the exact thing he rejected — if this fails, someone put the grid back');
check(G29, 'the tiles stay pixel art through the upscale',
  (themeCss.match(/image-rendering: pixelated/g) || []).length >= 3,
  'smoothed, a 2x pixel tile turns to mush and stops reading as stone');
check(G29, 'both cave tiles work with no network',
  sw.includes('sprites/cave-wall.png') && sw.includes('sprites/cave-floor.png'),
  'the app is installed as a PWA — an un-precached tile is a black wall offline');
check(G29, 'the doorway is off-centre and taller than the merchant',
  /\.kpm-alcove \.arch \{[^}]*left: 4%;[^}]*height: 226px/s.test(themeCss),
  'centred, he stood in front of the only lit thing in the frame — his report, 2026-08-13');
check(G29, 'the doorway is DARK — no lit room behind it',
  /\.kpm-alcove \.arch::before[^}]*linear-gradient\(180deg, #0a0908 0%, #050403 55%, #000000 100%\)/s.test(themeCss) &&
  !/\.kpm-alcove \.arch::before[^}]*#b9791a/s.test(themeCss),
  'his words: "there is no light room in the dark cave man". A lit interior needs a light ' +
  'source this scene does not have');
check(G29, 'the merchant walks out through the doorway, and the walk is on a wrapper',
  /className=\{`walker \$\{alcoveOut \? 'out' : ''\}`\}/.test(termSrc) &&
  /\.kpm-alcove \.walker\.out \{ animation: kpmMerchToDoor/.test(themeCss) &&
  !/\.kpm-alcove \.fig \{[^}]*animation: kpmMerchToDoor/s.test(themeCss),
  'group 28 all over again: the deal breath animates transform, so a walk sharing that element ' +
  'is thrown away in the deal pose');
check(G29, 'he vanishes AT the doorway, at any cave width',
  /86%\s*\{ left: calc\(4% - 38px\);/.test(themeCss) &&
  /100% \{ left: calc\(4% - 38px\);[^}]*opacity: 0/.test(themeCss),
  'a fixed translateX made the vanish point depend on the column width — too early when wide, ' +
  'past the jamb when narrow. 4% - 38px is the arch centre (left 4% + half of 124px) minus half ' +
  'of his 200px box, so it tracks the arch instead of guessing');
check(G29, 'Lite Mode does not leave him mid-step',
  /lite-mode \.kpm-alcove \.walker\.out \{ opacity: 0/.test(themeCss),
  'with animations collapsed he would otherwise stand in the doorway forever');

/* ── 30. THE CONTROL SYSTEM ───────────────────────────────────────────────
   Aldi asked for a vocabulary he can spend on the rest of Settings, not one styled screen:
   *"make sure that the logic and theme and button design and animation that we made here could
   be use for button in another place"*. Two things have to hold for that to be true: the classes
   exist in the stylesheet rather than in one file's JSX, and NOTHING in them dies in Lite Mode. */
const G30 = '30. The control system is reusable, and survives Lite Mode';

for (const cls of ['.kpm-mod', '.kpm-rail', '.kpm-read', '.kpm-btn', '.kpm-field',
                   '.kpm-switch', '.kpm-rec', '.kpm-band'])
  check(G30, `${cls} is defined once, in theme.css`,
    new RegExp(`\\${cls}[ ,{]`).test(themeCss) && css.includes(cls),
    'a control that lives in one screen\'s className strings cannot be reused by the next screen');

/* THE LITE-MODE CONTRACT. index.css strips box-shadow and collapses animation; anything the
   hierarchy depends on must be a border, a background-color or a background-image. */
/* strip comments FIRST, then slice: slicing at the header text lands INSIDE that comment, so the
   `/*` opener is gone and nothing can strip the prose that follows */
const systemBlock = code(themeCss).slice(code(themeCss).indexOf('.kpm-mod {'));
check(G30, 'nothing in the system depends on a shadow, a blur or a filter',
  !/box-shadow|backdrop-filter|filter:|text-shadow/.test(systemBlock),
  'Lite Mode deletes all four — the old tab put every separation into shadows, so on a cheap ' +
  'Android the six panels collapsed into one undifferentiated column');
check(G30, 'every hover rule is gated for touch',
  (systemBlock.match(/:hover/g) || []).length > 0 &&
  /@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?:hover/.test(systemBlock),
  'touch fires :hover on tap and KEEPS it — an ungated hover leaves a button stuck lit');
check(G30, 'controls meet the 44px touch minimum',
  /\.kpm-btn \{[^}]*min-height: 44px/s.test(systemBlock) &&
  /\.kpm-field > input[^}]*min-height: 44px/s.test(systemBlock),
  'he works one-handed on a phone; below 44px the tap lands somewhere else');

/* THE HIERARCHY INVERSION — the defect all three design directions found independently. */
const arch2 = arch;   // the architect block sliced above
check(G30, 'the ownership transfer is the loudest control, and the joke is the quietest',
  /kpm-btn hazard block" onClick=\{\(\) => setShowCrownTransfer\(true\)\}/.test(arch2) &&
  /className="kpm-btn block"[\s\S]{0,200}triggerDiscoParty|onClick=\{triggerDiscoParty\} disabled=\{isDiscoMode\} className="kpm-btn block"/.test(arch2),
  'before this, Disco wore a filled red plate at full width and Crown Transfer wore a quiet ' +
  'outline — the loudest thing on the screen was the button that does nothing');
check(G30, 'the irreversible group is fenced by a band, not by a 1.02:1 tint',
  /<div className="kpm-band hazard">/.test(arch2) &&
  /\.kpm-band\.hazard \{[^}]*border-color: var\(--danger\)/s.test(themeCss),
  'the old fence was bg-danger-well\\/40 over --panel: about 1.02:1, invisible in dark mode');
check(G30, 'a tenant\'s locked state is readable on the phone',
  !/hidden md:flex/.test(code(lordSrc)) && /Locked out/.test(lordSrc),
  'SECURE\\/LOCKED used to be desktop-only — the one fact the registry exists to report was ' +
  'hidden on the only device he carries');
check(G30, 'the photo-storage setting still has exactly one writer',
  (settingsSrc.match(/setAppSettings\(prev => \(\{ \.\.\.prev, usePhotoStorage: newVal \}\)\)/g) || []).length === 1 &&
  (settingsSrc.match(/writePhotoStorage\(/g) || []).length === 2,
  'the switch draws two positions; two copies of the write is how a setting saves locally but ' +
  'never reaches the database');

/* ── 31. PANELS THAT READ AS DIFFERENT INSTRUMENTS ────────────────────────
   His verdict on the first version of the control system, 2026-08-13: *"this design is too
   standardise nothing special"*, and *"i want ... every panel have its own unique and it shows
   the difference between components title and its decription and features"*. Eight identical
   bordered boxes with one 14px caption row doing three jobs is what that was. */
const G31 = '31. Each panel is its own instrument, and title / description / controls differ';

for (const [cls, why] of [
  ['.kpm-head', 'the three-line head: slot code, then title + state, then the description'],
  ['.kpm-desc', 'the description, in the BODY face — a sentence must not compete with a title'],
  ['.kpm-shelf', 'the controls get their own ground, so "press" is a different zone from "read"'],
]) check(G31, `${cls} exists — ${why}`, new RegExp(`\\${cls}[ ,{]`).test(themeCss) && css.includes(cls),
    'without it the head collapses back to one caption row carrying title, state and prose');

check(G31, 'every module in the tab declares WHAT KIND it is',
  (arch.match(/className="kpm-mod (bench|live|hazard|idle)"/g) || []).length === 6 &&
  !/className="kpm-mod"/.test(arch),
  'a bare .kpm-mod is a generic card — the variant is what makes a bench tool look different ' +
  'from something that writes live data and different again from something irreversible');
check(G31, 'each kind wears a different head',
  /\.kpm-mod\.live \.kpm-head\s*\{[^}]*background-image/s.test(themeCss) &&
  /\.kpm-mod\.hazard \.kpm-head \{[^}]*background-image: var\(--hatch-danger\)/s.test(themeCss) &&
  /\.kpm-mod\.hazard \.kpm-head h3 \{ color: var\(--danger-ink\)/.test(themeCss),
  'same head on every module is the "too standardise" complaint, restated');
/* ⚠️ NO GOLD ON A HAZARD SURFACE. He killed the gold stripe on Crown Transfer on sight, and the
   reason outlives the taste call: gold is this app's ACCENT — the colour of "do this" — so gold
   on the one control that cannot be undone says "primary action" and "danger" at the same time. */
check(G31, 'the hazard surfaces carry no gold at all',
  !/\.kpm-mod\.hazard[^{]*\{[^}]*gold/s.test(themeCss) &&
  !/\.kpm-band\.hazard \{[^}]*gold/s.test(themeCss),
  'the danger texture is --hatch-danger, in the red family, matching the stripe already on ' +
  '.kpm-btn.hazard');
check(G31, 'every module prints its slot code',
  (arch.match(/className="slot"/g) || []).length === 6,
  'the code says which band a module belongs to and its order in it — it is how he names one ' +
  'out loud, and it is information rather than decoration');
check(G31, 'descriptions are prose, not another row of caps',
  /\.kpm-desc \{[^}]*text-transform: none/s.test(themeCss) &&
  /\.kpm-desc \{[^}]*font-family: var\(--font-body\)/s.test(themeCss),
  'uppercase mono for a whole sentence is why the old version read as one texture');

/* ── 32. COLOUR THAT CAN ACTUALLY BE READ ─────────────────────────────────
   *"dont use yellow color for text on light mode because its hard to see, red color is some
   place also not visible"*. Gold as text measured 1,19:1 on the light ground. The palette law
   had said "never a text colour" since Phase 3 and it still shipped — so this is a number now. */
const G32 = '32. Gold and red are readable in BOTH themes';

check(G32, 'the measuring script exists and is runnable',
  fs.existsSync('src/config/contrast.selfcheck.mjs'),
  'node src/config/contrast.selfcheck.mjs — it reads the real tokens and fails under 4,5:1');
check(G32, 'text tokens that flip per theme exist',
  /--accent-ink:/.test(themeCss) && /--danger-ink:/.test(themeCss) && /--accent-edge:/.test(themeCss),
  'gold-as-text and red-as-text must be different values in light mode; --gold cannot be both ' +
  'a plate fill and a legible label');
check(G32, 'the light theme darkens all three',
  /html\.light \{[\s\S]*?--accent-ink:\s*#6B4A05[\s\S]*?--accent-edge:\s*#7A5A12[\s\S]*?--danger-ink:\s*#611A14/.test(themeCss) ||
  /:root\.light,[\s\S]*?--accent-ink:\s*#6B4A05[\s\S]*?--accent-edge:\s*#7A5A12[\s\S]*?--danger-ink:\s*#611A14/.test(themeCss),
  'if these stay at the dark values the light theme is back to 1,19:1 and he cannot read the ' +
  'button that provisions accounts');
check(G32, 'the control system spends the readable tokens, never --gold or --danger-text as text',
  !/color: var\(--gold\)/.test(systemBlock) && !/color: var\(--danger-text\)/.test(systemBlock),
  'this is the exact line that shipped broken: .kpm-btn.key { color: var(--gold) }');

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
