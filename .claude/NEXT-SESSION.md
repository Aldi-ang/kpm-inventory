# The one job - Categories + Competitors: from approved pictures to the build (step 0 + step 1)

Read `.claude/PROGRESS.md` (newest entries), `.claude/NEXT-SESSION.md`, and `.claude/ANTIGRAVITY-TASK.md`. Check if Aldi confirmed `"push"` for Task 97 (Customers queue wording) + approved `.claude/drafts/quarantine-pro.html` + pasted Change 29 into demo `kpm-demo-f4d74`, then work the next OPEN task (`Task 100` Stock Opname New Count, or `Task 101` Step 1 Categories once demo rules match). Never push without Aldi's `"push"`.
**Status 2026-11-20 08:57 WIB (Alucard-Lead):** Task 98 (`e1917730`, Stock Opname real vs `stock-opname-pro.html` audit) DONE; Task 99 (`3dc077f4`, `.claude/drafts/quarantine-pro.html` picture, no chests, 5 ways out, PC/Phone `ERRORS: []`) DONE — waiting on Aldi's ok; Task 97 (Customers approved queue wording + honest `noSalesmanWhy` in `src/components/CustomerManager.jsx`, 5 gates green + lab PC/Phone verified) committed locally, NOT pushed — waiting on Aldi `"push"`. Queue refilled: `Task 100` (Stock Opname `New Count` matches `stock-opname-pro.html`, OPEN) + `Task 101` (Step 1 Categories UI, waiting on Change 29 paste to `kpm-demo-f4d74`). Note: `.claude/drafts/customers-c.html` was approved before hand-over; demo project `kpm-demo-f4d74` still needs whole-file `firestore.rules` paste from Aldi before category code goes live.
**Written 2026-11-19 09:05 WIB (Claude).** Design is DECIDED. Full note with his words: A-Brain `Brainstorm/2026-11-19_categories-subcategories-and-rival-catalog.md` (DECISION section).

## What he decided (2026-11-19)
- Every product gets **Category › Sub-category** (two fixed levels), in Master Vault and inventory, general (not cigarette-only; his milk example: Kid > Kid Silver / Bronze / Gold).
- **One category list** shared by our products and rival products. Adding a rival offers 2 choices: "Add to an existing category" / "Add a new category" (shows in Master Vault as "competitors only · 0 of ours").
- **Competitors = its own global screen** (outside shops): rival prices per **region x customer type** (Retail / Grosir / Ecer), compare any of ours with any rival (cross-category allowed, tagged), manage list, approval queue.
- **Salesman reports -> approval.** T4 approves his own region; T3 and above any region. At approval the approver picks "Update the region price" or "Keep as a note only".
- **Visibility:** T4 sees only his region's prices; T3+ all regions. New permission-matrix rows, defaults T1-T4 edit / T1-T3 see all regions / all tiers report.
- **No price per stick.**

## Pictures & Current Queue
- Approved 2026-11-19 (round 3): `.claude/drafts/competitors-pro.html`, `.claude/drafts/customers-c.html`, `.claude/drafts/categories-pro.html` (Main warehouse only on Master Vault; 8 s Undo bar; NOO standout + Verify NOO).
- Created 2026-11-20 (waiting on Aldi's ok): `.claude/drafts/quarantine-pro.html` (`3dc077f4`, Task 99: Warm Stone/Espresso, no 3D chests/glow, 5 ways out + Action history + T2/T3 toggle, PC 1440 + Phone 390 `ERRORS: []`).
- **Task 97 (Customers queue wording + honest `noSalesmanWhy`):** Built & gates green + lab PC/Phone verified, committed locally — waiting on Aldi's `"push"`.
- **Task 100 (OPEN):** Build Stock Opname `New Count` in `src/StockOpnameView.jsx` to match `.claude/drafts/stock-opname-pro.html` (Task 98 audit: `System / You counted / Difference`, progress meter, `Cigarettes` / `Promo` headers).

## Next, in order (Categories + Competitors track)
1. **Demo rules parity (`WAITING ON ALDI`):** Aldi published Change 29 (`01600afc`) on main project `cello-inventory-manager`, but demo project `kpm-demo-f4d74` still needs the whole-file `firestore.rules` paste in Console before category code goes live.
2. **Step 1 remaining build (`Task 101`, OPEN after demo rules match):** Master Vault `Our / Competitor-only` categories, 2-level `Category > Sub-category` picker on the product form (writing both `categoryId`/`subCategoryId` AND `type`), and Sales Terminal 2-row tabs (`src/MerchantSalesView.jsx`).
3. **Step 2 Competitors screen, Step 3 Customers tab** — each its own job. (Undo for remaining non-money/stock deletes stays queued after Task 86 plan.)

## Traps (from Antigravity Task 75, checked)
- `type` must keep being written with the category NAME during the change-over - Master Vault grouping, ExamineModal, Sales Terminal tabs (`src/MerchantSalesView.jsx:1690`) and `DashboardBenchmarks.jsx:164` read it.
- Sell Again whitelist (`firestore.rules` ~L669-676) rejects any new product key -> permission-denied unless the rule ships first.
- USB Backup / Restore / Wipe in `src/App.jsx` copy named collections only - new collections must be added or they silently drop out of backups.
- A T4 must not READ other regions' prices in the raw data: store region prices as one doc per region (`competitors/{rivalId}/region_prices/{REGION}`) so rules can enforce it.
- Old `customers/{id}/benchmarks` rule (`firestore.rules:780-782`) lets any salesman write; lock it once the approval queue ships.
- Promo items (`kind: 'promo'`, `type: 'PROMO'`) stay out of the shared category list.
