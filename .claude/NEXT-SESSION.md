# The one job

**The Sales Terminal on the phone — the sweep resumes.** The Restock Vault is done on the phone
(tests 1–4 confirmed 2026-09-15; the nota scanner now finds the paper, squares it and has a
SESUAIKAN corner editor, shipped 2026-09-16 — ✅ TEST owed from Aldi on a REAL nota). The next
screen in his sweep is the Sales Terminal (`src/MerchantSalesView.jsx`, mounted by `App.jsx:4856`
under `activeTab === 'sales'` in a bare `h-full w-full relative bg-[var(--duke-well-solid)]` box —
NOT the `p-6` / `border-4 p-4` wrappers the Restock Vault sits in). He owes a ❓ 375 frame of it
from his phone; do not wait for it — the lab can make the frame.

Why it costs him money: a salesman sells from this screen all day on a phone. Every control that
is under 44 px, every label that wraps to three lines, every button off the right edge is a sale
typed twice. Nothing about it has been measured at 375 since the redesign.

⚠️ Read his reply first — two answers were owed at 20:30 on 2026-09-16, and one of them is a
one-line job that goes BEFORE the terminal if he said yes: **`App.jsx:1103`** `handlePinLogin`
awaits `updateDoc(adminDocRef, { failedRecoveryAttempts: 0, lockoutStatus: "NONE" })` — a server
round trip — before `setIsUnlocking(true)` on `:1104`. The password is already verified by then
(`hashedInput === data.pin`, `:1101`), so the wait buys nothing; drop the `await`, keep a
`.catch` that reports (silence is a bug), start the animation at once. Trap: do NOT move the write
after the timeout or into the `setTimeout` — a phone that closes the tab mid-animation must still
reset the strike counter. The 8.5 s sequence itself (`VaultGate.jsx:51` `GATE_UNLOCK_MS`) is his
design; change it only if he said so. The other answer — which lockout panel was slow on the new
address, red *Access Denied* (`App.jsx:4494`, server said not registered) or amber *Can't Verify
You Yet* (`:4505`, could not check) — decides whether the sign-in listener's four serial
server-first reads (`App.jsx:2508–2540`) are the next job or nothing is.

---

## Paste this to start the next session

> /alucard
>
> Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
>
> **Build the lab mount first, then look, then propose — never fix from a description.**
> 1. `tools/ponder-lab.jsx`: add `?shell&terminal` to `ShellLab()` (`:571`; `?shell&places` at
>    `:607` is the pattern — wrappers copied VERBATIM from App.jsx, for the terminal that is only
>    `App.jsx:4874` `<div className="h-full w-full relative bg-[var(--duke-well-solid)]">`).
>    Mount `MerchantSalesView` (`src/MerchantSalesView.jsx:42`, its props list is on that line)
>    with the lab's fixture inventory, `userRole="FIELD_OPERATIVE"` (T5 — the salesman), a fixture
>    customer list, `onProcessSale` a no-op that records to `window.__sale`, `db`/`storage` from the
>    lab stubs. `?tab=` already presses buttons by label (`:578`) — use it to open the cart, the
>    payment step and the sale-proof camera view.
> 2. In the in-app Browser pane: `preview_start ponder-lab` → `resize_window` 375×812 → probe
>    `innerWidth` in the SAME call as every rectangle (a hidden pane reports 0 and still returns
>    plausible numbers). Both themes. Measure: every button under 44 px tall, every text under
>    10 px, anything wider than 375, the wares list row height, the cart drawer's reachable area.
>    Headless PNG for the reply: `--window-size=518,900` is the narrowest uncropped frame on this
>    machine (375 crops at 518 — the vault's "Looking at the App" page); the pane is the honest
>    375 instrument.
> 3. Reply as FRAMES with captions — TODAY beside each proposed fix rendered through `?css=` —
>    and let him rank them (his rule: show, don't tell). No code before he answers.
>
> **Traps.** (a) T4–T6 sale-proof camera is a real `getUserMedia` view with NO file input in the
> DOM (`284ea64`/`1857b97`); `MerchantSalesView.jsx:2202` `#txProof` is the T1–T3 picker — never
> reintroduce a picker for T4–T6. When PhotoField reaches this screen it keeps that rule and
> `scan` stays OFF (a sale proof is a photo of a shop, not a document). (b) The admin field-mode
> toggle lives INSIDE the wares column on purpose (`App.jsx:4857` comment) — do not lift it back
> into the shell. (c) A cash refund never reduces omzet; Buyback is off — nothing in the sweep
> touches the money engine. (d) Every frame must be at a MEASURED 375; the 2026-09-15 tabs
> proposal shipped three rows instead of two because the bare mount was 54 px wider than the shell.
>
> Rewrite this file with the next single job before closing.

---

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

✅ TEST OWED: a real nota on his phone — `https://192.168.1.107:4173` (packed build; the PC's address changes whenever the router hands out a new one — .143 → .131 → .107 in three days; read it from the preview server's `Network:` line (preview_logs kpm-preview) or `ipconfig` before writing it anywhere) — the
automatic scan, then SESUAIKAN on a photo where the finder missed. Also still owed: the
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
