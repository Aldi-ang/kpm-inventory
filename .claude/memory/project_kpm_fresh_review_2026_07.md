---
name: project-kpm-fresh-review-2026-07
description: "Findings from the 2026-07-25 full codebase review — items 1-6 (2 Critical + 4 High) now FIXED, see noo-audits-fix memory; items 7-9 still open"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7d2121b6-4ca0-4f59-b71e-9c415c5ffa5c
  modified: 2026-07-25T10:46:30.904Z
---

Investigate-and-report review. Items 1-6 were fixed in a same-day follow-up session (branch `critical-noo-pending-audits-dc259b`) — see [[project-kpm-noo-audits-fix-2026-07-25]] for what changed and how it was verified. Items 7-9 are still open. Original findings kept below for reference:

**CRITICAL — still broken as of 2026-07-25:**
1. `MerchantSalesView.jsx` ~line 1287: the "Register New Outlet" (NOO) modal's photo input has `onChange={handlePhotoCapture}`, but `handlePhotoCapture` is never defined anywhere in the file (confirmed via exhaustive grep + git history — has been this way since the earliest commit in this repo's tracked history). Opening the NOO modal and touching the photo capture throws `ReferenceError: handlePhotoCapture is not defined`, breaking new-store registration entirely. Not caught by `npm run build` since it's a runtime JSX identifier reference, not a static/type error.
2. `pending_audits` (StockOpnameView.jsx Stock Opname submission) and `quarantine_logs` have ZERO explicit `firestore.rules` coverage — only the generic owner/distributor-admin catch-all applies. `quarantine_logs` writes are safely gated behind `isHighCommand` in the UI (accidental safety). But `pending_audits` CREATE (the "Submit to HQ" button on the default "count" tab) has no such gate — any tier that reaches the Stock Opname screen can hit Submit. The code's own design (default tab for non-isHighCommand users, BRANCH_WAREHOUSE routing) clearly intends Area Admin (Tier 3) to submit counts, but `config/permissions.js`'s default `ROLE_PERMISSIONS` doesn't currently grant Tier 3 `view_stock_opname` — it's one Settings-matrix toggle away from being live-broken for whichever tier gets it. Needs a dedicated Firestore rule for `pending_audits` (create for isSalesman/isAreaAdmin submitting their own branch, update for isHighCommand approving) before that toggle is ever turned on.

**HIGH:**
3. `App.jsx` `handleImportSharedConfig` (~line 2895, "Import Shared Config") uses a raw `writeBatch` for the product-catalog import with no `commitInChunks` — its near-identical sibling `handleRestoreData` (the USB Safe Backup restore) already got this fix. A company with 500+ SKUs would fail this import.
4. `App.jsx` `flushOfflineData` (~line 196, the offline-sales auto-sync-on-reconnect flow) manually reimplements chunking instead of using `commitInChunks` — missing the byte-size cap (offline sale payloads can carry base64 photos) and the sequential pacing; fires all chunk commits concurrently via `Promise.all` rather than sequentially. This is the exact high-stakes path (a truck's full day of offline sales syncing at once) where the missing safeguards matter most.
5. `StockOpnameView.jsx` still has 4 of 6 `onSnapshot` listeners without an error callback (branchInventory ~68, monitorInventory ~124, and both quarantine-facility listeners ~144/168) — only 2 (pending_audits/quarantine_logs, ~104/111) got the fix. Same bug class the file was already partially patched for.
6. `App.jsx`'s `handleDeleteHistory` (passed to `HistoryReportView` as `onDeleteFolder`) is dead code — `HistoryReportView.jsx` never actually calls `onDeleteFolder` anywhere. (Note: this function was defensively hardened with `commitInChunks` in an earlier session pass without realizing it's unreachable from the UI.)

**MEDIUM:**
7. Most of `useDatabaseSync.js`'s bulk listeners (settings, products, customers, motorists, transactions, samplings, audit_logs, eod_reports, account_transfers, notifications, ADMIN_VEHICLE) still lack error callbacks — only `procurement` was fixed. This is the core data-sync hook every screen depends on.
8. `production_targets` (RestockVaultView.jsx) has the same missing-explicit-rule pattern as pending_audits, but is currently safe because the whole RestockVaultView screen is gated behind the owner-only `isAdmin` flag at the App.jsx level.
9. `handleAdminApproveTransfer`'s transaction-reassignment loop (App.jsx ~1502) is unchunked, bounded today only by the 7-day transaction window (not a hard cap).

**Positive findings**: no TODO/FIXME/HACK comments anywhere in src/; dependencies are current (React 19, Firebase 12); no stray scratch/test files in the actual repo.

**How to apply**: if a future session touches MerchantSalesView.jsx's NOO flow or StockOpnameView.jsx/firestore.rules, check whether items 1-2 have been fixed yet before assuming NOO registration or Stock Opname submission works.
