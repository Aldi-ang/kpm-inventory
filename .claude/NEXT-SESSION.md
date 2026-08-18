# NEXT SESSION — copy the block below, paste it, go

---

Clear Canvas can invent stock. Emptying a vehicle credits the warehouse from the admin's cached
screen data instead of the vehicle's live contents, so anything the agent sells while that screen
sits open is returned to the warehouse AND stays sold.

WHERE: `src/FleetCanvasManager.jsx`, `handleClearCanvas` — it reads the cached list around ~359 and
wipes the vehicle around ~391. Read the file, do not trust those numbers.

    14:00  admin opens Fleet & Canvas, the van shows 50 packs
    14:05  the agent sells 20, the van really holds 30
    14:10  admin presses Clear Canvas
           warehouse credited 50, van emptied
           20 packs invented

THE FIX IS FIFTY LINES ABOVE IT. `handleLoadCanvas` in the same file already re-reads the agent
document INSIDE the transaction and works from that live copy. `handleClearCanvas` skips that and
trusts `selectedAgent.activeCanvas`, which is whatever the screen loaded. Copy the pattern: read
the agent doc inside the transaction, credit the warehouse from THAT list, then wipe.

THE TRAP, and it is the whole job: the reads must all happen before any write in the transaction.
That function already reads the destination inventory documents first and writes afterwards, so
the new agent read has to join the READ phase — adding it lower down will throw at runtime, not at
build time, and only when someone actually clears a van. Say in the reply where you put it, and
check that no write precedes it.

Second trap: the pack-size conversion in that credit already uses `convertToBks` correctly. When
the list it iterates changes from the cached one to the live one, keep that call and keep taking
the unit from the VAN ROW, not from anywhere else — `f51a3a9` fixed four bugs of exactly that kind
in this codebase, one of them in this same file.

Third: the behaviour check has to run the RACE, not just the fix — van 50, sell 20 while the
screen is stale, clear, warehouse must gain 30 and the van must end empty. A check that only
proves "it reads the agent doc" passes on code that reads it and then ignores it.

CONTEXT ALREADY ESTABLISHED, do not re-derive: `convertToBks(qty, unit, product)` in
`src/utils/helpers.js` is the one pack-size rule. Backlog source:
`A-Brain/Backlog/Clear Canvas can create stock out of thin air.md`.

**Worth saying to Aldi when this lands:** this is the third bug of one shape — *a stock figure is
trusted after the moment it was true.* The other two are the stock-count approval (`5c4d3c7`) and
offline sales never reducing van stock (still open). After this one, the fourth is worth hunting
as a class rather than waiting for it to be reported.

Verify chain, paste the numbers:
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/mixedUnits.selfcheck.mjs
Expected: build clean, 599/0, 189/0 plus whatever you add, 11/11.

When it is committed, rewrite this file (.claude/NEXT-SESSION.md) with the NEXT single job.

---

<details>
<summary>Queue behind it — for the next session to promote from, not to paste</summary>

- `Offline sales never reduce the van stock.md` — the same "trusted after it was true" shape, and
  the natural pair to this one.
- ~20 correct-but-duplicated pack-size copies remain. Replace one when its file is being edited
  anyway; do not open a sweep.
- The price ladder `priceRetail / priceEcer / priceGrosir` is written out five times in
  `MerchantSalesView.jsx` (~82, ~541, ~602, ~667, ~1405). None wrong today, no helper yet.
- **Tell him before he presses it:** the RPG Migration button in `MapMissionControl` re-banks XP;
  after `a3a9cf6` those numbers come out higher for shops whose history was split by spelling.
- Known gap from `883a62e`: the customer directory still shows the legacy "(Retail)" ending.
</details>
