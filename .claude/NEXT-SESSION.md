# The one job

WHEN HE SAYS "published" (rules CHANGE 28, kpm 67e22865): sync the record. firestore.rules is the draft he pastes WHOLE into the Firebase Console (Firestore Database > Rules > Publish) in BOTH projects (KPM and the demo kpm-demo-f4d74); before CHANGE 28 the file was byte-for-byte the published baseline, so nothing else goes live with it. After his word: copy firestore.rules over firestore.rules.deployed-baseline, change the header's "PUBLISHED ..." lines (top of firestore.rules) to the new date + commit, turn "[CHANGE 28 — 2026-11-13, DRAFT]" into "[CHANGE 28 — 2026-11-13, LIVE <date> in both projects]" (both markers), run the gates, push. Never publish rules yourself.

WHAT CHANGE 28 DOES (so you can answer him): a shop's salesman (assignedAgent / assignedBy / assignedAt) and its package-count reset (bundleReset) can be written by tier 1-4 only; a new shop arrives with no salesman or 'Unassigned'. The app already behaved this way on screen; this closes the database side. Proof: rules-test/test-shop-owner-fields.mjs, 22/22 on the draft, 14/8 on the published rules (exactly the 8 refused cases get through there). Run: `npm i --no-save @firebase/rules-unit-testing@5` once, then `npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-shop-owner-fields.mjs"`.

ALSO WAITING ON HIM: which screen the redesign does next (Sales Terminal, Journey Plan, Agent Inventory, EOD are live in direction B). The B language and its traps are in NEXT-SESSION-archive.md (the Agent Inventory and EOD blocks at the top).

ANTIGRAVITY: its task (.claude/ANTIGRAVITY-TASK.md, the 38 findings, Status OPEN since 2026-11-11) waits for him to start it ("Do the task in .claude/ANTIGRAVITY-TASK.md"). When it says DONE: review, push, then write the queued one - a read-only audit of the whole Retur path, every way a return could be used for gain.

KEEP THIS FILE UNDER 7,000 CHARACTERS - ONE job. When a job is done, move its text to the top of NEXT-SESSION-archive.md and write the next one here.
