# The one job

**The Sales Terminal on the phone — build what he picked.** The measuring is DONE (2026-09-17
08:10, lab `dbc0787`, vault `dc3c29a`): the terminal was mounted in the real shell at innerWidth
375 (`?shell&terminal`), every control was measured in both themes, and two boards went to him —
`st-wares.png` (the wares row: A or B) and `st-sheet.png` (the manifest sheet: YES or NO). **His
answer is not in this file. Read his reply first; if it is not there, re-send the two boards and
ask again — do not build without the letter.** The frames were rendered through `?css=`; the exact
rules that rendered them are below, and they are the trial the audit lesson demands — the build is
moving them from `?css=` into the JSX classes so a guard can pin them.

Why it costs him money: a salesman sells from this screen all day on a phone; the − / + he taps for
every ware is 32 px, the unit boxes in the cart are 20 px with 8 px labels, the unit and tier
pickers are 17 px. Every miss is a sale typed twice.

## What measured (375, dark and light, same numbers — the table is in the brainstorm note)

− / + steppers 32×32 (`MerchantSalesView.jsx:2521` / `:2526`, `w-8 h-8`, the comment above them
already admits 32 is under 44) · name column 98 px, "CELLO GREEN 16" wraps (`:2474`, `line-clamp-2`)
· ALL/MISC 34 tall @10 px (`:2286`) · search 35 (`:2290`) · customer-bar button 16 tall in a 52 bar
(`:1655`, and its "Customer" label 9 px `:1656`) · SALE/RETUR 27 @10 px (`:1741`) · customer box 33
(`:1808`) · payment select 32 (`:1906`) · unit boxes 32×20 @8 px (`:1967`–`:1977`) · qty input 25,
unit/tier selects 17 (`:1999`, `:2003`–`:2004`) · camera button 32 (`:2211`) · picker DONE 28
(`:1690`) · EXAMINE 9 px (`:692`). Fine: grip/bar 52, SIGN MANIFEST 47, camera close 44, picker
rows 45, scrollWidth 375, no file input in the T4–T6 camera view.

## The rules that rendered the boards (phone only — every one under the terminal's own `lg` line)

**Wares A (recommended — row stays 99, name one line, − + 44, picture 96 kept):**
```css
@media (max-width:1023px){
.product-card > .flex-1.min-w-0{display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto;align-items:end;column-gap:8px;row-gap:2px}
.product-card > .flex-1.min-w-0 > .flex-1.min-w-0{display:contents}
.product-card h4{grid-column:1 / -1;-webkit-line-clamp:1;font-size:13px;align-self:start}
.product-card h4 + div{grid-column:1;grid-row:2;margin-top:0}
.product-card .shrink-0.mt-1{grid-column:2;grid-row:2;margin-top:0;gap:10px}
.product-card .shrink-0.mt-1 > button{width:44px;height:44px;font-size:22px}
.product-card .shrink-0.mt-1 > span{width:32px;font-size:16px}
.scrollbar-hide > button{min-height:44px;font-size:11px}
input[placeholder="SEARCH WARES..."]{min-height:44px;font-size:13px}
input[placeholder="SEARCH WARES..."] ~ svg{top:14px}
.product-card span.text-\[9px\]{font-size:11px}
}
```
Measured with it: card 327×99, h4 220×16 one line, − + 44×44 at x 212 / 308, EXAMINE 80×80,
tabs 61×44 / 69×44, search 335×44.

**Wares B (picture 96 → 64, − + 44 beside the name; row 68–90, long names still wrap):** the same
tabs/search/EXAMINE lines plus `.product-card > .w-24{width:64px;height:64px}`,
`.product-card .shrink-0.mt-1{gap:4px}`, the same 44 px button rule, `> span{width:26px;font-size:15px}`.

**Sheet YES (every control 44, labels 11, unit labels 10 so the four boxes stay on one row):**
```css
@media (max-width:1023px){
div[style*="drawer-h"] .text-\[10px\]{font-size:11px}
div[style*="drawer-h"] .text-\[9px\]{font-size:11px}
div[style*="drawer-h"] em.text-\[8px\]{font-size:10px;letter-spacing:.04em}
div[style*="drawer-h"] button.flex-1.py-1\.5{min-height:44px}
div[style*="drawer-h"] button.w-full.border-dashed{min-height:44px;font-size:13px}
div[style*="drawer-h"] select.w-full{min-height:44px;font-size:13px}
div[style*="drawer-h"] select.bg-transparent{min-height:44px;font-size:14px}
div[style*="drawer-h"] input[type=number]{min-height:44px;font-size:16px}
div[style*="drawer-h"] span.px-1\.5.py-1.rounded{height:44px;padding:0 4px;gap:2px}
div[style*="drawer-h"] span.px-1\.5.py-1.rounded > input{width:28px;height:44px;font-size:16px}
.cursor-grab > button{min-height:44px;display:flex;flex-direction:column;justify-content:center}
.manifest-dropdown-area button.shrink-0.px-3{min-height:44px;font-size:11px}
}
```
Measured with it: zero controls under 44 in the drawer (the line-delete X is 43, left alone), zero
text under 10 px, the four unit boxes on one row. `min-height:44px` on the inputs measured 43 in
the pane (border box) — write the class so the box is 44, and read it back.

## How to build it (his letter decides which blocks)

1. Move each rule into the JSX class on the line named above, phone-first Tailwind with the `lg:`
   value restored (e.g. `w-11 h-11 lg:w-8 lg:h-8` is WRONG — the steppers are phone-only already,
   so just `w-11 h-11`; the h4 becomes `line-clamp-1 lg:line-clamp-2`; the text column's
   `flex flex-row lg:flex-col` becomes `grid grid-cols-[1fr_auto] lg:flex lg:flex-col` with the name
   block `contents lg:flex lg:flex-col` — check `lg:` on the desk at 1280 in the pane: EVERY number
   there must stay). Do NOT add a stylesheet; the audit greps classes.
2. One guard in `src/config/logicFixes.selfcheck.mjs`, scoped to the element (the 2026-08-18
   lesson): the stepper buttons carry `w-11 h-11`; the unit-box `em` no longer says `text-[8px]`.
   Trial it red first (stash the source), then green.
3. `preview_start ponder-lab` → `resize_window` 375×812 → `?shell&terminal` and `&grip` — re-run the
   probe (innerWidth in the same call), both themes; then `?shell&terminal` at the desktop preset
   to prove the desk did not move. `npm run build; node src/config/integration.audit.mjs`.
4. Frames of the shipped result for the reply, then ✅ TEST on his phone at the packed-build address
   (read it off `preview_logs` `Network:` — it changes).

**Traps.** (a) The T4–T6 camera has no file input in the DOM — `galleryOk` at `:254` decides; never
add a picker for T4–T6. (b) The admin field-mode toggle stays inside the wares column (`App.jsx:4899`
comment). (c) Nothing here touches money — a cash refund never reduces omzet, Buyback stays off.
(d) `?css=` proves the LOOK only; the pane at 375 is the number, headless is 518 wide unless the
`#root{width:375px}` pin from `Looking at the App` is in the URL. (e) The lab keeps a DRAFT in
localStorage (a restored cart, a chosen shop) — a frame with "TOKO BERKAH JAYA" already chosen is
that draft, not a bug. (f) The customer bar and the grip share `.cursor-grab`; the bar's tap is a
no-op on purpose.

---

## Paste this to start the next session

> /alucard
>
> Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
>
> **Read my reply for the two answers first: a letter for board 1 (the wares row, A or B) and
> YES/NO for board 2 (the manifest sheet). If they are not there, re-send `st-wares.png` and
> `st-sheet.png` (regenerate through `?shell&terminal` + `?css=` with the rules in the file) and
> ask again. Do not build without them.**
>
> Then build exactly what was picked, in `src/MerchantSalesView.jsx` at the lines the file names:
> the `?css=` rules become Tailwind classes on those elements (phone-first, `lg:` restored so the
> desk keeps every number), one element-scoped guard in `src/config/logicFixes.selfcheck.mjs`
> trialled red then green, re-measure at 375 in the pane (`innerWidth` in the same probe, both
> themes, `&grip` for the sheet), the desk at the desktop preset, `npm run build; node
> src/config/integration.audit.mjs`, frames of the result, commit, then a ✅ TEST line for his phone.
>
> **Traps.** T4–T6 camera never gets a file picker (`galleryOk`, `:254`). The field-mode toggle stays
> in the wares column. Nothing touches the money engine. The pane at 375 is the number; a headless
> frame is 518 wide unless pinned. The lab restores a localStorage draft — a pre-chosen shop is
> that, not a bug.
>
> Rewrite this file with the next single job before closing.

---

## Measured 2026-09-17 — the Sales Terminal at 375 (lab `dbc0787`, no product change)

`?shell&terminal` + `?grip` + `?tab=`; the table and both boards are in `A-Brain/Brainstorm/2026-09-17_sales-terminal-di-hp.md`. Owed: his letter and YES/NO.

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
