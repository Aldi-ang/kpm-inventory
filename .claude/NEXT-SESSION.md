# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Remove the riffle from the Ponder book. Aldi's decision, 2026-09-02: pressing a ribbon must jump
STRAIGHT to that chapter instead of flipping through every page between here and there. Already
decided — do not re-argue it. This is the PC book only; the phone now opens the field terminal and
has no page turns at all.

WHAT THE CODE DOES TODAY
  `pickSection` in src/ponder/PonderBook.jsx does not set a position. It starts a RUN, and the
  run's speed comes from riffle():
      src/ponder/PonderBook.jsx   rateRef.current = riffle(posRef.current, t).ms;
      src/ponder/pageModel.js:87  export const riffle = (from, to) => {
  Jumping from section 1 to section 17 turns sixteen sheets, about 700ms of flipping before the
  reader sees the answer they clicked for.
  ⚠️ PonderBook.jsx grew by ~100 lines on 2026-09-03 (the phone split), so the line numbers in the
  older notes have moved. Grep for `riffle(` rather than trusting a number.

WHAT STAYS
  The page turn itself. Next/prev between two NEIGHBOURING sheets keeps its 3D fold and its
  TURN_FULL_MS timing. Only the multi-page flip-through goes. A ribbon press should land on the
  target page directly.

THE TRAP — THIS IS THE WHOLE JOB, NOT THE EDIT
  riffle() is pinned by checks that go red the moment it is deleted, and deleting those checks to
  make the suite pass is the wrong fix — it destroys the only thing that could tell you the riffle
  came back later.
      src/config/integration.audit.mjs   asserts that exact rateRef line exists
      src/config/logicFixes.selfcheck.mjs:15  imports riffle, TURN_FULL_MS, RIFFLE_MIN_MS, and
                                              ~12 of its checks are riffle arithmetic
  Every one must be REPLACED by a check that pins the NEW behaviour — a ribbon press lands on the
  target page in one step, and a neighbour turn still takes TURN_FULL_MS. Never removed.

  Both suite totals change when checks are swapped. Run them and report the new numbers in the
  commit before claiming done:
      npm run build; node src/config/integration.audit.mjs
      node src/config/logicFixes.selfcheck.mjs
      node src/config/undef.check.mjs
  Baseline is 718/718 audit and 1000/1000 self-check.

VERIFY IT ON SCREEN, NOT ONLY IN THE SUITE
  A green suite proves the checks were rewritten, not that the book jumps. The harness now has a
  launch entry: preview_start "ponder-lab", then
      http://localhost:4190/tools/ponder-lab.html?book
  It mounts the real top-bar chip inside a real glass strip and opens the book itself. Widen the
  viewport past 767px or you will get the phone's field terminal instead. Press a far ribbon and
  confirm ONE landing rather than a flip-through.

  The preview pane's clock stalls TRANSITIONS at their start value — a correctly applied rule
  reads as unchanged. For a transition, set style.transition='none', force `void el.offsetWidth`,
  then read getComputedStyle. For a keyframe, pin it with a negative animationDelay plus
  animationPlayState:'paused'.

Then rewrite .claude/NEXT-SESSION.md with the next single job.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Queued 1 — does the pad follow the app's light mode?

The field terminal is dark only; the locked palette has no light values for it. Asked twice, never
answered. Ask before building: does the pad get a light material of its own (the anodised-faceplate
route the sidebar took), or stay dark in both themes on purpose? Its tokens are all in one place
now — `:root` at the top of `src/ponder/pad.css` — so a light set is a token block, not a sweep.

### Queued 2 — should the display icon replace the book icon on the desk too?

Shipped 2026-09-03 as: display glyph on a phone, book glyph on anything wider, because the icon
should look like what it opens. That was my call, not his. If he wants one icon everywhere, it is
one line in `PonderBookButton` — but then the desk's book opens from a screen, which is the
mismatch the split exists to avoid.

</details>
