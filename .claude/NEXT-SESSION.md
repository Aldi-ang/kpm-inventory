# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-09-01 10:15 WIB. 688/688 audit · 970/970 selfcheck. Branch `phase0-solid-ground`.**

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

## THE ONE JOB — G1 + G2: the batch number dies at the HQ door

**The relabelling job that stood here is CLOSED, not done.** Aldi, 2026-09-01: *"leave it for now,
i can just strike words that i dont like"*. Do not start it, and do not bring him a label list — he
will name the words he objects to when he meets them. The Restock Vault stays mixed-language on his
say-so.

**This is the money item, and his own standing rule is that money jumps the queue.**

`batchNo` is captured at factory intake and then thrown away. Confirmed today, `file:line`:

- `RestockVaultView.jsx:1944` — the input, one per line, on every intake row
- `RestockVaultView.jsx:455` — the completeness meter already requires it: *"batch tiap baris"*
- `RestockVaultView.jsx:656` — written onto the procurement, defaulting to `'UNASSIGNED'`
- `RestockVaultView.jsx:379` — carried into the landed-cost map

**And it stops there.** `branches/{loc}/inventory/{productId}` holds a single `stock` number, so the
moment goods leave the master vault the batch is gone. Two consequences, and they are his G1 and G2:

- **G1** — nothing downstream can say which batch a pack came from.
- **G2** — nothing knows which stock is OLD, so nothing can enforce **oldest ships first**, and
  nothing can warn that a batch has been sitting too long. **The threshold is a number only Aldi can
  set** — only he knows when a kretek starts tasting old. Ask before inventing one.

⚠️ **DO NOT PROMISE A SPECIFIC EDIT IN THIS BRIEF OR TO HIM UNTIL IT HAS BEEN TRIED.** A previous
handoff promised a "two-line token swap" that turned out to be 217 edits. Read how
`BranchWarehouseManager` and the fulfilment path actually write branch stock FIRST, then say what
the change is. The half that already exists is the capture; the work is the CARRYING.

⚠️ **`'UNASSIGNED'` is a real value, not a bug.** Old procurements have it. Whatever holds batches
downstream has to render it as "not recorded" rather than as a batch named UNASSIGNED.

**Pin it the way group 57 and D17 are pinned** — both went red before their fix, which is the only
reason their green means anything.

---

<details>
<summary>Queued — do not start these</summary>

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
