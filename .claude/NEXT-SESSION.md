# The one job for next session

/alucard

**Stock Opname: count a difference TWICE before HQ ever sees it.**

Findings 1 and 2 shipped on 2026-08-21. This is the next one on the ranked list, and it is the
cheapest thing on that list with the largest effect on whether a count can be trusted.

## What happens today

`src/StockOpnameView.jsx` — the agent types a good count and a damaged count, the row shows
`MATCH` or `DIFFERENCE`, and `handleCommit` sends every counted row straight to HQ with
`status: 'PENDING_HQ_APPROVAL'`. A difference of one pack and a difference of two hundred travel
the same path and land in the same queue.

## Why that costs Aldi money

Most count differences in a real warehouse are **miscounts, not theft** — a row skipped, a carton
counted as a slop, a number typed into the wrong box. Today every one of those reaches HQ as a
naked number with no cause, HQ approves it, and `increment(counted - expected)` writes the
miscount into the real stock. The wrong figure then becomes the expected figure for the next
count, so one bad count poisons the next one.

## The smallest fix

When a row's variance is not zero, **hand that row back for a second count before it can be
submitted** — clear the boxes, ask for the number again, and only escalate to HQ if the second
count disagrees with the system too. Recounting one row costs the agent thirty seconds; it removes
the majority of false variances before anyone acts on them.

Then, if there is room in the same session: a **cause for the variance**, picked the same way the
damage kinds now are — miscount · unrecorded sale · breakage · theft · supplier short. The damage
reel built on 2026-08-21 is the pattern to copy; do not invent a second one.

## The trap that makes a lazy version wrong

**Do not re-read the expected figures when the row is recounted.** They are snapshotted on the
first keystroke (`expStock` / `expDamaged` in `counts[id]`, set in `handleCountChange`) precisely
so a sale landing mid-count cannot move the target. A recount that refreshes the snapshot
re-opens the bug that was just closed, and it will look like it is working.

**And keep the tier rule.** `showExpectedWhileCounting` (`canSeeExpectedCount`, tier 3 and above)
decides whether the figures are visible while counting at all. Below that the agent counts blind —
so for those tiers the recount prompt must not leak the expected number by saying what is wrong
with it. Say "count this one again", never "you are 5 short".

## Verify

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```
Currently 599/599 and 519/519. Leave a line in `logicFixes.selfcheck.mjs`: one regression guard
(a non-zero variance cannot reach `addDoc` on the first pass) and one behaviour check (the maths
on real numbers). Prove the check fails before trusting it.

**When you finish, rewrite this file with the next single job.**

<details>
<summary>The rest of the queue — do not paste this, it is here so the next session knows what to promote</summary>

- **Stock Opname finding 3** — legacy audits overwrite instead of adjusting
  (`StockOpnameView.jsx`, the `hasSnapshot` fallback). I recommend skipping; Aldi has not answered.
- **Stock Opname finding 4, the rest of the redesign** — variance thresholds so small differences
  auto-accept instead of drowning HQ · counting **sessions** (pick a shelf, count it, close it,
  resume tomorrow) · freeze the SKU while a session is open · barcode scan jumping to the row ·
  ABC cycle counting last. Sessions are also the only real fix for the phone list being long.
- **TIER 1 = ONE PROFILE, stages B and C** — B copies the van's `activeCanvas`,
  `allowedPayments`, `allowedTiers` onto `master_owner` after a backup; C deletes `ADMIN_VEHICLE`.
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
