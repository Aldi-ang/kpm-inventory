# The one job

FULL REDESIGN, SCREEN 2 = JOURNEY PLAN (src/JourneyView.jsx, ~1,970 lines; every salesman's landing screen). The package rules A-D are all LIVE (kpm 141dd879, 20131db3, 56942b48, 63e79fb6, 3f5e71bb). Done before them and live: the Sales Terminal in direction B (cb8f5244), its shopping list + the capybara off the panel (1695539c), the item types as bordered buttons (00cf1b51), − n + on the package card (6257a8df), the shared top bar as one row (d4e84da6). No new pick is needed (his 2026-11-11 "Then build one screen at a time, test it, show me, and push").

TODAY'S LOOK (A-Brain Raw/2026-11-11-redesign-today/v3-p-journey.png, with the new bar): rounded cards with thick frames (Mission Feed, Expedition), game words in English (MISSION FEED, SECURED, EXPEDITION, SHOPS LEFT), pixel chests on the map.

B's LANGUAGE, as built on the terminal: `font-mono` on the screen root (Rajdhani everywhere), flat ground, ruled lines instead of framed cards, a lit tab = a gold line under a plain word (`border-b-2 -mb-px`, never an amber or tan plate), amber only as an edge or an ink, 44 px controls on the phone, tables at lg, the day's numbers as one strip, cream = --duke-paper-2 with --duke-on-plate ink. Palette law: no blue, no green.

ASK HIM FIRST, with frames, ONE thing only if it comes up: the map's pixel chests and the little salesman are game art - keep them (like the capybara) or plain pins? Everything else: build, then show today beside built.

HOW: look only, in src/JourneyView.jsx; `npm run build; node src/config/integration.audit.mjs` BEFORE the first edit; phone first, then PC. Shoot with the demo walk (demo-emulator + `node tools/demo-reset-emulator.mjs` + demo-app-emulator, then drive.mjs in that Raw folder; the step files are named in cb8f5244's message), or the lab: launch "ponder-lab", URL http://localhost:4190/tools/ponder-lab.html?shell&journey (+ &admin) - the /tools/ path; /ponder-lab.html serves the app and errors.

DO NOT BREAK (live since 2026-11-12/13): the two "Assign Fleet" boxes are tier 1-4 only (canChooseSalesman, 9eda75b5); moving a pin stays with canAssignAgent. The map's phone strip + MapTouchGate (73d9eb9: dragging off on the phone until full screen) is his pick A - keep its behaviour.

TRAPS met on the terminal, all will meet you again: (a) the shell scrolls the whole screen under its header, so a bar meant to stay in view is `fixed`, and a PC screen that must fit the window measures the scroll box (grep `--term-h` in MerchantSalesView.jsx); (b) a `%` height inside an auto grid track resolves to the content's own height - a picture in a fixed box needs `absolute inset-0 object-contain`; (c) the app keeps state in storage (JourneyView reads localStorage 'tripBuilderCache' for assignments) - a reload does not empty the screen; (d) checks pin the old look by class string: run the gates early, re-pin each to the new look with its reason, never delete one; (e) when a panel changes sides, check everything pinned to that side and shoot it SCROLLED with real content; (f) convert the WHOLE visible surface before showing it, or say which part is left and why. Never commit to branch game-edition.

AFTER Journey Plan: Agent Inventory, then EOD.

STILL OPEN, phone-side only (a Console rule he would publish, not this job): the database lets anyone with shop-edit access write assignedAgent and bundleReset (firestore.rules:751; the app shows both only to tier 1-4). Check CustomerManager.jsx:662 (KML import writes 'Unassigned') before drafting it; grep "CHANGE [0-9]" firestore.rules for the next number.

QUEUED FOR ANTIGRAVITY (his yes): a read-only audit of the whole Retur path, every way a return could be used for gain - write it into .claude/ANTIGRAVITY-TASK.md only once its current task (the 38-findings audit, Status OPEN) says DONE.

KEEP THIS FILE UNDER 7,000 CHARACTERS - ONE job. When a job is done, move its text to the top of NEXT-SESSION-archive.md and write the next one here.
