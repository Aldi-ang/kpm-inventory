/* LAB ONLY — proposal CSS behind short names, so a board option can be opened LIVE as
   `?shell&customers&look=cust-a` instead of a 6 KB ?css= link. Each entry is a candidate Aldi has
   not decided on yet; when one ships, its rules move into the component and the entry is deleted.
   2026-09-18: the Customers look, the Quarantine badge and the competitor table were decided (all B)
   and shipped as .kpm-key / .kpm-well / .kpm-stamp / .kpm-plate / .kpm-led in theme.css — their
   entries are gone from here. Only the 375 pin remains. */
export const PIN = '#root{width:375px}';

/* 2026-09-18 later: the EOD Setoran deck (board 1 YES) and count rows (board 2 B) were decided the
   same morning and shipped into EODCardDeck.jsx — their entries are gone from here too. */

/* 2026-09-18 16:40: the Customers round-two candidates (the boss's header fold, the ⋯ strip, the
   charge line) were decided A / A / A and shipped into CustomerManager.jsx + theme.css — gone.
   When a look needs the HELD state of a row for a still, `&held` puts `lab-held` on the first
   .kpm-key; write the look against `.kpm-key:active, .kpm-key.lab-held`. */

/* 2026-09-18 21:45: the Stock Opname looks (op-1..op-8 — the count card, the damage reel, the
   boss's tabs, the audit item, the nixie counter) are all decided and shipped into
   StockOpnameView.jsx, theme.css and components/NixieCount.jsx (kpm f72ef35 + the nixie commit).
   Gone. `?shell&opname&tab=count:400/3,3%20damaged` and `?shell&opname&admin&tab=hq%20audits,bandung`
   still open the real screen inside the shell. */

/* 2026-09-19 02:50: the Journey Plan looks (jp-floor, jp-fold, jp-card - the floor, the MISSION FEED fold,
   the ⋯ card) were decided B / B / YES and shipped into JourneyView.jsx. Gone. `?shell&journey` and
   `?shell&journey&admin` (+ `&tab=unmapped%20provinsi,bandung` for the store level) still open the real screen. */

/* 2026-09-19 07:20: the store card looks (jp-a/b/c — the compact card; jp-lamp, jp-edge — the critical light)
   were decided C + LAMP + EDGE ("LED cyberpunk style") and shipped into JourneyView.jsx + theme.css
   (.kpm-led-line, .kpm-crit). Gone. */

/* 2026-09-19 08:40 — the FOLDER CARD look from his video (a tab cut-out top-left with a number, an ↗ corner
   key, a lid on top that lifts on press). Candidates for the RADAR HUB region cards and the Customers
   folders. CSS approximations for the boards; delete when he decides. */
/* 2026-09-19 09:10: fold-hub / fold-hub-b were decided B and shipped as .kpm-folder in theme.css + JourneyView.jsx.
   11:40: fold-cus-a / fold-cus-b — the Customers folders shipped as the same FolderCard (CustomerManager.jsx). All gone. */
/* `?look=a,b` — comma-separated names, injected after the app's stylesheet like ?css= */
/* 2026-09-19 19:55: the Sampling boards (the floor look, the &fold mock) were decided B and shipped into
   SamplingManager.jsx — the four levels as FolderCard, the items as rows. Gone. `?shell&sampling` (+ `&admin`,
   `&tab=2026,september,19,pasar%20baru`) still opens the real screen inside the shell. */
/* 2026-09-20 00:55 — JOURNEY PLAN compact (his t3: "redesign the map and mission feed … compact simple and more
   ergonomics and not taking that much space if not needed"). jp-strip = A: the feed one line + a thin bar, the map a
   160 px strip with only the ⛶ key, the hub rises to the first screen. jp-mapfold = B: the map folds to a 96 px
   MAP card (tap → the full-screen map that already exists) and moves under the hub. Both: the page scrolls over the
   map (touch-action pan-y, the map moves only when opened) — a still cannot show that. Delete when he decides. */
const JP_FEED = '#root .bg-black\\/40.p-3{padding:8px 12px}#root .bg-black\\/40 .mb-4{margin-bottom:0}#root .bg-black\\/40 .h-2\\.5{height:3px}#root .bg-black\\/40 .gap-1\\.5{gap:3px}#root .bg-black\\/40 h2.mb-1{margin-bottom:2px}';
export const JP_STRIP = JP_FEED
  + '#root .h-\\[400px\\]{height:160px}#root .h-\\[400px\\] .leaflet-control-zoom{display:none}#root .h-\\[400px\\] .absolute.top-4.right-4 > button + button{display:none}#root .h-\\[400px\\] .absolute.bottom-4.left-4{display:none}'
  + '#root .space-y-6.font-mono > :not([hidden]) ~ :not([hidden]){margin-top:12px}';
export const JP_MAPFOLD = JP_FEED
  + '#root .space-y-6.font-mono{display:flex;flex-direction:column;gap:12px}#root .space-y-6.font-mono > *{margin:0}'
  + '#root .h-\\[400px\\]{order:9;height:96px}#root .h-\\[400px\\] .leaflet-control-container,#root .h-\\[400px\\] > div.absolute{display:none}'
  + '#root .h-\\[400px\\]::after{content:"MAP  ·  4 TARGETS  ·  TAP TO OPEN";position:absolute;inset:0;z-index:1000;display:grid;place-items:center;background:linear-gradient(rgba(2,6,23,.45),rgba(2,6,23,.8));color:#fff;font:900 12px/1 ui-monospace,monospace;letter-spacing:.2em}';
export const LOOKS = { pin: PIN, 'jp-strip': JP_STRIP, 'jp-mapfold': JP_MAPFOLD };
