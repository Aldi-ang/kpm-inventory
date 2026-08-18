# NEXT SESSION — copy the block below, paste it, go

---

Show the admin the gap. The EOD count now decides the report (`d859d41`) and a short count becomes
a bounty on approval (`7f96d19`), and the confirmation names the rupiah — but the report CARD in
the approval list still shows only one set of numbers. No decision is needed from Aldi for this
one; he has already ruled. This is presentation.

WHERE: `src/EODReconciliationView.jsx`, the admin's list of reports awaiting approval — the block
that renders each report card (search for `reportType === 'BOUNTY'` styling, the cards are around
there). Read the file, do not trust line numbers.

WHAT THE REPORT ALREADY CARRIES, so nothing has to be computed or stored:
`cash` / `expectedCash` · `transfer` / `expectedTransfer` · `remainingStock` / `expectedStock` ·
`cashVariance` · `transferVariance` · `goodsShort` · `countStatus` ('DISPUTED' or 'CLEAN').

WHAT TO SHOW: expected, counted, and the difference — side by side for cash and for transfer. For
goods, name the PRODUCTS that came up short, not a single total. That rule is already written into
this screen's own comments in Aldi's words: *"a single goods total hides a one-product shortfall"*,
which is why the goods card counts line by line in the first place. `expectedStock` and
`remainingStock` are both arrays of van rows with productId, name, qty and unit, so the short
products are a comparison of the two, in the row's own unit.

THE TRAP, and it is the whole job: **a DISPUTED report must be impossible to approve by reflex.**
The number being on the card is not enough — the count was always recorded, and being recorded and
being seen is exactly the difference this whole piece of work is about. The disputed state has to
change the card itself: its heading, and the approve button's own words. The BOUNTY cards on this
same screen already do this (red border, a BOUNTY CLEARANCE badge) — match that treatment rather
than inventing a new one, and read `A-Brain/Wiki/Concepts/Aldi's Design Taste.md` before choosing
colours. Palette law: no blue, no green; slate IS the blue; gold never as text on light.

Second trap: older reports have no `countStatus` at all, because they predate the field. A missing
`countStatus` is CLEAN — never paint history as disputed. Put a fixture with no `countStatus` in
the behaviour check.

Third: this screen is used on a phone. Four numbers side by side is a desktop layout. Check the
narrow width, and if it does not fit, stack expected-over-counted rather than shrinking the type.

CONTEXT ALREADY ESTABLISHED, do not re-derive: minting is `PENALTY_EOD_<reportId>` on the agent's
`cukaiDebts`, assigned not added, so a double-approve cannot charge twice. Repayment already works
end to end: the WANTED board sums every `PENALTY_` key and a `BOUNTY` clearance report from the
agent's own EOD screen clears them. Do not rebuild either. Backlog source:
`A-Brain/Backlog/What the agent counts at EOD is never used for anything.md`.

Verify chain, paste the numbers:
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/eodRecord.selfcheck.mjs
Expected: build clean, 599/0, 269/0 plus whatever you add, 12/12.

When it is committed, rewrite this file (.claude/NEXT-SESSION.md) with the NEXT single job.

---

<details>
<summary>Queue behind it — for the next session to promote from, not to paste</summary>

- **Merge to main — the LAST job.** Aldi, 2026-08-18: *"we might it later if we done with
  everything"*. 538 commits on `phase0-solid-ground`, branch NOT behind main, so it is clean. Two
  checks before, one after.
- Test results: https://claude.ai/code/artifact/a42ce819-9d1a-46a8-8ae8-0291df6765ef — if he sends
  back a BROKEN item, it outranks everything here.
- What a missing PACK is worth in rupiah — needed before a goods shortage can become a fine like a
  cash one does. His decision, not a code question.
- `The app day rolls over at 7am instead of midnight.md` — money verified unaffected.
- `Three screens he asked to redesign - Sampling, Customers, Stock Opname.md`
</details>
