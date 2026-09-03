# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Confirm the riffle removal on screen. The code is committed and every suite is green (718/718
audit, 988/988 selfcheck), but no one has actually watched a ribbon jump yet — the session that
made the change could not start a dev server (flagged unattended, nobody to approve it).

    preview_start "ponder-lab", then
        http://localhost:4190/tools/ponder-lab.html?book

Widen the viewport past 767px (a phone gets the field terminal, not the book). Press a far ribbon
— section 1 to section 17 — and confirm it lands in ONE step, no flip-through. Then press next/prev
between two neighbouring pages and confirm THAT still turns with its 3D fold, at the same speed as
before.

If it looks right: done, nothing else to do on this job.
If it looks wrong: read `pickSection` and `seek` in src/ponder/PonderBook.jsx (grep for
`pickSection`) before changing anything. The mechanism: `pickSection` now calls
`commit(chapterTurn(id))` directly instead of `seek(...)`, bypassing the animated run entirely —
same landing math the `still` (Lite Mode) branch of `seek()` always used.

WHY THE CHECKS ARE TRUSTWORTHY, NOT JUST GREEN — already verified once, no need to redo:
  logicFixes.selfcheck.mjs lost 99 lines (1000 -> 988). Diffed block by block: the five
  landing-correctness checks (chapter opens on its own cards page, left page of the spread, last
  sheet faces a page, no two chapters share a sheet, unknown section falls back) are UNTOUCHED and
  still passing. Only the riffle-arithmetic block (14 checks calling `riffle()`) was replaced, with
  two new checks: riffle is actually gone from pageModel.js, and a neighbour turn still holds
  TURN_FULL_MS. That accounts for the whole 1000 -> 988 - no behavioural guard was quietly dropped.

DO NOT re-argue the riffle decision, and do not touch the phone (PonderPad.jsx) — it has no page
turns at all and is signed off.

Then rewrite .claude/NEXT-SESSION.md with the next single job — pull from the queue below.
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

### 7 Days to Die track — separate, not this repo

Its notes and its own one-job prompt are at `C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md`
and `NEXT-JOB.md`. Nothing there is owed to this repo.

</details>
