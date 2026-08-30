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
import ShipmentPlanTable from '../src/components/ShipmentPlanTable.jsx';
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

createRoot(document.getElementById('root')).render(
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
if (q.has('book') && q.has('probe')) {
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
