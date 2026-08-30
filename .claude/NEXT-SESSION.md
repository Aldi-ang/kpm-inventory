# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-08-30 09:02 WIB. 666/666 audit · 855/855 selfcheck. Branch `phase0-solid-ground`,
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

## 🔴 THE ONE JOB — the cross-branch recommendation, panel AND column

**Feature A shipped (`20a4622`).** HQ's Kirim form prints `minimal N` under every cart line, keyed on
the Tujuan chosen. He then confirmed BOTH halves of the rest, 2026-08-30:

> *"i agree with your recommendation so new separate panel and add column in sebaran stock, on the
> new panel"*

**(1) A new standalone panel** — every cabang's minimum for every product, side by side. The question
it answers that the shipment form cannot: production is short, three cabang want Cello, who gets it
first. His own scenario: *"especially with company that have limited production capabilities"*.

**(2) The same minimum as a column in Sebaran Stok**, the row-per-warehouse table.

**⚠️ THE TRAP ON (2).** `src/ponder/stages/StockByWarehouseTable.jsx` is **shared with the
Ponder tutorial** — same component, real screen and demo world both. A new column means the
tutorial's fixed world needs the field, its `COLS` constant moves, and group-56 checks plus
`src/ponder/scenes/stock-by-warehouse.js` beats may assert the old shape. Read the scene file and
grep group 56 BEFORE touching `COLS`. Ponder is parked; the component does not know that.

**Nothing here re-derives the maths.** `reorderAdvice`, `productArrivals`, `shipmentRhythm`,
`inTransitQty` are exported from `BranchWarehouseManager.jsx` and already imported by the desk;
`bufferDays(appSettings, branch)` in `utils/supply.js` resolves his per-cabang cushion. Each Sebaran
Stok row already knows its warehouse name, so every argument is in hand. The word on screen is
**`minimal`**, never `saran` — his framing: when production is tight it is a floor, not advice.

**Verify:** build, both suites, and a check that panel, column and form all call the SAME function.

---

## ❓ BLOCKED ON ALDI — the third job, and it is a cost decision

> *"the total performance per day per week/ month or year for products right, like how many product
> is actually sold per timeframe specific for each of the product? well basically the performance for
> each product in overall through all region"*

Investigated. `fetchHistoricalTransactions(start, end)` (`useDatabaseSync.js:188`) already bypasses
the 7-day listener cap and `HistoryReportView` already drives it with Daily/Weekly/Monthly. Missing:
any grouping **by product** over a period, and **yearly** as a range.

He owes one answer — `live` / `stored` / `mixed` — because it is his Firestore bill: a live range
query pays document reads every time the panel opens, and a year is thousands. `mixed` was
recommended (live for day/week/month, stored for year). **Do not build this before he answers.**

## What just shipped, and the two laws it left

`b1cdcaa` — the POV costume can be posted anywhere. His ask: *"i want the option for tier 1 so that
i can assign the test agent into different places with no problems"*.

- He first asked to **disable the roster form's email requirement**. **Refused, correctly:** that
  email is the document ID of the `employee_directory` row, the record that lets a human sign in,
  and `povPreview.js` deliberately never writes one for a test agent. Relaxing it mints a login for
  a fake person. The real blocker was `testAccountDoc`'s `defaults.location` — a parameter nobody
  ever passed, so every costume was born at `Headquarters`.
- **Headquarters IS the master vault, not a cabang** (`supply.js`, `NON_BRANCH`). Nothing posted
  there can ever see branch stock. Full page: `A-Brain/Wiki/Concepts/Headquarters Is Not a Cabang.md`.
- **A check points at a file, not at a behaviour.** Second instance of the split-component trap.
  Full page: `A-Brain/Wiki/Concepts/A Check Points at a File, Not at a Behaviour.md`.

---

## Traps — every one of these has already cost time

- **🔴 WHEN YOU MOVE CODE OUT OF A FILE, GREP THE CHECK SUITES FOR THAT PATH.**
  `grep -n "components/Foo.jsx" src/config/*.mjs`. Two guards read a file the code had left and
  nobody noticed for four days. Prefer `read(a) + read(b)` over re-pointing when a behaviour's home
  is genuinely ambiguous.
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
| The 855 checks | `src/config/logicFixes.selfcheck.mjs` |
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
