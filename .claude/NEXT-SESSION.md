# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Give the field terminal a light-mode material — or confirm on the record that it stays dark in
both themes. Ask Aldi FIRST; this job has a question in front of it and building the wrong branch
wastes the whole session.

THE QUESTION, in his words to ask:
    The phone's tutorial screen (the "field terminal" — the dark instrument panel with the
    display, the section rail on the right and the read-meter on the left) is dark no matter
    which theme the app is in. On the desk the sidebar took the anodised-faceplate route when
    the app went light. Two choices:
      (a) the terminal gets a light material of its own — a pale milled faceplate, same shapes,
          same amber lamps, lighter housing and darker ink;
      (b) the terminal stays dark in both themes on purpose, because an instrument panel reads
          as an instrument panel precisely by being darker than the app around it.
    Which one?

He has been asked this twice and has not answered, so do NOT assume (a) is wanted just because
it is more work. If he answers (b), the job is three lines of comment in `src/ponder/pad.css`
saying it is deliberate plus one audit check pinning it, and then you are done.

IF HE PICKS (a) — where the work goes:
  Every token is already in ONE place: the `:root` block at the top of `src/ponder/pad.css`
  (lines 22-44 of 476). Fourteen variables — `--pp-housing-top/hi/lo`, `--pp-display`,
  `--pp-ink`, `--pp-dim`, `--pp-dimmer`, `--pp-foil`, `--pp-lit*`, `--pp-hair`, `--pp-hair-2`.
  A light set is a second block that redefines those same names under the app's light selector,
  NOT a sweep through 476 lines of rules. Find the selector the rest of the app already uses for
  light and reuse it — do not invent a new one, and do not touch `--pp-t` (the pace dial, 2.5,
  which the integration audit pins against `PACE` in PonderPad.jsx).

THREE TRAPS THAT MAKE A LAZY PATCH WRONG:
  1. PALETTE LAW. No blue, no green. `slate-*` IS the blue. Gold/amber must NEVER be text on a
     light background — `--pp-lit` (#F59E0B) is a LAMP colour, and on a pale faceplate it fails
     contrast as ink. `--pp-lit-ink` (#2A1A08) exists for exactly this and measures 7,82:1 on
     the amber; the light branch needs its own equivalent pair, measured, not guessed.
  2. LITE MODE IS PERFORMANCE, NOT A WHITE THEME. `html.lite-mode` at lines 373-380 kills
     animation only. Do not hang the light palette off `lite-mode` — they are unrelated, and
     wiring them together is the exact mistake the memory law was written to stop.
  3. THE GLYPH IS OUTSIDE THE PORTAL. The comment at line 20 says tokens live on `:root` and
     not on `.pp-root` because the top-bar glyph uses them too. Scope the light block the same
     way or the glyph keeps its dark housing while the pad goes pale.

DONE WHEN: the pad renders in both themes with no token left dark-only; contrast measured on
ink-over-housing and on any latched key; a check in src/config/logicFixes.selfcheck.mjs that
fails if a `--pp-` token gains a light value the dark block does not also define.

VERIFY ON SCREEN, and know the trap that cost this session an hour: the in-app Browser pane does
NOT composite — requestAnimationFrame fires ZERO times in it even when the pane is fronted and
visibilityState says "visible", and `agent-browser` hangs for the full 1800s timeout, twice now.
Do not use it. Screenshots from the pane DO work, and so does reading computed styles and
`document.getAnimations()`. For a still frame, headless Chrome is the path:
`A-Brain/Wiki/Concepts/Looking at the App.md`.

    preview_start "ponder-lab", then
        http://localhost:4190/tools/ponder-lab.html
    Narrow the viewport BELOW 767px — the pad is phone-only; a wide viewport gets the book.

Then rewrite .claude/NEXT-SESSION.md with the next single job — pull from the queue below.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Queued 1 — should the display icon replace the book icon on the desk too?

Shipped 2026-09-03 as: display glyph on a phone, book glyph on anything wider, because the icon
should look like what it opens. That was my call, not his. If he wants one icon everywhere, it is
one line in `PonderBookButton` — but then the desk's book opens from a screen, which is the
mismatch the split exists to avoid.

### 7 Days to Die track — separate, not this repo

Its notes and its own one-job prompt are at `C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md`
and `NEXT-JOB.md`. Nothing there is owed to this repo.

</details>
