# The one job

RULE DRAFT, CHANGE 28 (phone-side hole, a Console rule HE publishes - never part of a push): today the database lets anyone with shop-edit access write a shop's salesman (assignedAgent / assignedBy / assignedAt) and its package count reset (bundleReset). The app shows both only to tier 1-4: Journey Plan handleAssignAgent (JourneyView.jsx ~688, canChooseSalesman), Customer Directory Give (CustomerManager.jsx ~262), Clear count (MerchantSalesView.jsx ~669). A tier 5 with a modified app could still write them.

THE FIX (firestore.rules, match /customers/{customerId} ~743, beside CHANGE 18's grosirCreateOk / grosirUpdateOk): two functions on the same pattern - update: the diff's affectedKeys may touch assignedAgent / assignedBy / assignedAt / bundleReset only if grosirAdmin() (T1 ADMIN/DEVELOPER, COMPANY_OWNER, AREA_ADMIN, FLEET_CAPTAIN = the app's canConfirmGrosir); create: no assignedBy / assignedAt / bundleReset and assignedAgent absent or 'Unassigned' unless grosirAdmin(). Add the clause to the create line and to BOTH update lines (folders off and folders on).

TRAPS: the KML import (CustomerManager.jsx ~683) CREATES shops with assignedAgent 'Unassigned' - must stay allowed for whoever can import. The shop form never sends assignedAgent (formData has no such key), so a tier 5's edit or new shop is untouched. JourneyView writes deleteField() for Unassigned - a removed key IS in affectedKeys (correct: T1-4 only). The boss's own writes go through the users/{bossUid} catch-all.

TEST: copy rules-test/test-sell-damaged.mjs's harness into rules-test/test-shop-owner-fields.mjs; run `npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-shop-owner-fields.mjs"`; then with RULES_FILE=<the published rules> every newly-DENIED case must pass there (proves it is a real change). Report to him: the rule text to paste, what it stops, the test count. Mark it [CHANGE 28 — DRAFT] like 23/27.

AFTER: ask him which screen the redesign does next (Journey Plan, Agent Inventory and EOD are live in direction B).

ANTIGRAVITY: its task (.claude/ANTIGRAVITY-TASK.md, the 38 findings, Status OPEN since 2026-11-11) waits for him to start it ("Do the task in .claude/ANTIGRAVITY-TASK.md"). When it says DONE: review, push, then write the queued one - a read-only audit of the whole Retur path, every way a return could be used for gain.

KEEP THIS FILE UNDER 7,000 CHARACTERS - ONE job. When a job is done, move its text to the top of NEXT-SESSION-archive.md and write the next one here.
