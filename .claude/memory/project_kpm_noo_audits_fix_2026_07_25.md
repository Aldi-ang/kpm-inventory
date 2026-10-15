---
name: project-kpm-noo-audits-fix-2026-07-25
description: "6 fixes applied 2026-07-25 on branch critical-noo-pending-audits-dc259b: broken NOO registration, missing pending_audits rule, unchunked writes (x2), missing listener error handlers, dead delete-history button"
metadata: 
  node_type: memory
  type: project
  originSessionId: 363a9cfa-f945-40c3-976a-4948c87d92bd
  modified: 2026-07-25T10:46:25.728Z
---

Fixed all 6 items (2 Critical + 4 High) from [[project-kpm-fresh-review-2026-07]] in one session, on branch `critical-noo-pending-audits-dc259b`. Not yet merged/pushed as of writing — check branch status before assuming this is live.

**UPDATE 2026-07-25 (later same day) — this is exactly what went wrong.** A commit (`e11548e`) landed on `main` claiming in its message to include all 6 of these fixes, and Vercel deployed it — but the live site still crashed with the exact same `handlePhotoCapture is not defined` error. Root cause, confirmed via `git show e11548e --stat`: that commit's ACTUAL diff only touched `firestore.rules` (an unrelated Fleet Captain change from a different task) + a `package.json`/`package-lock.json` version bump — none of the 5 JS/rules files above were ever part of it. The real fix had been sitting the whole time as **uncommitted changes inside a leftover git worktree** at `src/.claude/worktrees/critical-noo-pending-audits-dc259b/` (excluded from `git status` on main via `.git/info/exclude`, so it was invisible to normal checks). It was never merged — the commit message described the intended fix, but the wrong working directory got committed.

Recovered by diffing the worktree against its base commit (`c005946`, confirmed byte-identical to main's then-HEAD for all 4 JS files) and copying `src/App.jsx`, `src/MerchantSalesView.jsx`, `src/StockOpnameView.jsx`, `src/components/HistoryReportView.jsx` directly from the worktree into main, then manually merging the worktree's `pending_audits` rule block into main's `firestore.rules` (which had independently gained the unrelated Fleet Captain change in the interim — no overlap, clean merge). Build verified clean; `handlePhotoCapture`/`submitNooOnly` now each appear twice (definition + usage) in `MerchantSalesView.jsx`. Still uncommitted as of this note — the owner needs to review, commit, push (for the JS fixes to redeploy via Vercel), and separately run `firebase deploy --only firestore:rules` for the `pending_audits` rule (per the usual not-auto-deployed rules process).

**Lesson for future sessions**: after any commit whose message claims to fix specific files, verify with `git show <commit> --stat` that those files are actually IN the diff — don't trust the message. Also check `git worktree list` if a "fixed" bug reappears after a deploy; a stray worktree with uncommitted matching changes is a strong signal the real fix never left the worktree.

**1. NOO photo capture (Critical)** — `MerchantSalesView.jsx`: implemented `handlePhotoCapture`, mirroring the file's own `handleTxPhotoCapture` (600px-wide canvas compress to base64 JPEG, 0.6 quality). Sets `nooForm.photoUrl`, which becomes `storeImage` on the new customer doc.

**Bonus find not in the original review**: `submitNooOnly` (the modal's "Register Only (No Sale)" button) was ALSO undefined — a second crash in the same modal, only reachable after fixing #1. Implemented it as a trimmed copy of `submitNooRegistration` that registers the customer but skips locking cart pricing / advancing to a sale.

**2. `pending_audits` firestore.rules gap (Critical)** — added a dedicated `match /pending_audits/{auditId}` block: `isAreaAdmin(bossUid)` gets create+read; update/delete stay closed (HQ approve/reject already covered by the owner/distributor-admin catch-all). Emulator-verified 10/10: own-company Area Admin create/read allowed, different-company Area Admin denied, Field Operative denied, vault owner unaffected via catch-all, Area Admin update/delete still denied. Still a DRAFT — not deployed, per [[project-kpm-rules-draft-process]].

**3 & 4. Unchunked writes (High)** — `App.jsx` `handleImportSharedConfig` and `flushOfflineData` (offline auto-sync) both now use `commitInChunks` instead of hand-rolled batching, matching `handleRestoreData`'s pattern.

**Side finding, NOT fixed (out of scope)**: `handleImportSharedConfig` is dead code — defined but never passed to any UI component, confirmed via ESLint `no-unused-vars` and a repo-wide grep. The "Import Shared Config" feature described in the task brief doesn't actually have a button anywhere. Fixed the function's internals anyway since that's what was asked, but it's unreachable from the UI today — same category as item 6 below, just not asked to investigate.

**5. StockOpnameView.jsx missing listener error handlers (High)** — added `(err) => console.warn(...)` to the 4 remaining `onSnapshot` calls (own-branch inventory ~line 68, monitor view ~124, quarantine "ALL branches" loop ~144, quarantine single-facility ~168), matching the 2 that already had it.

**6. Dead delete-history button (High)** — `App.jsx`'s `handleDeleteHistory` (chunked, hardened) was passed to `HistoryReportView.jsx` as `onDeleteFolder` but never called. Added the button to the Level 7 "Receipt Archive" header (the per-customer transaction-folder view), admin-gated, calling `onDeleteFolder(cObj.name, selectedAgent)` — matches the function's `(customerName, agentName)` signature exactly since both values are already in scope there.

**How to apply**: if a future session touches any of these 5 files (MerchantSalesView.jsx, StockOpnameView.jsx, App.jsx, HistoryReportView.jsx, firestore.rules) for NOO/audit/sync/history work, these fixes should already be present — if not, check whether this branch was merged.
