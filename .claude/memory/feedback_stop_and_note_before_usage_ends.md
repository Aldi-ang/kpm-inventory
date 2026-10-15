---
name: feedback_stop_and_note_before_usage_ends
description: "The limit that stops Aldi is the 5-hour PLAN QUOTA, not the context window — /clear does not help, Claude cannot see it, so act the instant he states a percentage"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ab96c81c-c584-4548-a4a9-db7c51ecf953
  modified: 2026-08-07T17:50:40.175Z
---

Aldi, 2026-08-07: *"before each token usage run out, i want u to stop the work and make notes
before the usage run out and stuck on the screen"* … then the correction that matters:
*"its not the context window, clear wont fix the problem, im talking about the 5 hours limit -
plan usage limit, dont forget your habits."*

**Two different limits. Do not confuse them again — I did, and wasted his quota doing it.**
- **Context window** — how full the conversation is. `/clear` empties it, free. `context-watch.mjs`
  measures this and warns about it.
- **5-hour plan quota** — a rolling cap on his subscription. **`/clear` does nothing for it.**
  When it runs out he is locked out mid-work with a stuck screen and has to force a retry.

**Why it costs so much:** a lockout mid-task leaves the next session with no note covering the
work in flight, so it re-derives everything. He clears every session, so `.claude/PROGRESS.md` is
the only thing that survives.

**How to apply:**
- **Claude has no way to read plan usage.** Only he can see it. So the trigger is him saying a
  number — treat any stated percentage as the plan quota unless he says otherwise.
- **The moment he states one, act on that same turn.** Write `PROGRESS.md`, commit, reply short.
  Do not finish the current piece of work first. He said 94% and the turn stalled anyway — the
  exact failure he was trying to prevent.
- **Never answer this with `/clear`.** Suggesting it reads as not having listened.
- Write and commit `PROGRESS.md` after every landed step, so a lockout costs one step.
- Do not begin work at high usage that cannot be finished and committed inside it.
- See [[project_kpm_every_action_must_report]] — same principle applied to Claude: never go quiet
  and leave him guessing what state things are in.
