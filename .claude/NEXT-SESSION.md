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

- 2026-11-19 10:35 round 2 (Task 81, 44fe133f) reviewed: diffs read whole, rendered PC 1240 + phone 390 (collapsed groups, searchable pickers, pair save, blurred front panels, 44 px phone buttons, 0 overflow) and RE-PUBLISHED at the same 3 links. Task 83 = 2 small fixes (selected rival's group opens on load; Master Vault category `origin` so a new empty category of ours is not labelled competitor-only).

- 2026-11-19 11:00 his round 3: **Competitors screen APPROVED** (*"competitor screen is good"*). Still to change -> Antigravity Task 84: NOO shops must stand out in the list + a strong Verify NOO for T4+; an UNDO toast (8 s) after every delete (confirm box stays); Master Vault cards show main-warehouse stock big + every price level (Distributor/Retail/Grosir/Ecer). Task 85 (read-only) maps every delete in the real app (17 `deleteDoc(` + batches) and the smallest Undo for each (delayed write vs soft delete vs not undoable for money/stock lines).

## Next, in order
0. 2026-11-19 11:45: Antigravity 82-85 reviewed. Round 3 re-published (Customers v7: NOO tag + gold bar + "NOO to verify: N" + banner with big Verify NOO for T4+, 8 s Undo; Master Vault v3: stock big + all 4 prices; Competitors v3: Undo). Click-tested: verify, delete + UNDO restore, new category stays under "Our". Task 87 = 2 nits; Task 86 = read-only plan for the REAL Undo (delayed-write deletes only, no money/stock rows).
1. His ok on Customers + Master Vault (Competitors already ok).
2. Build plan = Task 80 (df5a12d1) + Task 82 Part 4 fix (5160b764): `manage_product_categories` in NO default `ROLE_PERMISSIONS` list (absence = T1-T4 default, like `canHandOffAcrossRegions`, `src/config/permissions.js:422-431`).
3. Step 0: Change 29 rules draft PROVEN - `rules-test/test-product-categories.mjs` 30 passed / 0 failed, run by Antigravity AND re-run by Claude 2026-11-19 11:44 (`npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-product-categories.mjs"`). Next: Claude writes Aldi the Console paste steps (3a helper after `isSalesman`'s neighbour `sellDamagedHolder`, 3b match after products, 3c two whitelist lines) - only after his picture ok.
4. Step 1 build (Antigravity BUILD task, Claude reviews + renders + gates + pushes): Master Vault categories, product form, Sales Terminal 2-row tabs.
5. Step 2 Competitors screen, step 3 Customers tab - each its own job.

## Traps (from Antigravity Task 75, checked)
- `type` must keep being written with the category NAME during the change-over - Master Vault grouping, ExamineModal, Sales Terminal tabs (`src/MerchantSalesView.jsx:1690`) and `DashboardBenchmarks.jsx:164` read it.
- Sell Again whitelist (`firestore.rules` ~L669-676) rejects any new product key -> permission-denied unless the rule ships first.
- USB Backup / Restore / Wipe in `src/App.jsx` copy named collections only - new collections must be added or they silently drop out of backups.
- A T4 must not READ other regions' prices in the raw data: store region prices as one doc per region (`competitors/{rivalId}/region_prices/{REGION}`) so rules can enforce it.
- Old `customers/{id}/benchmarks` rule (`firestore.rules:780-782`) lets any salesman write; lock it once the approval queue ships.
- Promo items (`kind: 'promo'`, `type: 'PROMO'`) stay out of the shared category list.
