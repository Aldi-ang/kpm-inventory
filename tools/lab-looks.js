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
/* 2026-09-22 09:45: the PC looks (rc-head / rc-two — the review card's one-row head + two-column body; inv-a / inv-c — the Agent
   Inventory strip) were decided A (with the photo kept at 128) + A and shipped into PlayerCard.jsx + theme.css + AgentInventoryView.jsx.
   Gone. `?shell&eod&admin&tab=%E2%8C%84` opens the real card (the chevron pressed); `?shell&agent` the real strip; his PC is 2000×1000. */

/* 2026-09-22 15:20: the light-mode nixie looks (nx-a bezel / nx-b daylight glass / nx-c odometer) and the round-two verdict
   looks (st-a stamp / st-b engraved well / st-c written by hand) were all REFUSED for the count card's DIFFERENCE plate —
   his "just make it on red color with some animation on negative and also specific animation on positive but just let
   the format be the same with other text beside it" — and the plain red figure shipped into StockOpnameView.jsx + theme.css
   (THE VERDICT FIGURE). Gone. `?shell&opname&light&tab=count:400/3,3%20damaged` opens the real card (phone CSS fires
   below 1024 — shoot at 518, `look=pin` is not a phone for this screen). */
export const LOOKS = { pin: PIN };
