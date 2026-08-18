# NEXT SESSION — copy the block below, paste it, go

---

Finish the name sweep. Three places still compare store names by their own rule, so a shop saved
under the old "(Retail)" naming still looks like a different shop to each of them. `storeKey()`
already exists and is already used by the sale engine, the receivables screen and the agent's
debt tally — these three were left out.

Read the files, do not trust any line number below.

**1. `src/utils/customerBrief.js` — the worst of the three, it is the salesman's door-step panel.**
Line ~24 defines its OWN normalizer:

    const key = (name) => String(name || '').trim().toLowerCase();

Trim and lowercase, no suffix rule. Its comment already explains why a raw match is wrong
("Warung Bu Sari" vs "warung bu sari ") — it just stops one step short. A shop whose older rows
say "Warung Bu Sari (Retail)" returns "no recent order" when the brief is asked for the clean
name, so the salesman walks in blind to a shop he sold to last week. Replace the local `key` with
`storeKey` imported from `./helpers` and delete the duplicate.

**2. `src/utils/dayStats.js` ~line 49 and ~53.**

    if (tx.customerName) storesToday.add(tx.customerName);

A Set of RAW names, so one shop under two spellings counts as two stores visited. That number is
on his dashboard — it inflates his own day. Add `storeKey(...)` to the Set instead.

**3. `src/MerchantSalesView.jsx` ~line 530, the auto-pick.**

    const exact = customers.filter(c => (c.name || '').trim().toLowerCase() === needle);
    if (exact.length === 1) handleCustomerSelect(exact[0]);

Typing the clean name does not auto-pick a shop saved under the legacy suffix. The sale still
books to the right shop (the engine resolves it through `storeKey`), so this is convenience, not
money — do it last, and keep the `exact.length === 1` rule exactly as it is.

**THE TRAP, and it is the whole job:** `exact.length === 1` is a SAFETY guard, not a
convenience. His book holds three shops sharing a name 14.5 km apart, and auto-picking the wrong
one bills a shop that bought nothing. Normalising the comparison makes MORE names collide, not
fewer — "Toko Jaya" and "Toko Jaya (Retail)" become one match where they were two. That is
correct when they are the same shop and WRONG if they are two different shops that happen to
differ only by a suffix. Say in the reply which way you resolved that, and put a behaviour check
on the case where two DIFFERENT customer documents normalise to the same key: the count must
still be 2, so the dropdown stays open and Aldi chooses.

Second trap: `dayStats` counts stores, so changing the key changes a number he sees. Check the
existing `src/config/dayStats.selfcheck.mjs` first — if it asserts a store count on fixture data,
the fixture may need a case ADDED rather than a number edited. Never edit an assertion to make it
pass.

CONTEXT ALREADY ESTABLISHED, do not re-derive: no transaction in this app carries a customerId,
only customerName and agentId. `storeKey()` lives in `src/utils/helpers.js` — trim, strip a
TRAILING " (Retail|Individual|Wholesale)", lowercase, `String()`-coerced. Background:
A-Brain/Wiki/Concepts/A Store Name Is Not a Store.md.

Verify chain, paste the numbers:
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/dayStats.selfcheck.mjs
Expected: build clean, 599/0, 99/0 plus whatever you add, dayStats green.

When it is committed, rewrite this file (.claude/NEXT-SESSION.md) with the NEXT single job.

---

<details>
<summary>Queue behind it — for the next session to promote from, not to paste</summary>

- The receivables row and the debt tally both DISPLAY whichever spelling was written first, so a
  shop can read as "Warung Bu Sari (Retail)" forever. Ending that means a one-off cleanup of the
  customer documents — a data migration, needs Aldi's word before anything writes.
- `src/EODReconciliationView.jsx`, `src/JourneyView.jsx`, `src/MapMissionControl.jsx` and
  `src/hooks/useOfflineEngine.js` all read `customerName`. Not yet checked for whether any of them
  GROUPS or MATCHES on it. One grep each, then either fix or record as clean.
- A `logicFixes` guard that no file may define its own name normalizer — grep for
  `.trim().toLowerCase()` next to a customer name and fail. Would have caught customerBrief's
  private copy without anyone reading the file.
</details>
