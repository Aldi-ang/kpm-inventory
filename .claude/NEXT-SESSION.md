# The one job

Build a big-company demo for the professional edition, then test Journey Plan on it myself on the Android emulator. Aldi, 2026-11-14 after 15:17: "i rather let u build a demo for the professional one first before testing because u could simulate as its a big company having a lot of sales and revenue to view". No more manual phone tests from him: "all this test could be done in android since they both share the same ui as long as their resolution fir the iphone and android it should be fine, dont forget that some phone have notch as well like iphone".

WAITING ON ALDI (asked 15:35, verbatim):
🔴 "The big demo company - OK like this? 20 salesmen in 3 areas, 600 shops, the last 7 days in full (about 1,800 sales with their visit reports), and 6 months of totals (about Rp 11 billion). It replaces what visitors see in the live demo, which is rebuilt every night. "yes" → I build exactly this next. Other numbers → just tell me."

WHAT EXISTS (read before planning; never read demo/seed.json whole - 1.4 MB):
- The live demo company is rebuilt every night by api/demo-reset.js from demo/seed.json (vercel.json cron "5 17 * * *" = 00:05 WIB, maxDuration 60 s). The seed today: meta, appSettings, tierSettings (5), inventory (6), promo (6), customers (152) - NO salesmen, NO sales, so reports show nothing. On 2026-11-10 a reset once left the demo EMPTY (PROGRESS: grep "live demo company is EMPTY").
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
