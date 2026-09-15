# The one job

**The nota scanner finds the paper, squares it, and lets the user fix the corners.** Aldi,
2026-09-15 10:15, with a phone screenshot of the first real scan (the sample nota photographed
off his PC screen, ~40° crooked, in perspective — the scan was black-and-white but still
crooked, and there was nothing to press on the preview): *"is it possible that u make the scanner
automatically align and make sure the receipt to be square and 2D like in plain paper … also
there is no pressable or interaction button on the preview photo or maybe the edit button like
camscanner have"*. Yes. This is option B of the brainstorm, in pure JS, no OpenCV.

Why the 10:14 scan stayed crooked: `helpers.deskewAngle` only looks ±15°, and a photo taken at
40° in perspective is not a rotation at all — it needs the four corners of the paper and a
perspective warp. Once the paper is warped flat, the dark band around its edge (the table) is
gone too, because the output is the paper only.

⚠️ Before this job: he still owes ✅ TEST of the goods-photo preview, ❓ which tab shows the tiny
"bandung 1 / muntilan 1" text, ❓ a 375 frame of the Sales Terminal. The phone sweep (Sales
Terminal next) resumes after this job. Phone URL: `https://192.168.1.131:4173` (the packed build,
fast) — `:5173` is the dev server and crawls on the phone.

---

## Paste this to start the next session

> /alucard
>
> Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
>
> **Build, in `src/utils/helpers.js` beside `scanPixels` / `deskewAngle` / `scanNotaToBase64`
> (helpers.js:~340–450), pure and node-testable, in this order:**
> 1. `findPaper(data, w, h)` → the four corners `[tl, tr, br, bl]` or `null`. On the ORIGINAL
>    photo (sampled down to ~320 wide): grayscale, Otsu threshold (paper is the bright class),
>    largest connected bright component (BFS on the small image), its convex hull (monotone
>    chain), hull reduced to ≤ 24 points, then the 4 hull points with the largest quadrilateral
>    area (brute force over ≤ 24C4 = 10,626 combos — cheap), ordered by angle around the centroid,
>    scaled back to full size. Return `null` when the component is under 15% of the frame or the
>    quad is under 60% of the hull's area (a cluttered background — fall back to the old path).
> 2. `warpQuad(data, w, h, corners)` → `{ data, width, height }` of the paper only. Output size:
>    width = mean of top and bottom edge lengths, height = mean of left and right, capped at 800
>    wide. Homography from the unit rectangle to the quad (the 8-unknown solve, 3×3 matrix), then
>    for every output pixel the inverse-mapped source point with bilinear sampling. ~480k pixels
>    at 800×600, well under a second on a phone.
> 3. In `scanNotaToBase64`: photo → `findPaper` → (if found) `warpQuad` → `scanPixels` →
>    `deskewAngle` (now only a residual) → JPEG 0.5. If not found: today's path unchanged.
>    ⚠️ TRAP: run `scanPixels` AFTER the warp, never before — the scan paints the table black and
>    the paper white with a dark halo, which is exactly what Otsu must not see.
> 4. `src/config/notaScan.selfcheck.mjs` (10 checks now): add a synthetic photo with a bright
>    quad drawn at four known corners on a dark ground → `findPaper` returns them within 3 px in
>    the right order; `warpQuad` of a quad whose text lines run diagonal gives an output whose
>    `deskewAngle` is within 1°; a frame with no bright quad returns `null`. Red before, green after.
>
> **Then the editor, in `src/components/PhotoField.jsx`** (the one photo box, shipped `5319aef`):
> a **SESUAIKAN** button beside GANTI / HAPUS when `scan` is on. It opens a full-screen sheet
> (the app's dialog language — `ConfirmGate.jsx` is the dialog host, never `window.confirm`) with
> the ORIGINAL photo, the four found corners as draggable handles (pointer events, `touch-action:
> none`, 44 px targets), a PUTAR 90° button, and PAKAI / BATAL. PAKAI re-runs warp+scan with the
> hand-set corners. Also a small "asli / scan" toggle under the preview so he can compare. Render
> it in the lab: `?photo` mounts the box with a real File drawn on a canvas (`tools/ponder-lab.jsx`
> `PhotoLab`); add `&edit` to open the sheet, and make the synthetic photo a TILTED, PERSPECTIVE
> quad (draw the nota on a canvas, then `warpQuad` it the other way onto a dark ground) so the
> picture proves the round trip. Headless: `--window-size=420,900 --virtual-time-budget=30000`.
> Send the PNG. Guards: extend section A PICKED PHOTO IS SHOWN… in `logicFixes.selfcheck.mjs`
> (SESUAIKAN present, sheet uses no native dialog, corners handed to warpQuad); `npm run build;
> node src/config/integration.audit.mjs` (722), `graphify update .`, commit.
>
> ⚠️ TRAPS: (a) the photo the box receives is already upright from the camera's orientation tag —
> do not rotate it again from EXIF. (b) The goods photo (`Bukti foto barang`) is a photo of boxes:
> `scan` stays off there, no warp. (c) Lite Mode strips animation, never the editor. (d) T4–T6
> take the nota with a real camera and no file input — the editor must work on a fresh capture
> too. (e) Keep `receiptScan` handed back through `onFile(file, scan)` so Save does not rescan.
>
> Rewrite this file with the next single job before closing.

---

## Shipped 2026-09-15 — Restock Vault on the phone, complete

`096ac05` tabs wrap · `289161a` bigger panel, hints gone, 44 px · `3bac5b7` notice box, button
row, nota scan A · `39dc277` scan levelled (±15°) · `5319aef` photo previews (`PhotoField`).
Tests 1–4 CONFIRMED by Aldi at 09:45; test 5 (scan) produced the screenshot that opened the job
above. logicFixes 1525/1525, audit 722/722. Lab: `?shell&places`, `?tab=`, `?nota-scan`, `?photo`.

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
  warehouse. `?nota`, `?label`, `?scan`, `?perf`, `?plan`, `?minkirim`, `?toast`.
* `?css=<rules>` on any mount — render a proposed change before writing it.
* `preview_start` ponder-lab → `resize_window` 375×812 → probe with `innerWidth` in the same call.
  Headless Chrome crops under ~518; use an iframe wrapper for a 375 PNG.

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
`MerchantSalesView.jsx:1839` and the NOO storefront photo at `:2914`.

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
