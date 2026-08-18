# NEXT SESSION — copy the block below, paste it, go

---

Approving a stock count silently undoes the whole day. Fix it so a count corrects the stock
instead of replacing it.

WHERE: `src/StockOpnameView.jsx` — approval writes the counted number around ~281 and ~283, and
the count is snapshotted at submit around ~220-236. Read the file, do not trust those numbers.

WHAT HAPPENS: the branch counts in the morning and submits. HQ approves that evening. On approval
the app writes the MORNING number straight over stock as it is NOW.

    08:00  branch counts 100 packs, submits
    daytime  30 sold
    18:00  an agent returns 20 at EOD
           real stock is 90
    20:00  HQ approves. Stock is set to 100.

Ten packs appear from nowhere, the day's movement is erased, and nobody is told. It is easy to
miss because the confirmation says "this will permanently overwrite the inventory" — which is
CORRECT at the moment of counting, and wrong hours later.

THE FIX: the audit already stores `expectedStock`, what the system believed at count time. So the
real correction the counter found is already known. Apply the DIFFERENCE, not the number:

    new stock = stock right now + (what was counted - what the system expected at count time)

The day's sales survive and the counter's correction still lands.

THE TRAP, and it is the whole job: `expectedStock` must be the value at COUNT time, not at
approval time. If any code path refreshes or recomputes it when the approval screen opens, the
difference collapses to zero and the fix quietly does nothing — no error, no wrong number, just a
correction that never applies. Prove which one it is before editing, and put a behaviour check on
the full sequence: expected 100, counted 100, then 30 sold and 20 returned, approve → 90, not 100.
Then the case that matters most: expected 100, counted 95 (five really missing), 30 sold, 20
returned, approve → 85.

Second trap: stock can move between approval being pressed and the write landing. If the write is
not already inside a `runTransaction`, adding a difference to a stale read is its own version of
this bug. Check first; if it is a plain read-then-write, that is part of the fix, not a follow-up.

THE ALTERNATIVE, and say which you chose and why: refuse the approval when current stock no longer
matches `expectedStock`, and ask for a fresh count. Safer, but it costs Aldi a second count every
time a day's trading happens between count and approval — which is every time. Recommend the
difference method unless the file shows a reason it cannot work; either way, put the rejected one
in a check so it cannot be quietly adopted later.

CONTEXT ALREADY ESTABLISHED, do not re-derive: `convertToBks(qty, unit, product)` in
`src/utils/helpers.js` is the ONE pack-size rule — four hand-written copies were replaced with it
in `f51a3a9`, and `logicFixes.selfcheck.mjs` fails any one-line size ladder that stops before
Karton. If this fix touches unit maths, call the helper. Backlog source:
`A-Brain/Backlog/Approving a stock count erases everything that happened since the count.md`.

Verify chain, paste the numbers:
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/mixedUnits.selfcheck.mjs
Expected: build clean, 599/0, 177/0 plus whatever you add, 11/11.

When it is committed, rewrite this file (.claude/NEXT-SESSION.md) with the NEXT single job.

---

<details>
<summary>Queue behind it — for the next session to promote from, not to paste</summary>

- `Clear Canvas can create stock out of thin air.md` — same screen family, read it next to this one.
- ~20 correct-but-duplicated pack-size copies remain. Not urgent. Replace one when its file is
  being edited anyway; do not open a sweep for them.
- Same disease, no helper yet: the price ladder `priceRetail / priceEcer / priceGrosir` is written
  out five times in `MerchantSalesView.jsx` (~82, ~541, ~602, ~667, ~1405). None wrong today.
- **Tell him before he presses it:** the RPG Migration button in `MapMissionControl` re-banks
  XP; after `a3a9cf6` those numbers come out higher for shops whose history was split by spelling.
- Known gap from `883a62e`: the customer directory still shows the legacy "(Retail)" ending,
  because it is the one screen that writes customer documents in bulk.
</details>
