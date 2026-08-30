# PROGRESS — read this, search for nothing

**Updated: 2026-08-30 09:16 WIB (🟠 KPM app session)** · 📋 **RESUME BRIEF: `.claude/NEXT-SESSION.md`** · **666/666 audit · 864/864 selfcheck** · branch `phase0-solid-ground`, tree clean

## 🟠 2026-08-30 09:16 — MINIMAL KIRIM: THE FORM, THEN THE COLUMN. `20a4622` + `4146c36`, **666/666 + 864/864**. Tree clean.

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

**❓ WAITING ON ALDI — his new ask, unedited, and it BLOCKS the third job:**

> *"btw we dont have one more data to view actually, the total performance per day per week/ month or
> year for products right, like how many product is actually sold per timeframe specific for each of
> the product? well basically the performance for each product in overall through all region"*

**Investigated, and the answer is half-good.** The data IS reachable —
`fetchHistoricalTransactions(start, end)` at `useDatabaseSync.js:188` already bypasses the 7-day
listener cap and `HistoryReportView` already uses it with Daily/Weekly/Monthly. What does NOT exist:
any grouping **by product** over a period, and **yearly** as a range. Sebaran Stok's `Sold (7d)` is
the only per-product sales figure in the app and is pinned to 7 days by the listener.

**The decision he owes is COST, and it is his because it is his Firestore bill.** A live range query
pays document reads on every open; a year is thousands. Offered: `live` (always right, pays every
visit) · `stored` (a running per-product-per-month total written on each sale — nearly free to open,
one extra tiny write per sale, and months before it starts running stay empty until backfilled) ·
`mixed` (**recommended** — live for day/week/month, stored for year, since the year is both the
expensive one and the slowest-changing).

**Where things live — new or changed this session**

| Thing | Path |
|---|---|
| `minimal N` under the Jumlah box · `sendAdvice` memo | `src/RestockVaultView.jsx` |
| `bufferDays()` · `DEFAULT_BUFFER_DAYS` — the one place that knows his overrides | `src/utils/supply.js` |
| `reorderAdvice(..., spareDays = 0)` — the 6th argument | `src/components/BranchWarehouseManager.jsx:238` |
| Spare days, per cabang — Settings › Company · 06 | `src/components/SettingsView.jsx` |
| `?pov` / `?pov=solo` — the only way to look at the POV rack | `tools/ponder-lab.jsx` |
| `?minkirim` / `?minkirim=blank` — Sebaran Stok with the new column, and the tutorial fallback | `tools/ponder-lab.jsx` |
| The `Minimal kirim` column itself | `src/ponder/stages/StockByWarehouseTable.jsx` |
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
