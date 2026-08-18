# NEXT SESSION — copy the block below, paste it, go

---

A double-tap on Send submits the EOD twice. `<EODAgentFlow>` accepts a `submitting` prop and
guards two controls with it, but `src/EODReconciliationView.jsx` never passes it, so both guards
are dead. This is a money bug, not polish: the agent's setoran can post twice, and the second one
is a second pending report on the same night. It is item 6 on Aldi's own confirmed-and-still-to-do
list in PROGRESS, and it needs no decision from him.

WHERE: `src/EODReconciliationView.jsx`. `<EODAgentFlow key={effectiveId} ... />` is the call site
(read the file, do not trust the line number). `src/components/EODAgentFlow.jsx` already declares
`submitting = false` and uses it on `<EODLetter ... disabled={submitting}>` and on one button —
that component needs no change at all.

WHAT TO DO: hold a `submitting` boolean in EODReconciliationView, set it true the moment the
flow's `onSubmit` handler starts, and clear it after the awaited work finishes. The handler is the
long block that builds the payload and calls `onSubmitEOD`. It can fire TWICE in one submission —
once for `CASH_STOCK` and, when `agentData.cukaiStatus === 'READY'`, again for `CUKAI`. Both must
be inside the same guarded window, or the flag clears between them and the door reopens.

THE TRAP: `onSubmitEOD` comes from App.jsx and the handler is not currently awaited. Clearing the
flag in a `finally` only helps if the work is actually awaited — make the handler `async` and await
it, otherwise the flag clears on the same tick and guards nothing. Check what `onSubmitEOD`
returns before assuming it is a promise.

SECOND TRAP: do not reach for `window.confirm` or a disabled-looking button that still fires. The
dialog gate (`confirmAction` in `src/components/ConfirmGate.jsx`) replaced all 69 confirms and
prompts; a blocked native dialog does nothing, which is exactly how duplicate data gets explained
away. The fix here is state, not a dialog.

LEAVE A CHECK: `src/config/logicFixes.selfcheck.mjs`, next section is S22. Prove it red before
writing the fix — a guard that `submitting=` is passed at the call site, and a behaviour check that
two rapid submissions produce one payload. Run:
`npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs`

CONTEXT ALREADY ESTABLISHED, do not re-derive:
- The EOD count decides the report (`d859d41`); a short count mints one PENALTY key PER REASON on
  approval, goods priced at `priceRetail` (`7f96d19`, `43f8059`); the admin's card shows expected
  vs counted and names the short products (`ce70287`); the WANTED board itemises every bounty from
  `cukaiDebtNotes` (`43f8059`). EOD integration is FINISHED.
- `eodBountyLines()` in `helpers.js` is the ONLY place a shortfall becomes rupiah. Do not compute a
  fine anywhere else.
- Red panels moved from `--danger` to `--danger-well` (`44efb69`, check S20). `--danger` stays the
  EDGE and the fill for dots and bars.
- The counting flow is keyed on `effectiveId` (`b904db2`, check S21).

---

## The queue underneath — promote ONE of these next time, never paste this part

✅ **WAITING ON ALDI — the shakedown test card is still unanswered.**
https://claude.ai/code/artifact/a42ce819-9d1a-46a8-8ae8-0291df6765ef

Still open on his confirmed list (items 2, 3, 5, 8, 9, 10 in PROGRESS):
- **Gold ink on a gold plate = 1,00:1 in dark** on the admin side. The plate is on the parent and
  the ink on a child, which is why audit group 48 missed it — widen the regex with the fix. S20
  has the same ceiling written into it.
- **The Verify button is `bg-emerald-600`** — green is banned by his palette law, and it marks the
  routine path. Picking the replacement is a taste call; ask him.
- `agentData` useMemo omits `inventory`, so `itemsBks` uses fallback pack multipliers.
- `bg-black/N` across the whole admin half; Lite Mode kills `transition-duration` but not
  `transition-delay`; Force Reset is a 24px destructive target.

Elsewhere in the backlog:
- **The day rolls over at 07:00, not midnight.** `getCurrentDate()` in `helpers.js` is UTC and has
  26 call sites across 6 files; `getLocalDayKey()` is the correct one. Each site needs judging —
  "what day is it for this agent" takes the local key, a record timestamp does not. Money already
  verified unaffected.
- Three screens he asked to redesign: Sampling, Customers, Stock Opname.

🔴 **THE LAST JOB — merge to main.** His words: *"we might it later if we done with everything"*.
538+ commits on `phase0-solid-ground`, branch is not behind main, so it is clean. Do not do this
until the list above is empty or he says so.
