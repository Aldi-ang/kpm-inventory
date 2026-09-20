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
/* 2026-09-20 01:15: the Journey Plan compact looks (jp-strip / jp-mapfold) were decided A and shipped into
   JourneyView.jsx + theme.css (the 160 px strip, the touch gate). Gone. `?shell&journey` still opens the real screen. */
/* 2026-09-20 02:50: the EOD HQ Verification looks (eod-docket / eod-fold + the folder mock) were decided B and shipped into
   EODReconciliationView.jsx + theme.css — one folder per salesman, the docket sheet, the history as folders. Gone.
   `?shell&eod&admin` still opens the real screen with five lab reports. */
/* 2026-09-20 04:20 — THE PLAYER CARD (his redirect: a card per salesman with a pixel dissolve). eod-card hides the real
   review grid and styles the lab mock (PlayerCardMock in ponder-lab.jsx): the card, the face tile, the tile grid that
   covers the card square by square (his video) and clears the same way. Delete when he decides. */
export const EOD_CARD = '#root .grid.grid-cols-1.lg\\:grid-cols-2.gap-8.animate-fade-in{display:none}'
  + '.pc{position:relative;border-radius:16px;border:1px solid var(--line-2);background:linear-gradient(180deg,var(--raised),var(--sunk));overflow:hidden;transition:transform 160ms ease-out;cursor:pointer;user-select:none}'
  + '.pc:active{transform:perspective(700px) rotateX(2deg) rotateY(-2deg) scale(.99)}'
  + '.pc-face{width:88px;height:88px;flex:0 0 88px;border-radius:14px;display:grid;place-items:center;font:900 28px/1 var(--font-mono);color:#2a1d08;background:linear-gradient(160deg,#E4C98E,#B8893A)}'
  + '.pc-flip{width:36px;height:36px;display:grid;place-items:center;border-radius:10px;border:1px solid var(--line-2);color:var(--ink-dim);font-size:18px}'
  + '.pc-tiles{position:absolute;inset:0;display:grid;grid-template-columns:repeat(10,1fr);grid-template-rows:repeat(8,1fr);pointer-events:none;z-index:5}'
  + '.pc-tile{opacity:0;background:color-mix(in srgb,var(--gold) 45%,var(--raised))}'
  + '.pc.flipping .pc-tile{animation:pcIn 1ms steps(1) both;animation-delay:var(--d)}'
  + '.pc.settling .pc-tile{opacity:1;animation:pcOut 1ms steps(1) both;animation-delay:var(--d)}'
  + '.pc.mid .pc-tile.on{opacity:1}'
  + '@keyframes pcIn{to{opacity:1}}@keyframes pcOut{to{opacity:0}}';
export const LOOKS = { pin: PIN, 'eod-card': EOD_CARD };
