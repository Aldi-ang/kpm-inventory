# Next session — one job

Copy the block below. It is the only thing on this page you should paste.

---

Job: build the hand-off APPROVAL matrix. Aldi has ANSWERED the question that blocked it, so this is
now a build, not a question. The SENDING half already shipped (`dace958` and the commit after it).

HIS ANSWER, verbatim 2026-09-06: *"both still get the bells of course"* - OPTION B. When he gives a
tier approval power over a region, that tier is ADDED beside him. He keeps every bell he has today
and the regional approver gets one too; either can authorise. Do NOT re-argue that this fails to
reduce his bell load. He was told, and chose it anyway.

READ FIRST - it holds the full design and the paths already rejected:
`A-Brain/Brainstorm/2026-09-06_handoff-approval-region-matrix.md`.

ALREADY DECIDED. Do not re-propose:

  - THE CARRIER: one array entry per region inside the existing `ROLE_PERMISSIONS[tier]` string
    array, prefixed - `handoff_region:JAKARTA`, `handoff_region:BANDUNG`. He refused a two-value
    all-vs-own setting in his own words ("floods or drip of water"); one entry per region IS the
    arbitrary subset he asked for. A new top-level field would mean teaching the Firebase document,
    the settings screen and every reader a second shape for no gain.
  - THE DEFAULT when nothing is configured: a PER-PERSON region match, not a tier-wide grant. A T4
    REGIONAL ADMIN approves hand-offs whose store sits in their own `location`, and no other region.
    Tier 1 always approves everything, so his live flow is untouched until he configures something.

TWO THINGS OPTION B OWES THAT OPTION A WOULD NOT:

  1. A DOUBLE-AUTHORISE GUARD. Two people can now reach the same `PENDING_ADMIN` request. The second
     Authorize must find it already approved and say so, not run the approval a second time.
  2. NO DOUBLED BELL FOR HIM. He is Tier 1 and matches every region rule; the notification write
     must send him exactly one.

WHAT THE CODE DOES NOW - verified 2026-09-06, lines current:

  - `src/App.jsx handleAgentAcceptTransfer` writes the approval bell with `agentId: 'ADMIN'`. One
    recipient, always, whatever the store's region.
  - `src/App.jsx:1768` `handleAdminApproveTransfer` is the write. It has no approver check at all.
  - `src/ConsignmentFinanceView.jsx:326` `adminPend` lists every `PENDING_ADMIN` with no filter on
    who is looking; Authorize/Reject sit at `:1080-1081`.
  - `src/components/SettingsView.jsx:1506` `PermissionMatrixEditor` receives only
    `{db, appId, userRole, userId}` - the live region list has to be passed down to it.

FOLLOW THE SHAPE THAT ALREADY WORKS. `handoff_cross_region` in `src/config/permissions.js` is the
template: ABSENCE OF THE KEY MEANS "use the tier default", never "no". `injectDynamicPermissions`
replaces a saved tier's list wholesale, so a brand-new key is simply missing from the matrix already
deployed to Firebase; read as a plain missing permission it means "no", and the feature looks broken
for every tier while the code is right. Five keys in that file do this now - copy one.

TRAPS:

  - THE REGION LIST IS DATA, NOT A CONSTANT. `ConsignmentFinanceView.jsx:29-32` derives regions from
    the motorists' `location`, upper-cased and trimmed, with `UNASSIGNED` as a real value. Enumerate
    what actually exists, pick up a new branch the moment an agent is given one, and cope with a
    saved list naming a region nobody works in any more. A hardcoded list rots silently.
  - GATING ONLY THE AUTHORIZE BUTTON IS NOT THE FIX. `handleAdminApproveTransfer` must refuse too.
    `handoffEligibility` was built that way; match it.
  - MORE THAN 3 FILES means stop and name each one to Aldi before continuing. This plausibly reaches
    four (permissions.js, App.jsx, ConsignmentFinanceView.jsx, SettingsView.jsx) plus the
    self-check. Say so before starting; do not discover it halfway.

Leave the fix in `src/config/logicFixes.selfcheck.mjs`: slice each assertion to its own anchors,
assert the anchors were FOUND before slicing, re-run the predicate on real agents, and trial it RED
before green. Copy the modified source files aside and `git checkout --` them rather than stashing -
a stash can take the check file with it, and then the trial cannot fail and proves nothing.

ALSO OPEN, and not part of this job: two settings only Aldi can flip before anybody else can open
the demo link - Vercel Deployment Protection OFF, and `kpm-ang.vercel.app` added to Firebase
Authorized domains. See `.claude/PROGRESS.md`.

Then rewrite `.claude/NEXT-SESSION.md` with the next single job.

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Bug 2 — Product Performance counts consignment as finished sales (TRACED 2026-09-05)

Aldi, 2026-09-05: *"this shouldnt be categorize as sales yet, because it is account receivable and
customer can also return the good right so there should be another parts of the panel saying that
there are account receivable pending in some stores but also finished sales as well"*. His
screenshot shows Rp 1.229.000 presented as revenue when most of it is unpaid `Titip`.

**It is NOT a panel fix. The panel never sees a transaction.** `ProductPerformancePanel.jsx:44`
reads a pre-aggregated monthly rollup document via `statsPath(...)`, deliberately — a year read
live off `transactions` is thousands of document reads and Aldi is paying for them. The merge
happens long before the panel:

  - `src/utils/salesRollup.js:88-90` — `salesDelta` accumulates `{ qty, revenue }` per product and
    NOTHING ELSE. There is no paymentType dimension anywhere in the rollup.
  - `src/utils/salesRollupWrite.js:37-38` — writes exactly those two fields into `byProduct` and
    `byDay`.

So the split has to be created at write time and carried through: `salesRollup.js` (split the
delta), `salesRollupWrite.js` (increment the new fields), `sumRange` (carry them), the panel and
`ponder/stages/ProductPerformanceTable.jsx` (render two figures instead of one). **That is five
files — over the 3-file rule, so stop and name them to Aldi before starting.**

**THE TRAP THAT MAKES A LAZY BUILD WRONG - historical rollups have no split.** Every month already
written carries only `{ qty, revenue }`. Add the fields and past months silently report zero
receivable and 100% finished sales - a confident wrong number, worse than today's honest merge.
Decide explicitly: backfill from `transactions`, or label pre-change months as "not separated" in
the UI. Do not let old documents answer a question they were never asked.

**CHECK BEFORE DESIGNING:** does a later `CONSIGNMENT_PAYMENT` also enter the rollup? Look at
`SALE_TYPES` in `salesRollup.js:42-46`. If a Titip sale books revenue at placement AND its payment
books revenue again, the panel is already double-counting and that is a separate, larger money bug
that must be settled first.

### Bug 3 — the tutorial book: white line, and the close button does nothing

- **Close button exists** at `src/ponder/PonderBook.jsx:1025`, calls `shut`. It does not respond;
  Aldi closes the book by clicking outside instead. Prime suspect is the scrim at `:1103`
  (`absolute inset-0 ... backdrop-blur-sm`) painting over the button and swallowing the click —
  the same class of stacking fault as the notification bell in `4bb9ad7`. Verify by rendering and
  using `document.elementFromPoint` on the button's centre; do not guess.
- **A white vertical line** on the book background, visible in his screenshot 2. NOT located yet —
  no `bg-white` or `border-white` in `PonderBook.jsx`. Look at the page/spine edges and the
  stage CSS before editing anything.
- ⚠️ Two audit checks guard the Ponder scene splits — search `strandedBeats` in
  `integration.audit.mjs`. Do not weaken them.

### C — damaged goods handed back are still billed

`returnTotal` written at `useTransactionEngine.js:492`, `:569`, `:590`, read by no money
calculation. Trap: a standalone `RETURN` already carries a negative total and subtracts itself;
only the return inside a `CONSIGNMENT_PAYMENT` is broken, so a blind fix double-counts. **More
urgent since `4bb9ad7`** — field agents now have the Store Audit button, so they reach this path too.

### A — Journey Plan reassigns stores by itself

`JourneyView.jsx:561-583`. Fuzzy name match writes a new owner with `.catch(() => {})` and no
message. Read `A-Brain/Wiki/Concepts/Ownership Moves, History Does Not.md` first.

### Aldi's own list

`A-Brain/Backlog/Deploy the store hand-off write rule.md` — his deploy, not yours.

### 7 Days to Die track — separate repo

`C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md` and `NEXT-JOB.md`.

</details>
