---
name: project-kpm-batch2-unmerged-discovery
description: "Batch 1 AND Batch 2 permission/bugfix commits (74a02d2, d3ec78f) both exist, fully tested, but were never merged into main — clean fast-forward available"
metadata: 
  node_type: memory
  type: project
  originSessionId: 99571c27-8b07-410b-9cd3-38a283d72ba5
  modified: 2026-07-26T13:53:49.720Z
---

Discovered 2026-07-26 while building the Obsidian backlog board: branch `claude/critical-bugs-permissions-batch-c3371f` contains TWO complete, tested fix commits that never made it to `main`:

- `74a02d2` — "Batch 1": Rank Config rule gap, 11 useDatabaseSync.js listener error handlers, motorists/products Fleet Captain gaps. (This is the same content [[project_kpm_batch1_permissions_fix_2026_07_26]] already describes as "committed" — but that memory never confirmed it reached `main`, and it hadn't.)
- `d3ec78f` — "Batch 2 of the Jul 26 2026 fresh review (everything not covered in Batch 1)": commitInChunks on the remaining unchunked bulk ops (handleWipeAll, handleRenameFolder, handleDeleteFolder, runDataCleanse, applyChanges, handleDeleteConsignmentData), 11 more listener error handlers, pending_audits rule widened, dark mode toggle + inventory search actually wired to real UI controls (were previously orphaned state), logistics notification read-state persistence fixed, formatRupiah/compressImageToBase64/legacy-role-translator de-duplicated. Emulator-tested 8/8 (rules-test/test-batch2.mjs) + re-verified 26/26 on batch1's tests.

**Verified 2026-07-26**: `git merge-base --is-ancestor main claude/critical-bugs-permissions-batch-c3371f` returns true — main is a strict ancestor, so this is a **clean fast-forward merge**, no conflicts possible.

**Why this matters:** confirms [[feedback_verify_before_claiming_committed]]'s pattern one more time — "committed" in a memory or commit message does not mean "on main." Always check `git merge-base --is-ancestor main <branch>` / `git log main..<branch>` before treating branch work as shipped.

**How to apply:** This branch is now the single highest-value action in the project — merging it resolves nearly the entire July 26 review in one step (only unused-code cleanup, the production_targets rule, and handleAdminApproveTransfer chunking are NOT covered by it — those remain genuinely open). Firestore rules from both batches still need a manual `firebase deploy --only firestore:rules` after merging, per [[project_kpm_rules_draft_process]]. Tracked as backlog cards in the new kpm-notes vault (see [[project_kpm_notes_vault_relocated]]).
