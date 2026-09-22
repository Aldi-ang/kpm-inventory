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

/* 2026-09-22 13:40 — THE NIXIE IN LIGHT MODE (his 2026-09-20 "t4 looks okay but the light mode nixie can look better
   that that"). Three candidates, light mode only; dark mode untouched by all three. No shadow, no filter (G30);
   each is border + fill + gradient, so Lite Mode strips nothing that carries the look. */
/* A — THE BEZEL: the black glass stays (his 2026-09-04 rule, an instrument does not follow the room's lights), but
   it is SEATED in the light material — a brushed-metal ring drawn as a border-box gradient, the same anodized family
   as the light rail. The ink stays #FFB02E. */
export const NX_A = 'html.light .kpm-nixie{border:3px solid transparent;border-radius:7px;padding:4px 6px;background-image:linear-gradient(180deg,rgba(255,255,255,.07) 0 1px,transparent 1px,transparent 55%,rgba(255,255,255,.025)),linear-gradient(#000,#000),linear-gradient(180deg,#E9E1CF 0%,#B9B0A0 38%,#8C8474 62%,#CFC6B2 100%);background-origin:border-box,border-box,border-box;background-clip:padding-box,padding-box,border-box;background-color:#000}html.light .kpm-nixie-tube{background:radial-gradient(70% 80% at 50% 50%,rgba(255,150,40,.16),transparent 72%)}';
/* B — DAYLIGHT GLASS: the instrument takes the light material itself. A frosted cream tube instead of black glass, the
   digit in DENSE dark amber (#9A4200, the same inversion --gold makes in light mode: on a pale plate the only way to
   stand off is darker), a faint warm disc behind the lit digit, the unlit reel a whisper. Dark mode unchanged. */
export const NX_B = 'html.light .kpm-nixie{--nixie-ink:#9A4200;background-color:#F3EEE2;background-image:linear-gradient(180deg,rgba(255,255,255,.6) 0 1px,transparent 1px,transparent 55%,rgba(60,40,10,.05));border:1px solid #6E6A64}html.light .kpm-nixie-tube{background:radial-gradient(70% 80% at 50% 50%,rgba(154,66,0,.10),transparent 72%)}html.light .kpm-nixie-reel>span{color:rgba(154,66,0,.16)}html.light .kpm-nixie-reel>span.lit{color:#9A4200;background:radial-gradient(55% 62% at 50% 50%,rgba(154,66,0,.18),transparent 72%)}';
/* C — THE ODOMETER: a mechanical counter for daylight. Each digit a cream flap tile with the ink-dark digit and the
   split hairline across its middle; the tiles sit in a dark slate frame. Nothing is lit, so nothing can look unlit;
   the reel still rolls, and reads as flaps turning. Dark mode unchanged. */
export const NX_C = 'html.light .kpm-nixie{--nixie-ink:#131211;background-color:#1B1917;background-image:none;border:1px solid #46423C;border-radius:5px;gap:2px;padding:3px}html.light .kpm-nixie-sign{color:#F7F3E9}html.light .kpm-nixie-tube{border-radius:2px;background:linear-gradient(180deg,#FBF7EE 0 50%,#EFE8D8 50%),none;background-image:linear-gradient(180deg,transparent calc(50% - .5px),#8C8474 calc(50% - .5px),#8C8474 calc(50% + .5px),transparent calc(50% + .5px)),linear-gradient(180deg,#FBF7EE 0 50%,#EDE6D5 50%)}html.light .kpm-nixie-reel>span{color:rgba(19,18,17,.10)}html.light .kpm-nixie-reel>span.lit{color:#131211;background:none}';

/* 2026-09-22 14:40 — ROUND TWO, his "tbh nixie tube doesnt look natural compared to other number box right there ...
   we need something that is little bit special and not standardised". The DIFFERENCE figure leaves the glass and joins
   its three sibling plates' paper world, in both themes; the ink follows the plate's state (amber until sure, red for
   a confirmed difference - his rule). No shadow, no filter; the reel is hidden, a chosen look ships as a plain figure. */
/* A — THE STAMP: the verdict is stamped on the plate. A double-ruled rounded box, tilted 4°, the figure in the display
   face; the same family as the VERIFIED seal he liked on the night sheet. Lands with the seal's 320 ms when the number changes. */
export const ST_A = '.kpm-plate:has(.kpm-nixie) .kpm-nixie{--nixie-ink:var(--accent-ink);background:none;border:2px double var(--nixie-ink);border-radius:7px;padding:2px 9px 1px;gap:1px;margin-top:2px;transform:rotate(-4deg);font-size:26px;letter-spacing:.04em;font-weight:900}.kpm-plate:has(.kpm-nixie) .kpm-nixie-tube{background:none}.kpm-plate:has(.kpm-nixie) .kpm-nixie-reel>span{color:transparent;background:none}.kpm-plate:has(.kpm-nixie) .kpm-nixie-reel>span.lit{color:var(--nixie-ink);background:none}.kpm-plate:has(.kpm-nixie) .kpm-nixie-sign{color:var(--nixie-ink)}.kpm-plate.border-\\[var\\(--danger\\)\\] .kpm-nixie{--nixie-ink:var(--danger-ink)}';
/* B — THE ENGRAVED WELL: the figure cut INTO the plate. A recessed well (the plate's own inset tone, a dark band at its
   top edge drawn as a gradient, a light line at its bottom - no shadow), the figure 30 px in dense ink, the state as a
   3 px bar under it. The same material as the three plates, only deeper and bigger. */
export const ST_B = '.kpm-plate:has(.kpm-nixie) .kpm-nixie{--nixie-ink:var(--accent-ink);background-color:var(--inset);background-image:linear-gradient(180deg,rgba(0,0,0,.14),transparent 45%);border:1px solid var(--line-2);border-bottom:3px solid var(--nixie-ink);border-radius:4px;padding:3px 12px 2px;gap:1px;margin-top:2px;font-size:30px;letter-spacing:.02em;font-weight:900}.kpm-plate:has(.kpm-nixie) .kpm-nixie-tube{background:none}.kpm-plate:has(.kpm-nixie) .kpm-nixie-reel>span{color:transparent;background:none}.kpm-plate:has(.kpm-nixie) .kpm-nixie-reel>span.lit{color:var(--nixie-ink);background:none}.kpm-plate:has(.kpm-nixie) .kpm-nixie-sign{color:var(--nixie-ink)}.kpm-plate.border-\\[var\\(--danger\\)\\] .kpm-nixie{--nixie-ink:var(--danger-ink)}';
/* C — THE WRITTEN VERDICT: the foreman writes the shortfall on the printed sheet by hand. A marker script (Caveat, loaded
   from Google Fonts for the mock; shipping it means bundling ~40 KB so the phone has it offline), tilted 3°, the state ink. */
export const ST_C = '@import url("https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap");.kpm-plate:has(.kpm-nixie) .kpm-nixie{--nixie-ink:var(--accent-ink);background:none;border:0;padding:0 6px;gap:0;margin-top:0;transform:rotate(-3deg);font-family:Caveat,cursive;font-size:38px;font-weight:700;letter-spacing:0}.kpm-plate:has(.kpm-nixie) .kpm-nixie-tube{width:.5em;height:1.05em}.kpm-plate:has(.kpm-nixie) .kpm-nixie-reel{translate:0 calc(var(--i,0) * -1.05em)}.kpm-plate:has(.kpm-nixie) .kpm-nixie-reel>span{height:1.05em;line-height:1.05em}.kpm-plate:has(.kpm-nixie) .kpm-nixie-tube{background:none}.kpm-plate:has(.kpm-nixie) .kpm-nixie-reel>span{color:transparent;background:none}.kpm-plate:has(.kpm-nixie) .kpm-nixie-reel>span.lit{color:var(--nixie-ink);background:none}.kpm-plate:has(.kpm-nixie) .kpm-nixie-sign{color:var(--nixie-ink)}.kpm-plate.border-\\[var\\(--danger\\)\\] .kpm-nixie{--nixie-ink:var(--danger-ink)}';
export const LOOKS = { pin: PIN, 'nx-a': NX_A, 'nx-b': NX_B, 'nx-c': NX_C, 'st-a': ST_A, 'st-b': ST_B, 'st-c': ST_C };
