---
name: feedback-tell-it-once
description: "Write the story once in the commit message; everywhere else is a pointer, not a retelling"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 62f409ee-9e20-473c-8f28-a32809cbf254
  modified: 2026-08-18T09:41:56.184Z
---

Aldi, 2026-08-18, after being shown the measurement: 2,359 lines written *about* the work
vs 195 lines of actual fix in one session — 12 to 1. He said **"yes"** to cutting it to ~4 to 1.

**The rule: tell it once, point at it four times.**

- **Commit message** — the full story lives here. It sits beside the code forever, `git log` is
  free, and it is the only copy that cannot drift from what shipped.
- **`.claude/PROGRESS.md`** — one line and the commit hash. Not the story.
- **A-Brain** — the *lesson* only (what to do differently next time), never a retelling of what
  the bug was. If the entry could be replaced by `git show <hash>`, it should be.
- **`.claude/NEXT-SESSION.md`** — the next job only. It already must not restate standing rules;
  it must not restate finished ones either.
- **The reply to him** — what he must do, the numbers, done.

**Why:** the same facts were being copied into five places per fix. The information never
improved by being repeated; it just cost him quota on every turn afterwards.

**Not covered by this — do NOT shorten:**
- The self-checks in `src/config/*.selfcheck.mjs`. They caught two of my own wrong claims in the
  session where this rule was made. See [[project_kpm_manual_test_checklist]].
- Code comments that say why something must NOT change (the guards on deliberate gaps).
- Security warnings, irreversible-action confirmations, and questions to him — those stay full
  sentences. See [[feedback_explain_in_plain_english]] and [[feedback_lead_with_the_ask]].
