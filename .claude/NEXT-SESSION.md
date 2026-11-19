# The one job - Categories + Competitors: from approved pictures to the build (step 0 + step 1)

**Written 2026-11-19 09:05 WIB (Claude).** Design is DECIDED. Full note with his words: A-Brain `Brainstorm/2026-11-19_categories-subcategories-and-rival-catalog.md` (DECISION section).

## What he decided (2026-11-19)
- Every product gets **Category › Sub-category** (two fixed levels), in Master Vault and inventory, general (not cigarette-only; his milk example: Kid > Kid Silver / Bronze / Gold).
- **One category list** shared by our products and rival products. Adding a rival offers 2 choices: "Add to an existing category" / "Add a new category" (shows in Master Vault as "competitors only · 0 of ours").
- **Competitors = its own global screen** (outside shops): rival prices per **region x customer type** (Retail / Grosir / Ecer), compare any of ours with any rival (cross-category allowed, tagged), manage list, approval queue.
- **Salesman reports -> approval.** T4 approves his own region; T3 and above any region. At approval the approver picks "Update the region price" or "Keep as a note only".
- **Visibility:** T4 sees only his region's prices; T3+ all regions. New permission-matrix rows, defaults T1-T4 edit / T1-T3 see all regions / all tiers report.
- **No price per stick.**

## Pictures (published, waiting on his ok)
- Competitors screen: https://claude.ai/artifact/GWkemihM9zrbz9rbj8WQZg (`.claude/drafts/competitors-pro.html`)
- Customers shop tab v5: https://claude.ai/artifact/UswPMbzKRGFXRah4esaGiU (`.claude/drafts/customers-c.html`)
- Master Vault categories: https://claude.ai/artifact/QoUMaUYEnbijNUaHAWyVj2 (`.claude/drafts/categories-pro.html`)
- 2026-11-19 09:55 he reviewed them: Antigravity **Task 81** = his round-2 changes (collapsed category groups, change pair anywhere with same-category first, searchable pickers instead of native selects, clear outlined segment tabs, "Report a rival" as a blurred front panel, card spacing, bigger outlined buttons, Master Vault = our products only with "Our / Competitor-only" category sections, rename the preview tab so there is no second Sales terminal) + Claude's 6 faults (Task 79, merged). Claude: read the diffs whole, render PC + phone, re-publish all 3 at the same paths.
- DECIDED 2026-11-19 10:05: Master Vault = MAIN warehouse only, no regional/branch warehouse in it (his *"no regional warehouse on the master vault"*); branches stay in Branch Warehouse (`src/App.jsx:64`) + Stock Opname. In Task 81 point H.

## Next, in order
1. His ok on the 3 pictures (or changes -> Antigravity picture task).
2. Antigravity Task 80 (read-only) = the build plan for step 0 + 1: data shape, every file:line, the Console rules text, matrix rows with the `matrixKnowsKey` fallback (`src/config/permissions.js:422-430`), self-check lines. Claude reviews it.
3. Step 0: Aldi publishes the new `firestore.rules` lines in the Console FIRST (category list read/write + 2 new keys in the Sell Again whitelist ~`firestore.rules:669/674`).
4. Step 1 build (Antigravity BUILD task, Claude reviews + renders + gates + pushes): Master Vault categories, product form, Sales Terminal 2-row tabs.
5. Step 2 Competitors screen, step 3 Customers tab - each its own job.

## Traps (from Antigravity Task 75, checked)
- `type` must keep being written with the category NAME during the change-over - Master Vault grouping, ExamineModal, Sales Terminal tabs (`src/MerchantSalesView.jsx:1690`) and `DashboardBenchmarks.jsx:164` read it.
- Sell Again whitelist (`firestore.rules` ~L669-676) rejects any new product key -> permission-denied unless the rule ships first.
- USB Backup / Restore / Wipe in `src/App.jsx` copy named collections only - new collections must be added or they silently drop out of backups.
- A T4 must not READ other regions' prices in the raw data: store region prices as one doc per region (`competitors/{rivalId}/region_prices/{REGION}`) so rules can enforce it.
- Old `customers/{id}/benchmarks` rule (`firestore.rules:780-782`) lets any salesman write; lock it once the approval queue ships.
- Promo items (`kind: 'promo'`, `type: 'PROMO'`) stay out of the shared category list.
