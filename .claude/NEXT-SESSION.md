# The one job - read Antigravity's review of the new Fleet & Roster and fix what is real

The professional Fleet & Roster is LIVE since 2026-11-16 14:51 WIB (62f5615d; build 48c5081e, checks ca4921ca). Aldi, same day: *"u should give another jobs for antigravity until all the usage runout from it so that we can save some quota here"*. Antigravity has a QUEUE in `.claude/ANTIGRAVITY-TASK.md`: Task 1 = review the new Fleet code for bugs (money, stock, trust), Task 2 = the Retur audit, Task 3 = why the demo guide's step 1 ring sits on the dashboard on a PC.

START HERE
1. `git log --oneline origin/phase0-solid-ground..HEAD` and `git log --oneline -8`. Every "Antigravity:" commit: `git show` it - it must touch ONLY `.claude/ANTIGRAVITY-TASK.md`. If it touched anything else, revert that part and tell Aldi.
2. Read Task 1's Result table (worst first). For EACH HIGH and MED row, open the file:line it names and confirm it in today's code before believing it ("one verification pass is evidence, not proof"). Answer each: REAL / NOT REAL (why) in the vault note.
3. Fix only the REAL ones, smallest change, in the files it names (most likely `src/components/LoadSheet.jsx`, `src/FleetCanvasManager.jsx` rosterRow / panel, `src/utils/vanBay.js` soldBks / lastDaySold / suggestBks). Each fix leaves one line in `src/config/logicFixes.selfcheck.mjs` (section "FLEET & ROSTER: THE LEDGER AND THE LOAD SHEET (2026-11-16)"): a regression guard, plus a behaviour check on real numbers if it is a sum.
4. Gates, patch note (en + id, only if people see a change), push, hash to Aldi.
5. If Tasks 2 / 3 are DONE too: same review rule; a Retur hole that is OPEN goes to Aldi as a 🔴 DECIDE (money), never fixed unasked; Task 3's guide fix is small (`src/config/demoMission.js` GUIDE[1] beat 2) - do it, then walk step 1 at 1280 in the lab.
If Task 1 is still OPEN: do not wait, and do not do its review yourself (that is the quota he wants saved). Tell him in one line and stop.

TRAPS
- Money and stock: `handleLoadCanvas` / `handleReturnToWarehouse` in FleetCanvasManager.jsx are the only writers. A finding that wants a new write path is a design change: ask him.
- Self-check line endings: FleetCanvasManager.jsx, theme.css, logicFixes.selfcheck.mjs are CRLF on disk. Multi-line Edit fails; use the scratchpad `rep.mjs <file> <ops>` (//@@FIND / //@@WITH / //@@END) or rewrite it.
- integration.audit G30: nothing after `.kpm-mod {` in theme.css may use box-shadow / filter / blur (the panel's shadow failed it on 2026-11-16).
- Lab (only if a fix is visual): servers demo-emulator, demo-app-emulator (5176), demo-api-emulator (5177); `node tools/demo-reset-emulator.mjs`; invites demo_invites/walker.pc@gmail.com; in A-Brain Raw/2026-11-16-fleet-build: `node clear-pc.mjs` FIRST (a stale sign-in answers 401), then journey-review `walk5176.mjs --pc --gate-only 8`, jp.mjs tap SWITCH / HENDRA, `--gate-only 8` again, `jp.mjs eval talk.js --pc=9557`; shooter `node fs.mjs <pc|phone> <prefix> [--noopen] [--eval=x.js] [--after=y.js]`; pick.js / tab.js (window.__tab) / load.js / motion.js / guide3.js there. Stop the servers before `npm run build`.

NOT SHOT YET (say so if asked): the owner's view with area chips (T2 Hartono), the panel in the dark theme without its shadow.

STILL OWED BY HIM: phone test of the live demo - SWITCH twice -> "fast" or "slow".
