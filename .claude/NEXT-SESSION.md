# Next session — one job

Copy the block below. It is the only thing on this page you should paste.

---

Job: damaged goods handed back are still being billed to the store. Find out where the return
value is supposed to land, then make it land there once.

WHAT THE CODE DOES NOW — needs re-verifying, line numbers were current 2026-09-04:

  - `returnTotal` is WRITTEN at `src/hooks/useTransactionEngine.js:492`, `:569` and `:590`, and is
    READ by no money calculation anywhere. Seven mentions in `src/`, zero of them inside a balance.
  - `src/ConsignmentFinanceView.jsx:204` subtracts `amountPaid` alone when reducing a store's
    outstanding debt. The loop directly below it DOES remove the returned packs from that store's
    shelf. So the goods physically leave the shop and the bill for them stays.
  - Real rupiah, and it lands on the warung owner — the customer's customer.

THE TRAP THAT MAKES A BLIND FIX WRONG:

  A standalone `RETURN` transaction is ALREADY saved with a negative total, and already subtracts
  itself correctly. Only the return that happens INSIDE a `CONSIGNMENT_PAYMENT` is broken. Add the
  return value to both paths and you double-count every standalone retur — a second money bug, in
  the opposite direction, that is harder to spot because the number moves the way people expect.

BEFORE EDITING:

  The Backlog says to merge the two duplicate debt calculators first, or the fix has to land in
  three places. That claim is UNTRIALLED. Count the call sites yourself and report the number
  before touching anything — if it is one place, do not merge anything.

  More than 3 files touched means stop and name each one before continuing.

Leave the fix in `src/config/logicFixes.selfcheck.mjs` the way `39cd90d` did: slice each assertion
to its own anchors, assert the anchors were FOUND before slicing, re-run the arithmetic on real
numbers, and trial it RED before green. At minimum: a consignment payment that includes a retur
must reduce the debt by payment PLUS return value, and a standalone retur must still reduce it
exactly once.

Then rewrite `.claude/NEXT-SESSION.md` with the next single job.

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### A — Journey Plan reassigns stores by itself

`JourneyView.jsx:561-583`. On screen open, any store whose agent is no longer on staff is
fuzzy-matched to whoever's name partly contains it ("Andika" matches "Andi"), written with
`updateDoc(...).catch(() => {})`, no message. Only fires once an agent name goes stale. Fix is a
review list, not a one-liner. Note: this is the same family as the hand-off bug fixed in `39cd90d`
— code deciding on its own who owns a store — so read
`A-Brain/Wiki/Concepts/Ownership Moves, History Does Not.md` before designing the fix.

### Arrow direction — ANSWERED 2026-09-05, do not ask again

*"if budi to andi then Budi -> Andi"*. Sender on the left, receiver on the right. That is what
`39cd90d` already renders. Nothing to change.

### Ponder sweep — DONE, do not redo

All five scenes split 2026-09-04. Two audit checks guard it — search `strandedBeats` in
`integration.audit.mjs`. Do not weaken them.

### 7 Days to Die track — separate repo

`C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md` and `NEXT-JOB.md`.

</details>
