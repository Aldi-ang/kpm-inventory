# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-09-01 12:45 WIB. 691/691 audit · 970/970 selfcheck. Branch `phase0-solid-ground`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers.** The audit refuses to run against a stale `dist/`.

## To LOOK at a screen without signing in

```
npx vite build --config tools/ponder-lab.config.mjs; python -m http.server 4187 -d dist-ponderlab
```

**The lab's index is `/tools/ponder-lab.html`, not `/`** — the server root is a directory listing.
So: `http://localhost:4187/tools/ponder-lab.html?gudang&tier=AREA_ADMIN`.

`?gudang` the regional warehouse desk (`&tier=AREA_ADMIN` for the HQ case) · `?places` the Master
Vault desk · `?nota` the surat jalan · `?label` the printed shipment label · `?scan` the arrival
scanner · `?scene=regional-warehouse&step=N` the tutorial. Add `&light`, `&lite`, `&probe`.

⚠️ **The browser pane opens at a ZERO viewport and every measurement from it is a lie.** Measured
2026-09-01: a `w-full` button reported 44×92 until `resize_window` was called; at 1280 it was 825×46.
**Call `resize_window` before reading any rect.** Presence/absence of a conditional element is still
trustworthy at any size — layout numbers are not.

⚠️ **`innerText` is UPPERCASED by the CSS**, so a case-sensitive text probe returns a false negative
on this desk. And walking up from a button to find "its card" matches the whole list, because a high
ancestor contains every id — scope the card by *excluding* the other ids before clicking.

---

## THE ONE JOB — G1 + G2: `batchNo` dies at the HQ door, so nothing ships oldest-first

This is the money item, and his standing call already puts it ahead of the queue.

**What exists.** A batch number is captured at intake — `RestockVaultView.jsx:1944`, required by the
completeness meter at `:455`, written at `:656`. So the app knows which delivery a carton came from
at the moment it arrives.

**Where it dies.** `branches/{loc}/inventory/{productId}` holds one `stock` number. One number cannot
remember that 200 of the 500 packs are from March. So nothing knows which stock is old, nothing
enforces oldest-ships-first, and stale kretek can sit behind fresh stock forever without a single
figure in the app looking wrong.

🔴 **ASK HIM FIRST, BEFORE ANY CODE: how many days old is "stale"?** A kretek pack does not spoil on
a date the app can compute — the number is a business call and only he can set it. Ask it plainly:
*"After how many days should the app start warning that stock is old? 30, 60, 90?"* **Do not invent
a default and do not ship a threshold he has not said out loud.**

⚠️ **Do NOT promise a specific edit in advance.** The last handoff that named the shape of this fix
before trying it was wrong by two orders of magnitude. Read what is actually written at those three
line numbers first, then say what the change is.

⚠️ **Whatever shape it takes, it must not break the blind count.** The count is the only thing that
credits stock, and the gate that just shipped means the count is now the second half of a two-step
sequence. Anything that changes how stock is written has to keep group 58 green in both directions.

<details>
<summary>Queued — do not start these</summary>

- 🔴 **ALDI MUST PRINT ONE LABEL AND SCAN IT WITH HIS ANDROID PHONE.** Nothing in this repo can
  prove a barcode scans — `BarcodeDetector` is absent from every browser available here. Until he
  does that, the feature is verified in shape only. If it fails, check the printed size first: the
  symbol needs its 12px quiet zone intact and must not be shrunk by the printer's "fit to page".
- **An arrived box that is never counted has no alert.** Sharper now that the gate has shipped — a
  scan is what starts that clock. Different alert from the 3-day late flag, deliberately not built.
  Needs a threshold in days too; ask for both numbers in the same question if the moment fits.
- **The two colour faults, still app-wide.** **90 uncoloured `placeholder=` in 18 files** (falling
  back to the browser's `rgb(156,163,175)`, 1,36:1 on the light well) and **~107 bare `text-orange`
  used as ink in 15** (1,08:1). Fix shipped once in `BranchWarehouseManager.jsx`:
  `placeholder:text-ink-dim placeholder:opacity-100 placeholder:italic`, and `text-orange` →
  `text-accent-ink`. **`border-orange` and `bg-orange` stay — those are edges.** ⚠️ A blind regex is
  wrong: a `text-orange` on a scrim is correct.
- **Relabelling the Master Vault desk to English.** CLOSED 2026-09-01 — *"leave it for now, i can
  just strike words that i dont like"*. Do not raise it unprompted.
- **Ponder caption static on phones, moving on PC.** DECIDED 2026-08-31, not built. `PonderOverlay.jsx`
  HIDES it today: `if (boxW > W * 0.7) return null;`. The job is a third state.
- **The request card's status badge and button stack oddly at 375px** — pre-existing, `ml-auto`.
- **Landed cost spreads shipping/labour/excise equally per UNIT** — a decision he has not been asked
  to confirm, not a bug.
- **G5** shrinkage · **G4** records joined by name not id · **Siapkan Pengiriman and the shipping
  modal, still untested by anyone.**
- **9router dies at login.** `start /min` throws the error away. Fix drafted, **not applied** — it
  edits a file that runs at every login and he has not said yes.
- **The quota meter is FIXED, do not re-investigate.** Id `76c7cf4f-4c24-4984-aada-3aa91f53a148` in
  `C:/Users/ASUS/.claude/9router-claude-id.txt` — note the `.claude/`.

</details>

**No Firestore rules change has been needed so far on this branch.** The arrival gate is app-side
only. G1+G2 may be different — if it adds a subcollection under `branches/{loc}`, say so and stop;
he deploys rules himself.

**Before you finish: rewrite this file with the next single job.**
