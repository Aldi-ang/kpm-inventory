# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Build the phone tutorial: the panel arrival Aldi picks, the display icon, the app's amber, and the
pad sized for a phone. Every design question below is answered or is one question to him — none of
it needs new design work, it is lifting finished CSS into React.

FIRST — ASK WHICH ENTRANCE, AND DO NOT GUESS
  The EXIT is already locked: Deploy's. "deploy looks the best for the closing". The picture
  squeezes to a scanline, the slab folds to a bar, the bar snaps back to the chip. 380 ms.
  The ENTRANCE is the open question. Four of them, all using that same exit:
    https://claude.ai/code/artifact/1df504b7-f3d9-412c-ae16-5924ec1cb80c
      01 Unfold (the baseline he has seen) — point, bar, slab.        slab 280 / done 990
      02 Surge (recommended) — slab lands dark, then light floods it. slab 130 / done 840
      03 Assemble — rail from the right, meter from the left, lock.   slab 370 / done 990
      04 Scan in — a bar crosses the screen and leaves the pad.       slab 300 / done 940
  Source with all four fully written: A-Brain/Brainstorm/assets/ponder-panel-arrival.html
  Write-up: A-Brain/Brainstorm/2026-09-03_panel-arrival-animation.md
  Copy the winning keyframes. Do not redesign them.

WHAT IS ALREADY DECIDED
  - The icon is the DISPLAY ("display look the cleanest so choose that"). Its CRT outro and boot
    intro are written in A-Brain/Brainstorm/assets/ponder-icon-handoff.html —
    https://claude.ai/code/artifact/d39f91fd-c2b2-4677-acda-3cdaebc2c34b
  - The lit colour is the app's amber #F59E0B, not the pad's pale #FFCE8F.
  - The pad gets an X on its own status strip. It had no close control before.
  - The panel's EXIT is Deploy's, 380ms, and it does not change with the entrance pick.
  - Phone only. The PC keeps the book, riffle and all.

THE WORK, IN ORDER

  1. THE AMBER, on the panel prototype. A-Brain/Brainstorm/assets/ponder-field-terminal.html:
       --lit:#FFCE8F; --lit-dim:rgba(255,206,143,.40); --lit-hot:#FFE7C4;
     becomes
       --lit:#F59E0B; --lit-dim:rgba(245,158,11,.38); --lit-hot:#FFC24D;
     ⚠️ The tokens alone will NOT do it. Grep for raw rgba(255,206,143,...) and
     rgba(255,231,196,...) — @keyframes lampOn, @keyframes segOn and .key.on all hardcode those.
     Ink on the latched face stays #2A1A08; it measures 7,82:1 on #F59E0B.
     Republish to the SAME artifact: https://claude.ai/code/artifact/ad98ec70-ede4-4866-95f6-aa553c9f0ef0

  2. THE ICON, into src/ponder/PonderBook.jsx. Replace BookGlyph (starts ~line 186) with the
     display glyph. PonderBookButton at :259 keeps its chip, its label and its Library wiring.
     The book's `visibility: hidden` while `libOpen || bookShutting` becomes the CRT outro: the
     bezel STAYS in the bar, only the picture collapses, so nothing in the top bar shifts. Boot it
     back when the panel closes — `bookShutting` already tracks that moment.

  3. THE PANEL ARRIVAL, on the phone path only. This is the real job. The chosen keyframes drive
     the pad's housing, rim, meter, rail lamps, picture and text as one staged sequence, each part
     firing once and holding. Nothing loops while the panel is open.

  4. THE PAD, sized for a phone. It is width:min(424px,100%), height:min(880px,...) with
     min-height:540px — a desk size. Decide what it does under ~380px before writing anything.

THE TRAPS — all four already bit once in the files you are copying from
  - Do not name the pad's display `.tube`. The icon already has a `.tube`, and a bare `.tube{}`
    rule reaches straight inside it. The arrival file calls the pad's `.crt` for this reason.
  - A beam or line drawn INSIDE an element that scales gets scaled with it. The CRT squeeze is
    scaleY(.04), so a 1px beam inside it becomes 0.04px and never renders. Keep it a sibling.
  - Rest must be exactly where the animation lands. Resting on one lit line while the boot writes
    four made three lines vanish the instant it finished.
  - Lite Mode and reduced-motion must reset BOTH transform and clip-path, or the panel opens to an
    invisible slit with no words in it.

VERIFYING MOTION HERE
  The preview pane's animation clock stalls: everything reports playState "running" with
  currentTime 0, and a correctly applied rule reads as an identity matrix. Pin a keyframe with a
  negative animationDelay plus animationPlayState:'paused' and read getComputedStyle. For a
  transition, set style.transition='none', force `void el.offsetWidth`, then read.
  Screenshots taken after scrolling the pane come back BLACK — the pane captures a stale frame.
  Emulate a taller viewport with resize_window instead of scrolling, then screenshot at scrollY 0.

  Steps 2-4 touch src/. Add a check that pins the icon's rest state and the arrival's staging so
  neither can be silently undone, then run both suites and report the new numbers:
      npm run build; node src/config/integration.audit.mjs
      node src/config/logicFixes.selfcheck.mjs
  Baseline today is 714/714 and 1000/1000.

Then rewrite .claude/NEXT-SESSION.md with the next single job.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Queued 1 — remove the riffle from the Ponder book (his decision, 2026-09-02)

Pressing a ribbon must jump straight to that chapter instead of turning N pages. The page turn
itself stays: next/prev between two neighbouring sheets keeps its 3D fold and `TURN_FULL_MS`.

- `pickSection` in `src/ponder/PonderBook.jsx` does not set a position, it starts a run.
  Line 763 is `rateRef.current = riffle(posRef.current, t).ms`; `riffle()` lives at
  `src/ponder/pageModel.js:87`. Section 1 -> 17 turns sixteen pages, ~700ms before the answer.
- **THE TRAP:** `riffle()` is pinned by checks that go red the moment it is deleted, and deleting
  those checks to make them pass is the wrong fix.
  `src/config/integration.audit.mjs:4766` asserts the literal line exists, reason at 4771.
  `src/config/logicFixes.selfcheck.mjs:15` imports `riffle, TURN_FULL_MS, RIFFLE_MIN_MS`.
  Every one must be REPLACED by a check that pins the new behaviour — never removed.
- Both counts change when checks are swapped. Report the new totals before committing.

### Queued 2 — does the pad follow the app's light mode?

The pad is dark only; the locked palette has no light values for it. Asked twice, never answered.
Ask before building: does the pad get a light material of its own (the anodised-faceplate route
the sidebar took), or stay dark in both themes on purpose?

</details>
