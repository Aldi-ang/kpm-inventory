# The one job for next session

Copy the block below. It is the only thing on this page meant to be pasted.

---

/anthropic-skills:caveman ultra, /ponytail:ponytail ultra

The stick count on every EOD report is computed from an empty product list on first paint, and
the memo that computes it never recomputes when the real list arrives. `itemsBks` is written
into the submitted report, so the admin reads a wrong number and nothing warns anyone.

WHERE: `src/EODReconciliationView.jsx`. Read the file, do not trust these line numbers.
- The `agentData` useMemo starts around line 136 and its dependency array is around line 265.
- Inside it, `productMap` is built as `new Map(inventory.map(p => [p.id, p]))`.
- `itemsBks` is around line 217: for each SALE line it looks the product up in `productMap` and
  multiplies by `packsPerSlop` / `slopsPerBal` / `balsPerCarton`, each with a hardcoded fallback
  (`|| 10`, `|| 20`, `|| 4`) when the product is not found.
- The payload writes `itemsBks: agentData.itemsBks` around line 675.

WHAT IS ACTUALLY BROKEN: `inventory` is used inside the memo but is NOT in its dependency array.
The array is `[effectiveId, samplings, transactions, agentCanvas, eodReports, motorists,
agentProfileId]`. On the first render the Firestore listener has not delivered inventory yet, so
`inventory` is `[]`, `productMap` is empty, every lookup misses, and EVERY product silently uses
10 packs per slop, 20 slops per bal, 4 bals per carton. When inventory arrives the memo does not
re-run, because React has no reason to. A product whose real pack maths differs from those three
numbers ships a wrong stick total into the report.

THE FIX: add `inventory` to that dependency array. One word. Do not restructure the memo.

THE TRAP: the component signature has `inventory = []` as a default. When the prop is genuinely
undefined that default mints a NEW empty array on every render, so with `inventory` in the deps
the memo would recompute every render instead of never. Check what App.jsx actually passes for
`inventory` at the `<EODReconciliationView` call site BEFORE you claim the fix is free. If App
passes a stable array from state, adding the dep is correct as-is and you can say so with the
call site as your evidence. If it can pass undefined, say that in your report and let Aldi decide
whether the extra recomputes matter — do not silently add a `useMemo` around the default.

SECOND TRAP: do not "fix" this by deleting the `|| 10` / `|| 20` / `|| 4` fallbacks. A product
genuinely missing its pack fields still has to produce a number, and a crash on the setoran
screen is worse than an approximate one. The fallbacks are correct; firing them for EVERY product
is the bug.

LEAVE A CHECK: `src/config/logicFixes.selfcheck.mjs`, next section is **S26** (S25 is the EOD
submitting gate, taken 2026-08-19). Prove it red before writing the fix — a guard that
`inventory` appears in that memo's dependency array (scope it by slicing the source between
`const agentData = useMemo(` and its closing `}, [`, not a file-wide match), and a behaviour
check that a product with real pack fields and a product missing them produce different stick
totals from the same sale, so the fallback path is proven distinguishable rather than assumed.

Run: `npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs`

CONTEXT ALREADY ESTABLISHED, do not re-derive:
- EOD integration is FINISHED. The count decides the report (`d859d41`), a short count mints one
  PENALTY key per reason on approval (`7f96d19`, `43f8059`), the admin card names the short
  products (`ce70287`), the WANTED board itemises every bounty (`43f8059`).
- `eodBountyLines()` in `helpers.js` is the ONLY place a shortfall becomes rupiah; `tierPrice()`
  beside it is the ONLY place a tier becomes a price. Never compute a fine anywhere else.
- Penalty pricing is a COMPANY SETTING (`appSettings.penaltyPriceTier`, Settings · Company · 05,
  default Retail) — `bf75678`. Aldi sells this app to more than one company.
- Every EOD write on this screen now goes through one `submit(...payloads)` gate holding a
  `submitting` flag (`4c12840`, check S25). Do not add a second write path around it.
- Guards are scoped to the ELEMENT or the BLOCK, never to a string that appears file-wide.

When you finish, rewrite this file with the next single job.

---

<details>
<summary>The queue underneath — promote ONE next time, never paste this part</summary>

✅ **The only thing on Aldi's side — the shakedown test card, 19 tests, still unanswered.**
https://claude.ai/code/artifact/a42ce819-9d1a-46a8-8ae8-0291df6765ef
A BROKEN result on any of them outranks this whole queue. Do not chase him for it.

**New, found 2026-08-19 while fixing the submitting gate:** a failed EOD write notifies, but the
letter has already marched to `stage='sent'` and its Send button has unmounted, so the agent sees
"Waiting on the regional admin" over a submission that never happened. He can recover by
reloading the screen, so it is confusion rather than data loss — but it is exactly the
UI-says-yes-server-says-no pattern in his own vault.

Still open on his confirmed list (items 2, 3, 5, 8, 9, 10 in PROGRESS):
- **Gold ink on a gold plate = 1,00:1 in dark** on the admin side. Plate on the parent, ink on a
  child — that is why audit group 48 missed it. Widen the regex with the fix; S20 has the same
  ceiling written into it.
- **The hardcoded-colour sweep on the OTHER screens.** The EOD approve button is done
  (`a0d27b5`); Pay Bounty now carries `disabled:opacity-40` but still `bg-[var(--danger)]` with an
  rgba glow. `bg-emerald-*`, `bg-orange-*`, `bg-red-*` and rgba glows still sit outside
  `EODReconciliationView`. `--amber` already exists as a measured token PAIR (`#F59E0B` dark /
  `#92400E` light) — reuse it, do not invent another amber.
- `bg-black/N` across the whole admin half; Lite Mode kills `transition-duration` but not
  `transition-delay`; Force Reset is a 24px destructive target.

Elsewhere in the backlog:
- **The day rolls over at 07:00, not midnight.** `getCurrentDate()` in `helpers.js` is UTC, 26
  call sites across 6 files; `getLocalDayKey()` is the correct one. Each site needs judging.
  Money already verified unaffected.
- Three screens he asked to redesign: Sampling, Customers, Stock Opname.

🔴 **THE LAST JOB — merge to main.** His words: *"we might it later if we done with everything"*.
Branch is not behind main, so it is clean. Do not do this until the list above is empty or he
says so.

</details>
