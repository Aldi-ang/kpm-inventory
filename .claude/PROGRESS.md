# PROGRESS — read this, search for nothing

**Updated: 2026-08-08 14:20 WIB** · branch `phase0-solid-ground` · last commit `e7f2eab`

**Aldi clears the session every time he starts a new one. This file is the ONLY thing that
survives. If it is not current, the work is lost.** Write it before context runs low, not after.

**STANDING RULE — his instruction 2026-08-07. The limit he means is the 5-HOUR PLAN QUOTA, not
the context window.** He corrected this directly: *"its not the context window, clear wont fix
the problem, im talking about the 5 hours limit - plan usage limit."*

- **`/clear` does NOT help.** Never offer it as the answer to this. It empties context; the plan
  quota keeps counting regardless.
- **SOLVED 2026-08-08 — `.claude/plan-quota.mjs` reads the real quota** from 9router at
  `GET localhost:20128/api/usage/<connectionId>`. Registered as a UserPromptSubmit hook, tiers at
  70/85/95%. **LIVE and verified** — it fired on its own at 80% on 2026-08-08. Credential files
  are in place and 9router auto-starts at login. Do not confuse it with `context-watch.mjs`,
  which measures the context window — a different limit that `/clear` DOES fix. Aldi understands
  the distinction now: *"clear is for notification for context window isnt"*. Yes.
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

**JOB 1 IS DONE — committed `e7f2eab` 2026-08-08. JOB 2 is now the next thing to start.**
He said: *"option b looks convenience do that instead, anyway lets work on what
we can do while im away, do full review of my app now, but before we do that let me clear first"*

**✅ JOB 1 — the `alert()` calls → toast. DONE, committed `e7f2eab`, NOT PUSHED.**
It was **184** calls across 18 files, not 180. All gone; audit **158/158**, severity self-check
**33/33**, build green, and the toast was **verified rendering in the running app** (dev server,
real `ToastHost`): failure toast stayed past 4.2s, success toast cleared itself, click dismissed
it, accent `rgb(180,82,74)` on `rgb(20,16,14)` — palette law intact.
- `src/components/Toast.jsx` — same shape as ConfirmGate: module singleton, one host in
  `main.jsx` beside `<App/>`, plain `notify(msg)` at the call sites. **No second mechanism.**
- **`notify()` is NOT async and must never become async.** Several sites are written
  `return alert(msg)` → `return notify(msg)`; both return undefined. That is why zero functions
  needed converting and the whole thing was a textual swap. Audit group 13 pins this.
- **No modal was added.** Instead: a message stays on screen until clicked unless it is
  recognisably a success. `src/utils/toastSeverity.js` decides, `toastSeverity.selfcheck.mjs`
  tests it on 32 real messages. **If Aldi says the toasts nag too much, widen the SUCCESS list
  there — never make the default fade.** 🔴 he has not seen it in daily use yet; that is the
  one thing to ask him after he tests.
- Trap found and fixed, not shipped: the crown transfer reported the handover then reloaded on
  the next line. `alert` used to block there; a toast does not, and a reload destroys the host.
  Now a 5s delay. `signOut()` is fine — the host is a sibling of `<App/>`, so the toast survives
  onto the login screen. Audit group 13 bans the immediate-reload form, and that check was
  proved to FAIL on the pre-fix code before it was kept.

**JOB 2 — a full review of the app. ▶ START HERE.** He asked for a proper one, not a skim. `src/` is finally
clean (worktrees gone, so searches return one hit each). Known leads already recorded:
`logAudit`/`triggerCapy` unguarded at 35 sites vs guarded at 29 (latent, not live — App.jsx
defines `logAudit` locally at ~:2335), the KML import creating a fresh doc per pin with no dedup,
and `App.jsx` being ~4k lines doing many unrelated jobs.


**JOB 3 — his hand-testing, whenever he wants it.** `SALES_TERMINAL_TEST_LIST.md` carries its own status table
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
| The in-page toast that replaced every alert | `src/components/Toast.jsx` |
| Which toasts stick vs fade (the one judgement call) | `src/utils/toastSeverity.js` + `src/config/toastSeverity.selfcheck.mjs` |
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
| The 5-hour PLAN quota watcher | `.claude/plan-quota.mjs` |
| Its credential — OUTSIDE the repo, never commit | `C:/Users/ASUS/.claude/9router-cookie.txt` + `9router-claude-id.txt` |
| Duplicate-store logic (pure, has a selfcheck) | `src/utils/findDuplicates.js` |
| Its 21 self-checks | `src/config/findDuplicates.selfcheck.mjs` |
| 8-bit test logger source (published copy) | `.claude/kpm-test-quest.html` |
| The published test logger | `https://claude.ai/code/artifact/435e77ee-9f1f-4786-a1df-050156596016` |
| Next-stop design artifact | `https://claude.ai/code/artifact/8feebaa4-f8a2-414d-a4a6-2c642a27af48` |

## First command of every session

```powershell
npm run build; node src/config/integration.audit.mjs
```

158 checks over the built output. One turn, small result. If it passes, the terminal is
intact — do **not** re-read source to confirm it.

The two pure-logic self-checks are separate and cheap:

```powershell
node src/config/toastSeverity.selfcheck.mjs; node src/config/findDuplicates.selfcheck.mjs
```

---

## NOW

Sales terminal redesign is **built and passing 158/158**. Design work is CLOSED.
Groups A and B are walked; H1, H3 and C2 confirmed by hand. **Everything below is committed
on `phase0-solid-ground` and NOTHING is pushed — the branch has no upstream, so Vercel cannot
see any of it.**

**The silent-failure job is now COMPLETE.** Every browser dialog in the app is gone: 58
confirms, 11 prompts, and as of `e7f2eab` all **184 alerts**. Nothing in `src/` can report
through a box the browser is allowed to suppress, and groups 9, 10 and 13 of the audit fail
the build if one comes back.

Four jobs closed, all after the same root cause: **the app failed silently.**
1. Every browser dialog — 58 confirms + 11 prompts — went dead on his browser and did nothing
   visible. All now route through `src/components/ConfirmGate.jsx`. The 184 `alert()` reports
   had the identical disease and now route through `src/components/Toast.jsx` (`e7f2eab`).
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

- ✅ **DONE — he said "yea save the cookies for us to use".** Credential files written outside the
  repo and the meter is LIVE, verified reading `plan: Claude Code, used 60%, resets in 3h 57m`.

- ✅ **DONE — 9router auto-starts at login.** He said *"yes autostart"*. Created
  `…/Start Menu/Programs/Startup/9router.bat`, which launches the 9router CLI minimised.
  **To undo, delete that one file — nothing else depends on it.** Verified the absolute path
  executes and 9router stayed healthy.
  **Trap:** writing that path with `printf` turns the `\n` of `\npm` into a real newline and
  silently produces a broken launcher — that is how the first attempt failed. Use a quoted
  heredoc. Same class of bug bit a Python edit of this very file (`\U` of `\Users`).
  The research behind it, kept because it explains why a Startup file was the only option:
  - 9router has **no start-on-login setting of its own** — checked all 45 keys in `/api/settings`.
  - It is a global npm package with a CLI already on PATH: `C:/Users/ASUS/AppData/Roaming/npm/9router`
    (default port 20128; the running process is
    `node --dns-result-order=ipv4first --max-old-space-size=6144 …/npm/node_modules/9router/app/custom-server.js`).
  - Only `Ollama.lnk` is in
    `C:/Users/ASUS/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup/`, and neither
    HKCU nor HKLM `Run` mentions 9router.
  - **Proposed:** drop a one-line `.bat`/shortcut calling `9router` into that Startup folder.
    Reversible by deleting one file. NOT done — it changes Windows startup behaviour and he has
    not explicitly approved that specific action.

- ⏳ **That cookie's `auth_token` is a ~24h JWT — it expires 2026-08-09 ~08:45 WIB.** The hook
  detects a 401 and prints the exact refresh steps rather than going blind. **Better fix worth
  asking about:** whether 9router's settings page offers a permanent API token, which would end
  the daily re-paste.

- ✅ **ANSWERED 2026-08-07: 11 possible duplicate groups out of 151 stores.** But the top group
  was three *"warung sembako sumber rejeki"* **14.5 km apart**, matched on name alone — a shop
  name about as distinctive as "corner shop". Those are almost certainly three real shops.
  **So 11 is an upper bound, not a count.** The finder now flags and demotes name-only matches
  beyond 500m; he has not re-run it since. Get the post-flag number before drawing any conclusion
  about the KML import.

- ✅ **DECIDED 2026-08-08: toast (his "option b"). BUILT AND COMMITTED `e7f2eab`.**

- 🔴 **ONE QUESTION FOR HIM AFTER HE USES IT: do the toasts nag?** The rule shipped is *a
  message stays on screen until you click it, unless it is recognisably a success.* That was
  chosen to fail safe — a missed "stock did not save" is the bug being fixed, an extra click is
  not. But it means roughly 100 of the 184 need a click. **Ask him in plain words: "when a
  message stays until you tap it, is that helpful or annoying?"** If annoying, the fix is one
  file — widen the SUCCESS list in `src/utils/toastSeverity.js` and add the message to
  `toastSeverity.selfcheck.mjs`. **Never make the default fade.**

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

### 2026-08-08 14:xx WIB — JOB 1 done: 184 alerts → toast, `e7f2eab`. Audit 158/158.

**It was 184, not 180**, across 18 files, and a census first proved every one was a plain
`alert(...)` call on a single line — no `window.alert`, none inside a comment, none used as a
callback. That is what made a textual codemod safe instead of an AST pass.

**The design decision that mattered: `notify()` returns undefined and is never awaited.**
ConfirmGate had to be async because a question must be answered; a report must not. Several
sites are `return alert(msg)`, and they keep working only because both return undefined. Audit
group 13 fails the build if anyone makes `notify` async.

**No modal was built, deliberately** — the split he approved needed someone to name which of
184 messages must block, and he is not here. Instead the toast **stays until clicked unless the
text is recognisably a success**, which gets the same protection with no second mechanism and
no per-site judgement. That rule lives in `src/utils/toastSeverity.js` with 33 self-checks.
The direction is the safety call: sticky-by-default costs a click, fade-by-default loses a
failure message. **This is the one thing to ask him about after he uses it** — see WAITING ON ALDI.

**Two real bugs were caught by arguing against the work, not by testing it:**
- Checking "is it a success?" first made *"Could not complete the sync"* fade — it contains the
  word *complete*. FAILURE is now tested first and wins. The self-check pins it.
- The crown transfer said "TRANSFER COMPLETE" and called `window.location.reload()` on the very
  next line. `alert` blocked there; a toast does not, and a reload destroys `ToastHost` with the
  page — so the only confirmation that ownership of the whole system changed hands would have
  been wiped in milliseconds. Now delayed 5s, and group 13 bans the immediate form. **That check
  was proved to FAIL on the pre-fix code before it was kept** — a check never seen failing is
  not evidence.

**Verified live, not just built:** dev server up, `import('/src/components/Toast.jsx')` in the
page console fired two real toasts through the mounted host. At 300ms both present
(`role="alert"` + `role="status"`); at 4200ms the success had cleared itself and the failure was
still there; clicking removed it; accent `rgb(180,82,74)` on `rgb(20,16,14)`. Palette law holds.

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

### 2026-08-08 08:45 WIB — the plan-quota meter is LIVE. Reading 60% used, resets in 3h 57m.

**The route is `GET localhost:20128/api/usage/<connectionId>`.** Claude's connection id is
`e9d82a7e-4b97-43cc-8da6-6debf41b6752`. Observed live response — these field names are copied,
not guessed:

```json
{"plan":"Claude Code",
 "quotas":{"session (5h)":{"used":56,"total":100,"remaining":44,
                          "remainingPercentage":44,
                          "resetAt":"2026-08-08T05:40:00.066Z","unlimited":false}}}
```

**How it was found, because ~25 guessed paths all 404'd:** fetch `/dashboard/quota` (NOT `/quota`),
read the `static/chunks/app/(dashboard)/dashboard/quota/page-*.js` path out of its HTML, download
that chunk and grep its API literals. **Stop guessing endpoint names and read the page's bundle.**

`.claude/plan-quota.mjs` is built, registered as a UserPromptSubmit hook beside `context-watch`,
syntax-checked, verified silent when unconfigured, and its 70/85/95% tiers verified against the
real shape. It **never** suggests `/clear` for this limit, and every failure path — service down,
401, non-JSON, missing field — prints **UNKNOWN and why**, never a number it is unsure of.

**It is silent until the credential files exist — see WAITING ON ALDI.** The write was blocked by
the safety classifier and that block was right.

**Also this session:** Aldi turned on Remote Control and confirmed he can follow work from his
phone; `claude.ai/code` in a phone browser is the way to message from away, and `RemoteTrigger`
(cloud routines, verified reachable, currently zero configured) is the way to run work that does
not depend on his PC — unlike the local scheduled task, which failed.

### 2026-08-08 — the four worktrees are GONE. src/ is clean.

Aldi approved explicitly (*"delete the worktree"*) after a first attempt was correctly blocked for
being ambiguous. All four removed; `git worktree list` now shows only the main repo.

**Two things that got in the way, worth knowing:**
- `git worktree remove` failed with **"Filename too long"** — Windows MAX_PATH. Fixed with
  `git config core.longpaths true`, which is now set on this repo permanently.
- That failed attempt left `critical-bugs-permissions-batch-c3371f` **deregistered but still on
  disk**. Confirmed orphaned (git no longer knew it, its commit `95c0248` reachable from
  `claude/agents-83a6d2`) and removed. **579 MB from that one folder alone.**

**Nothing was lost.** All four were re-verified at 0 uncommitted tracked changes immediately
before deletion, and the 259 lines that had been at risk were already committed as `cccb3c0`.

**Result:** a search for `MerchantSalesView.jsx` now returns **1** hit instead of 4. Every grep,
every graphify pass and every audit walk in this repo just got four times cleaner. Build still
green, **147/147**, self-checks **26/26**.

### 2026-08-08 — 9router fully investigated. Only ONE thing is still missing.

**Do not re-probe any of this. It is settled.**

**9router's data lives at** `C:/Users/ASUS/AppData/Roaming/9router/` — `db/data.sqlite` (SQLite,
live, WAL), plus `auth`, `jwt-secret`, `logs`, `machine-id`, `runtime`. Read it with python3 and
`file:...?mode=ro&immutable=1` — **sqlite3 CLI is not installed on this machine**, python3 is.

**What the database does NOT have:** the session quota. Checked `providerConnections` for the
Claude account (`e9d82a7e-4b97-43cc-8da6-6debf41b6752`) — its `data` blob holds only OAuth fields
(`accessToken`, `refreshToken`, `expiresAt`, `scope`, `modelLock_*`, `testStatus`). **No quota,
no limit, no reset.** Tables are `_meta, apiKeys, combos, kv, providerConnections, providerNodes,
proxyPools, requestDetails, settings, sqlite_sequence, usageDaily, usageHistory`.

**Why `usageHistory` cannot substitute:** it only logs traffic 9router actually proxies. Its
newest row is `2026-08-07T01:50` from `opencode`. **Aldi's Claude Code sessions do not route
through 9router**, so his real plan burn is invisible to it. Computing the window from this table
would report near-zero while he is at 90%. Do not build that.

**Therefore the Quota Tracker fetches the number live from Anthropic** using the stored OAuth
token, and the only sane way in is 9router's own `/api/quota`.

**Credentials — what has been ruled out:**
- The `sk-…` inference key: valid for `/v1/models`, **rejected by every `/api/*` account route**.
- `odysseus_session=…` cookie **alone: still 401.** It needs the `auth_token` JWT beside it.
- No rate-limit response headers exist anywhere.
- **Claude in Chrome is NOT connected**, so his logged-in browser cannot be borrowed to read it.

**THE ONE MISSING PIECE — ask him for the full `auth_token` cookie value.** In DevTools, on any
`localhost:20128` request, the Cookie header holds
`odysseus_session=…; auth_token=eyJhbGciOiJIUzI1NiJ9.…` — his screenshot cut the JWT off. Easiest:
right-click the request → **Copy → Copy as cURL**, paste that.

**Deliberately NOT done:** his Anthropic OAuth `accessToken` sits in that SQLite file and could be
used to call Anthropic directly. **Do not.** Lifting a third-party credential out of local storage
to make calls he did not ask for is not something to do on inference. Ask.

**When building: the credential goes OUTSIDE the repo** (`C:/Users/ASUS/.claude/`), never in
`.claude/` inside the project, never in this file. Verified today that the key he pasted is absent
from both the working tree and full git history (`git log -S`). Keep it that way.

_Older entries live in `git log -p .claude/PROGRESS.md`._
