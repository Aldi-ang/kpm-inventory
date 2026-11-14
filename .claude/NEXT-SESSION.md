# The one job

Journey Plan must look its best before any other screen (Aldi, 2026-11-14: "we need to make sure the journey plan looks best first before doing other, but the next job after this done is definitely the fleet and roster"). Fleet & Roster is the job AFTER this one.

WAITING ON ALDI: ✅ his 3 iPhone tests on https://claude.ai/artifact/Hh5bD2jg2faU78ugL5XTYC (print his day, hold a flag, Day Replay pin). His answers save to that page's db collection "results" (ArtifactData list, collection "results"); he says "iPhone tests done". Read them first: a "fail" outranks the looks round. Android passed all of these at 15:13 (A-Brain Raw/2026-11-14-android-print/tests.mjs + results-1513.json).

NOW: the Day Replay mark, looks round. He saw the board (NOW = a pressed shop with no pin marked, beside an example gold glow + ring) and said "q2= sure". Show him 2-3 looks, he picks, then build it.

1. Load the design stack first (alucard §1a): his taste file (A-Brain Wiki/Concepts/Aldi's Design Taste.md - grep it for mark, ring, glow, selected, pin, flag; never read it whole; its newest lines: no text may touch other text or a marker at any size; "best on phone" = a frame drawn for the phone), then emil-design-eng. Rules that bind: palette law (slate + gold, no blue, no green, gold never as text on light), Lite mode = performance (no rotation; nothing that has to move to be seen), every look must read at 375 on a phone.
2. The code: DayReplay.jsx:217-220 gives the pressed shop's marker the class `picked` (`kx-mk kx-rp-mk picked`); src/styles/expedition.css has had no `.picked` rule since 7a3dc370 (the chest's gold ring left with the chest). A look can be CSS only.
3. Frames: A-Brain Raw/2026-11-14-day-replay-mark/shoot.mjs - copy it to the scratchpad, build the lab (`npx vite build --config tools/ponder-lab.config.mjs`), start launch.json "ponder-lab-built". It presses BS -> "Replay his day" -> Pause -> WHOLE DAY -> full screen -> wheel-zooms on the shops -> presses Toko Makmur, then injects MARK_CSS. Give it one CSS per look; shoot NOW + A + B + C at 375 with phone media.
4. Starting ideas, to check against his taste file (not promises): A a gold ring at the pin's foot (the example he saw); B the pressed pin itself turns gold and stands a little taller, its "BS · n" label gold too; C the other pins fade so only the pressed one stays bright.
5. Board: the frames side by side, plain captions, my pick named, sent as a PNG. His letter -> build it in src/styles/expedition.css, one check in src/config/logicFixes.selfcheck.mjs that the `.kx-rp-mk.picked` rule exists, frames at 375 and 1280, a patch note line (src/config/patchNotes.js, en + id), the gates, push.

STILL TO SHOW HIM (a frame, not words; do not fix unasked): on the phone, full screen + WHOLE DAY zooms out until the day's 8 shops sit in one blob (cause not checked - maybe the fit includes his start point); the open card then covers half the map.

After the mark: ask him, with Journey Plan frames at 375 and 1280, whether anything else keeps it from looking its best. Then Fleet & Roster (graphify gives src/FleetCanvasManager.jsx for "fleet" - confirm which screen he means).

DONE today: LIVE bf2018d7 + 78914bdf (Antigravity's 38 answers; capy-excited-6.mp3 gone for good). The Day Log print test PASSED on the Android emulator (how-to: A-Brain Looking at the App, "A REAL Android phone"). He has both phones; "most of the users of this app would be on android" - the emulator is the main phone check. Antigravity: the Retur audit task is OPEN in .claude/ANTIGRAVITY-TASK.md, waiting for him to start it.

TRAPS
- Before any push: `git log origin/phase0-solid-ground..HEAD`; an `Antigravity:` commit gets `git show` + the gates re-run, or the push waits.
- A ` D <file>` in git status can be a finished job's deletion that was never committed: grep the self-checks for the name before bringing it back.
- The lab server on localhost listens on IPv6 only; the emulator needs launch.json "ponder-lab-built-ipv4" (local, not committed) + `adb reverse tcp:4187 tcp:4188`.

KEEP THIS FILE UNDER 7,000 CHARACTERS - ONE job. When a job is done, move its text to the top of NEXT-SESSION-archive.md and write the next one here.
