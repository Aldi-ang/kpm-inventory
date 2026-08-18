# NEXT SESSION — copy the block below, paste it, go

---

The pack-size maths is hand-written in about ten places and three of them are wrong. The correct
version already exists as `convertToBks(qty, unit, product)` in `src/utils/helpers.js`. This is not
"write a helper" — it is "call the helper that is already there", and then make it impossible to
hand-write an eleventh copy.

Read the files, do not trust these line numbers.

**THE THREE THAT ARE WRONG — fix these first, by REPLACING the maths with a `convertToBks` call,
never by patching the arithmetic in place:**

1. `src/FleetCanvasManager.jsx` ~321 — the worst one. Load Canvas always loads in PACKS, and when
   the van already has a row for that product it adds the two numbers together with no conversion
   at all. If that row is counted in Slop, loading 10 packs adds **10 Slop**: the warehouse loses
   10 and the van gains 100. Clear Canvas, about sixty lines below in the same file (~379),
   converts properly — which is exactly how the two ends stop agreeing.
2. `src/hooks/useTransactionEngine.js` ~415 — on a consignment return it converts the VAN's stock
   using the unit of the **returned item** instead of the unit of the **van row**. Van row in Slop
   plus a return in packs means Slop numbers treated as pack numbers.
3. `src/App.jsx` ~3132 and ~3142 — the sampling edit screen handles **Slop only**. A van row counted
   in Bal or Karton is treated as single packs, so editing a sample can wipe out or invent a large
   amount of stock. The correct four-size version sits about sixty lines above it in the same file.

**THE TRAP, and it is the whole job: `convertToBks` takes a UNIT, and which unit you pass is the
bug.** Site 2 above is already calling correct maths — with the wrong unit. Copy a call over with
`item.unit` where the code needs `vanRow.unit` and you have reproduced the same defect in tidier
clothes, with the check passing. For every site you touch, say in the reply WHOSE unit it must be —
the row being changed, or the thing changing it — and put that in a behaviour check: a van row
counted in Slop, a movement expressed in packs, and the resulting van quantity in packs.

Second trap: site 1 is not only a missing conversion. Before editing, establish what unit that van
row actually stores — if rows are held in their own unit rather than in packs, converting the
incoming quantity is only half of it and the sum has to end up in the row's unit. Read Clear Canvas
at ~379 first; it is the end that already works, and it decides the answer.

**THEN WRITE THE FINDER, the same way `S5` in `logicFixes.selfcheck.mjs` did for store names.**
That guard found 8 private copies of the name rule in one run after four sessions of finding them
by hand, three at a time. Do the same here: scan `src/`, comments stripped, for hand-written
pack-size maths — the tell is `packsPerSlop` or `slopsPerBal` or `balsPerCarton` appearing in a
file **outside a `convertToBks` call** — and fail with `file:line`. Allow `helpers.js`, which is
where the real rule lives. Expect it red; the remaining ~7 correct-but-duplicated copies are the
list of what to replace. Replace what you can, and if any must stay, say which and why.

Third trap: the guard's tell must not fire on `helpers.js` itself, on the checks in `src/config/`,
or on a product FORM that legitimately edits `packsPerSlop` as a field. Scope it and say what it
deliberately ignores — a guard that cries wolf gets deleted in a week.

CONTEXT ALREADY ESTABLISHED, do not re-derive: `convertToBks(qty, unit, product)` in
`src/utils/helpers.js` handles all four sizes (Bks → Slop → Bal → Karton) and defaults sensibly.
`FleetCanvasManager.jsx:379`, `MerchantSalesView.jsx:1410` and `ConsignmentFinanceView.jsx` already
call it. Backlog source: `A-Brain/Backlog/The pack-size maths is copy-pasted in six places and they
disagree.md` (title says seven; a seventh copy turned up on a second pass).

Verify chain, paste the numbers:
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/mixedUnits.selfcheck.mjs
Expected: build clean, 599/0, 163/0 plus whatever you add, mixedUnits green.

When it is committed, rewrite this file (.claude/NEXT-SESSION.md) with the NEXT single job.

---

<details>
<summary>Queue behind it — for the next session to promote from, not to paste</summary>

- **Same disease, no helper yet:** the price-tier ladder `priceRetail / priceEcer / priceGrosir` is
  written out five separate times in `MerchantSalesView.jsx` (~82, ~541, ~602, ~667, ~1405). None is
  wrong today. By the same argument there should be one helper and one guard.
- **Tell him before he presses it:** the RPG Migration button in `MapMissionControl` re-banks
  `lifetimeXP` / `seasonXP`. After `a3a9cf6` those numbers come out HIGHER for shops whose history
  was split by spelling. Nothing is wrong until he presses it.
- **Known gap from `883a62e`:** the customer directory (`CustomerManager`) still shows the legacy
  "(Retail)" ending, because it is the one screen that writes customer documents in bulk and must
  keep receiving raw names. Closing it means stripping at its render sites only, not at its data.
- The `S5` name guard only catches `.trim().toLowerCase()`. `.toLowerCase().trim()` or
  `String(x).toLowerCase()` would slip past. Widen it next time anything touches that check.
- `storesServed` in the career doc is accumulated with `increment()`, so days submitted before
  `ef437b1` are banked with the inflated count. Nothing can correct them retroactively.
</details>
