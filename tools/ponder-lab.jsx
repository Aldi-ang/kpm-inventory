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
import BranchWarehouseManager from '../src/components/BranchWarehouseManager.jsx';
import ShipmentLabel from '../src/components/ShipmentLabel.jsx';
import ArrivalScanner from '../src/components/ArrivalScanner.jsx';
/* Same module the alias in ponder-lab.config.mjs points `firebase/firestore` at, so writing a
   fixture here is what the component's own listener reads back. */
import { FIXTURES } from './lab-firestore-stub.js';
import { SCENES } from '../src/ponder/registry.js';

const q = new URLSearchParams(window.location.search);
if (q.has('light')) document.documentElement.classList.add('light');
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
FIXTURES['branches/BANDUNG/inventory'] = [
  { id: 'p-cg16', name: 'Cello Green 16', stock: 420 },
  { id: 'p-cm12', name: 'Cello Merah 12', stock: 168 },
  { id: 'p-sig',  name: 'Sigaret Kretek Tangan Premium', stock: 54 },
  { id: 'p-djar', name: 'Djarum Coklat 12', stock: 0 },
];
/* The registry the desk now READS. `gudang` carries this branch's fixed address — the reorder form
   cannot type one any more — and `pabrik`/`orang` fill the read-only Data Induk tab. */
/* TWO PRODUCTS WITH DELIBERATELY DIFFERENT PACKING. One karton is 400 Bks for the first and 600
   for the second, so the intake desk's rates line can be seen reading each product's own numbers
   rather than a constant. A lab with one product could not tell those two cases apart. */
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

createRoot(document.getElementById('root')).render(
  q.has('label') ? <ShipmentLabel shipment={LAB_SHIPMENT} onClose={() => {}} companyName="KPM INVENTORY" /> :
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
