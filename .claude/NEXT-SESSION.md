# The one job

PRINTABLE DAY LOG - his 2026-11-14 ask, verbatim: "also add paper like Todays log that can be printed when admin doesnt want to see the whole animation for each of the person to see its activities in a single paper page". Nothing built. Board: https://claude.ai/artifact/9p4FCMUngPDqijLBvbuifL (file A-Brain Raw/2026-11-14-day-log-paper/board.html): A one salesman per A4 sheet (my pick; "Print all" = one sheet per man), B the whole team on one sheet (a line + a visit strip per man), C one salesman with a drawn route. WAITING: his letter, and whether "each of the person ... in a single paper page" means one page PER person (A, C) or everyone on one page (B).

When he picks - the data is already there: src/utils/dayLog.js dayLog({ man, day, transactions, logs, customers }) gives { start, events: [{ at (minutes), kind (sold, order, full, issue, request, closed, routine, swap), name, note, tx (the sale: total, items), source }], skipped }; hm(at) = "07:52". Not visited = his shops for that day minus the events' keys (the road the map already draws). Printing: SaleReceipt.jsx ~233 already writes a doc into a new window and prints it - reuse that path, never window.print on the app page. The button: beside "Replay his day" (one man) and on the team list ("Print all"). Paper = black ink on white, gold only as a line (palette law: no blue / green; it is not the receipt, so not company blue). Phone too: the print view must open on the phone (his "both phone and pc"). Then a check in logicFixes.selfcheck.mjs, patch note, gates, push.

HIS REVIEW PAGE of the redesign (before / now at phone width, 2026-11-13): https://claude.ai/artifact/DBBCoC74eK6mGRr7JyCGtq - its "before" pictures came from putting the morning's six screen files back for a minute (git checkout e8d820aa -- <files>, then git checkout HEAD -- <files>); the code is the live version.

ALSO WAITING ON HIM: which screen the redesign does next (Sales Terminal, Journey Plan, Agent Inventory, EOD are live in direction B). The B language and its traps are in NEXT-SESSION-archive.md (the Agent Inventory and EOD blocks at the top).

ANTIGRAVITY: its task (.claude/ANTIGRAVITY-TASK.md, the 38 findings, Status OPEN since 2026-11-11) waits for him to start it ("Do the task in .claude/ANTIGRAVITY-TASK.md"). When it says DONE: review, push, then write the queued one - a read-only audit of the whole Retur path, every way a return could be used for gain.

OLD CHEST CODE (follow-up, not urgent): chestHtml / slotHtml / SIGN5 / STILL / SPRITE_CSS and the .kx-c5 chest + .kx-slot CSS are unused on the maps since 7a3dc370, but JourneyView still imports chestHtml and ~36 checks pin them - a cleanup job of its own (delete, re-pin each check with his words).

KEEP THIS FILE UNDER 7,000 CHARACTERS - ONE job. When a job is done, move its text to the top of NEXT-SESSION-archive.md and write the next one here.
