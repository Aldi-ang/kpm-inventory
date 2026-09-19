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

/* `?look=a,b` — comma-separated names, injected after the app's stylesheet like ?css= */
export const LOOKS = { pin: PIN };
