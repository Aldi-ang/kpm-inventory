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
  ['Utang Barang: pending banner', 'Utang Barang Belum Dikirim'],
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
/* 🔴 THE 5-MINUTE GRACE PERIOD HAD NO CHECK AT ALL, and it had never worked once. `vaultGrace.js`
   has its own self-check, which passes — but it only covers the pure `graceIsValid` maths. The
   defect was in the WIRING: the restore raised `isAdmin` and left `showAdminLogin` up, and the app
   renders under `!showAdminLogin`, so he got the PIN screen anyway. A green self-check on the pure
   half of a feature says nothing about the half that touches the screen. */
check(G14, 'restoring the grace period opens the gate as well as unlocking the vault',
  /if \(readGrace\(uid\)\) \{ setIsAdmin\(true\); setShowAdminLogin\(false\); \}/.test(appSrc) &&
  /setShowAdminLogin\(true\);/.test(appSrc),
  'the auth handler opens the master gate on every cold load and only handleAdminAuthSuccess ever ' +
  'closed it, so a restored session sat behind a modal he still had to type his PIN into — ' +
  'unlocking the door and leaving the curtain down reads to him as "the feature does not work"');
check(G14, 'only a deliberate lock destroys the grace record',
  /const handleAdminLogout = \(\) => \{\s*\n\s*clearGrace\(\);/.test(appSrc) &&
  !/graceRestoreTried/.test(appSrc),
  'the auth handler asserts setIsAdmin(false) on every cold load and can fire twice; a blanket ' +
  'clearGrace() reachable from that state deleted a VALID record on the second assert. Locking ' +
  'by hand is the one setIsAdmin(false) that means "keep it locked", so it is the one that clears');

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
  /\{!shellHidden && \(/.test(code(themeSrc).slice(Math.max(0, railGuardIdx - 900), railGuardIdx)) &&
  (code(themeSrc).match(/\{!shellHidden && \(/g) || []).length >= 2 &&
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
  /\{!shellHidden && \(/.test(strip(themeSrc)),
  'it sits in its own stacking context, so raising the gate z-index does NOT cover it, and a '
  + 'class-based hide is only as reliable as the stylesheet that happens to be loaded');
check(G16, 'App hands the theme the flag that hides it', /showAdminLogin=\{showAdminLogin\}/.test(appCode),
  'hiding it in the theme does nothing if the prop never arrives');
/* 🔴 AND THE SAME TRAP CAUGHT THE LOCKOUT SCREENS. Aldi, from the phone on 2026-09-01:
   *"i was on access denied ... and looks like the sidebar work in that screen"*. Access Denied and
   Can't-Verify-You-Yet are children of <BiohazardTheme> exactly like the gate, so their z-[9999]
   is trapped in the same `relative z-10` context and the rail painted over both. One flag now
   answers for all three states, which is why the guard is a named boolean rather than three
   inline conditions that can drift apart. */
check(G16, 'the shell also steps aside for both lockout screens, not only the gate',
  /const shellHidden = !user \|\| showAdminLogin\s*\|\| userRole === 'UNAUTHORIZED' \|\| userRole === 'OFFLINE_UNVERIFIED';/.test(code(themeSrc)) &&
  /userRole=\{userRole\}/.test(appCode),
  'a navigation rail floating over Access Denied offers tabs to an account the server just ' +
  'refused, and OFFLINE_UNVERIFIED is the same modal with a kinder message — both or neither');
/* ⚠️ THE GATE CAN NEVER COVER THE NAVIGATION PANEL BY Z-INDEX, and raising its number is exactly
   the fix that will be reached for. The gate is rendered as a CHILD of <BiohazardTheme>, so it
   lands inside the content div — and that div is `relative z-10`, a STACKING CONTEXT. Every
   z-index within it, `z-[9999]` included, is resolved against its own siblings and then the whole
   context is stamped at 10. The panel is a sibling of that div at `z-[90]`, so 90 beats 10 and a
   menu paints over a full-screen lock screen. He reported it twice before the reason was found.
   The panel steps aside instead. If the content div ever stops being a stacking context, come
   back and re-read this check — do not delete it. */
check(G16, 'the navigation steps aside for the gate, because it can never be covered by it',
  (strip(themeSrc).match(/!shellHidden && \(/g) || []).length >= 2 &&
  /print-reset relative z-10 flex-1/.test(strip(themeSrc)),
  'the edge ribbon and the panel itself both need the guard — one without the other still leaves ' +
  'a control drawn over the lock screen');
/* the claim is OPACITY, not the literal word "black" — the shell moved onto tokens 2026-08-15 and
   `--duke-well-solid` is #000000 in dark, the same paint. What must never come back is an alpha. */
check(G16, 'the gate backdrop is fully opaque',
  /z-\[9999\] bg-\[var\(--duke-well-solid\)\] flex/.test(appCode),
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
/* Pinned on the GATE, not on the spelling of the normalizer. This used to require the literal
   `typed.trim().toLowerCase()`, and went red when the comparison moved to the shared storeKey()
   — while the behaviour it exists to protect never changed. What matters is that the needle is
   normalised and that nothing is selected when it comes out empty; storeKey returns '' for '',
   '   ', null and undefined, and logicFixes.selfcheck asserts that on real values. */
check(G18, 'an empty or whitespace-only name never selects anything',
  /const needle = [^;\n]+;\s*if \(needle\)/.test(termSrc),
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
/* ⚠️ STRIP COMMENTS BEFORE GREPPING CSS, and prefer this over the raw text for anything that
   measures DISTANCE inside a rule. Group 45 learned it one way (a regex matched the prose that
   explained why something was NOT done); group 46 learned it the other way, which is worse
   because it fires late: `the theme switch turns white and black` used a `[\s\S]{0,300}?` window
   from the selector to a colour, and adding a four-line comment inside that rule pushed the
   colour past 300 characters. The check went red with nothing wrong in the CSS at all — a check
   that a COMMENT can break teaches people to delete comments. Defined here, next to the file it
   strips, so every later group can reach it. */
const noCmt = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
/* index.css was never read here, which is how slate scrollbars survived every palette sweep —
   the banned-hue check only ever looked at the shell, App and the player. It holds the body
   ground and the browser-chrome colours (scrollbar, caret, selection), so it is palette surface
   like any other file. */
const indexCss = fs.readFileSync('src/index.css', 'utf8');
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
/* ⚠️ ANCHORED ON THE GATE ITSELF, not on a span reaching forward to some rule inside it. This
   used to allow 2400 characters between the media query and `position: fixed`, and a comment
   added inside that span pushed the rule out of reach — the check then failed on prose, not on
   code. Third time this shape of regex has broken today. Anchor on something unique and short. */
const railGateAt = themeCss.search(/@media \(min-width: 1024px\) and \(hover: hover\) and \(pointer: fine\) \{/);
check(G25, 'the desk rail collapses to one circle, and opening it moves nothing',
  /\.kpm-rail-pod \{ display: contents; \}/.test(themeCss) &&
  /position: fixed; left: 0; right: auto; top: 0; bottom: 0;\s*\n\s*width: 64px; margin-right: 0;/.test(themeCss) &&
  /* 📏 THE POD SHRINKS, THE PANEL DOES NOT. His ask was that the dock be as tall as its buttons;
     the first attempt put `max-content` on the PANEL and broke the dock's shape, because that
     element is fixed, flexed AND `overflow: hidden` — a clipping box cannot be asked to measure
     the thing it clips. The panel paints nothing, so its height costs nothing; the capsule lives
     on the pod, so the pod is the only thing that had to change. */
  /\.kpm-rail-pod \{ height: max-content; max-height: calc\(100vh - 56px\); \}/.test(themeCss) &&
  !/\[data-kpm-rail\]\[data-kpm-rail\] \{\s*\n\s*position: fixed;[^}]*height: max-content/.test(themeCss) &&
  !/margin-right: -228px;/.test(themeCss) &&
  /\[data-kpm-rail\]\[data-kpm-rail\] \{ pointer-events: none; \}/.test(themeCss) &&
  /* right: 40px, not 4px — the pod went to 100px for the two columns, and 100 - 4 - 56 = 40 is
     what keeps the CLOSED capsule the same 56px circle in the same corner he signed off. Only
     the right edge and the height animate; the left edge never moves. */
  /\.kpm-rail-pod::before \{ left: 4px; right: 40px; top: 12px; height: 56px; border-radius: 999px; \}/.test(themeCss) &&
  /\.kpm-rail-totem \{[\s\S]{0,200}?top: 12px; left: 4px;/.test(themeCss) &&
  /* A MARGIN, not padding: padding kept the header's own surface underneath the collapsed logo —
     harmless while the band was transparent, wrong the moment it became a glass pane, because the
     pane then paints under the dock.
     📏 112px CLEARS THE OPEN PANE, NOT JUST THE CLOSED CIRCLE. His screenshot: *"i dont want the
     new header panel to collapse with the sidebar when open"*. 76px cleared the 60px circle but
     the OPEN pod is 100px wide, so the dock painted over the status dot and the first letter of
     the title. This number TRACKS `.kpm-rail-pod`'s width — change one, change both. */
  /* ⚠️ ANCHORED ON THE VALUE, NOT ON A SPAN FROM THE SELECTOR. A regex that reaches across the
     comment between a selector and its declaration breaks every time someone edits the prose —
     which is exactly what happened the first time this was written. The value is unique. */
  /margin: 12px 14px 4px 112px;/.test(themeCss) &&
  !/\.kpm-topbar\.kpm-topbar \{ padding-left: 76px; \}/.test(themeCss) &&
  /* 🔴 `:has(:focus-visible)`, NOT `:focus-within` — CHANGED 2026-08-15 ON HIS REPORT: *"when i
     hover the sidebar, and release it, the sidebar will remain open and i cant press any button
     on the features panel"*. `:focus-within` matches ANY focus, and a mouse click on a nav mark
     focuses it — so the dock stayed open after the pointer left, held there by the focus its own
     click had put inside it, lying over the workspace as a 351px column that ate the next click.
     The keyboard requirement this check was protecting is unchanged: a tab still opens the dock,
     because `:focus-visible` is exactly the focus a keyboard produces. */
  /:has\(:focus-visible\) \{ width: 351px/.test(themeCss) &&
  !/\[data-kpm-rail\][^\n]*:focus-within/.test(themeCss) &&
  /\[data-kpm-rail\] \.kpm-rail-pod > \* \{ animation: none; \}/.test(themeCss) &&
  /<div className="kpm-rail-pod">/.test(shellSrc) &&
  /<span className="kpm-rail-totem"/.test(shellSrc),
  'the pod is `display: contents` on a phone, so none of this reaches the layout he already ' +
  'signed off; and the open state must be keyboard-reachable — :has(:focus-visible), never ' +
  ':focus-within, which a mouse click also satisfies and which pinned the dock open over the app');
/* ⚠️ A RULE THAT EXISTS FOR TWO SCREENS AND NOT THE THIRD. `.kpm-rail-totem` had a desk-with-hover
   rule (it becomes the collapsed circle) and a desk-without-hover rule (hidden), and the phone —
   which matches neither media query — fell through to a bare inline <span>. It therefore drew the
   ACTIVE TAB'S OWN ICON a second time above the grid, which is what he photographed twice on
   2026-08-15. The shape to remember: when a class is only ever styled inside media queries, ask
   what it looks like OUTSIDE them, because that is a real screen too.
   Deleting the span was the wrong fix and would have taken the desk's collapsed state with it. */
/* ⚠️ ANCHORED ON TWO UNIQUE VALUES, not on `@media (min-width: 1024px) {` — that string appears
   several times in this file and `.search` returns the FIRST, which put the gate 28,000 characters
   too early and failed this check on its first run. Same lesson as the three regexes above: pick
   an anchor that occurs once, and verify the count rather than assuming it. */
const railPhoneAt = themeCss.search(/\.kpm-rail-word \{ display: none; \}/);
const railDeskAt = themeCss.search(/\[data-kpm-rail\] \{ width: 144px; \}/);
const totemPhoneAt = themeCss.search(/\.kpm-rail-totem \{ display: none; \}/);
check(G25, 'the phone never prints the active tab icon a second time in the corner',
  railPhoneAt > -1 && totemPhoneAt > railPhoneAt && totemPhoneAt < railDeskAt &&
  /\.kpm-rail-totem \{\s*\n\s*display: flex;/.test(themeCss),
  'the totem must be hidden at file scope — before any width gate — and switched back on only ' +
  'by the hover-desk block; a phone rail is never collapsed, so on a phone it is pure duplication');
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
  /html\.lite-mode \.kpm-rail-pod::before \{\s*\n?\s*background-color: var\(--glass-solid\)/.test(themeCss) &&
  /@supports not \(\(backdrop-filter: blur\(1px\)\)[\s\S]{0,220}?background-color: var\(--glass-solid\)/.test(themeCss) &&
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
  /\.kpm-theme-switch \{[\s\S]{0,300}?background-color: #0f0e0d/.test(noCmt(themeCss)) &&
  /\.kpm-theme-switch\.is-light \{ background-color: #f3efe6/.test(noCmt(themeCss)) &&
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
  /* 🔴 THE FLEX BASIS IS THE LOAD-BEARING HALF, not the max-height. `auto-rows: minmax(0,1fr)`
     resolves only against a DEFINITE height. While the pod was full-height the grid inherited one
     and the cells came out 44x44; the moment the pod became `max-content` for his "follow how many
     buttons" ask, the grid's height went indefinite and every row collapsed to its icon.
     MEASURED in an isolated box chain, same nesting, 768px frame:
       `flex: 1 1 0%`            → cells 44 x 17, NOT square  ← the "it brokes" screenshot
       `flex: 0 1 var(--cap)`    → cells 44 x 44.9, square, pod 593px
     `0 1` keeps it shrinkable so a short screen squeezes the rows instead of clipping a tab. */
  /\[data-kpm-rail\] \.kpm-rail-grid \{\s*\n?\s*flex: 0 1 var\(--cap, auto\); max-height: var\(--cap, none\); align-content: center;/.test(themeCss) &&
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
/* ⚠️ DO NOT WRAP THIS IN `strip()`. It was tried on 2026-08-15 — the count had just found a
   COMMENT that quoted this needle, and stripping comments looked like the clean fix. It is not:
   `strip`'s non-greedy `/* … *​/` pair swallows real code in CustomerManager.jsx and silently
   dropped one of its two genuine delete buttons. A needle that under-counts is far worse here
   than one that over-counts — over-counting fails loudly and gets read, under-counting hides
   exactly the lost control this check exists to catch.
   The fix is the other way round: do not quote this needle verbatim in any comment. */
const delMarks = DEL_FILES.reduce((n, f) =>
  n + (fs.readFileSync(f, 'utf8').match(/<button data-kpm-del data-label="Delete"/g) || []).length, 0);
/* 18 → 17 on 2026-08-13, and this is a REAL change, not a loosened needle: the tenant registry's
   delete button stopped being icon-only. It now reads "Delete" inside the record's action strip,
   and the rule above says a button carrying its own word must NOT be marked, or the label prints
   twice. If this number drops again without a word button appearing, something was lost.
   17 → 16 on 2026-08-15, the same change for the same reason: the biometric device list became
   `.kpm-rec` records when Security joined the control system, so its trash glyph is now a "Revoke"
   button in the record's action strip. The word is checked one line below — the pair of edits is
   what makes this a migration rather than a loss. */
/* 15 → 14 on 2026-08-15, third time and the same reason: the customer-tier row became a
   `.kpm-rec` record when Tiers & Logic joined the control system, so its trash glyph is now a
   "Delete rank" button in the record's action strip. The word is checked in group 35 — the pair
   of edits is what makes this a migration rather than a loss. */
/* 14 → 13 on 2026-08-15, fourth time, same reason: the permission matrix's MOBILE rank delete
   became a worded "Delete" in the record's action strip when the matrix joined the control
   system. Its DESKTOP twin is still a 12px glyph in a table header with no room for a word, so
   that one stays marked — and this run is also where the needle's strictness earned its keep:
   writing `<button type="button" data-kpm-del …>` silently unmarks a button, because the needle
   requires the attribute first. The count caught it; nothing else would have. */
/* 13 → 14 on 2026-08-15, and this one goes UP, which is the first time. The customer-tier row was
   compacted to a single line on his *"too large … smaller compact minimalistic"*, and a one-line
   row has no room for the word — so that delete went back to a glyph and back under the sweep.
   The word and the mark are alternatives, and which one is right follows the row's width. */
/* 14 → 13 on 2026-08-26, fifth time and the same reason: the Restock Vault became one surat-jalan
   desk, and its ledger rows now open into a document whose action strip has room for words. Both
   deletes there — the inbound record and the outbound shipment — read "Hapus" beside the glyph, so
   neither may be marked or the label prints twice. The words are checked one line below; the pair
   of edits is what makes this a migration rather than a loss. */
/* 13 → 12 on 2026-08-27, sixth time, same migration as the fifth: the HQ request queue left the
   Global Logistics panel for the Restock Vault desk's Request tab. The queue's row carried an
   icon-only trash glyph; the desk's row opens into the drawer whose action strip already reads
   "Hapus" beside its glyph — the very delete counted one check below. So the glyph did not go
   away, it arrived somewhere with room for the word. If the Request tab ever grows its own
   icon-only delete, this count goes back to 13. */
check(G25, 'every icon-only delete button in the app wears the expanding control', delMarks === 12,
  `found ${delMarks} marked, expected 12 — a new icon-only delete button needs ` +
  '`data-kpm-del data-label="Delete"` on it, and one that carries its own word ("Remove", "DEL") ' +
  'must NOT be marked or the label prints twice');
/* the other half of that migration: the count may only drop because a WORD replaced the glyph. */
const restockDelWords = (fs.readFileSync('src/RestockVaultView.jsx', 'utf8').match(/Hapus<\/button>/g) || []).length;
check(G25, 'the two Restock Vault deletes say their own word instead', restockDelWords >= 2,
  `found ${restockDelWords} worded deletes in the Restock Vault, expected at least 2 — the count ` +
  'above dropped to 13 because these two stopped being glyphs. If the words go, the marks must return');
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
/* ═══ THE HEADER IS THE DOCK'S TWIN ═══ his ask, 2026-08-15: *"i want it to be in theme with this
   app and also change the background"*.
   The band was a hairline rule on a flat wall while the dock had become a floating capsule with a
   lit edge — one side of the shell floated and the other was a line. Now both are panes on one
   lit ground, which is the "in theme" he was asking for.
   The header's glass is deliberately WEAKER than the dock's (blur 18 vs 30): the dock is what you
   reach for, the header is what you read, and two panes shouting at the same volume is how a
   shell reads as busy. If the dock's blur ever changes, this stays below it. */
check(G25, 'the header floats on the same ground as the dock, and survives Lite Mode',
  /backdrop-filter: blur\(18px\) saturate\(1\.5\)/.test(themeCss) &&
  /html\.lite-mode \.kpm-topbar\.kpm-topbar \{[\s\S]{0,200}?backdrop-filter: none/.test(themeCss) &&
  /* 🔴 WAS `#14110e`, AND THE CHECK WAS PROTECTING THE BUG. Aldi, 2026-08-16: *"the lite light
     mode causing the system active settings text to gone, since it causing the background for
     that top panel to be black. lite item use to sacrifice the animation but not the color"*.
     Lite Mode strips the blur, so an opaque fallback is load-bearing — but the fallback was a
     fixed near-black, so Lite Mode in LIGHT mode painted the bar black under light-mode ink.
     ⚠️ LITE MODE MAY CHANGE MOTION AND EFFECTS. IT MAY NEVER CHANGE A COLOUR. */
  /html\.lite-mode \.kpm-topbar\.kpm-topbar \{\s*\n?\s*background-color: var\(--glass-solid\)/.test(themeCss) &&
  (() => {
    const v = [...themeCss.matchAll(/--glass-solid:\s*(#[0-9a-fA-F]{6})/g)].map(m => m[1]);
    return v.length === 2 && v[0].toLowerCase() !== v[1].toLowerCase();
  })() &&
  /* the ground exists at all — glass over a flat wall is a grey rectangle, and both panes were
     spending a blur on nothing until the body got a light source */
  /background-attachment: fixed;/.test(indexCss) &&
  /* ⚠️ THE GLOW MOVED OUT OF THIS FILE AND INTO A TOKEN, 2026-08-16, and this clause moved with
     it. It used to pin `rgba(255, 157, 0, .13)` here — which was the same statement as "there is
     a lit corner" only while the corner was a literal, and a literal is exactly what made the
     page ignore light mode. Both halves of the claim survive: the gradient still names the
     token, and the token still carries its agreed DARK value. */
  /radial-gradient\(58% 44% at 4% -4%, var\(--ground-glow\)/.test(indexCss) &&
  /--ground-glow:\s*rgba\(255, 157, 0, \.13\)/.test(themeCss),
  'a 4%-tinted bar with the blur stripped is an invisible header — Lite Mode strips exactly that, ' +
  'so the opaque ground is not decoration; and the ground must stay BEHIND the blur, never in the ' +
  'same declaration, or there is nothing left to see through');
/* 🔴 PALETTE LAW, THE GAP THAT LET SLATE SHIP. The banned-hue sweep below reads the shell, App and
   the player — and `src/index.css` is none of the three, so every scrollbar in the app sat at
   #cbd5e1 / #94a3b8 / #475569 / #64748b. Slate IS the blue. Text selection and the caret were
   browser-default blue for the same reason: nobody had drawn them, so nobody had checked them. */
/* ⚠️ THE LITERALS BECAME TOKENS ON 2026-08-16 AND THIS CHECK MOVED WITH THEM — third time in one
   day that a check pinning a hex broke on the hex being CORRECTLY replaced. The scrollbar was
   drawn in fixed dark browns, so on the new cream page it was a dark bar down the side: on the
   palette, but only in one theme. Being on the palette was never the whole claim — it has to be
   on the palette THE PAGE IS CURRENTLY WEARING.
   The claims that actually matter: we draw all four surfaces rather than inheriting a browser
   default, Firefox gets its own rule because it ignores ::-webkit entirely, and the scrollbar
   changes theme with the page. */
check(G25, 'the parts nobody draws are on the palette too — scrollbar, selection, caret',
  !BANNED_HUE.test(indexCss) &&
  /::-webkit-scrollbar-thumb \{\s*\n?\s*background: var\(--scroll-thumb\);/.test(indexCss) &&
  /scrollbar-color: var\(--scroll-thumb\) transparent;/.test(indexCss) &&
  /::selection \{\s*\n?\s*background: rgba\(255, 157, 0, \.28\)/.test(indexCss) &&
  /caret-color: #ff9d00;/.test(indexCss) &&
  /* and the thumb is a real pair, not one value wearing a token's name */
  ['--scroll-thumb', '--select-ink'].every(t => {
    const v = [...themeCss.matchAll(new RegExp(t + ':\\s*(#[0-9a-fA-F]{6})', 'g'))].map(m => m[1]);
    return v.length === 2 && v[0].toLowerCase() !== v[1].toLowerCase();
  }),
  'a scrollbar, a caret and a selection highlight ship with defaults that belong to no design ' +
  'system — and Firefox ignores ::-webkit entirely, so scrollbar-color is a second rule, not a ' +
  'duplicate of the first');
/* 📏 THE LOGOUT CAPSULE MUST NOT LEAVE THE DOCK. His report: *"when it expand the animation go
   outside the sidebar box"* — `.kpm-expand` grows to 136px and the pod is 100px, so the red slab
   crossed the capsule's edge. The rail gets its own narrower expansion.
   ⚠️ THIS IS AN ARITHMETIC CONSTRAINT, NOT A PREFERENCE, and all three of his asks only fit
   together because the WORD is short. Measured with the real face at 10px/.12em:
     96 - 2 border - 12 icon margin - 16 icon - 42 label = 24px clear air (the gap he asked for)
     "EXIT" = 26px and fits the 42px box · "LOGOUT" = 48px · "LOG OUT" = 52px — neither fits.
   So a longer word here silently pushes the capsule back outside the dock. The full phrase lives
   on `title` and `aria-label`, where it costs no width. */
check(G25, 'the logout capsule expands INSIDE the dock, and its word fits the room',
  /\[data-kpm-rail\] \.kpm-expand:hover,[\s\S]{0,140}?\{ width: 96px; \}/.test(themeCss) &&
  /\[data-kpm-rail\] \.kpm-expand:hover::after,[\s\S]{0,180}?\{ width: 42px; padding-right: 12px; \}/.test(themeCss) &&
  /data-label="Exit"/.test(shellSrc) &&
  /aria-label="Log out"/.test(shellSrc),
  'the rail is 100px wide and .kpm-expand grows to 136px everywhere else, so the rail needs its ' +
  'own narrower expansion — and the label has to be a word that fits 42px, or it leaves the dock ' +
  'again no matter how narrow the button is');
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
/* ⚠️ ONE LINE IS EXEMPT, AND THE EXEMPTION IS NARROW ON PURPOSE — 2026-08-15, on his word:
   *"yeah of course do use the shadow for normal mode"*. The permission switch's ON knob wears the
   amber halo from the video he recorded.
   The rule this check enforces is *nothing DEPENDS on a shadow*, not *no shadow exists*. That
   switch's state is already carried twice over without it — the knob's POSITION and the amber
   fill — so Lite Mode dropping the halo costs atmosphere and no meaning. The emerald toggles it
   replaced were the exact opposite: the glow WAS the state, and Lite Mode made the grid
   unreadable. That is the line, and it is the only reason this passes.
   The exemption is a single named selector, not a relaxed pattern: any OTHER shadow anywhere in
   the system still fails here, which is what keeps this check worth having. */
const SHADOW_EXEMPT = /\[aria-pressed="true"\] > \.kpm-sw::after \{[^}]*\}/g;
/* ⚠️ `transition:` DECLARATIONS ARE STRIPPED FIRST, and that is a sharpening rather than a
   loosening. A transition list PAINTS NOTHING — naming `box-shadow` in one only says how a
   shadow would arrive if some other rule created it. Leaving them in made this check fail on the
   line that animates the exempt glow, which is a false positive: the very next thing anyone would
   do is widen the selector exemption, and that is how a real check quietly stops being one. */
const paintOnly = (s) => s.replace(SHADOW_EXEMPT, '').replace(/transition:[^;}]*[;}]/g, '');
check(G30, 'nothing in the system depends on a shadow, a blur or a filter',
  !/box-shadow|backdrop-filter|filter:|text-shadow/.test(paintOnly(systemBlock)) &&
  /\[aria-pressed="true"\] > \.kpm-sw::after \{[^}]*transform: translateX\(18px\)/.test(themeCss),
  'Lite Mode deletes all four — the old tab put every separation into shadows, so on a cheap ' +
  'Android the six panels collapsed into one undifferentiated column. The switch glow is the one ' +
  'exemption and it only holds while position + fill still carry the state without it');
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
/* 🔴 THE PROXIMITY INVERSION. His report, 2026-08-15: *"i want u to give more space between
   features because all of it looks to close together i thought it is the same components"*. He was
   right and it was measurable: modules sat at 0px with one 1px line between them, while each
   module's OWN head→shelf waist carried TWO stacked lines (--line + --line-2) at 0px. The inner
   division was heavier than the outer one, so the eye grouped across module boundaries.
   The scale must only ever grow outward. If a future edit makes any inner number reach an outer
   one, this check goes red before he has to see it again. */
check(G30, 'the module spacing scale only ever increases outward',
  /\.kpm-mod \+ \.kpm-mod \{ margin-top: var\(--s5\); \}/.test(themeCss) &&
  !/\.kpm-mod \+ \.kpm-mod \{ border-top: 0; \}/.test(themeCss) &&
  /\.kpm-shelf \{ padding: var\(--s4\); display: flex; flex-direction: column; gap: var\(--s3\);/.test(themeCss) &&
  /\.kpm-head \{ padding: var\(--s4\);/.test(themeCss) &&
  /\.kpm-band \{[\s\S]{0,160}?margin-top: 40px;/.test(themeCss),
  'the ladder is 12px between controls, 16px of module padding, 20px between modules, 40px ' +
  'between groups — two levels tying is what made three instruments read as one striped panel');
/* 🎚️ OPTION C, his pick from the button-weight board. *"elegant should look little bit smaller"* —
   and the height could not move, because 44px is rule 3 and the smallest target a thumb hits.
   What shrank is the WIDTH and the INK. The min-height clause below is the load-bearing half: it
   is what makes "looks smaller" true and "is smaller" false. */
check(G30, 'the button looks smaller without the tap target shrinking',
  /\.kpm-btn \{[\s\S]{0,200}?min-height: 44px;[\s\S]{0,120}?background: transparent;/.test(themeCss) &&
  /\.kpm-btn \{[\s\S]{0,300}?font-size: 12px;\s*\n?\s*letter-spacing: \.12em;/.test(themeCss) &&
  /\.kpm-acts \{ display: flex; flex-wrap: wrap; gap: var\(--s2\); justify-content: flex-end; \}/.test(themeCss),
  'if min-height ever drops below 44px the screen stops being usable one-handed in a warehouse, ' +
  'which is the whole reason the height was never the thing to shrink');
/* 🟡 AMBER IS RATIONED. *"i feel like there is too much yellow gold color ... more black and white"*.
   A live module carried four amber marks; a signal that is everywhere is not a signal. Amber now
   marks the STATE and the ACT — the stripe and the readout — never the label. */
check(G30, 'amber marks the state and the act, never the label',
  /\.kpm-mod\.live \.kpm-head \.slot   \{ color: var\(--ink-dim\); \}/.test(themeCss) &&
  /\.kpm-mod\.live \.kpm-head h3 \{ padding-bottom: 5px; border-bottom: 1px solid var\(--line-3\);/.test(themeCss) &&
  /\.kpm-mod\.live   \{ border-left-color: var\(--accent-edge\); \}/.test(themeCss),
  'the slot code and the rule under the title went neutral; the stripe and .kpm-read.on keep it. ' +
  'Four amber marks per module is how an accent turns into the body colour');
check(G30, 'a module has exactly one internal seam, and it is the quiet one',
  /\.kpm-shelf\.split \{ border-top: 0; \}/.test(themeCss) &&
  /\.kpm-head \{ padding: var\(--s4\); border-bottom: 1px solid var\(--line\);/.test(themeCss),
  'the head drew the seam in --line and the shelf drew a second one under it in the brighter ' +
  '--line-2; inside an object a seam must be the faintest mark, never brighter than its edge');
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
/* ⚠️ NEEDLE MOVED 2026-08-15, and it is a real change, not a loosened check. It used to require
   `background-image: var(--hatch-danger)` on the hazard head — a red wash under a red texture,
   above buttons that were also red-hatched. His screenshot: *"u can add red but not this much
   especially on few buttons and panel ... i dont want red color to dominate certain features"*.
   The head must still be DISTINCT (his older "too standardise" complaint, which stands) — it just
   carries the distinction in a 2px danger RULE and a red title rather than in a red ground.
   Both halves are asserted, so neutralising the head completely would still fail. */
check(G31, 'each kind wears a different head, without red owning the surface',
  /\.kpm-mod\.live \.kpm-head\s*\{[^}]*background-image/s.test(themeCss) &&
  /\.kpm-mod\.hazard \.kpm-head \{ background-color: var\(--inset\);\s*\n\s*background-image: none;\s*\n\s*border-bottom: 2px solid var\(--danger\); \}/.test(themeCss) &&
  /\.kpm-mod\.hazard \.kpm-head h3 \{ color: var\(--danger-ink\)/.test(themeCss) &&
  !/\.kpm-btn\.hazard \{[^}]*background-image/s.test(themeCss),
  'same head on every module is the "too standardise" complaint; a head drowned in red is the ' +
  'opposite complaint. Red marks it — 5px stripe, 2px rule, title, chip — and does not upholster it');
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
/* ⚠️ THIS ASSERTS THE RELATIONSHIP, NOT THE NUMBERS — rewritten 2026-08-16, and the reason is
   written up one group over. It used to pin `#6B4A05`, and on the day that value was MEASURED in
   a browser for the first time it turned out to be 3,73:1 on the steel ground — his report,
   *"lock terminal also looks so dark in light mode"*. Fixing the colour then broke the check that
   existed to protect the colour. Group 39 already carries the same lesson in its own words: a
   check that freezes a value a measurement later moves is just a second thing to fix.
   The invariant is that all three inks go DARKER in light, which is what makes them legible on a
   pale ground at all. The ratios belong to contrast.selfcheck.mjs, which measures. */
const lumOf = (hex) => {
  const c = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const themedInks = ['--accent-ink', '--accent-edge', '--danger-ink'];
const notDarkened = themedInks.filter(t => {
  const v = [...themeCss.matchAll(new RegExp(t + ':\\s*(#[0-9a-fA-F]{6})', 'g'))].map(m => m[1]);
  return v.length !== 2 || lumOf(v[1]) >= lumOf(v[0]);
});
check(G32, 'the light theme darkens all three', !notDarkened.length,
  'not darker in light: ' + notDarkened.join(' ') + ' — if these stay at the dark values the ' +
  'light theme is back to 1,19:1 and he cannot read the button that provisions accounts');
/* ⚠️ ANCHORED ON A PROPERTY BOUNDARY, 2026-08-15. The bare `color: var(--gold)` needle also matched
   `accent-color: var(--gold)` on a range input — a substring, not a text colour, and a slider thumb
   is a fill. It failed on correct code. A needle that can match INSIDE a longer property name will
   eventually do exactly that; require the start of a declaration. */
check(G32, 'the control system spends the readable tokens, never --gold or --danger-text as text',
  !/(?:^|[;{]\s*)color: var\(--gold\)/m.test(systemBlock) &&
  !/(?:^|[;{]\s*)color: var\(--danger-text\)/m.test(systemBlock),
  'this is the exact line that shipped broken: .kpm-btn.key { color: var(--gold) }');

/* ═══ PHASE 6 · SECURITY & DATA JOINS THE CONTROL SYSTEM (2026-08-15) ═══════
   Aldi: *"we have the theme set yet, other will just follow make it somewhat follow that"* — the
   Architect terminal is the template and the remaining tabs are conversions, not redesigns.
   Scoped to the security block alone: General and Tiers are still Phase 6's later slices, and
   asserting them here would report a failure that belongs to a change nobody has made yet. */
const G33 = '33. Security & Data is the same app as the Architect terminal';

const secStart = settingsSrc.indexOf("activeTab === 'security'");
const secEnd = settingsSrc.indexOf('WORKSPACE: ARCHITECT TERMINAL');
const sec = secStart > 0 && secEnd > secStart ? settingsSrc.slice(secStart, secEnd) : '';

/* The empty-string green, again. Rename either marker and every check below passes on ''. */
check(G33, 'the security block was found at all', sec.length > 1000,
  'the markers this group slices between were renamed — every check below would pass on an ' +
  'empty string, which is the worst kind of green');
check(G33, 'the security tab carries no blue, no green, no slate',
  !offToken.test(sec),
  'palette law: slate IS the blue and emerald IS the green. This tab held the last bright blue ' +
  'left in the app — the biometric device card — plus emerald status tiles and slate everywhere');
check(G33, 'every module declares what kind it is, and prints its slot',
  (sec.match(/kpm-mod (bench|live|hazard)/g) || []).length >= 7 &&
  (sec.match(/<span className="slot">/g) || []).length >= 7,
  'a module with no kind is a card again — the kind is what grades authority by material rather ' +
  'than by colour, which is the one thing Lite Mode cannot strip');
/* 🔑 THE POINT OF THE WHOLE REGROUPING. Restore replaces the entire database and used to be a
   dashed drop-zone at the foot of the backup card — quieter than the three download buttons above
   it. Wipe was red-on-red, which Lite Mode flattens to nothing. Both wear the stripe now. */
check(G33, 'everything irreversible is behind the hazard band and wears the stripe',
  /<div className="kpm-band hazard">/.test(sec) &&
  /kpm-btn hazard block[\s\S]{0,400}?handleRestoreData/.test(sec) &&
  /* the three wipes moved to HoldButton on 2026-08-15 — same hazard weight, plus 1.6s of
     deliberate pressure. Restore keeps the plain hazard button because the OS file picker is
     already its deliberate step. */
  (sec.match(/<HoldButton onConfirm=\{\(\) => handleWipeData\('(products|customers|both)'\)\}/g) || []).length === 3,
  'restore and the three wipes are the only acts on this screen with no undo; if one of them ' +
  'renders as an ordinary button again the screen is lying about what it does');
check(G33, 'the rank source still has exactly one writer',
  (sec.match(/writeCareerLedger\(/g) || []).length === 2 &&
  /^const writeCareerLedger = /m.test(settingsSrc) &&
  !/useCareerLedger: newVal[\s\S]*useCareerLedger: newVal/.test(sec),
  'both switch positions must call the same writer — a copy of the write behind each position is ' +
  'how a setting saves on screen and never reaches the database');
/* MOUNT CHECK PER CONTROL. A cosmetic rewrite of a screen this size loses a button silently, and
   several of these have no other route in the app. */
for (const [what, needle] of [
  ['the master backup', 'onClick={handleMasterProtocol}'],
  ['the three single backups', "handleSingleBackup('CLOUD')"],
  ['the restore input', 'onChange={handleRestoreData}'],
  ['the PIN change', 'onClick={handleChangePin}'],
  ['the passkey registration', 'onClick={handleRegisterPasskey}'],
  ['the passkey revoke', 'handleRemovePasskey(device)'],
  ['the career rebuild', 'onClick={handleRecalculateCareer}'],
  ['the dataset export', 'handleExportGranular(item.type)'],
  ['the dataset import', 'handleImportGranular(e, item.type)'],
  ['the full wipe', "handleWipeData('both')"],
  ['the signed-in email', '{currentUserEmail || "—"}'],
]) check(G33, `${what} is still mounted in the tab`, sec.includes(needle),
  'a control that vanished in a restyle is silent — nothing errors, the button is simply not there');
/* 🔑 FULL WIDTH IS A SIGNAL NOW, NOT A DEFAULT. Option C hugs the word everywhere EXCEPT the four
   acts with no undo — restore and the three wipes. Wiping the database should stay the loudest
   control on the screen; elegance is not worth a mis-tapped wipe. If a routine act ever goes back
   to `block`, that hierarchy is gone and this check says so. */
check(G33, 'only the irreversible acts still claim the full width',
  (sec.match(/kpm-btn hazard block/g) || []).length === 1 &&
  (sec.match(/<HoldButton/g) || []).length === 3 &&
  !/kpm-btn(?! hazard)[a-z ]* block/.test(sec) &&
  (sec.match(/className="kpm-acts"/g) || []).length >= 4,
  'restore + three wipes are the only full-width acts; everything routine hugs its word');
/* 🔑 THE HOLD IS A GATE IN FRONT OF THE DIALOGS, NEVER INSTEAD OF THEM. The pasted component he
   liked runs click → spinner → "Complete!" with nothing in between; dropped in here as-is, one tap
   would wipe the database. Both `confirmAction` calls in handleWipeData must survive alongside it,
   and removing one is his explicit call to make, not a side effect of a nicer button. */
const holdSrc = fs.readFileSync('src/components/HoldButton.jsx', 'utf8');
check(G33, 'holding to confirm did not replace either wipe dialog',
  (appSrc.match(/if \(!await confirmAction\(/g) || []).length >= 2 &&
  /FINAL WARNING: This cannot be undone/.test(appSrc),
  'the hold costs 1.6s of deliberate pressure, which is a real gate — but the act it guards has ' +
  'no undo, and trading a confirmation for an animation is how a nicer screen loses a database');
check(G33, 'the hold reports its own result and survives Lite Mode',
  /data-phase=\{phase\}/.test(holdSrc) &&
  /const HOLD_MS = 1600;/.test(holdSrc) &&
  /keyHeld\.current/.test(holdSrc) &&
  /\.kpm-hold > \.fill \{[^}]*clip-path: inset\(0 100% 0 0\);/s.test(themeCss) &&
  !/\.kpm-hold[^{]*\{[^}]*(box-shadow|filter|backdrop-filter)/s.test(themeCss),
  'the sweep is clip-path + background-color only, so Lite Mode keeps it — and it has to, because ' +
  'the fill is the only thing saying how much longer to press. keyHeld guards the keydown repeat ' +
  'that would otherwise restart the timer forever and read as a broken button');
check(G33, 'the three backup states are still readable without colour',
  (sec.match(/className="kpm-rail"/g) || []).length === 3 &&
  /isRecoverySecure \? 'Secure' : 'Required'/.test(sec),
  'they were three pulsing tiles that said SECURE or REQUIRED in green and red; Lite Mode strips ' +
  'the colour and they became three identical boxes, so the word has to carry the state');

/* ═══ PHASE 6 · GENERAL & BRAND, SLICE 2 (2026-08-15) ══════════════════════ */
const G34 = '34. General & Brand is the same app as the Architect terminal';
const genStart = settingsSrc.indexOf("activeTab === 'general'");
const genEnd = settingsSrc.indexOf('WORKSPACE: TIERS & LOGIC');
const gen = genStart > 0 && genEnd > genStart ? settingsSrc.slice(genStart, genEnd) : '';

check(G34, 'the general block was found at all', gen.length > 1000,
  'the markers this group slices between were renamed — every check below would pass on ""');
check(G34, 'the general tab carries no blue, no green, no slate', !offToken.test(gen),
  'the emerald Lite Mode card, the blue bank-details field and the slate inputs are the ones ' +
  'this replaced; 67 off-token colours to zero');
check(G34, 'every module declares its kind and prints its slot',
  (gen.match(/kpm-mod (bench|live|hazard)/g) || []).length >= 6 &&
  (gen.match(/<span className="slot">/g) || []).length >= 6,
  'a module with no kind is a generic card again');
/* ⚠️ ONE WRITER, THIRD TIME. Lite mode is device-local so there is no Firestore write to drift —
   but two copies of any write drift, and the copy that drifts is the one nobody tests. */
check(G34, 'graphics mode has exactly one writer and both positions drawn',
  (gen.match(/writeLiteMode\(/g) || []).length === 2 &&
  /^const writeLiteMode = /m.test(settingsSrc) &&
  !/setIsLiteMode\(!isLiteMode\)/.test(gen),
  'the old control was a single toggle that asked him to remember which way "on" pointed, on the ' +
  'one setting whose whole audience is someone whose phone is already struggling');
/* 🔑 THE FINE IS ITS OWN MODULE ON PURPOSE. It came out of a real salesman's pay while sitting
   under a divider inside the letterhead card, where it read as one more invoice field. */
check(G34, 'the pita cukai fine is its own Tier-1 module, not an invoice field',
  /<h3>Lost pita cukai fine<\/h3>/.test(gen) &&
  /\{isSystemOwner && \(\s*\n\s*<div className="kpm-mod live">/.test(gen),
  'a control that charges a person money must not look like a field that prints an address');
for (const [what, needle] of [
  ['the letterhead save', 'onClick={handleSaveCompanyProfile}'],
  ['the signature name', 'adminDisplayName: val'],
  ['the bank details', 'bankDetails: val'],
  ['the cukai fine', 'cukaiFinePrice: val'],
  ['the mascot scale', 'mascotScale: scale'],
  ['adding a line', 'onClick={handleAddMascotMessage}'],
  ['editing a line', 'handleSaveEditedMessage(editingMsgIndex)'],
  ['deleting a line', 'handleDeleteMascotMessage(activeMessages[pick])'],
  ['the mascot picture', 'onChange={handleMascotSelect}'],
]) check(G34, `${what} is still mounted in the tab`, gen.includes(needle),
  'a control that vanished in a restyle is silent — nothing errors, the button is simply gone');
/* 🔑 A DROPDOWN, NOT A LIST. *"for the capybara dialogue u might need to make it dropdown menu
   instead, too many conversation for it"*. Every line used to render as its own row, so the module
   grew without limit and needed an inner scrollbar to survive — the thing he has banned twice. A
   picker plus two acts is a fixed height at any number of lines. */
check(G34, 'the mascot lines are a picker, not an unbounded list',
  /<select value=\{pick\} onChange=/.test(gen) &&
  !/activeMessages\.map\(\(msg, idx\) => \(\s*\n\s*<div key=\{idx\} className="kpm-rec">/.test(gen) &&
  !/max-h-\d+ overflow-y-auto/.test(gen) &&
  /const pick = Math\.min\(pickedMsg, Math\.max\(0, activeMessages\.length - 1\)\)/.test(settingsSrc),
  'the clamp is load-bearing: deleting the last line leaves the index past the end, and the next ' +
  'Delete would then act on undefined');
/* ── THE WATERMARK, 2026-08-15 ────────────────────────────────────────────────────────────────
   *"change the picture into watermarks and i want u to move the watermark panel just below the
   signature and bank panel"*. One picture had been doing two unrelated jobs: uploading it replaced
   the animated mascot with a still photo AND was the only candidate for the nota's mark, so a
   business document moved whenever he changed the mascot's face — his *"the picture is following
   the mascot image"*. These four checks hold the split. */
const histSrc = fs.readFileSync('src/components/HistoryReportView.jsx', 'utf8');
const prevSrc = fs.readFileSync('src/components/ReceiptPreview.jsx', 'utf8');
const wmCfg   = fs.readFileSync('src/config/receiptWatermark.js', 'utf8');
check(G34, 'the watermark panel sits directly below Signature & bank',
  gen.indexOf('<h3>Signature &amp; bank</h3>') > 0 &&
  gen.indexOf('<h3>Receipt watermark</h3>') > gen.indexOf('<h3>Signature &amp; bank</h3>') &&
  gen.indexOf('<h3>Receipt watermark</h3>') < gen.indexOf('<h3>Lost pita cukai fine</h3>'),
  'he asked for it in that exact position; a band reshuffle would move it without anything failing');
check(G34, 'the picture no longer replaces the mascot',
  !/staticImageSrc=\{/.test(appCode) && appCode.includes('receiptWatermark: finalImageUrl'),
  'passing it back would re-couple them and the nota would follow the mascot again');
/* 🔑 THE MARK GOES ON THE PAGE, NOT ON THE MODAL AROUND IT. First cut anchored it to
   `.print-receipt`, which for A4 is only the outer shell — that put it level with the action
   buttons instead of on the paper. `.a4-print-jail` IS the sheet and is already `relative`.
   Being inside that div is also what makes it A4-only for free: the branch never runs for the
   48mm thermal slip, which has no corner to spare and would print a grey mark as mud. */
const jailAt = histSrc.indexOf('a4-print-jail p-8');
check(G34, 'the nota mark sits inside the A4 sheet, not on the modal shell',
  jailAt > 0 && histSrc.indexOf('className={WATERMARK_POSITION}') > jailAt &&
  !/print-receipt[\s\S]{0,400}watermarkSrc/.test(histSrc),
  'anchored to the shell it lands beside the buttons, and the thermal slip would inherit it too');
/* ONE COPY OF THE GEOMETRY. Settings previews the mark so he can check it without printing —
   which it can only do if it agrees with what prints. Two hand-typed copies drift the first time
   one is nudged, and a preview that lies is worse than none because he would trust it. */
check(G34, 'the nota and the preview share one set of watermark numbers',
  histSrc.includes("from '../config/receiptWatermark'") &&
  prevSrc.includes("from '../config/receiptWatermark'") &&
  prevSrc.includes('style={WATERMARK_STYLE}') && !/opacity:\s*0\.\d/.test(prevSrc),
  'a preview that disagrees with the printed page is worse than no preview at all');
/* the migration now lives in one function instead of being retyped by each reader. The picture
   lived at `mascotImage` until the split; without this anyone who uploaded one earlier opens
   Settings to an empty frame and concludes the app threw it away. */
check(G34, 'a picture uploaded before the split still resolves',
  wmCfg.includes('appSettings?.receiptWatermark || appSettings?.mascotImage'),
  'dropping the fallback silently blanks the watermark of anyone who set one earlier');
/* 🔑 HIS ASK: *"can u add view receipt button just below the mascot watermark photo panel?"* —
   below the picker, because the question it answers belongs to the picker. */
check(G34, 'View receipt sits under the watermark picker',
  gen.indexOf('<h3>Receipt watermark</h3>') > 0 &&
  gen.indexOf('View receipt') > gen.indexOf('onChange={handleMascotSelect}') &&
  gen.indexOf('View receipt') < gen.indexOf('<h3>Lost pita cukai fine</h3>'),
  'above the picker it reads as a nav item; in another band it loses the question it answers');
/* ⚠️ THE PREVIEW MUST NEVER PASS FOR A REAL NOTA. It carries his real letterhead, signature,
   bank block and mark — the parts he is checking — so the invented goods are the one thing that
   could mislead. A preview mistaken for a genuine nota is a document handed to a customer. */
/* 🔍 ZOOM, his ask 2026-08-15: *"can u add zoom button to the receipt view"*. At fit the mark is
   ~27px — enough to see WHERE it sits, not enough to judge whether the picture survived being
   shrunk, which is the other half of what this screen is for. */
check(G34, 'the preview zoom is clamped at both ends',
  prevSrc.includes('Math.min(MAX_ZOOM, Math.max(MIN_ZOOM,') &&
  /disabled=\{zoom <= MIN_ZOOM\}/.test(prevSrc) && /disabled=\{zoom >= MAX_ZOOM\}/.test(prevSrc),
  'unclamped, one held press either collapses the page to nothing or scrolls it off the screen');
/* ⚠️ THE BACKDROP CLOSES ON CLICK. Without a stop on the toolbar, every press of + would zoom
   once and shut the preview in the same gesture — indistinguishable from a broken button. */
check(G34, 'the zoom bar does not close the preview it is zooming',
  (prevSrc.match(/onClick=\{\(e\) => e\.stopPropagation\(\)\}/g) || []).length >= 2,
  'one press would zoom and close at the same time, which reads as the button not working');
/* 🔑 A `transform` DOES NOT CHANGE THE SPACE AN ELEMENT RESERVES. Without a sizer at the scaled
   size the scroller believes the page is always 794x1123, so the scrollbars are wrong at every
   zoom except 100% and the bottom of the nota cannot be reached. */
check(G34, 'the zoomed page reserves its real space so it can be scrolled',
  /width: PAGE_W \* zoom, height: PAGE_H \* zoom/.test(prevSrc) &&
  /maxWidth: '100%', maxHeight: '72vh'/.test(prevSrc),
  'a centred flex child wider than its parent cannot be scrolled back to — the left edge is lost');
/* the whole page scales as ONE element, so the mark's size relative to the paper is never
   recomputed. Zoom magnifies the question; it must not change the answer. */
check(G34, 'zoom scales the whole page, never the mark on its own',
  prevSrc.includes('transform: `scale(${zoom})`') && prevSrc.includes('style={WATERMARK_STYLE}'),
  'scaling the mark separately would make the preview disagree with the printed page again');
check(G34, 'the preview says on its face that it is a sample',
  prevSrc.includes('Sample only · not a real transaction') && prevSrc.includes('PREVIEW ONLY'),
  'a preview that looks like a real nota eventually gets printed and handed over as one');

/* the four small parts this tab needed exist in CSS. Tailwind only emits a class it saw in source,
   and a class that exists in neither paints nothing — which looks like a transparent panel. */
for (const cls of ['.kpm-rowacts', '.kpm-inline', '.kpm-slider', '.kpm-portrait'])
  check(G34, `${cls} is defined in theme.css, not invented in the JSX`,
    themeCss.includes(cls + ' ') || themeCss.includes(cls + ' {') || themeCss.includes(cls + '{'),
    'an undefined class is the quietest possible bug: no error, no paint');

/* 🔑 THE SIZE SLIDER CALLS THE MASCOT OUT. His report, 2026-08-15: *"slider moved but mascot
   still not showing"* — which corrected an assumption written into the notes the hour before.
   The render gate `user && !showAdminLogin` (checked at line ~759) is genuinely open on this
   screen, and the mascot still is not on it: he lives at opacity-0 translate-x-[200%] and only
   leaves that state during a peek, which his own timer schedules every 90-210 SECONDS. An open
   render gate is not visibility. That is the whole lesson of this group — do not "fix" a
   report like this by widening a gate that was never shut. */
check(G34, 'moving the size slider calls the mascot out for five seconds',
  settingsSrc.includes("new CustomEvent('CAPY_COMMS', { detail: { peek: 5000 } })"),
  'without this the slider sizes something that is not on screen — pure guesswork');
/* 🔑 ORDER, AND IT IS THE WHOLE BUG THE SECOND TIME ROUND. His report: *"can u fix the size
   slider please, it still didnt show the mascot when i interact with it"*. The call sat LAST in
   the handler, behind `setDoc(doc(...))` — and `doc()` throws synchronously on a bad path, which
   would skip it while `setAppSettings` one line earlier had already moved the number. Slider
   moves, mascot never hears. Nothing may be inserted in front of `callMascot()`. */
check(G34, 'the mascot is called FIRST, before any Firestore write can throw',
  /onChange=\{\(e\) => \{ callMascot\(\); const scale = parseFloat/.test(gen),
  'a synchronous throw in doc() would swallow the call and the slider would look broken again');
/* he cannot act on a mascot he does not know is there: it is fixed to the bottom-right of the
   WINDOW and the slider is mid-page. This is also the diagnostic — notice but no capybara means
   the event fired and the fault is downstream in CapybaraMascot, not in the slider. */
check(G34, 'the slider says where the mascot went',
  gen.includes('Mr. Capy is out — bottom-right corner of the screen') &&
  settingsSrc.includes('const [capyOut, setCapyOut] = useState(false);'),
  'a five-second appearance in a corner he is not looking at is the same as no appearance');
check(G34, 'the mascot answers a peek that carries no line',
  capySrc.includes('if (incomingMessage || incomingPeek) {') &&
  capySrc.includes('}, incomingPeek || 8000);'),
  'the radio used to demand a message to show at all, so every appearance was a talking one');
/* *"just the idle animation"* — his words when asked what the mascot should DO while it is out.
   Two things have to hold for that: the peek must blank the line, and a blank line must still
   resolve to the idle sheet rather than the talking one. */
/* `showMascot` is `!suppressed && (isPeeking || propMsg)`, so a `suppressed` stuck true eats every
   peek and is indistinguishable from a dead button. An explicit peek releases it — safe because
   only the Settings slider sends one, and Settings and the sales terminal are different tabs. */
check(G34, 'an explicit peek releases the sales terminal mute',
  capySrc.includes('if (incomingPeek) setSuppressed(false);'),
  'a stale mute would silently swallow the peek and look exactly like the bug he reported twice');
check(G34, 'a silent peek shows the idle sprite, not the talking one',
  capySrc.includes('setInternalMsg(incomingMessage || "");') &&
  capySrc.includes("(activeMessage ? 'kpm-merch-talk' : 'kpm-merch-idle')"),
  'a peek that left a bubble up would be the mascot talking at him, which he did not ask for');

/* ── 35. TIERS & LOGIC — the last tab of Phase 6 ───────────────────────────────────────────────
   *"we have the theme set yet, other will just follow make it somewhat follow that"* — the
   Architect tab is the template and this is a CONVERSION, not a redesign. 106 off-token colours
   to zero. The controls here have no other route in the app: a rank list every customer is
   badged from, a company-wide kill switch, and rules that promote and demote people on their own.
   ⚠️ `PermissionMatrixEditor` RENDERS INSIDE THIS TAB BUT IS DEFINED SEPARATELY (~line 1345) and
   is NOT converted — about 80 off-token colours, deliberately left as its own slice. Scope the
   needle below to the tab's own markup or it reports a failure that belongs to that next slice. */
const G35 = '35. Tiers & Logic joins the control system';
const tierStart = settingsSrc.indexOf('WORKSPACE: TIERS & LOGIC');
const tierEnd = settingsSrc.indexOf('WORKSPACE: SECURITY & DATA');
const tiersBlk = tierStart > 0 && tierEnd > tierStart ? settingsSrc.slice(tierStart, tierEnd) : '';
/* ⚠️ COMMENTS STRIPPED, AND THE FIRST RUN IS WHY. The sled check below failed on the comment that
   EXPLAINS the sled was removed — it quoted the very class it forbids. A needle that reads code
   must be given code; otherwise documenting a rule is what breaks it. */
const tiersCode = strip(tiersBlk);

check(G35, 'the tiers block was found at all', tiersBlk.length > 1000,
  'the markers this group slices between were renamed — every check below would pass on ""');
check(G35, 'the tiers tab carries no blue, no green, no slate', !offToken.test(tiersCode),
  'an emerald Add button, an orange glowing toggle and slate inputs throughout — 106 to zero');
check(G35, 'no dark: variant survived the conversion',
  !/dark:/.test(tiersCode),
  'a dark: variant means the colour is hardcoded twice and light mode still has to be hand-built');
check(G35, 'every module declares its kind and prints its slot',
  (tiersCode.match(/kpm-mod (bench|live|hazard|idle|gate|arrive)/g) || []).length >= 3 &&
  (tiersCode.match(/<span className="slot">/g) || []).length >= 3,
  'a module with no kind is a generic card again');
/* 🚫 THE INNER SCROLLBAR HE HAS REJECTED TWICE. The tier row was a fixed-width sled inside a
   horizontal scroller, so a phone reached the delete button by dragging sideways. */
check(G35, 'no fixed-width sled and no inner scrollbar in the tier list',
  !/min-w-\[\d+px\]/.test(tiersCode) && !/overflow-x-auto/.test(tiersCode),
  'he has rejected the inner scrollbar twice; it came back here as a fixed minimum width');
/* 📏 BACK TO THE ICON AND THE SWEEP, 2026-08-15, on his *"customer tier panel is too large …
   smaller compact minimalistic"*. The stacked record became one row per rank, and a one-line row
   has no room for the word "Delete rank" — which is precisely the case `data-kpm-del` exists for:
   the glyph carries the act and the sweep prints the word on hover. Marked again, so the group-25
   count goes back up by one. The confirm dialog still names the rank before anything happens. */
check(G35, 'the compact tier row deletes by icon-and-sweep, not a bare glyph',
  tiersCode.includes('data-kpm-del data-label="Delete"') && !tiersCode.includes('Delete rank'),
  'a bare trash glyph with no label on a no-undo act is the thing the sweep was built to fix');
/* the row must stay a row: no fixed widths, so it wraps on a phone instead of growing a scrollbar */
/* ⚠️ THE NEGATIVE IS SCOPED TO THE RANK ROW, NOT TO `.kpm-rec` IN GENERAL — that was the first
   draft and it failed on correct code: the promotion-rules module below still uses `.kpm-rec`
   legitimately, for its rank name line. Fourth time this week a needle has been too broad. */
check(G35, 'a rank is one wrapping line, not a stacked record',
  /\.kpm-rank \{ display: flex; flex-wrap: wrap;/.test(themeCss) &&
  tiersCode.includes('key={tier.id || idx} className="kpm-rank"') &&
  !tiersCode.includes('key={tier.id || idx} className="kpm-rec"'),
  'the stacked version ran six ranks to a screen and a half to edit six words and six colours');
/* MOUNT CHECK PER CONTROL. None of these has another route in the app, and a control lost to a
   cosmetic edit is silent — nothing errors, the button is simply gone. */
for (const [what, needle] of [
  ['adding a rank', 'const newTiers = [...tierSettings, newTier];'],
  ['exporting ranks', 'onClick={handleExportTiers}'],
  ['importing ranks', 'onChange={handleImportTiers}'],
  ['the rank colour picker', 'newTiers[idx].color = e.target.value'],
  ['the badge-kind switch', "newTiers[idx].iconType = e.target.value"],
  ['uploading a rank logo', 'handleTierIconSelect(e, idx)'],
  ['deleting a rank', 'tierSettings.filter((_, i) => i !== idx)'],
  ['the permission matrix', '<PermissionMatrixEditor'],
  ['the fleet paintbrush switch', 'enableFleetPaintbrush: newVal'],
  ['saving the promotion rules', 'onClick={handleSaveTierRules}'],
]) check(G35, `${what} is still mounted in the tab`, tiersBlk.includes(needle),
  'a control that vanished in a restyle is silent — nothing errors, the button is simply gone');
/* 🔑 ONLY THE AUTOMATION IS A HAZARD. Red marks the one group that acts WITHOUT anyone pressing
   anything; the rank list and the paintbrush are ordinary live controls. Red on all three would
   be the wash he rejected: *"i dont want red color to dominate certain features of the app"*. */
check(G35, 'red marks the automatic promotions and nothing else on the tab',
  (tiersBlk.match(/kpm-(mod|band) hazard/g) || []).length === 2 &&
  tiersBlk.includes('<div className="kpm-band hazard">Automatic'),
  'red on the rank list too would be a wash again, and the one group that acts alone stops standing out');
/* the three parts this tab needed exist in CSS. Tailwind emits nothing for a class it never saw,
   and a class defined nowhere paints nothing — which reads as a transparent panel, not an error. */
for (const cls of ['.kpm-swatch', '.kpm-swatch-input', '.kpm-dot'])
  check(G35, `${cls} is defined in theme.css, not invented in the JSX`,
    themeCss.includes(cls + ' ') || themeCss.includes(cls + ' {') || themeCss.includes(cls + '{'),
    'an undefined class is the quietest possible bug: no error, no paint');
/* ⚠️ THE TIER'S OWN COLOUR IS CUSTOMER DATA AND STAYS INLINE. It is a real pin on a real map and
   the palette has no jurisdiction over it — the same exemption the printed nota gets. */
check(G35, "a tier's own colour is still set from its data, not from a token",
  tiersBlk.includes('style={{ borderColor: tier.color }}') &&
  tiersBlk.includes('style={{ backgroundColor: tier.color }}'),
  'tokenising this would paint every rank the same and the map would lose its ranks');

/* ── 36. THE COMMAND CENTER HEADER AND ITS TAB LIST ────────────────────────────────────────────
   His two screenshots, 2026-08-15: *"next we will need to redesign this set of buttons sc1. and
   also this part sc2"*. The open tab was a `bg-blue-600` pill — the palette law's own headline
   example, sitting in the most-looked-at spot on the settings screen — and the clearance line
   pulsed red forever. */
const G36 = '36. The Command Center chrome obeys the same laws as the rack';
const chromeStart = settingsSrc.indexOf('<div className="kpm-cmd">');
const chromeEnd = settingsSrc.indexOf("activeTab === 'general'");
const chrome = strip(chromeStart > 0 && chromeEnd > chromeStart ? settingsSrc.slice(chromeStart, chromeEnd) : '');

check(G36, 'the header and tab list were found at all', chrome.length > 400,
  'the markers this group slices between were renamed — every check below would pass on ""');
check(G36, 'the open tab is no longer a blue pill', !offToken.test(chrome),
  'bg-blue-600 for the open tab and bg-red-600 for Tier 1 — the two loudest fills in the app, ' +
  'spent on navigation that destroys nothing by being looked at');
/* 🔑 THE LITE MODE CONTRACT, AND THIS IS THE CASE THAT PROVES WHY IT MATTERS. The old pill said
   "open" with a blue fill AND a `shadow-md`. Lite Mode strips shadow and strips colour — so in
   Lite Mode the open tab and the closed tabs became identical. Selection must survive that:
   a raised SURFACE and a RAIL are material, and material is what Lite Mode keeps. */
check(G36, 'the open tab is marked by material, not only by colour',
  /\.kpm-nav > button\[aria-current="page"\] \{[^}]*background: var\(--raised\)/.test(themeCss) &&
  /\.kpm-nav > button\[aria-current="page"\] \{[^}]*border-left-color: var\(--accent-edge\)/.test(themeCss),
  'strip the colour and the open row must still be the open row — otherwise Lite Mode is broken, ' +
  'not lite');
check(G36, 'no shadow anywhere in the new chrome',
  !/shadow/.test(chrome) &&
  !/\.kpm-(nav|cmd)[^{]*\{[^}]*box-shadow/.test(themeCss),
  'shadow is banned system-wide; here it was also load-bearing, which made it worse');
/* one source of truth: `aria-current` is what a screen reader reads AND what the CSS selects on,
   so the visible state and the announced state cannot drift apart. */
check(G36, 'aria-current carries the open tab to both the screen reader and the CSS',
  /aria-current=\{activeTab === tab\.id \? 'page' : undefined\}/.test(chrome) &&
  themeCss.includes('.kpm-nav > button[aria-current="page"]'),
  'a class for the eye and nothing for the ear is how a tab list becomes unusable without sight');
/* ⚠️ RED AS A RAIL, NEVER A FILL — the same law as `.kpm-neg` and the hazard modules. */
check(G36, 'Tier 1 keeps its distinction as an edge, not a solid red pill',
  /\.kpm-nav > button\.tier1\[aria-current="page"\] \{ border-left-color: var\(--danger-rail\)/.test(themeCss) &&
  chrome.includes("tab.id === 'architect' ? 'tier1' : undefined"),
  'a solid red nav item spends the loudest signal in the app on a tab that destroys nothing');
/* his words, on the screenshot before this one: *"i dont want red color to dominate certain
   features of the app"*. A clearance line is a fact, and facts do not blink. */
check(G36, 'the clearance line states its fact without pulsing',
  !/animate-pulse/.test(chrome) && /\.kpm-cmd \.clearance\.tier1 \{ color: var\(--danger-ink\)/.test(themeCss),
  'an always-on throbbing red line is the domination he ruled out; --danger-text would also have ' +
  'been unreadable in light mode, which is what group 32 caught on the first run');
check(G36, 'every tab clears the 44px touch minimum',
  /\.kpm-nav > button \{[^}]*min-height: 48px/.test(themeCss),
  'the rack holds 44px everywhere; a nav list is the one place a thumb lands most often');
for (const [what, needle] of [['reset indicators', 'onClick={handleResetIndicators}'],
                              ['lock terminal', 'onClick={handleAdminLogout}']])
  check(G36, `${what} is still mounted in the header`, chrome.includes(needle),
    'a control that vanished in a restyle is silent — nothing errors, the button is simply gone');
for (const cls of ['.kpm-cmd', '.kpm-nav'])
  check(G36, `${cls} is defined in theme.css, not invented in the JSX`,
    themeCss.includes(cls + ' ') || themeCss.includes(cls + ' {') || themeCss.includes(cls + '{'),
    'an undefined class is the quietest possible bug: no error, no paint');

/* ── 37. THE PERMISSION MATRIX — the last panel of Phase 6 ─────────────────────────────────────
   *"then we can move on with the matrix"*. This is the one screen in the app where a single
   wrong pixel hands someone authority they should not have, so its checks are about STATE being
   unmistakable rather than about the panel being pretty. */
const G37 = '37. The permission matrix joins the control system';
const mtxStart = settingsSrc.indexOf('const PermissionMatrixEditor');
const mtx = mtxStart > 0 ? strip(settingsSrc.slice(mtxStart)) : '';

check(G37, 'the matrix component was found at all', mtx.length > 2000,
  'the marker this group slices from was renamed — every check below would pass on ""');
check(G37, 'the matrix carries no blue, no green, no slate, no rose', !offToken.test(mtx),
  'a rose heading, a glowing rose Deploy button, emerald ON toggles and slate everywhere — and ' +
  'rank names painted in purple, yellow, cyan and emerald at the same time, none from the palette');
/* 🔑 THE ONE THAT MATTERS MOST ON THIS SCREEN. Every enabled permission was emerald WITH a
   `drop-shadow` glow. Lite Mode strips shadow AND colour — so in Lite Mode an allowed permission
   and a blocked one were the same glyph in the same colour. On a permissions grid that is not a
   cosmetic bug, it is a screen that cannot be read at all. */
/* 🔀 A REAL SWITCH SINCE 2026-08-15, built from the video he recorded: *"i want u to make the
   toggle button for the matric to be like this video, amber suit our system well"*. The state is
   carried by the knob's POSITION — which survives Lite Mode, light mode, greyscale and a
   colour-blind reader — with amber as the fill on top of it. Two lucide glyphs swapped in and out
   could never have slid, and the slide is the half that does not depend on colour.
   ⚠️ The glow behind the knob in his video is deliberately absent: it is a shadow, and shadow is
   what made this exact grid unreadable in Lite Mode in the first place. */
/* ⚠️ THE GLOW IS ALLOWED HERE, AND THE REASON MATTERS. He asked for it on 2026-08-15: *"yeah of
   course do use the shadow for normal mode"* — it is the last piece of his reference video. It is
   safe ONLY because it is decoration: the knob's POSITION and the amber fill already carry the
   state, so Lite Mode stripping the halo costs atmosphere and no meaning. The old emerald toggles
   were the opposite — a glow that WAS the state — and that is what made this grid unreadable in
   Lite Mode. The check below therefore tests what has to remain true, not the absence of shadow:
   position and fill still say "on" by themselves, and Lite Mode still strips shadow globally. */
check(G37, 'an allowed permission is still obvious with colour stripped',
  !/drop-shadow/.test(mtx) &&
  /html\.lite-mode \*, html\.lite-mode \*::before, html\.lite-mode \*::after \{[^}]*box-shadow: none !important;/.test(themeCss) &&
  /\[aria-pressed="true"\] > \.kpm-sw::after \{ transform: translateX\(18px\)/.test(themeCss) &&
  /\[aria-pressed="true"\] > \.kpm-sw::before \{ clip-path: inset\(0 0 0 0\)/.test(themeCss) &&
  (mtx.match(/<span className="kpm-sw" aria-hidden="true" \/>/g) || []).length === 2,
  'colour alone cannot carry ON here: Lite Mode removes it and the grid becomes unreadable');
/* the knob is taller than its track and proud of both ends — the detail in his video that makes
   it read as a physical switch rather than a coloured bar. It is the RATIO that reads, not the
   size, which is why shrinking it on 2026-08-15 kept 26-in-20 with the same -2 offset. */
check(G37, 'the knob overhangs its track the way his reference does',
  /\.kpm-sw \{ position: relative; display: block; width: 40px; height: 20px/.test(themeCss) &&
  /\.kpm-sw::after \{[\s\S]{0,120}?width: 26px; height: 26px/.test(themeCss),
  'a knob that fits inside the track is a progress bar with a dot on it, not a switch');
/* 🔴 ANIMATE TRANSFORM AND OPACITY, NOTHING ELSE. His report: the switch *"look so kaku"* —
   stiff. Half of that was a real bug: the press animated the knob's `width`, `height` and
   `margin-top`, three LAYOUT properties, so every frame re-ran layout and paint instead of
   riding the compositor. The press is a `scale` now. */
check(G37, 'the switch press rides the compositor, never layout',
  /\.kpm-toggle:active > \.kpm-sw \{ transform: scale\(\.92\); \}/.test(themeCss) &&
  !/\.kpm-toggle:active > \.kpm-sw::after \{[^}]*(width|height|margin-top):/.test(themeCss),
  'animating width/height/margin re-runs layout every frame — that is what "kaku" felt like');
/* 🎨 THE FILL WIPES, IT DOES NOT CROSS-FADE. A `background` transition dissolves grey to amber
   through a dead muddy middle; `clip-path` uncovers it from the left so the colour arrives WITH
   the knob. And the knob overshoots ~6% and settles — a curve that only decelerates arrives and
   stops dead, which is the other half of what he called stiff. */
check(G37, 'the colour arrives with the knob, and the knob settles rather than stopping dead',
  /transition: clip-path 220ms cubic-bezier\(\.22, 1, \.36, 1\)/.test(themeCss) &&
  /transition: transform 240ms cubic-bezier\(\.34, 1\.56, \.64, 1\)/.test(themeCss),
  'a cross-fade through mud and a dead stop are exactly the two things he said were missing');
/* 📏 the width he was fighting: 12px padding both sides of every cell, a 44px toggle floor and an
   800px table floor. 6 / 40 / 560 now — a rank column is a quarter narrower. */
/* 🔴 HE ASKED TWICE. Narrowing the columns was the first answer and it could never have been
   enough: a width FLOOR of any size still overflows once there are enough ranks. `table-layout:
   fixed` divides the space the table HAS instead of measuring what its content wants, so ranks
   get narrower as they are added rather than pushing the grid off the screen.
   ⚠️ THE `min-width` FLOOR MUST NOT COME BACK. Re-adding one silently restores the drag. */
check(G37, 'the grid fits its container instead of sliding sideways',
  /\.kpm-matrix \{[^}]*table-layout: fixed/.test(themeCss) &&
  !/\.kpm-matrix \{[^}]*min-width:/.test(themeCss) &&
  /\.kpm-matrix th:first-child, \.kpm-matrix td:first-child \{ width: 30%/.test(themeCss) &&
  /\.kpm-matrix thead th \{ overflow-wrap: anywhere/.test(themeCss) &&
  /\.kpm-matrix th, \.kpm-matrix td \{ padding: 4px 6px/.test(themeCss) &&
  /\.kpm-matrix \.kpm-toggle \{ min-width: 40px; min-height: 32px; \}/.test(themeCss),
  'a fixed layout is what removes the drag; a min-width floor of any size brings it straight back');
/* 📏 HIS SCREENSHOT, 2026-08-15: *"there is so much space bro … make the space more even between
   the buttons and description"*. A row was 8px of padding around a 40px control — 56px of box
   holding a 20px switch — and the description column had 42% it never used, which is the empty
   half of that picture. The two numbers are checked together because they are one complaint. */
/* 🔴 *"the textbox on the bottom collapse with each other"*. A `<select>` with no width sizes to
   its LONGEST OPTION, and under `table-layout: fixed` the column cannot grow to fit it — so it
   spilled over its neighbour. Both halves are needed: `width: 100%` alone still loses to the
   intrinsic minimum without `min-width: 0`. */
check(G37, 'the authority dropdowns stay inside their own column',
  /\.kpm-matrix \.kpm-inline \{ width: 100%; min-width: 0; max-width: 100%;/.test(themeCss),
  'a select sizes to its longest option; in a fixed table that means it overlaps the next column');
check(G37, 'the rows are as tall as their switch, not twice it',
  /line-height: 1\.15/.test(themeCss) &&
  !/\.kpm-matrix th, \.kpm-matrix td \{ padding: var\(--s[3-9]\)/.test(themeCss),
  'a 20px switch in a 56px row reads as unrelated bands of empty, which is what he photographed');
/* what is drawn and what is announced come from ONE attribute, so they cannot drift. On this
   screen a toggle that reads "on" to a screen reader while drawn off is a security bug. */
check(G37, 'every permission toggle states its state to both eye and screen reader',
  (mtx.match(/aria-pressed=\{hasAccess\}/g) || []).length === 2 &&
  (mtx.match(/aria-label=\{`\$\{feature\.label\}/g) || []).length === 2,
  'a colour for the eye and nothing for the ear makes an authority grid unusable without sight');
check(G37, 'the phone rank picker says which rank is open',
  /aria-pressed=\{activeMobileTierId === t\.id\}/.test(mtx) &&
  themeCss.includes('.kpm-chips > button[aria-pressed="true"]'),
  'editing permissions without being certain which rank is selected is the worst kind of guess');
/* ⚠️ RED IS EARNED TWICE HERE AND NOWHERE ELSE ON THE PANEL: the band/module pair marking the
   whole thing Tier 1, and the `edit_` features, which grant the power to CHANGE data. Deploy is
   amber — it is the ACT, and it used to be a red button with a glow sitting ABOVE the grid it
   commits, so the loudest thing on screen was the one control you should reach last. */
check(G37, 'red marks the panel and the edit permissions, and Deploy is the amber act',
  (mtx.match(/kpm-(mod|band) hazard/g) || []).length === 2 &&
  mtx.includes("feature.id.includes('edit_') ? 'feat edit' : 'feat'") &&
  /className="kpm-btn key" onClick=\{saveMatrixToFirebase\}/.test(mtx),
  'a red Deploy taught the eye that red means "important" rather than "this cannot be undone"');
check(G37, 'Deploy sits after the grid it commits, not above it',
  mtx.indexOf('saveMatrixToFirebase}') > mtx.indexOf('<table className="kpm-matrix">'),
  'a commit button above its own form is reachable before the work it commits is done');
/* the drag-to-reorder is the only way to change the hierarchy; a restyle losing it is silent */
for (const [what, needle] of [
  ['drag to reorder ranks', 'onDragStart={(e) => handleDragStart(e, idx)}'],
  ['the drop target marker', "dragOverIdx === idx ? 'drop' : ''"],
  ['renaming a rank', 'onClick={() => handleRenameTier(tier.id)}'],
  ['adding a rank', 'onClick={handleAddTier}'],
  ['customer directory access', 'changeCustomerAccess(tier.id, v)'],
  ['reporting authority', 'changeReportAccess(tier.id, v)'],
]) check(G37, `${what} is still mounted`, mtx.includes(needle),
  'a control that vanished in a restyle is silent — nothing errors, the button is simply gone');
/* a raw Tailwind class stored as DATA is how four off-palette rank colours reached this screen
   without ever appearing in a className. Nothing reads the field; it went with the render. */
check(G37, 'a rank no longer carries a Tailwind class as data',
  !/color: 'text-/.test(mtx),
  'a colour hidden in a data record is invisible to every className-based palette check');
/* 🔴 HIS FIND, 2026-08-15: *"there is 2 default here"*. Both customer-access dropdowns listed a
   "not set" line AND a Global line under the same words, because getCustomerAccessLevel() resolves
   an absent permission to 'global' — ONE state wearing two names, and the second line could never
   be chosen because selecting it produced the first. The fix reads absent AS global; deleting an
   <option> that both <select>s were still VALUED at would have blanked the control for every tier
   nobody had ever set, on the screen that decides who may edit customers. */
check(G37, 'the customer-access dropdown offers each state exactly once',
  !/value: 'none',[^\n]*Global/.test(mtx) && !/<option value="none">Global/.test(mtx),
  'two lines reading the same words is a menu where one of them can never be selected');
check(G37, 'an unset customer access lands on Global instead of blanking the box',
  (mtx.match(/CUSTOMER_EDIT_PERMS\.includes\(p\)\) \|\| 'customers_edit_global'/g) || []).length === 2,
  'phone and desktop must fall back to the SAME state or one of the two shows an empty control');
check(G37, "Reporting authority keeps its 'none' — there it really means no access",
  /\{ value: 'none',\s+short: 'No access'/.test(mtx),
  'the two dropdowns look alike, but only one of them has a genuine off position');
/* one list each, read by the phone AND the desktop. Two copies of the wording is exactly how one
   of them came to carry a line the other did not. */
check(G37, 'both views read the same option lists',
  (mtx.match(/options=\{CUSTOMER_ACCESS_OPTIONS\}/g) || []).length === 2 &&
  (mtx.match(/options=\{REPORT_ACCESS_OPTIONS\}/g) || []).length === 2,
  'a second copy of the wording drifts from the first, silently, and only on one screen size');

/* ── the authority picker, his *"redesign and animate the dropdown for this"* ──────────────
   A native <select> draws its open list in the OS, out of CSS's reach, so matching the control
   system meant drawing it ourselves — and inheriting every behaviour the native one gave free.
   On the screen that decides who may edit what, those behaviours are the checks. */
const pick = fs.readFileSync('src/components/AuthoritySelect.jsx', 'utf8');
check(G37, 'no native <select> is left in the permission matrix',
  !/<select/.test(mtx),
  'one converted and one not is two different controls doing the same job on one panel');
/* ⚠️ THE CLIPPING TRAP. The desktop matrix sits inside `overflow-x: auto`. A popup rendered in
   place is cut off at that box's edge and scrolls away from its own trigger — it would look
   broken only on the desktop grid, which is the view this machine has never rendered. */
check(G37, 'the open list escapes the matrix scroller instead of being clipped by it',
  /createPortal\(/.test(pick) && /position: fixed/.test(themeCss.slice(themeCss.indexOf('.kpm-picklist'))),
  'a list drawn inside overflow-x: auto is clipped at the edge and scrolls away from its trigger');
/* the price of `fixed`: it cannot follow a trigger that moved, so it must not try */
check(G37, 'the list closes on scroll and resize rather than floating away',
  /addEventListener\('scroll', shut, true\)/.test(pick) && /addEventListener\('resize', shut\)/.test(pick),
  'a fixed box left open through a scroll ends up pointing at the wrong rank');
/* focus NEVER enters the list: one tab stop, arrows move a cursor the reader announces. Moving
   real focus into a popup is how custom pickers trap a keyboard. */
check(G37, 'the picker is fully operable from the keyboard',
  /aria-activedescendant=/.test(pick) &&
  ["'ArrowDown'", "'ArrowUp'", "'Home'", "'End'", "'Escape'", "'Enter'", "'Tab'"].every(k => pick.includes(k)),
  'a permissions control a keyboard cannot reach is not a style problem, it is a lockout');
check(G37, 'what is announced and what is saved come from the same value',
  /aria-selected=\{o\.value === value\}/.test(pick) && !/useState\(value/.test(pick),
  'a local copy of the choice is how a picker shows one permission while the matrix holds another');
/* Lite Mode force-kills every animation, so the entrance must be decoration only: the keyframe's
   end state has to equal the element's resting state or the list never appears there at all. */
check(G37, 'the list is visible with its animation stripped',
  /to\s+\{ opacity: 1; transform: none; \}/.test(themeCss) &&
  !/\.kpm-picklist \{[^}]*opacity: 0/.test(themeCss),
  'an element that starts hidden and is REVEALED by an animation stays hidden in Lite Mode');
check(G37, 'the saved choice is readable without colour',
  /<Check size=\{12\} aria-hidden="true" \/>/.test(pick) &&
  /\.kpm-picklist > li\[aria-selected="true"\] > svg \{ opacity: 1; \}/.test(themeCss),
  'an amber fill alone leaves the choice unreadable to an eye that cannot separate it');
for (const cls of ['.kpm-matrix', '.kpm-toggle', '.kpm-chips', '.kpm-permrow', '.kpm-permlist',
                   '.kpm-pick', '.kpm-picklist'])
  check(G37, `${cls} is defined in theme.css, not invented in the JSX`,
    themeCss.includes(cls + ' ') || themeCss.includes(cls + ' {') || themeCss.includes(cls + '{'),
    'an undefined class is the quietest possible bug: no error, no paint');

/* ── 38. light mode is actually reachable ────────────────────────────────────
   🔴 IT NEVER WAS. Found 2026-08-15, the first day the light theme was pointed at: the theme
   effect ADDED `dark` and, for light, only REMOVED it. theme.css puts the dark values on bare
   `:root` and the light values on `:root.light`, so "light mode" left every token holding its
   dark value and only Tailwind's handful of `dark:` variants flipped. Every hour spent on the
   light palette — and it is fully built, and contrast-measured — had been invisible.
   ⚠️ The failure had no symptom a check could have caught by reading CSS: both files were
   internally consistent. What was missing was the CLASS that joins them. */
const G38 = '38. Light mode can actually be switched on';
check(G38, 'the switch SETS light, it does not merely unset dark',
  /classList\.toggle\('light', !darkMode\)/.test(appSrc) &&
  /classList\.toggle\('dark', darkMode\)/.test(appSrc),
  'removing `dark` leaves :root holding the dark values — the light tokens never apply at all');
check(G38, 'theme.css still carries a light value for every surface it darkens',
  /html\.light \{/.test(themeCss) &&
  ['--ground', '--panel', '--ink', '--accent-ink', '--danger-ink']
    /* the window is generous on purpose: this asserts the token EXISTS in the light block, and a
       fixed character distance turns every comment added to that block into a false failure — it
       already did once, when the gold plate's reasoning was written in. */
    .every(t => new RegExp(`html\\.light[\\s\\S]{0,8000}${t}:`).test(themeCss)),
  'a token defined only on :root is a colour that cannot change theme');
/* the theme is stamped before the stylesheet is parsed; React's effect runs after mount, which
   for a light-mode user is a full dark load followed by a flip on every single launch */
check(G38, 'the saved theme is stamped before the first paint',
  /localStorage\.getItem\('kpm_theme'\) === 'light'/.test(indexHtml) &&
  /classList\.add\(light \? 'light' : 'dark'\)/.test(indexHtml),
  'setting the class in a React effect means every launch starts in the wrong theme for a beat');
/* ⚠️ TWO FILES, ONE KEY. If the pre-paint stamp and the React effect ever disagree about the
   storage key or the string, the stamp picks one theme and React corrects it a frame later —
   the exact flash the stamp exists to remove, visible only in the theme nobody was testing. */
check(G38, 'the pre-paint stamp and the React effect read the same saved value',
  /localStorage\.setItem\('kpm_theme', darkMode \? 'dark' : 'light'\)/.test(appSrc) &&
  (indexHtml.match(/'kpm_theme'/g) || []).length === 1,
  'a drifted key stamps one theme and flips to the other, on launch, forever');
check(G38, "the browser's own chrome follows the theme too",
  /meta\[name="theme-color"\][\s\S]{0,80}darkMode \? '#1a1815' : '#B4B0A9'/.test(appSrc) &&
  /#B4B0A9/.test(indexHtml),
  'a dark address bar over a steel app is the one part of the theme the app does not own');

/* ── 39. the Duke's Ledger has a light variant ───────────────────────────────
   His pick for the light-mode pilot, 2026-08-15: the sales terminal. It turned out not to be a
   slate screen at all — 465 hardcoded hexes across 47 colours, and that IS the wood-and-brass
   identity he designed and hand-tested. So it got its own light palette rather than being
   converted onto the app's steel-and-gold tokens, which would have deleted the look instead of
   theming it. His call on the near-identical browns: *"keep them separate, must be difference
   for a reasons right"*. */
const G39 = '39. The Duke\'s Ledger has a light variant';
const duke = fs.readFileSync('src/MerchantSalesView.jsx', 'utf8');
/* ⚠️ THE ONLY LITERALS ALLOWED TO REMAIN. Black and white belong to the printed nota and the
   print stylesheet — KPM's business document, out of the palette law's reach. The two greens are
   WhatsApp's brand mark, which is not ours to restyle. Any OTHER hex is a colour that cannot
   change theme, which is the whole defect this group exists to prevent. */
const dukeHex = (duke.match(/#[0-9a-fA-F]{6}/g) || []).map(h => h.toLowerCase());
const allowedHex = new Set(['#000000', '#ffffff', '#25d366', '#128c7e']);
check(G39, 'the terminal carries no hardcoded colour of its own any more',
  dukeHex.every(h => allowedHex.has(h)),
  'left behind: ' + [...new Set(dukeHex.filter(h => !allowedHex.has(h)))].join(' '));
/* 🔴 THE HALF THE FIRST SWEEP MISSED. `bg-black` and `text-white` are colour NAMES, not hexes, so
   a hex-only sweep walked straight past them — and left the boxes he types into with a BLACK
   ground while the text inside flipped to dark ink. His report, minutes after first looking at it:
   *"the customer textbox ... is very dark letter causing very hard to see"*, *"skt textbox also
   too dark"*. A palette sweep must cover the names or it converts exactly the half that makes the
   other half unreadable.
   ⚠️ `text-black` and `bg-white` ARE still allowed and are not an oversight: black on a bright
   amber plate, and black on a white field, are correct in BOTH themes. They flip nothing because
   nothing under them flipped. */
const dukeUi = duke.slice(0, duke.indexOf('print-modal-wrapper'));
const namedLeft = [...new Set(dukeUi.match(/(bg-black|text-white)(\/\d+)?/g) || [])];
check(G39, 'no colour NAME is left painting the app UI either', !namedLeft.length,
  'left behind: ' + namedLeft.join(' ') + ' — these do not change theme, so a box keeps its ' +
  'dark ground while the text in it goes dark too');
/* the price is the reason the 3:1 band exists here; using it on small text would be too pale */
check(G39, 'the big-figure ink is used only where the size earns its lower floor',
  [...dukeUi.matchAll(/([^"'`]{0,120})text-\[var\(--duke-price-ink\)\]/g)]
    .every(m => /text-\[2[0-9]px\]|text-2xl|text-3xl|text-4xl|lg:text-2xl/.test(m[1])),
  'this token clears 3:1, not 4,5:1 — on 10px text that is genuinely hard to read');
check(G39, 'the nota and the WhatsApp mark were left alone',
  /a4-print-jail[\s\S]{0,200}#ffffff/.test(duke) && /#25D366/i.test(duke) &&
  /!text-blue-800/.test(duke),
  'the printed nota keeps KPM company blue — the palette law stops at the print block');
/* 🔴 THE FAILURE THAT STARTED THIS WHOLE FRONT, IN MINIATURE. A token defined in only one of the
   two blocks is a colour that cannot change theme — exactly what `:root`-only tokens did to the
   entire app until group 38. Every Duke token must be declared TWICE. */
const dukeNames = [...new Set((themeCss.match(/--duke-[a-z0-9-]+(?=:)/g) || []))];
const oncers = dukeNames.filter(n => (themeCss.match(new RegExp(n + ':', 'g')) || []).length < 2);
check(G39, 'every Duke token is declared in BOTH themes', dukeNames.length > 40 && !oncers.length,
  'declared once, so it can never change theme: ' + oncers.join(' '));
/* ⚠️ THE DARK VALUES ARE FROZEN, AND WHAT THEY ARE FROZEN AT MOVED ONCE, ON HIS WORD.
   The conversion carried every dark value across untouched so that only light mode needed his
   eyes. Then he read the contrast findings and said *"fix the dark contrast"*, which is the one
   thing that licenses changing them — and it cost him a re-test, which is exactly why the freeze
   exists. `--duke-ink-3` is the workhorse text and moved #8b7256 → #a08768 in that pass.
   ⚠️ THE STRUCTURAL LINE DELIBERATELY DID NOT MOVE. A divider owes no contrast ratio; raising it
   to 3:1 would turn every seam in the terminal into a bright tan line. Controls got their own
   `--duke-edge-ctl` instead, which is the thing that actually owes a boundary ratio. */
for (const [tok, hex] of [['--duke-edge-1', '#3e3226'], ['--duke-ink-3', '#a08768'],
                          ['--duke-amber', '#ff9d00'], ['--duke-brass', '#d4af37'],
                          ['--duke-fill-ground', '#1a1815']])
  check(G39, `${tok} still carries its agreed hex in dark`,
    new RegExp(tok + ':\\s*' + hex).test(themeCss),
    'a dark value moving on its own means he re-tests a terminal he has already tested');
check(G39, 'a control edge is a separate token from a decorative seam',
  /--duke-edge-ctl:/.test(themeCss) && /border-\[var\(--duke-edge-ctl\)\]/.test(duke) &&
  !/<(input|textarea|select|button)[^>]{0,400}border-\[var\(--duke-edge-[12]\)\]/.test(duke),
  'the edge of a box you type in tells you where it begins, so it owes 3:1; a seam owes nothing');
/* 🔴 THE ROLE SPLIT IS THE POINT, AND IT IS WHAT A LATER "TIDY-UP" WOULD UNDO. One hex served as
   a fill AND as text; as a fill it survives a pale ground, as text it does not. So the tokens are
   named by ROLE and a role must never be crossed — an -ink token painted as a background, or a
   fill token used as text, is the invisible-text bug walking straight back in. */
const crossed = [];
for (const m of duke.matchAll(/([a-z-]+)-\[var\(--([a-z0-9-]+)\)\]/g)) {
  const [, prefix, tok] = m;
  const isText = /^(text|placeholder|caret|decoration)$/.test(prefix);
  const isEdge = /^(border|ring|outline|divide|stroke|shadow)$/.test(prefix);
  if (/(^|-)ink(-\d+)?$/.test(tok) && !isText) crossed.push(`${prefix}:${tok}`);
  if (/-edge(-\d+)?$/.test(tok) && !isEdge) crossed.push(`${prefix}:${tok}`);
}
check(G39, 'no ink token is painted as a surface, and no edge token as anything else',
  !crossed.length,
  'crossed roles: ' + [...new Set(crossed)].join(' ') +
  ' — a fill colour used as text is unreadable on the pale ground, and nothing errors');
/* ⚠️ NO HEX IS NAMED HERE ON PURPOSE. The first version of this check pinned the light amber ink
   to a literal, and the literal was WRONG — #8a4f00 looked right and measured 3,03:1. Freezing a
   value a measurement later moved just turns the check into a second thing to fix. The invariant
   is that the accent inks are SEPARATE tokens that actually change between themes; the number
   itself belongs to contrast.selfcheck.mjs, which measures rather than remembers. */
const dukeAccentInks = ['duke-amber-ink', 'duke-brass-ink', 'duke-danger-ink'];
/* ⚠️ SCOPED TO THE `:root` BLOCKS, NOT THE WHOLE FILE. The first spelling counted declarations
   across all of theme.css and asserted there were exactly two — which was the same statement as
   "one per theme" right up until group 41 added `.kpm-dark-island`, a THIRD declaration that is
   deliberately a copy of the dark one. The claim was always about the two THEME blocks. */
const themeRoots = [...themeCss.matchAll(/(^|\n):root[^{]*\{([^}]*)\}/g)].map(m => m[2]).join('\n');
check(G39, 'the amber, brass and red each kept their own ink, and each one changes theme',
  dukeAccentInks.every(t => new RegExp(`text-\\[var\\(--${t}\\)\\]`).test(duke)) &&
  dukeAccentInks.every(t => {
    const v = [...themeRoots.matchAll(new RegExp(`--${t}:\\s*(#[0-9a-f]{6})`, 'g'))].map(m => m[1]);
    return v.length === 2 && v[0] !== v[1];
  }),
  'gold and red as text are the two he has reported unreadable in light mode — group 32 again');
check(G39, 'the Duke palette is measured, not just declared',
  /duke-amber-ink/.test(fs.readFileSync('src/config/contrast.selfcheck.mjs', 'utf8')),
  'a palette nobody measures is how #8a4f00 shipped at 3,03:1 in the first pass of this very file');

/* ── 40. the veils: the third spelling of the colour-name bug ────────────────
   The hex sweep missed colour NAMES (group 39), and the name sweep missed names WITH AN ALPHA.
   `bg-white/5` is a white film: over the black bench it is a lit recess you can see the walls of,
   over the cream panel it is the cream panel. Every field in the product editor — name, stock,
   all four prices — carried a white film as BOTH its fill and its border, so in light mode the
   modal was a blank cream box containing invisible boxes to type in.
   ⚠️ The lesson is not "sweep alphas too". It is that a colour is only convertible once you know
   what it sits ON: same rgba, opposite job, depending on the ground. */
const G40 = '40. The veils flip, and the plank\'s label does not';
const app = fs.readFileSync('src/App.jsx', 'utf8');
/* the shell dialog at the bottom of App.jsx is a genuine light/dark PAIR (`bg-white dark:bg-…`),
   so a bare `bg-white` is allowed there; a white film with an alpha never is. */
const filmLeft = [...new Set(app.match(/\b(hover:)?(bg|border)-white\/\d+/g) || [])];
check(G40, 'no white film is left painting a surface that changes theme', !filmLeft.length,
  'left behind: ' + filmLeft.join(' ') + ' — a white veil is a highlight on black and nothing ' +
  'at all on cream, so the control it was drawing simply stops existing in light mode');
/* slate IS the blue the palette law bans, and these were the last of it in the shell */
const grayLeft = [...new Set(app.match(/\b(hover:)?text-gray-\d+/g) || [])];
check(G40, 'the cold slate greys are gone from the shell', !grayLeft.length,
  'left behind: ' + grayLeft.join(' '));
/* 🔴 THE INVARIANT, AND THE ONE A LATER "TIDY-UP" WOULD BREAK BY MAKING THEM ALL WHITE AGAIN.
   A film recesses a surface below its ground. On a pale ground only a DARK film does that, so
   the light values must not be white — they are the shell's own warm brown at low alpha. */
/* ⚠️ `[^}]*`, NOT `[\s\S]*?\n\}`. The first spelling of this line closed each block at the next
   `}` sitting in column 1 — and one of the three `.light` selectors is followed by a block that
   closes on an indented brace, so the match ran on and swallowed the entire DARK block. The
   check then measured dark values while claiming to measure light ones, and passed. */
const lightBlock = (themeCss.match(/:root\.light[^{]*\{([^}]*)\}/g) || []).join('\n');
const veils = ['--duke-veil', '--duke-veil-2', '--duke-veil-edge', '--duke-veil-edge-2',
               '--duke-veil-edge-3', '--duke-lift'];
check(G40, 'every veil is a WARM DARK film in light, not a paler white one',
  veils.every(v => new RegExp(v + ':\\s*rgba\\(255, 255, 255').test(themeCss)) &&
  veils.every(v => new RegExp(v + ':\\s*rgba\\(46, 38, 26').test(lightBlock)),
  'a white film on a pale panel is the panel — the field loses its walls and nothing errors');
/* the same role split as --duke-edge-ctl vs --duke-edge-1, one layer down: an edge tells you
   where a control begins so it owes 3:1, a fill owes nothing and stays a whisper. Dark serves
   the fill and the edge the SAME rgba, which is exactly why one token would have looked fine. */
const alphaOf = (tok) => {
  const m = lightBlock.match(new RegExp(tok + ':\\s*rgba\\([^)]*?,\\s*(\\.\\d+)\\s*\\)'));
  return m ? parseFloat(m[1]) : NaN;
};
check(G40, 'a veil EDGE is a separate token from a veil FILL, and is far stronger in light',
  alphaOf('--duke-veil-edge') >= alphaOf('--duke-veil') * 3,
  'the fill and the edge share one rgba in dark; collapsing them into one token loses the ' +
  'boundary of every input the moment the ground goes pale');
/* ⚠️ AN INK ONLY FLIPS WHEN THE GROUND UNDER IT DOES. The Update Database button is a hardcoded
   near-black plank in BOTH themes; it was wearing --shell-ink, which flips to near-black, so its
   label went dark-on-dark in light. Same bug as the wells, running the other way. */
check(G40, 'the dark plank\'s label uses an ink that does NOT flip',
  /bg-\[#0d0a09\][\s\S]{0,60}text-\[var\(--duke-on-plank\)\]/.test(app) &&
  [...themeCss.matchAll(/--duke-on-plank:\s*(#[0-9a-f]{6})/g)].map(m => m[1])
    .every((v, _, a) => a.length === 2 && v === a[0]),
  'a flipping ink on a plate that cannot flip is invisible text, and it reads as "the button ' +
  'lost its label" rather than as a colour bug');
/* the role rule from group 39, now enforced on the shell as well — it was only ever scoped to
   the terminal because the terminal was the only file with role-named tokens at the time */
const appCrossed = [];
for (const m of app.matchAll(/([a-z-]+)-\[var\(--([a-z0-9-]+)\)\]/g)) {
  const [, prefix, tok] = m;
  const isText = /^(text|placeholder|caret|decoration)$/.test(prefix);
  const isEdge = /^(border|border-[btlrxy]|ring|outline|divide|stroke|shadow)$/.test(prefix);
  if (/(^|-)ink(-\d+)?$/.test(tok) && !isText) appCrossed.push(`${prefix}:${tok}`);
  if (/-edge(-\d+)?$/.test(tok) && !isEdge) appCrossed.push(`${prefix}:${tok}`);
}
check(G40, 'the shell crosses no role either', !appCrossed.length,
  'crossed roles: ' + [...new Set(appCrossed)].join(' '));

/* ── 41. the screens that stay dark in both themes ───────────────────────────
   🔴 HIS SCREENSHOT, 2026-08-16: *"light mode or not, login background should not change like
   this should stay black"*. The vault gate's backdrop was `--duke-well-solid`, which flips to
   cream, so the vault stage became a sheet of paper. The comment sitting directly above that
   line already said the point of it was SOLID BLACK — the token flipped out from under a stated
   intent, which is the failure mode a token system has that a literal does not.
   ⚠️ THE BACKGROUND WAS THE HALF HE COULD SEE. All seventeen tokens inside that gate flip, so
   on a card that is near-black in BOTH themes every ink went near-black too. Same for the two
   full-screen stop screens (Access Denied, Can't Verify You Yet), which sit on a scrim that is
   dark in both themes and were printing light-mode ink on it.
   The fix is a THEME ISLAND rather than 40 individual conversions: the subtree re-declares the
   tokens it uses back to their dark values, so anything added inside it later is correct for
   free. This group is what stops the island drifting from the dark block it copies. */
const G41 = '41. A screen that stays dark keeps dark ink';
/* 🔴 THE ISLAND IS A SELECTOR, NOT A COPIED LIST — and that distinction IS the check.
   The first version copied ~20 token names into a `.kpm-dark-island { … }` block. It was
   incomplete the day it was written: it carried the `--duke-*`/`--shell-*` names the App.jsx
   gate uses and missed every APP-level token, so `.kpm-field`'s input — painted with `--inset` —
   still went pale inside a near-black card. His report: *"for the master vault panel, let the
   textbox to stay dark"*.
   Riding both dark `:root` blocks makes the island complete by construction, forever. */
const darkRootSelectors = [...themeCss.matchAll(/(^|\n)((?::root|\.kpm-dark-island|,|\s)+)\{/g)]
  .map(m => m[2].replace(/\s+/g, ' ').trim())
  .filter(s => /^:root\b/.test(s));
check(G41, 'the island rides BOTH dark :root blocks instead of copying them',
  darkRootSelectors.length >= 2 && darkRootSelectors.every(s => s.includes('.kpm-dark-island')),
  'dark :root selectors found: ' + JSON.stringify(darkRootSelectors) +
  ' — a dark block the island does not ride is a family of tokens that still flips inside it');
/* ⚠️ THE DISTINCTION IS NOT "WHICH LINE IT STARTS ON" — in BOTH the correct form
   (`:root,\n.kpm-dark-island {`) and the bug (`\n.kpm-dark-island {`) the class sits at a line
   start. Two spellings of this needle failed on correct code before that was obvious. What
   actually separates them is whether the class is a CONTINUATION of a selector list, so the test
   is the last non-whitespace character before it: a comma means it rides another block. */
const islandStandalone = [...themeCss.matchAll(/\.kpm-dark-island\s*\{/g)].some(m => {
  const before = themeCss.slice(0, m.index).replace(/\s+$/, '');
  return !before.endsWith(',');
});
check(G41, 'no hand-copied token list has grown back on the island', !islandStandalone,
  'a standalone `.kpm-dark-island { --x: … }` block is the exact bug this replaced: complete on ' +
  'the day it is written, silently short of every token added afterwards');
/* an overlay that covers the whole viewport has no themed page behind it to agree with, so it
   is its own world; if it is dark it must carry the island or its ink flips out from under it */
const stops = [...app.matchAll(/className="([^"]*fixed inset-0 z-\[9999\][^"]*)"/g)].map(m => m[1]);
const unislanded = stops.filter(c => /bg-\[var\(--duke-(well-solid|scrim|scrim-hi)\)\]/.test(c) &&
                                     !/kpm-dark-island/.test(c));
check(G41, 'every full-screen dark stop screen is an island', stops.length >= 3 && !unislanded.length,
  'not islanded: ' + unislanded.join(' | '));
/* the gate card is a literal near-black in BOTH themes — that is WHY the island exists, and a
   later "tidy-up" that tokenised it would quietly reintroduce the flip */
check(G41, 'the gate card is still a literal that cannot flip',
  /bg-\[rgba\(4,3,2,0\.9\)\]/.test(app) && /\.kpm-mod\.gate\s*\{[^}]*background:\s*rgba\(4, 3, 2, \.9\)/.test(themeCss),
  'the two gate screens share one card colour, and it is deliberately not a token');

/* ── 42. the accents follow the ground, and the blue is finally gone ─────────
   *"yea fix all of the color for light mode and the adjustment as well for the outside panel,
   we can start from the settingview"* — 2026-08-16. The red, orange, amber and yellow left in
   the shell were Tailwind names, so they could not change theme; on the cream panel they were
   the complaint he had already filed once about the terminal's prices.
   🔑 THE RULE THAT DECIDED EACH ONE IS THE GROUND, NOT THE COLOUR. An accent sitting on a PLATE
   (its own black disc, a solid red button) reads the same in both themes and was left alone. An
   accent sitting on a surface that FLIPS had to become an ink or an edge. Converting the first
   kind is work that changes nothing; missing the second kind is invisible text. */
const G42 = '42. An accent follows its ground, not its name';
const settings = fs.readFileSync('src/components/SettingsView.jsx', 'utf8');
/* 🔴 SLATE IS THE BLUE. It survived in three shapes at once: a class, a `#0f172a` Lite-Mode
   fallback that painted every backdrop navy, and the colour a NEW RANK was born with. */
const slateLeft = [];
for (const [f, t] of [['App.jsx', app], ['SettingsView.jsx', settings]]) {
  for (const m of t.matchAll(/(?:^|[\s"'`])((?:hover:|focus:)?(?:text|bg|border|from|via|to|ring)-(?:slate|gray|zinc)-\d+)/g))
    slateLeft.push(`${f}:${m[1]}`);
  for (const m of t.matchAll(/#(?:0f172a|475569|94a3b8|1e293b|334155|64748b)\b/gi))
    slateLeft.push(`${f}:${m[0]}`);
}
check(G42, 'no slate survives in the shell, as a class OR as a hex', !slateLeft.length,
  'left behind: ' + [...new Set(slateLeft)].join(' ') + ' — slate IS the blue the palette law bans');
/* the Lite-Mode blur fallback overrides every scrim in the app with !important, so a literal
   there is a colour that cannot change theme applied to the widest possible surface */
/* 🔴 THE ONE THAT MADE A FINISHED SCREEN LOOK UNFINISHED. *"settingview is not even done, look
   at ther black background"* — every module on it was already cream and the PAGE was still black,
   because `body` pinned its own colour and its own gradient in index.css.
   ⚠️ It took the header and the dock with it. Both are glass over the body, so neither was
   "still dark" — they were correctly showing a black page through themselves. When three
   surfaces are wrong at once, look for the one thing behind all three. */
const bodyRule = (indexCss.match(/\nbody \{[\s\S]*?\n\}/) || [''])[0];
check(G42, 'the page itself changes theme, gradient and all',
  !/#[0-9a-fA-F]{3,8}|rgba?\(/.test(bodyRule) && /var\(--ground-base\)/.test(bodyRule),
  'a literal on `body` is a colour that cannot change theme applied to the entire app, and it ' +
  'reads as "this screen was never converted" even when every module on it was');
/* the same sweep that missed the body missed this file's OTHER literal, twice over */
const indexSlate = [...new Set(indexCss.match(/#(?:0f172a|475569|94a3b8|1e293b|334155|64748b|cbd5e1)\b/gi) || [])];
check(G42, 'index.css carries no slate either', !indexSlate.length,
  'left behind: ' + indexSlate.join(' ') + ' — this file is not the shell, not App and not the ' +
  'player, which is exactly why slate kept shipping from it');
/* ⚠️ REWRITTEN 2026-08-25, AFTER IT FAILED ON PROSE. This was one regex spanning selector to
   declaration inside a 900-character window; a comment added above the declaration pushed it
   out of reach and the check went red against correct CSS. Same shape as the three that broke
   on their own explanations on 2026-08-13. Assert the FACTS separately, never the distance
   between them. */
const scrimDecl = 'background-color: var(--duke-scrim) !important';
check(G42, 'the Lite Mode blur fallback is a token, and a scrim',
  app.includes('.lite-mode .backdrop-blur') && app.includes(scrimDecl),
  'in Lite Mode this rule paints every backdrop in the app, so a literal here is the whole app');

/* 🔴 AND IT MUST NOT REPAINT AN ELEMENT THAT NAMED ITS OWN BACKGROUND. Aldi reported the sidebar
   broken in Lite Mode; measuring found FIVE elements wearing the scrim on the Dashboard alone,
   including three money cards that say bg-[var(--raised)] and were overridden purely for
   carrying backdrop-blur-sm.
   ⚠️ BOTH FILES OR NEITHER. The rule is written twice - once in App.jsx, once in index.css -
   and both carry !important, so narrowing one and not the other changes nothing at all. That is
   exactly what happened first: index.css was narrowed, the cards stayed dark, and App.jsx was
   the one winning. This check exists so the pair cannot drift again. */
const SCRIM_GUARD = ':not([class*="bg-[var("])';
check(G42, 'the Lite Mode scrim skips anything that declared its own background',
  app.includes(SCRIM_GUARD) && indexCss.includes(SCRIM_GUARD),
  'App.jsx has it: ' + app.includes(SCRIM_GUARD) + ', index.css has it: ' +
  indexCss.includes(SCRIM_GUARD) + ' — both carry !important, so one without the other fixes nothing');
/* ⚠️ THESE TWO BLOCKS ARE THE SAME SCREEN WRITTEN TWICE, AND THEY HAVE ALREADY DRIFTED ONCE —
   the name sweep converted App's disc to a token that flips and left SettingsView's as `bg-black`,
   so one of them was about to show a dark-red lock on a cream disc. The disc is a PLATE: it
   carries its own black, so its red never touches the page and never needs to change theme. */
const medallion = /w-24 h-24 bg-black border-2 border-red-600 rounded-full[^"]*text-red-500/;
check(G42, 'both Restricted Access medallions are the same plate',
  medallion.test(app) && medallion.test(settings),
  'a plate keeps its Tailwind red; only the text UNDER it sits on the page and has to flip');
/* and the text under it does flip — that half was white and slate on a ground that goes pale */
check(G42, 'the lockscreen text below the medallion is tokenised in both files',
  [app, settings].every(t =>
    /Restricted Access/.test(t) &&
    /text-\[var\(--duke-ink-hi\)\][^>]*>Restricted Access/.test(t) &&
    /text-\[var\(--duke-ink-3\)\][^>]*>Admin Clearance Required/.test(t)),
  'this block sits directly on the page, which now goes pale — white text on it is nothing');
/* the product editor was the densest patch of un-themed accent left in the app */
const editor = app.slice(app.indexOf('EDIT MODAL - AUTO HIDES WHEN CROPPING'),
                         app.indexOf('Update Database'));
const editorLeft = [...new Set(editor.match(
  /(?:hover:|focus:)?(?:text|border)-(?:red|orange|amber|yellow)-\d+(?:\/\d+)?/g) || [])];
check(G42, 'the product editor carries no accent that cannot change theme', !editorLeft.length,
  'left behind: ' + editorLeft.join(' ') + ' — every field in here sits on the cream panel');

/* ── 43. Lite Mode changes motion, never colour ──────────────────────────────
   🔴 HIS LAW, VERBATIM, 2026-08-16: *"lite item use to sacrifice the animation but not the color"*.
   Reported as: *"the lite light mode causing the system active settings text to gone, since it
   causing the background for that top panel to be black"*.
   Lite Mode strips `backdrop-filter`, so the header and the dock genuinely need an OPAQUE
   fallback — without one the glass panes vanish, which is a bug this file already guards. But the
   fallback was `#14110e`, a fixed near-black, so switching Lite Mode on in LIGHT mode painted the
   top bar black underneath light-mode ink and the title disappeared.
   ⚠️ AND THE CHECK THAT PINNED THAT LITERAL WAS PROTECTING THE BUG — shape 7 for the fourth time
   in two days. This group asserts the LAW instead of any value, so it cannot rot the same way. */
const G43 = '43. Lite Mode sacrifices motion, never colour';
/* a sprite frame is `background-position`, not a colour — Lite Mode freezing an animation to a
   fixed frame is exactly what it is for, so those must not trip this */
const COLOUR_DECL = /(?:^|[;{\s])(?:background-color|color|border(?:-[a-z]+)?-color|background|border)\s*:\s*[^;}]*#[0-9a-fA-F]{3,8}/;
const liteColour = [];
for (const src of [themeCss, indexCss]) {
  for (const m of src.matchAll(/html\.lite-mode[^{}]*\{([^}]*)\}/g)) {
    if (COLOUR_DECL.test(m[1])) liteColour.push(m[0].split('{')[0].trim().slice(0, 70));
  }
}
check(G43, 'no Lite Mode rule paints a literal colour', !liteColour.length,
  'these change colour when Lite Mode is switched on: ' + liteColour.join(' | ') +
  ' — a fixed colour in a Lite Mode rule is a colour that cannot change theme, applied to ' +
  'whoever turned Lite Mode on. Lite Mode may drop motion, blur and shadow; never a hue.');
/* the fallback still has to EXIST — this is the other half, and dropping it would make the
   header and the dock invisible for every Lite Mode user */
check(G43, 'the glass panes still get an opaque fallback, as a token',
  /--glass-solid:/.test(themeCss) &&
  (themeCss.match(/background-color: var\(--glass-solid\)/g) || []).length >= 4,
  'Lite Mode strips backdrop-filter, so a 4%-tinted bar with no blur is an invisible header — ' +
  'the opaque ground is not decoration');

/* ── 44. an opacity modifier on a token emits NOTHING ────────────────────────
   🔴 FOUND 2026-08-16, AND IT HAD BEEN TRUE FOR WEEKS. Tailwind's `/N` opacity modifier needs a
   colour it can parse so it can rewrite it as `rgb(r g b / a)`. `var(--x)` is opaque to it, so
   `bg-[var(--duke-amber)]/10` is a class that matches NO RULE. Not a wrong colour — no colour at
   all. **35 distinct classes across 54 sites**, in App.jsx and in the sales terminal he had
   already approved: the vault's amber buttons had no background and no border, the gate's inputs
   had no border, the nota's paper tints were absent.
   ⚠️ NOTHING CAUGHT IT because nothing here reads the BUILT CSS — every check in this file greps
   the source, and the source looked perfectly correct. That is
   [[Anti-Recurrence Check]] shape 4 exactly: a check that greps the source proves the class was
   TYPED, never that it applies.
   The fix is `color-mix(in srgb, var(--x) N%, transparent)`, which compiles — verified by listing
   the emitted declarations, not by reading the source back. */
const G44 = '44. No opacity modifier on a token';
const deadAlpha = [];
for (const [file, txt] of [['App.jsx', app], ['MerchantSalesView.jsx', duke],
                          ['SettingsView.jsx', settings]])
  for (const m of txt.matchAll(
      /(?:[a-z-]+:)*(?:bg|text|border|border-[btlrxy]|ring|divide|from|via|to|outline|decoration|placeholder|caret|fill|stroke|accent)-\[var\(--[a-z0-9-]+\)\]\/\d+/g))
    deadAlpha.push(`${file}:${m[0]}`);
check(G44, 'no class applies an opacity modifier to a var() token', !deadAlpha.length,
  'these compile to nothing at all: ' + [...new Set(deadAlpha)].join(' ') +
  ' — use color-mix(in_srgb,var(--token)_N%,transparent) instead');
/* the positive half: the replacement is actually in use and actually reaches the stylesheet */
check(G44, 'the color-mix form is used instead',
  /color-mix\(in_srgb,var\(--[a-z0-9-]+\)_\d+%,transparent\)/.test(app),
  'the fix is a syntax, not a deletion — dropping the alpha instead would change every one of ' +
  'these surfaces to fully opaque');

/* ── 45. the clock ticks, and it slides in CSS ───────────────────────────────
   Two separate faults, fixed together 2026-08-16.
   1. THE CLOCK WAS FROZEN. It was `new Date()` written inline in the header —
      no state, no timer — so it printed the time the shell last re-rendered.
      Nothing failed; it just quietly stopped being a clock.
   2. He asked for the motion-primitives SlidingNumber look. That library
      animates in JS, and `html.lite-mode *` can only force `animation` and
      `transition` to none — a JS spring runs straight through it. On the
      setting that exists for cheap phones the digits would never stop.
   These checks assert the SHAPE that makes both true, never a duration or a
   colour — group 43's lesson, and the fourth time a pinned literal protected
   the bug it was supposed to catch. */
const G45 = '45. The clock ticks, and its slide is CSS';
/* ⚠️ These read the code with its COMMENTS REMOVED, and that is not tidiness.
   The first run of this group failed twice — on the comment above .kpm-dig-reel,
   which contains the words "never an animation:", and on the comment above
   ShellClock, which names `useSpring` to say why it is not used. A check that
   greps prose is checking the explanation, not the code. */
/* `noCmt` now lives up beside `themeCss` — see the note there for the second, nastier way this
   same trap fires. */
const clockCss = noCmt(themeCss), clockSrc = noCmt(themeSrc);
check(G45, 'the clock re-arms itself on a timer',
  /function ShellClock\s*\(/.test(clockSrc) && /setTimeout\(tick/.test(clockSrc),
  'without a timer this is not a clock — it is the time the shell last rendered');
check(G45, 'the tick is isolated from the shell, not run in its body',
  /<ShellClock\s*\/>/.test(clockSrc) &&
  clockSrc.indexOf('function ShellClock') < clockSrc.indexOf('export default function BiohazardTheme'),
  'state in the header would re-render every screen in the app once a second');
check(G45, 'no JS animation library reaches the clock',
  !/from\s+['"](framer-)?motion['"]/.test(clockSrc) && !/useSpring/.test(clockSrc),
  'Lite Mode cannot stop a JS animation — his law is that Lite sacrifices motion, ' +
  'and a spring it cannot reach makes that untrue');
check(G45, 'the reel moves on a transition, not an animation',
  /\.kpm-dig-reel\s*\{[^}]*transition:\s*transform/.test(clockCss) &&
  !/\.kpm-dig-reel\s*\{[^}]*animation:/.test(clockCss),
  'html.lite-mode * kills both, but only a transition here keeps the resting position correct');
check(G45, 'the digit window clips its reel',
  /\.kpm-dig\s*\{[^}]*overflow:\s*hidden/.test(clockCss),
  'without the clip every position prints all ten digits stacked down the page');
check(G45, 'reduced motion snaps the digits',
  /@media \(prefers-reduced-motion: reduce\) \{ \.kpm-dig-reel \{ transition: none/.test(clockCss),
  'the lite-mode sweep does not cover a user who asked the OS for less motion');
check(G45, 'the reel rows and the window share one number',
  (clockCss.match(/var\(--row\)/g) || []).length >= 4 && /--row:\s*[\d.]+em/.test(clockCss),
  'a window and a reel measured separately drift apart at the second digit');
check(G45, 'the clock still relies on tabular figures',
  /\.kpm-chip\.kpm-clock\s*\{[^}]*font-variant-numeric:\s*tabular-nums/.test(clockCss),
  '1ch is every digit\'s width only under tabular figures — proportional ones ' +
  'unalign each window from the reel behind it');

/* ── the press, added the same day: *"i want the clock to swapped into dates for 5 second then
   animate back in into clock display ... i want this action works on press"* ── */
/* ⚠️ `[^>]*` cannot span JSX attributes — an arrow function in onClick contains a literal `>`
   and ends the run. Second time this file has grepped its own punctuation and been wrong. */
check(G45, 'the clock is a real button, not a clickable div',
  /<button[\s\S]{0,400}?className=\{`kpm-chip kpm-clock/.test(clockSrc) &&
  !/<div[\s\S]{0,200}?className="kpm-chip kpm-clock/.test(clockSrc),
  'it answers a press now, so a div would be unreachable by keyboard and announced as nothing');
check(G45, 'the date face returns on its own',
  /DATE_HOLD_MS\s*=\s*\d+/.test(clockSrc) && /setTimeout\(\(\) => setShowDate\(false\), DATE_HOLD_MS\)/.test(clockSrc),
  'he asked for it to come back by itself — a flip with no return is a mode, not a peek');
check(G45, 'the two faces share one grid cell',
  /\.kpm-clock-win\s*\{[^}]*display:\s*grid/.test(clockCss) &&
  /\.kpm-clock-face\s*\{[^}]*grid-area:\s*1\s*\/\s*1/.test(clockCss),
  'separate boxes make the chip resize on every press, which moves the whole header cluster');
check(G45, 'neither face animates a width or a height',
  !/\.kpm-clock-face[^{]*\{[^}]*transition:[^;]*(width|height)/.test(clockCss),
  'animating a box size reflows the header 60 times a second; transform and opacity do not');
check(G45, 'the hidden face is hidden from screen readers too',
  /aria-hidden=\{showDate\}/.test(clockSrc) && /aria-hidden=\{!showDate\}/.test(clockSrc),
  'opacity 0 is still read aloud, so the button would announce both faces at once');
/* 'agustus' → 'Agustus' on 2026-08-26, his correction: *"use proper capitalization for the date as
   well bro"*. The check asserts the table exists and is not ICU — the CASE is his call and is
   recorded beside the table itself, not enforced here twice. */
check(G45, 'the month names are a literal table, not ICU',
  /const BULAN = \[/.test(clockSrc) && /'Agustus'/.test(clockSrc) &&
  !/month:\s*'long'/.test(clockSrc),
  'toLocaleDateString needs full ICU data — where it is absent the month silently returns English');
check(G45, 'reduced motion snaps the face swap as well as the digits',
  /@media \(prefers-reduced-motion: reduce\) \{ \.kpm-clock-face \{ transition: none/.test(clockCss),
  'the digits were covered and the face was not — the same guard has to reach both');

/* ── 46. LIGHT MODE: THE THREE THINGS HE COULD NOT READ ─────────────────────
   Three screenshots, 2026-08-16 — a field's example text, the caption on the striped band,
   and the sidebar's gold glow. Three symptoms, ONE fault: colour decided against a near-black
   ground and never re-decided for the cream one. The rail is the clearest case, because it
   was not even reading the theme — the ON colour was a hex literal in the JSX.
   These reuse `noCmt`/`clockCss` from group 45; the reason is the same one written there. */
const G46 = '46. Light mode: the placeholder, the band, and the rail glow';
check(G46, 'the example text inside a field has a colour of its own',
  /::placeholder\s*\{[^}]*color:\s*var\(--/.test(clockCss),
  'unstyled it falls back to the browser grey, which lands near 2,2:1 on the cream field');
check(G46, 'the browser cannot dim that colour a second time',
  /::placeholder\s*\{[^}]*opacity:\s*1/.test(clockCss),
  'Firefox applies opacity .54 to placeholders ON TOP of whatever colour is set');
check(G46, 'an empty field is still told apart from a filled one',
  /::placeholder\s*\{[^}]*font-style:\s*italic/.test(clockCss),
  'darkening the example text to 4,5:1 made it look exactly like a typed value in light mode');
check(G46, 'the band caption carries its own weight',
  /\.kpm-band \{[^}]*font-weight:\s*700/.test(clockCss),
  '11px mono over a 1px hatch: the stripe wins against a normal-weight stroke');
/* ⚠️ THE RULE IS "A PLATE FROM A TOKEN", NOT "THE TOKEN NAMED --gold". This guard used to
   pin `var(--gold)` by name and it went red on 2026-08-24 against code that obeyed it
   perfectly — the rail moved to `--lamp-on` because `--gold` in light mode is a brown meant
   to sit UNDER pale ink, and used as a lamp it read as a brown coin. He photographed it:
   *"it looks darker bro it looks more brown than amber"*. A guard that names an
   implementation fails the next correct fix; this one asserts what actually matters — some
   token, painted as a background, with no bloom. */
check(G46, 'the light rail marks ON with a plate, not a glow',
  /html\.light[^{]*\.kpm-rail-mark\.on::before\s*\{[^}]*background:\s*var\(--[a-z-]+\)/.test(clockCss) &&
  !/html\.light[^{]*\.kpm-rail-mark\.on::before\s*\{[^}]*box-shadow:\s*0/.test(clockCss),
  'a bloom adds light, and on a cream ground there is none left to add — his word: menyatu');
check(G46, 'the light rail drops the drop-shadow',
  /html\.light[^{]*\.kpm-rail-mark[^{]*\.kpm-rail-icon\s*\{[^}]*filter:\s*none/.test(clockCss),
  'a glow needs a dark ground to bloom into; on cream it only softens the icon it marks');
check(G46, 'the active mark takes its ink from the theme, not from a fixed hex',
  /html\.light[^{]*\.kpm-rail-mark\.on \{[^}]*color:\s*var\(--[a-z-]+\)/.test(clockCss),
  'the JSX pins #ff9d00, which is the dark theme deciding what light mode looks like');
/* 🔴 THE STRONGEST FORM OF THIS CHECK IS A COMPARISON, NOT A NAME. It reads the token the OPEN
   rail's ON mark uses and the token the COLLAPSED disc uses, and requires them to be the SAME
   one — whatever that one is.
   Pinning `var(--gold)` by name would have passed on 2026-08-24 while the open rail moved to
   amber and the totem stayed brown, which is his 2026-08-16 report exactly: *"can u do the same
   format for the darkbrown plate when the sidebar is closed as well? because it is still the old
   yellow color instead"*. The whole point of this check is that the two agree; naming one of them
   is how it came to be able to pass while they disagreed.
   A check that survives the next correct fix is worth more than a check that names this one. */
{
  const onPlate = clockCss.match(/html\.light[^{]*\.kpm-rail-mark\.on::before\s*\{[^}]*background:\s*var\((--[a-z-]+)\)/);
  const totemPlate = clockCss.match(/html\.light[^{]*\.kpm-rail-totem\s*\{[^}]*background:\s*var\((--[a-z-]+)\)/);
  const totemInk = clockCss.match(/html\.light[^{]*\.kpm-rail-totem\s*\{[^}]*color:\s*var\((--[a-z-]+)\)/);
  check(G46, 'the CLOSED rail wears the same plate as the open one',
    !!onPlate && !!totemPlate && !!totemInk && onPlate[1] === totemPlate[1],
    'collapsed, the whole rail IS one circle — and it was still painting the dark theme\'s #ff9d00');
}
/* 📏 His ask: *"make all this button bigger but dont allow it to exceed the given box space"*.
   The header declares no height — it grows to its tallest child — so the ceiling is a MEASURED
   fact, not a written one: inner box 48px, set by the two lines of text on the left. This asserts
   the two relationships that keep the promise, and deliberately does NOT pin 44: the sizes are
   free to move, the ceiling is not. Re-measure with tools/theme-lab-server.mjs + headless Chrome
   if the eyebrow or title ever changes size. */
const HEADER_INNER_PX = 48;
const chipH = /\.kpm-chip \{[^}]*height:\s*(\d+)px/.exec(clockCss);
const swH   = /\.kpm-theme-switch \{[^}]*height:\s*(\d+)px/.exec(clockCss);
check(G46, 'the header controls cannot outgrow the header',
  !!chipH && !!swH && +chipH[1] <= HEADER_INNER_PX && +swH[1] <= HEADER_INNER_PX,
  `a chip taller than ${HEADER_INNER_PX}px stops fitting and starts SETTING the header's height`);
check(G46, 'the switch stays shorter than the plates beside it',
  !!chipH && !!swH && +swH[1] < +chipH[1],
  'that height gap is what separates the one control in the row from the readouts around it');
check(G46, 'the music note reads the theme instead of a fixed orange',
  /html\.light[^{]*\.kpm-music-note\s*\{[^}]*color:\s*var\(--accent-ink\)/.test(clockCss) &&
  /kpm-music-note/.test(noCmt(fs.readFileSync('src/MusicPlayer.jsx', 'utf8'))),
  'it is the one rail mark with no resting grey, so on cream it was orange on cream all day');
check(G46, 'the audit vault stopped painting itself for a black page',
  !/(text-slate-|bg-black\/|border-white\/|text-white[^-]|bg-white\/|emerald|blue-500)/
    .test(noCmt(fs.readFileSync('src/components/AuditVaultView.jsx', 'utf8'))),
  'that screen was written entirely for a dark ground — in light mode it was a dark island with ' +
  'pale slate text on it, and slate IS the blue the palette law bans');

/* 📏 THE MIGRATION LEDGER. The app carries TWO theming systems: the control-system tokens
   (--ink/--panel under html.light) and an older Tailwind `dark:` + slate/white layer. Every screen
   Aldi has complained about lives in the old one. Add a file to this list the moment it is
   converted — the check then makes the conversion permanent, which is the only thing that stops a
   half-migrated screen creeping back one className at a time.
   ⚠️ `bg-black/NN` is deliberately NOT banned: a modal scrim is correct in both themes. */
const MIGRATED = [
  'src/components/AuditVaultView.jsx',
  'src/components/SamplingManager.jsx',
];
const LEGACY_PALETTE =
  /(dark:[a-z-]|text-slate-|bg-slate-|border-slate-|divide-slate-|\btext-white\b|\bbg-white\b|emerald-|green-[0-9]|blue-[0-9]|indigo-|violet-|cyan-|gray-[0-9])/;
for (const f of MIGRATED) {
  const dirty = noCmt(fs.readFileSync(f, 'utf8')).match(LEGACY_PALETTE);
  check(G46, `${f.split('/').pop()} stays on the tokens`, !dirty,
    `found "${dirty ? dirty[0] : ''}" — a legacy colour class cannot follow the theme, so it is ` +
    'right in whichever mode it was written for and wrong in the other');
}
check(G46, 'a bare `border` never survives a migration',
  !MIGRATED.some(f => (noCmt(fs.readFileSync(f, 'utf8')).match(/className="[^"]*"/g) || []).some(c => {
    const t = c.split(/\s+/);
    return t.some(x => ['border', 'border-b', 'border-t', 'border-l', 'border-r'].includes(x)) &&
           !t.some(x => x.startsWith('border-['));
  })),
  'Tailwind\'s default border colour is a THIRD palette on the page and follows neither theme');

/* 🎨 A GRADIENT WITH NO STOPS PAINTS NOTHING. `bg-gradient-to-br` on its own sets a
   linear-gradient whose colour stops are undefined, so the element renders fully transparent and
   takes the page ground instead. It fails SILENTLY — no error, no warning, and on a light ground
   the card simply disappears into the page. Aldi found exactly this on the Sampling year card
   (2026-08-16): "the folder in sampling have the same color with it background".
   The migration caused it — dropping `from-slate-800 to-slate-900` left the direction behind.
   Named stops (`from-gold`, `from-verified`) are real stops and pass. */
const jsxFiles = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = d + '/' + e.name;
    if (e.isDirectory()) jsxFiles(p, out); else if (/\.jsx?$/.test(e.name)) out.push(p);
  }
  return out;
};
const stopless = [];
for (const f of jsxFiles('src')) {
  for (const c of noCmt(fs.readFileSync(f, 'utf8')).match(/className="[^"]*"/g) || []) {
    if (/bg-gradient-to-/.test(c) && !/(^|\s)(from|via)-/.test(c)) stopless.push(f.split('/').pop() + ': ' + c.slice(0, 70));
  }
}
check(G46, 'no gradient is left without its colour stops', stopless.length === 0,
  `${stopless[0] || ''} — the element paints nothing and takes the page background, which reads ` +
  'as an invisible card rather than as a bug');
check(G46, 'the ON bar is a named part the stylesheet can reach',
  /kpm-rail-bar/.test(noCmt(themeSrc)) &&
  /html\.light[^{]*\.kpm-rail-bar\s*\{/.test(clockCss),
  'an arbitrary Tailwind colour on an anonymous span cannot be themed at all');

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   47. THE EOD RECORD KEEPS ITS SOURCES

   Aldi, 2026-08-16: *"we need to make system where this leak of cash or input can be traced down
   to the root"*. That is a data requirement. A total cannot be traced — you cannot ask a number
   which sale it came from — so every card carries the records it was built from, and `declared`
   (agent) is stored separately from `accepted` (regional admin).

   ⚠️ THIS IS THE ONE PART THAT CANNOT BE RETROFITTED. Ship totals-only and traceability becomes a
   data migration instead of a feature, which is why it is pinned here before any card is drawn.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */
const G47 = '47. The EOD record keeps its sources';
const eodRec = fs.existsSync('src/utils/eodRecord.js')
  ? fs.readFileSync('src/utils/eodRecord.js', 'utf8') : '';

check(G47, 'the record shape has a self-check that can be run',
  fs.existsSync('src/config/eodRecord.selfcheck.mjs'),
  'node src/config/eodRecord.selfcheck.mjs — 10 assertions, each verified to go red on a real break');

check(G47, 'declared and accepted are two separate fields',
  /declared:/.test(eodRec) && /accepted:/.test(eodRec),
  'store one number and a changed figure is invisible by construction — there is nothing left to ' +
  'compare it against, so no audit downstream can ever recover it');

/* the getter version passed the first self-check written for it: `{...card}` EVALUATES a getter
   and copies the value, so a derived gap looked stored. Banned outright here rather than tested
   around. */
check(G47, 'the gap is a stored value, never computed on read',
  !/get\s+gap\s*\(/.test(noCmt(eodRec)),
  'a signed gap must say what it was at the moment of approval; a derived one silently moves when ' +
  'a source figure is corrected later, losing the record of what the admin actually signed for');

check(G47, 'every card carries the records it was built from',
  /sources:/.test(eodRec) && /sourcesTotal/.test(eodRec),
  'a card holding only a total is untraceable — the gap has nothing to lead back to');

/* His rule, verbatim: "HQ just care about the money transferred and the sales data ... since HQ
   cant monitor the real supply number on the regional warehouse then the HQ will just trust the
   regional admin for that". Stock is deliberately outside HQ's reconciliation. */
check(G47, 'HQ reconciles money only, not stock',
  /HQ_CARDS\s*=\s*\[\s*'cash',\s*'transfer'\s*\]/.test(eodRec),
  'HQ cannot see the regional warehouse, so a goods gap entering its reconciliation would be a ' +
  'number nobody can check');

check(G47, 'the three signatures are enforced as a sequence',
  /cannot sign \$\{step\} before/.test(eodRec),
  'three approvals only mean something in order — a regional signature with no agent signature, ' +
  'or an HQ signature with no regional one, is a broken chain');

/* =============================================================================================
   48. A PHYSICAL COUNT CANNOT EXCEED WHAT WAS CARRIED
   Aldi, 2026-08-17: *"i add more item and submit on the EOD it still allow us to sent the item
   data more than what the agent bring, this is really niche happen tho"*. Niche and expensive:
   `handleVerifyEOD` spends `report.cukai` against the debt ledger and turns any surplus into a
   NEGATIVE `global_credit`, which permanently reduces what the agent owes on later days. So an
   over-count does not just record a wrong number — it mints stamp credit nobody earned.
   ⚠️ These assert the RELATIONSHIP (a ceiling exists, and it is enforced where the number is
   written, not only where it is typed), never a specific figure — group 39's rule.
   ============================================================================================= */
const G48 = '48. A physical count cannot exceed what was carried';
const deckSrc = fs.existsSync('src/components/EODCardDeck.jsx')
  ? fs.readFileSync('src/components/EODCardDeck.jsx', 'utf8') : '';
const eodView = fs.existsSync('src/EODReconciliationView.jsx')
  ? fs.readFileSync('src/EODReconciliationView.jsx', 'utf8') : '';

check(G48, 'a counted line is clamped to that line\'s own load',
  /clampLine/.test(deckSrc) && /Math\.min\(n,\s*max\)/.test(deckSrc),
  'you cannot hand back more packs than the van was loaded with — an impossible number is refused ' +
  'at entry rather than recorded as a gap');

check(G48, 'the clamp is applied where the record is BUILT, not only in the input',
  /amount:\s*clampLine\(/.test(deckSrc),
  'the input clamp is what the agent sees; a record that trusts its own UI is not a record');

check(G48, 'lines that each fit can still be refused for adding up too high',
  /maxTotal/.test(deckSrc) && /overTotal/.test(deckSrc),
  '128 stamps handed over plus 128 lost is 256 against a debt of 128 — every line legal, the pair ' +
  'impossible');

/* =============================================================================================
   49. A TRANSFER IS CHECKED, NOT COUNTED
   Aldi, 2026-08-17, choosing this over typing a total: *"it is better when there is some list of
   the receipt that been printed today, if less give the agent option to write the real value"*.
   Cash, goods and stamps are things in a hand. A bank transfer is not — it reached the account or
   it did not — so a typed total is arithmetic the agent should not be doing, and it destroys the
   only fact worth having: typing 700.000 against 1.200.000 says half a million is missing; ticking
   says WHICH customer's payment never landed.
   ============================================================================================= */

/* ============================================================================
   G50 - A BUTTON THAT IS GOLD ONLY ON HOVER MUST BE READABLE BEFORE IT IS HOVERED.
   22 buttons carry text-[var(--gold-ink)] permanently while the plate arrives on hover. With
   a bone --gold-ink that is 1,11:1 at rest on a raised card, and a phone never hovers at all.
   theme.css fixes all 22 with one rule; this asserts the rule survived the BUILD, because a
   contrast pair can prove the COLOUR is readable and never that the rule reaches the button.

   This slot previously guarded a 1px rim, for the two commits when light mode used a pale
   steel plate. Aldi looked at that in the app and reversed it - the plate is near-black again
   and carries itself at 9,39:1, so the rim and its guard went with it.
   ============================================================================ */
const G50 = 'G50 · a hover-only gold button reads at rest';
const REST_SEL = 'html.light [class~="hover:bg-[var(--gold)]"][class~="text-[var(--gold-ink)]"]';

check(G50, 'the hover-only rest rule survived the build',
  css.includes(REST_SEL),
  'without it 22 buttons show bone ink on a pale card at 1,11:1 until you hover them');

check(G50, 'a button that is ALWAYS gold keeps its bone ink',
  css.includes(REST_SEL) &&
  css.slice(css.indexOf(REST_SEL), css.indexOf(REST_SEL) + 260)
     .includes(String.fromCharCode(58) + 'not([class~="bg-[var(--gold)]"])'),
  'several buttons carry both the plate and the hover variant - those are gold at rest');

check(G50, 'the rest rule is one compound selector, not a descendant selector',
  css.includes(REST_SEL + String.fromCharCode(58) + 'not('),
  'whitespace before :not() would match something INSIDE the button instead of the button');


/* ============================================================================
   G51 - THE GOLD PLATE MUST CARRY ITS OWN INK.
   --gold and --gold-ink are a PAIR. Any other ink token on a gold plate is a dark-on-dark
   accident in light mode, and this was not hypothetical: the two buttons at the top of Sampling
   read --ink on the plate, which measured 1,04:1 once the plate went stencil. Aldi saw it in the
   app in the first screenshot ever taken of this project.

   It had been broken far longer. --accent-ink on the OLD brown plate measured 1,54:1, so those
   notes and badges had never been readable in light mode - nobody had ever looked at them.
   16 ink references were repaired in one pass; this is what stops the 17th.

   ⚠️ THIS GUARD IS SCOPED TO THE ELEMENT, NOT TO THE LINE, AND THAT IS THE WHOLE DESIGN.
   The first version scanned lines and fired 30 times, of which about 26 were lookalikes:
     - a ternary whose OTHER branch carried --ink-dim, on an element that is never gold;
     - group-hover:bg-[var(--gold)] paired with group-hover:text-[var(--gold-ink)], which is
       correct code - the pair switches together;
     - two unrelated elements sharing one source line, one gold, one grey.
   So it reads one className value at a time, and only complains when the bad ink is in the
   STATIC part of that value while gold can actually apply. A guard that cries wolf gets
   switched off, which is worse than no guard.
   ============================================================================ */
const G51 = 'G51 · the gold plate carries its own ink';
const BAD_INKS = ['text-[var(--ink)]', 'text-[var(--accent-ink)]', 'text-[var(--ink-dim)]'];

/* every className value in a file, whether written as "..." or as {`...`} */
const classValues = (src) => {
  const out = [];
  let i = 0;
  for (;;) {
    const k = src.indexOf('className=', i);
    if (k < 0) return out;
    let j = k + 10;
    if (src[j] === '"') {
      const end = src.indexOf('"', j + 1);
      if (end < 0) return out;
      out.push(src.slice(j + 1, end));
      i = end + 1;
    } else if (src[j] === '{') {
      /* brace-count so a nested ${...} does not end the value early */
      let depth = 0, end = -1;
      for (let p = j; p < src.length; p++) {
        if (src[p] === '{') depth++;
        else if (src[p] === '}') { depth--; if (depth === 0) { end = p; break; } }
      }
      if (end < 0) return out;
      out.push(src.slice(j + 1, end));
      i = end + 1;
    } else i = j;
  }
};

/* the part that always applies - everything outside a ${...} interpolation */
const staticPart = (cls) => {
  let out = '', depth = 0;
  for (let p = 0; p < cls.length; p++) {
    if (cls[p] === '$' && cls[p + 1] === '{') { depth++; p++; continue; }
    if (depth > 0) { if (cls[p] === '{') depth++; else if (cls[p] === '}') depth--; continue; }
    out += cls[p];
  }
  return out;
};

/* a class that is NOT behind a variant prefix. `group-hover:bg-[var(--gold)]` only paints on
   hover and switches its ink in the same breath; `disabled:text-[var(--ink-dim)]` comes with
   its own `disabled:bg-[var(--sunk)]`. Both are correct code, and both tripped this guard
   before the prefix test was applied to the INK side as well as the plate side. */
const hasPlain = (cls, needle) => {
  let at = cls.indexOf(needle);
  while (at > -1) {
    if (at === 0 || cls[at - 1] !== ':') return true;
    at = cls.indexOf(needle, at + 1);
  }
  return false;
};

const inkOffenders = [];
for (const dir of ['src', 'src/components']) {
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.jsx'))) {
    const path = dir + '/' + f;
    for (const cls of classValues(fs.readFileSync(path, 'utf8'))) {
      if (!hasPlain(cls, 'bg-[var(--gold)]')) continue;
      const stat = staticPart(cls);
      for (const bad of BAD_INKS) if (hasPlain(stat, bad)) inkOffenders.push(path + ' ' + bad);
    }
  }
}
check(G51, 'no gold plate carries --ink, --accent-ink or --ink-dim',
  inkOffenders.length === 0,
  inkOffenders.join(' · ') || 'the paired ink is --gold-ink, 15,82:1 on the stencil plate');


/* ============================================================================
   G52 - LITE MODE MUST NOT PAINT THE DESK RAIL.
   Aldi, 2026-08-24: *"another thing that i see broke is actually sidebar on lite mode"*.
   Measured in his Chrome: the sidebar panel was painting rgba(46,38,26,.72) across 351x688px,
   dimming the entire left column of every screen in Lite Mode.

   CAUSE: the panel carries `backdrop-blur-xl`, and index.css has a blanket
   `html.lite-mode [class*="backdrop-blur"] { background-color: var(--duke-scrim) !important }`
   whose own comment claims every element it hits is a scrim or an overlay. On a desk this one
   is neither - it is an invisible window, and the capsule inside it is the sidebar. An
   !important beat the panel own `lg:bg-transparent`, and a blanket attribute selector could
   not tell a window from a scrim.

   The fix hands the background back at >=1024px only. TWO halves, and both are asserted:
   the rail must be transparent on a desk, AND the blur must still be stripped, or Lite Mode
   would be quietly paying for a blur on the exact phones it exists to protect.
   ============================================================================ */
const G52 = 'G52 · Lite Mode leaves the desk rail alone';
const LITE_RAIL = 'html.lite-mode [data-kpm-rail][data-kpm-rail]{background-color:transparent!important}';

check(G52, 'the desk rail keeps a transparent background in Lite Mode',
  css.includes(LITE_RAIL),
  'without it the panel paints --duke-scrim over the whole left column');

check(G52, 'that override is scoped to the desk, not to the phone',
  css.includes(LITE_RAIL) &&
  css.slice(Math.max(0, css.indexOf(LITE_RAIL) - 400), css.indexOf(LITE_RAIL)).includes('min-width:1024px'),
  'below 1024px the rail IS a drawer over the page and the scrim is correct there');

check(G52, 'Lite Mode still strips the blur from everything',
  /* the minifier drops the quotes inside an attribute selector, so this asserts the BUILT
     form - a first attempt matched the source form and went red against working CSS. */
  css.includes('[class*=backdrop-blur]') &&
  css.includes('backdrop-filter:none!important'),
  'handing the background back must not hand the blur back too');

const G49 = '49. A transfer is checked, not counted';

check(G49, 'the transfer card offers all three verdicts he specified',
  /'landed'/.test(deckSrc) && /'less'/.test(deckSrc) && /'missing'/.test(deckSrc),
  'his rule was BOTH cases — "never arrived, AND arrived for less than recorded" — so two states ' +
  'is not enough; "less" is the one that needs a figure typed');

check(G49, 'a receipt row keeps its own transaction id',
  /txId:\s*r\.txId/.test(deckSrc),
  'a synthetic key would make the row untraceable back to the sale it came from, which is the ' +
  'entire reason this card stopped being a number pad');

check(G49, '"less" is not decided until a figure is typed',
  /t\.v\s*!==\s*'less'\s*\|\|/.test(deckSrc),
  '"short by an unknown amount" is not a record anybody can act on');

check(G49, 'the composer forwards the receipt rows to the deck',
  /receipts=\{receipts\}/.test(
    fs.existsSync('src/components/EODAgentFlow.jsx')
      ? fs.readFileSync('src/components/EODAgentFlow.jsx', 'utf8') : ''),
  'the same drop-in-the-middle that made `maxTotal` a guard which existed at both ends and did ' +
  'nothing — checked here because it has already happened once on this component');

/* ⚠️ THE CARDS ARE ABSOLUTELY POSITIONED IN A FIXED-HEIGHT BOX, so a card taller than the box does
   not clip — it spills over the confirm button and eats the taps. Measured in the harness: with
   the progress row AND the fine plate both showing, the pita cukai card was 354px inside a 344px
   box; the transfer card was 350px. Neither figure is asserted here (group 39's rule) — what is
   asserted is that the finished-progress row retires, which is what bought the room back. */
check(G49, 'the progress row retires once its card is complete',
  /filled\s*<\s*cardLines\.length/.test(deckSrc),
  '"2 of 2 counted" beside a cash-fine plate is a line that has finished its job still taking ' +
  'room a fixed-height card does not have');

check(G48, 'the composer forwards the total cap to the deck',
  /maxTotal=\{maxTotal\}/.test(
    fs.existsSync('src/components/EODAgentFlow.jsx')
      ? fs.readFileSync('src/components/EODAgentFlow.jsx', 'utf8') : ''),
  'the cap was added to the deck and to the screen and dropped in the middle — the guard existed ' +
  'and did nothing, which is worse than no guard');

check(G48, 'money cards are deliberately NOT capped',
  !/max:\s*agentData\.expected(Cash|Transfer)/.test(eodView),
  'an agent genuinely can hold more cash than the app expected, and that over IS a real gap worth ' +
  'keeping — the ceiling belongs to physical objects only');

check(G48, 'the legacy stamp card clamps too, at the input and at the submit',
  /clampStamps/.test(eodView) && /cukaiOverCount/.test(eodView) &&
  /Math\.min\(cukaiReturnedNum,\s*cukaiOwed\)/.test(eodView),
  'that card is still reachable whenever cash was submitted first, and it writes the same ' +
  '`cukai` figure the debt ledger is spent against');

/* ⚠️ COMMENTS STRIPPED FIRST. Both of these failed on their first run against the very comment
   written to explain the fix — the sentence "the two fields were `bg-black/60`" is not a
   `bg-black/60`. A check that cannot tell code from prose about code reports the bug forever. */
const eodViewCode = noCmt(eodView);

check(G48, 'no gold slab carries gold ink anywhere on this screen',
  !/bg-\[var\(--gold\)\][^"'`]*text-\[var\(--ink-dim\)\]/.test(eodViewCode) &&
  !/bg-\[var\(--gold\)\][^"'`]*text-\[var\(--accent-ink\)\]/.test(eodViewCode),
  'his verdict on the old card: "the color pallete and design is really bad". Gold ink on a gold ' +
  'plate is not a contrast nit, it is text that is not there. `--gold-ink` is the ink that plate ' +
  'has; `--accent-ink` IS the gold');

check(G48, 'the stamp card decides no colour of its own',
  !/bg-black\/60/.test(eodViewCode),
  'a hardcoded black lets the dark theme decide what light mode looks like — no token, no palette ' +
  'law and no contrast check can see it');

/* ═══════════════════════════════════════════════════════════════════════════
   53. One surat jalan, two directions

   The Restock Vault became a single waybill desk on 2026-08-26: Masuk and Kirim
   are the same form with the route reversed, and Buku opens each row into the
   document it came from. These five are the load-bearing parts of that — the
   ones that lose money or lose stock if they quietly revert.
   ═══════════════════════════════════════════════════════════════════════════ */
const G53 = '53. One surat jalan, two directions';
const restockCode = fs.readFileSync('src/RestockVaultView.jsx', 'utf8');

/* This screen was the last one painting itself instead of asking the theme — 58 × text-white and
   32 × bg-black/xx, which is exactly why light mode could never reach it. */
/* The printed nota is a documented palette exception — it is white paper in both themes, because
   --ink-muted would print at 2,3:1 on white. Its lines are excluded by name, not by loosening the
   needle, so a raw colour anywhere else still fails loudly. */
/* ⚠️ COMMENTS STRIPPED FIRST — the same trap group 48 already paid for, which this check was
   written without. It fired on 2026-08-27 against the sentence explaining the fix: the comment
   "the original was `text-white` on `bg-black/50`" is prose ABOUT a raw colour, not a raw colour.
   A check that cannot tell the two apart reports the bug forever and teaches you to stop writing
   the comment, which is the wrong lesson to learn twice. */
const restockThemed = noCmt(restockCode).split('\n')
  .filter(l => !l.includes('print-receipt') && !l.includes('no-print')).join('\n');
const rawWhite = (restockThemed.match(/text-white/g) || []).length;
const rawBlack = (restockThemed.match(/bg-black\//g) || []).length;
check(G53, 'the desk asks the theme for every colour instead of painting itself',
  rawWhite === 0 && rawBlack === 0,
  `found ${rawWhite} × text-white and ${rawBlack} × bg-black/xx — both must stay 0, or light mode ` +
  'silently loses this screen again (the printed nota is white on purpose and uses bg-white, not these)');

/* The branch receive screen reads fulfilledItems first and falls back to requestedItems. A push has
   no request to fall back to, so writing only one key makes the shipment either invisible or
   impossible to receive — and the stock is already out of HQ by then. */
check(G53, 'an HQ push writes both item keys, so the branch can still receive it',
  /requestedItems: lines/.test(restockCode) && /fulfilledItems: lines/.test(restockCode),
  'handleHQPush must write requestedItems AND fulfilledItems — the branch reads fulfilledItems ' +
  'first and falls back to requestedItems, and a push that writes neither strands the stock');

/* Same bug BranchWarehouseManager already paid for: a total recomputed from the screen's copy of
   stock undoes anything sold while the photo uploaded. increment() applies it server-side. */
check(G53, 'an HQ push deducts the difference server-side, never a recomputed total',
  /stock: increment\(-line\.qty\)/.test(restockCode),
  'the push must deduct with increment(-qty). Writing a recomputed total resurrects anything sold ' +
  'during the photo upload — the exact failure fixed in BranchWarehouseManager');

/* Cukai and upah bongkar are an INTAKE cost. Charging them again on the way out double-counts them
   into the branch's landed cost and every margin computed from it. */
check(G53, 'cukai and upah bongkar are not charged twice on the way out',
  /isOut \? 0 : \(Number\(poData\.laborCost\)\|\|0\) \+ \(Number\(poData\.exciseTax\)\|\|0\)/.test(restockCode),
  'the outbound total must exclude exciseTax and laborCost — a branch does not pay the factory\'s ' +
  'cukai a second time, and a double-counted landed cost poisons every margin downstream');

/* His law: a blocked dialog does nothing, so it can never explain itself. The meter reports; it
   does not gate. Only an empty document or an in-flight save may disable the button. */
check(G53, 'the completeness meter reports but never blocks a save',
  /disabled=\{isSubmitting \|\| cart\.length === 0\}/.test(restockCode) &&
  !/disabled=\{[^}]*donePct/.test(restockCode),
  'the save button may only be disabled while submitting or with an empty document. Gating it on ' +
  'donePct turns the meter into a block, and a block explains nothing');

/* A photo of goods or of a nota is evidence, and evidence is taken at the warehouse, now. A gallery
   pick can be any picture from any day — the exact thing the photo exists to rule out. Both inputs
   must therefore ask for the camera unless the tier rule says otherwise, and that rule must be the
   shared one, not a second copy that can drift. */
/* 2 → 3 on 2026-08-27: the shipping-proof photo arrived with the Request tab. It is the same kind
   of evidence and it earns the same rule — a photo of a sealed package with its resi on it is
   worthless if it can be any picture from any day. Deliberately counted, not loosened to ">= 2":
   the count is what catches an input that quietly dropped the spread. */
check(G53, 'all three evidence photos ask for the camera unless the tier rule allows the gallery',
  /canPickFromGallery/.test(restockCode) &&
  (restockCode.match(/galleryOk \? \{\} : \{ capture: 'environment' \}/g) || []).length === 3 &&
  /export const canPickFromGallery/.test(fs.readFileSync('src/config/permissions.js', 'utf8')),
  'the foto-barang, the nota AND the shipping-proof inputs must each spread capture:"environment" ' +
  'unless canPickFromGallery says otherwise, and that helper must live in permissions.js beside ' +
  'the other tier checks — a second copy of the translation is what has caused every tier bug ' +
  'in this project so far');

/* The nota was disabled on Kirim once, and a dead grey control that never says why is the silence
   he calls a bug. It is optional there, not forbidden. */
check(G53, 'the nota is never a dead control on the outbound side',
  !/disabled=\{isOut\}/.test(restockCode),
  'the nota input must not be disabled on Kirim. An internal transfer usually has no supplier nota, ' +
  'so it is optional there — a blocked control that explains nothing is worse than an empty one');

/* 🔴 A duplicate prop is legal JSX and nothing warns you — the LAST one silently wins. The rail's
   <nav> carried two `style` props for weeks, so `touchAction:'none'` never ran and the paragraph
   explaining why it mattered described a fix that was not there. Found 2026-08-26 while chasing a
   different bug, which is the only way this class of fault is ever found. Counted per element
   rather than per file: a second `style=` elsewhere in the shell is fine, two on one tag is not. */
/* ⚠️ NOT a `/<nav[\s\S]*?>/` match. That was tried first and reported 0 style props: the tag
   contains arrow functions, so the non-greedy scan stops at the `>` in `(e) => {`. Anchor on the
   class instead and walk back to the tag that owns it. */
const shellNav = fs.readFileSync('src/components/BiohazardTheme.jsx', 'utf8');
const railClassAt = shellNav.indexOf('kpm-rail-grid grid');
const navTag = railClassAt < 0 ? '' : shellNav.slice(shellNav.lastIndexOf('<nav', railClassAt), railClassAt);
check(G53, 'the rail nav carries exactly one style prop',
  (navTag.match(/\sstyle=\{/g) || []).length === 1 && /touchAction: 'none'/.test(navTag),
  `the rail's <nav> has ${(navTag.match(/\sstyle=\{/g) || []).length} style props and touchAction ` +
  `${/touchAction/.test(navTag) ? 'is' : 'is NOT'} inside the tag — JSX keeps only the last style, ` +
  'so a second one deletes the first without a warning');

/* ═══════════════════════════════════════════════════════════════════════════
   54. The Request tab, and the roster behind Tujuan

   Built 2026-08-27. HQ's only way to answer a branch request used to live inside
   BranchWarehouseManager — the BRANCH screen — while every other surat jalan
   lived on the Restock Vault desk. It moved to the desk's 4th tab. Nothing was
   copied: the rows, the drawer, the timeline, "Edit resi" and "Hapus" are the
   Buku machinery, and only the shipping modal travelled.
   ═══════════════════════════════════════════════════════════════════════════ */
const G54 = '54. The Request tab, and the roster behind Tujuan';
/* `appSrc` is the raw App.jsx already read for group 6 — re-reading it would just be a second
   name for the same string. */
const bwmCode = fs.readFileSync('src/components/BranchWarehouseManager.jsx', 'utf8');
/* 🔴 THE TABLE'S MARKUP LEFT THIS FILE ON 2026-08-27. `BranchWarehouseManager` kept the maths and
   now renders `ponder/stages/StockByWarehouseTable.jsx`, so the tutorial can play the SAME
   component against a fixed demo world. Every check below that asserts a COLUMN, a CELL or a ROW
   reads the table; every check that asserts a SUM still reads the manager. Splitting a component
   splits its checks — the alternative is a check that greps the wrong file and passes because it
   found its needle in a comment somewhere else. */
const stockTableSrc = fs.readFileSync('src/ponder/stages/StockByWarehouseTable.jsx', 'utf8');
/* And the footnote's five paragraphs left the SCREEN entirely, on his call — *"we can delete this
   ... i mean the instruction below company total"*. They are tutorial beats now, in Indonesian.
   Check 631 MOVED onto this file rather than being deleted with the paragraph it used to pin. */
const stockSceneSrc = fs.readFileSync('src/ponder/scenes/stock-by-warehouse.js', 'utf8');

/* His ask: "make sure that every team registered on the fleet and roster have their own storage
   option". Built from stockRequests alone, a team that had never been shipped to had no entry —
   so the warehouse that most needed its first delivery was the only one HQ could not pick. */
check(G54, 'Tujuan is built from the roster, not only from what has already shipped',
  /\.\.\.motorists\.map\(m => m\?\.location\)/.test(restockCode) &&
  /\.\.\.stockRequests\.map\(r => r\?\.branch\)/.test(restockCode),
  'branchesSeen must UNION the motorists roster with the branches seen on past requests. Roster ' +
  'only would drop a live shipment whose location was renamed; requests only is the original bug');

/* 🔴 CAUGHT ON SCREEN, 2026-08-27, and only on screen: the first version of the roster union
   filtered `!== 'UNASSIGNED'` — its own short list — so "Headquarters" arrived in Tujuan as a
   CABANG, sitting beside the real "Gudang Pusat (HQ)" entry. Two destinations for one place, on
   the form that writes stock movements. supply.js already owned the rule and says so in prose:
   "Headquarters is not a branch — Headquarters IS the master vault". The fix was to export
   NON_BRANCH and use it, not to lengthen a second copy of the list. */
check(G54, 'Tujuan asks supply.js what counts as a branch instead of deciding for itself',
  /* The name must come FROM supply.js; the rest of the import list is free to grow. Pinning the
     exact list made this go red on 2026-08-30 for the crime of importing `bufferDays` beside it —
     a check that fails when nothing it guards has changed is a check people learn to ignore. */
  /import \{[^}]*\bNON_BRANCH\b[^}]*\} from '\.\/utils\/supply\.js'/.test(restockCode) &&
  /!NON_BRANCH\.includes\(n\)/.test(restockCode) &&
  /export const NON_BRANCH/.test(fs.readFileSync('src/utils/supply.js', 'utf8')),
  'branchesSeen must filter through the NON_BRANCH exported by supply.js. A local list here drifts ' +
  'from the one the dashboard counts by, and the first thing that slips through is Headquarters — ' +
  'which is the master vault, not a cabang you can ship to');

/* 🔴 The half that fails silently. A prop that is never passed defaults to [], the union quietly
   degrades back to history-only, and the screen looks exactly the same as when it was right. */
const rvTag = appSrc.slice(appSrc.indexOf('<RestockVaultView'), appSrc.indexOf('<RestockVaultView') + 900);
check(G54, 'App.jsx actually hands the roster to the desk',
  /motorists=\{motorists\}/.test(rvTag),
  'RestockVaultView must be given motorists={motorists}. Without it the prop defaults to [], the ' +
  'roster half of Tujuan silently contributes nothing, and the screen looks identical to the bug');

/* The queue kept all three open states on purpose — PENDING alone would make every shipment
   already on the road invisible to HQ, which is strictly less than the panel it replaced. */
check(G54, 'the queue still shows every request that is still HQ’s problem',
  /const REQ_RANK = \{ DISPUTED: 0, PENDING: 1, IN_TRANSIT: 2 \}/.test(restockCode),
  'REQ_RANK is both the filter and the sort. Narrowing it to PENDING hides shipments already on ' +
  'the road; ranking DISPUTED last buries the one state nobody goes looking for');

/* 🔴 A <button> inside a <button> is invalid HTML and the inner one stops receiving clicks. The
   row had to become a flex PAIR to keep Siapkan Pengiriman at one click. */
const rowStart = restockCode.indexOf('onClick={() => setExpandedPO(open ? null : row.key)}');
const siapkanAt = restockCode.indexOf('onClick={() => handleStartFulfillment(po)}');
check(G54, 'the Siapkan button is a sibling of the row, never nested inside it',
  rowStart > 0 && siapkanAt > rowStart &&
  restockCode.slice(rowStart, siapkanAt).includes('</button>'),
  'the row button must CLOSE before the Siapkan button opens. Nesting them is legal JSX, renders ' +
  'without a warning, and silently kills the inner click');

/* Same failure BranchWarehouseManager already paid for once: a total recomputed from the screen's
   copy of stock undoes anything sold while the photo uploads. */
check(G54, 'shipping deducts the difference server-side, never a recomputed total',
  /stock: increment\(-Number\(item\.qty\)\)/.test(restockCode),
  'handleShipItems must deduct with increment(-qty). The screen’s copy of HQ stock is read ' +
  'before the photo is compressed and uploaded — seconds, sometimes minutes on a phone — and a ' +
  'recomputed total resurrects everything sold in that gap');

/* It MOVED. If a second copy ever appears, a fix to one silently misses the other — and this one
   deducts HQ stock, so the drift is money. */
check(G54, 'the shipping modal exists in exactly one place',
  /Siapkan pengiriman ke \{isFulfilling\.branch\}/.test(restockCode) &&
  !/isFulfilling/.test(bwmCode) && !/handleShipItems/.test(bwmCode),
  'the fulfilment modal belongs to the Request tab alone. BranchWarehouseManager must carry no ' +
  'isFulfilling state and no handleShipItems — two copies of a stock deduction drift apart, and ' +
  'the one nobody edited is the one that keeps running');

/* ── report ──────────────────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════════
   55. Global Logistics — where every pack is

   His ask, 2026-08-26: *"show the regional warehouse current stock, on field,
   sold as well just like what we have on the dashboard, so HQ know how many bks
   should be send to them again"*. "Just like the dashboard" is not a styling
   note — it is a correctness requirement, and these checks are what keeps it
   true after someone edits one screen and not the other.
   ═══════════════════════════════════════════════════════════════════════════ */
const G55 = '55. Global Logistics — where every pack is';
const syncCode = fs.readFileSync('src/hooks/useDatabaseSync.js', 'utf8');
const dashCode = fs.readFileSync('src/components/DashboardView.jsx', 'utf8');

/* 🔴 The number that can silently lie. `transactions` is a SEVEN-DAY listener, so "terjual" can
   only ever mean seven days — and the panel prints that claim in words. Widen the listener and
   the heading keeps saying 7 while the figure means something else; nothing else would notice. */
check(G55, 'the terjual window and the transactions listener still agree',
  /where\('timestamp', '>=', sevenDaysAgo\)/.test(syncCode) &&
  /const SEVEN_DAYS = 7;/.test(bwmCode) &&
  /last 7 days/.test(bwmCode),
  'the panel prints a "last 7 days" claim and divides by SEVEN_DAYS to get the rate. That ' +
  'is only true while the transactions listener is capped at sevenDaysAgo — move the cap and ' +
  'both the label and every "sisa hari" become wrong without a single visible symptom');

/* The maths is the dashboard's, not a second copy. Two implementations of "where is every pack"
   WILL drift, and the screen nobody edited is the one that keeps being believed. */
check(G55, 'the readout runs the dashboard’s supply maths, not its own copy',
  /* Same loosening as G54, same day, same reason: the guarantee is that these three names come
     from supply.js, not that the import list is frozen at exactly three. */
  /import \{[^}]*\bsupplyByProduct\b[^}]*\bwarehouseList\b[^}]*\bMASTER\b[^}]*\} from '\.\.\/utils\/supply\.js'/.test(bwmCode) &&
  /supplyByProduct\(\{/.test(bwmCode) && /supplyByProduct\(\{/.test(dashCode),
  'BranchWarehouseManager must call supplyByProduct from utils/supply.js — the same function the ' +
  'dashboard calls. Re-deriving shelf/field/sold here is how the two screens start disagreeing ' +
  'about the same warehouse');

/* 🔴 Three props, all of which fail SILENTLY: each defaults to an empty value, so a missing one
   renders a panel full of confident zeroes rather than an error. */
const bwmTag = appSrc.slice(appSrc.indexOf('<BranchWarehouseManager'), appSrc.indexOf('<BranchWarehouseManager') + 1200);
check(G55, 'App.jsx hands the readout all three collections it counts',
  /motorists=\{motorists\}/.test(bwmTag) &&
  /transactions=\{transactions\}/.test(bwmTag) &&
  /branchStockMap=\{branchStock\}/.test(bwmTag),
  'BranchWarehouseManager needs motorists, transactions AND branchStockMap. Every one of them ' +
  'defaults to empty, so a prop that is never passed prints zeroes instead of failing — the ' +
  'worst possible way for a stock figure to be wrong');

/* His ask, 2026-08-27: *"so that i can see the full detail for every single item status"*, then
   *"basically isi gudang cabang ... inside the dropdown"*. The drawer must print the SAME list the
   row totals are summed from — computing it twice is how a row and its own detail start
   disagreeing, which is worse than not having the drawer at all. */
check(G55, 'a warehouse row and its open drawer are summed from one list',
  /const detail = \[\.\.\.byId\.values\(\)\]/.test(bwmCode) &&
  /: detail\.reduce\(\(s, p\) => s \+ p\.transit, 0\)/.test(bwmCode) &&
  /r\.detail\.map\(/.test(stockTableSrc),
  'the di-jalan total must be summed from `detail`, the same array the drawer renders. Summing ' +
  'the row over globalInventory while the drawer renders a filtered list is how the two drift');

/* 🔴 supplyByProduct drops any product whose shelf+field+sold is 0 — right for a supply picture,
   wrong for a branch waiting on its FIRST delivery, where what is coming is the whole answer. */
check(G55, 'a product in transit to an empty warehouse still appears in its drawer',
  /if \(!byId\.has\(p\.id\)\) byId\.set/.test(bwmCode),
  'in-transit products must be UNIONED into the detail, not looked up inside supplyByProduct’s ' +
  'rows. A brand-new branch holds nothing and has sold nothing, so every one of its incoming ' +
  'products would be filtered out — the exact branch the drawer matters most for');

/* His words, 2026-08-27: *"i want where u got that calculation for every item"*. A quotient
   printed without its divisor asks him to trust a number he cannot check, so "Avg / month" sits
   beside "Est. days left" and the footnote writes both divisions out longhand. */
check(G55, 'the estimate shows the rate it was divided by, and says so in words',
  /Avg \/ month/.test(stockTableSrc) && /Est\. days left/.test(stockTableSrc) &&
  /= Sold \(7d\) ÷ 7 × 30/.test(stockSceneSrc) &&
  /= In stock ÷ \(Sold \(7d\) ÷ 7\)/.test(stockSceneSrc),
  'both columns must stay on the table, and both divisions must stay written out longhand — in ' +
  'the SCENE now, not the footnote. "Est. days left" alone is a number with no shown working, ' +
  'and the ≈ on the monthly figure is what stops a one-week extrapolation reading as a measured ' +
  'monthly average. THIS IS THE CHECK THAT MOVED when the footnote was deleted; deleting it with ' +
  'the paragraph would have been how the unexplained quotient came back');

/* 🔴 A RATIO OF SUMS IS NOT AN AVERAGE. This shipped and Aldi caught it on screen, 2026-08-27:
   *"u cant just divide total with the average goods like that, these are different goods should
   have their own depleted number"*. The warehouse row divided TOTAL shelf by TOTAL sales rate and
   printed 348 days for the master vault — a rate supplied entirely by ONE product, while the
   product people actually buy had 20 days left. The division needs its numerator and denominator
   to describe the SAME fungible good; Bks add across products, but demand does not transfer.
   Sums stay (shelf, sold, perMonth are real pack counts). The division is per product only. */
check(G55, 'no warehouse-level days-left, because that division is not a number',
  !/const daysLeft = perDay/.test(bwmCode) &&
  /* The guarantee is the ABSENCE of daysLeft on the warehouse row, not a frozen field list. Pinning
     the exact literal made this go red on 2026-08-30 for the crime of adding `minimum` beside it —
     third check that month to fail while everything it guards was intact. A check that fires on a
     change it does not care about is a check people learn to route around. */
  /return \{ name, shelf, transit, field, sold, perMonth,[^}]*detail \}/.test(bwmCode) &&
  !/return \{ name,[^}]*\bdaysLeft\b[^}]*\}/.test(bwmCode) &&
  /348/.test(stockSceneSrc) && /gudang penuh/.test(stockSceneSrc),
  'the warehouse row must NOT carry a computed daysLeft, and the tutorial must still say why. ' +
  'Anchored on the 348 that actually shipped rather than on a sentence, because a check tied to ' +
  'display copy fires on every wording change and this panel already did that twice. Total ' +
  'stock ÷ total rate silently assumes one product can satisfy demand for another — and it errs ' +
  'COMFORTABLE, which is the worst direction for a restocking figure');

/* Sold packs are not anywhere any more. Putting them in a "where is it" bar shrinks every other
   segment in proportion to how WELL a branch is doing, which reads as the opposite of the truth. */
check(G55, 'the where-is-it bar leaves sold out of its segments',
  /const here = r\.shelf \+ \(r\.transit \|\| 0\) \+ r\.field;/.test(stockTableSrc) &&
  !/const here = [^;]*r\.sold/.test(stockTableSrc),
  'the stacked bar may only contain shelf, transit and field. A sold segment makes a branch that ' +
  'is selling well look like a branch that is holding less');

/* stock_requests only ever run HQ → branch, so a transit figure on MASTER would be an empty sum
   dressed up as a measurement. It must print as unknown, not as zero. */
check(G55, 'the master vault prints no in-transit figure it cannot have',
  /name === MASTER/.test(bwmCode) && /\? null/.test(bwmCode) &&
  /r\.transit === null \? <span className="text-ink-muted">—<\/span>/.test(stockTableSrc),
  'nothing is ever in transit TO the master vault on a stock_request. A 0 there is a claim that ' +
  'was measured; — is the truth, which is that this column does not apply');


/* ═══════════════════════════════════════════════════════════════════════════
   56. PONDER — the in-app tutorial engine (slice 1)

   His ask, 2026-08-27: *"custom instruction menu on each of every components ... so that if our
   user forgot they can just see it from there"*, built like Create mod's Ponder. A scene is
   DATA, the engine plays it, and a `?` chip on the panel opens it. Three of his answers are
   pinned here as checks rather than as prose, because a paragraph goes stale in silence:
   autoplay with a real pause, a restart, a scrubbable timeline; teaching in Indonesian with the
   feature names left in English; and nothing that pushes a first-time user into a scene.
   ═══════════════════════════════════════════════════════════════════════════ */
const G56 = '56. Ponder — the in-app tutorial';

/* 🔴 STRIPS BOTH COMMENT FORMS, unlike `noCmt` further up, which only removes block comments.
   Every check in this group greps a file whose own comments DESCRIBE the pattern being
   asserted — the engine's header explains why the bar is a scaleX written to the DOM, the
   overlay's explains the spotlight. Group 53 was written without this and went red against
   correct code, on the comment recording the fix. */
const pStrip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const pRead = (f) => pStrip(fs.readFileSync('src/ponder/' + f, 'utf8'));
const overlaySrc = pRead('PonderOverlay.jsx');
const playerSrc = pRead('useScenePlayer.js');
const bookSrc = pRead('PonderBook.jsx');
const sfxSrc = pRead('sfx.js');
/* shellSrc is already read at group 15 - the shell is one file and re-reading it under a second
   name is how two checks end up asserting against two different strings. */
const registrySrc = pRead('registry.js');
const sceneFiles = fs.readdirSync('src/ponder/scenes').filter(f => f.endsWith('.js'));
/* ⚠️ A STAGE MAY MOUNT A COMPONENT FROM OUTSIDE THIS FOLDER, and one now does.
   `RegionalWarehouseStage` renders `components/WarehouseDeskNav`, which is the entire point of
   that stage: the tutorial mounts the REAL nav strip the branch desk renders, so the two cannot
   drift apart. The `data-ponder` keys therefore live in `src/components/`, and reading only this
   folder reports the scene as pointing at nothing while it points at exactly the right element.
   Anything else a stage mounts from outside gets added here for the same reason. */
const MOUNTED_OUTSIDE = ['src/components/WarehouseDeskNav.jsx'];
const stageSrc = fs.readdirSync('src/ponder/stages')
  .map(f => pStrip(fs.readFileSync('src/ponder/stages/' + f, 'utf8')))
  .concat(MOUNTED_OUTSIDE.map(f => pStrip(fs.readFileSync(f, 'utf8')))).join('\n');
/* The demo world is scanned too. A stage builds `item:<id>` from the data rather than writing the
   attribute out, so those ids are only ever literals HERE — and a scene focusing an item its world
   no longer contains is exactly the rot this group exists to catch. */
const demoSrc = fs.readdirSync('src/ponder/demo')
  .map(f => pStrip(fs.readFileSync('src/ponder/demo/' + f, 'utf8'))).join(' ');
const bwmStripped = pStrip(bwmCode);

/* Scenes are IMPORTED, not grepped. They are plain data modules with no JSX in them, so the
   audit can hold the real objects and read the real steps. A regex over the source would only
   be checking that the file LOOKS right, which is a different and weaker claim. */
/* sections.js, never registry.js — the registry imports a JSX stage and Node cannot parse it. */
const { SECTIONS } = await import('../ponder/sections.js');
const scenes = [];
for (const f of sceneFiles) {
  const mod = await import('../ponder/scenes/' + f);
  for (const v of Object.values(mod)) if (v && Array.isArray(v.steps)) scenes.push(v);
}
const sceneIds = scenes.map(s => s.id);

/* The SCENES map, sliced from its own declaration rather than read off the whole file, which
   also holds the STAGES map. An anchor that is not found returns -1, and `slice(x, -1)` quietly
   means "to one before the end of the file" — so both ends are asserted before the slice runs. */
const sStart = registrySrc.indexOf('export const SCENES');
const sEnd = registrySrc.indexOf('export const STAGES');
const scenesBlock = (sStart > -1 && sEnd > sStart) ? registrySrc.slice(sStart, sEnd) : '';

check(G56, 'every scene file is reachable through the registry',
  scenesBlock.length > 0 && scenes.length > 0 && sceneIds.every(id => scenesBlock.includes(id)),
  'a scene that never reaches SCENES cannot be opened by anything, and nothing else in the app ' +
  'would report it missing — the file just sits there looking finished');

/* 🔴 THE BOOK IS THE ONLY DOOR NOW. Aldi, 2026-08-31: *"book is good we dont need any of the
   tutorial chip, all should be inside the tutorial book on top"*. The per-panel `?` chips are gone
   and `PonderButton.jsx` with them, so a scene that is not listed in `sections.js` is not merely
   awkward to find — it is UNREACHABLE, by anyone, forever, while still looking finished on disk.
   This check replaces the old "every chip names a real scene": the same rot, the opposite
   direction, and the direction that can now actually happen. */
/* `.filter(Boolean)` is load-bearing, not tidying. Sixteen entries carry a title and NO sceneId on
   purpose — the "no scene written yet" cards, one per section, and sections.js says so at the top:
   an entry only becomes pressable once it resolves to a real scene. Without the filter this check
   reads all sixteen as broken cards, which is how a green suite gets taught to cry wolf. */
const sectionSceneIds = SECTIONS.flatMap(s => (s.entries || []).map(e => e.sceneId)).filter(Boolean);
check(G56, 'every scene is reachable from the book, which is the only way in',
  sceneIds.length > 0 && sceneIds.every(id => sectionSceneIds.includes(id)),
  'a scene missing from sections.js can no longer be opened at all — the chips that used to be ' +
  'its second door were removed on 2026-08-31. It would sit in the registry looking shipped');

check(G56, 'the book never offers a card that opens nothing',
  sectionSceneIds.length > 0 && sectionSceneIds.every(id => sceneIds.includes(id)),
  'a typo in a sceneId has to fail HERE. Unchecked it renders a card in the book that opens ' +
  'nothing, which is the worst kind of broken: it looks like a feature until someone presses it');

check(G56, 'no beat is silent — every step carries text',
  scenes.length > 0 && scenes.every(s => Array.isArray(s.steps) && s.steps.length > 0 &&
    s.steps.every(st => typeof st.text === 'string' && st.text.trim().length > 0)),
  'a step with no text is a blank screen with a timer running behind it');

/* 🔴 THE CHECK THAT STOPS SCENES ROTTING. A focus key is a promise that some element in the
   stage carries that key. Rewrite the panel, drop the attribute, and the tutorial keeps playing
   happily while pointing at nothing — a failure that still looks like it works. */
/* `focus` is one key or a LIST of keys since 2026-08-27 — flattened here so a plural beat is
   checked key by key rather than stringified into one nonsense key that resolves to nothing. */
const focusOfStep = (st) => (st.focus == null ? [] : Array.isArray(st.focus) ? st.focus : [st.focus]);
const focusKeys = [...new Set(scenes.flatMap(s => s.steps.flatMap(focusOfStep)).filter(k => k && k !== '*'))];
const stageAndPanel = stageSrc + demoSrc + '\n' + bwmStripped;
/* A key resolves one of two ways, and BOTH have to be allowed or the check is wrong rather than
   strict. A column is written out — `data-ponder="col:shelf"`. A row or a product cannot be: the
   stage builds `data-ponder={`item:${p.id}`}` from data, so the only literal anywhere is the id
   itself, sitting in the demo world. Demanding the whole key as a literal would fail every
   data-driven key in the file, which is most of them. */
const resolvesKey = (k) => {
  if (stageAndPanel.includes('data-ponder="' + k + '"')) return true;
  const i = k.indexOf(':');
  if (i < 0) return false;
  const prefix = k.slice(0, i), tail = k.slice(i + 1);
  if (stageSrc.includes('data-ponder={`' + prefix + ':${') && stageAndPanel.includes(tail)) return true;
  /* Third form, and it is the weakest one allowed on purpose. A stage may hand its keys to a small
     local component — `<Field k="f:tujuan" …>` renders `data-ponder={k}` — so the key is a literal
     in the file but never as the attribute. Requiring the attribute spelling would ban a component
     from ever wrapping a field, which is worse design than this check is worth. So: the exact key
     must appear quoted in a stage that DOES emit data-ponder somewhere. Deleting the key still
     fails; renaming it still fails. Only the spelling of the binding is forgiven. */
  return /data-ponder=\{/.test(stageSrc) &&
         (stageSrc.includes(`"${k}"`) || stageSrc.includes(`'${k}'`));
};
/* ---- HOW THE BOOK TALKS (2026-08-30) ----
   Aldi, after watching the tutorial play for the first time: *"i think that we need to remake the
   sentences and wording because it sound so ai ... make sure that u dont use kamu or aku, or any
   of the informal language, we are talking about the factory, subject is factory, employees,
   manager and all of these subject no u and me"*.

   The subject of every beat is the WAREHOUSE, the BRANCH, the SHIPMENT or the APP - never the
   reader. "Isi gudang terbuka saat namanya ditekan", not "klik namanya". It reads as a factory
   manual rather than a chatbot, which is what it is.

   ⚠️ `—` IS DELIBERATELY NOT BANNED. It is a CHARACTER THE PANEL PRINTS in an empty cell, and
   five beats exist to explain what it means. Banning it would ban the lesson. What is banned is
   the second person, which has no legitimate use here at all. */
const sceneText = scenes.flatMap(s => s.steps.map(st => String(st.text || ''))).join('\n');
/* ⚠️ `Anda` JOINED THIS LIST 2026-09-01, and it is the reason this check needed a second look.
   His instruction was about the SUBJECT — "we are talking about the factory, subject is factory,
   employees, manager and all of these subject no u and me" — but the list only held the INFORMAL
   second person, so the polite form was legal to a check that was supposed to be enforcing "no
   second person at all". The regional-warehouse scene was written with five of them and passed.
   All four earlier scenes contain zero, so the rule was being followed by hand and the check was
   only pretending to hold it.
   `saya`/`kita` are here for the same reason: first person is the other half of "no u and me". */
const informal = sceneText.split('\n').filter(t => /\b(kamu|Kamu|aku|Aku|Anda|anda|saya|Saya|kita|Kita|Ayo|ayo|kalian|gue|lo)\b/.test(t));
check(G56, 'the book never addresses the reader, because its subject is the warehouse',
  informal.length === 0,
  'a Ponder beat used second person: ' + (informal[0] || '') + ' \u2014 the subject of a beat is the ' +
  'warehouse, the branch, the shipment or the app. His instruction, 2026-08-30: "we are talking ' +
  'about the factory, subject is factory, employees, manager and all of these subject no u and me"');

const missingKeys = focusKeys.filter(k => !resolvesKey(k));
check(G56, 'every focus key resolves to something the stage really wears',
  focusKeys.length > 0 && missingKeys.length === 0 && /data-ponder=/.test(stageSrc),
  'unresolved focus keys: ' + (missingKeys.join(', ') || 'none') + '. Either the attribute is not ' +
  'written out and the stage does not build that prefix from data, or the value it would be built ' +
  'from is gone. A scene that focuses a key nothing wears keeps playing while pointing at nothing');

/* His rule, 2026-08-27: *"scene play but itself but also add pause button or timeframe to
   restart the tutorial, just like the ponder system inside create mod"*. Create's pause is a
   real freeze (its Identify mode literally stops ticking the scene), not a slower speed. */
check(G56, 'pause stops the clock outright, and restart returns to the first beat',
  /if \(!open \|\| !playing \|\| finished/.test(playerSrc) &&
  /seek\(0\); setPlaying\(true\);/.test(playerSrc) &&
  /Comfy reading/.test(overlaySrc),
  'the animation loop must be gated on `playing` so a pause is a freeze rather than a slowdown; ' +
  'restart must seek to beat 0 and resume; and Comfy Reading is the control that lets a slower ' +
  'reader keep autoplay instead of turning it off');

/* ExamineModal.jsx records what a per-frame setState costs on Aldi's phone: the whole subtree
   re-rendering ~60 times a second, which reads as flicker rather than as motion. */
check(G56, 'the progress bar is written to the DOM, never through per-frame state',
  /bar\.style\.transform = /.test(playerSrc) && !/setProgress|setElapsed|setTick/.test(playerSrc),
  'the bar must be painted by writing transform onto the node from requestAnimationFrame. Routing ' +
  'it through useState re-renders the overlay every frame');

/* Lite Mode sets `transition-duration: .001s` on everything, so anything whose meaning lives in
   a transition arrives already finished. The spotlight therefore sets its END STATE directly and
   treats the fade as decoration — the half that is allowed to disappear. */
check(G56, 'the spotlight survives Lite Mode, which strips every transition',
  /el\.style\.opacity = lit \?/.test(overlaySrc) && /reduced\(\) \? 'none'/.test(overlaySrc),
  'opacity must be set as a value, not implied by a transition, and reduced motion must drop the ' +
  'easing while keeping the same end state — the tutorial still has to teach with motion off');

check(G56, 'the tutorial opens no native dialog',
  !/window\.(confirm|prompt|alert)\s*\(/.test(overlaySrc + playerSrc + bookSrc + stageSrc),
  'the dialog gate replaced all 69 of these. A blocked native dialog does nothing and explains ' +
  'nothing, which is exactly the failure a tutorial cannot afford');

/* His answer, 2026-08-27: *"nope dont push newcomer towards the scene let them figure out by
   pressing the tutorial button"*. Opt-in means there is nothing to remember about a person, so
   there must be no seen-flag anywhere near this. */
check(G56, 'the tutorial never opens itself, and remembers nothing about who has watched',
  /onClick=\{openLib\}/.test(bookSrc) &&
  !/localStorage|sessionStorage|hasSeen|firstRun|autoOpen/.test(bookSrc + overlaySrc),
  'the book may only open on a click. A "has this person seen it" flag is what turns an opt-in ' +
  'tutorial into one that fires at people, and a stale flag means it fires forever or never');

/* The amber law, 2026-08-21: *"stop using amber background i said, i hate it"*. What survived as
   a legal gold fill is a 3px rule whose LENGTH is the data — at 3px it reads as a line, not a
   slab. The timeline is exactly that shape, and so is the rule under the panel title. */
/* 🔴 SCOPED PAST THE TONE MAPS. `TONE_RULE = { gold: 'bg-orange' }` NAMES the class without being
   the element that wears it, so a text window around it finds no height and reports a gold slab
   that does not exist. Second time this one check has gone red against correct code — the first
   was the timeline notch's hover state. A guard on an element must be scoped to that element. */
const overlayGold = overlaySrc.replace(/const TONE_(RULE|EDGE) = \{[^}]*\};/g, '');
const goldSpots = [...overlayGold.matchAll(/bg-orange/g)]
  .map(m => overlayGold.slice(Math.max(0, m.index - 170), m.index + 40));
check(G56, 'the timeline is a 3px rule whose length is the data, never a gold slab',
  /h-\[3px\] bg-inset/.test(overlaySrc) && /bg-orange rounded-full/.test(overlaySrc) &&
  !/bg-gold/.test(overlaySrc) &&
  goldSpots.length > 0 && goldSpots.every(w => /h-\[3px\]|h-\[9px\]|w-\[2px\]|inset-0/.test(w)),
  'every gold surface in the overlay must sit on an element that is a RULE — the 3px track, the ' +
  'fill stretched inside it, or a 2px notch. A taller gold bar is a gold FILL, which he has ' +
  'rejected twice by name. Scoped to each bg-orange occurrence rather than banned file-wide, ' +
  'because the first version of this check matched the notch hover state and went red against ' +
  'a 2px line — the same over-broad-guard trap as group 48');

/* His rule, 2026-08-27: *"teaching just use indonesia, for terms for the features and components
   just use english"*. The `**term**` markers are what make an English column name visibly a term
   inside an Indonesian sentence, so the renderer that turns them into gold ink is load-bearing. */
check(G56, 'teaching sentences keep their English feature names marked as terms',
  /function Caption\(/.test(overlaySrc) && /text-accent-ink font-bold/.test(overlaySrc) &&
  scenes.some(s => s.steps.some(st => st.text.includes('**'))),
  'the caption renderer must keep bolding **terms** in accent ink. Without it an English column ' +
  'name reads as a foreign word dropped into an Indonesian sentence instead of as the label the ' +
  'reader will go looking for on the real screen');

/* The chip half of this check retired 2026-08-31 — *"book is good we dont need any of the tutorial
   chip, all should be inside the tutorial book on top"*. The panel header no longer carries a door
   into the tutorial; the book on the top bar is the only one. The English title survives on its own
   merits and is still his instruction. */
check(G56, 'the stock panel is titled in English, and carries no tutorial chip of its own',
  />Stock by Warehouse<\/h3>/.test(bwmStripped) &&
  !/PonderButton/.test(bwmStripped),
  'his instruction was *"dont use sebaran stock, use proper elegant english terms for that"*. ' +
  'The second clause is the 2026-08-31 removal: a chip reappearing in a panel header would be a ' +
  'second door into a tutorial he asked to reach only through the book');

/* 🔴 PRE-STAGING THE CHECK 631 MIGRATION. The panel footnote is still the live record of these
   two formulas and check 631 still pins it there. The scene now carries them as well, so when
   the footnote is deleted in the next slice the coverage already exists and 631 MOVES rather
   than being deleted. A check removed to let a change pass is how the bug it caught comes back. */
/* His ask, 2026-08-27: *"i want the tutorial book on the very top of the screen for every
   components, since we have a lot of space there"*. The top bar is the one surface every screen
   shares, so mounting it anywhere else would be a per-screen decision to forget on the next
   screen. */
check(G56, 'the book lives in the shared top bar, so every screen has it',
  /<PonderBookButton activeTab=\{activeTab\} \/>/.test(shellSrc) && /from '\.\.\/ponder\/PonderBook\.jsx'/.test(shellSrc),
  'PonderBookButton must be mounted in BiohazardTheme, the shell every screen renders inside. ' +
  'Mounted per-view it becomes a thing to remember on every new view, and it will be forgotten');

/* *"inside the book i want every section of this app tutorials to be put there"*. Listing only
   what is written implies the rest of the app has nothing to explain. Every section is listed;
   an entry with no scene has to SAY so rather than be quietly absent. */
check(G56, 'the book lists every section, and an unwritten entry admits it',
  SECTIONS.length >= 7 &&
  SECTIONS.every(sec => Array.isArray(sec.entries) && sec.entries.length > 0 &&
    sec.entries.every(e => (e.soon === true) || sceneIds.includes(e.sceneId))),
  'every entry must either resolve to a real scene or carry soon:true. An entry that is neither ' +
  'renders a card that does nothing when pressed, which is the same dead control the sceneId ' +
  'check exists to prevent');

/* *"more variative textbox and animation not just static textbox on the bottom just like what
   create mod have"*. Ponder alternates a caption pinned beside its subject with one that spans
   the scene; a caption that never moves stops being read. So BOTH placements have to be in use,
   and the player has to know how to draw a pointer in all four directions — a caption standing
   beside a full-height column points sideways, not down. */
check(G56, 'captions move: both placements are used, and the pointer aims four ways',
  scenes.some(s => s.steps.some(st => st.at === 'near')) &&
  scenes.some(s => s.steps.some(st => (st.at || 'bottom') === 'bottom')) &&
  /up:/.test(overlaySrc) && /down:/.test(overlaySrc) && /left:/.test(overlaySrc) && /right:/.test(overlaySrc) &&
  /spot\.h > H \* 0\.42/.test(overlaySrc),
  'a scene must use both `at: near` and `at: bottom`, and the tall-subject branch must survive — ' +
  'without it a column highlight leaves no room above or below and the caption lands on top of ' +
  'the very numbers it is describing');

/* 🔴 THE FOURTH BUG OF THE FAMILY, AND THE ONE ALDI PHOTOGRAPHED: *"the textbox block the view
   for the 3 biaya"*, *"this landing cost also collapse with the text box, landed value as well"*.

   The caption carries `animate-ponder-in`, whose last keyframe is `transform: none` under
   fill-mode `both`. An animation origin OUTRANKS an inline style, so the `transform:
   translateY(-100%)` that turned the caption's `top` into its BOTTOM edge was thrown away the
   instant the 260ms arrival finished — as was the `translateY(-50%)` that centred a sideways one.
   Every 'above' caption and every 'beside' caption in every scene then hung downward from a
   coordinate meant for its bottom and sat straight on the field it was explaining.

   Same shape as the three before it: a mechanism nobody watched, nothing thrown, every check
   green. It was found by reading `getComputedStyle(box).transform` back as the identity matrix
   while the inline style still said `translateY(-50%)`. Placement that must survive an animation
   belongs in `left`/`top`; the element must not offer a transform for the animation to overwrite. */
const nearStyle = (overlaySrc.match(/animate-ponder-in"[\s\S]{0,120}?style=\{\{([^}]*)\}\}/) || [])[1] || '';
check(G56, 'the caption is placed in top, never in a transform an animation would overwrite',
  nearStyle.includes('near.') && /top:\s*near\.top/.test(nearStyle) && !/transform/.test(nearStyle) &&
  !/shift/.test(overlaySrc) && !/translateY\(-100%\)/.test(overlaySrc),
  'the near-caption must position with left/top only. The moment any of its geometry moves back ' +
  'into `transform`, `animate-ponder-in`\'s final `transform: none` erases it on completion and ' +
  'the box silently returns to sitting on top of its own subject');

/* His instruction was *"if there is not much space u can put the text box above it and arrow ' +
   pointing bottom"*, which the code already did — badly, because it was guessing the height it
   needed room for. EST_H was 150 against a real 109, so the room test rejected space the box
   would have fitted in and drove the caption above or beside far more often than it had to. */
check(G56, 'the room test measures the caption instead of assuming a height for it',
  /boxRef\.current\?\.offsetHeight/.test(overlaySrc) &&
  /const boxH = Math\.min\(capH, H - 24\)/.test(overlaySrc) &&
  /roomBelow < boxH && roomAbove < boxH/.test(overlaySrc) &&
  /const below = roomBelow >= boxH/.test(overlaySrc),
  'above-vs-below must be decided against the caption\'s measured height. A constant guess is ' +
  'wrong in both directions: too large and the box is pushed away from space it fits in, too ' +
  'small and it overhangs the stage edge it was just approved for');

/* 🔴 THE CAMERA MOVE IS INSTANT, AND THAT IS LOAD-BEARING RATHER THAN A STYLE CHOICE.
   Measured at 375px on 2026-08-31: `scrollIntoView` with `behavior:'smooth'` moved the stage by
   ZERO, twice, 800ms apart, while `'auto'` on the same element in the same frame moved it 0 → 211.
   The stage is 219px tall on a phone against 450px of content, so a subject that never scrolls
   sits below the floor and every downstream number is measured off-stage: the ring is drawn under
   the stage and the caption is placed against a spot nobody can see. Six beats across two scenes
   looked like a placement bug and were this. `measure()` also runs synchronously three lines after
   the call, so an animated scroll would be measured before it had moved even where it does run.
   Scoped to the call itself: the word "smooth" appears in the surrounding comment on purpose. */
/* REWRITTEN 2026-09-01. The camera no longer calls scrollIntoView at all — it assigns scrollTop and
   scrollLeft on each scroller between the subject and the stage, which is instant by definition and
   has no `behavior` to get wrong. The property this check exists to defend is unchanged and is now
   asserted directly: nothing in this file may ask for a smooth or animated scroll. */
check(G56, 'the tutorial camera moves instantly, because a smooth one never moved at all',
  /el\.scrollTop = clamp\(/.test(overlaySrc) && /el\.scrollLeft = clamp\(/.test(overlaySrc) &&
  !/behavior:\s*'smooth'/.test(overlaySrc) && !/scrollBy|scrollTo\(/.test(overlaySrc),
  'the scene must scroll its subject into view with behavior:\'auto\'. A smooth scroll does not ' +
  'run in this stage at all, and the beat is then measured against a subject still below the fold');

/* 🔴 THE PANEL MUST STILL BE ON SCREEN WHILE ITS CLOSING SOUND PLAYS. Aldi, 2026-08-31: *"when i
   close the ponder panel it should return to the closed book animation, right now the panel is just
   gone but the book close SFX is there"*. `leave` called `onClose()` in the same tick as
   `bookClose()`, the parent dropped the scene, and the panel returned null on the next render —
   `bookCloseS` played over an empty screen.

   TWO FILES HAVE TO AGREE FOR THIS TO WORK, which is exactly the kind of pair that rots in silence.
   `SHUT_MS` decides when the panel unmounts and the `ponder-shut` utility decides how long the exit
   takes. Smaller and the animation is cut off mid-flight; larger and a finished, invisible panel
   sits there swallowing clicks. Neither shows up as an error, so the numbers are compared here. */
const shutMs = Number((overlaySrc.match(/const SHUT_MS = (\d+)/) || [])[1]);
/* Read here rather than reusing `twSrc`: that one is declared further down the file, and reaching
   it from up here is a temporal-dead-zone ReferenceError, not a value. */
const twShutSrc = fs.readFileSync('tailwind.config.js', 'utf8');
const shutAnim = Number((twShutSrc.match(/'ponder-shut':\s*'ponderShut (\d+)ms/) || [])[1]);
check(G56, 'the panel unmounts exactly when its closing animation ends, not before or after',
  Number.isFinite(shutMs) && Number.isFinite(shutAnim) && shutMs === shutAnim &&
  /animate-ponder-shut/.test(overlaySrc) && /setTimeout\(onClose, SHUT_MS\)/.test(overlaySrc) &&
  /liteOn\(\) \|\| reduced\(\)/.test(overlaySrc),
  'SHUT_MS in PonderOverlay.jsx must equal the ponder-shut duration in tailwind.config.js, the ' +
  'panel must carry animate-ponder-shut while closing, and Lite Mode and reduced motion must ' +
  'still close on the spot rather than waiting for an animation that is not playing');

/* 🔴 A RECEIPT IS ADDRESSED BY THE TENANT THAT OWNS IT, NEVER BY WHOEVER IS LOGGED IN.
   `userId = bossUid || user.uid`. Every write and read of `transactions` uses it — six of them —
   and until 2026-08-31 the three deletes and the history edit did not, addressing
   `users/${user.uid}/transactions` instead. Identical for the owner, who claims his own id as his
   bossUid, and wrong for every delegated account.

   The failure is silent in both directions and that is why it survived: Firestore treats deleting a
   document that is not there as SUCCESS, so the app reported a delete that never happened and the
   receipt stayed; and `untallyOps` beside it wrote the correcting figure into
   `users/{the editor's own uid}/sales_stats`, a document nothing reads, so Product Performance kept
   counting the sale. A rebuild repairs the totals. Nothing repairs the receipt.

   Asserted as an absence, because the bug is a spelling that must not come back on THIS path —
   other collections in App.jsx legitimately use `user.uid` and are not in scope here. */
const txUidSrc = fs.readFileSync('src/App.jsx', 'utf8') + fs.readFileSync('src/components/HistoryReportView.jsx', 'utf8');
check(G56, 'a receipt is deleted and edited under the tenant that owns it, not the logged-in id',
  !/users\/\$\{user\.uid\}\/transactions/.test(txUidSrc) &&
  !/tallySaleOp\(db, appId, user\.uid/.test(txUidSrc) &&
  /users\/\$\{userId\}\/transactions/.test(txUidSrc),
  'the deletes, the history edit and the tallies beside them must address users/${userId}. With ' +
  'user.uid a delegated account deletes nothing, is told it worked, and leaves the sale counted');

/* 🔴 CLOSING A SCENE PUTS THE BOOK BACK ON SCREEN TO SHUT ITSELF. Aldi, 2026-08-31: *"i want the
   book shuts and fly to also happen when user close the ponder panel"*. Picking a scene used to
   unmount the Library on the spot, so the shut-and-fly it already owned only ever played if you
   closed the BOOK — never if you actually read something in it.

   Three things have to hold together and each fails silently on its own: the Library must still be
   RENDERED while shutting (or there is nothing to animate), it must SKIP its opening flight (or the
   book flies in just to fly back out), and it must not replay `bookClose()` (or the sound fires
   twice, once from the panel's own exit and once here, 240ms apart). */
check(G56, 'closing a scene brings the book back to shut itself, once, without re-opening first',
  /closeOnMount = false/.test(bookSrc) &&
  /if \(still \|\| closeOnMount\) return;/.test(bookSrc) &&
  /if \(!closeOnMount\) bookClose\(\);/.test(bookSrc) &&
  /if \(closeOnMount\) shut\(\);/.test(bookSrc) &&
  /\{\(libOpen \|\| bookShutting\) && \(/.test(bookSrc) &&
  /closeOnMount=\{bookShutting\}/.test(bookSrc) &&
  /setSceneId\(null\); setBookShutting\(true\);/.test(bookSrc),
  'the scene\'s onClose must raise bookShutting, the Library must render while it is true, and ' +
  'that mount must skip both the opening flight and the closing sound the panel already played');

/* A phone has no room for a caption BESIDE anything: boxW is min(380, W - 24), which is 349 of 373
   on a 375px screen. Every placement such a box can choose lands on its own subject, so the beat
   falls through to the wide bottom bar instead — the layout the other beats in the same scenes
   already use on a phone. Desktop never trips it: 380 against a 1022px stage is nowhere near. */
check(G56, 'a stage too narrow to stand a caption beside anything hands the beat to the wide bar',
  /if \(boxW > W \* 0\.\d+\) return null;/.test(overlaySrc),
  'the near-caption must bail to the bottom bar when it would occupy most of the stage width. ' +
  'Without it, beats 5, 6, 8 and 9 of Product Performance sit on the row they are explaining');

/* 🔴 THE AMBER LAW'S SECOND EXEMPTION, AND A CHECK THAT KEEPS IT AN EXEMPTION RATHER THAN A LEAK.

   The law, 2026-08-21: *"stop using amber background i said, i hate it"*. The book's hover glow is a
   gold FILL, so it was asked for rather than assumed, and granted 2026-08-28 against the reference
   he sent twice. What makes it survivable is that it is BOUNDED: it lives on one 21px glyph, it is
   invisible until the pointer is on the chip, and Lite Mode collapses it away. Unbound, it is just
   the amber background he has rejected twice by name.

   So the check is not "is there a gradient" — it is "can this gradient ever be seen when nobody is
   hovering". Opacity 0 at rest, animation only under group-hover/group-focus-visible. */
const glowAtRest = /className="pointer-events-none absolute inset-0 opacity-0[\s\S]{0,140}?group-hover:opacity-100/.test(bookSrc);
const sparksGated = (bookSrc.match(/animate-book-spark/g) || []).length === 2 &&
  /group-hover:animate-book-spark group-focus-visible:animate-book-spark/.test(bookSrc) &&
  !/\banimate-book-spark(?!["\s])/.test(bookSrc.replace(/group-(hover|focus-visible):animate-book-spark/g, ''));
check(G56, 'the hover glow is gold, exempted, and cannot be seen when nobody is hovering',
  /rgba\(255,\d+,\d+,\.\d+\)/.test(bookSrc) && glowAtRest && sparksGated &&
  /Asked and granted/.test(fs.readFileSync('src/ponder/PonderBook.jsx', 'utf8')),
  'the glow must default to opacity 0 and the sparks must only ever animate under group-hover or ' +
  'group-focus-visible. An always-on gold fill is the amber background he has rejected twice, and ' +
  'four looping animations in a top bar that is always on screen is a battery cost nobody asked for');

/* 🔴 THE SAME TRAP AS THE CAPTION, ONE FILE OVER, CAUGHT THE SAME DAY. The sparks must sit in FRONT
   of the cover: the glyph is `preserve-3d`, so its children sort by depth rather than document
   order, and the cover swings its right half toward the viewer — at z=0 three of the four sparks
   were painted behind it and simply never appeared. The depth therefore has to be `translateZ` —
   and it cannot live on the element, because `bookSpark` animates `transform` and would erase it on
   frame one. It goes in BOTH transform stops of the keyframe instead. */
const twSrc = fs.readFileSync('tailwind.config.js', 'utf8');
const sparkStops = [...twSrc.matchAll(/transform: 'translateZ\(14px\) translate/g)];
check(G56, 'the spark carries its depth inside the keyframe, where the animation cannot erase it',
  sparkStops.length === 2 && /bookSpark: \{/.test(twSrc) &&
  !/--spark-drift[^}]*transform:/.test(bookSrc),
  'both transform keyframes of `bookSpark` must carry translateZ, and the spark element must not ' +
  'set a transform of its own. Depth on the element is erased by the animation on its first frame ' +
  'and the sparks disappear behind the cover — the same fault as the caption, in a second file');

/* 🔴 THE COVER STOPS AT THE FOLD, AND THIS ARITHMETIC IS NOT OPTIONAL. His note, 2026-08-28:
   *"cut the brown background where the book ends not where the ribbon ends"*. Moving the cover's
   left edge in by COVER_LEFT also moved the reference for SLAB_SHUT, which is measured from the
   slab's own box — leave the old constant and the shut cover overhangs the centre fold by 163px,
   measured. The relationship is fixed: half of COVER_LEFT, minus the original 62. */
const coverLeft = Number((bookSrc.match(/const COVER_LEFT = (\d+)/) || [])[1] || NaN);
const shutOff = Number((bookSrc.match(/SLAB_SHUT = 'inset\(0 calc\(50% ([-+] ?\d+)px\)/) || [])[1]?.replace(/\s/g, '') || NaN);
check(G56, 'the shut cover lands on the centre fold, wherever the cover’s left edge is',
  Number.isFinite(coverLeft) && Number.isFinite(shutOff) && shutOff === coverLeft / 2 - 62,
  'SLAB_SHUT must equal `calc(50% + COVER_LEFT/2 - 62px)`. It is measured from the slab, and the ' +
  'slab no longer starts at the container — got ' + shutOff + ', expected ' + (coverLeft / 2 - 62) +
  ' for COVER_LEFT ' + coverLeft + '. Wrong, the closing book leaves a slab of leather past the fold');

/* 🔴 THE FIFTH OF THE FAMILY, FOUND WHILE VERIFYING THE FOURTH. `getBoundingClientRect()` reports
   PAINTED geometry, and this overlay arrives on `animate-ponder-open`, which opens the modal from
   `scale(0.94)`. The first beat measured after opening therefore came back 6% small and STAYED
   small, because nothing re-measures until the layout changes — the ring sat 60px short of Upah
   bongkar, outlining two and a bit fields under a caption that said three. Autoplay healed it on
   the next beat about four seconds later, which is precisely why it survived every check and
   every screenshot. Dividing the ancestor's scale back out fixes the cause instead of one
   animation's end event, and keeps `spot` in the same untransformed space `clientWidth` speaks. */
check(G56, 'the highlight is measured in layout space, not through an ancestor animation scale',
  /wrap\.offsetWidth > 0 && base\.width > 0 \? base\.width \/ wrap\.offsetWidth : 1/.test(overlaySrc) &&
  /wrap\.offsetHeight > 0 && base\.height > 0 \? base\.height \/ wrap\.offsetHeight : 1/.test(overlaySrc) &&
  /- base\.left\) \/ kx/.test(overlaySrc) && /- base\.top\) \/ ky/.test(overlaySrc),
  'every rect the spotlight takes is a painted rect, and the modal opens from scale(0.94). ' +
  'Without dividing that scale back out the first beat of every scene is measured small and the ' +
  'highlight stays small until something else forces a re-measure');

/* *"there is no highlights for that 3 biaya as well"*. The caption said "these three" while the
   ring marked one field, because `focus` could only ever hold a single key. `measure()` already
   unioned the rects of every hit — the key test was the only single-valued thing in the path. */
const threeCosts = ['c:ongkir', 'c:cukai', 'c:bongkar'];
check(G56, 'a beat can mark more than one field, and the three intake costs are marked together',
  /Array\.isArray\(f\) \? f : \[f\]/.test(overlaySrc) &&
  scenes.some(s => s.steps.some(st => Array.isArray(st.focus) &&
    threeCosts.every(k => st.focus.includes(k)))),
  'a sentence about three fields that lights one of them teaches the wrong three. `focus` takes ' +
  'a list, a bare string still means a list of one, and the beat naming Ongkos kirim / Pita ' +
  'cukai / Upah bongkar must name all three keys');

/* *"dont make the ponder panel slideable so that the text box is fixed"*. A caption is positioned
   against the stage WINDOW while its subject lives in the scroller, so any scroll slides the
   subject out from under a box that stays put. Goods Received overflowed its window by 27px —
   enough to drift, too little to read as a scrollbar. Sized to fit rather than locked: locking
   `overflow` would have made everything below the fold permanently unreachable on a phone, which
   is a worse bug than the one being fixed. If a future stage grows, re-measure with
   `tools/ponder-lab.html?scene=<id>` and compare `scrollHeight` against `clientHeight`. */
const modalMin = Number((overlaySrc.match(/lg:min-h-\[(\d+)px\]/) || [])[1] || 0);
check(G56, 'the stage window is sized for its scene rather than scrolling under the caption',
  modalMin >= 700 && /p-4 space-y-3 min-w-\[720px\]/.test(stageSrc) &&
  /overflow-auto/.test(overlaySrc),
  'the modal floor must leave the stage window taller than the tallest scene INCLUDING the beats ' +
  'that also show the wide bottom bar, and the scroller must stay `overflow-auto` as the safety ' +
  'net for short and narrow windows. A locked scroller hides content instead of fitting it');

/* *"i want to be able to press the each of the components inside the ponder panel and when
   pressed it will snap back to the timeframe where that components is explained"*. The first beat
   naming a key wins: a part explained twice is introduced once and referred back to later, and the
   introduction is what someone pressing it is asking for. Only parts some beat actually covers get
   a cursor, because a pointer on a part no beat explains promises a jump that cannot happen. */
check(G56, 'pressing a part of the stage jumps to the beat that explains it',
  /onClick=\{jumpTo\}/.test(overlaySrc) &&
  /closest\?\.\('\[data-ponder\]'\)/.test(overlaySrc) &&
  /p\.steps\.findIndex\(s => focusOf\(s\)\.includes\(k\)\)/.test(overlaySrc) &&
  /jumpable\.has\(el\.dataset\.ponder\)/.test(overlaySrc) &&
  /cursor = canJump \? 'pointer'/.test(overlaySrc),
  'the stage scroller must seek to the first beat whose focus names the pressed key, and only ' +
  'pressable parts may show a pointer cursor');

/* The highlight is drawn, not merely implied by dimming everything else. An EDGE, never a fill:
   amber is an edge and an ink in this app, and it is not a fill. */
/* THE CAMERA. Aldi, 2026-09-01, choosing this over a second phone-only Ponder: *"make the screen
   move along with the highlighted textbox and components, this way the user doesnt have to slide
   updown left right just to see the highlighted box"*.

   Three properties, and each one was a measured failure before it was a check. */
check(G56, 'the camera centres the whole subject in every scroller between it and the stage',
  /const centreIn = \(el\) => \{/.test(overlaySrc) &&
  /for \(let node = hits\[0\]; node && node !== root\.parentElement; node = node\.parentElement\)/.test(overlaySrc) &&
  !/scrollIntoView/.test(overlaySrc),
  'the stage is not the only thing that scrolls \u2014 Stock by Warehouse has its own overflow-x-auto ' +
  'around a 1080px grid, and moving only the stage left the ring 0% in view sideways on five beats. ' +
  'scrollIntoView with block:nearest is what it replaced: nearest stops the moment one cell of a ' +
  'tall column touches the edge');

check(G56, 'the camera stops AT the stage, so the page behind the overlay never moves',
  /node !== root\.parentElement/.test(overlaySrc),
  'walking past the stage would scroll the app underneath the tutorial, which is the one surface it ' +
  'must never move');

check(G56, 'the camera divides out the transform, and it scrolls before it measures',
  /const kx = el\.offsetWidth > 0 && er\.width > 0 \? er\.width \/ el\.offsetWidth : 1;/.test(overlaySrc) &&
  overlaySrc.indexOf('const centreIn = (el) =>') < overlaySrc.search(/measure\(\);\s*\}, \[open, step, keys, p\.index, measure\]\);/),
  'the overlay opens on scale(0.94), so a rect read during that animation is 6% small while ' +
  'scrollTop is not scaled at all; and a camera move AFTER the measure leaves the ring drawn where ' +
  'the subject used to be');

check(G56, 'the subject is outlined, and the outline is an edge rather than a fill',
  /* TONE_RING, not TONE_EDGE, since 2026-09-01: *i want the highlight to be clearer to see*.
     The captions keep the quiet divider grey; the ring is orange. Both maps are still EDGES, and
     `border-2` in the needle is what keeps it one — a fill would be a `bg-`. */
  /animate-ponder-ring/.test(overlaySrc) && /border-2 \$\{TONE_RING/.test(overlaySrc) &&
  /const TONE_RING = \{ ink: 'border-orange'/.test(overlaySrc) &&
  /const hits = wide \? \[\] : all\.filter\(el => keys\.includes\(el\.dataset\.ponder\)\)/.test(overlaySrc),
  'the ring must be a border on a box sized to the UNION of the direct hits. Including ancestors ' +
  'would union the whole table and outline nothing in particular');

/* *"book SFX also needed here"*. Routed through useSound rather than raw Audio, because that hook
   already pools elements, waits for the browser unlock gesture, and — the part that matters here —
   is silent in Lite Mode. */
/* SOUNDS, THIRD ATTEMPT, and the first two are why this check is worded the way it is.
   Round 1 re-pointed the till at a page turn — *"u re crazy using sales SFX for the book"*.
   Round 2 synthesised paper from filtered noise — *"SFX sound really bad as well"*. Round 3 uses
   HIS file through `useSound`, which already handles pooling, the unlock gesture and Lite Mode.
   The two sounds he pointed at on YouTube cannot be fetched here, so those calls are SILENT rather
   than borrowed — a wrong sound is worse than none, which is the whole lesson of round 1. */
const soundSrc = fs.readFileSync('src/hooks/useSound.js', 'utf8');
/* 🔴 NO TRANSACTION SOUND MAY REACH THE BOOK. That is the whole of round 1's mistake encoded:
   `click`, `commit`, `tap` and `sign` already mean money moved in this app, and an ear taught that
   a page turn is a transaction is an ear taught wrong. His words: *"u re crazy using sales SFX for
   the book"*. Round 2's synthesis is banned for a different reason — *"SFX sound really bad"* — so
   nothing here may build its own audio either. Every sound must be a registered file he chose. */
check(G56, 'every book sound is one of his own files, and none of them is a sales sound',
  /from '\.\.\/hooks\/useSound\.js'/.test(sfxSrc) &&
  ['ponderOpen', 'bookOpenS', 'bookPage', 'bookCloseS']
    .every(n => sfxSrc.includes(`playSound('${n}')`) && soundSrc.includes(n + ':')) &&
  !/playSound\('(click|commit|tap|sign|error|vaultb)'\)/.test(sfxSrc) &&
  !/new Audio|createBiquadFilter|createOscillator/.test(sfxSrc) &&
  ['ponder-open', 'book-open', 'book-page', 'book-close']
    .every(f => fs.existsSync('public/sounds/' + f + '.mp3')),
  'all four sounds must be registered files under public/sounds, played through playSound, and ' +
  'none may be one of the transaction sounds or synthesised on the spot');

/* ⚠️ AND THEY MUST BE SHORT. The clips he saved ran 4,7s, 6,5s and 5,9s — whole video captures,
   mostly silence, with the page turn's actual burst sitting 1,7 seconds in. Played raw, the sound
   would start over a second after the click that caused it and stack on itself on the second
   click; that reads as an unresponsive app, not as a slow sound. Trimmed on the way in. */
const TOO_LONG = ['ponder-open', 'book-open', 'book-page', 'book-close']
  .filter(f => fs.statSync('public/sounds/' + f + '.mp3').size > 40_000);
check(G56, 'the book sounds are trimmed, not whole video captures',
  TOO_LONG.length === 0,
  'oversized: ' + (TOO_LONG.join(', ') || 'none') + '. An MP3 over ~40KB at this bitrate is ' +
  'seconds long, which for a UI sound means it starts late and overlaps itself');

/* *"i think u can remove this bottom static text on the tutorial"*. A 'near' caption already says
   the sentence beside the thing it is about; printing it again below made the eye choose. */
check(G56, 'the caption is never printed twice',
  /\{!near && \(/.test(overlaySrc),
  'the wide bottom bar must be gated on there being no near caption. It stays for beats about the ' +
  'whole stage, which have nothing to stand beside');

/* 🔴 PORTALLED, AND THIS IS THE CHECK THAT WOULD HAVE CAUGHT THE SHIPPED BUG. `position: fixed`
   measures against the viewport only while no ancestor makes a containing block, and
   `backdrop-filter` makes one — the top bar is glass. Mounted in place, the book resolved
   `inset-0` against a 90px strip of chrome and rendered as a torn ribbon across the header. Aldi
   saw it before any check did: *"the book is broken bruh"*. The lab never showed it because the
   lab has no glass ancestor, which is exactly why this is a check and not a note. */
check(G56, 'both overlays escape their mount point through a portal',
  /createPortal\(/.test(bookSrc) && /createPortal\(/.test(overlaySrc) &&
  /document\.body/.test(bookSrc) && /document\.body/.test(overlaySrc),
  'the book and the scene player must render into document.body. Either one is mounted inside a ' +
  'panel or the glass top bar, and any ancestor with backdrop-filter, filter or transform turns ' +
  'their `fixed` positioning into positioning against that ancestor');

/* *"when we press the book, it should open the book and zoomed in to our screen taking most space
   then close and shrink and go to its perspective place when close"*. The flight has to start from
   the chip's MEASURED rectangle — a fixed origin throws the book at a corner that means nothing. */
check(G56, 'the book flies from the chip that opened it, and back into it',
  /getBoundingClientRect\(\)/.test(bookSrc) && /el\.animate\(/.test(bookSrc) &&
  /anim\.onfinish = onClose/.test(bookSrc) && /Math\.max\(a\.height \/ b\.height/.test(bookSrc) &&
  /const closedW = b\.width \/ 2 \+ 62;/.test(bookSrc) && /\[\{ transform: from \}, \{ transform: FLAT \}\]/.test(bookSrc) &&
  /\[\{ transform: FLAT \}, \{ transform: from \}\]/.test(bookSrc),
  'the flight must map the CLOSED book — half the spread plus the tab column — onto the chip, ' +
  'scaled by HEIGHT because a closed book is portrait, and it must not fade: a book that ' +
  'dissolves is not a book being carried. Driven with the Web ' +
  'Animations API, which starts when called. A state flag flipped inside a requestAnimationFrame ' +
  'already rendered this book at opacity 0 once, with nothing thrown and every check green');

/* *"the book look so bad there, its so black and small and doesnt look like a book"*. A book is
   paper, and paper does not go black in a dark room. Theme-exempt on purpose, the same exemption
   the printed nota already carries — and cream is on the palette, so no law is bent. */
check(G56, 'the book is paper in both themes, and big enough to be one',
  /const PAPER = '#EFE8D8'/.test(bookSrc) && /const LEATHER =/.test(bookSrc) &&
  /w-\[min\(1040px,95vw\)\] h-\[min\(760px,90vh\)\]/.test(bookSrc),
  'the pages must keep their own cream regardless of theme, and the spread must be BOOK-shaped. ' +
  'At 1240x780 it was 1,59:1 and he said it *"doesnt look like a regular book"*; two portrait ' +
  'pages land near 1,37:1, which is what these numbers are');

/* 🔴 THE BOOK IS THE SIDEBAR. His instruction, 2026-08-27: *"all the section in the book should
   follow the sidebar and everything on the sidebar should be on the book"*, after the first
   version invented seven categories — Gudang, Kasir, Setoran — none of which is a thing you can
   click in this app. Both directions are asserted: a nav item with no chapter is a screen with no
   way to learn it, and a chapter with no nav item is a screen that does not exist. */
const NAV_IDS = [...shellSrc.matchAll(/\{ id: '([a-z_]+)', label: '[^']+', feature:/g)].map(m => m[1]);
const BOOK_IDS = SECTIONS.map(s => s.id);
const navOnly = NAV_IDS.filter(id => !BOOK_IDS.includes(id));
const bookOnly = BOOK_IDS.filter(id => !NAV_IDS.includes(id));
check(G56, 'the book chapters are exactly the sidebar sections',
  NAV_IDS.length >= 15 && navOnly.length === 0 && bookOnly.length === 0,
  'in the sidebar but not the book: ' + (navOnly.join(', ') || 'none') +
  ' · in the book but not the sidebar: ' + (bookOnly.join(', ') || 'none') +
  '. Section ids are activeTab values, which is also what lets the book open on the screen you ' +
  'are standing in');

/* *"i want the book when press is auto redirect to the features that we use right now"*. */
check(G56, 'the book opens on the section you are standing in',
  /initialSection/.test(bookSrc) &&
  /SECTIONS\.some\(s => s\.id === initialSection\) \? initialSection : SECTIONS\[0\]\.id/.test(bookSrc),
  'the active tab must seed the open chapter, and fall back to the first chapter rather than ' +
  'crashing when a tab has no chapter yet');

check(G56, 'the scene carries both stock formulas, ready for check 631 to move onto it',
  scenes.some(s => s.steps.some(st => st.text.includes('Sold (7d) ÷ 7 × 30'))) &&
  scenes.some(s => s.steps.some(st => st.text.includes('In stock ÷ (Sold (7d) ÷ 7)'))),
  'both divisions must be written out longhand in the scene text. They are the answer to *"i want ' +
  'where u got that calculation"*, and the footnote that currently holds them is scheduled to go');


/* ════════ 57. THE BRANCH HALF OF THE REGIONAL WAREHOUSE ════════
   The HQ half of this screen — Stock by Warehouse, Shipment Plan — was rebuilt on 2026-08-27 and
   wears the ledger's vocabulary. The BRANCH half never was, and it was not only unfashionable: it
   was unreadable. Sixteen `text-white` and twenty-four `bg-black/*` sat on a page whose light
   ground is cream, so three headings measured 1,23-1,42:1 against a 4,5:1 floor. Aldi read a
   1,19:1 ring off a screenshot once and said *"just make it visible"*; nothing here was ever
   asserted, because group 8's palette scan reads MerchantSalesView and nothing else.

   Aldi, 2026-09-01, closing the question of whether the repaint and the redesign were two jobs:
   *"well redesign and repaint should go together isnt"*. They are one pass, so they get one group. */
const G57 = '57. The branch half of the regional warehouse';
const bwm = code(bwmCode);
/* The processing scrim is dark in BOTH themes by law, so white ON it is correct and is the one
   `text-white` allowed to live. Everything below sweeps the file UP TO that block — and the anchor
   is asserted before it is trusted, because `indexOf` returns -1 and a -1 slice hands the sweep an
   empty string that passes every test by reading nothing. */
const scrimAt = bwm.indexOf('{isProcessing && (');
const bwmBody = scrimAt > -1 ? bwm.slice(0, scrimAt) : '';
check(G57, 'the scrim anchor was found, so the sweeps below have something to sweep',
  scrimAt > -1 && bwm.slice(scrimAt).includes('PROSES DATA') && bwmBody.includes('isAreaAdmin &&'),
  'the isProcessing block opens the modal and must sit AFTER the branch view. A missed anchor ' +
  'makes bwmBody empty and every check in this group passes on nothing');

check(G57, 'no white ink outside the scrim — white on the cream ground measures 1,23:1',
  !/text-white/.test(bwmBody),
  'left: ' + (bwmBody.match(/text-white/g) || []).length + '. In light mode --panel is #E1DAC8 and ' +
  '--raised is #EDE7D8, so #FFFFFF headings measure 1,39:1 and 1,23:1 — under the 4,5:1 floor, and ' +
  'worse than the 1,19:1 ring he caught by eye. --ink measures 13,42:1 on the same panel');

check(G57, 'no hard-black wells outside the scrim — a literal does not follow the theme',
  !/bg-black\//.test(bwmBody),
  'left: ' + ((bwmBody.match(/bg-black\/\d+/g) || []).join(', ') || 'none') + '. A black well keeps ' +
  'its colour when the page turns cream, which is the patchwork Lite Mode already paid for once');

/* 🔴 SUPERSEDED IN PLACE, 2026-09-01, NOT DELETED. This check used to assert four separate panel
   headers — an icon chip, a font-display title, a 3px orange rule under each. Aldi then asked for
   the whole screen to become a desk: *"redesign the whole panel, similar to the main restock
   vault"*. So the four headers are genuinely gone and the vocabulary they were copying moved with
   them: the desk's identity is ONE nav strip with a lamp, a title, and tabs whose active one is
   marked by an orange underline. Same law underneath — amber marks an edge, never fills a box. */
/* The nav strip became its own component so the tutorial could mount the real one, so this check
   follows it: the screen must COMPOSE it, and the component must still be the Master Vault desk's
   shell rather than a lookalike rebuilt inside it. */
const navSrc = fs.readFileSync('src/components/WarehouseDeskNav.jsx', 'utf8');
check(G57, 'the branch half is a desk with the same nav strip the Master Vault desk has',
  /import WarehouseDeskNav from '\.\/WarehouseDeskNav\.jsx'/.test(bwmCode) &&
  /<WarehouseDeskNav title=\{deskHead\.title\}/.test(bwmBody) &&
  /import Lamp from '\.\/Lamp\.jsx'/.test(navSrc) &&
  /<Lamp tone="on" \/>/.test(navSrc) &&
  /font-display font-bold uppercase tracking-\[0\.15em\] text-\[13px\] text-ink truncate/.test(navSrc) &&
  /active === t\.id \? 'text-ink border-b-orange bg-raised'/.test(navSrc),
  'the desk must reuse the shell the Master Vault desk already has — the shared Lamp component, a ' +
  'font-display title at 13px, and an active tab marked by an orange BOTTOM BORDER. A second ' +
  'status dot or a filled amber tab is a second visual language on one page');

/* 🔴 FOUND BY LOOKING, AFTER EVERY CHECK ABOVE WAS ALREADY GREEN — which is the whole argument
   for getting eyes on it. `--orange` is #FF8C1A in BOTH themes because it is the EDGE half of the
   amber law; as reading ink on the light well it measured 1,08:1 in the lab, worse than the white
   ink this group was written to catch. The tailwind config already names the stand-in: *"--gold
   measures 1,19:1 on the light ground, so it may fill a plate but must never label one"*. */
check(G57, 'amber labels nothing — text-orange is an edge token, not an ink',
  !/text-orange(?!-ink)/.test(bwmBody),
  'left: ' + (bwmBody.match(/text-orange(?!-ink)\b/g) || []).length + '. border-orange and the 3px ' +
  'bg-orange rules are fine and stay — those are edges. Only the ink form is banned, and ' +
  'text-accent-ink is the readable stand-in in both themes');

/* 🔴 ALSO FOUND BY LOOKING. Six inputs had no placeholder colour at all, so they rendered in the
   browser's own rgb(156,163,175) — which is SLATE, the one hue the palette law bans by name, on
   every address field in the reorder form. Measured 1,36:1 on the light well.
   theme.css:3231 settled this once: --ink-dim, `opacity: 1` because Firefox dims placeholders by
   .54 on top of whatever colour is set, and italic because a darkened placeholder is otherwise
   indistinguishable from a typed value in light mode. Same three, applied per input. */
const phInputs = (bwmBody.match(/placeholder="/g) || []).length;
const phColoured = (bwmBody.match(/placeholder:text-ink-dim placeholder:opacity-100 placeholder:italic/g) || []).length;
check(G57, 'every placeholder has a colour of its own, so none falls back to the browser slate',
  phInputs > 0 && phColoured >= phInputs,
  phColoured + ' coloured of ' + phInputs + ' placeholders. All three parts are load-bearing: the ' +
  'token, the opacity Firefox needs, and the italic that keeps an EMPTY field from reading as a ' +
  'filled one in light mode');

/* *"i want to see the product in full name to avoid mistake in the future"*. Two of his own
   products share a four-character prefix, so an ellipsis deletes the only part that tells them
   apart — on a screen where the number typed beside the name becomes money owed. */
const nameTrunc = bwmBody.split('\n').filter(l => /\{(item|r)\.name\}/.test(l) && /truncate/.test(l));
check(G57, 'a product name wraps, it never truncates',
  nameTrunc.length === 0,
  'truncated on ' + nameTrunc.length + ' line(s). Wrapping costs height; truncation costs the ' +
  'wrong count, and it is silent');


/* ════════ 58. THE SHIPMENT LABEL, AND WHAT A SCAN IS ALLOWED TO MEAN ════════
   Aldi, 2026-09-01: *"i want u to add barcode to scan and print for restock vault so that when it
   scanned it can auto confirm that the shipment is arrived"*. Asked which of the two meanings of
   "arrived" he wanted, he answered the harder one himself:

     *"the scan said that the shipment is arrived but the blind counting on the shipment should
      still be exist"*

   🔴 EVERY CHECK IN THIS GROUP DEFENDS THAT SENTENCE. The cheap version of this feature — scan,
   mark DELIVERED, credit the stock HQ says it sent — is four fewer lines and destroys the OS&D
   record, silently, while every figure in the app still adds up. */
const G58 = '58. The shipment label, and what a scan may mean';
const restockSrc58 = fs.readFileSync('src/RestockVaultView.jsx', 'utf8');
const labelSrc = pStrip(fs.readFileSync('src/components/ShipmentLabel.jsx', 'utf8'));
const scanSrc = pStrip(fs.readFileSync('src/components/ArrivalScanner.jsx', 'utf8'));

/* THE LABEL TRAVELS IN THE COUNTER'S HANDS. A quantity printed on it is the anchor the partially
   blind count exists to remove — the product NAMES are on it deliberately, because a name is what
   makes a missing product countable as 0 instead of invisible. */
check(G58, 'the printed label names the products and never prints a quantity',
  /\{i\.name\}/.test(labelSrc) &&
  !/\{i\.qty\}|\.qty\b|totalQty|reduce\(/.test(labelSrc),
  'a shipment label carrying quantities turns the arrival check into a copying exercise. It may ' +
  'carry the route, the date, the number of KINDS and the product names — nothing countable');

check(G58, 'the label carries a real barcode of the delivery id, not a picture of one',
  /import JsBarcode from 'jsbarcode'/.test(labelSrc) &&
  /format: 'CODE128'/.test(labelSrc) &&
  /JsBarcode\(svgRef\.current, String\(shipment\.id\)/.test(labelSrc),
  'the payload must be the delivery id itself, which is already unique. Encoded by a library on ' +
  'purpose: a Code 128 table is 107 patterns and one wrong digit prints a symbol that looks ' +
  'correct and refuses to scan at the warehouse door');

/* 🔴 THE ONE THAT MATTERS. A scan records that the BOX is here. It must not touch stock, must not
   move the status to DELIVERED, and must not write a receipt. */
const scanFn = bwmCode.slice(
  bwmCode.indexOf('const handleScannedArrival'),
  bwmCode.indexOf('const handleSubmitRequest'));
check(G58, 'the scan anchor was found, so the three bans below have something to read',
  bwmCode.indexOf('const handleScannedArrival') > -1 && scanFn.length > 400 && scanFn.length < 4000,
  'handleScannedArrival must sit above handleSubmitRequest; a missed anchor makes the slice empty ' +
  'and every ban below passes by reading nothing. Slice length: ' + scanFn.length);

/* ⚠️ SCOPED TO THE DOCUMENT PAYLOAD, NOT THE WHOLE FUNCTION. The timeline entry legitimately
   carries `status: 'ARRIVED'` — that is a LOG LINE describing what happened, not the shipment's
   state. A file-wide ban on `status:` went red against correct code on the first run, which is the
   over-broad-guard trap this project has now paid for four times. The payload is everything from
   the updateDoc brace up to `workflowTimeline:`, and THAT is where a status write would live. */
const scanPayload = scanFn.slice(scanFn.indexOf('await updateDoc('), scanFn.indexOf('workflowTimeline:'));
check(G58, 'a scan never credits stock and never marks a delivery received',
  scanFn.length > 400 && scanPayload.length > 60 &&
  !/increment\(/.test(scanFn) && !/DELIVERED/.test(scanFn) && !/receivedItems/.test(scanFn) &&
  !/status:/.test(scanPayload) && /arrivedAt: serverTimestamp\(\)/.test(scanPayload),
  'his rule, in his own words: the scan says the shipment ARRIVED and the blind count still has ' +
  'to happen. It may write arrivedAt, arrivedBy and a timeline line. The moment it writes a ' +
  'status or an increment, every delivery becomes a rubber stamp signed against HQ figures');

check(G58, 'the shipment stays in Incoming after a scan, because it is not counted yet',
  /const openRequests = requests\.filter\(r => r\.status === 'PENDING' \|\| r\.status === 'IN_TRANSIT'\)/.test(bwmBody),
  'Incoming is filtered on STATUS, not on arrival. A scanned box whose count is still owed has to ' +
  'stay on the screen that owes it');

/* A red flag that fires on a box already standing in the warehouse is a flag people learn to
   ignore, and it is the only alert on that screen. */
check(G58, 'the late-shipment flag stops firing once a box is scanned in',
  /const stale = req\.status === 'IN_TRANSIT' && !req\.arrivedAt && days >= 3;/.test(code(restockSrc58)) &&
  /req\.arrivedAt \? 'Sampai — belum dihitung'/.test(code(restockSrc58)),
  'once the branch has scanned the label, "Belum diambil N hari" is factually wrong. HQ needs the ' +
  'third state — arrived, not yet counted — which the status alone never distinguished');

/* `BarcodeDetector` is an Android Chrome API. Shipping the camera alone would hand a dead button
   to everyone on a desktop or an iPhone — measured false in this environment on 2026-09-01. */
check(G58, 'the scanner always offers a typed fallback and says why the camera is unavailable',
  /'BarcodeDetector' in window/.test(scanSrc) &&
  /setState\('unsupported'\)/.test(scanSrc) &&
  /window\.isSecureContext/.test(scanSrc) &&
  /Atau ketik nomor kiriman/.test(scanSrc),
  'the typed box is offered ALWAYS, not only after a failure: a cracked lens, a rained-on label ' +
  'or an already-opened box must not leave a warehouse worker unable to record an arrival. And a ' +
  'control that cannot say why it will not work is the silent failure this app bans');

check(G58, 'a scanned code is matched against this branch only, and says so when it does not match',
  /requests\.find\(r => r\.id === clean\)/.test(scanFn) &&
  /tidak ada di daftar kiriman/.test(scanFn),
  'requests are already filtered to this branch by the listener, so a label for another warehouse ' +
  'finds nothing — and the message has to say that rather than failing quietly');


/* 🔴 HIS SEQUENCE: SCAN, THEN COUNT. Group 58 already bans the scan from crediting stock.
   This is the other direction — the count must not open without an arrival. Aldi, 2026-09-01:
   *"this barcode is just as a gate to confirm and make sure that all the package is arrived and
   opening a blind count panel to be fill"*. */
check(G58, 'the count panel cannot open until the box has been scanned in',
  /const isFulfillableByTier3 = isAreaAdmin && order\.status === 'IN_TRANSIT' && !!order\.arrivedAt;/.test(bwmCode) &&
  /const isAwaitingScan = isAreaAdmin && order\.status === 'IN_TRANSIT' && !order\.arrivedAt;/.test(bwmCode),
  'HITUNG & TERIMA BARANG is the only control that credits stock. Gating it on arrivedAt is what ' +
  'makes the barcode a gate rather than a decoration on the label');

check(G58, 'a shipment still waiting on its scan says so, instead of showing an empty card',
  /\{isAwaitingScan && \(/.test(bwmCode) &&
  /Scan barang sampai<\/b> di atas daftar/.test(bwmCode),
  'a hidden button is a silent failure: the counter sees a card with nothing on it and goes ' +
  'looking for the surat jalan, which is the one paper this screen exists to keep out of their ' +
  'hands. The card has to name the control that unblocks it');

check(G58, 'a successful scan opens the count panel itself, so the two are one action',
  /setReceivingOrder\(match\);/.test(scanFn) && /setReceiptCounts\(\{\}\);/.test(scanFn),
  'his words: the barcode is a gate that OPENS the blind count panel. Leaving the count behind a ' +
  'second button is exactly the step that was missing this morning');

const G59 = '59. Karton, bal and slop at the intake desk';
const salesSrc59 = fs.readFileSync('src/MerchantSalesView.jsx', 'utf8');

/* 🔴 HIS RULE, 2026-09-01: *"we should have 1 data to be used many times on the other
   components"*. Packing is per product and lives in the master vault, so the ONLY acceptable
   source for a rate is helpers.convertToBks. A local `packsPerSlop || 10` in this file would be
   another copy of the maths, and a copy is how two screens end up disagreeing about how many
   packs are in a karton. */
check(G59, 'the intake desk reads its rates from the one shared converter, not its own copy',
  /import \{[^}]*convertToBks[^}]*\} from '\.\/utils\/helpers'/.test(code(restockSrc58)) &&
  /Karton: convertToBks\(1, 'Karton', prod \|\| \{\}\)/.test(code(restockSrc58)) &&
  !/packsPerSlop|slopsPerBal|balsPerCarton/.test(code(restockSrc58)),
  'the moment this file carries its own 10/20/4 it is an eleventh copy of the conversion, and ' +
  'the one that is wrong will be the one nobody is looking at');

/* The boxes are a CALCULATOR. They must leave the line holding ONE number in ONE unit, because
   `totalItemsReceived`, the landed cost per unit, the HQ stock increment and the shipment line
   all read `qtyReceived` raw. A line that said qty 2 unit Karton would deduct 2 from HQ stock. */
check(G59, 'the four boxes total to Bks and leave the line holding one number in one unit',
  /qtyReceived: anyTyped \? totalBks : ''/.test(code(restockSrc58)) &&
  /unit: 'Bks', qtyReceived:/.test(code(restockSrc58)) &&
  /const totalBks = Object\.keys\(per\)\.reduce/.test(code(restockSrc58)),
  'storing the typed unit instead of the total is the data intersection he asked to avoid: ' +
  'increment(-2) for two karton silently removes two packs from HQ');

/* One arrangement to learn, not two. Same four units, same order, in both desks. */
check(G59, 'the intake desk offers the same four units, in the same order, as the sales terminal',
  /\['Karton', 'Bal', 'Slop', 'Bks'\]\.map/.test(code(restockSrc58)) &&
  /\['Karton', 'Bal', 'Slop', 'Bks'\]\.map/.test(code(salesSrc59)),
  'a second order of the same four boxes is a second thing to learn and a second place to ' +
  'mistype under time pressure');

/* His words, same message: *"of course the default price is distributor price on the restock
   vault"*. It already was; this check is what stops a later edit from quietly making it retail. */
check(G59, 'a line added at the intake desk starts at the distributor price',
  /basePrice: product\.priceDistributor \|\| 0/.test(code(restockSrc58)),
  'the intake desk buys, it does not sell — a retail default here would overstate every ' +
  'landed cost in the ledger');

/* The rates are PRINTED, not merely used. When the packing saved in the master vault is wrong,
   the only symptom is a total that looks plausible; the line is what makes it visible. */
check(G59, 'the line prints the rates it is using',
  /1 KARTON = \{per\.Karton\} &middot; 1 BAL = \{per\.Bal\} &middot; 1 SLOP = \{per\.Slop\} BKS/.test(code(restockSrc58)) &&
  /1 KARTON = \{per\.Karton\} &middot; 1 BAL = \{per\.Bal\} &middot; 1 SLOP = \{per\.Slop\} BKS/.test(code(salesSrc59)),
  'a wrong rate produces a plausible total, which is the one kind of error nobody catches');

const G60 = '60. The phone gets the same screens, not a cropped desk';
const overlaySrc60 = fs.readFileSync('src/ponder/PonderOverlay.jsx', 'utf8');
const bookSrc60 = fs.readFileSync('src/ponder/PonderBook.jsx', 'utf8');
const themeCss60 = fs.readFileSync('src/styles/theme.css', 'utf8');

/* \U0001F534 EVERY ONE OF THESE WAS MEASURED ON A 375x812 PHONE BEFORE IT WAS TOUCHED, and the word
   he uses for all of them is the same one: "cutted". */

/* The line table was 780px wide inside a 291px window, so the karton/bal/slop boxes he had just
   asked for sat off screen until it was dragged sideways. ONE markup, two layouts — a second
   phone-only row component would be a second place for the columns to drift. */
check(G60, 'the intake lines stack into cards on a phone instead of scrolling sideways',
  /kpm-stack-rows/.test(code(restockSrc58)) &&
  /sm:min-w-\[780px\]/.test(code(restockSrc58)) &&
  /data-label="Jumlah"/.test(code(restockSrc58)) &&
  /\.kpm-stack-rows thead \{ display: none; \}/.test(themeCss60) &&
  /max-width: 639px/.test(themeCss60),
  'a table that has to be dragged sideways hides the column the user is being asked to fill, and ' +
  'the one column hidden here was the quantity');

/* His own condition for accepting anything pinned at the bottom of a phone: it collapses to one
   line. The footer stood 160px tall against 812px of screen. */
check(G60, 'the completeness bar collapses on a phone rather than eating the form',
  /hidden sm:inline text-\[10px\] font-bold text-ink-muted uppercase tracking-widest shrink-0">Kelengkapan/.test(code(restockSrc58)) &&
  /truncate sm:whitespace-normal/.test(code(restockSrc58)),
  'a pinned bar that grows to three lines is the category he rejected outright; one line is the ' +
  'version he accepted');

/* The sheet was content-height and pinned to the bottom: 283px of empty scrim above it, and a
   206px window holding a 248px picture below. The stage is flex-1, so height is all it needed. */
check(G60, 'the ponder sheet takes the height of the phone, so its stage stops cropping',
  /h-\[92vh\] lg:h-auto max-h-\[92vh\]/.test(code(overlaySrc60)) &&
  /min-h-\[220px\] lg:min-h-\[300px\]/.test(code(overlaySrc60)),
  'a half-height sheet wastes a third of the screen and crops the demo it exists to show');

/* Four cards in one column ran 30px past the bottom of the screen, and scrolling inside the book
   is banned by his own words. A book that runs out of room turns the page. */
check(G60, 'the book turns the page on a phone rather than running off the bottom',
  /const perPage = \(typeof matchMedia === 'function' && !matchMedia\('\(min-width: 640px\)'\)\.matches\) \? 2 : PER_PAGE;/.test(code(bookSrc60)) &&
  /const safePage = Math\.min\(page, pages - 1\);/.test(code(bookSrc60)) &&
  /\{safePage \+ 1\} \/ \{pages\}/.test(code(bookSrc60)),
  'PER_PAGE is 4 and the grid is one column below sm, so the fourth card lands below the fold ' +
  'on every phone; and a stale page index would render an empty spread');

/* Not cosmetic: the page control only turns pages WITHIN a section, so with the ribbons hidden a
   phone could not reach another section at all. */
check(G60, 'the section ribbons are on the phone, because they are the only way to change section',
  /className="relative z-10 flex flex-col justify-center gap-\[2px\] w-\[84px\] lg:w-\[118px\]/.test(code(bookSrc60)) &&
  /const coverLeft = narrow \? 82 : COVER_LEFT;/.test(code(bookSrc60)) &&
  /left: coverLeft/.test(code(bookSrc60)),
  'the leather has to follow the ribbon column\'s width or the ribbons stop reading as tabs cut ' +
  'into its edge');

let last = '';
for (const r of results) {
  if (r.group !== last) { console.log('\n' + r.group); last = r.group; }
  const mark = r.ok ? '  ok  ' : ' FAIL ';
  console.log(`${mark} ${r.label}${r.ok ? '' : `   <-- ${r.detail}`}`);
}
console.log(`\n${'='.repeat(58)}`);
console.log(`${pass} passed, ${fail} failed, ${pass + fail} checks`);
process.exit(fail ? 1 : 0);
