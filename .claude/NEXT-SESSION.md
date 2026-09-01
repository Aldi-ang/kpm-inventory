# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-09-01 10:40 WIB. 688/688 audit · 970/970 selfcheck. Branch `phase0-solid-ground`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers.** The audit refuses to run against a stale `dist/`.

## To LOOK at a screen without signing in

```
npx vite build --config tools/ponder-lab.config.mjs; python -m http.server 4187 -d dist-ponderlab
```

`?gudang` the regional warehouse desk (`&tier=AREA_ADMIN` for the HQ case) · `?places` the Master
Vault desk · `?nota` the surat jalan · `?label` the printed shipment label · `?scan` the arrival
scanner · `?scene=regional-warehouse&step=N` the tutorial. Add `&light`, `&lite`, `&probe`.

**`?label&probe` is the barcode's only offline proof.** It asserts `modules = 11·S + 2` and
`bars = 3·S + 1` on the same S — true of every valid Code 128 regardless of pattern table. It is
proof of SHAPE, not of scannability; only a phone pointed at printed paper settles that.

⚠️ **The frame lies, and it lied again today.** A tutorial highlight looked like it spanned the
whole tab row; measured, it was 1107→1237 against a tab at 1113→1231 — the wide box was the stage
container. **Drive it with `element.click()` and read `getBoundingClientRect()`.**

---

## THE ONE JOB — make the scan a GATE in front of the blind count

His design, 2026-09-01, after seeing the barcode ship: *"after confirming with barcodes there will
be blind count panel that will appear to fill. so this barcode is just as a gate to confirm and
make sure that all the package is arrived and opening a blind count panel to be fill to make sure
that there is no missing item when shipment"*.

**What is built today is one step short of that.** The scan writes `arrivedAt` and the count panel
opens from its own separate button — so the two are independent, and a shipment can be counted
without anyone ever confirming the box is in the building. He wants them in sequence.

**The change, in `BranchWarehouseManager.jsx`:**

- `HITUNG & TERIMA BARANG` — inside `OrderTrackingModule`, gated today on
  `isFulfillableByTier3 = isAreaAdmin && order.status === 'IN_TRANSIT'`. It must also require
  `order.arrivedAt`.
- Before the scan, that button is replaced by a line saying the box has to be scanned in first, and
  pointing at **Scan barang sampai**. Never a dead or hidden button — silence is a bug here.
- After a successful scan the count panel should OPEN, not merely become available. The handler
  already has the matched record in hand; `setReceivingOrder(match)` is the whole step, and it makes
  the sequence he described feel like one action rather than two.

⚠️ **THE TYPED BOX IS WHAT MAKES A HARD GATE SAFE, AND IT IS NOT OPTIONAL.** With the gate in
place, anything that stops a scan stops goods being received at all — a cracked lens, a rained-on
label, a box already opened, an iPhone, a desktop. `ArrivalScanner` already offers the typed number
always rather than after a failure, and it lists the shipment numbers it is waiting for. **If the
gate lands, that fallback becomes load-bearing: do not "tidy" it into a fallback that only appears
after the camera fails.**

⚠️ **The scan confirms THE SHIPMENT, not every carton.** One label per delivery, so a delivery
arriving as three boxes with one missing still scans as arrived. That is correct and it is the
division of labour he described: the scan says the delivery showed up, **the blind count is what
catches what is missing inside it**. Do not try to make the barcode count boxes.

**Pin it in group 58**, which already bans the scan from crediting stock. The new assertion is the
other direction: the count cannot open without an arrival.

<details>
<summary>Queued — do not start these</summary>

- **G1 + G2, the money item.** `batchNo` captured at intake — `RestockVaultView.jsx:1944`, required
  by the completeness meter at `:455`, written at `:656` — and dies at the HQ door, because
  `branches/{loc}/inventory/{productId}` holds one `stock` number. So nothing knows which stock is
  old and nothing enforces oldest-ships-first. **The staleness threshold in days is a number only
  Aldi can set — ask, do not invent one.** Do not promise a specific edit before trying it.

- 🔴 **ALDI MUST PRINT ONE LABEL AND SCAN IT WITH HIS ANDROID PHONE.** Nothing in this repo can
  prove a barcode scans — `BarcodeDetector` is absent from every browser available here. Until he
  does that, the feature is verified in shape only. If it fails, the first thing to check is the
  printed size: the symbol needs its 12px quiet zone intact and must not be scaled down by the
  printer's "fit to page".
- **An arrived box that is never counted has no alert.** The 3-day flag now correctly ignores
  scanned-in boxes, but nothing yet warns that a box has sat ARRIVED and uncounted for days. That
  is a different alert from the one that existed, and it was deliberately not invented today.

- **The two colour faults, still app-wide.** **90 uncoloured `placeholder=` in 18 files** (falling
  back to the browser's `rgb(156,163,175)`, which is slate — 1,36:1 on the light well) and **~107
  bare `text-orange` used as ink in 15** (1,08:1). Fix shipped once in
  `BranchWarehouseManager.jsx`: `placeholder:text-ink-dim placeholder:opacity-100
  placeholder:italic`, and `text-orange` → `text-accent-ink`. **`border-orange` and `bg-orange`
  stay — those are edges.** ⚠️ A blind regex is wrong: a `text-orange` on a scrim is correct.
- **Relabelling the Master Vault desk to English.** CLOSED 2026-09-01 on his call — *"leave it for
  now, i can just strike words that i dont like"*. The measured mixture is in the vault note if it
  ever reopens; do not raise it unprompted.
- **Ponder caption static on phones, moving on PC.** DECIDED 2026-08-31, not built. Today
  `PonderOverlay.jsx` HIDES it: `if (boxW > W * 0.7) return null;`. The job is a third state.
- **The request card's status badge and button stack oddly at 375px** — pre-existing, `ml-auto`
  pushes the button to its own line. Not touched today.
- **Landed cost spreads shipping/labour/excise equally per UNIT** — a decision he has not been
  asked to confirm, not a bug.
- **G5** shrinkage · **G4** records joined by name not id · **Siapkan Pengiriman and the shipping
  modal, still untested by anyone.**
- **9router dies at login.** `start /min` throws the error away. A fix is drafted and **not
  applied** — it edits a file that runs at every login and he has not said yes.
- **The quota meter is FIXED, do not re-investigate.** Id `76c7cf4f-4c24-4984-aada-3aa91f53a148` in
  `C:/Users/ASUS/.claude/9router-claude-id.txt` — note the `.claude/`.

</details>

**No Firestore rules change is needed.** `places` falls through the `users/{bossUid}/{document=**}`
catch-all, and the new tier gate is app-side only. Nothing to deploy.

**Before you finish: rewrite this file with the next single job.**
