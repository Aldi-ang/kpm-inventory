# Next session — one job

Copy the block below. It is the only thing on this page you should paste.

---

Job: a consignment hand-off can be offered to the wrong person. Build the eligibility rule Aldi
gave, and refuse it at the write as well as in the dropdown.

ALDI'S RULE, verbatim, 2026-09-05:

  "consignment should only be transferred between regional team member only, and only tier 1,2,3 is
   the one who can transfer consignment between regional area personnel"

  Asked whether tiers 1-3 SEND across regions or only APPROVE such a move, he answered with a third
  design and it is the one to build:

  "regarding the approval for the consignment there should be option in the matrix for what tier
   that can receive and approve the consignment and also which is the region selected to receive
   from this way it would increase flexibility for who can have the power of the approval for
   specific area or areas, but on default their own regional admin is the only one who can do that,
   if we put this power towards the upper tier for all region then there will be massive loads of
   approval notification bells coming to the upper tier, thats why i think regional selecting is
   important in this matter"

  So: approval authority is CONFIGURABLE per tier, and scoped to chosen REGIONS. Default is the
  agent's own regional admin and nobody else. His reason is load, not policy - granting an upper
  tier every region buries them in approval bells.

THE PART THAT IS SMALLER THAN IT LOOKS:

  The permission matrix is ALREADY runtime-editable. `src/config/permissions.js:109` is
  `export let ROLE_PERMISSIONS` - a mutable binding - and `src/App.jsx:467` downloads custom
  permissions from Firebase at startup and overwrites it. So this is two new permission keys plus a
  region scope, NOT a new configuration system.

THE DATA SHAPE - DECIDED BY ALDI, 2026-09-05. Do not re-propose the cheap version:

  "no i want all the region the be registered on the matrix, because if there is only 2 option all
   or own regional approval means that there are only 2 option to choose floods or drip of water,
   the system that i want to make is to have power to choose 1,2,3,4 or whatever regional number
   that i want to receive notification and approval from"

  So: EVERY region is listed in the matrix, and a tier gets an arbitrary SUBSET of them. Not a flag,
  not own-vs-all. String flags like `approve_consignment_own_region` are REFUSED - he named the
  reason himself, they offer only "flood or drip" with nothing in between.

  That means a per-tier region list living beside the existing string array. `ROLE_PERMISSIONS` maps
  each tier to a flat array of strings today and every reader assumes that shape, so the Firebase
  document, the settings screen and every reader have to agree on the new field. That cost is
  accepted; it is the price of what he asked for.

  TRAP - the region list is DATA, not a constant. `ConsignmentFinanceView.jsx:29-32` derives
  `uniqueLocations` from the motorists' `location` field, upper-cased and trimmed, with `UNASSIGNED`
  as a real value. So the matrix has to enumerate the regions that actually exist, pick up a new one
  the moment an agent is given a new location, and cope with a tier whose saved list names a region
  that no longer has anyone in it. A hardcoded region list will look right on the day it is written
  and rot silently.

WHAT THE CODE DOES NOW — verified 2026-09-05, lines current:

  - `src/ConsignmentFinanceView.jsx:36-52` `dropdownAgents` is the target list. It filters
    `m.userRole !== 'ADMIN'`, then by `activeRegion` ONLY when the admin region control is set, then
    by the typed search. So for a field agent it is effectively EVERY non-admin agent in the company,
    in any region.
  - Nothing excludes the agent who already owns the store. That is the bug Aldi hit first: he could
    offer the hand-off to the person already holding it.
  - "mobil pak boss" could not be picked because it is an ADMIN-role profile and `m.userRole !==
    'ADMIN'` removes it. That part is working as written — but Tier 1 having two profiles means the
    dropdown silently hides one of them with no explanation, which is why it read as broken.
  - `src/App.jsx` `handleRequestTransfer` writes the request with NO eligibility check of any kind.
    That is the write path and it must refuse too.

THE SMALLEST FIX:

  One predicate — call it `canReceiveHandoff(fromAgent, toAgent, tier)` — used in BOTH places:
  `dropdownAgents` to hide ineligible targets, and `handleRequestTransfer` to refuse them. Do not
  put it only in the dropdown; hiding a control leaves the handler open, which is the "UI Says Yes,
  Server Says No" pattern already in the vault and already the reason the delete guard exists.

  Exclude the current owner using the ownership the hand-off work already added: the customer
  document's `ownerAgentId`, falling back to the agent stamped on the store's rows when a store has
  never been handed over. Do NOT use `mappedBy` — it records who first registered the store and
  `handleRequestTransfer` still reads it to tell two same-named shops apart.

TRAPS:

  - Region lives on the motorist as `location`, upper-cased and trimmed at
    `ConsignmentFinanceView.jsx:29-32`. `UNASSIGNED` is a real value, not an absence — decide
    whether an UNASSIGNED agent can receive anything at all, and say which you chose.
  - An ADMIN sender has `agentProfileId === null` and `fromAgentId === 'ADMIN'`. Any region
    comparison against an admin will compare against undefined unless handled first.
  - More than 3 files touched means stop and name each one before continuing.

Leave the fix in `src/config/logicFixes.selfcheck.mjs` the way `4bb9ad7` did: slice each assertion
to its own anchors, assert the anchors were FOUND before slicing, re-run the predicate on real
agents, and trial it RED before green — stashing ONLY the source files, never the check file
itself, or the trial cannot fail and proves nothing.

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
