# NEXT SESSION — copy the block below, paste it, go

---

The sales screen works out what a store owes TWICE, in two different pieces of code, and shows
both at the same time. They disagree, so one shop can display two different debts on one screen.

WHERE: `src/MerchantSalesView.jsx` — the red "OWES" warning uses the FIFO debt engine near the top
of the file (`debtInfo`, around ~105); the orange "Unpaid titip" panel uses a second calculation
further down. Read the file and find both before editing; do not trust line numbers.

THEY DISAGREE THREE WAYS. One is already fixed — check it, do not redo it:

1. **Returns.** The debt engine subtracts goods the store gave back. The panel ignores returns
   completely, so returned goods never reduce what the store appears to owe. **This is the money
   one.**
2. **What counts as debt.** The engine counts a proper consignment sale. The panel counts ANY
   record marked "Titip", including record types that are not sales at all.
3. **The name match.** ~~One trimmed the store name, the other did not.~~ Both go through
   `storeKey` as of `f1e3b28`, and `logicFixes.selfcheck.mjs` fails any file that grows its own
   name rule. **Verify this is still true and move on — do not re-fix it.**

THE FIX: one calculation, called twice. The debt engine is the correct one — it is the one the
transfer-shortfall rule and the agent's bounty already read. Delete the panel's private version and
have it call the engine's result.

THE TRAP, and it is the whole job: the two numbers are not just computed differently, they may be
ANSWERING different questions. Before deleting either, say in the reply what each is meant to show
— "everything this store owes" and "goods still out on consignment" are different quantities, and
if the panel is the second one then merging them hides information rather than fixing a bug. Read
what each is labelled on screen, not just what it computes. If they really are the same question,
merge; if not, keep both and make the LABELS honest instead.

Second trap: whatever you keep must subtract returns. Put a behaviour check on it — 2.000.000 of
Titip, 500.000 paid, 300.000 returned as goods, the shop owes 1.200.000 — and check the case where
returns exceed the debt, which must floor at zero rather than show a negative.

CONTEXT ALREADY ESTABLISHED, do not re-derive: no transaction carries a customerId, only
customerName and agentId; `storeKey` in `src/utils/helpers.js` is the one name rule; `convertToBks`
is the one pack-size rule. Backlog source:
`A-Brain/Backlog/Two different debt numbers for the same store.md`.

Verify chain, paste the numbers:
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/mixedUnits.selfcheck.mjs
Expected: build clean, 599/0, 223/0 plus whatever you add, 11/11.

When it is committed, rewrite this file (.claude/NEXT-SESSION.md) with the NEXT single job.

---

<details>
<summary>Queue behind it — for the next session to promote from, not to paste</summary>

- `Some failures are hidden from the user completely.md` — his own law is that every action reports.
- `The app day rolls over at 7am instead of midnight.md`
- `What the agent counts at EOD is never used for anything.md`
- `Approving a stock count...`, `Clear Canvas...`, `Offline sales...`, `Shipping stock to a
  branch...` and `The pack-size maths...` are all **Done** — 2026-08-18.
- The stale-read class was swept on 2026-08-18: one real instance (`655e7f1`). The rest are inside
  `runTransaction` (safe) or have sub-second windows where the computed value is needed for a
  low-stock alert. Do not re-sweep it without a new reason.
- The price ladder `priceRetail / priceEcer / priceGrosir` is written five times in
  `MerchantSalesView.jsx`. None wrong today, no helper yet.
- **Tell him before he presses it:** the RPG Migration button re-banks XP; after `a3a9cf6` those
  numbers come out higher for shops whose history was split by spelling.
</details>
