# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-08-30 10:35 WIB. 667/667 audit · 915/915 selfcheck. Branch `phase0-solid-ground`,
tree clean at `18062df`.**

🛑 **STOPPED ON THE QUOTA. Nothing is half-finished** — every commit builds and both suites are
green. The sales rollup shipped end to end: it counts, it reads back, it rebuilds, it has a chapter.

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers in every report.** One suite sat red for four days
because reports only ever named the first.

---

## 🔴 THE ONE JOB — look at Product Performance on a real screen, then fix what the frame shows

Everything under it is built and checked. What has **never been rendered** is the panel itself:
`src/components/ProductPerformancePanel.jsx`. Its table was driven in the lab through the tutorial,
so the rows, the share bar and the incomplete-range banner are confirmed. Nobody has looked at the
**range buttons**, the **loading line**, or the **failed-read box**.

**Do this before writing any new code:**

1. Add a `?perf` slice to `tools/ponder-lab.jsx` mounting `ProductPerformanceTable` directly, the
   way `?plan` and `?minkirim` already do. The panel needs Firestore; the table does not.
2. Shoot it in both themes at a narrow width. The grid is
   `grid-cols-[minmax(0,1fr)_120px_150px_88px]` with `min-w-[640px]`, and **`Rp 186.000.000` is the
   longest string on any row** — if anything clips, it is revenue on a phone.
3. Then ask him to open **Reports** in the real app and press **Rebuild sales totals** in Settings
   once. Until that runs, every month before today is empty and the banner will correctly say so.

**The one thing genuinely left undone:** the caption fix for beats 5 and 6 of
`product-performance.js` was applied but **never re-rendered** — the command was interrupted. Both
use `at: 'bottom'` now. Confirm on a frame that the top rows are no longer covered:

```
npx vite build --config tools/ponder-lab.config.mjs
python -m http.server 4187 -d dist-ponderlab
```

then screenshot `?scene=product-performance&step=5`. **Write screenshots to the scratchpad, never
the repo root — Chrome gets `Access is denied` there.**

---

## What the sales rollup is, in four lines

- `src/utils/salesRollup.js` — the arithmetic. Imports nothing from Firebase, so the checks run it
  in plain node against real numbers. 27 of them.
- `src/utils/salesRollupWrite.js` — the only module that owns the `sales_stats` path.
- One document per month: `byProduct` for the month, `byDay` inside it. A day costs 1 read, a week
  1–2, a month 1, a year 12.
- **It is a CACHE, never the truth.** `transactions` is the record; Settings › Company · 07 rebuilds
  every month from it. A bug costs a rebuild, never data.

**Four paths touch a sale and all four touch the tally, in the same commit as the thing they
count:** the online sale (inside the receipt's own batch), the offline drain, the three deletes
(through one shared `untallyOps`), and the history edit (−1 of what stood before, +1 of what was
saved). Ten checks scan that wiring, because nothing but a scan can prove a call site still exists.

---

## Traps — every one has already cost time

- **🔴 NEVER `git checkout --` A FILE TO UNDO A MUTATION TEST BEFORE THE WORK IS COMMITTED.** It
  reverts to HEAD, not to the edited state. This wiped two files of finished wiring today and cost
  a full rebuild of them. **Commit first, then mutation-test.**
- **🔴 EVERY WORD WRITTEN FOR HIM GOES THROUGH `anthropic-skills:humanizer`** — replies, notes,
  commit messages and shipped copy alike. His standing instruction, 2026-08-30.
- **🔴 KPM COPY HAS NO SECOND PERSON.** The subject is the warehouse, the branch, the shipment or a
  role. Never *kamu*/*aku*. Audit check 667 scans every Ponder beat and names the offender. Keep
  `—` where it is the CHARACTER the panel prints; several beats teach that symbol.
- **🔴 A NEW PANEL IS NOT DONE UNTIL THE BOOK HAS ITS SCENE.** New column → beats on the existing
  scene. New panel → scene + stage + demo world, same book section, at its position on the screen.
- **🔴 A COMPONENT THE TUTORIAL RENDERS LIVES IN `src/ponder/stages/`.** The audit scans that folder
  for `data-ponder` keys; a table anywhere else fails the focus-key check even though it is correct.
- **🔴 A `near` CAPTION ON A SHORT PANEL COVERS THE ROWS IT IS COMPARING.** Four-row tables anchor
  their header and top-row beats at `'bottom'`. Found on a frame twice, never in review.
- **🔴 CHECKS THAT PIN AN EXACT LITERAL BREAK ON HARMLESS EDITS.** Five did today — an import list, a
  return-object literal, a display string, a **line index**, and a collection name. Every one was red
  while the thing it guarded was intact. Assert the GUARANTEE, not the spelling.
- **🔴 A MANGLED REGEX PASSES AGAINST EVERYTHING.** A heredoc wrote raw control characters into one
  and it reported success while testing nothing. **Write patch scripts to a file and run the file** —
  `bash -c` with backticks and `${}` inside will corrupt them. Mutation-test every new check.
- **🔴 ONE PLACE LIST, EVER.** `warehouseList` / `NON_BRANCH` in `utils/supply.js` is the only source
  of "which warehouses exist".
- **Aldi is 14 and skims.** One bold line first saying what he must do. Define every term. Mark asks
  🔴 DECIDE / ❓ ANSWER / ✅ TEST.

## Where things live

| Thing | Path |
|---|---|
| Session state | `.claude/PROGRESS.md` |
| Sales rollup — arithmetic · Firestore · panel · table | `src/utils/salesRollup.js` · `salesRollupWrite.js` · `src/components/ProductPerformancePanel.jsx` · `src/ponder/stages/ProductPerformanceTable.jsx` |
| Rebuild button | `src/App.jsx` `handleRebuildSalesStats` → Settings › Company · 07 |
| The four tally call sites | `useTransactionEngine.js` · `App.jsx` (drain + `untallyOps`) · `HistoryReportView.jsx` |
| Send at least · Shipment Plan | `src/ponder/stages/StockByWarehouseTable.jsx` · `ShipmentPlanTable.jsx` |
| Spare days per branch | `src/utils/supply.js` `bufferDays` → Settings › Company · 06 |
| Scenes | `src/ponder/scenes/` — four of them, registered in `registry.js` + `sections.js` |
| Viewing harness | `tools/ponder-lab.jsx` — `?plan` `?minkirim` `?pov` `?book` `?scene=` |
| The 667 / 915 checks | `src/config/integration.audit.mjs` · `logicFixes.selfcheck.mjs` |

<details>
<summary>Queued behind this — do not start these</summary>

- **G1 + G2, one job, his own doc calls it the money item.** Batch identity dies at the HQ door
  (`batchNo` is captured at intake, never copied onto `branches/{loc}/inventory`), and nothing
  enforces oldest-ships-first — age is displayed only.
- **G5** — inventory accuracy and shrinkage are never calculated, though the raw numbers exist.
- **G4** — records joined by name, not id. A spelling fix silently splits one product into two.
- **Redesign `BranchWarehouseManager` into Duke's Ledger.** 0 `duke-` tokens; a look job, not a
  correctness one.
- **Ponder's remaining chapters**, parked at his word: *"dont worry about the ponder book for now"*.
  ⚠️ That parks new CHAPTERS only — a new feature still gets its scene.
- **Untested by anyone: Siapkan Pengiriman and the shipping modal.**

</details>

**Before you finish: rewrite this file with the next single job.**
