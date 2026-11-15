# The one job - Fleet & Roster: review it as every user, one board (today vs proposed), build what he keeps

Journey Plan is done: the Q2 mark (745d9cc7) and all seven review picks (8b3130b2) are LIVE, his "i think everything is fine u may continue" (2026-11-15). Finished jobs are in NEXT-SESSION-archive.md. His order after this: the capybara tutorial + the demo door on the newest app.

WHAT: his order 2026-11-15 ("Journey Plan looks its best first, then Fleet & Roster"; "whatever the order as long as all done, efficiently and effectively"). Do for Fleet & Roster (src/FleetCanvasManager.jsx - confirm with `graphify query "Fleet Roster"`) exactly what worked for Journey Plan today:
1. Load the design stack (Alucard 1a) and, FIRST, A-Brain Wiki/Concepts/Aldi's Design Taste.md section "Fleet & Roster: the logic he wants changed is the van-loading flow; segment or panel is a talk, not a guess (2026-09-22, 15:05)" (line ~2714; grep it, never read the file whole). Also Wiki/Entities/Fleet Captain Permission Gap.md if a tier check is involved.
2. Use it as every user on the big demo company in the lab: owner (HARTONO, T2), regional admin (HENDRA, T4), salesman (DIKA, T6) at 390 and 1280. Measure what costs time (taps, scrolls, numbers that disagree, words that mean two things). Write the findings table into a NEW A-Brain Brainstorm note (PROBLEM in his words, OPTIONS, COSTS, DECISION OPEN, REJECTED ON PURPOSE, Models applied).
3. Trial the fixes in the working tree, shoot TODAY vs PROPOSED with shoot.mjs-style frames (copy and adapt A-Brain Raw/2026-11-15-journey-review/shoot.mjs: it opens Journey Plan - change the data-mark to Fleet's), compose with board.mjs, read the board back BEFORE sending (today's lesson: the first Team-box frame hid the very defect), `git stash push` the trial by file name, send the board, ask him to strike.
   DONE 2026-11-15 16:40: steps 1-3. Findings: A-Brain Brainstorm/2026-11-15_fleet-roster-review.md. Board SENT: Raw/2026-11-15-fleet-review/board.png (sections 1-4). Trial parked: `git stash list` -> "fleet-review trial 2026-11-15" (FleetCanvasManager.jsx: T4 crown + rank, narrowStage swipe row with a matchMedia listener, 2 community tiles, OFFERS icon-only < sm, title tracking, "Active Load" only when unit is not Bks; LoadingBay.jsx: phone glide to the van after tap 1, manRef + IntersectionObserver jump bar; theme.css .kpm-bay-jump). His strikes owed.
   17:40 HE REFUSED ALL FOUR ("its all gamified ... create a new professional one"). New direction drawn: A-Brain Raw/2026-11-15-fleet-review/pro.html + pro-board.png (ruled roster table, load sheet with − n +, Fill suggested, one Load van button; brainstorm "Round 2"). 17:56 he asked for options as an artifact: https://claude.ai/artifact/7fzwdpnKC3dcAksJqyvTEi (source Raw/2026-11-15-fleet-review/fleet-options.html; team list A/B/C, loading 1/2/3, PC layout X/Y/Z). NEXT = his picks + the suggested-load rule, then build it as the professional Fleet & Roster (keep every chest feature as a plain control: preset, copy, return, damaged, consignment, geofence, Surat Jalan, Reconcile). Step 4 below only if he revives a fix.
4. Build what he keeps: `git stash pop`, then strip CR (`sed -i 's/\r$//'` on the 3 files - stash pop writes CRLF here), drop the struck parts, a check each in src/config/logicFixes.selfcheck.mjs, patch note (en + id), gates, push, after-frames (lab: Raw/2026-11-15-fleet-review/fs.mjs + tap1.js/tap2.js/jump.js/where.js/title.js).

STILL OWED BY HIM: his phone test of the live demo after 00:05 WIB 2026-11-16 - press SWITCH twice -> "fast" or "slow". "slow" -> E (vault gate 23.5 s on a first visit, App.jsx ~1369, LIKELY the phone's cache saving ~3,000 docs) comes before everything. DEMO_SIZE=small on the demo's Vercel project undoes the big company without code.
OPEN (not this job): step 8 "Count this one again" (StockOpnameView ~1855) - the guide does not say a count that differs must be typed twice. Journey speed on the PHONE production build was not re-timed after 8b3130b2 (setIcon 354 ms -> 2 ms was the PC dev server).

THE LAB (worked 2026-11-15 14:20-14:45, PC only, no Android emulator needed for frames):
1. preview_start "demo-emulator", "demo-app-emulator" (5176), "demo-api-emulator" (5177); `node tools/demo-reset-emulator.mjs` (big, 34/34); invites: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 + firebase-admin, projectId kpm-demo-f4d74, demo_invites/walker@gmail.com and walker.pc@gmail.com.
2. In A-Brain Raw/2026-11-15-journey-review: `node walk5176.mjs --pc --gate-only 30` signs a headless PC Chrome in on CDP 9557 (profile prof-pc). Then `node jp.mjs tap '[data-mission="switch"]' --pc=9557`, `node jp.mjs tap 'text=HARTONO' --pc=9557` (T2 owner; DIKA = T6 salesman), `node jp.mjs tap 'text=UNLOCK SYSTEM' --pc=9557`, `node walk5176.mjs --pc --gate-only 6` (vault ~8.7 s), `node jp.mjs eval talk.js --pc=9557` clears the capybara welcome.
3. `node shoot.mjs <phone|pc|p412> <prefix> [--find] [--chips=3]` = frames + one JSON line of numbers (fold shut on the phone, a pressed man let go). `node q2.mjs <390|412> <prefix> [--low]` = Day Replay with a pressed shop. `node board.mjs board.json board.png`.
4. Stop the preview servers before any build; kill the lab Chrome: powershell Get-CimInstance Win32_Process, CommandLine like '*journey-review*'.


TRAPS
- jp.mjs eval runs the file as a function BODY: start it with `return`.
- A pressed chip pressed again lets go of the man (the Replay key goes): q2.mjs presses only when the key is missing.
- A page first laid out at 1280 keeps the phone fold OPEN when the metrics go to 390 (useState reads innerWidth once): shoot.mjs shuts it.
- A two-step CSS edit can leave Vite's hot reload broken for the page; if a rule seems ignored, read the matching rules in the page (rules.js) before blaming the cache.
- theme.css `button:has(> svg:only-child)` beats a one-class `display` rule on an icon-only button (facts file).
- Before any push: `git log origin/phase0-solid-ground..HEAD`; an `Antigravity:` commit gets `git show` + the gates re-run, or the push waits.
- .claude/launch.json, graphify-out/ and .claude/skills/alucard/lessons.md were modified before this job - never commit them with it.


- Lab tools also in that folder now: seticon.js + seticon-read.js (count setIcon per open), open-journey.js / away.js (open and leave a screen by its data-mark), shoot.mjs --capy (full map + capybara).
- The Android phone keeps its lab sign-in across emulator runs, but a fresh auth emulator does not know it: SWITCH then fails with "demo sign-in refused 401". Run `node onetab.mjs` (closes the hidden 2nd tab) and `node clear.mjs` (wipes localhost:5176's site data), then `node walk5176.mjs --tier=T6 --gate-only 40` (no --pc = the phone; --tier picks the person at the door). Phone tools: who.js (persona, chips, line, focus, capybara), keyboard = `adb shell dumpsys input_method | grep mInputShown`.

Antigravity: the Retur audit task (.claude/ANTIGRAVITY-TASK.md) is OPEN, waiting for him to run it.

KEEP THIS FILE UNDER 7,000 CHARACTERS - one job; move finished jobs to the top of NEXT-SESSION-archive.md.
