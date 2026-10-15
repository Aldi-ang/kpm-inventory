---
name: project-kpm-model-tier-benchmark
description: "Benchmarked 2026-08-18: setting `model` on a subagent FAILS in this environment — the cost lever is agent count and scope, not tier"
metadata: 
  node_type: memory
  type: project
  originSessionId: 05ce04ce-6db3-46ce-9ef5-0f519265e164
  modified: 2026-08-17T21:51:31.181Z
---

# The model lever does not work here — benchmarked 2026-08-18

Aldi ordered this after three quota resets were burned on one review: *"run that lower model
right after reset, and add this habit and skills to do that inside alucard, u wasted 3 times
quota reset already, i dont want it to happen again"*.

## The result: negative

**Setting `model` on a subagent converts a working agent into a dead one.**

- `model: 'haiku'` → resolves to `cc/claude-haiku-4-5-20251001` → *"There's an issue with the
  selected model … It may not exist or you may not have access to it."*
- `model: 'sonnet'` → resolves to **`cc/claude-opus-5`** → dies the same way.
- **Omitting `model` works** — it inherits `claude-opus-5` (no `cc/` prefix) and runs fine.

Evidence: a 9-agent benchmark workflow (`wf_e9afba9b-f08`) where all 6 haiku/sonnet agents errored
in ~1.3s having done zero work, while all 3 opus agents completed normally; plus two single-agent
probes that reproduced it in isolation. The same `cc/` routing layer also threw
*"cc/claude-opus-5[1m] is temporarily unavailable"* at the Bash permission classifier earlier in the
session, so the prefix is a real routing tier this account cannot reach.

**Re-probe with one throwaway agent before trusting it again** — this may be an access change, not a
permanent property.

## What to do instead

The levers that actually work here, biggest first:

1. **Fewer agents.** The 1.69M-token sweep was expensive because 14 agents each re-derived context
   from scratch, not only because of the tier.
2. **Narrower scope per agent** — name the files, never "the codebase".
3. `effort: 'low'` on mechanical stages (this is *not* affected by the `cc/` problem).
4. Structured output instead of prose.
5. Never re-read a file the parent already read.

## The by-catch, which mattered more than the benchmark

The 3 Opus control agents re-checked 3 claims **the same model had already verified** in the earlier
sweep. **It disagreed with itself on all three** — one straight verdict reversal, two two-step
severity changes. Every fact cited in both passes was true; each pass simply found one fact the other
missed, and that one fact flipped the conclusion.

**So: one verification pass is evidence, not proof.** For anything that moves money — two independent
passes, or reproduce it by hand once, which is cheaper and more certain than both.

Written into `~/.claude/skills/alucard/SKILL.md` §9 and into
`A-Brain/Backlog/SWEEP - 22 claims that got KILLED.md`.

Related: [[project-kpm-cost-fix-workflow]] (a different, unrelated "benchmark question" — that one is
about whether salesmen see team-wide figures), [[project-kpm-alucard-skill]],
[[feedback-9router-subordinate-delegation]]
