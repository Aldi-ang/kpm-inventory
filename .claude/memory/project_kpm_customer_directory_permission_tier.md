---
name: project-kpm-customer-directory-permission-tier
description: "Customer Directory edit permission tier (view_only/own_region/global) added 2026-07-25 — UI + rules, draft not deployed"
metadata:
  type: project
  originSessionId: ca30828c-712e-42fb-b0b7-fc9d8d95df2f
  modified: 2026-07-25T11:17:21.730Z
---

Added a 3rd permission dimension to the Permission Matrix (`config/permissions.js` `CUSTOMER_EDIT_PERMS` + `getCustomerAccessLevel()`), same pattern as `view_reports_*`: `customers_edit_global` (default) / `customers_edit_own_region` / `customers_view_only`. Editable in Settings > Tiers & Logic, right after the Customers toggle.

**Scope decision**: this governs EDITING existing customers only. Read stays fully unrestricted for everyone (unchanged — see [[project-kpm-customer-notification-scoping]], "sell to anyone" is still a hard requirement). NEW Outlet Onboarding (create) is only blocked for `view_only`; `own_region` is NOT region-locked on create — NOO already has its own separate safety net (PENDING status + admin approval), and region-locking create too would block a field agent onboarding a store they're standing in front of.

**Format-mismatch risk (real, documented not fixed)**: `own_region` compares `getEmployeeProfile().location` (free-text branch/area label, e.g. "Headquarters" — see FleetCanvasManager.jsx) against a customer's `region` field (Kabupaten, forced uppercase via CustomerManager.jsx's SSOT validation). These are NOT guaranteed to be the same taxonomy — only works if a company's branch names happen to match their Kabupaten names. Case/whitespace-normalized comparison, but can't fix a genuinely different label. A durable fix would need a real per-employee Kabupaten field.

**Fallback for unclassified customers under own_region**: editable by everyone (fail toward not blocking legitimate work) — matches this project's usual posture. "Unclassified" = empty region OR contains "unknown"/"unmapped"/"uncategorized" (mirrors CustomerManager.jsx's own client-side `isUnknown()` heuristic, replicated server-side).

**Files changed**: `config/permissions.js` (new resolver), `App.jsx` (passes `userRole`+`employeeRegion` to CustomerManagement), `CustomerManager.jsx` (form hidden for view_only, per-card Edit gated by region match, sessionStorage edit-bridge from Map Mission Control also gated, permission-denied alert added), `SettingsView.jsx` (new dropdown in PermissionMatrixEditor, mobile+desktop), `firestore.rules` ([CHANGE 6] — `customerAccessLevel()`/`isUnclassifiedRegion()`/`isOwnRegionMatch()` functions, `customers` match block's create/update gated).

**Testing**: emulator-tested 15/15 (own-region success/cross-region deny both directions, view_only blocks create+update but not read, global unaffected, no-permission_matrix-doc default = global, unclassified fallback works for own_region but NOT view_only, vault owner catch-all unaffected, own_region create stays unrestricted). Test script was scratch-only (not committed to repo) — see this session's transcript for the full script if it needs re-running. Draft is NOT deployed — same [[project-kpm-rules-draft-process]] convention as always.

**How to apply**: if the owner later wants a real fix for the format-mismatch risk, the concrete next step is adding a dedicated Kabupaten field to the employee/roster record (distinct from the free-text `location` branch label) and comparing that instead.
