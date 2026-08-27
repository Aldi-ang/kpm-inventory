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

/* ?book mounts the top-bar book instead of the player, and clicks it open so a screenshot lands on
   the spread rather than on a 34px closed book. ?shut leaves it closed, for looking at the glyph
   and its hover state. */
function BookLab() {
  React.useEffect(() => {
    if (q.has('shut')) return;
    const t = setTimeout(() => document.querySelector('[aria-label="Tutorial book"]')?.click(), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="p-6 flex justify-end">
      <PonderBookButton />
    </div>
  );
}

createRoot(document.getElementById('root')).render(q.has('book') ? <BookLab /> : <Lab />);

/* ?probe writes the measured layout into the DOM, where `chrome --headless --dump-dom` can read
   it. Needed because a headless SCREENSHOT is not trustworthy for width on this machine: the
   display face is "Barlow Condensed", nothing loads it, and headless Chrome falls back to a
   font far wider than the "Arial Narrow" a real Windows Chrome picks. The 375px shot looked
   like the panel overflowed the phone; the same page measured 375px wide with no overflow in a
   real browser. A frame proves an appearance only when the harness renders what the app does. */
if (q.has('probe')) {
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
