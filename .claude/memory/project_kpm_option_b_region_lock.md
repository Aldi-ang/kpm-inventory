---
name: project-kpm-option-b-region-lock
description: Option B (Area Admin region-lock on motorists create/delete) investigated and applied 2026-07-24
metadata: 
  node_type: memory
  type: project
  originSessionId: 7d2121b6-4ca0-4f59-b71e-9c415c5ffa5c
  modified: 2026-07-26T05:17:07.785Z
---

Applied 2026-07-24: `firestore.rules` `[CHANGE 3 — OPTION B]` locks a delegated Area Admin (`canEditRoster: true`) to creating/deleting `motorists` docs only within their own `location`. Previously they could hire/fire an agent in ANY region via a direct SDK call (the UI already restricted this, but the rules didn't).

**The blocking question from the original reconciliation** was whether an agent-transfer-to-a-different-branch feature exists that this would break. Confirmed it does: `FleetCanvasManager.jsx`'s `handleSaveAgent` (~line 166-177) lets an Area Admin edit an EXISTING agent's `location` field and save it via `batch.update(...)`. Critically, that's an **update**, not a create+delete — and Option B only touches the `create`/`delete` rules for `motorists`, leaving `update` (`isAreaAdmin(bossUid)`, no region check) completely untouched. So the transfer feature keeps working; only spinning up a brand-new agent or deleting an existing one outside the admin's own region is now blocked.

**Verified via a real Firestore Rules emulator run** (not hand-reasoning) — `@firebase/rules-unit-testing` against JDK 21 (this machine only had JDK 8; installed Temurin 21 via winget with the user's explicit go-ahead first). All 8 assertions passed: own-region create/delete allowed, cross-region create/delete denied, vault owner unaffected, non-authorized Area Admin still denied.

**Still NOT deployed** — `firestore.rules` in this repo is a draft file only; the owner deploys manually via `firebase deploy --only firestore:rules`. See [[project-kpm-rules-draft-process]].

**How to apply**: if a future task touches the `motorists` rules block again, this region-lock is now live in the draft file — check it doesn't get silently reverted, and remember the `update` rule is intentionally NOT region-locked (that's what keeps agent transfers working).

**Update 2026-07-24 — extended to Fleet Captain.** The owner confirmed the "Allow Roster Management" toggle (canEditRoster) is meant for "high tier" generally, and FleetCanvasManager.jsx:717 confirms it: the toggle is offered to BOTH `AREA_ADMIN` and `FLEET_CAPTAIN` profiles in the UI. `isAuthorizedAreaAdmin()` previously only recognized the literal `'AREA_ADMIN'` role, so a Fleet Captain with the toggle ON could never actually use it — a dead UI control. Fixed by broadening `isAuthorizedAreaAdmin()`'s own role check to accept either role (kept the function name to avoid touching its 5 call sites); this also means Option B's region-lock automatically now covers Fleet Captain too, no separate edit needed. Emulator-verified (13/13 passing): Fleet Captain own-region create/delete allowed, cross-region denied, non-authorized denied, Area Admin regression-checked unchanged, and — importantly — a Fleet Captain can also create the matching `employee_directory` login record (not just the `motorists` doc), since the real registration flow (FleetCanvasManager.jsx `handleSaveAgent`) writes both in one batch.

**STALE as of 2026-07-25 — verify before relying on this.** Checked `firestore.rules` in a fresh worktree today (branch `critical-noo-pending-audits-dc259b`) while doing an unrelated task, and `isAuthorizedAreaAdmin()` there only checks `userRole == 'AREA_ADMIN'` — no Fleet Captain broadening present. Either this change lives on a different branch that hasn't merged, or it was reverted since 2026-07-24. Didn't investigate further (out of scope for that session) — if a future task touches Option B or the roster-management toggle, re-verify current file state rather than trusting this memory's "13/13 passing" claim.

**RE-VERIFIED 2026-07-26 (branch `claude/critical-bugs-permissions-batch-c3371f`) — present and correct.** `isAuthorizedAreaAdmin()` in the current `firestore.rules` DOES include the FLEET_CAPTAIN broadening (`userRole == 'AREA_ADMIN' || userRole == 'FLEET_CAPTAIN'`) plus `canEditRoster`. Whatever caused the 2026-07-25 staleness must have been a different branch/worktree that didn't have it — this branch is current. Also extended the sibling `motorists` UPDATE rule (previously untouched by Option B, plain `isAreaAdmin()`) to the same `isAuthorizedAreaAdmin()` + region-lock pattern — see [[project_kpm_batch1_permissions_fix_2026_07_26]].
