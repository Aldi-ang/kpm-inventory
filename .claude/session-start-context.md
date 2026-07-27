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
