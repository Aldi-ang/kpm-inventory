---
name: feedback-diagnose-before-changing
description: Aldi wants the diagnosis reported and agreed BEFORE any edit, not a fix that arrives with its reasoning attached
metadata:
  type: feedback
---

On 2026-08-20, mid-task on Stock Opname, he stopped me: **"i want u to check whats wrong first
then make the changes"**, and then **"its part of your learning as well"**. I had already written
failing checks for a feature and was two commands from editing a money screen.

**Why:** he owns the app and makes every real decision. A fix that arrives already built takes the
decision away from him — and on a screen he has not asked me to redesign, my idea of "wrong" may
not be his. It also hides the findings he would rather rank himself.

**How to apply:** on any screen he names, report the findings FIRST — ranked, with file and line —
and let him pick the order. Write no code, not even a check, until he answers. This is not the
same as [[feedback_lead_with_the_ask]]: that is about how a reply opens, this is about not
starting.

Reverting cleanly is part of it. When he stopped me I reverted the half-written checks so the
repo stayed green rather than leaving nine failures behind — a stopped task must leave no debris.

The diagnosis pass is also where the real bug turned up: finding #1 (the expected number excludes
damaged stock while the found number includes it) only surfaced because I read the screen's own
arithmetic instead of trusting the feature request. See [[project_kpm_stock_opname_findings]].
