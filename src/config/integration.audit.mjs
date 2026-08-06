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
inJs (G2, 'press picture to pin',         'in the rail');
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

/* ── 6. SIDEBAR AWARENESS ────────────────────────────────────────────────── */
const G6 = '6. Sidebar';
inCss(G6, 'app knows the nav is open',    'kpm-nav-open');
inCss(G6, 'rail yields when cramped',     'max-width:1535px');
inCss(G6, 'grid yields when cramped',     'max-width:1659px');
check(G6, 'sidebar collapses its width', css.includes('.lg' + BS + ':w-0'));

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

/* ── 8. PALETTE LAW ──────────────────────────────────────────────────────── */
const G8 = '8. Palette law';
const beforeNota = src.slice(0, src.indexOf('print-receipt'));
const offPalette = (beforeNota.match(/(^|["' ])(slate|blue|emerald|indigo|teal|cyan|green)-[a-z0-9]/g) || [])
  .filter(m => !m.includes('translate'));
check(G8, 'no blue/green in the app UI', offPalette.length === 0,
  offPalette.length ? offPalette.slice(0, 6).join(' ') : '');
check(G8, 'printed nota keeps KPM blue (deliberate)', src.includes('!text-blue-900'));

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
