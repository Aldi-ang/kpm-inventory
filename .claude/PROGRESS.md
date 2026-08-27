# PROGRESS — read this, search for nothing

**Updated: 2026-08-28 00:55 WIB (🟠 KPM app session)** · 📋 **RESUME BRIEF: `.claude/NEXT-SESSION.md`** · ✅ **HOVER GLOW + RIBBONS SHIPPED** · **666/666** · branch `phase0-solid-ground`, clean at `24673c7`

## 🟢 2026-08-28 00:55 — THE BOOK LIGHTS UP ON HOVER, AND THE COVER STOPS AT THE BOOK. `1ebbabc`, **666/666**.

Two asks shipped. Diagnosis lives in the commit message; what matters next:

**The hover glow is built, under a palette exemption HE GRANTED** ("sure", 2026-08-28). It is
**bounded and checked**: opacity 0 at rest, sparks only animate under `group-hover`, gone in Lite
Mode. Unbound it is just the amber background he has rejected twice by name. Three iterations, each
because the lab showed the last one wrong: a low ellipse that smudged the chip border, then a cream
spark on cream pages that was invisible, then three of four sparks painted **behind** the cover —
`preserve-3d` sorts children by DEPTH, not document order. The fix was `translateZ` **inside the
keyframe**, because the animation would have erased it on the element. Same fault as the caption,
second file, same day.

**The cover now starts 116px in**, so the ribbons hang 106px outside it and tuck 12px under —
*"cut the brown background where the book ends not where the ribbon ends"*. Moving that edge also
moved the reference for `SLAB_SHUT`: the old constant would have left the shut cover overhanging the
centre fold **by 163px**. Measured, not guessed, and now an arithmetic check.

**The lab grew `?hover`** — a hover cannot be screenshotted otherwise. Headless Chrome has no
pointer, and the in-app browser pane refuses to composite while it is off screen.

❓ **STILL OPEN, and it is the only thing left:** which chapter next. `sections.js` order puts
**Sales Terminal (titip vs lunas)** first, and that is the default if he does not care.

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

## 🟠 2026-08-27 22:22 — THE REPLAY BUG. **657/657.** `c05e740`

> *"animation is reset everytime i press the section fix that, and replace that into book page
> paper slide instead"*

**🔴 THE CAUSE: `const T = {...}` WAS DECLARED INSIDE THE COMPONENT.** React rebuilt it every
render, it sat in the open animation's dependency array, so the array changed every render and the
effect re-ran — **replaying the whole fly-in-and-open on every section click.** Nothing threw,
every check stayed green, and it looked like a deliberate animation.

Every animation constant is at **module scope** now; the effects depend on `[still, flightFrom]`,
both stable. Strings compare by value and were never the problem; the object was.

⚠️ **THIS IS THE THIRD BUG IN THIS FILE OF THE SAME FAMILY** — work scheduled or repeated by a
mechanism nobody was watching, nothing thrown, nothing red. (1) rAF cancelled by its own cleanup,
(2) the book at opacity 0, (3) this. **A frame cannot catch any of them.**

**Page motion is a SLIDE now**, not a rotateY — a flip is what the cover does. Both halves slide
out of the fold in opposite directions, 320ms, keyed on section AND page. `ponder-leaf` removed
from the theme.

⚠️ **NOT VERIFIED AT RUNTIME.** The lab gained a probe that clicks a section and reads the book's
animation clock, but **headless virtual time does not drive animation clocks honestly** — a
finished animation reported `currentTime: 0`, which no real browser does. Limits are written into
the harness. The fix rests on the dependency rule and visibly correct code. **He sees the answer on
the first click.**

## 🟠 2026-08-27 20:44 — RIBBONS. **657/657.** `<see git log -1>`

> *"can u remove the white scroll, i dont want to see any of the scroll inside this book, and the
> section also make it like book ribbons u know to make it more natural and make these section into
> one line with no scrollable so resize the spacing"*

**🔴 THE CREAM STRIPS WERE NEVER SCROLLBARS — they are the PAGE EDGES.** They were pinned to
the stage rather than to the halves they are the edge OF, so when the cover shut they stayed put:
two pale strips hanging in the dark beside a closed book. Left half keeps its own edge + half the
bottom; the right half's live **inside the leaf** and turn with it. Closed, the fore-edge lands
opposite the spine, which is correct.

**Tabs → ribbons.** A V cut into the free end (the one shape that reads as fabric), active one
woven in gold rather than outlined. **17 × 26px + 2px gap = 474px**, so they all fit and the scroll
container is **gone, not hidden** — nothing left to scroll.

**❓ STILL OWED BY HIM — verbatim:**
> *"i want this animation when book is hovered https://www.youtube.com/watch?v=vhG5usAFL_g with the
> light effect as well"*

**YouTube cannot be opened here** — he must describe it in one line. Current hover is a stand-in
(cover lifts, chip rises, specular band crosses the leather). **Sounds are also still unheard.**

## 🟠 2026-08-27 20:27 — THE CHIP IS THE BOOK. **657/657.** `bd22eba`

> *"erase the scroll white indicator looks really bad"* · *"rather than it close and shrink and
> gone, i rather make the book fly from its original position to the big screen, then when it close
> it fly back to the original position, the small version of book on its space"* · *"i want the
> book size to match the real book, this sizing is very different to start with sc1"*

**🔴 THE CHIP WAS LANDSCAPE — 34×26, wider than tall, which no closed book is.** A closed book
here is half the spread: 520×760 = **0,68**. The chip is **21×30**, same ratio. Big and small are
now one object at two sizes, which is the whole reason the flight reads as a movement.

**The white sliver** was a flat cream bar reading as a scrollbar → fine alternating page-edge
lines, same texture as the big book. **Scrollbars inside the book are hidden** — the global brown
bar is tuned for dark panels and sits on cream paper like a stripe.

**🔴 THE FLIGHT AIMED AT THE WRONG RECTANGLE.** It scaled the whole 1040px container onto the
chip, but a shut book is only half the spread plus the tab column — so it drifted sideways while
shrinking. Now it maps the **closed** book's centre, scaled by **height** (a closed book is
portrait), subtracting where that centre lands after scaling about the container's middle.

**No more dissolve.** Neither flight touches opacity, and the chip's own book is `visibility:
hidden` for exactly the span the big one is out — never two, never none.

**❓ WAITING ON ALDI — verbatim:**
> *"i want this animation when book is hovered https://www.youtube.com/watch?v=vhG5usAFL_g with the
> light effect as well"*

**YouTube cannot be opened here.** Current hover is a stand-in: cover lifts on its spine, chip
rises 1px, a specular band crosses the leather. **He needs to describe the video in one line.**
