# PROGRESS — read this, search for nothing

**Updated: 2026-08-30 08:25 WIB (🟠 KPM app session)** · 📋 **RESUME BRIEF: `.claude/NEXT-SESSION.md`** · **666/666 audit · 831/831 selfcheck** · branch `phase0-solid-ground`, tree clean

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

## ⬜ 2026-08-27 22:30 — SUPERSEDED BY THE ENTRY ABOVE (his four asks are done). Stopped on the weekly limit. Tree clean at `d8d8904`, **657/657**.

**Nothing is half-finished.** Every commit builds and audits green. `.claude/NEXT-SESSION.md` holds
the whole next job.

**⬜ ANSWERED AND SHIPPED in `8109559` — kept only as the record of what he asked:**

> *"this tiga biaya need fix, the textbox block the view for the 3 biaya and there is no highlights
> for that 3 biaya as well sc1. this landing cost also collapse with the text box, landed value as
> well, if there is not much space u can put the text box above it and arrow pointing bottom, and
> dont make the ponder panel slideable so that the text box is fixed, and then another thing is
> that i want to be able to press the each of the components inside the ponder panel and when
> pressed it will snap back to the timeframe where that components is explained"*

Four faults, and the brief carries the diagnosis for each: (1) the caption overlaps its own subject
— `EST_H = 150` in `PonderOverlay.jsx` is a guess and these captions are 3-4 lines, so the room
test approves space the box does not fit; (2) `focus` is single-valued, so only one of the three
cost fields lights; (3) the stage scrolls, so the caption drifts off its subject; (4) click-to-jump
is unbuilt — every element already has `data-ponder` and every step already names a `focus`, so it
is ~15 lines.

**Also still owed by him, and blocking nothing:**
> *"i want this animation when book is hovered https://www.youtube.com/watch?v=vhG5usAFL_g with the
> light effect as well"* — **YouTube cannot be opened from here; he must describe it in one line.**

And **nobody has heard the four book sounds play.** They are his own files, trimmed by measurement;
the levels are a first guess.
