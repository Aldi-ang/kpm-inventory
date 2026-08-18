# NEXT SESSION — copy the block below, paste it, go

---

Stop the pattern instead of the instances. Four files have now been caught defining their own
private rule for "is this the same store?" — `customerBrief.js`, `MapMissionControl.jsx`, and two
still standing. Each was found by hand, one session at a time. Write the check that finds them
all, then fix whatever it turns red.

**STEP 1 — write the guard first, in `src/config/logicFixes.selfcheck.mjs`.** Scan every file
under `src/` for a name comparison that does NOT go through `storeKey`: the shape to catch is
`.trim().toLowerCase()` sitting on or next to something called `customerName`, `customer`,
`storeName` or `store.name`. Fail with the file and line, not just a count — a guard that says
"3 failures" and not where is a guard nobody acts on. Allow `helpers.js` itself, which is where
the real rule lives.

Expect it to go RED immediately. That is the point: watch it red, then fix what it names.

**STEP 2 — the two already known.** Do not trust these line numbers, read the files:

    src/JourneyView.jsx ~278    const storeName = tx.customerName.trim().toLowerCase();

  A private copy AND an unguarded `.trim()` — `tx.customerName` with no `|| ''` throws on a row
  whose name field is missing, and the whole journey view goes blank. Two faults, one line.

    src/EODReconciliationView.jsx ~131    todaysTrans.filter(t => t.type === 'SALE').map(t => t.customerName)

  Check what this feeds FIRST. If it lands in a `Set` or a distinct-store count, it double-counts
  one shop under two spellings exactly the way `dayStats` did before `f1e3b28`. If it only feeds a
  display list, say so and leave it.

**THE TRAP, and it is the whole job: a guard that greps source text can be satisfied by a
comment.** That already happened once here — a regression guard for `.includes(inputTrimmed)`
went red against the FIXED code because the explanatory comment above the fix contained the
phrase. Strip comments before scanning, or write the pattern so prose cannot match it, and prove
it: add a file whose COMMENT contains the banned shape and confirm the guard stays green, or
assert the scan on a fixture string rather than on real files.

Second trap: `.trim().toLowerCase()` is a legitimate shape on things that are not store names —
an email, a search box, a product name. A guard that fails on those is a guard that gets deleted
in a week. Scope it to the four name identifiers above and say in the reply what it deliberately
ignores.

CONTEXT ALREADY ESTABLISHED, do not re-derive: no transaction carries a customerId, only
customerName and agentId. `storeKey()` in `src/utils/helpers.js` — trim, strip a TRAILING
" (Retail|Individual|Wholesale)", lowercase, `String()`-coerced. Already used by
`useTransactionEngine`, `ConsignmentFinanceView`, `AgentProfileView`, `customerBrief`, `dayStats`,
`MerchantSalesView`, `MapMissionControl`. Background:
A-Brain/Wiki/Concepts/A Store Name Is Not a Store.md.

Note for the utils: `customerBrief.js` and `dayStats.js` import `'./helpers.js'` WITH the
extension because node runs them directly in their own self-checks and its ESM resolver does not
add it. Keep that if you touch their imports.

Verify chain, paste the numbers:
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/customerBrief.selfcheck.mjs; node src/config/dayStats.selfcheck.mjs
Expected: build clean, 599/0, 130/0 plus whatever you add, 9/9, 7/7.

When it is committed, rewrite this file (.claude/NEXT-SESSION.md) with the NEXT single job.

---

<details>
<summary>Queue behind it — for the next session to promote from, not to paste</summary>

- The receivables row, the debt tally and the map pin all DISPLAY whichever spelling was written
  first, so a shop can read as "Warung Bu Sari (Retail)" forever. Ending that means a one-off
  cleanup of the customer documents — a data migration, needs Aldi's word before anything writes.
- The RPG Migration button in `MapMissionControl` re-banks `lifetimeXP` / `seasonXP` from
  transactions. After `a3a9cf6` those numbers come out HIGHER for any shop whose history was split
  by spelling. Nothing is wrong until he presses it, but he should be told what will move before
  he does.
- `src/hooks/useOfflineEngine.js` only logs `customerName` into a sync message — checked, no
  matching or grouping. Recorded so nobody re-greps it.
</details>
