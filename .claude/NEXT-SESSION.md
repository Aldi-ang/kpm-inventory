# NEXT SESSION — copy the block below, paste it, go

---

Fix the agent's own "who owes me" tally. It groups store debt by the raw customer name, so the
same shop can sit in it twice and a payment can fail to cancel its debt.

WHERE: src/AgentProfileView.jsx, inside the big transaction loop — the `storeDebt` map, written
around line 492 and read again around line 512. Read the file, do not trust those numbers.

WHAT IT DOES NOW:

    if (t.paymentType === 'Titip') {
        if (t.customerName) {
            if (!storeDebt[t.customerName]) storeDebt[t.customerName] = 0;
            storeDebt[t.customerName] += (t.total || 0);
        }
    }
    ...
    if (t.type === 'CONSIGNMENT_PAYMENT') {
        if (t.customerName && storeDebt[t.customerName]) storeDebt[t.customerName] -= (t.amountPaid || t.total || 0);
    }

WHY IT COSTS HIM MONEY — two separate faults in those six lines:

1. RAW NAME AS THE KEY. Commit 264c138 stopped the sale engine welding the price tier onto a
   store's name, so rows written before it say "Warung Bu Sari (Retail)" and rows written after
   say "Warung Bu Sari". This map keys on the raw string, so that one shop appears as two
   entries, each holding half its debt. Stray spacing and a capital letter split it further:
   "Toko Jaya" and "toko jaya " are two different keys here.

2. THE PAYMENT IS SILENTLY DROPPED. `&& storeDebt[t.customerName]` means a CONSIGNMENT_PAYMENT
   whose matching Titip sale is not in the same loaded window — or is filed under the other
   spelling — subtracts from nothing. No error. The agent keeps seeing a debt he has already
   been paid, and chases a shop that settled.

THE FIX: `storeKey` already exists — `src/utils/helpers.js`, exported, and already used by
`useTransactionEngine.js` and `ConsignmentFinanceView.jsx`. Key this map on `storeKey(t.customerName)`
the same way, and keep the raw trimmed name for display.

THE TRAP, and it is the whole job: fault 2 is NOT a free fix. Dropping the `&& storeDebt[...]`
guard lets a payment create a NEGATIVE debt entry for a shop with no sale in the window, and a
negative number in that list is worse than a stale one — it reads as the agent owing the shop.
Decide which of these you are doing and say so in the reply: (a) key on storeKey and leave the
guard, which fixes the split only; or (b) key on storeKey, drop the guard, and clamp the whole
map with `Math.max(0, ...)` after the loop, the way ConsignmentFinanceView already clamps its
balances. Whichever you choose, the behaviour check has to run the case you did NOT choose and
show what it would have produced.

Second trap: line ~486 decides `isEcer` partly by sniffing the customer name for "ecer" and
"walk-in". That is the same "the name carries data" mistake, but it is NOT in scope — the tier
suffix was "(Individual)" for Ecer, never "(Ecer)", so 264c138 did not change what it matches.
Mention it, do not touch it.

CONTEXT ALREADY ESTABLISHED, do not re-derive: no transaction in this app carries a customerId,
only customerName and agentId — see A-Brain/Wiki/Concepts/A Store Name Is Not a Store.md.

Verify chain, paste the numbers:
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
Expected: build clean, 599/0, 86/0 plus whatever you add.

When it is committed, rewrite this file (.claude/NEXT-SESSION.md) with the NEXT single job.

---

<details>
<summary>Queue behind it — for the next session to promote from, not to paste</summary>

- `src/utils/customerBrief.js` and `src/utils/dayStats.js` also read `customerName`; check whether
  either groups on it. Same storeKey treatment if they do.
- `MerchantSalesView.jsx` (~line 530) auto-picks a store only on an EXACT raw-name match. A shop
  saved under the legacy "(Retail)" name no longer auto-picks when the agent types the clean name.
  The sale still books correctly — the engine resolves it through storeKey — so this is a
  convenience gap, not a money bug. Would be closed by comparing with storeKey there too.
- The receivables row still DISPLAYS whichever spelling was written first, so a shop can show as
  "Warung Bu Sari (Retail)" forever. A one-off cleanup of the customer documents would end it;
  that is a data migration and needs Aldi's word before anything writes.
</details>
