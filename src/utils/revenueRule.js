/* WHAT COUNTS AS MONEY. ONE RULE, ONE FILE, NO SECOND OPINION.
   ────────────────────────────────────────────────────────────────────────────
   🔴 Aldi, 2026-09-09: *"omset come after goods is sold and money is received, receivable doesnt
   count, should have their own data and panel for receivable outside of the revenue or omzet"*.
   And, asked whether the quantity beside the money should follow the money or the warehouse door:
   *"A for the sold bks mean"* — the money.

   A Titip placement is goods left at a shop on trust. Nothing has been paid, the shop may hand
   every packet back, and the app already tracks it properly as a RECEIVABLE. It becomes income at
   the store audit, for the part the shop actually sold, and for nothing else.

   ⚠️ WHY THIS IS ITS OWN FILE RATHER THAN A FUNCTION IN salesRollup.
   `salesRollup` imports `txSeconds` from `dayStats`, and `dayStats` needs this rule for the Sales
   Terminal's "Taken" box — so putting the rule in salesRollup makes those two modules import each
   other. That cycle would work today, because every call is inside a function rather than at module
   top level, and would break the first time a bundler reordered the two. A rule that decides money
   is the wrong place to leave a trap like that, so it sits under both instead.

   ⚠️ AND WHY IT IS A FUNCTION AT ALL. This rule was already written, correctly, in
   `EODReconciliationView` — `(SALE && method !== 'Titip') || CONSIGNMENT_PAYMENT` — which is why
   EOD asked the salesman for the right cash on 2026-09-09 while the dashboard above it claimed a
   figure twelve times bigger. Seven other screens each carried their own `type === 'SALE'` and each
   got it wrong the same way. One rule in one place can still be wrong; it cannot DISAGREE with
   itself, and disagreement is what cost a day of diagnosis.                                     */

import { storeKey } from './helpers.js';

export const isTitip = (tx) => (tx?.paymentType || tx?.method || 'Cash') === 'Titip';

/* True when this transaction moved money into the business. Deliberately NOT true for a RETURN:
   a refund is money going the other way and callers that care about it (dayStats) add it back
   with its own sign, rather than having this predicate mean two things at once.

   ⚠️ A MISSING `type` MEANS 'SALE', and that is not sloppiness — it is the convention the old
   `salesRollup.isSale` already used (`SALE_TYPES.includes(tx.type || 'SALE')`). Records written
   before the field existed carry no type at all, and reading those as "not a sale" would quietly
   drop every one of them out of omzet. The self-check for the rail's day figures builds its whole
   fixture set without a `type` and caught this the first time the default was left out. */
export const countsAsRevenue = (tx) => {
    if (!tx) return false;
    const type = tx.type || 'SALE';
    return (type === 'SALE' && !isTitip(tx)) || type === 'CONSIGNMENT_PAYMENT';
};

/* ⚠️ `amountPaid` BEFORE `total`. The online store audit writes both; the offline one writes only
   `amountPaid` (useTransactionEngine's offline branch), so reading `total` alone would silently
   book nothing for every audit done with no signal — which, for these salesmen, is most of them. */
export const revenueOf = (tx) => {
    if (!countsAsRevenue(tx)) return 0;
    const raw = tx.type === 'CONSIGNMENT_PAYMENT'
        ? (tx.amountPaid !== undefined && tx.amountPaid !== null ? tx.amountPaid : tx.total)
        : tx.total;
    const n = Number(raw) || 0;
    return Number.isFinite(n) ? n : 0;
};

/* The lines that actually changed hands, for the per-product columns. Same rule one level down:
   a placement contributes nothing, an audit contributes the part the shop sold (`itemsPaid`). */
export const soldLinesOf = (tx) => {
    if (!countsAsRevenue(tx)) return [];
    const lines = tx.type === 'CONSIGNMENT_PAYMENT' ? tx.itemsPaid : tx.items;
    return Array.isArray(lines) ? lines : [];
};

/* ── THE OTHER HALF OF HIS SENTENCE ────────────────────────────────────────────────────────────
   *"receivable doesnt count, should have their own data and panel for receivable outside of the
   revenue or omzet"*. Taking Titip out of omzet only does half the job: the money is real, it is
   still owed, and hiding it would be its own kind of lie. So the dashboard prints it BESIDE the
   omzet box, never inside it.

   ⚠️ THIS IS A BALANCE, NOT A PERIOD FIGURE. Omzet answers "how much this month"; this answers
   "how much is out there right now", so it deliberately ignores the HARI/MINGGU/BULAN/TAHUN
   selector. A debt does not expire because the month rolled over.

   ⚠️ THE `Math.max(0, ...)` IS PER CUSTOMER AND MUST STAY THERE. One shop that overpaid cannot be
   allowed to cancel another shop's debt; summing first and flooring once would let it, and the
   company total would quietly read short. This mirrors the per-customer FIFO ledger in
   `ConsignmentFinanceView.debtData` — that screen allocates each payment across that shop's own
   drops, and the sum of what it leaves standing is exactly this. It is written here rather than
   imported from there because that ledger also computes ageing and overdue buckets this does not
   need; if the two ever disagree, that screen is the truth and this one is the bug. */
export const outstandingTitip = (transactions = []) => {
    const byCustomer = new Map();
    for (const t of transactions) {
        if (!t) continue;
        /* `storeKey`, never a hand-rolled trim-and-lowercase. The app has ONE store-name rule and
           an audit check enforces it — which is how this line got caught the first time it was
           written by hand. A second rule is how "Warung Bu Sari" and "warung bu sari " become two
           accounts and a paid debt goes on showing as owed. */
        const name = storeKey(t.customerName || 'Unknown');
        const row = byCustomer.get(name) || { owed: 0, paid: 0 };
        if (t.type === 'SALE' && isTitip(t)) row.owed += Number(t.total) || 0;
        else if (t.type === 'CONSIGNMENT_PAYMENT') row.paid += Number(t.amountPaid) || 0;
        else if (t.type === 'RETURN') row.paid += Math.abs(Number(t.total) || 0);
        byCustomer.set(name, row);
    }
    let total = 0;
    for (const { owed, paid } of byCustomer.values()) total += Math.max(0, owed - paid);
    return total;
};
