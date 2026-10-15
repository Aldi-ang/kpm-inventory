---
name: project-kpm-alucard-skill
description: "Alucard is a SKILL at ~/.claude/skills/alucard/ (invoked /alucard), NOT a subagent — a subagent's output is never shown to Aldi, so its Communication Contract could never reach him. Built 2026-07-28; benchmark not yet run."
metadata: 
  node_type: memory
  type: project
  originSessionId: 99571c27-8b07-410b-9cd3-38a283d72ba5
  modified: 2026-08-06T11:37:54.950Z
---

**Alucard** = Aldi's advisor persona. Lives at `C:\Users\ASUS\.claude\skills\alucard\SKILL.md`
(9,098 B), invoked as `/alucard`. Companion: `lessons.md` (its growth surface),
`~/.claude/commands/godmode.md` (a max-verification effort dial, explicitly NOT a permission
dial).

**The core design fact, learned the expensive way:** Alucard MUST be a skill, not a subagent.
A subagent's final report is never shown to the user — the parent session relays it. So every
contract-shaped sentence (the challenging first line, `[certain]` tags, `not-chosen:`
opportunity-cost lines) would be paraphrased away by a parent not running the contract. Four
planning rounds hardened a contract for a vehicle that could not deliver it before anyone
asked who reads the output. A skill loads into the MAIN session, so the contract applies
verbatim. The superseded `~/.claude/agents/a-brain-assistant.md` was deleted — two
near-identical descriptions would have made agent selection nondeterministic.

The reversal fixed a second, unnamed problem: as a skill, Alucard's turns are ordinary
main-session turns, which the nightly ingest task demonstrably captures. As a subagent its
conversation might never have been captured at all, and the learning loop would have silently
recorded nothing.

**Two silent-failure traps caught while building the self-edit guard** — both worth
remembering because they generalise:
1. A `Write(path)` deny rule in Claude Code settings is **accepted but never matched** — only
   `Edit(path)` works for file-write denial. A `Write(...)` rule looks correct and protects
   nothing.
2. On Windows, deny paths must be POSIX-normalised (`//c/Users/...`). Escaped backslashes
   silently never match. In *user* settings a single leading `/` anchors to `~/.claude/`, not
   the filesystem root.
Both were verified against current docs, then tested for real: editing `SKILL.md` was blocked,
editing `lessons.md` succeeded — the exact asymmetry the learning loop needs.

**Guard consequence worth knowing:** the deny rule blocks Aldi/Claude from editing `SKILL.md`
too, not just Alucard. Changing the contract requires temporarily removing the
`Edit(//c/Users/ASUS/.claude/skills/alucard/SKILL.md)` line from `~/.claude/settings.json`,
editing, then restoring it. That friction is deliberate.

**Status: BENCHMARKED, verdict KEEP (2026-07-29).** All 6 runs done, real tokens pulled from
each session's own JSONL (never self-reported by Aldi — one run's pasted numbers were caught
as a partial-flush race and replaced with the verified sum). Totals: alucard costs more tokens
(in 4374 vs 1552, out 43514 vs 26810 — loses that axis) but scores higher on criteria-met
(9/10 vs 7/10 — wins that axis). Decision rule required losing **both** axes to delete;
alucard lost only one, so it survives. Full breakdown, all 6 rows, and two flagged caveats (run
2: criteria passed but the answer was factually wrong — graphify undercounted callers 7 of 21;
run 4: better process discipline than run 3 but the same fixed score) in
`A-Brain/runs/alucard-benchmark.md`. **Correction, 2026-08-06:** `lessons.md` is no longer
unproven — as of this date it holds 5 entries (its hard cap) and **every one has at least one
real recorded fire**, across sessions this memory's author didn't have visibility into when
first written. The loop is genuinely active, not hypothetical. Practical consequence: the cap
is now load-bearing — a new entry can only be added by retiring an existing zero-fire entry to
`A-Brain/Wiki/Lessons-Archive.md` (none currently qualify), or not written at all. Caught this
by being forced to `Read` the file before an `Edit` — don't trust a prior summary's claim about
`lessons.md`'s state without re-reading it live first.

**How to apply:** if asked to modify Alucard, expect the deny rule to block you — lift and
restore it deliberately, don't work around it. If asked whether Alucard is worth using, cite
the KEEP verdict and the token/criteria tradeoff above, not a vague impression — re-check after
30 more coding sessions per the benchmark's own cadence rule, not on a vibe. Never let the
nightly ingest task write to `~/.claude/skills/alucard/` — its SKILL.md now carries a HARD
BOUNDARY section forbidding it, routing proposals to `A-Brain/runs/lesson-candidates.md`
instead.
