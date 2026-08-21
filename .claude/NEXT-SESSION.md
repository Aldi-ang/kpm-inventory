# The one job for next session

/alucard

**A tolerance threshold: stop sending HQ every difference of one pack.**

This is the last piece of Stock Opname. Everything else on that screen shipped 2026-08-21.

## 🔴 BEFORE ANY CODE — ask him the two questions below

**1 · What are the five causes called?** `VARIANCE_REASONS` at the top of
`src/StockOpnameView.jsx` currently reads *miscount · unrecorded sale · breakage · theft ·
supplier short*. **Those are Claude's words, not his.** His standing law is that only he names the
categories in his own trade. A saved record keeps the string it was written with, so renaming
later splits one cause into two forever — settle it **before** agents count with it. A check pins
that the list is still the provisional one; when he renames them that check fails, and that is the
moment to delete the check.

**2 · What size difference is not worth HQ's time?** One pack? Two? A percentage? This is the
whole design input for the job below and he has never been asked. Do not guess a number — ask, and
say why: too low and HQ still drowns, too high and a real shortage slips through unseen.

## What happens today

`handleCommit` in `src/StockOpnameView.jsx` sends **every** counted row to HQ with
`status: 'PENDING_HQ_APPROVAL'`. A difference of one pack and a difference of two hundred land in
the same queue, looking the same.

## Why that costs Aldi money

HQ drowning is not a tidiness problem. A reviewer facing forty rows a week, most of them trivial,
stops reading them — and then approves the one that mattered along with the rest. **An unread
check is worse than no check**, because everyone believes it happened.

## The smallest fix

A row whose difference is within tolerance still gets counted, recounted and given a cause — none
of that changes — but it is marked `autoAccepted: true` and does not sit in HQ's pending queue. It
still writes its `increment(counted - expected)` correction, and it is still on the record, so the
leak detector keeps seeing it.

**Everything above tolerance behaves exactly as it does now.**

## The traps

- **Auto-accepted is not un-counted.** It must still appear in `auditHistory`, or `shortageStreak`
  goes blind and leak detection quietly stops working — the small repeated shortages are precisely
  the ones a leak is made of.
- **Tolerance is on the DIFFERENCE, not on the count.** Two packs out of five is not the same
  event as two packs out of two thousand; if he gives a percentage, apply it to the expected
  figure and keep a floor of at least one pack.
- **Do not let tolerance skip the recount.** The recount is what stops a miscount from being
  written into stock; auto-accepting an unverified number would poison the next count silently.
- **Do not name the difference in any label.** Tiers below 3 count blind.

## Verify

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```
Currently 599/599 and 554/554. Leave lines in `logicFixes.selfcheck.mjs`, and **lift every
constant you assert from the source rather than retyping it** — a threshold retyped into its own
check made a whole block decorative on 2026-08-21 and only a deliberate probe found it. Break the
shipped rule on purpose and watch the check go red before trusting it.

**When you finish, rewrite this file with the next single job.**

<details>
<summary>The rest of the queue — do not paste this, it is here so the next session knows what to promote</summary>

⚠️ **HE HAS NEVER SEEN ANY OF 2026-08-21'S WORK ON A REAL SCREEN.** Six features that day, proven
only by the audit suites and by a prototype he approved by eye. The test checklist is on his own
to-do list: `A-Brain/Backlog/Test the new Stock Opname on a real screen.md`. **Ask whether he has
run it before building more on top.**

⛔ **Dropped on his answers, do not propose again:** counting sessions (a full count takes under 30
minutes), barcode scan (no barcodes on the products), ABC cycle counting (wrong size of business),
and Stock Opname finding 3, the legacy overwrite path (he asked "is 1 damaging?", the answer was
no).

- **TIER 1 = ONE PROFILE, stages B and C** — B copies the van's `activeCanvas`, `allowedPayments`,
  `allowedTiers` onto `master_owner` after a backup; C deletes `ADMIN_VEHICLE`.
  **C before B shows his van as EMPTY.** Stage A is done (`447e3dd`).
- **Tier renames** — `DYNAMIC_TIERS` labels only: T3 `HQ SALES MANAGER`, T4 `REGIONAL ADMIN`,
  T5 `SALES CANVAS`, T6 `SALES MOTORIST`. Never touch the ids in `CORPORATE_TIERS`.
- **TITIP everywhere, never "consignment"** — labels only, code names stay.
- **Reconcile and Clear** — no tier check at `FleetCanvasManager.jsx:1056`; the rules already
  refuse the save, so it is a button that lies rather than lost data. Tier 1 only.
- **The forced Google sign-in** — cause unknown. ⚠️ DANGER: removing `await` from the two
  `deleteDoc` lines at `src/App.jsx:2333-2334` reaches `signOut(auth)` and destroys his sign-in.
- **IOU in the map customer panel** · **wrong agent name on old sales** (a data problem — he must
  decide about repairing old records) · `getCurrentDate()` is UTC in 26 places · Sampling and
  Customers redesigns.
- **Merge to main** — last of all. *"we might it later if we done with everything"*.

</details>
