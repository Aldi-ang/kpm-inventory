# The one job - Company Feature Switches (Task 111 plan + Change 31 draft rules)

**Status 2026-11-21 (Claude, cloud):** Task 108 Competitors screen BUILT and pushed (see PROGRESS top). Next, in the agreed order: (1) Claude reviews the Change 31 draft rules in Task 111's Result (`.claude/ANTIGRAVITY-TASK.md`) - they cannot be emulator-tested in the cloud, so the rules proof + Console publish wait for the PC; the app side can be built after the rules are published. (2) Then the customizable packing ladder (Task 113 inventory feeds it). (3) Redesign the remaining game-look screens worst first (Task 110 list), a picture first each time.
**Cloud session traps:** run logicFixes with `TZ=Asia/Jakarta`; a fresh clone needs `git fetch origin tag game-edition-v1`; `npm ci` first. Lab for Competitors: `npx vite --config tools/ponder-lab.config.mjs` then `/tools/comp-lab.html?as=T4&tab=reports&open=approve`.
**Competitors traps (stay true):** T4-T6 read ONE region_prices doc per rival (own region) and query reports by region / own uid; a report create carries only the 20 rule fields; an approval changes only the 6 review fields; no price per stick; palette law.

---
# The one job - Step 2 Competitors global screen (from approved competitors-pro.html)

**Claude leads again (2026-11-21 20:13 WIB).** Next: Change 30 PUBLISHED by Aldi on BOTH projects (2026-11-21 20:27 WIB, his "published both"). Build Task 108 (Competitors screen, plan = Task 105 Result in `.claude/ANTIGRAVITY-TASK.md`). Trap: the app code must query `region_prices` ONE doc per own region for T4-T6 (a whole-collection list is refused) and query `competitor_reports` with `where("region","==",myRegion)` or `where("reportedByUid","==",uid)`.
**Status 2026-11-21 20:40 WIB (Claude):** LIVE 775200e5 (5e5a9cfe fade fix + lead hand-back). Change 30 proven 68/0 in the emulator (`rules-test/test-competitors.mjs`, draft rewritten under the 1000-expression limit) and written into `firestore.rules` - waiting on Aldi to publish it. Aldi away 2 days from 2026-11-21, may work from a cloud session (no PC, no emulator, no Antigravity there).
**Written 2026-11-21 20:06 WIB (Alucard-Lead).** Categories + Competitors design is DECIDED (`Brainstorm/2026-11-19_categories-subcategories-and-rival-catalog.md`).

## What he decided (2026-11-19)
- Every product gets **Category › Sub-category** (two fixed levels), in Master Vault and inventory, general (not cigarette-only; his milk example: Kid > Kid Silver / Bronze / Gold).
- **One category list** shared by our products and rival products. Adding a rival offers 2 choices: "Add to an existing category" / "Add a new category" (shows in Master Vault as "competitors only · 0 of ours").
- **Competitors = its own global screen** (outside shops): rival prices per **region x customer type** (Retail / Grosir / Ecer), compare any of ours with any rival (cross-category allowed, tagged), manage list, approval queue.
- **Salesman reports -> approval.** T4 approves his own region; T3 and above any region. At approval the approver picks "Update the region price" or "Keep as a note only".
- **Visibility:** T4 sees only his region's prices; T3+ all regions. New permission-matrix rows, defaults T1-T4 edit / T1-T3 see all regions / all tiers report.
- **No price per stick.**

## Pictures & Current Queue
- Approved 2026-11-19 (round 3): `.claude/drafts/competitors-pro.html`, `.claude/drafts/customers-c.html`, `.claude/drafts/categories-pro.html`.
- **Step 1 Categories (Task 101 — LIVE `e19369ad`)** & **Task 109 (`fade-in` 0.2s + StockOpnameView un-nested fade — LOCAL, waiting `"push"`).**
- **Read-only plans ready in `.claude/ANTIGRAVITY-TASK.md`:** `Task 105` (Step 2 Competitors + Change 30 draft), `Task 106` (8 non-money Undo targets), `Task 110` (9-rank game-look inventory), `Task 111` (Company Feature Switches Sampling/Hutang/Consignment + Change 31 draft).

## Next, in order
1. **Push `Task 109`** once Aldi says `"push"`.
2. **`Task 107` (OPEN — emulator test only):** Write `rules-test/test-competitors.mjs` and verify `[CHANGE 30 — DRAFT]` in Firestore emulator.
3. **Aldi publishes `[CHANGE 30]` in Console** (demo `kpm-demo-f4d74` + main `cello-inventory-manager`).
4. **`Task 108` (OPEN — build after Console publish):** Build Step 2 Competitors global screen + permissions + backup/restore/wipe paths + `17 -> 18` menu parity.
5. **Follow-ups ready:** Company Feature Switches (`Task 111`), Step 3 Customers competitor tab + remaining 8 non-money Undo targets (`Task 106`), and top game-look screens (`Task 110`).

## Traps (from Task 75 & Task 105, checked)
- `type` must keep being written with the category NAME during change-over (Master Vault grouping, Sales Terminal tabs, `DashboardBenchmarks.jsx`).
- USB Backup / Restore / Mirror / Wipe in `src/App.jsx` copy named collections only — `competitors` (with nested `region_prices`) and `competitor_reports` MUST be added across all 5 paths.
- A T4 must not READ other regions' prices in raw data: store region prices as `competitors/{rivalId}/region_prices/{REGION}` AND never subscribe collection-wide `region_prices` or unfiltered `competitor_reports` for T4–T6 (`firestore.rules:812` query-must-match-rule).
- `logicFixes.selfcheck.mjs` `L13352` and `L14435` hardcode `menu.length === 17` and require `TOUR[id]` in `src/config/demoMission.js` for every sidebar item.
