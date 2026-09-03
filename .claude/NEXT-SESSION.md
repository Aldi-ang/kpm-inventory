# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Remove the riffle from the Ponder book. Aldi's decision, 2026-09-02: pressing a ribbon must jump
STRAIGHT to that chapter instead of flipping through every page between here and there. Already
decided — do not re-argue it.

WHAT THE CODE DOES TODAY (verified 2026-09-03, every line below still reads as quoted)
  `pickSection` in src/ponder/PonderBook.jsx does not set a position. It starts a RUN, and the
  run's speed comes from riffle():
      src/ponder/PonderBook.jsx:763   rateRef.current = riffle(posRef.current, t).ms;
      src/ponder/pageModel.js:87      export const riffle = (from, to) => {
  So jumping from section 1 to section 17 turns sixteen sheets, about 700ms of flipping before the
  reader sees the answer they clicked for.

WHAT STAYS
  The page turn itself. Next/prev between two NEIGHBOURING sheets keeps its 3D fold and its
  TURN_FULL_MS timing. Only the multi-page flip-through goes. A ribbon press should land on the
  target page directly.

THE TRAP — THIS IS THE WHOLE JOB, NOT THE EDIT
  riffle() is pinned by checks that go red the moment it is deleted. Deleting those checks to make
  the suite pass is the wrong fix and it destroys the only thing that could tell you the riffle
  came back later.
      src/config/integration.audit.mjs:4766  asserts that exact line 763 exists;
                                             its reason string is at :4771
      src/config/logicFixes.selfcheck.mjs:15 imports riffle, TURN_FULL_MS, RIFFLE_MIN_MS
                                             (16 riffle/RIFFLE references in that file)
  Every one of those must be REPLACED by a check that pins the NEW behaviour — a ribbon press
  lands on the target page in one step, and a neighbour turn still takes TURN_FULL_MS. Never
  removed.

  Both suite totals change when checks are swapped. Run them, and report the new numbers in the
  commit before claiming done:
      npm run build; node src/config/integration.audit.mjs
      node src/config/logicFixes.selfcheck.mjs
  Current baseline is 714/714 audit and 1000/1000 selfcheck.

VERIFY IT ON SCREEN, NOT ONLY IN THE SUITE
  A green suite proves the checks were rewritten, not that the book jumps. Open the app, press a
  far ribbon, and confirm one landing instead of a flip-through. If the preview pane's animation
  clock stalls (it reports playState "running" with currentTime 0 and never advances), read the
  DECLARED value instead: set the transition to 'none', force a reflow with `void el.offsetWidth`,
  then getComputedStyle. That is clock-independent.

Then rewrite .claude/NEXT-SESSION.md with the next single job.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Queued 1 — does the tech pad follow the app's light mode?

The pad is dark only; the locked palette has no light values for it. Asked twice, never answered.
Ask before building: does the pad get a light material of its own (the anodised-faceplate route
the sidebar took), or stay dark in both themes on purpose?

</details>
