/* A way to LOOK at a Ponder scene without the Master Vault password.

   The app itself cannot be opened in this environment — the dev server is HTTPS with a
   self-signed certificate on purpose (crypto.subtle needs a secure context), and every screen
   sits behind a Google sign-in and then the vault gate. So a scene could be built, checked and
   shipped without anyone ever seeing a frame of it, which is exactly how three "fixed" visual
   claims got made blind on 2026-08-16.

   This mounts the REAL PonderOverlay against the REAL stylesheet. It is not a copy of the
   markup — a harness that invents markup measures the harness.

     npx vite build --config tools/ponder-lab.config.mjs
     python -m http.server 4187 -d dist-ponderlab
     open /tools/ponder-lab.html          dark
     open /tools/ponder-lab.html?light    light mode
     open /tools/ponder-lab.html?lite     Lite Mode (transitions stripped)
*/
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import PonderOverlay from '../src/ponder/PonderOverlay.jsx';
import PonderBookButton from '../src/ponder/PonderBook.jsx';
import TierPovSwitch from '../src/components/TierPovSwitch.jsx';
import StockByWarehouseTable from '../src/ponder/stages/StockByWarehouseTable.jsx';
import ShipmentPlanTable from '../src/ponder/stages/ShipmentPlanTable.jsx';
import ProductPerformancePanel from '../src/components/ProductPerformancePanel.jsx';
import AcceptanceReceipt from '../src/components/AcceptanceReceipt.jsx';
import RestockVaultView from '../src/RestockVaultView.jsx';
import MerchantSalesView from '../src/MerchantSalesView.jsx';
import { CustomerManagement } from '../src/components/CustomerManager.jsx';
import AgentInventoryView from '../src/AgentInventoryView.jsx';
import EODReconciliationView from '../src/EODReconciliationView.jsx';
import AgentProfileView from '../src/AgentProfileView.jsx';
import StockOpnameView from '../src/StockOpnameView.jsx';
import JourneyView from '../src/JourneyView.jsx';
import MapMissionControl from '../src/MapMissionControl.jsx';
import FleetCanvasManager from '../src/FleetCanvasManager.jsx';
import ConsignmentFinanceView from '../src/ConsignmentFinanceView.jsx';
import useTransactionEngine from '../src/hooks/useTransactionEngine.js';
import { SamplingFolderView, SamplingAnalyticsView, SampleEntryModal } from '../src/components/SamplingManager.jsx';
import BranchWarehouseManager from '../src/components/BranchWarehouseManager.jsx';
import ShipmentLabel from '../src/components/ShipmentLabel.jsx';
import ArrivalScanner from '../src/components/ArrivalScanner.jsx';
import { ConfirmHost, confirmAction } from '../src/components/ConfirmGate.jsx';
import { ToastHost, notify } from '../src/components/Toast.jsx';
import BiohazardTheme from '../src/components/BiohazardTheme.jsx';
import { Cloud } from 'lucide-react';
/* Same module the alias in ponder-lab.config.mjs points `firebase/firestore` at, so writing a
   fixture here is what the component's own listener reads back. */
import { FIXTURES } from './lab-firestore-stub.js';
import { LOOKS } from './lab-looks.js';
import { scanNotaToBase64, homography, getLocalDayKey } from '../src/utils/helpers.js';
import PhotoField from '../src/components/PhotoField.jsx';
import { SCENES } from '../src/ponder/registry.js';
import { LAB_BELL_NEEDS, seedLabBell } from './lab-bell.jsx';
if (new URLSearchParams(window.location.search).has('bell')) seedLabBell();

const q = new URLSearchParams(window.location.search);
if (q.has('light')) document.documentElement.classList.add('light');
/* ?css=<rules> injects a stylesheet AFTER the app's own, so a proposed layout change can be
   rendered and shown to Aldi as a frame BEFORE it is written into a component — his rule,
   2026-09-14: a decision comes as a picture, not a sentence. Lab only; nothing here ships. */
if (q.has('css')) { const s = document.createElement('style'); s.textContent = q.get('css'); document.head.appendChild(s); }
/* ?look=<name>[,<name>] — a proposal's CSS by short name (tools/lab-looks.js), so Aldi can open a
   board option live and press it instead of reading a 6 KB ?css= link */
if (q.has('look')) { const s = document.createElement('style'); s.textContent = q.get('look').split(',').map((k) => LOOKS[k.trim()] || '').join(''); document.head.appendChild(s); }
if (q.has('lite')) document.documentElement.classList.add('lite-mode');

/* ?scene=<id>, defaulting to the first one in the registry, so a new scene needs no edit here. */
const id = q.get('scene') || Object.keys(SCENES)[0];

/* ?step=N freezes the scene on one beat. A screenshot of an autoplaying scene lands wherever the
   virtual-time budget happened to stop, which is not a thing anyone chose to look at. */
const step = Number(q.get('step') || 0);

function Lab() {
  const [open, setOpen] = React.useState(true);
  React.useEffect(() => {
    if (!step) return;
    const t = setTimeout(() => {
      const notch = document.querySelectorAll('[aria-label^="Step "]')[step];
      if (notch) notch.click();
      const pause = document.querySelector('[aria-label="Pause"]');
      if (pause) pause.click();
    }, 60);
    return () => clearTimeout(t);
  }, []);
  return <PonderOverlay sceneId={id} open={open} onClose={() => setOpen(false)} />;
}

/* 🔴 ?hover FREEZES THE CHIP'S HOVER STATE, AND WITHOUT IT A HOVER CANNOT BE LOOKED AT AT ALL.
   Headless Chrome has no pointer, so `--screenshot` can never land on a `:hover`; the in-app browser
   pane refuses to composite when it is not on screen, so synthetic hover does not paint there
   either. That left the book's hover animation verifiable only by reading CSS back — which is
   exactly the blind-claim habit this whole harness exists to stop.

   It applies what `.group:hover` would apply, as inline styles, because forcing the real rules would
   mean re-typing Tailwind's escaped selectors and a typo there fails silently and open. Paused on a
   chosen frame so the sparks are caught mid-flight and staggered rather than all at t=0. */
function forceHover(root) {
  const glow = root.querySelector('span[aria-hidden="true"]');
  const cover = root.querySelector('span.origin-left');
  const sparks = [...root.querySelectorAll('span[style*="--spark-drift"]')];
  if (glow) glow.style.opacity = '1';
  if (cover) cover.style.transform = 'rotateY(-38deg)';
  sparks.forEach((s, i) => {
    s.style.animationName = 'bookSpark';
    s.style.animationTimingFunction = 'linear';
    s.style.animationIterationCount = 'infinite';
    s.getAnimations().forEach(a => { a.currentTime = 420 + i * 190; a.pause(); });
  });
  return sparks.length;
}

/* ?book mounts the top-bar book instead of the player, and clicks it open so a screenshot lands on
   the spread rather than on a 34px closed book. ?shut leaves it closed, for looking at the glyph
   and its hover state; add ?hover to that to see the hover itself. */
function BookLab() {
  React.useEffect(() => {
    if (q.has('hover')) {
      /* after the chip has mounted, and only once — the styles are inline so nothing re-applies */
      const h = setTimeout(() => forceHover(document.body), 80);
      return () => clearTimeout(h);
    }
    if (q.has('shut')) return;
    const t = setTimeout(() => document.querySelector('[aria-label="Tutorial book"]')?.click(), 60);
    return () => clearTimeout(t);
  }, []);
  /* 🔴 THE GLASS STRIP IS THE POINT. The real top bar carries `backdrop-filter`, and that makes a
     containing block for `position: fixed` descendants — which is how the book shipped as a torn
     ribbon across the header while this lab showed it perfectly. A harness that does not reproduce
     the ancestor is testing a different page. Anything mounted in the top bar gets tested in here. */
  return (
    <div className="p-6 flex justify-end"
         style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  background: 'rgba(255,255,255,.02)', overflow: 'hidden' }}>
      <PonderBookButton activeTab={q.get('tab') || 'restock_vault'} />
    </div>
  );
}

/* 🔴 ?pov MOUNTS THE COSTUME RACK, which is otherwise unlookable-at from here: it opens only
   from a hidden door in the sidebar, only for the owner's real signed-in email, and only behind
   the vault gate — three things this harness has no way to satisfy. The place picker added
   2026-08-30 would otherwise have shipped on a diff read and nothing more.
   `places` is the shape App.jsx computes: Headquarters plus the roster's cabang. `?pov=solo`
   passes an empty list instead, which is the fresh-company case the control has to explain
   rather than render as an empty select. */
function PovLab() {
  const solo = q.get('pov') === 'solo';
  return (
    <TierPovSwitch
      open
      current={null}
      places={solo ? [] : ['Headquarters', 'BANDUNG', 'MUNTILAN']}
      onPick={() => {}}
      onExit={() => {}}
      onClose={() => {}}
    />
  );
}

/* 🔴 ?minkirim MOUNTS SEBARAN STOK WITH THE NEW COLUMN. The real screen sits behind a Google
   sign-in, the vault gate AND a company with real delivery history, so the `Minimal kirim` column
   could otherwise only be read off a diff. The table is presentational by design — it renders the
   rows it is handed — so handing it rows is measuring the component, not the harness.
   `?minkirim=blank` hands rows with NO `minimum` at all, which is exactly what the Ponder tutorial
   does: it must fall back to em-dashes rather than crash or print 0. */
const MK_ROWS = [
  { name: 'MASTER', shelf: 24921, transit: null, field: 0, sold: 500, perMonth: 2143, minimum: null,
    detail: [
      { id: 'p1', name: 'Cello Chocolate', shelf: 12000, transit: 0, field: 0, sold: 500, perMonth: 2143, daysLeft: 20, days: null, drops: 0, unexplained: 0, minimum: null },
      { id: 'p2', name: 'Cello Mmrapi',    shelf: 12921, transit: 0, field: 0, sold: 0,   perMonth: 0,    daysLeft: null, days: null, drops: 0, unexplained: 0, minimum: null },
    ] },
  { name: 'BANDUNG', shelf: 400, transit: 0, field: 120, sold: 280, perMonth: 1200, minimum: 440,
    detail: [
      { id: 'p1', name: 'Cello Chocolate', shelf: 400, transit: 0, field: 120, sold: 280, perMonth: 1200, daysLeft: 10, days: 12, drops: 3, unexplained: 0, minimum: 440 },
      { id: 'p2', name: 'Cello Mmrapi',    shelf: 0,   transit: 250, field: 0, sold: 0,   perMonth: 0,    daysLeft: null, days: null, drops: 0, unexplained: 0, minimum: null },
    ] },
  { name: 'MUNTILAN', shelf: 90, transit: 0, field: 30, sold: 210, perMonth: 900, minimum: 0,
    detail: [
      { id: 'p1', name: 'Cello Chocolate', shelf: 90, transit: 0, field: 30, sold: 210, perMonth: 900, daysLeft: 3, days: 40, drops: 1, unexplained: 25, minimum: 0 },
    ] },
];

function MinKirimLab() {
  const blank = q.get('minkirim') === 'blank';
  const strip = (r) => ({ ...r, minimum: undefined, detail: r.detail.map(d => ({ ...d, minimum: undefined })) });
  const rows = blank ? MK_ROWS.map(strip) : MK_ROWS;
  const [open, setOpen] = React.useState('BANDUNG');
  const sum = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  return (
    <div className="p-6 bg-panel">
      <StockByWarehouseTable
        rows={rows}
        totals={{ shelf: sum('shelf'), transit: sum('transit'), field: sum('field'),
                  sold: sum('sold'), perMonth: sum('perMonth'),
                  minimum: blank ? null : rows.some(r => r.minimum != null) ? sum('minimum') : null }}
        openGudang={open}
        onToggle={setOpen}
      />
    </div>
  );
}


/* 🔴 ?plan MOUNTS RENCANA KIRIM. Same argument as ?minkirim: the real panel needs a signed-in
   owner, the vault gate and a company with real delivery history, so without this the product-first
   table could only be read off a diff. The rows are the shape `BranchWarehouseManager` transposes
   out of `logistics`.
   `?plan=empty` is the fresh-company case — no cabang on the roster at all, which must explain
   itself rather than render a table with no columns. */
const PLAN_ROWS = [
  { id: 'p1', name: 'Cello Chocolate', hq: 900,
    byBranch: { BANDUNG: 440, MUNTILAN: 610, SEMARANG: 350 }, needed: 1400, short: 500 },
  { id: 'p2', name: 'Cello Mmrapi', hq: 12921,
    byBranch: { BANDUNG: 120, MUNTILAN: 0, SEMARANG: null }, needed: 120, short: 0 },
  { id: 'p3', name: 'Cello Kopi', hq: 0,
    byBranch: { BANDUNG: null, MUNTILAN: null, SEMARANG: null }, needed: null, short: null },
  { id: 'p4', name: 'Cello Menthol', hq: 4000,
    byBranch: { BANDUNG: 0, MUNTILAN: 0, SEMARANG: 0 }, needed: 0, short: 0 },
];

function PlanLab() {
  const empty = q.get('plan') === 'empty';
  return (
    <div className="p-6 bg-panel">
      <ShipmentPlanTable rows={empty ? [] : PLAN_ROWS} branches={empty ? [] : ['BANDUNG', 'MUNTILAN', 'SEMARANG']} />
    </div>
  );
}

/* 🔴 ?perf MOUNTS THE PRODUCT PERFORMANCE PANEL, not its table. The table was already driven
   through the tutorial, so its rows, its share bar and its incomplete-range banner have been on a
   screen. What never had been is the panel's own chrome: the four range buttons, the loading line
   and the failed-read box. All of it renders without Firestore.
   `?perf` leaves `db` null, so the effect returns before it reads anything and the panel stays in
   its LOADING state — which is also the only way to look at the header and the range buttons.
   `?perf=failed` hands it a `db` that is not a Firestore. `doc()` rejects, the catch fires, and the
   red box is what a broken read really looks like rather than what it was meant to look like.
   The third state, `ok`, IS `ProductPerformanceTable` — `?scene=product-performance` renders it. */
function PerfLab() {
  const failed = q.get('perf') === 'failed';
  return (
    <div className="p-6 bg-inset">
      <ProductPerformancePanel db={failed ? {} : null} appId="lab" userId={failed ? 'lab' : null} inventory={[]} />
    </div>
  );
}

/* 🔴 ?nota MOUNTS THE SURAT JALAN. It is the only screen in the app nobody could look at: it needs
   a Google sign-in, then the Master Vault gate, then a delivery record that has been accepted.
   "it renders transparent" therefore survived as a report with no reproduction. The record below
   is fixed on purpose — a receipt whose numbers move cannot be compared between two frames.

   Something is rendered BEHIND it deliberately. A transparent card is invisible over a blank page;
   it is only visible when there is text underneath to show through. */
const NOTA = {
  poNumber: 'SJ-185108',
  date: '27/08/2026',
  supplierName: 'Pabrik Kudus',
  originAddress: 'Jl. Raya Kudus No. 12, Kudus, Jawa Tengah',
  destination: 'Gudang Pusat (Master Vault)',
  destinationAddress: 'Jl. Industri Raya No. 88, Semarang, Jawa Tengah',
  totalBasePrice: 184500000,
  shippingCost: 2750000,
  laborCost: 900000,
  exciseTax: 21300000,
  trueLandedTotal: 209450000,
  deliveredBy: 'Slamet Riyadi',
  receivedBy: 'Aldi Kurniawan',
  items: [
    { name: 'Djarum Super 12', batchNo: 'PK-2608-A', qtyReceived: '480 Bks' },
    { name: 'Djarum Super 16', batchNo: 'PK-2608-B', qtyReceived: '320 Bks' },
    { name: 'Gudang Garam Surya 12', batchNo: 'PK-2608-C', qtyReceived: '240 Bks' },
    { name: 'Sampoerna Mild 16', batchNo: 'N/A', qtyReceived: '160 Bks' },
  ],
};

/* 🔴 COPIED VERBATIM from `BiohazardTheme.jsx` — the app shell's own `<style>` block, which the lab
   does not mount. Without it the harness renders a page the app never shows: the receipt looked
   perfectly white here while it was dark and see-through in his browser. `logicFixes.selfcheck.mjs`
   pins this string against the source so the copy cannot drift in silence. */
const SHELL_RULE = `.biohazard-content .bg-white:not(.print-receipt):not(.print-receipt *) { background-color: rgba(20, 20, 20, 0.85) !important; border: 1px solid rgba(255,255,255,0.15) !important; color: #e5e5e5 !important; }`;

function NotaLab() {
  return (
    /* ⚠️ `biohazard-content` IS THE POINT, not decoration. The app shell carries that class and a
       rule under it repaints every `.bg-white` inside. A harness that mounts the receipt without
       its ancestor tests a different page — which is why "it renders transparent" reproduced
       nowhere for a whole session. */
    <div className="biohazard-content p-6 bg-panel min-h-screen">
      <style>{SHELL_RULE}</style>
      <h3 className="text-ink text-xl font-display font-bold uppercase tracking-widest mb-4">Page content behind the receipt</h3>
      {Array.from({ length: 14 }, (_, i) => (
        <p key={i} className="text-ink text-sm mb-2">
          Baris {i + 1} — teks halaman di belakang nota. Kalau kartu nota tembus pandang, kalimat ini terbaca menembusnya.
        </p>
      ))}
      <AcceptanceReceipt acceptance={NOTA} onClose={() => {}} companyName="KPM INVENTORY" />
    </div>
  );
}

/* 🔴 ?places MOUNTS THE REAL RESTOCK VAULT, on the Tempat tab. It takes `db` as a prop and its
   only subscription bails out when there is no signed-in user, so with `user` null it renders the
   whole desk against fixtures and never touches Firestore. That is the only way to look at the
   registry: the real screen is behind a Google sign-in and then the Master Vault password. */
/* Tiers on purpose: the delivery rule is "tier 4 and above", so the fixture has to contain someone
   ABOVE the line and someone below it, or the Orang list would look right while the check was
   wrong in either direction. Adi (T4) and Rina (T3) must appear; Budi and Cahyo must not. */
const LAB_MOTORISTS = [
  { id: 'm1', name: 'Adi Nugroho', location: 'BANDUNG', userRole: 'FLEET_CAPTAIN' },
  { id: 'm2', name: 'Budi Santoso', location: 'MUNTILAN', userRole: 'FIELD_OPERATIVE' },
  { id: 'm3', name: 'Cahyo Putra', location: 'SEMARANG', userRole: 'ROOKIE' },
  { id: 'm4', name: 'Rina Wijaya', location: 'SEMARANG', userRole: 'AREA_ADMIN' },
];
const LAB_PROCUREMENTS = [
  { id: 'p1', poNumber: 'SJ-185108', date: '2026-08-27', supplierName: 'Pabrik Kudus', destination: 'Gudang Pusat (Master Vault)', items: [] },
  { id: 'p2', poNumber: 'SJ-185077', date: '2026-08-21', supplierName: 'Pabrik Malang', destination: 'Gudang Pusat (Master Vault)', items: [] },
];

function PlacesLab() {
  return (
    <div className="biohazard-content h-screen p-4 bg-panel">
      <style>{SHELL_RULE}</style>
      <RestockVaultView
        inventory={LAB_PRODUCTS} procurements={LAB_PROCUREMENTS} motorists={LAB_MOTORISTS} branchStockMap={{}}
        db={null} storage={null} appId="lab" user={null} isAdmin userRole="DEVELOPER"
        appSettings={{ companyName: 'KPM INVENTORY' }} masterUserId="lab"
      />
    </div>
  );
}

/* 🔴 ?gudang MOUNTS THE REAL BRANCH WAREHOUSE SCREEN — the half of `BranchWarehouseManager` a
   BRANCH admin sees, which is the half that was still in the old visual language. `isAdmin={false}`
   is the whole switch: the component reads `isAreaAdmin = !isAdmin`.

   Its listener returns early without a masterUserId, so a null database would pin it on "Loading
   Logistics Logs..." forever. tools/lab-firestore-stub.js is aliased over firebase/firestore for
   this build and feeds the fixtures below through the real onSnapshot. */
/* Two of these share a four-character prefix on purpose. `Cello Green 16` and `Cello Merah 12` are
   his own products, and an ellipsis at four characters deletes the only part that tells them
   apart — the exact fault he reported on 2026-08-17. If the wrap regressed, this is where it shows. */
const NOW = Math.floor(Date.now() / 1000);
/* damagedStock on two rows (2026-09-30): Fleet & Roster's warehouse box has a Quarantine view, and a branch's
   Quarantine is read from ITS OWN rows here - never the master product's number */
FIXTURES['branches/BANDUNG/inventory'] = [
  { id: 'p-cg16', name: 'Cello Green 16', stock: 420, damagedStock: 12 },
  { id: 'p-cm12', name: 'Cello Merah 12', stock: 168, damagedStock: 4 },
  { id: 'p-sig',  name: 'Sigaret Kretek Tangan Premium', stock: 54 },
  { id: 'p-djar', name: 'Djarum Coklat 12', stock: 0 },
];
/* The registry the desk now READS. `gudang` carries this branch's fixed address — the reorder form
   cannot type one any more — and `pabrik`/`orang` fill the read-only Data Induk tab. */
/* TWO PRODUCTS WITH DELIBERATELY DIFFERENT PACKING. One karton is 400 Bks for the first and 600
   for the second, so the intake desk's rates line can be seen reading each product's own numbers
   rather than a constant. A lab with one product could not tell those two cases apart. */
/* Sampling rows for ?shell&sampling (2026-09-19): three days, two places a day, a shop per note group —
   the fields SamplingFolderView reads (date › reason = the place › note = the shop; productName, qty,
   unit, sticksPerPack). A function of today so the newest folder is always this month. */
const labSamplings = (today) => [
  { id: 's1', date: today, reason: 'Pasar Baru', note: 'Warung Sumber Rejeki', productName: 'Cello Green 16', qty: 32, unit: 'Batang', sticksPerPack: 16 },
  { id: 's2', date: today, reason: 'Pasar Baru', note: 'Warung Sumber Rejeki', productName: 'Cello Merah 12', qty: 2, unit: 'Bks', sticksPerPack: 12 },
  { id: 's3', date: today, reason: 'Pasar Baru', note: 'Kios Maju Mundur', productName: 'Cello Green 16', qty: 16, unit: 'Batang', sticksPerPack: 16 },
  { id: 's4', date: today, reason: 'Dago', note: 'Toko Lancar', productName: 'Cello Filter 20', qty: 1, unit: 'Bks', sticksPerPack: 20 },
  { id: 's5', date: '2026-09-12', reason: 'Cibeunying', note: 'Grosir Jaya Abadi', productName: 'Cello Green 16', qty: 48, unit: 'Batang', sticksPerPack: 16 },
  { id: 's6', date: '2026-09-12', reason: 'Cibeunying', note: 'Grosir Jaya Abadi', productName: 'Cello Merah 12', qty: 3, unit: 'Bks', sticksPerPack: 12 },
  { id: 's7', date: '2026-08-28', reason: 'Dago', note: 'Warung Bu Sri Rahayu Sejahtera Abadi', productName: 'Cello Filter 20', qty: 20, unit: 'Batang', sticksPerPack: 20 },
];


/* EOD reports for ?shell&eod&admin (2026-09-20): the boss's HQ Verification panel reads them — two PENDING (a cash &
   stock night that matches, a pita cukai return with two lost stamps paid) and three VERIFIED for the History Log
   (MUNTILAN › Budi Santoso › this month). The fields are the ones EODReconciliationView.jsx:855-1045 reads. */
/* `?shell&eod&verified` — the salesman's tonight, both reports VERIFIED by the boss an hour ago, with the
   dayXP + xpBreakdown handleVerifyEOD writes (App.jsx: `status: 'VERIFIED', dayXP, xpBreakdown`) — the Shift Closed
   block then counts the XP up (EODReconciliationView.jsx XpGain, stage B 2026-09-21). */
const labVerifiedTonight = () => {
  const now = Math.floor(Date.now() / 1000);
  return [
    { id: 'v1', status: 'VERIFIED', reportType: 'CASH_STOCK', agentId: 'm2', agentName: 'Budi Santoso', timestamp: { seconds: now - 3600 }, verifiedAt: { seconds: now - 600 },
      expectedCash: 1250000, cash: 1250000, expectedTransfer: 425000, transfer: 425000, remainingStock: [], storesServed: 3,
      dayXP: 51, xpBreakdown: { collected: 33, closed: 10, cukai: 5, route: 3 } },
    { id: 'v2', status: 'VERIFIED', reportType: 'CUKAI', agentId: 'm2', agentName: 'Budi Santoso', timestamp: { seconds: now - 3000 }, verifiedAt: { seconds: now - 600 }, cukaiReturned: 40, cukaiPaid: 0, cukaiFine: 0 },
  ];
};
const labEodReports = (today) => {
  const now = Math.floor(Date.now() / 1000);
  const stock = [{ productId: 'p-cg16', name: 'Cello Green 16', qty: 12, unit: 'Bks' }, { productId: 'p-djar', name: 'Djarum Coklat 12', qty: 5, unit: 'Bks' }];
  return [
    { id: 'e1', status: 'PENDING', reportType: 'CASH_STOCK', agentId: 'm2', agentName: 'Budi Santoso', timestamp: { seconds: now - 3600 }, countStatus: 'CLEAN',
      expectedCash: 1250000, cash: 1250000, expectedTransfer: 425000, transfer: 425000, expectedStock: stock, remainingStock: stock,
      damagedStockToReturn: [{ ticketId: 'd1', name: 'Cello Green 16', reason: 'Basah', qty: 2, unit: 'Bks' }], deployedSamples: [] },
    { id: 'e2', status: 'PENDING', reportType: 'CUKAI', agentId: 'm2', agentName: 'Budi Santoso', timestamp: { seconds: now - 3000 },
      cukaiReturned: 40, cukaiPaid: 2, cukaiFine: 30000, deployedSamples: [{ productName: 'Cello Green 16', qty: 1.5, sticksPerPack: 16 }] },
    /* 2026-09-26: a bounty PAYMENT tonight (its own plate on the card) and last night still waiting with its stock
       line sent back (the LATE EOD panel) */
    { id: 'e7', status: 'PENDING', reportType: 'BOUNTY', agentId: 'm2', agentName: 'Budi Santoso', timestamp: { seconds: now - 1800 },
      cash: 39000, transfer: 0, cukai: 0, penaltyKeys: ['PENALTY_EOD_lab0_GOODS_p-cg16'] },
    { id: 'e6', status: 'PENDING', reportType: 'CASH_STOCK', agentId: 'm2', agentName: 'Budi Santoso', timestamp: { seconds: now - 86400 - 3600 }, countStatus: 'DISPUTED',
      expectedCash: 640000, cash: 640000, expectedTransfer: 0, transfer: 0, rejected: { stock: '1 Bks kurang' },
      expectedStock: stock, remainingStock: [{ ...stock[0], qty: 11 }, stock[1]], deployedSamples: [] },
    { id: 'e3', status: 'VERIFIED', reportType: 'CASH_STOCK', agentId: 'm2', agentName: 'Budi Santoso', timestamp: { seconds: now - 86400 }, verifiedAt: { seconds: now - 80000 }, expectedCash: 980000, cash: 980000, expectedTransfer: 0, transfer: 0, remainingStock: stock },
    { id: 'e4', status: 'VERIFIED', reportType: 'CUKAI', agentId: 'm2', agentName: 'Budi Santoso', timestamp: { seconds: now - 86400 }, verifiedAt: { seconds: now - 79000 }, cukaiReturned: 36, cukaiPaid: 0, cukaiFine: 0 },
    { id: 'e5', status: 'VERIFIED', reportType: 'CASH_STOCK', agentId: 'm2', agentName: 'Budi Santoso', timestamp: { seconds: now - 172800 }, verifiedAt: { seconds: now - 170000 }, expectedCash: 1410000, cash: 1400000, expectedTransfer: 0, transfer: 0, remainingStock: stock },
  ];
};

const LAB_PRODUCTS = [
  { id: 'p-cg16', name: 'Cello Green 16', sku: 'CG16', stock: 4200, priceDistributor: 8900,
    packsPerSlop: 10, slopsPerBal: 10, balsPerCarton: 4 },
  { id: 'p-djar', name: 'Djarum Coklat 12', sku: 'DJ12', stock: 1800, priceDistributor: 12500,
    packsPerSlop: 12, slopsPerBal: 5,  balsPerCarton: 10 },
];

FIXTURES['places'] = [
  { id: 'bandung', name: 'BANDUNG', kind: 'gudang', address: 'Jl. Soekarno Hatta No. 412, Kec. Batununggal, Kota Bandung, Jawa Barat 40266' },
  { id: 'pabrik-kudus', name: 'Pabrik Kudus', kind: 'pabrik', address: 'Jl. Raya Kudus-Pati KM 8, Kudus, Jawa Tengah' },
  { id: 'pabrik-malang', name: 'Pabrik Malang', kind: 'pabrik', address: '' },
  { id: 'adi-nugroho', name: 'Adi Nugroho', kind: 'orang', address: '' },
];
FIXTURES['stock_requests'] = [
  { id: 'REQ-185204', branch: 'BANDUNG', status: 'IN_TRANSIT', timestamp: { seconds: NOW - 86400 * 2 },
    requestedByName: 'Rina Wijaya', courier: 'JNE Trucking', trackingNo: 'JT-8841-2290',
    senderName: 'Adi Nugroho',
    requestedItems: [{ productId: 'p-cg16', name: 'Cello Green 16', qty: 200 },
                     { productId: 'p-cm12', name: 'Cello Merah 12', qty: 120 }],
    workflowTimeline: [
      { status: 'PENDING', msg: 'Permintaan dikirim ke HQ.', time: (NOW - 86400 * 3) * 1000 },
      { status: 'IN_TRANSIT', msg: 'Barang keluar dari Gudang Pusat (Master Vault).', time: (NOW - 86400 * 2) * 1000 },
    ] },
  /* The scanned twin of REQ-185204: same status, but `arrivedAt` is set. The gate is only
     visible with both on screen — one asks to be scanned, one offers the count. */
  { id: 'REQ-185211', branch: 'BANDUNG', status: 'IN_TRANSIT', timestamp: { seconds: NOW - 86400 * 1 },
    requestedByName: 'Rina Wijaya', courier: 'Armada Sendiri', trackingNo: 'INT-0114',
    senderName: 'Adi Nugroho',
    arrivedAt: { seconds: NOW - 3600 * 2 }, arrivedBy: 'Gudang Bandung',
    requestedItems: [{ productId: 'p-djar', name: 'Djarum Coklat 12', qty: 80 }],
    workflowTimeline: [
      { status: 'PENDING', msg: 'Permintaan dikirim ke HQ.', time: (NOW - 86400 * 2) * 1000 },
      { status: 'IN_TRANSIT', msg: 'Barang keluar dari Gudang Pusat (Master Vault).', time: (NOW - 86400 * 1) * 1000 },
      { status: 'ARRIVED', msg: 'Barang sampai di gudang BANDUNG, di-scan oleh Gudang Bandung. Belum dihitung.', time: (NOW - 3600 * 2) * 1000 },
    ] },
  { id: 'REQ-185160', branch: 'BANDUNG', status: 'DELIVERED', timestamp: { seconds: NOW - 86400 * 9 },
    requestedByName: 'Rina Wijaya', courier: 'Armada Sendiri', trackingNo: 'INT-0091',
    senderName: 'Adi Nugroho', receiptVariance: true,
    fulfilledItems: [{ productId: 'p-sig', name: 'Sigaret Kretek Tangan Premium', qty: 60 }],
    receivedItems: [{ productId: 'p-sig', name: 'Sigaret Kretek Tangan Premium', shipped: 60, counted: 54, diff: -6, damaged: 2 }],
    workflowTimeline: [
      { status: 'PENDING', msg: 'Permintaan dikirim ke HQ.', time: (NOW - 86400 * 11) * 1000 },
      { status: 'IN_TRANSIT', msg: 'Barang keluar dari Gudang Pusat (Master Vault).', time: (NOW - 86400 * 9) * 1000 },
      { status: 'DISPUTED', msg: 'Hitungan gudang 54 dari 60 dikirim. Selisih dilaporkan ke HQ.', time: (NOW - 86400 * 8) * 1000 },
    ] },
  { id: 'REQ-185233', branch: 'BANDUNG', status: 'PENDING', timestamp: { seconds: NOW - 3600 * 5 },
    requestedByName: 'Rina Wijaya',
    requestedItems: [{ productId: 'p-djar', name: 'Djarum Coklat 12', qty: 300 }],
    workflowTimeline: [{ status: 'PENDING', msg: 'Permintaan dikirim ke HQ.', time: (NOW - 3600 * 5) * 1000 }] },
];

function GudangLab() {
  return (
    <div className="biohazard-content min-h-screen p-4 bg-ground">
      <style>{SHELL_RULE}</style>
      <BranchWarehouseManager
        db={{}} storage={null} appId="lab" user={{ displayName: 'Rina Wijaya', email: 'rina@kpm.id' }}
        userRole={q.get('tier') || 'FLEET_CAPTAIN'} userLocation="BANDUNG" isAdmin={false} masterUserId="lab"
        globalInventory={FIXTURES['branches/BANDUNG/inventory']}
        triggerCapy={() => {}} logAudit={() => {}}
        appSettings={{ companyName: 'KPM INVENTORY', adminDisplayName: 'Rina Wijaya' }}
      />
    </div>
  );
}

/* 🔴 ?label MOUNTS THE PRINTED SHIPMENT LABEL, and ?scan the arrival scanner. Neither can be
   reached in the app without a real outbound shipment and a branch login, and the label carries the
   one thing on this project that cannot be checked by reading it: a barcode either scans or it does
   not. `?label&probe` measures the symbol's module structure — see the probe block below. */
/* Four shops a T5 salesman would see: two with a pin (the GPS gate has something to measure
   against), one without, one with an open IOU so the manifest has that banner to show. */
const LAB_CUSTOMERS = [
  { id: 'c-berkah', name: 'Toko Berkah Jaya', address: 'Jl. Merdeka No. 12, Bandung', latitude: -6.9175, longitude: 107.6191, priceTier: 'Retail' },
  { id: 'c-sumber', name: 'Warung Sumber Rejeki', address: 'Jl. Pasar Baru 4, Bandung', latitude: -6.9200, longitude: 107.6100, priceTier: 'Ecer' },
  { id: 'c-maju', name: 'Kios Maju Mundur', address: '', priceTier: 'Retail' },
  { id: 'c-lancar', name: 'Toko Lancar', address: 'Jl. Cihampelas 88', latitude: -6.8900, longitude: 107.6050, priceTier: 'Grosir', pendingIOUs: [{ id: 'iou-1', amount: 250000 }] },
];

const LAB_SHIPMENT = {
  id: 'REQ_1756700000000',
  branch: 'BANDUNG',
  status: 'IN_TRANSIT',
  timestamp: { seconds: 1756700000 },
  fulfilledItems: [
    { productId: 'p-cg16', name: 'Cello Green 16', qty: 200 },
    { productId: 'p-cm12', name: 'Cello Merah 12', qty: 120 },
  ],
};

/* ?nota-scan SHOWS THE NOTA SCAN on a synthetic photo: a tilted receipt on a grey table, a
   shadow across it, a lamp's hot spot, printed and handwritten lines, noise. Left the "photo",
   right the same pixels through the REAL helpers.scanPixels — the function the intake form calls.
   `&src=<image url>` scans a real photo instead. The one question it answers is whether the
   scan reads better than the photo, which a node check on synthetic pixels cannot say. */
/* ?photo MOUNTS THE PHOTO BOX (components/PhotoField.jsx) in its states, at a phone width: empty,
   a goods photo just picked (the preview), and a nota picked with scan={true} (the SCAN preview,
   after "Memindai nota…"). The file is real — the synthetic nota drawn flat on a canvas, then
   pushed through helpers.homography onto a dark table as a TILTED, PERSPECTIVE quad (text lines
   at ~17°, past deskewAngle's ±15°; the left edge shorter than the right), turned into a Blob — so the box runs the same code the intake form runs,
   and the scan it shows proves findPaper + warpQuad squared the sheet. `&busy` freezes the
   scanning state so the sweeping line can be looked at. `&edit` presses SESUAIKAN once the scan
   is up, so the corner sheet can be looked at over the photo. */
function PhotoLab() {
  const [goods, setGoods] = React.useState(null);
  const [nota, setNota] = React.useState(null);
  React.useEffect(() => {
    const flat = document.createElement('canvas'); flat.width = 460; flat.height = 400;
    const fc = flat.getContext('2d');
    fc.fillStyle = '#d9d0bc'; fc.fillRect(0, 0, 460, 400);
    fc.fillStyle = '#2a2622'; fc.font = 'bold 22px monospace'; fc.fillText('NOTA  PABRIK KUDUS', 30, 50);
    fc.font = '15px monospace';
    ['SJ-403638        15/09/2026', 'Cello Green 16   40 bal   Rp 356.000', 'Djarum Coklat 12 12 bal   Rp 150.000', 'TOTAL                     Rp 506.000']
      .forEach((t, i) => fc.fillText(t, 30, 100 + i * 34));
    const src = fc.getImageData(0, 0, 460, 400).data;
    /* the sheet lands on the table at these four corners (tl, tr, br, bl) */
    const H = homography([[210, 40], [560, 150], [430, 450], [70, 300]]);
    const c = document.createElement('canvas'); c.width = 640; c.height = 480;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#5b544c'; ctx.fillRect(0, 0, 640, 480);
    const shot = ctx.getImageData(0, 0, 640, 480), d = shot.data;
    for (let py = 0; py < 400; py++) for (let px = 0; px < 460; px++) {
      const s = (py * 460 + px) * 4;
      for (const [su, sv] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const u = (px + su) / 460, v = (py + sv) / 400, den = H[6] * u + H[7] * v + 1;
        const x = Math.round((H[0] * u + H[1] * v + H[2]) / den), y = Math.round((H[3] * u + H[4] * v + H[5]) / den);
        if (x < 0 || y < 0 || x >= 640 || y >= 480) continue;
        const i = (y * 640 + x) * 4; d[i] = src[s]; d[i + 1] = src[s + 1]; d[i + 2] = src[s + 2];
      }
    }
    ctx.putImageData(shot, 0, 0);
    c.toBlob((blob) => {
      const f = new File([blob], 'IMG_4021.jpg', { type: 'image/jpeg' });
      setGoods(f);
      if (!q.has('busy')) setNota(f);
    }, 'image/jpeg', 0.9);
  }, []);
  React.useEffect(() => {
    if (!q.has('edit')) return undefined;
    const t = setInterval(() => { const b = document.querySelector('button[data-edit]'); if (b) { b.click(); clearInterval(t); } }, 50);
    return () => clearInterval(t);
  }, []);
  /* &busy: a nota "file" whose scan never finishes — scanNotaToBase64 rejects on a non-image */
  const stuck = React.useMemo(() => (q.has('busy') ? new File([new Blob(['x'])], 'nota.jpg', { type: 'image/jpeg' }) : null), []);
  return (
    <div className="biohazard-content p-4 bg-panel min-h-screen text-ink" style={{ maxWidth: 375 }}>
      <div className="grid grid-cols-1 gap-3">
        <PhotoField label="Bukti foto barang" file={null} onFile={() => {}} />
        <PhotoField label="Bukti foto barang" file={goods} onFile={(f) => setGoods(f)} />
        <PhotoField label="Nota / faktur" file={stuck || nota} scan onFile={(f) => setNota(f)} pickLabel="ambil / pilih nota" />
      </div>
    </div>
  );
}

function NotaScanLab() {
  const before = React.useRef(null), after = React.useRef(null);
  const [stats, setStats] = React.useState('');
  React.useEffect(() => {
    const W = 640, H = 480;
    const draw = (ctx, img) => {
      if (img) { ctx.drawImage(img, 0, 0, W, H); return; }
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#6b6259'); g.addColorStop(1, '#3e3833');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.06);
      const p = ctx.createLinearGradient(-230, 0, 230, 0); p.addColorStop(0, '#8f877a'); p.addColorStop(0.55, '#cfc6b4'); p.addColorStop(1, '#e8e0cc');
      ctx.fillStyle = p; ctx.fillRect(-230, -200, 460, 400);
      const hot = ctx.createRadialGradient(120, -120, 0, 120, -120, 140); hot.addColorStop(0, 'rgba(255,255,255,.55)'); hot.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hot; ctx.fillRect(-230, -200, 460, 400);
      ctx.fillStyle = '#2a2622'; ctx.font = 'bold 22px monospace'; ctx.fillText('NOTA  PABRIK KUDUS', -200, -150);
      ctx.font = '15px monospace';
      ['SJ-403638        15/09/2026', 'Cello Green 16   40 bal   Rp 356.000',
       'Djarum Coklat 12 12 bal   Rp 150.000', 'Ongkos kirim              Rp  75.000',
       'TOTAL                     Rp 581.000'].forEach((t, i) => ctx.fillText(t, -200, -100 + i * 34));
      ctx.strokeStyle = '#1f3a8a'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(-120, 120); ctx.bezierCurveTo(-80, 80, -40, 160, 0, 120); ctx.bezierCurveTo(30, 95, 60, 150, 100, 110); ctx.stroke();
      ctx.font = '13px sans-serif'; ctx.fillStyle = '#3b3630'; ctx.fillText('ttd penerima', -120, 160);
      ctx.restore();
      const id = ctx.getImageData(0, 0, W, H), d = id.data;
      for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
      ctx.putImageData(id, 0, 0);
    };
    const run = (img) => {
      const b = before.current.getContext('2d');
      draw(b, img);
      /* the REAL intake path: the photo as a Blob → scanNotaToBase64 (scan, then level) → the
         JPEG the app would store. What the right-hand side shows is what Firebase would hold. */
      before.current.toBlob((blob) => {
        const t0 = performance.now();
        scanNotaToBase64(blob).then((dataUrl) => {
          const ms = Math.round(performance.now() - t0);
          after.current.src = dataUrl;
          const photo = before.current.toDataURL('image/jpeg', 0.6).length, scan = dataUrl.length;
          setStats(`${W}x${H}, ${ms} ms · JPEG bytes: photo ${photo.toLocaleString()} → scan ${scan.toLocaleString()} (${Math.round(100 - scan / photo * 100)}% smaller)`);
          window.__notaScan = { ms, photo, scan };
        });
      }, 'image/jpeg', 0.9);
    };
    const src = q.get('src');
    if (src) { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => run(img); img.src = src; }
    else run(null);
  }, []);
  return (
    <div className="p-4 bg-panel min-h-screen text-ink font-mono text-[12px]">
      <div className="flex gap-4 flex-wrap">
        <div><div className="mb-1 uppercase tracking-widest text-ink-muted">foto (sekarang)</div><canvas ref={before} width={640} height={480} /></div>
        <div><div className="mb-1 uppercase tracking-widest text-ink-muted">scan (helpers.scanNotaToBase64 — what gets saved)</div><img ref={after} width={640} height={480} alt="" /></div>
      </div>
      <div className="mt-3 text-ink-muted">{stats}</div>
    </div>
  );
}

/* ?toast MOUNTS THE TWO SINGLETON HOSTS in the order main.jsx mounts them — page, ConfirmHost,
   ToastHost, as siblings — with a sticky alarm strip up and a confirm dialog open on top of it.
   The one question it answers is which layer paints over the other, which no check can see. */
function ToastLab() {
  React.useEffect(() => {
    notify('⚠️ BOSS! Sampoerna Mild is critically low (3 Bks left). Restock needed!');
    const t = setTimeout(() => { confirmAction('Delete Sampoerna Mild from the catalogue? This cannot be undone.'); }, 120);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <div className="p-6 font-mono text-[var(--ink)]">
        <h1 className="text-lg font-bold uppercase tracking-widest">Master Vault</h1>
        <p className="text-sm opacity-70">page content under both layers</p>
      </div>
      <ConfirmHost />
      <ToastHost />
    </>
  );
}

/* 🔴 ?shell MOUNTS THE REAL APP SHELL — the top bar (book, SYNCED, switch, bell, clock) and the
   menu ribbon — so it can be laid out at a PHONE width and measured. The one question it answers
   is whether that row fits in 375px: the right cluster is `shrink-0` and the left one has no
   `min-w-0`, so nothing but a laid-out page can say where the bell ends up. The sync chip is
   copied verbatim from the call site in App.jsx (`syncIndicator=`); a harness that invents its
   markup measures the harness. `../config/firebase` is aliased to lab-firebase-stub.js here. */
/* The salesman's van for ?shell&agent. The screen finds its motorist by EMAIL first and only
   then by agentProfileId (AgentInventoryView.jsx:53-58); LAB_MOTORISTS carry no email, so the
   lookup falls through to `agentProfileId="m2"` — Budi, the FIELD_OPERATIVE. It then listens to
   ONE document, `artifacts/lab/users/lab/motorists/m2`, and reads `activeCanvas` off it; the stub
   serves this object for that path. Mixed units so the Bks conversion has something to convert. */
FIXTURES['motorists/m2'] = {
  name: 'Budi Santoso', location: 'MUNTILAN',
  activeCanvas: [
    /* the row prints item.name, not the product's — the load-to-agent write copies it */
    { productId: 'p-cg16', name: 'Cello Green 16', qty: 3, unit: 'Bal' },
    { productId: 'p-djar', name: 'Djarum Coklat 12', qty: 12, unit: 'Slop' },
    { productId: 'p-gg12', name: 'Gudang Garam Surya 12', qty: 1, unit: 'Karton' },
    { productId: 'p-smp16', name: 'Sampoerna Mild 16', qty: 40, unit: 'Bks' },
  ],
  cukaiDebts: { 'p-cg16': 120, 'p-djar': 35, 'PENALTY_EOD_lab0_GOODS_p-cg16': 39000 },   /* + the fine tonight's bounty payment clears (2026-09-26) */
  cukaiDebtNotes: { 'PENALTY_EOD_lab0_GOODS_p-cg16': { label: 'Cello Green 16 5 Bks @ Retail', date: '2026-09-24' } },
};
/* two more wares for the van only — LAB_PRODUCTS is shared with the terminal and the vault desk,
   whose boards were measured on its two rows and stay as they were */
const LAB_VAN_EXTRA = [
  { id: 'p-gg12', name: 'Gudang Garam Surya 12', sku: 'GG12', stock: 900, priceDistributor: 21000,
    packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4 },
  { id: 'p-smp16', name: 'Sampoerna Mild 16', sku: 'SM16', stock: 600, priceDistributor: 27500,
    packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4 },
];
/* a shop's Competitor Intelligence rows (CustomerManager detail view, `…/customers/{id}/benchmarks`)
   — without them the 600 px table is an empty header and a phone frame proves nothing */
FIXTURES['benchmarks'] = [
  { id: 'b1', brand: 'Gudang Garam', product: 'Surya 12', price: 21500, volume: 'High Sales', notes: 'Promo beli 10 gratis 1' },
  { id: 'b2', brand: 'Sampoerna', product: 'Mild 16', price: 29000, volume: 'Medium', notes: '' },
  { id: 'b3', brand: 'Djarum', product: 'Super 12', price: 22000, volume: 'Low Sales', notes: 'Stok sering kosong' },
];
const LAB_TODAY = getLocalDayKey();
/* the boss's Stock Opname side (`?shell&opname&admin`): one count waiting for HQ so the HQ AUDITS
   tab has a row and a badge, one resolved quarantine log so the vault's history has a line */
FIXTURES['pending_audits'] = [
  { id: 'aud1', status: 'PENDING_HQ_APPROVAL', branchLocation: 'BANDUNG', agentName: 'Budi Santoso', auditType: 'BRANCH',
    timestamp: { seconds: Math.floor(Date.now() / 1000) - 3600 },
    items: [
      { productId: 'p-cg16', name: 'Cello Green 16', expectedStock: 420, expectedDamagedStock: 0, goodCount: 415, damagedCount: 3, totalFound: 418, variance: -2, varianceReason: 'Salah hitung', countPasses: [{ good: 415, damaged: 3 }, { good: 415, damaged: 3 }], countedTwice: true, threeWayDisagreement: false, damageKinds: [], damagedPhotoUrl: null },
      { productId: 'p-cm12', name: 'Cello Merah 12', expectedStock: 168, expectedDamagedStock: 0, goodCount: 168, damagedCount: 0, totalFound: 168, variance: 0, varianceReason: null, countPasses: [{ good: 168, damaged: 0 }], countedTwice: false, threeWayDisagreement: false, damageKinds: [], damagedPhotoUrl: null },
    ] },
];
FIXTURES['quarantine_logs'] = [
  { id: 'ql1', method: 'RTV', facility: 'BANDUNG', productName: 'Djarum Coklat 12', qty: 12, totalValueHpp: 150000,
    details: 'SJR-2026-014', resolvedBy: 'Lab', timestamp: { seconds: Math.floor(Date.now() / 1000) - 86400 } },
];
/* Receivables fixture (2026-09-22): the logicFixes PLACEMENT + AUDIT pair on a real lab product and
   a real lab shop. 20 packs placed on Titip at 27.500; the audit pays 14, hands 2 back damaged,
   leaves 4 on the shelf. The shop owes the 4 packs: 110.000. */
const LAB_PIUTANG_TXNS = [
  { id: 'pt1', agentId: 'm2', date: '2026-09-02', type: 'SALE', paymentType: 'Titip', total: 550000, customerName: 'Toko Berkah Jaya',
    items: [{ productId: 'p-cg16', name: 'Cello Green 16', qty: 20, unit: 'Bks', calculatedPrice: 27500, priceTier: 'Retail' }],
    timestamp: { seconds: Math.floor(new Date('2026-09-02T09:00:00+07:00').getTime() / 1000) } },
  { id: 'pt2', agentId: 'm2', date: '2026-09-20', type: 'CONSIGNMENT_PAYMENT', paymentType: 'Cash', customerName: 'Toko Berkah Jaya',
    itemsPaid:      [{ productId: 'p-cg16', name: 'Cello Green 16', qty: 14, unit: 'Bks', calculatedPrice: 27500, priceTier: 'Retail' }],
    itemsRemaining: [{ productId: 'p-cg16', name: 'Cello Green 16', qty:  4, unit: 'Bks', calculatedPrice: 27500, priceTier: 'Retail' }],
    itemsReturned:  [{ productId: 'p-cg16', name: 'Cello Green 16', qty:  2, unit: 'Bks', calculatedPrice: 27500, priceTier: 'Retail' }],
    amountPaid: 385000, returnTotal: 55000, total: 385000,
    timestamp: { seconds: Math.floor(new Date('2026-09-20T18:00:00+07:00').getTime() / 1000) } },
];
/* the engine's return loop reads the product first (getDoc); the stub answers from this */
FIXTURES['products/p-cg16'] = { ...LAB_PRODUCTS[0] };
FIXTURES['products/p-djar'] = { ...LAB_PRODUCTS[1] };
/* Fleet & Roster (`?shell&fleet`, 2026-09-22) — the REGIONAL ADMIN's roster. The screen is
   `isAreaAdmin = !isGlobalAdmin`, so below ADMIN it ignores the `motorists` prop entirely and
   listens to `artifacts/lab/users/lab/motorists` itself; these rows are what that listener serves,
   and the roster then filters to the viewer's own location (BANDUNG). Three of the four are in
   BANDUNG so the list is a real team; Rina (SEMARANG) is there to prove the region filter hides
   her. `activeCanvas` gives two of them a loaded van, so the loading dock has an asset ledger and
   the Initial / Sold / Current boxes have figures; `email` is how the screen finds the viewer's own
   record (FleetCanvasManager.jsx `myProfile`). */
const LAB_FLEET = [
  { id: 'f-ra', name: 'Rizky Aditama', email: 'rizky@kpm.example', location: 'BANDUNG', userRole: 'AREA_ADMIN',
    role: 'Office', vehicle: 'TOYOTA AVANZA D 1234 AB', allowedPayments: ['Cash', 'Transfer'], allowedTiers: ['Retail', 'Grosir'] },
  { id: 'f-b1', name: 'Budi Santoso', email: 'budi@kpm.example', location: 'BANDUNG', userRole: 'FIELD_OPERATIVE',
    role: 'Canvas', vehicle: 'HONDA VARIO D 5521 XY', allowedPayments: ['Cash', 'Titip'], allowedTiers: ['Retail', 'Ecer'],
    activeCanvas: [
      { productId: 'p-cg16', name: 'Cello Green 16', qty: 3, unit: 'Bal' },
      { productId: 'p-djar', name: 'Djarum Coklat 12', qty: 12, unit: 'Slop' },
      { productId: 'p-smp16', name: 'Sampoerna Mild 16', qty: 40, unit: 'Bks' },
    ],
    /* round 5: the van chest's BOUNTY tab - two noted fines from one night and an old quarantine charge */
    cukaiDebts: { PENALTY_EOD_lab1_CASH: 25000, 'PENALTY_EOD_lab1_GOODS_p-cg16': 55000, PENALTY_1758600000000: 40000, 'p-cg16': 12 },
    cukaiDebtNotes: { PENALTY_EOD_lab1_CASH: { label: 'Cash short', date: '2026-09-23' },
      'PENALTY_EOD_lab1_GOODS_p-cg16': { label: 'Cello Green 16 2 Bks @ Retail', date: '2026-09-23' } } },
  { id: 'f-d1', name: 'Dedi Kurniawan', email: 'dedi@kpm.example', location: 'BANDUNG', userRole: 'FIELD_OPERATIVE',
    role: 'Canvas', vehicle: 'HONDA BEAT D 9080 KL', allowedPayments: ['Cash'], allowedTiers: ['Ecer'],
    activeCanvas: [{ productId: 'p-gg12', name: 'Gudang Garam Surya 12', qty: 1, unit: 'Karton' }] },
  { id: 'f-r1', name: 'Rina Wijaya', email: 'rina@kpm.example', location: 'SEMARANG', userRole: 'FIELD_OPERATIVE',
    role: 'Canvas', vehicle: 'HONDA BEAT H 2211 CD', allowedPayments: ['Cash'], allowedTiers: ['Ecer'] },
];
/* Journey Plan reads the roster with getDocs(collection motorists) */
FIXTURES['motorists'] = [...LAB_MOTORISTS.map((m) => ({ ...m })), ...LAB_FLEET];
/* round 5: what Budi left at shops on titip (the van chest's TITIP tab) - one part-paid, one Dedi handed to him,
   one settled (so it stays off the tab). They reach the screen as props, like App passes them, not through a listener. */
const labTs = (d) => ({ seconds: Math.floor(new Date(d + 'T10:00:00+07:00').getTime() / 1000) });
const LAB_FLEET_TITIP = [
  { id: 'ft1', agentId: 'f-b1', date: '2026-09-21', type: 'SALE', paymentType: 'Titip', total: 550000, customerName: 'Toko Berkah Jaya',
    items: [{ productId: 'p-cg16', name: 'Cello Green 16', qty: 2, unit: 'Slop', priceTier: 'Retail' }], timestamp: labTs('2026-09-21') },
  { id: 'ft2', agentId: 'f-b1', date: '2026-09-24', type: 'CONSIGNMENT_PAYMENT', paymentType: 'Cash', customerName: 'Toko Berkah Jaya', amountPaid: 220000, total: 220000,
    itemsPaid: [{ productId: 'p-cg16', name: 'Cello Green 16', qty: 8, unit: 'Bks', priceTier: 'Retail' }], timestamp: labTs('2026-09-24') },
  { id: 'ft3', agentId: 'f-d1', date: '2026-09-22', type: 'SALE', paymentType: 'Titip', total: 180000, customerName: 'Kios Maju Mundur',
    items: [{ productId: 'p-djar', name: 'Djarum Coklat 12', qty: 12, unit: 'Bks', priceTier: 'Retail' }], timestamp: labTs('2026-09-22') },
  { id: 'ft4', agentId: 'f-b1', date: '2026-09-22', type: 'SALE', paymentType: 'Titip', total: 90000, customerName: 'Toko Lancar',
    items: [{ productId: 'p-cg16', name: 'Cello Green 16', qty: 4, unit: 'Bks', priceTier: 'Retail' }], timestamp: labTs('2026-09-22') },
  { id: 'ft5', agentId: 'f-b1', date: '2026-09-25', type: 'CONSIGNMENT_PAYMENT', paymentType: 'Cash', customerName: 'Toko Lancar', amountPaid: 90000, total: 90000,
    itemsPaid: [{ productId: 'p-cg16', name: 'Cello Green 16', qty: 4, unit: 'Bks', priceTier: 'Retail' }], timestamp: labTs('2026-09-25') },
];
const LAB_FLEET_CUSTOMERS = LAB_CUSTOMERS.map((c) => (c.id === 'c-maju' ? { ...c, ownerAgentId: 'f-b1', handoffs: [{ fromId: 'f-d1', toId: 'f-b1' }] } : c));

function LabPiutang({ q }) {
  const engine = useTransactionEngine({
    db: {}, appId: 'lab', userId: 'lab', userRole: q.has('admin') ? 'ADMIN' : 'FIELD_OPERATIVE', agentProfileId: q.has('novan') ? null : 'm2', adminSalesMode: false,
    logAudit: () => {}, triggerCapy: (m) => { window.__labCapy = m; }, setCart: () => {}, customers: LAB_CUSTOMERS,
    user: { uid: 'lab-t5', displayName: 'Budi Santoso', email: 'lab@example.com' }, appSettings: {},
  });
  window.__labAudit = engine.handleConsignmentPayment;
  window.__labReturn = engine.handleConsignmentReturn;
  return (
    <ConsignmentFinanceView
      transactions={LAB_PIUTANG_TXNS} customers={LAB_CUSTOMERS} focusStore={null} onFocusStoreHandled={() => {}}
      inventory={LAB_PRODUCTS.map((p) => ({ ...p, priceRetail: Math.round(p.priceDistributor * 1.15), priceEcer: Math.round(p.priceDistributor * 1.25), priceGrosir: Math.round(p.priceDistributor * 1.08) }))}
      onPayment={engine.handleConsignmentPayment} onReturn={engine.handleConsignmentReturn}
      onAddGoods={() => {}} onDeleteConsignment={() => {}} isAdmin={q.has('admin')}
      user={{ uid: 'lab-t5', displayName: 'Budi Santoso', email: 'lab@example.com' }}
      agentProfileId="m2" motorists={LAB_MOTORISTS} transferRequests={[]} onShowStoreOnJourney={() => {}}
    />
  );
}

const LAB_AGENT_TXNS = [
  { id: 'tx1', agentId: 'm2', date: LAB_TODAY, type: 'SALE', total: 1850000, customerName: 'Toko Sumber Rejeki' },
  /* a titip sale with its lines, so the agent's sale row has something to open to (2026-09-26) */
  { id: 'tx2', agentId: 'm2', date: LAB_TODAY, type: 'SALE', paymentType: 'Titip', total: 640000, customerName: 'Warung Bu Sri',
    items: [{ productId: 'p-cg16', qty: 20, unit: 'Bks', calculatedPrice: 27500, priceTier: 'Retail' }, { productId: 'p-djar', qty: 1, unit: 'Slop', calculatedPrice: 90000, priceTier: 'Grosir' }] },
  { id: 'tx3', agentId: 'm2', date: LAB_TODAY, type: 'RETUR', total: -89000, customerName: 'Toko Sumber Rejeki',
    forensicData: { quarantineCargo: [{ itemName: 'Cello Green 16', qty: 10, returnReason: 'Rusak / Basah' }] } },
];

/* ?shell&map — the Map System INSIDE the real shell, mounted exactly as App.jsx mounts it (no wrapper),
   with the expedition prototype's team (A-Brain Raw/2026-10-02-expedition/expedition.html) placed on
   the same real roads: the prototype's ground-image pixels turned back into lat/lng with the tile maths
   of its ground.mjs (zoom 14 around Muntilan). Today's sales, today's round (visitDay = today) and a
   last-seen point per salesman; Cahyo was last seen yesterday, so he is "Not out today". */
const LAB_MAP = (() => {
  const Z = 14, n = 2 ** Z, K = 2048 / 2000, LAT = -7.5808, LNG = 110.2925;
  const x0 = Math.floor((LNG + 180) / 360 * n) - 3, y0 = Math.floor((1 - Math.asinh(Math.tan(LAT * Math.PI / 180)) / Math.PI) / 2 * n) - 3;
  const geo = ([x, y]) => {
    const gx = x0 * 256 + x * K, gy = y0 * 256 + y * K;
    return { lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * gy / (256 * n)))) * 180 / Math.PI, lng: gx / (256 * n) * 360 - 180 };
  };
  const SHOPS = ['Toko Berkah Jaya', 'Warung Sumber Rejeki', 'Toko Makmur', 'Warung Bu Sri', 'Toko Sinar Abadi', 'Warung Pojok', 'Toko Lancar', 'Warung Barokah',
    'Toko Maju', 'Warung Mbak Yu', 'Toko Sentosa', 'Warung Pak Kumis', 'Toko Rejeki', 'Warung Bu Tini', 'Toko Abadi', 'Warung Sederhana',
    'Toko Murah', 'Warung Mampir', 'Toko Mulia', 'Warung Tegal', 'Toko Harapan', 'Warung Bu Darmi', 'Toko Amanah', 'Warung Kita',
    'Toko Bintang', 'Warung Pinggir', 'Toko Jaya', 'Warung Asri', 'Toko Subur', 'Warung Nusantara', 'Toko Indah', 'Warung Bu Yati'];
  const TEAM = [
    { id: 'm2', name: 'Budi Santoso', hits: 5, seen: 3, stops: [[500, 600], [440, 425], [322, 386], [240, 282], [170, 345], [95, 560], [62, 720], [80, 930]] },
    { id: 'm5', name: 'Ari Rahman', hits: 3, seen: 1, stops: [[600, 386], [730, 368], [850, 355], [960, 300], [1080, 262], [1230, 245], [1340, 232], [1450, 170]] },
    { id: 'm6', name: 'Dewi Wulandari', hits: 6, seen: 12, stops: [[725, 635], [790, 740], [880, 860], [960, 990], [1040, 1120], [1130, 1268], [1205, 1300], [1225, 1450]] },
    { id: 'm7', name: 'Rini Saputri', hits: 8, seen: 6, stops: [[470, 820], [400, 900], [330, 990], [250, 1080], [330, 1120], [420, 1160], [470, 1250], [475, 1400]] },
  ];
  /* the day's sales go back ~3.5 h; before 10:00 that crosses midnight and they turn into YESTERDAY's (right for
     the app, a thin demo) - so before 10:00 the lab's day is anchored at 10:00 */
  const now = Math.max(Date.now(), new Date().setHours(10, 0, 0, 0)), weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const customers = [], transactions = [];
  const motorists = TEAM.map((t, i) => {
    t.stops.forEach((p, k) => {
      const g = geo(p);
      customers.push({ id: `c-${i}-${k}`, name: SHOPS[i * 8 + k], latitude: g.lat, longitude: g.lng, assignedAgent: t.name, visitDay: weekday, status: 'APPROVED' });
      if (k < t.hits) transactions.push({ id: `tx-${i}-${k}`, customerName: SHOPS[i * 8 + k], agentId: t.id, agentName: t.name, total: 250000, timestamp: { seconds: Math.floor((now - (t.seen + (t.hits - k) * 25) * 60000) / 1000) } });
    });
    const here = geo(t.hits ? t.stops[t.hits - 1] : [565, 710]);
    /* two regions, so the region fence shows: Budi + Ari (+ Cahyo) work MUNTILAN, Dewi + Rini MAGELANG */
    return { id: t.id, name: t.name, location: i < 2 ? 'MUNTILAN' : 'MAGELANG', currentLocation: { lat: here.lat, lng: here.lng, timestamp: new Date(now - t.seen * 60000).toISOString() } };
  });
  const base = geo([565, 710]);
  motorists.push({ id: 'm3', name: 'Cahyo Putra', location: 'muntilan ', currentLocation: { ...base, timestamp: new Date(now - 26 * 3600000).toISOString() } });
  return { customers, transactions, motorists };
})();
/* ?shell&journey&exp&visits — today's visits carry every report outcome (and every 4th sale is dated today), so every
   chest sign shows; with `&tick` one more of Budi's shops is visited every 2.5 s - the secure moment, watched live */
const LAB_TAGS = ['Routine Check', 'Repeat Order 📦', 'Stock Full (No Order) 🛑', 'Competitor Issue ⚠️', 'New Request 📝', 'Store Closed 🔒'];
const labVisit = (tick) => (c) => {
  const [, i, k] = c.id.split('-').map(Number);
  return (i === 0 ? k < 2 + tick : (i + k) % 3 !== 0) ? { ...c, lastVisit: LAB_TODAY, lastVisitTag: LAB_TAGS[(i + k) % LAB_TAGS.length] } : c;
};

function ShellLab() {
  const [dark, setDark] = React.useState(!q.has('light'));
  /* ?shell&agent&tick — every 2.5 s a second RETUR (5 pcs) joins and leaves today's transactions,
     so the Quarantine count rolls 10 → 15 → 10 and the odometer can be watched and sampled
     (`el.getAnimations()`) instead of described. Off unless asked for. */
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!q.has('tick')) return;
    const t = setInterval(() => setTick((n) => n + 1), 2500);
    return () => clearInterval(t);
  }, []);
  const agentTxns = tick % 2
    ? [...LAB_AGENT_TXNS, { id: 'tx4', agentId: 'm2', date: LAB_TODAY, type: 'RETUR', total: -44500, customerName: 'Warung Bu Sri',
        forensicData: { quarantineCargo: [{ itemName: 'Djarum Coklat 12', qty: 5, returnReason: 'Kemasan rusak' }] } }]
    : LAB_AGENT_TXNS;
  /* ?tab=<label>[,<label>...] presses, in order, each button whose text starts with <label> once
     the page is up — `?tab=data,daftarkan pabrik` opens the Data Induk tab and then its factory
     form. A headless screenshot cannot click; without this the phone frame of any second tab or
     any form behind a button is a description, not a picture. Inside the desk only, so the shell's
     own menu buttons are never matched. */
  React.useLayoutEffect(() => {
    const wants = (q.get('tab') || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    /* One press per microtask, never a timer: a `.click()` inside a commit schedules React's
       re-render as ITS microtask, so the next `.then` runs after that flush and the button the
       press revealed already exists. A timer loses the race in headless Chrome, which shoots the
       moment the page has loaded; a plain loop presses the second button before it is drawn. */
    const press = (want) => {
      const desk = document.querySelector('button[aria-selected]')?.closest('.rounded-2xl') || document;
      /* `type:2490000` — types into the first enabled, visible input inside the desk (React's own
         value setter, then an input event so the controlled field takes it). The EOD deck's
         confirm button is disabled until the card carries a figure, so a headless frame of card 2
         or 3 cannot be reached by presses alone: `?tab=type:2490000,put cash,landed,put transfer`. */
      const setValue = (el, v) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      if (want.startsWith('type:')) {
        const el = [...desk.querySelectorAll('input:not([disabled])')].find((e) => e.offsetParent);
        if (el) setValue(el, want.slice(5));
        return;
      }
      /* `count:400/3` — the first product card's GOOD and DAMAGED boxes (Stock Opname): the search
         box is the first input on that screen, so `type:` cannot reach a count and the revealed
         state (plates, recount, damage kinds) could not be shot headless. */
      if (want.startsWith('count:')) {
        const [g, d] = want.slice(6).split('/');
        /* the rows arrive from the stub's onSnapshot one tick later, so poll for the first box */
        const find = (tries) => new Promise((res) => {
          const nums = [...desk.querySelectorAll('input[type=number]')].filter((e) => e.offsetParent);
          if (nums[0] || tries <= 0) return res(nums);
          setTimeout(() => res(find(tries - 1)), 50);
        });
        return find(40).then((nums) => {
          if (nums[0] && g) setValue(nums[0], g);
          if (nums[1] && d) setValue(nums[1], d);
        });
      }
      const hit = (sel) => [...desk.querySelectorAll(sel)]
        .find((el) => el.textContent.trim().toLowerCase().startsWith(want));
      /* buttons first; a card that opens on click (the Customers folders and stores are
         `cursor-pointer` divs, not buttons) only when no button carries the label. A target
         that a stub listener paints one tick later (the Stock Opname audit rows) is polled for,
         up to two seconds, instead of being missed. */
      const wait = (tries) => new Promise((res) => {
        const b = hit('button') || hit('[class*="cursor-pointer"]');
        if (b || tries <= 0) return res(b);
        setTimeout(() => res(wait(tries - 1)), 50);
      });
      return wait(40).then((b) => { if (b) b.click(); });
    };
    wants.reduce((chain, want) => chain.then(() => press(want)), Promise.resolve()).then(() => {
      /* `&held` — the first .kpm-key wears `lab-held`, so a look can draw the HELD state of a row
         (`:active` cannot be forced from outside) and a headless frame can show it. The pane and
         his phone still feel the real :active; this is only for the still. */
      if (q.has('held')) document.querySelector('.kpm-key')?.classList.add('lab-held');
      if (!q.has('grip')) return;
      /* the LAST one: the customer bar above the grip is also cursor-grab and its tap is a no-op */
      const grip = [...document.querySelectorAll('.cursor-grab')].pop();
      if (!grip) return;
      const r = grip.getBoundingClientRect();
      const at = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, pointerId: 1, isPrimary: true };
      grip.dispatchEvent(new PointerEvent('pointerdown', at));
      window.dispatchEvent(new PointerEvent('pointerup', at));
    });
  }, []);
  return (
    <BiohazardTheme
      activeTab={q.has('map') ? 'map_war_room' : 'command_center'} setActiveTab={() => {}}
      user={{ displayName: 'Lab', email: 'lab@example.com' }}
      appSettings={{}} isAdmin userRole="ADMIN" agentSettings={{}}
      notifications={q.has('bell') ? LAB_BELL_NEEDS : []} onNotificationClick={() => {}} appVersion="lab"
      darkMode={dark} setDarkMode={setDark}
      onOpenPov={null} povActive={false}
      syncIndicator={(
        <button onClick={() => {}} className="kpm-chip relative ">
          <Cloud size={16} />
          <span className="text-[10px] font-black tracking-widest hidden md:inline">SYNCED</span>
        </button>
      )}
    >
      {q.has('profile') ? (
        /* ?shell&profile — the Agent Profile INSIDE the real shell exactly as App.jsx:4725 mounts it: no
           wrapper. T5 Budi (m2) sees his own page; `&admin` mounts the boss's view (the agent list, the
           rank / badge config keys). The stub's getDoc answers "exists: false", so ranks and badges are
           the defaults from config/career.js; the photo save is a stub no-op. Job 4 (2026-09-20): the
           page overflows sideways at 375 — measured and boarded here, shipped as stage B (the head, the wrapping keys). */
        <AgentProfileView
          motorists={LAB_MOTORISTS.map((m) => (m.id === 'm2' ? { ...m, ...FIXTURES['motorists/m2'] } : m))}
          inventory={[...LAB_PRODUCTS, ...LAB_VAN_EXTRA]} transactions={LAB_AGENT_TXNS}
          userRole={q.has('admin') ? 'ADMIN' : 'FIELD_OPERATIVE'} agentProfileId="m2"
          db={{}} appId="lab" userId="lab-boss" storage={{}}
          appSettings={{ useCareerLedger: true }}
          career={{ m2: { live: { collected: 124500000, daysVerified: 41, cleanCukaiDays: 30, storesServed: 300 }, joinDate: '2025-01-10' } }}
          logAudit={() => {}}
          customers={LAB_CUSTOMERS.map((c, i) => ({ ...c, assignedAgent: 'Budi Santoso', visitFreq: 7, lastVisit: i === 0 ? LAB_TODAY : '' }))}
        />
      ) : q.has('sampling') ? (
        /* ?shell&sampling — Sampling INSIDE the real shell as App.jsx:5087 mounts it: the folder view
           (year › month › date › place › the shops' items), `&analytics` the boss's charts, `&entry` the
           record-a-sample modal on top. App owns `samplings`; the lab hands seven rows over three days.
           Every write is a stub no-op; the lab is for looking. */
        <>
          {q.has('entry') && <SampleEntryModal isOpen initialData={null} inventory={[...LAB_PRODUCTS, ...LAB_VAN_EXTRA]} onSubmit={() => {}} onClose={() => {}} />}
          {q.has('analytics')
            ? <SamplingAnalyticsView samplings={labSamplings(LAB_TODAY)} inventory={[...LAB_PRODUCTS, ...LAB_VAN_EXTRA]} onBack={() => {}} />
            : <SamplingFolderView samplings={labSamplings(LAB_TODAY)} isAdmin={q.has('admin')} onRecordSample={() => {}} onDelete={() => {}} onEdit={() => {}} onEditFolder={() => {}} onShowAnalytics={() => {}} />}
        </>
      ) : q.has('journey') ? (
        /* ?shell&journey — Journey Plan INSIDE the real shell exactly as App.jsx:4650 mounts it: no
           wrapper. App hands it displayPermitted (already tier-filtered), so the lab hands the four
           customers plus two more with a lastVisit / visitFreq spread, all in Bandung, so the day's
           list has due, overdue and fresh rows and the map has pins to cluster. The salesman is
           Budi (his check-in writes under user.displayName, JourneyView.jsx:773); `&admin` is the
           boss (isAdmin → the fleet paintbrush, :322). Every write is a stub no-op; the lab is for
           looking. */
        /* `&exp` swaps in the expedition team (LAB_MAP above): Muntilan shops due today, today's sales, five
           salesmen in two regions - Budi (m2, MUNTILAN) is the viewer unless `&admin` */
        <JourneyView
          db={{}} appId="lab"
          motorists={q.has('exp') ? LAB_MAP.motorists : []} agentProfileId="m2"
          customers={q.has('exp') ? (q.has('visits') ? LAB_MAP.customers.map(labVisit(tick)) : LAB_MAP.customers) : [
            ...LAB_CUSTOMERS.map((c, i) => ({ ...c, region: 'BANDUNG', city: 'Bandung', tier: ['Bronze', 'Silver', 'Gold', 'Bronze'][i], assignedAgent: 'Budi Santoso', visitFreq: 7, lastVisit: i === 0 ? LAB_TODAY : i === 1 ? '2026-09-01' : '', phone: '0812-3456-7890' })),
            { id: 'c-sri', name: 'Warung Bu Sri Rahayu Sejahtera Abadi', address: 'Jl. Dago Atas No. 101, Bandung', latitude: -6.8700, longitude: 107.6150, priceTier: 'Ecer', region: 'BANDUNG', city: 'Bandung', tier: 'Silver', assignedAgent: 'Budi Santoso', visitFreq: 3, lastVisit: '2026-09-10' },
            { id: 'c-jaya', name: 'Grosir Jaya Abadi', address: 'Jl. Soekarno Hatta 400', latitude: -6.9400, longitude: 107.6300, priceTier: 'Grosir', region: 'BANDUNG', city: 'Bandung', tier: 'Gold', assignedAgent: 'Adi Nugroho', visitFreq: 14, lastVisit: '2026-08-20' },
          ].map((c) => (q.has('ghost') && c.id === 'c-jaya' ? { ...c, assignedAgent: 'Andika Pratama' } : c))}
          transactions={q.has('exp') ? (q.has('visits') ? LAB_MAP.transactions.map((t, j) => (j % 4 === 0 ? { ...t, date: LAB_TODAY } : t)) : LAB_MAP.transactions) : LAB_AGENT_TXNS}
          user={{ uid: 'lab-t5', displayName: q.has('admin') ? 'Lab Boss' : 'Budi Santoso', email: 'lab@example.com', location: 'BANDUNG', userRole: q.has('admin') ? 'ADMIN' : 'FIELD_OPERATIVE' }}
          userRole={q.has('admin') ? 'ADMIN' : 'FIELD_OPERATIVE'} isAdmin={q.has('admin')}
          logAudit={() => {}} triggerCapy={() => {}} setActiveTab={() => {}}
          tierSettings={{}} isLiteMode={false} appSettings={{}}
          focusStore={null} onFocusStoreHandled={() => {}}
        />
      ) : q.has('opname') ? (
        /* ?shell&opname — Stock Opname INSIDE the real shell exactly as App.jsx:5069 mounts it: no
           wrapper. A T5 counts BLIND (viewMode 'count', StockOpnameView.jsx:222) against his
           BRANCH's inventory (:232, isAreaAdmin = everyone below ADMIN), so the salesman is put in
           BANDUNG and the stub answers the same `branches/BANDUNG/inventory` fixture the gudang
           desk reads. `&admin` is the boss: viewMode 'monitor' on the passed inventory, the HQ
           AUDITS and QUARANTINE tabs fed by the two array fixtures above. It writes through addDoc
           on submit — the stub swallows it; the lab is for looking. */
        <StockOpnameView
          db={{}} storage={{}} appId="lab"
          /* one product carries damaged stock so the boss's QUARANTINE tab has a row with its
             three protocol keys instead of the empty-zone plate */
          inventory={[...LAB_PRODUCTS, ...LAB_VAN_EXTRA].map((p) => (p.id === 'p-djar' ? { ...p, damagedStock: 12 } : p))} transactions={LAB_AGENT_TXNS}
          motorists={LAB_MOTORISTS} appSettings={{}}
          userRole={q.has('admin') ? 'ADMIN' : 'FIELD_OPERATIVE'} isAdmin={q.has('admin')}
          user={{ uid: 'lab-boss', displayName: q.has('admin') ? 'Lab Boss' : 'Lab Salesman', email: 'lab@example.com', location: 'BANDUNG', userRole: q.has('admin') ? 'ADMIN' : 'FIELD_OPERATIVE' }}
          logAudit={() => {}} triggerCapy={() => {}}
        />
      ) : q.has('eod') ? (
        /* ?shell&eod — EOD Setoran, the salesman's SUBMIT flow (isAdmin false → viewMode 'submit'),
           INSIDE the real shell exactly as App.jsx:5022 mounts it: no wrapper. The screen keys on
           agentProfileId directly (EODReconciliationView.jsx:75), so "m2" is Budi. His van is read
           off the motorist record first (:152), so the same FIXTURES['motorists/m2'] object the
           agent branch feeds the stub is merged into his row — cukaiDebts included, so the pita
           cukai card has a figure. Two cash sales plus one transfer, so the cash card and the
           transfer receipt list both have rows. onSubmitEOD records to window.__eod and writes
           nothing. `&admin` mounts the boss's review side instead. */
        <>
        <EODReconciliationView
          agentProfileId="m2" isAdmin={q.has('admin')}
          motorists={LAB_MOTORISTS.map((m) => (m.id === 'm2' ? { ...m, ...FIXTURES['motorists/m2'] } : m))}
          agentCanvas={FIXTURES['motorists/m2'].activeCanvas}
          inventory={[...LAB_PRODUCTS, ...LAB_VAN_EXTRA]}
          transactions={[...LAB_AGENT_TXNS.map((t) => t.id === 'tx1' ? { ...t, items: [{ productId: 'p-cg16', qty: 12, unit: 'Bks', calculatedPrice: 89000 }, { productId: 'p-djar', qty: 5, unit: 'Bks', calculatedPrice: 156000 }] } : t.id === 'tx2' ? { ...t, items: [{ productId: 'p-cg16', qty: 8, unit: 'Bks', calculatedPrice: 80000 }] } : t), { id: 'tx5', agentId: 'm2', date: LAB_TODAY, type: 'SALE', total: 425000, paymentType: 'Transfer', customerName: 'Toko Berkah Jaya' }]}
          samplings={[]} eodReports={q.has('admin') ? labEodReports(LAB_TODAY) : q.has('verified') ? labVerifiedTonight() : q.has('late') ? labEodReports(LAB_TODAY).filter((r) => r.id === 'e6') : []} appSettings={q.has('admin') ? { useCareerLedger: true } : {}}
          user={{ uid: 'lab-t5', displayName: 'Lab Salesman', email: 'lab@example.com' }}
          onSubmitEOD={async (p) => { window.__eod = [...(window.__eod || []), p]; }}
          /* the boss's player card (shipped 2026-09-20): Budi's ledger puts him on Silver with a bar toward Gold; the
             route is the Journey Plan's fixture (one store closed today); a verify records the decision and answers
             true so the scan + seal play - the fixture report stays, the real app removes it when Firestore updates */
          onVerifyEOD={async (r, d) => { window.__eodVerify = [...(window.__eodVerify || []), { id: r.id, ...d }]; return true; }} onResetEOD={async (r) => { window.__eodReset = [...(window.__eodReset || []), r.id]; }}
          career={{ m2: { live: { collected: 124500000, daysVerified: 41, cleanCukaiDays: 30, storesServed: 300 }, joinDate: '2025-01-10' } }}
          customers={LAB_CUSTOMERS.map((c, i) => ({ ...c, assignedAgent: 'Budi Santoso', visitFreq: 7, lastVisit: i === 0 ? LAB_TODAY : '' }))}
        />
        </>
      ) : q.has('piutang') ? (
        /* ?shell&piutang — Receivables (ConsignmentFinanceView) INSIDE the real shell as App.jsx:5049
           mounts it, with onPayment / onReturn wired to the REAL useTransactionEngine over the stub
           (2026-09-22, his "can u do your test yourself"). LAB_PIUTANG_TXNS is the selfcheck's
           fixture: 20 packs placed at 27.500, then an audit — 14 paid, 2 handed back damaged, 4 on
           the shelf — so the balance on screen must read 110.000, not 165.000. `window.__labAudit`
           is the engine's handleConsignmentPayment, so a return counted in Slop can be sent through
           the real return loop and the product update read back from `__labWrites`. */
        <LabPiutang q={q} />
      ) : q.has('agent') ? (
        /* ?shell&agent — the Agent Inventory (the salesman's van manifest) INSIDE the real shell,
           exactly as App.jsx:4253 mounts it: no wrapper, a direct child of biohazard-content. T5
           Budi (m2) — see FIXTURES['motorists/m2'] above for how the screen finds him. Products
           carry the three tier prices the Projected Value box multiplies; three of today's
           transactions so Cash, Retur and the QUARANTINE view all have something to show. */
        <AgentInventoryView
          db={{}} appId="lab" userId="lab" agentProfileId="m2"
          inventory={[...LAB_PRODUCTS, ...LAB_VAN_EXTRA].map((p) => ({ ...p, priceRetail: Math.round(p.priceDistributor * 1.15), priceEcer: Math.round(p.priceDistributor * 1.25), priceGrosir: Math.round(p.priceDistributor * 1.08) }))}
          /* &admin: tx3 also carries its damaged line, the shape the chest's damaged row reads (vanBay damagedInVan) - kept
             out of LAB_AGENT_TXNS, which the EOD and Fleet labs share */
          transactions={q.has('admin') ? agentTxns.map((t) => (t.id === 'tx3' ? { ...t, items: [{ productId: 'p-cg16', name: 'Cello Green 16', qty: 10, unit: 'Bks', condition: 'DAMAGED', returnReason: 'Rusak / Basah' }] } : t)) : agentTxns} samplings={[]}
          user={{ uid: 'lab-t5', displayName: 'Lab Salesman', email: 'lab@example.com' }}
          userRole={q.get('tier') || (q.has('admin') ? 'FLEET_CAPTAIN' : 'FIELD_OPERATIVE')}   /* ?shell&agent&admin: the regional admin's chest; &tier=<id> any tier */
          motorists={LAB_MOTORISTS} previewing={null}
        />
      ) : q.has('customers') ? (
        /* ?shell&customers — the Customers screen INSIDE the real shell, exactly as App.jsx:5041
           mounts it: no wrapper at all, a direct child of the shell's biohazard-content. T5 again
           (the salesman who registers and looks up shops from a phone); the four LAB_CUSTOMERS
           carry a region so the own-region rule has something to compare; the rank list is the
           app's DEFAULT_TIERS shape. onRequestCrop records to window.__crop. db is the stub so the
           borders read resolves empty instead of throwing. */
        <CustomerManagement
          customers={LAB_CUSTOMERS.map((c) => ({ ...c, region: 'BANDUNG', city: 'Bandung', tier: 'Bronze', phone: '0812-3456-7890', visitFreq: 7 }))}
          db={{}} appId="lab"
          user={{ uid: 'lab-t5', displayName: 'Lab Salesman', email: 'lab@example.com', location: 'BANDUNG' }}
          logAudit={() => {}} triggerCapy={() => {}}
          /* &admin — the boss's header: Find Duplicates / Data Scrub / Import Map Marker sit
             beside the title in one non-wrapping row (his "customer page moves sideways",
             2026-09-18 — invisible to the T5 mount, which never shows them) */
          isAdmin={q.has('admin')} userRole={q.has('admin') ? 'ADMIN' : 'FIELD_OPERATIVE'} employeeRegion="BANDUNG"
          tierSettings={[
            { id: 'Mythic', label: 'Mythic', color: '#f59e0b', iconType: 'emoji', value: '👑' },
            { id: 'Bronze', label: 'Bronze', color: '#d97706', iconType: 'emoji', value: '🛡️' },
            { id: 'Unranked', label: 'Unranked', color: '#6b5a40', iconType: 'emoji', value: '🪵' },
          ]}
          onNavigateToMap={() => {}}
          onRequestCrop={(file) => { window.__crop = file; }}
          croppedImage={null} onClearCroppedImage={() => {}}
        />
      ) : q.has('terminal') ? (
        /* ?shell&terminal — the Sales Terminal INSIDE the real shell, wrapped exactly as App.jsx
           wraps it (activeTab === 'sales', App.jsx:4916): the shell's p-2 lg:p-6, then ONE bare
           box, nothing else — no border-4, no dashed band. The terminal is a T5 salesman
           (FIELD_OPERATIVE) on purpose: that is who sells from a phone all day, and the tier
           decides the proof camera (no picker) and the GPS gate. Products carry the three tier
           prices the cart engine reads (prod.priceRetail …); the fixture list has only the
           distributor price. onProcessSale records to window.__sale and does nothing else.
           ?tab= presses buttons by label as elsewhere; the manifest grip is a POINTER gesture,
           not a click, so ?grip dispatches one real pointerdown/pointerup tap on it after
           mount — the same handler the thumb hits, opened to the 55 % snap. */
        <div className="h-full w-full relative bg-[var(--duke-well-solid)]">
          <MerchantSalesView
            inventory={LAB_PRODUCTS.map((p) => ({ ...p, priceRetail: Math.round(p.priceDistributor * 1.15), priceEcer: Math.round(p.priceDistributor * 1.25), priceGrosir: Math.round(p.priceDistributor * 1.08) }))}
            user={{ uid: 'lab-t5', displayName: 'Lab Salesman', email: 'lab@example.com' }}
            userRole="FIELD_OPERATIVE" isAdmin={false}
            logAudit={() => {}} triggerCapy={() => {}}
            onProcessSale={async (sale) => { window.__sale = sale; return { ok: true }; }}
            onInspect={() => {}}
            appSettings={{ companyName: 'KPM INVENTORY' }}
            customers={LAB_CUSTOMERS}
            allowedPayments={['Cash', 'Transfer', 'IOU']} allowedTiers={['Retail', 'Ecer', 'Grosir']}
            transactions={[]} allowRetur allowCashRefund={false}
            db={null} appId="lab" agentProfileId="lab-t5" storage={null} masterUserId="lab"
            isOnline
          />
        </div>
      ) : q.has('fleet') ? (
        /* ?shell&fleet — FLEET & ROSTER INSIDE the real shell exactly as App.jsx:4693 mounts it: no
           wrapper, a direct child of biohazard-content. The viewer is the REGIONAL ADMIN, because he
           is the one who loads a van (his 2026-09-22 "how the regional admin put item to the agent
           inventory"): `userRole='AREA_ADMIN'` makes `isGlobalAdmin` false, so the screen runs its own
           roster listener over the stub and filters to the viewer's own location. The email matches
           LAB_FLEET's f-ra, so `myProfile` resolves and `rawLocation` is BANDUNG rather than
           'UNASSIGNED'. `&admin` mounts the HQ view instead (global admin: the whole roster, the
           header says "Fleet Roster"). Every write is recorded by the stub and nothing persists —
           handleLoadCanvas / handleClearCanvas are the two transactions the Backlog says never to
           touch, so the lab is for LOOKING at where they live, not for changing them. */
        <FleetCanvasManager
          db={{}} appId="lab" masterUserId="lab"
          userRole={q.has('admin') ? 'ADMIN' : 'AREA_ADMIN'} isAdmin={q.has('admin')}
          agentProfileId="f-ra" previewing={null}
          user={{ uid: 'lab-ra', displayName: 'Rizky Aditama', email: 'rizky@kpm.example', location: 'BANDUNG' }}
          motorists={[...LAB_MOTORISTS, ...LAB_FLEET]}
          inventory={[...LAB_PRODUCTS, ...LAB_VAN_EXTRA]}
          transactions={[...LAB_AGENT_TXNS.map((t) => ({ ...t, agentId: 'f-b1' })), ...LAB_FLEET_TITIP]}
          customers={LAB_FLEET_CUSTOMERS}
          appSettings={{ companyName: 'KPM INVENTORY' }}
          logAudit={() => {}} triggerCapy={() => {}}
        />
      ) : q.has('gudang') ? (
        /* ?shell&gudang — the REGIONAL WAREHOUSE desk INSIDE the real shell, in the restock-vault box
           App.jsx:5031 wraps it in (copied verbatim) - `?gudang` alone mounts it outside the shell. A
           branch viewer (FLEET_CAPTAIN in BANDUNG, as GudangLab): the HQ desk above it is not mounted. */
        <div className="h-auto min-h-[800px] lg:min-h-0 lg:h-full w-full max-w-7xl mx-auto border-2 lg:border-4 border-[var(--duke-frame)] shadow-[0_0_0_1px_var(--duke-lift)] relative flex flex-col bg-[var(--duke-well-solid)] p-2 lg:p-4 overflow-y-auto custom-scrollbar">
          <BranchWarehouseManager
            db={{}} storage={null} appId="lab" user={{ displayName: 'Rina Wijaya', email: 'rina@kpm.id', location: 'BANDUNG' }}
            userRole={q.get('tier') || 'FLEET_CAPTAIN'} userLocation="BANDUNG" isAdmin={false} masterUserId="lab"
            globalInventory={FIXTURES['branches/BANDUNG/inventory']} motorists={[...LAB_MOTORISTS, ...LAB_FLEET]}
            transactions={[]} branchStockMap={{ BANDUNG: FIXTURES['branches/BANDUNG/inventory'] }}
            triggerCapy={() => {}} logAudit={() => {}}
            appSettings={{ companyName: 'KPM INVENTORY', adminDisplayName: 'Rina Wijaya' }}
          />
        </div>
      ) : q.has('map') ? (
        <MapMissionControl customers={LAB_MAP.customers} transactions={LAB_MAP.transactions} inventory={[]} db={{}} appId="lab" user={{ uid: 'lab' }}
          logAudit={() => {}} triggerCapy={() => {}} isAdmin={q.has('admin')} savedHome={null} onSetHome={() => {}} motorists={LAB_MAP.motorists} onNavigateToDirectory={() => {}}
          userRole={q.has('admin') ? 'ADMIN' : 'FIELD_OPERATIVE'} agentProfileId="m2" />
      ) : q.has('places') ? (
        /* ?shell&places — the Restock Vault desk INSIDE the real shell, wrapped exactly as App.jsx
           wraps it (`activeTab === 'restock_vault'`): the shell's `p-6`, then the `border-4 p-4`
           panel, then the dashed `mb-12 pb-12` band. `?places` alone mounts the desk in a bare
           `p-4` and measures 325 wide at 375; his phone shows ~254, and the missing 70 px is these
           two wrappers. Classes copied verbatim — a harness that invents its markup measures the
           harness. */
        <div className="h-auto min-h-[800px] lg:min-h-0 lg:h-full w-full max-w-7xl mx-auto border-2 lg:border-4 border-[var(--duke-frame)] shadow-[0_0_0_1px_var(--duke-lift)] relative flex flex-col bg-[var(--duke-well-solid)] p-2 lg:p-4 overflow-y-auto custom-scrollbar">
          <div className="mb-12 pb-12 border-b-4 border-[var(--duke-edge-1)] border-dashed">
            <RestockVaultView
              inventory={LAB_PRODUCTS} procurements={LAB_PROCUREMENTS} motorists={LAB_MOTORISTS} branchStockMap={{}}
              db={null} storage={null} appId="lab" user={null} isAdmin userRole="DEVELOPER"
              appSettings={{ companyName: 'KPM INVENTORY' }} masterUserId="lab"
            />
          </div>
        </div>
      ) : (
        <div className="p-6 font-mono text-[var(--ink)]">Page content under the shell.</div>
      )}
    </BiohazardTheme>
  );
}

createRoot(document.getElementById('root')).render(
  /* the shell carries the dialog gate + the toast column as main.jsx does, so a screen that asks (the player card's ✕
     asks the reason through promptAction) is answered in the lab too instead of logging "not mounted" */
  q.has('shell') ? <><ShellLab /><ConfirmHost /><ToastHost /></> :
  q.has('toast') ? <ToastLab /> :
  q.has('label') ? <ShipmentLabel shipment={LAB_SHIPMENT} onClose={() => {}} companyName="KPM INVENTORY" /> :
  q.has('photo') ? <PhotoLab /> :
  q.has('nota-scan') ? <NotaScanLab /> :
  q.has('scan') ? <ArrivalScanner open onClose={() => {}} onCode={(c) => { window.__scanned = c; }} expecting={['REQ_1756700000000']} /> :
  q.has('gudang') ? <GudangLab /> :
  q.has('places') ? <PlacesLab /> :
  q.has('nota') ? <NotaLab /> :
  q.has('perf') ? <PerfLab /> :
  q.has('plan') ? <PlanLab /> :
  q.has('minkirim') ? <MinKirimLab /> :
  q.has('pov') ? <PovLab /> : q.has('book') ? <BookLab /> : <Lab />);

/* ?probe writes the measured layout into the DOM, where `chrome --headless --dump-dom` can read
   it. Needed because a headless SCREENSHOT is not trustworthy for width on this machine: the
   display face is "Barlow Condensed", nothing loads it, and headless Chrome falls back to a
   font far wider than the "Arial Narrow" a real Windows Chrome picks. The 375px shot looked
   like the panel overflowed the phone; the same page measured 375px wide with no overflow in a
   real browser. A frame proves an appearance only when the harness renders what the app does. */
/* ?book&probe answers the one question a screenshot cannot: does pressing a section RESTART the
   book's own animation? A replayed animation reports a currentTime back near zero. This exists
   because "the animation resets every time i press the section" was a real bug that every check
   and every frame said was fine.

   ⚠️ HEADLESS VIRTUAL TIME DOES NOT DRIVE ANIMATION CLOCKS RELIABLY - a finished animation read
   back currentTime 0 here, which is not what a real browser reports. Run this one in a real
   browser; the headless answer cannot be trusted for timing. */
/* ?gudang&probe answers the question this whole pass turned on, and the one a screenshot answers
   least honestly: what is the CONTRAST of each title against the surface it actually sits on. A
   frame taken in the wrong theme, or mid-fade, looks identical to a real failure — that trap has
   been paid for twice on this project. A computed ratio is not a matter of timing.

   It walks up from each title to the first ancestor that paints an opaque background, because a
   heading's own background is `rgba(0, 0, 0, 0)` and comparing ink against transparency is how a
   contrast check reports a number nobody can see. */
if (q.has('gudang') && q.has('probe')) {
  setTimeout(() => {
    const lum = (c) => {
      const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => {
        const n = v / 255;
        return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const opaqueBg = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return bg;
      }
      return 'rgb(255, 255, 255)';
    };
    const titles = [...document.querySelectorAll('h2, h3, h4')].map((h) => {
      const ink = getComputedStyle(h).color;
      const bg = opaqueBg(h);
      const a = lum(ink), b = lum(bg);
      return {
        text: h.textContent.trim().slice(0, 34),
        ink, bg,
        ratio: +(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2)),
      };
    });
    const el = document.createElement('pre');
    el.id = 'probe';
    el.textContent = JSON.stringify({
      theme: document.documentElement.className || 'dark',
      worst: titles.reduce((w, t) => (t.ratio < w.ratio ? t : w), titles[0] || { ratio: null }),
      allPass: titles.every((t) => t.ratio >= 4.5),
      failing: titles.filter((t) => t.ratio < 4.5),
      titles,
    }, null, 1);
    document.body.appendChild(el);
  }, 400);
} else if (q.has('label') && q.has('probe')) {
  /* 🔴 THE ONE THING ON THIS PROJECT THAT CANNOT BE CHECKED BY READING IT. A barcode either scans
     or it does not, and `BarcodeDetector` — the API that would decode it — is an Android Chrome
     feature, measured absent from the desktop browser available here on 2026-09-01. So instead of
     decoding, this asserts the STRUCTURE every valid Code 128 symbol must have, which is true
     independently of any pattern table:

       total modules = 11 * S + 2      (every symbol is 11 modules; the stop carries 2 extra)
       black bars    = 3 * S + 1       (every symbol is 3 bars; the stop has a 4th)

     Both must agree on the same S, and S must be plausible for the payload. A wrong table still
     produces the right module count, so this is proof of SHAPE and not of scannability — the only
     proof of that is a phone pointed at printed paper, which is Aldi's to run.

     ⚠️ The first version of this probe expected `11 * (len + 3) + 2`, assuming pure Code128-B. It
     read 167 against an expected 222 and looked like a failure. JsBarcode encodes CODE128 in the
     optimal MIXED mode, dropping into Code C for the digit run — 15 symbols for this payload, not
     20. The check was wrong, not the barcode. Do not "fix" it back. */
  setTimeout(() => {
    const bc = [...document.querySelectorAll('svg')].find(s => s.querySelectorAll('rect').length > 5);
    const rects = [...bc.querySelectorAll('rect')];
    const black = rects.filter(r => {
      const f = (r.getAttribute('fill') || getComputedStyle(r).fill || '').toLowerCase();
      return f.includes('#000') || f === 'rgb(0, 0, 0)' || f === 'black';
    });
    const ws = black.map(r => Number(r.getAttribute('width')));
    const unit = Math.min(...ws);
    const totalW = parseFloat(bc.getAttribute('width'));
    const margin = 12;
    const modules = Math.round((totalW - 2 * margin) / unit);
    const S = (modules - 2) / 11;
    const payload = 'REQ_1756700000000';
    const text = [...bc.querySelectorAll('text')].map(t => t.textContent.trim());
    const el = document.createElement('pre');
    el.id = 'probe';
    el.textContent = JSON.stringify({
      payload,
      modules, symbols: S,
      moduleRuleHolds: Number.isInteger(S) && S > 0,
      blackBars: black.length,
      barRuleHolds: black.length === 3 * S + 1,
      symbolsPlausible: S > 0 && S < payload.length + 4,
      unitPx: unit, quietZonePx: margin,
      textUnderBars: text, textMatches: text.includes(payload),
      verdict: (Number.isInteger(S) && black.length === 3 * S + 1 && text.includes(payload))
        ? 'valid Code 128 structure' : 'STRUCTURE WRONG',
    }, null, 1);
    document.body.appendChild(el);
  }, 300);
} else if (q.has('book') && q.has('probe')) {
  setTimeout(() => {
    const dlg = document.querySelector('[role=dialog]');
    const book = dlg && dlg.children[1];
    const before = book ? book.getAnimations().map(a => Math.round(a.currentTime || 0)) : null;
    const tab = dlg && [...dlg.querySelectorAll('button')].find(b => /sales/i.test(b.textContent));
    if (tab) tab.click();
    setTimeout(() => {
      const after = book ? book.getAnimations().map(a => Math.round(a.currentTime || 0)) : null;
      const el = document.createElement('pre');
      el.id = 'probe';
      el.textContent = JSON.stringify({ clicked: tab ? tab.textContent.trim() : 'none', before, after,
        replayed: !!(before && after && after.some(t => t < 50)) });
      document.body.appendChild(el);
    }, 120);
  }, 1600);
} else if (q.has('nota') && q.has('probe')) {
  /* ?nota&probe answers the ONE question a screenshot cannot answer honestly: is the paper opaque?
     A frame can catch a fade mid-flight and look identical to a real transparency bug — that is
     exactly what happened on 2026-08-31. A computed background is not a matter of timing. */
  setTimeout(() => {
    const card = document.querySelector('.print-receipt');
    const cs = getComputedStyle(card);
    const el = document.createElement('pre');
    el.id = 'probe';
    el.textContent = JSON.stringify({
      background: cs.backgroundColor,
      opacity: cs.opacity,
      ink: cs.color,
      opaque: cs.backgroundColor === 'rgb(255, 255, 255)' && cs.opacity === '1',
      animations: card.getAnimations().map(a => a.animationName),
    });
    document.body.appendChild(el);
  }, 400);
} else if (q.has('probe')) {
  setTimeout(() => {
    const panel = document.querySelector('[role=dialog] > div');
    const el = document.createElement('pre');
    el.id = 'probe';
    el.textContent = JSON.stringify({
      vw: window.innerWidth,
      panel: panel ? Math.round(panel.getBoundingClientRect().width) : null,
      overflowsViewport: panel ? panel.getBoundingClientRect().width > window.innerWidth + 1 : null,
      docScrollWidth: document.documentElement.scrollWidth,
      displayFont: getComputedStyle(document.querySelector('h3')).fontFamily,
    });
    document.body.appendChild(el);
  }, 200);
}
