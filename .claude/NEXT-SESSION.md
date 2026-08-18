# NEXT SESSION — copy the block below, paste it, go

---

The store name is settled. Every comparison in the app now goes through `storeKey`, and a guard
in `logicFixes.selfcheck.mjs` fails the build check if any file grows its own copy again. What is
left from that work is a DECISION Aldi has to make, not code — read it to him and get an answer
before writing anything.

**THE DECISION: the old names are still written in the data.**

Nothing was rewritten. Every comparison tolerates a trailing " (Retail)" / " (Individual)" /
" (Wholesale)", so one shop behaves as one shop everywhere. But the rows themselves still say
what they said, and every screen DISPLAYS whichever spelling was written first. So a shop can
read as "Warung Bu Sari (Retail)" on the receivables list, the debt tally and the map pin,
forever, even though the app knows it is the same shop as "Warung Bu Sari".

Two options, and they are not close in risk:

  (a) LEAVE IT. Costs nothing, changes nothing, and he sees a slightly ugly name on old shops
      until those shops stop appearing. Zero risk.
  (b) CLEAN THE CUSTOMER DOCUMENTS. A one-off pass that strips the suffix from `name` on every
      customer document that carries one. Names get tidy everywhere at once. This is a WRITE to
      his live book — it is a data migration, it is not reversible without a backup, and it must
      not be run by anyone but him, on his word, with a backup taken first.

Ask him plainly, do not assume: does he want the old names cleaned up, or left alone? If he says
leave it, record that in A-Brain and this file's job is done — pick the next item from the queue
below instead. If he says clean them, the FIRST thing to establish is how a backup is taken and
verified, before a single document is touched.

**Do not write the migration "ready to run" while waiting for his answer.** A script that exists
is a script someone runs.

CONTEXT ALREADY ESTABLISHED, do not re-derive: no transaction carries a customerId, only
customerName and agentId — a name is the only key there is, which is exactly why rewriting names
is dangerous. `storeKey()` in `src/utils/helpers.js`. Background:
A-Brain/Wiki/Concepts/A Store Name Is Not a Store.md.

Verify chain if any code is touched, paste the numbers:
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/customerBrief.selfcheck.mjs; node src/config/dayStats.selfcheck.mjs
Expected: build clean, 599/0, 150/0 plus whatever you add, 9/9, 7/7.

When it is committed — or when he answers and the answer is recorded — rewrite this file
(.claude/NEXT-SESSION.md) with the NEXT single job.

---

<details>
<summary>Queue behind it — for the next session to promote from, not to paste</summary>

- **Tell him before he presses it:** the RPG Migration button in `MapMissionControl` re-banks
  `lifetimeXP` / `seasonXP` from transactions. After `a3a9cf6` those numbers come out HIGHER for
  any shop whose history was split by spelling. Nothing is wrong until he presses it.
- `storesServed` in the career doc is accumulated with `increment()`, so days submitted BEFORE
  `ef437b1` are already banked with the inflated count. Nothing here can correct them. If he ever
  cares about the lifetime number being exact, that is its own conversation.
- The S5 guard only catches `.trim().toLowerCase()`. A file could still write
  `.toLowerCase().trim()`, or `String(x).toLowerCase()`, and slip past. Widening the pattern is
  cheap; do it the next time anything touches that check, not as its own job.
- `src/hooks/useOfflineEngine.js` only logs `customerName` into a sync message — checked, no
  matching or grouping. Recorded so nobody re-greps it.
</details>
