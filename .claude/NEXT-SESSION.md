# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Ship the tutorial icon Aldi picked, in the app's amber, and size the tech pad for the phone.
His ask, 2026-09-03: "change the light amber to normal glowy amber that we use on our theme then
integrate it now to the app for phone sizing, but before that i want to see the animation icon for
this panel replacing the book first, make sure its animation looks gamified and cool and of course
looks like this panel".

FIRST — ASK HIM WHICH ICON, AND DO NOT GUESS
  Four candidates are on the bench: https://claude.ai/code/artifact/a60961be-28e2-4887-9129-cf723689d529
  01 The cap (recommended) · 02 The display · 03 The meter · 04 The micropad
  Source: A-Brain/Brainstorm/assets/ponder-icon-bench.html — every candidate's exact CSS is in
  there, already written and already verified on screen, so building the winner is a lift, not a
  design job. Full write-up with costs: A-Brain/Brainstorm/2026-09-03_tutorial-icon-candidates.md
  If he picks 03 (the meter), it shows read-progress at rest, so it has to be WIRED to sections
  actually read or the icon lies. That is a real extra job — say so before starting.

THEN, IN HIS ORDER

  1. THE AMBER. A-Brain/Brainstorm/assets/ponder-field-terminal.html currently declares
       --lit:#FFCE8F; --lit-dim:rgba(255,206,143,.40); --lit-hot:#FFE7C4;
     Swap to the app's own amber, src/styles/theme.css --amber:#F59E0B:
       --lit:#F59E0B; --lit-dim:rgba(245,158,11,.38); --lit-hot:#FFC24D;
     Grep the pad for raw rgba(255,206,143,...) and rgba(255,231,196,...) too — the lamp bloom,
     the segment energise and the key glow all hardcode those, so the tokens alone will not do it.
     Ink on the latched face stays #2A1A08 — measured 7,82:1 on #F59E0B, it holds.
     Republish to the SAME artifact: https://claude.ai/code/artifact/ad98ec70-ede4-4866-95f6-aa553c9f0ef0

  2. THE ICON, into the app. Replace BookGlyph in src/ponder/PonderBook.jsx (it starts around
     line 186; PonderBookButton at :259 renders it inside a kpm-chip). The chip, its label and its
     flight-to-the-Library behaviour all STAY — only the glyph changes.
     ⚠️ integration.audit.mjs:4290 asserts PonderBookButton is mounted in BiohazardTheme. Leave
     that mount alone. Add a check that pins the new glyph's idle state and its press, so a future
     session cannot silently put a book back.

  3. THE PAD, for the phone. It is 424px wide and 880px tall with min-height 540px, sized for a
     desk. Decide what it does under ~380px before writing anything, and check the pad's own Lite
     Mode and reduced-motion blocks still cover whatever you add.

THE TRAPS
  - Idle does not animate. Whatever he picked sits in the top bar on every screen; motion belongs
    on hover and on the press only. He called a resting animation "norak" on 2026-09-03.
  - The bench escapes every non-ASCII character on purpose (— in JS, &mdash; in markup). The
    local theme-lab server sends no charset, so raw em-dashes render as mojibake there while
    looking fine in the artifact. Keep the escapes.
  - The preview pane's animation clock stalls: every animation reports playState "running" with
    currentTime 0 and a correctly applied rule reads as an identity matrix. To verify a keyframe,
    pin it with a negative animationDelay plus animationPlayState:'paused' and screenshot that.
    To verify a transition, set style.transition='none', force `void el.offsetWidth`, then read
    getComputedStyle.
  - Serving it to look at: copy into the gitignored dist/ of kpm-inventory, preview_start the
    "theme-lab" server, open http://localhost:4180/<file>.html, delete the copy when done.

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
