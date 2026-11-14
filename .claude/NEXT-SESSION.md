# The one job

Test Journey Plan on the BIG demo company in the Android emulator (notch included), then send him frames, not a test list. Aldi, 2026-11-14: "all this test could be done in android since they both share the same ui as long as their resolution fir the iphone and android it should be fine, dont forget that some phone have notch as well like iphone". Why the big company: "u could simulate as its a big company having a lot of sales and revenue to view".

FIRST - his "yes" (2026-11-14 17:40) to "Should the live demo's nightly reset build the big company?" The yes came with my promise to walk the tutorial first:
1. Walk the capybara tutorial on the big company in the demo app on the emulator (HOW TO OPEN IT below): the 8 steps of src/config/demoMission.js STEPS - T2 goods in, T2 sends to the regional warehouse, T4 loads Dika's bag, T6 sells, T6 retur, T6 EOD, T2 approves the EOD, T2 counts the Master Vault. The lists grew: 8 HQ vans in the bay, Dika's 29 shops, 100 EOD reports in 7 days, 25 roster cards. DemoMission scrolls its target into view (DemoMission.jsx:182) - check every ring still lands. A step that breaks: fix it before the switch.
2. Then flip: api/demo-reset.js `big = process.env.DEMO_SIZE === 'big'` -> `big = process.env.DEMO_SIZE !== 'small'` (+ its header words); tools/demo-reset-emulator.mjs `--big` -> `--small` and built `{ big: process.env.DEMO_SIZE !== 'small' }`; the logicFixes check "the live switch" (regex + words); one patch note, en + id, like the "Demo: ..." lines at src/config/patchNotes.js:46-53. Gates, push. It goes live at the next 00:05 WIB reset - a production write on the demo project, covered by his yes.
3. Then the job below, on the same lab.

THE BIG COMPANY (kpm 2a02b48d, pushed, OFF on the live demo):
- api/_demoCompany.js: buildDemoCompany(seed, now, vault, { big: true }) - constants BIG, AREAS, BIG_STAFF, WRITE_BUDGET; bigShops, bigProfile; faces api/_demoFaces.js faceFor.
- 25 people (owner, the 5 logins, 3 practice staff, 16 BIG_STAFF demo-agent-8..23); 20 salesmen in his 2 teams over 3 areas (Kab. Magelang = HQ; Kab. Bandung + Bandung Barat; Kota Bandung + Cimahi); 600 shops (148 real + demo-shop-001..452, each 60-300 m from a real shop of its kecamatan); 1,540 single sales over the last week's work days + today; 6 months of month tallies (sales_stats), Rp 12,36 miliar of sales to shops; 2,841 docs of the 7,500 budget.
- Checks: logicFixes "THE BIG DEMO COMPANY" (10). Small company byte-identical to before.
- Known gap, part of his question: only Product Performance (Reports, T1/T2) reads the month tallies. The Reports archive ("Pull archive") and Day Replay read single sales, so they reach back 1 week in the big company (4 weeks in the small one). Four weeks in full = ~7,500 docs, at the budget.

HOW TO OPEN IT (the lab) - steps 3-4 NOT YET TRIED on the big company; the first open is part of this job:
1. preview_start "demo-emulator" (Firebase auth + firestore emulators, the real rules, project kpm-demo-f4d74).
2. `node tools/demo-reset-emulator.mjs --big` (34 checks, ~7 s; leaves the big company in the emulator).
3. preview_start "demo-api-emulator" (port 5177, the sign-in switch) and "demo-app-emulator" (the demo app on the emulator). Sign-in goes through the demo's invite gate; his Gmail is T1 (needs no invite). On the emulator a Google sign-in is the Auth emulator's own fake account page (local only).
4. Android (A-Brain Wiki/Concepts/Looking at the App.md, "A REAL Android phone"): `adb reverse` every port the app calls - the app's port, 5177, 8080 (firestore), 9099 (auth). Phone sizes: `adb shell wm size WxH` + `wm density D` (iPhone 13 = 1170x2532 at 460). Notch: `adb shell cmd overlay enable com.android.internal.display.cutout.emulation.tall` (or .corner / .double / .hole); content must stay inside env(safe-area-inset-*).
5. Stop the preview servers (preview_stop) before any `npm run build`.

THEN (his order):
1. The Q2 mark looks round (he said "sure"): A-Brain Raw/2026-11-14-day-replay-mark/ (shooter + the board he answered); DayReplay.jsx:217-220 sets `picked`; expedition.css has no `.picked` rule since 7a3dc370.
2. Ask him whether anything else keeps Journey Plan from looking its best. Then Fleet & Roster (graphify: src/FleetCanvasManager.jsx - confirm the screen).
3. Last (his split): the capybara tutorial + the demo door on the newest app, once the redesigns are done.

Antigravity: the Retur audit task (.claude/ANTIGRAVITY-TASK.md) is OPEN, waiting for him to run it.

TRAPS
- Before any push: `git log origin/phase0-solid-ground..HEAD`; an `Antigravity:` commit gets `git show` + the gates re-run, or the push waits.
- LIKELY, not checked: the Command Center (DashboardView periodWindow over the 7-day transactions listener, useDatabaseSync.js:88) shows at most 7 days in its month figure in ANY company - not a big-demo bug; check before naming it, ask before touching.
- A ` D <file>` in git status can be a finished job's deletion that was never committed: grep the self-checks for the name before bringing it back.
- The lab server on localhost listens on IPv6 only; the emulator needs launch.json "ponder-lab-built-ipv4" + `adb reverse tcp:4187 tcp:4188`.
- .claude/launch.json and graphify-out/ were already modified before 2026-11-14 16:43 - not this job's; never commit them with it.

KEEP THIS FILE UNDER 7,000 CHARACTERS - ONE job. When a job is done, move its text to the top of NEXT-SESSION-archive.md and write the next one here.
