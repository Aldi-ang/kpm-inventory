# The one job - build what Aldi keeps from the Journey review board, then Fleet & Roster

Board sent 2026-11-15 14:45: A-Brain `Raw/2026-11-15-journey-review/board.png` (spec board.json). Vault: Brainstorm/2026-11-15_journey-plan-big-company-test.md, section "BOARD 2026-11-15 14:45". The Q2 mark is DONE and LIVE (745d9cc7). Finished jobs are in NEXT-SESSION-archive.md.

FIRST - his strikes. He was asked to strike what he does not want; the rest gets built:
1. Chips: first name when two men share initials (BS x2 -> BAGUS / BUDI, DS x3 -> DADANG / DEDE / DIKA).
2. Team header "228/588 shops" -> "228/588 sold" (264 visited, 228 of them bought). The only PC change.
3. Phone: a search key beside "ALL" opens the fold with the shop box focused.
4. Phone: three tiles -> one line "20 salesmen out · 0 overdue"; map 40 px higher (407 -> 367 at 390).
S. Salesman (T5/T6 with a round today): that line is his own - "YOUR NEXT SHOP <name> · 0,6 KM".
a. Speed: reuse the shop icons (0.32 s of the 1.8-2.2 s open). No look change.
b. Demo: move the capybara bubble off the full map's Exit corner (Android).
No answer in his reply -> ask once, then build all of them.

THE CODE: every proposal is parked in kpm `git stash` "journey-review trial 2026-11-15" (stash@{0} at 14:45; check `git stash list`), touching src/JourneyView.jsx (h2 + search key ~1160, the one line ~1172, the fold margin ~1185), src/components/Expedition.jsx (chips `t.tag || t.ini` x2, the map tag, the Team header word), src/utils/expedition.js (`tag` at the end of expedition()), src/styles/expedition.css ("TRIAL 2026-11-15" block after `.kx-feed { background: none ...`).
- `git stash apply` it, then `sed -i 's/\r$//'` on those 4 files (a stash in kpm writes CRLF - lessons 2026-11-02) and `file` must not say CRLF.
- Drop the struck parts. Replace every "TRIAL 2026-11-15" comment with a real one quoting his pick.
- Finish what the trial left rough: (i) the closed fold still adds 10 px (band 34, not 24): measure the grid at 390 closed and find why; (ii) the search key focuses through querySelector + setTimeout 220 - use a ref; (iii) `tag` clashes again when two men share a FIRST name too - add the second name's first letter (BUDI S); move `tag` into a small exported fn so a check can feed it names; (iv) chip widths at 360 px with "DADANG 12/30".
- One check per kept part in src/config/logicFixes.selfcheck.mjs: the tag fn on real names (Budi Santoso / Bagus Setiawan / Budi Setiawan), "sold" in Expedition.jsx, the key's onClick opens the fold, the one line + its salesman branch.
- Patch note (en + id), gates, push, frames at 390 + 1280 shot AFTER the build, his phone test list.

THEN (his order): Fleet & Roster (src/FleetCanvasManager.jsx); last: the capybara tutorial + the demo door on the newest app.

STILL OWED BY HIM: his phone test of the live demo after 00:05 WIB 2026-11-16 - press SWITCH twice -> "fast" or "slow". "slow" -> E (vault gate 23.5 s on a first visit, App.jsx ~1369, LIKELY the phone's cache saving ~3,000 docs) comes before everything. DEMO_SIZE=small on the demo's Vercel project undoes the big company without code.
OPEN (not this job): step 8 "Count this one again" (StockOpnameView ~1855) - the guide does not say a count that differs must be typed twice.

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

Antigravity: the Retur audit task (.claude/ANTIGRAVITY-TASK.md) is OPEN, waiting for him to run it.

KEEP THIS FILE UNDER 7,000 CHARACTERS - one job; move finished jobs to the top of NEXT-SESSION-archive.md.
