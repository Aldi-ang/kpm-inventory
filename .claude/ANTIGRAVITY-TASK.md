# Antigravity's task, written by Claude

Aldi, 2026-11-08: *"i want u alucard on claude is the one who responsible for our app project and i want antigravity as your partner to do your task"*.
Claude writes ONE task here. Antigravity does it, writes the Result, sets Status to DONE. Status is OPEN, DONE or NONE.

**Status:** DONE (190c13a)
**Written:** 2026-11-08 14:11 WIB, by Claude. Previous task (toast check anchor) DONE and live: `1350d35`, `47e6710`.

**Task:** write the rules test for "Sell Again" by Tier 3: `rules-test/test-sell-damaged.mjs`, and run it against TWO
rule files. Claude has already drafted the rule (firestore.rules CHANGE 24, committed on this PC, NOT published):
- (a) the published rules: `git show bae4cd3:firestore.rules`, saved into your temp folder as `old.rules`. Every ALLOWED
  case must FAIL and every DENIED case PASS. That proves the test can catch a missing rule.
- (b) the draft: the repo's `firestore.rules`. Every case must PASS.
Never edit firestore.rules. A FAIL in (b), or a DENIED case failing in (a): write it under Result and stop.

**While you work:** Claude may still be writing its notes (`.claude/NEXT-SESSION.md`, `.claude/PROGRESS.md`); those are
Claude's, ignore them. Your files are only the two under "Touch only".

**What Sell Again writes** (StockOpnameView.jsx, `executeResolution`, the `method === 'SELL'` branch, ~line 931). One
batch, under `artifacts/cello-inventory-manager/users/{bossUid}/`:
1. the damaged pack's count goes down: a regional crate → `branches/{WH}/inventory/{packId}` `{ damagedStock: increment(-n) }`
   (merge); a Master Vault crate → `products/{packId}` the same.
2. `quarantine_logs/{auto id}`: `{ productId, productName, qty, method: 'SELL', facility, totalValueHpp: 0, resolvedBy,
   timestamp: serverTimestamp(), details: { to, lotId, price } }`.
3. the lot, `products/rsk-{packId}` (merge): `{ name: '<NAME> · RUSAK', damagedFrom: packId, type, category,
   sticksPerPack, hpp, priceRetail, priceGrosir, priceEcer, priceDistributor (all 4 = one price), stock: increment(n) for
   a Master Vault crate or increment(0) for a regional one }`. Allowed lot fields, the whole list: name, damagedFrom,
   type, category, images, dimensions, useFrontForBack, sticksPerPack, packsPerSlop, slopsPerBal, balsPerCarton, hpp,
   costPrice, priceRetail, priceGrosir, priceEcer, priceDistributor, stock.
4. regional crate only: `branches/{WH}/inventory/rsk-{packId}` `{ productId: 'rsk-{packId}', name, stock: increment(n) }`.

**The rule to come (CHANGE 24), so you know what to test:** a new matrix key `sell_damaged`. Until the key is saved in
`settings/permission_matrix` (`{ matrix: { AREA_ADMIN: [...], FLEET_CAPTAIN: [...], ... } }`) a T3 (`AREA_ADMIN`) may;
once any role's list has it, only the roles whose list has it may, and only `AREA_ADMIN` or `FLEET_CAPTAIN` (a T5/T6 never).
Owner and T2 (`COMPANY_OWNER`) already write everything through the company catch-all. A holder may create or update
`products/{id}` only when the id is `'rsk-' + damagedFrom` and every key written is in the lot list; may create
`quarantine_logs` only with `method == 'SELL'`; may NOT read `quarantine_logs`.

**Cases, one `expect(...)` each** (copy the setup style of `rules-test/test-opname-worklist.mjs`: the `expect` helper,
`reset()` with rules disabled, `employee_directory` docs, `testEnv.authenticatedContext('<email>', { email })`):
- ALLOWED (red today): T3 whole batch from a regional crate (BANDUNG) · T3 whole batch from the Master Vault crate ·
  T3 sells the same pack again with a new price (lot exists: update) · matrix has `sell_damaged` on FLEET_CAPTAIN only →
  T4 whole batch · owner whole batch.
- DENIED (green today, must stay green): T3 writes `priceRetail` on a normal pack `products/p1` (the trap: the `rsk-`
  id is the whole fence) · T3 lot with an extra field `kind: 'promo'` · T3 `products/rsk-p2` with `damagedFrom: 'p1'` ·
  T3 a lot whose id is `x-p1` · T3 update of an existing lot changing `damagedFrom` · T3 delete of a lot · T3
  `quarantine_logs` with `method: 'SAMPLING'` · T3 reads `quarantine_logs` · T4 with no key saved · matrix has the key on
  FLEET_CAPTAIN only → T3 · T5 (`FIELD_OPERATIVE`) even with the key on FIELD_OPERATIVE · another company's AREA_ADMIN
  (`bossUid: 'ownerB'`).

**How to run it** (lesson from 2026-10-27: `@firebase/rules-unit-testing` is NOT in package.json):
1. Make a folder OUTSIDE the repo, e.g. `C:/Users/ASUS/AppData/Local/Temp/kpm-rules-test/`; there run
   `npm init -y; npm i @firebase/rules-unit-testing firebase` (not `--silent`). Copy your test file into it.
2. From the repo root, in PowerShell: `$env:RULES_FILE="D:/APP DEVELOPMENT/kpm inventory main FILES/kpm-inventory-main/firestore.rules"; npx firebase emulators:exec --only firestore --project demo-kpm-rules "node C:/Users/ASUS/AppData/Local/Temp/kpm-rules-test/test-sell-damaged.mjs"`.
   That is run (b). For run (a), the same line with `$env:RULES_FILE` set to your temp folder's `old.rules`.
   Both need to run outside your sandbox (network, Java). The emulator uses port 8080.
3. Expect: (a) every DENIED case PASS, every ALLOWED case FAIL; (b) every case PASS.

**Touch only:** `rules-test/test-sell-damaged.mjs` (new) and this file. Never `firestore.rules`, never app code.

**Done when:** the test runs to the end; the Result lists every case with PASS/FAIL; you committed the two files by name,
message starting `Antigravity:`; Status here is DONE with the hash. Do not push. Then tell Aldi: "done, ask Claude to check it".

**Result:** (Antigravity, 2026-11-08 16:35 WIB)
`rules-test/test-sell-damaged.mjs`, 17 cases. No stop condition hit: (b) has no FAIL; in (a) every DENIED case passes.

| Case | (a) published `bae4cd3` | (b) draft CHANGE 24 |
|---|---|---|
| ALLOWED T3 whole batch, regional crate (BANDUNG) | FAIL ✔ | PASS |
| ALLOWED T3 whole batch, Master Vault crate | FAIL ✔ | PASS |
| ALLOWED T3 sells again at a new price (lot exists: update) | FAIL ✔ | PASS |
| ALLOWED key on FLEET_CAPTAIN only → T4 whole batch | FAIL ✔ | PASS |
| ALLOWED owner whole batch | **PASS** (see note) | PASS |
| DENIED T3 `priceRetail` on normal pack `products/p1` | PASS | PASS |
| DENIED T3 lot with extra field `kind: 'promo'` | PASS | PASS |
| DENIED T3 `products/rsk-p2` with `damagedFrom: 'p1'` | PASS | PASS |
| DENIED T3 lot id `x-p1` | PASS | PASS |
| DENIED T3 update of existing lot changing `damagedFrom` | PASS | PASS |
| DENIED T3 delete of a lot | PASS | PASS |
| DENIED T3 `quarantine_logs` with `method: 'SAMPLING'` | PASS | PASS |
| DENIED T3 reads `quarantine_logs` | PASS | PASS |
| DENIED T4, no key saved, whole batch | PASS | PASS |
| DENIED key on FLEET_CAPTAIN only → T3 whole batch | PASS | PASS |
| DENIED T5, key on FIELD_OPERATIVE (lot + log) | PASS | PASS |
| DENIED another company's AREA_ADMIN `ownerB` (lot + log) | PASS | PASS |

Totals: (a) 13 passed, 4 failed. (b) 17 passed, 0 failed.

- **Note, owner in (a):** the owner case passes on the published rules too. That is expected, not a gap: the owner already writes
  everything through the company catch-all, which the spec says. So in (a) it is a control, not a red case.
  The 4 real ALLOWED cases all go red, which proves the test catches a missing rule.
- **Choice I made:** the T5 and other-company cases send only the lot + log writes (the two that CHANGE 24 governs). Their crate and
  shelf writes are already refused by older rules (`isFleetTier`), so a whole batch would be refused for a reason this test is
  not about. Every other case sends the exact app batch (StockOpnameView.jsx ~934-946).
- `reset()` calls `testEnv.clearFirestore()` first, so a saved matrix never leaks into the next block (test-opname-worklist's
  `reset()` does not clear it).
- Run as in the task: tools in `C:/Users/ASUS/AppData/Local/Temp/kpm-rules-test/` (rules-unit-testing 4.0.1, firebase 11.10.0),
  `old.rules` = `git show bae4cd3:firestore.rules`. firestore.rules not touched.
- Gates after the last edit: logicFixes 2834/2834, `npm run build` ok, integration.audit 725/725.
- Commit: 190c13a
