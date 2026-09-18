# The one job

**The EOD Setoran screen on the phone — the sweep moves on.** Agent Inventory is DONE on the
phone (`8b9b3f9`, his board 1 YES + board 2 B, 2026-09-18 09:38; ✅ TEST owed on his phone). The
sweep order he set on 2026-09-15: Sales Terminal ✓ → Customers ✓ → Agent Inventory ✓ → **EOD
Setoran** → Stock Opname → Journey Plan → Sampling → Agent Profile. Same method, one morning per
screen: mount in the lab, measure at 375 in the real shell, propose as frames, build what he picks.

⚠️ **Open the session by reading his test replies first.** Two ✅ TESTs are owed on
`https://192.168.1.132:4173` (the PC's address moved .107 → .132 on 2026-09-18 — read it off the
preview server's `Network:` line before writing it anywhere): Customers (`a9822ff`) and Agent
Inventory (`8b9b3f9`). If he reports a miss, fix that first. The packed build on `:4173` was left
running (if it is down, `preview_start kpm-preview`).

Why it costs him money: EOD Setoran is where the salesman hands in the day's cash and stock and the
boss verifies it — a money screen, used once a day by every salesman, on a phone in the evening.
Never measured at 375 inside the shell after the `p-2` cut.

## The mount (exact, read from the live files 2026-09-18 09:38)

`App.jsx:5021` `{activeTab === 'eod' && (` → `:5022` `<EODReconciliationView` with NO wrapper — a
direct child of the shell's `biohazard-content`, like Customers and Agent Inventory. Lazy-loaded at
`App.jsx:52`. Component `src/EODReconciliationView.jsx:44`:
`({ samplings = [], transactions = [], inventory = [], agentCanvas = [], agentProfileId, motorists = [], eodReports = [], user, appSettings, onSubmitEOD, onVerifyEOD, onResetEOD, isAdmin })`.
It keys on `agentProfileId` DIRECTLY (`:75` `effectiveId = isAdmin ? adminSetoranId : agentProfileId`,
`:94` `motorists.find(m => m.id === effectiveId)`) — no email sweep, so `agentProfileId="m2"` is
enough. `:47` `viewMode = isAdmin ? 'review' : 'submit'` — TWO screens in one file: the salesman's
SUBMIT flow (`isAdmin={false}`, uses `src/components/EODAgentFlow.jsx:22`) and the boss's REVIEW
table. Sweep the T5 submit flow first (that is the phone user); mount the review as a second flag
(`&admin`) only if there is time. `agentCanvas` is the van — reuse `FIXTURES['motorists/m2'].activeCanvas`
from the `?shell&agent` branch; `transactions={LAB_AGENT_TXNS}` gives it today's sales;
`eodReports=[]`; `onSubmitEOD` records to `window.__eod` and returns. It calls `confirmAction` from
ConfirmGate — the lab already mounts `ConfirmHost`. In `tools/ponder-lab.jsx` `ShellLab()` add
`q.has('eod')` before the `agent` branch (that block is the pattern). `?tab=` presses buttons by
label, then `cursor-pointer` cards when no button carries the label.

## How to measure and propose — the recipe is settled, do not re-derive it

`preview_start ponder-lab` → the lab page is **`http://localhost:4190/tools/ponder-lab.html`**
(the root `/` serves the real app and dies on the stub — a blank page with a
`connectFirestoreEmulator` error means the wrong URL, not a broken stub) → `resize_window` 375×812
→ `?shell&eod` → the probe reads `innerWidth` in the SAME call as every rect; both themes (`&light`);
list every control under 44, every text under 11, anything wider than 375, the row height, and
whether the component is a fixed-height box (Agent Inventory was `h-[850px]` → two scrollers).
Headless PNG at `--window-size=518,1100` with `#root{width:375px}` through `?css=`, cropped to 375
in the compose page; captions ABOVE the frames so a tall frame never cuts them. Boards: TODAY beside
each fix through `?css=`, YES/NO or a letter per board, recommended one marked; two boards was
enough for Agent Inventory. **The TODAY frame must show the defect the pane measured** — if the
defect sits below 812, shoot taller and say so in the caption. No code before he answers. Then
classes with `lg:` resets, element-scoped guards red (stash the source) → green, `npm run build;
node src/config/integration.audit.mjs` (stop the lab first, lesson 2026-09-07), re-measure at 375
and 1280, one SHIPPED board (dark / pressed / light), commit, ✅ TEST line **with the checklist
written out in plain words** — "✅ TEST Customers (a9822ff)" made him ask *"what is the test
customer u mean?"* (2026-09-18).

**Traps.** (a) `index.css` `button:has(> svg:only-child)` forces inline-flex + 44 px on any button
whose only ELEMENT child is an icon — put the label in a `<span>`. (b) Inputs with no `bg-` class
are white in dark mode; `bg-[var(--inset)]` on a raised card, `bg-[var(--raised)]` inside an inset
block, `text-[var(--ink)]` always — EOD has a cash-count input, check it. (c) `code()` in the
selfcheck strips block-comment spans; a negative guard (`!/h-\[850px\]/`) must run on `code(a)` or
your own explanatory comment fails it. (d) A `{/* JSX comment */}` placed before the root element
inside `return (` is a syntax error (two expressions) — use a plain `/* */` there. (e) The lab
stub's `onSnapshot` answers a DOCUMENT listener only when the fixture is a plain object
(`FIXTURES['motorists/m2']`), a collection when it is an array. (f) Every frame at a MEASURED 375
inside the shell; a 518 frame without the pin re-lays-out and hides the wrap. (g) Phone-only 11 px
type is `text-[11px] lg:text-[10px]` (the Customers precedent) so the desk stays pixel-identical.

---

## Paste this to start the next session

> /alucard
>
> Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
>
> **Read his two ✅ TEST replies (Customers `a9822ff`, Agent Inventory `8b9b3f9`) before anything;
> a miss is fixed first. Then the EOD Setoran screen on the phone. Build the lab mount first, then
> look, then propose — never fix from a description.**
> 1. `tools/ponder-lab.jsx`: add `?shell&eod` to `ShellLab()` before the `agent` branch.
>    `App.jsx:5022` mounts `<EODReconciliationView` (`src/EODReconciliationView.jsx:44`) with NO
>    wrapper; it keys on `agentProfileId` directly, so `"m2"` + `isAdmin={false}` is the T5 submit
>    flow. Reuse `FIXTURES['motorists/m2'].activeCanvas` as `agentCanvas`, `LAB_AGENT_TXNS` as
>    transactions, `onSubmitEOD` → `window.__eod`.
> 2. Pane at `http://localhost:4190/tools/ponder-lab.html`: `resize_window` 375×812, `innerWidth`
>    in the same probe as every rect, both themes. Measure every control under 44, every text under
>    11, anything wider than 375, the row height, any fixed-height box (two scrollers). Headless PNG
>    at 518×1100 with the `#root{width:375px}` pin, captions above the frames.
> 3. Reply as FRAMES with captions — TODAY beside each fix through `?css=` — YES/NO per board,
>    recommended marked. No code before he answers. When he answers: classes with `lg:` resets,
>    guards red (source stashed) → green, stop the lab, build + audit, re-measure at 375 and 1280,
>    one SHIPPED board, commit, ✅ TEST written out in plain words.
>
> **Traps.** `button:has(> svg:only-child)` beats `lg:hidden` — label in a span. Bare inputs are
> white in dark mode — surface tokens on every box (EOD has a cash input). A negative guard runs on
> `code(a)`, not the raw file, or your own comment fails it. No `{/* */}` before the root element in
> `return (`. Every frame at a MEASURED 375.
>
> Rewrite this file with the next single job before closing.

---

## Shipped 2026-09-18 09:38 — Agent Inventory on the phone (`8b9b3f9`)

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
