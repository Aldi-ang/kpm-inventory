# The one job for next session

/alucard

**Fix the clock. It is the smallest job on the roadmap and it blocks two of the next three.**

## What is wrong

Two separate bugs that compound:

1. **The app day rolls over at 7am**, not midnight.
2. **`getCurrentDate()` works in UTC in 26 places.** Jakarta is UTC+7, so anything recorded before
   7am local time is filed under the *previous* day.

## Why it is first

The next two features both divide by days:

- **Suggested order quantity** — `average daily sales × lead time + safety stock`. Both terms are
  per-day. Wrong day boundaries, wrong suggestion, and it looks authoritative while being wrong.
- **Accuracy and shrinkage panel** — grouped per month, per branch.

Build either on the broken clock and the numbers are wrong at the edges, quietly, forever.

## The traps

- **Two bugs, not one.** Fixing the timezone without deciding the day boundary leaves it half
  broken. Decide the boundary first: is a KPM business day midnight-to-midnight, or does the 7am
  roll exist for a real operational reason? ❓ **ASK HIM — do not assume it is a bug.** An agent
  starting a route at 6am may be the reason it is there.
- **26 call sites.** Fix `getCurrentDate()` itself, not the callers. One helper, one timezone.
- **Old records keep their old stamps.** A date written yesterday under the old rule does not move.
  Decide whether history is repaired or left alone, and say which in the commit.
- **EOD, Stock Opname and the arrival check all stamp dates.** Check all three after the change.

## Verify

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```
Currently **599/599** and **594/594**. Leave checks behind, lift every constant from source rather
than retyping it, and **break the shipped rule on purpose and watch the check go red before
trusting it** — that probe is what proved the arrival-check suite real on 2026-08-23.

**When you finish, rewrite this file with the next single job.**

<details>
<summary>The rest of the queue — do not paste this, it is here so the next session knows what to promote</summary>

📄 **The full roadmap is `A-Brain/Wiki/Concepts/The Eight Warehouse Gaps.md`** — eight ranked gaps,
the build order, and what was deliberately rejected. Read that before proposing anything new.
Build order: **G7 clock → G6 damaged route home → G3 suggested order qty → G5 accuracy panel →
G1 batch identity → G2 expiry/FEFO → G4 ids instead of names.**

🔴 **TWO THINGS ALDI STILL OWES AN ANSWER ON:**
1. **The five shortage cause words** in `VARIANCE_REASONS` at the top of `src/StockOpnameView.jsx`
   are still Claude's placeholders. He settled the SHAPE on 2026-08-23 — a short main list plus a
   "Lainnya" second level, **no free typing by the regional admin** — but never named the words.
   Drop "kiriman kurang / supplier short" from the list: the arrival check now catches that at the
   door. Also open: should the list flip to surplus-only causes when the count is OVER?
2. **Do old-year excise bands (pita cukai) have a legal cut-off?** Decides whether gap G8 exists at
   all. His supplier or Bea Cukai, not a search engine.

⚠️ **NOT SEEN ON A REAL SCREEN:** the arrival check (`4a781e6`) and everything from 2026-08-21.
The in-app browser will not load the dev server's self-signed certificate, so this needs his own
Chrome. Checklist: `A-Brain/Backlog/Test the new Stock Opname on a real screen.md`. **A green suite
is not a working screen** — that lesson is two days old and cost an afternoon.

⛔ **Rejected, do not propose again:** counting sessions · barcode scanning (no barcodes) · ABC
cycle counting (a full count takes under 30 min) · bin/rack locations · demand forecasting ·
automatic reordering without a person in the loop · Stock Opname finding 3, the legacy overwrite
path.

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
- **A sale can be booked to the wrong store** · **Opening Journey Plan can reassign stores** ·
  **confirming a shipment twice** (FIXED 2026-08-23 in `4a781e6`) · **IOU in the map customer
  panel** · **wrong agent name on old sales** · Sampling and Customers redesigns.
- **Merge to main** — last of all. *"we might it later if we done with everything"*.

</details>
