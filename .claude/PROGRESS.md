# PROGRESS — read this, search for nothing

**Updated: 2026-08-07 16:34 WIB** · branch `phase0-solid-ground` · last commit `5091e25`

**Aldi clears the session every time he starts a new one. This file is the ONLY thing that
survives. If it is not current, the work is lost.** Write it before context runs low, not after.

This file is printed into Claude automatically at the start of every session, so the
last state is already in front of him before he touches a tool. He must never go
hunting for "where did we leave off" again — that hunt is what cost Aldi 60% once.

If this file and the repo disagree, **the repo wins, and fixing this file is job one.**

## ▶ DO THIS NEXT

**Resume the manual test list.** `SALES_TERMINAL_TEST_LIST.md` now carries its own status table
at the top — read that, not this paragraph, for which item is next. As of this write: A and B
done (B2/B3 need his phone), H1 and H3 passed, **H2 is the next thing he runs**, then C1 and
C3–C6, then D through G. C2b is untestable — it needs a second salesman account he does not have.

Things waiting on Aldi are listed under WAITING ON ALDI below.

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
| The 129-check audit — run before anything | `src/config/integration.audit.mjs` |
| The in-page confirm that replaced every dialog | `src/components/ConfirmGate.jsx` |
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

129 checks over the built output. One turn, small result. If it passes, the terminal is
intact — do **not** re-read source to confirm it.

---

## NOW

Sales terminal redesign is **built and passing 129/129**. Design work is CLOSED.
Aldi is hand-testing it group by group and reporting **BROKEN / UGLY / AWKWARD**.
He got through groups A and B; four fixes from that pass are already committed.

Alongside that: cutting token cost. Root cause was measured, not guessed —
cost = context size x turns taken, and the 60% incident was a *search* for progress
data in the wrong folder. This file exists to end that.

## WAITING ON ALDI — do not re-derive these, just ask

- 🔴 **180 `alert(` and 12 `prompt(` calls across src/ — the SAME bug class, not yet fixed and
  NOT in the scope he approved.** A suppressed `alert` only fails to inform, which is ugly but
  harmless. A suppressed **`prompt` returns null**, so the action silently aborts exactly the way
  the confirms did — `SettingsView.jsx:1048` renames a rank that way. Recommendation: convert the
  12 prompts (small, and they are the ones that actually break), leave the 180 alerts for a later
  sweep or a toast. Needs his yes — 192 call sites is not something to start unasked.

- ✅ **Other-agent store block — DONE, committed `f2060f1`. Kept only for the reasoning; nothing
  here is still an ask.** The note used
  to say this was already a loud warning. **It was wrong; the repo won.** `MerchantSalesView.jsx:427`
  is still `window.confirm`, so on his browser it returns false silently and line 429 refuses the
  selection — an invisible hard block, the exact failure the comment at `:408` warns about nine
  lines earlier. Recommended, not yet built: (a) delete the confirm, reuse the `setRevisitToday`
  standing-banner pattern, (b) stamp the saved sale with `territoryOverride: <assignedAgent>`,
  (c) nothing else — no PIN, no approval queue. Reasoning: a wrong *allow* is fixable by the
  existing transfer flow; a wrong *block* kills a real cash sale and teaches login-sharing, which
  destroys all attribution. The identity test at `:426` is a fuzzy substring compare, so it is
  wrong in both directions — never harden a gate built on it.
  **DONE AND COMMITTED `f2060f1` 2026-08-07 15:21. NOT PUSHED — the branch has no remote at all,
  so Vercel cannot see it. H1 and H3 hand-tested and passed; H2 still open.** Audit now 122 checks,
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
- ✅ **58 `window.confirm(` calls in 16 other files — DONE, committed `5091e25`.** All route
  through `src/components/ConfirmGate.jsx` now. Zero remain in `src/`; audit group 10 fails the
  build if one comes back, if the host stops being mounted in `main.jsx`, if a caller forgets the
  import, or if the gate stops reaching the built bundle. The gate itself is browser-tested (six
  behaviours, listed in the LOG). **The 58 sites in their real screens are NOT tested** — the app
  is behind a master password, so no real screen was ever reached. Do not report them as verified.
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

### 2026-08-07 16:34 WIB — all 58 remaining dialogs replaced, gate tested in a real browser

Aldi said "yes fix all of it" and went to rest. Done and committed.

**What shipped.** `src/components/ConfirmGate.jsx` — an in-page confirm that draws the question
instead of asking the browser. `ConfirmHost` is mounted in `main.jsx` as a **sibling of `<App />`**,
not a child, so no screen can unmount it. All 58 call sites across 16 files converted; 11 enclosing
functions needed `async`, found in one Babel AST pass rather than one build error at a time.
Audit **122 → 129**, all passing. `.gitignore` now covers the dated graphify snapshot folders.
Commits: `5091e25` (this), `f2060f1` + `12aab20` (the terminal work before it).

**Tested in the browser, by me, against the running dev server — six behaviours, all pass:**
draws at all · destructive wording renders red `#b4524a` and plain wording gold `#ff9d00` ·
Cancel resolves `false` · the confirm button resolves `true` · Escape resolves `false` ·
backdrop click resolves `false` and leaves nothing stuck. Buttons measured at 44px.

**What I could NOT test and why — do not claim these are verified.** The whole app sits behind
`ENTER MASTER PASSWORD` and entering a password is not something I am allowed to do, so I never
reached a real screen. Every one of the 58 sites in its actual context is **untested**, and so is
**H2**, which needs a real sale committed against live data. That half is still Aldi's.

**Two traps this cost me, both the same shape — a tool matching its own explanation.** The codemod
rewrote `ConfirmGate.jsx`'s own doc comments and gave the file a self-import; the audit check now
strips comments before matching, and the codemod must skip the gate. Then my browser probe imported
`/src/components/ConfirmGate.jsx` while `main.jsx` held `...jsx?t=1786091480120` — **Vite's HMR
query string makes a second module instance**, so `openGate` was null and the test read as a
failure that was not real. Read the URL out of the served `main.jsx` and import *that*.

Also seen and dismissed: the dev server logged 500s for eight files. Stale — they were emitted in
the seconds between the codemod writing `await` and the async pass fixing it. All eight refetch 200.

### 2026-08-07 15:52 WIB — committed `f2060f1`, two of three new tests passed

Aldi hand-tested and sent screenshots. **H1 pass** — red bar reads "Another agent handles this
store / Assigned to ALEX. Selling is allowed — this sale will be recorded as a territory
override", and the sale completed. **H3 pass** — "Existing store 0m away / You are standing next
to HQ TEST" with the "This is a different building — continue" button, inside the outlet form.

He reported the revisit banner as possibly wrong: he said he sold to "HQ 1" but the banner
appeared on "HQ (RETAIL) 1". **Not a bug** — `MerchantSalesView.jsx:427` reads `cust.lastVisit`
straight off the selected store's own record, no name matching anywhere, so the banner cannot
cross stores. He had sold to both. Do not re-investigate this.

H2 (the stale-stamp test) was written too vaguely for him to follow and he said so. Rewritten in
`SALES_TERMINAL_TEST_LIST.md` as "The H2 test, step by step" with two explicit rounds — after a
finished sale, and typing over a chosen store — because those are two different code paths.

Committed on his instruction, all 10 files, `f2060f1`. He said "as long as its not push into the
vercel": **nothing was pushed, and the branch has no upstream**, so a push cannot happen by
accident. The test list also got a status table and its 115 → 122 correction, and C2 was rewritten
— it still described the deleted double-tap dialog and told him to cancel a pop-up that no longer
exists.

Left uncommitted on purpose: seven untracked `graphify-out/2026-08-0*/` snapshot folders, 3.0 MB
total, one per day, regenerable. They are asked about under WAITING ON ALDI.

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
