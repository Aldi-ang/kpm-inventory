# The one job

**The Agent Inventory screen on the phone — the sweep moves on.** Customers is DONE on the phone
(`a9822ff`, his three YES + A→Z + theme-coloured boxes, 2026-09-17 10:16; ✅ TEST owed on his
phone). The sweep order he set on 2026-09-15: Sales Terminal ✓ → Customers ✓ → **Agent
Inventory** → EOD Setoran → Stock Opname → Journey Plan → Sampling → Agent Profile. Same method,
one morning per screen: mount in the lab, measure at 375 in the real shell, propose as frames,
build what he picks.

⚠️ SESSION CLOSED 2026-09-17 10:22 at his *"create notes and prompt after this i will continue
later"*. **The next session opens with his test result of Customers (`a9822ff`) — read the reply
before the job:** ✅ on `https://192.168.1.107:4173`, Customers tab: the form folded behind
`+ ADD NEW CUSTOMER`, search and shops first, shops A→Z inside a folder, Edit opens the form filled,
boxes dark in dark mode. If he reports a miss, fix that first; the packed build on `:4173` was left
running (if it is down, `preview_start kpm-preview` and read the address off its `Network:` line).
Plan quota at close: 5-hour window 78 % used (resets ~12:00 WIB), weekly 39 %.

Why it costs him money: this is the salesman's own stock on his phone — what is in the van and
what he can sell. Never measured at 375 inside the shell after the `p-2` cut.

## The mount (exact, read from the live files 2026-09-17 10:17)

`App.jsx:4252` `{activeTab === 'agent_inventory' && (` → `:4253` `<AgentInventoryView` with NO
wrapper — a direct child of the shell's `biohazard-content`, like Customers. Lazy-loaded at
`App.jsx:49`. Component `src/AgentInventoryView.jsx:24`:
`({ db, appId, userId, agentProfileId, inventory = [], transactions = [], samplings = [], user, motorists = [], previewing = null })`.
App passes `db, appId, userId, agentProfileId, inventory, transactions, samplings, user, motorists,
previewing`. In `tools/ponder-lab.jsx` `ShellLab()` add `q.has('agent')` before the `customers`
branch (that block is the pattern); mount as T5 with `LAB_PRODUCTS` (they carry the pack sizes),
`LAB_MOTORISTS` (one of them must be the lab user's motorist — read what the screen keys on:
`agentProfileId` vs `user.email`), `transactions=[]`, `samplings=[]`, `db={{}}` so listeners
resolve empty through the stub (add a `FIXTURES[...]` if the shelf needs a loaded-stock document
to show anything — check what the screen reads before deciding). `?tab=` presses buttons by label
and, since `6c230a6`, `cursor-pointer` cards when no button carries the label.

## How to measure and propose — the recipe is settled, do not re-derive it

`preview_start ponder-lab` → `resize_window` 375×812 → `?shell&agent` → the probe reads
`innerWidth` in the SAME call as every rect; both themes; list every control under 44, every text
under 10 px, anything wider than 375, the row height. Headless PNG at 518 with the
`#root{width:375px}` pin. Boards: TODAY beside each fix through `?css=`, a YES/NO or a letter per
board, recommended one marked; three boards was the right number for Customers. No code before he
answers. Then classes with `lg:` resets, element-scoped guards red → green, `npm run build; node
src/config/integration.audit.mjs` (rebuild BEFORE the audit if the audit file changed), re-measure
at 375 and 1280, frames, commit, ✅ TEST line.

**Traps.** (a) `index.css` `button:has(> svg:only-child)` forces inline-flex + 44 px on any button
whose only ELEMENT child is an icon — text nodes do not count — it beat `lg:hidden` on the Customers
button until the label became a `<span>`. (b) Inputs with no `bg-` class are white in dark mode
(his 10:05 complaint); use `bg-[var(--inset)]` on a raised card, `bg-[var(--raised)]` inside an
inset block, `text-[var(--ink)]` always. (c) `code()` in the selfcheck strips block-comment spans
that can swallow real code — test the raw `read(...)` when a regex misses. (d) The lab restores a
localStorage draft on the terminal — a pre-filled state is that, not a bug. (e) Every frame at a
MEASURED 375 inside the shell; a 518 frame without the pin re-lays-out and hides the wrap.

---

## Paste this to start the next session

> /alucard
>
> Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
>
> **The Agent Inventory screen on the phone. Build the lab mount first, then look, then propose —
> never fix from a description.**
> 1. `tools/ponder-lab.jsx`: add `?shell&agent` to `ShellLab()` next to the `customers` branch.
>    `App.jsx:4253` mounts `<AgentInventoryView` (`src/AgentInventoryView.jsx:24`) with NO wrapper.
>    Mount it as T5 with the lab fixtures; read what the screen keys on (agentProfileId vs email)
>    before choosing the fixture motorist.
> 2. Pane: `resize_window` 375×812, `innerWidth` in the same probe as every rect, both themes.
>    Measure every control under 44, every text under 10 px, anything wider than 375, the row
>    height. Headless PNG at 518 with the `#root{width:375px}` pin.
> 3. Reply as FRAMES with captions — TODAY beside each fix through `?css=` — YES/NO per board,
>    recommended marked. No code before he answers. When he answers: classes with `lg:` resets,
>    guards red → green, build + audit, re-measure at 375 and 1280, frames, commit, ✅ TEST.
>
> **Traps.** `button:has(> svg:only-child)` in index.css beats `lg:hidden` — put button text in a
> span. Bare inputs are white in dark mode — surface tokens on every box. `code()` in the selfcheck
> can swallow real code — test the raw file when a regex misses. Every frame at a MEASURED 375.
>
> Rewrite this file with the next single job before closing.

---

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
