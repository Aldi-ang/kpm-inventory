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
/* 2026-09-20 13:00: the player card (eod-card + PlayerCardMock) was decided ("looks good for v2 lets use that") and shipped as
   components/PlayerCard.jsx + theme.css THE PLAYER CARD. Gone. `?shell&eod&admin` opens the real card on the five lab reports. */
/* 2026-09-21 08:40: the stage B looks (prof-a / prof-b — the card's head on the Agent Profile; the XP-gain mock) were decided
   A + B ("i like all the recommended option") and shipped into AgentProfileView.jsx (PlayerCardHead) + EODReconciliationView.jsx
   (XpGain). Gone. `?shell&profile` (+ `&admin`) and `?shell&eod&verified` open the real screens inside the shell. */
/* 2026-09-22 — his PC screenshots: the review card open is 880 px tall on a 1000 px screen (he scrolls to reach
   the plate), and the Agent Inventory's MODAL number + CASH coin cross their boxes at xl (the stats column is 65 %
   of a 1024 container → four 149 px boxes, 124 inside; a 7-digit rupiah at text-xl is 126–152 px by font).
   Board 1 — the open card on the desk (≥1024 only; the phone is untouched):
     rc-two  : the body in two columns — revenue + products left, the handover + plate right.
     rc-head : the head compacts when open — photo 72, CLOSED / NO ROUTE / COUNTS MATCH beside the name.
     A = rc-head,rc-two (recommended) · B = rc-two alone.
   Board 2 — the stat strip on the desk (≥1280 only):
     inv-a : the desk uses the laptop layout — the four boxes take the full width under the MANIFEST block.
     inv-c : one panel like PROJECTED VALUE beneath it — four cells, hairline dividers, no coin, 18 px numbers (board letter B).
   CSS mocks for the frames; nth-child grid areas assume the lab's card (products present, reset shown). Delete when he decides. */
const RC_TWO = `@media (min-width:1024px){
  .pc.open .pc-inner>div{display:grid;grid-template-columns:1fr 1fr;column-gap:20px;grid-template-rows:auto auto 1fr auto auto;
    grid-template-areas:"rev hlabel" "plabel hand" "prods hand" ". plate" ". reset"}
  .pc.open .pc-inner>div>div:nth-child(1){grid-area:rev}
  .pc.open .pc-inner>div>p:nth-child(2){grid-area:plabel}
  .pc.open .pc-inner>div>div:nth-child(3){grid-area:prods;align-self:start}
  .pc.open .pc-inner>div>p:nth-child(4){grid-area:hlabel}
  .pc.open .pc-inner>div>div:nth-child(5){grid-area:hand}
  .pc.open .pc-inner>div>button:nth-child(6){grid-area:plate}
  .pc.open .pc-inner>div>button:nth-child(7){grid-area:reset}
}`;
const RC_HEAD = `@media (min-width:1024px){
  .pc.open .pc-head{display:flex;align-items:center;gap:24px}
  .pc.open .pc-head>div:first-child{flex:1 1 auto;min-width:0;align-items:center}
  .pc.open .pc-head>div:last-child{margin-top:0;flex:0 0 auto;flex-direction:column;align-items:flex-end;gap:10px}
  .pc.open .pc-avatar{width:72px;height:72px;flex-basis:72px}
  .pc.open .pc-photo{inset:8px}
  .pc.open .pc-avatar .sframe{transform:scale(.5625);transform-origin:0 0}
  .pc.open .pc-head .text-4xl{font-size:1.5rem}
  .pc.open .pc-head .text-4xl .text-2xl{font-size:1rem}
}`;
const INV_A = `@media (min-width:1280px){
  [class~="xl:flex-row"]{flex-direction:column!important}
  [class~="xl:w-[65%]"]{width:100%!important;margin-top:.5rem!important}
}`;
const INV_C = `@media (min-width:1280px){
  [class~="xl:w-[65%]"] [class~="lg:grid-cols-4"]{background:var(--panel);border:1px solid var(--line-2);gap:0!important;padding:10px 4px}
  [class~="xl:w-[65%]"] [class~="lg:grid-cols-4"]>div{background:transparent!important;border:0!important;box-shadow:none!important;padding:2px 6px!important;border-left:1px solid var(--line-2)!important}
  [class~="xl:w-[65%]"] [class~="lg:grid-cols-4"]>div:first-child{border-left:0!important}
  [class~="xl:w-[65%]"] [class~="lg:grid-cols-4"] .kpm-coin{display:none}
  [class~="xl:w-[65%]"] [class~="lg:grid-cols-4"] span.tabular-nums{font-size:18px!important}
  [class~="xl:w-[65%]"] [class~="lg:grid-cols-4"]>div>span:first-child{margin-bottom:6px}
}`;
export const LOOKS = { pin: PIN, 'rc-two': RC_TWO, 'rc-head': RC_HEAD, 'inv-a': INV_A, 'inv-c': INV_C };
