# The one job

**Customers on the phone, round two — build his answers to the three boards (`cust2-boards.png`, sent 2026-09-18 14:11).** He came back on the Customers test with four asks in one message (verbatim): *"the find duplicate, data scrub, add new customer and import map button inside customer is still in a bad shape and needed redesign as well , and i can still move the customer page sideways which i dont want to, and i want u to hide delete and edit button somewhere with some animation just to make things little bit clearer and spacey and the press animation looks fine hold animation also looks fine but it is repetitive because it have similar animation like the ponder panel, try make the animation little bit different and unique but stay smooth and on theme"*. Open the session by reading his letters (Board 1 A/B, Board 2 A/B, Board 3 A/B); if he has not answered, ask once, do not build. Stock Opname (the sweep's next screen) waits behind this — its brief is intact further down under "The next screen after this".

**Why it costs him money:** he is tier 1, and the boss's Customers page is the one that moves sideways — the salesman's does not, which is why every earlier measurement missed it (the lab mounted a T5). A page that drags sideways on the boss's own phone is the first thing a paying customer's owner will see too.

## What was measured (375 inside the real shell, tier 1: lab `?shell&customers&admin`, 2026-09-18 14:03)

- **The sideways move** [certain]: `CustomerManager.jsx:1134` `<div className="flex justify-between items-center">` holds the `<h2>` title (`:1135`) AND `:1136` `{isAdmin && (` → `:1137` `<div className="flex gap-2">` with three gold buttons — Find Duplicates (`:1150`), Data Scrub (`:1159`), and the Import Map Marker (KML) `<label>` (`:1165`) — in one row that never wraps. At 375 the label's right edge is at 521 (146 px past the edge); the shell scroller's `scrollWidth` is 521 vs 375. Title squeezed to 152 px on two lines; the buttons 64 px tall from wrapped text. The T5 mount never renders this block.
- **DEL / EDIT on the folder rows**: `:1548` `{isAdmin && (<div className="flex gap-1" onClick={e => e.stopPropagation()}>` inside the row's first grid cell, DEL `:1550` (calls `handleDeleteFolder`) and EDIT `:1555` (`handleBulkRename`), 44 tall since a9822ff; the same block repeats for Kabupaten (`:1587`) and Kecamatan (`:1625`). On the shop cards (`:1653` `openDetail`) the header holds MAP `:1716`, EDIT `:1723`, DELETE `:1724` (`min-h-[44px] lg:min-h-0`).
- **The hold**: `theme.css:4412` `.kpm-key:active { translate: 0 2px; }` (the sink — "press animation looks fine") and `:4426` `.kpm-key:active .kpm-well::after { background: var(--amber) … }` (the folder icon's lamp lights amber — the SAME idea as the ponder pad's `.pp-lamp` / `.pp-key.pp-on .pp-lamp`, `src/ponder/pad.css:299-317`; his "repetitive"). `.kpm-hot` (`theme.css:1099-1114`) is the RE sweep + ink bar on hover, gated to real pointers.

## The candidates, as CSS he can open live (`tools/lab-looks.js`, delete each entry when it ships)

- `hdr-a` / `hdr-a-open`: the header `div:first-child` becomes `display:contents`, the root a flex column, so the order is title → ADD NEW CUSTOMER (gold `kpm-plate`) → ONE 44 px outline row "⚙ ADMIN TOOLS ▾" → search; open = the row's border amber, the three tools as full-width 44 px outline rows under it. `hdr-b`: the three as a 3-column grid of tiles (icon over name). Shipped labels are SHORT: FIND DUPLICATES / DATA SCRUB / IMPORT MAP (11 px), never "(KML)". Desk stays as today (`lg:` resets).
- `acts-a` / `acts-a-open`: DEL/EDIT hidden; a 44×44 "⋯" key at the row's right (`::before` in the look; a real `<button>` when built, `aria-expanded`); open = the ⋯ border amber and the group as a strip under the row (`grid-column: 1 / -1`, `border-top`, DEL `border-[var(--danger)] text-[var(--danger-ink)]`, EDIT plain, both 44). `acts-b` = the strip on a half-second hold (not recommended, said so).
- `hold-a`: a third background layer on `.kpm-key` — `linear-gradient(90deg, var(--amber), var(--amber))` at `left bottom`, `background-size: 0% 3px` → `100% 3px` on `:active`, 360 ms `cubic-bezier(.2,.8,.2,1)`; the lamp stays black. `hold-b`: the same trick on `.kpm-well` — `100% 0%` → `100% 100%` from the bottom, 300 ms, ink `--gold-ink` while full. Both are transitions on `background-size` (no shadow, no filter — audit G30), and Lite Mode's 0.001 s jump lands on the full state, which still reads.
- Lab: `&admin` on `?shell&customers` mounts tier 1; `&held` puts `lab-held` on the first `.kpm-key` so a look can draw the held state for a still. `.claude/launch.json` ponder-lab now runs with `--host`, so his phone opens the lab at `http://192.168.1.132:4190/tools/ponder-lab.html?…` (read the address off `preview_logs` `Network:` first).

## Build, once he answers

Classes with `lg:` resets on the header (`CustomerManager.jsx:1135-1170`): under lg the wrapper wraps, the three tools move under the gold bar into a `showTools` fold (`useState(false)`, a 44 px `kpm-btn`-style row with `aria-expanded`, the three as 44 px rows; the fold animates height + opacity 200 ms — Lite Mode strips the transition and the rows just appear). Desk: exactly today's row. The ⋯: one `showActs` state keyed by folder/card id, the strip rendered inside the row after the name (a `grid-column: 1 / -1` cell under lg; on the desk the buttons stay where they are). The hold: rules in theme.css after `.kpm-key.kpm-hot::after` (`:4414`), and `:4426`'s amber lamp becomes black on `:active` for `.kpm-key` (keep the hover rule as it is — the desk pointer can still light it, or drop it too if he picks A/B and says "everywhere"). Guards: header wrap + fold state + short labels; the ⋯ button on all three folder levels and the shop card; the background-size rule and the lamp staying black; every one written FIRST and red with the sources untouched. Then `npm run build; node src/config/integration.audit.mjs` (stop the lab first), re-measure at 375 (`shellSW` must be 375) and at 1280 (header row 64 tall, three gold buttons, DEL/EDIT inline), one SHIPPED board, commit, ✅ TEST in plain words.

Traps. (a) `.flex.gap-2` and `.flex.gap-1` match the TITLE `<h2>` and the DEL/EDIT BUTTONS as well as the groups (it cost two frames) — scope selectors and guards to `div.flex.gap-2` / `div.flex.gap-1`, or better, put a real class on the group. (b) The ⋯ must `stopPropagation` — the row's own `onClick` opens the folder. (c) `.kpm-hot::before` and `::after` are both taken (sweep, ink bar); the charge line has to be a background layer, not a pseudo-element. (d) `{/* */}` before the root element of `cond ? (` is a parse error — the selfcheck sweeps for it. (e) Bare inputs are white in dark mode; every new box carries surface tokens.

## Paste this to start the next session

```
/alucard
Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
Read his letters for the three Customers boards (`cust2-boards.png`: Board 1 A/B, Board 2 A/B, Board 3 A/B) and his EOD ✅ TEST (`84e102f`) before anything. No letters → ask once, build nothing.

1. Build exactly what he picked, with `lg:` resets so the desk at 1280 is pixel-identical: the boss's header (`CustomerManager.jsx:1134-1170`), the ⋯ strip on the folder rows (`:1548`, `:1587`, `:1625`) and the shop cards (`:1716-1724`), the hold in `src/styles/theme.css` after `:4414` (the lamp at `:4426` stays black on :active).
2. Guards first, red with the sources untouched → green. Stop the lab, `npm run build; node src/config/integration.audit.mjs`. Re-measure at 375 (`?shell&customers&admin`, shell scrollWidth must be 375) and 1280. One SHIPPED board. Commit. ✅ TEST in plain words. Delete the shipped `?look=` entries from `tools/lab-looks.js`.
3. Then the sweep resumes with Stock Opname — its brief is below under "The next screen after this".

Traps. Scope every selector and guard to `div.flex.gap-2` / `div.flex.gap-1` (the h2 and the buttons share those classes). The ⋯ stops propagation. The charge line is a background layer (both pseudo-elements are taken). No `{/* */}` before the root element in `? (`.
Rewrite this file with the next single job before closing.
```

## The next screen after this — Stock Opname on the phone (brief kept intact, promote when Customers round two ships)

`App.jsx:5068` `{activeTab === 'stock_opname' && (` → `:5069` `<StockOpnameView` with NO wrapper; lazy at `App.jsx:46`. Component `src/StockOpnameView.jsx:194` `({ inventory = [], transactions = [], db, storage, appId, user, userRole: liveRole, isAdmin, logAudit, triggerCapy, motorists = [], appSettings })` — 1737 lines; `:206` `userRole = liveRole || user?.userRole || 'AGENT'`; `:209` `canSeeExpectedCount(userRole)` (T3+ see the expected number, a T5 counts blind); `:222` `viewMode = isHighCommand ? 'monitor' : 'count'` — sweep the T5 COUNT flow first (`userRole="FIELD_OPERATIVE"`, `isAdmin={false}`, `user={{ uid: 'lab-t5', displayName: 'Lab Salesman', email: 'lab@example.com', location: 'MUNTILAN', userRole: 'FIELD_OPERATIVE' }}`), `&admin` for the monitor. The branch listener at `:231` runs only for `isAreaAdmin` and reads `…/branches/MUNTILAN/inventory` — a COLLECTION, so an ARRAY fixture keyed by the path tail (`FIXTURES['branches/MUNTILAN/inventory']`, stub `endsWith` at `tools/lab-firestore-stub.js:35`). `inventory={[...LAB_PRODUCTS, ...LAB_VAN_EXTRA]}`, `transactions={LAB_AGENT_TXNS}`, `motorists={LAB_MOTORISTS}`, `db={{}} appId="lab" storage={{}}`, `logAudit`/`triggerCapy` no-ops, `appSettings={{}}`. Add `q.has('opname')` before the `eod` branch in `ShellLab()`. Seen unmeasured: `:1582` a 40 px button at 10 px type. Same recipe: mount, measure at 375 both themes (controls under 44, text under 11, wider than 375, fixed-height boxes, `<table` with bare `min-w-[`), frames through `?look=`, no code before he answers.

## Shipped 2026-09-18 ~14:05 — EOD Setoran on the phone (his board 1 YES + board 2 B)

His words: "board 1 yes, board 2 B because it have more space for long product name". `EODCardDeck.jsx`: the deck is `relative mb-[33px] lg:mb-0 lg:h-[344px]` — on the phone as tall as the card on top, the cards behind `absolute … bottom-0 overflow-hidden [&>*]:invisible` (blank card backs, 11 px peeks), the card on top `relative`, the flying card `absolute inset-x-0 top-0` unclipped; the count rows `flex-wrap` with the name `basis-full` on its own line and a `w-24 h-11 ml-auto` box (96×44) + `w-12` unit on the right (`lg:` resets every one); both lists `lg:max-h-[…]` so nothing scrolls inside a card on the phone; Landed / Less / Not yet `min-h-11 lg:min-h-0`; the "Actually got" box `h-11 lg:h-auto`; names `lg:truncate`. Four 10 px labels → `text-[11px] lg:text-[10px]` (Step 1/2/3, the line under the title, the two waiting/closed lines). Left alone: the 8 px SEALED on the wax seal. Measured after at 375 (dark; light frame shot): deck 226 = Cash card, gap 33; card 3 rows one line each at 232 px, box 96×44, KARTON whole, list 333 = 333 (no inner scroll), nothing wider than 375, only SEALED under 11. Desk at 1280 unchanged: deck 344, cards absolute, buttons 29, box 74, list 152 max, labels 10. Guards 1615 (red 7 first + the new JSX-comment sweep proven red on a probe file), audit 722. Lab: `?shell&eod` (`&admin` for the review side, unmeasured), `?tab=type:<v>`; `tools/lab-looks.js` back to `pin` only. ✅ TEST owed on his phone (`https://192.168.1.132:4173`, packed build rebuilt): "open EOD Setoran as a salesman — under the Cash card no other card's row shows through, just blank card edges; count the cash, put it in the letter, then on the Transfer card the three buttons LANDED / LESS / NOT YET are easy to hit; on Goods returned all four products are on one screen, each name on its own line in full, a big count box under it on the right, and KARTON is spelled out whole; nothing slides sideways".

## Shipped 2026-09-18 11:11 — key caps, the stacked competitor table, the LED count (`832ea7c`)

His words: *"board 3 = B, board 4 =B, 5 = B, 6 = B make sure that the animation is clear and HD and
smooth ,just to let u now that sideways swipe is inconvenience for phone so make sure that most of
the segment doesnt have that"*. theme.css: `.kpm-key` (4 px edge on the `.kpm-key.kpm-hot` pair,
sinks 2 px, staggered rise-in), `.kpm-well` (lamp black → amber), `.kpm-stamp`, `.kpm-plate`,
`.kpm-led` + `.kpm-roll` (odometer; `--led-ink` fixed). CustomerManager: rows/cards `kpm-key
kpm-hot`, FOLDER `.kpm-btn`, competitor table stacked under lg, five boxes tokened + 44, map button
ink. AgentInventoryView: `RollingCount`. Guards 1606 (red 12), audit 722. Lab: `?shell&agent&tick`
rolls the count 10 → 15 → 10. ✅ TEST owed (above).

## Shipped 2026-09-18 09:38 — Agent Inventory on the phone (`8b9b3f9`) — CONFIRMED 10:40

His words: *"board 1 yes, board 2 B that shows "afterboard 1" when pressed"*. Under lg the fixed
`h-[850px]` box is gone (one scroller: root 1347 ≈ page 1363), header `p-3` / `gap-3`, Saleable /
Quarantine 44, names wrap (`lg:truncate`), eight 10 px labels 11 (`text-[11px] lg:text-[10px]`),
and the Projected Value box folds behind its 44 px title row (`showProjected`, seeded from the
width; "Show ▾" / "Hide ▴"; inert on the desk). Measured after at 375: header 424 → 294, first
product row 642 → 520; desk probed at 1280 unchanged (root 680, toggle 36, chips 10). Guards 1595
(red 8 first), audit 722. Lab `?shell&agent` (`b1c77d8`; stub learned document snapshots).
✅ TEST owed on his phone (`https://192.168.1.132:4173`, packed build rebuilt): *"open Agent
Inventory — the whole screen scrolls as one; PROJECTED VALUE is one line with SHOW, tap it and the
three rows open and it says HIDE; Saleable / Quarantine are easy to hit; a long product name shows
in full on two lines"*.

## Shipped 2026-09-17 10:16 — Customers on the phone (`a9822ff`)

His words: *"yes to all but on the customer directory i want the customer name to be
alphabetically in order so that its easier to find them, for the question that u ask i think just
let it be like that do not need to change anything"* and *"i want the textbox background to be
dark when use darkmode and light when use light mode because right now it is white inside dark mode
and it is too bright bro"*. Form folded behind `+ ADD NEW CUSTOMER` (48 px) under lg, Edit opens it,
save folds it; every box 44 with surface tokens; Auto-Find / My GPS a half each; folder rows;
shop cards 222 → 199; Edit / breadcrumb 44; shops A→Z (`localeCompare 'id'`). Guards 1587 (red 8
first), audit 722, desk at 1280 unchanged. Lab `?shell&customers` (`6c230a6`).
✅ TEST owed on his phone (`https://192.168.1.107:4173`, packed build rebuilt).

## Shipped 2026-09-17 — the Sales Terminal on the phone (`4ba6563`) and the vault press (`dfc2392`)

His pick on the boards: *"just change into B because it fit well and doesnt take a lot of space
and bigger button as well users need it, manifest also looks better since there is more space to
press and read yes"*. Picture 96 → 64 (p-1, 56 px target), − + 44, tabs/search 44, every sheet
control 44, labels 11 (unit labels 10, one row), the customer-bar button fills its bar. Guards 1574
(red 8 first), audit 722 (G7b re-pointed), desk probed at 1280 unchanged. Left alone: the admin
field-mode toggle (27 px) and six 8.5 px eyebrow labels in the customer brief.
Vault press: the security-profile read now starts when the gate is shown; "Checking…" + spinner
on the button while anything is left; guards 1579. Not seen by eye (behind Google sign-in).
✅ CONFIRMED by Aldi 09:05: *"t1 approve, t 2 approve, t3 i just tried to close the incognito and open it again after that i manual google login , master vault panel shows up enter password and it instantly let me in after press so i havent be able to see the processing animation tho"* — the wait is gone, so the spinner had nothing to show. Lab: `?shell&terminal`, `?grip`.

## Shipped 2026-09-16 20:29 — `c5c7ed3` the phone ribbon rests a quarter of the way down

His ask: *"25% from upper right as default location instead of just 50%"*. `BiohazardTheme.jsx:285`
default `Math.round(window.innerHeight * 0.25 - RIBBON_H / 2)`; a dragged spot (`kpm-ribbon-y`)
still wins. Guard 2 red → 1552/1552, audit 722, measured 137/812 in the pane. Packed build
rebuilt and serving on `https://192.168.1.107:4173`. Sample nota re-sent (`sample-nota.png`,
cream sheet on a dark ground) for the real-phone scan test.

## Shipped 2026-09-16 — the nota scanner finds the paper, squares it, and has a corner editor

`helpers.findPaper` (Otsu → largest bright blob → hull → best quad, null on sticker / L / full
frame) · `helpers.homography` · `helpers.warpQuad` (bilinear, ≤ 800 wide; one cycle of the corner
order = a 90° turn) · `helpers.loadNotaPhoto` (one decode at ≤ 1600, shared) ·
`scanNotaToBase64(file, { corners, turns })`: photo → findPaper → warpQuad → scanPixels →
deskewAngle → JPEG 0.5, old path when no sheet. `PhotoField`: SESUAIKAN → `CornerSheet` (dialog
language, 4×44 px pointer handles, ATAS marks the top edge, PUTAR 90°, BATAL, PAKAI → rescan →
`onFile(file, scan)`), asli / scan switch. Lab `?photo` is a tilted perspective sheet; `&edit`
opens the sheet. notaScan 22/22 (10 → 22), logicFixes 1547/1547 (17 red with the sources stashed),
audit 722/722. Drag, PUTAR, PAKAI exercised in the pane at a measured 375: output 378×311 →
321×407 after one turn. Timing on the PC: findPaper 8 ms, warpQuad 19 ms at 1600×1200.

✅ CONFIRMED by Aldi 2026-09-16 20:50: *"test 1 approve, nota looks align and good"* (the sample nota,
full screen on the PC, photographed at an angle). Phone URL `https://192.168.1.107:4173` (packed build;
the PC's address changes whenever the router hands out a new one — .143 → .131 → .107 in three days;
read it from the preview server's `Network:` line before writing it anywhere). Still owed: the
goods-photo preview test, ❓ the "bandung 1 / muntilan 1" tab.

## Shipped 2026-09-15 — Restock Vault on the phone, complete

`096ac05` tabs wrap · `289161a` bigger panel, hints gone, 44 px · `3bac5b7` notice box, button
row, nota scan A · `39dc277` scan levelled (±15°) · `5319aef` photo previews (`PhotoField`).
Tests 1–4 CONFIRMED by Aldi at 09:45. Lab: `?shell&places`, `?tab=`, `?nota-scan`, `?photo`.

## Shipped 2026-09-14 — `2af2dd9` — CONFIRMED by Aldi

The bell is on the phone screen. Owed from 2026-09-13: `2771374`, `d4bd41a`; from 2026-09-12:
`8ed215f`.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Promoted and parked behind the sweep

* **Lot tracking by production date — Master Vault + Regional Warehouse. MOCKED, not built.**
  His two answers: *"either FIVO or FEVO should be able to use as option"* (08:50) and *"make sure
  that the regional admin and the restock sender can choose which product with specific production
  date/batch to be sent or carried to the agent inventory"* (09:15). So: stock per batch at HQ and
  at each branch; every KIRIM line and every load-to-agent line carries a batch picker, the setting
  (FIFO oldest-first / FEFO nearest-expiry-first) pre-selects, the person can pick another; the
  surat jalan prints the date. Mock: `lot-mock.png` (scratchpad 2026-09-15). DECIDED 09:35: *"looks cool tbh u can add that lot
  tracking later"* — the mock is right, build AFTER the phone sweep. DECIDED 09:40: *"fivo or fevo doesnt do shit actually lol
  just add one of those or something and also this is should just work as recommendation and preselect
  the batch where actually the regional admin can manually choose from the selection tab"* — FIFO
  ONLY, no setting, no FEFO: the oldest production date is pre-selected as a recommendation and the
  sender picks any other batch from the list. Drop the Settings switch from the mock. Then 09:42: *"maybe just put FEVO or Manual selection just for
  ergonomics"* — so the picker itself carries a two-way control: OTOMATIS (tertua dulu — the app takes
  the oldest batch, one tap) / PILIH BATCH (the list). Plain words on screen, never the acronym
  (clear-terms rule); he may rename them. Facts: intake lines have `batchNo` (required,
  `RestockVaultView.jsx:493`), stock is one number (`:625` increment; engine `:371`). Touches:
  intake (productionDate required), Master Vault stock, Branch Warehouse stock, KIRIM, load to
  agent, surat jalan, Agent Inventory, the sale engine (money — two independent checks), Stock
  Opname, reports; migration = one "unknown batch" per product. Brainstorm §2 has the models.
* **PhotoField on the other photo boxes — one per screen AS THE SWEEP REACHES IT**, his
  "add preview on all photo attachment on this app": customer storefront `CustomerManager.jsx:1337`;
  sale proof `MerchantSalesView.jsx:2202`, NOO storefront `:2964` (⚠️ T4–T6 camera-only, no file
  input in the DOM — `284ea64`/`1857b97`, do not reintroduce a picker), `:1863`; product image
  `ResidentEvilInventory.jsx:297`; logos `SettingsView.jsx:412`, `:1238`; avatar/logo/border
  `AgentProfileView.jsx:895`, `:904`, `:1066`; face `App.jsx:4750`. Each keeps its own tier rule;
  `scan` only for documents (nota), never for goods, faces or logos.
* **Nota scanner, if his real-nota test shows a miss:** findPaper assumes the sheet is the BRIGHT
  class and the table darker. A white desk merges table and sheet → the quad fills the frame →
  null → old path (the editor still opens with the frame as the default corners). If that is what
  his phone shows, the next step is an edge-based finder (Sobel + the same hull/quad), not a
  threshold tweak. Corner precision is ± one sample step (≈ 5 px at 1600) — inside the sheet, so
  the warp loses a hair of margin, never a band of table.
* **Parked, his words:** *"i was thinking on redesign the method the regional admin fill the
  agent inventory but we'll decide first if this really needed or not in the app"* — not a job
  until he says so.
* **The fleet form's tier picker paints T3 for a value that is not an option.**
  `src/FleetCanvasManager.jsx:149-153` `defaultAgentState.userRole: 'AGENT'`; `:843` the tier
  `<select>` is `value={newAgent.userRole || 'AGENT'}`; `src/config/permissions.js:2-9` has no
  `'AGENT'` id, so the browser paints the first option (`AREA_ADMIN`, "T3: HQ SALES MANAGER")
  while the state keeps `'AGENT'`, which `:72` normalises to T5 at read time. Form shows T3, saves
  a T5. ❓ for Aldi: which tier should a new Sales Motorist get by default — T5 (today, hidden) or
  T6 (what the label says)? Diff `ROLE_PERMISSIONS[FIELD_OPERATIVE]` vs `[ROOKIE]` before
  describing the change. Do NOT delete `:72` — old records rely on it. Edit paths `:374`, `:389`.

### Still ship-blocking, and both are his call

* **Rank Config cross-tenant gap.** `artifacts/cello-inventory-manager/settings/{achievements,
  rpg_ranks}` is ONE document shared by every company. Rules coverage was fixed; the shared path was
  not. Safe for one customer, not two — between tobacco competitors that is a confidentiality breach,
  not a bug. **Pasal 10 ayat (3) of the contract draft promises per-customer separation, so this is a
  clause he cannot honestly sign twice until it is fixed.**
* **PBKDF2.** The SHA-256 master-password hash is unsalted and single-round. `crypto.subtle` already
  offers PBKDF2; a per-company salt and about 100k iterations turns a claim that invites inspection
  into one that survives it. Offered, never answered.

### Business track — CLOSED and PARKED, do not reopen

All prices in one place: `A-Brain/Wiki/Entities/KPM Price Sheet.md`. Rp 5 juta/bulan recommended at
25-30 users, **Aldi leans Rp 10 juta** as intent, floor Rp 2 juta, perpetual Rp 250 juta, copyright
**not for sale**, final PPh Rp 0. Legal research: `Brainstorm/2026-09-10_riset-hukum-menjual-kpm.md`.
Contract draft: `Brainstorm/2026-09-10_draft-13-pasal-kontrak-kpm.md`. His private brief:
<https://claude.ai/code/artifact/4fed138f-1639-4317-b41f-41bbf6613305>

### Rebuild sales totals — DONE, stop asking

Aldi pressed it 2026-09-09 and 2026-09-10. **Do not put this on a list again.**

### Phone — the lab instruments that exist now

* `?shell` — the app shell (top bar, ribbon). `?places` — Restock Vault. `?gudang` — branch
  warehouse. `?nota`, `?label`, `?scan`, `?perf`, `?plan`, `?minkirim`, `?toast`, `?nota-scan`,
  `?photo` (`&busy`, `&edit`).
* `?css=<rules>` on any mount — render a proposed change before writing it.
* `preview_start` ponder-lab → `resize_window` 375×812 → probe with `innerWidth` in the same call.
  Headless Chrome crops under ~518; an iframe wrapper does NOT work headless (the frames never
  finish loading) — shoot at 518 for the file, measure at 375 in the pane.

### Wording — cheap, each one read by a customer

The EOD verify confirm claiming "clears their inventory" on a stamps-only card, the EOD `MATCHES`
column showing a dash when the numbers are equal, the audit receipt printing `BAYAR : CASH` on an
audit that collected Rp 0.

### Closed — do not reopen

**Money.** A cash refund does not reduce omzet. A completed sale is a closed contract; a retur is the
salesman's private arrangement. Buyback is off for everyone including the owner; Exchange stays.
`A-Brain/Wiki/Concepts/A sale is a closed contract — no cash goes back.md`. Not a bug.

**The sale-proof camera.** `284ea64` plus `1857b97`. T4 to T6 open a real `getUserMedia` view and
have no file input in the DOM in ANY build; T1 to T3 keep the picker. **Do not reintroduce a
build-mode escape hatch.** To let a tier attach a file, turn `photo_pick_from_gallery` ON in the
matrix, test, turn it off. Untouched on purpose: the GPS-bypass proof photo at
`MerchantSalesView.jsx:1863` and the NOO storefront photo at `:2964`.

**What "low" means.** Settled 2026-08-25, adopted everywhere 2026-09-12. Own MIN. ALERT (Bks) if
set, else the company default (qty + unit, default 3 Bal) converted per product. Blank means "use
the company default". `A-Brain/Wiki/Entities/What Counts As Low.md`.

### Appearance — deferred on purpose, last

About 180 blue and green Tailwind classes in app UI: `MapMissionControl.jsx` 58,
`FleetCanvasManager.jsx` 50, `JourneyView.jsx` 33, `ConsignmentFinanceView.jsx` 33. Receipt and
surat-jalan blues are legal.

### Still owed from earlier sessions

Round 7 Section D of `MANUAL_TEST_CHECKLIST.md` has never been run. C4 needs a second BANDUNG account.
`cdaabc7`, `967e447`, `83f5041` are unverified by eye. Bug 3, the geofence bypass routing, is still
unanswered — the GPS-bypass approvals were among the nine paths `da71cbd` re-routed, so re-check
before treating it as open.

</details>
