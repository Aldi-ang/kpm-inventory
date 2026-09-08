# The one job

**When a shop hands back unsold consignment goods, the sales report never takes the money back
out. The stock returns to the shelf, the customer never pays, and Product Performance still counts
it as sold.**

Aldi is selling this app to a customer before the end of September 2026. A report that overstates
revenue is the one class of bug that cannot ship: the customer finds it by doing their job, and it
poisons trust in every other number on the screen. His words, 2026-09-08: *"okay then fix those
first i want to finish this app before this month"*.

## What the code does — anchors verified 2026-09-08 19:30, re-grep anyway

A Titip (consignment) placement is written as an ordinary sale — no `type` field, so
`isSale` reads it as `'SALE'` — and `tallySale(..., +1)` books its full value into the monthly
rollup at `src/hooks/useTransactionEngine.js:417`. That is revenue counted at placement, before
anybody has paid. Whether that timing is right is a separate question Aldi has not answered; leave
it alone.

The goods coming back is what is broken. The live path is the **store audit**:

* `src/ConsignmentFinanceView.jsx:585` — the audit calls
  `onPayment(name, paymentItems, paymentTotal, returnItems, returnTotal, remainingItems)`.
* `src/hooks/useTransactionEngine.js:504` — `handleConsignmentPayment` receives them and writes one
  transaction carrying `itemsReturned` and `returnTotal` (`:532`, `:535`, and again at `:609`/`:612`
  and `:630`/`:633`) with `type: 'CONSIGNMENT_PAYMENT'`.
* `src/utils/salesRollup.js:44` — `SALE_TYPES = ['SALE']`, so `isSale` refuses that transaction and
  `salesDelta` returns null. **Nothing is written to the rollup, in either direction.**

So the original placement's revenue stays in the month, forever, for goods that came back.

`src/utils/salesRollupWrite.js` names this exact path in its own comment: *"every path that removes
or changes a sale must pass -1. Those paths are: the history screen's edit and delete, the folder
delete, and a consignment return."* The first two do it (`HistoryReportView.jsx:384`,
`App.jsx:2980`). The third does not. The comment describes four paths and the code implements three.

## The smallest fix, and where it has to go

**In `salesDelta` (`src/utils/salesRollup.js:69`), not at the call site.** That single choice is
what decides whether the months already written can be repaired:

`rebuildMonths` (`salesRollup.js:193`) recomputes every month from the `transactions` collection and
it calls the same `salesDelta`. Teach `salesDelta` to emit a negative delta for a transaction's
`itemsReturned`, and the existing Settings rebuild button repairs the entire history by itself —
no migration, no backfill script, no touching his live data by hand. Patch it at the call site
instead and only future returns are correct while every past month stays wrong and the rebuild
keeps reproducing the wrong number.

## Traps

⚠️ **`handleConsignmentReturn` (`useTransactionEngine.js:645`) is NOT the path. It looks exactly
like it.** It writes a real `type: 'RETURN'` transaction, and `onReturn` is passed into
ConsignmentFinanceView at `:47` and **never called anywhere** — grep it. Fixing that function would
pass review, add a green check, and change nothing the customer sees. Confirm it is dead before
deciding what to do with it, and do not delete it in the same commit as the fix.

⚠️ **Settle which money comes back out, before writing anything.** The rollup booked
`qty × calculatedPrice` at placement. The audit carries its own `returnTotal`. These can differ, and
reversing the wrong one leaves the report wrong in a subtler way that no check will catch. Read what
`returnItems` actually carries in `ConsignmentFinanceView`'s audit builder first — if the lines do
not carry the price they were placed at, a naive `-1` reverses the QUANTITY and not the MONEY, which
is a half-fix that reads green.

⚠️ **Check every caller before changing shared maths.** `salesDelta` is called by `tallySale`,
`tallySaleOp` (offline drain, `App.jsx:368`), `untallyOps` (`App.jsx:2980`, sign -1),
HistoryReportView's edit pair, and `rebuildMonths`. Deleting a return must ADD the money back, so
the signs have to compose. Work through each one rather than assuming.

⚠️ **Do not change when Titip revenue is booked.** That is Aldi's judgement call and he has not made
it. This job only makes returns reverse what placement booked.

## You can see the app now — use it

`37f34ee` set up a local Firebase emulator with a fake company, so screens behind the login are
verifiable from here for the first time. Start it, do not rebuild it:

```
npx firebase emulators:start --only auth,firestore     # a background Bash task
node tools/seed-emulator.mjs                           # directory row, keyed by email
```

Then `preview_start` the **`kpm-dev-http`** launch entry (port 5174 — plain http, and it is the
only mode that points the app at the emulator). Sign in from the page console, because the
single-tab browser pane cannot complete a popup:

```js
const h = window.__kpmEmulatorAuth;
const cred = h.credential(JSON.stringify({ sub: 'x', email: 'adikaryasukses99@gmail.com', email_verified: true }));
const res = await h.signIn(h.auth, cred);   // res.user.uid — the emulator picks it, not you
```

Re-run `node tools/seed-emulator.mjs --uid <that uid>` to fill the company under it, then unlock the
vault by writing the grace record and reloading:

```js
localStorage.setItem('kpm-vault-grace', JSON.stringify({ uid: '<that uid>', at: Date.now() }));
```

Seeded: 4 products, 2 agents (one Tier 5 at HEADQUARTERS with stock in the van, one Tier 4 at
BANDUNG named for approvals), 3 shops, 2 Titip placements and 1 cash sale — deliberately the shape
this job needs. Vault password `Emulator-1!`, recovery word `emulator`, both meaningless outside
the fake database.

⚠️ The dashboard showed **Rp 0** omzet against those seeded transactions. Probably just that
`sales_stats` was not seeded and the panel reads the rollup rather than raw transactions — but
confirm it before assuming, because "the report disagrees with the transactions" is exactly the bug
class this job is about, and if it is real it is a second instance.

## Verify

Leave it in `src/config/logicFixes.selfcheck.mjs`: assert the anchors were found before slicing, pin
the slice length, and re-run the maths on real numbers — a placement of 10 books revenue, a return
of 4 takes 40% of it back out, a full return zeroes the month, and `rebuildMonths` over the same
transaction list reaches the identical figure the live tally does. That last one is the assertion
that proves history is repairable. Trial it RED first by copying the edited file aside and
`git checkout --`ing it, never by stashing.

⚠️ `AgentInventoryView.jsx` is CRLF while `App.jsx` is LF — this repo is mixed. Match the file's own
endings or the anchor silently misses.

Then rewrite this file with the next single job.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### The plan Aldi agreed to, 2026-09-08 — ship before end of September

Goal is NOT "no bugs". It is: no bug on the paths his customer actually walks, everything else
written down and ranked. Fix order, by what a bug there costs the customer:

1. **Lies about money** — the job above is #1. Then: is Titip revenue booked at placement correct?
   (his call, unanswered)
2. **Loses data** — offline drain, half-committed batches. Salesmen on phones in bad signal is the
   normal case here.
3. **Leaks across branches** — bug 3 below.
4. **Blocks day one** — first login, first product, first staff member, first sale, first EOD.
5. Everything else, appearance included.

Full reasoning, options and what was ruled out: `A-Brain/Brainstorm/2026-09-08_shipping-readiness.md`.

### ANSWERED 2026-09-08 — the emulator is BUILT, see the recipe above the fold

*"okay sure make the emulator for better efficiency for both of us i guess"* — done in `37f34ee`,
proven end to end: sign-in completes, the Dashboard renders the seeded company, and the layout was
checked at desktop and 375x812. Nothing to decide here any more; just use it.

⚠️ The dev door onto `window` is guarded by five assertions, two of them RED-trialled. Do not
loosen the gate to make something convenient work — it needs BOTH `import.meta.env.DEV` and
`VITE_USE_EMULATOR`, and only vite's `httpdev` mode sets the second. `npm run dev` must keep talking
to the live project, because that is what Aldi's phone testing measures.

### Bug 3 — the geofence bypass goes to the owner, globally

His rule, 2026-09-08: *"every geofencing bypass approval is the responsibility for each regional
admin and each regional admin only have responsibility to approve or reject the bypass for their own
team inside their regional area only other tier shouldnt be receiving this"*, plus *"make sure that
there is only 1 request each time, salesperson should not be able to spam the request"*.

* `src/MerchantSalesView.jsx:822` writes to `gps_bypasses`; `:829` writes the bell with
  `agentId: "ADMIN"`, `linkToTab: "fleet"` — one owner-addressed notification with no region on it.
* `src/FleetCanvasManager.jsx:132` subscribes to the whole collection with no region filter, and the
  approve/reject buttons at `:1073`/`:1084` sit on the owner-only Fleet & Canvas screen.
* `src/MerchantSalesView.jsx:822` calls `addDoc` with no check for an existing PENDING request.

FOUR FILES AT LEAST, over the 3-file rule — name them to him first. And settle before designing:
does a bypass use `canApproveHandoffFrom` (which honours the Fleet & Canvas per-person chips), or a
plain "Tier 4 of that region" rule? His sentence says *regional admin*, not *named approver*, and
those stop being the same set the moment anybody is named. The region must be resolved at WRITE time
and stored on the document, never looked up at read time from a roster that may have moved them.

### The second POV email trap — small, and it gates testing bug 3

`src/FleetCanvasManager.jsx:38` resolves `myProfile` by email, then `:40` feeds `rawLocation` from
it — the branch the whole screen operates as. Under the tier preview it reports Aldi's own branch.
Bug 3 is about routing by region and would be tested by previewing as a Tier 4, so this makes that
test measure the wrong branch. Same one-line shape already fixed at `AgentInventoryView.jsx:53`
(`previewing ? null : ...`); `previewing` is already threaded from App.jsx. Tier 6 has no
`view_fleet`, so reproduce as Tier 3 or 4. Background:
`A-Brain/Wiki/Concepts/POV Changes the Id, Never the Email.md`. Do NOT fix it by making
`previewIdentity` rewrite the email.

### Owed him from fixes already shipped

Tests 1 and 2 PASSED 2026-09-08 (`d84bc4c` hand-off, `9a35e8e` POV). Still unverified by eye:
`cdaabc7`, `967e447`, `83f5041` — the Ecer/consignment sale rules. `adf9560` is a decision recorded
in checks, so there is nothing on screen to look at.

**Bug 4 is ANSWERED and closed — do not reopen.** No tier floor on a named approver: *"since the one
who can edit the fleet and roster is tier 3 and above then we dont need any floor for this, let the
company decide and make it most flexible"*. A rank test on the `named` branch of
`canApproveHandoffFrom` looks like a missing check and is a reversal — six assertions go red if one
is added, two of which predate the question. Reopens only if `defaultFleetAccess` stops cutting at
Tier 4, because that gate is what makes no-floor safe.

### HQ 3 and HQ TEST are Ecer consignments already written

`967e447` and `83f5041` stop new ones. Neither touches the Rp 1.000.000 against HQ 3 or the
Rp 1.055.000 against HQ TEST. His money, his call, and he was told it would not be touched without
him naming it. The HQ 3 hand-off request also still reads APPROVED with the shop never moved —
`cdaabc7` stops new ones lying, it does not repair that record. Do NOT register HQ 3 as a shop: an
earlier session said to, which was wrong by his own design — an Ecer sale is a person, not a store.

### Round 7 is unfinished, and C4 is untestable

Section B PASSED. Section D of `MANUAL_TEST_CHECKLIST.md` has never been run. C4 needs two different
Bandung people; BANDUNG has exactly one account, `kaldi0470@gmail.com`, used as both receiver and
named approver. Ask him to create the second account. The displacement rule is asserted in
`logicFixes.selfcheck.mjs` as of `adf9560`, so it is checked in code meanwhile. Also owed: F, the
Tier 1 half of the `994d3d6` vault-grace fix — unlock the vault, return inside five minutes, confirm
no PIN prompt.

### Housekeeping

* `returnTotal` is written at `useTransactionEngine.js:535`, `:612`, `:633` and read by no money
  calculation. Related to the job above; check whether it should be.
* `AgentProfileView.jsx:1333` uses the `-top-2 -right-2 animate-ping` geometry that shook the
  Hand-offs tab strip. Check whether its parent scrolls; if it does, `a8fea37`'s inset is the fix.
* The tutorial book: the close button at `PonderBook.jsx:1025` does nothing (prime suspect is the
  scrim at `:1103` swallowing the click — verify with `document.elementFromPoint`), plus an
  unlocated white vertical line. Two audit checks guard the Ponder scene splits — search
  `strandedBeats` in `integration.audit.mjs`, do not weaken them. Appearance, so it waits.

</details>
