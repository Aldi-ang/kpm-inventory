# Next session — one job

Copy the block below. It is the only thing on this page you should paste.

---

Job: build the hand-off APPROVAL matrix — which tier approves a consignment hand-off, and for
which regions. The SENDING half already shipped (`dace958`); this is the other end.

⚠️ ONE ANSWER IS OWED BEFORE ANY CODE. If Aldi has not answered it in this session, ask it first
and build nothing until he does — the two answers produce different notification targets and
different button gating, so guessing wrong means building it twice.

  THE QUESTION: today the approval bell is written with `agentId: 'ADMIN'` and Aldi is the only
  person in the company who can authorise a hand-off. When he gives a tier approval power over a
  region, does that tier REPLACE him as the approver for those hand-offs, or get ADDED beside him?

  Replace matches his stated reason — he asked for this because granting an upper tier every region
  means "massive loads of approval notification bells". But replace also means he stops seeing
  hand-offs in any region he delegates, and a delegated region whose approver never logs in leaves
  requests stuck with nobody told. A third option is priced: replace, with him as a fallback after
  a delay.

  The three options with their costs are in
  `A-Brain/Brainstorm/2026-09-06_handoff-approval-region-matrix.md`. Read that note, not this
  paragraph — it also carries his verbatim words and the paths already rejected.

ALREADY DECIDED IN THAT NOTE. Do not re-propose these:

  - THE CARRIER: one array entry per region inside the existing `ROLE_PERMISSIONS[tier]` string
    array, prefixed — `handoff_region:JAKARTA`, `handoff_region:BANDUNG`. He refused a two-value
    all-vs-own-region setting in his own words ("floods or drip of water"); one entry per region IS
    the arbitrary subset he asked for. A new top-level field beside the array would mean teaching
    the Firebase document, the settings screen and every reader a second shape for no gain.
  - THE DEFAULT when he has configured nothing: a PER-PERSON region match, not a tier-wide grant.
    A T4 REGIONAL ADMIN approves hand-offs whose store sits in their own `location`, and no other
    region. Tier 1 always approves everything, so his own live flow is untouched until he
    configures a region.

WHAT THE CODE DOES NOW — verified 2026-09-06, lines current:

  - `src/App.jsx handleAgentAcceptTransfer` writes the approval bell with `agentId: 'ADMIN'`. One
    recipient, always, whatever the store's region.
  - `src/App.jsx:1768` `handleAdminApproveTransfer` is the write. It has no approver check at all.
  - `src/ConsignmentFinanceView.jsx:326` `adminPend` lists every `PENDING_ADMIN` request with no
    filter on who is looking; Authorize/Reject sit at `:1080-1081`.
  - `src/components/SettingsView.jsx:1506` `PermissionMatrixEditor` receives only
    `{db, appId, userRole, userId}` — the live region list has to be passed down to it.

FOLLOW THE SHAPE THAT ALREADY WORKS. `handoff_cross_region` in `src/config/permissions.js` was
added yesterday for the sending half and is the template: ABSENCE OF THE KEY MEANS "use the tier
default", never "no". `injectDynamicPermissions` replaces a saved tier's list wholesale, so a
brand-new key is simply missing from the matrix Aldi has already deployed to Firebase — read as a
plain missing permission it means "no", and the feature looks broken for every tier while the code
is right. Four keys in that file already do this; copy one.

TRAPS:

  - THE REGION LIST IS DATA, NOT A CONSTANT. `ConsignmentFinanceView.jsx:29-32` derives regions
    from the motorists' `location`, upper-cased and trimmed, with `UNASSIGNED` as a real value. The
    matrix must enumerate the regions that actually exist, pick up a new one the moment an agent is
    given a new location, and cope with a saved list naming a region nobody works in any more. A
    hardcoded list looks right on the day it is written and rots silently.
  - GATING ONLY THE AUTHORIZE BUTTON IS NOT THE FIX. `handleAdminApproveTransfer` must refuse too —
    hiding a control leaves the handler open, which is the pattern already named in the vault and
    already the reason the delete guard exists. `handoffEligibility` was built that way yesterday;
    match it.
  - MORE THAN 3 FILES TOUCHED means stop and name each one before continuing. This job plausibly
    reaches four (permissions.js, App.jsx, ConsignmentFinanceView.jsx, SettingsView.jsx) plus the
    self-check — say so before starting, do not discover it halfway.

Leave the fix in `src/config/logicFixes.selfcheck.mjs` the way `dace958` did: slice each assertion
to its own anchors, assert the anchors were FOUND before slicing, re-run the predicate on real
agents, and trial it RED before green. Copy the modified source files aside and `git checkout --`
them rather than stashing — a stash can take the check file with it, and then the trial cannot fail
and proves nothing.

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
