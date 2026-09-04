# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

**Shipped 2026-09-05:** the bounty-unit fix (`9e2e5a3`). **Aldi answered the transfer question the
same night**, so the store hand-off is unblocked and is the job below.

---

```
Job: a store hand-off must stop rewriting sales history. Build the shape Aldi chose.

HIS DECISION, verbatim, 2026-09-05:
  "then andi and budi but andi should be view only and budi can edit the value and of course add
   history on the receipt the hands off thats tell Andi -> Budi"

Read as three requirements:
  1. BOTH agents see the store's old sales. Neither dashboard loses them.
  2. The agent who RECEIVES the store sees them VIEW-ONLY. The agent who MADE the sales keeps the
     right to edit their values.
  3. The hand-off is recorded and visible on the receipt / history, naming both sides.

WHAT THE CODE DOES NOW - verified 2026-09-05, line numbers current:

  - src/App.jsx:1746-1749 - on approval, every past transaction of that store is updated with
    { agentId: request.toAgentId, agentName: request.toAgentName }. The old value is overwritten,
    not kept. That is what requirement 2 makes impossible: you cannot say "the seller may edit and
    the receiver may not" once the record says the receiver was the seller.
  - src/ConsignmentFinanceView.jsx:59 - const matchId = agentProfileId && t.agentId === agentProfileId.
    Receivables are scoped by the agent stamped on each transaction. THIS is why the rewrite exists:
    it is the only thing that currently hands the store's outstanding debt to the new agent. Delete
    the rewrite without replacing this path and the new owner cannot see or collect that debt - a
    worse bug than the one being fixed, in an app Aldi is preparing to sell.
  - The transfer request already pins customerId when the sender's own ownership can single one shop
    out, and the rewrite is filtered by heldBySender, so same-named twins no longer move. Keep both.

THE SHAPE TO BUILD:

  a. Stop the rewrite. Past sales keep the agent who made them.
  b. Give the receivables view a SECOND way to find a store's rows: by the store's CURRENT OWNER,
     not only by the agent stamped on each row. Rows reached that way are read-only for the
     receiver; rows he made himself stay editable.
  c. Write the hand-off onto the store record (from, to, date) and render it as a line in the
     receipt / history.

TRAPS THAT MAKE A LAZY BUILD WRONG:

  - VIEW-ONLY MUST BE REFUSED AT THE WRITE, not hidden in the UI. Hiding an edit control leaves the
    write path open - the "UI Says Yes, Server Says No" pattern already in the vault
    (A-Brain/Wiki/Concepts/UI-Says-Yes-Server-Says-No Pattern.md). The handler must refuse it too.
    firestore.rules is a DRAFT: propose the rule, never run firebase deploy.
  - mappedBy is NOT a spare field. App.jsx uses c.mappedBy === fromAgentName at request time to tell
    two same-named shops apart, and it records who first registered the store. Do not repurpose it
    as "current owner" without checking that caller.
  - The arrow in his sentence reads "Andi -> Budi" while the example he answered had Budi handing the
    store TO Andi. Build it as a rule about ROLES - receiver view-only, seller keeps edit - and let
    the receipt render whichever two names apply. Ask him which way the arrow reads when the line is
    actually drawn.
  - More than 3 files touched means stop and name each one before continuing.

Leave the fix in src/config/logicFixes.selfcheck.mjs the way 9e2e5a3 did: slice each assertion to its
own anchors, assert the anchors were FOUND before slicing, re-run the arithmetic on real numbers, and
trial it RED before green. At minimum: approving a transfer must leave every past transaction's
agentId unchanged, and the receiving agent must still reach the store's debt.

Then rewrite .claude/NEXT-SESSION.md with the next single job.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### C — damaged goods handed back are still billed

`returnTotal` is written at `useTransactionEngine.js:492`, `:569`, `:590` and read by no money
calculation — seven hits in `src/`, zero reads in a balance. `ConsignmentFinanceView.jsx:204`
subtracts `amountPaid` alone, while the loop below it DOES remove the returned packs from the shelf.
The goods leave and the bill stays. Real rupiah, hits the customer's customer. The Backlog says merge
the two duplicate debt calculators first or the fix lands in three places — untrialled, so count the
call sites before believing it. Trap: a `RETURN` transaction is already saved with a negative total
and subtracts itself; only the return inside a `CONSIGNMENT_PAYMENT` is broken, so a blind fix
double-counts.

### A — Journey Plan reassigns stores by itself

`JourneyView.jsx:561-583`. On screen open, any store whose agent is no longer on staff is
fuzzy-matched to whoever's name partly contains it ("Andika" matches "Andi"), written with
`updateDoc(...).catch(() => {})`, no message. Only fires once an agent name goes stale. Fix is a
review list, not a one-liner.

### Ponder sweep — DONE, do not redo

All five scenes split 2026-09-04. Two audit checks guard it — search `strandedBeats` in
`integration.audit.mjs`. Do not weaken them.

### 7 Days to Die track — separate repo

`C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md` and `NEXT-JOB.md`.

</details>
