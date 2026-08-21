# The one job for next session

/alucard

**Give a stock count DIFFERENCE a cause, the same way damage already has one.**

Recount shipped 2026-08-21, so a difference now survives two counts before HQ sees it. HQ still
receives it as a naked number with no explanation.

## What happens today

`src/StockOpnameView.jsx` — a confirmed difference is saved with `variance`, `countPasses` and
`countedTwice`, and nothing else. HQ opens the audit, sees `-3`, and has to guess whether that is a
miscount, an unrecorded sale, breakage, theft, or a supplier who shipped short.

## Why that costs Aldi money

The cause decides what happens next, exactly as it does for damage: an unrecorded sale is a
bookkeeping fix, breakage is a write-off, theft is a person. Approving a difference without a cause
turns every one of those into the same silent stock adjustment, and the pattern that would have
identified a leak never gets recorded.

Leak detection (shipped) already tells HQ *which* products repeat. The cause tells them *why*.

## The smallest fix

Add a reason picker to a row whose difference has been confirmed, offering:

    miscount · unrecorded sale · breakage · theft · supplier short

**REUSE THE DAMAGE REEL. Do not invent a second control.** `DAMAGE_REASONS` + `.kpm-dmg-*` in
`theme.css` already do exactly this: one box, press the name to swipe down, arrows to step, dots
for the level. Copy the pattern, add a second list. Aldi approved that control by eye on
2026-08-21; a different-looking one on the same screen is the mistake here.

Save it as `varianceReason` on the item in the audit payload, and show it on HQ's review row beside
the existing damage-kind chips.

Then, if there is room: a **tolerance threshold** — a difference of one or two packs auto-accepts
and logs instead of going to HQ. Everything goes to HQ today, so HQ drowns and starts approving
without looking, which is worse than not checking at all.

## The traps

- **Do not put the picker before the recount.** A cause typed on the first guess is a guess. It
  belongs on the row only once `recountState(...).confirmed` or `.disagreement` is true.
- **Do not name the difference in any label.** Tiers below 3 count blind; "explain why you are 5
  short" hands them the number the screen withholds.
- **Store full strings, never short labels.** Same trap the damage kinds have: reports group on the
  stored value, so `"Unrecorded sale"` and `"unrecorded"` become two different causes forever.

## Verify

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```
Currently 599/599 and 543/543. Leave lines in `logicFixes.selfcheck.mjs`, and **lift any constant
you assert from the source rather than retyping it** — a threshold retyped into its own check made
a whole block of checks decorative on 2026-08-21, and only a deliberate probe found it. Break the
shipped rule on purpose and watch the check go red before you trust it.

**When you finish, rewrite this file with the next single job.**

<details>
<summary>The rest of the queue — do not paste this, it is here so the next session knows what to promote</summary>

⛔ **Dropped on his answers, do not propose again:** counting sessions (a full count takes under 30
minutes), barcode scan (no barcodes on the products), ABC cycle counting (wrong size of business).
Stock Opname finding 3, the legacy overwrite path, is **closed** — he asked "is 1 damaging?", the
answer was no.

- **⚠️ HE HAS NEVER SEEN ANY OF 2026-08-21'S WORK ON A REAL SCREEN.** Four features shipped that
  day proven only by audits and by an approved prototype. Ask him to look before building more on
  top of them.
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
