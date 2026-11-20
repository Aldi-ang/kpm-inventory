# The one job - Step 2 Competitors global screen (from approved competitors-pro.html)

Read `.claude/PROGRESS.md` (newest entries), `.claude/NEXT-SESSION.md`, and `.claude/ANTIGRAVITY-TASK.md`. Check if Aldi said `"push"` to deploy **Task 101** (Step 1 Master Vault Categories + Sales Terminal 2-row tabs), then work `Task 105` (Step 2 Competitors build plan + draft Console rules) and `Task 106` (remaining non-money Undo checklist). Never push without Aldi's `"push"`.
**Status 2026-11-20 12:22 WIB (Alucard-Lead):** `9a501364` is **LIVE** (Task 97 Customers + Quarantine Pro + New Count Pro + `quarantineUnitCost`). Change 29 rules are published on both main (`cello-inventory-manager`) and demo (`kpm-demo-f4d74`). **Task 101** (Step 1 Categories) is DONE locally (5 gates green + lab `ERRORS: []`) — waiting on Aldi's `"push"`. Next track: **Step 2 Competitors global screen** (`Task 105` + `Task 106` OPEN).
**Written 2026-11-20 12:22 WIB (Alucard-Lead).** Categories + Competitors design is DECIDED (`Brainstorm/2026-11-19_categories-subcategories-and-rival-catalog.md`).

## What he decided (2026-11-19)
- Every product gets **Category › Sub-category** (two fixed levels), in Master Vault and inventory, general (not cigarette-only; his milk example: Kid > Kid Silver / Bronze / Gold).
- **One category list** shared by our products and rival products. Adding a rival offers 2 choices: "Add to an existing category" / "Add a new category" (shows in Master Vault as "competitors only · 0 of ours").
- **Competitors = its own global screen** (outside shops): rival prices per **region x customer type** (Retail / Grosir / Ecer), compare any of ours with any rival (cross-category allowed, tagged), manage list, approval queue.
- **Salesman reports -> approval.** T4 approves his own region; T3 and above any region. At approval the approver picks "Update the region price" or "Keep as a note only".
- **Visibility:** T4 sees only his region's prices; T3+ all regions. New permission-matrix rows, defaults T1-T4 edit / T1-T3 see all regions / all tiers report.
- **No price per stick.**

## Pictures & Current Queue
- Approved 2026-11-19 (round 3): `.claude/drafts/competitors-pro.html`, `.claude/drafts/customers-c.html`, `.claude/drafts/categories-pro.html` (Main warehouse only on Master Vault; 8 s Undo bar; NOO standout + Verify NOO).
- **Step 1 Categories (Task 101 — DONE locally, waiting `"push"`):** `useDatabaseSync.js` (`product_categories` listener), `App.jsx` (`handleSaveCategory`/`handleDeleteCategory`, 2-level product picker, backup/restore/wipe), `ResidentEvilInventory.jsx` (`Categories` modal), `StockOpnameView.jsx` (`rsk-*` inherits `categoryId`/`subCategoryId`), and `MerchantSalesView.jsx` 2-row tabs.

## Next, in order (Categories + Competitors track)
1. **Step 2 Competitors global screen (`Task 105` OPEN -> draft rules + emulator proof -> build):** Build standalone Competitors screen matching `.claude/drafts/competitors-pro.html`, region-scoped reads, and salesman price-report approvals.
2. **Step 3 Customers competitor tab + remaining non-money Undo targets (`Task 106` OPEN).**

## Traps (from Antigravity Task 75, checked)
- `type` must keep being written with the category NAME during the change-over - Master Vault grouping, ExamineModal, Sales Terminal tabs (`src/MerchantSalesView.jsx:1690`) and `DashboardBenchmarks.jsx:164` read it.
- Sell Again whitelist (`firestore.rules` ~L669-676) rejects any new product key -> permission-denied unless the rule ships first.
- USB Backup / Restore / Wipe in `src/App.jsx` copy named collections only - new collections must be added or they silently drop out of backups.
- A T4 must not READ other regions' prices in the raw data: store region prices as one doc per region (`competitors/{rivalId}/region_prices/{REGION}`) so rules can enforce it.
- Old `customers/{id}/benchmarks` rule (`firestore.rules:780-782`) lets any salesman write; lock it once the approval queue ships.
- Promo items (`kind: 'promo'`, `type: 'PROMO'`) stay out of the shared category list.
