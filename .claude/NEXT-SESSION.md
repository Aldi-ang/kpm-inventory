# NEXT SESSION — copy the block below, paste it, go

---

Finish the EOD. The agent's count now decides the report (`d859d41`), but the admin who verifies it
still cannot SEE the gap — so a shortage is recorded and then presented to nobody.

**FIRST, ASK ALDI THIS AND WAIT — it is a rule about his agents' money, not a layout choice.**
Read it to him in these words:

> When your agent counts less cash than the app expected, the report is now marked DISPUTED and it
> carries the gap. What should the admin be able to do on that screen?
>   (a) Approve anyway — the gap is recorded in the report and nothing else happens.
>   (b) Approve, and the gap becomes a debt the agent owes, which you can cancel later.
>   (c) Send it back to the agent to recount, and it cannot be approved until he does.
> You already chose "it waits for the company to rule" for transfer shortfalls. Is this the same?

Do not build (b) without hearing him say (b). It is the only one of the three that takes money from
a person, and the backlog note is explicit that shortages must not post automatically.

WHERE, once he answers: `src/EODReconciliationView.jsx` — the admin's verification panel, the same
screen that lists reports awaiting approval. The report document now carries everything the screen
needs, already: `cash` and `expectedCash`, `transfer` and `expectedTransfer`, `remainingStock` and
`expectedStock`, plus `cashVariance`, `transferVariance`, `goodsShort` and `countStatus`. Nothing
new has to be computed or stored — this is a presentation job plus whatever he picks above.

WHAT TO SHOW, at minimum: expected, counted, and the difference, side by side, for cash and for
transfer; and for goods, the products where the count came up short, by name — a single goods total
hides a one-product shortfall, which is a rule already written into this screen's comments.

THE TRAP, and it is the whole job: **DISPUTED must be impossible to miss and impossible to approve
by reflex.** The report still verifies exactly as before if the admin just taps through, and a gap
that is technically recorded but visually quiet is the same bug in a new place — the count was
always recorded, that was never the problem. Whatever he picks, the disputed state has to change
what the button says, not just add a red number somewhere on the card.

Second trap: `countStatus` is `'CLEAN'` on older reports because they predate this field. Treat a
missing `countStatus` as CLEAN and do not paint old reports as disputed — check that with a fixture
that has no `countStatus` at all.

CONTEXT ALREADY ESTABLISHED, do not re-derive: `handleVerifyEOD` in `src/App.jsx` credits the
warehouse from `report.remainingStock`, which is now the COUNTED goods. The career doc's `collected`
increments from `report.cash + report.transfer`, which are now the COUNTED figures — so if he picks
(b), that is where a debt would have to be recorded, not in the EOD screen. Backlog source:
`A-Brain/Backlog/What the agent counts at EOD is never used for anything.md`.

Verify chain, paste the numbers:
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/eodRecord.selfcheck.mjs
Expected: build clean, 599/0, 255/0 plus whatever you add, 12/12.

When it is committed, rewrite this file (.claude/NEXT-SESSION.md) with the NEXT single job.

---

<details>
<summary>Queue behind it — for the next session to promote from, not to paste</summary>

- **Merge to main.** Aldi's call, 2026-08-18: *"we might it later if we done with everything"* — so
  this happens at the END, not now. 538 commits sit on `phase0-solid-ground`, branch is NOT behind
  main, so the merge is clean. Two checks before, one after, per the usual rule.
- `The app day rolls over at 7am instead of midnight.md` — route board forgets an early morning.
  Money verified unaffected.
- `Three screens he asked to redesign - Sampling, Customers, Stock Opname.md` — read
  `Wiki/Concepts/Aldi's Design Taste.md` first.
- `TESTS - check these when you feel like it.md`
- The shakedown test card is published for him:
  https://claude.ai/code/artifact/a42ce819-9d1a-46a8-8ae8-0291df6765ef — if he sends results back,
  a BROKEN item outranks everything in this queue.
</details>
