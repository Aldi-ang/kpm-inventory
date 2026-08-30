# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-08-30 09:40 WIB. 666/666 audit · 878/878 selfcheck. Branch `phase0-solid-ground`,
tree clean.**

🟠 **PONDER IS PARKED.** His words: *"dont worry about the ponder book for now we focus on
system functionality"*. Do not start a tutorial chapter. The front is the **Restock Vault**.

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

He is on **PowerShell**: `;` not `&&`.

🔴 **RUN AND QUOTE BOTH SUITES.** `logicFixes.selfcheck` sat at **823/825** for four days and every
report said green, because reports only ever quote the first number. That is how two stale checks
hid. Both numbers, every time.

---

## 🔴 THE ONE JOB — sales performance per product, over time

His ask, unedited:

> *"the total performance per day per week/ month or year for products right, like how many product
> is actually sold per timeframe specific for each of the product? well basically the performance
> for each product in overall through all region"*

**He has already chosen the method and told you to stop asking:** *"we should use older data to
avoid high cost right, we just need to see the data thats auto update for every sales so we can see
the latest sales and have all the number isnt? btw right just do whatever to save cost, u know the
method better"*. That is a stored rollup, and he is right — a running total is always current AND
nearly free to read. **Do not re-open the cost question.**

**THE SHAPE.** One document per month, `product_stats/{YYYY-MM}`, holding `byProduct` and `byDay`,
incremented **inside the same batch as the sale** so it cannot be lost or double-counted. Use
`FieldPath` for the nested paths rather than dotted strings — a productId with a dot in it would
silently write to the wrong place. Reads: 1 doc for a day, 1–2 for a week, 1 for a month, 12 for a
year, against hundreds or thousands of transaction docs for a live query.

**⚠️ THE COUNTER IS THE EASY HALF. THE DRIFT IS THE JOB.** Three paths already change sales after
the fact and every one must adjust the rollup in the same breath, or the numbers rot with nothing
on screen saying so — this repo's most expensive failure shape:
  1. transaction **edit** in `HistoryReportView`
  2. transaction **delete** and delete-folder, same file
  3. consignment **return / payment** in `useTransactionEngine`
Write ONE helper applied with a `+1` / `−1` sign and route all of them through it. An edit is a
remove of the old plus an add of the new.

**⚠️ A REBUILD BUTTON IS NOT OPTIONAL.** It is the backfill for every month before this ships AND
the repair tool if drift ever happens. It is also the property that makes the whole design safe:
**the rollup is a CACHE, never the truth.** Transactions stay the source, so a bug costs a rebuild
and never data. `fetchHistoricalTransactions(start, end)` (`useDatabaseSync.js:188`) already reads
any range and `HistoryReportView` already drives it with Daily/Weekly/Monthly — **yearly does not
exist yet** and has to be added.

**🔴 AND IT IS NOT DONE UNTIL THE BOOK KNOWS.** His rule, 2026-08-30: *"new panel and features
means different ponder, but inside the same section of the book"*. A new panel means a new scene, a
new stage and a new demo world, registered in `registry.js` and added to `sections.js` in the
section it is printed in, at its top-to-bottom position on the screen. Follow `shipment-plan.js`.

**Verify:** build, both suites, and render the panel in the lab before claiming it works.

## Traps — every one of these has already cost time

- **🔴 WHEN YOU MOVE CODE OUT OF A FILE, GREP THE CHECK SUITES FOR THAT PATH.**
  `grep -n "components/Foo.jsx" src/config/*.mjs`. Two guards read a file the code had left and
  nobody noticed for four days. Prefer `read(a) + read(b)` over re-pointing when a behaviour's home
  is genuinely ambiguous.
- **🔴 A NEW PANEL IS NOT DONE UNTIL THE BOOK HAS ITS SCENE.** His rule, 2026-08-30. New column
  → beats on the existing scene. New panel → scene + stage + demo world, same book section.
- **🔴 A COMPONENT THE TUTORIAL RENDERS LIVES IN `src/ponder/stages/`.** The audit scans that
  folder for `data-ponder` keys; a table anywhere else fails the focus-key check even though it is
  correct. `ShipmentPlanTable` was moved for exactly this.
- **🔴 CHECKS THAT PIN AN EXACT LITERAL BREAK ON HARMLESS EDITS.** Three did this in one session
  — an import list, a return-object literal, a display string — and each was red while the thing it
  guarded was intact. Assert the GUARANTEE, not the spelling.
- **🔴 PLAIN ENGLISH ON THE HQ DESK, always.** *"use english terms if its shorter and direct"*,
  and *"can u use better english words from now on"*. Two checks enforce it. Branch-side screens
  stay Indonesian by design — different reader.
- **🔴 A CAPTION ON A SHORT PANEL COVERS THE ROWS IT IS COMPARING.** `at: 'near'` needs room
  below the subject. On a four-row table, anchor header and first-row beats at `'bottom'`. Found on
  a frame, not in review.
- **🔴 ONE PLACE LIST, EVER.** `warehouseList` / `NON_BRANCH` in `utils/supply.js` is the only
  source of "which warehouses exist". A private copy is not a copy, it is a second answer —
  `20c4a0a` paid for this once when the Tujuan dropdown offered Headquarters twice.
- **🔴 VERIFY IN A REAL BROWSER, NOT FROM THE DIFF.** `npx vite build --config
  tools/ponder-lab.config.mjs` then `python -m http.server 4187 -d dist-ponderlab`.
  **Screenshots must be written to the scratchpad, not the repo root — Chrome gets `Access is
  denied` there.** `--dump-dom | grep -o '<option[^>]*>[^<]*</option>'` proves a select's contents;
  a screenshot only shows it closed.
- **🔴 `?pov` MOUNTS THE COSTUME RACK.** It cannot be reached any other way — hidden sidebar door,
  gated on the owner's true email, behind the vault gate. `?pov=solo` is the fresh-company case.
- **🔴 A HOVER CANNOT BE SCREENSHOTTED — use `?hover`.** Headless Chrome has no pointer.
- **🔴 `preserve-3d` sorts children by DEPTH, not document order**, and if the element is animated
  the `translateZ` goes in the KEYFRAME, never on the element.
- **The palette law holds, with two written exemptions:** the book's cream pages, and the book's
  hover glow. No blue, no green anywhere else. Amber is an edge and an ink, never a fill.
- **Aldi is 14 and skims.** One bold line first saying what he must do. Define every term. Mark
  asks 🔴 DECIDE / ❓ ANSWER / ✅ TEST.

## Where things live

| Thing | Path |
|---|---|
| Session state | `.claude/PROGRESS.md` |
| The reorder advice (the thing to port) | `src/components/BranchWarehouseManager.jsx:1128` |
| `reorderAdvice` · `shipmentRhythm` · `productArrivals` · `inTransitQty` | same file, `:122`–`:264` |
| HQ's surat jalan desk — Request tab, push form, `REQ_RANK` | `src/RestockVaultView.jsx` |
| Where every pack is — the one warehouse-list function | `src/utils/supply.js` |
| POV rack + costume posting | `src/components/TierPovSwitch.jsx` · `src/App.jsx` |
| The 666 checks | `src/config/integration.audit.mjs` |
| The 878 checks | `src/config/logicFixes.selfcheck.mjs` |
| Viewing harness | `tools/ponder-lab.*` |
| The warehouse roadmap | `A-Brain/Wiki/Concepts/The Eight Warehouse Gaps.md` |

<details>
<summary>Queued behind this — do not start these</summary>

- **G1 + G2, one job, his doc calls it the money item.** Batch identity dies at the HQ door
  (`batchNo` is captured at intake, never copied onto `branches/{loc}/inventory`), and nothing
  enforces oldest-ships-first — age is *displayed* only.
- **G5** — inventory accuracy and shrinkage are never calculated, though the raw numbers now exist.
- **G4** — records joined by name, not id. A spelling fix silently splits one product into two.
  Biggest and riskiest; touches everything.
- **Redesign `BranchWarehouseManager` into Duke's Ledger.** It carries 0 `duke-` tokens. Palette is
  clean (semantic tokens only), so this is a look job, not a correctness one.
- **Ponder's remaining 15 chapters**, in `sections.js` order — parked at his word.
- **Untested by anyone: Siapkan Pengiriman and the shipping modal.**

</details>

**Before you finish: rewrite this file with the next single job.**
