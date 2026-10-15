---
name: project-kpm-batch1-permissions-fix-2026-07-26
description: "Batch 1 of the 2026-07-26 fresh review fixed: Rank Config rule gap, 11 missing listener error handlers, motorists/products Fleet Captain gaps — all committed 74a02d2"
metadata:
  node_type: memory
  type: project
  originSessionId: 3396e0f7-3c3c-4874-a1a9-3fbcbd7c62f0
  modified: 2026-07-26T05:16:56.449Z
---

Fixed and committed (`74a02d2`, branch `claude/critical-bugs-permissions-batch-c3371f`) — the first 4 items (2 Critical + 2 High) from [[project_kpm_fresh_review_2026_07_26]]. Items 5-9 from that review (MapMissionControl.jsx unchunked bulk ops, dead UI code, duplication, unused deps) are still open.

**1. Rank Config / Achievement Badges rule gap (Critical).** `artifacts/cello-inventory-manager/settings/{achievements,rpg_ranks}` had zero rule coverage. Added a rule: read open to any authenticated employee (every tier views their own rank/badges on their profile page), write restricted to `COMPANY_OWNER`/`ADMIN` via a new `isRankConfigEditor()` function, matching the UI's own gate. **Important scope note documented in the rules file itself**: this path is NOT nested under `users/{bossUid}` — it's a single doc shared by every company in the Firestore project (same top-level as `employee_directory`), so any company's owner can currently overwrite every other company's rank ladder. That's a pre-existing app design choice (would need an app-code change to move it under `users/{bossUid}/settings/`), not fixed here — documented as a known limitation, not silently patched.

**2. useDatabaseSync.js missing error handlers (Critical).** 11 of 12 `onSnapshot` listeners had no error callback (only `procurement` did, fixed earlier). Added `(err) => console.warn(...)` to all of them: settings, inventory, customers, motorists, transactions, samplings, audit_logs, eod_reports, account_transfers, notifications, admin vehicle canvas.

**3. motorists UPDATE rule (High).** Was `isAreaAdmin(bossUid)` (literal AREA_ADMIN only, no region check). Now `isAuthorizedAreaAdmin(bossUid) && resource.data.location == getEmployeeProfile().location` — covers delegated Fleet Captains (matching create/delete's [[project_kpm_option_b_region_lock|Option B]] region-lock), using `resource.data.location` (pre-write) so the legitimate agent-transfer-to-a-different-branch flow still works.

**4. products UPDATE rule (High).** Was `isAreaAdmin(bossUid)` only. Investigated whether Fleet Captains should reach Master Vault via Load/Clear Canvas at all, or whether the UI should hide the buttons instead — concluded EXTEND the rule, not restrict the UI: Load/Clear Canvas isn't gated behind `canEditRoster` in the UI at all (any Tier-4 Fleet Captain with default `view_fleet` reaches it), a HQ-based Fleet Captain hits Master Vault for completely routine day-to-day operations (not an edge case), and Area Admin's own existing access here already has no `canEditRoster` requirement either. Added `|| isFleetCaptain(bossUid)`, reusing the existing helper from the mapSettings fix rather than inventing a new one.

**Verification**: all 3 rules changes tested via a real Firestore Rules emulator run (JDK 21, `@firebase/rules-unit-testing`, `npx firebase emulators:exec`) — 26/26 assertions passing. Test script committed at `rules-test/test-batch1.mjs` (first test file to actually land in this repo — earlier comments in `firestore.rules` referenced a `rules-test/test-mapsettings.js` that was apparently lost in an abandoned worktree and never made it to `main`).

**Still NOT deployed** — `firestore.rules` in this repo is a draft file only. See [[project_kpm_rules_draft_process]].

**How to apply**: if a future task touches `motorists`/`products` rules or the Rank Config feature again, these fixes are now live in the draft file on this branch — check they land on `main` (see [[feedback_verify_before_claiming_committed]], this session did verify via `git show --stat`). The shared-global-doc limitation on Rank Config/Achievements is a real, undocumented-elsewhere app design gap worth flagging if a future multi-tenant security review comes up.
