# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Remove the riffle from the PC book. Pressing a ribbon must land on that chapter immediately
instead of turning N pages on the way there. This is Aldi's decision from 2026-09-02, not a
proposal — do not re-argue it. The page turn itself STAYS: moving between two neighbouring
sheets keeps its 3D fold and its TURN_FULL_MS duration. Only the multi-page run dies.

WHERE IT IS
  src/ponder/PonderBook.jsx:763 — `rateRef.current = riffle(posRef.current, t).ms`
  This line is inside `pickSection`, which today does not set a position at all: it starts a
  run and lets the animation loop walk there. Jumping from section 1 to section 17 turns
  sixteen sheets, roughly 700ms before the answer is on screen.
  src/ponder/pageModel.js:87 — `riffle()` itself, which plans how many sheets to turn and how
  fast each one goes.

WHAT THE FIX IS
  `pickSection` should seek: set the position to the target sheet directly, no run. A
  single-sheet move (next / prev) must still go through the normal turn and still take
  TURN_FULL_MS. Remove only what your change orphans.

THE TRAP — read this before you delete anything
  `riffle()` is pinned by checks that go red the instant it disappears, and deleting those
  checks to make the suite pass is the wrong fix.
    src/config/integration.audit.mjs:4766 asserts that literal line exists; its reason is at 4771.
    src/config/logicFixes.selfcheck.mjs:15 imports `riffle, TURN_FULL_MS, RIFFLE_MIN_MS`, and
    roughly lines 4156-4220 are a block of riffle arithmetic checks.
  Every one of those must be REPLACED by a check that pins the NEW behaviour — pickSection
  seeks directly, no run is started, a single-sheet move still takes TURN_FULL_MS — never
  simply removed. A check that no longer exists cannot tell you the riffle came back.

WHEN YOU ARE DONE
  Both totals change once checks are swapped. Run them and report the new numbers before you
  commit; do not carry the old 714/1000 forward.
    npm run build; node src/config/integration.audit.mjs

Then rewrite .claude/NEXT-SESSION.md with the next single job.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Queued 1 — does the pad follow the app's light mode?

The Ponder tech pad is dark only, and the locked palette has no light values for it. Asked twice,
still not answered. Ask him before building anything: does the pad get a light material of its own
(the anodised-faceplate route the sidebar took), or does it stay dark in both themes on purpose?

### Queued 2 — the tech pad's active key-cap dot, if he wants it brighter

Shipped as a dense rust core (`#6B2800`) inside a bright cream socket ring, which reads as a lit
lamp against the gold cap. It follows his rule that a lamp on a pale plate goes darker and denser,
not brighter. If he says it still reads dead, the alternative is a cream-white core with a dark
bezel — brighter, but it breaks that rule, so it needs his word first.

</details>
