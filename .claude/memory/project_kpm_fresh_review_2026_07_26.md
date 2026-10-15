---
name: project-kpm-fresh-review-2026-07-26
description: "Findings from the 2026-07-26 full app review + git/worktree audit — 2 Critical + 4 High + several Medium, all open as of writing"
metadata: 
  node_type: memory
  type: project
  originSessionId: 305b81e5-bd84-43a4-bec6-ffe9c00cac58
  modified: 2026-07-26T05:17:15.981Z
---

Investigate-and-report review (git/worktree integrity audit + full app review). Nothing was fixed in this session — pure investigation. See [[project_kpm_fresh_review_2026_07]] for the prior (2026-07-25) review this builds on; don't re-derive items already closed there.

**Git/worktree audit result: CLEAN.** 3 stale worktrees found beyond the working one (`audit-abandoned-worktrees-3cd8ff`, `customer-directory-permissions-396625`, `confident-khorana-a9e0b2`/branch `install-mcp-server-7ed8e3`) — all checked directly against `main` via `git show --stat`/`git diff main -- <file>`. No lost work in any of them: 2 branches are ancestors of `main` (fully merged), the 3rd (`07eeea4`, unmerged) is byte-identical content to what landed on `main` via a different commit (`fcb255b`). Also spot-checked 5 "claimed fixed" commits directly against `main` — all contained real diffs. First clean git audit in this project's history — the [[feedback_verify_before_claiming_committed]] discipline appears to be holding.

**CRITICAL:**
1. `artifacts/cello-inventory-manager/settings/{achievements,rpg_ranks}` (Rank Config + Achievement Badges, written/read in `AgentProfileView.jsx` ~140,149,208,337) has ZERO firestore.rules coverage — doesn't match `users/{bossUid}` or `employee_directory`, so only the hardcoded super-admin email catch-all applies. Every real customer, including COMPANY_OWNER (the tier this feature is gated to via `edit_rank_config`), gets silently permission-denied (swallowed by try/catch). Feature has likely never worked for any real customer.
2. `src/hooks/useDatabaseSync.js` — 10 of its 11 `onSnapshot` listeners (products, customers, motorists, transactions, samplings, audit_logs, eod_reports, account_transfers, notifications, settings/general, ADMIN_VEHICLE) have no error callback. Only `procurement` does (fixed in an earlier session). This is the app's central data-sync hook — a denied read here means core data silently stays empty forever, no console trace. Same root issue flagged as item 7 in the 2026-07-25 review; still not fixed a day later.

**HIGH:**
3. `firestore.rules` `motorists` UPDATE rule (~line 361) still uses plain `isAreaAdmin()` (literal 'AREA_ADMIN' only) while CREATE/DELETE on the same collection were fixed to also cover delegated FLEET_CAPTAIN via `isAuthorizedAreaAdmin()`. `FleetCanvasManager.jsx`'s `canEditFleet` (~41, gates Edit button ~840) shows the Edit control to delegated Fleet Captains — clicking it fails at the Firestore layer. New instance of the recurring isAreaAdmin()-doesn't-cover-FLEET_CAPTAIN bug class.
4. Same bug class again: `products` collection UPDATE rule (~246) is also literal-AREA_ADMIN-only. `FleetCanvasManager.jsx` Load/Clear Canvas (~265-393) writes to `products` when the selected roster entry is an office-tier role or HQ-based — reachable by any Fleet Captain by default (`view_fleet` on for Tier 4), even against their own profile.
5. `MapMissionControl.jsx` bulk border operations (`handleWipeAll` ~583, `handleRenameFolder` ~662, `handleDeleteFolder` ~692) and seasonal tier-automation (`runDataCleanse` ~1531, `applyChanges` ~1649) all still loop one write per doc instead of using `commitInChunks` — same file already fixed this exact pattern for KML *import* but not for bulk delete/rename or the tier automation tools, which can scale to hundreds of customers/borders. `App.jsx:2221` `handleDeleteConsignmentData` has the same unchunked shape as its already-fixed sibling `handleDeleteHistory` right next to it.
6. `pending_audits` CREATE rule requires literal AREA_ADMIN; `StockOpnameView.jsx` shows the submit screen to anyone who isn't `'ADMIN'`. Config-dependent (only breaks if an owner turns on `view_stock_opname` for Tier 4-6 via Settings, which is a real supported toggle, not default-on).

**MEDIUM — dead/broken UI code found and personally verified (not just agent-reported):**
- `App.jsx`: `setDarkMode` and `setSearchTerm` are declared but never called anywhere in the file (confirmed via direct grep) — dark mode toggle and inventory search box may not actually work in the running app; worth a manual UI check.
- `App.jsx`: `setReadVirtualNotifs` (~270) is never called despite `readVirtualNotifs` being read at ~354/368 — logistics notifications likely can never be marked read.
- Duplication risk: `formatRupiah` reimplemented in 5 files instead of importing from `utils/helpers.js`; `compressImageToBase64` copy-pasted identically in 3 files; the legacy-role-translator block is copy-pasted 3x inside `permissions.js` itself (`isFieldLevelTier`/`isFleetManagementTier`/`hasClearance`) — exactly the shape that's already caused tier-check drift before.
- Unused: `src/Duke3D.jsx` (never imported, references a missing `.glb`, would crash if used) plus its 3 now-dead dependencies (`@react-three/drei`, `@react-three/fiber`, `three`); also `clsx`, `tailwind-merge`, `react-is` unused anywhere; `src/monalisa.jpg` (189KB, unreferenced) and `src/assets/react.svg` (Vite template leftover).
- More listeners missing error handlers outside useDatabaseSync.js: `App.jsx` customer sync (~330), agent's own profile feeding Sales Terminal (~1316), notifications (~285), stock_requests (~342); `FleetCanvasManager.jsx` fleet roster (~25), branch stock during sale (~68); `MerchantSalesView.jsx:479` gps_bypasses doc (blocks a sale — gets stuck on "Awaiting approval" forever if denied); `BranchWarehouseManager.jsx` (~57,67).

**How to apply:** Before assuming Rank Config/Achievement Badges, dark mode toggle, inventory search, or logistics notification read-status work in the live app, check whether these have been fixed. If a future session touches `useDatabaseSync.js` or `MapMissionControl.jsx`'s bulk operations, these are the exact open gaps to check against.

**UPDATE 2026-07-26 — items 1-4 FIXED** (Rank Config rule gap, useDatabaseSync.js's 11 missing error handlers, motorists UPDATE Fleet Captain gap, products UPDATE Fleet Captain gap). See [[project_kpm_batch1_permissions_fix_2026_07_26]] for full detail, emulator evidence, and the deliberate "extend the rule not restrict the UI" call on item 4. Committed `74a02d2`, still NOT deployed. Items 5 (MapMissionControl unchunked bulk ops), 6 (pending_audits — already fixed separately, see [[project_kpm_noo_audits_fix_2026_07_25]]), and the MEDIUM dead-code findings are still open.
