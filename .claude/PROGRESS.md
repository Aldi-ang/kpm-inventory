# PROGRESS — read this, search for nothing

**Updated: 2026-08-31 09:25 WIB (🟠 KPM app session)** · 📋 **RESUME BRIEF: `.claude/NEXT-SESSION.md`** · **670/670 audit · 915/915 selfcheck** · branch `phase0-solid-ground`, tree clean

## 🟠 2026-08-31 09:25 — THE CLOSING SOUND NOW HAS SOMETHING TO PLAY OVER. `c4f2f1b`, **670/670 + 915/915**. Tree clean.

His report: *"when i close the ponder panel it should return to the closed book animation, right now
the panel is just gone but the book close SFX is there"*. `leave` called `onClose()` in the same
tick as `bookClose()`, the parent dropped the scene id, and the panel returned null on the next
render — so `bookCloseS` played over an empty screen.

The exit is `ponderOpen` reversed rather than a new gesture, so the panel returns to the size and
place it grew from, the same shape the little book already uses. 240ms against the 460ms arrival and
eased the other way: an entrance decelerates into place, an exit accelerates away. Lite Mode and
reduced motion still close on the spot, matching the book's rule.

**Check 670 compares `SHUT_MS` against the `ponder-shut` duration in `tailwind.config.js`** — two
numbers in two files that must agree, where too small cuts the animation off and too large leaves an
invisible panel swallowing clicks, and nothing else would ever notice. Mutation-tested both ways.

**Verified by driving the animation's own clock, not a wall timer** — the preview pane is hidden, so
`requestAnimationFrame` is paused and every `setTimeout` measurement is throttled beyond use. Paused
the animation and stepped `currentTime`: opacity 1 → 0.007, scale 1 → 0.940, +10px over the 240ms.

**🔴 FOUND WHILE IN THERE, NOT FIXED, HE HAS NOT ASKED:** picking a scene from the book unmounts the
Library on the spot (`onPick` → `setLibOpen(false)`), so the book's own shut-and-fly-back — which is
already built and works — only ever plays if you close the BOOK. Open a scene from it and the book
just vanishes. In the brief's queue.

## 🟠 2026-08-31 09:05 — THE TUTORIAL CAMERA NEVER MOVED ON A PHONE. `aef7f03` + `8f3f438`, **669/669 + 915/915**. Tree clean.

**He chose "fix A and B". A made B unnecessary**, and B would have deleted the behaviour he asked
for (*"the caption moves to what it is talking about"*), so the engine was fixed and every beat
re-checked. No beat needed B afterwards.

**It was never the clamp.** The unclamped `top` named in yesterday's brief is real, sits one branch
away from the fault, and explains every symptom — and is not the bug. `scrollIntoView` with
`behavior:'smooth'` moved the stage by **zero**, twice, 800ms apart, while `'auto'` on the same
element in the same frame moved it **0 → 211**. A 219px stage against 450px of content means a
subject that never scrolls sits at y=353, below the floor, and `spot` is then measured off-stage —
so the ring is drawn under the stage and the caption is placed against a position nobody can see.

**Second half:** a phone has no *beside*. `boxW` is 349 of 373 — 94% of the stage — so every
placement it can choose lands on the subject. Those beats now fall through to the wide bottom bar,
which is what the other beats in the same scenes already used. Two functional lines total.

**Verified:** 78 beat renders walked across all four scenes at 375px — zero captions outside the
stage, zero overlapping their own highlight. Desktop provably untouched: the stage does not scroll
at 1440 and `boxW` never reaches the bail threshold. Checks 668 + 669 added, both mutation-tested
red before green.

**🔴 LEFT UNDONE, ON PURPOSE — three caption/ring overlaps in Stock by Warehouse on DESKTOP**
(beats 7, 16, 22). Pre-existing, found by the same sweep, not caused by this fix. Full evidence
table in `.claude/NEXT-SESSION.md`; that is the next job.

**⚠️ A METHOD NOTE THAT COST TWO ROUND TRIPS.** A click-through walk and a fresh load give different
stage heights (439 vs 525) and different geometry, and a 1-D vertical overlap test flags every
*beside* caption as a failure when standing to the side is the correct behaviour. Reproduce on a
fresh load, test in 2-D.

**Vault:** `A Smooth Scroll That Never Runs` (renamed from the wrong-hypothesis title, kept as one
page so the wrong turn stays visible) + `A Meter That Exits Silently Is Not a Meter`.


## 🟠 2026-08-31 08:30 — THE PANEL WAS LOOKED AT, AND THE TUTORIAL IS BROKEN ON A PHONE. `e5d7e76`, **667/667 + 915/915**. Tree clean.

**Shipped:** `?perf` in `tools/ponder-lab.jsx` mounts the real Product Performance panel with no
Firestore — `db` null holds it in its loading state, `?perf=failed` hands it a db that is not a
Firestore so `doc()` rejects and the red box renders. Range buttons, loading line and failed-read
box all confirmed on frames, dark and light, desktop and phone. That was the whole assigned job.

**🔴 FOUND, NOT FIXED — the Ponder caption lands on top of what it explains, at 375px.** Six frames
prove it across two scenes; desktop is clean at every width tried. 36 `near` beats are candidates.
Suspect is one line, `src/ponder/PonderOverlay.jsx:328`, which returns `top` unclamped while the
beside-branch above it clamps. **Measure `wrap.scrollTop` before patching** — the stage scrolls, so
a naive `clampY` may clamp into content space. Full evidence table in `.claude/NEXT-SESSION.md`.

**🔴 THE BRIEF WAS WRONG ABOUT ITS OWN FIX.** It said beats 5 and 6 of `product-performance.js`
"both use `at: 'bottom'` now". They are still `at: 'near'` — the interrupted command never landed,
and the brief recorded the intention as the state. A handoff must quote the file, not the plan.

**🔴 THE 5-HOUR QUOTA METER HAS NEVER WORKED.** `.claude/plan-quota.mjs` warns at 70/85/95 and its
95% branch prints the exact STOP-and-write-notes order Aldi asked for — but
`C:/Users/ASUS/9router-claude-id.txt` and `9router-cookie.txt` are both MISSING [certain, checked:
`fs.existsSync` on both], and the hook exits silently without the id. So no warning fired at any
percentage on 2026-08-30, and he had to interrupt at 95% himself. `[context-watch]` is a different
meter (context window, which `/clear` fixes); it was never the one that was needed.

**✅ CLOSED THE HALF THAT DOES NOT NEED HIM.** `.claude/check-progress.mjs` gated only on
PROGRESS.md, so a brief three sessions old passed it. It now gates on the OLDER of PROGRESS.md and
NEXT-SESSION.md, blocks when either is missing, and names which one is stale — `8df0d2a`,
mutation-tested in both directions (saw it block on `src/App.jsx`, pass with both notes current).
Vault: two Concept pages at `1750e45`, linked from Concepts/index, Wiki/Index and MOC.

**❓ WAITING ON ALDI — two things, both his:**
1. *"which do you want — A) fix the engine, one line in PonderOverlay, all 36 beats, or B) fix this
   scene only, five beats near→bottom?"* Nothing is being written until he answers.
2. The two 9router files. Only he can read the connection id and cookie out of the Quota Tracker.

## 🟠 2026-08-30 10:35 — THE RESTOCK QUEUE, THE BOOK, AND THE SALES ROLLUP. `20a4622` → `18062df`, **667/667 + 915/915**. Tree clean.

*One entry for one long session. Ten commits on one line of work, not ten pieces of work.*

**🛑 STOPPED ON THE QUOTA. Nothing is half-finished.** Every commit builds and both suites are
green. `.claude/NEXT-SESSION.md` holds the whole next job.

| # | Shipped | Commit |
|---|---|---|
| 1 | POV test agent can be posted to any branch | `b1cdcaa` |
| 2 | `send at least N` on the Kirim form, keyed on Tujuan | `20a4622` |
| 3 | `Send at least` column in Sebaran Stok | `4146c36` |
| 4 | **Shipment Plan** panel — `Short by` names what HQ cannot cover | `7716a78` |
| 5 | Plain English on the HQ desk, and the age line reworded | `77aff79` |
| 6 | Ponder: new `shipment-plan` scene + 7 beats on stock-by-warehouse | `650035c` |
| 7 | **Ponder rewritten through the humanizer** — 35 beats, no second person | `3a87de4` |
| 8 | **Sales rollup, write path** — four call sites, one arithmetic | `c0a510f` |
| 9 | **Product Performance** — panel, rebuild button, chapter | `18062df` |

**THE SALES ROLLUP, which is the big one.** His ask: *"the total performance per day per week/ month
or year for products ... for each of the product? well basically the performance for each product in
overall through all region"*. Answering that live reads every receipt in the range — thousands for a
year, on his bill, every time the screen opens. He chose the alternative himself: *"we just need to
see the data thats auto update for every sales ... just do whatever to save cost, u know the method
better"*.

One document per month holds per-product and per-day totals. A day costs **1 read**, a week 1–2, a
month 1, a year 12. **The rollup is a CACHE, never the truth** — `transactions` stays the record and
Settings › Company · 07 rebuilds every month from it, so a bug costs a rebuild and never data.

**The counter was the easy half. The drift was the job.** Four paths touch a sale and all four now
touch the tally, in the same commit as the thing they count: the online sale, the offline drain
(filed on the day it was MADE, not the day signal returned), the three deletes through one shared
negative, and the history edit as −1 of what stood before plus +1 of what was saved.

**✅ HE MUST DO THIS ONCE, and nothing works properly until he does:** open **Settings › Rebuild
sales totals**. The tally only counts sales made since it shipped; that button fills in every month
before today from the receipts. The panel will say how many months are missing until it runs.

**✅ THEN LOOK AT** — **Reports**, top panel: Product Performance, with Today / This week / This
month / This year. And the book now has **four** chapters: three under Restock Vault, one under
Reports.

**🔴 MY MISTAKE, WORTH RECORDING.** A `git checkout --` used to undo a mutation test reverted
two files to HEAD rather than to their edited state, wiping finished wiring that had not been
committed yet. It was rebuilt from the patch scripts and lost no work in the end, but it cost real
time. **Commit first, then mutation-test.** Now the first trap in the brief.

**❓ WAITING ON ALDI — nothing. The queue he set is empty.** The next job is mine: the Product
Performance panel has never been rendered as a frame, only its table has.

**Where things live — new this session**

| Thing | Path |
|---|---|
| Sales rollup arithmetic (node-testable, 27 checks) | `src/utils/salesRollup.js` |
| The only module that owns the `sales_stats` path | `src/utils/salesRollupWrite.js` |
| The panel and its table | `src/components/ProductPerformancePanel.jsx` · `src/ponder/stages/ProductPerformanceTable.jsx` |
| Rebuild button | `src/App.jsx` `handleRebuildSalesStats` → Settings › Company · 07 |
| Its chapter | `src/ponder/scenes/product-performance.js` + stage + demo world |
| Spare days per branch | `src/utils/supply.js` `bufferDays` → Settings › Company · 06 |

*One entry for one continuous session — six commits on one feature line, not six pieces of work.*

**NOW: everything he queued is shipped except the sales-performance rollup, which is unblocked and
next. Ponder stays parked for new CHAPTERS, but new features get their scene — his rule, below.**

| # | Shipped | Commit |
|---|---|---|
| 1 | `send at least N` under every line of the Kirim form, keyed on Tujuan | `20a4622` |
| 2 | `Send at least` column in Sebaran Stok | `4146c36` |
| 3 | **Shipment Plan** — new panel, one row per product, `Short by` names what HQ cannot cover | `7716a78` |
| 4 | Plain English across the HQ desk + the age line reworded | `77aff79` |
| 5 | Ponder: 7 new beats on stock-by-warehouse, and a whole new `shipment-plan` scene | `650035c` |
| 6 | graphify rebuilt over the new files | `e45d263` |
| 7 | **Ponder rewritten through the humanizer skill** — 35 beats, no second person | `3a87de4` |

**🔴 HIS NEW STANDING RULE, and it now governs every feature:** *"new panel and features means
different ponder, but inside the same section of the book"*. It splits cleanly — a new **column**
gets extra beats on its panel's existing scene; a new **panel** gets a scene, a stage and a demo
world of its own; both land in the sidebar section they are printed in. **A feature is not done
until its beats exist.**

**⚠️ `ShipmentPlanTable` MOVED to `src/ponder/stages/`** beside `StockByWarehouseTable`, because
the audit scans that folder for `data-ponder` keys and a scene focusing a key nothing wears keeps
playing while pointing at nothing. Every reference repointed in the same commit.

**🔴 HE CAUGHT MY DRIFT ON WORDING:** *"can u use better english words from now on and change
that, its so fague"*. `Kurang` means "less" and never says less THAN WHAT. He had already settled
this on 2026-08-27 — *"use english terms if its shorter and direct"* — and I put an Indonesian panel
directly under an English one. **Now enforced by two checks that scan the HQ desk files for
Indonesian labels**, both mutation-tested. Branch-side screens stay Indonesian by design.
His other question, *"what is this mean the oldest sentence"*, was fair: `oldest here 116 days`
never said 116 days of WHAT. It reads `oldest pack 116 days old, from 2 deliveries` now, and
`20 unknown origin` became `20 with no delivery record`.

**🔴 HIS SECOND STANDING RULE OF THE DAY, and it is wider than Ponder:** *"use /humanizer skill to
do this. and i want alucard to use humanizer for all the work that he do so that its easier for me
to understand as well"*. So the skill now runs over replies, notes, commit messages and shipped copy
alike — not only the tutorial. And KPM's own copy has **no second person**: the subject of a
sentence is the warehouse, the branch, the shipment or a role, never *kamu* or *aku*. His words:
*"we are talking about the factory, subject is factory, employees, manager and all of these subject
no u and me"*. **Audit check 667 enforces it and names the offending beat.**
⚠️ One em-dash was punctuation and went; the other eight stay, because `—` is the CHARACTER the
panel prints in a cell it cannot fill and five beats exist to explain it. Banning it bans the lesson.

**✅ HE SHOULD LOOK AT** — Restock Vault, all three panels, and open the book: Restock Vault now has
**three** entries, Shipment Plan is the third, and every sentence has been rewritten.

*One entry for one continuous session — two commits fourteen minutes apart on the same feature line,
not two pieces of work.*

**NOW: Ponder parked at his word. The Restock Vault is the front. Two of the three queued jobs are
done; the standalone panel and the sales-performance rollup are next, and neither is blocked.**

**THE COLUMN SHIPPED TOO (`4146c36`).** Sebaran Stok carries **Minimal kirim** at header, warehouse
row, drawer item and company total — the same function, the same per-cabang cushion as the Kirim
form. **Rendered in both themes** via the new `?minkirim` lab slice, and `?minkirim=blank` proves the
Ponder tutorial's demo world (which has no `minimum`) still falls back to em-dashes instead of
crashing. ⚠️ **A dash and a 0 are different claims and never merge:** `0` = measured, needs nothing;
`—` = nobody knows yet. Master Vault is always `—` because nothing ships TO the source.
The warehouse figure is a **SUM**, sitting one cell from **Est. days left**, which still refuses to
total — packs add across products, rates do not. That contrast is the `348 days` lesson made visible.

**What shipped.** The reorder maths existed and only the BRANCH could see it: the tier that asks got
rate, days-left and a suggested quantity; the tier that ships typed from memory. HQ's Kirim form now
prints **`minimal N`** under the Jumlah box of every cart line, keyed on `poData.destination` and
re-derived the moment he changes Tujuan. Red only when what he typed is genuinely under the floor.
Never on the Masuk form, never for the master vault. The four functions are **imported** from
`BranchWarehouseManager`, never re-derived.

**His framing changed the label, and it was the right call:** *"normally factory does sent more than
enough goods to the regional warehouse but if there is not enough/ minimal goods are being sent then
this features actually come in handy, especially with company that have limited production
capabilities"*. So the word is **`minimal`**, not `saran` — when production is tight it is a floor,
not advice to weigh up.

**Spare days: per cabang, default 3, Settings › Company · 06.** He asked for per-branch because
*"each product performance for each regional area is different"* — that part was already true and
needs no setting (the rate is measured per product AND per cabang). What varies per cabang is RISK,
so that is what the override sets. **A blank box deletes the override rather than storing 0.**
`reorderAdvice`'s `spareDays` defaults to **0** so no pre-existing caller moved.

**✅ HE MUST LOOK AT THIS ONE — I could not.** The line only renders once a cabang has **two recorded
deliveries** of that product, and the lab has no data, so a harness frame would have proved nothing.
Open **Restock Vault › Kirim ke cabang**, pick a Tujuan with real history, add a product: `minimal N`
should sit under the quantity box and **change when you change Tujuan**.

**✅ HE CLEARED THE WHOLE QUEUE, 2026-08-30:** *"after u done u may continue with the panel, new
column and all the updated queued"* — so nothing below waits on him. Build order: **standalone panel
→ sales-performance rollup.** The column is already done.

**✅ HIS EARLIER ANSWER, which the two shipped commits came from:** *"i agree with your recommendation so new
separate panel and add column in sebaran stock, on the new panel"*. So the next two jobs are **(1) a
new standalone panel showing the shipping-quantity recommendation for every cabang side by side**, so
a short production run can be split, and **(2) the same minimum as a column in Sebaran Stok**.
⚠️ `StockByWarehouseTable` is **shared with the Ponder tutorial** — a new column touches the demo
world, the `COLS` constant and group-56 checks. Read `stock-by-warehouse.js` before moving `COLS`.

**✅ ANSWERED — the cost question is settled. His words:** *"we should use older data to avoid high
cost right, we just need to see the data thats auto update for every sales so we can see the latest
sales and have all the number isnt? btw right just do whatever to save cost, u know the method
better"*. That is **`stored`**, and he is right: a running total updated on each sale is always
current AND nearly free to read. **The safety property to build on: the rollup is a CACHE, never the
truth — transactions stay the source, so it is rebuildable at any time and a bug costs a rebuild,
not data.** The third job is UNBLOCKED. His ask, unedited, for the record:

> *"btw we dont have one more data to view actually, the total performance per day per week/ month or
> year for products right, like how many product is actually sold per timeframe specific for each of
> the product? well basically the performance for each product in overall through all region"*

**Investigated, and the answer is half-good.** The data IS reachable —
`fetchHistoricalTransactions(start, end)` at `useDatabaseSync.js:188` already bypasses the 7-day
listener cap and `HistoryReportView` already uses it with Daily/Weekly/Monthly. What does NOT exist:
any grouping **by product** over a period, and **yearly** as a range. Sebaran Stok's `Sold (7d)` is
the only per-product sales figure in the app and is pinned to 7 days by the listener.

**THE SHAPE TO BUILD, decided on his instruction to pick the cheap method:** one rollup document per
month, `byProduct` and `byDay` inside it, incremented **in the same batch as the sale** so it cannot
be lost or double-counted. Reads then cost 1 doc for a day, 1–2 for a week, 1 for a month, 12 for a
year — against hundreds or thousands of transaction docs for a live query.
⚠️ **THE DRIFT RISK IS THE WHOLE JOB, not the counter.** Three existing paths change sales after the
fact — transaction edit and delete in `HistoryReportView`, and consignment return/payment. Every one
must adjust the rollup in the same breath or the numbers rot silently, which is this repo's most
expensive failure shape. One helper applied with a +1/−1 sign, used by all of them.
⚠️ **And a REBUILD button is not optional** — it is both the backfill for months before this ships
and the repair tool if drift ever happens.

**Where things live — new or changed this session**

| Thing | Path |
|---|---|
| `minimal N` under the Jumlah box · `sendAdvice` memo | `src/RestockVaultView.jsx` |
| `bufferDays()` · `DEFAULT_BUFFER_DAYS` — the one place that knows his overrides | `src/utils/supply.js` |
| `reorderAdvice(..., spareDays = 0)` — the 6th argument | `src/components/BranchWarehouseManager.jsx:238` |
| Spare days, per cabang — Settings › Company · 06 | `src/components/SettingsView.jsx` |
| `?pov` / `?pov=solo` — the only way to look at the POV rack | `tools/ponder-lab.jsx` |
| `?minkirim` / `?minkirim=blank` — Sebaran Stok with the new column, and the tutorial fallback | `tools/ponder-lab.jsx` |
| The `Send at least` column | `src/ponder/stages/StockByWarehouseTable.jsx` |
| The Shipment Plan panel (moved into ponder/stages for the key scan) | `src/ponder/stages/ShipmentPlanTable.jsx` |
| Its tutorial — scene, stage, demo world | `src/ponder/scenes/shipment-plan.js` · `stages/ShipmentPlanStage.jsx` · `demo/shipmentPlan.js` |
| `?plan` / `?plan=empty` — the panel in the lab | `tools/ponder-lab.jsx` |
| The Time Machine — any date range, past the 7-day cap. Already wired, already used | `src/hooks/useDatabaseSync.js:188` → `src/components/HistoryReportView.jsx:230` |
| The table shared with the Ponder tutorial — where the new column goes | `src/ponder/stages/StockByWarehouseTable.jsx` |

## 🟠 2026-08-30 08:25 — THE POV COSTUME CAN BE POSTED ANYWHERE. `b1cdcaa`, **666/666 + 831/831**. Tree clean.

**NOW: Ponder is parked at his word — *"dont worry about the ponder book for now we focus on system
functionality"*. The live front is the Restock Vault.**

**What he asked and what it really was.** *"i want the option for tier 1 so that i can assign the
test agent into different places with no problems"*. He had reached for the roster form and been
stopped by its email requirement, and asked for that rule to be disabled. **It was the wrong fix
and it was refused, with the reason:** that email is the DOCUMENT ID of the `employee_directory`
row — the record that lets a human sign in — which is exactly why `povPreview.js` has never written
one for a test agent. The real blocker was one unused parameter: `testAccountDoc` took a
`defaults.location` nobody passed, so every costume was born at `Headquarters`, and **Headquarters
IS the master vault, not a cabang** — `branches/Headquarters/inventory` does not exist and no
`stock_request` can name it. Wearing tier 4 therefore always landed where the branch warehouse can
never fill. The rack now carries a **Tempat tugas** picker fed by `warehouseList`.

**🔴 AND TWO CHECKS HAD BEEN RED FOR FOUR DAYS.** `logicFixes.selfcheck` was **823/825**, not green.
Neither failure was a real defect: `76de71a` moved the fulfilment half out of
`BranchWarehouseManager` (−332 lines) and both checks kept reading the file the code had left. The
`increment()` deduction is alive at `RestockVaultView.jsx:696`, the DISPUTED-first rank at `:128`.
**It survived because every session report quotes `integration.audit`'s number and never this one.
Quote BOTH from now on.**

**✅ HE SHOULD TEST** — open the POV rack, pick **BANDUNG** under *Tempat tugas*, wear **T4 REGIONAL
ADMIN**. The branch warehouse panel should now show real stock and real reorder history instead of
"Warehouse is empty".

**❓ WAITING ON ALDI — one question, his call, nothing blocked behind it.** Feature **A** (the
reorder-advice panel — outflow rate, days left, *Saran N Bks* — shown on the HQ side too, since
today only the tier that ASKS sees the maths and the tier that SHIPS does not). He was offered
`request` / `push` / `both` and answered neither, then pivoted to the location option. **`both` is
the default if he does not care.**

**Where things live — new or changed this session**

| Thing | Path |
|---|---|
| The place picker + the costume-posting rule | `src/components/TierPovSwitch.jsx` · `src/App.jsx` (`povPlaces`, `handlePickPov`) |
| `?pov` and `?pov=solo` — the ONLY way to look at the rack (hidden door + owner email + vault gate) | `tools/ponder-lab.jsx` |
| The 831 checks — S14 and the arrival-check group were repointed | `src/config/logicFixes.selfcheck.mjs` |
| The two new laws, in the vault (`079491e`) | `A-Brain/Wiki/Concepts/Headquarters Is Not a Cabang.md` · `A Check Points at a File, Not at a Behaviour.md` |

## 🟢 2026-08-28 00:47 — HOVER GLOW AND THE RIBBON/COVER FIX. `1ebbabc`, **666/666**. Tree clean.

**NOW: stopped on the weekly quota. Nothing is in progress, nothing is half-done. One question is
the whole next job — which chapter.** Every commit
builds and audits green. Diagnosis for all of it is in `1ebbabc`; do not re-derive it.

**The hover glow is built under a palette exemption HE GRANTED** (*"sure"*, 2026-08-28), against the
video he sent twice. It is **bounded and checked**: opacity 0 at rest, sparks only animate under
`group-hover`, gone in Lite Mode. Unbound it is just the amber background he has rejected twice by
name. Three iterations, each because the lab showed the previous one wrong — a low ellipse that
smudged the chip's border, a cream spark invisible on cream pages, then three of four sparks painted
**behind** the cover. `preserve-3d` sorts children by DEPTH, not document order; the fix was
`translateZ` **inside the keyframe**, because the animation erases it on the element. Same fault as
the caption, second file, same day.

**The cover starts 116px in now**, so the ribbons hang 106px outside and tuck 12px under —
*"cut the brown background where the book ends not where the ribbon ends"*. Moving that edge moved
the reference for `SLAB_SHUT` too: the old constant left the shut cover overhanging the centre fold
**by 163px**. Measured in the lab, and now an arithmetic check so it cannot go wrong quietly.

**❓ WAITING ON ALDI — ONE QUESTION, AND IT IS MINE, NOT HIS.** He has no unanswered request
outstanding; his last two (*"sure"* on the exemption, and the ribbon note) are both shipped. The open
one: **which chapter next.** `sections.js` order puts **Sales Terminal (titip vs lunas)** first and it
is the one he uses daily, so that is the default if he does not care.

**✅ HE SHOULD LOOK AT** — hover the book chip in the top bar, and open it to see the ribbons.
Also **nobody has ever heard the four book sounds**; the `VOLUMES` levels are still a first guess.

**Where things live — new or changed this session**

| Thing | Path |
|---|---|
| `?hover` freezes the chip's hover state — a hover cannot be screenshotted any other way | `tools/ponder-lab.jsx` |
| The glow, the sparks, `COVER_LEFT`, `SLAB_SHUT` | `src/ponder/PonderBook.jsx` |
| `bookSpark` keyframes — the `translateZ` lives here, not on the element | `tailwind.config.js` |
| The 666 checks — group **56** is Ponder | `src/config/integration.audit.mjs` |
| The two new laws, in the vault | `A-Brain/Wiki/Concepts/A CSS Animation Outranks Your Inline Style.md` · `A Rect Is Painted, Not Laid Out.md` |
| `/watch` works here — `uv tool install yt-dlp` | `~/.claude/skills/watch` |

## 🟢 2026-08-28 00:20 — THE HOVER VIDEO HAS BEEN WATCHED. No code changed; **663/663**.

**Three briefs in a row said "YouTube cannot be opened from here." That was never true.** `/watch`
runs on this machine — `uv tool install yt-dlp` (ffmpeg was already there; `pip install --user`
fails because `python` here is 3.14 while pip targets 3.12). One of his asks sat blocked for three
sessions behind a claim nobody tested. **Before recording something as impossible, try it once.**

**What the video is:** 14s, *"Bible, book, fairytales, fantasy, magical"*. An open book on a dark
ground. Warm gold light escapes **from the gutter between the pages** and builds over ~8s until the
paper itself blows out; a soft cone of light stands above it; gold sparks drift **upward** out of
the pages with two or three glowing butterflies among them; then the camera pushes INTO the book and
everything whites out.

**🔴 THE ONE DECISION LEFT, AND ONLY HE CAN MAKE IT:** that effect is a large warm gold
**fill**, and the palette law says amber is an edge and an ink, never a fill — the only legal gold
fill being a 3px rule whose length is data. The book's cream pages already carry a written
exemption. **The glow needs the same exemption or it cannot be built.**

Note the video's ending — white-out plus camera push — is the OPEN animation, which already exists
(the book flies from the chip). Only the **glow and the rising sparks** belong on hover.

## 🟢 2026-08-27 23:50 — THE FOUR CAPTION FAULTS ARE FIXED. `8109559`, **663/663**. Tree clean.

**NOW: nothing is assigned. Both open items are questions he owes.** Every commit builds and audits
green. Full diagnosis is in `8109559`'s commit message — do not re-derive it.

His four asks, and what each needed: (1) caption covered its subject — **not** the `EST_H` guess the
old brief blamed; `animate-ponder-in` ends on `transform: none` with fill-mode `both`, and an
animation outranks an inline style, so the `translateY(-100%)` that made the box sit ABOVE was erased
the moment the arrival finished. (2) `focus` takes a **list** now, so all three costs light as one
band. (3) The stage overflowed its window by 27px — **sized to fit, not locked**; `overflow-auto`
stays as the phone's safety net. (4) Click-to-jump built: press any part a beat explains and it seeks
to the first beat naming that key.

**A FIFTH BUG of the same family turned up while verifying:** `getBoundingClientRect()` is a PAINTED
rect and the modal opens from `scale(0.94)`, so the first beat of every scene measured 6% small and
the ring sat 60px short of Upah bongkar. Autoplay healed it 4s later, which is why it survived every
check and screenshot ever taken of it. **Both new traps are now checks, each mutation-tested** by
re-breaking the fix four ways to confirm the check goes red.

Verified by measuring the DOM in a real browser, not by reading the diff: all 11 beats of Goods
Received and all 16 of Stock by Warehouse report caption clear of subject, ring pixel-exact
(L0 T0 R0 B0), zero vertical scroll. Mobile 375x812 keeps its controls on screen.

**✅ HE SHOULD LOOK AT IT** — `?scene=goods-received`, beats 7, 8, 9, and **press the fields**.
Also **nobody has ever heard the four book sounds**; `VOLUMES` levels are still a first guess.

**❓ WAITING ON ALDI — HIS WORDS, UNEDITED. Neither blocks anything:**

> *"i want this animation when book is hovered https://www.youtube.com/watch?v=vhG5usAFL_g with the
> light effect as well"*

**YouTube cannot be opened from here — he must describe it in one line.** Current hover is a
stand-in: cover lifts on its spine, chip rises 1px, a specular band crosses the leather.

And two of mine, still unanswered: **which chapter next** (`sections.js` order puts Sales Terminal,
titip vs lunas, first — the default if he does not care), and **the panel name `Stock by Warehouse`
was mine, not his**.

**Where things live — new this session**

| Thing | Path |
|---|---|
| The two new laws, in the vault | `A-Brain/Wiki/Concepts/A CSS Animation Outranks Your Inline Style.md` · `A Rect Is Painted, Not Laid Out.md` |
| The bug family hub (now five members) | `A-Brain/Wiki/Concepts/An Effect's Own Cleanup Can Cancel Its Frame.md` |
| The 663 checks — group **56** is Ponder | `src/config/integration.audit.mjs` |

No new source files: all four fixes landed in `PonderOverlay.jsx`, `goods-received.js` and
`GoodsReceivedStage.jsx`.
