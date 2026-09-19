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
/* 2026-09-19 09:10: fold-hub / fold-hub-b were decided B and shipped as .kpm-folder in theme.css + JourneyView.jsx. Gone.
   fold-cus-a / fold-cus-b stay until the Customers folders are built (his "B for both"). */
const CUS = 'div.kpm-key.kpm-hot.grid';                                  // a Customers folder row on the phone
/* fold-cus-a — the row stays a row: a numbered tab on its shoulder, the icon well becomes a manila lid */
export const FOLD_CUS_A = `body{counter-reset:folder}
${CUS}{position:relative;margin-top:20px;border-radius:0 12px 12px 12px;counter-increment:folder;overflow:visible}
${CUS}::before{content:counter(folder,decimal-leading-zero);inset:auto;left:-1px;top:-21px;height:22px;width:38%;padding:0 0 0 12px;z-index:1;opacity:1;transform:none;border:1px solid var(--line-2);border-bottom:0;border-radius:9px 12px 0 0;background:var(--raised);clip-path:polygon(0 0,80% 0,100% 100%,0 100%);font:900 13px/22px ui-monospace,Consolas,monospace;letter-spacing:.1em;color:var(--ink)}
${CUS} > .contents > .kpm-well, ${CUS} .kpm-well{background:linear-gradient(135deg,#d6b57a 0%,#b8924f 45%,#8a6a3a 100%);color:#2a2016;border-color:#8a6a3a;border-radius:8px 8px 3px 3px}
${CUS} .kpm-well::after{display:none}`;
/* fold-cus-b — the folders become cards two to a row, the lid on top, like the hub */
export const FOLD_CUS_B = `div:has(> ${CUS}){display:grid;grid-template-columns:1fr 1fr;gap:12px 10px;align-items:start}
${CUS}{display:flex;flex-direction:column;align-items:stretch;padding:0;margin-top:26px;overflow:visible;border-radius:0 12px 12px 12px}
${CUS} > .contents{display:contents}
${CUS} .kpm-well{order:-1;width:100%;height:64px;border-radius:12px 12px 0 0;display:flex;align-items:flex-start;justify-content:flex-end;padding:8px}
${CUS} > .contents > div:last-child{display:contents}
${CUS} h3, ${CUS} .font-black{padding:8px 12px 0}
${CUS} > button{position:absolute;right:6px;top:66px}`;

/* `?look=a,b` — comma-separated names, injected after the app's stylesheet like ?css= */
export const LOOKS = { pin: PIN, 'fold-cus-a': FOLD_CUS_A, 'fold-cus-b': FOLD_CUS_A + FOLD_CUS_B };
