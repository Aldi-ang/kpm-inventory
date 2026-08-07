# PROGRESS — read this, search for nothing

**Updated: 2026-08-08 WIB** · branch `phase0-solid-ground` · last commit `c90f397`

**Aldi clears the session every time he starts a new one. This file is the ONLY thing that
survives. If it is not current, the work is lost.** Write it before context runs low, not after.

**STANDING RULE — his instruction 2026-08-07. The limit he means is the 5-HOUR PLAN QUOTA, not
the context window.** He corrected this directly: *"its not the context window, clear wont fix
the problem, im talking about the 5 hours limit - plan usage limit."*

- **`/clear` does NOT help.** Never offer it as the answer to this. It empties context; the plan
  quota keeps counting regardless.
- **Claude cannot see plan usage YET.** `context-watch.mjs` measures the *context window* only —
  a different limit. **But 9router's Quota Tracker has the real number** (`session (5h)`, shown
  as `31 / 100` with a reset countdown) and its `localhost:20128/api/quota` endpoint exists and
  returns **401**, i.e. it works and needs a credential. Building that reader is the top job —
  see the LOG. Until it exists, only Aldi can see the quota, so his stated percentage is the
  only signal.
- **When he states a percentage, act on that turn — do not finish what you were doing first.**
  Write this file, commit, reply short. He said 94% once and the turn stalled anyway, which is
  precisely the stuck-screen-and-force-retry he asked to prevent.
- **Keep this file committed after every landed step**, so a lockout costs one step, never a day.
- Never start something at high usage that cannot be finished and committed inside it.

This file is printed into Claude automatically at the start of every session, so the
last state is already in front of him before he touches a tool. He must never go
hunting for "where did we leave off" again — that hunt is what cost Aldi 60% once.

If this file and the repo disagree, **the repo wins, and fixing this file is job one.**

## ▶ DO THIS NEXT

**1. Build the plan-quota reader — ask Aldi for the 9router credential first.** Full design and
the probe results are in the newest LOG entry. This is the thread he was actively on when he went
to sleep on 2026-08-08, and it is the one that stops him getting locked out mid-work.

**2. Then resume the manual test list.** `SALES_TERMINAL_TEST_LIST.md` carries its own status table
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
| The 147-check audit — run before anything | `src/config/integration.audit.mjs` |
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
| The context meter (measures, never guesses) | `.claude/context-watch.mjs` |
| Duplicate-store logic (pure, has a selfcheck) | `src/utils/findDuplicates.js` |
| Its 21 self-checks | `src/config/findDuplicates.selfcheck.mjs` |
| 8-bit test logger source (published copy) | `.claude/kpm-test-quest.html` |
| The published test logger | `https://claude.ai/code/artifact/435e77ee-9f1f-4786-a1df-050156596016` |
| Next-stop design artifact | `https://claude.ai/code/artifact/8feebaa4-f8a2-414d-a4a6-2c642a27af48` |

## First command of every session

```powershell
npm run build; node src/config/integration.audit.mjs
```

147 checks over the built output. One turn, small result. If it passes, the terminal is
intact — do **not** re-read source to confirm it.

---

## NOW

Sales terminal redesign is **built and passing 147/147**. Design work is CLOSED.
Groups A and B are walked; H1, H3 and C2 confirmed by hand. **Everything below is committed
on `phase0-solid-ground` and NOTHING is pushed — the branch has no upstream, so Vercel cannot
see any of it.**

Three jobs closed today, all after the same root cause: **the app failed silently.**
1. Every browser dialog — 58 confirms + 11 prompts — went dead on his browser and did nothing
   visible. All now route through `src/components/ConfirmGate.jsx`.
2. `pricingTier` vs `priceTier` hid sales-flow stores from the agent who created them, who then
   created them again. Fixed both ends; the repair button ran and reported **3** stores.
3. A duplicate-store finder now exists, because nothing could ever show him the damage.

**Open thread:** 3 stores cannot explain the duplicates he described. The KML import creates a
fresh document per pin with no dedup check of any kind, and is still the prime suspect. He ran
**Find Duplicates**: **11 groups out of 151 stores** — but the largest was a name coincidence
14.5 km wide, so **11 is an upper bound, not a count.** The finder now flags those; the number
after that change is the one to reason from, and he has not re-run it yet.

He also asked for the testing to be less tedious, so the test list now has an 8-bit quest log
(link in the table above). Nothing in it reaches Claude on its own; he presses COPY REPORT and
pastes. No artifact capability exists that would change that — checked, only `downloads` and
`mcp` are available.

## ⏰ SCHEDULED TASKS DO NOT WORK HERE — DON'T OFFER ONE AGAIN

Tried once, 2026-08-07. `mcp__scheduled-tasks__create_scheduled_task`, one-shot, fired at
17:59:34 and auto-disabled itself. **It did nothing at all** — no commit, clean working tree,
no log file anywhere, target file untouched. It records `lastRunAt` whether or not any work
happened, so a stamped timestamp is NOT evidence it ran.

Aldi noticed before the note did: *"i dont think its even running right now"*. The work was
then done directly in-session in about fifteen minutes.

**If he asks for unattended work again, say this failed and offer to just do it now instead.**
Do not promise a scheduled session a second time without testing the mechanism on something
throwaway first.

## WAITING ON ALDI — do not re-derive these, just ask

- ✅ **ANSWERED 2026-08-07: 11 possible duplicate groups out of 151 stores.** But the top group
  was three *"warung sembako sumber rejeki"* **14.5 km apart**, matched on name alone — a shop
  name about as distinctive as "corner shop". Those are almost certainly three real shops.
  **So 11 is an upper bound, not a count.** The finder now flags and demotes name-only matches
  beyond 500m; he has not re-run it since. Get the post-flag number before drawing any conclusion
  about the KML import.

- 🔴 **The 180 `alert(` calls — he has picked NOTHING yet.** The question put to him, verbatim:
  *"My question isn't whether to fix them. It's how"* — a box in the middle of the screen that
  must be dismissed 180 separate times, or **a toast** (a strip that slides into the corner and
  fades by itself). **Claude recommended the toast.** A suppressed `alert` only fails to inform;
  nothing breaks. Do not start either until he answers.

- 🔴 **What is the rule for the duplicate documents that already exist?** Merging or deleting one
  means deciding which copy keeps its sales history and its outstanding debt — real money, human
  judgement, deliberately not automated. Ask only after he has seen the finder's output.


- ✅ **Other-agent store block — DONE, committed `f2060f1`. Kept only for the reasoning; nothing
  here is still an ask. The paragraphs below are the REASONING, kept so it is never re-argued.
  Anything in them written in the present tense is describing the code as it was BEFORE the fix.**

  **The locked decision: territory is reported, never blocked.** A wrong *allow* is repairable by
  the existing store-transfer flow; a wrong *block* kills a live cash sale and teaches
  login-sharing, which destroys every attribution the block was meant to protect. The identity
  test is a fuzzy substring compare, so a wall built on it is wrong in both directions — never
  harden a gate built on it. Do not reopen this.
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

### 2026-08-07 23:0x WIB — 🔴 THE LIMIT THAT MATTERS IS THE 5-HOUR PLAN QUOTA, NOT CONTEXT

**Read this before acting on the entry below it, which chases the wrong thing.**

Aldi, verbatim: *"its not the context window, clear wont fix the problem, im talking about the
5 hours limit - plan usage limit, dont forget your habits."* He was at **94%** of that.

**The distinction, and why it changes everything:**
- **Context window** = how full this conversation is. `/clear` empties it, free. `context-watch.mjs`
  measures this.
- **5-hour plan usage limit** = a rolling quota on his subscription. **`/clear` does NOT help.**
  When it runs out he is locked out entirely, mid-work, screen stuck.

**`context-watch.mjs` CANNOT see plan usage.** It reads the transcript file, which only describes
context. So the 93% tier added earlier today measures the wrong quantity and will never protect
him from the thing that actually stops him. Do not "fix the denominator" and think it is solved —
that was a wrong diagnosis made under time pressure and he corrected it.

**So the habit cannot be automated the way it was attempted.** Claude has no way to read plan
usage. Aldi can see it; Claude cannot. Until a mechanism is found, the rule is:
- **When he says a percentage, treat it as the plan limit and act immediately** — write
  `PROGRESS.md`, commit, stop taking new work. Do not ask him to `/clear`; it will not help.
- Keep committing after every landed piece, so a lockout never costs more than the current step.
- Worth investigating next session: the `explain-usage` skill and whether any command surfaces
  plan usage to Claude. If nothing does, say so plainly and keep the manual rule.

### 2026-08-07 22:5x WIB — the context meter is ALSO broken, but this is NOT what blocked him

**Aldi hit 92% and no warning ever fired — not once, all session.** The hook IS registered
(`.claude/settings.json` → UserPromptSubmit → `context-watch.mjs`) and the script itself works;
it was tested against synthetic transcripts and all four tiers fired correctly.

**The bug is the denominator.** `context-watch.mjs` reads `autoCompactWindow` from
`C:/Users/ASUS/.claude/settings.json` and divides by it. Aldi ran `/autocompact 1000k`, so that
value is **1,000,000** — but the real usable context is nowhere near that. At ~185k used the hook
computes 18% and stays silent, while the UI correctly shows 92%. **The meter has been reporting
roughly a fifth of the truth for this whole session**, which is why the 93% stop never fired and
why the 80% and 55% tiers never fired either.

**Fix to make next session (NOT done — do this before any other work):** stop trusting
`autoCompactWindow` as the window size. Either clamp it (`Math.min(setting, 200_000)`) or drop the
setting entirely and hard-code the real window. Then re-run the four-tier test — the existing
synthetic-transcript method in `git log` for this file works and is cheap. **Do not trust the
93% stop until this is fixed; it cannot fire.**

### 2026-08-08 — ⚠️ RESCUED 259 LINES OF UNCOMMITTED WORK FROM A BURIED WORKTREE

**Tell Aldi this first thing. It was one folder-delete from gone.**

`src/.claude/worktrees/customer-directory-permissions-396625/` held **six modified files, never
committed** — `firestore.rules` (+107 lines), `src/config/permissions.js`, `App.jsx`,
`CustomerManager.jsx`, `SettingsView.jsx`, `MANUAL_TEST_CHECKLIST.md`. This is the **Customer
Directory permission tier** work that memory records as "emulator-tested, NOT deployed". None of
it exists on `phase0-solid-ground`.

Committed on its own branch as **`cccb3c0`** (branch
`claude/customer-directory-permissions-396625`). That changes nothing about its status —
**`firestore.rules` is still a DRAFT and still NOT deployed** — it only moves the work out of
"unsaved on disk" and into git.

**Worktree audit, all four:**
| Worktree | Branch | State |
|---|---|---|
| `critical-bugs-permissions-batch-c3371f` | detached `95c0248` | clean, commit reachable from `main` |
| `customer-directory-permissions-396625` | own branch | **had the 259 lines — now committed** |
| `obsidian-claudian-setup-2d80f9` | own branch | clean |
| `plugin-marketplace-ponytail-68e37f` | detached `3231f21` | clean, reachable from `phase0-solid-ground` |

**No orphans** — every commit is reachable from a branch. **They are now safe to remove**, but
removal is destructive and Aldi has not approved it, so it was NOT done. The command when he says
yes: `git worktree remove <path>` for each, which also un-clutters every future search.

**They are NOT in the build.** Vite only bundles what the entry imports, and nothing imports them;
`integration.audit.mjs`'s `walk()` already skips `.claude`. So the cost is search noise and tooling
confusion, not bundle size. Do not treat this as a performance problem.

**Second finding, lower severity, NOT fixed — needs a decision.** `logAudit` and `triggerCapy` are
optional props in child components, and their use is split: **29 guarded** (`if (logAudit)`) vs
**35 unguarded** bare calls. Inside `App.jsx` unguarded is fine — `logAudit` is defined locally at
`App.jsx:2335`. The risk is only in children (`BranchWarehouseManager.jsx` has 10,
`CrownTransferProtocol.jsx`, `CustomerManager.jsx`, `AuditVaultView.jsx`). App.jsx does pass them
today, so this is a **latent crash risk, not a live bug** — do not report it as one. Fixing means
touching ~35 call sites for a condition that never currently occurs; ask him before spending that.

### 2026-08-08 — the context meter now MEASURES instead of guessing, and it is accurate

**It was wrong twice in one day, in opposite directions. Both fixed; do not "improve" it by
guessing a ceiling again.**

1. **Under-reported.** It divided by `autoCompactWindow` = 1,000,000 and stayed silent all
   session while the UI showed 92%.
2. **Then over-reported.** The "fix" clamped the window to 200k on the assumption that was the
   real size. Aldi's UI then read **459.7k / 1.0M (46%)** while the hook shouted 80% and told him
   to clear with more than half his window free. **His window really is 1M.** The clamp is gone.

**The real repair was the numerator, not the denominator.** It was estimating tokens from message
characters, which only sees message text — never the system prompt, tool schemas or attachments —
so it guessed 160k on a 459.7k conversation. The transcript already carries the true figure:
every assistant line has `message.usage`, and on the MOST RECENT one,
`input_tokens + cache_read_input_tokens + cache_creation_input_tokens + output_tokens` **is** the
context that request actually sent. It now reads that, backwards from the end, and falls back to
the character estimate only when a session has no usage line yet.

**Verified against reality:** hook computes **466,796 (47%)** where Aldi's UI showed
**459,700 (46%)** — 7k apart, which is just the turns between his screenshot and the check. It
correctly stayed silent at 46%, being under the 55% threshold.

**Standing warning for whoever touches this next:** never hard-code or clamp the window. Read
`autoCompactWindow` and trust it. Both of today's failures came from assuming a number instead of
measuring one.

### 2026-08-08 — 🟢🟢 9ROUTER EXPOSES THE REAL QUOTA. Read it, do not estimate it.

**This supersedes the calibration design below. Build this instead — it is the true number, not a
fitted guess.**

Aldi started 9router and pointed at its Quota Tracker. His screenshot, verbatim from the UI:

> **Claude · Account 1 · session (5h) · 31 / 100 · 69% · in 4h 0m**

So the quota is **already tracked, already normalised to /100, and already carries the reset
countdown**. No token summing, no calibration, no weighting guesswork needed.

**Probed `localhost:20128` while it was running:**
```
/api/health   200
/api/quota    401      <- exists, needs auth
/api/quotas   401      <- exists, needs auth
/api/usage    401      <- exists, needs auth
/quota /usage /health  404
```
**The endpoints are real. They only need a credential.** Not pursued further — Aldi had gone to
sleep and hunting for his API key unasked is not something to do while he is away.

**Next session, in order:**
1. Ask him where 9router's API key/token lives, or for the header it wants. **Ask — do not go
   looking through his config files for a credential.**
2. `curl` one authenticated call to `/api/quota` and **record the real response shape** before
   writing anything against it. Never code against a guessed JSON shape.
3. Then a UserPromptSubmit hook that reads it and warns at his thresholds. Because this is the
   real percentage, the "never under-report" rule is satisfied by construction — no rounding-up
   fudge needed.
4. If the key turns out to be awkward, the transcript-calibration design below still works as a
   fallback. It is now plan B, not plan A.

**Also captured for calibration if plan B is ever needed:** at ~80% context in this session, his
tracker read **31/100 with 4h 0m remaining**.

### 2026-08-08 — plan B (superseded by the above): estimate from transcripts + calibration

Aldi asked whether codeburn or 9router could give the 5-hour quota. **Both checked, both no —
but the raw transcripts can, and that is the answer.**

- **codeburn — cannot.** `get_usage` totals return `costUSD / calls / sessions / cacheHitPercent`,
  **no token counts and no timestamps**, and its finest period is a whole calendar day. A rolling
  5-hour window cannot be cut from day buckets. Do not revisit this.
- **9router — not running.** Nothing answers on `localhost:20128` (`/usage`, `/api/usage`,
  `/v1/usage`, `/api/stats`, `/health` all dead). If he starts it, its usage section is worth
  re-checking; until then it does not exist.
- **The transcripts CAN.** `~/.claude/projects/**/*.jsonl` carries per-call
  `message.usage` — `input_tokens`, `output_tokens`, `cache_creation_input_tokens`,
  `cache_read_input_tokens` — **plus an ISO `timestamp` on nearly every line.** Verified on the
  live file: 533 of 978 lines carry usage, and a trailing-5-hour sum computed cleanly
  (**74.9M tokens in the last 5 hours from that one file alone**).

**So the numerator is real and cheap. The denominator is the whole problem** — Anthropic does not
publish the 5-hour allowance to the client, and it is weighted (model, output vs input, and cache
reads are not billed like fresh input; his cache-hit rate is **99.99%**, so a raw token sum is a
bad proxy on its own).

**The design, which solves that — calibrate against him, do not guess:**
1. Script sums tokens across **all** project transcripts in the trailing 5 hours, rolling.
2. When Aldi states a percentage (he does this naturally — *"its passes 92%"*, *"94% now"*),
   record `{tokens_at_that_moment, percent_he_said}` to a small JSON file.
3. Allowance = median of `tokens / (percent/100)` across calibration points. One point makes it
   usable; two or three make it good.
4. A UserPromptSubmit hook then reports estimated plan usage every turn, **labelled an estimate**,
   and stays silent until at least one calibration point exists.

**Non-negotiable when building it:** it must never under-report. That failure — a meter trusted
while quietly wrong — is what let him hit 92% in silence. If uncalibrated, say so; do not show a
number. Round the estimate **up**.

**Not started. Context was 79% when this was settled and the build did not fit in the remainder.**

_Older entries live in `git log -p .claude/PROGRESS.md`._
