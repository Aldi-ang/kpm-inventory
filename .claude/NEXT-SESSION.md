# The one job

Journey Plan must look its best before any other screen. Aldi, 2026-11-14: "we need to make sure the journey plan looks best first before doing other, but the next job after this done is definitely the fleet and roster". Fleet & Roster is the job AFTER this one.

WAITING ON ALDI (verbatim):
- ❓ Q2, board sent 14:35: "Want a mark? "yes" → I make 2-3 looks for you to pick. "no" → it stays as it is."
- ❓ (13:18, unanswered): "Is your phone Android or iPhone? The simulator only does Android, and an iPhone can't be simulated on Windows."

DONE today:
- 14:27 LIVE bf2018d7 (Antigravity's 38 answers: 1 fixed, 37 open; tables in the A-Brain Backlog sweep notes, vault 203c7abe) + 78914bdf (capy-excited-6.mp3 removed for good). Antigravity's next task (the Retur audit) is in .claude/ANTIGRAVITY-TASK.md, Status OPEN - he starts it ("Do the task in .claude/ANTIGRAVITY-TASK.md").
- 14:42 STEP 1, the print test, PASSED on the Android emulator (Android 15, Chrome 124): "Print his day" and "Print team day" -> Android's print screen shows only the paper, one page each. Board sent to him. How to run the emulator, and the IPv6 trap: A-Brain Wiki/Concepts/Looking at the App.md, section "A REAL Android phone" (vault e7180a8e). The driver (android/cdp.mjs: adb forward tcp:9223 localabstract:chrome_devtools_remote, CDP touch taps) lived in the scratchpad - rebuild it from that page if gone.

STEP 2 - Q2 mark, after his answer. Yes -> a looks round (alucard §1a, his taste file first). The example was CSS only: `.kx-rp-mk.picked` drop-shadow + `::after` gold ellipse (DayReplay.jsx:217-220 sets `picked`; expedition.css has had no `.picked` rule since 7a3dc370). Shooter: lab at 375 with phone media: BS -> "Replay his day" -> Pause -> WHOLE DAY -> full screen (.kx-mapkey.k-full) -> wheel-zoom on the shops -> press Toko Makmur. No -> drop it.
- Seen while shooting, NOT asked yet (show him a frame, do not fix): on the phone, full screen + WHOLE DAY zooms out until the day's 8 shops sit in one blob (cause not checked - maybe the fit includes his start point); the open card then covers half the map.

STEP 3 - ask him, with Journey Plan frames at 375 and 1280, whether anything else keeps it from looking its best. Do not invent polish. Then Fleet & Roster (graphify gives src/FleetCanvasManager.jsx for "fleet" - confirm which screen he means).

TRAPS
- Before any push: `git log origin/phase0-solid-ground..HEAD`; an `Antigravity:` commit gets `git show` + the gates re-run, or the push waits.
- A ` D <file>` in git status can be a finished job's deletion that was never committed: grep the self-checks for the name before bringing it back.
- Paper map traps: mapLayout() once per frame (700x195 A4/PC, 360x250 phone); keep "no word on another" green; zoom EXACT-fit; tiles near their own size; 15+ stops -> second page.

KEEP THIS FILE UNDER 7,000 CHARACTERS - ONE job. When a job is done, move its text to the top of NEXT-SESSION-archive.md and write the next one here.
