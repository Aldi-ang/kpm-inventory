# The one job

Build a big-company demo for the professional edition, then test Journey Plan on it myself on the Android emulator. Aldi, 2026-11-14 after 15:17: "i rather let u build a demo for the professional one first before testing because u could simulate as its a big company having a lot of sales and revenue to view". No more manual phone tests from him: "all this test could be done in android since they both share the same ui as long as their resolution fir the iphone and android it should be fine, dont forget that some phone have notch as well like iphone".

SIZE: accepted - 20 salesmen in 3 areas, 600 shops, the last 7 days in full (~1,800 sales + visit reports), 6 months as totals (~Rp 11 billion). His answer: "yes just like the previous demo that we made right exactly the same, with tutorial capybara also but with the newest version of the app, but if this takes a long time and quota then we can do it at last, because dont making the demo causing double job since we havent redesign most of the segment inside this app right therefore if there is a new update then u need to update the demo as well and it cause double jobs doesnt we? or do u have other pov?"

WAITING ON ALDI (asked after 15:40, verbatim): 🔴 "split" or "all at the end"?
- split (my pick) -> THIS job, narrowed: the big company's DATA now - a generator with a fixed random seed that feeds the lab (a switch like `&big`) so Journey Plan, Fleet & Roster and every later redesign are tested at real size; later the same generator writes the live demo's nightly seed. Redesigns change looks, not data ("same logic"), so it is built once. Do NOT touch the live demo, the capybara tutorial, DemoFrontDoor/DemoMission or demo/seed.json yet: they point at screens that will change, so they come LAST, after the redesigns (his double-job worry is right for them).
- all at the end -> skip the demo now; start at THEN step 2 (the mark looks round).

WHAT EXISTS (read before planning; never read demo/seed.json whole - 1.4 MB):
- The live demo company is rebuilt every night by api/demo-reset.js from demo/seed.json (vercel.json cron "5 17 * * *" = 00:05 WIB, maxDuration 60 s). The seed today: meta, appSettings, tierSettings (5), inventory (6), promo (6), customers (152) - NO salesmen, NO sales, so reports show nothing. On 2026-11-10 a reset once left the demo EMPTY (PROGRESS: grep "live demo company is EMPTY").
- READ FIRST, it may already make revenue: api/_demoCompany.js and tools/demo-omset-lab.jsx (graphify names both under "demo company"; not opened this session). Brainstorm: A-Brain Brainstorm/2026-11-14_professional-demo-company.md (options A/B/C, costs).
- Demo screens: src/components/DemoFrontDoor.jsx, DemoMission.jsx; check src/config/demoBuild.check.mjs; local runs: launch.json demo-emulator / demo-app-emulator / demo-api-emulator.
- "Professional edition" = his 2026-11-09 big job (business look, same logic; the game look kept as kpm tag game-edition-v1). Taste: grep "professional" in A-Brain Wiki/Concepts/Aldi's Design Taste.md (densest, quietest; ruled lines beat cards).

PLAN TO CHECK (not trialled, no promise):
- A seed generator in tools/ with a fixed random seed (the same company every night): salesmen, 3 areas, shops on real streets, the last 7 days of sales + visit reports in full, older months as totals only. Before relying on "screens load only 7 days of single sales", read useDatabaseSync.js and salesRollupWrite.js.
- Budget: Firestore's free allowance is 20,000 writes a day and the reset must finish inside 60 s. Add a check that fails when the seed passes the budget.
- Prove it on the demo emulator first; the live demo after his OK (the live reset is a production write).

THEN:
1. Test Journey Plan on that company in the Android emulator (how-to: A-Brain Wiki/Concepts/Looking at the App.md, "A REAL Android phone"; launch.json "ponder-lab-built-ipv4" is local only). Phone sizes: `adb shell wm size WxH` + `wm density D` (iPhone 13 = 1170x2532 at 460). Notch: `adb shell cmd overlay enable com.android.internal.display.cutout.emulation.tall` (or .corner / .double / .hole); the app must keep content inside env(safe-area-inset-*). Frames to him, not a test list.
2. The Q2 mark looks round (he said "sure"): A-Brain Raw/2026-11-14-day-replay-mark/ (shooter + the board he answered); DayReplay.jsx:217-220 sets `picked`; expedition.css has no `.picked` rule since 7a3dc370.
3. Ask him whether anything else keeps Journey Plan from looking its best. Then Fleet & Roster (graphify: src/FleetCanvasManager.jsx - confirm the screen).

DONE today: LIVE bf2018d7 + 78914bdf; Android tests 6/6 PASS at 15:13 (vault 62087acb). The iPhone test page https://claude.ai/artifact/Hh5bD2jg2faU78ugL5XTYC is retired by his message (no answers expected); Safari-only behaviour (its print screen, its hold-to-copy menu) stays untested - accepted, most users are on Android. Antigravity: the Retur audit task is OPEN, waiting for him.

TRAPS
- Before any push: `git log origin/phase0-solid-ground..HEAD`; an `Antigravity:` commit gets `git show` + the gates re-run, or the push waits.
- A ` D <file>` in git status can be a finished job's deletion that was never committed: grep the self-checks for the name before bringing it back.
- The lab server on localhost listens on IPv6 only; the emulator needs launch.json "ponder-lab-built-ipv4" + `adb reverse tcp:4187 tcp:4188`.

KEEP THIS FILE UNDER 7,000 CHARACTERS - ONE job. When a job is done, move its text to the top of NEXT-SESSION-archive.md and write the next one here.
