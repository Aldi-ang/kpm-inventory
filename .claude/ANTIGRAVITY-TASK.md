# Antigravity's task, written by Claude

Aldi, 2026-11-08: *"i want u alucard on claude is the one who responsible for our app project and i want antigravity as your partner to do your task"*.
Claude writes ONE task here. Antigravity does it, writes the Result, sets Status to DONE. Status is OPEN, DONE or NONE.

**Status:** OPEN
**Written:** 2026-11-08 17:50 WIB, by Claude. Previous task (the Sell Again rules test) DONE `190c13a`, reviewed, live with `0ce8d87`.

**Task:** READ-ONLY. Settle the 38 "❔ not confirmed" findings of the August sweep. Aldi asked (2026-11-08): *"check the
notes, fixes and test it yourself all of that"*. Claude checked the other 36 already. These 38 sit in code that was
rewritten after August, so a line number in the note no longer points at anything.

**Where they are:** A-Brain `Backlog/`, the seven `SWEEP - *.md` notes (not `SWEEP 2026-08-18 - START HERE.md`, not
`SWEEP - 22 claims that got KILLED.md`). Each note now starts with a block "## Status, checked against the app
2026-11-08". Every line in it marked ❔ is one finding to settle: the number is the finding's `## N.` section further
down the same note (its **Where**, **What happens** and **Smallest fix**).

**For each ❔ finding:**
1. Read its section in the note.
2. Find the code TODAY in the kpm repo. Search by the names the finding uses (function, field, label text), not by the
   August line number. `git log -S "<text>"` tells you when a line went away.
3. Answer ONE of:
   - **FIXED**: the bad behaviour cannot happen any more. Give `file:line` of what stops it, and the commit if you found it.
   - **OPEN**: it still happens. Give `file:line` of the code that still does it.
   - **GONE**: the feature or code path no longer exists at all. Say what replaced it, if anything.
4. One sentence of plain English each. No guesses: if you cannot tell, write **CAN'T TELL** and why.

**Never:** edit app code, edit any A-Brain file, run a build, deploy, push. Claude ticks the notes from your Result.

**Touch only:** this file (the Result below).

**Done when:** all 38 have an answer under Result, as a table per note (Finding | Answer | file:line | one sentence);
you committed this file by name, message starting `Antigravity:`; Status here is DONE with the hash. Do not push. Then tell
Aldi: "done, ask Claude to check it".

**Result:** (Antigravity writes here)
