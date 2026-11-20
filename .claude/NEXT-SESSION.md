# The one job - Step 2 Competitors global screen (from approved competitors-pro.html)

Read `.claude/PROGRESS.md` (newest entries), `.claude/NEXT-SESSION.md`, and `.claude/ANTIGRAVITY-TASK.md`. First finish `Task 107` (emulator proof for Change 30 draft rules in `.claude/ANTIGRAVITY-TASK.md`), give Aldi the verified Console rule paste text, and once he confirms Change 30 is published on Console build `Task 108` (Step 2 Competitors global screen). Never push without Aldi's `"push"`.
**Status 2026-11-20 12:45 WIB (Alucard-Lead):** `e19369ad` (**Task 101** Step 1 Categories) is **LIVE**. **Task 105** (Step 2 Competitors build plan + Change 30 draft rules) and **Task 106** (remaining 8 non-money 8s Undo targets) are **DONE** locally (`ANTIGRAVITY-TASK.md`). Next up: **Task 107** (Firestore emulator proof for Change 30) -> Console paste -> **Task 108** (build Competitors global screen).
**Written 2026-11-20 12:45 WIB (Alucard-Lead).** Categories + Competitors design is DECIDED (`Brainstorm/2026-11-19_categories-subcategories-and-rival-catalog.md`).

## What he decided (2026-11-19)
- Every product gets **Category › Sub-category** (two fixed levels), in Master Vault and inventory, general (not cigarette-only; his milk example: Kid > Kid Silver / Bronze / Gold).
- **One category list** shared by our products and rival products. Adding a rival offers 2 choices: "Add to an existing category" / "Add a new category" (shows in Master Vault as "competitors only · 0 of ours").
- **Competitors = its own global screen** (outside shops): rival prices per **region x customer type** (Retail / Grosir / Ecer), compare any of ours with any rival (cross-category allowed, tagged), manage list, approval queue.
- **Salesman reports -> approval.** T4 approves his own region; T3 and above any region. At approval the approver picks "Update the region price" or "Keep as a note only".
- **Visibility:** T4 sees only his region's prices; T3+ all regions. New permission-matrix rows, defaults T1-T4 edit / T1-T3 see all regions / all tiers report.
- **No price per stick.**

## Pictures & Current Queue
- Approved 2026-11-19 (round 3): `.claude/drafts/competitors-pro.html`, `.claude/drafts/customers-c.html`, `.claude/drafts/categories-pro.html`.
- **Step 1 Categories (Task 101 — LIVE `e19369ad`):** shared `product_categories`, Categories modal, 2-level picker, Sales Terminal 2-row tabs.
- **Step 2 Competitors plan + Change 30 draft (`Task 105` DONE) & non-money Undo checklist (`Task 106` DONE).**

## Next, in order (Categories + Competitors track)
1. **`Task 107` (OPEN — emulator test only):** Write `rules-test/test-competitors.mjs` and verify `[CHANGE 30 — DRAFT]` in Firestore emulator (own-region isolation, T4/T5/T6 restrictions, matrix override symmetry).
2. **Aldi publishes `[CHANGE 30]` in Console** (demo `kpm-demo-f4d74` + main `cello-inventory-manager`).
3. **`Task 108` (OPEN — build after Console publish):** Build Step 2 Competitors global screen + permissions + backup/restore/wipe paths + `BiohazardTheme`/`demoMission`/`logicFixes.selfcheck.mjs` (`17 -> 18` menu parity).
4. **Step 3 Customers competitor tab + remaining 8 non-money Undo targets (`Task 106` Batch 1 & 2).**

## Traps (from Task 75 & Task 105, checked)
- `type` must keep being written with the category NAME during change-over (Master Vault grouping, Sales Terminal tabs, `DashboardBenchmarks.jsx`).
- USB Backup / Restore / Mirror / Wipe in `src/App.jsx` copy named collections only — `competitors` (with nested `region_prices`) and `competitor_reports` MUST be added across all 5 paths.
- A T4 must not READ other regions' prices in raw data: store region prices as `competitors/{rivalId}/region_prices/{REGION}` AND never subscribe collection-wide `region_prices` or unfiltered `competitor_reports` for T4–T6 (`firestore.rules:812` query-must-match-rule).
- `logicFixes.selfcheck.mjs` `L13352` and `L14435` hardcode `menu.length === 17` and require `TOUR[id]` in `src/config/demoMission.js` for every sidebar item.
- Lock old `customers/{id}/benchmarks` writes to T1/T2 once Step 3 ships (`firestore.rules:802-804`).
- Promo items (`kind: 'promo'`, `type: 'PROMO'`) stay out of the shared category list.
