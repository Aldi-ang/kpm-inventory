# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

**Shipped 2026-09-05:** the bounty-unit fix (`9e2e5a3`). **Blocked:** the store transfer, until Aldi
answers whose dashboard keeps the old sales. **This file now carries the next unblocked one.**

---

```
Job: a store that hands back damaged goods during a consignment payment is still billed for them.
Aldi's standing instruction on this batch: "do all whatever the order as long as there is no
problem when i sell the app and they customer use it." This one overcharges a real customer in
rupiah, so it is the one that matters most for a sold app.

WHAT THE CODE DOES NOW - verified 2026-09-05, line numbers current:

  · An agent audits a consignment store. The stock splits three ways in
    `src/ConsignmentFinanceView.jsx:281-298`: sold (paid for), damaged (handed back, valued into
    `returnTotal`), and still on the shelf.
  · `returnTotal` is passed into the engine at `:313` and written onto the transaction at
    `src/hooks/useTransactionEngine.js:492`, `:569` and `:590`.
  · Nothing that calculates money ever reads it. `grep -rn "returnTotal" src/` returns seven hits:
    three writes in the engine, three in ConsignmentFinanceView on the way IN, and the parameter
    itself. Zero reads in a balance calculation.
  · `src/ConsignmentFinanceView.jsx:204` does `customers[name].balance -= (t.amountPaid || 0)` -
    payment only. The loop right below it DOES subtract the returned packs from the shelf list, so
    the goods leave the store's stock while their value stays on the store's bill.

So: you take the damaged goods back, and you keep charging for them.

WHAT TO DECIDE FIRST - do not start with an edit:

The Backlog write-up says the fix is "subtract `amountPaid + returnTotal`", and says to do it AFTER
merging the two duplicate debt calculators, or the same fix has to land in three places and one
gets missed. That instruction has NOT been trialled against a check, so treat it as a hypothesis.
Find every place that computes a consignment balance before changing any of them. The write-up
names `ConsignmentFinanceView.jsx:105` and `MerchantSalesView.jsx:114` and `:159` as the others -
those three line numbers are from 2026-08-17 and have NOT been re-verified, so locate them by what
the code does, not by the number.

Then bring Aldi the count: "N places compute this balance; the fix lands in N, or in one after they
are merged." Merging duplicated money maths is a bigger change than the subtraction itself, and it
is his call whether to pay for it now.

THE TRAP THAT MAKES A LAZY PATCH WRONG:

A transaction type called `RETURN` already exists and is handled correctly everywhere - it is saved
with a negative total, so it subtracts itself. If you add `returnTotal` to the balance maths
without checking which transaction type you are inside, a plain RETURN could be subtracted twice.
The broken case is only the return that happens INSIDE a `CONSIGNMENT_PAYMENT`.

Leave the fix in `src/config/logicFixes.selfcheck.mjs` the way `9e2e5a3` did: slice each balance
loop to its own anchors, assert the anchors were found, and re-run the arithmetic on real numbers
(a store owing 1.000.000 that pays 400.000 and hands back 100.000 of damage owes 500.000, not
600.000). Trial it red before green.

STANDING CONTEXT:
  · Firestore rules are a DRAFT until Aldi deploys them by hand. Never run `firebase deploy`.
  · The Browser pane does not composite - screenshots and read_page work, real clicks do not.
    See `A-Brain/Wiki/Concepts/Looking at the App.md`.

Then rewrite .claude/NEXT-SESSION.md with the next single job.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### B — the store transfer. BLOCKED on Aldi, do not build it

`App.jsx:1746-1749` rewrites the agent on every past sale when a hand-off is approved. **The
Backlog's "just delete it" fix is wrong** — `ConsignmentFinanceView.jsx:59` scopes receivables by
`t.agentId`, so that rewrite is also what hands the debt to the new agent. Deleting it hides the
store's debt from the agent who now owns it. Correction is written into
`A-Brain/Backlog/Handing a store to another agent rewrites sales history.md` (`514ad69`).
The question Aldi owes: after Budi hands his store to Andi, whose dashboard shows Budi's old sales
for that store — Budi's, Andi's, or both?

### A — Journey Plan reassigns stores by itself

`JourneyView.jsx:561-583`. On screen open, any store whose agent is no longer on staff gets
fuzzy-matched to whoever's name partly contains it ("Andika" → "Andi"), written with
`updateDoc(...).catch(() => {})`, no message. Real, but it only fires once an agent name goes
stale — a rename or a removal. Fix is a review list, not a one-liner.

### Ponder sweep — DONE, do not redo

All five scenes split 2026-09-04. Two audit checks guard it — search `strandedBeats` in
`integration.audit.mjs`. Do not weaken them.

### 7 Days to Die track — separate repo

`C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md` and `NEXT-JOB.md`.

</details>
