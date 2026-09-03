# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Build the phone tutorial into the app. Every design question is closed — Aldi signed off on
2026-09-03 with "then now we can move on". Nothing below needs a decision from him; it is lifting
finished, verified CSS into React and sizing the pad for a phone.

WHAT HE DECIDED, ALL OF IT
  Icon          the DISPLAY — a bezel with four phosphor lines. "display look the cleanest"
  Icon outro    CRT collapse: the picture squeezes to a scanline, snaps to a point, blinks out
  Icon intro    boot: point opens to a scanline, scanline to the screen, THEN the lines write
  Panel in      SCAN IN — a bright bar crosses the screen and leaves the terminal behind it
  Panel out     DEPLOY's — picture squeezes to a scanline, slab folds to a bar, bar snaps to chip
  Pace          both halves slowed. One multiplier, --t, starting at 1,90x
  Lit colour    the app's amber #F59E0B, not the pad's pale #FFCE8F
  Close control an X on the pad's own status strip. It had none before
  Scope         PHONE ONLY. The PC keeps the book, riffle and all

WHERE THE FINISHED CSS IS — copy it, do not redesign it
  Panel in/out + pace dial   A-Brain/Brainstorm/assets/ponder-panel-arrival.html
                             https://claude.ai/code/artifact/1df504b7-f3d9-412c-ae16-5924ec1cb80c
  Icon intro/outro           A-Brain/Brainstorm/assets/ponder-icon-handoff.html
                             https://claude.ai/code/artifact/d39f91fd-c2b2-4677-acda-3cdaebc2c34b
  The pad itself             A-Brain/Brainstorm/assets/ponder-field-terminal.html
                             https://claude.ai/code/artifact/ad98ec70-ede4-4866-95f6-aa553c9f0ef0
  Write-ups                  A-Brain/Brainstorm/2026-09-03_panel-arrival-animation.md
                             A-Brain/Brainstorm/2026-09-03_tutorial-icon-candidates.md

THE WORK, IN ORDER

  1. THE AMBER, on the pad prototype first so the source of truth is right.
     ponder-field-terminal.html declares
       --lit:#FFCE8F; --lit-dim:rgba(255,206,143,.40); --lit-hot:#FFE7C4;
     becomes
       --lit:#F59E0B; --lit-dim:rgba(245,158,11,.38); --lit-hot:#FFC24D;
     ⚠️ The tokens alone will NOT do it. Grep for raw rgba(255,206,143,...) and
     rgba(255,231,196,...) — @keyframes lampOn, @keyframes segOn and .key.on hardcode those.
     Ink on the latched face stays #2A1A08; measured 7,82:1 on #F59E0B.
     Republish to the SAME artifact (ad98ec70).

  2. THE ICON, into src/ponder/PonderBook.jsx. Replace BookGlyph (starts ~line 186). The chip, its
     label and PonderBookButton's Library wiring at :259 all STAY. The book's
     `visibility: hidden` while `libOpen || bookShutting` becomes the CRT outro — the bezel STAYS
     in the bar and only the picture collapses, so nothing in the top bar shifts. Boot it back
     when the panel closes; `bookShutting` already tracks that moment.

  3. THE PANEL ARRIVAL, phone path only. Scan in on open, Deploy's shut on close, both scaled by
     one --t. Write every duration and stagger as a base value times that variable — that is what
     lets the pace be re-tuned later by changing one number, and it is what keeps a cascade a
     cascade when it is slowed.

  4. THE PAD, sized for a phone. It is width:min(424px,100%), height:min(880px,...) with
     min-height:540px — a desk size. Decide what it does under ~380px before writing anything.

THE TRAPS — every one of these already bit once in the files you are copying from
  - Do not name the pad's display `.tube`. The icon already owns `.tube`, and a bare `.tube{}`
    rule reaches straight inside it. The prototypes call the pad's `.crt` for this reason.
  - A light drawn INSIDE the element that scales or clips gets scaled or clipped with it. The
    scan bar lives in the viewport, not in the pad; the icon's collapse beam is a sibling of its
    picture. Both were invisible until moved.
  - The settle timer must equal the LAST animation's delay plus its duration, not the headline
    figure. Getting it wrong snapped the final entries on. Panel in is 932 ms base.
  - Rest must be exactly where the animation lands, or parts pop out of existence when it ends.
  - Lite Mode and reduced-motion must reset transform AND clip-path, or the panel opens as an
    invisible slit with no words in it.

VERIFYING MOTION HERE
  The preview pane's animation clock stalls: everything reports playState "running" with
  currentTime 0, and a correctly applied rule reads as an identity matrix. Pin a keyframe with a
  negative animationDelay plus animationPlayState:'paused' and read getComputedStyle. For a
  transition, set style.transition='none', force `void el.offsetWidth`, then read.
  Screenshots taken after SCROLLING the pane come back black — emulate a taller viewport with
  resize_window and shoot at scrollY 0 instead. Escape non-ASCII in anything served locally; the
  theme-lab server sends no charset.

  Steps 2-4 touch src/. Add checks that pin the icon's rest state, the panel's staging order and
  the fact that the pace is one variable, then run both suites and report the new numbers:
      npm run build; node src/config/integration.audit.mjs
      node src/config/logicFixes.selfcheck.mjs
  Baseline is 714/714 and 1000/1000.

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
