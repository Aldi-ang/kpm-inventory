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
  /unlockSounds/.test(mainJsx) && /once:\s*true/.test(mainJsx),
  'main.jsx must unlock on the first gesture or every sound outside the terminal is a no-op');
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

check(G15, 'a signed-out user sees a way in without opening the drawer',
  /!user\s*&&\s*\([\s\S]{0,900}?onClick=\{onLogin\}/.test(themeSrc),
  'the only login was inside a sidebar that starts closed on a phone');
check(G15, 'that way in is not inside the sidebar',
  /fixed inset-0 z-\[80\][\s\S]{0,900}?onClick=\{onLogin\}/.test(themeSrc),
  'it must render over the app, not in the panel that is hidden on a phone');
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
check(G16, 'the nav button is not rendered at all while the gate is up',
  /\{!showAdminLogin && \(/.test(strip(themeSrc)),
  'it sits in its own stacking context, so raising the gate z-index does NOT cover it, and a '
  + 'class-based hide is only as reliable as the stylesheet that happens to be loaded');
check(G16, 'App hands the theme the flag that hides it', /showAdminLogin=\{showAdminLogin\}/.test(appCode),
  'hiding it in the theme does nothing if the prop never arrives');
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
