## Standing toolkit for this project (kpm-inventory)

Four things work together here. Ponytail and Graphify are already covered by their own
mechanisms (Ponytail's own SessionStart hook; Graphify's section earlier in this file). This
covers the other two, always active for this project specifically:

### Caveman mode — ALWAYS ON for this project (full intensity)

Respond terse like smart caveman. All technical substance stays — only fluff dies.

Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries,
hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution
for"). Technical terms exact. Code blocks unchanged. Errors quoted exact.

Pattern: `[thing] [action] [reason]. [next step].`

Not: "Sure! I'd be happy to help you with that. The issue you're experiencing is likely
caused by..."
Yes: "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:"

Drop caveman for: security warnings, irreversible-action confirmations, multi-step
sequences where fragment order risks misread, anything where compression itself creates
ambiguity. Resume after that part's done. Code/commits/PR descriptions: write normal.
"stop caveman" from Aldi reverts to normal mode for the rest of the session.

### Karpathy Guidelines — standing discipline for all code work here

1. **Think before coding.** Don't assume, don't hide confusion. State assumptions
   explicitly. If multiple interpretations exist, present them, don't pick silently. Push
   back if a simpler approach exists.
2. **Simplicity first.** Minimum code that solves the problem. No speculative features, no
   abstractions for single-use code, no error handling for impossible scenarios.
3. **Surgical changes.** Touch only what the request needs. Don't "improve" adjacent code.
   Match existing style. Remove imports/vars YOUR change orphaned; don't remove
   pre-existing dead code unless asked — mention it instead.
4. **Goal-driven execution.** Turn tasks into verifiable success criteria ("fix the bug" →
   "write a test that reproduces it, then make it pass"). For multi-step work, state a
   brief plan with a verify step per item.

### A-Brain — the persistent knowledge base, check for more than just code questions

Path: `D:\APP DEVELOPMENT\kpm inventory main FILES\A-Brain`

Not just for architecture/code-structure questions (that's Graphify's job, see above) —
check A-Brain for anything about project status, what's open, past decisions, or "what
should I work on":
- `Wiki/Index.md` or `Wiki/MOC.md` — decisions, patterns, incidents (browsable by topic)
- `Backlog/Backlog.base` — the actual current to-do list (To Do / Ready to Deploy / Parked
  / Done)
- `runs/session-ingest-state.md` and recent files in `runs/` — what happened recently
- `Personal-Context.md` — who Aldi is and how he wants to work

If asked "what's my to-do list" or similar, check `Backlog/` first — don't answer purely
from this repo's own memory folder without also checking there.

### Before you tell Aldi that nothing was done on something

Design work does NOT land in the repo. Plans, prototypes and research live outside it, so
file timestamps and `git log` will say "nothing happened" while a finished design exists.

When he says "we did X yesterday" and you cannot see it, run these two BEFORE answering:

```bash
ls -t ~/.claude/plans/ | head -5
ls -t ~/.claude/projects/D--APP-DEVELOPMENT-kpm-inventory-main-FILES-kpm-inventory-main/*.jsonl | head -3
```

The plan file is the design record. The repo only shows shipped code. Checking mtimes and
`git log --all` first — and concluding nothing happened — cost ~30% of a session's usage on
2026-08-02 and produced a confident wrong answer.

### Put what Aldi has to DO at the very top

He does not read the whole message. Stated by him 2026-08-02, and again after it was missed:
*"always highlight your question or job that i need to do for u because i wont read your whole
thinking message."*

Every reply that needs anything from him opens with a single bold line naming it — a question
to answer, a command to run, a thing to test, a decision to make. One line, first thing, before
any explanation. If nothing is needed from him, say that in one line instead. Reasoning,
verification and detail go underneath, where he can ignore them safely.

A question buried in paragraph six is a question that was never asked.

### Showing Aldi an HTML prototype — never the file

Prototypes here build their DOM in JavaScript. The render panel shows a static snapshot and
does **not** run scripts, so the file renders as a black frame with nothing pressable — which
reads as "the prototype lost everything" when the file is perfectly intact.

Always give the **published artifact URL** (claude.ai runs the JS). Never `SendUserFile` an
HTML prototype with `display: "render"`. Promoted to a standing rule 2026-08-02 after this
failed twice — `phase2-design.html`, then `dukes-ledger-v2.html`.

A memory note that describes a session's *starting intent* goes stale the moment that session
finishes. When a session produces a plan file or an artifact, the memory for that topic must
name the path. If it doesn't, fix the memory before doing anything else.

### Keep the resume cheap — Aldi pays for it in usage, every time

He raised this twice, most recently 2026-08-06: *"can u clear or compress the context window
everytime before the usage run out, it just took 30% of the usage everytime we continue."*

The cost is not the conversation, it is **re-deriving state that was already known**. Two
rules, both on you, not on him:

**1. Run the check, do not read the code.**
```bash
npm run build; node src/config/integration.audit.mjs
```
105 checks over the built output. It answers "is the terminal intact?" in one command and
costs a fraction of reading `MerchantSalesView.jsx`, which is ~2.000 lines. The other
`*.selfcheck.mjs` files under `src/config/` do the same for the money paths. **Reading source
to orient yourself is the expensive habit — the checks exist so you do not have to.**

**2. Compress the resume memory BEFORE the session ends, not when asked.**
`project_kpm_merchantsales_redesign_brief.md` is loaded to resume. It grows every session
because progress gets appended to it. **Keep it under ~100 lines.** It went 181 → 92 once,
then drifted back to 242 and cost him 30% again.

What belongs in it: the first command, current state in a few lines, what is next, and the
traps. What does NOT: a commit-by-commit history (`git log --oneline` is free and always
current), anything the audit already asserts, and any narrative of how a decision was
reached — only the decision.

**A trap encoded as a passing check is worth more than a trap described in prose**, because
it cannot go stale silently. When you fix something subtle, prefer adding a check to writing
a paragraph.
