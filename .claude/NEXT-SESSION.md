# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Remove the zoom from the Ponder tech pad's panel intro and outro. Aldi, 2026-09-03: "i like the
design but remove the zoom out and zoom in for intro and outro of that text too much animation
make it norak and not elegant". "Norak" is Indonesian for tacky / overdone. This is his decision,
already diagnosed — do not re-argue it and do not re-diagnose it.

WHY IT READS AS TOO MUCH (already worked out, just apply it)
  There are currently TWO entrance animations playing over each other. The panel flies in from
  depth AND the text writes itself on with a raster sweep. The write-on is the one he likes and
  the one that should carry the intro on its own. The panel's flight is the part to delete.

THE FILE
  A-Brain/Brainstorm/assets/ponder-field-terminal.html
  Published at https://claude.ai/code/artifact/ad98ec70-ede4-4866-95f6-aa553c9f0ef0
  Republish to that SAME artifact — same file path in the session keeps the URL. Do not create a
  second artifact. Change no KPM app code.

THE EDIT
  1. @keyframes panelOut and @keyframes panelIn currently carry translateZ, translateY, rotateX,
     scale AND filter:blur. Strip every one of them. Each keyframe set becomes opacity only:
       @keyframes panelOut{ from{opacity:1} to{opacity:0} }
       @keyframes panelIn { from{opacity:0} to{opacity:1} }
  2. The two rules underneath them:
       .panel.out{animation:panelOut .30s cubic-bezier(.32,.06,.55,1) forwards}
       .panel.in {animation:panelIn  .46s cubic-bezier(.25,.46,.45,.94) forwards}
     become a short crossfade — .17s out, .14s in, both var(--ease-out), keep `forwards`. Exit
     faster than enter.
  3. In the script: `var OUT_MS=300, IN_MS=460;` becomes `var OUT_MS=170, IN_MS=140;`. These MUST
     match the CSS durations — OUT_MS is how long the code waits before swapping the content, so
     if it is longer than the fade the panel sits blank, and if shorter the swap is visible.
  4. `.panel{ ... will-change:opacity, transform }` becomes `will-change:opacity`.
  5. The long comment above @keyframes panelOut documents the depth flight and quotes a measured
     "scale .961 of 1.0" figure. After this edit that comment describes code that no longer
     exists. Replace it with two lines saying the panel now only crossfades and the text write-on
     is the intro, and why.

THE TRAPS
  - He LIKES the text animation. Do NOT touch lineIn, lineInLit, the --i stagger, titleIn or
    decode(). Only the panel's own flight goes.
  - Do not also strip .stage{perspective:820px} or .panel's positioning. Remove only what your
    change orphans.
  - Lite Mode and the reduced-motion block still name `transform:none` and `filter:none` on
    .panel.in/.panel.out. Those become no-ops rather than errors — leave them, they cost nothing
    and they keep the rule correct if depth ever returns.
  - Lite Mode must still show every word. The text reveal fills `backwards`, so Lite has to reset
    clip-path as well as animation, or every text block stays clipped to zero width and the words
    vanish. That is already correct in the file — just do not break it.

VERIFY BEFORE CLAIMING (the pane lies about animation, read this)
  The preview pane's document timeline stalls. Every animation then reports playState "running"
  with currentTime 0, transitions report their START value forever, and requestAnimationFrame
  never fires — while visibilityState still says "visible". A correctly applied rule reads as an
  identity matrix. This has cost two wrong conclusions already.
    - For a transition: set style.transition='none', then `void el.offsetWidth`, then
      getComputedStyle. That is the declared value and needs no clock.
    - For a keyframe: pin it with a negative animationDelay plus animationPlayState:'paused' and
      screenshot that — a static computed position.
  What to confirm: the panel's computed transform stays `none` at every pinned offset of both
  panelIn and panelOut, and filter stays `none`. Then take a frame and look at it.

  Serve it to look at: copy the html into the gitignored dist/ of kpm-inventory, preview_start the
  existing "theme-lab" server, and open http://localhost:4180/ponder-pad.html. The artifact URL
  will not open in the in-app browser and a local file:// URL loads as a script-less snapshot.
  Delete the dist/ copy when done.

Then rewrite .claude/NEXT-SESSION.md with the next single job.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Queued 1 — remove the riffle from the PC book (his decision, 2026-09-02)

Pressing a ribbon must jump straight to that chapter instead of turning N pages. The page turn
itself stays: next/prev between two neighbouring sheets keeps its 3D fold and `TURN_FULL_MS`.

- `pickSection` in `src/ponder/PonderBook.jsx` does not set a position, it starts a run.
  Line 763 is `rateRef.current = riffle(posRef.current, t).ms`; `riffle()` lives at
  `src/ponder/pageModel.js:87`. Section 1 → 17 turns sixteen pages, ~700ms before the answer.
- **THE TRAP:** `riffle()` is pinned by checks that go red the moment it is deleted, and deleting
  those checks to make them pass is the wrong fix.
  `src/config/integration.audit.mjs:4766` asserts the literal line exists, reason at 4771.
  `src/config/logicFixes.selfcheck.mjs:15` imports `riffle, TURN_FULL_MS, RIFFLE_MIN_MS`, and
  ~4156-4220 is a block of riffle arithmetic checks. Every one must be REPLACED by a check that
  pins the new behaviour — never removed. A check that no longer exists cannot tell you the
  riffle came back.
- Both counts change when checks are swapped. Report the new totals before committing.

### Queued 2 — does the pad follow the app's light mode?

The pad is dark only; the locked palette has no light values for it. Asked twice, never answered.
Ask before building: does the pad get a light material of its own (the anodised-faceplate route
the sidebar took), or stay dark in both themes on purpose?

</details>
