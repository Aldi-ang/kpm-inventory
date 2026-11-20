# The one job - Categories + Competitors: from approved pictures to the build (step 0 + step 1)

Read `.claude/PROGRESS.md` (newest entries), `.claude/NEXT-SESSION.md`, and `.claude/ANTIGRAVITY-TASK.md`. Check if Aldi said `"push"` to ship local commits (`f751a42f`, `e63c4e30`, `00219e4d`, and `quarantineUnitCost`) and confirmed pasting Change 29 into demo `kpm-demo-f4d74`; if Change 29 is published on demo, work `Task 101` (Step 1 Master Vault Categories + Sales Terminal 2-row tabs). Never push without Aldi's `"push"`.
**Status 2026-11-20 11:48 WIB (Alucard-Lead):** Task 97 (Customers queue wording), Quarantine Pro (`e63c4e30`, matches approved `quarantine-pro.html` v4), and Task 100 (New Count Pro, matches `stock-opname-pro.html`) are ALL built, gated green, PC/Phone lab verified (`ERRORS: []`), and committed locally — **waiting only on Aldi's `"push"`**. `Task 101` (Step 1 Categories UI) is OPEN and waiting on Aldi pasting `firestore.rules` (Change 29) into demo project `kpm-demo-f4d74`.
**Written 2026-11-20 11:48 WIB (Alucard-Lead).** Categories + Competitors design is DECIDED (`Brainstorm/2026-11-19_categories-subcategories-and-rival-catalog.md`).

## What he decided (2026-11-19)
- Every product gets **Category › Sub-category** (two fixed levels), in Master Vault and inventory, general (not cigarette-only; his milk example: Kid > Kid Silver / Bronze / Gold).
- **One category list** shared by our products and rival products. Adding a rival offers 2 choices: "Add to an existing category" / "Add a new category" (shows in Master Vault as "competitors only · 0 of ours").
- **Competitors = its own global screen** (outside shops): rival prices per **region x customer type** (Retail / Grosir / Ecer), compare any of ours with any rival (cross-category allowed, tagged), manage list, approval queue.
- **Salesman reports -> approval.** T4 approves his own region; T3 and above any region. At approval the approver picks "Update the region price" or "Keep as a note only".
- **Visibility:** T4 sees only his region's prices; T3+ all regions. New permission-matrix rows, defaults T1-T4 edit / T1-T3 see all regions / all tiers report.
- **No price per stick.**

## Pictures & Current Queue
- Approved 2026-11-19 (round 3): `.claude/drafts/competitors-pro.html`, `.claude/drafts/customers-c.html`, `.claude/drafts/categories-pro.html` (Main warehouse only on Master Vault; 8 s Undo bar; NOO standout + Verify NOO).
- **Quarantine & New Count (DONE locally, waiting `"push"`):** `Quarantine` (`e63c4e30`) matches `.claude/drafts/quarantine-pro.html` v4; `New Count` (Task 100) matches `.claude/drafts/stock-opname-pro.html`. Task 97 (`CustomerManager.jsx`) also waits for `"push"`.

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
