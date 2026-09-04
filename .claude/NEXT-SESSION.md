# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Settle the tutorial chip's icon, then make the code match the answer. Ask Aldi FIRST — this is a
one-line change either way, so the decision IS the job and building the wrong branch is pure waste.

THE QUESTION to ask him:
    The button that opens the tutorial (top bar, next to the other chips) currently shows TWO
    different icons depending on the screen. On a phone it shows a display/screen glyph, because
    a phone opens the field terminal — the dark instrument panel. On a laptop or desktop it shows
    a book glyph, because those open the book. The idea was that the icon should look like the
    thing it opens.
    Nobody asked for that split; it was my call on 2026-09-03. Two ways to go:
      (a) keep the split — the icon always matches what will actually open;
      (b) one icon everywhere — the tutorial is one feature and should have one face, even if
          the desk's "book" icon then opens something that is a book anyway.
    Which one?

IF HE PICKS (a) — nothing to build. Say so, and instead spend the session recording WHY, because
right now the reasoning lives only in a commit message. Add a line to
`A-Brain/Wiki/Concepts/Aldi's Design Taste.md` and stop.

IF HE PICKS (b) — where the work is:
  `src/ponder/PonderBook.jsx`, the `PonderBookButton` component (grep for `DisplayGlyph`). The
  ternary reads:
      phone ? <DisplayGlyph away={padOpen} booting={booting} /> : <BookGlyph />
  Collapsing it to one glyph is one line. THEN FIX THE CHECK, do not delete it: the audit check
  'a phone opens the field terminal, anything wider opens the book, and the glyph matches' in
  `src/config/integration.audit.mjs` pins that exact ternary and will go red. It is pinning THREE
  things at once — which panel opens, which component mounts, and which glyph shows. Only the
  glyph clause is now wrong; the other two must stay pinned, because a phone opening the book is
  still a real bug. Rewrite the clause, do not drop the check.

  ⚠️ `DisplayGlyph` takes `away` and `booting` and animates with them (it reacts to the pad
  opening). `BookGlyph` takes nothing. If (b) means the display glyph everywhere, the desk has to
  pass those props too or the icon goes dead on desktop; if it means the book glyph everywhere,
  `DisplayGlyph` becomes orphaned — remove it only if nothing else imports it, and check first.

DONE WHEN: the chip shows what he chose on both widths; the audit check still pins panel choice
and component mount; 719/719 audit and 988/988 selfcheck.

VERIFY ON SCREEN — and know the trap that cost an hour on 2026-09-04:
  preview_start "ponder-lab", then http://localhost:4190/tools/ponder-lab.html?book
  The in-app Browser pane does NOT composite. requestAnimationFrame fires ZERO times in it even
  when the tab is fronted and visibilityState says "visible", and `agent-browser` hangs for the
  full 1800s — twice now, do not try it. What DOES work: screenshots, `read_page`,
  `getComputedStyle`, and `document.getAnimations()` (durations and easings are readable even
  though the timeline never advances; pause an animation and write its currentTime to photograph a
  mid-flight frame). Full write-up: `A-Brain/Wiki/Concepts/Looking at the App.md`.
  Icons are static, so a screenshot at each width settles this one. Below 767px is the phone.

Then rewrite .claude/NEXT-SESSION.md with the next single job — pull from the queue below.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### The queue is empty after the job above.

Both Ponder questions that were open on 2026-09-03 are now closed: the riffle removal was confirmed
on screen on 2026-09-04, and the field terminal was locked to one palette in both themes the same
day (`f748410`). The icon split above is the last one outstanding.

When it is answered, the next job has to come from `A-Brain/Backlog/` — that is the real to-do
list — or from Aldi directly. Do not invent one from a code smell.

### 7 Days to Die track — separate, not this repo

Its notes and its own one-job prompt are at `C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md`
and `NEXT-JOB.md`. Nothing there is owed to this repo.

</details>
