---
name: project-kpm-customer-notification-scoping
description: "Why per-tier customer/notification visibility can't be safely scoped today in kpm-inventory-main, and what would need to change"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7d2121b6-4ca0-4f59-b71e-9c415c5ffa5c
  modified: 2026-07-24T12:45:54.055Z
---

Investigated 2026-07-24 whether customer and notification Firestore reads could be narrowed per-tier (same question already answered for `transactions` — see [[project-kpm-rules-draft-process]]). Conclusion documented as comments in `firestore.rules` above the `customers` and `notifications` match blocks. Summary:

**Customers: blocked, parked (same category as transactions).**
- `permittedCustomers` (App.jsx ~2916) filters by `priceTier`, NOT by any per-employee identity. Customers do carry an `assignedAgent` field, but it's a free-text agent NAME used only for a soft territory-overlap warning (fuzzy `.includes()` match in MerchantSalesView.jsx/JourneyView.jsx) — not an access-control key.
- Legacy customers missing `priceTier` are reclassified client-side via fuzzy string matching on a free-text `tier` field (App.jsx ~2929-2937). Firestore queries can't replicate that, and silently exclude docs missing the field rather than matching them.
- Bigger blocker: MerchantSalesView (Sales Terminal, App.jsx:3512) and CustomerManagement (main directory tab, App.jsx:3576, commented "REQUIRED FOR BENCHMARKS") both intentionally receive the FULL unfiltered customer list, not `permittedCustomers` — every tier needs to sell to/look up any company customer. Narrowing the base query would break the core sales workflow for every Tier 3-6 employee, not just a display nicety.
- Real fix needs a data-model change (a real per-customer owner id used consistently everywhere) plus a product decision on whether "sell to anyone" still holds. Out of scope as a quick fix.

**Notifications: closer to fixable, but has one live gap — also parked pending a prerequisite.**
- App.jsx:258 subscribes to the ENTIRE notifications collection with no query constraint (not even a time gate); client-side filter is `combinedNotifications` (App.jsx:355-358) keyed on `agentId` (a real id, or literal `'ADMIN'`) — much cleaner than the customer case.
- Blocking gap found: `components/CustomerManager.jsx` ~line 761 (the "🏪 NOO Verification Required" notification) writes with NO `agentId` field at all, relying on the client's `!n.agentId` fallback to route it to Admins. A query-based scope has no equivalent for "field is absent."
- Also unverified: whether older live documents (this collection is never pruned) predate the `agentId` convention and are missing it too — needs a live data check not available from this investigation.
- Path to actually doing this: fix the CustomerManager.jsx write to always set `agentId`, confirm/backfill any existing docs missing it, THEN narrow the query + tighten the rule. Not done — investigate-only task.

**How to apply**: if a future task revisits per-tier customer/notification scoping, don't re-derive this — start from the comment blocks in `firestore.rules` and this memory. If someone actually wants to fix notifications, the CustomerManager.jsx `agentId` gap is the concrete first step.

**Update 2026-07-24 — the CustomerManager.jsx gap is now fixed.** Added `agentId: 'ADMIN'` to the NOO_APPROVAL notification (`src/components/CustomerManager.jsx` ~line 761, inside `handleSubmit`). Confirmed via `git log -S "NOO_APPROVAL"` this is the ONLY place that notification type is ever created, and it's been missing `agentId` since the feature was introduced (commit 74f92dd) — so **every NOO_APPROVAL notification in the live database predates this fix and is missing `agentId`**. This is a live-data gap, not a code gap; no backfill script was written (out of scope, touches live data). The two other blockers noted in the original investigation (whether OTHER notification types also have legacy docs missing `agentId`, and the full narrow-the-query-and-tighten-the-rule path) are still open — this update only closes the one specific write-site gap that was already identified.
