# The one job

**The Authorize button appears for the receiving agent and then the write refuses them.**

Aldi, 2026-09-08, signed in as KALDI, the named BANDUNG approver who was also the receiver:
*"kaldi receive both bells for handsoff request and its approval, but cant approve it and it says
the notification box above"*. The box says **"You asked for this hand-off or you are receiving it.
Somebody else has to authorise it."**

`ad4f18b` was his decision that a branch approver may authorise a store handed to them —
*"yeah they should be able to confirm their own request"*. It changed the LIST and not the WRITE.

* `src/ConsignmentFinanceView.jsx:472` — the queue drops the SENDER only:
  `if (agentProfileId && r.fromAgentId === agentProfileId) return false;`, then defers to
  `canApproveHandoffFrom`. So the receiver keeps the card and the button.
* `src/App.jsx:1810-1812` — the write still refuses BOTH:
  `if (request.toAgentId === agentProfileId || request.fromAgentId === agentProfileId)`.

**The smallest fix is to delete `request.toAgentId === agentProfileId ||` from that guard**, so the
write matches the list it is reached from. Nothing else has to move: the sender stays refused on the
next line, and `canApproveHandoffFrom` immediately below still refuses anybody without approval
power over the receiver's branch — that is what keeps a plain Tier 5/6 out.

⚠️ **THE TRAP: do not "fix" this by making the LIST match the WRITE.** Hiding the button again is
the smaller-looking diff and it silently reverses `ad4f18b`, which is Aldi's own call, recorded in
`MANUAL_TEST_CHECKLIST.md` Section C. The list is right. The write is the stale half.

⚠️ **Do not drop the sender check with it.** Asking for a store and granting it to yourself is one
person doing the whole protocol. Only the receiver clause goes.

⚠️ **Line numbers moved on 2026-09-08 (`cdaabc7`).** Re-grep
`You asked for this hand-off` before editing rather than trusting `1811` above.

Leave the fix in `src/config/logicFixes.selfcheck.mjs`: assert the anchors were found before
slicing, pin the slice length, and re-run the predicate on real accounts — receiver-with-power
approves, receiver-without-power refused, sender refused at every tier. Trial it RED first by
copying the edited file aside and `git checkout --`ing it, never by stashing.

**Then rewrite this file with the next single job.**

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### HQ 3 and HQ TEST are Ecer consignments already written

`967e447` and `83f5041` stop new ones. It does not touch the Rp 1.000.000 sitting against HQ 3, or the
Rp 1.055.000 against HQ TEST which is probably the same shape. He was told explicitly that money
already in his live book will not be touched without him naming it. **Do not clean these on your
own initiative.** The HQ 3 hand-off request also still reads APPROVED with the shop never moved -
`cdaabc7` stops new ones lying, it does not repair that record. And do NOT register HQ 3 as a shop — an earlier session told him to, which was
wrong by his own design: an Ecer sale is a person, not a store.

### Round 7 is still unfinished, and one part is now untestable

Section B PASSED 2026-09-08, all five items. Section D of `MANUAL_TEST_CHECKLIST.md` (rewritten
2026-09-08 as click-level steps) has never been run. **C4, the displacement test, cannot be run at all**: BANDUNG has exactly one
account, `kaldi0470@gmail.com`, and Aldi used it as receiver AND named approver. Displacement needs
two different Bandung people — the named approver, and the branch's own regional admin who must go
silent. Ask him to create the second account before C4 is attempted again. Headquarters not seeing
the request (his sc3) is correct but proves nothing either way.

Also owed: **F**, the Tier 1 half of the `994d3d6` vault-grace fix — unlock the vault, come back
inside five minutes, confirm no PIN prompt.

### Bug 3 — geofence bypass goes to the owner, globally

Aldi's rule, 2026-09-08: *"every geofencing bypass approval is the responsibility for each regional
admin and each regional admin only have responsibility to approve or reject the bypass for their own
team inside their regional area only other tier shouldnt be receiving this"*, plus *"make sure that
there is only 1 request each time, salesperson should not be able to spam the request"*.

* `src/MerchantSalesView.jsx:817` writes the bell with `agentId: "ADMIN"`, `linkToTab: "fleet"` —
  one owner-addressed notification, no region on it.
* `src/FleetCanvasManager.jsx:132-136` subscribes to the WHOLE `gps_bypasses` collection with no
  region filter, and the panel at `:1037` lives inside the owner-only Fleet & Canvas screen.
* `src/MerchantSalesView.jsx:815` calls `addDoc` with no check for an existing PENDING request.

Four files at least. Name them to him before starting.

### Bug 4 — the chip row has no tier floor (HIS DECISION, still unanswered)

Naming a Tier 6 in Fleet & Canvas gives them real approval power, including over a store handed to
them. Aldi saw it, removed the chip, and the button went away. `canApproveHandoffFrom` in
`src/config/permissions.js:425` returns `named.includes(region)` for anybody named, at any tier,
while `ad4f18b`'s own comment says it was meant for "a Tier 4 regional admin". Ask whether Fleet &
Canvas should refuse to tick approval branches below Tier 4. Do not decide it for him.

### Product Performance reports unpaid consignment as finished revenue

Untouched. `ProductPerformancePanel.jsx:44` reads a monthly rollup through `statsPath(...)`;
`salesRollup.js:88-90` accumulates `{ qty, revenue }` with no paymentType dimension;
`salesRollupWrite.js:37-38` writes those two fields. The split has to be made at WRITE time and
carried through — five files, over the 3-file rule, name them first. **Settle before designing:
does a later `CONSIGNMENT_PAYMENT` also enter the rollup (`SALE_TYPES`, `salesRollup.js:42-46`)? If
a Titip sale books revenue at placement and its payment books it again, the panel is already
double-counting and that is the larger bug.** And every month already written carries no split, so
decide explicitly: backfill from `transactions`, or label pre-change months "not separated". Returns
are part of his sentence — `returnTotal` is written at `useTransactionEngine.js:492`, `:569`, `:590`
and read by no money calculation.

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
