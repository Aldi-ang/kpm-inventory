# NEXT SESSION — copy the block below, paste it, go

---

The map still matches store history with a raw `===` on the name. It is the strictest comparison
left in the app: a single capital letter, one trailing space, or a legacy " (Retail)" ending and
the shop's whole history reads as empty.

WHERE: `src/MerchantSalesView.jsx` and the utils are done — this is `src/MapMissionControl.jsx`,
four sites. Read the file, do not trust these numbers:

    ~1154   const storeTrans = safeTrans.filter(t => t && t.customerName === store.name);
    ~1192   .filter(t => t && t.customerName === store.name && t.type === 'SALE')
    ~2031   if (t.customerName !== store.name || t.type !== 'SALE') return false;
    ~1579   const isMatch = (t.customerName || t.customer || '').trim().toLowerCase() === (store.name || '').trim().toLowerCase();

Three of them are RAW `===`. The fourth is a private trim+lowercase copy of the shared rule — the
same private-copy mistake that was just removed from `customerBrief.js`, still living here.

WHY IT COSTS HIM MONEY: `store.name` comes from the customer DOCUMENT (the book) and
`t.customerName` is what the agent typed at the counter. They agree only by luck. When they do
not, that shop's pin on the map shows no sales, no history and no debt — so a shop with an
outstanding Titip balance can look settled, and a route decision gets made on a blank record.

THE FIX: `storeKey` from `src/utils/helpers.js`, on both sides of all four comparisons. It is
already the rule in `useTransactionEngine.js`, `ConsignmentFinanceView.jsx`,
`AgentProfileView.jsx`, `customerBrief.js`, `dayStats.js` and `MerchantSalesView.jsx`. Delete the
private copy at ~1579 rather than leaving a second rule behind.

THE TRAP, and it is the whole job: these four are not the same KIND of comparison. Some select
ONE store's rows for display; if the site aggregates money (a total, a debt, a "last order"),
normalising merges rows that were previously separate, and a number he reads changes. Before
editing each site, say what it feeds — a display list, or a sum. For any site that feeds a sum,
the behaviour check must run real rupiah through it and state the before and after, so a changed
number on his screen is a number that was decided, not one that moved on its own.

Second trap: `(t.customerName || t.customer || '')` at ~1579 reads a SECOND field, `t.customer`.
Find out whether any row actually carries it before dropping it — one grep for `\.customer\b`
across `src/`. If rows do carry it, keep the fallback and normalise both.

CONTEXT ALREADY ESTABLISHED, do not re-derive: no transaction carries a customerId, only
customerName and agentId. `storeKey()` — trim, strip a TRAILING " (Retail|Individual|Wholesale)",
lowercase, `String()`-coerced. Background: A-Brain/Wiki/Concepts/A Store Name Is Not a Store.md.

Verify chain, paste the numbers:
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
Expected: build clean, 599/0, 115/0 plus whatever you add.

When it is committed, rewrite this file (.claude/NEXT-SESSION.md) with the NEXT single job.

---

<details>
<summary>Queue behind it — for the next session to promote from, not to paste</summary>

- `src/JourneyView.jsx` ~278 — `tx.customerName.trim().toLowerCase()`, another private copy, and
  it throws on a row with no name (no `|| ''` guard). Small, quick, do it right after the map.
- `src/EODReconciliationView.jsx` ~131 — `.map(t => t.customerName)`; check whether it feeds a
  Set of distinct stores. If it does, it double-counts the same way `dayStats` did.
- A `logicFixes` guard that no file may define its own name normalizer — grep for
  `.trim().toLowerCase()` sitting next to a customer name and fail. Three private copies have now
  been found by hand (`customerBrief`, `MapMissionControl`, `JourneyView`); a check would have
  found all three at once. **This is the one that stops the pattern instead of the instances.**
- The receivables row and the debt tally still DISPLAY whichever spelling was written first, so a
  shop can read as "Warung Bu Sari (Retail)" forever. Ending that means a one-off cleanup of the
  customer documents — a data migration, needs Aldi's word before anything writes.
</details>
