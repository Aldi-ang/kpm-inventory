# PROGRESS — read this, search for nothing

**Updated: 2026-08-07 15:41 WIB** · branch `phase0-solid-ground`

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
| The context meter (measures how full we are) | `.claude/context-watch.mjs` |
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

- 🔴 **Other-agent store block — recommendation given, waiting on his go-ahead.** The note used
  to say this was already a loud warning. **It was wrong; the repo won.** `MerchantSalesView.jsx:427`
  is still `window.confirm`, so on his browser it returns false silently and line 429 refuses the
  selection — an invisible hard block, the exact failure the comment at `:408` warns about nine
  lines earlier. Recommended, not yet built: (a) delete the confirm, reuse the `setRevisitToday`
  standing-banner pattern, (b) stamp the saved sale with `territoryOverride: <assignedAgent>`,
  (c) nothing else — no PIN, no approval queue. Reasoning: a wrong *allow* is fixable by the
  existing transfer flow; a wrong *block* kills a real cash sale and teaches login-sharing, which
  destroys all attribution. The identity test at `:426` is a fuzzy substring compare, so it is
  wrong in both directions — never harden a gate built on it.
  **BUILT 2026-08-07 15:06, NOT COMMITTED — waiting on his hand-test.** Audit now 122 checks,
  122 pass (was 115). Both confirm dialogs are gone from the terminal; a new §9 group in
  `integration.audit.mjs` fails the build if either comes back, if a banner text disappears, or if
  the stamp stops reaching either sale payload. What changed: `MerchantSalesView.jsx` (territory
  now sets `territoryClaim` and renders a standing red bar in the brief instead of asking;
  `proximityHit`/`proximityAck` render the duplicate-store warning inside the NOO modal with a
  real "different building" button; `proofPayload` carries `territoryOverride`) and
  `useTransactionEngine.js` (both the offline payload and the online batch write
  `territoryOverride`, so an offline sale carries the same evidence as an online one).
  **What he must test:** pick a store assigned to someone else → it SELECTS, red bar names the
  owner, sale completes. Register a new outlet within 15m of an existing one → warning appears
  in the modal with a button, not silence.
  **Both open questions ANSWERED by Aldi 2026-08-07, VERBATIM:** *"no ranking does nothing to the
  payment, i made them just to motivates them, make sure that all the salesman competing sales to
  work together thats all, its a team game after all"* and *"there are less than 100 salesman as i
  know"*. Both confirm: DO NOT BLOCK. No pay on the ranking = the block protects a motivation game,
  not money. ~100 salesmen + a substring name compare at `:426` = false blocks on real owners are
  routine, not rare (`Adi`/`Adit`/`Aditya`). And a block on covering another's route contradicts
  his own stated goal of salesmen working together. He agreed; waiting only on "build it? yes/no".
- 🔴 **58 more `window.confirm(` calls in 16 OTHER files — same silent-failure bug, untouched.**
  Found while fixing the terminal. Worst: `App.jsx` (18), `components/CustomerManager.jsx` (8),
  `MapMissionControl.jsx` (6), `components/BranchWarehouseManager.jsx` (5), `FleetCanvasManager.jsx`
  (4), `StockOpnameView.jsx` (3), `RestockVaultView.jsx` (3), then 9 files with 1–2 each. Every one
  of them answers *false* invisibly on his browser, so each is a feature that silently does nothing.
  NOT fixed — out of scope for this pass and 16 files is its own job. Needs his go-ahead as a
  separate task, probably one file at a time starting with `App.jsx`.
- ✅ **Retest HQ 1 and HQ (RETAIL) 1** — they should select properly now.
- ✅ **Resume the test list at group C**, then D–G. B2/B3 need his phone (GPS).
  C2 needs a second salesman account, which he does not have — skip and report.
- ~~Connectors~~ **SETTLED 2026-08-07:** leave them alone. They cost almost no tokens and the only
  one actually connected is Chrome for Claude. Do not raise this again.

## 🚫 DO NOT open a PR or merge to main yet

Aldi decided: finish the test list and every adjustment it produces FIRST, then push all 80
commits together. A break found during testing is fixed on `phase0-solid-ground`, never on
main. Do not offer the PR again until groups C-G are done and he says so.

The only uncommitted files are graphify generated output (`graphify-out/` modified files plus
dated folders). Nothing hand-written is unsaved. `graphify update .` regenerates them, so they
are never worth rescuing.

## NEXT, once testing is done — he has not chosen

1. Auto-select the customer when he parks inside their geofence + the two-store swap.
2. The cost chain — needs the journey map and leaderboard changed first.
3. Regional warehouse stock in the rail — own region only, field is `location`.

---

## LOG — newest first, older entries live in `git log` for this file

### 2026-08-07 15:41 WIB — stale-stamp hole in the new territory code, found and closed

Adversarial pass on my own change caught a bug before Aldi ever ran it. `territoryClaim` is
written ONLY by `handleCustomerSelect`. Two paths cleared the chosen customer but left that
name in state:

- after a completed sale (the big reset block, `MerchantSalesView.jsx` ~1096)
- when he types a name over a chosen store (`handleManualCustomerType`, ~483)

Either one meant the NEXT sale — a hand-typed walk-in that has no owner at all — got stamped
`territoryOverride: "<previous store's owner>"`. Wrong name on a real sale record, invisible.
Fixed by clearing `territoryClaim` at both sites, and `proximityHit`/`proximityAck` at the
post-sale reset so an acknowledged neighbour cannot carry into the next new-outlet form.

No audit check added for this one: the built bundle is minified, `setTerritoryClaim` is renamed
to a single letter, so there is nothing stable to match on. Guarded by comments at both sites
instead — the one place prose beats a check here.

Rebuilt: **122 passed, 0 failed**. `graphify update .` run. Still nothing committed.

### 2026-08-07 15:06 WIB
Built all four territory/proximity fixes on Aldi's go-ahead. Audit 115 -> 122 checks, all pass;
baseline was re-run BEFORE editing (115/115) so the 7 new checks are the only delta. The trap is
now encoded as check §9 rather than prose, because the prose version already failed: a comment
warning against `confirm()` sat nine lines above a live one for weeks. First run of that check
FAILED on its own explanation (the comments contain the banned words), so it strips comments and
matches the CALL — the reason has to be allowed to live next to the code.
Design decisions that should not be re-argued: territory is reported and stamped, never blocked;
the stamp is written in BOTH the offline and online payloads or an offline sale would launder the
crossing; the proximity acknowledgement stores the store NAME, not a boolean, so it cannot leak
onto a different neighbour and needs no reset-on-close plumbing.
Discovered and NOT fixed: 58 more `window.confirm(` calls across 16 other files — logged above.
`graphify update .` run (516 nodes, 859 edges). Nothing committed; working tree is dirty.

### 2026-08-07 14:55 WIB
Territory-block question CLOSED on the reasoning side: no hard block. Aldi's own two answers
settled it (recorded verbatim in WAITING ON ALDI above) — ranking carries no pay, and he runs
under 100 salesmen who are meant to cover for each other. Three fixes explained to him in plain
English and awaiting a yes: (1) delete the `window.confirm` at `:427`, reuse the `setRevisitToday`
red-bar pattern so the claim is shown, not asked; (2) stamp the saved sale with
`territoryOverride: <assignedAgent>` — one field, makes every crossing permanently auditable;
(3) deliberately build nothing else (no PIN — shared within a week at that headcount).
UNVERIFIED, does not change the fixes: whether a credit sale crossing territory lands on the
seller's or the store owner's ledger. Settle with `graphify explain "debtInfo transaction agentId"`.
Also spotted, out of scope: `src/.claude/worktrees/` contains three full app copies INSIDE `src/`,
so every grep returns 4x duplicates and the build may be compiling them. Needs its own cleanup.

### 2026-08-07 (later)
Aldi got install advice for 5 outside tools: omniroutes, claude-mem, headroom, claude-code-setup,
task-observer. Checked live instead of guessing — `claude mcp list` shows headroom already
installed and connected; `settings.json` shows every model call already routes through 9Router
(`ANTHROPIC_BASE_URL=127.0.0.1:20128`); Claude Code already ships a native Monitor tool. Verdict:
install none. omniroutes (github.com/diegosouzapw/OmniRoute) duplicates 9Router. claude-mem
(github.com/thedotmack/claude-mem) duplicates the MEMORY.md + this file + A-Brain stack already
running every session. task-observer duplicates the native Monitor tool and Alucard's
`lessons.md`. claude-code-setup (official, `anthropics/claude-plugins-official`, read-only
recommender) is the one real maybe — but `codeburn get_savings` shows 12 MCP servers already at
low tool coverage and 22 unused skills; clean those before adding a tool whose job is to
recommend more. Nothing installed, no repo files touched.

### 2026-08-07 14:46 WIB
Aldi asked whether hard-blocking a cross-territory sale is wise in real life. Answer: no, and the
premise was wrong — reading `MerchantSalesView.jsx:390-431` showed the guard is STILL
`window.confirm` (`:427`), so it is already a hard block and an invisible one on his browser. This
note claimed otherwise; corrected above. Decision logic recorded so it is never re-argued: wrong
*allow* is repairable by the existing store/debt transfer flow (`App.jsx:1607`), wrong *block*
destroys a live cash sale and pushes people to share logins, which erases every attribution the
block existed to protect. The identity check at `:426` is a substring compare (`"Adi"` vs
`"Adikarya"`), wrong in both directions — hardening a gate on top of it multiplies the error.
Recommendation is banner + `territoryOverride` stamp; not built, waiting on his two questions.
Also found `:711` carries the identical `window.confirm` trap for the proximity check. Connectors
question closed by him: leave them, only Chrome is connected.
Nothing was edited in `src/` this turn — advice only.

### 2026-08-07 14:35 WIB
Confirmed clearing the context cannot lose work: /clear empties the conversation only. Branch
is 80 commits ahead of main (+7.1k lines in src; the +116k in the status bar is mostly
generated graphify output, not code). Aldi decided to hold the PR until testing and
adjustments are finished, then push everything at once.

### 2026-08-07 14:32 WIB
SETTLED: autoCompactWindow 600k -> 200k, set directly in ~/.claude/settings.json. Autocompact
cannot be switched off at all (/autocompact rejects "off"; range is 100k-1M), so the only
lever is the number. context-watch measures against that same number, so lowering it pulls
both warnings earlier AND keeps average context low: yellow 110k, RED 160k, autocompact 200k
as a backstop that should never fire. Aldi also confirmed he skims and needs the red banner
first on screen.

### 2026-08-07 14:30 WIB
Aldi DECIDED: no autocompact - he will clear when warned. Setting left at 600k anyway as a
silent backstop, since clearing at the 80%% warning (480k) means it never fires; disabling it
would only remove the safety net for the day he ignores the warning. He also said he skims
and will not read a paragraph, so context-watch now prescribes the banner verbatim: a red
🔴 line at >=80%%, yellow 🟡 at 55-80%%, first thing on screen, nothing above it.

### 2026-08-07 14:25 WIB
Taught Alucard the context-watch habit in §9: act on a [context-watch] line before doing
any work, recommend /clear rather than /compact above 80%, and treat turn count - not big
reads - as the real cost. Deny on alucard/SKILL.md lifted for the edit and restored after.

### 2026-08-07 14:23 WIB
Added a UserPromptSubmit hook that MEASURES context fullness from the live transcript
instead of guessing: it finds the last compaction boundary so a just-compacted session is
not reported as full, and stays completely silent below 55%. At 55-80% it reports headroom
so the upcoming job can be judged against it; above 80% it demands /clear and explicitly
forbids recommending /compact, because clearing is free and compacting at that level bills
the whole window. Claude still cannot clear itself - only Aldi can type it.

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
