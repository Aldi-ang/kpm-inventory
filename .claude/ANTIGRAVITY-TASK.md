# Antigravity's tasks, written by Claude

Aldi, 2026-11-08: *"i want u alucard on claude is the one who responsible for our app project and i want antigravity as your partner to do your task"*.
Aldi, 2026-11-16: *"u should give another jobs for antigravity until all the usage runout from it so that we can save some quota here"* - so this file is now a QUEUE: do Task 1, commit, then go straight on to Task 2, then Task 3. Do not wait for Claude between them.

**Your jobs are THINKING jobs** (Aldi, 2026-11-10): reading code, audits, reviews. Never a browser, never a click-through.
**Previous task (the 39 Fleet self-checks): DONE, reviewed by Claude 2026-11-16 (commit ca4921ca): count adds up (2981 - 3 merged + 4 new = 2982), no check weakened. Its Result table is in that commit.**

## Rules for every task below
- READ-ONLY on the app: never edit anything in src/, firestore.rules, A-Brain. Never build, deploy, push, or open a browser.
- An answer you did not read in TODAY's code is CAN'T TELL. Every claim carries file:line.
- Touch only THIS file: write the task's Result under it, set its Status to DONE, commit THIS file alone with a message starting "Antigravity:", then start the next task.
- Claude may be committing to the same branch while you work. Before each commit run `git status`; if anything other than this file is staged, unstage it.

---

## Task 1 - review the new Fleet & Roster code for real bugs
**Status:** OPEN

Claude built the professional Fleet & Roster in commit 48c5081e (you rewrote its checks in ca4921ca). It goes live today. Read, as a reviewer looking for bugs that would cost Aldi money, stock or trust:
- `src/components/LoadSheet.jsx` (whole file, ~260 lines) - the sheet that loads and returns stock.
- In `src/FleetCanvasManager.jsx`: `rosterRow`, `pickAgent`, `closePanel`, `soldByAgent`, `lastDay`, `dayStrip`, and the block from `{/* THE PERSON PANEL` to its `</aside>`.
- In `src/utils/vanBay.js`: `soldBks`, `lastDaySold`, `suggestBks`.
- The two writers it calls, unchanged: `handleLoadCanvas`, `handleReturnToWarehouse` in FleetCanvasManager.jsx.

**Check at least these:** a promo item (pcs) loaded or returned - is it ever added into a Bks total? · the − + cap: can a press go above the warehouse stock, or (Return tab) above what the van holds? · a load where one product fails and another succeeds: what stays on the sheet, what the toast says, is anything written twice? · switching from Load to Return tab with numbers on the sheet: can the Load numbers be sent as a return or the other way round? · Fill suggested / Usual load / Copy a teammate with a product the warehouse does not carry, or with 0 stock · a person with no sales before today (lastDay empty) · a typed number with letters, a minus sign, a decimal · `busy` - can a second press of Load van during a slow save send the lines twice? · the Activity tab: a RETUR's total shown with a minus, an exchange, an IOU fulfilment · anything in LoadSheet that re-creates a component per render (the flicker Aldi forbade) · any user-facing English that is unclear or wrong.

**Result:** ONE table: Finding | Who hits it | What goes wrong (money / stock / trust / looks) | file:line | Severity (HIGH / MED / LOW) | Smallest fix in one sentence. Worst first; count per severity on top. If you find nothing in a line of the checklist, say "checked, fine" for it.

**Result:**

---

## Task 2 - the Retur audit (Aldi queued it 2026-11-11; parked twice, now it runs)
**Status:** OPEN

The full task text is in git: run `git show f3ff4b4b:.claude/ANTIGRAVITY-TASK.md` and do the task written there ("Find every way a return (RETUR) could be used for gain"), with its own "Check at least these" list and its own Result format. Write the Result here.

**Result:**

---

## Task 3 - why the demo guide's step 1 points at the wrong place on a PC
**Status:** OPEN

On a PC-size window (1280 x 800), demo guide step 1, beat 2 says "Buka Restock Vault dari menu." but its ring sits at x 14, y 225, size 56 x 56 - on the dashboard, not on a menu key - and pressing there three times does nothing (found by Claude's lab walk 2026-11-16). On the phone the same beat works.

Read `src/config/demoMission.js` (the `nav(...)` helper and GUIDE[1]), `src/components/DemoMission.jsx` (how a beat's `at` selector is resolved to a ring, how `done` is checked) and the PC menu in `src/components/BiohazardTheme.jsx` (where the Restock Vault key is on a wide screen, its `data-mark`, and whether it is hidden or collapsed at 1280 px). Answer: which element the ring is drawn round at 1280 px and why, what the beat should point at instead, and the smallest change (file:line + the new selector) - do NOT make the change.

**Result:**
