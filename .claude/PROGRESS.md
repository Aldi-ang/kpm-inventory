# PROGRESS — read this, search for nothing

**Updated: 2026-08-23 12:30 WIB (🟠 KPM app session)** · ✅ CLOCK FULLY FIXED · ✅ STOCK AGE SHIPPED (`42fefe8`) — 632/632 · ⚠️ **NOTHING SINCE 08-21 SEEN ON A REAL SCREEN — THIS IS NOW THE BIGGEST RISK** · branch `phase0-solid-ground`
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

## 🟠 2026-08-23 12:30 — STOCK AGE SHIPPED, AND HIS SCOPE CUT MADE IT ONE SESSION NOT THREE. 599/599, 632/632.

**He scoped it before it was built, and the scope IS the design:**

> *"we just system that only care about the data related stuff on the company, as long as the
> product is sold its job done, company can take care of the item management inside the warehouse
> our app didnt need that much details for now"*

So it **reports age and nothing else** — no threshold he has to invent, no warning, no
oldest-ships-first rule, nothing blocked. **Two checks pin that scope**: no threshold may be
invented, nothing may be refused on age. A future session adding either is going against him.

**Why it collapsed from three sessions to one.** The sketched version split every product into
per-batch buckets and taught every stock-removing path which batch it was taking from. Instead
**nothing about how stock leaves changed at all** — what is still on hand is derived by subtraction
against `stock`, walking arrivals newest-first. Two consequences: **no new write path and nothing
new to type** (every arrival is already on the shipment record from this morning's arrival check,
so it works retroactively), and **the ages cannot drift**, because `stock` stays the one source of
truth — correct it at a count and the ages correct themselves.

**Three honesty rules, each pinned by a check:** damaged units are not shelf stock · stock the
records cannot explain is shown as *"sebelum ada catatan"* rather than folded into the oldest batch
(which would make the age read younger) · an unknown timestamp gives **no** age, never zero —
"brand new" and "we do not know" must not look the same.

⚠️ **THE REAL RISK NOW IS THAT NONE OF THIS HAS BEEN SEEN RUNNING.** Three features shipped today
on top of two days of unseen work. The in-app browser will not load the dev server's self-signed
certificate — **this needs his own Chrome, and it should come before more building.**

## 🟠 2026-08-23 11:45 — THE CLOCK FIX WAS INCOMPLETE, AND SAYING SO IS THE POINT. 599/599, 612/612.

`60c53d8` claimed the clock was fixed at the definition. True for the 26 call sites that USED the
helper — and **21 more inline copies of the same UTC expression sat in 12 files that never called
it at all.** Swept in `e3663c6`.

**Two of them made things WORSE, not merely unfixed.** `AgentProfileView` buckets its weekly chart
by day string and compares against each transaction's own `date`; once sales stamped local dates
while the buckets stayed UTC, the chart became *inconsistent with the data it was reading*. And
`RestockVaultView` stamps `poDate` at factory intake — **the production date the whole freshness
chain is about to key off.**

**The pattern is now BANNED, not just removed** — a scanner refuses any app file taking a UTC date
inline, same shape as the existing `storeKey` scanner. Hand-fixing 21 occurrences only fixes 21.
Proven: reintroducing one turned two checks red and named the file.

✅ **History stays as it is** — his call, *"we can leave history alone and continue our work"*.

## 🟠 2026-08-23 11:20 — THE CLOCK. IT WAS NEVER TWO BUGS. 599/599, 609/609.

**He picked A** — *"sure fix the clock time first then then we can design the next one"*. **Done,
`60c53d8`.** Next job is **B, the freshness chain — he asked for it to be designed next.**

**There was no 7am rule.** Nobody configured one, which is why nobody could find it.
`getCurrentDate()` was `new Date().toISOString().split('T')[0]` — the **UTC** date — and WIB is
UTC+7, so the UTC date flips at 07:00 local. One bug wearing two names on the backlog for six days.

**The cure was already in the file.** `getLocalDayKey` sat directly below the broken helper with a
comment describing exactly this, while all 26 call sites used the UTC one. Fixed at the definition;
every caller wanted local. The one that cost money is `useTransactionEngine` — seven write paths
stamp `date`, so a sale at 06:30 was filed under yesterday.

`AgentInventoryView.jsx` kept its **own private copy** of the UTC helper — it would have stayed a
day behind even after the shared fix. Deleted; a check now refuses any second date rule anywhere.

**Two non-findings, both pinned:** `dayStats` was already right (it refused the broken helper and
computed local midnight itself), and the sales-draft cap is an AGE — twelve hours — never a day
boundary, despite being captioned *"his day starts at 07:00"* for months. Caption corrected in the
source and in its check.

**Proven non-decorative:** reverting the helper to UTC, restoring the private copy, and switching
the day key to UTC getters turned **seven checks red** on this machine (offset −420 = UTC+7);
restoring turned them green. The behaviour checks carry an honest note that a machine running in
UTC could not tell the implementations apart — which is why the source checks stay too.

❓ **ONE QUESTION FOR HIM, NOT DECIDED:** old records keep their UTC `date`, so past sales between
midnight and 07:00 WIB are still filed under the previous day. Repairing means rewriting `date` on
every historical transaction from its `timestamp`. **Left open on purpose.**

## 🟠 2026-08-23 10:09 — TWO FACTS FROM ALDI REWROTE THE ROADMAP. 599/599, 596/596.

🔴 **WAITING ON HIM — he must pick A or B before anything starts:**
- **A · Fix the clock.** Small, one session. Day rolls at 7am and `getCurrentDate()` is UTC in 26
  places, so anything counted per-day is wrong at the edges. Unblocks order-quantity + accuracy.
- **B · The freshness chain.** Birth date at intake → batch travels to branches → oldest ships
  first + ageing warning. Three sessions. Does NOT need the clock. **Claude's pick.**

**His two facts, verbatim, because both invalidated written work:**

> *"there is no supplier between this restock, because goods is made by company own factory and we
> sell our product ourself"*

> *"pita cukai is bought by company and company are be able to sell the product with it, and if its
> expired it is still cant be sell and there is no problem with our government ... the problem is
> with our customer, when the customer see old pita cukai on the product means that the cigarette is
> old and they assume this product is tidak laku or tidak enak ... on the cigarette it have some
> sauce that put into the product and it causing the new fresh sauced cigarette to taste better"*

**What that changed.** No third party anywhere in the chain — factory → HQ → branch → van → store —
so nothing may be framed as a supplier or carrier claim; a shortage is an internal leak. Excise
gap **deleted**, no government angle at all. But freshness became the **highest-value item on the
list**: old stock costs margin AND reputation, and the thing to track is **age**, not an expiry
date that does not exist. G1 is also cheaper than it looked — `RestockVaultView` already has a
Batch / Serial No. field, so the work is *carrying* the batch, not inventing it. A new gap 8
replaces the deleted one: factory intake credits whatever is typed, with no production date, and
that is the only moment a batch's age can ever be recorded.

**Shipped `a3c0dff` — the cause list is live** on his word *"for the 5 cause we can just add that
as default for now"*. Still his words to rename; the `value` strings are what Firestore keeps.
**"Supplier Short" removed** — it could never be true, and its internal version is caught at the
receiving door now. Replaced by **"Cause unknown"**: the admin cannot type their own reason (his
rule), so without an honest bucket someone picks the nearest wrong word and the report lies with
confidence. Two checks: one reminder pinning the default list, one HARD rule refusing any cause
that mentions a supplier.

📄 Roadmap: `A-Brain/Wiki/Concepts/The Eight Warehouse Gaps.md` · artifact
`https://claude.ai/code/artifact/2a94825e-e349-42a7-bf52-9404d0c19c2c` (both corrected).

## 🟠 2026-08-23 — THE COUNT MOVED TO THE DOOR, AND THE ROADMAP GOT RANKED

**Two things shipped. Neither has been seen on a real screen.**

### The arrival check — `4a781e6`

Receiving a shipment was one yes/no button, and the branch was credited whatever HQ *said* it
shipped. A short box therefore became branch stock that does not exist, invisible until the weekly
Stock Opname weeks later — where it looks exactly like theft at the branch. Wrong person blamed,
and the claim against HQ or the courier long dead.

Receiving is now a count. **Partial blind** on his decision: the receiver sees WHICH products
should be in the box, never HOW MANY, and the quantities are hidden from the branch card while the
shipment is in transit. The branch is credited what it COUNTED. Any difference or any damage files
the order as `DISPUTED`, which sorts to the top of HQ's active list with the line-by-line record of
sent versus received. **No tolerance here, unlike Stock Opname** — a sealed box carries no fraction
of a pack.

Fixed on the same path: confirming a shipment twice credited the branch twice. The guard reads the
order status *inside* the transaction, not from the listener snapshot.

**594/594 selfcheck, 599/599 audit — and the new checks were PROVEN non-decorative:** three shipped
rules broken on purpose turned four checks red, restoring turned them green.

### The research — vault note + artifact

`A-Brain/Wiki/Concepts/The Eight Warehouse Gaps.md` and the artifact
`https://claude.ai/code/artifact/2a94825e-e349-42a7-bf52-9404d0c19c2c`.

Several assumed gaps turned out not to be gaps — `batchNo`, `minStock` and the whole excise-band
system already exist. What is actually missing is narrower: `batchNo` never travels past the
purchase order, and `minStock` is a flat 50 that knows nothing about sales speed or lead time.

**Build order: G7 clock → G6 damaged route home → G3 suggested order qty → G5 accuracy panel →
G1 batch identity → G2 expiry/FEFO → G4 ids instead of names.**

### 🔴 HE STILL OWES TWO ANSWERS

1. **The five shortage cause words.** Shape settled 2026-08-23 — short main list + a "Lainnya"
   second level, **no free typing by the regional admin** — but the words are still Claude's.
   Drop "kiriman kurang": the arrival check catches that at the door now.
2. **Do old-year excise bands have a legal cut-off?** Decides whether gap G8 exists. Supplier or
   Bea Cukai, not a search engine. Nothing was assumed.

### Skills installed 2026-08-23

82 design skills (bergside 67, Leonxlnx taste 13, vercel web-design-guidelines, playwright-cli).
**Alucard section `1a` now auto-loads the design stack** — his taste note, `impeccable`,
`emil-design-eng`, `ui-ux-pro-max`, `ui-styling` — on any design or redesign ask. The 67 style
packs are a **catalog, never auto-loaded, and never pointed at KPM**: they are competing
aesthetics and the palette law outranks all of them. His component/animation reference sites are
`A-Brain/Wiki/Concepts/Design Inspiration Sources.md`.

⚠️ **Installing bergside overwrote his `impeccable/SKILL.md`** — same skill name, different skill.
Repaired with `npx impeccable skills install`; the intruder lives at `impeccable-typeui`.

## 🔴 2026-08-21 17:12 — THE WHOLE STOCK OPNAME SCREEN WAS CRASHING, AND EVERY CHECK WAS GREEN

**Read this before trusting a green suite ever again.**

```
ReferenceError: Cannot access 'hasTyped' before initialization
[STOCK_OPNAME] FAILED TO LOAD
```

The count row read `hasTyped` **two lines above its own `const hasTyped`**. A `const` is in the
temporal dead zone until its own line runs, so every render threw and the entire tab fell into
`LazyTabBoundary` — a blank screen.

**It shipped in the recount commit and survived two more commits.** `npm run build` compiled it.
`integration.audit` said **599/599** and `logicFixes.selfcheck` said **565/565** — on a screen that
did not render at all. **Neither suite renders anything.** They read source and run lifted
functions. **Every check in this repo can be green while the app is a black rectangle.**

Only opening it in a browser found it, which is what Aldi asked for and was right about.

⚠️ **A static guard for it was written and then DELETED.** It passed on the broken code as readily
as on the fixed code — a probe restoring the bad ordering did not turn it red. **That is the
second decorative check caught in one day.** The rule, earned twice: **prove a check fails before
trusting it, and delete it when it cannot.**

### ✅ HOW TO TEST IN HIS REAL BROWSER — this worked, reuse it

1. `preview_start` with `{name: "kpm-dev"}` → serves **today's code** at `https://localhost:5173/`.
   The Vercel site does NOT have the new work.
2. `mcp__claude-in-chrome__list_connected_browsers` — his extension is installed and ON.
3. Navigate that tab to localhost. **HE logs in himself** — Claude never touches the password.
4. Screenshots DO work in his Chrome (they failed only on a `chrome://` page, which is normal).
5. ⚠️ **The sidebar is the awkward part.** Clicking the collapsed rail worked once and then
   stopped; `find` returns a ref for the hidden nav button but clicking it does nothing. The
   sequence that worked: reload, click **(32, 40)** to open the rail, then **(79, 286)** for the
   clipboard icon, then **(1442, 177)** for NEW COUNT.
6. It talks to **REAL Firebase**. Type counts, but **do not press submit** — that writes a real
   audit. For end-to-end, set up the emulator instead.

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

## 🟠 LOG TRIMMED TO FIVE ENTRIES, 2026-08-23 10:09

Everything before 2026-08-21 16:44 retired. Full story in `git log -p -- .claude/PROGRESS.md`;
the decisions themselves live in `A-Brain/Wiki/Concepts/Where KPM Is Going.md` and
`A-Brain/Wiki/Concepts/The Eight Warehouse Gaps.md`. Five entries is this file's working depth.

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

🔴 **THE ONLY OPEN DECISION — A OR B, verbatim as it was put to him 2026-08-23 10:09:**

> **A — Fix the clock.** Small, one session. Day rolls at 7am and dates run in UTC, so anything
> counted per-day is wrong at the edges. Unblocks order-quantity and the accuracy panel.
> **B — The freshness chain.** Birth date at intake → batch travels to branches → oldest ships
> first + an ageing warning. Bigger, maybe three sessions. Doesn't need the clock.
> My pick: **B.** It's the one that makes money, and you clearly feel that pain already.

✖ ~~what are the five causes called~~ — **answered 2026-08-23:** *"for the 5 cause we can just add
that as default for now"*. **SHIPPED `a3c0dff`**, minus "Supplier Short" which could never be true
(his own factory, no third party), replaced by "Cause unknown". Still his words to rename later.

✖ ~~do old-year excise bands have a legal cut-off~~ — **answered 2026-08-23: NO.** No government
angle at all. The cost is the customer reading the band year as *tidak laku*, plus the sauce going
flat. That makes freshness a **money** problem, not a compliance one.

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

**Live front, 2026-08-23 10:09 — THE WAREHOUSE CHAIN.** Stock Opname is finished. The receiving
door is finished. What is left is a ranked roadmap and **one decision Aldi has not made yet.**

✅ **A and B are both done** — clock (`60c53d8` + `e3663c6`), stock age (`42fefe8`). **He asked for
no threshold and none was built; do not add one.**

🔴 **THE NEXT THING IS NOT MORE FEATURES — IT IS LOOKING AT THE APP.** Three shipped today, none
seen running, on top of two days the same. The 08-21 entry below is what that costs. Needs HIS
Chrome; the in-app browser refuses the dev server's certificate.

📖 **A cold session reads two files before anything else:**
`A-Brain/Wiki/Concepts/Where KPM Is Going.md` — the theme and every locked decision.
`A-Brain/Wiki/Concepts/The Eight Warehouse Gaps.md` — the ranked roadmap, the build order, and
what was deliberately rejected so it does not get re-proposed.

⚠️ **TWO FACTS THAT INVALIDATE OLDER NOTES IN THIS FILE.** There is **no supplier** — the company
owns the factory, so nothing may be framed as a supplier or carrier claim; every shortage is an
internal leak. And **excise bands carry no legal deadline** — the cost of old stock is the customer
reading the band year as *tidak laku* plus the sauce going flat. Any older note implying otherwise
is wrong.

⚠️ **NOTHING SHIPPED SINCE 2026-08-21 HAS BEEN SEEN ON A REAL SCREEN.** The in-app browser will not
load the dev server's self-signed certificate; this needs his own Chrome. His checklist is
`A-Brain/Backlog/Test the new Stock Opname on a real screen.md`. **A green suite is not a working
screen** — the 08-21 crash entry below is what that lesson cost.

☠️ **Still true and still unrelated:** the obvious-looking fix for the forced Google sign-in runs
on into `signOut(auth)` at `App.jsx:2336` and would delete his sign-in permanently. Do not apply it.

📎 **Still live from 2026-08-19:** his six reported items were investigated and none are fixed.
Evidence with file and line numbers in `.claude/SWEEP-2026-08-19.md`.

**Before writing anything to him, read the top of `.claude/NEXT-SESSION.md`.**
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
| `src/StockOpnameView.jsx` → `VARIANCE_REASONS` + `varianceReasonMissing()` | **NEW 2026-08-21, LIVE 2026-08-23** — why a confirmed difference happened. Running as the DEFAULT on his word; still his words to rename. ⚠️ No cause may mention a supplier — there is none in this chain. "Cause unknown" is deliberate: the admin cannot type their own reason, so an honest bucket stops them picking a wrong one |
| `src/components/BranchWarehouseManager.jsx` → `receiptLines()` / `receiptBlocked()` / `receiptDisputed()` | **NEW 2026-08-23** — the arrival check. The branch is credited what it COUNTED, never what HQ claimed. Partial blind: quantities hidden while `IN_TRANSIT`, product names kept so a missing product is counted as 0. Any difference or damage → `DISPUTED`, top of HQ's list. **No tolerance here** unlike Stock Opname — a sealed box carries no fraction of a pack |
| `A-Brain/Wiki/Concepts/The Eight Warehouse Gaps.md` | **NEW 2026-08-23 — THE ROADMAP.** Eight ranked gaps, the forced build order, and what was rejected on purpose. Artifact version: `https://claude.ai/code/artifact/2a94825e-e349-42a7-bf52-9404d0c19c2c` |
| `A-Brain/Wiki/Concepts/Design Inspiration Sources.md` | **NEW 2026-08-23** — the five sites his component and animation ideas come from, and the four rules an idea must clear (repalette · survive Lite Mode · no native dialog · must report). Alucard loads it on any design ask |
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
