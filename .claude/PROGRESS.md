# PROGRESS — read this, search for nothing

**Updated: 2026-08-08 WIB** · branch `phase0-solid-ground` · last commit `312d3de`

**Aldi clears the session every time he starts a new one. This file is the ONLY thing that
survives. If it is not current, the work is lost.** Write it before context runs low, not after.

**STANDING RULE — his instruction 2026-08-07. The limit he means is the 5-HOUR PLAN QUOTA, not
the context window.** He corrected this directly: *"its not the context window, clear wont fix
the problem, im talking about the 5 hours limit - plan usage limit."*

- **`/clear` does NOT help.** Never offer it as the answer to this. It empties context; the plan
  quota keeps counting regardless.
- **Claude cannot see plan usage.** `context-watch.mjs` reads the transcript, so it can only ever
  measure context. No hook currently exists that can warn about this. Only Aldi can see it.
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
| The context meter + the 93% hard stop | `.claude/context-watch.mjs` |
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

### 2026-08-08 — both half-built items are DONE, and the context meter is fixed

**`ffa3215`** — the Open button is now **Edit**: `openForEdit` calls `handleEdit` and moves the
province/kabupaten/kecamatan pickers to the store first, so he lands on the form inside the right
folder instead of the 3D-map detail screen he could not get back from.

**Same commit** — "✓ Not duplicates" per group, persisted to Firestore at
`artifacts/{appId}/users/{uid}/settings/duplicate_ignores` as an array of group keys, so the
decision follows him between devices. Cleared groups stay countable and reversible: the header
shows how many are hidden, with **Show them** and **Bring them all back**. A failed save restores
the decision in the UI rather than reporting a success that did not happen.

**`312d3de`** — `context-watch.mjs` denominator clamped to 200k. It was reading
`autoCompactWindow` = 1,000,000 after `/autocompact 1000k`, so it computed a fifth of the truth
and stayed silent all session while the UI showed 92%. Verified: 96/85/60% now report honestly,
20% stays silent. Its top tier also no longer calls itself "end of usage" — it says **end of
CONTEXT**, because conflating that with the plan quota is what sent a whole session chasing the
wrong fix.

**Answered for him, having actually checked:** nothing local exposes the 5-hour plan quota.
`policy-limits.json` is policy restrictions; `codeburn` is historical local spend; the transcript
only describes context. **Claude cannot see the plan limit. Only Aldi can.** Do not build a
guessed estimate of it without him asking — an under-reporting meter is exactly what just failed.

Build green, audit **147/147**, duplicate self-checks **26/26**.

### 2026-08-07 22:4x WIB — duplicate panel: Open goes to the wrong place, dismiss (now both DONE above)

**Uncommitted-work warning: `groupKey` is built and tested but NOTHING USES IT YET.**

Aldi asked for two things and neither is finished:

1. **The Open button is wrong.** It calls `openDetail(m)` → `CustomerDetailView`, which is the
   competitor-intelligence/3D-map screen, and *"from there i cant go back to folder form, instead
   its pull me back to he find duplicate panel"*. **He wants it to open the store in the EDIT FORM
   inside its folder so he can change the data.** The right call is `handleEdit(c)`
   (`CustomerManager.jsx:956`) — it loads the store into the form and scrolls to top. Also set
   `setSelectedProvince/Region/City` from the store so he lands in the right folder. One-line
   swap plus the folder navigation; not done.

2. **"Clarify" / dismiss — his idea, and correct.** *"when there is thousands of stores that we
   know its not duplicated here each time we press find duplicated, it will be pain in the ass to
   find the real duplicates right?"* So a group he judges as NOT duplicates must stay dismissed
   across rescans. `groupKey(group)` is DONE and self-checked in `findDuplicates.js` — sorted
   member ids joined by `|`, and membership is part of the key on purpose so a third store joining
   a cleared pair resurfaces it. **What is left:** a "Not duplicates" button per group, persistence
   (recommended: one Firestore doc `artifacts/{appId}/users/{uid}/settings/duplicate_ignores`
   holding an array of keys — loaded on scan, written on dismiss), filtering dismissed groups out
   of the report, and a visible "N hidden · show them · reset" control so it never becomes a black
   hole. Self-checks are already at **26 passing**.

### 2026-08-07 22:20 WIB — the finder found a false positive before it found duplicates

**Aldi ran it: 11 groups out of 151 stores.** His screenshot showed the top group as three
*"warung sembako sumber rejeki"* — **14.5 km apart**, matched on name alone. That name is about
as distinctive as "corner shop" in Indonesian. Three real shops, not one shop three times. He saw
it too: *"u are right to call that one, maybe add automatic label for the same customer name
located in different places?"*

So **11 is an upper bound, not a count**, and the pre-flag number must not be quoted as evidence
about the KML import. Get the number again after the change below.

`findDuplicates.js` now exports `FAR_APART_METRES = 500` and sets `sameNameFarApart` on any
name-only group wider than that. A genuine double-registration sits within metres of itself —
same salesman, same doorway, filed twice — so 500m is already generous. Flagged groups sink to
the bottom of the report and carry a yellow "Probably NOT duplicates" warning; the delete confirm
shouts louder on them specifically, because that is the group he is most likely to delete from by
mistake. Groups also expose `distances[]`, index-aligned with `members`.

He asked for per-row controls, so each row now has **Open** (jumps to the full profile) and
**Delete** (one row at a time, confirm names the store, its id, its last visit and its agent —
two rows share a name, so the id is the only way to tell them apart). No bulk delete, no
auto-merge. Every row also carries an automatic **📍 place label** — Kecamatan/Kabupaten, else map
folder, else raw coordinates — which is the actual answer to "I don't even know where these are".

Audit group 12 was rewritten rather than relaxed: it used to assert no delete control existed at
all, which his request made false. It now asserts the delete asks first and names the id, that no
bulk delete or auto-merge exists, that far-apart name matches are flagged, and that every row
shows its place. **143 → 147**, self-checks **16 → 21**.

### 2026-08-07 21:39 WIB — the end-of-window stop is now a HOOK, not a promise

Aldi: *"this habits should work everytime and automatically without me ask u to do so everytime"*.
So it stopped being a memory note and became structure. `.claude/context-watch.mjs` gained a
fourth tier at **93%**: write `PROGRESS.md` first, then show the clear banner, then start nothing
new. Fires on its own every session; needs neither his reminder nor Claude's memory.

**93, not the 95-98 he said, deliberately** — a note begun at 97% may not fit in what is left,
and a note that fails to land is the exact failure he asked to prevent. 93% leaves ~70k. Told him
this in the reply rather than silently changing his number. All four tiers verified against
synthetic transcripts: 96% hits the new branch, 85% the red banner, 60% amber, 20% silent.

Quest log gained **Snipping Tool paste** (Win+Shift+S → click a test → Ctrl+V). The armed test is
outlined gold and labelled PASTE HERE. Arming updates the DOM directly instead of re-rendering —
a full render would rebuild the notes box under his cursor and eat what he was typing. Text
pastes are untouched; only images are intercepted. Source copied to `.claude/kpm-test-quest.html`
so it survives the scratchpad being cleared.

### 2026-08-07 20:1x WIB — duplicate finder shipped, plus an 8-bit test logger

**Duplicate finder — committed.** `src/utils/findDuplicates.js` is a pure module (no React, no
Firestore) so `src/config/findDuplicates.selfcheck.mjs` can run the real logic against fixtures —
**16 checks, all passing**. Two stores match if their names agree once punctuation and spacing
stop mattering, OR if they sit within 40m; union-find joins the passes so a chain groups together.
Members sort oldest first across all three date shapes the app writes. Admin button + report panel
in `CustomerManager.jsx`. **No delete or merge control anywhere in it, deliberately** — audit group
12 fails the build if one appears, if the finder gains database access, or if it sorts its input in
place. Audit **138 → 143**.

**Test logger artifact:** https://claude.ai/code/artifact/435e77ee-9f1f-4786-a1df-050156596016
8-bit CRT quest log holding the real `SALES_TERMINAL_TEST_LIST.md` items. Good/Broken/Weird per
test, notes, downscaled photo attachments, localStorage persistence, WebAudio bleeps, and a COPY
REPORT button producing markdown he pastes back into chat. A and B and the three confirmed items
come pre-marked so the meter shows the true picture. **Told him plainly there is no capability
that lets a published page send data back to Claude by itself** — `downloads` and `mcp` are the
only two available and neither does that, so copy-paste is the mechanism, not a shortcut.

Redeploy by republishing the same scratchpad path from this conversation, or pass that URL as
`url` from any other conversation — otherwise a new URL is minted.

### 2026-08-07 19:5x WIB — the tier-spelling fix is BUILT (Aldi: "you can do both fix bro")

Both halves done, audit **133 → 138**, build green, committed. Not pushed.

**Code (3 files).** `useTransactionEngine.js` now writes `priceTier` in all three places it used
to write `pricingTier` — the offline payload and both online branches. `App.jsx:3220`
`permittedCustomers` now reads `c.priceTier || c.pricingTier`. **That reader change is the actual
rescue**: every store already saved the old way becomes visible again immediately, with no
migration run at all. Said so plainly to Aldi rather than letting the migration take the credit.

**Repair button.** `handleRepairTierField` in `CustomerManager.jsx`, next to the existing Data
Scrub, following the same `commitInChunks` shape. Admin-only, amber, and only rendered when a
store actually needs it, with the count in the label. Copies `pricingTier` → `priceTier` where
`priceTier` is missing. Adds only; never overwrites an existing value, never removes
`pricingTier`, never deletes or merges a store.

**A near-miss worth keeping.** The repair was first written as `type: 'set'` with `merge: true`.
`commitInChunks` (helpers.js:139) passes **`op.options`**, not `op.merge`, to `batch.set()` — so
the flag would have been silently dropped and every touched customer document REPLACED by a
single `priceTier` field. Name, address, GPS, tier, all gone, on live production data. Changed to
`type: 'update'`, which writes only the named field and throws if a doc vanished mid-run instead
of quietly creating a nameless one-field record — and a nameless record is invisible to the
`orderBy('name')` listener, so the silent version would have manufactured the exact ghost the
repair exists to clear. Audit group 11 now fails the build if `set` or any delete reappears there.

**CONFIRMED AGAINST REAL DATA, and the scale is now known: the button read "Repair 3 Store
Tiers".** Aldi pressed it and confirmed; the repair has run. So the diagnosis was right — real
records really were saved with `pricingTier` — but only **3** stores were ever affected.

**Do not treat the duplicate problem as solved.** Three records cannot account for the volume of
duplicates Aldi described. The tier split was real but small. The prime remaining suspect is
`handleImportKML` in `CustomerManager.jsx` (~L588–641), which mints a fresh auto-ID document per
placemark with **no dedup check of any kind** — same name, same coordinates, no matter. Importing
one KML twice duplicates every pin in it. Next investigation starts there, not at the tier field.

**Still true, still not done:** the duplicate documents themselves are untouched. Merging or
deleting a duplicate store means deciding which one keeps its history and debt — human judgement,
a separate job, and NOT something to automate. Aldi has not been asked to decide it yet.

**Untested in the real screens.** The repair button needs admin + the master password, which
Claude does not enter. Verified only that the build is green, the audit passes, all changed
modules serve 200, and the app still renders.

---

_Older entries live in `git log -p .claude/PROGRESS.md`._
