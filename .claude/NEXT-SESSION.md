# Next session — one job

Copy the block below. It is the only thing on this page you should paste.

---

Job: Product Performance reports unpaid consignment as finished revenue. Split it, and decide what
the months already written are allowed to say.

ALDI'S REPORT, verbatim 2026-09-05: *"this shouldnt be categorize as sales yet, because it is
account receivable and customer can also return the good right so there should be another parts of
the panel saying that there are account receivable pending in some stores but also finished sales as
well"*. His screenshot shows Rp 1.229.000 presented as revenue when most of it is unpaid `Titip`.

IT IS NOT A PANEL FIX. THE PANEL NEVER SEES A TRANSACTION. `ProductPerformancePanel.jsx:44` reads a
pre-aggregated monthly rollup document through `statsPath(...)`, deliberately - reading a year live
off `transactions` is thousands of document reads and Aldi pays for every one. The merge happens
long before the panel:

  - `src/utils/salesRollup.js:88-90` - `salesDelta` accumulates `{ qty, revenue }` per product and
    nothing else. There is no paymentType dimension anywhere in the rollup.
  - `src/utils/salesRollupWrite.js:37-38` - writes exactly those two fields into `byProduct` and
    `byDay`.

So the split is created at WRITE time and carried through: `salesRollup.js` splits the delta,
`salesRollupWrite.js` increments the new fields, `sumRange` carries them, and the panel plus
`ponder/stages/ProductPerformanceTable.jsx` render two figures instead of one. THAT IS FIVE FILES,
over the 3-file rule - name them to Aldi before starting, do not discover it halfway.

CHECK THIS BEFORE DESIGNING ANYTHING. Does a later `CONSIGNMENT_PAYMENT` also enter the rollup? Look
at `SALE_TYPES` in `salesRollup.js:42-46`. If a Titip sale books revenue at placement AND its
payment books revenue again, the panel is already double-counting, and that is a separate and larger
money bug that must be settled first. Settle this question before writing a line.

THE TRAP THAT MAKES A LAZY BUILD WRONG - HISTORICAL ROLLUPS HAVE NO SPLIT. Every month already
written carries only `{ qty, revenue }`. Add the new fields and past months silently report zero
receivable and 100% finished sales: a confident wrong number, which is worse than today's honest
merge. Decide explicitly and tell Aldi which you chose - backfill from `transactions`, or label
pre-change months as "not separated" in the UI. Do not let old documents answer a question they were
never asked.

RETURNS ARE PART OF HIS SENTENCE. He said "customer can also return the good right". There is a
related open bug in the queue below - `returnTotal` is written at `useTransactionEngine.js:492`,
`:569` and `:590` and read by no money calculation. Check whether the rollup fix needs it before
treating them as separate jobs.

Leave the fix in `src/config/logicFixes.selfcheck.mjs`: slice each assertion to its own anchors,
assert the anchors were FOUND before slicing, re-run the arithmetic on real numbers, and trial it RED
before green. Copy the modified source files aside and `git checkout --` them rather than stashing -
a stash can take the check file with it, and then the trial cannot fail and proves nothing.

BEFORE ANYTHING ELSE, CHECK THIS IS DONE. The deployed login was blocked by the browser, not by a
setting: the app sat on kpm-ang.vercel.app while the Google handshake happened on
cello-inventory-manager.firebaseapp.com, and Brave/Safari block one site reading the other s cookie.
Fixed in code (vercel.json + firebase.js), but it needs TWO steps in this order, and Aldi may not
have done them yet:
  1. Google Cloud Console -> APIs & Services -> Credentials -> the Web client -> Authorized redirect
     URIs -> add https://kpm-ang.vercel.app/__/auth/handler
  2. THEN push the branch so Vercel rebuilds.
Pushing first breaks sign-in on that link for everyone. Ask him which step he is on before
diagnosing any login report. Full write-up: A-Brain/Wiki/Concepts/The Cross-Site Login Block.md

NOT PART OF THIS JOB, but know it: the demo link is LIVE. Aldi turned off Vercel Deployment
Protection and added the domain in the Firebase console himself on 2026-09-06, and `curl` confirms
`kpm-ang.vercel.app` answers 200 with no redirect. Real accounts work through Fleet & Canvas using a
person's Google address - there is no self-signup and none is needed.

The hand-off feature shipped across four commits that day and is NOT verified visually. If he reports
anything odd about the picker, the Fleet approval chips or the approval queue, read
`A-Brain/Wiki/Concepts/Handoff Eligibility.md` FIRST - it records that approval was briefly built on
the permission matrix per TIER, which he rejected, and why the per-person version replaced it. Do not
re-propose the tier version on the strength of his older words about "the matrix".

Then rewrite `.claude/NEXT-SESSION.md` with the next single job.

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Bug 2 — PROMOTED, it is the job above.

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
