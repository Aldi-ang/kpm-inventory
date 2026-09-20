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
/* 2026-09-20 02:20 — the EOD HQ VERIFICATION panel (his t7: "redesign to looks on theme … animation smooth and futuristic
   … the color looks expensive … more natural"). eod-docket = A, the same card dressed in the theme's own vocabulary: no
   gold slabs — a dark raised card, a gold hairline under the name, the type as a kpm-stamp, the stamps block an inset
   well, one gold PLATE to verify and REJECT demoted to a text key. eod-fold = B, the pending reports and the history
   as the shipped FolderCard (the mock EodFoldMock in ponder-lab.jsx, lab only); the look hides the real grid. Delete
   when he decides. */
const DOCKET_CARD = '#root .space-y-4 > div.bg-black\\/40.border.rounded-2xl{background:linear-gradient(180deg,var(--raised),var(--sunk));border-color:var(--line-2);box-shadow:none}';
const DOCKET_HEAD = '#root .space-y-4 > div > div.p-4.flex.justify-between.items-center.border-b{background:linear-gradient(90deg,var(--gold),transparent 70%) 0 100% / 100% 1px no-repeat !important;border-bottom:0;padding:12px 16px}'
  + '#root .space-y-4 > div > div.p-4 h4{color:var(--ink) !important;font-size:15px}#root .space-y-4 > div > div.p-4 p.text-\\[10px\\]{font-size:11px;color:var(--ink-dim)}'
  + '#root .space-y-4 > div > div.p-4 span.rounded.uppercase{background:var(--inset) !important;color:var(--accent-ink) !important;box-shadow:none !important;border:1px solid var(--line-2);font-family:var(--font-mono);font-weight:700}';
const DOCKET_BODY = '#root .space-y-4 .bg-\\[var\\(--gold\\)\\].p-3.rounded-lg{background:var(--inset) !important;border-color:var(--line-2) !important;border-left:2px solid var(--gold) !important}'
  + '#root .space-y-4 .bg-\\[var\\(--gold\\)\\].p-3.rounded-lg span.text-xs{color:var(--ink-dim) !important}#root .space-y-4 .bg-\\[var\\(--gold\\)\\].p-3.rounded-lg span.text-xl{color:var(--ink) !important;white-space:nowrap;font-family:var(--font-mono)}'
  + '#root .space-y-4 .p-6.space-y-4{padding:16px}#root .space-y-4 .text-\\[10px\\]{font-size:11px}#root .space-y-4 .bg-black\\/40.p-3.rounded-lg.border{background:var(--inset)}';
const DOCKET_KEYS = '#root .space-y-4 .flex.gap-2.mt-4.pt-2{flex-direction:column;gap:4px}'
  + '#root .space-y-4 .flex.gap-2.mt-4.pt-2 > button:first-child{min-height:52px;background-image:linear-gradient(180deg,rgba(255,255,255,.3) 0 1px,transparent 1px,transparent calc(100% - 2px),rgba(0,0,0,.28) calc(100% - 2px)),linear-gradient(180deg,#E09A3C,var(--gold)) !important;color:var(--gold-ink) !important;border-color:var(--accent-edge) !important;letter-spacing:.2em}'
  + '#root .space-y-4 .flex.gap-2.mt-4.pt-2 > button:last-child{min-height:44px;background:transparent !important;border-color:transparent !important;color:var(--danger-ink) !important;font-size:11px}';
export const EOD_DOCKET = DOCKET_CARD + DOCKET_HEAD + DOCKET_BODY + DOCKET_KEYS;
export const EOD_FOLD = '#root .grid.grid-cols-1.lg\\:grid-cols-2.gap-8.animate-fade-in{display:none}';
export const LOOKS = { pin: PIN, 'eod-docket': EOD_DOCKET, 'eod-fold': EOD_FOLD };
