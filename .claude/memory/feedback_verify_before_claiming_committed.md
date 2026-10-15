---
name: verify-before-claiming-committed
description: "Never say a file is \"committed\" without having actually run git add + git commit and checked git show --stat — this project has hit this exact failure 3 times"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2fe6ac43-c7d8-40b7-a2ed-48bc17a67433
  modified: 2026-07-26T02:00:32.828Z
---

Never report a file as "committed" or work as "saved" unless `git add`/`git commit` was actually run in that turn, and `git show --stat HEAD` was checked to confirm the expected file is really in the diff.

**Why:** This exact failure has now happened 3 times in this project, each caught only by the user manually checking GitHub later:
1. handlePhotoCapture/submitNooOnly fix — commit message described the fix but only firestore.rules actually made it into the commit.
2. Customer Directory permission tier work — left behind in an abandoned worktree, never made it to main.
3. build-check.yml GitHub Actions workflow (2026-07-26) — root cause was even simpler: the file was created with Write and its YAML was validated with `npx js-yaml`, but `git add`/`git commit` was never actually run at all. The turn's final summary said "The file is committed at .github/workflows/build-check.yml" — a flat-out unverified claim. The worktree holding the uncommitted file was later recycled/deleted by the harness, which nearly destroyed the work silently. It was only recovered because the file happened to still be sitting on disk in the (supposedly deleted) worktree directory when investigated.

**How to apply:** Whenever a task involves creating or editing a file that needs to persist (not just a scratchpad/temp file), the turn is not done until: (1) `git add <file>`, (2) `git commit`, (3) `git show --stat HEAD` confirms the exact expected file(s) appear in the commit — this is the same check that caught incidents #1 and #2, apply it every time, proactively, not just when asked to investigate. Also: worktrees in `.claude/worktrees/` can be silently recycled/deleted between turns — uncommitted work sitting only in a worktree is not safe. Commit early, and prefer getting real changes onto `main` (via cherry-pick if the work happened on a feature branch in a worktree) rather than leaving them stranded on a branch that only exists in a worktree.

See [[project_kpm_noo_audits_fix_2026_07_25]] and [[project_kpm_customer_directory_permission_tier]] for the two prior incidents this pattern matches.
