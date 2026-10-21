---
name: feedback_kpm_dont_push_every_update
description: Push yourself, unasked, at the end of every FINISHED job once the gates are green (his 2026-10-21 call, reverses 2026-09-06); half-done work and boards waiting on his pick stay local
metadata:
  node_type: memory
  type: feedback
  originSessionId: 746db1d4-1dfd-49f8-8c7e-4bcc66b26f9c
  modified: 2026-10-21T01:39:47.480Z
---

**Current rule (2026-10-21):** push to `phase0-solid-ground` yourself at the end of every finished job -
no "say push", no approval window. His words, after a finished job sat waiting on his word:
*"can u push it automatically next time u dont need my permission for that becuase its nothing to lose,
put that  in automation workflow as well"*.

**Why:** waiting on his "push" cost a round-trip on every job, and he judged the downside small
("nothing to lose" - Vercel keeps the previous deployment to roll back to).

**How to apply:** after the LAST edit run the three gates (selfcheck, build, audit), confirm
`git rev-list --count HEAD..origin/phase0-solid-ground` = 0, push, `git fetch`, confirm origin is your
commit, give him the hash. Stays local (not finished): a half-done job, a lab-only board waiting on
his pick, a red gate, code that needs a rule he has not published. Firestore rules are never pushed -
he publishes them in the Console. Full workflow: A-Brain `Wiki/Concepts/Publishing a Fix.md`; short
form in the repo's CLAUDE.md "Publishing".

History: 2026-09-06 *"dont need to push the update everytime"* (after a 17-commit deploy) made the
default local-only; 2026-10-19 removed the approval window when he asked; 2026-10-21 removed the ask.

Related: [[feedback_verify_before_claiming_committed]] - a push is claimed only after `git fetch`
shows origin at the new commit.
