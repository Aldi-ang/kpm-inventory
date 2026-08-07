# PROGRESS — read this, search for nothing

**Updated: 2026-08-07 14:11 WIB** · branch `phase0-solid-ground`

This file is printed into Claude automatically at the start of every session, so the
last state is already in front of him before he touches a tool. He must never go
hunting for "where did we leave off" again — that hunt is what cost Aldi 60% once.

If this file and the repo disagree, **the repo wins, and fixing this file is job one.**

## ▶ DO THIS NEXT

**Resume the manual test list at group C** — `SALES_TERMINAL_TEST_LIST.md`, groups C through G.
Four things are waiting on Aldi; they are listed under WAITING ON ALDI below.

**Aldi will often not remember any of this, and that is fine — it is what this file is for.**
"where were we?" / "what were we doing?" / "continue the last work" are all answered from THIS
FILE ALONE, in the first reply, with **zero tool calls**. Never run a command, read a file, or
search anything to reconstruct state — that search is the 60% incident, and this file exists so
it never happens twice. Answer, then ask which of the waiting items he wants to take.

---

## Where things live — never search for these

| What | Exact path |
|---|---|
| The sales terminal (all UI work lands here) | `src/MerchantSalesView.jsx` |
| The 115-check audit — run before anything | `src/config/integration.audit.mjs` |
| Money & logic self-checks | `src/config/*.selfcheck.mjs`, `src/hooks/useSound.selfcheck.mjs` |
| Aldi's 51-item manual test list | `SALES_TERMINAL_TEST_LIST.md` (repo root) |
| Standing rules (auto-loaded each session) | `.claude/session-start-context.md` |
| Compaction guidance (auto-loaded) | `.claude/pre-compact-context.md` |
| Long-term memory index | `C:\Users\ASUS\.claude\projects\D--APP-DEVELOPMENT-kpm-inventory-main-FILES-kpm-inventory-main\memory\MEMORY.md` |
| The resume brief (traps, locked decisions) | same memory folder → `project_kpm_merchantsales_redesign_brief.md` |
| A-Brain vault (decisions, incidents, backlog) | `D:\APP DEVELOPMENT\kpm inventory main FILES\A-Brain` |
| Code knowledge graph — query, do not grep | `graphify-out/` |
| Alucard's rules (edit-denied — lift in settings first) | `C:\Users\ASUS\.claude\skills\alucard\SKILL.md` |
| The Stop hook that keeps this file honest | `.claude/check-progress.mjs` |
| Next-stop design artifact | `https://claude.ai/code/artifact/8feebaa4-f8a2-414d-a4a6-2c642a27af48` |

## First command of every session

```powershell
npm run build; node src/config/integration.audit.mjs
```

115 checks over the built output. One turn, small result. If it passes, the terminal is
intact — do **not** re-read source to confirm it.

---

## NOW

Sales terminal redesign is **built and passing 115/115**. Design work is CLOSED.
Aldi is hand-testing it group by group and reporting **BROKEN / UGLY / AWKWARD**.
He got through groups A and B; four fixes from that pass are already committed.

Alongside that: cutting token cost. Root cause was measured, not guessed —
cost = context size x turns taken, and the 60% incident was a *search* for progress
data in the wrong folder. This file exists to end that.

## WAITING ON ALDI — do not re-derive these, just ask

- 🔴 **Other-agent store block.** Picking a store assigned to another salesman is now a
  loud warning, not a hard block. Does he want the block back? If yes: build it as an
  in-page confirmation, **never `window.confirm`** (his browser suppresses dialogs, so it
  silently returns false and the guard fails invisibly).
- ✅ **Retest HQ 1 and HQ (RETAIL) 1** — they should select properly now.
- ✅ **Resume the test list at group C**, then D–G. B2/B3 need his phone (GPS).
  C2 needs a second salesman account, which he does not have — skip and report.
- 🔴 **`/autocompact 200k`** — recommended, 600k is costing triple rent. His call.
- 🔴 **Connectors.** He approved removing unused ones, but they are claude.ai account
  settings — only he can click them. GitHub and Vercel are both unnecessary here
  (`gh` CLI covers GitHub; this app deploys to Firebase, not Vercel).

## NEXT, once testing is done — he has not chosen

1. Auto-select the customer when he parks inside their geofence + the two-store swap.
2. The cost chain — needs the journey map and leaderboard changed first.
3. Regional warehouse stock in the rail — own region only, field is `location`.

---

## LOG — newest first, older entries live in `git log` for this file

### 2026-08-07 14:11 WIB
Added DO THIS NEXT at the top, and the rule that a vague question from Aldi ("where were
we?") is answered from this file alone with zero tool calls. He should never have to
remember his own progress; reconstructing it with tools is the failure this replaces.
He also switched off and deleted a large number of claude.ai connectors and plugin packs,
cutting the fixed per-session tax.

### 2026-08-07 14:07 WIB
Built this file and the two hooks that keep it true (`d403de9`): a Stop hook that blocks
any turn which changed the project while leaving this note stale, and a SessionStart hook
that prints it before anything else. Then added the same habit to Alucard §1 (never search
for progress — it is already printed) and §11 (write the note before closing, including
after a conversation that only *decided* something, which the hook cannot detect). Aldi's
`Edit()` deny on `alucard/SKILL.md` was lifted for that edit and **restored afterwards** —
§8 of that file asserts the rule exists, so leaving it off would make his advisor lie.

Also settled: starting a NEW session and typing `/clear` are equivalent — both wipe context
to zero and both print this file. And "continue with the last work" is a *search* prompt;
with this file loaded he can name the task directly instead.

### 2026-08-07 13:56 WIB
Measured where tokens actually go by parsing the session transcripts. Found the old
diagnosis was wrong: no single tool result ever exceeded 3k tokens, so "stop reading the
big file" was aimed at nothing. The real driver is **~29 tool round-trips per user
message against a context that is re-sent every turn**. Corrected
`.claude/session-start-context.md` (`aaa3eda`). Established that `/clear` costs nothing
while `/compact` at 90% costs ~540k — so notes + clear beats compact at a clean break.
Researched `rtk-ai/rtk`: verdict **do not install** — it only shrinks shell output, misses
Claude's native Read/Grep entirely, and would compress away the `git show --stat` proof
Aldi requires before any "done" claim.

### 2026-08-07 (earlier)
Test list check-count corrected to 115 (`33e112b`). Resume brief compressed 118 → 96
lines and the `window.confirm` trap written down for the first time.

### 2026-08-06
PreCompact hook added and standing rules compressed 128 → 59 lines (`8feb135`).
Four fixes from Aldi's first test pass (`a2c6c5c`), store selection always acts and the
round follows the week (`ba4ffe5`), brief waits for a chosen customer (`5eb2a87`).
