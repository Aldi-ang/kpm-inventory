# The one job

THE PACKAGE (PAKET) RULES, STAGE D - one line in the boss's report: "took a package, then returned its cigarettes within 7 days". Stages A, B, C are LIVE (kpm 141dd879, 20131db3, 56942b48; their commit messages are the full story). Decisions and his words: A-Brain Brainstorm/2026-11-12_package-limit-per-shop-and-switch.md (read its last three sections only).

WHY: a package sells cigarettes with a promo item at a package price. A shop (or a salesman) could take the package, keep the promo item, and send the cigarettes back as a Retur a few days later. His rule: a return never gives the package count back (stage B). Stage D only SHOWS it to the boss; it blocks nothing.

FIND FIRST (do not guess):
1. How a package sale is saved: grep "bundleTaken" and "THE SHOP'S EARLIER PACKAGES" in src/MerchantSalesView.jsx and src/utils/vanBay*.js - what field on the sale marks it as a package sale, and the shop name on it.
2. How a Retur is saved: grep "RETUR\|Retur" in src/hooks/useTransactionEngine.js - the type, the shop, the items, the date.
3. Where the boss's report already lists per-shop or per-salesman lines (grep the report screens for "report" in src/components; pick the one the boss reads daily). One line there, not a new screen.

THE SMALLEST VERSION: a pure function (in the same utils file as bundleTaken) that takes the sales list and returns [{shop, salesman, package, soldAt, returnedAt, items}] where a Retur of one of the package's cigarettes at the same shop came within 7 days after the package sale. One self-check line on real numbers (a package on day 1, a return on day 5 -> flagged; on day 9 -> not; a return at another shop -> not). Then the one report line. Render it at 375 in the lab (tools/ponder-lab.jsx, launch "ponder-lab", URL http://localhost:4190/tools/ponder-lab.html?... - the /tools/ path).

TRAPS: never block or undo anything (his rule: show, not stop). Do not touch the Retur path itself. Shop names are matched exactly elsewhere in the package rules (storeKey in utils/helpers.js) - use the same key. A return of a DIFFERENT product is not this case.

SETTLED 2026-11-13 (kpm 63e79fb6, his "tier 4 and above can refresh that immediately"): tier 1-4 clear one shop's package count with "Clear count" on the terminal's package card (customer.bundleReset[package id]; bundleTaken counts only sales after it; audit BUNDLE_COUNT_CLEARED). Stage D's report line should also name a shop whose count was cleared (the audit log has it) - one more way around the limit to show.

ALSO OPEN, phone-side only: the database lets any salesman with shop-edit access write assignedAgent AND bundleReset (firestore.rules:751; the app shows both only to tier 1-4). A rule he would publish in the Console; check CustomerManager.jsx:662 (KML import writes 'Unassigned') before drafting it. Not this job.

AFTER D: the Journey Plan redesign (grep "JOURNEY PLAN" in .claude/NEXT-SESSION-archive.md, read that one block only).

ALSO QUEUED FOR ANTIGRAVITY (his yes): a read-only audit of the whole Retur path, every way a return could be used for gain - write it into .claude/ANTIGRAVITY-TASK.md only once its current task (the 38-findings audit, Status OPEN) says DONE.

KEEP THIS FILE UNDER 7,000 CHARACTERS - ONE job. When a job is done, move its text to the top of NEXT-SESSION-archive.md and write the next one here.
