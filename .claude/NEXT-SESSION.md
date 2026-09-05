# Next session — one job

Copy the block below. It is the only thing on this page you should paste.

---

Job: a consignment hand-off can be offered to the wrong person. Build the eligibility rule Aldi
gave, and refuse it at the write as well as in the dropdown.

ALDI'S RULE, verbatim, 2026-09-05:

  "consignment should only be transferred between regional team member only, and only tier 1,2,3 is
   the one who can transfer consignment between regional area personnel"

  Read as two rules. CONFIRM THE SECOND WITH HIM BEFORE BUILDING IT — the sentence carries a real
  ambiguity and guessing wrong is a permission bug in an app he is selling:
    a. A hand-off normally stays inside ONE region. Same `location` on both agents.
    b. Tier 1, 2 and 3 may hand a store ACROSS regions. Unclear whether that means those tiers may
       SEND across regions, or may only APPROVE such a move. Ask; do not assume.

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

### Bug 2 — Product Performance counts consignment as finished sales

`src/components/ProductPerformancePanel.jsx`. Aldi, 2026-09-05: *"this shouldnt be categorize as
sales yet, because it is account receivable and customer can also return the good right so there
should be another parts of the panel saying that there are account receivable pending in some
stores but also finished sales as well"*. A `SALE` with `paymentType === 'Titip'` is goods placed
on a shelf, not money earned — the customer can still return them. The panel must split into
**receivable still outstanding** and **finished sales**, not merge them into one revenue figure.
The screenshot shows Rp 1.229.000 presented as revenue when it is mostly unpaid consignment.
Not yet traced: which query feeds the panel's rows. Start there, do not assume.

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
