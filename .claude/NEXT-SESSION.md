# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Put the display icon into the app, swap the panel to the app's amber, and size the pad for the
phone. Aldi picked the icon on 2026-09-03 ("display look the cleanest so choose that") and
approved its intro and outro in the same conversation. Nothing here is still a design question —
it is all lifting finished CSS into React and sizing.

WHERE THE FINISHED CSS IS
  A-Brain/Brainstorm/assets/ponder-icon-handoff.html — the icon, its CRT outro, its boot intro,
  the rest state, Lite Mode and reduced-motion, all written and all verified on screen.
  Live: https://claude.ai/code/artifact/d39f91fd-c2b2-4677-acda-3cdaebc2c34b
  Write-up with the timings table: A-Brain/Brainstorm/2026-09-03_tutorial-icon-candidates.md
  Copy the rules, do not redesign them.

  1. THE AMBER, on the panel. A-Brain/Brainstorm/assets/ponder-field-terminal.html declares
       --lit:#FFCE8F; --lit-dim:rgba(255,206,143,.40); --lit-hot:#FFE7C4;
     Swap to the app's own amber (src/styles/theme.css, --amber):
       --lit:#F59E0B; --lit-dim:rgba(245,158,11,.38); --lit-hot:#FFC24D;
     ⚠️ The tokens alone will NOT do it. Grep the pad for raw rgba(255,206,143,...) and
     rgba(255,231,196,...) — the lamp bloom (@keyframes lampOn), the segment energise
     (@keyframes segOn) and the .key.on glow all hardcode those. Ink on the latched face stays
     #2A1A08; it measures 7,82:1 on #F59E0B.
     Republish to the SAME artifact: https://claude.ai/code/artifact/ad98ec70-ede4-4866-95f6-aa553c9f0ef0

  2. THE ICON, into src/ponder/PonderBook.jsx. Replace BookGlyph (starts ~line 186) with the
     display glyph. PonderBookButton at :259 keeps its chip, its label and its Library wiring.
     The book's `visibility: hidden` trick while `libOpen || bookShutting` becomes the CRT outro
     instead: the bezel STAYS in the bar and only the picture collapses, so nothing in the top bar
     shifts. Boot it back when the panel closes — that is what `bookShutting` already tracks.
     Timings: outro 190ms, panel in 140ms, panel out 170ms, intro 240ms open + 335ms write.
     ⚠️ integration.audit.mjs:4290 asserts PonderBookButton is mounted in BiohazardTheme. Leave
     that mount alone. ADD a check that pins the icon's rest state (four lines written, clip-path
     reset) and the fact that the bezel does not transform, so a future session cannot put a book
     back or reintroduce a bar-shifting icon.

  3. THE PAD, for the phone. It is width:min(424px,100%), height:min(880px,...) with
     min-height:540px — sized for a desk. Decide what it does under ~380px before writing
     anything, and check the pad's Lite Mode and reduced-motion blocks still cover it.

THE TRAPS — both of these already bit once, in the file you are copying from
  - A collapse beam drawn INSIDE the element that scales gets scaled with it. The tube squeezes
    to scaleY(.045), so a 1px beam inside it becomes 0.045px and never renders. The beam is a
    SIBLING of the tube. Keep it that way.
  - Rest must be exactly where the boot lands. The first version rested on one lit line while the
    boot wrote four, so three lines vanished the instant the animation ended. The write cools to
    the dim burn level and rest shows all four. Do not "tidy" that back to one line.
  - Nothing animates at rest. The icon sits in the top bar on every screen; motion belongs to
    hover, the press, and the handoff only.
  - Lite Mode must reset BOTH transform and clip-path on the glyph, or the icon renders as an
    invisible slit with no lines in it.

VERIFYING MOTION HERE
  The preview pane's animation clock stalls: every animation reports playState "running" with
  currentTime 0, and a correctly applied rule reads as an identity matrix. Pin a keyframe with a
  negative animationDelay plus animationPlayState:'paused' and read getComputedStyle. For a
  transition, set style.transition='none', force `void el.offsetWidth`, then read.

  Step 2 is the only one that touches src/. Run both suites and report the new numbers:
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
