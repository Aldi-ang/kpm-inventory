# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-08-28 00:20 WIB. 663/663. Branch `phase0-solid-ground`, clean.**
His four Goods Received faults are fixed and verified. **The hover video has now been watched** —
the only thing left on it is a palette-law exemption he must grant. Then the next chapter.

## First command

```
npm run build; node src/config/integration.audit.mjs
```

He is on **PowerShell**: `;` not `&&`.

---

## 🔴 THE ONE JOB — nothing is assigned until he answers

Both open items are **questions for Aldi**, not work. Ask them in the first reply, then do whichever
he picks. Do not start either one before he answers — the last four sessions each began with work he
had already redirected.

### ❓ 1. The book hover animation — still owed, still blocking that one polish item

> *"i want this animation when book is hovered https://www.youtube.com/watch?v=vhG5usAFL_g with the
> light effect as well"*

**✅ THE VIDEO HAS BEEN WATCHED — 2026-08-28. It is no longer blocked on him describing it.**
`/watch` works on this machine now (`uv tool install yt-dlp`; ffmpeg was already there). **Never
again write "YouTube cannot be opened from here" — that claim sat in three briefs and was false.**

What it actually is: 14s, *"Bible, book, fairytales, fantasy, magical"*. An open book on a dark
ground. Warm gold light escapes **from the gutter between the pages**, brightening over ~8s until
the paper itself is blown out; a soft cone of light rises above it; gold sparks drift **upward** out
of the pages, with two or three glowing butterflies among them; then the camera pushes INTO the book
and everything whites out.

**The one real conflict, and it is his to settle:** that effect is a large warm gold **fill**, and
the palette law says amber is an edge and an ink, never a fill — the only legal gold fill being a
3px rule whose length is data. The book's cream pages already hold a written exemption. **A glow
needs the same exemption or it cannot be built.** Ask for it in one line before building.

Also note the video's ending (white-out + camera push) is the OPEN animation, which already exists —
the book flies from the chip. Only the *glow and the rising sparks* belong on hover.

Current hover is a stand-in: cover lifts on its spine, chip rises 1px, a specular band crosses the
leather.

### ❓ 2. Which chapter is next

`sections.js` order is **Sales Terminal (titip vs lunas) → Setoran → Stock Opname → Piutang →
Armada → the rest**. Sales Terminal is the biggest and the one he uses daily, so it is the default
if he does not care. Each chapter is a scene file plus a stage; budget one session per chapter.

### ✅ AND HE SHOULD LOOK AT WHAT JUST SHIPPED

Beats 7, 8 and 9 of `?scene=goods-received`, and **press the fields** — that is job 4, which he has
not seen work. Also **nobody has ever heard the four book sounds.** They are his own files, trimmed
by measurement, and the levels in `VOLUMES` are still a first guess.

---

## What was just fixed, and the two traps it added

His four faults, all shipped in `8109559` — the commit message carries the whole diagnosis:

1. **Caption covered its subject.** NOT `EST_H` (that was 150 against a real 109 — too *large*).
   `animate-ponder-in` ends on `transform: none` with fill-mode `both`; an animation outranks an
   inline style, so `translateY(-100%)` was discarded the moment the arrival finished. Every
   'above' and 'beside' caption in every scene landed on its own subject.
2. **Only one of three costs lit.** `focus` takes a list now; the beat names all three keys.
3. **The stage scrolled under the caption.** Sized to fit (tighter rhythm + taller modal floor),
   not locked — `overflow-auto` stays as the phone's safety net.
4. **Click-to-jump built.** Press anything a beat explains, seek to the first beat naming that key.

A **fifth** bug surfaced while verifying and is fixed in the same commit: `getBoundingClientRect()`
is a PAINTED rect and the modal opens from `scale(0.94)`, so the first beat of every scene measured
6% small and stayed small — the ring sat 60px short of Upah bongkar. Autoplay healed it four seconds
later, which is why it survived every check and screenshot.

---

## Traps — every one of these has already cost time

- **🔴 FIVE BUGS IN THE PONDER FILES HAVE NOW BEEN THE SAME FAMILY:** work done by a mechanism
  nobody watched, with **nothing thrown and every check green**. A `requestAnimationFrame`
  cancelled by its own effect cleanup; the same pattern rendering the book at `opacity: 0`; a
  `const T = {...}` inside the component replaying the whole book on every render; an **animation
  keyframe eating an inline `transform`**; and a **rect measured through an ancestor's scale**.
  **Anything in a dep array must be stable. Anything that must run on mount should be a keyframe,
  not a frame you schedule. Geometry that must survive an animation goes in `left`/`top`, never in
  `transform`. A rect is what is PAINTED, not what the layout says.** No screenshot catches any of
  these — the last two were caught by reading `getComputedStyle().transform` and
  `rect.width / offsetWidth` back in a real browser.
- **🔴 VERIFY IN A REAL BROWSER, NOT FROM THE DIFF.** Both new bugs were found by measuring the DOM
  through the Browser pane against `tools/ponder-lab.html`. The sweep that proves a scene is sound:
  for every beat, assert the caption rect does not intersect the ring rect, the ring sits exactly
  `PAD` outside the union of the lit fields, and `scrollHeight === clientHeight`.
- **🔴 `/watch` WORKS HERE — videos are not a dead end.** `uv tool install yt-dlp` (ffmpeg was
  already installed); `pip install --user` does NOT work, because `python` on this machine is 3.14
  while pip targets 3.12. Three consecutive briefs told the next session "YouTube cannot be opened
  from here" and it was simply untrue, which left one of his asks blocked for three sessions.
  **Before recording something as impossible, try it once.**
- **🔴 A headless screenshot narrower than ~518px on Windows is a CROP, not a layout**, and
  **headless virtual time does not drive animation clocks honestly** — the first "after" shots
  showed rings mid-transition and read as a bug that was not there. Use `?probe` and read
  `innerWidth`; do not believe headless timing at all.
- **🔴 `overflow-hidden` and `clip-path` flatten `preserve-3d`.** The book's stage deliberately has
  neither; the cover is a clipped SIBLING for exactly this reason. Clip a child, never an ancestor.
- **The palette law holds, with one written exemption:** the book's pages are cream in BOTH themes,
  like the printed nota. No blue, no green anywhere else. Amber is an edge and an ink, never a fill
  — the only legal gold fill is a 3px rule whose length is the data.
- **Splitting a component splits its checks.** Grep the audit for a pattern before assuming a check
  still reads it — two group-56 checks had to be repointed this session because they asserted
  against exact lines that the fix rewrote.

## How to see it

```
npx vite build --config tools/ponder-lab.config.mjs
python -m http.server 4187 -d dist-ponderlab
```

`http://localhost:4187/tools/ponder-lab.html` with `?scene=<id>`, `?step=N`, `?book`, `?light`,
`?lite`, `?probe`, `?tab=<activeTab>`. It mounts the REAL components against the REAL stylesheet,
no login, **and the book harness sits inside a real `backdrop-filter` ancestor** because that is
what broke it in the app once. Frames:

```
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=20000 --screenshot=out.png --window-size=1360,880 "http://localhost:4187/tools/ponder-lab.html?scene=goods-received&step=6"
```

---

## Where things live

| Thing | Path |
|---|---|
| Session state | `.claude/PROGRESS.md` |
| Ponder design | `.claude/PONDER-PLAN.md` |
| The clock | `src/ponder/useScenePlayer.js` |
| The player — captions, highlight, click-to-jump, controls | `src/ponder/PonderOverlay.jsx` |
| The book | `src/ponder/PonderBook.jsx` · contents `src/ponder/sections.js` |
| Scenes | `src/ponder/scenes/` — `stock-by-warehouse.js`, `goods-received.js` |
| Stages | `src/ponder/stages/` — the extracted stock table, and a schematic intake form |
| Demo world | `src/ponder/demo/warehouses.js` |
| Book sounds | `src/ponder/sfx.js` → `public/sounds/` (his files, trimmed) |
| The 663 checks | `src/config/integration.audit.mjs` — group **56** is Ponder |
| Viewing harness | `tools/ponder-lab.*` |
| Lessons | `~/.claude/skills/alucard/lessons.md` |

<details>
<summary>Queued behind this — do not start these</summary>

- **Identify-on-hover**: Ponder's pause is really *Identify* — frozen, you hover a part and it names
  itself. Click-to-jump is now built and it is the same wiring, so this became small: the `jumpable`
  set and the per-element walk in `measure()` are already there.
- **The remaining 15 chapters**, in `sections.js` order.
- **Untested by anyone: Siapkan Pengiriman and the shipping modal.** Zero open branch requests
  exist; the first real one is the test.
- **Open, his call:** the panel name `Stock by Warehouse` was mine, not his.

</details>

**Before you finish: rewrite this file with the next single job.**
