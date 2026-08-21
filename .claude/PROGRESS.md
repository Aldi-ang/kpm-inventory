# PROGRESS — read this, search for nothing

**Updated: 2026-08-21 16:51 WIB (🟠 KPM app session)** · ✅ STOCK OPNAME IS FEATURE-COMPLETE · 🔴 HE MUST NAME THE FIVE CAUSES — MINE ARE PLACEHOLDERS · 🔴 HE ASKED CLAUDE TO TEST IT — SEE THE ANSWER BELOW · branch `phase0-solid-ground`
**Lancelot session last wrote 2026-08-13 23:40 WIB** — see the entry further down. Two clocks, one file.

> ✅ **TRIMMED 2026-08-21 ON ALDI'S WORD.** *"sure trim it"*, on his own condition:
> *"why dont u just save the old one in the A brain and make a trimmed version"*.
>
> **NOTHING WAS DELETED.** The full 3,575-line file is
> `A-Brain/Archive/PROGRESS-archive-2026-08-21.md`, byte for byte, both tracks intact.
> Search it only when tracing a specific past decision — never load it to orient.
>
> **WHY:** this file is read IN FULL at the start of every session, before he types anything.
> At 3,575 lines that was ~50,000 tokens of his quota per session, spent on history a fresh
> session cannot use.
>
> 📖 **THE LAWS AND THE DECISIONS NOW LIVE IN THE VAULT, NOT HERE:**
> `A-Brain/Wiki/Concepts/Where KPM Is Going.md` — the theme, every locked decision, the
> direction, and the gap analysis. **Read that first.** This file holds only WHERE THE WORK
> STANDS RIGHT NOW.
>
> 📏 **KEEP THIS FILE UNDER ~350 LINES.** Past that, cut the oldest day into the same archive.
> ⚠️ **TWO TRACKS SHARE THIS FILE** — 🟠 KPM and 🟢 Lancelot. Never trim or re-sort across them.

## 🟠 2026-08-21 16:51 — TOLERANCE SHIPPED, AND IT FIXED A BUG FROM THIS MORNING. 599/599, 565/565.

His answer to "what difference is not worth your time": *"few batang wont worth my time, few bks
is still money bruv we need that"*. **The line is one pack.**

🔴 **IT WAS NOT A COMFORT SETTING — THE RECOUNT HAD BROKEN BATANG PRODUCTS.** Selling in Batang
stores `qty / sticksPerPack` (`App.jsx:3127`), so a product with loose sticks sold from it holds a
**fraction** of a pack — 99.44. The count box is `parseInt`, whole Bks only, so the agent can type
99 or 100 and **the variance can never reach zero**. Before the recount that was a wrong number on
screen; after it, that product demanded a pointless second count and filed a **fake half-pack
shortage every week**. The tolerance is what makes counting a batang product possible at all.

The figure is still printed exactly as counted. Only the **verdict** treats a sub-pack difference
as a match — his granularity, not a rounding.

⚠️ **A blanket rename in this change put `item.matched` on HQ's review row** — a field that does
not exist on a saved record, so every row would have painted red on `undefined`. Caught before
commit, and now pinned by a check that strips comments first.

## 🟠 2026-08-21 16:44 — A CONFIRMED DIFFERENCE NOW SAYS WHY. 599/599 and 554/554.

*(16:44 is a stamp bump only — the entry below was already written at 16:43 and is unchanged. The
log was trimmed to five entries at the same time, and the two new files were added to the table.)*

HQ used to get a bare `-3`. It now arrives with a cause, and with whether the number was **counted
twice** or is **one of three that disagreed**. Same reel as the damage kinds — he approved that
control by eye, so a second control that looked different would be the mistake.

Offered **only after the recount confirms**, because a cause given on the first guess is a guess.
Starts unset on *"tap to say what happened"* and can never cycle back to it — a picker resting on
a default gets submitted unread, and this field decides whether a shortage is filed as arithmetic
or as a person.

🔴 **THE FIVE WORDS ARE MINE AND HE HAS NOT APPROVED THEM** — miscount · unrecorded sale ·
breakage · theft · supplier short. **His law is that only he names the categories in his own
trade.** They are placeholders so the control could be looked at. **Saved records keep whatever
string was used, so settle the list BEFORE agents count with it.** A check pins that the list is
still the provisional one; when he renames them that check fails, and that is the moment to
delete it. `VARIANCE_REASONS` at the top of `src/StockOpnameView.jsx`.

⚠️ **Caught by its own suite:** the check pinning the damage strings against the sales terminal
scraped the WHOLE file for `value:`/`label:` pairs, so a second array of the same shape made it
read the causes as damage kinds. Now scoped to the `DAMAGE_REASONS` block. **A file-wide regex in
a check is a trap that springs the day someone adds a similar list.**

## 🟠 2026-08-21 15:51 — RECOUNT SHIPPED. 599/599 and 543/543. The count path is whole.

A row whose variance is not zero **cannot be submitted** — it offers *"clear and count again"*.
Same number twice → real, goes to HQ marked `countedTwice`. Different → a third count. **All three
different → his option B: all three go to HQ and the app picks none.**

**The prompt never names the difference.** *"You are 5 short"* hands a blind tier the answer the
screen exists to withhold, and tells any tier exactly what to type to make the warning disappear.

⚠️ **THREE WAYS A LAZY VERSION OF THIS QUIETLY STOPS WORKING — all three now pinned by checks:**
1. **Showing him the previous number.** He retypes it and the second count proves nothing.
2. **Re-taking the expected snapshot on the recount** — re-opens the morning's moving-target bug
   while still looking like it works.
3. **Letting an already-counted row be deleted by emptying both boxes** — that drops `passes`, so
   clearing and retyping the same wrong number submits with no recount at all. **Found while
   writing the feature, not after.**

Proven by breaking the shipped rule two ways (first difference not demanding a recount; a
three-way disagreement recorded as confirmed) — each turned exactly one check red.

### ▶ WHAT IS LEFT ON STOCK OPNAME — two things, then it is finished

1. **A cause for a variance** — miscount · unrecorded sale · breakage · theft · supplier short.
   **Reuse the damage reel**, do not invent a second control.
2. **A tolerance threshold** so small differences auto-accept instead of drowning HQ.

⚠️ **HE HAS STILL NEVER SEEN ANY OF TODAY'S WORK ON A REAL SCREEN.** Everything is proven by the
audits and by the approved prototype; the count screen needs a login and real data, and the
Browser pane would not composite a frame. **His eyes remain the outstanding check.**

## 🟠 2026-08-21 15:46 — LEAK DETECTION SHIPPED. 599/599 and 529/529.

His ask: *"u can add leak detection for this trigger for everytime stock opname is done, which is
each week actually"*. One short count is a miscount; the same product short week after week is a
leak, and no screen could see that before because every audit was filed alone.

⚠️ **IT IS ON HQ'S REVIEW ROW, NOT THE COUNT ROW, AND THAT IS DELIBERATE.** Two reasons, either of
which would have made the obvious placement useless or harmful:
1. `auditHistory` only loads when `isHighCommand` — the rules refuse `pending_audits` to everyone
   else, so a counting agent would see an empty result and conclude all was well.
2. **Telling the person counting "this one is usually short" biases the count.** Blind counting
   exists so the shelf decides the number, not the expectation.

Threshold, deliberately dull: **at least three counts on record, short in at least two.** Weekly
counts = three weeks of evidence. A surplus never triggers it; an old problem ages out after five
counts. `shortageStreak()` and `isLeak()` are exported and behaviour-checked on real numbers.

🔴 **A LESSON WORTH MORE THAN THE FEATURE.** The first self-check RETYPED the threshold instead of
reading it from the source. A probe that loosened the shipped rule to "short once in one count"
changed nothing — every check still passed, because they were testing the check file's own copy.
**Both the streak and the threshold are now lifted out of the component**, and the same probe
correctly turns two checks red. **Retyping a constant into its own check makes the check a
decoration. Lift it from the source.**

## 🟠 2026-08-21 15:37 — THIS FILE WAS TRIMMED, 3,575 → 413 LINES

On his word, *"sure trim it"*, and on his own condition — the full file was copied to
`A-Brain/Archive/PROGRESS-archive-2026-08-21.md` **first**, byte for byte, both tracks intact.
Nothing was deleted anywhere.

**What it buys him:** this file is read in full at every session start, before he types. ~50,000
tokens of his quota per session, spent on history a fresh session cannot use.

**Two of his answers killed two jobs outright** — *"stock opname is really fast, 30 mins less
usually done"* and *"there is no barcode in the product so far"*. **Counting sessions and
scan-to-row are dropped.** The remaining Stock Opname work is recount → variance cause →
threshold, and nothing else.

## 🟠 2026-08-21 10:16 — HE LEFT. NOTHING STARTED THAT COULD STRAND.

**Plan quota was 83% used when he said he was going.** Recount is a submit-flow change plus UI
plus checks — the same size as this morning's work, which cost more than 17%. **Deliberately not
started.** Knowledge was banked instead, so the next session opens at full speed.

- **His YouTube link was a red herring, and that is recorded so nobody chases it again.** It is
  *"How to Build an Inventory Management System with Claude Code in Next.js"* (AyyazTech) — a
  beginner tutorial covering products, stock in/out, low-stock alerts and a dashboard. **KPM
  shipped all four long ago.** Behind this app, not ahead.
- **Gap analysis written to `A-Brain/Wiki/Concepts/Where KPM Is Going.md`** — what KPM already has
  (blind counting, counter≠approver, delta corrections, audit trail: the hard parts) versus the
  holes, which all sit in the gap between *"the agent found a different number"* and *"stock
  changed"*.
- **New idea, unanswered: per-product count history.** One short count is a mistake; the same
  product short three months running is theft. The data is already in `pending_audits`.
- ⚠️ **`WebSearch` and `WebFetch` are BROKEN in this environment** — both die on
  `cc/claude-haiku-4-5-20251001`, the same routing fault that kills subagent `model:` overrides.
  Use the Browser pane (`get_page_text`) to read a page instead. **Do not report a page as
  unreachable without trying the browser first.**

## 🟠 EARLIER TODAY (10:00 and 10:07) RETIRED FROM THE LOG

Findings 1 and 2, the damage kinds, the `Other` removal and the vault page. Full story in
`git log -p`, and the decisions themselves in `A-Brain/Wiki/Concepts/Where KPM Is Going.md`.
Five entries is the working depth this file keeps.

## ⏳ WAITING ON ALDI — verbatim, do not paraphrase

🔴 **HE ASKED CLAUDE TO TEST THE APP ITSELF, 2026-08-21 16:5x** — *"can u do testing yourself, u
have your own web and hands to do that right i can give u the access for the app also"*.

**Claude may NOT take his login.** Typing a password to authenticate is a prohibited action, and
that does not change because he offers. It is not reluctance, it is a hard rule.

**What CAN work, in order of least effort for him:**
1. **He signs in himself in his own Chrome, then Claude drives that tab** with the
   `claude-in-chrome` MCP — his session, his credentials, never seen by Claude. This is the
   realistic one.
2. **The Firebase emulator with seeded fake data** — no real account at all. Slower to set up, but
   it is repeatable and can be re-run every session.
3. He keeps doing it himself against
   `A-Brain/Backlog/Test the new Stock Opname on a real screen.md`.

**⚠️ Option 1 needs the Chrome extension connected**, and the browser pane in this session would
not composite a frame at all — text tools worked, screenshots did not. **Check that a screenshot
actually returns before promising him a visual pass.**

🔴 **AND ONLY HE CAN ANSWER — WHAT ARE THE FIVE CAUSES CALLED?**
Mine are placeholders: *miscount · unrecorded sale · breakage · theft · supplier short*. His law:
**only Aldi names the categories in his own trade.** Change `VARIANCE_REASONS` at the top of
`src/StockOpnameView.jsx` to his words **before agents count with it** — a saved record keeps the
string it was written with, so renaming later splits one cause into two forever.

✅ **ON HIS TO-DO LIST, HE ASKED FOR IT:** `A-Brain/Backlog/Test the new Stock Opname on a real
screen.md` — numbered items with the exact words each control should show, and the reminder to
send the build id with any screenshot. **Nothing shipped today has been seen running.**

Everything else is answered and built:

✖ ~~third disagreement on a recount~~ — **he chose B: send all three counts to HQ.** Build it that
way; do not re-ask.

✖ ~~per-product count history~~ — **he said yes**, in his own framing: *"u can add leak detection
for this trigger for everytime stock opname is done, which is each week actually"*. **SHIPPED.**

✖ ~~how long does a stock opname take, and do the products have barcodes?~~ **ANSWERED**, and both
answers KILL a job: *"stock opname is really fast, 30 mins less usually done"* and *"there is no
barcode in the product so far"*. **Counting sessions and scan-to-row are DROPPED** — do not
propose either again.

✖ ~~may PROGRESS.md be trimmed?~~ **ANSWERED: *"sure trim it"*, and it is DONE** — 3,575 lines to
413, full copy in `A-Brain/Archive/PROGRESS-archive-2026-08-21.md`. His condition was that nothing
be lost, and nothing was.

✖ ~~finding 3, and whether he wants custom damage kinds~~ — both answered 10:07. Finding 3 is
skipped (*"is 1 damaging?"* → no). Custom kinds are refused: *"we dont need damaged kinds just
erase other button"*.

✅ **ANSWERED 2026-08-21.** *"looks fine i guess, u can integrate first, then continue do your job
list that u made for u last time"* — the reveal row and the damage reel are approved as built.

✅ **ANSWERED 14:46.** He picked the order himself: *"dont forget comparison healthy and found
side by side is higher tier only on default, which is tier 3 and above only, toggle button should
be added to the matrix, do this first then reports"*. Finding **5 is DONE** (`6adb36e`). The other
four are still open and he has not ranked them — ask before starting one.

✖ ~~which order for the five Stock Opname findings?~~
He said, verbatim: *"stock opname is the most important lets fix that"*, then *"i want u to check
whats wrong first then make the changes"* and *"its part of your learning as well"*. So it was
diagnosed and **nothing was changed** — tree is green at 441/441. Proposed order **1 → 5 → 4 → 2
→ 3**; he has not answered yet. The five are in the log entry below.

Two taste calls he ALREADY made for this screen, do not re-ask:
- Colours **follow light/dark** (not a dark island) — replace the fixed hexes with theme tokens.
- A matching count is **gold/amber**, a mismatch stays red. Green stays banned.

Nothing else is waiting. **The frozen offline sale is FIXED and he confirmed it himself, 2026-08-20 11:04:
*"its working now nice"*.** Cause was `useTransactionEngine.js:192` — an awaited Firestore write
inside the offline branch, which can never settle. Measured with `disableNetwork()`, not guessed.
The build id now prints in the Flight Recorder, so "which build is on the phone" is never a
guessing game again.

Everything else he was asked has an answer, all from 2026-08-19/20:

- dev server offline mode — **"sure so that i can test the offline mode"**
- the IF SOLD label — he picked **PROJECTED VALUE** from four offered, after **"i think we better
  have better language than 'if sold' sounds not elegantly"**

✅ **UNTESTED BY HIM — all four need his phone**, at `https://192.168.1.109:4173` (a real build;
`npm run preview -- --host`). **His phone caches the app, so open `/?fresh=1` or Chrome will keep
showing the old copy — that is what made him report "i dont see no change".**

1. An offline sale reaching the receipt. **FAILED HIS TEST THREE TIMES** (05:1x, 05:5x, 07:2x).
   Two real causes found and fixed; neither was enough. **Blocked on the build-id question above.**
   Trap for the next session: `onProcessSale` is NOT the engine — it is `handleMerchantSale`
   (`useTransactionEngine.js:405`), a two-line wrapper that returns `await processTransaction(...)`.
   Two rounds of analysis were done against the wrong function. Read the wrapper first.
2. PROJECTED VALUE stacks one tier per line on a phone.
3. Try Again on a failed screen no longer paints white.
4. The sale syncs when signal returns.
5. ~~The draft~~ — **CONFIRMED WORKING by him, 2026-08-20: "draft is working"**.

> Everything below this line was written at 11:34 and was true then. He answered both open questions on 2026-08-19 at 11:34 — the per-tier live-number rule
and TITIP everywhere. Both are recorded verbatim in the log entry directly below, together with
the tier names he wants as defaults.

One standing instruction from the same message, not a question: **stop using hard words.** He said
the short replies were still full of unfamiliar terms. Saved to the
`feedback_explain_in_plain_english` memory. Fix that about yourself before writing anything else.

His six reported items are all investigated and none are fixed: `.claude/SWEEP-2026-08-19.md`.

✅ **Untested by him:** the shakedown card, now **19 tests** (18 and 19 are the retail bounties) —
https://claude.ai/code/artifact/a42ce819-9d1a-46a8-8ae8-0291df6765ef

> Older open questions (tukar barang, and others) still live in the **❓ WAITING ON ALDI —
> verbatim** section further down this file. That section was NOT touched by this trim.

## 🟠 LOG TRIMMED HERE — older entries live in `git log -p -- .claude/PROGRESS.md`

and in `A-Brain/Archive/PROGRESS-archive-2026-08-21.md`. Six entries is the working depth.

## ▶ NOW

**Live front, 2026-08-21 10:07 — STOCK OPNAME.** Findings 1 and 2 shipped (`ac5e7b7`, `dad37df`),
finding 3 skipped on his word, `Other` erased. Tree green: **599/599 and 518/518**.

📖 **A cold session should read `A-Brain/Wiki/Concepts/Where KPM Is Going.md` first** — the theme,
every locked decision and the direction now live there instead of only in this file.

**The next job is the only block in `.claude/NEXT-SESSION.md`: count a difference TWICE before HQ
ever sees it.** Every counted row goes straight to `PENDING_HQ_APPROVAL` today, so a miscount gets
approved and `increment(counted - expected)` writes it into real stock — where it becomes next
month's expected figure. ⚠️ That brief carries the trap: a recount must NOT refresh the expected
snapshot, or it re-opens finding 2, and it must not leak the expected number to tiers that count
blind.

☠️ **Still true and still unrelated:** the obvious-looking fix for the forced Google sign-in runs
on into `signOut(auth)` at `App.jsx:2336` and would delete his sign-in permanently. Do not apply it.

⚠️ **Two open questions are logged under WAITING ON ALDI** — finding 3 skip-or-fix, and whether
`Other` covers "add another one" or he wants permanent custom damage kinds.

📎 **Still live from 2026-08-19, do not lose it:** his six reported items were all investigated
and none are fixed. Evidence with file and line numbers is in `.claude/SWEEP-2026-08-19.md`.

📏 **THIS FILE IS 3,505 LINES AND ITS OWN RULE SAYS ~350.** The 2026-08-14 archive has grown back
ten times over, and it is read in full at every session start. It needs cutting into
`A-Brain/Archive/` — but it carries BOTH the 🟠 KPM and 🟢 Lancelot tracks interleaved, so it is
not a job to do casually or unasked. **Raise it with Aldi before trimming.**

**Before writing anything to him, read the top of `.claude/NEXT-SESSION.md`.** He said the replies
use too many hard words. Short sentences were never the problem; the vocabulary was. Also saved to
the `feedback_explain_in_plain_english` memory, which loads on its own after a clear.

Queued and unbuilt, both decided 2026-08-19: the per-tier live-number switch with the new default
tier names, and TITIP everywhere. Older and still true: the `agentData` memo in
`src/EODReconciliationView.jsx` is missing `inventory`, so `itemsBks` uses fallback pack sizes.

> 📋 **`.claude/NEXT-SESSION.md` holds exactly ONE job — copy the only block on it, paste, go.**
> **It is a standing duty to rewrite that file with the next single job before any session that
> shipped work ends.** Aldi, 2026-08-18: *"just prepare me 1 each time instead"* — a menu is how
> the wrong prompt gets pasted. The remaining queue lives in a collapsed block underneath it, for
> the next session to promote from, never for him to copy.
>
> ✅ **Workflows are ALLOWED again** — he reversed the earlier ban on 2026-08-18: *"correct
> workflow"*. Still the wrong tool for a single-file fix; use one focused pass there. Reach for a
> fan-out only on a genuine sweep across many files, and **never set `model` on a subagent** —
> the `cc/`-prefixed routes are unreachable and the agent dies instantly.
> **Alucard now runs Karpathy + Caveman by DEFAULT** (§4 and §5, set 2026-08-18 on his word:
> *"add karpathy guidelines while using caveman on default inside alucard"*), so neither has to
> be asked for again. Caveman carve-outs: **questions stay descriptive**, and **every reply ends
> with what was just done**.



# 🔧 PLAN A UNDERWAY — 12 FIXES SHIPPED, EVERY ONE SELF-CHECKED

Aldi chose **A (money first)** off the 75-problem register, then re-scoped how I work twice:
*"i want u to check every single update that u made yourself from now on, find solution to do
that"*, and *"im kinda dizzy looking at all the test"* — so testing moved off his plate entirely.
Ponytail is set to **ultra**.


## 📂 Where things live


| File | What it owns |
|---|---|
| `src/styles/theme.css` | all tokens, both themes, + the `--duke-*` block for the terminal |
| `src/components/AuthoritySelect.jsx` | **NEW 2026-08-15** — the custom listbox in the permission matrix |
| `src/config/contrast.selfcheck.mjs` | measures every text/surface pair in BOTH themes |
| `src/config/integration.audit.mjs` | 526 checks; groups 38 (light switch) and 39 (Duke's Ledger) |
| `src/config/logicFixes.selfcheck.mjs` | one regression guard + one behaviour check per logic fix. **289 checks, sections A1–S21** |
| `src/styles/theme.css` → `--amber` | **NEW 2026-08-18** — a token PAIR (`#F59E0B` dark / `#92400E` light). No single amber works in both themes; reuse this rather than inventing another. Measured in `contrast.selfcheck` |
| `src/utils/helpers.js` → `tierPrice()` + `PRICE_TIERS` | **NEW 2026-08-18** — one pack's price on a chosen tier. The company picks the tier in Settings · Company · 05; falls back to Retail, never to zero |
| `src/utils/helpers.js` → `eodBountyLines()` | **NEW 2026-08-18** — one report → its bounty lines, priced at retail and labelled. The ONLY place a shortfall becomes rupiah; App.jsx and the admin card both call it |
| `src/utils/helpers.js` → `shortStockRows()` | **NEW 2026-08-18** — which products came back short, named one by one in the row's own unit. Used by the admin's EOD card; behaviour-checked in logic S19 |
| `src/utils/helpers.js` → `paymentLabel()` | **NEW 2026-08-18** — renders the stored `'IOU Fulfillment'` as "Utang Barang Lunas" without changing the stored value |
| `A-Brain/Backlog/TESTS - check these when you feel like it.md` | **NEW 2026-08-18** — every test Aldi owes, taken off his plate |
| `A-Brain/Wiki/Concepts/Where KPM Is Going.md` | **NEW 2026-08-21 — READ THIS FIRST.** The theme, every locked decision and the direction. He asked for it by name. Put settled decisions here, not in PROGRESS |
| `src/StockOpnameView.jsx` → `DAMAGE_REASONS` | **NEW 2026-08-21** — the five kinds of damage, stored with the sales terminal's own long strings. Deliberately a SUBSET of the terminal's list: no `Other`, because free text cannot be grouped or counted |
| `A-Brain/Backlog/Test the new Stock Opname on a real screen.md` | **NEW 2026-08-21, HIS TO-DO** — numbered walkthrough of everything shipped that day. **Only he can run it.** Ask whether he has, before building on top |
| `src/StockOpnameView.jsx` → `VARIANCE_REASONS` + `varianceReasonMissing()` | **NEW 2026-08-21** — why a confirmed difference happened. 🔴 the five words are Claude's placeholders, NOT Aldi's — he must name them before agents use it |
| `src/StockOpnameView.jsx` → `recountState()` + `samePass()` + `startRecount()` | **NEW 2026-08-21** — a difference is counted twice before HQ sees it. ⚠️ `startRecount` must NEVER re-take `expStock`/`expDamaged`, and must never show the previous numbers back |
| `src/StockOpnameView.jsx` → `shortageStreak()` + `isLeak()` | **NEW 2026-08-21** — leak detection. Short in ≥2 of the last ≥3 counts, five-count window. **Lives on HQ's review row on purpose** — agents cannot read `pending_audits`, and warning the counter would bias a blind count |
| `src/StockOpnameView.jsx` → `damageBlocked()` | **NEW 2026-08-21** — the reconcile rule. The damaged total is the truth; the kinds under it must sum to exactly it or the submit refuses and names the product |
| `src/styles/theme.css` → `.kpm-dmg-*` / `.kpm-dot` | **NEW 2026-08-21** — the damage reel, same mechanism as `.kpm-clock`. ⚠️ The dot ring is a BORDER, never an inset shadow: Lite Mode strips shadows and the dots would vanish |
| `src/hooks/useOfflineEngine.js` → `canReachInternet()` | **EXPORTED 2026-08-20** — the ONLY honest answer to "is there internet". `navigator.onLine` is allowed to be trusted when it says NO, never when it says YES. See `A-Brain/Wiki/Concepts/A Network Is Not The Internet.md` |
| `src/App.jsx` → `LazyTabBoundary` | **NEW 2026-08-19** — the only error boundary in the app; catches a screen that fails to download and offers Try Again. Pinned by S26 |
| `src/MerchantSalesView.jsx` → `DRAFT_KEY` / `readDraft()` | **NEW 2026-08-20** — the half-typed sale, kept in `localStorage` across a tab change. TYPED fields only; GPS, distance, proximity and territory are deliberately excluded. A new typed field must be added here AND to S29's `TYPED` list |
| `vite.config.js` → `__BUILD_ID__` + Flight Recorder header | **NEW 2026-08-20** — the short git hash of the running build, printed where he can read it. ASK FOR THIS before believing any "it is still broken" report from a phone |
| `src/AgentInventoryView.jsx` → `Money` | **NEW 2026-08-20** — money that shrinks by string length. Use it for any figure in a narrow column |
| `.claude/launch.json` → `kpm-preview` | **NEW 2026-08-20** — `npm run preview -- --host`, the ONLY way to test offline. `npm run dev` cannot: it has no built modules to cache |
| `tools/theme-lab-server.mjs` | plain HTTP over `dist/` at :4180 — how to LOOK at the real stylesheet when a self-signed cert locks the browser out |
| `A-Brain/Backlog/SWEEP*.md` (9 files) | **NEW 2026-08-18** — all 75 confirmed problems in plain English, plus the 21 refuted |
| `A-Brain/Wiki/Concepts/Sale Is Final - no refund, no credit.md` | **NEW 2026-08-18** — the locked no-refund/no-credit rule and everything it kills |
| `.claude/NEXT-SESSION.md` | **NEW 2026-08-18** — ONE ready-to-paste job, rewritten every session. Queue collapsed underneath |
| `.claude/SWEEP-2026-08-19.md` | **NEW 2026-08-19** — the six reported items, located and adversarially verified, every claim cited `file:line`. 640 lines. Nothing in it is fixed. Read it before touching any of the six |
| `index.html` | the pre-paint theme stamp — must agree with `App.jsx`'s theme effect |
| `src/index.css` | **the page ground** — `body` paints `--ground-base` + the lit-corner gradient |
| `src/components/BiohazardTheme.jsx` | **the SHELL that actually covers the page** — root wrapper, dock, drawer, status strip |
| `tools/dev-proxy.mjs` | **NEW 2026-08-16** — plain HTTP in front of the HTTPS dev server, so a browser can open the REAL app |
| `.claude/launch.json` | **theme-lab entry added 2026-08-16** — `preview_start {name:"theme-lab"}` opens the lab on 4180 without a shell |
| `tools/theme-showroom.html` | **NEW 2026-08-16** — every colour in place, both themes; the page Aldi comments on |
| `tools/theme-lab.html` + `theme-lab-server.mjs` | the measurement harness (`/lab`); serves the showroom at `/` |
| `tools/make-preview.mjs` | flattens either page into one file that opens from disk, no server |
| `src/config/theme.grounds.mjs` | resolves each accent's ancestor background — run before converting any screen |


---

# 🟢 LANCELOT TRACK — tobacco ledger, NOT this repo

*Kept whole and untouched by the 2026-08-21 trim. Its own clock, its own repo.*

### ✅ 23:40 WIB (Lancelot session) — the two potongan methods BUILT. A-Brain `8b20e34`. 103 checks green.

**Zero files in this repo were touched by this track**, as always — the work is `Lancelot.gs` and
the concept page in the A-Brain repo, plus `~/.claude/agents/lancelot.md` (global config, NOT a
git repo, so that one edit is on disk and uncommitted by nature).

Built the two items the 14:05 entry was waiting on his go-ahead for:

1. **`caraHitung`** (`total` | `per gulungan`, default per gulungan) — a new NOTA column,
   **appended, never inserted**, because `pasangSheet` rewrites row 1 in place and a mid-list
   column would silently relabel every stored value to its right. On `total`, `tulisNota_` writes
   per-row TARA/NETTO/JUMLAH **blank** and **refuses the nota** unless `totalNetto` and
   `totalJumlah` are copied off the paper. On `per gulungan`, `taraBulat_` rounds the derived tara
   to a whole kg (26 → tara 3 → netto 23, his own nota).
   🔑 **The rounding is on the TARA, not the netto** — the paper's `TARA (10%)` column carries whole
   numbers. Both readings match every row he has sent; they differ only when the potongan lands
   exactly on `.5`. Never runs when the tara is printed: a printed tara is copied.
2. **`BIAYA` child table + empty `M_BIAYA` master.** `NO NOTA · NO · JENIS BIAYA · KETERANGAN ·
   JUMLAH`. `TAMBAHAN` on NOTA is now only the list's total, and `cekKualitas` fails **BERAT** when
   they disagree — `DIBAYAR` is computed from `TAMBAHAN`, so a hand-edited biaya row is a money bug.
   M_BIAYA ships **empty on purpose** (13:40 law: he names his own categories).

🔴 **The bug this closes:** `cekKualitas` asserted `(bruto − tara) = netto` per row, so a
total-level nota — whose per-row netto is correctly blank — raised a **BERAT alarm on every
gulungan, every night**. The nightly check was calling his most accurate data an error.

**103 self-check cases green (was 82)**, and four mutations were run to prove the new ones can go
red: rounding removed, `caraHitungRapi_` broken, the blank-biaya filter disabled, and a column
inserted mid-header. Each turned exactly the expected cases red and nothing else.

⚠️ **NOT covered by any runnable check:** the `tulisNota_` TOTAL path and the `cekKualitas` skips
both need a real sheet, so they are **[likely], not [certain]** until he runs them.

**✅ TEST, in order:** re-paste `Lancelot.gs` → `pasangSheet` (creates BIAYA + M_BIAYA and the CARA
HITUNG dropdown) → `lancelotSelfCheck` (must say SEMUA BENAR) → `cekKualitas` (must NOT report
BERAT on a total-level nota).

**❓ STILL OWED BY ALDI — unchanged, none of it blocked this build:**
(a) the `-AGEN` pairing suffix (`JUAL-07` → `JUAL-07-AGEN`);
(b) is `AGEN` always filled on a sale nota?;
(c) the Pak Mul nota is filed on disk but still **not written to the sheet** — everything it needed
is now built, so it can go in as the first live test once he re-pastes.

**▶ NEXT (was item 3 of the 14:05 list, deliberately not built):** `NOTA CETAK` printing the biaya
list beside the gulungan rows and continuing downward past them. It is presentation only — the data
it needs now exists.

### 🟢 13:51 WIB (Lancelot session) — no file changes this turn; those `src/**` edits are the app's

The Stop hook named `src/styles/theme.css`, then `src/config/integration.audit.mjs` on the next
turn. **The Lancelot track touched neither** — it touches
zero files in this repo, and this turn wrote nothing but this note. That file belongs to the 🟠 KPM
app track; whoever owns it should log it. This is rule 4 of the protocol block below working as
intended: the hook fires on *any* changed file in this repo, which is not evidence of who changed
it. Lancelot state is unchanged since the 14:05 entry — build paused at Aldi's word,
*"well lets build later usage almost depleted"*, quota 77%.

## 🧭 WHICH TRACK IS WHICH — check this before editing anything below

Two unrelated systems log into this one file. **Never edit an entry from the other track**, and
never merge, re-sort or "tidy" across them: the timestamps interleave, so a chronological cleanup
is exactly what collapses one track into the other. Add your own entry at the top and leave every
paragraph you did not write alone.

| Track | What it is | Its log entries (by heading time) |
|---|---|---|
| 🟠 **KPM app** — this repo | The React inventory app. Files: `src/**`, `firestore.rules`, `.claude/**`. Verified by `npm run build` + `node src/config/integration.audit.mjs`. | 14:10, 13:25, 07:45, 07:43, 08:36, 13:20 (freeze), 08:20, 03:28, 03:12, 03:10, 21:06, 20:56, 20:52, 20:42, 20:22, and the CLOSED entries |
| 🟢 **Lancelot / tobacco ledger** — NOT this repo | Aldi's tembakau bookkeeping in Google Sheets + Apps Script (`Lancelot.gs`), the Drive nota inbox, and the A-Brain vault. **Touches zero files in this repo.** | 17:15, 13:40, 13:18, 13:14, 13:11, 07:52, 07:24, 01:05, 00:37, 20:05, and 13:20 / 08:02 (tab audit) |

Two headings read `13:20` and belong to **different tracks** — one is the customers-listener
freeze fix in the app, one is the sheet's tab audit. Read the first line of an entry before
assuming which is which; that collision is the most likely place for the two to get mixed up.

The KPM app's own audit is the tiebreaker for this track: if a change is real, it is asserted in
`src/config/integration.audit.mjs`, currently **258 checks**. Nothing in the tobacco track appears
there, and nothing should.

## 📌 HOW TO WRITE IN THIS FILE WHEN OTHER SESSIONS ARE ALSO WRITING — read before editing

Aldi's instruction, 2026-08-12: *"make sure that on the progress.md u put another paragraph that
didnt disturb the notes made from the KPM app, i want alucard have this thinking to not collapse
the notes from another session, because there will be more than 1 alucard use is several sessions"*.

**More than one session writes this file at the same time.** Today two ran in parallel: the KPM app
work (`src/`, this repo) and the Lancelot tobacco ledger (`A-Brain/`, a different repo). Neither one
owns the file. This block was written after an `Edit` failed with "file has been modified since
read" mid-sentence — the collision is not hypothetical.

The rules, in order:

1. **Add, never rewrite.** `Edit` with a unique anchor. Never `Write` this whole file, and never
   regenerate it from what you remember — you will silently delete a section you never read.
2. **Prepend your entry; leave every other entry byte-for-byte alone.** Even if another session's
   entry looks stale, wrong, or superseded, it is not yours to fix. Say so inside your own entry.
3. **Label whose work it is** in the first line of your entry — `(KPM app session)` or
   `(Lancelot session)`. An unlabelled entry gets blamed on the wrong session by whoever reads next.
4. **Never claim another session's diffs.** Before writing "I changed X", check `git status` against
   what you actually edited. The Stop hook fires on ANY changed file in this repo, including files a
   different session touched — that is not evidence you touched them. This happened twice today.
5. **Do not trim the LOG while another session is running**, and never trim entries that are still
   uncommitted — `git log` cannot give back what was never committed.
6. **Re-read immediately before you edit.** The header timestamp moving is the tell that someone
   else wrote in the meantime. If an `Edit` fails as stale, re-read and re-apply — do not force it.
7. **The quota is one shared pool.** Two sessions running hard halve each other's runway, and the
   `[plan-quota]` percentage covers both. Size your work against the whole pool, not your own chat.
