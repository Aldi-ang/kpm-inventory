# The one job

**A salesperson asks to bypass the geofence, and the request goes to Aldi. Every time, from every
branch, and they can ask again as often as they like.**

His rule, 2026-09-08: *"every geofencing bypass approval is the responsibility for each regional
admin and each regional admin only have responsibility to approve or reject the bypass for their own
team inside their regional area only other tier shouldnt be receiving this"*, plus *"make sure that
there is only 1 request each time, salesperson should not be able to spam the request"*.

Two separate faults, both live. Line numbers verified 2026-09-08 13:47 — re-grep anyway:

* `src/MerchantSalesView.jsx:822` writes to `gps_bypasses`, and `:829` writes the bell with
  `agentId: "ADMIN"`, `linkToTab: "fleet"`. One owner-addressed notification, carrying no region at
  all, so nothing downstream *can* route it to a branch.
* `src/FleetCanvasManager.jsx:132` subscribes to the whole `gps_bypasses` collection with no region
  filter, and the approve/reject buttons at `:1073` and `:1084` sit inside Fleet & Canvas, which is
  the owner's screen. Even a correctly addressed bell would land somewhere a regional admin cannot
  reach.
* `src/MerchantSalesView.jsx:822` calls `addDoc` with no check for an existing PENDING request from
  the same person. That is the spam half, and it is the smaller of the two.

**FOUR FILES AT LEAST, WHICH IS OVER THE 3-FILE RULE. Name them to him and get an answer before
writing anything** — the write site, the subscription, wherever the approve/reject panel ends up
living for a regional admin, and `src/config/permissions.js` for the predicate.

**Settle this with him before designing, because it decides the shape.** Approval power for a
hand-off already has a predicate that answers "may this person authorise something in that branch":
`canApproveHandoffFrom` in `src/config/permissions.js:425`, which honours the Fleet & Canvas
per-person branch chips. Ask whether a geofence bypass uses that same predicate, or a plain "Tier 4
of that region" rule. His sentence says *regional admin*, not *named approver*, and those stop being
the same set the moment anybody is named in Fleet & Canvas. Do not decide it for him.

⚠️ The bypass request carries no region today. Wherever the region comes from, it must be the
**requesting agent's** branch, resolved at the moment of the write and stored on the document — not
looked up at read time from a roster that may have moved them since. A request that has to be
re-resolved to be routed is a request that reroutes itself when somebody transfers.

⚠️ Do not let "only 1 request each time" become a client-side disabled button. That is the
UI-says-yes-server-says-no shape this project has now hit at least seven times, most recently in
`d84bc4c` — see `A-Brain/Wiki/Concepts/UI-Says-Yes-Server-Says-No Pattern.md`. The duplicate check
belongs at the write.

Leave the fix in `src/config/logicFixes.selfcheck.mjs`: assert the anchors were found before
slicing, pin the slice length, and re-run the routing predicate on real accounts — a Bandung
salesperson's bypass reaches Bandung's approver and not Jakarta's, the owner still sees it, and a
second request from the same person while one is PENDING is refused. Trial it RED first by copying
the edited file aside and `git checkout --`ing it, never by stashing.

Then rewrite this file with the next single job.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Owed him from the fix that just shipped (`d84bc4c`)

✅ TEST as KALDI: a store handed to you shows Authorize, the press works, and the shop actually
moves. Then as the SENDER of a request: Authorize must still refuse you.

🔴 DECIDE — **Bug 4 is no longer latent, it is live.** A Tier 6 ticked for a branch in Fleet &
Canvas could always SEE the Authorize button on a store handed to them; until `d84bc4c` the write
refused the press, and now it does not. `canApproveHandoffFrom` (`src/config/permissions.js:425`)
returns `named.includes(region)` for anybody named at any tier, while `ad4f18b`'s own comment says
it was meant for "a Tier 4 regional admin". Ask whether Fleet & Canvas should refuse to tick
approval branches below Tier 4. Do not decide it for him — he already saw this once, removed the
chip, and watched the button disappear.

### HQ 3 and HQ TEST are Ecer consignments already written

`967e447` and `83f5041` stop new ones. Neither touches the Rp 1.000.000 sitting against HQ 3, or the
Rp 1.055.000 against HQ TEST which is probably the same shape. He was told explicitly that money
already in his live book will not be touched without him naming it. Do not clean these on your own
initiative. The HQ 3 hand-off request also still reads APPROVED with the shop never moved —
`cdaabc7` stops new ones lying, it does not repair that record. And do NOT register HQ 3 as a shop:
an earlier session told him to, which was wrong by his own design — an Ecer sale is a person, not a
store.

### Round 7 is still unfinished, and one part is untestable

Section B PASSED 2026-09-08, all five items. Section D of `MANUAL_TEST_CHECKLIST.md` (rewritten
2026-09-08 as click-level steps) has never been run. C4, the displacement test, cannot be run at
all: BANDUNG has exactly one account, `kaldi0470@gmail.com`, and Aldi used it as receiver AND named
approver. Displacement needs two different Bandung people — the named approver, and the branch's own
regional admin who must go silent. Ask him to create the second account before C4 is attempted
again. The displacement rule itself is now asserted in `logicFixes.selfcheck.mjs` as of `d84bc4c`,
so it is checked in code even while it cannot be clicked. Headquarters not seeing the request (his
sc3) is correct but proves nothing either way.

Also owed: F, the Tier 1 half of the `994d3d6` vault-grace fix — unlock the vault, come back inside
five minutes, confirm no PIN prompt.

### Product Performance reports unpaid consignment as finished revenue

Untouched. `ProductPerformancePanel.jsx:44` reads a monthly rollup through `statsPath(...)`;
`salesRollup.js:88-90` accumulates `{ qty, revenue }` with no paymentType dimension;
`salesRollupWrite.js:37-38` writes those two fields. The split has to be made at WRITE time and
carried through — five files, over the 3-file rule, name them first. Settle before designing: does a
later `CONSIGNMENT_PAYMENT` also enter the rollup (`SALE_TYPES`, `salesRollup.js:42-46`)? If a Titip
sale books revenue at placement and its payment books it again, the panel is already double-counting
and that is the larger bug. Every month already written carries no split, so decide explicitly:
backfill from `transactions`, or label pre-change months "not separated". Returns are part of his
sentence — `returnTotal` is written at `useTransactionEngine.js:492`, `:569`, `:590` and read by no
money calculation.

### Housekeeping

* `AgentProfileView.jsx:1333` uses the same `-top-2 -right-2 animate-ping` geometry that shook the
  Hand-offs tab strip. Check whether its parent scrolls before deciding; if it does, `a8fea37`'s
  inset is the fix.
* The tutorial book: the close button at `PonderBook.jsx:1025` does nothing (prime suspect is the
  scrim at `:1103` swallowing the click — verify with `document.elementFromPoint`, do not guess),
  and there is an unlocated white vertical line on the book background. Two audit checks guard the
  Ponder scene splits — search `strandedBeats` in `integration.audit.mjs`, do not weaken them.
* The in-app browser still cannot reach `vite --host` (self-signed certificate on both
  `https://localhost:5173` and `http://localhost:5173`), so every visual claim goes back to Aldi by
  eye. Worth one session.

</details>
