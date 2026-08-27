# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-08-27 22:30 WIB. 657/657. Branch `phase0-solid-ground`, clean at `d8d8904`.**
The tutorial engine, the book and two scenes are shipped. Everything below is HIS words, unfixed.

## First command

```
npm run build; node src/config/integration.audit.mjs
```

He is on **PowerShell**: `;` not `&&`.

---

## 🔴 THE ONE JOB — four faults on the Goods Received scene, all from one message

> *"this tiga biaya need fix, the textbox block the view for the 3 biaya and there is no highlights
> for that 3 biaya as well sc1. this landing cost also collapse with the text box, landed value as
> well, if there is not much space u can put the text box above it and arrow pointing bottom, and
> dont make the ponder panel slideable so that the text box is fixed, and then another thing is
> that i want to be able to press the each of the components inside the ponder panel and when
> pressed it will snap back to the timeframe where that components is explained"*

Four things, in the order they should be fixed:

### 1. The caption covers the thing it explains
On the *tiga biaya* beat the box sits **on top of** Ongkos kirim / Pita cukai / Upah bongkar. Same
on the **Total landed value** and **Landed / Bks** beats — the box overlaps the very figure it is
about. His own instruction is the fix: **when there is not enough room, put the box ABOVE and point
the arrow down.** The placement code already has an above/below/side decision in
`src/ponder/PonderOverlay.jsx` (`const near = useMemo(...)`) — it is choosing wrong here, and
`EST_H = 150` is almost certainly the lie: these captions are three and four lines tall, so the
room test approves a space the box does not fit in. **Measure the box instead of assuming 150.**

### 2. There is no highlight on the three cost fields
The beat focuses `c:cukai`, so only ONE field lights. He expects all three to be marked, because the
sentence is about all three. **A beat needs to be able to focus more than one key** — accept
`focus: ['c:ongkir', 'c:cukai', 'c:bongkar']` and union their rects. The union code already exists
in `measure()`; only the key-matching is single-valued.

### 3. The panel must not scroll while a beat is up
> *"dont make the ponder panel slideable so that the text box is fixed"*

The stage scrolls (`overflow-auto`), so the caption drifts away from its subject. Either lock the
scroller while a beat is playing, or size the stage so the scene never needs to scroll. **Prefer
sizing it** — a tutorial that has to be scrolled is teaching two things at once.

### 4. Click a part of the stage → jump to the beat that explains it
> *"i want to be able to press the each of the components inside the ponder panel and when pressed
> it will snap back to the timeframe where that components is explained"*

This is the last Ponder idea not yet copied, and it is the good one. Every stage element already
carries `data-ponder`; every step already names a `focus`. So: click anything with a
`data-ponder`, find the FIRST step whose `focus` matches, `seek()` to it. Roughly fifteen lines in
`PonderOverlay.jsx` plus a cursor and a hover hint on the stage, so people know it can be pressed.

---

## What he still owes, and it blocks nothing

- **The hover animation.** *"i want this animation when book is hovered
  https://www.youtube.com/watch?v=vhG5usAFL_g with the light effect as well"* — **YouTube cannot be
  opened from here.** He must describe it in one line. Current hover is a stand-in: cover lifts on
  its spine, chip rises 1px, a specular band crosses the leather.
- **Nobody has heard the book sounds.** All four are his own files, trimmed; the levels in
  `VOLUMES` are a first guess.

---

## Traps — every one of these has already cost time

- **🔴 THREE BUGS IN `PonderBook.jsx` HAVE BEEN THE SAME FAMILY:** work scheduled or repeated by a
  mechanism nobody watched, with **nothing thrown and every check green**. A `requestAnimationFrame`
  cancelled by its own effect cleanup (the spotlight silently did nothing); the same pattern
  rendering the book at `opacity: 0`; and a `const T = {...}` inside the component putting an
  unstable object in a dependency array, replaying the whole book on every render. **Anything in a
  dep array must be stable. Anything that must run on mount should be a keyframe, not a frame you
  schedule.** No screenshot catches any of this.
- **🔴 A headless screenshot narrower than ~518px on Windows is a CROP, not a layout**, and
  **headless virtual time does not drive animation clocks honestly** — a finished animation reads
  back `currentTime: 0`. Use `?probe` and read `innerWidth` before believing a narrow frame; do not
  believe headless timing at all.
- **🔴 `overflow-hidden` and `clip-path` flatten `preserve-3d`.** The book's stage deliberately has
  neither; the cover is a clipped SIBLING for exactly this reason. Clip a child, never an ancestor.
- **The palette law holds, with one written exemption:** the book's pages are cream in BOTH themes,
  like the printed nota. No blue, no green anywhere else. Amber is an edge and an ink, never a fill
  — the only legal gold fill is a 3px rule whose length is the data.
- **Splitting a component splits its checks.** Five group-55 checks had to be repointed when the
  stock table moved files. Grep the audit for a filename before assuming a check still reads it.

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
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --screenshot=out.png --window-size=1360,880 "http://localhost:4187/tools/ponder-lab.html?scene=goods-received&step=6"
```

---

## Where things live

| Thing | Path |
|---|---|
| Session state | `.claude/PROGRESS.md` |
| Ponder design | `.claude/PONDER-PLAN.md` |
| The clock | `src/ponder/useScenePlayer.js` |
| The player — captions, highlight, controls | `src/ponder/PonderOverlay.jsx` |
| The book | `src/ponder/PonderBook.jsx` · contents `src/ponder/sections.js` |
| Scenes | `src/ponder/scenes/` — `stock-by-warehouse.js`, `goods-received.js` |
| Stages | `src/ponder/stages/` — the extracted stock table, and a schematic intake form |
| Demo world | `src/ponder/demo/warehouses.js` |
| Book sounds | `src/ponder/sfx.js` → `public/sounds/` (his files, trimmed) |
| The 657 checks | `src/config/integration.audit.mjs` — group **56** is Ponder |
| Viewing harness | `tools/ponder-lab.*` |
| Lessons | `~/.claude/skills/alucard/lessons.md` |

<details>
<summary>Queued behind this — do not start these</summary>

- **Identify-on-hover**: Ponder's pause is really *Identify* — frozen, you hover a part and it names
  itself. Click-to-jump (job 4) is the same wiring, so build that first and this becomes small.
- **The remaining 15 chapters**, in `sections.js` order: Sales Terminal (titip vs lunas) → Setoran →
  Stock Opname → Piutang → Armada → the rest.
- **Untested by anyone: Siapkan Pengiriman and the shipping modal.** Zero open branch requests
  exist; the first real one is the test.
- **Open, his call:** the panel name `Stock by Warehouse` was mine, not his.

</details>

**Before you finish: rewrite this file with the next single job.**
