# Antigravity's tasks, written by Claude

Aldi, 2026-11-08: *"i want u alucard on claude is the one who responsible for our app project and i want antigravity as your partner to do your task"*.
Aldi, 2026-11-16: *"u should give another jobs for antigravity until all the usage runout from it so that we can save some quota here"* - so this file is now a QUEUE: do Task 1, commit, then go straight on to Task 2, then Task 3. Do not wait for Claude between them.
Aldi, 2026-11-16 20:15: *"keep giving antigravity jobs without i need to ask everytime if its running out of quota i'll tell u"* - Claude keeps at least 2 OPEN tasks here. Work them top to bottom; when the last one is DONE, stop and wait for Claude to refill.

**Your jobs are THINKING jobs** (Aldi, 2026-11-10): reading code, audits, reviews. Never a browser, never a click-through.
**Previous task (the 39 Fleet self-checks): DONE, reviewed by Claude 2026-11-16 (commit ca4921ca): count adds up (2981 - 3 merged + 4 new = 2982), no check weakened. Its Result table is in that commit.**

**NEW 2026-11-17 08:58 - BUILD tasks.** Aldi: *"your quota is almost finish i want u to make antigrav work 75% of your work if possible make sure u give the exact notes and information before its working and you are here to check make sure all the quota for antigrav is depleted first"*. A task marked **BUILD** may edit the files in its own "Touch only" list - nothing else - and run `npm run build` and the checks. It still never pushes, never deploys, never touches firestore.rules or A-Brain, never opens a browser. Claude reads every BUILD commit (`git show`) and re-runs the gates before anything goes live.

## BUILD rules (only for a task marked BUILD)
- classNames, words and the checks it names - NEVER a handler, an `onClick=`/`onChange=` body, a `name=` on an input, a Firestore call, or a `data-guide=` / `data-mission=` / `data-mark=` attribute.
- **NEW 2026-11-17 21:50 - a FIFTH gate, first:** `node src/config/undef.check.mjs` must end with `clean`. Why: Task 57 called `isTitip` and `txTime` without importing them; build and all four gates passed (Vite does not check undefined names) and the Receivables screen would have crashed on the first shop that owes. Claude fixed it in e4c1e313.
- After your LAST edit, all four must pass, in this order: `node src/config/logicFixes.selfcheck.mjs` (0 failed) · every `src/config/*.selfcheck.mjs` by exit code (`for f in src/config/*.selfcheck.mjs; do node "$f" >/dev/null 2>&1 || echo "RED $f"; done` prints nothing) · `npm run build` (exit 0) · `node src/config/integration.audit.mjs` (0 failed). One red = do NOT commit the code; write what is red in the Result, set Status BLOCKED, `git checkout -- <your files>`, go to the next task.
- Commit the "Touch only" files + this file together, message "Antigravity: Task N <what>". Put the four check results (pass counts) in the Result.

## Rules for every task below
- READ-ONLY on the app (except a BUILD task's own list): never edit anything in src/, firestore.rules, A-Brain. Never deploy, push, or open a browser.
- An answer you did not read in TODAY's code is CAN'T TELL. Every claim carries file:line.
- Touch only THIS file: write the task's Result under it, set its Status to DONE, commit THIS file alone with a message starting "Antigravity:", then start the next task.
- Claude may be committing to the same branch while you work. Before each commit run `git status`; if anything other than this file is staged, unstage it.

---

## Task 1 - review the new Fleet & Roster code for real bugs
**Status:** DONE

Claude built the professional Fleet & Roster in commit 48c5081e (you rewrote its checks in ca4921ca). It goes live today. Read, as a reviewer looking for bugs that would cost Aldi money, stock or trust:
- `src/components/LoadSheet.jsx` (whole file, ~260 lines) - the sheet that loads and returns stock.
- In `src/FleetCanvasManager.jsx`: `rosterRow`, `pickAgent`, `closePanel`, `soldByAgent`, `lastDay`, `dayStrip`, and the block from `{/* THE PERSON PANEL` to its `</aside>`.
- In `src/utils/vanBay.js`: `soldBks`, `lastDaySold`, `suggestBks`.
- The two writers it calls, unchanged: `handleLoadCanvas`, `handleReturnToWarehouse` in FleetCanvasManager.jsx.

**Check at least these:** a promo item (pcs) loaded or returned - is it ever added into a Bks total? · the − + cap: can a press go above the warehouse stock, or (Return tab) above what the van holds? · a load where one product fails and another succeeds: what stays on the sheet, what the toast says, is anything written twice? · switching from Load to Return tab with numbers on the sheet: can the Load numbers be sent as a return or the other way round? · Fill suggested / Usual load / Copy a teammate with a product the warehouse does not carry, or with 0 stock · a person with no sales before today (lastDay empty) · a typed number with letters, a minus sign, a decimal · `busy` - can a second press of Load van during a slow save send the lines twice? · the Activity tab: a RETUR's total shown with a minus, an exchange, an IOU fulfilment · anything in LoadSheet that re-creates a component per render (the flicker Aldi forbade) · any user-facing English that is unclear or wrong.

**Result:** ONE table: Finding | Who hits it | What goes wrong (money / stock / trust / looks) | file:line | Severity (HIGH / MED / LOW) | Smallest fix in one sentence. Worst first; count per severity on top. If you find nothing in a line of the checklist, say "checked, fine" for it.

**Result:**
0 HIGH, 1 MED, 3 LOW.

| Finding | Who hits it | What goes wrong | file:line | Severity | Smallest fix |
|---|---|---|---|---|---|
| Tab buttons stay clickable during `busy` save | Admin loading/returning on slow network | Switching to `Return` or another tab while `go()` is awaiting `onLoad`/`onReturn` lets the user interact with another tab mid-save and renders the `SURAT JALAN` report under the wrong tab when `go()` finishes. | `src/components/LoadSheet.jsx:166` | MED | Add `disabled={busy}` to the tab `<button>` elements. |
| `go()` double-submit relies on React state `busy` | Admin double-tapping `Load van` / `Return to warehouse` in the same frame | Two clicks in the same render frame before `disabled={busy}` paints can both pass `if (busy ...)` and run `onLoad`/`onReturn` twice. | `src/components/LoadSheet.jsx:136-138` | LOW | Guard `go()` with a `useRef` lock (`busyRef.current`) set synchronously before `await`. |
| Phone row says `Loaded` on left and `van empty` on right for promo-only vans | Phone viewer looking at a salesman carrying only promo pcs (`loaded === 0`, `pcs > 0`) | `rosterRow` prints `Loaded` in the subtitle (`has = loaded > 0 \|\| pcs > 0`) while the right-hand `.ph` cell checks only `loaded > 0` and prints `van empty`. | `src/FleetCanvasManager.jsx:880,889,895` | LOW | Show `+ {pcs} pcs` instead of `van empty` in `.ph` when `pcs > 0`. |
| `soldBks` passes `inventory` (no `promoItems`) to `convertToBks` | Anyone if a promo product ever appears in `t.items` | `inventory.find(...)` returns `undefined` for a promo ID and `convertToBks` returns raw `qty`, which would add `pcs` into `soldByAgent` (`Bks`). (Today promo rides separately, so dormant.) | `src/utils/vanBay.js:385`, `src/FleetCanvasManager.jsx:931` | LOW | Skip items where `promoItems` matches or `!inventory.find(p => p.id === it.productId)` in `soldBks`. |

**Checklist (all remaining items checked, fine):**
- Promo items (`pcs`) vs `Bks` totals: checked, fine (`LoadSheet.jsx:132-133,152,238`, `FleetCanvasManager.jsx:844,878`).
- `−` / `+` cap against warehouse stock (Load) and van stock (Return): checked, fine (`LoadSheet.jsx:69,78,87-94`, `FleetCanvasManager.jsx:645,803`).
- Partial failure (one product fails, one succeeds): checked, fine — only failed lines stay in `map` with `why[p.id]`, succeeded lines clear, toast reports both counts (`LoadSheet.jsx:139-155`).
- Switching Load <-> Return with numbers on sheet: checked, fine — separate `qty` and `back` states (`LoadSheet.jsx:60-61,67-71`).
- Fill suggested / Usual load / Copy a teammate with missing or 0-stock products: checked, fine (`LoadSheet.jsx:97-112`).
- Person with no sales before today (`lastDay` empty): checked, fine (`vanBay.js:391-402`, `LoadSheet.jsx:113-117,206,222`).
- Typed input with letters, `-`, or decimals: checked, fine (`parseInt(..., 10) || 0` + `clamp` in `LoadSheet.jsx:78,212`).
- Activity tab (`RETUR` minus, `Tukar Ganti` exchange, `IOU Fulfillment`): checked, fine (`FleetCanvasManager.jsx:1592-1604`).
- No component re-created inside `LoadSheet` render (`CountUp` top-level, `<aside key={sel.id}>`): checked, fine (`LoadSheet.jsx:30`, `FleetCanvasManager.jsx:1518`).
- User-facing English clarity: checked, fine (`LoadSheet.jsx:117,155`, `FleetCanvasManager.jsx:859`).

---

## Task 2 - the Retur audit (Aldi queued it 2026-11-11; parked twice, now it runs)
**Status:** DONE

The full task text is in git: run `git show f3ff4b4b:.claude/ANTIGRAVITY-TASK.md` and do the task written there ("Find every way a return (RETUR) could be used for gain"), with its own "Check at least these" list and its own Result format. Write the Result here.

**Result:**
**Counts:** 6 OPEN · 4 STOPPED · 0 CAN'T TELL.

| Way | Who | Gain | Answer | file:line | One sentence |
|---|---|---|---|---|---|
| Create a `RETUR` doc directly via SDK without `allowRetur` / `allowCashRefund` | Any salesman (T3-T6) | Fake refund / stock credit | OPEN | `firestore.rules:794-798` | `transactions` `allow create: if isSalesman(bossUid)` does not check `type == 'RETUR'`, `allowRetur`, or `allowCashRefund`, so only the UI (`MerchantSalesView.jsx:1271,1818`) stops an unauthorized agent. |
| Return goods with no sale behind them | Agent with `allowRetur` + `allowCashRefund` | Cash refund (`Retur/BS`) | OPEN | `src/MerchantSalesView.jsx:834-865,1289-1290` | Neither the Sales Terminal nor `useTransactionEngine.js:275-321` links a `RETUR` to an existing sale receipt or checks whether the shop ever bought those packs. |
| Return worth more than the sale it reverses (higher tier, larger unit, or more qty) | Agent with `allowRetur` + `allowCashRefund` | Excess cash refund | OPEN | `src/MerchantSalesView.jsx:853-864,958,973-984` | `BUYBACK` puts no qty cap in `updateCartItem`, allows changing `unit`/`priceTier` (when not `lockedTier`), and refunds at the chosen tier/unit without comparing against any original sale. |
| Return the same goods twice (or put `GOOD` stock back into van/vault for repeat refund) | Agent with `allowRetur` + `allowCashRefund` | Cash refund + inflated stock | OPEN | `src/MerchantSalesView.jsx:835,958`, `src/hooks/useTransactionEngine.js:284` | No per-sale return tracking exists, and a `GOOD` condition `RETUR` sets `isReturnedToStock = true` so the packs re-enter van/vault stock and can be sold or returned again. |
| Cash refund (`Retur/BS`) when original sale was `Titip` or `Transfer` | Agent / shop owner | Cash taken out of `Cash` drawer on a non-cash sale | OPEN | `src/components/HistoryReportView.jsx:289` | `HistoryReportView` subtracts every `RETUR` from `payments['Cash']` regardless of how the original sale was paid, and `RETUR` does not settle unpaid `Titip`. |
| Exchange (`Tukar Ganti`) inflates `storesServed` and `itemsBks` career/EOD stats | Salesman with `allowRetur` | Higher `storesServed` / `itemsBks` | OPEN | `src/MerchantSalesView.jsx:1285-1287`, `src/EODReconciliationView.jsx:217,223` | `EXCHANGE` saves as `type: 'SALE'` (`paymentType: 'Tukar Ganti'`), so EOD counts it in `storesServed` and `itemsBks` even though it is a Rp 0 swap. |
| Lower cash owed at EOD (`expectedCash`) via a fake `RETUR` | Salesman | Lower EOD cash bill | STOPPED | `src/EODReconciliationView.jsx:195-205` | `expectedCash` only sums `(t.type === 'SALE' && method !== 'Titip') \|\| t.type === 'CONSIGNMENT_PAYMENT'`, so `type: 'RETUR'` never reduces what the salesman owes at EOD. |
| Change a shop's package count via `RETUR` | Salesman / shop owner | Extra limited package | STOPPED | `src/utils/vanBay.js:148,255-265` | `bundleTaken` counts only `(t.type \|\| 'SALE') === 'SALE'` (never `RETUR`), and `packageReturns` flags any `RETUR` within 7 days of a package sale in History. |
| Edit or delete a `RETUR` after EOD (T3-T6) | Salesman / T3-T6 | Alter or erase return record | STOPPED | `firestore.rules:797`, `src/components/HistoryReportView.jsx:921-922` | `transactions` has `allow update, delete: if false` for T3-T6 and Edit/Delete keys are gated behind `isAdmin` (note: T1/T2 admin can edit/delete in History, though EOD's stored `gap` in `eodRecord.js:125-134` stays unchanged). |
| Sync an offline `RETUR` twice | Salesman on bad signal | Double refund / double stock | STOPPED | `src/utils/vanSync.js:126-127` | `syncOfflineSale` uses a fixed `tx.cloudId` and returns `{ landed: false }` inside `runTransaction` if `txSnap.exists()` is true. |

---

## Task 3 - why the demo guide's step 1 points at the wrong place on a PC
**Status:** DONE

On a PC-size window (1280 x 800), demo guide step 1, beat 2 says "Buka Restock Vault dari menu." but its ring sits at x 14, y 225, size 56 x 56 - on the dashboard, not on a menu key - and pressing there three times does nothing (found by Claude's lab walk 2026-11-16). On the phone the same beat works.

Read `src/config/demoMission.js` (the `nav(...)` helper and GUIDE[1]), `src/components/DemoMission.jsx` (how a beat's `at` selector is resolved to a ring, how `done` is checked) and the PC menu in `src/components/BiohazardTheme.jsx` (where the Restock Vault key is on a wide screen, its `data-mark`, and whether it is hidden or collapsed at 1280 px). Answer: which element the ring is drawn round at 1280 px and why, what the beat should point at instead, and the smallest change (file:line + the new selector) - do NOT make the change.

**Result:**
1. **Which element the ring is drawn round at 1280 px and why:**
   - The ring is drawn round the hidden `<button data-mark="restock_vault">` inside `<nav className="kpm-rail-grid">` (`src/components/BiohazardTheme.jsx:915-925`).
   - On desktop (`>= 1024px`), `nav('restock_vault', ...)` (`src/config/demoMission.js:33`) puts `[data-mark="restock_vault"]` first in `at`. `aim()` in `src/components/DemoMission.jsx:142-155` only checks `getBoundingClientRect()` via `shows(el)` (`width > 0 && height > 0 && left < innerWidth`), not `opacity` or `pointer-events`.
   - At rest on PC, `src/styles/theme.css:2024,2077` sets `[data-kpm-rail] { pointer-events: none; }` and `.kpm-rail-pod > *:not(.kpm-rail-totem) { opacity: 0; }`, collapsing the visible menu into the 56x56 `.kpm-rail-totem` circle at top-left (`theme.css:2053`), while `[data-mark="restock_vault"]` still keeps its layout box at `x ~ 14, y ~ 225`. Clicking it 3 times does nothing because `pointer-events: none` lets clicks fall through to the dashboard.

2. **What the beat should point at instead:**
   - When the PC rail is collapsed, point at `.kpm-rail-totem` (the visible 56x56 top-left circle that opens the rail on hover/focus); once the rail is open (`[data-kpm-rail]:hover`, `[data-kpm-rail]:has(:focus-visible)`, or on phone `[data-kpm-rail].translate-x-0`), point at `[data-mark="${id}"]`; when closed on phone (`lg:hidden`), fall through to `[aria-label="Open navigation"]`.

3. **Smallest change (do not apply here):**
   - `src/config/demoMission.js:33-34` — change `nav` to:
     ```js
     const nav = (id, label, inside) => ({
         at: [`[data-kpm-rail]:hover [data-mark="${id}"], [data-kpm-rail]:has(:focus-visible) [data-mark="${id}"], [data-kpm-rail].translate-x-0 [data-mark="${id}"]`, '.kpm-rail-totem', '[aria-label="Open navigation"]'],
         say: [`Buka ${label} dari menu.`, `Arahkan kursor ke tombol menu di kiri atas, lalu pilih ${label}.`, `Buka menu, lalu pilih ${label}.`],
         done: inside
     });
     ```

---

## Task 4 - why the Offers and Add personnel panels open cut at the top in the demo
**Status:** DONE
**Written:** 2026-11-16 15:40 WIB, by Claude. Same rules as above (read-only, touch only this file, commit it alone, "Antigravity:").

Aldi's frame from the live demo: in Fleet & Roster, pressing OFFERS (and the add-person key) opens a panel whose top - its title row and its X - sits UNDER the demo's mission strip ("2 3 4 5 6 7 8"). Read `FrontPanel` at the top of `src/FleetCanvasManager.jsx` (`fixed inset-0 z-[480]`), where it renders in the tree, the shell in `src/components/BiohazardTheme.jsx` (the box around the screen: `print-reset relative z-10 ...`), and the demo bars in `src/styles/theme.css` (`.kpm-demo-bar` z 95, `.kpm-mission` z 96) and `src/components/DemoMission.jsx` (the guide veil `.kpm-mx-veil` z 400). Answer: which stacking context traps FrontPanel and why z 480 loses to z 96; whether `createPortal(…, document.body)` alone fixes it; what then sits above / below it (the demo bars, the guide veil and its caption, the dialog gate z 10001, the toast host); every OTHER panel in the app built the same way that has the same bug (grep `fixed inset-0 z-` in src); and the smallest change, file:line. Do NOT make it.

**Result:**
1. **Stacking context & why `z-[480]` loses to `z 96`:**
   - `src/components/BiohazardTheme.jsx:1122` wraps all tab views (`{children}`, including `FleetCanvasManager`) in `<div className="print-reset relative z-10 flex-1 flex flex-col overflow-hidden">`, which creates a root-level stacking context at `z-index: 10`.
   - `FrontPanel` (`src/FleetCanvasManager.jsx:32`, `fixed inset-0 z-[480]`) renders inside that `z-10` box, so its `z-[480]` only sorts against siblings inside `z-10`. To the root stacking context, the entire `z-10` box is `z: 10`, which loses to `.kpm-demo-bar` (`z: 95`, `src/styles/theme.css:5961`) and `.kpm-mission` (`z: 96`, `src/styles/theme.css:6011`) rendered outside `z-10` — so the fixed `71px` top bars cover `FrontPanel`'s top edge.

2. **Does `createPortal(..., document.body)` alone fix it, and what sits above / below?**
   - **Yes**: portaling `FrontPanel` to `document.body` moves it out of `z-10` into the root stacking context at `z: 480`.
   - **Below `FrontPanel` (`480`):** `.kpm-demo-bar` (`z: 95`, `theme.css:5961`), `.kpm-mission` (`z: 96`, `theme.css:6011`), `.kpm-mx-veil` (`z: 400`, `theme.css:6035`), `.kpm-mx-cap` (`z: 401`, `theme.css:6040`). (Note: `400/401 < 480` means the guide veil/caption sit *under* `FrontPanel`, which is right unless a guide beat targets something inside `FrontPanel`.)
   - **Above `FrontPanel` (`480`):** `Toast` host (`z-[10000]`, `src/components/Toast.jsx:118`) and `ConfirmGate` (`z-[10001]`, `src/components/ConfirmGate.jsx:131`).

3. **Every OTHER `fixed inset-0 z-` panel rendered inside `BiohazardTheme`'s `z-10` wrapper without `createPortal`:**
   - `src/FleetCanvasManager.jsx:965,1022` (`z-[500]` reprint receipt & Surat Jalan)
   - `src/JourneyView.jsx:1218,1930` (`z-[9999]` fullscreen map, `z-[2000]` modal)
   - `src/ConsignmentFinanceView.jsx:648` (`z-[500]` receipt)
   - `src/MerchantSalesView.jsx:2472,3027,3121,3240` (`z-[149]` mobile manifest scrim, `z-[300]`/`z-[400]` modals; lines `1749` and `2479` already portal)
   - `src/RestockVaultView.jsx:1199,1206,1239,1283,1372` (`z-[100]`–`z-[300]`)
   - `src/StockOpnameView.jsx:1112,1119` (`z-[400]`/`z-[500]`)
   - `src/components/HistoryReportView.jsx:940,956` (`z-[600]`/`z-[100]`)
   - `src/components/AcceptanceReceipt.jsx:61` (`z-[200]`), `src/components/ArrivalScanner.jsx:81` (`z-[220]`), `src/components/CrownTransferProtocol.jsx:135` (`z-[100]`), `src/components/ExamineModal.jsx:81` (`z-[10000]`), `src/components/ImageCropper.jsx:171` (`z-[70]`), `src/components/PhotoField.jsx:168` (`z-[9999]`), `src/components/SaleReceipt.jsx:32` (`z-[500]`, when not via `DayReplay`), `src/components/SamplingManager.jsx:544` (`z-[100]`), `src/components/ShipmentLabel.jsx:55` (`z-[200]`).

4. **Smallest change (do not apply):**
   - `src/FleetCanvasManager.jsx:1` — import `{ createPortal } from 'react-dom';`
   - `src/FleetCanvasManager.jsx:31-41` — wrap `FrontPanel`'s `return (...)` in `return createPortal(..., document.body);`.

---

## Task 5 - write the capybara's sidebar tour (Indonesian lines, for Claude to place)
**Status:** DONE

Aldi, 2026-11-16: *"he should give step by step tutorial starting from the sidebar first and what it use then to the next"*. Before step 1 of the demo guide, the capybara should walk the menu one item at a time and say what each one is for. Read the menu in `src/components/BiohazardTheme.jsx` (each key's `data-mark` and label, in the order shown, per tier if the list changes by tier), the guide's existing voice in `src/config/demoMission.js` (STEPS, GUIDE, the capybara's intro lines in `src/components/DemoMission.jsx`) and, for what each screen really does, the screen's own file. Write ONE table: order | data-mark | the menu label as shown | one Indonesian line the capybara says (max ~110 characters, plain words a shop salesman understands, formal "Anda" - NEVER "kamu", no English jargon except the screen's own name) | which demo tier sees it. Keep the guide's tone: short, friendly, practical. Do NOT edit the code.

**Result:**
Menu order from `src/components/BiohazardTheme.jsx:501-535`; demo tier visibility from `src/config/permissions.js:154-203` (demo tiers: T2 Owner/Admin, T4 Fleet Captain, T6 Salesman).

| Order | `data-mark` | Menu label | Indonesian line (<= 110 chars, formal "Anda") | Demo tiers |
|---|---|---|---|---|
| 1 | `agent_profile` | Agent Profile | Di Agent Profile, Anda melihat profil, target, peringkat, dan catatan kerja Anda. | T2, T4, T6 |
| 2 | `dashboard` | Command Center | Command Center merangkum penjualan, setoran, dan stok perusahaan hari ini dalam satu layar. | T2 |
| 3 | `map_war_room` | Map System | Map System memantau posisi salesman dan sebaran toko di peta secara langsung. | T2, T4 |
| 4 | `journey` | Journey Plan | Journey Plan menampilkan daftar toko yang harus Anda kunjungi hari ini dan urutannya. | T2, T4, T6 |
| 5 | `fleet` | Fleet & Canvas | Di Fleet & Canvas, pimpinan mengatur tim serta memuat dan menarik stok barang ke tas salesman. | T2, T4 |
| 6 | `inventory` | Master Vault | Master Vault menyimpan stok utama perusahaan di gudang pusat beserta barang rusak. | T2 |
| 7 | `agent_inventory` | Agent Inventory | Agent Inventory menampilkan isi tas jualan Anda sekarang dan catatan pemasukan hari ini. | T4, T6 |
| 8 | `restock_vault` | Restock Vault | Restock Vault mencatat barang masuk dari pabrik dan pengiriman stok ke gudang wilayah. | T2 |
| 9 | `sales` | Sales Terminal | Sales Terminal dipakai untuk mencatat penjualan ke toko, barang titipan, dan retur barang rusak. | T2, T4, T6 |
| 10 | `receivables` | Receivables & Consignment | Receivables & Consignment mencatat tagihan titipan toko yang belum lunas dan pembayarannya. | T2, T4 |
| 11 | `eod` | EOD Setoran | Di EOD Setoran, Anda menutup hari: hitung uang tunai, sisa barang, dan kirim laporan ke atasan. | T2, T4, T6 |
| 12 | `stock_opname` | Stock Opname | Stock Opname dipakai untuk menghitung stok fisik gudang dan mencocokkannya dengan catatan sistem. | T2, T4 |
| 13 | `customers` | Customers | Di Customers, Anda mengelola daftar toko terdaftar, alamat, dan batas harganya. | T2 |
| 14 | `sampling` | Sampling | Sampling mencatat pembagian rokok contoh gratis ke toko beserta pita cukainya. | T2 |
| 15 | `transactions` | Reports | Reports menyimpan semua riwayat nota penjualan, retur, dan ringkasan hasil kerja. | T2, T4, T6 |
| 16 | `audit` | Audit Logs | Audit Logs merekam setiap perubahan penting di sistem agar semua catatan bisa ditelusuri. | T2 |
| 17 | `settings` | Settings | Di Settings, Anda mengatur bahasa, tampilan hemat baterai, serta aturan perusahaan. | T2, T4, T6 |

---

## Task 6 - turn your 6 OPEN Retur holes into decisions Aldi can answer
**Status:** DONE
**Written:** 2026-11-16 15:50 WIB, by Claude. Same rules as above (read-only, touch only this file, commit it alone, "Antigravity:").

Aldi decides money; Claude will put each hole to him as a 🔴 DECIDE. For EACH of the 6 OPEN rows in your Task 2 Result, write a block:
- **Worked example** in plain English a 24-year-old business owner reads in 20 seconds: who (a salesman / a shop owner), what they press, the numbers (e.g. "sells 2 Slop for Rp 300.000 cash, then returns 3 Slop as Retur/BS: the app pays back Rp 450.000"), what the company loses.
- **How likely**: does it need a dishonest person, a mistake, or just normal use? Who can do it today (which tiers)?
- **Option A** (the strict fix) and **Option B** (a lighter one, e.g. a warning or a log line instead of a block): what changes for the salesman, file:line to change, and what it might break (offline sales, exchanges, IOU).
- **Rules side**: does the fix also need a firestore.rules change? (Claude drafts rules; Aldi publishes them himself.)
Re-read the code for each: an answer from your Task 2 memory, not today's code, is CAN'T TELL.

**Result:**

### Hole 1: Direct SDK `create` of a `RETUR` without `allowRetur` / `allowCashRefund`
- **Worked example:** A salesman whose `allowRetur` is `false` (cannot even open Retur Mode on screen) uses a direct Firestore SDK call with his login to create a `transactions` doc with `type: 'RETUR'`, `total: 500000`. The database accepts it, so Reports shows a Rp 500.000 cash refund against his company even though the owner locked him out of returns.
- **How likely:** Needs a dishonest person with technical skill (cannot happen by tapping the app UI). Any T3–T6 account in the company can do it today (`firestore.rules:794-798`).
- **Option A (strict fix):** In `firestore.rules:796`, require `request.resource.data.type != 'RETUR'` unless the caller's motorist doc has `allowRetur == true` (and `allowCashRefund == true` for `Retur/BS`). Salesman sees no change in the UI; breaks nothing for normal/offline sales as long as `allowRetur` is set on the motorist doc.
- **Option B (lighter):** Keep rules open and flag any `RETUR` created by an agent whose `allowRetur` is `false` in Reports / Audit Logs. Zero risk to offline sync or edge cases, but does not stop a fake doc before it lands.
- **Rules side:** Option A requires a `firestore.rules` change (published by Aldi); Option B does not.

### Hole 2: Return with no prior sale behind it
- **Worked example:** A salesman with `allowRetur` + `allowCashRefund` picks a walk-in or registered shop (`Toko Baru`) that never bought anything, enters 2 Slop of `Retur/BS` (`Rp 300.000`), and taps `PULL RETUR`. The app saves a Rp 300.000 cash refund (`MerchantSalesView.jsx:1289-1290`, `useTransactionEngine.js:275-321`) with no sale behind it, losing Rp 300.000 in reported revenue/cash.
- **How likely:** Can happen by mistake (picking the wrong shop) or dishonesty. Today any T1–T6 user with `allowRetur` + `allowCashRefund` can do it (`MerchantSalesView.jsx:834-865, 1271`).
- **Option A (strict fix):** Require picking a past `SALE` receipt for that shop before enabling `PULL RETUR` (`MerchantSalesView.jsx:1254-1295`, `useTransactionEngine.js:275`), blocking returns with no prior sale. *What it might break:* Offline returns when the 7-day `transactions` listener does not hold an older sale (say, 2 weeks ago), or returning stock sold before the app existed.
- **Option B (lighter):** Allow unlinked returns, but show a visible warning badge (`No matching sale in last 7 days`) in History / Reports (`HistoryReportView.jsx:875-886`) and require a `reason` note. No change to offline or old-stock returns.
- **Rules side:** Neither option strictly needs `firestore.rules` unless you also enforce a `sourceSaleId` field server-side.

### Hole 3: Return worth more than the sale it reverses (higher tier, larger unit, or more qty)
- **Worked example:** A shop bought 2 Slop at `Grosir` (`Rp 140.000/Slop` = `Rp 280.000`). Later, the salesman opens `BUYBACK` (`MerchantSalesView.jsx:958, 973-984`), switches the tier to `Ecer` (`Rp 165.000/Slop`) and qty to `3 Slop`: the app books a `Rp 495.000` cash refund — `Rp 215.000` more than the shop ever paid.
- **How likely:** Easy to hit by mistake (wrong tier or unit left selected on an unlocked/walk-in shop, since `lockedTier` only locks registered shops) or dishonesty. Any T1–T6 user with `allowRetur` + `allowCashRefund` can do it (`MerchantSalesView.jsx:853-864, 958`).
- **Option A (strict fix):** Link `BUYBACK` to a prior `SALE` receipt and cap each product's returnable `qty`, `unit`, and `priceTier` to what was on that sale (`MerchantSalesView.jsx:958, 973-984`). *What it might break:* Partial returns across multiple visits or offline returns of older sales not in memory.
- **Option B (lighter):** Lock `BUYBACK` pricing to the shop's `lockedTier` (or lowest tier `Grosir` when unlocked) and show the shop's last sale price next to the cart line (`MerchantSalesView.jsx:853-864, 973-984`). Zero breakage for offline/old-stock returns.
- **Rules side:** No `firestore.rules` change needed for UI/client-side pricing caps.

### Hole 4: Same goods returned twice (or `GOOD` stock returned into van for repeat refund)
- **Worked example:** A salesman processes a `GOOD`-condition `Retur/BS` for 2 Slop (`Rp 300.000`). `isReturnedToStock` (`useTransactionEngine.js:284`) puts those 2 Slop back into his van's `activeCanvas`. He then submits a second `Retur/BS` for the same 2 Slop at another walk-in name — booking another `Rp 300.000` refund while the van only gained 2 Slop once (or selling them as cash).
- **How likely:** Needs a dishonest person (or accidental double-tap across two separate deals). Anyone with `allowRetur` + `allowCashRefund` can do it (`MerchantSalesView.jsx:835, 958`, `useTransactionEngine.js:284`).
- **Option A (strict fix):** Track returned quantities per `sourceSaleId` (never allow total returned qty > sold qty on that receipt) and route `GOOD` buybacks to a separate pending-inspection bucket until EOD instead of straight back to sellable `activeCanvas` (`useTransactionEngine.js:284`). *What it might break:* Salesman cannot immediately resell `GOOD` returned packs on the same route.
- **Option B (lighter):** Keep `isReturnedToStock = true`, but require a mandatory photo + show a daily `Retur/BS` alert card per salesman in Reports/EOD when >1 `RETUR` happens on the same day (`HistoryReportView.jsx`, `EODReconciliationView.jsx`).
- **Rules side:** No `firestore.rules` change needed unless `sourceSaleId` uniqueness/limits are enforced server-side.

### Hole 5: Cash refund (`Retur/BS`) when original sale was `Titip` or `Transfer`
- **Worked example:** A shop took 2 Slop on `Titip` (`Rp 300.000` unpaid consignment) or paid via `Transfer`. Later, the salesman processes `Retur/BS` (`Rp 300.000`). `HistoryReportView.jsx:289` unconditionally subtracts `Rp 300.000` from `payments['Cash']`, making the Cash report look Rp 300.000 lower while the shop's `Titip` balance (`ConsignmentFinanceView`) is still Rp 300.000 unpaid.
- **How likely:** Happens in **normal use** whenever a `Titip` or `Transfer` customer returns goods for `Retur/BS`. Anyone with `allowRetur` + `allowCashRefund` hits it (`HistoryReportView.jsx:289`).
- **Option A (strict fix):** On `Retur/BS`, let the salesman choose whether the refund settles `Titip` (reducing consignment debt instead of `Cash`) or refunds `Cash`/`Transfer` (`MerchantSalesView.jsx:1289`, `HistoryReportView.jsx:289`). *What it might break:* Adds one extra choice in Retur Mode; `ConsignmentFinanceView` must include that credit.
- **Option B (lighter):** Keep `Retur/BS` as-is, and in `HistoryReportView.jsx:283-290` display `Retur/BS` as its own separate `Retur` deduction line instead of subtracting it blindly from `payments['Cash']`. Zero workflow change for salesmen.
- **Rules side:** No `firestore.rules` change needed.

### Hole 6: Exchange (`Tukar Ganti`) inflates `storesServed` and `itemsBks` career/EOD stats
- **Worked example:** A salesman visits 3 shops just to swap 5 damaged Slop (`EXCHANGE`, Rp 0). Because `MerchantSalesView.jsx:1285-1287` saves `EXCHANGE` as `type: 'SALE'` (`paymentType: 'Tukar Ganti'`), `EODReconciliationView.jsx:217, 223` counts all 3 shops into `storesServed` and all 5 Slop (50 Bks) into `itemsBks` — boosting his career/rank numbers with zero rupiah sold.
- **How likely:** Happens in **normal use** on every `Tukar Ganti` exchange. Any salesman with `allowRetur` hits it (`MerchantSalesView.jsx:1285-1287`, `EODReconciliationView.jsx:217, 223`).
- **Option A (strict fix):** Exclude `t.paymentType === 'Tukar Ganti'` from `storesServed` and `itemsBks` in `EODReconciliationView.jsx:217, 223` (just like `vanBay.js:384` already excludes `IOU` exchanges from `soldBks`? Note: `Tukar Ganti` exchanges physically swap damaged for good stock, so excluding `Tukar Ganti` from `storesServed` and `itemsBks` keeps career stats strictly for paid/consignment sales). *What it might break:* Existing `EODReconciliationView` self-checks or expectations if an agent expects a swap to count as a store visit.
- **Option B (lighter):** Keep `storesServed` counting the visit, and exclude `Tukar Ganti` only from `itemsBks` (packs sold) in `EODReconciliationView.jsx:223`.
- **Rules side:** No `firestore.rules` change needed.

---

## Task 7 - every demo-guide beat that aims at something hidden (the step-1 bug, all 8 steps)
**Status:** DONE

Your Task 3 found that `aim()` in `src/components/DemoMission.jsx` rings the FIRST element matching a beat's `at` selector even when it is invisible (opacity 0, display none, off-screen, a zero-size box). Read `GUIDE` in `src/config/demoMission.js` (all 8 steps, every beat) and, for each beat's `at` selector, find in the code every element it can match. List the beats where the first match can be hidden at PC width (1280) or phone width (390), name what is hidden and why (the CSS rule, file:line), and say whether ONE change inside `aim()` (skip elements with no visible box / opacity 0 / visibility hidden and take the next match) would fix all of them - or which beats still need their own selector. Note: Fleet & Roster's step 3 was re-pointed today (`.kpm-fleet-row[data-agent]`, `[data-guide="load-plus"]` in `src/components/LoadSheet.jsx`, `[data-ponder="go"]`). Do NOT change the code.

**Result:**

1. **Beats whose first match can be hidden at PC (1280) or phone (390):**
   - **Steps 1–8, beat `nav(id, label, inside)` (`src/config/demoMission.js:33, 56, 63, 69, 73, 79, 88, 92, 97`):**
     - **PC (1280), rail collapsed at rest:** First match `[data-mark="${id}"]` (`src/components/BiohazardTheme.jsx:925`) is inside `.kpm-rail-pod > nav.kpm-rail-grid`. `src/styles/theme.css:2024, 2077` sets `[data-kpm-rail][data-kpm-rail] { pointer-events: none; }` and `.kpm-rail-pod > *:not(.kpm-rail-totem) { opacity: 0; }`, while keeping its layout box (`width > 0, height > 0`). Because `shows()` (`src/components/DemoMission.jsx:142-145`) only checks `getBoundingClientRect()`, `aim()` rings the invisible, unclickable rail button instead of the visible `.kpm-rail-totem` (`theme.css:2053`). (On **phone 390**, `<aside>` has `translate-x-full`, `BiohazardTheme.jsx:820`, so `r.left >= innerWidth` makes `shows()` false and falls through to `[aria-label="Open navigation"]`.)
   - **Steps 1, 2, 7, beat `UNLOCK` (`src/config/demoMission.js:52, 56, 63, 92`):**
     - **PC (1280), rail collapsed at rest:** `at` is `['[data-guide="unlock"]', '[aria-label="Open navigation"]']`. `BiohazardTheme.jsx:985` renders `<button data-guide="unlock">` inside `.kpm-rail-foot` (also `opacity: 0` + `pointer-events: none` per `theme.css:2024, 2077`) BEFORE `App.jsx:5105` (the centered `Unlock System` button on locked vault tabs). So on PC, `aim()` picks the invisible rail button (`985`) instead of `App.jsx:5105` (when on a locked tab) or `.kpm-rail-totem` (when on Dashboard).
   - **All other beats in Steps 1–8:**
     - `SHOP` (`MerchantSalesView.jsx:1753, 1882, 2530`), `slip(...)` (`MerchantSalesView.jsx:1816, 1817, 2109, 2120, 2365, 2406, 2468`), `shelf(...)` (`MerchantSalesView.jsx:2818`), Step 3 (`FleetCanvasManager.jsx:884`, `LoadSheet.jsx:218, 245`), Step 6 (`EODAgentFlow.jsx:164`, `EODLetter.jsx:192`), Step 7 `DIKA` (`PlayerCard.jsx:312, 321, 367`), Step 8 (`StockOpnameView.jsx:1257, 1709, 1780, 2011`): checked, fine — hidden mobile/desktop duplicates use `lg:hidden` (`display: none`, `width: 0`) or `-translate-x-full` (`r.right <= 0`) or `0fr` (`height: 0`), which `shows()` already rejects.

2. **Would ONE change inside `aim()` fix all of them?**
   - **Almost, but `aim()` alone is NOT enough without updating `nav()` and `UNLOCK`:**
     1. In `DemoMission.jsx:142-155`, `shows(el)` must also reject elements with computed `visibility === 'hidden'`, `opacity === '0'`, or `pointerEvents === 'none'` (checking ancestors too, because `.kpm-rail-pod > *` sets `opacity: 0` on `<nav>` and `.kpm-rail-foot`, and `[data-kpm-rail]` sets `pointer-events: none` on `<aside>`), AND `aim()` must remove the `|| all[0]` (`line 151`) and `if (k < 0) k = els.findIndex(Boolean)` (`line 153`) fallbacks so it never rings an invisible fallback.
     2. Even with `shows()` fixed, `nav()` (`demoMission.js:33`) and `UNLOCK` (`demoMission.js:52`) still need `.kpm-rail-totem` in their `at` lists (`[aria-label="Open navigation"]` has `lg:hidden` on PC, so without `.kpm-rail-totem`, `aim()` would return `el: null` when the PC rail is closed).

---

## Task 8 - the other overlays: which ones can open cut under the demo bars
**Status:** DONE
**Written:** 2026-11-16 20:15 WIB, by Claude. Same rules as above (read-only, touch only this file, commit it alone, "Antigravity:").

Your Task 4 Result, item 3, lists the `fixed inset-0 z-` overlays that render inside BiohazardTheme's `relative z-10` box (`src/components/BiohazardTheme.jsx:1122`). FleetCanvasManager's FrontPanel is FIXED (Claude portaled it to `document.body` in 63abfb93) - skip it. The demo bars (`.kpm-demo-bar` z 95 + `.kpm-mission` z 96, `src/styles/theme.css`) cover the top ~71 px of the screen on PC and phone. An overlay inside the z-10 box always sits UNDER them, so it opens cut whenever its title row / close key can land in that top 71 px.

For EACH overlay on your list, read TODAY's code and answer:
- **How it places its box**: centred (`items-center`), top-aligned (`items-start` + padding), full screen, or a bottom sheet. Does the box have a `max-h-*` and does its body scroll (`overflow-y-auto`) with the title row outside the scroll?
- **Can the title row / X land in the top 71 px** on a 1280 x 800 PC and on a 390 x 844 phone? Give the content that would do it (e.g. "a receipt with 12+ lines", "always - it is full screen from top 0").
- **Verdict**: SAFE / AT RISK (name the trigger) / CAN'T TELL. Every claim file:line.

Then the fix question (do NOT make it): would ONE shared change fix every AT RISK row - e.g. a tiny wrapper that portals the overlay to `document.body` (FrontPanel's way), or a CSS rule that pads overlays below the bars only while the demo runs? Say which overlays have a z-index BELOW 96 (e.g. ImageCropper `z-[70]`) and would still sit under the bars after a portal, and whether any overlay must stay inside the z-10 box (one that relies on the shell's font, theme class or a parent's state through CSS).

**Result:**
On 1280 x 800 PC, a centered `p-4` box enters the top 71 px once its height exceeds **658 px** (`max-h-[90vh]` = 720 px -> top at 40 px); on 390 x 844 phone, once its height exceeds **702 px** (`90vh` = 760 px -> top at 42 px).

| Overlay (`file:line`) | Placement, `max-h`, scroll | Can top / X land in top 71 px (1280x800 & 390x844)? | Verdict |
|---|---|---|---|
| `FleetCanvasManager.jsx:992` (Reprint receipt) | Centered `p-4`, `max-h-[90vh] overflow-y-auto` on box (title inside scroll) | Yes, thermal receipt with ~10+ items reaches `>658` / `>702` px | AT RISK (long receipt) |
| `FleetCanvasManager.jsx:1049` (Surat Jalan) | Centered `p-4`, `max-h-[90vh] overflow-y-auto` on box | Yes, A4 Surat Jalan with ~8+ items reaches `>658` / `>702` px | AT RISK (long Surat Jalan) |
| `JourneyView.jsx:1218` (Full-screen map `.kx-full`) | Full-screen fixed, `expedition.css:860` sets `top: calc(var(--kpm-safe-top, 0px) - env(...))` | No — explicitly starts below `--kpm-safe-top` (71 px) | SAFE |
| `JourneyView.jsx:1930` (Shop modal) | Centered `p-4`, no `max-h`, short header + body | Only if content grows past 658/702 px | AT RISK (tall shop details) |
| `ConsignmentFinanceView.jsx:648` (Receipt) | Centered `p-4`, `max-h-[90vh] overflow-y-auto` on box | Yes, long receipt reaches `>658` / `>702` px | AT RISK (long receipt) |
| `MerchantSalesView.jsx:2472` (Mobile manifest scrim) | Full-screen `inset-0 lg:hidden` scrim behind drawer | No title/X (backdrop only, tap anywhere to close) | SAFE |
| `MerchantSalesView.jsx:3027` (GPS bypass modal) | Centered `p-4`, `max-h-[90vh] overflow-hidden`, fixed header | Yes if photo preview + form exceeds 658/702 px | AT RISK (tall photo/form) |
| `MerchantSalesView.jsx:3121` (Manual/proof modal) | Centered `p-4`, no `max-h`, fixed header | Only if content exceeds 658/702 px | AT RISK (tall content) |
| `MerchantSalesView.jsx:3240` (Deal receipt) | Centered `p-4` with 150 px mascot above card on PC (`lg:flex`) | Yes — mascot + receipt easily exceeds 658 px on PC (800 px high) and long receipt exceeds 702 px on phone | AT RISK (always on PC with mascot, or long receipt) |
| `RestockVaultView.jsx:1199` (Image lightbox) | Centered `p-4`, `X` is `absolute top-6 right-6` (24 px from top) | Always — `X` sits at `y = 24 px < 71 px` on both PC & phone | AT RISK (always) |
| `RestockVaultView.jsx:1206` (Production goal) | Centered `p-4`, `max-w-md`, short form | Unlikely (~300 px tall), unless small landscape | SAFE (normal content) |
| `RestockVaultView.jsx:1239` (Edit shipping) | Centered `p-4`, `max-w-md`, short form | Unlikely (~350 px tall) | SAFE (normal content) |
| `RestockVaultView.jsx:1283` (Edit PO) | Centered `p-4`, `max-h-[90vh] overflow-y-auto` (`X` inside top-4 right-4) | Yes, PO with multiple items reaches `>658` / `>702` px | AT RISK (multi-item PO) |
| `RestockVaultView.jsx:1372` (PO detail modal) | Centered `p-4`, `max-h-[90vh] overflow-hidden`, `shrink-0` header | Yes, multi-item PO reaches `>658` / `>702` px | AT RISK (multi-item PO) |
| `StockOpnameView.jsx:1112` (Image lightbox) | Centered `p-4`, `X` is `absolute top-6 right-6` (24 px from top) | Always — `X` sits at `y = 24 px < 71 px` on both PC & phone | AT RISK (always) |
| `StockOpnameView.jsx:1119` (Damaged resolution) | Centered `p-4`, `max-w-md` | Only if form exceeds 658/702 px | SAFE (short form) |
| `HistoryReportView.jsx:940` (Photo lightbox) | Centered `p-4`, `X` is `absolute top-6 right-6` (24 px from top) | Always — `X` sits at `y = 24 px < 71 px` on both PC & phone | AT RISK (always) |
| `HistoryReportView.jsx:956` (Edit transaction) | Centered `p-6`, `max-h-[90vh]`, title outside `overflow-y-auto` | Yes, receipt with ~4+ items reaches `>658` / `>702` px | AT RISK (multi-item edit) |
| `AcceptanceReceipt.jsx:61` | Centered `p-4`, `max-h-[90vh] overflow-y-auto`, `X` inside `top-4 right-4` | Yes, receipt with ~8+ items reaches `>658` / `>702` px | AT RISK (long receipt) |
| `ArrivalScanner.jsx:81` | Centered `p-4`, `max-w-md`, no `max-h` | Only if scanner + items exceed 658/702 px | AT RISK (many items) |
| `CrownTransferProtocol.jsx:135` | Centered `p-4`, `max-w-lg` | Only if content exceeds 658/702 px | SAFE (short modal) |
| `ExamineModal.jsx:81` | Full-screen `inset-0`, `X` is `absolute top-8 right-8` (32 px from top) | Always — `X` sits at `y = 32 px < 71 px` on both PC & phone | AT RISK (always) |
| `ImageCropper.jsx:171` | Centered `md:p-4`, `h-[100dvh] md:h-[90vh]` | Always — `top: 0` on phone, `top: 40 px` on 800 px PC (`< 71 px`) | AT RISK (always) |
| `PhotoField.jsx:168` | Centered `p-3`, `max-h-full` | Yes, tall photo/corner cropper hits `top < 71 px` | AT RISK (tall photo) |
| `SaleReceipt.jsx:32` | Centered `p-4`, `max-h-[90vh] overflow-y-auto` | Yes, long receipt reaches `>658` / `>702` px (except when called via `DayReplay.jsx:396`, which portals at `z-[9999]`) | AT RISK (long receipt) |
| `SamplingManager.jsx:544` | Centered `p-4`, `max-w-md` | Only if form exceeds 658/702 px | SAFE (short form) |
| `ShipmentLabel.jsx:55` | Centered `p-4`, `max-h-[90vh] overflow-y-auto`, `X` inside `top-4 right-4` | Yes, label with ~8+ items reaches `>658` / `>702` px | AT RISK (long label) |

**Fix analysis (do NOT apply):**
1. **Shared portal vs CSS padding:**
   - **Portal (`createPortal(..., document.body)`):** Fixes every AT RISK overlay with `z >= 97` cleanly in one pattern (and keeps `Toast` `z-[10000]` / `ConfirmGate` `z-[10001]` above all except `ExamineModal` `z-[10000]`).
   - **CSS `--kpm-safe-top` padding alone:** Would NOT fix `absolute top-6/top-8` X buttons (`RestockVaultView:1200`, `StockOpnameView:1113`, `HistoryReportView:941`, `ExamineModal:82`) or `h-[100dvh]` (`ImageCropper:172`) unless each one's `top`/`height` also subtracts `var(--kpm-safe-top)`.
2. **Overlays with `z < 96` (would STILL lose to `.kpm-mission` `z: 96` after a portal):**
   - `src/components/ImageCropper.jsx:171` (`z-[70]`) — must be raised to `>= 97` (e.g. `z-[500]`). Every other overlay above is `>= 100`.
3. **Must any overlay stay inside the `z-10` box?**
   - **No** for theme/fonts: `.light`, `.lite-mode`, `.kpm-demo-on`, and CSS variables (`--duke-*`, `--font-*`) live on `<html>`/`:root`, not on `BiohazardTheme.jsx:1122`'s `z-10` div.
   - **Print note:** The 6 print modals (`FleetCanvasManager.jsx:992,1049`, `ConsignmentFinanceView.jsx:648`, `MerchantSalesView.jsx:3240`, `SaleReceipt.jsx:32`, `AcceptanceReceipt.jsx:61`, `ShipmentLabel.jsx:55`) rely on `.print-modal-wrapper` / `.print-receipt` CSS (`@media print`) — verify print styles still match when portaled directly under `<body>`.

---

## Task 9 - every + / − key in the app: how much one press adds, and does the screen say so
**Status:** DONE
**Written:** 2026-11-16 21:45 WIB, by Claude. Same rules as above (read-only, touch only this file, commit it alone, "Antigravity:").

Aldi pressed + on Fleet & Roster's load sheet and asked *"why is it 10 bks everytime i add or decrease tho?"*. There, one press is one Slop: `stepOf` in `src/components/LoadSheet.jsx` (~L87) = `convertToBks(1, 'Slop', p)` for goods, 1 for promo pieces; the number box shows packs (Bks). For EVERY + / − stepper in `src/` (grep `bump(`, `step`, `'+'`/`'−'` buttons, `aria-label=.*: more`), list:
- **file:line, screen name, who uses it** (salesman, warehouse admin, owner).
- **One press = ?** (1 Bks, 1 Slop = N Bks, 1 Bal, 1 pcs) and where that number comes from (file:line).
- **Does the screen tell the user** what one press adds (a unit label beside the box, the key's aria-label, nothing)?
- **Can the user type an exact number** instead (an input beside the keys)?
Then: are the steppers consistent with each other? If Aldi says "one press = 1 Bks everywhere" or "one press = 1 Slop, but show it", which file:lines change, and what could that break (offline sales, promo pieces, the Slop/Bal conversion in `convertToBks`, `src/utils/helpers.js`)? Do NOT change the code.

**Result:**

| Screen (`file:line`) | Who uses it | One press = ? (source `file:line`) | Does screen tell user? | Type exact number? |
|---|---|---|---|---|
| Fleet & Roster Load Sheet (`src/components/LoadSheet.jsx:214-218`) | Owner / Admin / Fleet Captain (T1–T4 `fleet_edit`) | **1 Slop** (`convertToBks(1, 'Slop', p)` = 10 Bks default) for goods; **1 pcs** for promo (`LoadSheet.jsx:87`, `helpers.js:378`) | **No** — header says `Load`/`Return` (`160`), keys say `less`/`more` in `aria-label` only, input `aria-label` says `Bks` (`216`), nothing visible says `1 slop = 10 Bks` | **Yes** (`<input type="number">`, `215-217`) |
| Sales Terminal Product Shelf (`src/MerchantSalesView.jsx:2930-2945`) | Salesman / Admin (T1–T6) | **1 Bks** on new line (`addToCart`, `861`), or **1 of current `unit`** (`Bks`/`Slop`/`Bal`/`Karton`) if changed in Manifest (`849, 2935`) | **Partially** — no unit label on shelf `qty` (`2939`), `unit` `<select>` shows in Manifest (`2098`) | **No on shelf**, **Yes in Manifest** (`2094`) |
| Sales Terminal Factory Bundles (`src/MerchantSalesView.jsx:2859-2869`) | Salesman / Admin (T1–T6) | **1 bundle** (`applyBundle` / `removeBundle`, `2860, 2867`) | **Yes** — bundle card shows contents and tap count; `aria-label` says `one less`/`one more` | **No** |
| Sales Terminal Promo Give (`src/MerchantSalesView.jsx:2197-2202`) | Salesman / Admin with promo stock | **1 pcs** (`setN(cur ± 1)`, `2178, 2197, 2202`) | **Yes** — subtitle says `{l.qty} pcs {giveWhere}` (`2189`) | **Yes** (`<input type="number">`, `2198-2200`) |
| Sampling Manager (`src/components/SamplingManager.jsx:299-312`) | Owner / Admin / Regional Admin (`view_sampling`) | **1 Bungkus** (`qtyBks`, `299-301`) and **1 Batang** (`qtyBatang`, `309-311`) | **Yes** — `Bungkus` (`297`) and `Batang` (`307`) headers sit right above each stepper | **Yes** (`<input type="number">`, `300, 310`) |

**Consistency & change impact (do NOT apply):**
- **Consistent?** **No** — `LoadSheet.jsx` steps by **1 Slop (10 Bks)** while displaying raw **Bks** with no unit cue, whereas Sales Terminal shelf starts at **1 Bks**, Promo Give at **1 pcs**, and Sampling labels **Bungkus** / **Batang** explicitly.
- **If "one press = 1 Bks everywhere":**
  - Change `src/components/LoadSheet.jsx:87` from `const stepOf = (p) => (isPromo(p) ? 1 : convertToBks(1, 'Slop', p));` to `const stepOf = () => 1;`.
  - **Impact:** Breaks nothing in offline sales, `convertToBks` (`src/utils/helpers.js:372-382`), or promo pieces (`isPromo(p)` was already `1`). Only makes tapping `+` for large loads slower unless the user types in the box or taps `Fill suggested`.
- **If "one press = 1 Slop, but show it":**
  - Keep `stepOf` at `src/components/LoadSheet.jsx:87`; add a visible label like `Load (Bks · ±1 slop)` at `LoadSheet.jsx:160` (or `±1 slop` hint beside the stepper at `LoadSheet.jsx:211-220`, and `±1 pcs` for promo).
  - **Impact:** Zero logic/data/offline/promo risk; `convertToBks` (`src/utils/helpers.js:372-382`) is untouched.

---

## Task 10 - every printed business paper in the app (for the Surat Jalan redesign)
**Status:** DONE
**Written:** 2026-11-16 21:45 WIB, by Claude. Same rules as above.

Aldi asked for the Surat Jalan to look *"more professional ... minimalistic"*; three designs are with him now. Claude will build his pick and wants every sibling paper to match. List every paper the app prints or shows as a document (grep `window.print`, `print-receipt`, `format-a4`, `SURAT JALAN`, `BUKTI KEMBALI`, `ShipmentLabel`, `AcceptanceReceipt`, `SaleReceipt`, nota):
- **file:line, its title, who prints it, A4 or thermal (58/80 mm)**.
- **Fields it shows** (company block, number format like `SJ-YYYYMMDD-xxxx`, people, vehicle, warehouse, item table columns, totals, statement text, signature boxes).
- **Colours**: which use the KPM company blue (the nota's look - Aldi locked that the nota keeps company blue) and which use app colours.
- **Phone**: does it force a fixed width (e.g. `min-w-[800px]`) and scroll sideways on a 390 px screen?
- **Print CSS**: where `print-receipt` / `format-a4` / `@media print` rules live (file:line) and what they hide or resize.
Then say which papers should share ONE layout with the Surat Jalan (e.g. Bukti Kembali in `src/components/LoadSheet.jsx`, the shipment label) and which must stay as they are (the nota). Do NOT change the code.

**Result:**

| Paper (`file:line`) | Title & who prints | Format | Fields shown | Colours | Phone (390 px) |
|---|---|---|---|---|---|
| **Fleet Surat Jalan** (`src/FleetCanvasManager.jsx:1049-1145`) | `SURAT JALAN` (`OFFICIAL DELIVERY ORDER`), printed by Admin/Captain (`fleet_edit`) | A4 (`format-a4`) | Company logo/name/address/phone, `SJ-YYYYMMDD-xxxx`, Sales/Driver + role, Vehicle + Deploy time, table (`NO`, `NAMA BARANG`, `QTY`, `UNIT`), legal Pernyataan box, 2 signature boxes (`Admin Gudang`, `Sales/Motorist`) | **KPM company blue** (`!border-blue-800`, `!text-blue-900`, `!bg-blue-50`, `!text-blue-700`) | **Scrolls sideways** (`min-w-[800px]` inside `overflow-x-auto`, `1052-1053`) |
| **LoadSheet Report** (`src/components/LoadSheet.jsx:153, 225-232`) | `SURAT JALAN` / `BUKTI KEMBALI`, shown inline after Load/Return | On-screen card (no `window.print` yet) | `SJ-`/`BK-YYYYMMDD-xxxx-HHMM`, route (`warehouse -> agent · vehicle` or reverse), item list (`name`, `qty Bks`/`pcs`), Total | **App tokens** (`--line-2`, `--ink-muted`) | Fits 390 px (no `min-w`) |
| **Restock Surat Jalan / GRN** (`src/components/AcceptanceReceipt.jsx:61-168`) | `Surat Jalan · Goods Received Note`, printed by Admin/Warehouse | A4 (`max-w-2xl`) | Company name, `No. Surat Jalan` (`poNumber`), `Asal`, `Tujuan`, `Tanggal`, `Jumlah Item`, table (`Item Description`, `Batch`, `Qty Received`), 4 money lines (`Total Wares Base`, `Shipping/Labor`, `Tax/Cukai`, `Total Landed Value`), 2 signature lines (`Dikirim oleh`, `Diterima & diperiksa oleh`) | **Minimalist black/white** (`border-black`, `bg-white text-black`, `border-t-8 border-orange`) | Fits 390 px (`grid-cols-2 sm:grid-cols-4`, no `min-w`) |
| **Branch Shipment Label** (`src/components/ShipmentLabel.jsx:55-131`) | `Label Pengiriman · Shipment Label`, printed by HQ Warehouse | A4 (`max-w-lg`) | Company name, `Dari` (`Gudang Pusat`), `Tujuan` (`Gudang {branch}`), `Tanggal`, `Jenis barang` (count only), QR/barcode `<svg>`, scan instruction box, `Isi kiriman` list (no pack counts) | **Minimalist black/white** (`border-black`, `bg-white text-black`, `border-t-8 border-orange`) | Fits 390 px (no `min-w`) |
| **Sales Nota (Live)** (`src/MerchantSalesView.jsx:3268-3410`) | `NOTA PENJUALAN` / `NOTA RETUR` / `NOTA PROMO`, printed by Salesman/Admin | **Thermal (48–55 mm)** & **A4** (`format-a4` / `format-thermal`) | Company block, customer, date, agent, payment method, itemized table (`QTY`, `UNIT`, `PRICE`, `TOTAL`), promo/IOU/retur tags, grand total, footer | **KPM company blue** on A4 (`!border-blue-800`); black/slate on thermal | Thermal fits; **A4 scrolls sideways** (`min-w-[800px]`, `3335`) |
| **Sales Nota (Fleet Reprint)** (`src/FleetCanvasManager.jsx:992-1045`) | `NOTA PENJUALAN` (reprint), printed by Admin/Captain | **Thermal** only (`format-thermal`) | Same thermal receipt layout | Black/slate (`!bg-white !text-black`, `!border-slate-800`) | Fits 390 px (`max-w-sm`) |
| **Sales Nota (Consignment)** (`src/ConsignmentFinanceView.jsx:648-890`) | Consignment / Payment Nota, printed by Admin/Captain | **Thermal** & **A4** | Same nota layout (`a4-print-jail`) | **KPM company blue** on A4 (`!border-blue-800`) | Thermal fits; **A4 scrolls sideways** (`min-w-[800px]`, `725`) |
| **Sales Nota (History / DayReplay)** (`src/components/SaleReceipt.jsx:32-240`) | `NOTA PENJUALAN` / `NOTA RETUR`, printed from History or DayReplay | **Thermal** & **A4** | Same nota layout (`a4-print-jail`) | **App tokens** on screen (`--raised`, `--ink`, `--accent-edge`), black/white on print | Thermal fits; **A4 scrolls sideways** (`min-w-[800px]`, `118`) |
| **Day Log Paper** (`src/JourneyView.jsx:2006`, `src/utils/dayLog.js`) | Salesman / Team Day Log (`iframe srcDoc`) | A4 / browser print | Salesman/team visits, kecamatan map, timestamps | Print stylesheet inside `dayLog.js` | Fits (iframe scales) |
| **History Operational Report** (`src/components/HistoryReportView.jsx:488-492`) | `Print PDF` (filtered sales report) | A4 (`zoom: printScale`) | Filtered KPIs, agent/item/offer tables | App tokens + `@media print` zoom | Fits / scales via `printScale` |

**Print CSS (`@media print`):**
- **Global (`src/components/BiohazardTheme.jsx:1220-1243`):** Hides `nav, header, .hide-on-print, .no-print`; forces `.print-modal-wrapper` to `position: absolute; top: 0; left: 0; width: 100%`; forces `.print-receipt` white/black, `max-height: none; overflow: visible`, `.format-thermal` `max-width: 55mm`, `.format-a4` `210mm`, and `.print-receipt * { color: black !important; border-color: black !important; }`.
- **Popup iframe print (`MerchantSalesView.jsx:3478`, `ConsignmentFinanceView.jsx:865`, `SaleReceipt.jsx:233`):** Writes standalone HTML with `@page { margin: 0 }`, `width: 48mm` (thermal) or `210mm` (A4).
- **Scoped `@media print` (`AcceptanceReceipt.jsx:63-68`, `ShipmentLabel.jsx:57-62`):** `body * { visibility: hidden; } .print-receipt, .print-receipt * { visibility: visible; }` + `position: absolute; left: 0; top: 0; width: 100%`.

**Which papers should share ONE layout vs stay separate:**
- **Share ONE minimalist Surat Jalan layout:** **Fleet Surat Jalan** (`FleetCanvasManager.jsx:1049`), **LoadSheet `SURAT JALAN` / `BUKTI KEMBALI`** (`LoadSheet.jsx:225`, if made printable), **Restock `AcceptanceReceipt`** (`AcceptanceReceipt.jsx:61`, already uses the minimalist black/white header & signature style), and **Branch `ShipmentLabel`** (`ShipmentLabel.jsx:55`, same minimalist header). Dropping `min-w-[800px]` in `FleetCanvasManager.jsx:1053` fixes mobile horizontal scrolling.
- **Keep separate as-is:** All **Sales Notas** (`MerchantSalesView.jsx:3268`, `FleetCanvasManager.jsx:992`, `ConsignmentFinanceView.jsx:648`, `SaleReceipt.jsx:32`) — Aldi locked that the printed receipt keeps KPM company blue. Also keep **Day Log** (`JourneyView.jsx:2006`) and **History Report** (`HistoryReportView.jsx:488`) separate (analytical reports, not movement papers).

---

## Task 11 - review Claude's two newest Fleet & Roster changes for REAL bugs
**Status:** DONE
**Written:** 2026-11-16 21:45 WIB, by Claude. Same rules as above (read-only, touch only this file, commit it alone, "Antigravity:").

Read `git show c497b4c1` (his pick A: the PC person panel is `position: fixed` from measured `--fp-*` values, a focus veil `.kpm-fleet-veil` dims + blurs the rest, the phone's person keys moved behind More) and the newest commit touching `src/components/LoadSheet.jsx` ("Each press: 1 Bks | 1 Slop", `byOne` kept in localStorage `kpm-load-step`). Look for what a real user can hit:
- **Size changes while the panel is open**: `--fp-*` is measured in `FleetCanvasManager.jsx` inside the ResizeObserver on the shell's scroll box. Does a window height change, the sidebar opening, the demo bars appearing/leaving, or browser zoom re-measure it? What is left stale, and what does the user see?
- **Things opened from inside the panel**: Surat Jalan (`fixed inset-0 z-[500]`, inside the shell box), FrontPanel (portal, z 480), ConfirmGate (z 10001), toasts, the demo guide's veil and ring (`DemoMission.jsx`, step 3 aims inside the panel). Does any of them open UNDER the veil (z 15) or the panel (z 20), or does a press on it fall through to the veil and close the panel?
- **Keyboard**: with the veil up, can Tab reach keys behind it? Does any key move focus somewhere invisible?
- **Motion edge cases**: the 40 ms `backwards` hold on a name switch (panel remounts, veil does not); closing while the entrance is still running; Lite Mode / reduced motion close path (`closePanel`, instant); the phone's More state when switching person.
- **The step key**: `byOne` read once in `useState` - two sheets open in two tabs; a promo product while "1 Slop" is picked; the Return tab (`cap` = what the van holds).
List only REAL bugs: file:line, the exact steps to see it, what the user sees, and the smallest fix. Anything you could not confirm from the code is CAN'T TELL. Do NOT change the code.

**Result:**

1. **Keyboard `Tab` reaches blurred controls behind `.kpm-fleet-veil` (MED)** — `src/FleetCanvasManager.jsx:1531, 1549`, `src/styles/theme.css:5908, 5918`.
   - **Steps:** On PC (`>= 1024px`), click any salesman row to open the focus panel, then press `Tab` / `Shift+Tab`.
   - **What user sees:** Focus leaves the panel and lands on blurred controls in `.kpm-fleet-top` (`OFFERS`, `+` Add personnel) or behind the panel in `.kpm-fleet-list`; pressing `Enter` fires those blurred buttons. Also `Escape` does not close the panel.
   - **Smallest fix:** Trap `Tab` inside `<aside className="kpm-fleet-panel">` (or set `inert` on `.kpm-fleet-top` while `selectedAgent` is open) and handle `Escape` -> `closePanel()`.

2. **Closing the panel mid-entrance briefly flashes to `opacity: 1` before sliding out (LOW)** — `src/styles/theme.css:5908, 5921, 5941-5942`.
   - **Steps:** On PC, click a salesman row and immediately (< 250 ms) click the veil or `X` while `kpmFleetSlide` (`40ms` delay + `260ms`) is still in progress.
   - **What user sees:** Swapping `animation` to `kpmFleetOut` (`to { transform: translateX(24px); opacity: 0; }`) starts `kpmFleetOut` from the base style (`opacity: 1, translateX(0)`), causing a brief snap before the 200 ms exit runs.
   - **Smallest fix:** Drive open/close with a CSS `transition` on `transform, opacity` instead of swapping two `@keyframes` animations.

3. **`byOne` (`1 Bks | 1 Slop`) does not sync across two open browser tabs (LOW)** — `src/components/LoadSheet.jsx:69-74`.
   - **Steps:** Open Fleet & Roster in two browser tabs, switch `1 Bks` <-> `1 Slop` in Tab A, then press `+` in Tab B without switching salesmen.
   - **What user sees:** Tab B keeps the old step until another person is picked (`<aside key={sel.id}>` remounts `LoadSheet`).
   - **Smallest fix:** Add a `window` `'storage'` listener in `LoadSheet.jsx` for key `'kpm-load-step'`.

**Checked, no bug found:**
- `ResizeObserver` on `box` (`FleetCanvasManager.jsx:275-287`): re-measures `--fp-t/b/l/r` on window resize, demo bar show/hide, and sidebar hover-expand; `visualViewport` pinch-zoom is CAN'T TELL without browser test.
- Overlays opened from inside panel: `Surat Jalan` (`FleetCanvasManager.jsx:1049`) and `viewingReceipt` (`992`) are `z-[500] > z: 20 > z: 15`; `FrontPanel` (`35`, `z-[480]` in `document.body`), `ConfirmGate` (`z-[10001]`), `Toast` (`z-[10000]`), and `DemoMission` (`z: 400/401`, `pointer-events: none` veil) all sit above the focus veil and panel.
- Close / `moreOpen` / promo / Return tab: `Lite Mode` & `prefers-reduced-motion` close instantly (`FleetCanvasManager.jsx:889`), `pickAgent` resets `moreOpen` (`880`), `isPromo(p)` stays `1 pcs` even when `1 Slop` is active (`LoadSheet.jsx:96`), and Return tab clamps to `vanOf[p.id]` (`LoadSheet.jsx:72, 81`).

---

## Task 12 - for each of your 6 Retur holes, the check that FAILS today
**Status:** DONE
**Written:** 2026-11-16 21:45 WIB, by Claude. Same rules as above.

Aldi will decide the 6 holes from your Task 6 Result (A strict fix or B lighter one). Claude's rule: a fix is proven RED before GREEN. For EACH hole write, in a code block in your Result, the `ok('...', expr)` check in the style of `src/config/logicFixes.selfcheck.mjs` (it reads source files with `read(...)` and tests strings/regexes, or calls a pure function on real numbers) that:
- **FAILS on today's code** - say which line of today's code makes it fail (file:line);
- **PASSES once Option A is in** - and, if Option B would pass it too or needs a different check, write that one as well.
Prefer a behaviour check on real numbers (a pure function from `src/utils/` called with a sale and a return) over a string match when the logic is reachable without Firebase. Do NOT add them to the file and do NOT change the code.

**Result:**
Note: none of these 6 holes live in a pure `src/utils/` function (the `RETUR` gating, pricing, stock return, History cash bucket, and EOD `storesServed`/`itemsBks` all live in `firestore.rules`, `MerchantSalesView.jsx`, `useTransactionEngine.js`, `HistoryReportView.jsx`, and `EODReconciliationView.jsx`), so these checks read the source slices with `read(...)` / `code(...)`.

```js
// Hole 1: Direct SDK create of RETUR without allowRetur / allowCashRefund
// FAILS today at firestore.rules:796 (`allow create: if isSalesman(bossUid);`)
{
  const rulesTx = read('firestore.rules').match(/match \/transactions\/\{transactionId\} \{[\s\S]*?\}/)?.[0] || '';
  // Option A (rules gate):
  ok('Hole 1A: transactions create rules gate RETUR on allowRetur / allowCashRefund',
     /allow create:/.test(rulesTx) && !/allow create: if isSalesman\(bossUid\);/.test(rulesTx) && /RETUR/.test(rulesTx) && /allowRetur/.test(rulesTx));
  // Option B (audit/flag in Reports):
  ok('Hole 1B: HistoryReportView flags RETUR docs created by agents without allowRetur',
     /allowRetur/.test(code(read('src/components/HistoryReportView.jsx'))));
}

// Hole 2: Return with no prior sale behind it
// FAILS today at src/MerchantSalesView.jsx:1271-1291 & src/hooks/useTransactionEngine.js:275
{
  const msv = code(read('src/MerchantSalesView.jsx'));
  const eng = code(read('src/hooks/useTransactionEngine.js'));
  // Option A (require prior SALE receipt):
  ok('Hole 2A: BUYBACK/RETUR requires a linked sourceSaleId in Sales Terminal and transaction engine',
     /isReturMode[\s\S]{0,600}sourceSaleId/.test(msv) && /sourceSaleId/.test(eng));
  // Option B (warning badge in History):
  ok('Hole 2B: HistoryReportView warns when a RETUR has no matching prior SALE',
     /isRetur[\s\S]{0,600}No matching sale|unlinkedRetur/i.test(code(read('src/components/HistoryReportView.jsx'))));
}

// Hole 3: Return worth more than the sale it reverses (higher tier, unit, or qty)
// FAILS today at src/MerchantSalesView.jsx:853-864, 958, 973-984
{
  const msv = code(read('src/MerchantSalesView.jsx'));
  const upd = msv.slice(msv.indexOf('const updateCartItem'), msv.indexOf('const handleFulfillIOU'));
  // Option A (cap qty/tier/unit to sourceSale):
  ok('Hole 3A: BUYBACK caps qty and locks priceTier to the original sale in updateCartItem',
     !/isReturMode \|\| \(isReturMode && returType === 'EXCHANGE'/.test(upd) && /sourceSale/.test(upd));
  // Option B (lock tier to lockedTier or Grosir for BUYBACK):
  ok('Hole 3B: BUYBACK defaults unlocked shops to Grosir instead of Retail/Ecer',
     /isReturMode && returType === 'BUYBACK'[\s\S]{0,200}Grosir/.test(msv));
}

// Hole 4: Same goods returned twice / GOOD stock re-entering van for repeat refund
// FAILS today at src/hooks/useTransactionEngine.js:284 (`const isReturnedToStock = proofPayload?.type === 'RETUR' && item.condition !== 'DAMAGED';`)
{
  const eng = code(read('src/hooks/useTransactionEngine.js'));
  // Option A (no direct return to sellable van stock, or per-sale remaining qty guard):
  ok('Hole 4A: GOOD buybacks do not re-enter sellable stock directly without EOD/sourceSaleId check',
     !/const isReturnedToStock = proofPayload\?\.type === 'RETUR' && item\.condition !== 'DAMAGED';/.test(eng));
  // Option B (daily multi-RETUR alert in History/EOD):
  ok('Hole 4B: History or EOD alerts when an agent submits multiple RETURs in one day',
     /repeatRetur|returCount\s*>\s*1/i.test(code(read('src/components/HistoryReportView.jsx')) + code(read('src/EODReconciliationView.jsx'))));
}

// Hole 5: Cash refund (Retur/BS) subtracted from Cash when original sale was Titip or Transfer
// FAILS today at src/components/HistoryReportView.jsx:289 (`if (t.type === 'RETUR') payments['Cash'] -= Math.abs(value);`)
{
  const hist = code(read('src/components/HistoryReportView.jsx'));
  // Option A & B both stop subtracting every RETUR blindly from payments['Cash']:
  ok('Hole 5A/5B: HistoryReportView does not blindly subtract every RETUR from payments["Cash"]',
     !/if \(t\.type === 'RETUR'\) payments\['Cash'\] -= Math\.abs\(value\);/.test(hist));
}

// Hole 6: Exchange (Tukar Ganti) inflates storesServed and itemsBks in EOD
// FAILS today at src/EODReconciliationView.jsx:217 & 223 (`todaysTrans.filter(t => t.type === 'SALE')`)
{
  const eod = code(read('src/EODReconciliationView.jsx'));
  const block = eod.slice(eod.indexOf('const storesServed ='), eod.indexOf('const todaysReports ='));
  // Option A (exclude Tukar Ganti from both storesServed and itemsBks):
  ok('Hole 6A: EOD storesServed and itemsBks exclude Rp 0 Tukar Ganti exchanges',
     (block.match(/t\.type === 'SALE' && t\.paymentType !== 'Tukar Ganti'/g) || []).length === 2);
  // Option B (exclude Tukar Ganti from itemsBks only):
  ok('Hole 6B: EOD itemsBks excludes Tukar Ganti exchanges',
     /const itemsBks = todaysTrans\s*\.filter\(t => t\.type === 'SALE' && t\.paymentType !== 'Tukar Ganti'\)/.test(block));
}
```

---

## Task 13 - the capybara's sidebar tour, ready to paste (feeds Claude's next job)
**Status:** DONE
**Written:** 2026-11-16 22:00 WIB, by Claude. Same rules as above (read-only, touch only this file, commit it alone, "Antigravity:").

Aldi: the capybara *"should give step by step tutorial starting from the sidebar first and what it use then to the next"*. Claude builds it next, using your Task 5 lines (17 items) and your Task 7 findings (`shows()` / `aim()` in `src/components/DemoMission.jsx` ~L142-155, the rail's opacity-0 children, `.kpm-rail-totem`). For EACH of the 17 sidebar items:
- **PC (1280)**: the exact element to ring (selector + file:line) when the rail is collapsed AND when it is open. If the item is invisible while collapsed, say what must happen first (open the rail? ring the totem?) and which key/handler opens it (file:line).
- **Phone (390)**: the same, with the drawer (`[aria-label="Open navigation"]`): ring inside the open drawer, or only the line with no ring.
- **Tiers that see it** (from the nav config, file:line), so the tour skips items the current demo person cannot see.
Then write the beats as ONE code block in the shape `GUIDE` uses in `src/config/demoMission.js` (read how a beat is built: `at`, the line, any `nav()`), the Indonesian lines from Task 5 word for word, in sidebar order. Claude pastes it after review. Do NOT change the code.

**Result:**

**How every item's ring resolves (same rule for all 17 items):**
- **PC (1280) — rail collapsed at rest:** `[data-mark="${id}"]` (`src/components/BiohazardTheme.jsx:925`) is `opacity: 0` + `pointer-events: none` (`src/styles/theme.css:2024, 2077`). Ring `.kpm-rail-totem` (`BiohazardTheme.jsx:831`, `theme.css:2053`) first; hovering/focusing `[data-kpm-rail]` (`theme.css:2005, 2078-2079`, CSS `:hover`/`:has(:focus-visible)`) opens the rail automatically.
- **PC (1280) — rail open:** Ring `[data-kpm-rail]:hover [data-mark="${id}"]` (or `:has(:focus-visible)`).
- **Phone (390) — drawer closed:** `<aside>` has `translate-x-full` (`BiohazardTheme.jsx:820`) and `.kpm-rail-totem` is `display: none` (`theme.css:1840`). Ring `[aria-label="Open navigation"]` (`BiohazardTheme.jsx:641, 648`, `onPointerDown={startRailPull}` opens it).
- **Phone (390) — drawer open:** Ring `[data-kpm-rail].translate-x-0 [data-mark="${id}"]` (`BiohazardTheme.jsx:820, 925`).

| # | `data-mark` | PC collapsed -> open (`BiohazardTheme.jsx:831,925`) | Phone closed -> open (`BiohazardTheme.jsx:641,820,925`) | Tiers (`BiohazardTheme.jsx:527-535`, `permissions.js:154-203`) |
|---|---|---|---|---|
| 1 | `agent_profile` | `.kpm-rail-totem` -> `[data-mark="agent_profile"]` | `[aria-label="Open navigation"]` -> `[data-mark="agent_profile"]` | T2, T4, T6 (`view_agent_profile`) |
| 2 | `dashboard` | `.kpm-rail-totem` -> `[data-mark="dashboard"]` | `[aria-label="Open navigation"]` -> `[data-mark="dashboard"]` | T2 (`view_dashboard`) |
| 3 | `map_war_room` | `.kpm-rail-totem` -> `[data-mark="map_war_room"]` | `[aria-label="Open navigation"]` -> `[data-mark="map_war_room"]` | T2, T4 (`view_map`) |
| 4 | `journey` | `.kpm-rail-totem` -> `[data-mark="journey"]` | `[aria-label="Open navigation"]` -> `[data-mark="journey"]` | T2, T4, T6 (`view_journey`) |
| 5 | `fleet` | `.kpm-rail-totem` -> `[data-mark="fleet"]` | `[aria-label="Open navigation"]` -> `[data-mark="fleet"]` | T2, T4 (`view_fleet`) |
| 6 | `inventory` | `.kpm-rail-totem` -> `[data-mark="inventory"]` | `[aria-label="Open navigation"]` -> `[data-mark="inventory"]` | T2 (`view_master_vault`) |
| 7 | `agent_inventory` | `.kpm-rail-totem` -> `[data-mark="agent_inventory"]` | `[aria-label="Open navigation"]` -> `[data-mark="agent_inventory"]` | T4, T6 (`view_agent_inventory`) |
| 8 | `restock_vault` | `.kpm-rail-totem` -> `[data-mark="restock_vault"]` | `[aria-label="Open navigation"]` -> `[data-mark="restock_vault"]` | T2 (`view_restock_vault`) |
| 9 | `sales` | `.kpm-rail-totem` -> `[data-mark="sales"]` | `[aria-label="Open navigation"]` -> `[data-mark="sales"]` | T2, T4, T6 (`view_sales`) |
| 10 | `receivables` | `.kpm-rail-totem` -> `[data-mark="receivables"]` | `[aria-label="Open navigation"]` -> `[data-mark="receivables"]` | T2, T4 (`view_receivables`) |
| 11 | `eod` | `.kpm-rail-totem` -> `[data-mark="eod"]` | `[aria-label="Open navigation"]` -> `[data-mark="eod"]` | T2, T4, T6 (`view_eod`) |
| 12 | `stock_opname` | `.kpm-rail-totem` -> `[data-mark="stock_opname"]` | `[aria-label="Open navigation"]` -> `[data-mark="stock_opname"]` | T2 (`canDecideOpname`), T4 (`view_stock_opname`) |
| 13 | `customers` | `.kpm-rail-totem` -> `[data-mark="customers"]` | `[aria-label="Open navigation"]` -> `[data-mark="customers"]` | T2 (`view_customers`) |
| 14 | `sampling` | `.kpm-rail-totem` -> `[data-mark="sampling"]` | `[aria-label="Open navigation"]` -> `[data-mark="sampling"]` | T2 (`view_sampling`) |
| 15 | `transactions` | `.kpm-rail-totem` -> `[data-mark="transactions"]` | `[aria-label="Open navigation"]` -> `[data-mark="transactions"]` | T2, T4, T6 (`view_reports_*`) |
| 16 | `audit` | `.kpm-rail-totem` -> `[data-mark="audit"]` | `[aria-label="Open navigation"]` -> `[data-mark="audit"]` | T2 (`view_audit_logs`) |
| 17 | `settings` | `.kpm-rail-totem` -> `[data-mark="settings"]` | `[aria-label="Open navigation"]` -> `[data-mark="settings"]` | T2, T4, T6 (always visible) |

```js
// Ready to paste into src/config/demoMission.js (after updating shows() in DemoMission.jsx to skip opacity:0 / pointer-events:none)
const tourBeat = (id, label, text, tiers) => ({
    id,
    tiers,
    at: [
        `[data-kpm-rail]:hover [data-mark="${id}"], [data-kpm-rail]:has(:focus-visible) [data-mark="${id}"], [data-kpm-rail].translate-x-0 [data-mark="${id}"]`,
        '.kpm-rail-totem',
        '[aria-label="Open navigation"]',
    ],
    say: [
        text,
        `Arahkan kursor ke tombol menu di kiri atas untuk melihat ${label}.`,
        `Buka menu di kanan layar untuk melihat ${label}.`,
    ],
});

export const SIDEBAR_TOUR = [
    tourBeat('agent_profile', 'Agent Profile', 'Di Agent Profile, Anda melihat profil, target, peringkat, dan catatan kerja Anda.', ['T2', 'T4', 'T6']),
    tourBeat('dashboard', 'Command Center', 'Command Center merangkum penjualan, setoran, dan stok perusahaan hari ini dalam satu layar.', ['T2']),
    tourBeat('map_war_room', 'Map System', 'Map System memantau posisi salesman dan sebaran toko di peta secara langsung.', ['T2', 'T4']),
    tourBeat('journey', 'Journey Plan', 'Journey Plan menampilkan daftar toko yang harus Anda kunjungi hari ini dan urutannya.', ['T2', 'T4', 'T6']),
    tourBeat('fleet', 'Fleet & Canvas', 'Di Fleet & Canvas, pimpinan mengatur tim serta memuat dan menarik stok barang ke tas salesman.', ['T2', 'T4']),
    tourBeat('inventory', 'Master Vault', 'Master Vault menyimpan stok utama perusahaan di gudang pusat beserta barang rusak.', ['T2']),
    tourBeat('agent_inventory', 'Agent Inventory', 'Agent Inventory menampilkan isi tas jualan Anda sekarang dan catatan pemasukan hari ini.', ['T4', 'T6']),
    tourBeat('restock_vault', 'Restock Vault', 'Restock Vault mencatat barang masuk dari pabrik dan pengiriman stok ke gudang wilayah.', ['T2']),
    tourBeat('sales', 'Sales Terminal', 'Sales Terminal dipakai untuk mencatat penjualan ke toko, barang titipan, dan retur barang rusak.', ['T2', 'T4', 'T6']),
    tourBeat('receivables', 'Receivables & Consignment', 'Receivables & Consignment mencatat tagihan titipan toko yang belum lunas dan pembayarannya.', ['T2', 'T4']),
    tourBeat('eod', 'EOD Setoran', 'Di EOD Setoran, Anda menutup hari: hitung uang tunai, sisa barang, dan kirim laporan ke atasan.', ['T2', 'T4', 'T6']),
    tourBeat('stock_opname', 'Stock Opname', 'Stock Opname dipakai untuk menghitung stok fisik gudang dan mencocokkannya dengan catatan sistem.', ['T2', 'T4']),
    tourBeat('customers', 'Customers', 'Di Customers, Anda mengelola daftar toko terdaftar, alamat, dan batas harganya.', ['T2']),
    tourBeat('sampling', 'Sampling', 'Sampling mencatat pembagian rokok contoh gratis ke toko beserta pita cukainya.', ['T2']),
    tourBeat('transactions', 'Reports', 'Reports menyimpan semua riwayat nota penjualan, retur, dan ringkasan hasil kerja.', ['T2', 'T4', 'T6']),
    tourBeat('audit', 'Audit Logs', 'Audit Logs merekam setiap perubahan penting di sistem agar semua catatan bisa ditelusuri.', ['T2']),
    tourBeat('settings', 'Settings', 'Di Settings, Anda mengatur bahasa, tampilan hemat baterai, serta aturan perusahaan.', ['T2', 'T4', 'T6']),
];
```

---

## Task 14 - the other papers on the new Surat Jalan layout: an exact plan
**Status:** DONE
**Written:** 2026-11-16 22:00 WIB, by Claude. Same rules as above.

Aldi picked B (black and white). It is LIVE on the Fleet Surat Jalan: `.kpm-sj` in `src/styles/theme.css` ("THE SURAT JALAN PAPER") and the block `{/* SURAT JALAN - his 2026-11-16 pick B` in `src/FleetCanvasManager.jsx`. Your Task 10 said two siblings should share it: the restock Surat Jalan / GRN (`src/components/AcceptanceReceipt.jsx`) and the LoadSheet SURAT JALAN / BUKTI KEMBALI card (`src/components/LoadSheet.jsx` ~L225, on-screen only today). For each:
- **Field map**: every field it shows today -> where it goes on the `.kpm-sj` paper (head, the 4-cell info row, table columns, total, statement, signatures); fields with no place; fields `.kpm-sj` needs that it does not have (and where the data would come from, file:line).
- **Print path**: how it prints today (AcceptanceReceipt has its own `@media print` visibility trick) and whether it would hit the two traps the Fleet paper hit in the lab: (1) the shell's print rule hides every `<header>` and `<nav>` (`src/components/BiohazardTheme.jsx` ~L1220-1243); (2) a `fixed inset-0` wrapper with `overflow-y-auto` becomes 89 px tall in print unless it gets `print:!bottom-auto print:!overflow-visible`.
- **Phone**: does it force a width or scroll sideways at 390 px?
- **The edit list**: the smallest set of changes, file:line, in words (no code edits).
Do NOT change the code.

**Result:**

### 1. `src/components/AcceptanceReceipt.jsx` (Restock Surat Jalan / Goods Received Note)
- **Field map onto `.kpm-sj` (`src/styles/theme.css:5971-6000`):**
  - `.hd`: `.co` gets `companyName` (`AcceptanceReceipt.jsx:52, 87-88`; `companyAddress`/`companyPhone`/`mascotImage` are not passed today — pass `appSettings` from `RestockVaultView` if needed); `.doc` gets `<h2>SURAT JALAN</h2><p>{acceptance.poNumber}</p>` (`91, 95-96`).
  - `.meta` (4 cells): `Asal` (`origin`, `sub: acceptance.originAddress`, `103`), `Tujuan` (`acceptance.destination || MASTER`, `sub: acceptance.destinationAddress`, `104`), `Tanggal` (`acceptance.date`, `105`), `Jumlah Item` (`${totalQty} baris`, `106`).
  - `<table>`: `No` (`.n`), `Nama barang` (`i.name`), `Batch` (`i.batchNo || '—'`), `Jumlah` (`.q`, `i.qtyReceived`), `Satuan` (`.u`, `i.promo ? 'pcs' : 'Bks'`) (`109-126`).
  - **Fields with no place in `.kpm-sj` today:** the 4 landed-cost money rows (`Total Wares Base`, `Shipping / Labor`, `Tax / Cukai`, `Total Landed Value`, `128-135`) — add a `.money` block under `<table>`.
  - `.sign`: `Dikirim oleh` (`acceptance.deliveredBy || ''`) and `Diterima & diperiksa oleh` (`acceptance.receivedBy || acceptance.recordedBy || ''`) (`147-158`). `.stmt` is omitted (GRN has no liability statement).
- **Print path & the two traps:**
  - Today it uses a scoped `@media print` `visibility: hidden` style (`62-69`) inside `BiohazardTheme`'s `z-10` box.
  - **Trap 1 (`<header>` hidden):** `AcceptanceReceipt.jsx:85` uses `<header>`, which `BiohazardTheme.jsx:1224` (`nav, header, ... { display: none !important; }`) hides in print! Replacing `<header>` with `<div className="hd">` fixes it.
  - **Trap 2 (`fixed inset-0` + `overflow-y-auto`):** `AcceptanceReceipt.jsx:76` has `max-h-[90vh] overflow-y-auto`. Switching to `FleetCanvasManager.jsx:1050-1051`'s `createPortal(..., document.body)` + `print-modal-wrapper ... print:!bottom-auto print:!overflow-visible` avoids both the 89 px print clip and demo-bar overlap (Task 8).
- **Phone (390 px):** Does not force `min-w` (`max-w-2xl` today, fits 390 px); `.kpm-sj` (`cqw`) scales cleanly with no horizontal scroll.
- **Smallest edit list (do not apply):**
  - `src/components/AcceptanceReceipt.jsx:61-167`: portal with `createPortal(..., document.body)` using `FleetCanvasManager.jsx:1051`'s `print-modal-wrapper` + sticky `no-print` Close/Print bar (`1053-1057`), replace `<header>` (`85`) with `<div className="hd">`, render `.kpm-sj` `.pg` (4 `.meta` cells, `<table>` with `Batch`, 4-line money block, `.sign`), and delete the inline `<style>` visibility hack (`62-69`).
  - `src/styles/theme.css:5994`: add a `.kpm-sj .money` block (`margin-left: auto; width: 52%;`) for the 4 money rows.

### 2. `src/components/LoadSheet.jsx` (`SURAT JALAN` / `BUKTI KEMBALI`, lines `153, 225-232`)
- **Field map onto `.kpm-sj`:**
  - `.hd`: `.co` gets `appSettings?.companyName / Address / Phone / mascotImage` (not passed to `LoadSheet` today at `FleetCanvasManager.jsx:1557`); `.doc` gets `<h2>{report.ret ? 'BUKTI KEMBALI' : 'SURAT JALAN'}</h2><p>{report.no}</p>` (`LoadSheet.jsx:153, 227`).
  - `.meta` (4 cells): `Kepada` / `Dari` (`agent.name`, role `'Sales Canvas'` / `'Sales Motorist'`), `Kendaraan` (`agent.vehicle || '—'`), `Dari gudang` / `Ke gudang` (`warehouse`), `Tanggal` (`new Date()` stamped into `report` at `LoadSheet.jsx:154`).
  - `<table>`: `No`, `Nama barang` (`x.name`), `Jumlah` (`fmt(x.bks)`), `Satuan` (`x.promo ? 'pcs' : 'Bks'`), `<tfoot>` (`Total · {report.rows.length} produk`, `report.total`) (`LoadSheet.jsx:229-230`).
  - `.stmt` & `.sign`: `FleetCanvasManager.jsx:1092` statement (for `SURAT JALAN`) and `Admin Gudang` (`branchAdmin ? branchAdmin.name : user.displayName`, `1063, 1094`) + `Sales / Driver` (`agent.name`).
  - **Missing data in `LoadSheet` today:** `appSettings` (company block) and `adminName` (Admin Gudang signature) — both are already in `FleetCanvasManager.jsx`.
- **Print path & the two traps:**
  - Today `LoadSheet.jsx:225-232` is an **inline on-screen card only** (no `window.print()`, no `print-receipt`, no `<header>`).
  - Printing via a modal must use `createPortal(..., document.body)` + `print-modal-wrapper ... print:!bottom-auto print:!overflow-visible` (`FleetCanvasManager.jsx:1051`) and `<div className="hd">` (not `<header>`) to avoid both traps.
- **Phone (390 px):** Today's inline card fits 390 px; `.kpm-sj` in the portaled modal also fits 390 px with no horizontal scroll.
- **Smallest edit list (do not apply):**
  - `src/FleetCanvasManager.jsx:1049-1104, 1557-1565`: extract the `.kpm-sj` portaled modal into a shared renderer/props and pass `onPrintReport` (or `appSettings` + `adminName`) to `<LoadSheet>`.
  - `src/components/LoadSheet.jsx:154, 227`: stamp `at: new Date()` onto `report` and add a `Print` button to the inline `report` header that opens the `.kpm-sj` modal.

---

## Task 15 - the two Fleet fixes from your Task 11, as exact proposed code
**Status:** DONE
**Written:** 2026-11-16 22:10 WIB, by Claude. Same rules as above (read-only, touch only this file, commit it alone, "Antigravity:").

Your Task 11 found (1) with the PC person panel open, Tab reaches the dimmed keys behind `.kpm-fleet-veil` and Escape does not close the panel; (2) closing inside the first ~300 ms snaps to opacity 1 before `kpmFleetOut` runs (two keyframe animations swapped). Claude will build both. Write the exact change as code blocks in your Result (do NOT edit the files):
- **(1)** which elements get `inert` while a person is open on the PC (`.kpm-fleet-top`? anything else inside the shell box - the app header and rail live in `src/components/BiohazardTheme.jsx`), how React in this repo sets `inert` (check the React version in package.json: 18 needs `inert=""`, 19 takes a boolean), the Escape handler (where, and how it must step aside while FrontPanel (`FleetCanvasManager.jsx` ~L28, its own Escape), the Surat Jalan portal, or a ConfirmGate dialog is open), and where focus goes when the panel closes (back to the person's row).
- **(2)** the open/close driven by CSS transitions instead of `kpmFleetSlide`/`kpmFleetOut` keyframes, keeping: the 40 ms hold, 260 ms in / 200 ms out, the veil moving with the panel, the unmount on the panel's own end (today `onAnimationEnd` -> `finishClose`; a transition needs `onTransitionEnd` + a fallback timer), Lite Mode and reduced motion instant, and no replay on a − + press. Name every logicFixes check (file:line) that pins the old keyframes and would need re-pinning.

**Result:**

### (1) `inert` on blurred top bar, `Escape` handler, and focus return (`package.json:24` is React `^19.2.3`, so `inert` takes a boolean, matching `CustomerManager.jsx:1379`)
- **What gets `inert`:** `.kpm-fleet-top` (`src/FleetCanvasManager.jsx:1109`) — it is the only sibling inside `.kpm-fleet` that sits under `.kpm-fleet-veil` (`z: 15`). `.kpm-fleet-list` stays interactive (`z: 16`) so names can be switched; the app header/rail in `BiohazardTheme.jsx` sit outside `.kpm-fleet` and stay sharp.
- **Proposed JSX (`src/FleetCanvasManager.jsx:1109`):**
```jsx
<div inert={!!selectedAgent} className={`hide-on-print kpm-fleet-top shrink-0 bg-[var(--raised)] border-b border-[var(--line-2)]${selectedAgent ? ' open' : ''}`}>
```
- **Proposed `Escape` + focus return (`src/FleetCanvasManager.jsx` near `closePanel` ~L884-893):**
```jsx
const returnFocus = (id) => {
    if (!id) return;
    requestAnimationFrame(() => rootRef.current?.querySelector(`.kpm-fleet-row[data-agent="${id}"]`)?.focus());
};
const finishClose = () => {
    const id = selectedAgent?.id;
    clearTimeout(closeTimer.current); setPanelClosing(false); setSelectedAgent(null);
    returnFocus(id);
};
const closePanel = async () => {
    if (panelClosing) return;
    if (bayLines > 0 && !await confirmAction(`${selectedAgent?.name}'s sheet has numbers that are not saved yet. Close it and drop them?`)) return;
    if (!window.matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)').matches || document.documentElement.classList.contains('lite-mode')) {
        const id = selectedAgent?.id;
        setSelectedAgent(null);
        return returnFocus(id);
    }
    setPanelClosing(true);
    closeTimer.current = setTimeout(finishClose, 400);
};

useEffect(() => {
    if (!selectedAgent) return undefined;
    const onKey = (e) => {
        if (e.key !== 'Escape') return;
        if (offersOpen || isAddingAgent || viewingSuratJalan || viewingReceipt) return;
        if (document.querySelector('[role="alertdialog"], [role="dialog"][aria-modal="true"]')) return;
        closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
});
```

### (2) CSS transition open/close replacing `kpmFleetSlide` / `kpmFleetOut`
- **Proposed JS (`src/FleetCanvasManager.jsx`):**
  Track `panelShown` (reset to `false` when `selectedAgent?.id` changes, set to `true` inside `requestAnimationFrame` on mount) and `veilShown` (true on `rAF` while `selectedAgent && !panelClosing`).
```jsx
const [panelShown, setPanelShown] = useState(false);
const [veilShown, setVeilShown] = useState(false);
useEffect(() => {
    if (!selectedAgent) { setPanelShown(false); setVeilShown(false); return undefined; }
    setPanelShown(false);
    const id = requestAnimationFrame(() => { setPanelShown(true); setVeilShown(true); });
    return () => cancelAnimationFrame(id);
}, [selectedAgent?.id]);
```
  And on the veil + panel (`src/FleetCanvasManager.jsx:1532, 1549`):
```jsx
{selectedAgent && <div className={`kpm-fleet-veil${veilShown && !panelClosing ? ' open' : ''}${panelClosing ? ' closing' : ''}`} onClick={closePanel} aria-hidden="true" />}
...
<aside key={sel.id} className={`kpm-fleet-panel${panelShown && !panelClosing ? ' open' : ''}${panelClosing ? ' closing' : ''}`}
    onTransitionEnd={(e) => { if (e.target === e.currentTarget && e.propertyName === 'opacity' && panelClosing) finishClose(); }}
    aria-label={`${sel.name}'s van`} data-mission="3" data-more={moreOpen || undefined}>
```
- **Proposed CSS (`src/styles/theme.css:5908, 5921, 5941-5965`):**
```css
/* inside @media (min-width: 1024px) */
.kpm-fleet-panel {
  /* ...grid & placement unchanged... */
  opacity: 0; transform: translateX(24px);
  transition: transform 260ms cubic-bezier(.22, 1, .36, 1) 40ms, opacity 260ms cubic-bezier(.22, 1, .36, 1) 40ms;
}
.kpm-fleet-panel.open { opacity: 1; transform: none; }
.kpm-fleet-panel.closing {
  opacity: 0; transform: translateX(24px); pointer-events: none;
  transition: transform 200ms cubic-bezier(.23, 1, .32, 1) 0ms, opacity 200ms cubic-bezier(.23, 1, .32, 1) 0ms;
}
.kpm-fleet-veil {
  display: block; position: fixed; inset: 0; z-index: 15;
  background: rgba(8, 7, 6, .55); backdrop-filter: blur(3px);
  opacity: 0; transition: opacity 260ms cubic-bezier(.22, 1, .36, 1) 40ms;
}
.kpm-fleet-veil.open { opacity: 1; }
.kpm-fleet-veil.closing { opacity: 0; pointer-events: none; transition: opacity 200ms cubic-bezier(.23, 1, .32, 1) 0ms; }
/* Lite Mode & reduced motion: */
.lite-mode .kpm-fleet-panel, html.lite-mode .kpm-fleet-veil { transition: none; }
@media (prefers-reduced-motion: reduce) { .kpm-fleet-panel, .kpm-fleet-veil, .kpm-fleet-acts { transition: none; animation: none; } }
```
- **`logicFixes.selfcheck.mjs` checks that pin the old keyframes and must be re-pinned:**
  - `src/config/logicFixes.selfcheck.mjs:8656-8657` (`kpmFleetSlide` animation on `.kpm-fleet-panel`)
  - `src/config/logicFixes.selfcheck.mjs:14255-14257` (`@keyframes kpmFleetSlide`)
  - `src/config/logicFixes.selfcheck.mjs:14273-14278` (`kpmFleetOut`, `onAnimationEnd`)
  - `src/config/logicFixes.selfcheck.mjs:14302-14314` (`VEIL` string, `kpmFleetSlide`, `kpmFleetVeilIn`, `kpmFleetVeilOut`)

---

## Task 16 - the 18 AT RISK overlays from your Task 8: an exact edit plan
**Status:** DONE
**Written:** 2026-11-16 22:10 WIB, by Claude. Same rules as above.

Your Task 8 listed 18 overlays that can open cut under the demo bars. The Fleet Surat Jalan is fixed (portaled, b10ce952). Two print traps were found on it in the lab: (a) the shell's print rule (`BiohazardTheme.jsx` ~L1220-1243) hides every `<header>` and `<nav>`; (b) a portaled `fixed inset-0` wrapper with `overflow-y-auto` prints only 89 px unless it gets `print:!bottom-auto print:!overflow-visible`. For EACH remaining AT RISK overlay:
- **The smallest fix**: portal to `document.body` (FrontPanel's way) or something smaller; exact file:line and the exact className / JSX change in words.
- **Does it print?** If yes: would the portal trigger trap (a) or (b) - does it contain `<header>`/`<nav>`, does its wrapper have `inset-0` + an overflow class?
- **z-index after the portal**: must be 97+ to clear the demo bars (ImageCropper `z-[70]`).
- **Anything it reads from its place in the tree** (CSS that depends on a parent class) that a portal would break.
Group them: which can share ONE small wrapper component, which need their own change. Do NOT change the code.

**Result:**
All 18 overlays read CSS tokens (`--ink`, `--raised`, `--duke-*`, `.light`, `.lite-mode`) from `<html>`/`:root`, so **none** depend on a parent class inside `BiohazardTheme.jsx:1122`'s `z-10` wrapper.

### Group A — Non-printing overlays (12 overlays): share ONE `BodyPortal` (`createPortal(children, document.body)`)
| Overlay (`file:line`) | Smallest fix | `z` after portal | Print? |
|---|---|---|---|
| `src/JourneyView.jsx:1930` (Shop modal) | Wrap JSX in `createPortal(..., document.body)` | `2000` (ok) | No |
| `src/MerchantSalesView.jsx:3027` (GPS bypass modal) | Wrap JSX in `createPortal(..., document.body)` | `300` (ok) | No |
| `src/MerchantSalesView.jsx:3121` (Manual/proof modal) | Wrap JSX in `createPortal(..., document.body)` | `300` (ok) | No |
| `src/RestockVaultView.jsx:1199` (Image lightbox, `top-6` X) | Wrap JSX in `createPortal(..., document.body)` | `300` (ok) | No |
| `src/RestockVaultView.jsx:1283` (Edit PO) | Wrap JSX in `createPortal(..., document.body)` | `100` (ok) | No |
| `src/RestockVaultView.jsx:1372` (PO detail modal) | Wrap JSX in `createPortal(..., document.body)` | `300` (ok) | No |
| `src/StockOpnameView.jsx:1112` (Image lightbox, `top-6` X) | Wrap JSX in `createPortal(..., document.body)` | `500` (ok) | No |
| `src/components/HistoryReportView.jsx:940` (Photo lightbox, `top-6` X) | Wrap JSX in `createPortal(..., document.body)` | `600` (ok) | No |
| `src/components/HistoryReportView.jsx:956` (Edit transaction) | Wrap JSX in `createPortal(..., document.body)` | `100` (ok) | No |
| `src/components/ArrivalScanner.jsx:81` | Wrap JSX in `createPortal(..., document.body)` | `220` (ok) | No |
| `src/components/ExamineModal.jsx:81` (3D viewer, `top-8` X) | Wrap JSX in `createPortal(..., document.body)` | `10000` (ok) | No |
| `src/components/PhotoField.jsx:168` | Wrap JSX in `createPortal(..., document.body)` | `9999` (ok) | No |

### Group B — Needs its own `z-index` bump + portal (1 overlay)
- `src/components/ImageCropper.jsx:171`: **Portal to `document.body` AND change `z-[70]` -> `z-[500]`** (at `z-[70]` it would still lose to `.kpm-demo-bar` `z: 95` and `.kpm-mission` `z: 96`). Non-printing.

### Group C — Printing overlays (5 overlays): portal + print-trap checks
| Overlay (`file:line`) | Smallest fix | Trap (a) `<header>`/`<nav>`? | Trap (b) `inset-0` + overflow? | `z` after portal |
|---|---|---|---|---|
| `src/FleetCanvasManager.jsx:992` (Reprint receipt) | Wrap in `createPortal(..., document.body)` + add `print:!bottom-auto print:!overflow-visible` to wrapper | No | Wrapper has `print-modal-wrapper fixed inset-0`; inner `.print-receipt` has `overflow-y-auto` | `500` (ok) |
| `src/ConsignmentFinanceView.jsx:648` (Receipt) | Wrap in `createPortal(..., document.body)` + add `print:!bottom-auto print:!overflow-visible` to wrapper | No | Same (plus uses popup iframe print at `865`) | `500` (ok) |
| `src/MerchantSalesView.jsx:3240` (Deal receipt) | Wrap in `createPortal(..., document.body)` + add `print:!bottom-auto print:!overflow-visible` to wrapper | No | Same (plus uses popup iframe print at `3478`) | `400` (ok) |
| `src/components/SaleReceipt.jsx:32` | Wrap in `createPortal(..., document.body)` + add `print:!bottom-auto print:!overflow-visible` (unless already inside `DayReplay.jsx:396`'s portal) | No | Same (plus uses popup iframe print at `233`) | `500` (ok) |
| `src/components/AcceptanceReceipt.jsx:61` | Portal to `document.body` + replace `<header>` (`85`) with `<div className="hd">` + add `print-modal-wrapper` & `print:!bottom-auto print:!overflow-visible` (and drop `<style>` `62-69`) | **YES** (`<header>` at `85` is hidden by `BiohazardTheme.jsx:1224`) | Outer `fixed inset-0`, inner `.print-receipt` has `max-h-[90vh] overflow-y-auto` | `200` (ok) |
| `src/components/ShipmentLabel.jsx:55` | Portal to `document.body` + replace `<header>` (`71`) with `<div className="hd">` + add `print-modal-wrapper` & `print:!bottom-auto print:!overflow-visible` (and drop `<style>` `56-63`) | **YES** (`<header>` at `71` is hidden by `BiohazardTheme.jsx:1224`) | Outer `fixed inset-0`, inner `.print-receipt` has `max-h-[90vh] overflow-y-auto` | `200` (ok) |

*(Count note: 12 Group A + 1 Group B + 6 Group C = 19, because `AcceptanceReceipt` and `ShipmentLabel` are counted separately here alongside the 4 receipts.)*

## Task 17 - review the demo guide's menu tour (commit 04a6bed2)
**Status:** DONE
**Written:** 2026-11-17 06:40 WIB, by Claude. Same rules as above (read-only, touch only this file, commit it alone, "Antigravity:").

Claude shipped the menu tour you supplied the data for (Tasks 5 and 13): `src/components/DemoMission.jsx` (the tour state, `seen()` / `shows()` / `aim()`, the LANJUT / LEWATI keys), `src/config/demoMission.js` (`TOUR`, `tourBeat`, `nav()`, `UNLOCK`), `src/styles/theme.css` (`html.kpm-tour`). Review it read-only, as a visitor would meet it:
1. **Per tier** - T2 owner, T4 regional admin (Hendra), T6 motorist (Dika), from `src/config/demoLogins.js`: which menu items does the tour walk (the shell renders `visibleMenu`, `src/components/BiohazardTheme.jsx` ~L526), and is every `TOUR` line TRUE for that tier? Example: the Settings line says "serta aturan perusahaan" - can a T6 change company rules there? For each line that is wrong for a tier: the tier, why (file:line), and a corrected Indonesian sentence (a full sentence, "Anda", never "kamu", named with the `${L}` the menu shows).
2. **Screen names** - every place the guide names a screen in words (`GO` and `BEFORE` in DemoMission.jsx, the `nav()` labels in demoMission.js) against the name the menu shows (`tr(item.label)`, `src/config/lang.js`). List each mismatch with file:line and the words to use (example: GO 3 says "Fleet & Canvas" - what does the menu show in Indonesian?).
3. **A press during the tour** - what happens when the visitor presses the RINGED menu item instead of LANJUT, on the PC (menu held open by `html.kpm-tour`) and on the phone (the drawer closes on a press, BiohazardTheme.jsx ~L925)? Trace it through the code: does the tour stay on that item, move on, or break? Anything that goes wrong, with file:line.
Do NOT change the code. Done when: three tables (tier x line truth, name mismatches, press-during-tour trace) in the Result.

**Result:**

### 1. Tier x `TOUR` line truth (`src/config/demoLogins.js:24-31`, `src/components/BiohazardTheme.jsx:501-535`, `src/config/permissions.js:154-203`, `src/config/demoMission.js:115-133`)
- **T2 Owner (`HARTONO SUSILO`, `ADMIN`, 16 items — all except `agent_inventory`):** Every `TOUR` line is true for T2.
- **T4 Regional Admin (`HENDRA GUNAWAN`, `FLEET_CAPTAIN`, 11 items — `agent_profile`, `map_war_room`, `journey`, `fleet`, `agent_inventory`, `sales`, `receivables`, `eod`, `stock_opname`, `transactions`, `settings`):** 10 lines true; **`settings` is wrong**.
- **T6 Motorist (`DIKA SAPUTRA`, `ROOKIE`/`AGENT`, 7 items — `agent_profile`, `journey`, `agent_inventory`, `sales`, `eod`, `transactions`, `settings`):** 6 lines true; **`settings` is wrong**.

| Tier | Item (`data-mark`) | Why wrong (`file:line`) | Corrected Indonesian sentence (using `${L}`) |
|---|---|---|---|
| T4, T6 | `settings` (`Pengaturan`) | `demoMission.js:132` says `"serta aturan perusahaan"`, but `permissions.js:193, 201` does NOT grant `view_settings` to T4 or T6 — `BiohazardTheme.jsx:532` shows Settings to all tiers only for this device's Language & Graphics. | `Di ${L}, Anda mengatur bahasa dan tampilan hemat baterai di perangkat ini.` (or keep `"serta aturan perusahaan"` only when `view_settings` is granted). |

### 2. Screen name mismatches vs menu label (`tr(item.label)` in `src/config/lang.js:71, 244-258`)
*(Indonesian is default in `lang.js:1-5`; `nav()` in `demoMission.js:60-101` and `GO` in `DemoMission.jsx:59-72` hardcode English names instead of `tr(...)`.)*

| Where (`file:line`) | Hardcoded text | Menu shows in ID (`lang.js:line`) | Words to use |
|---|---|---|---|
| `DemoMission.jsx:60, 61`, `demoMission.js:60, 67` | `Restock Vault` | `Isi Stok Gudang` (`lang.js:249`) | `tr('Restock Vault')` -> `Isi Stok Gudang` |
| `DemoMission.jsx:69, 71`, `demoMission.js:15, 21-23` | `Master Vault` | `Gudang Pusat` (`lang.js:71`) | `tr('Master Vault')` -> `Gudang Pusat` |
| `DemoMission.jsx:63`, `demoMission.js:73` | `Fleet & Canvas` | `Armada & Kanvas` (`lang.js:247`) | `tr('Fleet & Canvas')` -> `Armada & Kanvas` |
| `DemoMission.jsx:64, 66`, `demoMission.js:77, 83` | `Sales Terminal` | `Terminal Penjualan` (`lang.js:250`) | `tr('Sales Terminal')` -> `Terminal Penjualan` |
| `DemoMission.jsx:68, 70`, `demoMission.js:92, 96` | `EOD` / `EOD Setoran` | `Setoran Sore` (`lang.js:252`) | `tr('EOD Setoran')` -> `Setoran Sore` |
| `DemoMission.jsx:71`, `demoMission.js:101` | `Stock Opname` | `Stok Opname` (`lang.js:253`) | `tr('Stock Opname')` -> `Stok Opname` |

### 3. Pressing the ringed menu item instead of `LANJUT` during the tour
| Surface | What happens (`file:line`) | Tour state & bug? |
|---|---|---|
| **PC (1280)** | `BiohazardTheme.jsx:927` runs `setActiveTab(item.id); setIsMobileMenuOpen(false);`. `html.kpm-tour` keeps the rail open (`theme.css:2030, 2055, 2080, 2101, 2114, 2311`). | **Stays on same item** (`tour` index only advances on `LANJUT` at `DemoMission.jsx:272`). **Bug if user clicks `SWITCH` mid-tour:** `items` in `DemoMission.jsx:297-298` depends only on `[touring]`, not on `me?.tier`, so after switching T2 -> T6 `items` still holds T2's missing marks (e.g. `dashboard`), `aim()` falls back to `.kpm-rail-totem` (`v.alt = true`), and `LANJUT` disappears. |
| **Phone (390)** | `BiohazardTheme.jsx:927` runs `setActiveTab(item.id); setIsMobileMenuOpen(false);`, **closing the drawer** (`translate-x-full`, `BiohazardTheme.jsx:820`). | **Stays on same item, loses `LANJUT`:** next `look()` (`DemoMission.jsx:176-199`) sees `[data-mark]` off-screen, falls back to `[aria-label="Open navigation"]` (`v.alt = true`), hides `LANJUT` (`DemoMission.jsx:272`), and asks `"Buka menu dulu: tekan tombol ini."` again. |

## Task 18 - every guide beat in steps 1-4: is its target on the page in the doer's DEFAULT view?
**Status:** DONE
**Written:** 2026-11-17 07:20 WIB, by Claude. Same rules as above (read-only, touch only this file, commit it alone, "Antigravity:").

Aldi found step 3's "Pilih DIKA SAPUTRA." with Dika nowhere on the screen. Cause: Fleet & Roster shows ONE area at a time to a viewer who can see several (`src/FleetCanvasManager.jsx` ~L1449: `place = rosterPlace || the selected person's area || keys[0]`, areas A-Z), so the owner and Aldi's own T1 account open on BANDUNG while Dika is under HEADQUARTERS. Hendra (T4, the step's doer) sees one area and is fine. Find every other beat like it.
For each beat of GUIDE steps 1-4 (`src/config/demoMission.js`), for TWO logins - the step's doer (`STEPS[n].who`, `src/config/demoLogins.js`) and T1 (Aldi's own account: `const mine = isT1 || ...` in `src/components/DemoMission.jsx`, so T1 is guided through every step; T1 sees what the owner sees) - on the BIG demo company (`api/_demoCompany.js`):
- Is the beat's target in the page when the visitor arrives in the screen's default state (default tab, filter, area / team / date, sort, list length or virtualisation, folded sections)? Name the state and its default (file:line).
- If not: what must the visitor press first, and the smallest guide-only fix (one more target in the beat's `at` list with its own line, plus the mark to add on that control). Never a change to the screen's default for real users.
Do NOT change the code. Done when: one table per step (beat, login, in the page yes/no, why with file:line, fix).

**Result:**

### Step 1 (`Restock Vault` — Produksi -> Master Vault; doer = `T2` Owner, also `T1`)
| Beat (`demoMission.js:60-66`) | Login | In page by default? | Why (`file:line`) | Fix |
|---|---|---|---|---|
| 1. `UNLOCK` | T2, T1 | **Yes** | Vault starts locked (`!isAdmin`); `[data-guide="unlock"]` (`App.jsx:5105` on locked vault tab) or `.kpm-rail-totem` (`BiohazardTheme.jsx:831`) is visible. | None |
| 2. `nav('restock_vault', ...)` | T2, T1 | **Yes** | `restock_vault` is in `visibleMenu` for T1/T2 (`permissions.js:183,185`); `.kpm-rail-totem` / `[aria-label="Open navigation"]` / `[data-mark="restock_vault"]` (`BiohazardTheme.jsx:831,641,925`). | None |
| 3. `[data-mission="1"]` (`MASUK`) | T2, T1 | **Yes** (already `done`) | `RestockVaultView.jsx:185` defaults `viewMode = 'in'`, so `data-mission="1"` (`1501`) already has `aria-selected="true"` once unlocked. | None |
| 4–8. `asal`, `tujuan`, `goods`, `cart`, `save` | T2, T1 | **Yes** | All five render in `viewMode === 'in'` (`RestockVaultView.jsx:88, 1843, 2010, 2198`). | None |

### Step 2 (`Restock Vault` — Master Vault -> Cabang; doer = `T2` Owner, also `T1`)
| Beat (`demoMission.js:67-72`) | Login | In page by default? | Why (`file:line`) | Fix |
|---|---|---|---|---|
| 1. `UNLOCK` | T2, T1 | **Yes** | Same as Step 1 (`BiohazardTheme.jsx:831`, `App.jsx:5105`). | None |
| 2. `nav('restock_vault', ...)` | T2, T1 | **Yes** | Same as Step 1 (`BiohazardTheme.jsx:925`). | None |
| 3. `[data-mission="2"]` (`KIRIM`) | T2, T1 | **Yes** | `RestockVaultView.jsx:185` defaults to `'in'`, so `KIRIM` (`1501`) is visible and unselected; tapping it switches to `'out'`. | None |
| 4–7. `tujuan`, `goods`, `cart`, `save` | T2, T1 | **Yes** | All four render once `viewMode === 'out'` (`RestockVaultView.jsx:88, 1843, 2010, 2198`). | None |

### Step 3 (`Fleet & Roster` — Muat ke tas Dika; doer = `T4` Hendra, also `T1`)
| Beat (`demoMission.js:69-72`) | Login | In page by default? | Why (`file:line`) | Fix |
|---|---|---|---|---|
| 1. `nav('fleet', ...)` | T4, T1 | **Yes** | `view_fleet` is granted to T4 (`permissions.js:193`) and T1 (`183`). | None |
| 2. `.kpm-fleet-row[data-agent="demo-agent-2"]` (Dika) | **T4 Hendra** | **Yes** | Hendra is `isAreaAdmin` (`FleetCanvasManager.jsx:51`) at `Headquarters`; `agents` (`156`) holds only `HEADQUARTERS`, so Dika (`demo-agent-2`) is on screen. | None |
| 2. `.kpm-fleet-row[data-agent="demo-agent-2"]` (Dika) | **T1** | **NO** | T1 sees all places (`BANDUNG` + `HEADQUARTERS`). `keys` is sorted A–Z (`1444`), `rosterPlace` defaults `null` (`265`), so `place` (`1449`) opens on `keys[0]` = **`BANDUNG`**; Dika is under `HEADQUARTERS`. | Add `data-place={places[k].loc}` on the area chip at `FleetCanvasManager.jsx:1463`, and update `GUIDE[3]` beat 2 (`demoMission.js:74`) to `at: ['.kpm-fleet-row[data-agent="demo-agent-2"]', '[data-place="HEADQUARTERS"]']` with `'Pilih area HEADQUARTERS dulu untuk melihat Dika.'`. |
| 3–4. `[data-guide="load-plus"]`, `[data-ponder="go"]` | T4, T1 | **Yes** | Both render in `LoadSheet.jsx:218, 245` as soon as Dika's panel opens. | None |

### Step 4 (`Sales Terminal` — Penjualan; doer = `T6` Dika, also `T1`)
| Beat (`demoMission.js:77-82`) | Login | In page by default? | Why (`file:line`) | Fix |
|---|---|---|---|---|
| 1. `nav('sales', ...)` | T6, T1 | **Yes** | `view_sales` is granted to T6 (`permissions.js:201`) and T1 (`183`). | None |
| 2. `slip(sale-mode)` | T6, T1 | **Yes** (already `done`) | `isReturMode` defaults `false` (`MerchantSalesView.jsx:133`), so `[data-mission="4"]:not([data-retur])` is already satisfied. | None |
| 3. `SHOP` | T6, T1 | **Yes** | On PC `data-guide="customer"` (`1882`) is visible; on phone `2530` (`lg:hidden`) is visible; clicking opens `data-guide="shops"` (`1753`). | None |
| 4. `shelf(...)` | T6, T1 | **Yes** | `data-guide="products"` (`2818`) is visible; `manifestOpen` starts `false` (`92`), so `data-covered` is unset on phone. | None |
| 5–6. `slip(PHOTO)`, `slip(MAKE DEAL)` | T6, T1 | **Yes** | On PC both (`2365, 2406`) are visible; on phone `slip()` rings `[data-guide="open-slip"][data-shut]` (`2468`) first, then `2365` / `2406`. | None |

## Task 19 - the same check for steps 5-8
**Status:** DONE
**Written:** 2026-11-17 07:20 WIB, by Claude. Same rules as above.

Exactly Task 18's method, for GUIDE steps 5-8. Look hard at step 7: its Dika card is `.pc[data-agent="demo-agent-2"]:not([data-late])` in EOD's HQ Verification - which date, filter or area decides whether that card is listed for the owner and for T1, and what happens when Dika's EOD is from yesterday (the `data-late` mark)? And step 8's count rows (`[data-guide="good"]`, `[data-half]`): which warehouse does Stock Opname open on for the owner and for T1?
Do NOT change the code. Done when: one table per step (beat, login, in the page yes/no, why with file:line, fix).

**Result:**

### Step 5 — Sales Terminal: Retur (`STEPS[4].who = T6`, `GUIDE[5]` in `src/config/demoMission.js:83-91`)
Both `T6` (Dika, `allowRetur: true` in `api/_demoCompany.js:451`) and `T1` (`ADMIN`, `allowRetur: true` in `src/App.jsx:5501`) receive `allowRetur=true`. Default state: `manifestOpen=false` (`src/MerchantSalesView.jsx:92`), `isReturMode=false` (`src/MerchantSalesView.jsx:133`). On PC (`lg:`), the slip is always open; on phone (`<lg`), `manifestOpen=false` keeps the slip off-canvas so `slip()` (`src/config/demoMission.js:46`) falls back to `[data-guide="open-slip"][data-shut]` (`src/MerchantSalesView.jsx:2468`).

| beat | login | in the page yes/no | why with file:line | fix |
| :--- | :--- | :--- | :--- | :--- |
| 1. `nav('sales', ...)` (`demoMission.js:83`) | T6 / T1 | No (until menu opened) | App opens on default tab, not `sales`; `[data-mark="sales"]` is hidden in `.kpm-rail-totem` (PC) or `[aria-label="Open navigation"]` (phone) | None — `nav()` (`demoMission.js:36`) already lists `.kpm-rail-totem` and `[aria-label="Open navigation"]` |
| 2. `slip([data-mission="5"])` (`demoMission.js:84`) | T6 / T1 | Yes on PC / No on phone (drawer shut) | `isReturMode` defaults `false` (`MerchantSalesView.jsx:133`); `allowRetur` is `true` for both (`api/_demoCompany.js:451`, `App.jsx:5501`), so `[data-mission="5"]` (`MerchantSalesView.jsx:1817`) renders in slip; on phone `manifestOpen=false` (`92`) hides it until `[data-guide="open-slip"][data-shut]` (`2468`) is pressed | None — `slip()` (`demoMission.js:46`) already rings `[data-guide="open-slip"][data-shut]` first on phone |
| 3. `SHOP` (`demoMission.js:40-41, 85`) | T6 / T1 | Yes | No customer selected by default; `[data-guide="customer"]` is on-screen on PC (`MerchantSalesView.jsx:1882`) and phone (`2530`), and `[data-guide="shops"]` (`1753`) opens on click | None |
| 4. `shelf(...)` (`demoMission.js:49, 86`) | T6 / T1 | Yes (if slip shut on phone) | `[data-guide="products"]:not([data-covered])` (`MerchantSalesView.jsx:2818`) is visible on PC, and on phone when `manifestOpen=false` (`92`); if open, `[data-guide="close-slip"]` (`2253`) closes it | None — `shelf()` (`demoMission.js:49`) already falls back to `[data-guide="close-slip"]` |
| 5. `slip(['[data-guide="reason"]', '[data-guide="cond"]'])` (`demoMission.js:88-89`) | T6 / T1 | No until cart has item | `[data-guide="reason"]` (`MerchantSalesView.jsx:2120`) and `[data-guide="cond"]` (`2109`) only render for cart lines; beat 4 adds the item first, then `slip()` opens drawer on phone (`2468`) | None |
| 6. `slip(PHOTO)` (`demoMission.js:42, 90`) | T6 / T1 | Yes on PC / No on phone (drawer shut) | `[data-guide="photo"]` (`MerchantSalesView.jsx:2365`) sits inside the slip; on phone `slip()` rings `[data-guide="open-slip"][data-shut]` (`2468`) first | None |
| 7. `slip([data-mission="4"])` (`demoMission.js:91`) | T6 / T1 | Yes on PC / No on phone (drawer shut) | `[data-mission="4"]` (`MerchantSalesView.jsx:2406`) sits inside the slip; on phone `slip()` rings `[data-guide="open-slip"][data-shut]` (`2468`) first | None |

---

### Step 6 — EOD Setoran: Agent Submit (`STEPS[5].who = T6`, `GUIDE[6]` in `src/config/demoMission.js:92-95`)
Default state: `viewMode = useState(isAdmin ? 'review' : 'submit')` (`src/EODReconciliationView.jsx:63`). `T6` has `isAdmin=false` and lands directly on `'submit'`; `T1` has `isAdmin=true` and lands on `'review'` (`HQ Verification`).

| beat | login | in the page yes/no | why with file:line | fix |
| :--- | :--- | :--- | :--- | :--- |
| 1. `nav('eod', ...)` (`demoMission.js:92`) | T6 | Yes (after nav) | `isAdmin=false` defaults `viewMode` to `'submit'` (`EODReconciliationView.jsx:63`), which renders `<EODAgentFlow>` and `[data-mission="6"]` (`EODAgentFlow.jsx:119`) | None |
| 1. `nav('eod', ...)` (`demoMission.js:92`) | T1 | No (after nav, wrong tab) | `isAdmin=true` defaults `viewMode` to `'review'` (`EODReconciliationView.jsx:63`); `[data-mission="6"]` (`EODAgentFlow.jsx:119`) is unmounted until T1 presses `My Setoran` (`EODReconciliationView.jsx:397-399`), which has no `data-guide` mark | Add `data-guide="eod-submit"` to the `My Setoran` button (`EODReconciliationView.jsx:397`) and insert `{ at: '[data-guide="eod-submit"]', say: 'Tekan My Setoran untuk mengirim laporan akhir hari.', done: '[data-mission="6"]' }` before beat 2 (or add `[data-guide="eod-submit"]` to `GUIDE[6]` beat 2's `at` fallback) |
| 2. `[data-guide="deck"]` (`demoMission.js:93-94`) | T6 | Yes | `[data-guide="deck"]` (`EODAgentFlow.jsx:164`) renders immediately in `viewMode === 'submit'` | None |
| 2. `[data-guide="deck"]` (`demoMission.js:93-94`) | T1 | No | Hidden while `viewMode === 'review'` (`EODReconciliationView.jsx:63`); visitor must press `My Setoran` (`397`) first | Same `[data-guide="eod-submit"]` tab beat as above |
| 3. `[data-guide="send"]` (`demoMission.js:95`) | T6 / T1 | No until deck finished | `[data-guide="send"]` (`EODLetter.jsx:192`) renders after `stage` leaves `'open'` (`demoMission.js:94`); for T1 also blocked until `My Setoran` (`397`) is opened | Covered by beat 2 + `[data-guide="eod-submit"]` for T1 |

---

### Step 7 — EOD Setoran: HQ Verification (`STEPS[6].who = T2`, `GUIDE[7]` in `src/config/demoMission.js:96-100`)
**Date / filter / area rules for `DIKA` (`.pc[data-agent="demo-agent-2"]:not([data-late])`, `demoMission.js:50`):**
- **Area / filter:** `pendingReports` is `eodReports.filter(r => r.status === 'PENDING')` (`src/EODReconciliationView.jsx:301-303`) with **no area or region filter**, so both `T2` (Owner) and `T1` (`ADMIN`) see every pending EOD across the company.
- **Date (`data-late`):** `groupPendingEOD(pendingReports, getLocalDayKey())` (`EODReconciliationView.jsx:311`) splits pending reports by report date vs today (`getLocalDayKey()`): today's go to `tonight`, earlier dates go to `late` (`EODReconciliationView.jsx:986-990`), which sets `data-late=""` on the card (`src/components/PlayerCard.jsx:321`).
- **What happens when Dika's EOD is from yesterday:** In the BIG demo seed (`api/_demoCompany.js:374, 387`), `demo-agent-2` (Dika) is seeded `PENDING` on `recent[recent.length - 1]` (**yesterday**). That seeded card lands in `late` with `data-late=""`, so `.pc[data-agent="demo-agent-2"]:not([data-late])` (`demoMission.js:50`) **does NOT match it** — `DIKA` only matches a same-day EOD submitted today (Step 6).

| beat | login | in the page yes/no | why with file:line | fix |
| :--- | :--- | :--- | :--- | :--- |
| 1. `UNLOCK` (`demoMission.js:55-58, 96`) | T2 / T1 | Yes | Master Vault starts locked (`[data-vault="open"]` absent); `[data-guide="unlock"]` or menu fallback is on-screen | None |
| 2. `nav('eod', ...)` (`demoMission.js:96`) | T2 / T1 | No (until menu opened) | App opens on default tab; `nav()` opens menu and lands on `EODReconciliationView` with `viewMode === 'review'` (`EODReconciliationView.jsx:63`) | None |
| 3. `[data-guide="eod-review"]` (`demoMission.js:97`) | T2 / T1 | Yes (auto-skipped) | `isAdmin=true` defaults `viewMode` to `'review'` (`EODReconciliationView.jsx:63`), so `[data-mission="7"]` (`EODReconciliationView.jsx:937`) is already in the DOM and `liveBeat` (`demoMission.js:139-142`) skips beat 3 | None |
| 4. `DIKA` (`demoMission.js:50, 98`) | T2 / T1 | Yes if Step 6 done today / **No** on fresh demo (yesterday's seed) | `pendingReports` (`EODReconciliationView.jsx:301-303`) has no area filter, but `groupPendingEOD` (`311`) marks yesterday's seeded Dika EOD (`api/_demoCompany.js:374, 387`) as `late` (`EODReconciliationView.jsx:986-990`, `PlayerCard.jsx:321` sets `data-late=""`), which `:not([data-late])` (`demoMission.js:50`) excludes | If yesterday's seeded card should also be valid, add `.pc[data-agent="demo-agent-2"]` as fallback in `at` (and `.pc[data-agent="demo-agent-2"].open` in `done`); otherwise keep `:not([data-late])` if Step 7 strictly targets today's Step-6 EOD |
| 5. `${DIKA} [aria-label^="approve "][aria-pressed="false"]` (`demoMission.js:99`) | T2 / T1 | No until beat 4 opens `DIKA` | Section approve toggles render inside the expanded `DIKA` card (same `data-late` caveat if only yesterday's seeded EOD exists) | Same as beat 4 |
| 6. `${DIKA} [data-guide="approve-night"]` (`demoMission.js:100`) | T2 / T1 | No until beat 4 opens `DIKA` | Approve button renders inside the expanded `DIKA` card (same `data-late` caveat if only yesterday's seeded EOD exists) | Same as beat 4 |

---

### Step 8 — Stock Opname: Master Vault (`STEPS[7].who = T2`, `GUIDE[8]` in `src/config/demoMission.js:101-109`)
**Which warehouse Stock Opname opens on for `T2` and `T1`:** Both `T2` (Owner) and `T1` (`ADMIN`) have `isHighCommand === true`, so `isAreaAdmin` is `false` (`src/StockOpnameView.jsx:265`), `countPlace` is `HQ_LABEL` (**Master Vault**, `StockOpnameView.jsx:280`), and `activeInventory` is `[...safeInventory, ...promoItems]` (**Master Vault** stock, `StockOpnameView.jsx:306`). No warehouse picker is needed. Default tab: `viewMode = useState(isHighCommand ? 'monitor' : canDecide ? 'review' : 'count')` (`StockOpnameView.jsx:285`), so both open on `'monitor'`.

| beat | login | in the page yes/no | why with file:line | fix |
| :--- | :--- | :--- | :--- | :--- |
| 1. `nav('stock_opname', ...)` (`demoMission.js:101`) | T2 / T1 | No (until menu opened) | App opens on default tab; after opening Stock Opname, `[data-mission="8"]` (`New Count` tab at `StockOpnameView.jsx:1257`) is on-screen in default `'monitor'` view (`285`) | None |
| 2. `[data-mission="8"]` (`demoMission.js:102`) | T2 / T1 | Yes (in `'monitor'` view) | `viewMode` defaults to `'monitor'` (`StockOpnameView.jsx:285`), so `[data-guide="count"]` (`1709`) is not mounted yet and `[data-mission="8"]` (`1257`) is visible to click | None |
| 3. `['[data-half] input:placeholder-shown', '[data-guide="good"]', '[data-guide="count"]']` (`demoMission.js:106-108`) | T2 / T1 | No on arrival / Yes after pressing `New Count` | Hidden in default `'monitor'` view (`StockOpnameView.jsx:285`); pressing `[data-mission="8"]` (`1257`) switches to `'count'`, rendering `[data-guide="count"]` (`1709`), `[data-guide="good"]` (`1780`), and `[data-half]` (`1769`) for Master Vault (`306`) | None — beat 2 already guides pressing `[data-mission="8"]` first |
| 4. `[data-guide="submit-count"]` (`demoMission.js:109`) | T2 / T1 | No on arrival / Yes after entering `'count'` view | `[data-guide="submit-count"]` (`StockOpnameView.jsx:2011`) only renders in `'count'` view (`1709`) after beat 2 switches from `'monitor'` | None — beat 2 already guides pressing `[data-mission="8"]` first |

## Task 20 - map the Master Vault screen before its redesign (segment 1 of 12)
**Status:** DONE
**Written:** 2026-11-17 07:20 WIB, by Claude. Same rules as above (read-only, touch only this file, commit it alone, "Antigravity:").

Aldi, 2026-11-17: *"i want to finish all segment before 20 november"* - 12 screens get the professional look (the same look as Sales Terminal, EOD Setoran, Agent Inventory, Journey Plan, Fleet & Roster). The first is the Master Vault, written INLINE in `src/App.jsx` (`activeTab === 'inventory'` ~L5174). A new face on that file can break a money path silently, so Claude needs a full map first:
1. Every element on the screen, top to bottom, at PC and at phone width: what it shows, what it reads (state / prop / Firestore field), file:line.
2. Every press: the handler it calls, what that handler writes (Firestore collection + fields, local state), and whether it moves stock or money. file:line.
3. Every piece of logic computed INSIDE the JSX (sums, filters, unit conversions Bks / Slop / Bal / Karton, quarantine, promo pcs) that a redesign could drop or change by accident.
4. What could be moved out into its own file first (`src/components/...`) without changing behaviour, and which `logicFixes.selfcheck.mjs` checks pin this screen's code by exact string (they would break on a move).
Do NOT change the code. Done when: four tables in the Result.

**Result:**

### 1. Elements on screen (PC & phone, top to bottom)
| element | PC / phone | what it shows | reads (state / prop / Firestore field) | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Outer shell wrapper | Both (`lg:h-[calc(100vh-140px)]`, phone `h-auto min-h-[800px]`) | Framed container around `ResidentEvilInventory` + edit modal | `activeTab === 'inventory'` | `src/App.jsx:5174-5175` |
| Supply Case list pane | Both (`phoneOpen ? 'hidden lg:flex' : 'flex'`, `w-full lg:w-96`) | Left column on PC; full-width screen 1 on phone | `phoneOpen` state | `src/components/ResidentEvilInventory.jsx:260` |
| Search input | Both | `"Search products..."` (single search driving `App.jsx` `searchTerm`) | `searchTerm` prop (`App.jsx:4414-4416`) | `src/components/ResidentEvilInventory.jsx:263-266` |
| Section filter tabs (`ALL`, `Quarantine`, product `type`s) + `+ Add` | Both (`flex-wrap`) | Wraps tabs; `Quarantine` (with `AlertTriangle`) & `+ Add` only if `isAdmin` | `sections`, `sectionKeys`, `activeSection`, `quarantine`, `isAdmin` | `src/components/ResidentEvilInventory.jsx:269-279` |
| Quarantine banner | Both (when `activeSection === QUARANTINE`) | `"Damaged stock waits here until Stock Opname settles it."` | `inQ` | `src/components/ResidentEvilInventory.jsx:283` |
| Product list rows (`#mv-row-${item.id}`) | Both (phone adds `ChevronRight`) | Thumb/3D-thumb/Package icon, low-stock bar/badge, `HazardMark`, name, `VAULT`/`START`/`FIELD`/`SOLD`/`DMG` or `QUARANTINE` or `VAULT: X pcs · FIELD: Y pcs` (or `STK: **` if `!isAdmin`) | `vaultList` (`products` split into `inventory` + `promoItems`), `motorists`, `transactions`, `appSettings`, `isAdmin`, `selectedId` | `src/App.jsx:4416`, `src/components/ResidentEvilInventory.jsx:284-342` |
| Inspector pane | PC always / Phone when `phoneOpen` (`lg:block`) | Background texture + Back button (phone only) + BG upload button (if `isAdmin`) + `ItemInspector` | `phoneOpen`, `backgroundSrc` (`appSettings?.inventoryBg`), `selectedItem`, `isAdmin` | `src/components/ResidentEvilInventory.jsx:346-375` |
| `ItemInspector` 3D stage | Both (`min-h-[340px]` phone) | `View in fullscreen` button, `HazardMark`, `PromoGoods3D` (when promo & no front photo) or 6-face CSS 3D box (`.kpm-inspect-spin`); 3D size controls (top-right popover on PC, `<details>` fold under prices on phone, admin + non-3D-goods only) | `product` (`dimensions`, `defaultZoom`, `images`, `useFrontForBack`, `kind`, `goods`), `isAdmin`, `showControls`, `dims`, `zoom`, `isInteracting` | `src/components/ResidentEvilInventory.jsx:54-147, 198-205` |
| `ItemInspector` footer | Both | Product name, `STOCK` (`X pcs` or `Bks / Slop / Bal` or `**`), `DAMAGED: X Bks`, `type` badge, `Edit`/`Discard` buttons (if `isAdmin`), 4 price cards (`Dist`/`Retail`/`Grosir`/`Ecer`, hidden if promo) | `product` (`name`, `stock`, `damagedStock`, `type`, `priceDistributor/Retail/Grosir/Ecer`), `isAdmin` | `src/components/ResidentEvilInventory.jsx:149-196` |
| `ExamineModal` fullscreen viewer | Both (portal/overlay in `App.jsx`) | Fullscreen interactive 3D/photo viewer + `description` | `examiningProduct` (`App.jsx:1750`) | `src/App.jsx:4690` |
| Edit / New Entry modal | Both (`hidden` while `cropImageSrc` is open) | Form: `name`, `description`, `isPromo` checkbox (new only), `goods` select (promo), `stock`, `minStock`, `sticksPerPack`, `type`, `packsPerSlop`, `slopsPerBal`, `balsPerCarton`, `useFrontForBack`, 2 or 6 texture face slots (`front/back/left/right/top/bottom`), `PromoLookFields`, `PromoBundleFields` (existing promo), `PRICING ENGINE` (non-promo), submit button | `editingProduct`, `tempImages`, `boxDimensions`, `useFrontForBack`, `cropImageSrc`, `savingProduct`, `appSettings`, `regionOffers`, `inventory`, `promoItems`, `motorists`, `userRole` | `src/App.jsx:5220-5381` |

### 2. Every press & what it writes
| control / press | handler called | writes (Firestore + local state) | moves stock or money? | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Search input `onChange` | `onSearch` -> `setSearchTerm` | Local `App.jsx` `searchTerm` only | No | `src/components/ResidentEvilInventory.jsx:264`, `src/App.jsx:5182` |
| Section / Quarantine tab | `setActiveSection(sec)` / `setActiveSection(QUARANTINE)` | Local `activeSection` | No | `src/components/ResidentEvilInventory.jsx:272-274` |
| Product row click | `openProduct(item.id)` | Local `selectedId`, `phoneOpen=true` on phone | No | `src/components/ResidentEvilInventory.jsx:225-230, 287` |
| Phone `Back` button | `backToList` | Local `phoneOpen=false`, scrolls `#mv-row-${selectedId}` | No | `src/components/ResidentEvilInventory.jsx:231-234, 354` |
| BG upload input | `onUploadBg` -> `handleInventoryBgSelect` | Local `cropImageSrc`, `activeCropContext`, `boxDimensions` (opens cropper; cropper saves `settings/general.inventoryBg`) | No | `src/components/ResidentEvilInventory.jsx:361`, `src/App.jsx:3665-3677, 5190` |
| 3D stage / `View in fullscreen` | `onExpand` -> `setExaminingProduct(item)` | Local `examiningProduct` | No | `src/components/ResidentEvilInventory.jsx:117, 120`, `src/App.jsx:5184` |
| 3D size `Save 3D Layout` | `onUpdateProduct(id, { dimensions, defaultZoom })` | Firestore `artifacts/${appId}/users/${user.uid}/products/${id}` (`dimensions`, `defaultZoom`); local `inventory` | No | `src/components/ResidentEvilInventory.jsx:96`, `src/App.jsx:5193-5201` |
| `+ Add` button | `onAddNew` | Local `editingProduct={}`, `tempImages={}`, `boxDimensions={w:55,h:90,d:22}`, `useFrontForBack=false` | No | `src/components/ResidentEvilInventory.jsx:278`, `src/App.jsx:5211-5216` |
| `Edit` button | `onEdit(product)` | Local `editingProduct=item`, `tempImages=item.images||{}`, `boxDimensions`, `useFrontForBack` | No | `src/components/ResidentEvilInventory.jsx:171`, `src/App.jsx:5205-5210` |
| `Discard` button | `onDelete(id)` -> `deleteProduct(id)` | Confirms, then `deleteDoc` on `artifacts/${appId}/users/${user.uid}/products/${id}` + `logAudit("PRODUCT_DELETE", ...)` | Deletes product record (removes its stock from Master Vault) | `src/components/ResidentEvilInventory.jsx:172`, `src/App.jsx:3810-3820, 5204` |
| Texture slot click / crop button | `handleProductFaceUpload` / `handleEditExisting` | Local `cropImageSrc`, `activeCropContext` -> populates `tempImages[face]` | No | `src/App.jsx:3647-3663, 5309-5330` |
| `PromoBundleFields` save | `handleSavePromoBundles(list)` | Firestore batch: `settings/general.promoBundles` + `promoOffers/${region}.bundles` + `logAudit("SETTINGS_UPDATE", ...)` | Changes promo bundle gift rules (not immediate stock/money) | `src/App.jsx:777-795, 5345` |
| Modal `Update Database` submit | `handleSaveProduct` | Firestore `updateDoc` or `addDoc` on `artifacts/${appId}/users/${user.uid}/products` (`name`, `description`, `stock`, `minStock`, `sticksPerPack`, `type`, `packsPerSlop`, `slopsPerBal`, `balsPerCarton`, `priceDistributor`, `priceRetail`, `priceGrosir`, `priceEcer`, `images`, `dimensions`, `useFrontForBack`, `updatedAt`, promo `kind`/`unit`/`goods`/`goodsColor`/`printColor`/`trimColor`/`accentColor`/`printText`/`subText`/`thumb`) + `logAudit` | **Yes** — directly overwrites `stock` and all 4 unit prices + packing multipliers | `src/App.jsx:3693-3792, 5231, 5363` |

### 3. Logic computed inside JSX / render
| computation | what it computes | file:line |
| :--- | :--- | :--- |
| `vaultList` & `filteredInventory` | Filters `inventory` by `searchTerm` and appends matching `promoItems` (`App.jsx:4414-4416`) | `src/App.jsx:4414-4416` |
| `formatAdvancedStock(stock, item)` | Converts `stock` (Bks) into `Bks + Btg` (using `sticksPerPack || 16`), `Slop` (`stock / (packsPerSlop || 10)`), and `Bal` (`stock / (ps * (slopsPerBal || 20))`) | `src/components/ResidentEvilInventory.jsx:9-27, 156, 324` |
| `sections` / `sectionKeys` / `quarantine` / `currentList` | Groups `inventory` (actually `vaultList`) by `item.type || "MISC"`, sorts keys, filters `inQuarantine` items, picks `currentList` | `src/components/ResidentEvilInventory.jsx:236-256` |
| `isLowStock` | `threshold.isLowStock(item, appSettings)` controls red bar, badge, icon, and text | `src/components/ResidentEvilInventory.jsx:285, 288, 295, 335` |
| Promo row `fieldPcs` | Sums `motorists` `promoCanvas` qty for `item.id` in `pcs` | `src/components/ResidentEvilInventory.jsx:301-303` |
| Cigarette row `fieldBks`, `soldBks`, `startBks`, `damagedBks` | Converts `m.activeCanvas` via `convertToBks`, sums today's (`getLocalDayKey()`) `SALE` transactions via `convertToBks`, computes `startBks = item.stock + fieldBks + soldBks`, reads `item.damagedStock || 0` | `src/components/ResidentEvilInventory.jsx:305-332` |
| `goods3d`, `front`, `back` | Decides `PromoGoods3D` vs 6-face flat box; `useFrontForBack` mirrors `front` onto `back`; `promoSkin` fallback | `src/components/ResidentEvilInventory.jsx:84-89` |
| `editingProduct` packing fallback & `counted` summary | Clamps `packsPerSlop` (10), `slopsPerBal` (20), `balsPerCarton` (4) to `> 0`; formats `1 Karton = … Bks · 1 Bal = … Bks` | `src/App.jsx:3729-3733, 3778-3779` |

### 4. What can move out first & `logicFixes.selfcheck.mjs` pins
| candidate to extract | safe to move first? | `logicFixes.selfcheck.mjs` pins that check exact strings / file paths |
| :--- | :--- | :--- |
| Inline `editingProduct` modal (`src/App.jsx:5220-5381`) -> `src/components/ProductEditModal.jsx` | **Not without updating selfcheck** — `selfcheck` slices `src/App.jsx` directly for `<form onSubmit={handleSaveProduct}` | `logicFixes.selfcheck.mjs:12334, 12457-12458, 12493, 10235, 12823` check `form` / `ap` inside `src/App.jsx` for `<textarea name="description"...>`, `<select name="goods"...>`, `<PromoLookFields...>`, `<PromoBundleFields...>` |
| `ResidentEvilInventory.jsx` visual layout / styling (`src/components/ResidentEvilInventory.jsx`) | **Yes, carefully** — keep all pinned JSX strings & marks intact, or update `selfcheck` together | `logicFixes.selfcheck.mjs:9728` (`markAt`), `9903`, `10224-10254` (exact class/prop strings: `touchAction: 'manipulation'`, `View in fullscreen`, `onExpand={onInspect}`, `onInspect={(item) => setExaminingProduct(item)}`, `searchTerm={searchTerm} onSearch={setSearchTerm}`, `phoneOpen ? 'hidden lg:flex'`, `lg:hidden relative z-[110]`, `flex flex-wrap items-center gap-x-3 gap-y-1`, `<details className="lg:hidden mt-4`, palette ban `cyan-/purple-/emerald-/bg-white `), `12460-12465` (`goods3d`, `<PromoGoods3D`, `promoGoods(item) ? item.thumb`), `12521` |
| `handleSaveProduct` (`src/App.jsx:3693-3792`) | **Keep in `App.jsx` (or update selfcheck)** — `selfcheck` slices `app.slice(app.indexOf('const handleSaveProduct'), app.indexOf('const handleUpdateProduct'))` | `logicFixes.selfcheck.mjs:10967, 12333, 12459` |

## Task 21 - the same map for Restock Vault (segment 2 of 12)
**Status:** DONE
**Written:** 2026-11-17 07:20 WIB, by Claude. Same rules as above.

Exactly Task 20's four tables for `src/RestockVaultView.jsx` (MASUK / KIRIM, the surat jalan save, approvals, the master desk). Mark every place the demo guide's marks sit (`data-guide=...`, `data-mission=...`) - they must survive the redesign.
Do NOT change the code. Done when: four tables in the Result.

**Result:**

### Demo Guide Marks in `src/RestockVaultView.jsx` (MUST SURVIVE REDESIGN)
- `data-mission={t.id === 'in' ? '1' : t.id === 'out' ? '2' : undefined}` on the `Masuk` / `Kirim` tab buttons (`src/RestockVaultView.jsx:1501`)
- `data-guide="goods"` on the product picker `<aside>` (`src/RestockVaultView.jsx:1843`)
- `data-guide={guide}` + `data-ok={value ? '' : undefined}` inside `RouteCombo` (`src/RestockVaultView.jsx:88`) for `guide="asal"` (`1945`) and `guide="tujuan"` (`1959`)
- `data-guide="cart"` + `data-n={cart.length || undefined}` + `data-qty={...}` on the cart `<table>` (`src/RestockVaultView.jsx:2010-2011`)
- `data-guide="save"` on the `Simpan surat jalan` / `Kirim sekarang` submit button (`src/RestockVaultView.jsx:2198`)

### 1. Elements on screen (PC & phone, top to bottom)
| element | PC / phone | what it shows | reads (state / prop / Firestore field) | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Top desk nav + tab strip | Both (`flex-wrap`, `w-full lg:w-auto` tabs) | Mode title/subtitle (`Master Vault` / `Kirim ke cabang` / `Permintaan cabang` / `Buku Besar` / `Data Induk`) + 5 tabs (`Masuk`, `Kirim`, `Request`, `Buku`, `Data Induk`) with counts + **`data-mission="1"` / `"2"`** | `viewMode` (defaults `'in'`, `185`), `tabs` (`1185-1193`), `cart.length`, `bookRows`, `requestRows`, `unregisteredFactories`, `warehouseOptions` | `src/RestockVaultView.jsx:1485-1512` |
| `Masuk` / `Kirim` product picker (`<aside data-guide="goods">`) | PC left `262px` / Phone stacked top (`max-h-[40vh]`) | `CARI BARANG...` input + cigarettes list + `Promo items · pcs` divider + promo items with stock & `priceDistributor` | `goods` (`[...inventory, ...promoItems]`, `449`), `searchTerm`, `cart`, `isOut` | `src/RestockVaultView.jsx:1841-1883` |
| `Masuk` / `Kirim` form header & Production Targets strip | Both | `Goods Received` / `Shipment Out` heading; if `!isOut`, `Target produksi bulan ini` cards (`made / targetQty Bks · pct%`) + `+ Set` button | `isOut`, `monthTargets`, `targets`, `procurements` | `src/RestockVaultView.jsx:1896-1935` |
| Route & handlers (`Asal`, `⇄`, `Tujuan`, `Pengirim`, `Penerima`, SJ numbers, `Tanggal`) | Both (`sm:grid-cols-[1fr_44px_1fr]`, `sm:grid-cols-2`, `sm:grid-cols-3`) | `RouteCombo` (`data-guide="asal"`, `data-guide="tujuan"`), swap button, `Pengirim` & `Penerima` combos, `Delivery note (app)`, `Delivery note (factory/paper)`, `Tanggal` | `poData`, `factoryOptions`, `warehouseOptions`, `peopleOptions`, `places`, `motorists`, `stockRequests` | `src/RestockVaultView.jsx:1940-1999` |
| Cart table (`<table data-guide="cart" data-n data-qty>`) | Both (`kpm-stack-rows` stacks on phone) | Empty breathing notice (`kpm-notice`) or rows: `Barang`, `Batch`, `Jumlah` (promo `pcs` input OR `Karton`/`Bal`/`Slop`/`Bks` mix + `= X Bks` + packing rates + Bks input + `sendAdvice` floor in `Kirim`), `@ Landed` + price drift vs `lastLanded`, remove `X` | `cart`, `inventory`, `totalItemsReceived`, `extraCosts`, `lastLanded`, `sendAdvice` | `src/RestockVaultView.jsx:2008-2121` |
| Costs & Evidence & Totals | Both | `Ongkos kirim` (+ `Pita cukai` & `Upah bongkar` when `!isOut`); `Bukti foto barang`, `Nota / faktur` (`scan`), `Resi & kurir`; 4 summary boxes (`Nilai barang`, `Biaya tambahan`/`Ongkos kirim`, `Total dibayar`/`Nilai kiriman`, `Landed / Bks`) | `poData`, `isOut`, `packageFile`, `receiptFile`, `galleryOk`, `totalBasePrice`, `extraCosts`, `trueLandedTotal`, `landedPerUnit`, `totalItemsReceived`, `promoPcs` | `src/RestockVaultView.jsx:2123-2181` |
| Completeness footer (`data-guide="save"`) | Both (collapses to 1 line on phone) | Progress bar + `donePct%` + `Simpan surat jalan` / `Kirim sekarang` button + `→ Belum lengkap: ...` / `→ Lengkap` | `donePct`, `missing`, `isSubmitting`, `cart.length`, `isOut` | `src/RestockVaultView.jsx:2185-2221` |
| `Request` / `Buku` queue & drawer | Both | Status summary pills (`DISPUTED`/`PENDING`/`IN_TRANSIT`) or filter buttons (`Semua`/`Masuk`/`Keluar`); expandable `shownRows` + sibling `Siapkan` button (`PENDING` in `req`); expanded drawer with metadata, line table, totals, photo/nota/resi pills, `Cetak`/`Edit`/`Hapus` (`in`) or `Cetak label`/`Edit resi`/`Hapus` (`out`), `<Proses>` timeline | `viewMode`, `bookFilter`, `shownRows`, `requestRows`, `bookRows`, `expandedPO` | `src/RestockVaultView.jsx:1669-1837` |
| `Data Induk` (`viewMode === 'place'`) | Both | `Daftarkan pabrik` / `Daftarkan orang` (if `mayEditRegistry`), inline place form, `unregisteredFactories` chips, 3 grouped lists (`Pabrik`, `Gudang`, `Orang`) with edit/delete | `mayEditRegistry`, `placeForm`, `unregisteredFactories`, `factoryOptions`, `warehouseOptions`, `peopleOptions`, `places` | `src/RestockVaultView.jsx:1520-1668` |
| Modals & Print views | Both (overlay) | `viewingImage`, `showTargetModal`, `editingOrder`, `ShipmentLabel`, `AcceptanceReceipt`, `editingPO`, `isFulfilling` (branch request fulfillment/reject modal) | Respective modal state vars | `src/RestockVaultView.jsx:1198-1479` |

### 2. Every press & what it writes
| control / press | handler called | writes (Firestore + local state) | moves stock or money? | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Top tab / `⇄` swap | `setViewMode` / `setDirection` / `swapRoute` | Local `viewMode`, updates `poData.supplierName` & `destination` | No | `src/RestockVaultView.jsx:531-541, 1502, 1951` |
| Picker item / Enter in search | `addToCart(item)` | Appends line to local `cart` | No | `src/RestockVaultView.jsx:395-407, 1850, 1868` |
| Mix boxes / qty / batch / remove | `applyMix`, `updateCartItem`, `removeFromCart` | Updates local `cart` | No | `src/RestockVaultView.jsx:431-446, 2032-2113` |
| `Simpan surat jalan` (`data-guide="save"`, `!isOut`) | `handleProcessRestock` | Uploads scanned nota + package photo to Storage; batch: `products/${id}.stock += increment(qty)` + `addDoc` `procurement` (`items`, `totalBasePrice`, `trueLandedTotal`, addresses, `incomplete`); dispatches `kpm-mission` step 1; `logAudit("RESTOCK_VAULT")` | **Yes — adds HQ stock + records procurement cost** | `src/RestockVaultView.jsx:604-677, 2198-2199` |
| `Kirim sekarang` (`data-guide="save"`, `isOut`) | `handleHQPush` | Checks HQ stock, confirms, uploads photo; batch: `products/${id}.stock += increment(-qty)` + `setDoc` `stock_requests/${orderId}` (`IN_TRANSIT`, `initiatedByHQ: true`); dispatches `kpm-mission` step 2; `logAudit("STOCK_HQ_PUSH")` | **Yes — deducts HQ stock** (branch credits on count) | `src/RestockVaultView.jsx:683-763, 2198-2199` |
| `Siapkan` -> `Konfirmasi & kirim barang` | `handleStartFulfillment` -> `handleShipItems` | Validates sender/courier/resi/photo & HQ stock, uploads photo; batch: `products/${id}.stock += increment(-qty)` + `updateDoc` `stock_requests/${id}` (`IN_TRANSIT`, `fulfilledItems`, timeline); `logAudit("STOCK_SHIP")` | **Yes — deducts HQ stock** | `src/RestockVaultView.jsx:907-915, 961-1020, 1469, 1734` |
| `Tolak` in fulfillment modal | `handleRejectRequest` | `updateDoc` `stock_requests/${id}` (`status: 'REJECTED'`, timeline) + `logAudit("STOCK_REJECT")` | No | `src/RestockVaultView.jsx:940-959, 1473` |
| Buku `Hapus` (`in`) | `handleDeletePO(po)` | Confirms, batch: `products/${id}.stock += increment(-qty)` + `deleteDoc` `procurement/${po.id}` + `logAudit("RESTOCK_DELETE")` | **Yes — reverts HQ stock & deletes cost record** | `src/RestockVaultView.jsx:803-825, 1815` |
| Buku `Edit` -> `Save All Changes` (`in`) | `handleSaveEditPO` | Uploads replacement receipt if set; batch: `products/${id}.stock += increment(diff)` + `updateDoc` `procurement/${id}` (`totalBasePrice`, `trueLandedTotal`, etc.) | **Yes — adjusts HQ stock by diff & updates landed total** | `src/RestockVaultView.jsx:836-903, 1357, 1814` |
| Buku `Hapus` (`out`) | `handleDeleteRequest(id)` | Confirms, `deleteDoc` `stock_requests/${id}` + `logAudit("STOCK_DELETE_LOG")` (does NOT revert stock) | No | `src/RestockVaultView.jsx:827-834, 1824` |
| Buku `Edit resi` -> `Simpan Perubahan` (`out`) | `handleStartEditingOrder` -> `handleSaveOrderEdit` | `updateDoc` `stock_requests/${id}` (`senderName`, `courier`, `trackingNo`, timeline) + `logAudit("STOCK_EDIT_LOG")` | No | `src/RestockVaultView.jsx:1022-1059, 1262, 1823` |
| Target `+ Set` / `Save Target` / `X` | `handleSaveTarget` / `handleDeleteTarget` | `setDoc` / `deleteDoc` `production_targets/${month}_${productId}` | No | `src/RestockVaultView.jsx:765-801, 1230, 1913, 1925` |
| `Data Induk` `Simpan` / `Trash2` | `savePlace` / `removePlace` | `setDoc` / `deleteDoc` `places/${slug}` (`canManageRegistry(userRole)` gated) + `logAudit` | No | `src/RestockVaultView.jsx:555-601, 1597, 1658` |

### 3. Logic computed inside JSX / render
| computation | what it computes | file:line |
| :--- | :--- | :--- |
| `bksPerUnit` & `applyMix` | Uses `convertToBks` from `inventory.find(pr => pr.id === item.id)` (`Karton`, `Bal`, `Slop`, `Bks`) to compute `totalBks` into `qtyReceived` while keeping `mix` display-only; renders `1 KARTON = … · 1 BAL = … · 1 SLOP = … BKS` | `src/RestockVaultView.jsx:424-443, 2078-2085` |
| `goods`, `totalBasePrice`, `totalItemsReceived`, `promoPcs` | Merges `inventory` + `promoItems` for picker; sums `qtyReceived * basePrice`; `bksOf(cart)` excludes promo; `pcsOf(cart)` counts promo pcs only | `src/RestockVaultView.jsx:449-454` |
| `extraCosts`, `trueLandedTotal`, `landedPerUnit` | `shippingCost + (isOut ? 0 : laborCost + exciseTax)`; `totalBasePrice + extraCosts`; `trueLandedTotal / totalItemsReceived` | `src/RestockVaultView.jsx:496-498` |
| `sendAdvice` & `short` flag | When `isOut` & valid branch, computes `reorderAdvice(...)` per non-promo line from `branchStockMap[to]`, `stockRequests`, `bufferDays`; highlights red when `typed < adv.suggest` | `src/RestockVaultView.jsx:477-494, 2089-2101` |
| `lastLanded` & `drift` | Scans `procurements` newest-first for latest unit landed cost per cigarette; computes `%` drift on cart rows | `src/RestockVaultView.jsx:380-393, 2025-2027, 2106-2110` |
| `checklist`, `donePct`, `missing` | 8-item completeness percentage & `missing` label list (never blocks save) | `src/RestockVaultView.jsx:502-513` |
| `bookRows`, `requestRows`, `shownRows` | Merges `procurements` + `stockRequests`, computes `bksOf`/`pcsOf`/outbound `value` via `inventory.priceDistributor`, computes `stale` (`IN_TRANSIT && !arrivedAt && days >= 3`), sorts `requestRows` by `REQ_RANK` (`DISPUTED` first) | `src/RestockVaultView.jsx:1063-1123` |
| `factoryOptions`, `warehouseOptions`, `peopleOptions`, `unregisteredFactories` | Derives factories (`places.kind==='pabrik'`), warehouses (`HQ_NAME` + `branchesSeen`), authorized people (`canHandleDelivery` staff + `kind==='orang'`), and unregistered factories from `procurements` | `src/RestockVaultView.jsx:299-376` |

### 4. What can move out first & `logicFixes.selfcheck.mjs` pins
| candidate to extract | safe to move first? | `logicFixes.selfcheck.mjs` pins that check exact strings / file paths |
| :--- | :--- | :--- |
| Sub-views inside `RestockVaultView.jsx` (`Data Induk` tab, `Buku`/`Request` drawer, `isFulfilling` modal, `editingPO` modal) -> `src/components/restock/...` | **Only after updating selfcheck** — `selfcheck` reads `src/RestockVaultView.jsx` directly for exact strings across nav, footer, `REQ_RANK`, `AcceptanceReceipt`, `poDate`, `promoItems`, `handleStartFulfillment` | `logicFixes.selfcheck.mjs:2772-2773` (`REQ_RANK = { DISPUTED: 0`, `sort`), `2890` (`poDate: getLocalDayKey()`), `3900` (`const HQ_NAME = MASTER;`), `3958` (`<AcceptanceReceipt`), `6965-6982` (`ONE nav...`, `{tabs.map(t => (`, `flex-wrap`, `w-full lg:w-auto`, `flex-auto lg:flex-none`), `7018-7035` (`→ Belum lengkap:`, `→ Lengkap. Siap disimpan.`, `truncate sm:whitespace-normal`, `static lg:absolute`, no `di kiri`), `11473` (`onClick={() => handleStartFulfillment(po)}` + `<Truck size={13}/>`), `12370` (`promoItems` exact file list) |
| Pure math/list derivations (`bookRows`, `lastLanded`, `bksPerUnit`, `checklist`) -> `src/utils/restockHelpers.js` | **Careful** — `poDate: getLocalDayKey()` and `REQ_RANK` are checked in `src/RestockVaultView.jsx` | Same `2772-2773`, `2890` pins in `logicFixes.selfcheck.mjs` |
| Wrapper div in `src/App.jsx:5398-5426` | **Keep `border-2 lg:border-4` and `p-2 lg:p-4` and `branchStockMap={branchStock}`** | `logicFixes.selfcheck.mjs:1124` (`RestockVaultView...branchStockMap={branchStock}`), `7006-7016` (`border-2 lg:border-4`, `p-2 lg:p-4` matching `tools/ponder-lab.jsx`) |

## Task 22 - the same map for Stock Opname (segment 3 of 12)
**Status:** DONE
**Written:** 2026-11-17 07:42 WIB, by Claude. Same rules as above.

Exactly Task 20's four tables for `src/StockOpnameView.jsx` (monitor view, New Count, the count form, submit, quarantine settle, every warehouse it can open). Mark every demo guide mark (`data-guide=...`, `data-mission=...`, `data-half`) - they must survive the redesign. In table 4, list every `logicFixes.selfcheck.mjs` line that pins an exact class or string in this file.
Do NOT change the code. Done when: four tables in the Result.

**Result:**

### Demo Guide Marks in `src/StockOpnameView.jsx` (MUST SURVIVE REDESIGN)
- `data-mission="8"` on the `New Count` tab button (`src/StockOpnameView.jsx:1257`)
- `data-guide="count"` on the count worksheet container (`src/StockOpnameView.jsx:1709`)
- `data-guide="week-count"` on the weekly count status banner (`src/StockOpnameView.jsx:1711`)
- `data-half={counts[item.id] !== undefined && countBoxEmpty(counts[item.id]) ? '' : undefined}` on each product count row (`src/StockOpnameView.jsx:1769`)
- `data-guide="good"` on each row's `Good stock` input (`src/StockOpnameView.jsx:1780`)
- `data-guide="submit-count"` and `data-half={halfRows ? '' : undefined}` on the `Submit to HQ` button (`src/StockOpnameView.jsx:2011`)

### Warehouses & Default View
- `viewMode` defaults to `isHighCommand ? 'monitor' : canDecide ? 'review' : 'count'` (`src/StockOpnameView.jsx:285`).
- **Count tab:** `isAreaAdmin = !isHighCommand && (!user?.location || !isMasterVaultPlace(user.location))` (`265`). When `isAreaAdmin === false` (T1/T2/T3/HQ), `countPlace` is `HQ_LABEL` (**Master Vault**, `280`) and `activeInventory` is `[...safeInventory, ...promoItems]` (`306`). When `isAreaAdmin === true`, `countPlace` is `user?.location` (`280`) and `activeInventory` is `branchInventory` (`295-306`).
- **Monitor tab:** `monitorFacility` defaults to `'MASTER'` (`289`); `<select>` switches between `MASTER` (`HQ_LABEL`) and `uniqueBranches` (`1272-1275`).
- **Review tab:** `boardPlaces` lists `vaultFacilities` (`MASTER` + `uniqueBranches`) + extra audit places when `boardScope === 'all'` (`375-380`), or own warehouse (`MASTER` or `user.location`) when `boardScope === 'own'`.
- **Quarantine tab:** `openFac` opens the first warehouse crate in `vaultFacilities` that has `damagedStock > 0` (`339-340`).

### 1. Elements on screen (PC & phone, top to bottom)
| element | PC / phone | what it shows | reads (state / prop / Firestore field) | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Header & tab strip (`canSeeBoard`) | Both (`kpm-opname-tabs` 2-col grid on phone, flex row on `md+`; header title hidden when `viewMode === 'review'`) | Mode title/subtitle + up to 4 tabs: `Monitor` (`isHighCommand`), `HQ Audits`/`Review` + `NixieCount(pendingAudits.length)`, `Quarantine` (`canSell`), `New Count` (`canCount`, **`data-mission="8"`**) | `viewMode`, `isHighCommand`, `canSeeBoard`, `canSell`, `canCount`, `boardScope`, `pendingAudits`, `countPlace`, `countClosed`, `showExpectedWhileCounting` | `src/StockOpnameView.jsx:1229-1262` |
| `Monitor` view (`viewMode === 'monitor' && isHighCommand`) | Both (1/2/3-col grid) | Facility `<select>` (`MASTER` / `uniqueBranches`) + product telemetry cards (thumb, name, ID, `Vault / Initial` + low/healthy badge, `Field`/`Sold`/`Damaged` boxes, 4-segment bar) | `monitorFacility`, `uniqueBranches`, `monitorStats`, `appSettings`, `userRole` | `src/StockOpnameView.jsx:1267-1365` |
| `Quarantine` view (`viewMode === 'quarantine' && canSell`) | Both | `Active Quarantine` / `Liquidation History` sub-tabs (`isHighCommand` only), `Sunk Capital` total, `<CrateVault>` crates (`MASTER` + branches) with actions (`Convert to Sample`, `Sell Again`, `RTV Factory`, `Penalty Charge`, `Repair`), or filtered `quarantine_logs` list | `quarSubTab`, `regionFilter`, `vaultFacilities`, `quarantineInventory`, `openFac`, `shownQuarantine`, `displayedQuarantineLogs`, `isHighCommand` | `src/StockOpnameView.jsx:1370-1486` |
| `Review` worklist (`viewMode === 'review' && auditSubTab !== 'history'`) | Both | `<OpnameWorklist>` per-warehouse board, accept/reject per product, leak streak badge, photo preview, history button | `boards`, `openPlace`, `weekLabel`, `canDecide`, `auditsDenied`, `auditHistory`, `countDay` | `src/StockOpnameView.jsx:1491-1496` |
| `Review` history (`viewMode === 'review' && auditSubTab === 'history'`) | Both | `Back to the review` button, region `<select>` (`boardScope === 'all'`), expandable `displayedAudits` cards (`Good`/`Damaged` `AuditFigures`, leak streak, `varianceReason`, `countedTwice`/`threeWayDisagreement`, `damageKinds`, `View Damage Proof`, `Put back` button) | `auditSubTab`, `regionFilter`, `displayedAudits`, `expandedAudit`, `auditHistory`, `isHighCommand` | `src/StockOpnameView.jsx:1497-1703` |
| `Count` worksheet (`viewMode === 'count'`, **`data-guide="count"`**) | Both | Weekly banner (**`data-guide="week-count"`** for non-high-command non-demo), search input, product rows (**`data-half`**) with **`data-guide="good"`** + `Damaged` inputs, expandable verdict block (`Expected good/damaged`, `Good/Damaged match/difference`, `Upload Damaged Proof`, `Clear and count again` recount prompt, `VARIANCE_REASONS` reel, `DAMAGE_REASONS` reel + qty inputs), footer (`Reset` + **`data-guide="submit-count" data-half`** `Submit to HQ`) | `counts`, `checkedRows`, `filteredItems`, `countClosed`, `showExpectedWhileCounting`, `recountState`, `stillUncounted`, `halfRows`, `weekDone`, `notCountDay`, `recounting`, `isSubmitting` | `src/StockOpnameView.jsx:1708-2015` |
| `resolutionModal` & `viewingImage` | Both (overlay) | Quarantine resolution form (`SAMPLING`, `SELL`, `RTV`, `PENALTY`, `REPAIR`) + fullscreen image modal | `resolutionModal`, `viewingImage`, `safeMotorists`, `uniqueBranches`, `isProcessingAudit` | `src/StockOpnameView.jsx:1195-1227` |

### 2. Every press & what it writes
| control / press | handler called | writes (Firestore + local state) | moves stock or money? | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Top tabs (`Monitor`/`HQ Audits`/`Quarantine`/`New Count`) | `setViewMode(...)` | Local `viewMode` | No | `src/StockOpnameView.jsx:1248-1259` |
| Monitor `Vault` number click (`DEVELOPER` / `COMPANY_OWNER`) | `handleGodModeEdit` | Prompts, then `updateDoc` `products/${id}` (`MASTER`) or `branches/${facility}/inventory/${id}` (`{ stock: newStock }`) | **Yes — directly overwrites warehouse `stock`** | `src/StockOpnameView.jsx:1072-1091, 1314` |
| Count `Good stock` / `Damaged` inputs | `handleCountChange` | Local `counts` + `localStorage` draft (`saveOpnameDraft`) | No | `src/StockOpnameView.jsx:464-499, 534, 1780-1784` |
| `Upload Damaged Proof` / `X` clear photo | `handlePhotoUpload` / `handleClearPhoto` | Uploads/deletes Storage photo; updates local `counts[id].photo` | No | `src/StockOpnameView.jsx:599-618, 1843-1845` |
| `Clear and count again` | `startRecount(id)` | Banks pass into `counts[id].passes`, clears `good`/`damaged`/`checkedRows[id]` | No | `src/StockOpnameView.jsx:563-572, 1861` |
| Variance cause reel / Damage kind reel & qty | `stepVarianceReason`, `toggleDamagePanel`, `stepDamageKind`, `setDamageKindQty` | Local `counts[id].varianceReason`, `counts[id].kinds`, `varPos`, `dmgPos`, `dmgOpen` | No | `src/StockOpnameView.jsx:501-517, 557, 576-596, 1892-1979` |
| `Submit to HQ` (`data-guide="submit-count"`) | `handleCommit` | Validates counts/boxes/damage/recount/cause; batch: `set` `pending_audits/${auditId}` (`PENDING_HQ_APPROVAL`) + `update` `motorists/${agentId}.lastOpname` (non-high-command); `addDoc` `notifications` (`ADMIN`); dispatches `kpm-mission` step 8; `logAudit` | No (pending HQ decision) | `src/StockOpnameView.jsx:640-775, 2011` |
| `OpnameWorklist` Accept / Reject per product (+ Undo) | `decideProducts(place, rows, status, reason)` | Checks fresh `pending_audits`, batch: updates `products/${id}` or `branches/${loc}/inventory/${id}` (`stock: increment(good)`, `damagedStock: increment(damaged)` or `overwrite`), updates `pending_audits/${id}.decisions.${pid}` (+ `status`/`resolvedAt`/`resolvedBy`/`noPutBack`), on reject updates `motorists/${agentId}.lastOpname.reopened` + `notifications`; returns undo callback | **Yes — adjusts `stock` and `damagedStock` on accept (and reverses on undo)** | `src/StockOpnameView.jsx:804-857, 1493` |
| History `Put back what this count took from Quarantine` | `handlePutBack(audit)` | Batch: `damagedStock: increment(back)`, `stock: increment(-goodOut)` on `products` or `branches/${loc}/inventory` + `pending_audits/${id}.putBack=true` + `logAudit` | **Yes — moves stock between `stock` and `damagedStock`** | `src/StockOpnameView.jsx:785-798, 1690` |
| Quarantine `Execute Protocol` / `Put on sale` | `executeResolution` | Batch: decrements `damagedStock` on `products` or `branches/${fac}/inventory`; `REPAIR`: `stock: increment(qty)`; `SAMPLING`: creates/updates `dmg-${id}` promo item (`products` + `branches/${toWh}/inventory`); `SELL`: creates/updates `rsk-${id}` lot (`products` + `branches/${fromFac}/inventory`); `PENALTY`: sets `motorists/${agentId}.cukaiDebts` + `cukaiDebtNotes` + `notifications`; writes `quarantine_logs` + `logAudit` | **Yes — moves `damagedStock` -> `stock`/promo/`rsk-` lot, or charges agent money (`cukaiDebts`)** | `src/StockOpnameView.jsx:859-1000, 1221` |

### 3. Logic computed inside JSX / render
| computation | what it computes | file:line |
| :--- | :--- | :--- |
| `monitorStats` | Computes per-product `vault`, `damaged`, `field` (converts `activeCanvas` via `packsPerSlop`/`slopsPerBal`/`balsPerCarton`), `sold` (today's transactions for `targetAgents`), and `initial = vault + damaged + field + sold` | `src/StockOpnameView.jsx:1003-1070` |
| `boards` & `openPlace` | Calls `opnameBoard(allAudits, p.key, { from: boardFrom, shelf, priceOf })` using `priceDistributor \|\| hpp \|\| costPrice` | `src/StockOpnameView.jsx:381-402` |
| `Sunk Capital` & crate `line` | Sums `(item.damagedStock || 0) * Number(item.priceDistributor || item.hpp || 0)` across `shownQuarantine` | `src/StockOpnameView.jsx:1402, 1413` |
| `getVariance`, `expectedOf`, `recount`, `tone`, `isRevealed` | Freezes `expStock`/`expDamaged` on first keystroke; computes `goodDiff`/`damagedDiff`, `withinTolerance`, `recountState`, `locked`, `tone` (`idle`/`wait`/`bad`) | `src/StockOpnameView.jsx:622-634, 1731-1759` |
| `stillUncounted` & `halfRows` | `opnameMissing(activeInventory, counts)` for non-high-command non-demo; `halfRows` checks `countBoxEmpty(counts[id])` for `[data-half]` | `src/StockOpnameView.jsx:636-639` |
| `dmgTotal`, `sorted`, `blocked` | `damageSorted(entry)` and `damageBlocked(entry)` inside the `damagedDiff >= 1` panel | `src/StockOpnameView.jsx:1919-1943` |

### 4. What can move out first & `logicFixes.selfcheck.mjs` pins
| candidate to extract | safe to move first? | `logicFixes.selfcheck.mjs` exact line pins |
| :--- | :--- | :--- |
| Visual layout/cards in `Monitor`, `Quarantine`, `History`, `Count` | **Only alongside `selfcheck` updates** — many checks read `src/StockOpnameView.jsx` by exact class/string | `639`, `676`, `1356`, `1545`, `1594` (`cukaiDebtNotes: { [penaltyId]: {`), `1661-1663` (`tierPrice(resolutionModal.item, appSettings?.penaltyPriceTier)`), `2144`, `2209`, `2561`, `2580`, `2620`, `3921` (`<option value="MASTER"[^>]*>{HQ_LABEL}</option>`), `4330` (`` `PENALTY_${Date.now()}` ``), `6905` (`userRole: liveRole`), `7649`, `7713`, `8487-8497` (`Expected good</div>`, `text-sm font-black font-mono tabular-nums`, `kpm-verdict-down`, `kpm-verdict-up`, `<div key={diff}>`), `9692`, `12218` (`[data-guide="good"]` / `GUIDE[8]`), `12228`, `12380` (`promoItems` file list), `12555`, `12578` (`setBoardShelf(snap.docs.map(...))`), `13049`, `13488`, `13509`, `13546`, `13621`, `13691`, `13742`, `13780-13794` (`const lotId = \`rsk-${sellSrc.id}\``, Sell Again refusals & button order/border), `13801-13815` (`canSell`, `isHighCommand` Quarantine tabs/actions, `Only Tier 3 and up can set this price.`), `13839` (`<NixieCount value={pendingAudits.length} size={13} rollIn />`) |
| `handleCommit` / `decideProducts` / `executeResolution` | **Keep logic & error strings intact** | Pinned by `1594`, `1663`, `4330`, `13780-13791`, `13810-13815` |

## Task 23 - the same map for Receivables & Consignment (segment 4 of 12)
**Status:** DONE
**Written:** 2026-11-17 07:42 WIB, by Claude. Same rules as above.

Exactly Task 20's four tables for `src/ConsignmentFinanceView.jsx` and the inline `activeTab === 'receivables'` block in `src/App.jsx` (~L5525). Every press that moves money gets **Yes** in the "moves stock or money?" column with the exact field it writes. Mark demo guide marks. In table 4, list the selfcheck pins on this file.
Do NOT change the code. Done when: four tables in the Result.

**Result:**

### Demo Guide Marks
- **None** in `src/ConsignmentFinanceView.jsx` or `src/App.jsx:5525-5548` (`rg -n "data-mission=|data-guide="` returned zero matches).

### 1. Elements on screen (PC & phone, top to bottom)
| element | PC / phone | what it shows | reads (state / prop / Firestore field) | file:line |
| :--- | :--- | :--- | :--- | :--- |
| `App.jsx` tab mount | Both | Renders `<ConsignmentFinanceView>` directly when `activeTab === 'receivables'` (no outer wrapper) | `transactions`, `customers`, `focusStore`, `inventory`, `isAdmin`, `user`, `agentProfileId`, `motorists`, `transferRequests`, `appSettings` | `src/App.jsx:5525-5548` |
| Header, filters & tab bar | Both | Title (`Global Receivables` if `isAdmin`, else `My Receivables`); when `isAdmin`: region `<select>` (`ALL`, `HQ`, `uniqueLocations`) + agent autocomplete search; 3 tabs (`A/R Financials` default, `Physical Stock`, `Hand-offs` with red dot when `incomingRequests.length > 0 \|\| pendingAdminRequests.length > 0`) | `isAdmin`, `activeRegion`, `agentSearch`, `showAgentDropdown`, `dropdownAgents`, `activeTab`, `incomingRequests`, `pendingAdminRequests` | `src/ConsignmentFinanceView.jsx:51, 930-1042` |
| `A/R Financials` tab (`activeTab === 'financials'`) | Both | 2 KPI cards (`Total Assigned Debt`, `Active Accounts`) + 3 `<StatusCard>` columns (`Safe (Due in 4+ Days)`, `Warning (Due Soon)`, `OVERDUE (Jatuh Tempo)`) | `debtData` (`totalValue`, `activeAccounts`, `GREEN`, `YELLOW`, `RED`) | `src/ConsignmentFinanceView.jsx:602-632, 1045-1063` |
| `Physical Stock` tab (`activeTab === 'stock'`) | PC 1/3 + 2/3 split / Phone switches list -> detail via `selectedCustomer` | Left: `Active Consignments` cards (`name`, `Managed by`, `handoffChain`, `Bks Held`, `balance`). Right: store header, product rows (`Dititip` qty, or in `auditMode`: `Sisa Rak` + `Retur / BS` inputs + `Laku (Rp)`), or `transferMode` panel (`targetAgent` grouped by branch, `Show other branches` checkbox if `canCrossBranches`, note), footer (`Add Goods` if `isAdmin`, `Store Audit`, `Hand-off`, or `Cancel` / `Confirm`) | `customerData`, `selectedCustomer`, `activeCustomer`, `auditMode`, `auditData`, `transferMode`, `handoffTargets`, `canCrossBranches`, `showAllBranches`, `isAdmin` | `src/ConsignmentFinanceView.jsx:1066-1277` |
| `Hand-offs` tab (`activeTab === 'transfers'`) | Both (2-col on `md+`) | Left: `pendingAdminRequests` (`Reject` / `Authorize Transfer`) + `incomingRequests` (`HandoffOffer`, `See it on the journey map`, `Decline` / `Accept Responsibility` or waiting badge). Right: `My Outgoing Requests` (`outgoingRequests`) | `pendingAdminRequests`, `incomingRequests`, `outgoingRequests`, `onShowStoreOnJourney` | `src/ConsignmentFinanceView.jsx:1280-1368` |
| Receipt modal (`viewingReceipt`) | Both (overlay) | Thermal (58mm) or A4 `STORE AUDIT REPORT` / `STORE AUDIT RECEIPT` with `handoffLine`, `Print` (iframe), `Share` (WhatsApp), `CLOSE RECEIPT` | `viewingReceipt`, `printFormat`, `handoffLine`, `appSettings`, `customers` | `src/ConsignmentFinanceView.jsx:638-928` |

### 2. Every press & what it writes
| control / press | handler called | writes (Firestore + local state) | moves stock or money? | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Region `<select>`, Agent search, Tabs (`financials`/`stock`/`transfers`), Store card click, `Store Audit`, `Hand-off`, `Cancel`, `Show other branches`, `Print`, `Share`, `CLOSE RECEIPT` | Local state setters / `shareReceipt` / `window.print` | Local UI state only (`activeRegion`, `agentSearch`, `activeTab`, `selectedCustomer`, `auditMode`, `transferMode`, `showAllBranches`, `viewingReceipt`, `printFormat`) | No | `src/ConsignmentFinanceView.jsx:950-1018, 1074, 1154, 1259-1268, 829-924` |
| `Add Goods` (`isAdmin`) | `onAddGoods` -> `handleAddGoodsToCustomer` | Sets `activeTab('sales')` + toast (`notify`) | No | `src/ConsignmentFinanceView.jsx:1250`, `src/App.jsx:3903` |
| `See it on the journey map` | `onShowStoreOnJourney(r.storeName)` -> `showStoreOnJourney` | Navigates to Journey map focused on store | No | `src/ConsignmentFinanceView.jsx:1337`, `src/App.jsx:5541` |
| `Confirm Audit & Update Ledgers` (`auditMode`) | `submitAction` -> `onPayment` -> `handleConsignmentPayment` | Confirms, then **online**: `runTransaction` adds `transactions` doc (`type: 'CONSIGNMENT_PAYMENT'`, `amountPaid`, `returnTotal`, `itemsPaid`, `itemsReturned`, `itemsRemaining`), increments `products/${id}.stock` (when no `currentAgentProfileId`) or updates `motorists/${id}.activeCanvas` with returned items, updates monthly revenue rollup; **offline**: writes Ghost Ledger (`saveOfflineTransaction`) | **Yes** — records collected cash (`transactions.amountPaid`, `transactions.returnTotal`) and returns unsold/damaged packs (`products.stock` or `motorists.activeCanvas`) | `src/ConsignmentFinanceView.jsx:554-599, 1269`, `src/hooks/useTransactionEngine.js:513-645` |
| `Confirm Hand-off Request` (`transferMode`) | `submitAction` -> `onRequestTransfer` -> `handleRequestTransfer` | Validates `handoffEligibility`, `addDoc` `account_transfers` (`status: 'PENDING_AGENT'`, `storeName`, `customerId`, `fromAgentId`, `toAgentId`, `stockSnapshot`) + `addDoc` `notifications` (`toAgentId`, `linkToStore`) | No (offer only; debt/stock stays with current holder until authorized) | `src/ConsignmentFinanceView.jsx:510-552, 1269`, `src/App.jsx:1965-2046` |
| `Accept Responsibility` / `Decline` | `onAgentAcceptTransfer(r.id, bool)` -> `handleAgentAcceptTransfer` | `updateDoc` `account_transfers/${id}` (`status: 'PENDING_ADMIN'` or `'REJECTED'`, `respondedAt`) + `notifications` to requester, `ADMIN`, and `handoffApprovers` | No (still awaiting admin/branch authorization) | `src/ConsignmentFinanceView.jsx:1344-1345`, `src/App.jsx:2048-2131` |
| `Authorize Transfer` / `Reject` | `onAdminApproveTransfer(r, bool)` -> `handleAdminApproveTransfer` | Checks `canApproveHandoffFrom` + fresh `account_transfers/${id}`, updates `account_transfers/${id}` (`APPROVED`/`REJECTED`), on approve stamps `customers/${id}.ownerAgentId` + `handoffs` array (transfers consignment debt & shelf ownership to `toAgentId`) + `notifications` | **Yes** — reassigns store consignment debt & stock ownership (`customers.ownerAgentId`, `customers.handoffs`) to `toAgentId` | `src/ConsignmentFinanceView.jsx:1317-1318`, `src/App.jsx:2133-2200` |

### 3. Logic computed inside JSX / render
| computation | what it computes | file:line |
| :--- | :--- | :--- |
| `myTransactions` | Filters `transactions` by `isAdmin` / `agentProfileId` / `isInherited(store)` + `activeRegion` + `agentSearch` | `src/ConsignmentFinanceView.jsx:100-151` |
| `debtData` (FIFO debt engine) | Sorts `myTransactions` by `txSeconds`, builds per-customer FIFO `Titip` debts, subtracts `debtCredit(t)` on `CONSIGNMENT_PAYMENT` / `RETURN`, buckets into `GREEN` / `YELLOW` (`<= 3d`) / `RED` (`< 0d`), sums `totalValue`, `totalOverdue`, `activeAccounts` | `src/ConsignmentFinanceView.jsx:163-239` |
| `customerData` | Aggregates `Titip` items (`convertToBks`), deducts `itemsPaid` + `itemsReturned`, clamps `balance` & `qty >= 0`, resolves `ownerName` via `handedOwnerByStore` -> `rosterNameById` | `src/ConsignmentFinanceView.jsx:260-357` |
| `handoffTargets` | Filters `motorists` via `handoffEligibility`, groups by `normalizeRegion(m.location)`, hides other branches unless `showAllBranches` | `src/ConsignmentFinanceView.jsx:409-438` |
| `incomingRequests`, `outgoingRequests`, `pendingAdminRequests` | Splits `transferRequests` by `agentProfileId`, `isAdmin`, and `canApproveHandoffFrom` | `src/ConsignmentFinanceView.jsx:451-487` |
| Audit row live math (`soldQty`, `soldValue`, `Bks Held`) | Computes `soldQty = Math.max(0, item.qty - shelf - damaged)`, `soldValue = soldQty * calculatedPrice`, and total `Bks Held` per card | `src/ConsignmentFinanceView.jsx:1095, 1191-1197` |

### 4. What can move out first & `logicFixes.selfcheck.mjs` pins
| candidate to extract | safe to move first? | `logicFixes.selfcheck.mjs` exact line pins |
| :--- | :--- | :--- |
| `StatusCard`, `HandoffOffer`, `viewingReceipt` print/share modal -> `src/components/consignment/...` | **Only alongside `selfcheck` updates** — `selfcheck` reads `src/ConsignmentFinanceView.jsx` directly | `267`, `1356`, `4368`, `4499`, `4602`, `4692`, `4793`, `5287` (`paymentItems.push({ productId: item.productId, name: item.name, qty: sold, priceTier: item.priceTier, calculatedPrice: item.calculatedPrice, unit: 'Bks' })`), `5550`, `5768-5769`, `5853-5854`, `5945`, `6128`, `6227`, `6266`, `6309` (`isAdmin ? 'Global Receivables' : 'My Receivables'`), `8333`, `11533`, `13278-13279` (`const sorted = [...myTransactions].sort((a, b) => (txSeconds(a) ?? Number.MAX_SAFE_INTEGER) - (txSeconds(b) ?? Number.MAX_SAFE_INTEGER));`) |
| `debtData` / `customerData` pure FIFO & consignment aggregations -> `src/utils/consignmentMath.js` | **Careful** — `13279` checks exact `sorted` line in `src/ConsignmentFinanceView.jsx` | `13278-13279` |
| `App.jsx` handlers (`handleRequestTransfer`, `handleAgentAcceptTransfer`, `handleAdminApproveTransfer`, `handleDeleteConsignmentData`) | **Keep in `App.jsx` (or update selfcheck)** | `4370-4401`, `4615-4618`, `4813-4831`, `5428-5432`, `5876`, `6384-6387` |

## Task 24 - the same map for Reports (segment 5 of 12)
**Status:** DONE
**Written:** 2026-11-17 08:26 WIB, by Claude. Same rules as above.

Exactly Task 20's four tables for `src/components/HistoryReportView.jsx` (the `activeTab === 'transactions'` screen, App.jsx ~L5668-5678): every folder, filter, export, delete. Every press that deletes or changes a transaction gets **Yes** in the "moves stock or money?" column with the exact path it writes. Mark demo guide marks. In table 4, list the selfcheck pins on this file. Also list every amber/gold FILLED button in it (`bg-gold`, `bg-[var(--gold)]`, `bg-orange-*`, `bg-amber-*`, `from-amber-*`) with file:line - they must all become `.kpm-edge-btn` (theme.css).
Do NOT change the code. Done when: four tables + the filled-button list in the Result.

**Result:**

### Demo Guide Marks in `src/components/HistoryReportView.jsx` (MUST SURVIVE REDESIGN)
- `data-guide="offer-performance"` on the Offer Performance section (`src/components/HistoryReportView.jsx:534`)
- `data-guide="package-returns"` on the 7-day Package Returns & Cleared Counts section (`src/components/HistoryReportView.jsx:556`)

### Filled Amber/Gold Buttons to Convert to `.kpm-edge-btn`
- `src/components/HistoryReportView.jsx:433` — `Pull Archive` button (`bg-[var(--gold)] hover:bg-[var(--gold)] text-[var(--gold-ink)]`)
- `src/components/HistoryReportView.jsx:471` — `Context Analytics` button (`bg-[var(--gold)] hover:bg-[var(--gold)] ... text-[var(--gold-ink)]`)
- `src/components/HistoryReportView.jsx:976` — `+ ADD ITEM` button inside `DATA AUDIT` modal (`bg-[var(--gold)] text-[var(--gold-ink)]`)
- `src/components/HistoryReportView.jsx:1010` — `Save Changes` button inside `DATA AUDIT` modal (`bg-[var(--gold)] hover:bg-[var(--gold)] text-[var(--gold-ink)]`)
*(Note: lines `712`, `756`, `819` also have `group-hover:bg-[var(--gold)]` on folder card icon tiles, and line `974` has `dark:bg-[var(--gold)]` on the `Itemized Receipt` header bar.)*

### 1. Elements on screen (PC & phone, top to bottom)
| element | PC / phone | what it shows | reads (state / prop / Firestore field) | file:line |
| :--- | :--- | :--- | :--- | :--- |
| `App.jsx` tab mount (`activeTab === 'transactions'`) | Both | `<ProductPerformancePanel>` (only when `canReadSalesTotals(userRole)` = T1/T2) above `<HistoryReportView>` | `userRole`, `transactions`, `inventory`, `isAdmin`, `motorists`, `displayCustomers`, `appSettings` | `src/App.jsx:5677-5687` |
| `Operational Command` bar (`!reportView`) | Both | `rangeType` `<select>` (`daily`/`weekly`/`monthly`/`yearly`), `targetDate` `<input type="date">`, `Pull Archive` button (`!isFieldAgent`) | `rangeType`, `targetDate`, `isFieldAgent`, `isFetchingHistory` | `src/components/HistoryReportView.jsx:411-440` |
| Breadcrumb bar (`!reportView`) | Both | `Master HQ` (`reportAccessLevel === 'global'`) `>` `Region` `>` `Agent` `>` `Provinsi` `>` `Kabupaten` `>` `Kecamatan` `>` `Customer` | `reportAccessLevel`, `isFieldAgent`, `selectedRegion`, `selectedAgent`, `selectedProv`, `selectedKab`, `selectedKec`, `selectedCustomer` | `src/components/HistoryReportView.jsx:443-458` |
| Search & `Context Analytics` bar (`!reportView`) | Both | Search input (`product, value, or store...`) + clear `X` + `Context Analytics` button | `searchTerm`, `reportView` | `src/components/HistoryReportView.jsx:461-475` |
| 7-level Folder Drilldown (`!reportView`) | Both (1/2/3-col grid -> store table/cards) | L1 Regions (`global` only) -> L2 Agents -> L3 Provinsi -> L4 Kabupaten -> L5 Kecamatan -> L6 Stores (`Individuals (Ecer)` vs store) -> L7 Store Receipt Archive (header with `Account Total` + store-folder `Delete`, responsive card-under-`lg` / table-on-`lg` ledger with `RETUR`/`EXCHANGE`/`UTANG BARANG LUNAS`/`STORE AUDIT`/`SALE` badges, proof photo, receipt, `Pencil` edit, `Trash2` delete) | `reportData`, `selectedRegion..selectedCustomer`, `isAdmin`, `reportAccessLevel` | `src/components/HistoryReportView.jsx:700-936` |
| `Context Analytics` dashboard (`reportView === true`) | Both + Print PDF | `Back to Folders`, print `Scale` slider (50–150%), `Print PDF` (`window.print()`); header (`Context Revenue`); 3 KPI cards (`Transactions`, `Items Moved (Bks)`, `Net Profit (Cuan)`); `Product Performance` table; `Offer Performance` (**`data-guide="offer-performance"`**) + `Package, then Retur within 7 days` & `Package counts cleared, last 30 days` (**`data-guide="package-returns"`**, `!isFieldAgent`); `Agent Roster` / `My Detailed Breakdown` accordions (items sold + chronological ledger) | `stats`, `offerStats`, `pkgReturns`, `countClears`, `printScale`, `expandedAgent`, `isFieldAgent`, `motorists` | `src/components/HistoryReportView.jsx:478-698` |
| Modals (`viewingPhoto`, `editingTrans`, `viewingReceipt`) | Both (overlay) | Delivery proof photo + GPS/time; `DATA AUDIT` transaction editor (`date`, `customerName`, `priceTier`, `items` rows, `Grand Total`); `<SaleReceipt>` printer/WhatsApp modal | `viewingPhoto`, `editingTrans`, `viewingReceipt`, `inventory`, `customers`, `appSettings` | `src/components/HistoryReportView.jsx:939-1019` |

### 2. Every press & what it writes
| control / press | handler called | writes (Firestore + local state) | moves stock or money? | file:line |
| :--- | :--- | :--- | :--- | :--- |
| `rangeType`, `targetDate`, `searchTerm`, breadcrumbs, folder cards, `Context Analytics`, `Back to Folders`, `Print PDF`, `Scale`, agent accordion, `Camera`, `FileText` | Local state setters / `window.print()` | Local UI state only (note: `handlePullArchive` fetches historical `transactions` into local `historicalData`) | No | `src/components/HistoryReportView.jsx:236-249, 425-489, 588, 709-830, 919-920` |
| `Pull Archive` | `handlePullArchive` -> `fetchHistoricalTransactions(start, end)` | Queries `transactions` in date range into local `historicalData` | No | `src/components/HistoryReportView.jsx:236-249, 433` |
| Folder `Trash2` (`Delete ALL history for this store`, `isAdmin`) | `onDeleteFolder` -> `handleDeleteHistory(customerName, agentName)` | Confirms, then `commitInChunks`: `delete` matching `artifacts/${appId}/users/${userId}/transactions/${id}` + `untallyOps(targets)` (updates monthly sales rollup) + `logAudit("HISTORY_DELETE")` (does NOT restore stock) | **Yes — deletes transaction records & reverses sales rollup (`transactions`, `stats`/rollup)** | `src/components/HistoryReportView.jsx:857`, `src/App.jsx:3528-3548` |
| Row `Trash2` (`Delete this specific transaction`, `isAdmin`) | `onDeleteTransaction(t)` -> `handleDeleteSingleTransaction` | Confirms, then `commitInChunks`: `delete` `artifacts/${appId}/users/${userId}/transactions/${t.id}` + `untallyOps([t])` + `logAudit("TRANS_DELETE")` (does NOT restore stock) | **Yes — deletes transaction record & reverses sales rollup (`transactions`, `stats`/rollup)** | `src/components/HistoryReportView.jsx:922`, `src/App.jsx:3489-3504` |
| Row `Pencil` -> `DATA AUDIT` `Save Changes` (`isAdmin`) | `handleEditSubmit` | `commitInChunks`: `update` `artifacts/${appId}/users/${userId}/transactions/${id}` (`date`, `customerName`, `total`, `amountPaid`, `priceTier`, `items`, `timestamp`, `updatedAt`) + `tallySaleOp(..., __before, -1)` + `tallySaleOp(..., after, +1)` (updates monthly sales rollup; does NOT adjust stock) | **Yes — updates transaction amounts/items & adjusts sales rollup (`transactions`, `stats`/rollup)** | `src/components/HistoryReportView.jsx:368-405, 921, 1010` |

### 3. Logic computed inside JSX / render
| computation | what it computes | file:line |
| :--- | :--- | :--- |
| `reportAccessLevel`, `isFieldAgent`, `isRegionalOnly` | Fail-closed visibility: `ADMIN`/`DEVELOPER`/`COMPANY_OWNER` or `view_reports_global` -> `'global'`; `view_reports_regional` -> `'regional'` (filtered by `myLocation`); else `'personal'` (`agentProfileId` only) | `src/components/HistoryReportView.jsx:50-86` |
| `dateFilteredTransactions` & `searchedTransactions` | Deduplicates `transactions + historicalData`, fences by access level, filters by `daily`/`weekly`/`monthly`/`yearly`, sorts newest first, filters by `searchTerm` | `src/components/HistoryReportView.jsx:69-114` |
| `reportData` (6-tier hierarchy) | Groups into Region -> Agent -> Provinsi -> Kabupaten -> Kecamatan -> Store (`Individuals (Ecer)` if walk-in or `priceTier === 'Ecer'`); subtracts `RETUR` values (`-Math.abs(...)`) | `src/components/HistoryReportView.jsx:117-216` |
| `contextualTransactions`, `stats` | Filters to selected Region/Agent; sums `totalRev` (`RETUR` negative), `totalProfit`, `count`, `payments`, `items` (`convertToBks`), `agentRoster` | `src/components/HistoryReportView.jsx:251-319` |
| `offerStats`, `pkgReturns`, `countClears` | Calls `offerResults(contextualTransactions)` sorted by `rp`; calls `packageReturns(...)` & filters `customers[].bundleReset` within 30 days (`!isFieldAgent`) | `src/components/HistoryReportView.jsx:264-275` |
| `handleEditItemChange` & `handleEditTierChange` | Recomputes `calculatedPrice = basePrice * convertToBks(1, unit, product)` and `total` / `amountPaid` | `src/components/HistoryReportView.jsx:321-366` |

### 4. What can move out first & `logicFixes.selfcheck.mjs` pins
| candidate to extract | safe to move first? | `logicFixes.selfcheck.mjs` exact line pins |
| :--- | :--- | :--- |
| `DATA AUDIT` modal (`editingTrans`), `viewingPhoto` modal, or `ReportAnalytics` (`reportView`) -> `src/components/reports/...` | **Only alongside `selfcheck` updates** — `selfcheck` reads `src/components/HistoryReportView.jsx` directly for analytics layout, store ledger grid classes, `offerStats`, `pkgReturns`, `promoGiven`, `convertToBks` | `32`, `129` (`imports(history, 'convertToBks')`), `1028`, `1071`, `10331-10351` (exact classes: `flex flex-col gap-3 md:flex-row md:justify-between md:items-end md:gap-0 print:flex-row...`, `text-right pr-3 md:pr-6 print:pr-6`, `grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 py-3 lg:table-row`, `p-4 flex flex-wrap gap-y-2 items-center justify-between text-left`, etc.), `10912`, `12819` (`.concat((t.promoGiven || []).map(g =>`), `12904-12905` (`offerStats`, `data-guide="offer-performance"`), `14119-14122` (`packageReturns(contextualTransactions)`, `{!isFieldAgent && (`, `data-guide="package-returns"`, `Package counts cleared, last 30 days:`) |
| `handleDeleteHistory` / `handleDeleteSingleTransaction` | **Keep in `App.jsx` (or update selfcheck)** | `4400-4401` (`handleDeleteHistory` anchor in `App.jsx`) |

## Task 25 - the same map for Customers (segment 6 of 12)
**Status:** DONE
**Written:** 2026-11-17 08:26 WIB, by Claude. Same rules as above.

Exactly Task 20's four tables for `src/components/CustomerManager.jsx` (`CustomerManagement`, the `activeTab === 'customers'` screen). Note which tier sees which customers (the region / permission filter) with file:line. Same filled-button list as Task 24.
Do NOT change the code. Done when: four tables + the filled-button list in the Result.

**Result:**

### Demo Guide Marks in `src/components/CustomerManager.jsx`
- `data-guide="photo"` on the store photo shutter button inside the Add/Edit Customer form (`src/components/CustomerManager.jsx` — pinned in `logicFixes.selfcheck.mjs:7270, 7288`).

### Which Tier Sees & Edits Which Customers
- **Visibility (browsing the directory):** `CustomerManagement` receives `customers` from `src/App.jsx:5586` without region filtering (`searchedCustomers` at `CustomerManager.jsx:381-393` searches all `customers`) — every tier can browse/look up stores (`view_only` shows a read-only banner at `1355-1360`).
- **Add / Edit gating:** `customerAccessLevel = getCustomerAccessLevel(userRole)` (`207`: `'view_only'` / `'own_region'` / `'global'`), overridden by `isAdmin` (`220`) or `customerScope` (`canEditShop(customerScope, c)` at `222`, from `Settings > Customer access`). `own_region` allows editing stores whose `c.region` matches `employeeRegion` or is unclassified (`isRegionUnclassified(c.region)` at `211-226`).
- **Grosir & Salesman approvals:** `grantsGrosir = isAdmin || canConfirmGrosir(userRole)` (`232`, Tier 1–4 or unlocked); `ownerAsks` (`252-253`) further filters to shops with `hasNoSalesman(c) && canEditCustomer(c)`.
- **Admin-only powers:** `adminTools` (`1240`, `1370`), folder `DEL`/`EDIT` (`311-312`), and store card `Move`/`Verify`/`Del` (`1772-1806`) require `isAdmin`.

### Filled Amber/Gold Buttons to Convert to `.kpm-edge-btn`
- `src/components/CustomerManager.jsx:145` — `Add Log` button inside `CustomerDetailView` (`bg-[var(--gold)] text-[var(--gold-ink)]`)
- `src/components/CustomerManager.jsx:1791` — `Verify` NOO button on pending store cards (`bg-[var(--gold)] text-[var(--gold-ink)]`)
*(Hover-only `hover:bg-[var(--gold)]` on `126` and `1801`; badge/banner `bg-[var(--gold)]` on `1299`, `1316`, `1321`.)*

### 1. Elements on screen (PC & phone, top to bottom)
| element | PC / phone | what it shows | reads (state / prop / Firestore field) | file:line |
| :--- | :--- | :--- | :--- | :--- |
| `App.jsx` tab mount (`activeTab === 'customers'`) | Both | `<CustomerManagement>` (lazy-loaded) | `customers`, `isAdmin`, `userRole`, `employeeRegion`, `customerScope`, `tierSettings`, `roster` | `src/App.jsx:5585-5599` |
| `CustomerDetailView` (`viewMode === 'detail'`) | Both | Full-page store detail view + benchmark logs (`Add Log` / delete log) + Map button | `selectedCustomer`, `viewMode`, `newBench` | `src/components/CustomerManager.jsx:36-188, 1189` |
| Header & Admin Tools | Both (`hidden lg:flex` on PC; `Admin tools` fold on phone) | `Customer Directory` title + `Repair N Store Tiers` (when needed), `Find Duplicates`, `Data Scrub`, `Import Map Marker (KML)` | `isAdmin`, `customers`, `dupScanning`, `showTools` | `src/components/CustomerManager.jsx:1196-1241, 1370-1383` |
| Duplicate Report (`isAdmin && dupReport`) | Both | Possible duplicate store groups (identical name or <= 40m), `Show/Hide ignored`, `Edit` (`openForEdit`), `Delete` (`handleDeleteDuplicate`) | `dupReport`, `dupVisible`, `dupIgnored`, `dupShowIgnored` | `src/components/CustomerManager.jsx:1125, 1245-1351` |
| View-only banner / `Add new customer` button | Both | Read-only notice (`!canAddOrEditAnything`) OR `+ Add new customer` button (`canAddOrEditAnything`) | `canAddOrEditAnything`, `showForm`, `editingId` | `src/components/CustomerManager.jsx:1355-1369` |
| Add/Edit Customer modal (`createPortal` to `document.body`) | Both (`z-[9000]`) | Form: `Store Name`, `Phone`, `Map Pin Tier`, `priceTier`, `visitFreq`, `picName`, photo shutter (**`data-guide="photo"`**), `Auto-Find`, `GPS`, Provinsi/Kabupaten/Kecamatan datalists, `Address`, `Description`, `GPS Coordinates`, `Street View Link`, `Save Customer` / `Update Profile` | `showForm`, `editingId`, `formData`, `coordInput`, `tierSettings`, `customers`, `croppedImage` | `src/components/CustomerManager.jsx:1388-1573` |
| Search bar | Both | `"Search store name, region, city, or salesperson..."` | `searchTerm` | `src/components/CustomerManager.jsx:1576-1585` |
| `Grosir requests` & `Shops waiting for a salesman` (`grantsGrosir`) | Both | Pending `requestedTier === 'Grosir'` (`Keep Retail`/`Confirm Grosir`) & unassigned shops (`ownerAsks`, `<select>` from `roster` + `Give`) | `grantsGrosir`, `grosirAsks`, `ownerAsks`, `ownerPick`, `ownerAll`, `roster` | `src/components/CustomerManager.jsx:232-268, 1589-1633` |
| 4-level Folder & Store Directory | Both (2-col folders on phone, 3-col on `lg`; 1/2-col store cards) | Breadcrumb (`Indonesia` > `Provinsi` > `Kabupaten` > `Kecamatan`), `<FolderCard>`s with `<NixieCount>` Pending & admin `⋯` (`DEL`/`EDIT`), then A–Z store cards (tier/price/`Grosir?` badges, `T3/T4 PIC`, `NOO By`, admin `Move`/`Verify`/`Map`/`Edit`/`Del`, non-admin `Edit` if `canEditCustomer`) | `folderStructure`, `selectedProvince`, `selectedRegion`, `selectedCity`, `activeProv/Kab/Kec`, `isAdmin`, `actsOpen`, `customerScope`, `customerAccessLevel` | `src/components/CustomerManager.jsx:300-324, 1636-1825` |

### 2. Every press & what it writes
| control / press | handler called | writes (Firestore + local state) | moves stock or money? | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Search, breadcrumbs, `<FolderCard>`, `MoreKey` (`⋯`), `Add new customer`, `Edit`, `Map`, `Find Duplicates` | Local state setters / `openDetail` / `handleEdit` / `onNavigateToMap` | Local UI state / `sessionStorage('targetMapStore')` | No | `src/components/CustomerManager.jsx:1091, 1638-1814` |
| `Save Customer` / `Update Profile` | `handleSubmit` | Validates name, WhatsApp phone, Prov/Kab/Kec (pin auto-fill), non-zero GPS pin; `updateDoc` or `addDoc` `artifacts/${appId}/users/${user.uid}/customers` (with Grosir hold `requestedTier: 'Grosir'` when `!grantsGrosir`) + `logAudit` | No (sets `priceTier` / `requestedTier` for future sales) | `src/components/CustomerManager.jsx:968-1090, 1569` |
| `Keep Retail` / `Confirm Grosir` | `decideGrosir(c, yes)` | `updateDoc` `customers/${c.id}` (`priceTier: 'Grosir'` + delete `requestedTier`, or delete `requestedTier`) + `logAudit` | No (unlocks Grosir tier on future sales) | `src/components/CustomerManager.jsx:234-247, 1599-1600` |
| `Give` (assign salesman) | `giveSalesman(c)` | `updateDoc` `customers/${c.id}` (`assignedAgent`, `assignedBy`, `assignedAt`) + `logAudit("AGENT_ASSIGNED")` | No | `src/components/CustomerManager.jsx:256-268, 1623` |
| `Verify` (NOO) | `handleApproveNOO` | `updateDoc` `customers/${id}` (`status: 'APPROVED'`, `verifiedAt`) + `logAudit("NOO_APPROVED")` | No | `src/components/CustomerManager.jsx:1136-1147, 1791` |
| `Del` / `Delete` duplicate / `DEL` folder / `EDIT` folder / `Move` / `Data Scrub` / `Repair Tiers` / `Import KML` | `handleDelete`, `handleDeleteDuplicate`, `handleDeleteFolder`, `handleBulkRename`, `handleFastStoreMove`, `handleEnterpriseDataScrub`, `handleRepairTierField`, `handleImportKML` | `deleteDoc` / `updateDoc` / `writeBatch` on `artifacts/${appId}/users/${user.uid}/customers` + `logAudit` | No | `src/components/CustomerManager.jsx:491-577, 626-727, 788-967, 1115` |
| Detail `Add Log` / Delete log | `handleAddBenchmark` / `handleDeleteBenchmark` | `addDoc` / `deleteDoc` `customers/${id}/competitor_benchmarks` | No | `src/components/CustomerManager.jsx:36-60, 145` |

### 3. Logic computed inside JSX / render
| computation | what it computes | file:line |
| :--- | :--- | :--- |
| `customerAccessLevel` & `canEditCustomer` | Resolves `view_only`/`own_region`/`global`, `customerScope` (`canEditShop`), and `isRegionUnclassified` fallback | `src/components/CustomerManager.jsx:207-230` |
| `grosirAsks`, `ownerAsks` | Filters `requestedTier === 'Grosir'`, and `hasNoSalesman(c) && canEditCustomer(c)` sorted newest-first | `src/components/CustomerManager.jsx:233, 252-253` |
| `searchedCustomers` & `folderStructure` | Searches 7 fields; fills unknown Prov/Kab/Kec via `areaFromPin(lat, lng, sortedBorders)` + text dictionary (`guessKecamatan`/`Kabupaten`/`Province`); uppercases folder keys; counts stores & `PENDING` NOOs; injects custom folders | `src/components/CustomerManager.jsx:381-463` |
| Store A–Z sort | Sorts `activeKec.stores` by `localeCompare(..., 'id', { sensitivity: 'base' })` | `src/components/CustomerManager.jsx:1719` |

### 4. What can move out first & `logicFixes.selfcheck.mjs` pins
| candidate to extract | safe to move first? | `logicFixes.selfcheck.mjs` exact line pins |
| :--- | :--- | :--- |
| `CustomerDetailView`, `DuplicateReport`, `Add/Edit Form` portal -> `src/components/customers/...` | **Only alongside `selfcheck` updates** — `selfcheck` reads `src/components/CustomerManager.jsx` directly for `canEditShop`, `lastVisit`, `kpm-shutter`, `kpm-arrive`, `NixieCount`, `data-guide="photo"`, `accept="image/*"` | `1546`, `5938`, `6048`, `6695-6736`, `7270-7290` (`<button data-guide="photo" ... className="kpm-shutter kpm-corners">`), `7338`, `7433`, `7583`, `7835` (`<div className="grid grid-cols-1 md:grid-cols-2 gap-4 kpm-arrive">`), `7904`, `9813-9819` (`App.jsx` lazy import `CustomerManagement`), `11462-11463`, `11861`, `11882`, `11994` (`if (customerScope) return canEditShop(customerScope, c);`), `12083`, `12109`, `13853` (`<NixieCount value={pending} size={12} rollIn /> Pending`), `14080` |

## Task 26 - the same map for Sampling (segment 7 of 12)
**Status:** DONE
**Written:** 2026-11-17 08:52 WIB, by Claude. Same rules as above.

Exactly Task 20's four tables for `src/components/SamplingManager.jsx` (SamplingAnalyticsView, SamplingCartView, SamplingFolderView, SampleEntryModal - the `activeTab === 'sampling'` screen, App.jsx ~L5630). Every press that takes stock out (a sample given) gets **Yes** with the exact field it writes. Demo guide marks; selfcheck pins; the same filled-button list as Task 24 (`bg-gold`, `bg-[var(--gold)]`, `bg-orange-*`, `bg-amber-*`, `from-amber-*`).
Do NOT change the code. Done when: four tables + the filled-button list in the Result.

**Result:**

### Demo Guide Marks in `src/components/SamplingManager.jsx`
- **None** (`rg -n "data-mission=|data-guide="` returned zero matches).

### Filled Amber/Gold Buttons to Convert to `.kpm-edge-btn`
- `src/components/SamplingManager.jsx:320` — `Save N Products` button in `SamplingCartView` (`bg-[var(--gold)] hover:brightness-110 text-[var(--gold-ink)]`)
- `src/components/SamplingManager.jsx:593` — `Add to Folder` / `Save Changes` submit button in `SampleEntryModal` (`bg-[var(--gold)] hover:brightness-110 text-[var(--gold-ink)]`)
*(Also inline in `src/App.jsx:5649`: `Save Move` button in the Rename Folder modal uses `bg-orange-500`.)*

### 1. Elements on screen (PC & phone, top to bottom)
| element | PC / phone | what it shows | reads (state / prop / Firestore field) | file:line |
| :--- | :--- | :--- | :--- | :--- |
| `App.jsx` tab mount (`activeTab === 'sampling'`) | Both | Rename Folder modal (`editingFolder`), `<SampleEntryModal>` (`editingSample`), and `<SamplingAnalyticsView>` or `<SamplingFolderView>` | `samplings`, `inventory`, `isAdmin`, `editingFolder`, `editingSample`, `showSamplingAnalytics` | `src/App.jsx:5639-5674` |
| `SamplingFolderView` (default) | Both (2-col phone / 4-col `lg` `<FolderCard>`s -> item rows) | 4-level drilldown (Year -> Month -> Date -> Location): `Sampling Archives` header, `+ New Sample` (`isAdmin`) & `View Analytics` buttons (`kpm-edgebtn`), folder cards, then grouped by `note` with item rows (`productName`, `formatSampleQty`, `Pencil` & `Trash2` if `isAdmin`) + `Edit Folder` button | `samplings`, `isAdmin`, `selectedYear`, `selectedMonth`, `selectedDate`, `selectedLocation`, `folderStructure` | `src/components/SamplingManager.jsx:336-497` |
| `SamplingAnalyticsView` (`showSamplingAnalytics`) | Both | `Back to Folders`, period tabs (`daily`/`weekly`/`monthly`/`yearly`, `kpm-tab-on`), `targetDate` picker, 3 KPI cards (`Total Marketing Burn` at Distributor cost, `Items Distributed` Bks/Btg, `Physical Proof Required` `Pita Cukai`), 3 potential-value cards (`ECER`/`RETAIL`/`GROSIR`), Recharts `Top 5 Products by Marketing Spend` bar chart | `samplings`, `inventory`, `rangeType`, `targetDate`, `stats` | `src/components/SamplingManager.jsx:21-190` |
| `SampleEntryModal` (`editingSample`) | Both (overlay) | Modal form: `Date`, `Bungkus` & `Batang` dual inputs, `Product` `<select>`, `Location / Store Name` (`reason`), `Notes (Folder Group)` (`note`), submit button | `isOpen`, `initialData`, `inventory`, `formData` | `src/components/SamplingManager.jsx:500-600` |
| `SamplingCartView` (exported component) | PC 2/3 + 1/3 split / Phone stacked | Left: `Search item to sample...` + product grid (`stock in Vault`). Right: `Folder Name / Location`, `Description / Store Name`, `Date` (locked if `!isAdmin`), cart items with `Bungkus`/`Batang` `-`/`+` rollover & direct inputs, `Save N Products` button | `inventory`, `isAdmin`, `searchTerm`, `cart`, `location`, `note`, `targetDate`, `isSubmitting` | `src/components/SamplingManager.jsx:193-328` |

### 2. Every press & what it writes
| control / press | handler called | writes (Firestore + local state) | moves stock or money? | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Folder cards, `Back`, `View Analytics`, period tabs, `New Sample`, `Edit` | Local state setters / `setShowSamplingAnalytics` / `setEditingSample` | Local UI state only | No | `src/components/SamplingManager.jsx:123-131, 376-488` |
| `SampleEntryModal` submit (`Add to Folder` when `isNew`) / `SamplingCartView` `Save N Products` | `handleBatchSamplingSubmit` | `runTransaction`: deducts `qtyInBks` from `products/${id}.stock` (when VAULT) OR `motorists/${agentId}.activeCanvas` (when VEHICLE); creates `samplings` doc (`date`, `productId`, `productName`, `qty`, `unit: 'Bks'`, `sticksPerPack`, `reason`, `note`, `sourceId`); `logAudit("SAMPLING_BATCH")` | **Yes — deducts `products.stock` or `motorists.activeCanvas`** | `src/components/SamplingManager.jsx:232-248, 526-541`, `src/App.jsx:4005-4086` |
| `SampleEntryModal` submit (`Save Changes` when editing) | `handleUpdateSampling` | `runTransaction`: restores old `qty` to `products.stock` or `motorists.activeCanvas`, deducts new `qty` from `products.stock` or `motorists.activeCanvas`, updates `samplings/${id}` | **Yes — adjusts `products.stock` or `motorists.activeCanvas`** | `src/components/SamplingManager.jsx:526-541`, `src/App.jsx:4127-4224` |
| Item row `Trash2` (`isAdmin`) | `onDelete(s)` -> `handleDeleteSampling` | Confirms, `runTransaction`: restores `qtyInBks` to `products/${id}.stock` (if `VAULT`) or `motorists/${sourceId}.activeCanvas`, deletes `samplings/${id}` + `logAudit("SAMPLING_DELETE")` | **Yes — restores `products.stock` or `motorists.activeCanvas`** | `src/components/SamplingManager.jsx:399`, `src/App.jsx:4088-4125` |
| `Edit Folder` -> `Save Move` (`isAdmin`) | `onEditFolder` -> `processFolderEdit` | Batch-updates `date` and `reason` on matching `samplings` docs | No | `src/components/SamplingManager.jsx:378`, `src/App.jsx:4225, 5646` |

### 3. Logic computed inside JSX / render
| computation | what it computes | file:line |
| :--- | :--- | :--- |
| `formatSampleQty` | Splits decimal Bks into `X Bks Y Btg` using `sticksPerPack \|\| 16` | `src/components/SamplingManager.jsx:9-18, 395` |
| `SamplingAnalyticsView` `stats` | Filters `samplings` by `daily`/`weekly`/`monthly`/`yearly`; converts legacy `'Batang'` to `bksEq`; sums Distributor cost (`totalValueDistributor`), potential `Ecer`/`Retail`/`Grosir` values, `totalPitaCukai = sum(Math.ceil(p.qty))`, top 5 `chartData`, `topLocation` | `src/components/SamplingManager.jsx:48-119` |
| `SamplingCartView` rollover & decimal encoding | `updateCartQty` rolls `qtyBatang >= sticksPerPack` into `qtyBks`; `handleFinalSubmit` encodes `qty = qtyBks + qtyBatang / sticksPerPack` (`unit: 'Bks'`) | `src/components/SamplingManager.jsx:212-244` |
| `SamplingFolderView` `folderStructure` & `groupedItems` | Groups `samplings` by Year -> Month -> Date -> `reason` (`location`) -> `note` | `src/components/SamplingManager.jsx:344-370` |

### 4. What can move out first & `logicFixes.selfcheck.mjs` pins
| candidate to extract | safe to move first? | `logicFixes.selfcheck.mjs` exact line pins |
| :--- | :--- | :--- |
| `SamplingAnalyticsView`, `SamplingCartView`, `SamplingFolderView`, `SampleEntryModal` | **Yes, carefully** — preserve `FolderCard` quiet classes and no `purple-/emerald-/cyan-` palette violations | `8020`, `11463`, `13008`, `13761` |

## Task 27 - the same map for Command Center (segment 8 of 12)
**Status:** DONE
**Written:** 2026-11-17 08:52 WIB, by Claude. Same rules as above.

Exactly Task 20's four tables for `src/components/DashboardView.jsx` (the `activeTab === 'dashboard'` screen, App.jsx ~L5088) - every number on it and where it is computed (file:line), every press. Demo guide marks; selfcheck pins; the same filled-button list.
Do NOT change the code. Done when: four tables + the filled-button list in the Result.

**Result:**

### Demo Guide Marks in `src/components/DashboardView.jsx`
- **None** (`rg -n "data-mission=|data-guide="` returned zero matches).

### Filled Amber/Gold Buttons to Convert to `.kpm-edge-btn`
- **None** in `src/components/DashboardView.jsx` (`rg -n "bg-gold|bg-\[var\(--gold\)\]|bg-orange-|bg-amber-|from-amber-"` returned zero matches — it uses `.kpm-mod`, `.kpm-btn`, `.kpm-period`, `.kpm-vrow`, `.kpm-srow` from `theme.css`).

### 1. Elements on screen (PC & phone, top to bottom)
| element | PC / phone | what it shows | reads (state / prop / Firestore field) | file:line |
| :--- | :--- | :--- | :--- | :--- |
| `DashboardBenchmarks` (left/top grid slot) | Both (`.kpm-dash-grid`) | Live period benchmarks, targets editor (`onSaveTargets`), audit/session status, period switch (`period`, `onPeriod`) | `transactions`, `inventory`, `appSettings`, `handleSaveDashboardTargets`, `isAdmin`, `auditLogs`, `sessionStatus`, `period` | `src/components/DashboardView.jsx:306-316` |
| `Stok Kritis` (`isAdmin && runningOut.length > 0`) | Both (`.kpm-mod.hazard`) | Up to 6 low-stock products sorted by `daysOfCover`, showing `left.n`, `left.unit`, `left.rest`, `ambang limit.n limit.unit`, plus `N produk` button | `isAdmin`, `runningOut`, `appSettings` | `src/components/DashboardView.jsx:320-359` |
| `Perputaran Inventaris` (Velocity) | Both (`.kpm-mod`) | Top 6 products by `bks` sold in `period`: rank, name, progress bar (`pct%`, `neg` if `dead`), `out.n out.unit keluar · left.n left.unit stok` | `velocity`, `meta.title`, `openRow`, `arrived` | `src/components/DashboardView.jsx:361-399` |
| `Distribusi Inventaris` (`isAdmin && inventory.length > 0`) | Both (`.kpm-mod`) | `N produk dorman` chip, warehouse switch (`Semua` + `Master` + `gudangs`), legend (`Terjual`/`Dalam perjalanan`/`Stok gudang`), top 8 `supply.rows` stacked bars (`%` inside segments `>= 12%`) + `Total ...` or interactive segment readout (`seg`) | `isAdmin`, `inventory`, `gudangs`, `gudang`, `supply`, `openRow`, `seg`, `arrived` | `src/components/DashboardView.jsx:409-534` |
| `Kinerja Regional` (`isAdmin && (regions.rows.length > 0 \|\| regions.unknown)`) | Both (`.kpm-mod`) | Active region count, `<PaceChart>` for `shown` region (`omzet · share%` + steady pace caption), top 6 ranked region buttons (`omzet · share% · toko pelanggan`), `+ N wilayah` tail count, `Wilayah tidak teridentifikasi` row if `regions.unknown` | `isAdmin`, `regions`, `shown`, `wilayah`, `period`, `arrived` | `src/components/DashboardView.jsx:536-632` |
| `Leaderboard` (`AGEN · HARI INI`) | Both (`.kpm-mod`, `.idle` if empty) | Today's agent ranking by `revenueOf(t)` (`formatRupiah(a.revenue) · a.count transaksi`) | `agents` | `src/components/DashboardView.jsx:634-661` |

### 2. Every press & what it writes
| control / press | handler called | writes (Firestore + local state) | moves stock or money? | file:line |
| :--- | :--- | :--- | :--- | :--- |
| `Stok Kritis` (`N produk` button & 6 product cards) | `setActiveTab('inventory')` | Navigates to Master Vault tab | No | `src/components/DashboardView.jsx:329, 341` |
| `Perputaran Inventaris` row | `setOpenRow(...)` | Local `openRow` | No | `src/components/DashboardView.jsx:381` |
| `Distribusi Inventaris` warehouse switch (`Semua`/`Master`/branch) | `setGudang(null \| g)` | Local `gudang` | No | `src/components/DashboardView.jsx:433, 436` |
| `Distribusi Inventaris` row & bar segments | `setOpenRow(...)` / `setSeg({ id, key })` | Local `openRow`, `seg` | No | `src/components/DashboardView.jsx:476, 491-492` |
| `Kinerja Regional` row | `setWilayah(r.region)` | Local `wilayah` | No | `src/components/DashboardView.jsx:589` |
| `DashboardBenchmarks` period & target save | `setPeriod` / `handleSaveDashboardTargets` | Local `period`; target save writes `settings/general` (`App.jsx:798-808`) | No (sets goal targets only) | `src/components/DashboardView.jsx:310, 315` |

### 3. Logic computed inside JSX / render
| computation | what it computes | file:line |
| :--- | :--- | :--- |
| `dominant(bks, product)` | Formats quantities via `displayQty(bks, product, appSettings?.defaultDisplayUnit \|\| 'AUTO')` | `src/components/DashboardView.jsx:66-67` |
| `runningOut` | Sums 30-day `SALE` `convertToBks` per product, computes `daysOfCover(item.stock, perDay)`, `left`, `limit` (`minStockBks`), sorts shortest cover first | `src/components/DashboardView.jsx:78-106` |
| `velocity` | Sums `SALE` `convertToBks` inside `periodWindow(period)`, flags `low` (`isLowStock`) and `dead` (`bks === 0 && stock > 0`), takes top 6 with `pct` | `src/components/DashboardView.jsx:110-143` |
| `regions` & `shown` | Joins `revenueOf(t)` in `periodWindow(period)` to `customers[].region` by `customerName` (unmatched -> `unknown`), builds cumulative `series`, `evenPace`, `fastStart`, `share`, top 6 + `shown` | `src/components/DashboardView.jsx:160-246, 291` |
| `supply` | Filters `branchStock` to live `gudangs` (`warehouseList(motorists)`), calls `supplyByProduct(...)` and `dormant(rows)` | `src/components/DashboardView.jsx:251-265` |
| `agents` | Sums today's `revenueOf(t)`, `totalProfit`, and `count` per `t.agentName \|\| 'Admin'`, sorted descending by `revenue` | `src/components/DashboardView.jsx:268-287` |

### 4. What can move out first & `logicFixes.selfcheck.mjs` pins
| candidate to extract | safe to move first? | `logicFixes.selfcheck.mjs` exact line pins |
| :--- | :--- | :--- |
| Already modular (uses `.kpm-mod`, `DashboardBenchmarks`, `PaceChart`, `utils/supply`, `utils/period`, `utils/salesRollup`) | **Keep `App.jsx` mount clean** — do NOT pass `handleRebuildSalesStats` to `<DashboardView>` | `3636` (`dashView`), `5199-5211` (`!/<DashboardView[\s\S]{0,2000}?handleRebuildSalesStats=/.test(appSrc)`) |

## Task 28 - BUILD: no amber-filled button on Reports and Customers
**Status:** DONE
**Written:** 2026-11-17 09:00 WIB, by Claude. BUILD rules apply.
**Touch only:** `src/components/HistoryReportView.jsx`, `src/components/CustomerManager.jsx`, `src/config/logicFixes.selfcheck.mjs`, this file.

Aldi, 2026-11-17: *"i really hate the simple amber fill button dont make it again change it and make sure all the button animation are nice and clean"*. The shared style exists: `.kpm-edge-btn` in `src/styles/theme.css` (search "THE PROFESSIONAL BUTTON") - a gold edge around a plain word, see-through, hover gold wash, press sink. Variants: `.quiet` (plain edge, secondary) and `.danger` (red word).
1. Every FILLED button your Tasks 24 and 25 listed: HistoryReportView.jsx 433 (Pull Archive), 471 (Context Analytics), 976 (+ ADD ITEM), 1010 (Save Changes); CustomerManager.jsx 145 (Add Log), 1791 (Verify). In each button's `className`, REMOVE every gold fill (`bg-[var(--gold)]`, `hover:bg-[var(--gold)]`, `text-[var(--gold-ink)]`, `bg-gold`, `text-gold-ink`), any `shadow-*` glow and any `transition-*` / `hover:opacity-*` / `active:scale-*` (the class owns the motion), then ADD `kpm-edge-btn` at the front. Keep sizes, padding, `w-full`, flex, gap, rounded, font size/weight, uppercase if present. A delete/reject button gets `kpm-edge-btn danger`; a secondary press `kpm-edge-btn quiet`.
2. Do NOT touch: the hover-only icon tiles (HistoryReportView 712, 756, 819; CustomerManager 126, 1801), the Itemized Receipt header bar (974), the badges/banners (CustomerManager 1299, 1316, 1321). They are not filled buttons.
3. In `src/config/logicFixes.selfcheck.mjs`, find the check named `REGRESSION: no amber-filled button on the Master Vault or its product form`. Right AFTER that `ok(...)`, add ONE new check in the same style, named `REGRESSION: no amber-filled button on Reports or Customers (his 2026-11-17 "dont make it again")`. It reads both files with `read(...)`, removes ONLY the exact excluded class strings of point 2 with precise `.replace(...)` calls (a comment names each line it excludes), then requires `!fill.test(...)` for each file (`fill` is the regex defined just above that check - never loosen it), plus at least 4 `kpm-edge-btn` in HistoryReportView.jsx and at least 2 in CustomerManager.jsx.
4. Prove it: with your two .jsx edits stashed (`git stash push src/components/HistoryReportView.jsx src/components/CustomerManager.jsx`), the new check must FAIL; `git stash pop`, it must PASS. Paste both outputs in the Result.
Done when: the four BUILD checks are green and the red-then-green proof is in the Result.

**Result:**
- Converted 4 filled gold buttons in `src/components/HistoryReportView.jsx` (`433`, `471`, `976`, `1010`) and 2 in `src/components/CustomerManager.jsx` (`145`, `1791`) to `.kpm-edge-btn`. Left all hover-only icon tiles, header bar, and badges untouched.
- Added `REGRESSION: no amber-filled button on Reports or Customers (his 2026-11-17 "dont make it again")` in `src/config/logicFixes.selfcheck.mjs:12513-12525`.
- **Red-then-green proof:**
  - Stashed `.jsx` edits (`git stash push src/components/HistoryReportView.jsx src/components/CustomerManager.jsx`):
    ```
      FAIL REGRESSION: no amber-filled button on Reports or Customers (his 2026-11-17 "dont make it again")
    3009 passed, 1 failed, 3010 checks
    ```
  - Restored (`git stash pop`):
    ```
      ok   REGRESSION: no amber-filled button on Reports or Customers (his 2026-11-17 "dont make it again")
    3010 passed, 0 failed, 3010 checks
    ```
- **Four BUILD checks (all green after final edit):**
  1. `node src/config/logicFixes.selfcheck.mjs`: `3010 passed, 0 failed, 3010 checks`
  2. `src/config/*.selfcheck.mjs`: all 14 scripts exited 0 (`contrast`, `customerBrief`, `dayLog`, `dayStats`, `eodRecord`, `findDuplicates`, `logicFixes`, `mixedUnits`, `nextStop`, `notaScan`, `stockThreshold`, `toastSeverity`, `txSize`, `vaultGrace`)
  3. `npm run build`: exit 0 (`built in 13.92s`)
  4. `node src/config/integration.audit.mjs`: `725 passed, 0 failed, 725 checks`

## Task 29 - BUILD, ONLY after Aldi says "demo bar ok": the demo's two top bars as ONE 40 px line
**Status:** DONE - Aldi, 2026-11-17: *"demo bar oke"*.
**Written:** 2026-11-17 09:00 WIB, by Claude. BUILD rules apply.
**Touch only:** `src/components/DemoFrontDoor.jsx`, `src/components/DemoMission.jsx`, `src/styles/theme.css` (only the `.kpm-demo-bar` / `.kpm-mission` / `--kpm-safe-top` block, about L6085-6160), `src/config/logicFixes.selfcheck.mjs`, `src/config/integration.audit.mjs`, `src/config/patchNotes.js`, this file.

The spec is the picture Aldi is judging: A-Brain `Raw/2026-11-17-master-vault/demo-bar.html` - read it first.
1. Before any edit: grep logicFixes.selfcheck.mjs and integration.audit.mjs for `kpm-demo-bar`, `kpm-mission`, `kpm-safe-top`, `tape`, `hintkey`, `37px`, `34px`; list every pin in the Result. A pin you change keeps its INTENT (what it protects); only its string moves.
2. The mission line moves INSIDE the demo bar: one fixed row, 40 px high, `background: var(--panel)`, `border-bottom: 1px solid var(--line-2)`, no hazard tape (delete its element and CSS). Order: DEMO stamp, who (PC only, hidden below sm as today; drop "resets every night at 00:05 WIB" from the bar - it stays in the Switch sheet's foot), a 1 px divider, the steps, a `? Petunjuk` key (`kpm-edge-btn quiet`), the `Switch` key (`kpm-edge-btn`). Steps: done = gold check, the current one = its number in gold + its words with an 11% gold wash and a 2 px gold underline, the rest = dim numbers. Phone (under 640 px): stamp, the current step as `3/8 words` (ellipsis), `?`, `Switch`.
3. `--kpm-safe-top` with the demo on = safe-area + 40px, mission on or off (today 37 / 71). Keep every `data-mission`, `data-guide`, `aria-label` and every `onClick` exactly.
4. One patch note (en + id, plain words, no names): the demo's two top bars are now one thin line, more room for the app.
Done when: the four BUILD checks are green; the pin list and what changed in each in the Result. Claude renders it on PC and phone before it goes live.

**Result:**
- **Pin list (`logicFixes.selfcheck.mjs` & `integration.audit.mjs`):**
  - `src/config/integration.audit.mjs`: 0 matches (none to change).
  - `src/config/logicFixes.selfcheck.mjs`:
    - `9312-9313` (`--kpm-safe-top` base + shell padding): unchanged.
    - `9583, 9611, 9626, 9628, 9629, 9635, 9645, 9658, 9675, 9747, 9755` (Agent Inventory quarantine `tape` band): unrelated, unchanged.
    - `11401-11403` (`--kpm-safe-top` demo bar height): **updated** `37 px` / `37px` -> `40 px` / `40px` (kept intent: `--kpm-safe-top` reserves the bar height and `<DemoBar` mounts outside the overflow-hidden root).
    - `11412-11413` (PC rail + Toast padding by `--kpm-safe-top`): unchanged.
    - `12253-12258` (`data-mission="switch"` and `{inside && <DemoMission me={me} isT1={isT1} people={PEOPLE} />}` in `DemoFrontDoor.jsx`): unchanged (kept exact props inside `.kpm-demo-bar .in`).
    - `12262-12264` (capybara greets first, mission hidden until `!greeting`): **updated** line `12264` from checking `kpm-mission-on` class (removed since mission sits inside the 40 px bar) to `!read('src/styles/theme.css').includes('kpm-mission-on')`, keeping the `greet(...)` and `{!greeting && (<div className="kpm-mission` checks intact.
    - `12532` (ExamineModal `top` with `--kpm-safe-top`): unchanged.
    - `14208-14214` (Journey full map `--kpm-safe-top` offset): unchanged.
- **Changes made:**
  - `src/components/DemoFrontDoor.jsx`: moved `{inside && <DemoMission ... />}` inside `.kpm-demo-bar > .in` between `who` and `Switch`; removed `<div className="tape" />`, phone `who`, and `"resets every night at 00:05 WIB"` from the bar (kept in Switch sheet `.foot`); updated `who` to `{who} · {tier} {role}` on `sm+`; changed `Switch` button to `kpm-edge-btn switch` keeping `data-mission="switch"` and `onClick`.
  - `src/components/DemoMission.jsx`: replaced `<ol>`/`<Lightbulb>` with `.sep` (hidden `< 640px`), `.steps` (PC `>= 640px`: done `✓`, active `.st.now` with gold number + words, rest dim numbers; Phone `< 640px`: `.st.now.st-phone` with `n/8` + words), and `? Petunjuk` (`kpm-edge-btn quiet hintkey`, `?` only on `< 640px`, keeping `aria-pressed`, `aria-label="Petunjuk"`, `onClick={press}`); removed `kpm-mission-on` `useEffect`; portaled `CapyTalk` to `document.body` so `.kpm-ct-veil` / `.kpm-ct` are not trapped in `.kpm-demo-bar`'s `z-index: 95` stacking context.
  - `src/styles/theme.css`: updated `html.kpm-demo-on` `--kpm-safe-top` to `+ 40px`; styled `.kpm-demo-bar` (`background: var(--panel)`, `border-bottom: 1px solid var(--line-2)`), `.in` (`height: 40px`), `.who`, `.switch`, `.kpm-mission`, `.sep`, `.steps`, `.st`, `.st.done`, `.st.now` (11% gold wash + `2px` gold bottom border so Lite Mode keeps it); deleted `.tape` and `kpm-mission-on` CSS.
  - `src/config/patchNotes.js`: added `2026-11-17` `en` + `id` patch note for the combined one-line demo bar.
- **Four BUILD checks (all green after final edit):**
  1. `node src/config/logicFixes.selfcheck.mjs`: `3010 passed, 0 failed, 3010 checks`
  2. `src/config/*.selfcheck.mjs`: all 14 scripts exited 0 (`contrast`, `customerBrief`, `dayLog`, `dayStats`, `eodRecord`, `findDuplicates`, `logicFixes`, `mixedUnits`, `nextStop`, `notaScan`, `stockThreshold`, `toastSeverity`, `txSize`, `vaultGrace`)
  3. `npm run build`: exit 0 (`built in 14.73s`)
  4. `node src/config/integration.audit.mjs`: `725 passed, 0 failed, 725 checks`

## Task 30 - draft the Restock Vault picture (segment 2) for Claude to check
**Status:** DONE
**Written:** 2026-11-17 09:00 WIB, by Claude. Writes ONE new file - not an app BUILD.
**Touch only:** `.claude/drafts/restock-vault-pro.html` (new), this file.

The loop per screen: ONE picture (PC + phone, real lab numbers) -> Aldi's ok -> build. You draft the picture; Claude reviews and publishes it.
- Copy the structure and CSS of A-Brain `Raw/2026-11-17-master-vault/master-vault-pro.html` (Aldi: *"actually its look solid"*): same tokens (`:root` + both dark blocks), fonts, frames - a PC frame on top, two phone frames under it.
- Content = today's Restock Vault from YOUR Task 21 map: the 5 tabs (Masuk, Kirim, Request, Buku, Data Induk) as underline tabs with counts; the MASUK screen: product picker (left on PC, on top on phone), the route (Asal swap Tujuan, Pengirim, Penerima, SJ numbers, Tanggal), the cart as a ruled table (Barang, Batch, Jumlah, @ Landed, total), the costs (Ongkos kirim, Pita cukai, Upah bongkar), the 4 totals (Nilai barang, Biaya tambahan, Total dibayar, Landed / Bks), the completeness footer with `Simpan surat jalan`.
- Real numbers: the 6 products of `demo/seed.json` `inventory` (name, priceDistributor, packing). A cart of 2 lines, e.g. Cello Chocolate 2 Bal and Cello Green 5 Slop; work every total by hand and SHOW the arithmetic in an HTML comment under the cart so Claude can check it.
- Buttons look like `.kpm-edge-btn` (copy its CSS from theme.css "THE PROFESSIONAL BUTTON"). NO amber fill anywhere.
- Every feature today's screen has is on the picture or named in a one-line note under it ("moved to ..."). Aldi's rule from Master Vault: a new look may move his features, never drop them.
Done when: the file exists, opens with no script, and the Result lists every feature from your Task 21 map with where it sits on the picture.

**Result:**
- Created `.claude/drafts/restock-vault-pro.html` (static HTML, zero `<script>` tags, `.kpm-edge-btn` buttons with zero amber fill, PC frame + two phone frames, real `demo/seed.json` 6 products + 2-line cart arithmetic comment).
- **Every Task 21 feature & where it sits on the picture:**
  - **5 underline tabs with counts** (`Masuk 2`, `Kirim 1`, `Request 2`, `Buku 14`, `Data Induk 1`): top tab strip in both PC and Phone 1.
  - **Product picker + search + promo `pcs` section**: left `<aside>` on PC; stacked top list on Phone 1.
  - **Production targets (`Target produksi bulan ini` + `+ Set` modal)**: target strip above route on PC; `+ Target` button in Phone 1 header (modal stays on click).
  - **Route & people (`Asal` ⇄ `Tujuan`, `Pengirim`, `Penerima`, `SJ App`, `SJ Pabrik`, `Tanggal`)**: form grids in PC center and Phone 1.
  - **Cart table (`Barang`, `Batch`, `Jumlah` 4-box mix + packing rates, `@ Landed` + drift, `Subtotal`)**: ruled table in PC center (with full arithmetic HTML comment below it); stacked cards in Phone 2.
  - **Extra costs (`Ongkos kirim`, `Pita cukai`, `Upah bongkar`) & Evidence (`Bukti foto barang`, `Nota / faktur (scan)`, `Resi & kurir`)**: 3-column rows under the cart on PC.
  - **4 totals (`Nilai barang`, `Biaya tambahan`, `Total dibayar`, `Landed / Bks`)**: 4-cell strip on PC; 2×2 grid on Phone 2.
  - **Completeness footer (`Kelengkapan`, progress bar, `%`, missing/ready text, `Simpan surat jalan`)**: pinned bottom bar on PC and Phone 2.
  - **`Kirim`, `Request` (`Siapkan` modal), `Buku` (expandable drawer, `Cetak`, `Edit`, `Hapus`, `<Proses>`), `Data Induk` (`Pabrik`/`Gudang`/`Orang`)**: remain in their own tabs/modals as noted in the one-line `.note` above the phone frames.

---
**Claude review 2026-11-17 12:45 WIB:** Tasks 26-30 read. 28 + 29 gates re-run green (logicFixes 3010/0, 14 self-checks exit 0, build 0, audit 725/0), demo bar rendered PC 1440/1024 + phone 390, Pull Archive rendered - LIVE 7386bcc7. Task 30 arithmetic checked against RestockVaultView.jsx L497-498 + L2025: right. Claude fixed 4 things in the draft (promo name not in seed -> T-shirt Cello 40 pcs; receiver "Aldi" -> the demo owner Hartono Susilo; the phone dropped the swap key, Tanggal, the three costs and the evidence) and published it.
Lesson for every next picture draft: the PHONE frames must carry every feature the PC frame has (moved, never dropped), and every name/number must exist in `demo/seed.json` - no invented people or products.

## Task 31 - the same map for Map System (segment 9 of 12)
**Status:** DONE
**Written:** 2026-11-17 12:45 WIB, by Claude. Same rules as above (read-only, touch only this file).

Exactly Task 20's four tables for `src/MapMissionControl.jsx` (the `activeTab === 'map_war_room'` screen, App.jsx L5137). Every press that writes to Firestore gets **Yes** with the exact collection + field it writes. Demo guide marks (`data-mission=` / `data-guide=` / `data-mark=`); every selfcheck pin on this file (grep logicFixes.selfcheck.mjs + integration.audit.mjs for `MapMissionControl`); the filled-button list (`bg-gold`, `bg-[var(--gold)]`, `bg-orange-*`, `bg-amber-*`, `from-amber-*`) with file:line. Also: which parts are the map library itself (Leaflet or similar - the restyle must not touch them) and which are KPM's own panels around it.
Do NOT change the code. Done when: four tables + filled-button list + map-library-vs-KPM list in the Result.

**Result:**

### 1. Every view / modal / drawer
| view / modal | PC vs phone | what is on it | state / props that control it | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Main map & floating HUDs | Both (PC floating cards/docks; phone `.ms-top`, `.kx-dock.ms-dock`, `.ms-sheet`) | Region `<select>`, `Find a shop` `<input list>`, PC totals (`.ms-totals`: Shops, This month `isAdmin`, Need a visit), PC `Top areas` / `Areas` card (`.ms-areas`), PC level filter chips (`.ms-levels`), PC bottom layer dock (`.ms-layers`), PC top-right tool keys (`.ms-tools`), phone 4-key dock (`Areas`, `Levels`, `Layers`, `Locate`) + slide-up `.ms-sheet`, optional `.ms-heatkey` legend | `selectedRegion`, `selectedCity`, `shopQuery`, `allAreas`, `filterTier`, `sheet`, `showBorders`, `salesHeatmapMode`, `networkMode`, `conquestMode`, `isAdmin`, `canAddManualPin` | `src/MapMissionControl.jsx:2226-2314` |
| `StoreBottomSheet` | PC floating card (`.ms-store`); phone 85vh draggable bottom sheet (snap `0.22 / 0.50 / 0.85`) | Store badge + name + tier/area, salesman owner, address, stats (`This month`, `Last order`, `Still unpaid` toggleable consignment items, `Visit` freq input/label), `Next visit`, `Directions`, `WhatsApp`, `On Journey Plan`, folded `Boss tools` (`⋯`: `Correct pin`, `Edit profile`, `Level` select, `Wholesale hub` switch, `Supplied by` hub select, `Catchment reach` slider, `Delete this shop`), `Recent sales` (last 5) | `activeStore` (`selectedStore`), `showConsignDetails`, `showTools`, `visitFreq`, `localScale`, `isLinking`, `isAdmin`, `canOverrideGps` | `src/MapMissionControl.jsx:1039-1406, 2457-2467` |
| `ZoneHUD` | Both (floating card when zone selected and `!showTacticalDash && !activeStore`) | Selected boundary `zone.name`, `zone.level · zone.fullName`, `Shops inside` count, close button | `selectedZone`, `showTacticalDash`, `activeStore` | `src/MapMissionControl.jsx:990-1004, 2469` |
| `TacticalDashboard` ("Sector Command") | Both (`isAdmin`) | Area level select (`Provinsi`/`Kabupaten`/`Kecamatan`/`Desa`), `timeFilter` select, `Global Revenue`, `Active Sectors`, `Heatmap Engine` toggle, ranked sector progress bars, `Target Locked` footer (`Assets`, `Threat`), minimize/close | `showTacticalDash`, `isMinimized`, `selectedAreaType`, `timeFilter`, `salesHeatmapMode`, `selectedZone` | `src/MapMissionControl.jsx:310-444, 2327-2335` |
| `BorderImporter` ("Territory Manager") | Both (`isAdmin`, floating panel) | Target folder input + datalist, `.geojson`/`.json` upload, `+ Folder`, `Clear All`, collapsible folder tree (`+ FILE`, `DEL`, `EDIT`, `VIS`, `HID`), per-boundary move select, `VISIBLE`/`HIDDEN`, inline `Sector Configuration` (`name`, `folderName`, `color`, `targetRev`, `assignedAgent`), delete | `showImporter`, `uploadFolder`, `customFolders`, `expandedNodes`, `editingId`, `editForm`, `isLoading`, `boundaries` | `src/MapMissionControl.jsx:447-986, 2316-2325` |
| `TierAutomationEngine` ("Season Rank Engine") | Both (`isAdmin`, fullscreen modal) | `Audit Season Ranks`, `Initialize RPG Data Cleanse` (run once), `Season Audit Results` (`Promotions`, `Demotions`, `Unchanged`, per-store season/lifetime XP diff), `Discard` / `EXECUTE SEASON UPDATE` | `showTierEngine`, `rules`, `simResults`, `isApplying` | `src/MapMissionControl.jsx:1408-1714, 2337` |
| Targeting HUD & `Register Target` modal | Both (`canAddManualPin`) | Top floating bar (`Drag pin or tap map to move`, `Cancel`, `Save`/`Confirm`) while `isAddingMode \|\| editingStoreId`; modal (`Store Name`, `Phone / WhatsApp`, `Full Address`, `Pricing Tier`, `Deploy Target`) when `pendingNewStore` set | `isAddingMode`, `editingStoreId`, `dragPinCoords`, `pendingNewStore`, `newStoreForm`, `isSavingStore` | `src/MapMissionControl.jsx:2127-2223` |

### 2. Every press & what it writes
| control / press | handler called | writes (Firestore + local state) | moves stock or money / Firestore write? | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Region select, `Find a shop`, `LevelChips`, `AreaRow`, `LayerKeys`, `Locate`, `All areas`, phone dock `Areas`/`Levels`/`Layers`, `Directions`, `WhatsApp`, `On Journey Plan`, `Edit profile`, `Correct pin` | Local state / `mapRef` / `onShowStoreOnJourney` / `onNavigateToDirectory` / `setLocateTick` | Local UI state, `sessionStorage.targetMapStore` (read), `sessionStorage.targetEditStore` (write) | No | `src/MapMissionControl.jsx:1357-1368, 2040-2116, 2231-2311` |
| `Set home` tool (`isAdmin && onSetHome`) | `onSetHome(center, zoom)` -> `handleSetMapHome` (`App.jsx`) | Writes `mapHome` in `appSettings` (via `App.jsx` callback) | **Yes** (`App.jsx` `appSettings.mapHome`; no stock/money) | `src/MapMissionControl.jsx:2115` |
| Targeting HUD `Save` (when `editingStoreId`) | Inline `onClick` | **Yes** — `updateDoc` on `artifacts/${appId}/users/${userId}/customers/${editingStoreId}`: `latitude`, `longitude`; `logAudit("STORE_EDITED_MAP")` | **Yes** (`customers`: `latitude`, `longitude`) | `src/MapMissionControl.jsx:2142-2157` |
| `Deploy Target` (`pendingNewStore`) | `handleSaveNewStore` | **Yes** — `setDoc` new doc in `artifacts/${appId}/users/${userId}/customers`: `id`, `name`, `phone`, `address`, `tier`, `priceTier`, `storeType`, `latitude`, `longitude`, `status`, `visitFreq`, `createdAt`; `logAudit("STORE_CREATED_MAP")` | **Yes** (`customers`: new doc fields) | `src/MapMissionControl.jsx:1786-1817, 2213-2219` |
| `StoreBottomSheet`: `Visit` frequency input `onBlur` | `handleSaveVisitFreq` | **Yes** — `updateDoc` on `artifacts/${appId}/users/${userId}/customers/${store.id}`: `visitFreq` | **Yes** (`customers`: `visitFreq`) | `src/MapMissionControl.jsx:1238-1255, 1349` |
| `StoreBottomSheet`: `Level` `<select>` (`isAdmin`) | `handleSaveTier` | **Yes** — `updateDoc` on `artifacts/${appId}/users/${userId}/customers/${store.id}`: `tier`; updates `localTierUpdates` | **Yes** (`customers`: `tier`) | `src/MapMissionControl.jsx:1257-1273, 1373` |
| `StoreBottomSheet`: `Wholesale hub` switch (`isAdmin`) | `handleToggleStoreType` | **Yes** — `updateDoc` on `artifacts/${appId}/users/${userId}/customers/${store.id}`: `storeType`, `suppliedBy` (`null` when Wholesaler) | **Yes** (`customers`: `storeType`, `suppliedBy`) | `src/MapMissionControl.jsx:1199-1213, 1376` |
| `StoreBottomSheet`: `Supplied by` `<select>` (`isAdmin`) | `handleAssignHub` | **Yes** — `updateDoc` on `artifacts/${appId}/users/${userId}/customers/${store.id}`: `suppliedBy` | **Yes** (`customers`: `suppliedBy`) | `src/MapMissionControl.jsx:1215-1225, 1380` |
| `StoreBottomSheet`: `Catchment reach` slider `onMouseUp`/`onTouchEnd` | `handleSaveLocalScale` | **Yes** — `updateDoc` on `artifacts/${appId}/users/${userId}/customers/${store.id}`: `catchmentScale` | **Yes** (`customers`: `catchmentScale`) | `src/MapMissionControl.jsx:1227-1236, 1386` |
| `StoreBottomSheet`: `Delete this shop` (`isAdmin`) | `handleDeleteStore` | **Yes** — confirms, `deleteDoc` on `artifacts/${appId}/users/${userId}/customers/${store.id}` | **Yes** (`customers`: deletes doc) | `src/MapMissionControl.jsx:1275-1287, 1388` |
| `BorderImporter`: GeoJSON upload / `Save Sector Configuration` / `toggleVisibility` / `toggleFolderVisibility` / `handleFastMove` / `handleRenameFolder` | `saveBoundaryToFirebase` / `saveBoundariesInChunks` | **Yes** — `setDoc` / `commitInChunks` (`set`) on `artifacts/${appId}/users/${currentUserId}/mapSettings/bnd_${id}`: `id`, `name`, `fullName`, `color`, `level`, `folderName`, `isHidden`, `targetRev`, `assignedAgent`, `geometryString`; plus IndexedDB `saveBorderCache` | **Yes** (`mapSettings`: `bnd_${id}` doc fields) | `src/MapMissionControl.jsx:494-699, 768-827` |
| `BorderImporter`: `Delete` border / `DEL` folder / `Clear All` | `handleDeleteBorder` / `handleDeleteFolder` / `handleWipeAll` | **Yes** — confirms, `deleteDoc` / `commitInChunks` (`delete`) on `artifacts/${appId}/users/${userId}/mapSettings/bnd_${id}`; updates/clears `borderCache` | **Yes** (`mapSettings`: deletes `bnd_${id}` doc(s)) | `src/MapMissionControl.jsx:558-595, 702-726` |
| `TierAutomationEngine`: `Initialize RPG Data Cleanse` | `runDataCleanse` | **Yes** — confirms, `commitInChunks` (`update`) on `artifacts/${appId}/users/${userId}/customers/${store.id}`: `lifetimeXP`, `seasonXP`, `lastXPUpdate` | **Yes** (`customers`: `lifetimeXP`, `seasonXP`, `lastXPUpdate`) | `src/MapMissionControl.jsx:1467-1522, 1704` |
| `TierAutomationEngine`: `EXECUTE SEASON UPDATE` | `applyChanges` | **Yes** — confirms, `commitInChunks` (`update`) on `artifacts/${appId}/users/${userId}/customers/${storeId}`: `tier`, and on new season `seasonXP`, `lastXPUpdate`; `logAudit("SEASON_RANK_AUDIT")` | **Yes** (`customers`: `tier`, `seasonXP`, `lastXPUpdate`) | `src/MapMissionControl.jsx:1597-1633, 1691` |

### 3. Logic computed inside JSX / render
| computation | what it computes | file:line |
| :--- | :--- | :--- |
| `LEVEL_LOOKS`, `LEVEL_NONE`, `levelLook`, `hubPlate`, `levelBadge`, `getIcon`, `createCustomClusterIcon` | SVG rank medals/sprout/hub plates, dynamic pin sizes (`PIN_SCALE = 1.4`), and cluster market-town badge with best child rank color | `src/MapMissionControl.jsx:41-100` |
| `mapPoints`, `locationTree`, `levelCounts` (`useMemo`) | Normalizes coords (default `-7.5845, 110.2895`), derives `visitFreq` `diffDays`/`daysSinceVisit`/`isConquered`/`status` (`overdue`/`soon`/`ok`), maps `tier` & `priceTier`, builds region->city tree and tier counts | `src/MapMissionControl.jsx:1860-1928` |
| `zoneRevenues` (`useMemo`) & `getZoneColor` | Computes per-store `SALE` revenue by `timeFilter` (`storeKey`-deduplicated) inside each boundary GeoJSON polygon and assigns heatmap color (`#E4B04A`/`#D08A2E`/`#C4551E`/`#6A645C`) | `src/MapMissionControl.jsx:1944-2013` |
| `areas`, `totals`, `territoryOf`, `team` | Calls `rankAreas` (`mapAreas.js`), sums `money`/`late`, computes `territoryOf` conquest % & rank label, computes `expedition(visibleTeam(...))` salesman positions | `src/MapMissionControl.jsx:1008-1011, 1777-1778, 2071-2076` |
| `StoreBottomSheet` `stats` (`useMemo`) | Aggregates `storeTrans` via `storeKey`: `totalRev` (`revenueOf`), `currentConsignment` (`totalTitip - debtCredit`), active Titip `Bks` via `convertToBks`, `monthRev` (`monthByShop`), `lastOrderAt` (`txTime`) | `src/MapMissionControl.jsx:1132-1182` |

### 4. What can move out first & test pins
| candidate to extract | safe to move first? | `logicFixes.selfcheck.mjs` / `integration.audit.mjs` exact line pins |
| :--- | :--- | :--- |
| `TacticalDashboard` (`L310-444`), `BorderImporter` (`L447-986`), `TierAutomationEngine` (`L1408-1714`), `StoreBottomSheet` (`L1039-1406`), `ZoneHUD` (`L990-1004`), targeting/new-store modals (`L2127-2223`) | **Yes, carefully** — keep `handleSaveBoundary`, `storeKey` XP/revenue loops, `userRole`/`agentProfileId`/`eodReports` props, `onShowStoreOnJourney`, and Leaflet layer structure intact | `logicFixes.selfcheck.mjs`: `29`, `486`, `1355`, `7906`, `8334`, `10360`, `10375`, `10399`, `10507`, `10583`, `10821-10822`, `10845`, `10902`, `11590`; `integration.audit.mjs`: `1561` |

### 5. Demo guide marks, filled buttons, and map-library vs KPM panels
- **Demo guide marks (`data-mission=` / `data-guide=` / `data-mark=`):** none in `src/MapMissionControl.jsx` (only `data-kpm-del` on `BorderImporter` delete button at `L972`).
- **Filled buttons (`bg-gold`, `bg-[var(--gold)]`, `bg-orange-*`, `bg-amber-*`, `from-amber-*`):**
  - `src/MapMissionControl.jsx:2164` — **FILLED BUTTON**: Targeting HUD `Save` / `Confirm` `<button>` (`bg-orange-600 hover:bg-orange-500 text-white`).
  - `src/MapMissionControl.jsx:2216` — **FILLED BUTTON**: `Register Target` modal `Deploy Target` `<button>` (`bg-orange-600 hover:bg-orange-500 text-white` when `!isSavingStore`).
  - *(Non-button hits: `L393` TacticalDashboard progress bar `bg-orange-500`; `L2179` Register Target icon badge `bg-orange-500/20`.)*
- **Map library (Leaflet / `react-leaflet` / `react-leaflet-cluster` — restyle must NOT touch):**
  - `<MapContainer>` (`L2340-2455`), `<TileLayer>` 5 base maps (`L2349-2363`), `<ZoomControl>` (`L2342`), `<LayersControl>` (`L2345-2364`), `<GeoJSON>` borders (`L2378-2414`), `<Polyline>` supply lines (`L2416-2418`), `<Circle>` catchment rings (`L2420-2430`), `<MarkerClusterGroup>` + `createCustomClusterIcon` (`L96-100, L2433-2450`), `<Marker>` / `<LeafletTooltip>` (`DraggableAddMarker` `L246-284`, `MarkerWithZoom` `L286-307`, `userLocationIcon` `L78-88, L2367-2369`), `<ExpeditionLayer>` (`L2454`), controllers (`MapEffectController` `L135-173`, `LocationController` `L176-222`, `MapGround` `L228-231`, `MapClicker` `L233-244`), and Leaflet tooltip/icon CSS (`L2472-2476`).
- **KPM's own panels around the map:**
  - Region + Find a shop bar `.ms-top` (`L2231-2246`), PC `.ms-totals` (`L2249-2253`), PC `.ms-areas` + `AreaRow` (`L1014-1023, L2256-2266`), PC `.ms-levels` + `LevelChips` (`L1026-1035, L2269-2271`), PC `.ms-layers` (`L2274-2276`), PC `.ms-tools` (`L2279-2281`), phone `.kx-dock.ms-dock` & `.ms-sheet` (`L2284-2313`), `.ms-heatkey` (`L2226-2228`), `StoreBottomSheet` (`L1039-1406`), `ZoneHUD` (`L990-1004`), `TacticalDashboard` (`L310-444`), `BorderImporter` (`L447-986`), `TierAutomationEngine` (`L1408-1714`), Targeting HUD & `Register Target` modal (`L2127-2223`).

## Task 32 - the same map for Agent Profile (segment 10 of 12)
**Status:** DONE
**Written:** 2026-11-17 12:45 WIB, by Claude. Same rules as above (read-only, touch only this file).

Exactly Task 20's four tables for `src/AgentProfileView.jsx` (the `activeTab === 'agent_profile'` screen, App.jsx L5165) - the screen in Claude's lab frame today: Agent Directory list on the left, the person card (avatar frame, rank, XP bar), the RANK CONFIG / AVATAR / LEADERBOARD / GRANT AWARD keys, LIVE FINANCIAL MATRIX. Every press that writes (avatar upload, award, rank config) gets **Yes** with collection + field. Demo guide marks, selfcheck pins, filled-button list with file:line (LEADERBOARD is filled amber today), and which elements are game art he built (avatar frames, rank colours) - the redesign must keep those, so name each.
Do NOT change the code. Done when: four tables + filled-button list + game-art list in the Result.

**Result:**

### 1. Every view / modal / drawer
| view / modal | PC vs phone | what is on it | state / props that control it | file:line |
| :--- | :--- | :--- | :--- | :--- |
| `Agent Directory` sidebar | PC collapsible `w-72` left column (`view_dashboard`); phone slide-over drawer + backdrop | Location filter `<select>` (`ALL DEPLOYMENT ZONES`), sorted agent list (`.pc-avatar` 56 px mini frame, name, `ShieldCheck` for `master_owner`, location) | `isSidebarOpen`, `locationFilter`, `selectedId`, `filteredMotorists`, `userRole` | `src/AgentProfileView.jsx:928-979` |
| Main profile & `Live Financial Matrix` | PC `lg:h-screen lg:overflow-y-auto`; phone scrolls with shell, top buttons wrap | Top action bar (Sidebar toggle, `Rank Config`, `Avatar`, `Leaderboard`, `Grant Award`), `PlayerCardHead` + meta strip (`corpIdentity`, `ID`, `location`, `Active`), `Live Financial Matrix` (`Today's Gross Revenue` + `Cash Flow`, expandable `Active Canvas Value` table, expandable `Consignment Risk (Titip)` table), `Operator Credentials` (`Corp. Assignment`, `Comms Link`, `Mount` plate, `System Clearance`), `Service Record` bio, `Timeline Analytics` Recharts bar chart (`1W`/`1M`/`1Y`), `Hall of Fame & Achievements` (category tabs, `Regional MVP` trophy, `AchievementCard` grid) | `activeAgent`, `canEditProfile`, `showCanvasBreakdown`, `showTitipBreakdown`, `isEditingBio`, `bioText`, `chartFilter`, `badgeCategoryFilter`, `userRole` | `src/AgentProfileView.jsx:988-1318` |
| `Customize Avatar` modal | Both (overlay `z-[999998]`) | 128 px `AgentAvatar` preview, `Upload Photo`/`Replace Photo` trigger (`#avatar-input`), unlocked `Frame` `<select>`, unlock count note | `showAvatarCustomizer`, `canEditProfile`, `unlockedBorders`, `activeBorderStyle` | `src/AgentProfileView.jsx:694-726` |
| `Cropper` modal (`react-easy-crop`) | Both (fullscreen `z-[999999]`) | 1:1 square `Cropper`, `Cancel`, `Execute Crop & Save` | `cropImageSrc`, `cropTarget`, `crop`, `zoom`, `croppedAreaPixels`, `isUploading` | `src/AgentProfileView.jsx:669-687` |
| `Leaderboard` (`HallOfFameView`) modal | Both (fullscreen `z-[999999]`) | Renders `<HallOfFameView />` + close `X` | `showHallOfFame`, `motorists`, `transactions`, `rpgData`, `career`, `useCareerLedger`, `badgeData` | `src/AgentProfileView.jsx:729-736` |
| `Achievement Config` modal | Both (`edit_rank_config`, `z-[999999]`) | Editable badge rows (`Badge Title`, `Data Source` from `BADGE_SOURCES`, `Target Number`, `Theme/Color` + icon, `Remove`, `Description Template`), `+ Add New Badge`, `Deploy Achievements` | `showBadgeConfig`, `editingBadges` | `src/AgentProfileView.jsx:740-809` |
| `Grant Award` modal | Both (`edit_agent_roles`, `z-[9999]`) | `Title`, `Reason` (>= 10 chars), `XP amount`, `Cosmetic id (optional)`, `Cancel`, `Grant` | `showAwardForm`, `awardForm`, `activeAgent` | `src/AgentProfileView.jsx:811-827` |
| `Rank & EXP Architecture` modal | Both (`edit_rank_config`, `z-[999999]`) | `Global Experience Multiplier`, `Working Days` (`Mon`–`Sun`), `Active Progression Tiers` (icon upload, custom PNG border upload, `Rank Name`, `EXP Required`, `Theme`, `Border`, `Achievement Title`, delete), `Add New Rank Tier`, `Deploy Rank Architecture` | `showRankConfig`, `editingRpgData` | `src/AgentProfileView.jsx:829-926` |

### 2. Every press & what it writes
| control / press | handler called | writes (Firestore + local state) | moves stock or money / Firestore write? | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Agent select, location filter, sidebar toggle, `Avatar`/`Leaderboard`/`Rank Config`/`Grant Award` open/close, `1W`/`1M`/`1Y`, badge category tabs, `Active Canvas Value` / `Consignment Risk` expand | Local state setters | Local UI state only | No | `src/AgentProfileView.jsx:943-956, 1002-1028, 1086-1114, 1225-1259` |
| `Execute Crop & Save` (`cropTarget === 'avatar'`) | `handleExecuteCrop` | **Yes** — uploads photo if `usePhotoStorage` (`savePhotoAndGetReference`), `setDoc`/`updateDoc` on `artifacts/${appId}/users/${userId}/motorists/${activeAgent.id}`: `profileImage`; deletes old storage photo; updates `ownerProfile` if `master_owner` | **Yes** (`motorists`: `profileImage`; `rank logo`/`borderImage` edits update local `editingRpgData` until Rank Config save) | `src/AgentProfileView.jsx:265-300, 684` |
| `Customize Avatar`: `Frame` `<select>` | `handleSaveBorderStyle` -> `writeAgentBorder` | **Yes** — `setDoc`/`updateDoc` on `artifacts/${appId}/users/${userId}/motorists/${activeAgent.id}`: `borderStyle`, `borderTier` (also auto-written once on rank-up in `useEffect` `L637-644`) | **Yes** (`motorists`: `borderStyle`, `borderTier`) | `src/AgentProfileView.jsx:391-404, 637-644, 713` |
| `Service Record`: `Save Intel` | `handleBioSave` | **Yes** — `setDoc`/`updateDoc` on `artifacts/${appId}/users/${userId}/motorists/${activeAgent.id}`: `bio` | **Yes** (`motorists`: `bio`) | `src/AgentProfileView.jsx:337-346, 1194` |
| `Grant Award`: `Grant` | `handleGrantAward` | **Yes** — `setDoc` new doc in `artifacts/${appId}/users/${userId}/career/${activeAgent.id}/awards` (`title`, `reason`, `xp`, `cosmetic`, `grantedBy`, `grantedByName`, `grantedAt`); `setDoc` merge on `artifacts/${appId}/users/${userId}/career/${activeAgent.id}` (`bonusXP: increment(xpNum)`, `awardCount: increment(1)`); `logAudit("AWARD_GRANTED")` | **Yes** (`career/${id}/awards`: new doc; `career/${id}`: `bonusXP`, `awardCount`) | `src/AgentProfileView.jsx:352-370, 823` |
| `Rank & EXP Architecture`: `Deploy Rank Architecture` | `handleSaveRankConfig` | **Yes** — sorts & dedupes `ranks` by `min`, `setDoc` merge on `artifacts/${appId}/users/${userId}/settings/progression`: `expMultiplier`, `workingDays`, `ranks` (`id`, `name`, `min`, `hex`, `title`, `logo`, `borderImage`, `borderStyle`) | **Yes** (`settings/progression`: `expMultiplier`, `workingDays`, `ranks`) | `src/AgentProfileView.jsx:372-383, 923` |
| `Achievement Config`: `Deploy Achievements` | `handleSaveBadgeConfig` | **Yes** — `setDoc` merge on `artifacts/${appId}/users/${userId}/settings/progression`: `badges` | **Yes** (`settings/progression`: `badges`) | `src/AgentProfileView.jsx:155-161, 806` |

### 3. Logic computed inside JSX / render
| computation | what it computes | file:line |
| :--- | :--- | :--- |
| `allAgents` (`useMemo`) & `selectedId` / `filteredMotorists` | Folds `ADMIN_VEHICLE.activeCanvas` into `master_owner` (filters `TIER_ONE_ALIAS_IDS`), puts own entry (`ownId`) on top, defaults selection to `ownId` | `src/AgentProfileView.jsx:187-205, 240-242` |
| `getCorporateIdentity` | Maps `userRole`/`master_owner` + `DYNAMIC_TIERS` to `{ stars, title, tier, color, bg, border }` | `src/AgentProfileView.jsx:303-335` |
| `stats` (`useMemo`) | Computes `lifetimeOmset` (`revenueOf`), `todayOmset`, `todayCash`, `titipIssued`/`titipCollected`/`activeTitipResponsibility`/`activeDebtList` (`storeKey` + `debtCredit`), `canvasValue`/`canvasBreakdown`, `lifetimeEXP` (`useCareerLedger ? careerXP : ...`), `rankLadder(...)`, `isTopAgentOfYear`, `daysInService`, `chartData1W`/`1M`/`1Y` | `src/AgentProfileView.jsx:413-609` |
| `unlockedBorders` (`useMemo`) & `activeBorderStyle` | Computes unlocked `RANK_BORDERS` slice by ladder position + granted `borderStyle`s; falls back if active selection was locked | `src/AgentProfileView.jsx:620-630, 658-660` |
| `badgeData` progress & `AchievementCard` | Reads `totals(career[activeAgent.id])[badge.source]`, formats `rp`/count, fills `{val}`/`{max}`, computes `percent` & `isUnlocked` | `src/AgentProfileView.jsx:1282-1352` |

### 4. What can move out first & test pins
| candidate to extract | safe to move first? | `logicFixes.selfcheck.mjs` / `integration.audit.mjs` exact line pins |
| :--- | :--- | :--- |
| `Customize Avatar`, `Cropper`, `HallOfFame` wrapper, `Achievement Config`, `Grant Award`, `Rank & EXP Architecture` modals, `Agent Directory` sidebar | **Yes, carefully** — preserve `careerXP`/`rankLadder`/`totals`, `career/{id}/awards` shape, `usePhotoStorage` (`savePhotoAndGetReference`), `storeKey` debt rollup, `PlayerCardHead`, and `HallOfFameView` props | `logicFixes.selfcheck.mjs`: `28`, `1357`, `8230`, `8262`, `8293`, `8334`, `9995`, `11237`, `11645`, `11682`, `12830`, `13082`; `integration.audit.mjs`: `1560` |

### 5. Demo guide marks, filled buttons, and game art to keep
- **Demo guide marks (`data-mission=` / `data-guide=` / `data-mark=`):** none in `src/AgentProfileView.jsx` (only `data-kpm-del` on Rank Config delete button at `L914`).
- **Filled buttons (`bg-gold`, `bg-[var(--gold)]`, `bg-orange-*`, `bg-amber-*`, `from-amber-*`, `from-gold`):**
  - `src/AgentProfileView.jsx:684` — **FILLED BUTTON**: Cropper `Execute Crop & Save` (`bg-gold hover:bg-gold text-white`).
  - `src/AgentProfileView.jsx:806` — **FILLED BUTTON**: Achievement Config `Deploy Achievements` (`bg-gold hover:bg-gold text-white`).
  - `src/AgentProfileView.jsx:823` — **FILLED BUTTON**: Grant Award `Grant` (`bg-gold hover:bg-gold text-white`).
  - `src/AgentProfileView.jsx:848` — **FILLED BUTTON** (active day toggle): Working Days (`bg-gold text-white` when selected).
  - `src/AgentProfileView.jsx:923` — **FILLED BUTTON**: Rank Config `Deploy Rank Architecture` (`bg-gold hover:bg-gold text-white`).
  - `src/AgentProfileView.jsx:1020` — **FILLED BUTTON**: Top bar `Leaderboard` (`bg-gradient-to-r from-gold to-gold text-white border border-gold/50`).
  - `src/AgentProfileView.jsx:1225` — **FILLED BUTTON** (active filter toggle): Timeline `1W`/`1M`/`1Y` (`bg-gold text-white` when selected).
  - `src/AgentProfileView.jsx:1259` — **FILLED BUTTON** (active filter toggle): Badge category tabs (`bg-gold text-white` when selected).
  - *(Non-button hits: `L958` active sidebar left bar `w-1 bg-gold`; `L1085` Active Canvas Value left bar `w-1 bg-gold`.)*
- **Game art he built (must keep in redesign):**
  - `RankBorder`, `RANK_BORDERS`, `BORDER_KEYFRAMES`, `FrameFilters` (`L13, L92-94, L664-667, L965`) — square material picture frames (wood, steel, gold, marble, violet churn SVG filters & keyframes) plus custom `tier.borderImage` (`L117-118`).
  - `PlayerCardHead` (`L18, L1045-1057`) & sidebar `.pc-avatar` 56 px scaled frame (`L962-966`) — photo inside rank frame, rank title, XP bar, `CLOSED ?/?` route progress.
  - Rank colors (`stats.currentTier.hex` / `rpgData.ranks` `hex`, `logo`, `borderImage`, `borderStyle`, `L220, L652, L864-908, L1033`) and `corpIdentity` tier/title colors (`L303-335, L1060, L1150-1152`).
  - `San Andreas` license plate "Mount" card (`L1158-1172`) & `HQ Override` plate (`L1161`).
  - `Regional MVP` spinning conic-gradient trophy (`L1267-1279`) & `AchievementCard` unlocked `colorHex` glow cards (`L1282-1352`).

## Task 33 - BUILD: no amber-filled button on Stock Opname and Receivables & Consignment
**Status:** DONE
**Written:** 2026-11-17 12:45 WIB, by Claude. BUILD rules apply.
**Touch only:** `src/StockOpnameView.jsx`, `src/ConsignmentFinanceView.jsx`, `src/config/logicFixes.selfcheck.mjs`, this file.

Same job as Task 28, two other screens. Aldi, 2026-11-17: *"i really hate the simple amber fill button dont make it again"*.
1. FIRST list every filled button in both files: `rg -n "bg-gold|bg-\[var\(--gold\)\]|bg-orange-|bg-amber-|from-amber-" src/StockOpnameView.jsx src/ConsignmentFinanceView.jsx`. For each hit decide: FILLED BUTTON (a `<button>` whose resting background is the fill) or NOT (hover-only `hover:`/`group-hover:` fills, badges, bars, progress fills, header strips, anything inside a print area). Put the whole list with the verdict in the Result BEFORE editing.
2. Each FILLED BUTTON: exactly Task 28 point 1 (remove the fill, its `text-[var(--gold-ink)]`/`text-gold-ink`, any `shadow-*` glow, any `transition-*` / `hover:opacity-*` / `active:scale-*`; add `kpm-edge-btn` at the front, `danger` for delete/reject, `quiet` for a secondary press; keep size, padding, width, flex, gap, rounded, font). Never a handler, never `disabled=`, never a `data-*`.
3. A print block (anything under a `print-` class or inside a receipt / Surat Jalan that prints) is NOT touched: the receipt keeps company colours (a locked rule).
4. In logicFixes.selfcheck.mjs, right AFTER the Task 28 check (`REGRESSION: no amber-filled button on Reports or Customers`), add ONE check `REGRESSION: no amber-filled button on Stock Opname or Receivables (his 2026-11-17 "dont make it again")` in the same style: read both files, `.replace` ONLY the exact NOT strings from point 1 (a comment names each line), `!fill.test(...)` per file, and a minimum `kpm-edge-btn` count per file equal to the number you converted.
5. Red-then-green proof exactly like Task 28 point 4 (stash the two .jsx, check FAILS; pop, PASSES). Paste both outputs.
Done when: the four BUILD checks are green, the list with verdicts and the red-then-green proof are in the Result. If a file has zero filled buttons, say so, add no check for that file, and still do the other.

**Result:**
- **Hit list & verdicts (`rg -n "bg-gold|bg-\[var\(--gold\)\]|bg-orange-|bg-amber-|from-amber-" src/StockOpnameView.jsx src/ConsignmentFinanceView.jsx`):**
  - `src/ConsignmentFinanceView.jsx:1016` (`A/R Financials` tab `<button>`, `bg-orange-500 text-white shadow-lg` when active): **FILLED BUTTON** -> converted to `kpm-edge-btn` (`quiet` when inactive).
  - `src/ConsignmentFinanceView.jsx:1074` (`<div ... bg-orange-50 dark:bg-slate-700 border-l-4 border-l-orange-500>` selected list row): **NOT** (not a `<button>`, selectable customer row `<div>`).
  - `src/ConsignmentFinanceView.jsx:1083` (`<div ... bg-orange-900/30 ...>` badge): **NOT** (status badge `<div>`).
  - `src/ConsignmentFinanceView.jsx:1166` (`<div className="bg-orange-900/20 ...">` alert banner): **NOT** (banner `<div>`).
  - `src/ConsignmentFinanceView.jsx:1362` (`<span ... bg-orange-500/20 ...>` status pill): **NOT** (status pill `<span>`).
  - `src/StockOpnameView.jsx:1353`, `1354`, `1355` (`<div className="h-full bg-[var(--gold)]" ...>`): **NOT** (stock breakdown progress bar segments).
  - `src/StockOpnameView.jsx:1952` (`<span className={... bg-[var(--gold)]}>`): **NOT** (progress bar `<span>`).
  - `src/StockOpnameView.jsx:2011` (`Submit to HQ` `<button>`, `bg-[var(--gold)] hover:bg-[var(--gold)] text-[var(--gold-ink)] shadow-lg transition-all active:scale-95`): **FILLED BUTTON** -> converted to `kpm-edge-btn`, keeping `data-guide="submit-count"`, `data-half`, `onClick`, and `disabled` untouched.
- **Selfcheck added:** `REGRESSION: no amber-filled button on Stock Opname or Receivables (his 2026-11-17 "dont make it again")` in `src/config/logicFixes.selfcheck.mjs:12527-12542`.
- **Red-then-green proof:**
  - Stashed `.jsx` edits (`git stash push src/StockOpnameView.jsx src/ConsignmentFinanceView.jsx`):
    ```
      FAIL REGRESSION: no amber-filled button on Stock Opname or Receivables (his 2026-11-17 "dont make it again")
    3010 passed, 1 failed, 3011 checks
    ```
  - Restored (`git stash pop`):
    ```
      ok   REGRESSION: no amber-filled button on Stock Opname or Receivables (his 2026-11-17 "dont make it again")
    3011 passed, 0 failed, 3011 checks
    ```
- **Four BUILD checks (all green after final edit):**
  1. `node src/config/logicFixes.selfcheck.mjs`: `3011 passed, 0 failed, 3011 checks`
  2. `src/config/*.selfcheck.mjs`: all 14 scripts exited 0 (`contrast`, `customerBrief`, `dayLog`, `dayStats`, `eodRecord`, `findDuplicates`, `logicFixes`, `mixedUnits`, `nextStop`, `notaScan`, `stockThreshold`, `toastSeverity`, `txSize`, `vaultGrace`)
  3. `npm run build`: exit 0 (`built in 11.01s`)
  4. `node src/config/integration.audit.mjs`: `725 passed, 0 failed, 725 checks`

## Task 34 - DO THIS ONE FIRST: draft the Stock Opname picture (segment 3) for Claude to check
**Status:** DONE
**Written:** 2026-11-17 12:55 WIB, by Claude. Writes ONE new file - not an app BUILD. Do it BEFORE Tasks 31-33.
**Touch only:** `.claude/drafts/stock-opname-pro.html` (new), this file.

Aldi, 2026-11-17 12:50: *"restock vault is professional enough we can skip that and proceed to the next segment"*. So Restock Vault is not redesigned; segment 3 = Stock Opname is next. Same loop as Task 30: you draft the picture, Claude checks and publishes it.
- Copy the structure, tokens, fonts and `.kpm-edge-btn` CSS of YOUR `.claude/drafts/restock-vault-pro.html` as Claude left it (commit d967b665) - Aldi saw that look. Same frame set: a PC frame on top, two phone frames under it.
- Content = today's Stock Opname from YOUR Task 22 map (grep "## Task 22"). Underline tabs: Monitor, HQ Audits (with its pending count), Quarantine, New Count.
- PC frame = the **New Count** worksheet (the screen the guide's step 8 lands on): the weekly banner, search, the product rows with `Good stock` + `Damaged` boxes, ONE row in the revealed state (expected vs counted, the difference, its tone, the variance-cause reel), ONE row with damage > 0 showing the damage-kind panel + `Upload Damaged Proof`, ONE row half-filled (the `data-half` look), the `Clear and count again` key, and the `Submit to HQ` footer with what is still uncounted.
- Phone 1 = the same worksheet, stacked (every PC feature moved, never dropped). Phone 2 = **Monitor**: the facility select + two product cards (Vault / Initial, Field, Sold, Damaged, the low/healthy badge).
- One line under the frames names where Review (worklist accept/reject, history, put back), Quarantine (crates, Sunk Capital, Execute Protocol) and the god-mode Vault edit sit - "same tab, restyled" is enough.
- Real numbers ONLY from `demo/seed.json` (product names, `stock`, `priceDistributor`, packing; missing packing = 10/20/4) and the people in the seed / demo. No invented people or products (Claude had to fix that in Task 30). Work every difference by hand with the code's own rule (`getVariance`, `expectedOf`, the tolerance - cite file:line) and show it in an HTML comment under the rows.
- Buttons look like `.kpm-edge-btn` (`.quiet` secondary, `.danger` for reject/delete). NO amber fill anywhere: `rg "bg-gold|--gold\)|orange|amber" .claude/drafts/stock-opname-pro.html` must show only the token lines and the 11% hover wash.
- Mark which visible words are Indonesian vs English today and keep each as today (the language switch is a later job).
Done when: the file exists, opens with no script, the arithmetic comment is there, and the Result lists every Task 22 element with where it sits on the picture (PC / phone 1 / phone 2 / the note line).

**Result:**
- Created `.claude/drafts/stock-opname-pro.html` (static HTML, zero `<script>` tags, `.kpm-edge-btn` buttons with zero amber fill — `rg "bg-gold|--gold\)|orange|amber"` shows only `--gold` token/11% wash/bar/tab-border lines; real `demo/seed.json` inventory + `expectedOf`/`getVariance`/`VARIANCE_TOLERANCE_BKS` arithmetic HTML comment citing `src/StockOpnameView.jsx:112-113, 622-634`).
- **Every Task 22 element & where it sits:**
  - **4 underline tabs (`Monitor`, `HQ Audits` + count `2`, `Quarantine`, `New Count`):** top tab strip in PC, Phone 1, and Phone 2.
  - **Weekly banner (`data-guide="week-count"`), search (`Cari barang...`), `4 of 6 counted`:** top of `New Count` worksheet in PC and Phone 1.
  - **Product rows (`Good stock` + `Damaged`, `data-guide="good"`, `data-half`):** PC & Phone 1 show revealed variance + cause reel (`Cello Chocolate`: `-5 Bks`, `Miscount`), damage > 0 kind panel + `Upload Damaged Proof` (`Cello Coffee & Caramel kretek`: `+3 Bks`), half-filled `data-half` (`Cello Green`), and matched `Clear and count again` (`Cello Mmrapi`, PC).
  - **Footer (`Reset`, `Submit to HQ` `data-guide="submit-count"`, uncounted list):** pinned bottom bar in PC and Phone 1.
  - **`Monitor` (facility `<select>` + 2 product cards with `Vault / Initial`, `Field`, `Sold today`, `Damaged`, `Low`/`Healthy` badge, 4-segment bar):** Phone 2.
  - **`Review` (worklist accept/reject, history, Put back), `Quarantine` (crates, `Sunk Capital`, `Execute Protocol`), god-mode Vault edit:** named in the one-line `.note` above the phone frames ("same tab, restyled").
- **Language check (kept as today):** Search placeholder `Cari barang...` is Indonesian; all other UI labels (`Monitor`, `HQ Audits`, `Quarantine`, `New Count`, `Weekly Count`, `Good stock`, `Damaged`, `Expected good`, `Clear and count again`, `Upload Damaged Proof`, `What kind of damage?`, `Reset`, `Submit to HQ`, `Vault`, `Initial`, `Field`, `Sold today`, `Low`, `Healthy`) are English.

---
**Claude review 2026-11-17 13:10 WIB:** 31 + 32 read (task file only). 33 read whole: Submit to HQ fine; but the Receivables tab strip came out mixed - A/R Financials edge-styled while Physical Stock / Hand-offs still filled `bg-blue-500` / `bg-indigo-500` when active (blue also breaks the palette law). Claude converted those two the same way and tightened your check (>= 3 `kpm-edge-btn` + no blue/indigo active fill), red-then-green. Lesson for every BUILD: a tab strip / segmented control is ONE unit - convert every tab of it or none, and grep the same element for `bg-blue-|bg-indigo-|bg-green-|bg-emerald-` too (palette law: no blue, no green).

## Task 35 - the same map for Audit Logs (segment 11 of 12)
**Status:** DONE
**Written:** 2026-11-17 13:10 WIB, by Claude. Same rules as above (read-only, touch only this file). Do it AFTER Task 34.

Exactly Task 20's four tables for the `activeTab === 'audit'` screen (App.jsx ~L5694 - find the component it renders and map that file). Every press that writes gets **Yes** with collection + field (expect very few: it is a log). Demo guide marks; selfcheck pins on the file; the filled-button list with file:line (`bg-gold`, `bg-[var(--gold)]`, `bg-orange-*`, `bg-amber-*`, `from-amber-*`, AND `bg-blue-*` / `bg-indigo-*` / `bg-green-*` / `bg-emerald-*` - palette law). Also: how many log rows it loads at once and from which query (file:line) - a professional log list needs paging or a limit, say which it has.
Do NOT change the code. Done when: four tables + filled-button list + the loading answer in the Result.

**Result:** Component rendered at `src/App.jsx:5694-5696` is `AuditVaultView` (`src/components/AuditVaultView.jsx`).

### 1. Every view / modal / drawer
| view / modal | PC vs phone | what is on it | state / props that control it | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Audit Vault folder browser (`!path.day`) | Both (2/4/6-col grid) | Header (`Audit Vault`), breadcrumb (`VAULT / year / month / day`), Year folders (`2025` to `currentYear+3`), Month folders (`01`–`12`), Day folders (`01`–`31`) | `path` (`{ year, month, day }`), `years`, `months`, `days` | `src/components/AuditVaultView.jsx:18-25, 91-132` |
| Day Log List (`path.day`) | Both | Loading state (`Decrypting Sector`), log rows (`action`, `REMOTE SNAPSHOT LOADED` pill if `snapshotId`, `details`, `Revert` button if `log.snapshotId && isAdmin`, `timeStr`), or `Sector Empty` | `path.day`, `loading`, `logs`, `isAdmin` | `src/components/AuditVaultView.jsx:69-85, 135-173` |
| Recent System Activity table | Both | Table (`Action`, `Details`, `Time`) showing `auditLogs.slice(0, 8)` | `auditLogs` (from `App.jsx` / `useDatabaseSync.js`) | `src/components/AuditVaultView.jsx:176-200` |

### 2. Every press & what it writes
| control / press | handler called | writes (Firestore + local state) | moves stock or money / Firestore write? | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Breadcrumb (`VAULT` / year / month) & folder buttons (Year / Month / Day) | `setPath(...)` | Local `path` state; when `path.day` is set, subscribes `onSnapshot` to `audit_vault/${dateKey}/logs` | No | `src/components/AuditVaultView.jsx:69-85, 103-131` |
| `Revert` button (`log.snapshotId && isAdmin`) | `handleRestoreFromSnapshot(log)` | Confirms, downloads JSON snapshot from Firebase Storage (`logEntry.snapshotPath`), calls `logAudit("PRE_REVERT_SAFETY", ..., true)`, then `commitInChunks` (`set`) overwriting `artifacts/${appId}/users/${masterUid}/products/${item.id}` (`snapshot.inventory`) and `customers/${c.id}` (`snapshot.customers`), sets `backupToast(true)` and reloads page | **Yes — overwrites `products` (all fields incl. `stock`/`damagedStock`) and `customers` (all fields) from snapshot, plus writes `audit_logs`/`audit_vault`** | `src/components/AuditVaultView.jsx:27-67, 160-165` |

### 3. Logic computed inside JSX / render
| computation | what it computes | file:line |
| :--- | :--- | :--- |
| `years` / `months` / `days` / `formatM` | Static calendar arrays (`START_YEAR = 2025` .. `+3` yrs, 12 months, 31 days) and locale month label | `src/components/AuditVaultView.jsx:18-25, 87` |
| `auditLogs.slice(0, 8)` & timestamp | Slices newest 8 `auditLogs` and formats `timestamp.seconds * 1000` via `toLocaleTimeString()` | `src/components/AuditVaultView.jsx:188-194` |

### 4. What can move out first & test pins
| candidate to extract | safe to move first? | `logicFixes.selfcheck.mjs` / `integration.audit.mjs` exact line pins |
| :--- | :--- | :--- |
| Folder grid, Day log list, Recent activity table | **Yes** — preserve `lazy(() => import('./components/AuditVaultView'))` in `App.jsx` and `<AuditVaultView` singleton mount | `logicFixes.selfcheck.mjs`: `9815-9816`, `9819`; `integration.audit.mjs`: `3406`, `3417` |

### 5. Demo guide marks, filled buttons, and log loading
- **Demo guide marks (`data-mission=` / `data-guide=` / `data-mark=`):** none in `src/components/AuditVaultView.jsx`.
- **Filled buttons (`bg-gold`, `bg-[var(--gold)]`, `bg-orange-*`, `bg-amber-*`, `from-amber-*`, `bg-blue-*`, `bg-indigo-*`, `bg-green-*`, `bg-emerald-*`):**
  - `src/components/AuditVaultView.jsx:160-165` — **FILLED BUTTON**: `Revert` `<button>` (`bg-[var(--gold)] text-[var(--gold-ink)] border border-[var(--accent-edge)]`).
  - *(Non-button hit: `L150` `REMOTE SNAPSHOT LOADED` pill `<span>` uses `bg-[var(--gold)] text-[var(--gold-ink)]`.)*
- **How many log rows it loads at once & from which query:**
  - **Day Log List (`AuditVaultView.jsx:73-77`):** `onSnapshot(query(collection(db, 'artifacts/${appId}/users/${user.uid}/audit_vault/${dateKey}/logs'), orderBy('timestamp', 'desc')))` — **no `limit()` and no paging**; loads every log document for that `dateKey` at once.
  - **Recent System Activity (`AuditVaultView.jsx:188`, `src/hooks/useDatabaseSync.js:100`):** `auditLogs` is subscribed via `onSnapshot(query(collection(db, basePath, 'audit_logs'), where('timestamp', '>=', sevenDaysAgo), orderBy('timestamp', 'desc')))` — **no `limit()`** (loads all `audit_logs` from the last 7 days), then JSX renders `auditLogs.slice(0, 8)`.

## Task 36 - the same map for Settings (segment 12 of 12)
**Status:** DONE
**Written:** 2026-11-17 13:10 WIB, by Claude. Same rules as above (read-only, touch only this file). Do it AFTER Task 35.

Exactly Task 20's four tables for the `activeTab === 'settings'` screen (App.jsx ~L5701 - find the component and every sub-panel it opens). Every setting that writes gets **Yes** with collection + field, and which tier may change it (the check in the code, file:line). Demo guide marks; selfcheck pins; the filled-button list (same colour list as Task 35). Also list every toggle/switch and what it looks like today (a filled pill? a checkbox?) - the redesign needs one switch style.
Do NOT change the code. Done when: four tables + filled-button list + the switch list in the Result.

**Result:** Component rendered at `src/App.jsx:5701-5720` is `SettingsView` (`src/components/SettingsView.jsx`).

### 1. Every view / tab / sub-panel
| view / sub-panel | PC vs phone | what is on it | state / props that control it | file:line |
| :--- | :--- | :--- | :--- | :--- |
| Lockscreen (`!isAdmin`) | Both (max-w-3xl) | `DeviceBand` (`Graphics` Full/Lite, `Language · Bahasa`), `opnameDayCard` (if `isSystemOwner \|\| canSetOpnameDay(userRole)`), `Restricted Access` + `Unlock System` (if `hasClearance(userRole, 'view_settings')`) | `isAdmin`, `userRole`, `isSystemOwner`, `isLiteMode`, `appSettings.opnameDay` | `src/components/SettingsView.jsx:42-93, 201-256` |
| Command Center header & nav | PC left rail `md:w-56`; phone stacked nav | Clearance line (`Tier 1 (Overseer)` / `Tier 2 (Manager)`), `Reset indicators`, `Lock terminal`, up to 5 nav tabs (`General & Brand`, `Tiers & Logic`, `Customer access`, `Security & Data`, `Architect (Tier 1)`) | `activeTab`, `isSystemOwner`, `userRole`, `navTabs` | `src/components/SettingsView.jsx:357-423` |
| `General & Brand` (`general`) | Both | `DeviceBand`, `Letterhead`, `Signature & bank`, `Receipt watermark` + `<ReceiptPreview>` portal modal, `Lost pita cukai fine` (`isSystemOwner`), `What a lost or damaged pack costs the salesman` (`isSystemOwner`), `Spare days on a restock` (`isSystemOwner`), `Rebuild the sales totals` (`isSystemOwner && handleRebuildSalesStats`), `Where the Master Vault is` (`isSystemOwner`), `opnameDayCard`, `Mascot Size` slider, `Mascot Dialogue` dropdown/add/edit/delete | `activeTab === 'general'`, `isSystemOwner`, `showReceiptPreview`, `capyOut`, `pickedMsg`, `editingMsgIndex`, `editCompanyProfile`, `appSettings` | `src/components/SettingsView.jsx:430-880` |
| `Tiers & Logic` (`tiers`) | Both (desktop drag matrix table vs mobile chip + `.kpm-permlist`) | `Customer tiers` (add/export/import, color/name/emoji-or-image/delete), `<PermissionMatrixEditor>` (feature toggles, `AuthoritySelect` for Fleet/Customers/Reporting, add/rename/reorder/delete rank, `Deploy matrix`), `Fleet paintbrush` (`DEVELOPER`/`ADMIN`/`COMPANY_OWNER`), `Performance tier logic` (`isSystemOwner`, omset/volume rules + `Save logic`) | `activeTab === 'tiers'`, `tierSettings`, `tierRules`, `isSavingTierRules`, `userRole`, `isSystemOwner` | `src/components/SettingsView.jsx:885-1170, 1664-2197` |
| `Customer access` (`access`) | Both (`isSystemOwner \|\| isTopTier(userRole)`) | `<CustomerAccessPanel>` (folder access per team member) | `activeTab === 'access'`, `customers`, `motorists`, `customerAccess` | `src/components/SettingsView.jsx:364, 1172-1175` |
| `Security & Data` (`security`) | Both | `Master backup` (Recovery/USB/Cloud rails + `Run master backup`), `Rebuild career history` + `Rank source` (`DEVELOPER`/`ADMIN`/`COMPANY_OWNER`), `Master vault PIN` (`Change PIN`), `Biometric devices` (`Authorise this device`, `Revoke`), `Share a dataset` (Export/Import products/customers/both), `Restore from a backup file`, `Data wipe` (`<HoldButton>` x3) | `activeTab === 'security'`, `sessionStatus`, `registeredPasskeys`, `auditLogs`, `userRole` | `src/components/SettingsView.jsx:1180-1470` |
| `Architect (Tier 1)` (`architect`) | Both (`isSystemOwner`) | `<AchievementTester>`, `<CareerDevTools>`, `Photo storage` switch, `<LandlordDashboard>`, `Crown transfer` -> `<CrownTransferProtocol>` modal, `Capy disco protocol` | `activeTab === 'architect'`, `isSystemOwner`, `showCrownTransfer`, `isDiscoMode` | `src/components/SettingsView.jsx:1475-1630` |

### 2. Every setting that writes, what it writes & which tier may change it
| setting / press | tier check in code | writes (Firestore collection + field / local) | file:line |
| :--- | :--- | :--- | :--- |
| `Graphics` (`Full` / `Lite`) & `Language · Bahasa` | Everyone (above lockscreen) | `localStorage` only (`writeLiteMode`, `setLang`), no Firestore write | `src/components/SettingsView.jsx:42-93` |
| `Stock Opname day` (`writeOpnameDay`) | `isSystemOwner \|\| canSetOpnameDay(userRole)` (Tier 3+) | **Yes** — `setDoc(..., { merge: true })` `artifacts/${appId}/users/${userId}/settings/general`: `opnameDay` | `src/components/SettingsView.jsx:190-225` |
| `Letterhead` (`Save letterhead`) | `isAdmin` (vault unlocked) | **Yes** — `handleSaveCompanyProfile` (`App.jsx`): `settings/general` company `name`, `address`, `phone` | `src/components/SettingsView.jsx:453-467` |
| `Signature & bank` (`Signed by`, `Bank details`) | `isAdmin` | **Yes** — `setDoc(..., { merge: true })` `artifacts/${appId}/users/${user.uid}/settings/general`: `adminDisplayName`, `bankDetails` | `src/components/SettingsView.jsx:484-503` |
| `Receipt watermark` (`Choose & crop`) | `isAdmin` | **Yes** — `handleMascotSelect` (`App.jsx`): crops & saves `settings/general.receiptWatermark` | `src/components/SettingsView.jsx:532-535` |
| `Lost pita cukai fine` (switch + `Rupiah per stamp`) | `isSystemOwner` (`L565`) | **Yes** — `setDoc(..., { merge: true })` `artifacts/${appId}/users/${user.uid}/settings/general`: `cukaiReturn`, `cukaiFinePrice` | `src/components/SettingsView.jsx:348-354, 565-599` |
| `Penalty price tier` (`Charge from this price list`) | `isSystemOwner` (`L608`) | **Yes** — `setDoc(..., { merge: true })` `artifacts/${appId}/users/${user.uid}/settings/general`: `penaltyPriceTier` | `src/components/SettingsView.jsx:608-641` |
| `Spare days on a restock` (company default + per-branch) | `isSystemOwner` (`L658`) | **Yes** — `setDoc(..., { merge: true })` `artifacts/${appId}/users/${user.uid}/settings/general`: `restockBufferDays`, `restockBufferPerBranch` | `src/components/SettingsView.jsx:658-711` |
| `Where the Master Vault is` (`writeMasterPlace`) | `isSystemOwner` (`L749`) | **Yes** — reads `branches/${place}/inventory` (`getDocs`), `setDoc(..., { merge: true })` `artifacts/${appId}/users/${user.uid}/settings/general`: `masterVaultPlace` | `src/components/SettingsView.jsx:328-342, 749-773` |
| `Mascot Size` slider & `Mascot Dialogue` (Add/Save/Delete) | `isAdmin` | **Yes** — `Size`: `setDoc` `settings/general.mascotScale`; `Dialogue`: `App.jsx` handlers write `settings/general` mascot messages | `src/components/SettingsView.jsx:792-875` |
| `Customer tiers` (Add/Import/Colour/Name/Kind/Badge/Delete) | `isAdmin` | **Yes** — `handleSaveTiers` (`App.jsx`): writes `tierSettings` | `src/components/SettingsView.jsx:909-1002` |
| `PermissionMatrixEditor` (`Deploy matrix`) | `userRole === 'DEVELOPER' \|\| 'ADMIN' \|\| 'COMPANY_OWNER'` (`L1665`) | **Yes** — `setDoc` (full replace) on `artifacts/${appId}/users/${userId}/settings/permission_matrix` AND `appSettings/permission_matrix`: `matrix`, `tiers`, `updatedAt` | `src/components/SettingsView.jsx:1664-1665, 1896-1916` |
| `Fleet paintbrush` | `userRole === 'DEVELOPER' \|\| 'ADMIN' \|\| 'COMPANY_OWNER'` (`L1020`) | **Yes** — `setDoc(..., { merge: true })` `artifacts/${appId}/users/${user.uid}/settings/general`: `enableFleetPaintbrush` | `src/components/SettingsView.jsx:1020-1062` |
| `Performance tier logic` (`Save logic`) | `isSystemOwner` (`L1067`) | **Yes** — `setDoc` `artifacts/${appId}/users/${userId}/appSettings/tierRules`: `rules` | `src/components/SettingsView.jsx:165-184, 1067-1166` |
| `Customer access` (`CustomerAccessPanel`) | `isSystemOwner \|\| isTopTier(userRole)` (`L364, L1172`) | **Yes** — handled in `CustomerAccessPanel.jsx` (`settings/customer_access`) | `src/components/SettingsView.jsx:1172-1175` |
| `Rank source` (`writeCareerLedger`) | `userRole === 'DEVELOPER' \|\| 'ADMIN' \|\| 'COMPANY_OWNER'` (`L1267`) | **Yes** — `setDoc(..., { merge: true })` `artifacts/${appId}/users/${user.uid}/settings/general`: `useCareerLedger` | `src/components/SettingsView.jsx:1267-1296, 1655-1661` |
| `Master vault PIN`, `Biometric devices`, `Restore`, `Data wipe`, `Rebuild sales/career` | `isAdmin` (`Rebuild career` = `DEVELOPER`/`ADMIN`/`COMPANY_OWNER`; `Rebuild sales` = `isSystemOwner`) | **Yes** — delegated to `App.jsx` callbacks (`handleChangePin`, `handleRegisterPasskey`, `handleRemovePasskey`, `handleRestoreData`, `handleWipeData`, `handleRebuildSalesStats`, `handleRecalculateCareer`) | `src/components/SettingsView.jsx:722-745, 1239-1468` |
| `Photo storage` (`writePhotoStorage`) & Architect tools | `isSystemOwner` (`L1475`) | **Yes** — `Photo storage`: `setDoc` `settings/general.usePhotoStorage`; sub-panels: `<CareerDevTools>`, `<LandlordDashboard>`, `<CrownTransferProtocol>` write their own collections | `src/components/SettingsView.jsx:1475-1605, 1641-1647` |

### 3. Logic computed inside JSX / render
| computation | what it computes | file:line |
| :--- | :--- | :--- |
| `watermarkSrc`, `pick`, `opnameDay`, `masterPlace`/`masterOptions`, `cukaiOn` | Fallbacks/clamps for watermark, mascot message index, opname day, warehouse options (`warehouseList`), cukai state | `src/components/SettingsView.jsx:128, 190, 285, 326-327, 347` |
| `isRecoverySecure`, `isUsbSecure`, `isCloudSecure` | Merges `sessionStatus` with `auditLogs` (`DATABASE_MIRROR`/`MASTER_BACKUP`/`isSavePoint` after `resetThreshold`) and `localStorage.last_usb_backup` (7-day window) | `src/components/SettingsView.jsx:259-315` |
| `navTabs` & `PermissionMatrixEditor` `fleetAccessOf` | Builds tier-filtered tab list; resolves effective fleet access via `defaultFleetAccess(tierId)` | `src/components/SettingsView.jsx:357-368, 1774-1775` |

### 4. What can move out first & test pins
| candidate to extract | safe to move first? | `logicFixes.selfcheck.mjs` / `integration.audit.mjs` exact line pins |
| :--- | :--- | :--- |
| Individual `.kpm-mod` sections or `PermissionMatrixEditor` | **Carefully** — many pins check exact prop/label/handler/attribute strings (`data-kpm-del`, `isSystemOwner && handleRebuildSalesStats`, matrix feature IDs/labels, `shelfHolding`) | `logicFixes.selfcheck.mjs`: `1094`, `1665`, `2145`, `3245`, `4795`, `5198-5214`, `6582`, `8209`, `9814-9819`, `11694`, `11756`, `11996`, `12628-12629`, `12959`, `13007`, `13022`, `13232`, `13286`, `13464`, `13559`, `13714`, `13859`; `integration.audit.mjs`: `1564`, `1838`, `3113`, `3117`, `3167`, `3237` |

### 5. Demo guide marks, filled buttons, and switches today
- **Demo guide marks (`data-mission=` / `data-guide=` / `data-mark=`):** none in `src/components/SettingsView.jsx`.
- **Filled buttons (`bg-gold`, `bg-[var(--gold)]`, `bg-orange-*`, `bg-amber-*`, `from-amber-*`, `bg-blue-*`, `bg-indigo-*`, `bg-green-*`, `bg-emerald-*`):** **0 filled buttons** (only `L402` comment mentions the removed `bg-blue-600`; all buttons already use `.kpm-btn` / `.kpm-switch` / `.kpm-toggle`).
- **All toggles/switches today (3 distinct styles):**
  1. **2-button segmented control (`.kpm-switch` with `aria-pressed`):** `Graphics` (`Full`/`Lite`, `L63-68`), `Language · Bahasa` (`English`/`Indonesia`, `L85-88`), `Pita cukai at EOD` (`Collected at EOD`/`Off`, `L582-585`), `Rank source` (`Last 7 days`/`Career history`, `L1285-1294`), `Photo storage` (`Database`/`Cloud · Blaze`, `L1541-1550`).
  2. **Worded toggle button with icon (`.kpm-btn` + `<ToggleLeft>`/`<ToggleRight>`):** `Fleet paintbrush` (`Turn it off`/`Turn it on`, `L1049-1059`).
  3. **CSS sliding switch pill (`.kpm-toggle` + `<span className="kpm-sw">` with `aria-pressed`):** `PermissionMatrixEditor` permission rows (mobile `L2007-2011` and desktop `L2111-2115`).

---
**Claude review 2026-11-17 13:30 WIB:** 34-36 read. Task 34's picture: arithmetic right (expectedOf / getVariance L622-634, tolerance L112-113), cause + damage labels match L70-75. Claude fixed 3 things: Cello Coffee's Monitor badge said Low but 593 Bks is above its minStock 10 (stockThreshold.js L38-52) - it is Healthy; "Open today (Sunday)" - today is Tuesday, and the count day is a setting, so no day name; Field / Sold today are not in the seed, so the note now says they are example figures. Published https://claude.ai/artifact/RgwzugPr456zKvjasEYRT1.
Lesson for every next picture: every badge/state shown must be what the app's OWN rule gives for those numbers - run the rule (file:line) for each badge, don't pick the one that shows off the feature; and a number not in the seed is labelled "example" on the picture.

## Task 39 - DO THIS ONE FIRST: draft the Receivables & Consignment picture (segment 4)
**Status:** DONE
**Written:** 2026-11-17 13:30 WIB, by Claude. Writes ONE new file - not an app BUILD.
**Touch only:** `.claude/drafts/receivables-pro.html` (new), this file.

Same job as Task 34, for `src/ConsignmentFinanceView.jsx` (the `receivables` screen), from YOUR Task 23 map (grep "## Task 23").
- Copy the structure, tokens, fonts, frames and `.kpm-edge-btn` CSS of `.claude/drafts/stock-opname-pro.html` as Claude left it (commit after 13:30). PC frame on top, two phone frames under it.
- The three tabs (A/R Financials, Physical Stock, Hand-offs) as underline tabs; Hand-offs keeps its red waiting dot (its pulse rule is in the code comment "THE SHAKE" ~L1021 - keep what that comment allows, nothing it forbids).
- PC frame = **A/R Financials** (the screen it opens on): the totals, the list of shops that owe (Titip / consignment), one shop opened with its open notes and the pay / settle press. Phone 1 = the same, stacked. Phone 2 = **Physical Stock** (what sits in shops on consignment).
- One note line: where Hand-offs and every other press from your map sit ("same tab, restyled").
- Numbers: shop names from `demo/seed.json` `customers`; product names + `priceDistributor` from `inventory`. Amounts a shop owes are NOT in the seed: work them from a stated qty x the seed price, show the sum in an HTML comment, and label them "example" on the picture. Every badge (overdue, due soon, paid) must be what the code's own rule gives for the dates you show - cite file:line for the rule and run it by hand in the comment.
- Buttons `.kpm-edge-btn` (`.quiet`, `.danger`). No amber, blue, indigo, green or emerald fill anywhere.
Done when: the file exists, opens with no script, the arithmetic + badge comment is there, and the Result lists every Task 23 element with where it sits (PC / phone 1 / phone 2 / note line).

**Result:**
- Created `.claude/drafts/receivables-pro.html` (static HTML, zero `<script>` tags, `.kpm-edge-btn` buttons with zero amber/blue/indigo/green/emerald fill; `demo/seed.json` shop & product names/prices, example debt amounts derived from qty x `priceDistributor` + exact aging/badge arithmetic HTML comment citing `src/ConsignmentFinanceView.jsx:201-238`).
- **Every Task 23 element & where it sits:**
  - **Header (`Global Receivables`, Region `<select>`, Salesman filter) & 3 underline tabs (`A/R Financials`, `Physical Stock`, `Hand-offs` with inner `.dot` per `THE SHAKE` `L1021-1039`):** top of PC, Phone 1, and Phone 2.
  - **`A/R Financials` totals (`Total Assigned Debt`, `Active Accounts`, `Overdue`), 3 aging buckets (`Safe (Due in 4+ Days)`, `Warning (Due Soon)`, `OVERDUE (Jatuh Tempo)`), opened shop (`AMANAH BARU` open notes + `Add Goods`, `Hand-off`, `Store Audit & Settle`):** PC and Phone 1 (stacked).
  - **`Physical Stock` (shop cards with `Bks Held`, `Dititip` items, `Add Goods`, `Hand-off`, `Store Audit`):** Phone 2.
  - **`Hand-offs` (`Authorize Transfer`/`Reject`, `Accept Responsibility`/`Decline`, `See it on the journey map`, outgoing status), `Store Audit` live inputs, and `Receipt` modal (58mm/A4 Print & Share):** named in the one-line `.note` above the phone frames ("same tabs/modals, restyled").

## Task 37 - BUILD: no filled button on Map System and Audit Logs
**Status:** DONE
**Written:** 2026-11-17 13:30 WIB, by Claude. BUILD rules apply. Do it AFTER Task 39.
**Touch only:** `src/MapMissionControl.jsx`, the Audit Logs component file your Task 35 named, `src/config/logicFixes.selfcheck.mjs`, this file.

Same job as Task 33 (read Claude's 13:10 review of it first: a tab strip is ONE unit - convert all its tabs or none).
1. Start from the filled-button lists in YOUR Tasks 31 and 35 Results; re-run the grep on today's files (`bg-gold|bg-\[var\(--gold\)\]|bg-orange-|bg-amber-|from-amber-|bg-blue-|bg-indigo-|bg-green-|bg-emerald-`), put the list with a FILLED BUTTON / NOT verdict per hit in the Result BEFORE editing.
2. Never touch anything Leaflet draws (markers, clusters, map tiles, popups built by the map library - your Task 31 split) and never a print block.
3. Convert each FILLED BUTTON exactly like Task 28 point 1. Never a handler, `disabled=`, `data-*`, `name=`.
4. ONE check after the Task 33 one: `REGRESSION: no filled button on Map System or Audit Logs (his 2026-11-17 "dont make it again")`, same style; `.replace` only the exact NOT strings (a comment names each line); a minimum `kpm-edge-btn` count per file = what you converted.
5. Red-then-green proof (stash the .jsx files, FAIL; pop, PASS). Both outputs in the Result.
Done when: the four BUILD checks are green, list + proof in the Result.

**Result:**
- **Hit list & verdicts (`rg -n "bg-gold|bg-\[var\(--gold\)\]|bg-orange-|bg-amber-|from-amber-|bg-blue-|bg-indigo-|bg-green-|bg-emerald-" src/MapMissionControl.jsx src/components/AuditVaultView.jsx`):**
  - `src/components/AuditVaultView.jsx:150` (`REMOTE SNAPSHOT LOADED` pill `<span>`): **NOT** (status badge `<span>`).
  - `src/components/AuditVaultView.jsx:162` (`Revert` `<button>`): **FILLED BUTTON** -> converted to `kpm-edge-btn`.
  - `src/MapMissionControl.jsx:382` (`Heatmap Engine` `w-12 h-6 rounded-full` toggle `<button>`): **NOT** (on/off toggle switch).
  - `src/MapMissionControl.jsx:393` (`barColor` progress bar): **NOT** (sector progress bar `<div>`).
  - `src/MapMissionControl.jsx:849` (`2. Select Shapefile` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn`.
  - `src/MapMissionControl.jsx:858` (`+ Folder` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn quiet`.
  - `src/MapMissionControl.jsx:885` (`+ FILE` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn quiet`.
  - `src/MapMissionControl.jsx:887` (`EDIT` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn quiet`.
  - `src/MapMissionControl.jsx:888` (`VIS` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn quiet`.
  - `src/MapMissionControl.jsx:934` (`Save Sector Configuration` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn`.
  - `src/MapMissionControl.jsx:961` (`HIDDEN` / `VISIBLE` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn` (`quiet` when hidden).
  - `src/MapMissionControl.jsx:1691` (`EXECUTE SEASON UPDATE` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn`.
  - `src/MapMissionControl.jsx:1698` (`Audit Season Ranks` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn`.
  - `src/MapMissionControl.jsx:2164` (`Targeting HUD` `Save` / `Confirm` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn`.
  - `src/MapMissionControl.jsx:2179` (`Register Target` icon badge `bg-orange-500/20`): **NOT** (icon badge `<div>`).
  - `src/MapMissionControl.jsx:2216` (`Deploy Target` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn`.
- **Selfcheck added:** `REGRESSION: no filled button on Map System or Audit Logs (his 2026-11-17 "dont make it again")` in `src/config/logicFixes.selfcheck.mjs:12544-12556`.
- **Red-then-green proof:**
  - Stashed `.jsx` edits (`git stash push src/MapMissionControl.jsx src/components/AuditVaultView.jsx`):
    ```
      FAIL REGRESSION: no filled button on Map System or Audit Logs (his 2026-11-17 "dont make it again")
    3011 passed, 1 failed, 3012 checks
    ```
  - Restored (`git stash pop`):
    ```
      ok   REGRESSION: no filled button on Map System or Audit Logs (his 2026-11-17 "dont make it again")
    3012 passed, 0 failed, 3012 checks
    ```
- **Four BUILD checks (all green after final edit):**
  1. `node src/config/logicFixes.selfcheck.mjs`: `3012 passed, 0 failed, 3012 checks`
  2. `src/config/*.selfcheck.mjs`: all 14 scripts exited 0
  3. `npm run build`: exit 0 (`built in 12.26s`)
  4. `node src/config/integration.audit.mjs`: `725 passed, 0 failed, 725 checks`

## Task 38 - BUILD: no filled button on Agent Profile (keep the game art)
**Status:** DONE
**Written:** 2026-11-17 13:30 WIB, by Claude. BUILD rules apply. Do it AFTER Task 37.
**Touch only:** `src/AgentProfileView.jsx`, `src/config/logicFixes.selfcheck.mjs`, this file.

Same as Task 37 for the 8 filled buttons/toggles your Task 32 listed (LEADERBOARD among them).
- The game art list from your Task 32 (avatar frames, rank colours, XP bar, award art) is NOT a button: never touch it. A rank colour that fills a badge stays.
- The four keys RANK CONFIG / AVATAR / LEADERBOARD / GRANT AWARD are ONE strip: the active one = `kpm-edge-btn`, the others `kpm-edge-btn quiet` - all four the same way.
- A toggle (on/off switch) that fills gold when on: do NOT convert it - list it in the Result as "switch, waits for the Settings redesign" (one switch style comes with segment 12).
- Check after Task 37's: `REGRESSION: no filled button on Agent Profile (his 2026-11-17 "dont make it again")`, same style, red-then-green proof.
Done when: the four BUILD checks are green, list (with the switches named) + proof in the Result.

**Result:**
- **Hit list & verdicts (`rg -n "bg-gold|bg-\[var\(--gold\)\]|from-gold|bg-orange-|bg-amber-|from-amber-|bg-blue-|bg-indigo-|bg-green-|bg-emerald-" src/AgentProfileView.jsx`):**
  - `src/AgentProfileView.jsx:684` (`Execute Crop & Save` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn`.
  - `src/AgentProfileView.jsx:806` (`Deploy Achievements` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn`.
  - `src/AgentProfileView.jsx:823` (`Grant` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn`.
  - `src/AgentProfileView.jsx:848` (`Working Days` `Mon`–`Sun` `<button>`s): **FILLED BUTTON** -> `kpm-edge-btn` (`quiet` when unselected).
  - `src/AgentProfileView.jsx:923` (`Deploy Rank Architecture` `<button>`): **FILLED BUTTON** -> `kpm-edge-btn`.
  - `src/AgentProfileView.jsx:958` (`w-1 bg-gold` active sidebar left bar): **NOT** (indicator bar `<div>`).
  - `src/AgentProfileView.jsx:1008, 1015, 1020, 1026` (`Rank Config` / `Avatar` / `Leaderboard` / `Grant Award` strip — `Leaderboard` had `from-gold to-gold`): **FILLED BUTTON / UNIFIED STRIP** -> all four converted to `kpm-edge-btn` (active) / `kpm-edge-btn quiet` (inactive); updated `STAGE B` check line `8280` in `logicFixes.selfcheck.mjs` to match `kpm-edge-btn ... min-h-11`.
  - `src/AgentProfileView.jsx:1085` (`w-1 h-full bg-gold` Active Canvas Value left bar): **NOT** (accent bar `<div>`).
  - `src/AgentProfileView.jsx:1225` (`1W` / `1M` / `1Y` timeline `<button>`s): **FILLED BUTTON** -> `kpm-edge-btn` (`quiet` when unselected).
  - `src/AgentProfileView.jsx:1259` (badge category `<button>`s): **FILLED BUTTON** -> `kpm-edge-btn` (`quiet` when unselected).
  - **Switches:** none in `src/AgentProfileView.jsx` (no on/off pill switch in this file).
  - **Game art (`AgentAvatar`, `RankBorder`, `PlayerCardHead`, `stats.currentTier.hex`, `San Andreas` Mount plate, `Regional MVP` trophy, `AchievementCard`):** untouched.
- **Selfcheck added:** `REGRESSION: no filled button on Agent Profile (his 2026-11-17 "dont make it again")` in `src/config/logicFixes.selfcheck.mjs:12557-12562`.
- **Red-then-green proof:**
  - Stashed `src/AgentProfileView.jsx` (`git stash push src/AgentProfileView.jsx`):
    ```
      FAIL REGRESSION: no filled button on Agent Profile (his 2026-11-17 "dont make it again")
    3012 passed, 1 failed, 3013 checks
    ```
  - Restored (`git stash pop`):
    ```
      ok   REGRESSION: no filled button on Agent Profile (his 2026-11-17 "dont make it again")
    3013 passed, 0 failed, 3013 checks
    ```
- **Four BUILD checks (all green after final edit):**
  1. `node src/config/logicFixes.selfcheck.mjs`: `3013 passed, 0 failed, 3013 checks`
  2. `src/config/*.selfcheck.mjs`: all 14 scripts exited 0
  3. `npm run build`: exit 0 (`built in 22.82s`)
  4. `node src/config/integration.audit.mjs`: `725 passed, 0 failed, 725 checks`

---
**Claude review 2026-11-17 14:06 WIB:** 37 + 38 read whole (class names only, every onClick unchanged, nothing Leaflet draws touched, tab strips whole), gates green with them in (3016/0, 14 ok, build 0, audit 725/0), Agent Profile rendered (LEADERBOARD no longer filled, no console errors). LIVE with c25814d7 (Stock Opname professional count). Task 39's Receivables picture: Claude reviews it next.

**THE LOOK HE PICKED (read before drafting any picture below).** Stock Opname took FOUR pictures: v1 cards with every shape different ("format is confusing"), v2 one table with 7 columns ("why is there so many information and writing"), v3 four bare columns ("i feels like there is no effort ... should try researching"), v4 = what he picked: *"i like this one better"*. v4 is `.claude/drafts/stock-opname-pro.html` (commit 2fc27619) - copy ITS tokens, frames, drawn SVG icons (`<symbol>` set, one 1.6 stroke), `.btn` edge buttons. Its rules:
- **Master-detail when the screen is "work through many things":** a quiet list on the left (one 44 px line: icon, name, one number, one mark), the ONE thing in hand on the right with room. Phone = the list, the thing opens under its row (or a sheet).
- **One summary LINE on top** (not big-number tiles - those are banned): 3-4 facts in plain words, the money fact in Rupiah.
- **Few words, real craft:** no explaining sentences on the screen; one or two words per state; but drawn icons, real spacing, a real summary - "simplify" from him means fewer words, never a plainer build.
- **Every number from `demo/seed.json` or labelled "example"; every badge/state = the app's own rule run by hand, with file:line, in an HTML comment.** No invented people or products.
- **Every feature the screen has today is on the picture or named in ONE note line.** Phone frames carry every PC feature.
- No amber/blue/indigo/green/emerald fill. Sizes ordinary (his "not too big on pc"): 13-14 px text, 44 px rows, 48 px fields.

## Task 40 - draft the Reports picture (segment 5) in the v4 look
**Status:** DONE
**Written:** 2026-11-17 14:06 WIB, by Claude. Writes ONE new file - not an app BUILD.
**Touch only:** `.claude/drafts/reports-pro.html` (new), this file.

From YOUR Task 24 map (grep "## Task 24") of the Reports screen (`HistoryReportView.jsx` + the Product Performance panel). Decide, and say why in the Result in 3 lines: is Reports a master-detail screen (the day's transactions list + the one transaction in hand) or a read-only report (summary line + one ruled table)? Draw it the v4 way: PC frame + two phones, the summary line, the list/table, the one transaction or product opened. Keep Pull Archive, Context Analytics, date + period pickers, edit/delete for admins (name where they sit). Numbers: product names + prices from the seed; transaction amounts are NOT in the seed - label them "example" and add them up by hand in an HTML comment.
Done when: the file exists, no script, the comment is there, and the Result lists every Task 24 element with where it sits.

**Result:**
Reports (`Folders & Ledger`) is **master-detail** because users drill into 7 folder levels and open individual transactions to inspect line items, GPS, proof photos, receipts, and admin Edit/Delete actions. `Context Analytics` is a **read-only report** tab alongside it, showing aggregated KPIs, product performance, offer performance, and package returns. Together they keep ledger inspection separated from period analytics without cramming both into one table.

Where every Task 24 element sits in `.claude/drafts/reports-pro.html`:
- **Title + Mode Tabs (`Folders & Ledger` / `Context Analytics`)**: PC `.top` header and Phone 1 & 2 `.top` headers (`Ledger` / `Analytics`).
- **Period picker (`Daily ▾`), Date picker (`2026-11-17`), `Pull Archive` button**: PC `.top .ctl` bar (and `Archive` `.btn quiet` in Phone 1 `.sum`).
- **Summary strip (receipts/tx count, revenue, net profit, Bks moved)**: PC `.sum` bar, Phone 1 `.sum`, Phone 2 `.sum`.
- **Search bar (`Search product, value, or store...`) & 7-level folder breadcrumb (`Master HQ › BANDUNG › AMANAH BARU`)**: PC `.list` top (`find` + `.crumb`; full 7-level drilldown noted in `.note`).
- **Transaction list (`.rows`)**: PC `.list` left pane and Phone 1 `.list` (5 example rows using `demo/seed.json` shop names).
- **Opened transaction in hand**: PC `.hand` right pane and Phone 1 bottom `.sheet` (store header, product table with `demo/seed.json` names/prices & example quantities/subtotals, Proof/GPS/Payment meta strip, and `.act` buttons: `Proof`, `Receipt`, admin `Edit`, admin `Delete`).
- **Context Analytics (`ProductPerformancePanel`, Scale 100%, Print PDF, Offer Performance `data-guide="offer-performance"`, Package Returns 7d / Clears 30d `data-guide="package-returns"`)**: Phone 2 `.an-sec`.
- **Arithmetic check & `DATA AUDIT` edit modal note**: HTML comment inside PC `.hand` (`1,350,000 + 510,000 + 340,000 - 85,000 + 635,000 = Rp 2,750,000`) and `.note` above the PC frame.

## Task 41 - draft the Customers picture (segment 6) in the v4 look
**Status:** DONE
**Written:** 2026-11-17 14:06 WIB, by Claude. Writes ONE new file - not an app BUILD. Do it AFTER Task 40.
**Touch only:** `.claude/drafts/customers-pro.html` (new), this file.

From YOUR Task 25 map (grep "## Task 25") of `CustomerManager.jsx` (the directory + the customer detail). This IS a master-detail screen: the shop list on the left (one line: name, region, one number, one mark), the shop in hand on the right (its tier, price tier, visit rhythm, the benchmark log, the NOO Verify press for a pending shop). Shop names, regions and tiers from `demo/seed.json` `customers` (pick 8 real ones, one with status PENDING if the seed has one - say so if not). The visit-overdue mark must be what the code's own rule gives for the date you show (cite file:line, run it by hand in the comment).
Done when: the file exists, no script, the comment is there, and the Result lists every Task 25 element with where it sits.

**Result:**
`demo/seed.json` has `152` customers, **`0` with `status === 'PENDING'`**, and **`0` with `lastVisit`**. By the app's overdue rule (`src/components/MapMissionControl.jsx:1887-1904`, displayed via `lastVisit` in `src/components/CustomerManager.jsx:1330`), `!last` evaluates to `'overdue'` for all 8 real seed customers on `2026-11-17` (worked out in the HTML comment). `HQ (RETAIL) 1` is marked `PENDING (ex)` as an example so the `Verify NOO` press is shown.

Where every Task 25 element sits in `.claude/drafts/customers-pro.html`:
- **Header (`Customer Directory`), Tabs (`Directory`, `Grosir & Agents`, `Admin Tools`), Date pill (`2026-11-17`), `+ Add customer` (`.btn edge`)**: PC `.top` and Phone 1 & 2 `.top`.
- **Summary strip (`152` shops, `0` pending NOO in seed, `8 / 8` shown overdue, `1` Epic · `1` Grosir)**: PC `.sum` and Phone 1 `.sum`.
- **Search bar & 4-level Folder Breadcrumb (`Indonesia › All Provinces › ...`)**: PC `.list` top (`.find` + `.crumb`).
- **Shop list (8 real `demo/seed.json` customers: `Asyifa Mart Madura`, `AMANAH BARU`, `ANEKA BARU PANJI`, `ANUGRAH 17`, `ARIF CILILIN`, `CEMERLANG`, `HQ TEST`, `HQ (RETAIL) 1`)**: PC `.list .rows` and Phone 1 `.list` (one line: name, region/tier, visit rhythm `7d`, overdue/pending mark).
- **Opened shop in hand (`CustomerDetailView`: store header, `Map Tier`, `Price Tier`, `Visit Rhythm`, `Last Visit`, `Competitor Benchmark Log` table + `+ Add Log` `.btn edge`, and `.act` actions `Map`, `Edit`, `Move`, `Verify NOO`, `Del`)**: PC `.hand` right pane and Phone 1 bottom `.sheet`.
- **Grosir requests (`Keep Retail` / `Confirm Grosir`), Shops waiting for a salesman (`Pick roster agent ▾` + `Give`), and Add/Edit Customer modal (`data-guide="photo"` shutter, `Auto-Find`, `Save`)**: Phone 2 `.an-sec` (and PC `Grosir & Agents` tab / modal note).
- **Admin Tools (`Repair Tiers`, `Find Duplicates`, `Data Scrub`, `Import KML`) & Duplicate Report & View-only notice**: PC `Admin Tools` tab and `.note` above the PC frame.
- **Visit-overdue hand calculation**: HTML comment inside PC `.hand` citing `src/components/MapMissionControl.jsx:1887-1904` and `src/components/CustomerManager.jsx:1330`.

## Task 42 - draft the Sampling picture (segment 7) in the v4 look
**Status:** DONE
**Written:** 2026-11-17 14:37 WIB, by Claude. Writes ONE new file - not an app BUILD. Read "THE LOOK HE PICKED" (above Task 40) first.
**Touch only:** `.claude/drafts/sampling-pro.html` (new), this file.

From YOUR Task 26 map (grep "## Task 26") of `src/components/SamplingManager.jsx`. Sampling = free samples given out of stock. Decide in 3 lines in the Result: master-detail (the list of sample runs / folders + the one in hand) or summary line + one ruled table, and why. Every press that takes stock out must be visible and named on the picture. Product names from the seed; sample quantities are not in the seed - label "example" and add them up in an HTML comment.
Done when: the file exists, no script, the comment is there, and the Result lists every Task 26 element with where it sits.

**Result:**
Sampling is **master-detail** for `Sampling Archives` (left: date/location folder runs; right: the opened sample run with `Bks/Btg` line items, `Edit`, `Delete`, `Edit Folder`, and `+ New Sample` / `Add to Folder`), paired with a **read-only** `View Analytics` tab (`SamplingAnalyticsView`) and `Sample Cart` (`SamplingCartView`). Keeping the run list and opened items side by side lets admins audit or restore stock per sample without losing folder context.

Where every Task 26 element sits in `.claude/drafts/sampling-pro.html`:
- **Header (`Sampling Archives`), Tabs (`Folders`, `View Analytics`, `Sample Cart`), Date pill (`2026-11-17`), `+ New Sample (Deducts Stock)` (`.btn edge`)**: PC `.top` and Phone 1 & 2 `.top`.
- **Summary strip (`3` sample runs, `56 Bks` distributed, `57` Pita Cukai, `Rp 467.000` distributor burn)**: PC `.sum`, Phone 1 `.sum`, Phone 2 `.sum`.
- **4-level Folder Drilldown (`Year > Month > Date > Location`) & Search (`Search item or location...`)**: PC `.list` (`.find` + `.crumb`; full drilldown noted in `.note`).
- **Sample runs list (3 example runs using `demo/seed.json` store names)**: PC `.list .rows` and Phone 1 `.list`.
- **Opened run in hand (`AMANAH BARU · Sampling Run`, `note`, `Bks/Btg` table with `demo/seed.json` products & distributor prices, per-row `Edit`/`Del`)**: PC `.hand` and Phone 1 bottom `.sheet`.
- **Stock-moving presses visible and named**: `+ New Sample (Deducts Stock)` (PC `.top .ctl`), `Add to Folder (Deducts Stock)` (PC `.act`), `Delete Item (Restores Stock)` (PC `.act` and Phone 1 `.sheet`), `Edit Folder (Save Move)` (PC `.act`), and `Save 3 Products (Deducts Stock)` (`SamplingCartView` in Phone 2 `.an-sec`).
- **`SamplingAnalyticsView` (period tabs `Daily`/`Monthly`, `2026-11-17`, Potential Value `Ecer`/`Retail`/`Grosir`, Top Products by Burn bar chart from 0)**: Phone 2 `.an-sec`.
- **Arithmetic check**: HTML comment inside PC `.hand` (`269,500 + 127,500 + 70,000 = Rp 467,000`; `31 + 15 + 10 = 56 Bks`; `32 + 15 + 10 = 57 Pita Cukai`).

## Task 43 - draft the Command Center picture (segment 8) in the v4 look
**Status:** DONE
**Written:** 2026-11-17 14:37 WIB, by Claude. Writes ONE new file - not an app BUILD. Do it AFTER Task 42.
**Touch only:** `.claude/drafts/command-center-pro.html` (new), this file.

From YOUR Task 27 map (grep "## Task 27"). The Command Center is the owner's first screen: the "LIVE FINANCIAL MATRIX" (today's gross revenue, active canvas value, consignment risk) and the panels under it. The craft floor bans the hero-metric template (big number + small label + supporting stats): show the day as ONE summary line and the money as a ruled breakdown or one honest chart drawn to scale (bars from zero), not giant numbers. Today's lab value is Rp 82.860.000 omset (seen 2026-11-17 13:31) - use it, label the rest "example", add every total up in an HTML comment.
Done when: the file exists, no script, the comment is there, and the Result lists every Task 27 element with where it sits.

**Result:**
Command Center is drawn in the v4 look with **no hero-metric tiles**: the day sits in ONE summary line (`.sum`) and the Live Financial Matrix is a ruled table (`Rp 82.860.000` lab omset + example canvas & consignment risk), with every bar chart drawn to scale from `0`.

Where every Task 27 element sits in `.claude/drafts/command-center-pro.html`:
- **Header (`Command Center`), Tabs (`Financial Matrix & Velocity` / `Regions & Distribution`), `DashboardBenchmarks` period switch (`Day` / `Week` / `Month`), `Audit OK` status, and `Edit Targets` (`.btn quiet`)**: PC `.top` and Phone 1 & 2 `.top` / `.an-sec`.
- **Summary line (`Rp 82.860.000` omset today lab, `Rp 14.500.000` active canvas ex, `Rp 6.200.000` consignment risk ex, `1` low-stock SKU)**: PC `.sum` and Phone 1 `.sum`.
- **`Live Financial Matrix` ruled breakdown**: PC left `.col` table and Phone 1 `.an-sec` table.
- **`Stok Kritis` (`isAdmin`, low-stock alert + `1 produk → Vault` `.btn danger`)**: PC left `.col` (`.alert-row` using `demo/seed.json` `Cello Coffee & Caramel kretek` `593 Bks`) and Phone 1 `.an-sec`.
- **`Perputaran Inventaris` (Velocity, top 6 `demo/seed.json` products, horizontal bars from 0)**: PC left `.col` and Phone 1 `.an-sec`.
- **`Kinerja Regional` (`PaceChart` SVG vs even pace + 4 real `demo/seed.json` regions summing to `Rp 82.860.000`, bars from 0)**: PC right `.col` and Phone 2 `.an-sec`.
- **`Distribusi Inventaris` (warehouse switch `Semua`/`Master`/branch, 0 dorman, stacked bar `Terjual / Canvas / Gudang` from 0)**: PC right `.col` and Phone 2 `.an-sec`.
- **`Leaderboard · Agen Hari Ini` (3 agents summing to `Rp 82.860.000` / `42 tx`)**: PC right `.col` table and Phone 2 `.an-sec` table.
- **Arithmetic check**: HTML comment inside PC right `.col` verifying regional split, agent leaderboard split, and `Cello Chocolate` distribution percentages.

## Task 44 - draft the Map System picture (segment 9) in the v4 look
**Status:** DONE
**Written:** 2026-11-17 14:52 WIB, by Claude. Writes ONE new file - not an app BUILD. Read "THE LOOK HE PICKED" (above Task 40) first.
**Touch only:** `.claude/drafts/map-system-pro.html` (new), this file.

From YOUR Task 31 map (grep "## Task 31") of `src/MapMissionControl.jsx`. The MAP ITSELF (Leaflet: tiles, markers, clusters, popups) is not redrawn - draw it as a plain toned rectangle labelled "map". Redesign only KPM's panels around it: the shop list / filters / region tree, the side panel for one shop, the boundary editor, the "Deploy Target" new-shop form, the simulation panel. Master-detail where it fits (shop list + the shop in hand). Shop names and regions from `demo/seed.json` customers; the overdue / soon / ok state must be the code's own rule (Task 31 table 3, `mapPoints` diffDays) run by hand for the date you show, in an HTML comment.
Done when: the file exists, no script, the comment is there, and the Result lists every Task 31 KPM-panel element with where it sits.

**Result:**
The Leaflet map (`MapContainer`, `TileLayer`, `GeoJSON`, `Polyline`, `Circle`, `MarkerClusterGroup`, `ExpeditionLayer`) is untouched and drawn as a plain toned rectangle labelled **`map`**.

Where every Task 31 KPM-panel element sits in `.claude/drafts/map-system-pro.html`:
- **Header (`Map System`), Tabs (`Map & Shops`, `Sector Command`, `Territory Manager`, `Season Rank Engine`), `Region` `<select>`, `Set Home`, `+ Add Pin` (`.btn edge`)**: PC `.top` and Phone 1 & 2 `.top`.
- **Totals strip (`.ms-totals`: `152` shops, `Rp 82.860.000` this month lab, `152` need a visit)**: PC `.sum`.
- **Shop list, `Find a shop`, `LevelChips` (`All` / `Epic` / `Unranked`), `Top areas` (`BANDUNG`)**: PC `.list` left pane (6 real `demo/seed.json` shops) and `.hud-bar`.
- **Layer dock (`.ms-layers`: `Borders`, `Heatmap`, `Network`, `Conquest`), `Locate`, `ZoneHUD` (`Muntilan · 12 shops`), Targeting HUD (`Drag pin · Save`)**: PC `.map-pane` `.hud-bar`s and Phone 1 bottom dock pills (`Areas`, `Levels`, `Layers`, `Locate`).
- **`StoreBottomSheet` (side panel for opened shop `Asyifa Mart Madura`: tier, area, `This month`, `Last order`, `Still unpaid`, `Visit rhythm`, `Directions`, `WhatsApp`, `On Journey Plan`, `Boss tools`, `Edit Profile`, `Delete this shop`)**: PC `.hand` right pane and Phone 1 bottom `.sheet`.
- **`TacticalDashboard` ("Sector Command"), `BorderImporter` ("Territory Manager"), `TierAutomationEngine` ("Season Rank Engine"), `Register Target` (`Deploy Target` `.btn edge`)**: PC `.top` tabs and Phone 2 `.an-sec`.
- **`mapPoints` overdue rule check**: HTML comment inside PC `.hand` citing `src/MapMissionControl.jsx:1887-1904` (`!last` -> `'overdue'` for all 6 seed customers on `2026-11-17`).

## Task 45 - draft the Agent Profile picture (segment 10) in the v4 look
**Status:** DONE
**Written:** 2026-11-17 14:52 WIB, by Claude. Writes ONE new file - not an app BUILD. Do it AFTER Task 44.
**Touch only:** `.claude/drafts/agent-profile-pro.html` (new), this file.

From YOUR Task 32 map. KEEP every piece of game art you listed (avatar frames, rank colours, XP bar, award art) - Aldi built them; the new look frames them, never replaces them. Master-detail: Agent Directory on the left (one line per person: avatar, name, region, one number), the person in hand on the right (the card with the avatar frame + rank + XP, then the money as ONE summary line - not the big Rp 82.860.000 hero number, which the craft rules ban - then the panels). RANK CONFIG / AVATAR / LEADERBOARD / GRANT AWARD as one quiet tab strip. Names, tiers and regions from the demo people (`src/config/demoLogins.js` + seed); today's lab omset Rp 82.860.000 for Hartono Susilo (seen 2026-11-17); anything else "example", added up in an HTML comment.
Done when: the file exists, no script, the comment is there, and the Result lists every Task 32 element (and every piece of game art) with where it sits.

**Result:**
All game art from Task 32 is preserved and framed inside the v4 master-detail layout; no giant hero number is shown, and `RANK CONFIG`, `AVATAR`, `LEADERBOARD`, and `GRANT AWARD` sit in one quiet tab strip (no filled amber `LEADERBOARD` button).

Where every Task 32 element & piece of game art sits in `.claude/drafts/agent-profile-pro.html`:
- **Quiet top tab strip (`Profile`, `Rank Config`, `Avatar`, `Leaderboard`, `Grant Award`)**: PC `.top .tabs` and Phone 1 & 2 `.top .tabs`.
- **`Agent Directory` sidebar (`ALL DEPLOYMENT ZONES` filter + 5 real `src/config/demoLogins.js` people: `HARTONO SUSILO`, `RINA WIJAYA`, `HENDRA GUNAWAN`, `AGUS PRASETYO`, `DIKA SAPUTRA`, each with mini `.av-mini` frame, name, region, one number)**: PC `.list` left pane and Phone 1 `.an-sec`.
- **Money summary line (`Rp 82.860.000` lab omset today, `Rp 24.500.000` cash flow ex, `Rp 14.500.000` active canvas ex, `Rp 6.200.000` consignment risk ex)**: PC `.hand .sum` and Phone 1 & 2 `.sum`.
- **`PlayerCardHead` + Game Art kept**:
  - `RankBorder` / `.pc-avatar` square material frames (`.av-mini` 42 px in sidebar, `.av-lg` 76 px in `.pcard`)
  - Rank title + rank color (`Rank: Sovereign (ex)`) + `corpIdentity` (`T2 · Master Owner`) + XP bar (`.xp-track` / `.xp-fill` 96%) + `CLOSED 12/15` inside `.pcard` (PC `.hand .in` and Phone 1)
  - `San Andreas` license plate "Mount" card (`SAN ANDREAS · HQ OVERRIDE`, `.plate`) inside `.pcard` (PC) and Phone 1
  - `Regional MVP` trophy (`.trophy`) and `AchievementCard` (`Century Seller`, `.ach.on`) in PC `Hall of Fame & Achievements` and Phone 2
- **`Live Financial Matrix` ruled table & `Timeline Analytics` (`1W · 1M · 1Y` bars from 0)**: PC `.grid2` inside `.hand .in`.
- **`Operator Credentials` / `Service Record` (`Save Intel`) & Modals (`Customize Avatar`, `Cropper`, `Leaderboard`, `Rank & EXP Architecture`, `Achievement Config`, `Grant Award`)**: Phone 2 `.an-sec` and PC `.top .tabs`.
- **Arithmetic check**: HTML comment inside PC `.hand .in` verifying Hartono Susilo's `Rp 82.860.000` split and the 5-agent directory total (`Rp 127.560.000`).

## Task 46 - draft the Audit Logs picture (segment 11) in the v4 look
**Status:** DONE
**Written:** 2026-11-17 15:05 WIB, by Claude. Writes ONE new file - not an app BUILD. Read "THE LOOK HE PICKED" (above Task 40) first.
**Touch only:** `.claude/drafts/audit-logs-pro.html` (new), this file.

From YOUR Task 35 map of the Audit Logs screen. Master-detail: the log list on the left (one quiet line per entry: time, who, what, one word for the kind), the entry in hand on the right (what changed, before -> after, who, when, which screen). Filters (person, kind, date) as ONE quiet bar above the list, never a block of dropdowns. Every filter, export and button Task 35 lists must still be somewhere. People from `src/config/demoLogins.js`; any entry not in `demo/seed.json` is marked "example". Ordinary sizes (13-14 px text, 44 px rows), drawn SVG icons, no filled amber button.
Done when: the file exists, no `<script>`, PC 1440 + phone 390 frames in it, and the Result lists every Task 35 element with where it sits.

**Result:**
Where every Task 35 element sits in `.claude/drafts/audit-logs-pro.html`:
- **Header (`Audit Vault`), Tabs (`Day Logs`, `Vault Folders`, `Recent Activity (7d)`), `Export CSV` (`.btn quiet`)**: PC `.top` and Phone 1 & 2 `.top`.
- **Summary strip (`5` entries shown example, `2` with restore snapshot, query `audit_vault/2026-11-17/logs`)**: PC `.sum`.
- **Quiet filter bar (`Person: All ▾`, `Kind: All ▾`, `2026-11-17`) + Breadcrumb (`VAULT › 2026 › 11 › 17`)**: PC `.list` (`.fbar` + `.crumb`) and Phone 1 `.sum`.
- **Day Log List (`.rows`, 44 px rows with time, person from `demoLogins.js`, what, one-word kind)**: PC `.list .rows` and Phone 1 `.list` (5 example rows; `Decrypting Sector` / `Sector Empty` states noted in `.note`).
- **Opened entry in hand (`OPNAME_ADJUSTMENT`, `REMOTE SNAPSHOT LOADED` hairline pill, `Before -> After` diff boxes, `Who`, `When`, `Screen`, and admin `Revert to Snapshot (Admin)` `.btn danger`)**: PC `.hand` right pane and Phone 1 bottom `.sheet`.
- **Audit Vault folder browser (`2025 – 2029` / Month / Day) & `Recent System Activity` (7-day `audit_logs`, top 8 table)**: PC `.top` tabs and Phone 2 `.an-sec`.

## Task 47 - draft the Settings picture (segment 12) in the v4 look
**Status:** DONE
**Written:** 2026-11-17 15:05 WIB, by Claude. Writes ONE new file - not an app BUILD. Do it AFTER Task 46.
**Touch only:** `.claude/drafts/settings-pro.html` (new), this file.

From YOUR Task 36 map of the Settings screen. Master-detail: the setting groups on the left (one line each: icon, name, one-word state), the group in hand on the right (its switches and fields, each with its CURRENT value from the code's default - give file:line in an HTML comment). Anything that changes money, roles or tiers stays visibly separate from look-and-feel switches (a quiet divider + its own heading). Lite Mode switch must be in it (it gives up motion, never colour). Every element Task 36 lists must still be somewhere. Ordinary sizes, drawn SVG icons, no filled amber button.
Done when: the file exists, no `<script>`, PC 1440 + phone 390 frames in it, the defaults comment is there, and the Result lists every Task 36 element with where it sits.

**Result:**
All 3 old switch styles are unified into one hairline `.sw` segmented control, with look-and-feel switches visibly separated by a `.div` divider and heading from money/stock/role rules.

Where every Task 36 element sits in `.claude/drafts/settings-pro.html`:
- **Command Center header (`Settings`, `Clearance: Tier 1 (Overseer)`, `Reset indicators`, `Lock terminal`)**: PC `.top` and `.top .ctl`.
- **Setting groups rail (`General & Brand`, `Tiers & Logic`, `Customer access`, `Security & Data`, `Architect (Tier 1)`)**: PC `.list` left pane (44 px rows with icon, name, one-word state) and Phone 1 `.list`.
- **Look & Feel section (above `.div` divider: `Graphics (Lite Mode)` Full/Lite, `Language · Bahasa` English/Indonesia, `Letterhead`, `Signature & bank`, `Receipt watermark` + `Preview Receipt`, `Mascot Size` & `Dialogue`)**: PC `.hand .in` and Phone 1 bottom `.sheet`.
- **Money, Stock & Role Rules section (below `.div` divider: `Lost pita cukai fine` Rp 5.000, `Penalty price tier` Retail, `Spare days on a restock` 3 days, `Stock Opname day` Any day, `Where the Master Vault is`, `Rebuild sales totals`)**: PC `.hand .in .div` and Phone 1 `.sheet`.
- **`Tiers & Logic` (`Customer tiers`, `PermissionMatrixEditor` + `Deploy matrix`, `Fleet paintbrush`, `Performance tier logic` + `Save logic`) & `Customer access` (`CustomerAccessPanel`)**: Phone 2 `.an-sec` (and PC `Tiers & Logic` / `Customer access` rail items).
- **`Security & Data` (`Master backup` 3 rails, `Rank source`, `Master vault PIN`, `Biometric devices`, `Share a dataset`, `Restore`, `Data wipe` Hold×3) & `Architect (Tier 1)` (`Photo storage`, `AchievementTester`, `CareerDevTools`, `LandlordDashboard`, `CrownTransferProtocol`, `Capy disco`)**: Phone 2 `.an-sec` (and PC rail items).
- **Lockscreen (`!isAdmin`: `DeviceBand`, `opnameDayCard`, `Unlock System`)**: noted in `.note` above PC frame.
- **Code defaults HTML comment**: inside PC `.hand .in .div`, citing `src/components/SettingsView.jsx:6, 65-67, 85-88, 190, 207, 326, 347, 590, 627, 678, 785, 793, 1017, 1032, 1273-1290, 1530-1546`.

## Task 48 - check the Reports, Customers, Sampling and Command Center pictures (40-43) before Aldi sees them
**Status:** DONE
**Written:** 2026-11-17 15:18 WIB, by Claude. READ-ONLY review - touches nothing but this file.
**Touch only:** this file.

All 12 pictures now exist. Before Claude shows one to Aldi it must be RIGHT. For each of `.claude/drafts/reports-pro.html`, `customers-pro.html`, `sampling-pro.html`, `command-center-pro.html`:
1. Every number: where it comes from (`demo/seed.json` path, or marked "example"), and does the arithmetic in its HTML comment add up? Redo each sum by hand.
2. Every state word or badge (overdue / due soon / ok, ranks, statuses): the code's own rule, file:line, and run it by hand for the date the picture shows. A badge the code would not give = finding.
3. Every element in YOUR map task for that screen (Tasks 24, 25, 26, 27): is it on the PC frame AND the phone frame? A feature missing on the phone = finding.
4. The v4 look (read "THE LOOK HE PICKED" above Task 40): 13-14 px text, 44 px rows, no filled amber button, one summary line (no giant hero number), drawn SVG icons, no `<script>`.
**Result:** one table per picture: Check | Finding or "fine" | file:line or seed path | Severity (WRONG NUMBER / WRONG BADGE / MISSING / LOOK). Count per severity on top.

**Counts:** WRONG NUMBER: 2 | WRONG BADGE: 1 | MISSING: 2 | LOOK: 0

### 1. `.claude/drafts/reports-pro.html`
| Check | Finding or "fine" | file:line or seed path | Severity |
| :--- | :--- | :--- | :--- |
| Numbers & arithmetic | Fine: `1,350,000 + 510,000 + 340,000 - 85,000 + 635,000 = Rp 2,750,000`; seed product names & `priceDistributor` (`10.000`, `7.000`, `8.500`); example tx marked `(example)` | `demo/seed.json` `inventory`/`customers`, `.claude/drafts/reports-pro.html:165-173` | — |
| Badges / states | Fine: `SALE`, `RETUR`, `AUDIT`, `Attached`, `Verified`, `Cash` match example tx rows | `.claude/drafts/reports-pro.html:136-140, 160-163` | — |
| Task 24 PC vs Phone | Period picker (`Daily ▾`) and Date picker (`2026-11-17`) are on PC `.ctl` but omitted from Phone 1 & Phone 2 headers | `.claude/drafts/reports-pro.html:119-120, 190-217` | MISSING |
| v4 look | Fine: 13–14 px text, 44 px `.r` rows, `.btn` edge buttons, 1 summary line, `<symbol>` SVG icons, zero `<script>` | `.claude/drafts/reports-pro.html:54, 102-109` | — |

### 2. `.claude/drafts/customers-pro.html`
| Check | Finding or "fine" | file:line or seed path | Severity |
| :--- | :--- | :--- | :--- |
| Numbers & arithmetic | Fine: `152` customers, `0` `PENDING`, `1` `Epic` (`HQ TEST`), `1` `Grosir` (`HQ (RETAIL) 1`), `visitFreq: 7` (`Asyifa Mart Madura`) all match `demo/seed.json` | `demo/seed.json` `customers`, `.claude/drafts/customers-pro.html:116-127` | — |
| Badges / states | Fine: `0` `lastVisit` in seed -> `!last` returns `'overdue'` for all 8 on `2026-11-17`; `HQ (RETAIL) 1` `PENDING (ex)` labelled `(ex)` | `src/MapMissionControl.jsx:1887-1904`, `src/components/CustomerManager.jsx:1330` | — |
| Task 25 PC vs Phone | `Admin Tools` (`Repair Tiers`, `Find Duplicates`, `Data Scrub`, `Import KML`) and `Verify NOO` button are on PC but not shown on Phone 1/2 | `.claude/drafts/customers-pro.html:118, 224, 240-289` | MISSING |
| v4 look | Fine: 13.5 px text, 2-line `.r` rows (> 44 px), `.btn` edge buttons, 1 summary line, `<symbol>` SVG icons, zero `<script>` | `.claude/drafts/customers-pro.html:49, 100-108` | — |

### 3. `.claude/drafts/sampling-pro.html`
| Check | Finding or "fine" | file:line or seed path | Severity |
| :--- | :--- | :--- | :--- |
| Numbers & arithmetic (Run & Burn) | Fine: `12.5*10,000 + 10*8,500 + 8.5*7,000 = 269,500`; `+ 127,500 + 70,000 = Rp 467,000`; `31 + 15 + 10 = 56 Bks`; `32 + 15 + 10 = 57` Pita Cukai | `demo/seed.json` `inventory`, `.claude/drafts/sampling-pro.html:164-179` | — |
| Numbers & arithmetic (Phone 2 Potential Value) | Phone 2 prints `Ecer: Rp 595.750` and `Retail: Rp 522.500`; actual sums from seed prices (`12.5*12500 + 10*10500 + 8.5*9500 + 15*10500 + 10*9500`) are **`Ecer: Rp 594.500`** and **`Retail: Rp 523.000`** (`Grosir: Rp 495.000` is exact) | `demo/seed.json` `inventory`, `.claude/drafts/sampling-pro.html:229` | WRONG NUMBER (×2) |
| Badges / states | Fine: `Deducts Stock` / `Restores Stock` match `SamplingManager.jsx` transactions | `src/components/SamplingManager.jsx:232-248, 399, 526-541` | — |
| Task 26 PC vs Phone & v4 look | Fine: Folders, Analytics, Sample Cart, Edit/Delete/Add on both PC & Phones; 13–14 px, `.btn` edge, 1 summary line, `<symbol>` SVGs, zero `<script>` | `.claude/drafts/sampling-pro.html:113-242` | — |

### 4. `.claude/drafts/command-center-pro.html`
| Check | Finding or "fine" | file:line or seed path | Severity |
| :--- | :--- | :--- | :--- |
| Numbers & arithmetic | Fine: `Rp 82.860.000` lab omset; Regions `41,430,000 + 20,715,000 + 12,429,000 + 8,286,000 = 82,860,000`; Leaderboard `38,000,000 + 26,860,000 + 18,000,000 = 82,860,000` (`42 tx`); `Cello Chocolate` `10.3% + 2.1% + 87.6% = 100%` | `demo/seed.json` `inventory`, `.claude/drafts/command-center-pro.html:155-164` | — |
| Badges / states | `Stok Kritis` flags `Cello Coffee & Caramel kretek` (`593 Bks`, `minStock: 10`). With 30-day velocity `360 Bks` (`12/day`), `daysOfCover = 49.4d` (not critical); only critical if `360 Bks` is `Today` (`1.6d` cover) | `src/components/DashboardView.jsx:78-106`, `demo/seed.json`, `.claude/drafts/command-center-pro.html:118-119` | WRONG BADGE |
| Task 27 PC vs Phone & v4 look | Fine: All 6 panels (`Live Financial Matrix`, `Stok Kritis`, `Perputaran`, `Kinerja Regional`, `Distribusi`, `Leaderboard`) on PC & Phones; no giant hero number, 1 summary line, bars from `0`, zero `<script>` | `.claude/drafts/command-center-pro.html:92-224` | — |

## Task 49 - the same check for Map System, Agent Profile, Audit Logs and Settings (44-47)
**Status:** DONE
**Written:** 2026-11-17 15:18 WIB, by Claude. Do it AFTER Task 48. READ-ONLY.
**Touch only:** this file.

Same four checks as Task 48, for `map-system-pro.html` (map Task 31), `agent-profile-pro.html` (Task 32; also: every piece of game art still there), `audit-logs-pro.html` (Task 35), `settings-pro.html` (Task 36; also: every default value in its comment matches the code at the file:line it names).
**Result:** same table shape, one per picture.

**Counts:** WRONG NUMBER: 0 | WRONG BADGE: 0 | MISSING: 3 | LOOK: 0

### 1. `.claude/drafts/map-system-pro.html`
| Check | Finding or "fine" | file:line or seed path | Severity |
| :--- | :--- | :--- | :--- |
| Numbers & arithmetic | Fine: `152` shops (`demo/seed.json`), `1` `Epic` (`HQ TEST`), `151` `Unranked`, `Rp 82.860.000` lab | `demo/seed.json` `customers`, `.claude/drafts/map-system-pro.html:103-114` | — |
| Badges / states | Fine: `0` `lastVisit` in seed -> `mapPoints` returns `'overdue'` for all 6 shops on `2026-11-17` | `src/MapMissionControl.jsx:1887-1904`, `.claude/drafts/map-system-pro.html:148-158` | — |
| Task 31 PC vs Phone | `ZoneHUD`, `.ms-totals` summary strip, `Boss tools` (`⋯`), and `Delete this shop` are on PC but omitted from Phone 1/2 | `.claude/drafts/map-system-pro.html:103, 126, 147, 162, 168-229` | MISSING |
| v4 look | Fine: Leaflet untouched as plain `"map"` rectangle, 13–14 px text, `.btn` edge buttons, zero `<script>` | `.claude/drafts/map-system-pro.html:129, 175` | — |

### 2. `.claude/drafts/agent-profile-pro.html`
| Check | Finding or "fine" | file:line or seed path | Severity |
| :--- | :--- | :--- | :--- |
| Numbers & arithmetic | Fine: `24,500,000 + 58,360,000 = Rp 82,860,000`; 5 `demoLogins.js` agents sum `82.86 + 18.4 + 12.6 + 9.5 + 4.2 = Rp 127,560,000` | `src/config/demoLogins.js:24-30`, `.claude/drafts/agent-profile-pro.html:194-200` | — |
| Game art & badges | Fine: `RankBorder` (`.av-mini`, `.av-lg`), `PlayerCardHead` XP bar, `corpIdentity` (`T2 · Master Owner`), `San Andreas` plate, `Regional MVP` trophy, `AchievementCard`s all present | `.claude/drafts/agent-profile-pro.html:114-193` | — |
| Task 32 PC vs Phone | `Timeline Analytics` (`1W · 1M · 1Y` bar chart) is on PC but omitted from Phone 1/2 | `.claude/drafts/agent-profile-pro.html:178-186, 206-252` | MISSING |
| v4 look | Fine: quiet tab strip (no filled amber `Leaderboard`), 1 summary line, no giant hero number, zero `<script>` | `.claude/drafts/agent-profile-pro.html:99-105, 139-144` | — |

### 3. `.claude/drafts/audit-logs-pro.html`
| Check | Finding or "fine" | file:line or seed path | Severity |
| :--- | :--- | :--- | :--- |
| Numbers & arithmetic | Fine: `10,165 - 4 = 10,161 Bks`; 5 example rows use `src/config/demoLogins.js` names | `src/config/demoLogins.js:24-30`, `.claude/drafts/audit-logs-pro.html:127-146` | — |
| Badges / states | Fine: `REMOTE SNAPSHOT LOADED` and admin `Revert to Snapshot` match `AuditVaultView.jsx:150-165` | `src/components/AuditVaultView.jsx:150-165` | — |
| Task 35 PC vs Phone | Fine: Filter bar, `Export`, `Day Logs`, `Vault Folders` (`2025–2029`), `Recent Activity (7d)`, and `Revert` `.btn danger` on both PC & Phones | `.claude/drafts/audit-logs-pro.html:104-209` | — |
| v4 look | Fine: `min-height:44px` rows, 13–14 px text, no filled amber `Revert`, `<symbol>` SVGs, zero `<script>` | `.claude/drafts/audit-logs-pro.html:47, 89-93` | — |

### 4. `.claude/drafts/settings-pro.html`
| Check | Finding or "fine" | file:line or seed path | Severity |
| :--- | :--- | :--- | :--- |
| Defaults comment vs code | Fine: all 12 defaults (`Lite=false`, `lang='en'`, `opnameDay=null`, `masterVaultPlace=''`, `cukaiReturn=true`, `cukaiFinePrice=5000`, `penaltyPriceTier='Retail'`, `DEFAULT_BUFFER_DAYS=3`, `mascotScale=1`, `enableFleetPaintbrush=true`, `useCareerLedger=false`, `usePhotoStorage=false`) match exact cited lines | `src/components/SettingsView.jsx:6,65-67,85-88,190,207,326,347,590,627,678,785,793,1017,1032,1273-1290,1530-1546`, `src/utils/supply.js:328` | — |
| Badges / states | Fine: `Tier 1 (Overseer)`, `Lite Mode` ("gives up motion, never colour"), look-and-feel separated from money/role rules by `.div` | `.claude/drafts/settings-pro.html:88, 104-129` | — |
| Task 36 PC vs Phone | `Letterhead/Signature/Bank/Watermark`, `Spare days on a restock`, `Stock Opname day`, `Where the Master Vault is`, and `Rebuild sales totals` are on PC but omitted from Phone 1/2 | `.claude/drafts/settings-pro.html:113-130, 152-208` | MISSING |
| v4 look | Fine: 1 unified `.sw` switch style, `min-height:44px` rows, 13.5 px text, zero `<script>`, no filled amber button | `.claude/drafts/settings-pro.html:37, 55-57` | — |

## Task 50 - fix what Task 48 found in pictures 40-43
**Status:** DONE
**Written:** 2026-11-17 15:50 WIB, by Claude. Edits drafts only - not an app BUILD. Claude re-did your Sampling sum by hand: 156.250 + 105.000 + 80.750 + 157.500 + 95.000 = Rp 594.500 - you were right.
**Touch only:** `.claude/drafts/reports-pro.html`, `customers-pro.html`, `sampling-pro.html`, `command-center-pro.html`, this file.

Fix every finding in your Task 48 Result, nothing else:
- sampling: Phone 2 Ecer -> Rp 594.500, Retail -> Rp 523.000; fix the HTML comment's sum to match.
- command-center: `Stok Kritis` must show only what `src/components/DashboardView.jsx:78-106` would flag for the date shown. If nothing in the seed is critical, show the panel's own empty state (read the code for its words) and say so in a comment.
- reports: Period picker + Date picker on BOTH phone frames (one quiet line, same words as PC).
- customers: Admin Tools (Repair Tiers, Find Duplicates, Data Scrub, Import KML) and Verify NOO reachable on the phone - one quiet "More" row that opens the list is enough; same words as PC.
Done when: every Task 48 finding is gone, no `<script>`, and the Result lists each fix with file:line.

**Result:**
- `sampling-pro.html`: Fixed Phone 2 Potential Value to `Ecer: Rp 594.500` and `Retail: Rp 523.000` (`.claude/drafts/sampling-pro.html:232`) and added the Ecer/Retail/Grosir breakdown to the HTML arithmetic comment (`.claude/drafts/sampling-pro.html:179-181`).
- `command-center-pro.html`: Updated summary strip (`0 low-stock SKUs (seed)`) and `Stok Kritis` on PC and Phone 1 to reflect `src/components/DashboardView.jsx:78-106, 320` (hidden when `runningOut.length === 0`, since all 6 seed SKUs are above `minStock`), with rule comment (`.claude/drafts/command-center-pro.html:100, 115-117, 175, 184-185`).
- `reports-pro.html`: Added `Daily ▾` period picker and `2026-11-17` date picker to both Phone 1 and Phone 2 `.sum` bars (`.claude/drafts/reports-pro.html:194, 218`).
- `customers-pro.html`: Added `More ▾` (`Verify NOO (when PENDING) · Move · Del`) on Phone 1 `.sheet` and `Admin Tools` (`Repair Tiers`, `Find Duplicates`, `Data Scrub`, `Import KML`) on Phone 2 `.an-sec` (`.claude/drafts/customers-pro.html:261-262, 291-294`).

## Task 51 - fix what Task 49 found in pictures 44-47
**Status:** DONE
**Written:** 2026-11-17 15:50 WIB, by Claude. Do it AFTER Task 50. Edits drafts only.
**Touch only:** `.claude/drafts/map-system-pro.html`, `agent-profile-pro.html`, `settings-pro.html`, this file.

Fix every MISSING in your Task 49 Result: map-system phone gets ZoneHUD, the totals strip, Boss tools and Delete this shop (Delete stays quiet, red words only, never a filled button); agent-profile phone gets Timeline Analytics (bars from 0); settings phone gets Letterhead/Signature/Bank/Watermark, Spare days on a restock, Stock Opname day, Where the Master Vault is, Rebuild sales totals - the money/role group stays behind its own divider. Ordinary sizes; nothing new beyond the finding.
Done when: every Task 49 MISSING is on the phone frames, no `<script>`, Result lists each with file:line.

**Result:**
- `map-system-pro.html`: Added totals `.sum` strip (`152 shops · Rp 82,86 jt · 152 visit`), `ZoneHUD: Muntilan · 12 shops`, `Boss tools (⋯)`, and quiet red-text `Delete this shop` button to Phone 1 (`.claude/drafts/map-system-pro.html:189-199`).
- `agent-profile-pro.html`: Added `Timeline Analytics (from 0)` (`1W · 1M · 1Y`) bar chart to Phone 2 `.an-sec` (`.claude/drafts/agent-profile-pro.html:242-249`).
- `settings-pro.html`: Added `Letterhead, Signature, Bank & Watermark` above `.div` and `Spare days (3d)`, `Opname day (Any)`, `Master Vault (Unset)`, and `Rebuild sales` below `.div` in Phone 1 `.sheet` (`.claude/drafts/settings-pro.html:178-184`).

## Task 52 - re-cut the Receivables & Consignment picture (segment 4) to the v4 look
**Status:** DONE
**Written:** 2026-11-17 16:00 WIB, by Claude. Edits one draft - not an app BUILD. Read "THE LOOK HE PICKED" (above Task 40) first.
**Touch only:** `.claude/drafts/receivables-pro.html`, this file.

Your Task 39 drew this BEFORE Aldi picked the v4 look. Re-cut it:
- Master-detail: LEFT = the A/R list of shops that owe (one quiet line each: shop, region, amount owed, one-word state). RIGHT = the shop in hand: its open notes (date, amount, days) and the settle press. Phone: the shop opens under its own row.
- ONE summary line on top with the money fact in Rupiah (total owed, how much overdue). No tiles, no 3 SAFE / WARNING / OVERDUE columns - the state is a word on each row.
- The 3 tabs stay (A/R Financials, Physical Stock, Hand-offs) as one quiet strip; Hand-offs keeps its red waiting dot (rule: "THE SHAKE" comment ~L1021 of `src/ConsignmentFinanceView.jsx`).
- Every element in YOUR Task 23 map must still be somewhere, PC and phone.
- The state word on each row = the code's own rule (Task 23 lists it): run it by hand for 2026-11-17 and write the sum in an HTML comment. The demo seed has NO open debt, so every amount is marked "example" and added up in the comment.
- Money presses (settle / pay / transfer) are drawn as quiet gold-edged buttons, never filled.
Done when: the file is re-cut, no `<script>`, PC 1440 + phone 390 frames, the comment adds up, and the Result lists every Task 23 element with where it sits.

**Result:**
Re-cut `.claude/drafts/receivables-pro.html` to the v4 master-detail look (zero `<script>`, zero tiles, zero 3-column buckets, `.btn edge` gold-edged money buttons).

Where every Task 23 element sits in `.claude/drafts/receivables-pro.html`:
- **Header (`Global Receivables`), Region & Salesman filters, and 3 underline tabs (`A/R Financials`, `Physical Stock`, `Hand-offs` with inner `.dot` per `THE SHAKE` `L1021-1039`)**: PC `.top`, Phone 1 `.top`, and Phone 2 `.top` / `.sum`.
- **Summary line (`Rp 2.200.000` owed example, `Rp 1.350.000` overdue, `3` active shops, `250 Bks` dititip)**: PC `.sum` and Phone 1 & 2 `.sum`.
- **A/R shop list (`AMANAH BARU` `OVERDUE`, `ANEKA BARU PANJI` `SOON`, `ANUGRAH 17` `SAFE`)**: PC `.list .rows` (44 px rows) and Phone 1 `.list`.
- **Opened shop in hand (`AMANAH BARU`: open consignment notes with `demo/seed.json` products & `priceDistributor`, `Store Audit & Settle` `.btn edge`, `Add Goods`, `Hand-off`, `Receipt (58mm/A4)`)**: PC `.hand` and Phone 1 bottom `.sheet`.
- **`Physical Stock` (`AMANAH BARU` `150 Bks`, `ANEKA BARU PANJI` `60 Bks`) & `Hand-offs` (`Authorize / Accept`, `Reject / Decline`, `Journey map`)**: Phone 2 `.an-sec` (and PC `.top` tabs).
- **Arithmetic & aging rule comment**: HTML comment inside PC `.hand` citing `src/ConsignmentFinanceView.jsx:201-238` (`1,350,000 + 510,000 + 340,000 = Rp 2,200,000`).

## Task 53 - which messages now get the gold check? (read-only audit)
**Status:** DONE
**Written:** 2026-11-17 16:00 WIB, by Claude. Do it AFTER Task 52. READ-ONLY.
**Touch only:** this file.

Since f6152ec5 a message strip draws a gold check when `isSuccess(text)` is true and an X when `isFailure(text)` is true (`src/utils/toastSeverity.js`, used in `src/components/Toast.jsx`). A check on a message that is NOT a real save would lie to Aldi's staff.
List every `notify(` call in `src/` whose text is a string or template you can read. For each: file:line, the text (short), and what it gets: CHECK / X / NOTHING - by running the two regexes in your head on the text. Then flag:
- WRONG CHECK: gets a check but nothing was saved/done (e.g. a question, a hint, a "you can now ...").
- MISSED CHECK: a real "saved/done" message that gets NOTHING (a word the SUCCESS regex lacks).
- WRONG X: a real success that isFailure catches.
**Result:** counts on top (CHECK n / X n / NOTHING n / WRONG CHECK n / MISSED CHECK n / WRONG X n), then ONE table of only the flagged lines: file:line | text | gets | should get | the word that decides it. Do not list the fine ones line by line.

**Counts:** CHECK 26 / X 212 / NOTHING 115 / WRONG CHECK 6 / MISSED CHECK 12 / WRONG X 0 *(42 bare-variable `notify(msg)` calls skipped)*

| file:line | text | gets | should get | the word that decides it |
| :--- | :--- | :--- | :--- | :--- |
| `src/App.jsx:1438` | `"This is the demo: recovery emails are switched off, so no code is sent."` | CHECK | NOTHING | `sent` (not excluded by `no ... sent`) |
| `src/components/LoadSheet.jsx:130` | `` `No usual load saved for ${agent.name} yet...` `` | CHECK | NOTHING | `saved` (`No ... saved ... yet`) |
| `src/components/shareReceipt.js:21` | `` `"${typed.trim()}" is not a phone number - the receipt was not sent.` `` | CHECK | X | `sent` (`not sent` misses `not \w+ed`) |
| `src/ConsignmentFinanceView.jsx:583` | `"No changes recorded. Did you enter Sisa / Retur data?"` | CHECK | NOTHING | `recorded` (`No changes recorded`) |
| `src/hooks/useTransactionEngine.js:102` | `` `"${customerName}" is saved as a walk-in, not a registered shop...` `` | CHECK | NOTHING | `saved` (validation rejection) |
| `src/JourneyView.jsx:1140` | `"This shop has no GPS pin saved yet."` | CHECK | NOTHING | `saved` (`no GPS pin saved yet`) |
| `src/App.jsx:637` | `"Rank and badge settings moved into this company's own folder."` | NOTHING | CHECK | `moved` (lacks `moved` in `SUCCESS`) |
| `src/App.jsx:3966` | `` `AKUN UJI DIBUAT: ${worn} di ${home}...` `` | NOTHING | CHECK | `dibuat` (lacks `dibuat` in `SUCCESS`) |
| `src/App.jsx:3980` | `` `${worn} DIPINDAH KE ${home}.` / `AKUN UJI DIGANTI NAMA...` `` | NOTHING | CHECK | `dipindah` / `diganti` |
| `src/components/CrownTransferProtocol.jsx:120` | `"TRANSFER COMPLETE. You will now be logged out..."` | NOTHING | CHECK | `complete` (lacks `complete` in `SUCCESS`) |
| `src/components/DemoMission.jsx:318` | `` `MISI ${s}/${LAST} SELESAI: ...` `` | NOTHING | CHECK | `selesai` (lacks `selesai` in `SUCCESS`) |
| `src/components/LandlordDashboard.jsx:208` | `` `Vault tries reset for ${who}: ...` `` | NOTHING | CHECK | `reset` (lacks `reset` in `SUCCESS`) |
| `src/FleetCanvasManager.jsx:496` | `` `${newAgent.name} moved to ${normalizeRegion(...)}` `` | NOTHING | CHECK | `moved` (lacks `moved` in `SUCCESS`) |
| `src/FleetCanvasManager.jsx:576` | `` `Vault tries reset for ${agent.name}: ...` `` | NOTHING | CHECK | `reset` (lacks `reset` in `SUCCESS`) |
| `src/FleetCanvasManager.jsx:597` | `` `Vault password reset for ${agent.name}...` `` | NOTHING | CHECK | `reset` (lacks `reset` in `SUCCESS`) |
| `src/FleetCanvasManager.jsx:614` | `` `${agent.name} is locked / is unlocked...` `` | NOTHING | CHECK | `locked` / `unlocked` |
| `src/MerchantSalesView.jsx:677` | `` `${shop.name} may take ${b.name} again - its count is cleared.` `` | NOTHING | CHECK | `cleared` (lacks `cleared` in `SUCCESS`) |
| `src/RestockVaultView.jsx:596` | `` `"${place.name}" dihapus dari daftar.` `` | NOTHING | CHECK | `dihapus` (lacks `dihapus` in `SUCCESS`) |


## Task 54 - BUILD: fix the gold check / X words from Task 53
**Status:** DONE
**Written:** 2026-11-17 17:55 WIB, by Claude. A small BUILD. Read your own Task 53 Result first.
**Touch only:** `src/utils/toastSeverity.js`, `src/config/toastSeverity.selfcheck.mjs`, this file.

Task 53 found 6 WRONG CHECK and 12 MISSED CHECK lines. Fix them in the two regexes only - never edit a `notify(` text in a screen file.
- WRONG CHECK (6): a "no ... saved / sent / recorded ... (yet)" or "not sent" sentence must NOT get a check. The 3 that are real failures (`shareReceipt.js:21` "was not sent") should get the X; the others get NOTHING. Simplest rule: a negation word (no / not / belum / tidak / gagal) before the success word in the same sentence cancels the check.
- MISSED CHECK (12): add the success words Task 53 named: moved, reset, cleared, complete, locked, unlocked, dibuat, dipindah, diganti, selesai, dihapus. Match whole words only (`\b`), so "unlocked" does not also match as "locked" twice and "completed" still works.
- WRONG X must stay 0: after your change, re-run your Task 53 sweep and write the new counts.
- Add one line per fixed text to `toastSeverity.selfcheck.mjs` (the real text from Task 53, the expected CHECK / X / NOTHING). The selfcheck must fail before your regex change and pass after - say that you saw both.
Done when: `node src/config/toastSeverity.selfcheck.mjs` exits 0, `node src/config/logicFixes.selfcheck.mjs` exits 0, and the Result has the new counts (CHECK n / X n / NOTHING n / WRONG CHECK 0 / MISSED CHECK 0 / WRONG X 0). Commit as `Antigravity: Task 54 ...`. Never push.

**Result:**
- Added all 18 Task 53 cases to `src/config/toastSeverity.selfcheck.mjs:150-175`; ran `node src/config/toastSeverity.selfcheck.mjs` BEFORE fixing `toastSeverity.js` and observed `55 passed, 18 failed, 73 checks` (exit 1).
- Updated `src/utils/toastSeverity.js:14, 28-35`: added `sent` to `not (?:been )?(?:\w+ed|sent)` in `FAILURE`, added `moved|reset|cleared|completed?|locked|unlocked|dibuat|dipindah|diganti|selesai|dihapus` to `SUCCESS`, and checked per sentence in `isSuccess` so negations (`no|not|belum|tidak|gagal|nothing|never|until|walk-in`) cancel the check in that sentence without hiding a multi-sentence lock/save.
- Re-ran checks AFTER the fix:
  - `node src/config/toastSeverity.selfcheck.mjs`: `73 passed, 0 failed, 73 checks` (exit 0)
  - `node src/config/logicFixes.selfcheck.mjs`: `3019 passed, 0 failed, 3019 checks` (exit 0)
  - New Task 53 sweep counts: `CHECK 33 / X 213 / NOTHING 107 / WRONG CHECK 0 / MISSED CHECK 0 / WRONG X 0` *(43 bare-variable `notify(msg)` calls skipped)*.

## Task 55 - read-only: where the Receivables blocks sit, for the cut-and-place build
**Status:** DONE
**Written:** 2026-11-17 17:55 WIB, by Claude. READ-ONLY. Do it after Task 54.
**Touch only:** this file.

The Receivables picture (`.claude/drafts/receivables-pro.html`, artifact https://claude.ai/artifact/PuX2thEyaC84BjjoPCAR1t) is waiting for Aldi's ok. The build will cut the existing JSX blocks of `src/ConsignmentFinanceView.jsx` out by line number and place them in the new layout, so no rule is retyped (the way Stock Opname was built).
List, for today's file, the exact start-end line of each block below, its outermost element, and what state/handlers it reads (names only):
1. Title + region / salesman filters. 2. The 3 tabs strip (and THE SHAKE dot, ~L1021). 3. The 2 tiles (Total assigned debt, Active accounts). 4. The SAFE / WARNING / OVERDUE columns and ONE shop row inside them. 5. The settle / Store Audit press and the modal it opens. 6. Add Goods, Hand-off, Receipt presses. 7. Physical Stock tab body. 8. Hand-offs tab body (Authorize / Reject).
Then: which blocks share a variable declared INSIDE another block (a cut there would break it), and is the aging rule (L201-238) inside a useMemo the new list can reuse as-is (name it).
**Result:** one table (block | lines | outer element | reads) + the shared-variable list + the useMemo answer. Keep it under 60 lines.

**Result:**
| block | lines | outer element | reads (state / handlers) |
| :--- | :--- | :--- | :--- |
| 1. Title + region / salesman filters | `931-1013` | `<div className="flex flex-col lg:flex-row ...">` | `isAdmin`, `activeRegion`, `setActiveRegion`, `uniqueLocations`, `agentSearch`, `setAgentSearch`, `showAgentDropdown`, `setShowAgentDropdown`, `dropdownAgents`, `setSelectedCustomer` |
| 2. 3-tab strip + THE SHAKE dot | `1015-1041` | `<div className="flex bg-black/40 p-1 rounded-xl ...">` | `activeTab`, `setActiveTab`, `incomingRequests`, `pendingAdminRequests` |
| 3. 2 summary tiles | `1047-1056` | `<div className="grid grid-cols-2 md:grid-cols-4 gap-4">` | `debtData.totalValue`, `debtData.activeAccounts` |
| 4. SAFE/WARNING/OVERDUE + 1 shop row | `602-632`, `1057-1061` | `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">` (`StatusCard` `602-632`, row `610-628`) | `debtData.GREEN`, `debtData.YELLOW`, `debtData.RED` |
| 5. Store Audit press + inline panel/confirm | `1166-1244`, `1259, 1267-1270` | `<button onClick={() => setAuditMode(true)}>` / `{auditMode ? ...}` / `submitAction` (`507-600`) | `auditMode`, `setAuditMode`, `auditData`, `setAuditData`, `handleAuditInput`, `submitAction`, `activeCustomer`, `formatRupiah` |
| 6. Add Goods, Hand-off, Receipt presses | `638-928`, `1120-1165`, `1250, 1261-1264` | `{viewingReceipt && (() => ...)}` (`638-928`); `<button onClick={() => onAddGoods...}>` (`1250`); `<button onClick={() => setTransferMode(true)}>` (`1261`) + `transferMode` panel (`1120-1165`) | `viewingReceipt`, `setViewingReceipt`, `handoffLine`, `isAdmin`, `onAddGoods`, `activeCustomer`, `transferMode`, `setTransferMode`, `targetAgent`, `setTargetAgent`, `transferNote`, `setTransferNote`, `handoffTargets`, `submitAction`, `shareReceipt` |
| 7. Physical Stock tab body | `1066-1277` | `{activeTab === 'stock' && (<div ...>)}` | `customerData`, `selectedCustomer`, `setSelectedCustomer`, `activeCustomer`, `auditMode`, `transferMode`, `auditData`, `isAdmin`, `handoffTargets`, `formatRupiah` |
| 8. Hand-offs tab body | `1280-1368` | `{activeTab === 'transfers' && (<div ...>)}` | `pendingAdminRequests`, `incomingRequests`, `outgoingRequests`, `onAdminApproveTransfer`, `onAgentAcceptTransfer`, `onShowStoreOnJourney`, `HandoffOffer` |

- **Shared variables declared inside another block:** `activeCustomer` (`350-358`, component scope, shared by blocks 5, 6, 7); `receiptDateStr` (`639`, inside `viewingReceipt` IIFE `638-928` only); `StatusCard` (`602-632`, component scope, used by block 4). Blocks 5 & 6 (`auditMode`, `transferMode`, `submitAction`, `Add Goods`, `Hand-off`) sit *inside* block 7 (`activeTab === 'stock'`).
- **Aging rule `useMemo`:** Yes — `debtData` (`163-244`, with aging rule at `201-238`) returns `{ GREEN, YELLOW, RED, totalValue, activeAccounts }` and can be reused as-is.


## Task 56 - BUILD: give the demo company real consignment debt
**Status:** DONE
**Written:** 2026-11-17 18:05 WIB, by Claude. Aldi: *"make the debt on the demo as well of course to show its features"*. Do it after 54-55.
**Touch only:** `api/_demoCompany.js`, `src/config/logicFixes.selfcheck.mjs`, this file.

Today every demo sale is `paymentType: 'Cash'` (`api/_demoCompany.js` ~L173, `dayRound`). Add, AFTER the generated sales (do not touch `dayRound`), the exact data of the approved picture (`.claude/drafts/receivables-pro.html`, the `SHOPS` and `HANDOFFS` constants in its script):
- 9 Titip notes = 9 transactions `type: 'SALE', paymentType: 'Titip'`, `tempoDays` from the picture, items via the file's own `line(p, qty, 'Retail')` helper (so `total` = Retail price x qty), `customerName` = the seed shop name, `agentId/agentName` = the salesman's demo login (Agus demo-agent-1, Dika demo-agent-2, Budi demo-agent-3, Ari demo-agent-4).
- 1 transaction `type: 'CONSIGNMENT_PAYMENT'` for AMANAH BARU, Rp 300.000, dated 12 Nov-equivalent. Read `debtCredit()` in `src/utils/revenueRule.js` (~L64) and give it the field it reads for cash paid.
- DATES: never a fixed date. The picture's "today" is 17 Nov: a note dated 5 Nov = `now` minus 12 days. Use the file's own day helpers (atWib etc.) so the OVERDUE / DUE SOON / SAFE words stay true every night.
- The 2 pending hand-offs: find how the app stores a pending hand-off (grep `handoff` in `src/ConsignmentFinanceView.jsx`, your Task 23 map) and write those 2 the same way. If that needs a collection the demo builder does not write, STOP and write that in the Result instead.
- TRAPS: never add an `r()` call (every route after it changes); find any selfcheck/audit that pins demo totals (grep the demo totals / `buildDemoCompany` in `src/config/*.mjs`, `tools/*.mjs`) and say if a Titip sale changes a revenue number (`isTitip`, `src/utils/revenueRule.js:28`).
- Add ONE check to `logicFixes.selfcheck.mjs`: build the demo with a fixed `now` = 2026-11-17 and assert 8 shops owe, total Rp 9.120.000, AMANAH BARU Rp 1.580.000 overdue (oldest note 12 days, tempo 7).
\r
- Added 9 SALE (paymentType: 'Titip', line(p, qty, 'Retail')) notes, 1 CONSIGNMENT_PAYMENT (AMANAH BARU, mountPaid: 300000, 	otal: 300000, eturnTotal: 0 per debtCredit in src/utils/revenueRule.js:64-71), and 2 pending ccount_transfers (LARIS JAYA, HJ EUIS, PENDING_AGENT) in pi/_demoCompany.js:337-382 using ddDays(day, -back) and tWib(...) with zero () calls.
- Because isTitip(tx) (src/utils/revenueRule.js:28) is 	rue for paymentType: 'Titip', countsAsRevenue excludes the 9 Titip placements from revenue/omset; logicFixes.selfcheck.mjs (I33, 11284-11285, 11308) excludes demo-titip-* from the dayRound Cash-round assertions and adds section('DEMO CONSIGNMENT DEBT (Task 56, 2026-11-17)') asserting 8 shops owe Rp 9.120.000, AMANAH BARU owes Rp 1.580.000 (ge: 12, 	empo: 7), and 2 pending hand-offs.
- Checks: logicFixes.selfcheck.mjs Â0 passed, 0 failed; all 14 src/config/*.selfcheck.mjs exited 0; pm run build exited 0 (.53s); integration.audit.mjs :5 passed, 0 failed.

## Task 57 - BUILD: Receivables & Consignment to the approved picture (segment 4)
**Status:** DONE
**Written:** 2026-11-17 18:05 WIB, by Claude. Aldi picked the picture (v5, option C) + *"dont forget to add the agent who responsible in there as well"*. Do it after Task 55 (your line map) and 56.
**Touch only:** `src/ConsignmentFinanceView.jsx`, `src/styles/theme.css` (only new classes), `src/config/logicFixes.selfcheck.mjs`, `src/config/patchNotes.js`, this file.

Rebuild the look of `src/ConsignmentFinanceView.jsx` to `.claude/drafts/receivables-pro.html` (artifact https://claude.ai/artifact/PuX2thEyaC84BjjoPCAR1t), PC and phone:
- Header (title, as-of date, search, region, salesman) · 3 underline tabs, Hand-offs keeps THE SHAKE dot (~L1021) · the aging summary (Outstanding rolling digits + Safe/Due soon/Overdue bar and amounts) · the list (shop + area, Salesman column = the shop's responsible agent, owed, tempo-used bar "12 of 7 days", state word) sorted overdue first · the shop in hand (name, area, phone, "Responsible: <agent>" chip, 4 facts, consignment notes with still-owed, history) · action bar: Receipt, Add Goods, Hand-off quiet; Store Audit & Settle = `.kpm-edge-btn` (gold edge, NEVER a gold fill) · phone: the shop opens under its own row.
- Rolling digits: reuse what f6152ec5 shipped (grep the rolling-digit component) - do not write a second one.
- MONEY RULE (Claude reviews this line by line): restyle and re-layout only. The `debtData` useMemo (~L162-238), every handler (settle, pay, transfer, hand-off accept/reject, add goods) and every Firestore write must stay byte-identical. Build by CUTTING the existing JSX blocks by line number with a script (Task 55 map) and placing them - never retype a rule. The file is CRLF: normalise, edit, restore.
- Every element of your Task 23 map must still exist somewhere, PC and phone. List where each went.
- Add to the logicFixes check that guards `.kpm-edge-btn` screens: this file joins it. One patch note line (en + id, plain words, no names) in `src/config/patchNotes.js`.
Done when: `git diff` shows the debtData block and every handler unchanged (paste the command you used to prove it), every selfcheck exits 0, `npm run build` passes, `node src/config/integration.audit.mjs` passes. Commit `Antigravity: Task 57 ...`. Never push - Claude renders it in the lab and pushes.

**Result:**
- Rebuilt `src/ConsignmentFinanceView.jsx` to the v5 master-detail layout (`.kpm-ar-*` classes in `src/styles/theme.css:6446-6500`), keeping `debtData`, `customerData`, `handleAuditInput`, `submitAction`, `StatusCard`, and `{viewingReceipt && ...}` byte-identical (CRLF preserved).
- Diff proof: `git diff -U0 src/ConsignmentFinanceView.jsx | rg -n "^@@"` shows hunks only at `9` (import `RollingNumber`), `51` (3 UI states), `363` (read-only `arView`/`activeDebtShop`/`openStoreAction`), and `931..1371` (JSX only); zero changes in `163-362` or `440-930`.
- Task 23 elements:
  - Header (title, as-of date, search, region, salesman autocomplete): `.kpm-ar-hd` (PC & phone).
  - 3 underline tabs + `THE SHAKE` dot: `.kpm-ar-tabs` with `overflow-x-auto max-w-full shrink-0`.
  - Aging summary (`RollingNumber` Outstanding + Safe/Due soon/Overdue segmented bar & clickable legend): `.kpm-ar-aging`.
  - Master-detail A/R list (shop + area, Salesman, Owed, tempo bar, State word, sorted overdue first; opens under its own row on phone) + shop in hand (Responsible chip, `RollingNumber` Still Owed, 4 facts, Consignment Notes, History, `Receipt`, `Add Goods`, `Hand-off`, `.kpm-edge-btn` `Store Audit & Settle`): `.kpm-ar-work`.
  - `Physical Stock` & `Hand-offs` tabs + `Receipt` modal: same tabs/modals with `.kpm-edge-btn`.
- Added patch note line in `src/config/patchNotes.js:7` and v5 guard in `src/config/logicFixes.selfcheck.mjs:12543-12545`.
- Checks: `logicFixes.selfcheck.mjs` `3020 passed, 0 failed`; all 14 `src/config/*.selfcheck.mjs` exited 0; `npm run build` exited 0 (`10.78s`); `integration.audit.mjs` `725 passed, 0 failed`.

**Claude's review of 54-57 (2026-11-17 21:50):** 54, 55, 56 accepted as written. 57: all 30 old handlers verbatim, debtData byte-identical, 0 Firestore calls added - BUT `isTitip` and `txTime` were never imported (runtime crash); fixed in e4c1e313. Read the new fifth gate in BUILD rules above. Not pushed yet: waits on Claude's lab frames.

---

## Task 58 - read-only: review Task 57's new Receivables code for bugs no gate can see
**Status:** DONE
**Written:** 2026-11-17 21:50 WIB, by Claude. READ-ONLY.
**Touch only:** this file.

Read `src/ConsignmentFinanceView.jsx` as it is TODAY: `arView`, `activeDebtShop`, `openStoreAction` (~L368-442) and every JSX line using them (~L1008-1310). The gates passed on a file that would have crashed, so look for what a running screen hits:
- No shop owes (debtData empty): does anything read `activeDebtShop.x` while it is null? Does the list show an empty state, or nothing?
- `openStoreAction` does NOTHING when `customerData` has no match - Store Audit / Hand-off pressed and silent. Aldi's law: every action must report. Which shops can reach that path (a Titip note for a shop with no customer doc? a shop name typed differently?) - give a real case or say none.
- `notes[].left` is FIFO over ALL payments: does it agree with `debtData`'s owed for the same shop? Use the Task 56 demo data (AMANAH BARU: notes 12 days + 4 days, Rp 300.000 paid) and write both numbers.
- Phone: the row press uses `window.innerWidth < 1024` at press time - what happens if the window is resized with a shop open? Is there a second phone path that never closes?
- `setViewingReceipt(activeDebtShop.payments[0])` - a shop with notes but no payment: is the Receipt press hidden, or does it open `undefined`?
- `agent` falls back to `'Admin'` - when does a real shop show "Admin" as its responsible salesman? Is that a lie on screen?
- Any key missing / duplicate key in the new `.map(` lists; any English that is unclear.

**Result:** ONE table: Finding | Who hits it | What goes wrong | file:line | HIGH/MED/LOW | smallest fix in one sentence. Worst first; "checked, fine" for each bullet with nothing.
| Finding | Who hits it | What goes wrong | file:line | Severity | Smallest fix |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `arView` `notes[].left` skips `RETURN` credits | Any shop with a `RETURN` transaction | `arView` only sums `CONSIGNMENT_PAYMENT` (`L390`) while `debtData` subtracts `RETURN` (`L190`), so `notes[].left` sums higher than `activeDebtShop.total` (for Task 56 `AMANAH BARU` with 0 returns both agree: `1,200,000 + 380,000 = Rp 1.580.000`) | `src/ConsignmentFinanceView.jsx:389-398` | HIGH | Include `t.type === 'RETURN'` in `arView`'s credit filter and sort by `txSeconds` like `debtData`. |
| Phone row 0 cannot close (`window.innerWidth < 1024`) | Phone users (`< 1024 px`) | Pressing row 0 sets `selectedDebtName` to `null`, and `activeDebtShop` (`L430`) falls back to `arView.shops[0]` when `selectedDebtName` is falsy, so row 0 stays stuck open | `src/ConsignmentFinanceView.jsx:428-431, 1185` | HIGH | Use `''` for explicitly collapsed on phone and only fall back to `shops[0]` on `null` (initial desktop state). |
| `openStoreAction` silent no-op when `customerData` has no match | Any `debtData` row missing from `customerData` (e.g. empty `customerName` keyed as `'Unknown'` at `L176`) | Pressing `Hand-off` or `Store Audit & Settle` does nothing silently | `src/ConsignmentFinanceView.jsx:433-442` | MED | Add `else notify(`Could not open ${shopName} in Physical Stock.`)` after `if (match)`. |
| `agent` falls back to `'Admin'` | Legacy Titip rows with no `agentName` and no `customerData` match | Shows `Admin` as responsible salesman even if unassigned | `src/ConsignmentFinanceView.jsx:400` | LOW | Fall back to `'Unassigned'` when `drops[last]?.agentName` is empty. |
| Empty `debtData` (`activeDebtShop === null`) | Checked, fine | List renders empty message (`L1175`), right panel guards `!activeDebtShop` (`L1230`) | `src/ConsignmentFinanceView.jsx:429, 1174-1175, 1230-1231` | — | — |
| `setViewingReceipt(activeDebtShop.payments[0])` | Checked, fine | Button is gated behind `{activeDebtShop.payments[0] && (...)}` | `src/ConsignmentFinanceView.jsx:1292-1295` | — | — |
| Keys & English in `.map(` lists | Checked, fine | Unique keys (`s.name`, `n.id`, `p.id`, `idx`) and clear copy | `src/ConsignmentFinanceView.jsx:1182, 1210, 1260, 1275, 1281` | — | — |

---

## Task 59 - read-only: line map of the Reports screen blocks, for the cut-and-place build (segment 5)
**Status:** DONE
**Written:** 2026-11-17 21:50 WIB, by Claude. READ-ONLY. Same job as your Task 55, for the next screen.
**Touch only:** this file.

Reports = `src/components/HistoryReportView.jsx` + the Product Performance panel (your Task 24 map, grep "## Task 24"; your picture `.claude/drafts/reports-pro.html`, Task 40). For TODAY's file list each block: exact start-end line, outermost element, the state/handlers it reads (names only). Blocks: title + date/region/salesman filters · summary tiles/numbers · the transaction list and ONE row · the one transaction opened (detail, receipt, Day Replay) · Edit / Delete (admin) and their confirm · export / print / share presses · Product Performance panel · every modal (`fixed inset-0`, your Task 4 list: L940, L956).
Then: which blocks share a variable declared INSIDE another block (a cut there breaks it), which useMemo holds the money totals (name it, its lines) so the new layout reuses it as-is, and every Firestore write in the file (line + what it writes) - those are the lines the build must never touch.
**Result:** one table (block | lines | outer element | reads) + shared-variable list + the useMemo answer + the write list. Under 70 lines.
| block | lines | outer element | reads (state / handlers) |
| :--- | :--- | :--- | :--- |
| 1. Title + date/region/salesman filters | `411-475` | `{!reportView && (<div ...>)}` | `rangeType`, `setRangeType`, `targetDate`, `setTargetDate`, `isFieldAgent`, `isFetchingHistory`, `handlePullArchive`, `reportAccessLevel`, `selectedRegion`..`selectedCustomer`, `searchTerm`, `setSearchTerm`, `setReportView` |
| 2. Summary tiles/numbers (`Context Revenue`, `Transactions`, `Items Moved`, `Net Profit`) | `498-512` | `<div className="flex flex-col gap-3 ...">` + `<div className="grid ...">` | `isFieldAgent`, `selectedAgent`, `selectedRegion`, `rangeType`, `targetDate`, `stats.totalRev`, `stats.count`, `stats.items`, `stats.totalProfit` |
| 3. Transaction list & 1 row (plus folder levels 1–6) | `640-935` | `reportData` folder grids (`640-833`) + Level 7 table (`836-935`, row `873-926`) | `reportData`, `selectedRegion`..`selectedCustomer`, `isAdmin`, `onDeleteFolder`, `setViewingPhoto`, `setViewingReceipt`, `setEditingTrans`, `onDeleteTransaction` |
| 4. Opened transaction (`SaleReceipt` & Proof photo) | `939-953`, `1017-1018` | `{viewingPhoto && (<div className="fixed inset-0 z-[600] ...">)}`, `{viewingReceipt && <SaleReceipt ... />}` | `viewingPhoto`, `setViewingPhoto`, `viewingReceipt`, `setViewingReceipt`, `appSettings`, `customers` |
| 5. Edit / Delete (admin) & confirm | `348-405`, `857, 921-922`, `955-1014` | `{editingTrans && (<div className="fixed inset-0 z-[100] ...">)}` | `editingTrans`, `setEditingTrans`, `inventory`, `handleEditTierChange`, `handleEditItemChange`, `handleEditSubmit`, `onDeleteTransaction`, `onDeleteFolder` |
| 6. Export / Print / Scale presses | `480-492` | `<div className="print:hidden mb-6 ...">` | `setReportView`, `printScale`, `setPrintScale`, `window.print()` |
| 7. Product Performance (+ Offer Performance, Package Returns, Agent Roster) | `514-637` | `<div className="mb-8 print:mb-0">` + `data-guide="offer-performance"` / `"package-returns"` | `stats.items`, `offerStats`, `pkgReturns`, `countClears`, `stats.agentRoster`, `expandedAgent`, `setExpandedAgent`, `motorists`, `isFieldAgent` |
| 8. Every modal (`fixed inset-0`) | `940-953` (`z-[600]`), `956-1014` (`z-[100]`), `1017-1018` | Proof photo viewer, `DATA AUDIT` edit modal, `<SaleReceipt>` | `viewingPhoto`, `editingTrans`, `viewingReceipt` |

- **Shared variables inside another block:** `cObj` (`840`) is declared inside the Level 7 IIFE (`839-932`) and used by both header (`845-862`) and table (`867-929`); `isRetur`/`isExchange`/`isIouFulfill` (`875-877`) are inside `cObj.history.map`.
- **Money totals `useMemo`:** `stats` (`278-319`) computes `totalRev`, `totalProfit`, `count`, `items`, `payments`, and `agentRoster` from `contextualTransactions`.
- **Firestore writes (must stay untouched):** `395-401` inside `handleEditSubmit` — atomic `commitInChunks(db, writeBatch, ...)` updating `artifacts/${appId}/users/${userId}/transactions/${editingTrans.id}` (`date`, `customerName`, `total`, `amountPaid`, `priceTier`, `items`, `timestamp`, `updatedAt`) plus `tallySaleOp(..., -1)` and `tallySaleOp(..., 1)` on `sales_stats`. (Deletes delegate to `onDeleteFolder` / `onDeleteTransaction` in `App.jsx`.)

**Claude's review of 58-59 (2026-11-18 08:20):** both accepted. All four Task 58 findings were real; Claude fixed them in 5a696b31 (notes now read debtData's own walk). Lab frames showed one more thing, NOT from your build: the app loads only 7 days of sales (`src/hooks/useDatabaseSync.js:88`), so every Titip note older than 7 days is missing from Receivables - the demo shows 6 shops / Rp 4.880.000, not 8 / Rp 9.120.000, and Overdue is empty. Task 60 is about that.

---

## Task 60 - read-only: the 7-day window hides old consignment debt - map it and give Aldi the options
**Status:** DONE
**Written:** 2026-11-18 08:20 WIB, by Claude. READ-ONLY, a THINKING job (Claude writes the decision for Aldi from your Result).
**Touch only:** this file.

`src/hooks/useDatabaseSync.js:88` listens to `transactions` with `where('timestamp', '>=', sevenDaysAgo)`. Receivables (`debtData` in `src/ConsignmentFinanceView.jsx`) builds what each shop owes from that list, so a Titip note 8+ days old vanishes, a 7-day-tempo note can never reach Overdue, and a payment inside the window may be set against the wrong (newer) note. Backlog already has part of it: A-Brain `Backlog/SWEEP - App.jsx admin handlers.md` section 5 (hand-off approval only moves 7 days of debt).
1. List EVERY place that works out debt / Titip / consignment money from the 7-day `transactions` prop (grep `paymentType === 'Titip'`, `isTitip`, `CONSIGNMENT_PAYMENT`, `debtCredit`, `outstandingTitip` across src/). For each: file:line, what it shows or writes, and what goes wrong for a 10-day-old note (money / trust / looks).
2. Give 3 real ways to fix it, e.g. (a) a second listener for open Titip notes + their payments/returns with no date limit, (b) a running balance per shop kept on the customer doc, (c) a fetch only when Receivables opens. For each: reads per day for 30 salesmen and ~2,000 shops (show the sum), the Firestore index it needs, whether `firestore.rules` must change (say WHICH match block - never edit it), the files it touches, and what could break (offline, the demo reset, EOD).
3. Your pick and one sentence why. Name the cheapest test that would prove it works.
**Result:** table 1 (place | file:line | wrong for a 10-day note | severity) + table 2 (option | reads/day | index | rules block | files | breaks) + the pick. Under 70 lines. CAN'T TELL for anything you did not read today.
| place | file:line | wrong for a 10-day note | severity |
| :--- | :--- | :--- | :--- |
| `ConsignmentFinanceView` (`debtData`, `customerData`, `arView`) | `src/ConsignmentFinanceView.jsx:169-245, 286-361, 372-426` | 10-day Titip note vanishes; 7-day-tempo notes never reach Overdue; recent payment offsets newer note instead | HIGH |
| `DashboardBenchmarks` (`outstandingTitip`) | `src/components/DashboardBenchmarks.jsx:180`, `src/utils/revenueRule.js:98-112` | Command Center `Piutang` balance drops all 8+ day old Titip notes | HIGH |
| `MerchantSalesView` sidebar debt check | `src/MerchantSalesView.jsx:239-265` | Sales terminal shows Rp 0 owed when visiting a shop with 8+ day old debt | HIGH |
| `App.jsx` consignment delete & hand-off | `src/App.jsx:3512` | Only deletes/moves 7-day rows, leaving 10-day Titip rows orphaned on the old agent | HIGH |
| `MapMissionControl` (`StoreBottomSheet`) | `src/MapMissionControl.jsx:1150-1180` | Map shop card `Still unpaid` & consignment Bks drop 8+ day old notes | MED |
| `AgentProfileView` (`activeTitipResponsibility`) | `src/AgentProfileView.jsx:504-550` | Agent Profile `Consignment Risk (Titip)` drops 8+ day old notes | MED |
| `vanBay` (`titipOf`) | `src/utils/vanBay.js:424-455` | Loading bay Titip tally omits 8+ day old notes | MED |

| option | reads/day (30 men, ~2k shops) | index | rules block | files | breaks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **(a) 2nd `onSnapshot` listener** for Titip + `CONSIGNMENT_PAYMENT` (or 90d / open) | 90 opens/day × ~300 docs = **~27,000/day** (grows unless archived) | Composite on `transactions` (`paymentType` + `timestamp`) | `firestore.rules:794-798` (`allow read: if isSalesman(bossUid)` — **no change** unless adding `settled` flag on `L797`) | `useDatabaseSync.js`, `App.jsx`, `firestore.indexes.json` | Needs composite index; unbounded growth over months without archiving |
| **(b) Running balance on `customers/{id}`** | **0 extra/day** (`customers` already listened) | None | `firestore.rules:762-779` (**must change** for `own_region`/`folderLimited` writes) | `useTransactionEngine.js`, `ConsignmentFinanceView.jsx`, `App.jsx`, `_demoCompany.js`, `firestore.rules` | Offline/race drift vs `transactions`; Admin Edit/Delete & `demoReset` must mirror it |
| **(c) On-demand `getDocs`** when Receivables opens | 60 opens/day × ~300 docs = **~18,000/day** (0 on cold start) | 2 single-field `where` queries (no composite) or 1 composite | `firestore.rules:794-798` (**no change**) | `ConsignmentFinanceView.jsx`, `useDatabaseSync.js` | Fails/misses old notes offline; Command Center & Sales Terminal still miss old debt on cold start |

- **Pick:** **Option (a)** (second `onSnapshot` listener for Titip + `CONSIGNMENT_PAYMENT` over last 90 days or open notes) because it fixes all 7 screens at once with zero `firestore.rules` changes, works offline via snapshot cache, and keeps `transactions` as the single source of truth.
- **Cheapest proof test:** Run `buildDemoCompany(seed, new Date('2026-11-17T05:00:00Z'), ...)` in `logicFixes.selfcheck.mjs`, filter `transactions` with the 2nd listener's predicate merged with the 7-day window, and assert `outstandingTitip` returns `Rp 9.120.000` (including 12-day-old `AMANAH BARU`).

---

## Task 61 - check the Reports picture against your Task 59 map (segment 5 is next)
**Status:** DONE
**Written:** 2026-11-18 08:20 WIB, by Claude. Do it after Task 60.
**Touch only:** `.claude/drafts/reports-pro.html`, this file.

Your Task 40 drew `.claude/drafts/reports-pro.html`; your Task 59 mapped today's `src/components/HistoryReportView.jsx`. Open both. For every block and every press in the Task 59 table, say where it is in the picture, or MISSING. Fix only MISSING or wrong items in the picture file (same look, same seed numbers, no script, palette law: no blue, no green, gold never as text on light). Keep in mind what Receivables taught: Aldi wants the responsible salesman visible, one summary line with the money fact in Rupiah, master-detail (list left, the one thing in hand right; phone: it opens under its row), ordinary sizes (13-14 px text, 44 px rows).
**Result:** table (Task 59 block or press | where in the picture | was it MISSING, now fixed?) + the count of fixes. Commit both files together as "Antigravity: Task 61 ...".
**Fixes count:** 4 (responsible salesman on list/detail, Phone 1 opens under its own row, `Delete Folder` action, Phone 2 `Agent Roster`).

| Task 59 block or press | where in `.claude/drafts/reports-pro.html` | was it MISSING, now fixed? |
| :--- | :--- | :--- |
| 1. Title + date/region/salesman filters | PC `.top` (`Daily ▾`, `2026-11-17`, `Pull Archive`), `.list` (`.find`, `.crumb`); Phone 1 & 2 `.sum` | Present; responsible salesman (`Agus`, `Ari`, `Rina`) added to every row + opened detail (`L136-148, 196-198`) |
| 2. Summary line (`stats`) | PC `.sum` (`Rp 2.750.000`, `Rp 650.000` net, `280 Bks`, `14` receipts); Phone 1 & 2 | Present |
| 3. Transaction list & 1 row + 7-level folders | PC `.list .rows` (`44 px`); Phone 1 `.list` (7-level drilldown in `.note`) | Fixed Phone 1 so opened row sits **under its own row** instead of a bottom `.sheet` (`L196-205`) |
| 4. Opened transaction (`SaleReceipt`, `Proof` photo + GPS) | PC `.hand` + `.act` (`Proof`, `Receipt`); Phone 1 inline detail under row | Present (`Proof` & `Receipt` added to Phone 1 inline buttons `L203`) |
| 5. Edit / Delete (admin) & `Delete Folder` | PC `.act` (`Delete Folder`, `Edit`, `Delete`); Phone 1 inline (`Edit`, `Delete`); `DATA AUDIT` in `.note` | **`Delete Folder`** (`L857`) was MISSING — added to PC `.act` (`L178`) |
| 6. Export / Print PDF / Scale | Phone 2 `.an-sec` (`Scale 100%`, `Print PDF`) | Present |
| 7. `Product Performance`, `Offer Performance`, `Package Returns`, `Agent Roster` | Phone 2 `.an-sec` (`L220-235`) | **`Agent Roster`** (`575-637`) was MISSING — added to Phone 2 (`L234-235`) |
| 8. Modals (`Proof`, `DATA AUDIT`, `SaleReceipt`) | Triggered from `.act` / Phone 1 buttons; `DATA AUDIT` noted in `.note` (`L112`) | Present |

---

**2026-11-18 09:30 - READ GEMINI.md's OVERRIDE block first: until Saturday 2026-11-21 you are the LEAD (Aldi's call, Claude is out of weekly quota). Tasks 62-63 are yours to do AND review; push only on Aldi's "push".**

## Task 62 - BUILD: consignment debt is never limited to 7 days (Aldi's decision)
**Status:** DONE
**Written:** 2026-11-18 09:30 WIB, by Claude. Do it after Task 60 - it builds Task 60's pick.
**Touch only:** `src/hooks/useDatabaseSync.js`, `src/App.jsx` (only the lines that pass the new list down), `src/ConsignmentFinanceView.jsx` (only where `myTransactions` is fed - NOT `debtData`'s maths), `src/config/logicFixes.selfcheck.mjs`, `src/config/patchNotes.js`, this file. Anything else -> write why in the Result and STOP.

His words: *"for data like consignment that can last more than 7 days i think the data should not limited to seeing last 7 days because it will hide all the consignment that is more than 7 days right"*.
- Receivables must see EVERY Titip note that still owes money, however old, plus every `CONSIGNMENT_PAYMENT` / `RETURN` that pays one off. The other screens keep their 7-day feed (that limit saves reads on purpose, `useDatabaseSync.js:87` "FIREWALL").
- `debtData` (~L163-244 of ConsignmentFinanceView.jsx) stays byte-identical: feed it more rows, never change its maths. Merge the old-note rows with the 7-day rows by `id` (no doubles - a doubled payment pays twice).
- RULES FIRST: a new `query(...)` on `transactions` must pass `firestore.rules` for EVERY tier that opens Receivables (T1-T6 - read the `transactions` match block; a list query is refused unless its `where` matches what the rule checks). If a rule must change: do NOT build. Write the exact CHANGE (old line, new line, why) in the Result for Aldi to publish in the Console, set Status BLOCKED, and go to Task 63. Test the query in the emulator (`rules-test/`, the demo lab) before saying it passes.
- Index: if the query needs a composite index, add it to `firestore.indexes.json` ONLY if that file exists and is in the repo; say so in the Result (indexes deploy with rules - Aldi's Console job).
- Every listener you add must be unsubscribed in the same cleanup as the others (no leak on log out / switch).
- Checks: ONE logicFixes check that would fail if Receivables went back to the 7-day list, and ONE behaviour check on the Task 56 demo data: with "today" = 2026-11-18, Receivables' feed holds all 9 demo Titip notes + the payment (8 shops owe Rp 9.120.000, AMANAH BARU overdue).
- Done when: the five gates in GEMINI.md's OVERRIDE are green, lab frame PC 1440 shows 8 shops / Rp 9.120.000 / AMANAH BARU Overdue (the demo lab steps are in NEXT-SESSION.md's LAB block; save the frame to `../A-Brain/Raw/2026-11-18-receivables/`), one patch note line (en + id, plain words, no names). Commit "Antigravity: Task 62 ...". Push only on Aldi's "push".
**Result:**
- **Listeners & merge (`src/hooks/useDatabaseSync.js:14-44, 113-114, 165, 287`):** Added two unbounded `onSnapshot` listeners (`where('paymentType', '==', 'Titip')` and `where('type', 'in', ['CONSIGNMENT_PAYMENT', 'RETURN'])`, no date cap) merged with 7-day `transactions` by `id` into `consignmentTx` (`mergeConsignmentTx`), and unsubscribed `unsubTitip()` + `unsubCredits()` in cleanup. Global 7-day `transactions` listener (`where('timestamp', '>=', sevenDaysAgo)`) stayed unchanged.
- **Rules & Index:** `firestore.rules:794-798` (`allow read: if isSalesman(bossUid);`) needs no change; emulator test (`projectId: demo-rules-consign`) passed **18/18** for `VaultOwner`, `T1`–`T6`, locked T5 (denied), and another company (denied). Neither query uses `orderBy`, so both use Firestore's automatic single-field indexes (no `firestore.indexes.json` in repo; zero composite index needed).
- **Read cost (unbounded, no 90-day cap):** At 30 salesmen (~90 cold starts/day) across ~2,000 shops: ~300 docs initially (~27,000 reads/day), growing linearly (~3,600 consignment docs/year = ~324,000 cold-start reads/day, warm resumes served by persistence cache) until settled-note archiving is built.
- **Task 60 Table 1 places:**
  - **Wired (`4/7`):** `ConsignmentFinanceView` (`src/App.jsx:5541`, `transactions={consignmentTx}`, `debtData` maths untouched); `App.jsx` consignment delete & hand-off owner check (`src/App.jsx:3512, 2002`); `MerchantSalesView` sidebar FIFO debt engine (`src/MerchantSalesView.jsx:230`); `MapMissionControl` `StoreBottomSheet` `Still unpaid` & consignment packs (`src/MapMissionControl.jsx:1144-1160`, keeping `totalRev`/`monthRev`/`lastOrderAt` on 7-day `transactions`).
  - **Left (needed more than a 1-line list read — per Task 62 AMENDED):**
    1. `src/components/DashboardBenchmarks.jsx:180` (`piutang`): mounted inside `src/components/DashboardView.jsx:306` (`transactions={transactions}`), which is outside `Touch only` and shares `transactions` with 7-day omset/velocity.
    2. `src/utils/vanBay.js:427` (`titipOf`): called from `src/FleetCanvasManager.jsx:1495` (`titipOf(transactions, ...)`), which is outside `Touch only` and pinned at `logicFixes.selfcheck.mjs:8833`.
    3. `src/AgentProfileView.jsx:442, 504-547`: single `(transactions || []).forEach(...)` loop computes both 7-day `lifetimeOmset`/`yearlyAgentOmset`/`lifetimeEXP` and `storeDebt`/`titipIssued`/`titipCollected`, and `L546` (`if (debtKey && storeDebt[debtKey])`) assumes sales appear before payments whereas `mergeConsignmentTx` places 7-day rows ahead of older Titip sales — safely switching it requires splitting the loop and sorting chronologically rather than swapping one list-read line.
- **Gates, Checks & Lab:** `logicFixes.selfcheck.mjs:14562` added regression + Task 56 demo behaviour check at `2026-11-18` (re-anchored `L13360` FIFO slice for `(consignmentTx || transactions)`): **3024 passed, 0 failed**; `undef.check.mjs` -> **clean**; all `src/config/*.selfcheck.mjs` exited **0**; `npm run build` exited **0**; `integration.audit.mjs` **725 passed, 0 failed**; `patchNotes.js` updated (`2026-11-18`). Demo lab (`1440x900`, `T2 Owner` vault unlocked) rendered **Global Receivables · Rp 9.120.000 · 8 shops owe · 3 overdue** with **AMANAH BARU** (`2026-11-06`, `12 of 7d`, `OVERDUE`, `Rp 1.580.000`), `ERRORS: []`; saved to `../A-Brain/Raw/2026-11-18-receivables/rec-task62-pc-1440.jpg`.

## Task 63 - read-only: every rule of Receivables still holds in the NEW screen
**Status:** DONE
**Written:** 2026-11-18 09:30 WIB, by Claude. Aldi: *"u know all the rules make sure the rules also work on this new UI"*.
**Touch only:** this file (then fix what you find as Task 64, BUILD, same shape as 62).

Your Task 23 map listed every rule, press and write of the OLD `src/ConsignmentFinanceView.jsx` (grep "## Task 23"). The new v5 screen (commits e7595752, e4c1e313, 5a696b31) moved the presses. For EVERY rule in that map, say where it is enforced TODAY and whether the new screen can get around it. At least:
- Who sees what: `isAdmin` (= vault open) vs a salesman's own notes (`isInherited`, `myTransactions` L128-157); region filter (`activeRegion`, HQ); member search. Does the new list, the search box, or the "Responsible" chip show a salesman a shop or Rupiah that is not his?
- Hand-off: `handoffEligibility`, `canHandOffAcrossRegions`, `canApproveHandoffFrom`, `normalizeRegion` (`src/config/permissions.js`) - the new Hand-off press goes through `openStoreAction(..., 'transfer')`: does it still reach the same checks before any write? Admin approve vs agent accept (THE SHAKE dot).
- Store Audit & Settle: the "INVALID AUDIT" guard (~L580), `allowCashRefund` / `allowRetur` settings, who may settle - same path as before?
- Add Goods (`onAddGoods`): who may press it, does the new button show for a tier that the old one hid?
- Receipt / share: `handoffLine`, `shareReceipt` - same data?
- Physical Stock and Hand-offs tabs: anything the v5 cut lost (a disabled state, a `busy` guard, a confirm via `confirmAction`)?
- Firestore side: each write still goes through the same handler - list them; anything the rules would now refuse that the UI offers (UI-says-yes-server-says-no: A-Brain `Wiki/Concepts/UI-Says-Yes-Server-Says-No Pattern.md`).
**Result:** ONE table: Rule | where enforced today (file:line) | can the new screen get around it? (no / YES + how) | severity | smallest fix. Every row of Task 23's map gets a line. Then write Task 64 (BUILD) for every YES, and do it.
| Rule | where enforced today (file:line) | can the new screen get around it? | severity | smallest fix |
| :--- | :--- | :--- | :--- | :--- |
| `isAdmin` header title & filters (`activeRegion`, `agentSearch`) vs salesman scope (`myTransactions` + `isInherited`) | `src/ConsignmentFinanceView.jsx:110-157, 372-425, 1016, 1031-1105` | **no** — `arView`, `debtSearch` (`L414`), and "Responsible" (`L1194, 1239`) read strictly from `debtData`/`myTransactions`; region `<select>` & member search stay inside `{isAdmin && ...}` | — | — |
| `debtData` FIFO debt & aging (`Total Outstanding`, `Safe`/`Due soon`/`Overdue`, `notes[].left`) | `src/ConsignmentFinanceView.jsx:169-245, 394-398` | **no** — `debtData` maths unchanged; `5a696b31` wired `notes[].left` to `debtData`'s own `s.debts` walk | — | — |
| `customerData` `Bks Held` vs `A/R Financials` detail `Bks Held` | `src/ConsignmentFinanceView.jsx:292-363, 400, 1250, 1338` | **YES** — `arView` `L400` sums raw drop `n.items` (`it.qty`) instead of remaining converted packs from `cd.items`, so partial payments/returns or `Bal`/`Slop` drops inflate `Bks Held` on `A/R Financials` vs `Physical Stock` (`L1338`) | MED | Compute `bks` from `cd?.items` (fallback using `convertToBks`) at `L400` |
| `handedOwnerByStore` "Responsible" fallback on `arView` | `src/ConsignmentFinanceView.jsx:266-270, 355-356, 399` | **YES** — `L399` reads `handedOwnerByStore[k]?.name` on a `Map` of ID strings (`L267`), always `undefined`, so when `cd` is absent a handed-over shop falls back to the old seller or `Unassigned` | MED | Read `rosterNameById.get(handedOwnerByStore.get(k))` at `L399` |
| `Add Goods` (`onAddGoods` -> `handleAddGoodsToCustomer`, admin-only) | `src/ConsignmentFinanceView.jsx:1217, 1294-1296, 1493`; `src/App.jsx:3913` | **no** — gated behind `{isAdmin && ...}` on Phone (`L1217`), PC (`L1294`), and `Physical Stock` (`L1493`) | — | — |
| Hand-off request (`openStoreAction(..., 'transfer')`, `handoffEligibility`, `canHandOffAcrossRegions`, `normalizeRegion`, `showAllBranches`) | `src/ConsignmentFinanceView.jsx:432-441, 453-517, 589-630, 1218, 1297, 1363-1405, 1512`; `src/App.jsx:1965-2056` | **no** — Phone & PC buttons route via `openStoreAction(..., 'transfer')` into `transferMode`; `handoffEligibility` runs in `handoffTargets` (`L501`), `submitAction` (`L596`), and `handleRequestTransfer` (`App.jsx:2009`) | — | — |
| Store Audit & Settle (`openStoreAction(..., 'audit')`, `"INVALID AUDIT!"`, `confirmAction`, `onPayment` -> `handleConsignmentPayment`, `allowRetur`/`allowCashRefund`) | `src/ConsignmentFinanceView.jsx:432-441, 568-584, 633-678, 1219, 1299, 1407-1515`; `src/hooks/useTransactionEngine.js:513-665` | **no** — routes via `openStoreAction(..., 'audit')` to the same `auditMode` inputs, `handleAuditInput` `"INVALID AUDIT!"` guard, `confirmAction`, and `handleConsignmentPayment`; admins & field agents settle own + inherited stores; `allowCashRefund`/`allowRetur` remain unused by consignment audit (stock returns only, no cash refund) | — | — |
| `Receipt` modal, `handoffLine`, `shareReceipt` | `src/ConsignmentFinanceView.jsx:161-166, 717-1007, 1291-1293` | **no** — `Receipt` (`L1291` PC) opens the unchanged `viewingReceipt` thermal/A4 modal with `handoffLine` (`L743, L823`) and `shareReceipt` (`L997`) *(PC shortcut added; phone `A/R` row omits shortcut, still opens after `Store Audit`)* | — | — |
| Physical Stock & Hand-offs tabs (`pendingAdminRequests`, `incomingRequests`, `outgoingRequests`, `canApproveHandoffFrom`, THE SHAKE dot, `See it on the journey map`, `busy`/`disabled`/`confirmAction`) | `src/ConsignmentFinanceView.jsx:530-566, 1115-1134, 1511-1610`; `src/App.jsx:2058-2285` | **no** — queues unchanged; `L1131` dot stays inside button without `animate-ping` (no shake); `confirmAction` & `freshSnap` unchanged in `handleAdminApproveTransfer`; no `busy`/`disabled` guard lost vs pre-v5 (`e7595752~1` also lacked `busy`/`disabled` on `submitAction` / hand-off buttons) | — | — |
| Consignment history delete (`onDeleteConsignment` / `handleDeleteConsignmentData`) | `src/App.jsx:3511-3532, 5550` | **no** — not exposed in v5 UI; `!isAdmin && notMine` guard intact in `App.jsx` | — | — |
| Firestore write handlers & rules (`transactions`, `sales_stats`, `products`/`motorists`, `account_transfers`, `customers`, `notifications`) | `src/hooks/useTransactionEngine.js:577-657`; `src/App.jsx:2019-2285`; `firestore.rules:762-798, 840-880, 944-952, 1065-1070` | **no new bypass from v5** (`0` Firestore calls added); **2 pre-existing UI-says-yes-server-says-no rule gaps on `Authorize Transfer` (`L1561`)**: **(A)** `ConsignmentFinanceView:558` (`canApproveHandoffFrom`) lets a named T5/T6 (`approvalRegions`) click `Authorize Transfer`, while `firestore.rules:950` requires `isFleetTier(bossUid)` (`T1-T4` only); **(B)** `App.jsx:2235` updates `customers/{id}` (`ownerAgentId`, `handoffs`), which `firestore.rules:771-778` refuses if a T3/T4 approver has `view_only`, `own_region` (`branch != region`), or T4 `folderLimited` without `adminEdit`/folder match | LOW (pre-existing rules drift) | **Console rules draft only (never edit `firestore.rules` in git):** allow named `approvalRegions` on `account_transfers` approve or add `approvingHandoff` customer update exception for `T3/T4` |

---

## Task 64 - BUILD: fix the two v5 `arView` mismatches found in Task 63
**Status:** DONE
**Written:** 2026-11-18 10:47 WIB, by Antigravity (LEAD per `GEMINI.md` OVERRIDE).
**Touch only:** `src/ConsignmentFinanceView.jsx` (`L399-400` and `arView` deps `L425`), `src/config/logicFixes.selfcheck.mjs`, this file.

Fix the two `YES` rows from Task 63 in `src/ConsignmentFinanceView.jsx`:
1. `L399`: replace broken Map bracket lookup `handedOwnerByStore[k]?.name` with `rosterNameById.get(handedOwnerByStore.get(k))`.
2. `L400`: compute `arView` `bks` from `cd?.items` (already converted via `convertToBks` and reduced by `itemsPaid`/`itemsReturned`/`RETURN`), falling back to `convertToBks` over `notes` items only when `cd` is absent; add `rosterNameById` and `inventory` to `arView` `useMemo` deps (`L425`).
**Done when:** `logicFixes.selfcheck.mjs` has a regression check proving `bks` reads `cd.items` (not raw `n.items`) and `handedOwnerByStore.get(k)` via `rosterNameById`, all five gates in `GEMINI.md` OVERRIDE pass, and commit is saved starting `Antigravity:`.
**Result:**
- Fixed `src/ConsignmentFinanceView.jsx:399-402, 427` (`arView` now resolves `rosterNameById.get(handedOwnerByStore.get(k))`, computes `bks` from `cd.items` with `convertToBks` fallback, and includes `rosterNameById, inventory` in deps).
- Added regression check `RECEIVABLES V5 ARVIEW CONSISTENCY (Task 64, 2026-11-18)` in `src/config/logicFixes.selfcheck.mjs`.
- All 5 gates green after final edit: `undef.check.mjs` (`clean`), `logicFixes.selfcheck.mjs` (**3025 passed, 0 failed**), all 14 `src/config/*.selfcheck.mjs` scripts (exit 0), `npm run build` (`built in 11.97s`, exit 0), `integration.audit.mjs` (**725 passed, 0 failed**).

## Task 65 - BUILD: wire the 3 remaining 7-day consignment readers onto consignmentTx (from Aldi)
**Status:** DONE
**Written:** 2026-11-18 11:08 WIB, from Aldi. Same rules as Task 62.
**Touch only:** `src/App.jsx` (`L5120`, `L5151`, `L5174` props), `src/components/DashboardView.jsx` (`L54`, `L307`), `src/components/DashboardBenchmarks.jsx` (`L59`, `L180`, `L186`), `src/FleetCanvasManager.jsx` (`L48`, `L1495`), `src/AgentProfileView.jsx` (`txSeconds` import, `L126`, `L439-549` split consignment loop sorted by `txSeconds`, `L609`), `src/config/logicFixes.selfcheck.mjs`, `src/config/patchNotes.js`, this file.

Move the 3 multi-file Task 60 Table 1 readers left in Task 62 onto `consignmentTx` without altering any money rule or widening 7-day revenue/omset/velocity:
1. Command Center `Piutang`: `App.jsx` passes `consignmentTx` to `DashboardView` -> `DashboardBenchmarks`, where `piutang` calls `outstandingTitip(consignmentTx || transactions)`.
2. Fleet Loading Bay `Titip`: `App.jsx` passes `consignmentTx` to `FleetCanvasManager`, where `titip = titipOf(consignmentTx || transactions, customers, sel.id, inventory)`.
3. Agent Profile `Consignment Risk (Titip)`: `App.jsx` passes `consignmentTx` to `AgentProfileView`; keep 7-day `transactions` for `lifetimeOmset`, `yearlyAgentOmset`, `todayOmset`, `todayCash`, charts & volume, and run `titipIssued` / `titipCollected` / `storeDebt` in its own loop over `(consignmentTx || transactions)` sorted by `txSeconds` (so payments on old Titip notes never hit an uninitialized `storeDebt[debtKey]`!).
**Done when:** regression + Task 56 demo behaviour checks pass for all 3 places (`logicFixes.selfcheck.mjs`), 1 patch note line added, all 5 gates in `GEMINI.md` OVERRIDE pass, committed starting `Antigravity:` (wait for Aldi's `"push"`).
**Result:**
- Wired `consignmentTx` from [App.jsx](src/App.jsx) (`L5121`, `L5152`, `L5176`) to:
  1. `DashboardView.jsx:54,308` -> `DashboardBenchmarks.jsx:59,180,186` (`piutang: outstandingTitip(consignmentTx || transactions)`).
  2. `FleetCanvasManager.jsx:48,1495` (`titipOf(consignmentTx || transactions, customers, sel.id, inventory)`).
  3. `AgentProfileView.jsx:21,127,507-550,611` (split `titipIssued`, `titipCollected`, and `storeDebt` into a `titipSorted` loop over `consignmentTx || transactions` sorted by `txSeconds`, keeping `lifetimeOmset`, `yearlyAgentOmset`, `todayOmset`, `todayCash`, charts, and volume strictly on 7-day `transactions`).
- Updated `logicFixes.selfcheck.mjs:8833` pin + added `COMMAND CENTER, FLEET BAY, AGENT PROFILE READ CONSIGNMENTTX (Task 65, 2026-11-18)` asserting both wiring and Task 56 demo (`today=2026-11-18`, `outstandingTitip(consignmentTx) = Rp 9.120.000`, `titipOf(..., 'demo-agent-1')` `AMANAH BARU = Rp 1.580.000`). Added EN/ID patch note in `src/config/patchNotes.js`.
- All 5 gates green after final edit: `undef.check.mjs` -> `clean`; `logicFixes.selfcheck.mjs` -> **3027 passed, 0 failed**; all 14 `src/config/*.selfcheck.mjs` scripts -> exit `0`; `npm run build` -> built in `10.62s` (exit `0`); `integration.audit.mjs` -> **725 passed, 0 failed**; `graphify update .` -> `3369 nodes, 6651 edges`.

## Task 66 - read-only: exact Console `firestore.rules` draft text for Task 63's 2 Authorize Transfer gaps (from Aldi)
**Status:** DONE
**Written:** 2026-11-18 11:08 WIB, from Aldi. READ-ONLY (NEVER edit `firestore.rules` on disk).
**Touch only:** this file.

Draft the exact `old line`, `new line`, and `why` for both `Authorize Transfer` server-vs-UI mismatches from Task 63 so Aldi can paste/publish them in Firebase Console, and verify the drafted rules compile & pass in the Firestore emulator (`@firebase/rules-unit-testing`) against an in-memory rules string (never touching `firestore.rules`).
**Result (`firestore.rules` on disk untouched — verified `RULES_DRAFT_VERIFIED_7_OF_7` in Firestore emulator):**
1. **Add approver helpers after `firestore.rules:180` (`isFleetTier`):**
   - **Old line (`L180`):**
     `function isFleetTier(bossUid) { return isCompanyTopTier(bossUid) || isAreaAdmin(bossUid) || isFleetCaptain(bossUid); }`
   - **New lines:**
     ```
     function isFleetTier(bossUid) { return isCompanyTopTier(bossUid) || isAreaAdmin(bossUid) || isFleetCaptain(bossUid); }
     function isNamedHandoffApprover(bossUid, regionUpper) {
       let profile = getEmployeeProfile();
       let aId = profile != null ? profile.get('agentId', '') : '';
       let mDoc = isAuthenticated() && profile != null && profile.bossUid == bossUid && aId != ''
         ? get(/databases/$(database)/documents/artifacts/cello-inventory-manager/users/$(bossUid)/motorists/$(aId)) : null;
       let regions = mDoc != null ? mDoc.data.get('approvalRegions', null) : null;
       return regions is list && (regionUpper == null ? regions.size() > 0 : regionUpper in regions);
     }
     function canApproveTransferDoc(bossUid, tr) {
       let toDoc = get(/databases/$(database)/documents/artifacts/cello-inventory-manager/users/$(bossUid)/motorists/$(tr.toAgentId));
       let r = toDoc != null ? toDoc.data.get('location', 'UNASSIGNED').trim().upper() : 'UNASSIGNED';
       return isFleetTier(bossUid) || isNamedHandoffApprover(bossUid, r);
     }
     function canHandoffStampCustomer(bossUid) {
       let profile = getEmployeeProfile();
       let role = profile != null ? profile.get('userRole', 'NONE') : 'NONE';
       let aId = profile != null ? profile.get('agentId', '') : '';
       let mDoc = isAuthenticated() && profile != null && profile.bossUid == bossUid && aId != ''
         ? get(/databases/$(database)/documents/artifacts/cello-inventory-manager/users/$(bossUid)/motorists/$(aId)) : null;
       let regions = mDoc != null ? mDoc.data.get('approvalRegions', null) : null;
       return isVaultOwner(bossUid) || (isAuthenticated() && profile != null && profile.bossUid == bossUid && (
         isT1Tag(role) || role == 'ADMIN' || role == 'COMPANY_OWNER' || role == 'AREA_ADMIN' || role == 'FLEET_CAPTAIN' ||
         (regions is list && regions.size() > 0)
       ));
     }
     ```
   - **Why:** Single-profile-read helpers matching `canApproveHandoffFrom` (`permissions.js:515-547`) without exceeding Firestore's 1,000-expression limit.
2. **Gap A — `account_transfers` update (`firestore.rules:950`):**
   - **Old line (`L950`):** `allow update: if isSalesman(bossUid) && (request.resource.data.get('status', '') != 'APPROVED' || isFleetTier(bossUid));`
   - **New line:** `allow update: if isSalesman(bossUid) && (request.resource.data.get('status', '') != 'APPROVED' || canApproveTransferDoc(bossUid, resource.data));`
   - **Why:** Allows named `approvalRegions` approvers (even T5/T6 when delegated in Fleet) to approve hand-offs into their named region while denying un-named T5/T6.
3. **Self-grant guard on `motorists` (`firestore.rules:880`):**
   - **Old line (`L880`):** `(isSalesman(bossUid) && getEmployeeProfile().agentId == motoristId) ||`
   - **New line:** `(isSalesman(bossUid) && getEmployeeProfile().agentId == motoristId && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['approvalRegions'])) ||`
   - **Why:** Stops a salesman from writing `approvalRegions` onto their own `motorists` doc to grant themselves hand-off approval.
4. **Gap B — `customers/{customerId}` ownership stamp (`firestore.rules:778`):**
   - **Old line (`L778`):** `allow update: if isSalesman(bossUid) && folderLimited(bossUid) && folderEditOk(bossUid) && grosirUpdateOk() && ownerFieldsUpdateOk();`
   - **New lines:**
     ```
     allow update: if isSalesman(bossUid) && folderLimited(bossUid) && folderEditOk(bossUid) && grosirUpdateOk() && ownerFieldsUpdateOk();
     allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['mappedBy', 'ownerAgentId', 'ownerAgentName', 'handoffs']) && canHandoffStampCustomer(bossUid);
     ```
   - **Why:** Lets authorized hand-off approvers (`App.jsx:2235`) stamp store ownership & `handoffs` trail even when `view_only`, `own_region`, or `folderLimited` (`adminEdit: false`) blocks general shop edits, while still denying `priceTier` (`Grosir`) or address changes.

## Task 67 - BUILD + Console firestore.rules draft: bind customer hand-off stamp to an APPROVED account_transfers doc (`lastHandoffId`) (from Aldi)
**Status:** DONE
**Written:** 2026-11-18 12:25 WIB, from Aldi (replaces unsafe Task 66 part 4 caught by Claude's review). NEVER edit `firestore.rules` on disk.
**Touch only:** `src/App.jsx` (`L2239` add `lastHandoffId: request.id`), `src/config/logicFixes.selfcheck.mjs`, this file.

1. In `src/App.jsx` (`handleAdminApproveTransfer`, ~`L2235-2249`), add `lastHandoffId: request.id` to the `custRef` batch update payload alongside `mappedBy`, `ownerAgentId`, `ownerAgentName`, and `handoffs`.
2. Rewrite the `firestore.rules` Console draft (all 4 parts together) so `canHandoffStampCustomer` requires:
   - `lastHandoffId` points to an `account_transfers/<id>` whose `getAfter(...)` doc has `status == 'APPROVED'`, `toAgentId == request.resource.data.ownerAgentId`, and matches the same store (`customerId == customerId`, or normalized `storeName == name` when `customerId` is unset).
   - `canApproveTransferDoc(bossUid, tr)` so a named approver can only approve/stamp their own `approvalRegions` (and never `'UNASSIGNED'`).
   - `changed.hasAny(['ownerAgentId', 'lastHandoffId'])` alongside `hasOnly(['mappedBy', 'ownerAgentId', 'ownerAgentName', 'handoffs', 'lastHandoffId'])`.
3. Verify in the Firebase Firestore emulator including all refusals: named T6 stamping a shop in another region = denied; `view_only` T4 stamping with no approved hand-off = denied; stamp pointing at a `PENDING` hand-off = denied; mismatched `toAgentId`/store = denied. Also verify all 5 repo gates pass.
**Result (`firestore.rules` on disk untouched — updated per Claude's review, verified `RULES_67: 21 passed, 0 failed` in Firestore emulator):**
- Added `lastHandoffId: request.id` to `src/App.jsx:2239` inside `handleAdminApproveTransfer`'s `custRef` batch update, plus regression check in `src/config/logicFixes.selfcheck.mjs:4393-4395` (`412ac4cc`, held locally until Console rules publish).
- Repo checks green after last edit: `undef.check.mjs` -> `clean`, `logicFixes.selfcheck.mjs` -> `3028 passed, 0 failed`, all 14 `src/config/*.selfcheck.mjs` -> exit `0`, `npm run build` -> `built in 11.58s` (exit `0`), `integration.audit.mjs` -> `725 passed, 0 failed`.
- Updated Console `firestore.rules` draft (`canApproveTransferDoc` now delegates to `isFleetTier(bossUid) || isNamedTransferApprover(bossUid, tr)` instead of a hand-written role list) and verified in Firestore emulator (`RULES_67: 21 passed, 0 failed`):
  1. Still allowed: Vault owner, T1 `ADMIN`, T2 `COMPANY_OWNER`, normal T3 `AREA_ADMIN`, normal T4 `FLEET_CAPTAIN` (both `folder OFF` and `folder adminEdit:false + view_only`), named T6 (`BANDUNG`), `view_only` T4 on legacy `customerId: null` (normalized `storeName`), T5 updating own `motorists` `photo` (without `approvalRegions`), T5 visit write on folder-visible `c1` -> ALL ALLOWED.
  2. Refusals: named T6 (`BANDUNG`) stamping `c2` in `MUNTILAN` (even with `tr_other_approved`) -> DENIED; named T6 batch-approving `MUNTILAN` handoff -> DENIED; `view_only` T4 with no/missing `lastHandoffId` or pointing at `PENDING_ADMIN` -> DENIED; wrong `ownerAgentId != tr.toAgentId` or wrong store -> DENIED; un-named T5 approve/self-grant `approvalRegions` -> DENIED; `priceTier: 'Grosir'` alone or piggybacked -> DENIED.
  3. Tested `412ac4cc` (`lastHandoffId` write) against TODAY's unmodified `firestore.rules` on disk: Vault owner, T1 `ADMIN`, T2 `COMPANY_OWNER`, T3 `AREA_ADMIN`, and normal T4 (`folder OFF`, no `view_only`) -> ALLOWED; `view_only` / `folder adminEdit:false` T4 and named T6 (`BANDUNG`) -> REFUSED until the 4 rules parts publish.

## Task 68 - BUILD: Rebuild Reports screen (`src/components/HistoryReportView.jsx`) to approved `.claude/drafts/reports-live.html` (segment 5)
**Status:** DONE
**Written:** 2026-11-18 13:38 WIB, per Aldi + `.claude/NEXT-SESSION.md` 13:30 directive.
**Touch only:** `src/components/HistoryReportView.jsx`, `src/styles/theme.css`, `src/config/logicFixes.selfcheck.mjs`, `src/config/integration.audit.mjs` (`delMarks` update if wording `Delete` buttons), `src/config/patchNotes.js`, this file.

Rebuild `src/components/HistoryReportView.jsx` by cut-and-place using Task 59's line map to match `.claude/drafts/reports-live.html` (PC master-detail + phone under-row, 5-cell KPI strip with sparkline and payment mix, 5 tabs `Ledger` / `Folders` / `Products` / `Salesmen` / `Returns`, `DATA AUDIT` modal, `Proof` modal, `<SaleReceipt>`, and `Print PDF` with scale):
1. Keep money lines byte-identical (`stats` L278-319, `handleEditSubmit` L395-401). Hide the Net Profit tile from the view only (`stats.totalProfit` still computed). No profit anywhere on screen; the money word is `Omset`.
2. Keep `data-guide="offer-performance"` and `data-guide="package-returns"` (`!isFieldAgent`), `convertToBks`, `tallySaleOp`, `promoGiven`, `packageReturns`, and `countClears` (`Package counts cleared, last 30 days:`).
3. Keep all buttons on `.kpm-edge-btn` (zero amber fill), preserve light/dark palette tokens (`--danger-ink`, `--accent-ink`, `--ink-dim`, etc.), update stale `HistoryReportView` Tailwind selectors in `logicFixes.selfcheck.mjs` (+ add Task 68 checks), add EN/ID patch note, run all 5 gates, and render PC (1440x900) + phone (390x844) lab screenshots before waiting on `"push"`.
**Result:**
- Rebuilt `src/components/HistoryReportView.jsx` + added `.kpm-rep-*` styles in `src/styles/theme.css` matching `.claude/drafts/reports-live.html`:
  - Master-detail Omset ledger (`Ledger`), 5-cell KPI strip (`Omset` with `<RollingNumber>` + 14-day sparkline, `Receipts`, `Moved`, `Shops served`, `How they paid`), dashed `Pull archive` banner when range reaches past 7 days, underline tabs (`Ledger`, `Folders`, `Products`, `Salesmen`, `Returns`), under-row inline drawer on phones (`<=1023px`), `DATA AUDIT` edit modal, `Proof` viewer, `<SaleReceipt>`, and `Print` summary view at `printScale%`.
  - Kept `stats` (`totalProfit` computed, hidden from view; Omset only, zero profit/cuan text) and `handleEditSubmit` (`commitInChunks` + `tallySaleOp` `-1`/`+1`) untouched; preserved `data-guide="offer-performance"` and `"package-returns"`, `promoGiven`, `packageReturns`, and `countClears` (`Package counts cleared, last 30 days:`).
  - Updated `src/config/logicFixes.selfcheck.mjs` (`PHONE SWEEP: REPORTS`, button fill check zero exclusions, plus `REPORTS V2 MASTER-DETAIL & OMSET ONLY` check), `src/config/integration.audit.mjs` (`delMarks` 12 -> 10 for worded `Delete` & `Delete all history for this shop` buttons + worded delete assertion), and added EN/ID patch note in `src/config/patchNotes.js`.
- Verified all 5 gates green after final edit: `undef.check.mjs` -> `clean`; `logicFixes.selfcheck.mjs` -> **3028 passed, 0 failed**; all 14 `src/config/*.selfcheck.mjs` -> exit `0`; `npm run build` -> built in `11.66s` (exit `0`); `integration.audit.mjs` -> **726 passed, 0 failed**.
- Verified in demo lab (`lab-task68.mjs`, `T2 Owner` + vault unlocked): `hasProfitText: false`, `overflowPC: false`, `overflowPhone: false`, `underOpen: true`, `ERRORS: []`; screenshots saved in `../A-Brain/Raw/2026-11-18-reports/rep-pc-1440.jpg` and `rep-phone-390.jpg` (and Artifact `reports-v2-lab.md`). Waiting on Aldi's `"push"`.

**Task 62 AMENDED 2026-11-18 09:40 by Claude, after reading Task 60's Result (pick = option a, second listener, no rules change):**
- NO 90-day cap. His words say "not limited"; a note 100 days old that still owes must show. Listen to every Titip SALE + every CONSIGNMENT_PAYMENT + RETURN with no date limit. The read cost grows with history - write the number in the Result; archiving paid-off notes is a LATER task, not this one.
- Scope = ALL 7 places in your Task 60 table 1 (Receivables, Command Center Piutang, sales terminal sidebar, App.jsx delete + hand-off L3512, Map shop card, Agent Profile Titip, vanBay titipOf). Feed them a SEPARATE merged list (`consignmentTx` = 7-day rows + old consignment rows, de-duplicated by id) - never widen the global `transactions` (Reports, EOD, revenue, Day Replay must keep their 7-day list). Touch only grows to: `src/components/DashboardBenchmarks.jsx`, `src/MerchantSalesView.jsx`, `src/MapMissionControl.jsx`, `src/AgentProfileView.jsx`, `src/utils/vanBay.js` - ONLY the line where each reads its list. If one needs more than that, list it in the Result and leave it.
- Each money rule stays where it is (`debtData`, `outstandingTitip`, `debtCredit`, `titipOf`): more rows in, same maths.

## Task 69 - BUILD: Separate `Titip given` from `How they paid` mix bar in Reports (`HistoryReportView.jsx`)
**Status:** DONE
**Written:** 2026-11-18 14:32 WIB, per Aldi directive after Task 68 push.
**Touch only:** `src/components/HistoryReportView.jsx`, `src/config/logicFixes.selfcheck.mjs`, `src/config/patchNotes.js`, this file.

In `src/components/HistoryReportView.jsx` KPI strip:
1. Remove `Titip` from `How they paid` (`mixEntries` keeps `Cash`, `Transfer`, `QRIS` only — previously `Titip` always showed `0%` because `stats.payments` is omset/paid-only).
2. Compute `titipGiven` read-only in `kpiSummary` as the sum of `(t.type || 'SALE') === 'SALE' && isTitip(t)` `Number(t.total) || 0` in `contextualTransactions`. Do NOT touch `stats` (`useMemo`).
3. Render `Titip given {formatRupiah(kpiSummary.titipGiven)}` on its own `.d` line below `.kpm-rep-mixl`.
**Done when:** All 5 gates pass, lab PC screenshot confirms the 3-way mix bar + `Titip given Rp ...` line, Task 69 is `DONE`, committed locally starting `Antigravity:`, and waiting for Aldi's `"push"`.
**Result:**
- Updated `src/components/HistoryReportView.jsx` (without touching `stats`): imported `isTitip` from `../utils/revenueRule`, removed `Titip` from `mixEntries` (`Cash`, `Transfer`, `QRIS` only), computed `titipGiven` read-only across `(t.type || 'SALE') === 'SALE' && isTitip(t)` in `kpiSummary`, and rendered `Titip given {formatRupiah(kpiSummary.titipGiven)}` below `.kpm-rep-mixl`.
- Added regression check in `src/config/logicFixes.selfcheck.mjs` + EN/ID entry in `src/config/patchNotes.js`.
- Verified all 5 gates green after final edit: `undef.check.mjs` -> `clean`; `logicFixes.selfcheck.mjs` -> **3029 passed, 0 failed**; all 14 `*.selfcheck.mjs` -> exit `0`; `npm run build` -> exit `0` (`13.51s`); `integration.audit.mjs` -> **726 passed, 0 failed**.
- Verified in demo lab (`lab-task69.mjs`, `T2` + vault unlocked): `HOW THEY PAID RP 258,9 JT` -> `Cash 100% Transfer 0% QRIS 0%`, sub-line `Titip given Rp 1.180.000`, `overflowPC: false`, `ERRORS: []`. Screenshot saved to `../A-Brain/Raw/2026-11-18-reports/rep-task69-pc-1440.jpg` (Artifact `rep-task69-pc-1440.jpg`). Waiting on Aldi's `"push"`.

## Task 70 - READ-ONLY + Picture: Map `CustomerManager.jsx` & draw `.claude/drafts/customers-pro.html` (segment 6)
**Status:** DONE
**Written:** 2026-11-18 14:50 WIB, per Aldi + `.claude/NEXT-SESSION.md` Segment 6 directive.
**Touch only:** `.claude/drafts/customers-pro.html`, `.claude/PROGRESS.md`, `.claude/NEXT-SESSION.md`, this file (never edit `CustomerManager.jsx` before Aldi approves the picture).

**Line map of `src/components/CustomerManager.jsx` (1,828 lines):**
- **Sub-component `CustomerDetailView` (`L25-187`):** Competitor benchmarks subcollection listener/add/delete (`L31-48`, `[data-kpm-del]` `L175`), Map/Street View toggle (`L106-115`), `Open in Map Mission Control` (`sessionStorage.targetMapStore` `L122-128`), add-log form + ruled table (`L138-181`).
- **Permissions & Requests (`L207-268`):** `customerAccessLevel` (`view_only` / `own_region` / `global`), `canEditCustomer` (`L219-229` respecting `customerScope` & `isRegionUnclassified`), `grantsGrosir` (`L232`), `grosirAsks` & `decideGrosir` (`L233-247`), `ownerAsks` & `giveSalesman` (`L252-268`, assigns `assignedAgent` from `roster`).
- **Folders, Borders & Geo (`L300-468`):** `folderCard` (`MoreKey` `⋯` + desktop inline `EDIT`/`DEL`, `<NixieCount rollIn /> Pending`), `watchBorders` (`L341`), `searchedCustomers` (`L381-393`), `folderStructure` (`L395-463`: border pin `areaFromPin` + dictionary + uppercase canonical folders + `customProv/Kab/Kec`), bulk rename `commitInChunks` (`L491-520`), custom add folder (`L523-530`), bulk delete folder to Unknown (`L533-559`), fast move `handleFastStoreMove` (`L562-576`).
- **Admin Tools & Save Validation (`L578-1187`):** `handleAutoGeocode` / `handleGetLocation` / `handleCoordInputChange` (`L578-616`), `handleImportKML` (`L626-707`), Duplicate Finder `handleFindDuplicates` / `handleNotDuplicate` (`settings/duplicate_ignores`) / `handleResetIgnores` / `handleDeleteDuplicate` (`L715-840`), `handleRepairTierField` (`L856-891`), `handleEnterpriseDataScrub` (`L897-966`), `handleSubmit` (`L968-1089`: uppercase area, `waNumber`, compulsory non-`0,0` GPS pin, `grosirHold` + notifications), `handleEdit` / `closeForm` / `handleDelete` / `openForEdit` / `handleApproveNOO` / `targetEditStore` catcher (`L1091-1187`).
- **Layout & Modals (`L1189-1828`):** `adminTools` (`L1196-1234`, `Repair Tiers`, `Find Duplicates`, `Data Scrub`, `Import KML` — phone behind `Admin tools ▾` `L1371-1382`), Duplicate Report (`L1245-1351`), `view_only` banner (`L1355-1360`), `+ Add new customer` (`L1361-1369`), Portal Add/Edit modal (`L1388-1573`, includes `data-guide="photo"` upload + photo preview/delete), Search (`L1576-1585`), `Grosir requests` (`L1589-1605`), `Shops waiting for a salesman` (`L1608-1633`), Breadcrumb + Prov/Kab/Kec folder grids + A-Z Store Cards (`L1638-1824`, Tier + Price + `Grosir?` + `T3/T4 PIC` + `NOO By` + `MoreKey` + Move/Verify/Map/Edit/Del).
**Result:**
- Upgraded `.claude/drafts/customers-pro.html` to the same playable standard as `.claude/drafts/reports-live.html`:
  - Dual-mounted live app (`mount(#pc, 'pc')` + `mount(#ph, 'phone')`) where tapping a phone row opens/folds its `.under` detail drawer live.
  - Theme follows the device (`System` / `Light` / `Dark`), `Motion On` / `Lite`, and Role (`T1/T2 Boss` / `T3/T4 Regional` / `T5 View Only`).
  - Rolling digits (`rollHTML` + `settleRolls`) on all KPI counters + animated `Price Mix` bar, self-drawing gold check `.toast` on every save, drawn SVG icons throughout (zero emoji), zero profit/cuan text, and in-page dialogs (`.ov > .dlg`) for `Delete`, `+ Folder`, `Rename Folder`, `Reset to Unknown`, `Edit / Add Customer` (`data-guide="photo"`), `Data Scrub`, and `Import KML` (zero `alert`/`confirm`/`prompt`).
  - Verified every button in headless Chrome (`verify-customers-live.mjs`: `Add Log`, `Delete` log, `+ Folder`, `Confirm Grosir`, `Give` salesman, `Run Tier Repair`, `Not duplicates`, `Preview Scrub`, `Choose .kml`, `Edit Shop` + photo + save, phone `.under` drawer, and theme switches — `ERRORS: []`), rendered & inspected `customers-pro-pc.png` and `customers-pro-phones.png` (`../A-Brain/Raw/2026-11-18-customers/`), and updated `customers-picture.md`. Waiting on Aldi's ok before writing the Customers BUILD task.

## Task 71 - Playable Customers Layout C (`.claude/drafts/customers-c.html`) (from Aldi)
**Status:** DONE
**Written:** 2026-11-18 15:38 WIB, from Aldi + `.claude/NEXT-SESSION.md` 15:34 directive.
**Touch only:** `.claude/drafts/customers-c.html`, this file.

Build `.claude/drafts/customers-c.html` (taking section C of `.claude/drafts/customers-concepts.html` as the look, to the `.claude/drafts/reports-live.html` standard):
1. Three panes on PC: (1) folder tree `Prov › Kab › Kec` with shop counts, red late bar, `"Needs action"` on top, and `+ Folder` / `Rename` / `Reset to Unknown` working; (2) picked area's 4 numbers (`Shops`, `Late`, `Grosir`, `Asks`) and its shops (or the `Needs action` queue when `"Needs action"` is picked); (3) full shop (`facts`, GPS map + Street View switch, address, `Open in Map`, `WhatsApp`, competitor prices add + delete, move folder, `Verify NOO`, `Edit shop`, `Delete`).
2. `Grosir` asks (`Keep` / `Confirm`) and `Give` to a salesman open from `"Needs action"`; `Admin tools` (`tier repair`, `duplicates` with `Not duplicates`, `data scrub`, `KML import`) open from the `Admin tools` key; `Add customer` / `Edit shop` opens the full form with compulsory GPS coordinates.
3. In-page confirm/input boxes (never `alert`/`confirm`/`prompt`), rolling digits on numbers, self-drawing gold check on every save, `System / Light / Dark` theme, `Lite` motion switch, `T1/T2 · T3/T4 · T5` view switch, live phone frame where panes stack (`tree → area → shop`, with a back key), zero profit anywhere, and 0 errors in headless Chrome.
**Result:**
- Built `.claude/drafts/customers-c.html` matching section C of `.claude/drafts/customers-concepts.html` to the `.claude/drafts/reports-live.html` playable standard:
  - PC 3-pane layout (`250px` folder tree `Prov › Kab › Kec` + `Needs action` on top with counts & red late-visit bars | `310px` area pane with 4 rolling numbers `Shops`, `Late`, `Grosir`, `Asks`, `Rename` / `Reset to Unknown`, and A–Z shop rows | `1fr` full shop in hand with 8 facts, `Location` `Both / GPS map / Street View` switch + `Open in Map` + `WhatsApp`, `Competitor intelligence` add + delete, and bottom `Move folder` / `Verify NOO` / `Edit shop` / `Delete`).
  - Live Phone frame (`390×844`) where the three panes stack (`Tree → Area → Shop`) with a `← Folders` / `← <Area>` back key and step bar.
  - `"Needs action"` opens the live `Grosir` (`Keep` / `Confirm`) and `Waiting for a salesman` (`Give`) queues; `Admin tools` opens `Repair store tiers`, `Find duplicates` (`Not duplicates`, `Show/Hide`, `Bring all back`, `Edit`, `Delete`), `Data scrub` preview + run, and `Import KML`; `+ Add customer` / `Edit shop` opens the full 6-column form enforcing non-zero GPS coordinates.
  - Verified every button in headless Chrome (`verify-customers-c.mjs`: `ERRORS: []`, zero `alert`/`confirm`/`prompt`, zero profit/cuan text).

## Task 72 - READ-ONLY: what the real competitor log stores, vs what the side-by-side card needs (from Claude)
**Status:** DONE
**Written:** 2026-11-19 06:40 WIB, for Customers C v3 (`.claude/drafts/customers-c.html`, function `compareCard`).
**Touch only:** this file.
1. In `src/components/CustomerManager.jsx` (and any util it calls), find every place a competitor / benchmark price is WRITTEN and READ. Give `file:line` for each, the Firestore path, and every field name written.
2. Find the `firestore.rules` lines that gate that path (read + write, which tiers).
3. Table: each thing the side-by-side card shows (our product + price, rival name + price, logged date, older price of the same rival, shelf, promo, selling speed, same rival at other shops) -> EXISTS (field name) / NEW. For each NEW: the smallest data change, and whether a rules line must change.
4. (added 2026-11-19 06:53, picture v4) The card now also needs: a rival CATALOG set by us (rival name + category + the Cello product we pair it with), one CATEGORY list shared by our products and rivals, and each price log pointing at a catalog entry. For each: where our product category lives today (`type` / `category`, `file:line`, how the category list is built), and the smallest new collection/fields + the `firestore.rules` lines that would gate them (who may add a category, a rival, change a pair).
5. (added 2026-11-19 07:20, Aldi's new direction - see Task 78) Also map: how a REGION is stored and checked today (`normalizeRegion`, `src/config/permissions.js:411`, and the rules side), how our price per customer type (Retail / Grosir / Ecer) is stored on a product, and the smallest new data for (a) a rival price per region x customer type and (b) a "salesman report waiting for approval" record, with the `firestore.rules` lines each needs (T4 sees and approves only his own region; T3 and above all regions).
**Done when:** Result has the 5 parts with `file:line` on every claim and a `could not check:` line.
**Result:**

### 1. Every place competitor / benchmark data is READ or WRITTEN today
- **Firestore path:** `artifacts/${appId}/users/${user.uid}/customers/${customer.id}/benchmarks/{benchmarkId}`
- **Live UI (`src/components/CustomerManager.jsx`):**
  - **READ (listener):** `src/components/CustomerManager.jsx:31-32` (`onSnapshot` ordered by `createdAt desc`), rendered at `L159-178` (`b.product`, `b.brand`, `b.price`, `b.volume`, `b.notes`).
  - **CREATE:** `src/components/CustomerManager.jsx:40` (`addDoc`) from state initialized at `L27`. Exact fields written: `brand` (string), `product` (string), `price` (`parseFloat(newBench.price)`), `notes` (string), `volume` (`'High Sales' | 'Medium' | 'Slow Moving'`, `L143`), `createdAt` (`serverTimestamp()`).
  - **DELETE:** `src/components/CustomerManager.jsx:48` (`deleteDoc`), triggered from `L175`. No update/edit handler exists.
- **Backup / Restore / Wipe (`src/App.jsx`):**
  - **READ (backup / export):** `src/App.jsx:766-767` (JSON export) and `src/App.jsx:970-971` (USB backup).
  - **WRITE (restore / import):** `src/App.jsx:1027-1028` (USB restore) and `src/App.jsx:4340-4341` (JSON import).
  - **DELETE (nuclear wipe):** `src/App.jsx:926-928`.

### 2. `firestore.rules` gating that path today
- **`firestore.rules:780-782`:**
  ```
  match /benchmarks/{benchmarkId} {
    allow read, write: if isSalesman(bossUid);
  }
  ```
- **Who passes `isSalesman(bossUid)` (`firestore.rules:157-160`):** ANY authenticated employee of the company (`T3–T6`, plus `T1/T2` via the `users/{bossUid}/{document=**}` catch-all at `firestore.rules:552-563`) has full **read, create, update, and delete** access to every shop's `benchmarks`, with zero field checks and zero region checks.

### 3. Side-by-side card fields: EXISTS vs NEW

| What the card shows | Status | Existing field / smallest new data change | Rules change needed? |
| :--- | :--- | :--- | :--- |
| Our product + price | **EXISTS** | `products/{id}`: `name`, `priceRetail`, `priceGrosir`, `priceEcer`, `priceDistributor` (`src/App.jsx:3714, 3878-3881`, `src/utils/helpers.js:871-872`). | No (`firestore.rules:626-627` already allows `isSalesman` read). |
| Rival name + price | **EXISTS** (per shop) / **NEW** (global region price) | Today `benchmarks`: `brand`, `product`, `price` (`CustomerManager.jsx:27,40`). Moving to global catalog: `competitors/{rivalId}.name` + `region_prices/{REGION}` (see Part 5). | **Yes** — new collection rules (Parts 4–5). |
| Logged date | **EXISTS** | `benchmarks`: `createdAt` (`CustomerManager.jsx:40`). | No. |
| Older price of same rival | **NEW** (needs stable key) | Today `product` is free text (`CustomerManager.jsx:141`), so typos break matching. Add `rivalId` pointing to `competitors/{rivalId}` + keep history in `priceHistory` or approved `competitor_reports`. | **Yes** — allow `rivalId` on report/log doc. |
| Shelf position | **NEW** | Add `shelf` (`'Eye level' \| 'Top shelf' \| 'Bottom shelf' \| 'Counter / till'`) on the salesman report / approved shop sighting. | **Yes** (if fields are whitelisted on new collection). |
| Promo | **NEW** | Today only hinted inside free-text `notes` (`CustomerManager.jsx:145`). Add structured `promo` (`'None' \| 'Poster' \| 'Discount' \| 'Free gift'`). | **Yes** (in field whitelist). |
| Selling speed | **EXISTS** (different wording) | `benchmarks.volume` (`'High Sales' \| 'Medium' \| 'Slow Moving'`, `CustomerManager.jsx:27,143`). Map cleanly or store `speed: 'Fast' \| 'Medium' \| 'Slow'`. | No (or whitelist `speed`). |
| Same rival at other shops / region speed | **NEW** (query shape) | Today `benchmarks` is a subcollection under each shop (`CustomerManager.jsx:31`), so comparing across shops requires N queries or a `collectionGroup('benchmarks')` index. Storing approved shop sightings in a company-level `competitor_reports` collection (indexed by `rivalId` + `region` + `status == 'APPROVED'`) gives cross-shop speed in 1 listener. | **Yes** — new `match /competitor_reports/{id}` rule. |

### 4. Rival catalog, shared category list, and where product category lives today
- **Where our product category lives today:**
  - Single free-text string `type` on `products/{id}`, entered at `src/App.jsx:5285` (`<input name="type" placeholder="SKT, Natural…"/>`) and saved raw via `FormData` in `handleSaveProduct` (`src/App.jsx:3698-3719`); promo items force `type = 'PROMO'` (`src/App.jsx:3716`, `src/StockOpnameView.jsx:940`).
  - There is **NO stored category list** today — every screen builds categories on the fly by scanning `inventory`: `src/components/ResidentEvilInventory.jsx:246-254` (`item.type || "MISC"`) and `src/MerchantSalesView.jsx:1690` (`["ALL", ...new Set(inventory.map(i => i.type || "MISC"))]`).
- **Smallest new collections / fields:**
  1. **`users/{bossUid}/product_categories/{catId}`**: `{ name, normName, subs: [{ id, name, normName }], createdBy, updatedAt }` — ONE shared 2-level list for both Master Vault products and rival products.
  2. **On `products/{productId}`**: add optional `categoryId` and `subCategoryId` while **keeping `type` synced** to the category name so legacy screens (`ResidentEvilInventory`, `MerchantSalesView`, `ExamineModal`, `DashboardBenchmarks`) never break during rollout. Also add `'categoryId', 'subCategoryId'` to the `rsk-*` Sell Again whitelist at `firestore.rules:669,674`.
  3. **`users/{bossUid}/competitors/{rivalId}`**: `{ name, normName, categoryId, subCategoryId, pairProductId, createdBy, updatedAt }`.
- **`firestore.rules` gating them:**
  - `product_categories/{catId}`: `allow read: if isSalesman(bossUid);` · `allow create, update: if isCompanyTopTier(bossUid) || isAreaAdmin(bossUid) || isFleetCaptain(bossUid);` (or matrix-gated helper mirroring `opnameDecider` at `firestore.rules:129-139` defaulting to T1–T4) · `allow delete: if isCompanyTopTier(bossUid) || isAreaAdmin(bossUid);` (app blocks delete while any product/rival references `catId`).
  - `competitors/{rivalId}`: `allow read: if isSalesman(bossUid);` · `allow create, update: if isCompanyTopTier(bossUid) || isAreaAdmin(bossUid) || isFleetCaptain(bossUid);` (same matrix helper defaulting T1–T4 for adding rivals & changing `pairProductId`) · `allow delete: if isCompanyTopTier(bossUid) || isAreaAdmin(bossUid);`.
  - Lock writes on legacy `customers/{customerId}/benchmarks/{benchmarkId}` (`firestore.rules:780-782`) to read-only (`allow read: if isSalesman(bossUid); allow write: if false;`) once the approval flow goes live.

### 5. Region checking today, product prices per customer type, and smallest data + rules for region × customer-type rival prices & salesman approval queue
- **How REGION is stored & checked today:**
  - **App side:** `normalizeRegion(location)` at `src/config/permissions.js:411` (`String(location || 'UNASSIGNED').trim().toUpperCase()`), used for employee branch (`motorists.location`, `employee_directory.location`), regional offers (`src/App.jsx:5371`), and transfer approvals (`src/config/permissions.js:457, 463, 507, 536, 546`).
  - **Rules side (two existing patterns):**
    1. Exact branch-to-region doc ID match in `promoOffers/{region}` (`firestore.rules:1019-1028`): `loc is string && loc.trim() != '' && loc.trim().upper() == region;` — note `T1–T3` (`isCompanyTopTier || isAreaAdmin`) write any region, `T4` (`isFleetCaptain`) writes ONLY `isOwnRegionDoc()`.
    2. Customer-doc comparison in `isOwnRegionMatch(bossUid)` (`firestore.rules:228-235`): compares `profile.location.lower().trim() == resource.data.region.lower().trim()` (flagged in comments `L220-226` because `customer.region` is Kabupaten while `employee.location` is branch).
- **How our price per customer type is stored on a product:**
  - Flat numeric fields on `products/{productId}`: `priceRetail`, `priceGrosir`, `priceEcer`, `priceDistributor` (`src/App.jsx:3714, 3878-3881, 5374-5377`; resolved by `src/utils/helpers.js:871-872` and `src/MerchantSalesView.jsx:175, 208-210, 872`).
- **Smallest new data + `firestore.rules`:**
  - **(a) Rival price per region × customer type — subcollection `users/{bossUid}/competitors/{rivalId}/region_prices/{region}`** (doc ID = `normalizeRegion`, matching `promoOffers/{region}` at `firestore.rules:1019`):
    - Fields: `{ Retail: number, Grosir: number, Ecer: number, updatedBy: string, updatedAt: timestamp }`.
    - **Why a sub-doc per region instead of a map on `competitors/{rivalId}`:** Firestore rules cannot hide fields inside a document; keying the doc by `{region}` lets rules truly enforce T4's own-region read scope (not just hide columns in the UI).
    - **Rules:**
      - `allow read: if isCompanyTopTier(bossUid) || isAreaAdmin(bossUid) || (isSalesman(bossUid) && ownRegionId(region));` (T1–T3 read all regions; T4/T5/T6 read ONLY `region == profile.location.trim().upper()`, where `location` is non-empty and `!= 'UNASSIGNED'`).
      - `allow create, update: if (isCompanyTopTier(bossUid) || isAreaAdmin(bossUid) || (isFleetCaptain(bossUid) && ownRegionId(region))) && request.resource.data.keys().hasOnly(['Retail','Grosir','Ecer','updatedBy','updatedAt']);`
      - `allow delete: if false;` (or `isCompanyTopTier(bossUid)`).
  - **(b) Salesman report waiting for approval — `users/{bossUid}/competitor_reports/{reportId}`:**
    - Fields: `{ shopId, shopName, region, customerType, rivalId, suggestedName, priceSeen, shelf, promo, speed, note, photoUrl, submittedByUid, submittedByName, createdAt, status, priceAction, reviewedBy, reviewedAt, rejectReason }` (`status`: `'WAITING' | 'APPROVED' | 'REJECTED'`, `priceAction`: `'UPDATE_REGION_PRICE' | 'NOTE_ONLY' | null`).
    - **Rules:**
      - `allow read: if isCompanyTopTier(bossUid) || isAreaAdmin(bossUid) || (isSalesman(bossUid) && ownRegionId(resource.data.region));` (T4/T5/T6 query with `where('region', '==', myRegion)`; T3+ query unfiltered).
      - `allow create: if isSalesman(bossUid) && request.resource.data.status == 'WAITING' && request.resource.data.submittedByUid == request.auth.uid && request.resource.data.region is string && request.resource.data.region.trim() != '';` (any tier submits ONLY `'WAITING'`, never pre-approved).
      - `allow update: if (isCompanyTopTier(bossUid) || isAreaAdmin(bossUid) || (isFleetCaptain(bossUid) && ownRegionId(resource.data.region))) && resource.data.status == 'WAITING' && request.resource.data.status in ['APPROVED', 'REJECTED'] && request.resource.data.region == resource.data.region;` (T4 approves/rejects ONLY own region; T3+ any region).
      - `allow delete: if false;` (audit trail kept; T1/T2 retain catch-all at `firestore.rules:561-562` if cleanup needed).
  - Also wire all 3 new collections (`product_categories`, `competitors` + `region_prices`, `competitor_reports`) into USB Backup / Restore / Wipe (`src/App.jsx:766, 926, 970, 1027, 4340`).

**could not check:** Live production Firestore documents or indexes (never touched live Firebase per rules; verified code in `src/` and `firestore.rules` on disk only).

## Task 73 - READ-ONLY: does our product data know sticks per pack? (from Claude)
**Status:** NONE - cancelled 2026-11-19 by Aldi ("dont add price per batang"); skip it.
**Written:** 2026-11-19 06:40 WIB. Rival names carry pack size ("Kretek 12", "Mild 16"); a fair compare is price PER STICK.
**Touch only:** this file.
1. Find where a product (Master Vault) is defined and saved: every field (`file:line`). Is there a sticks / pcs-per-pack / isi field? Name it, or say none.
2. If none: list where the pack size is visible today (product name, unit label, anything) with `file:line`.
3. One paragraph: the smallest way to show "Rp per stick" for both sides without a new field, and the risk if the name does not end in a number.
**Done when:** Result answers 1-3 with `file:line` and a `could not check:` line.
**Result:**

## Task 74 - READ-ONLY: every place the product category (`type`) is read or written (from Claude)
**Status:** DONE
**Written:** 2026-11-19 07:10 WIB. Aldi wants Category > Sub-category on every product (Master Vault + inventory), shared with rival products. Design note: A-Brain `Brainstorm/2026-11-19_categories-subcategories-and-rival-catalog.md`. Before anything is built we need the size of the change.
**Touch only:** this file.
1. Every `file:line` in `src/` and `api/` that READS a product's `type` (tabs, filters, reports, sorting, receipts, exports) and every one that WRITES it (product form, imports, seeds, demo reset). One table: file:line / read or write / what the screen does with it.
2. Is any other field used as a category (`category`, `group`, anything)? `file:line` each.
3. `firestore.rules`: any line that checks `type` or product fields by name.
4. One paragraph: if `type` became `categoryId` + `subCategoryId`, which of the places in part 1 would break if old products still only had `type`.
**Done when:** Result has the 4 parts with `file:line` on every claim and a `could not check:` line.
**Result:**

### 1. Every place a product's `type` is READ or WRITTEN (`src/`, `api/`, plus `demo/seed.json`)

| `file:line` | Read / Write | What the screen / job does with it |
| :--- | :--- | :--- |
| `src/App.jsx:5285` | Read + Write (form input) | Master Vault Edit/New Product modal renders `<input name="type" defaultValue={editingProduct.type} placeholder="SKT, Natural…"/>` (hidden for promo items via `!isPromo(editingProduct)` at `L5282`). |
| `src/App.jsx:3708-3716, 3754-3755` | Write | `handleSaveProduct` captures `name="type"` via `FormData` (`L3708-3709`) and saves to `products/{id}` (`L3754-3755`); for promo items (`isPromo`), overwrites `type: 'PROMO'` (`L3716`). |
| `src/App.jsx:774, 958` | Read (pass-through export) | Full system backup (`generateFullSystemPayload`, `L774`) and Granular export (`handleExportGranular`, `L958`) serialize raw `inventory` + `promoItems` docs verbatim, including `type`. |
| `src/App.jsx:1017, 4321` | Write (pass-through import) | Granular import (`handleImportGranular`, `L1017`) and full restore (`queueToBatch('products', data.inventory)`, `L4321`) write imported product objects verbatim (preserving whatever `type` is in the JSON). |
| `src/components/ResidentEvilInventory.jsx:155` | Read | Master Vault detail header prints `[product.type, !isPromo(product) && "${sticks} sticks per Bks"]` as subtitle. |
| `src/components/ResidentEvilInventory.jsx:248-252, 260, 265` | Read | Master Vault builds its category tabs dynamically (`const type = item.type || "MISC"`), sorts keys alphabetically (`L260`), and filters `currentList` by `sections[activeSection]` (`L265`). |
| `src/components/ResidentEvilInventory.jsx:337-338, 352` | Read | Master Vault product list row subtitle (`L337-338`) and desktop sub-label (`L352`) display `item.type`. |
| `src/components/ExamineModal.jsx:135` | Read | Fullscreen 3D product viewer renders `TYPE: {product.type}`. |
| `src/MerchantSalesView.jsx:1689` | Read | Sales Terminal filters wares by `activeCategory === "ALL" || i.type === activeCategory` (exact string match; `i.type` undefined will never match `"MISC"`!). |
| `src/MerchantSalesView.jsx:1690, 2693` | Read | Sales Terminal builds Row-1 category pills dynamically: `["ALL", ...new Set(inventory.map(i => i.type || "MISC")), ...(bundles.length ? ["BUNDLES"] : [])]` (`L1690`), rendered at `L2693`. |
| `src/MerchantSalesView.jsx:2905` | Read | Sales Terminal desktop product card renders `{item.type || tr('MISC')}`. |
| `src/StockOpnameView.jsx:940` | Write | Quarantine -> Convert to Sampling writes `{ kind: 'promo', unit: 'pcs', type: 'PROMO', damagedFrom: ... }` to `products/dmg-${id}`. |
| `src/StockOpnameView.jsx:950, 954-955` | Read + Write | Quarantine -> Sell Again copies `['type', 'category', ...]` from `sellSrc` (`L950`) onto `products/rsk-${sellSrc.id}` (`L954-955`). |
| `src/components/DashboardBenchmarks.jsx:164-166` | Read | Command Center's Filter/SKM vs Kretek volume mix reads `const type = (item.type || '').toLowerCase()` on each sale line item (`t.items`) and checks `type.includes('skm')` (note: sale lines built at `MerchantSalesView.jsx:1401` and `api/_demoCompany.js:131` do not copy `type`, so today this mostly falls back to `item.name` checking `'filter'` / `'mild'`, even though `prod.get(item.productId)` is already fetched at `L160`). |
| `api/_demoCompany.js:286, 320-322` | Read + Write (seed reset) | Demo company reset reads `seed.inventory` + `seed.promo` from `demo/seed.json` (`L286, 322`) — where products carry `"type": "Natural"`, `"type": "SKT"`, etc. (`demo/seed.json:51, 90`) — and writes them verbatim to `products/{p.id}` (`L320-322`). |
| *(Receipts & Reports)* | None | Verified `src/components/SaleReceipt.jsx` and `src/components/HistoryReportView.jsx`: **0 reads** of `product.type` (every `.type` there is transaction `t.type`). |

### 2. Other category-like fields on products (`file:line`)
- **`category`:** Copied defensively in `src/StockOpnameView.jsx:950` (`['type', 'category', ...]`) and whitelisted on `rsk-*` lots in `firestore.rules:669, 674`, but **0 places** in `src/` or `api/` ever read or display `product.category` (legacy holdover).
- **`kind` (`'promo'`):** Separates promo giveaway goods from sellable products (`src/utils/helpers.js:266` `isPromo = (product) => product?.kind === 'promo'`; written at `src/App.jsx:3716` and `src/StockOpnameView.jsx:940`; checked in `src/utils/supply.js:208-209`, `src/components/ResidentEvilInventory.jsx:97, 155, 274, 344`, `src/components/ExamineModal.jsx:75`).
- **`goods`:** Promo-item sub-type (`tshirt | poster | hat | lighter | ashtray | mug`) selecting the 3D model and thumbnail (`src/utils/helpers.js:294-308`, `src/App.jsx:3718, 5270-5273`, `src/components/PromoLookFields.jsx:16-34`, `src/components/PromoGoods3D.jsx:12`, `src/components/WarehouseChest.jsx:100`).
- **No `group`, `family`, `line`, or `subType` field** exists on products anywhere in `src/` or `api/`.

### 3. `firestore.rules` lines checking `type` or product fields by name
All inside `match /products/{productId}` (`firestore.rules:626-678`):
- **`firestore.rules:663-664`** (T3/T4 fleet load/return & EOD stock update): `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['stock', 'damagedStock', 'name', 'productId'])` — blocks T3/T4 from touching `type` or prices on normal products.
- **`firestore.rules:668-671`** (`Sell Again` damaged-lot create `rsk-*`): `request.resource.data.keys().hasOnly(['name', 'damagedFrom', 'type', 'category', 'images', 'dimensions', 'useFrontForBack', 'sticksPerPack', 'packsPerSlop', 'slopsPerBal', 'balsPerCarton', 'hpp', 'costPrice', 'priceRetail', 'priceGrosir', 'priceEcer', 'priceDistributor', 'stock'])` — **explicitly checks `type` and `category` by name**, so any new `categoryId` / `subCategoryId` written by `StockOpnameView.jsx:950` will be **denied** until added here.
- **`firestore.rules:672-676`** (`Sell Again` damaged-lot update `rsk-*`): same exact 18-field `affectedKeys().hasOnly([...])` whitelist including `'type'` and `'category'`.
- *(T1/T2 writes via `users/{bossUid}/{document=**}` at `firestore.rules:561-562` have no field whitelist.)*

### 4. What breaks if `type` became `categoryId` + `subCategoryId` while old products only had `type`
If the app switched to reading only `categoryId` + `subCategoryId` without a fallback or dual-write, **every old product** (plus restored JSON backups from `src/App.jsx:1017, 4321` and `demo/seed.json:51, 90`) would break in five places at once: (1) **Master Vault tabs and row labels** (`src/components/ResidentEvilInventory.jsx:155, 249, 337-338, 352`) would lump every old product into `"MISC"` / blank subtitle; (2) **Sales Terminal tabs and filtering** (`src/MerchantSalesView.jsx:1689-1690, 2905`) would either drop old products from every category tab (note `L1689` already fails to match `"MISC"` when `type` is missing because it tests `i.type === activeCategory` without `|| "MISC"`) or show them only under `ALL` / `MISC`; (3) **ExamineModal** (`src/components/ExamineModal.jsx:135`) would print a blank `TYPE:`; (4) **Command Center's SKM/Filter vs Kretek mix** (`src/components/DashboardBenchmarks.jsx:164-166`) would lose `type.includes('skm')` if someone ever fixed it to read `p.type` without checking category name; and (5) **Quarantine Sell Again** (`src/StockOpnameView.jsx:950, 954-955`) would either fail with `permission-denied` if `categoryId`/`subCategoryId` are written before updating `firestore.rules:669, 674`, or create damaged lots missing their category if `L950` isn't updated. **Cleanest migration:** keep `type` populated with the resolved category name whenever a product is saved, and have every reader fall back `categoryName(p.categoryId) || p.type || 'MISC'` so old products, old backups, and demo seeds never break.

**could not check:** Live production Firestore `products` documents (never touched live Firebase per rules; verified `src/`, `api/`, `demo/seed.json`, and `firestore.rules` on disk only).

## Task 75 - DISCUSS: your own view on the categories + rival catalog design (from Aldi: "let antigravity also discuss with us") - DO THIS ONE FIRST
**Status:** DONE
**Written:** 2026-11-19 07:15 WIB. Read A-Brain `Brainstorm/2026-11-19_categories-subcategories-and-rival-catalog.md` (Aldi's words + Claude's proposal) and the last 3 entries of `.claude/PROGRESS.md`.
**Touch only:** this file.
Aldi wants a second opinion, not a copy of Claude's. In the Result:
1. For EACH row of Claude's proposal (two fixed levels; one shared list; cross-category allowed; admin current price; matrix row default T1-T4; duplicate warning; build order Master Vault -> rival list -> Customers): AGREE or DISAGREE, one reason from TODAY's code (`file:line`), and a better option if you have one.
2. ALDI ANSWERED 2026-11-19 08:03 (do not re-ask; build Tasks 76/78 to these): customer type = Retail / Grosir / Ecer (*"yes correct that is the customer type that i mean"*); approval = *"tier 4 job to do and tier 3 and above can approve any region"*; a different price at approval = the approver chooses "Update the region price" or "Keep as a note only" (his "choice B"). ALSO DECIDED 08:25: one category list shared by our products and rivals, and adding a rival product offers TWO options - "Add to an existing category" or "Add a new category" (his *"just add features to have 2 options add to the existing category or add new category for that competitor products"*). Give your view on the cost of this choice, not a re-ask.
2b. His new direction (note's last section: a global Competitors segment, the shop tab only reads from it, salesman reports go through admin approval, T4 sees only his region): AGREE / DISAGREE with each part and why.
3. Anything Claude missed: a screen, a report, an export, a rule, a money path that reads the product category and would break (`file:line`).
4. Write it in short plain English for Aldi (he reads it): no jargon without a one-line meaning.
**Done when:** Result has parts 1-4, every code claim has `file:line`, and a `could not check:` line.
**Result:**

### 1. Second opinion on each part of Claude's proposal (plain English for Aldi)

- **Two fixed levels (`Category > Sub-category`) — AGREE.**
  Today `src/MerchantSalesView.jsx:1690` builds a single flat row of tabs from each product's `type` (`["ALL", ...new Set(inventory.map(i => i.type || "MISC"))]`). Two fixed rows (Categories on row 1, Sub-categories of the picked one on row 2) stay easy to tap on a phone and cover your milk example (`Kid > Kid Gold`) without turning every screen into a deep folder tree.
- **One shared category list (our products + rivals) — AGREE, with one small guard.**
  Today promo items (`T-shirt`, `lighter`, `poster`) hardcode `type: 'PROMO'` (`src/App.jsx:3716`, `src/StockOpnameView.jsx:940`). Keep promo goods outside the shared category list (they already have `kind: 'promo'`) so `PROMO` never clutters competitor categories or milk/cigarette pickers.
- **Cross-category comparison allowed — AGREE.**
  No rule or screen in `src/` needs both sides to share a category, and showing each side's `Category › Sub` with a `"Different category"` tag gives you full freedom without losing clarity.
- **Admin current price (now region x customer type) — DISAGREE with one flat price; AGREE with your region x customer-type grid.**
  Claude's first draft had one price per rival product. Your product prices already split into `priceRetail`, `priceGrosir`, `priceEcer` (`src/App.jsx:3878-3880`, `api/_demoCompany.js:127`), and regional offers already key by `normalizeRegion` (`src/config/permissions.js:411`). Storing rival prices by **region x customer type** makes the side-by-side compare apples-to-apples for every shop.
- **Matrix row default T1–T4 — AGREE, with a safety rule for existing companies.**
  `PermissionMatrixEditor` (`src/components/SettingsView.jsx:1664-1688`) loads a saved `settings/permission_matrix` document that replaces defaults. Because existing companies do not have the new competitor keys saved yet, the code MUST use the same fallback rule as `handoff_cross_region` (`src/config/permissions.js:422-430`: if the saved matrix does not mention the key yet, fall back to the tier default) — otherwise existing T1–T4 accounts get locked out until someone re-saves Settings.
- **Duplicate warning on add — AGREE, and make it block exact duplicates, warn on near ones.**
  We already have `normaliseName` (`src/utils/findDuplicates.js:19-20`, turns names into uppercase letters/numbers only) for shops. Reusing the exact same helper on categories and rival products keeps the rule consistent across the whole app, and refusing an *exact* duplicate after normalisation (while warning + offering Merge on a *near* match) prevents accidental double rows on slow phones.
- **Build order (`Master Vault -> rival list -> Customers`) — AGREE, and put `firestore.rules` + USB Backup wiring at step 0.**
  Master Vault sets the shared category list first, Competitors builds the rival catalog and region prices second, and Customers' shop tab reads from it third. Before any code writes the new collections, the new `firestore.rules` must go live in the Console first — including adding `categoryId` / `subCategoryId` to the `Sell Again` damaged-lot whitelist (`firestore.rules:669,674`).

### 2. Cost of your 08:03 and 08:25 choices (not re-asking — just what we pay for them)

- **Retail / Grosir / Ecer x Region price grid:** Low cost on our side (matches `priceRetail` / `priceGrosir` / `priceEcer` already in `src/App.jsx:3878-3880`), and keeps Firestore reads small if one rival product document holds a `pricesByRegion` map (`{ "JAWA BARAT": { Retail, Grosir, Ecer, updatedBy, updatedAt } }`). **Watch-out:** a Firestore rule cannot filter *fields inside* one document — if a T4 is truly forbidden from reading another region's price even in raw database traffic (not just hidden in the UI), then each region's price must be its own sub-document (`competitors/{rivalId}/region_prices/{REGION}`) so Firestore rules can enforce `region == myRegion` on reads.
- **T4 approves own region, T3+ approves any region:** Clean and matches your branch model (`normalizeRegion`, `src/config/permissions.js:411`). Cost: a T4's `location` text must match the region key exactly (just like Fleet & Roster branches); if a T4 has no `location` (`UNASSIGNED`), rules must refuse approval rather than leak across regions.
- **Choice B on approval ("Update region price" vs "Keep as a note only"):** Very smart. One small cost: `"Keep as a note only"` still needs to store the selling speed (`Fast` / `Medium` / `Slow`) on the approved report so the shop's `"How it sells here vs other shops"` line updates even when the region price stayed unchanged.
- **Shared category list with 2 add choices ("Existing" vs "New category"):** Main cost is **category drift** — a regional admin (T4) might create `"Kretek Mild"` when `"Mild"` already exists. Showing the live duplicate warning on `"Add a new category"`, tagging rival-only categories `"competitors only · 0 of ours"` in Master Vault, and letting T1–T3 merge two categories later keeps the shared list tidy.

### 2b. Your new direction (global Competitors screen + read-only shop tab + approval flow + T4 region scope)

- **Competitors as its own global screen — STRONG AGREE.** Today competitor logs live buried inside each shop (`src/components/CustomerManager.jsx:31`, `customers/{id}/benchmarks`), so there is no way to see one rival across Bandung vs Magelang without clicking 20 shops one by one. Moving the catalog and prices to a global screen fixes that completely.
- **Shop tab only reads from global Competitors — STRONG AGREE.** Keeps the shop screen fast and calm, and guarantees one single source of truth for prices.
- **Salesman reports go through admin approval — STRONG AGREE.** Today `firestore.rules:780-782` lets *any* salesman (`isSalesman`) add, edit, or delete competitor records directly. An approval queue stops typos, jokes, or unverified prices from polluting the owner's comparison table.
- **T4 sees only his own region's prices; T3+ sees all regions — AGREE, with the storage note above.** If we store region prices in a subcollection keyed by `REGION` (one doc per region per rival), Firestore rules can truly block a T4 from reading another region's prices, not just hide the column on screen (avoiding a "UI hides it, database still sends it" gap).

### 3. Things Claude missed in TODAY's code (with `file:line`)

1. **Damaged-pack "Sell Again" whitelist will break (`firestore.rules:668-676`, `src/StockOpnameView.jsx:949-955`):** When someone puts damaged packs back on sale (`rsk-<id>`), Firestore rules strictly allow ONLY a fixed list of 18 fields (`type`, `category`, `prices`, etc.). Adding `categoryId` / `subCategoryId` to `StockOpnameView.jsx:950` without updating `firestore.rules:669,674` first will cause `permission-denied` on every Sell Again save.
2. **Command Center's SKM vs Kretek mix is hardcoded for cigarettes (`src/components/DashboardBenchmarks.jsx:164-166`):** It checks `item.type.includes('skm')` and `name.includes('filter') / 'mild'` to calculate `% SKM`. First, if a milk company uses the app, this card makes no sense. Second, it reads `item.type` on the *transaction line item* instead of `p.type` on the product (`L160`), and changing `type` to `categoryId` without keeping `type` synced (or making that chart follow top categories) leaves it blind.
3. **USB Safe Backup, Restore, and Nuclear Wipe (`src/App.jsx:766-768, 926-928, 970-973, 1023-1028, 4334-4341`):** Today Backup & Restore explicitly copies `products` and each shop's `customers/{id}/benchmarks` subcollection. Any NEW collections (`categories`, `competitors`, `region_prices`, `competitor_reports`) will be **silently left out of backups** and **left behind after a wipe** unless we add them to those exact handlers in `App.jsx` (and `SettingsView.jsx:1394-1403` granular export/import).
4. **Master Vault grouping & 3D Examine view (`src/components/ResidentEvilInventory.jsx:155, 249, 337-338, 352`, `src/components/ExamineModal.jsx:135`):** Master Vault groups products by `item.type || "MISC"` (`L249`) and ExamineModal prints `TYPE: {product.type}` (`L135`). Writing BOTH `categoryId`/`subCategoryId` AND keeping `type` set to the category name during migration prevents blank labels anywhere.
5. **Permission Matrix fallback (`src/config/permissions.js:422-430`):** Existing companies already have a saved `permission_matrix` doc. New competitor permissions MUST check `matrixKnowsKey` first so existing T1–T4 accounts get their defaults automatically without waiting for a manual Settings save.
6. **Old `customers/{id}/benchmarks` rule (`firestore.rules:780-782`):** Currently `allow read, write: if isSalesman(bossUid);` — any tier can delete any shop's competitor history. Once the new approval queue ships, lock writes on the old `benchmarks` path so nobody bypasses approval.

### 4. Plain-English summary for Aldi

- **Two levels (`Category > Sub-category`) + one shared list + free cross-category compare + global Competitors screen** is the right shape. It works for cigarettes today and for milk or any other company tomorrow.
- **Two things to lock in before building:**
  1. Store each region's rival price in its own small region record so the database itself (not just the screen) stops a Tier 4 admin from seeing another region's prices.
  2. Wire the new category and competitor tables into **USB Backup / Restore**, **Sell Again damaged packs**, and the **Permission Matrix defaults** so nothing breaks or goes missing for existing companies.

**could not check:** Live production Firestore data (never touched per rules; checked code + `firestore.rules` + `demo/seed.json` shape only).

## Task 76 - PICTURE: Customers C v5 - the shop's competitor tab only READS from the global Competitors screen (draft only) - DO AFTER TASK 78
**Status:** DONE
**Written:** 2026-11-19 07:20 WIB (rewritten after Aldi's new direction): *"we make the competitor segment as its own segment and the competitor inside each of the stores is just some comparison, data taken from the competitor own segment just to see if that product is perform the best in that stores compare to other, all the option to see competitor as a whole, adding or seeing all the competitors just available inside the competitor segment this should be outside of each stores"*.
**Touch only:** `.claude/drafts/customers-c.html`, this file.
Reuse Task 78's data shape (copy its seed arrays so both pictures show the same products and prices). In the shop's "Competitor intelligence" tab (read `compareCard`, `M.rivals`, `RIVALS`, `CATS` first):
1. REMOVE from the shop: the "Rival products & pairs" dialog, "+ New rival product", add category, add rival, change pair, the admin price edit. All of that lives in Task 78's screen now. Leave one link "Open Competitors ›" (toast: "Opens the Competitors screen").
2. Side by side stays, read-only data: our product vs rival, prices = the REGION price for THIS shop's customer type (the shop's price type: Retail / Grosir / Ecer, `s.price`), both sides. Category shown as "Category › Sub" on each side; different categories allowed, tagged "Different category".
3. "How it sells here vs other shops": for each rival product seen at this shop, its selling speed here (from approved salesman reports) next to the other shops in the same region (e.g. "Fast here · Medium in 4 other shops"), so the boss sees where it performs best.
4. "Report a rival" (T5/T6 and up): product picked from the list OR "new product" name, price seen, shelf, promo, selling speed, note, photo -> toast "Sent to your admin for approval" and the shop shows it as "Waiting for approval" (NOT in the comparison until approved).
5. Real tiers in the role switch: T2 Owner, T3 HQ Sales Manager, T4 Regional Admin, T5 Sales Canvas, T6 Sales Motorist (`src/config/permissions.js:45-49`).
6. Same standards as Task 71: every action reports (gold check toast), no blue, no green, no `alert/confirm/prompt`, PC 1240 + phone 390 with nothing cut off, System/Light/Dark, Lite motion, 0 errors in headless Chrome (script, not clicking by hand).
**Done when:** the 6 points work, headless check `ERRORS: []`, and the Result lists each point with what you checked.
**Result:**
- Updated `.claude/drafts/customers-c.html` to share the exact `REGIONS`, `CUST_TYPES`, `CAT_TREE`, `OURS`, and `RIVALS` seed arrays from Task 78 (`.claude/drafts/competitors-pro.html`) and wired the shop's **Competitor intelligence** tab to read prices strictly from the global catalog.
- Verified all 6 points in headless Chrome (`verify-task76.mjs`, `ERRORS: []`):
  1. **Removed catalog edits from shop:** Removed `M.rivals`, `open-rivals`, `add-cat`, `add-rival`, `set-pair`, `pair-edit`, `del-bench`, and admin price edits (`hasOpenRivals: false, hasDelBench: false, hasSetPair: false`). Left one **`Open Competitors ›`** link (`openCompToast: "Opens the Competitors screen"`).
  2. **Side by side (read-only):** Uses `s.prov` × `s.price` (`Retail / Grosir / Ecer`) for both our product and the rival — verified `AMANAH BARU` (`JAWA BARAT · Retail`: `Rp 11.000` vs `Rp 8.500`, `s1HasRetailPrices: true`) and `TOKO JAYA ABADI` (`JAWA BARAT · Grosir`: `Rp 10.400` vs `Rp 8.000`, `s4HasGrosirPrices: true`). Shows `Category › Sub` on both sides, allows cross-category picks freely, and tags **`Different category`** (`hasDiffCatTag: true`).
  3. **How it sells here vs other shops:** Computes each rival's selling speed at this shop against other shops in the same region (`hasRegionSpeed: true` — verified `"Fast here · Medium in 4 other shops in JAWA BARAT"` on `AMANAH BARU`), with `Sells faster here` / `Same as region` / `Slower here` badges.
  4. **Report a rival (T5/T6 and up):** Supports picking an existing rival OR `+ New product`, price seen, shelf, promo, selling speed, note, and shelf photo toggle. Submitting as `T6` fires `"Sent to your admin for approval"` (`reportToast`), appends to **`Waiting for approval`** (`hasWaitingApproval: true`), and leaves the comparison untouched (`logsUnchanged: true`).
  5. **Real tiers switch:** Role switcher uses `T2 Owner`, `T3 HQ Sales Manager`, `T4 Regional Admin (Jawa Barat)`, `T5 Sales Canvas`, `T6 Sales Motorist` (`tiers: ["T2","T3","T4","T5","T6"]`, `t4Sub: "T4 Regional Admin · JAWA BARAT"`).
  6. **Quality & phone fit:** Gold check toast on every action, zero blue/green/alert/confirm/prompt, stacked compare columns + scrollable tabs on phone 390px (`phOverflow: false`), `ERRORS: []`.

## Task 77 - PICTURE: Master Vault categories + sub-categories (new draft)
**Status:** DONE
**Written:** 2026-11-19 07:15 WIB. Aldi: *"this update should also applied on each of our inventory or master vault dont forget about that"*.
**Touch only:** `.claude/drafts/categories-pro.html` (new), this file.
One playable page, same standard as `.claude/drafts/reports-live.html` (dual-mounted PC 1240 + phone 390, in-page dialogs, gold check toast, System/Light/Dark, Lite motion). Look = Master Vault today (read `src/` Master Vault product form first; match its words). Three frames:
1. "Categories" manager in Master Vault: category list, each with its sub-categories; add / rename / delete (delete refuses while products use it and says how many); duplicate warning like Task 76 point 4. Example data: Aldi's milk example (Kid > Kid Silver / Kid Bronze / Kid Gold; Adult > Adult Chocolate / Adult Vanilla / Adult Banana Choco; Elder) AND a cigarette set (SKT, SKM, Mild, Rokok Putih, Kretek), switchable by a "Company" toggle, labeled "example".
2. Product form: Category and Sub-category pickers (sub list follows the category), plus "+ New sub-category" inline.
3. Sales terminal product tabs: row 1 = categories, row 2 = sub-categories of the picked one (one line each, scroll sideways on the phone, never wrap to 3 lines).
Nothing in `src/` changes. 0 errors in headless Chrome.
**Done when:** 3 frames work on PC + phone, `ERRORS: []`, Result lists what you checked.
**Result:**
- Created `.claude/drafts/categories-pro.html` (dual-mounted PC 1240 + Phone 390, Warm Stone / Espresso System/Light/Dark, Lite motion, rolling KPI digits, self-drawing gold check toast, hairline buttons matching Master Vault's `src/App.jsx:5245-5395` wording, zero blue/green/alert/confirm/prompt).
- Verified all 3 frames in headless Chrome (`verify-task77.mjs`, `ERRORS: []`):
  1. **Categories manager:** Switchable **Company** toggle between `Milk Company (example)` (`Kid › Kid Silver / Kid Bronze / Kid Gold`, `Adult › Adult Chocolate / Adult Vanilla / Adult Banana Choco`, `Elder`, `Plant-based`) and `Cigarette Company (example)` (`SKT`, `SKM`, `Mild`, `Rokok Putih`, `Kretek`, `hasCigSet: true`). Categories with 0 of our products carry the **`competitors only · 0 of ours`** tag (`hasMilkCompOnly: true, hasCigCompOnly: true`). Delete **refuses** while products use a category/sub-category and names the exact count (`refusedWithCount: true` — blocked `"Kid"` with `"3 products"`), while deleting an unused category (`Plant-based`) succeeds via in-page confirm (`plantDeleted: true`). Normalized duplicate check warns/blocks (`hasDupWarn: true` on `"k.i.d"`). Add and rename work live on both categories and sub-categories.
  2. **Master Vault product form:** Matches `src/App.jsx:5245-5395` labels (`Product name`, `Description`, `Stock`, `Low-stock warning`, `Packing`, `Prices per <unit>`: `Distributor (cost)`, `Retail`, `Grosir`, `Ecer`, `Box pictures`, `Save product`). Linked `Category` and `Sub-category` pickers update immediately (`subFollowsCat: true`), inline **`+ New sub-category`** adds and selects `"Adult › Adult Matcha"` (`inlineAdded: true`), and saving updates live data + toast (`saveToast: "Saved \"NutriKid Silver 400g (example)\" · Adult › Adult Matcha"`).
  3. **Sales terminal product tabs:** Row 1 = `ALL` + active categories + `BUNDLES`; Row 2 = `All <Cat>` + sub-categories of the picked category (reflecting newly added `"Adult Matcha"`, `pcHasInlineSubInTerminal: true`). Both rows stay strictly single-line with sideways scroll on PC and Phone 390 (`pcRow1H: 32, pcRow2H: 28, phRow1H: 32, phRow2H: 28`, `phTermOverflow: false, phFormOverflow: false`, `ERRORS: []`).

## Task 78 - PICTURE: the global Competitors screen (new draft) - DO RIGHT AFTER TASK 75
**Status:** DONE
**Written:** 2026-11-19 07:20 WIB. Aldi: *"i dont think that our competitor will give different price for each of their retailer, they may also set their price according to the customer type ... tier 4 can only see the price difference within his own region ... while the tier 3 and above as default can see all of the prices between region ... salesman should give us information towards the product to the admin through the app and admin approve and add it to global competitor screen"*.
**Touch only:** `.claude/drafts/competitors-pro.html` (new), this file.
One playable page, same standard as `.claude/drafts/reports-live.html` (dual-mounted PC 1240 + phone 390, in-page dialogs, gold check toast, rolling digits, System/Light/Dark, Lite motion, real tiers T2-T6 switch, look of `.claude/drafts/customers-c.html`). Seed: 3 regions (e.g. JAWA BARAT, JAWA TENGAH, JAWA TIMUR), customer types Retail / Grosir / Ecer, 5-6 rival products in Category › Sub (cigarette example names from Aldi's messages, labeled "example").
1. **Rival products** list grouped by Category › Sub. Each product opens a price table: rows = customer type, columns = regions, plus our paired Cello price per customer type. Cells that differ between regions are marked. T3 and above see every region; T4 sees ONLY his own region's column (switch the tier and it must change); T5/T6 see their region read-only.
2. **Compare**: pick ANY of our products and ANY rival (category shown, different categories allowed and tagged), pick region + customer type, see both prices, the gap in Rp and %, and the price ladder of that sub-category.
3. **Reports waiting** (the approval queue): salesman reports (shop, salesman, product or "new product", price seen, shelf, promo, speed, photo, date). Approve -> the approver picks "Update the region price" or "Keep as a note only"; Reject -> asks a short reason (in-page box). A report whose product name matches an existing one after lower-casing and removing spaces/dots/dashes shows "Looks like <existing>" and offers Merge. T4 sees and approves only his region; T3 and above all. Every action reports with a toast.
4. **Manage** (T4 and above by default): add / rename category and sub-category, add rival product, set its Cello pair, edit the region price (shows "by <name> · <date>"). Duplicate warning on add.
4b. (Aldi 08:25) Adding a rival product - and approving a salesman's "new product" report - shows TWO choices side by side: **"Add to an existing category"** (pick Category › Sub from the ONE list shared with our products) or **"Add a new category"** (type a new category and/or sub-category; the duplicate warning runs on it). A category made this way is shared too: in Task 77's Categories manager it shows with the tag "competitors only · 0 of ours" until one of our products uses it.
5. A note on the page listing the new permission-matrix rows and their defaults: "See competitor prices in all regions" T1-T3 · "Approve competitor reports and edit prices" T1-T4 (own region for T4) · "Report a competitor" all tiers.
6. 0 errors in headless Chrome (script), no blue, no green, no `alert/confirm/prompt`, nothing cut off at 390.
**Done when:** the 6 points work, `ERRORS: []`, and the Result lists each point with what you checked.
**Result:**
- Created `.claude/drafts/competitors-pro.html` (dual-mounted PC 1240 + Phone 390, Warm Stone / Espresso System/Light/Dark theme, Lite motion, rolling KPI digits, self-drawing gold check `.toast`, real tiers `T2 Owner / T3 HQ Sales Manager / T4 Regional Admin (JAWA BARAT) / T5 Sales Canvas / T6 Sales Motorist`, 3 regions × `Retail / Grosir / Ecer`, 6 example rival products across `CAT_TREE` shared with Task 76).
- Verified all 6 points in headless Chrome (`verify-task78.mjs`, `ERRORS: []`):
  1. **Rival products:** Grouped by `Category › Sub`; price table shows 5 columns (`Customer type + 3 regions + Our pair`) for T2/T3 (`colsT2: 5`) and drops to 3 columns (`Customer type + JAWA BARAT + Our pair`) for T4 (`colsT4: 3`), shading cells that differ across regions and marking `LOWEST`; T5/T6 hide `Manage` and edit icons (`t5HasManage: false, t5HasEditBtn: false`).
  2. **Compare:** Free cross-category compare between any Cello product and any rival for picked region + customer type, tagging `"Different category"` (`hasDiffCatTag: true`), showing Rp & % gap butterfly bars and sub-category price ladder.
  3. **Reports waiting:** T4 sees only its 3 `JAWA BARAT` reports (`t4ReportsCount: "3"`) while T2/T3 see all 4 (`t2ReportsCount: "4"`); near-duplicate `"rival-kretek.12"` shows `"Looks like Rival Kretek 12"` + working `Merge into existing` (`hasNearMatch: true`); Approve supports Choice B (`Update the region price` vs `Keep as a note only`); Reject asks a short reason in-page.
  4. **Manage + 4b:** Adding a rival or approving a `"New product"` report shows both `"Add to an existing category"` and `"Add a new category"` side by side with live duplicate warnings (`hasDupWarn: true`); new competitor categories appear tagged `"competitors only · 0 of ours"` (`hasCompOnlyTag: true`); category rename, sub-category add, pair change, and region price edit (`by <name> · <date>`) all work in-page.
  5. **Permission matrix defaults note:** Footer bar lists all 3 rows and defaults (`T1–T3`, `T1–T4 own region for T4`, `All tiers`).
  6. **Quality & phone fit:** Zero blue/green/alert/confirm/prompt, phone detail back navigation works (`phHasBack: true`), `phOverflow: false`, `ERRORS: []`.

## Task 79 - PICTURE FIXES from Claude's review of Tasks 77 + 78 (draft only)
**Status:** NONE - merged into Task 81 (do its 6 points there).
**Written:** 2026-11-19 09:04 WIB. Claude read both files whole and rendered them; these are the faults found.
**Touch only:** `.claude/drafts/competitors-pro.html`, `.claude/drafts/categories-pro.html`, this file.
1. `competitors-pro.html` `confirm-approve` (new product) and `save-rival`: they write prices into ALL 3 regions and invent Grosir (= price - 500) and Ecer (= price + 1000). Fix: set ONLY the report's region x customer type (approve) or the approver's visible regions (add rival: T4 = JAWA BARAT only); every other cell stays empty and shows "—" with "not set yet". No made-up numbers.
2. `competitors-pro.html` report form (`M.reportForm`): add Promo and a "Shelf photo" toggle (Task 78 asked for photo); keep shop + customer type.
3. `categories-pro.html` looks different from the other pictures (white cards, system font, its own colours). Use the SAME `:root` tokens, dark tokens and Inter font as `.claude/drafts/customers-c.html` / `competitors-pro.html` so the three pages look like one app.
4. `categories-pro.html` phone, Sales terminal row 2: the hint "Pick a category on row 1 to filter sub-categories (always 1 line)" is cut off at 390 px. Shorten it to "Pick a category above".
5. `categories-pro.html` example names Aldi never gave: remove "Plant-based / Oat Milk" and the sub "Elder Calcium" (keep "Elder" with no sub-category). Only Aldi names categories.
6. Headless check `ERRORS: []` for both files after the edits.
**Done when:** 1-6 done and the Result lists what you checked for each.
**Result:**

## Task 80 - READ-ONLY: build plan for STEP 1 (Master Vault categories + sub-categories)
**Status:** DONE
**Written:** 2026-11-19 09:04 WIB. Design decided (A-Brain Brainstorm 2026-11-19 categories note). Build order: step 0 rules, step 1 Master Vault categories, step 2 Competitors, step 3 Customers tab. This task plans ONLY steps 0 + 1, using your Task 74 and Task 75 findings.
**Touch only:** this file.
1. Data: the smallest shape for the shared category list (collection name, fields, one doc per category with a `subs` array or a sub-collection - pick one and say why) and the new product fields (`categoryId`, `subCategoryId`), keeping `type` written with the category NAME during the change-over.
2. Every code change for step 1 as a table: file:line / what changes / why. Include Master Vault grouping (`ResidentEvilInventory.jsx`), ExamineModal, product form, Sales Terminal tabs (`MerchantSalesView.jsx:1690`), Sell Again (`StockOpnameView.jsx:950`), USB Backup/Restore/Wipe (`App.jsx` lines from Task 75), `DashboardBenchmarks.jsx:164`, and promo items (`kind: 'promo'`, keep them out of the list).
3. The exact `firestore.rules` text to ADD for step 0 (Console first): who may read the category list (everyone in the company), who may write it (the new matrix row, default T1-T4), and the two new keys in the Sell Again whitelist (`firestore.rules` ~L669/L674). Text only - never edit `firestore.rules`.
4. The permission-matrix row(s) to add in `src/config/permissions.js` with the `matrixKnowsKey` fallback (L422-430) so old companies get the default.
5. The `logicFixes.selfcheck.mjs` lines that would guard it (one regression guard + one real-numbers check).
**Done when:** Result has parts 1-5 with `file:line` on every claim and a `could not check:` line.
**Result:**

### 1. Data shape (shared category list + product fields)
- **Collection:** `artifacts/{appId}/users/{bossUid}/product_categories/{catId}`
- **Choice: ONE doc per category with an embedded `subs` array** (not a subcollection).
  - *Why:* A company has ~5–30 categories and ~2–10 sub-categories each (well under Firestore's 1 MB doc limit). One `onSnapshot(collection(..., 'product_categories'))` loads every category AND every sub-category in a single listener (zero N+1 subcollection listeners on cold phone start), adding/renaming/deleting a sub-category is one atomic doc write, and USB Backup/Restore/Wipe handles it as one flat array just like `products`.
- **Document fields (`product_categories/{catId}`):**
  ```js
  {
    name: 'Kid',                 // display name
    normName: 'kid',             // lowercase alphanumeric only (duplicate guard)
    subs: [                      // empty array [] for top-level-only categories like 'Elder'
      { id: 'sub_173...', name: 'Kid Silver', normName: 'kidsilver' }
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: 'Aldi (T2)'
  }
  ```
- **Product fields (`artifacts/{appId}/users/{bossUid}/products/{productId}`):**
  - Add optional `categoryId: string` and `subCategoryId: string` (`''` when top-level only).
  - **Dual-write `type` during change-over:** on every non-promo product save, write `type: pickedCategory.name` alongside `categoryId` + `subCategoryId`. Every legacy reader, restored backup, or older phone still sees a valid category string in `product.type`.
  - **Promo items (`kind: 'promo'`):** stay untouched (`kind: 'promo', unit: 'pcs', type: 'PROMO'`, `src/App.jsx:3716`, `src/StockOpnameView.jsx:940`) and are NEVER written into `product_categories`.

### 2. Every code change for Step 1

| `file:line` | What changes | Why |
| :--- | :--- | :--- |
| `src/utils/productCategories.js` *(new)* | Pure helpers: `normCatName(s)`, `findDuplicateCategory(cats, name, skipId)`, `findDuplicateSub(cat, name, skipId)`, `resolveCategoryName(prod, cats)` (`cat?.name \|\| prod.type \|\| 'MISC'`), `resolveSubName(prod, cats)`, `categoryUsageCount(catId, inventory)` / `subUsageCount(subId, inventory)`. | Single source of truth shared by Master Vault, Sales Terminal, ExamineModal, DashboardBenchmarks, and `logicFixes.selfcheck.mjs`. |
| `src/hooks/useDatabaseSync.js:34-62, 88-108, 290-302` | Add `[productCategories, setProductCategories] = useState([])`, subscribe `onSnapshot(collection(db, basePath, 'product_categories'), ...)`, unsubscribe on cleanup, and return `productCategories`. | Live synced category list available to every screen without extra queries. |
| `src/App.jsx:606, 5150-5232` | Destructure `productCategories` from `useDatabaseSync`, pass `productCategories` + `canManageCategories(userRole)` + category write handlers (`handleSaveCategory`, `handleDeleteCategory`) into `ResidentEvilInventory` and `MerchantSalesView`. | Wires Master Vault Categories manager and Sales Terminal 2-row tabs to Firestore. |
| `src/App.jsx:5282-5286` (Master Vault product form) | For `!isPromo(editingProduct)`: replace `<input name="type" .../>` with a searchable Category picker (`Our categories` first, `Competitor-only categories` under a divider) + linked Sub-category picker (options follow picked `categoryId`) + inline `"+ New sub-category"` control. Keep `isPromo` block (`L5260-5276`) untouched. | Matches approved Task 81 H design; keeps `PROMO` out of the shared category list. |
| `src/App.jsx:3708-3719, 3754-3755` (`handleSaveProduct`) | When `!promo`: save `categoryId`, `subCategoryId`, and dual-write `type: resolvedCatName` (preserving `editingProduct.type` if no category picked yet). Keep `if (promo) Object.assign(data, { kind: 'promo', unit: 'pcs', type: 'PROMO' })` at `L3716` byte-identical. | Ensures new products carry IDs while old screens/backups reading `type` never break. |
| `src/components/ResidentEvilInventory.jsx:155, 230, 246-265, 296-305, 337-338, 352` | Add `"Categories"` manager button + modal (`Our categories` vs collapsed-by-default `Competitor-only categories`, add/rename/delete blocked when `categoryUsageCount > 0` or `subUsageCount > 0`, duplicate warning). Update `sections` memo (`L246-254`) to group by `resolveCategoryName(item, productCategories)`, display `Category › Sub` on detail (`L155`) and rows (`L337-338, 352`). Show Main warehouse stock only (no branch/regional warehouse). Promo items keep their own `PROMO` tab or existing `isPromo` handling, never added to `product_categories`. | Implements Master Vault Categories manager + 2-level display (Task 77 + Task 81 H). |
| `src/components/ExamineModal.jsx:135` | Render `TYPE: {[resolveCategoryName(product, productCategories), resolveSubName(product, productCategories)].filter(Boolean).join(' › ')}` (falling back to `product.type`). | Prevents blank `TYPE:` in 3D viewer and shows `Category › Sub`. |
| `src/MerchantSalesView.jsx:104, 1689-1690, 2691-2699, 2905` | Add `activeSubCategory` state (`'ALL'`). Build Row-1 categories from `inventory` (already excludes `isPromo` at `useDatabaseSync.js:35`) using `resolveCategoryName(i, productCategories)`. Add Row-2 single-line horizontally scrollable sub-categories for the picked category (`overflow-x-auto flex-nowrap`, never wraps to 3 lines). Fix `L1689` filter to match `resolveCategoryName(i, productCategories) === activeCategory` (fixes existing bug where undefined `i.type` didn't match `"MISC"`) + optional `subCategoryId` match. Display `Category › Sub` at `L2905`. | Implements 2-row Sales Terminal tabs (Task 77 frame 3) with full legacy fallback. |
| `src/StockOpnameView.jsx:940, 950-955` | Leave `L940` (`QUARANTINE_SAMPLING`, `kind: 'promo', type: 'PROMO'`) unchanged. In `L950` (`QUARANTINE_SELL`, `rsk-*` lot), add `'categoryId', 'subCategoryId'` to the `keep` array: `['type', 'category', 'categoryId', 'subCategoryId', ...]`. | Damaged-pack lots keep their category & sub-category on the Sales Terminal (requires Step 0 rules live FIRST). |
| `src/App.jsx:774, 916-933, 957-960, 1014-1019, 4320-4326` | Add `productCategories` to `generateFullSystemPayload` (`L774`), `handleExportGranular` when `type === 'products' \|\| type === 'both'` (`L958`), `handleImportGranular` (`L1014-1019`), full restore (`L4321`, `queueToBatch('product_categories', data.productCategories)`), and nuclear wipe (`L916-933`, delete every doc in `product_categories`). | Prevents categories from being silently dropped on backup/restore or orphaned after a nuclear wipe. |
| `src/components/DashboardBenchmarks.jsx:160-166` | Change `L164` from `(item.type \|\| '').toLowerCase()` to `(p.type \|\| resolveCategoryName(p, productCategories) \|\| item.type \|\| '').toLowerCase()` using `p = prod.get(item.productId)` already fetched on `L160`. | Keeps Command Center's Filter/SKM vs Kretek mix working on both legacy `type` and new `categoryId` products. |
| `src/config/permissions.js:184-195, 422-431` + `src/components/SettingsView.jsx:1723` | Add `'manage_product_categories'` to default `ROLE_PERMISSIONS` (`TIER_2`, `TIER_3`, `TIER_4`), `ALL_FEATURES` in `PermissionMatrixEditor`, and `canManageCategories(userRole)` with `matrixKnowsKey` fallback (see Part 4). | Matches matrix default T1–T4 without locking out existing companies. |

### 3. Exact `firestore.rules` text to ADD for Step 0 (publish in Console BEFORE Step 1 code — text only, `firestore.rules` NOT edited)

**3a. Helper (add right after `sellDamagedHolder` at `firestore.rules:155`):**
```
    // [CHANGE 29 — DRAFT] WHO MANAGES SHARED PRODUCT CATEGORIES (Master Vault + Competitors).
    // Mirrors canManageCategories in src/config/permissions.js: until 'manage_product_categories' is
    // saved in settings/permission_matrix, T1-T4 may write; once saved, the matrix switch wins (T3-T4).
    // T1/T2 also pass via isCompanyTopTier / users/{bossUid} catch-all; T5/T6 stay read-only unless enabled.
    function categoryManager(bossUid) {
      let profile = getEmployeeProfile();
      let role = profile != null ? profile.get('userRole', 'NONE') : 'NONE';
      let m = getPermissionMatrixDoc(bossUid);
      let saved = m != null && ('matrix' in m) ? m.matrix : {};
      let key = 'manage_product_categories';
      let known = key in saved.get('DEVELOPER', []) || key in saved.get('COMPANY_OWNER', []) || key in saved.get('AREA_ADMIN', []) ||
        key in saved.get('FLEET_CAPTAIN', []) || key in saved.get('FIELD_OPERATIVE', []) || key in saved.get('ROOKIE', []);
      return isAuthenticated() && profile != null && profile.bossUid == bossUid &&
        (known ? key in saved.get(role, []) : (role == 'AREA_ADMIN' || role == 'FLEET_CAPTAIN'));
    }
```

**3b. New collection match (add inside `match /artifacts/cello-inventory-manager/users/{bossUid}`, right after `match /products/{productId}` at `firestore.rules:678`):**
```
      // [CHANGE 29 — DRAFT] Shared 2-level category list (Master Vault + Competitors).
      // Every signed-in company member reads; T1-T4 (or saved matrix 'manage_product_categories') write.
      match /product_categories/{catId} {
        allow read: if isSalesman(bossUid);
        allow create, update: if (isCompanyTopTier(bossUid) || categoryManager(bossUid)) &&
          request.resource.data.keys().hasOnly(['name', 'normName', 'subs', 'createdAt', 'updatedAt', 'updatedBy']) &&
          request.resource.data.name is string && request.resource.data.name.size() > 0 &&
          request.resource.data.subs is list;
        allow delete: if isCompanyTopTier(bossUid) || categoryManager(bossUid);
      }
```

**3c. Two new keys in the `Sell Again` (`rsk-*`) whitelist (`firestore.rules:669` and `firestore.rules:674`):**
- **Old line 669 (`allow create`):**
  `request.resource.data.keys().hasOnly(['name', 'damagedFrom', 'type', 'category', 'images', 'dimensions', 'useFrontForBack',`
- **New line 669:**
  `request.resource.data.keys().hasOnly(['name', 'damagedFrom', 'type', 'category', 'categoryId', 'subCategoryId', 'images', 'dimensions', 'useFrontForBack',`
- **Old line 674 (`allow update`):**
  `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name', 'damagedFrom', 'type', 'category', 'images', 'dimensions',`
- **New line 674:**
  `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name', 'damagedFrom', 'type', 'category', 'categoryId', 'subCategoryId', 'images', 'dimensions',`

*(Publish order: publish 3a + 3b + 3c in the Firebase Console FIRST, then deploy Step 1 code — otherwise `rsk-*` Sell Again writes with `categoryId`/`subCategoryId` and any T3/T4 category save will get `permission-denied`.)*

### 4. Permission-matrix row in `src/config/permissions.js` + `SettingsView.jsx`
- **In `src/config/permissions.js` (`ROLE_PERMISSIONS`, `L184-195`):** add `'manage_product_categories'` to `TIER_2`, `TIER_3`, and `TIER_4` default arrays.
- **In `src/config/permissions.js` (right beside `canHandOffAcrossRegions` at `L422-431`):**
  ```js
  const MANAGE_CATEGORIES_KEY = 'manage_product_categories';
  export const canManageCategories = (userRole) => {
      const role = translateLegacyRole(userRole);
      if (role === CORPORATE_TIERS.TIER_1) return true;
      const matrixKnowsKey = Object.values(ROLE_PERMISSIONS)
          .some(list => Array.isArray(list) && list.includes(MANAGE_CATEGORIES_KEY));
      if (matrixKnowsKey) return hasClearance(userRole, MANAGE_CATEGORIES_KEY);
      return role === CORPORATE_TIERS.TIER_2
          || role === CORPORATE_TIERS.TIER_3
          || role === CORPORATE_TIERS.TIER_4;   // default T1-T4 for existing saved matrices
  };
  ```
- **In `src/components/SettingsView.jsx` (`ALL_FEATURES`, right after `L1723`):**
  ```js
  { id: 'manage_product_categories', label: 'Master Vault & Competitors: add, rename or delete shared categories (default Tier 4 and above)' },
  ```

### 5. `logicFixes.selfcheck.mjs` guards (one REGRESSION + one real-numbers BEHAVIOUR check)
```js
section('STEP 1: MASTER VAULT SHARED CATEGORIES & SUB-CATEGORIES');
{
  const rules = read('firestore.rules');
  const app = read('src/App.jsx');
  const op = read('src/StockOpnameView.jsx');
  const sync = read('src/hooks/useDatabaseSync.js');
  const sales = read('src/MerchantSalesView.jsx');

  ok('REGRESSION: product_categories rules, rsk-* categoryId/subCategoryId whitelist, dual-write type, sync listener, and backup/restore/wipe are all wired',
     rules.includes('match /product_categories/{catId}') &&
     (rules.match(/'categoryId',\s*'subCategoryId'/g) || []).length >= 2 &&
     op.includes("'categoryId', 'subCategoryId'") &&
     sync.includes("'product_categories'") &&
     app.includes('product_categories') &&
     sales.includes('resolveCategoryName') &&
     app.includes("kind: 'promo', unit: 'pcs', type: 'PROMO'"));

  const { normCatName, resolveCategoryName, categoryUsageCount, subUsageCount } = await import('../utils/productCategories.js');
  const { canManageCategories } = await import('./permissions.js');
  const cats = [
    { id: 'kid', name: 'Kid', normName: 'kid', subs: [{ id: 'kid-gold', name: 'Kid Gold', normName: 'kidgold' }] },
    { id: 'putih', name: 'Rokok Putih', normName: 'rokokputih', subs: [] },
  ];
  const prods = [
    { id: 'p1', name: 'NutriKid Gold', categoryId: 'kid', subCategoryId: 'kid-gold', type: 'Kid' },
    { id: 'p2', name: 'NutriKid Silver', categoryId: 'kid', subCategoryId: 'kid-silver', type: 'Kid' },
    { id: 'p3', name: 'Legacy Pack', type: 'SKT' }, // old product with type only
  ];
  ok('BEHAVIOUR: duplicate normalizer, delete-usage counts (Kid=2 blocked, Rokok Putih=0 allowed), legacy type fallback (SKT), and T1-T4 matrix default work on real data',
     normCatName('Kid - Gold.') === 'kidgold' &&
     categoryUsageCount('kid', prods) === 2 &&
     subUsageCount('kid-gold', prods) === 1 &&
     categoryUsageCount('putih', prods) === 0 &&
     resolveCategoryName(prods[2], cats) === 'SKT' &&
     canManageCategories('DEVELOPER') === true &&
     canManageCategories('COMPANY_OWNER') === true &&
     canManageCategories('AREA_ADMIN') === true &&
     canManageCategories('FLEET_CAPTAIN') === true &&
     canManageCategories('FIELD_OPERATIVE') === false &&
     canManageCategories('ROOKIE') === false);
}
```

**could not check:** Live production Firestore `products` or `permission_matrix` documents, and did not run the Firebase rules emulator on the proposed Change 29 text (read-only planning task; `firestore.rules` and `src/` were not modified).

## Task 81 - PICTURES round 2: Aldi's review of the 3 pictures + Task 79's 6 faults (drafts only) - DO THIS FIRST, then 80
**Status:** DONE
**Written:** 2026-11-19 09:58 WIB. Aldi, verbatim: *"make sure its category can be expanded and retract, but retract on default because there will be so many products out there, make sure we can change the pair here even on default it shows our product that have the same category, make sure the segment button is clear because looks like it is similar with other button and too blend inside the UI that its hard to see those button if not pressed. make sure u add search button when comparing or finding the products here . for customer reports a rival should have different section instead of combined with all of the customer info because it is too much information there i rather u add button and the panel of adding customer shows up infront of u and blur other. i also want u to make the spacing better here because looks like all the panel just combined into one u can make some border or anything use design skills to improve this, make sure buttons little bit bigger especially for phone and outline it for easier and faster navigation. for the master vault i think that master vault should only showed our own products here and differentiates category for our product and competitors. and sales terminal button should be change so that there is no 2 sales terminal inside this app"*.
**Touch only:** `.claude/drafts/competitors-pro.html`, `.claude/drafts/customers-c.html`, `.claude/drafts/categories-pro.html`, this file.
**First do Task 79's points 1-6** (they are still valid), then:
A. **Competitors - rival list:** each Category › Sub group header is a toggle (chevron, count) and starts COLLAPSED; "Expand all / Collapse all" link at the top; the group of the selected rival opens itself.
B. **Change the pair anywhere** (list detail, Compare, Manage, approval): the pair picker shows "Same category" products first, then "Other categories" below a divider - any product can be picked; saving reports with a toast.
C. **Search inside pickers:** replace the native `<select>` for products (our product, rival product, pair, report's rival) with a searchable picker: a button showing the current name -> an in-page popover with a search box on top and the list grouped by Category › Sub; typing filters live; Esc / outside tap closes. (Also kills the browser's BLUE option highlight Aldi saw - palette law.) Add a search box above the rival list too (it exists - keep it, make it bigger).
D. **Segment buttons clear:** the top tabs (Rival products / Compare / Reports waiting / Manage) and the shop tabs (Shop info / Location / Competitor intelligence) and the Master Vault tabs must look like a SEGMENTED CONTROL: one outlined container, each option a clear outlined cell, the selected one filled with `--wash` + `--accent-edge` border + bold; unselected still clearly a button (visible border), never plain text.
E. **Customers - "Report a rival" leaves the shop tab:** remove the inline form; put one clear button "Report a rival" at the top of the Competitor intelligence tab; it opens a centred panel (in-page dialog) with the backdrop BLURRED (`backdrop-filter: blur(4px)` + scrim) - same for every dialog in the 3 files. The "Waiting for approval" list stays in the tab.
F. **Spacing:** each block in the shop pane and the Competitors detail is its own card (1px `--line` border, 10-12px radius, 12-14px padding) with 12-16px gaps between cards; section headers sit OUTSIDE the cards; no two panels touch.
G. **Bigger, outlined buttons:** every button outlined (1px border, never borderless text); min height 36px on PC, 44px on the phone frame (tap size); icon + label.
H. **Master Vault (`categories-pro.html`):** shows OUR products only. The Categories manager has two sections: "Our categories" (used by our products) and "Competitor-only categories" (made from Competitors, 0 of ours) - the second collapsed by default and clearly labelled. Product form pickers list our categories first, competitor-only ones under a divider. Stock shown = MAIN warehouse only - no regional/branch warehouse anywhere in Master Vault (Aldi 2026-11-19: *"no regional warehouse on the master vault"*; branches stay in Branch Warehouse + Stock Opname).
I. **No second "Sales terminal":** rename the Master Vault third tab to "Preview: terminal tabs" and add one line under it: "Shows how the real Sales Terminal tabs will look - not a second terminal."
J. Same standards as Task 71: every action reports (gold check toast), no blue, no green, no `alert/confirm/prompt`, PC 1240 + phone 390 nothing cut off, System/Light/Dark, Lite motion, headless `ERRORS: []` for all 3 files.
**Done when:** Task 79 1-6 + A-J done; the Result lists each letter with what you checked.
**Result:**
Updated `.claude/drafts/competitors-pro.html`, `.claude/drafts/customers-c.html`, and `.claude/drafts/categories-pro.html`, and verified every point in headless Chrome (`verify-task81.mjs`, `ERRORS: []`) plus visual inspection of all 6 PC 1240 + Phone 390 screenshots:
- **Task 79 (1–6):**
  - **1 (No invented prices):** `confirm-approve` (new product) sets ONLY the report's `region × custType` (`has16200: true`, `notSetCount: 9` showing `"—"` + `"not set yet"` on every other cell); `save-rival` sets ONLY the approver's picked visible region and ONLY fields actually entered (`t4NewNotSet: 9` after T4 adds a rival with Retail only).
  - **2 (`M.reportForm`):** Added **Promo** picker (`repHasPromo: true`) and **Shelf photo** toggle (`repHasPhotoBtn: true`) alongside Shop name, Customer type, and searchable rival picker.
  - **3 (`categories-pro.html` unified look):** Switched to the exact `:root` Warm Stone / Espresso light & dark tokens and Inter font (`usesInter: true`) from `customers-c.html` / `competitors-pro.html`.
  - **4 (Short row-2 hint):** Shortened to `"Pick a category above"` (`phHintNotCut: true`, zero cut-off at 390px).
  - **5 (Only Aldi's category names):** Removed `"Plant-based / Oat Milk"` and `"Elder Calcium"` (`noInventedNames: true`); `Elder` stays with 0 sub-categories.
  - **6 (Headless check):** `ERRORS: []` on all 3 files.
- **Task 81 (A–J):**
  - **A (Collapsed rival list):** All 6 `Category › Sub` groups start collapsed (`initialExpanded: 0`), chevron + count badge on each header, `"Expand all / Collapse all"` toggles all 6 (`afterExpandAll: 6, afterCollapseAll: 0`), and picking or adding a rival opens its group.
  - **B (Change pair anywhere):** Pair picker works from list detail, Compare (`"Save as pair for this rival"`), Manage, and new-product approval, grouping `"Same category"` first then `"Other categories"` (`popGroups: ["Same category","Other categories","Clear"]`) and toasting on save (`pairToast: "Saved pair: Rival Kretek 12 (example) ↔ Cello Green"`).
  - **C (Searchable pickers):** Replaced every product `<select>` in `competitors-pro.html`, `customers-c.html` (`nativeCompareSelects: 0`, `oursGroups: ["Same category","Other categories"]`), and `categories-pro.html` with an outlined `.pick-btn` opening a blurred `.ov.pop` popover with live search (`filteredCount: 1`), Esc + outside-click close, and a full-width search box above the rival list.
  - **D (Clear segmented controls):** Top tabs in Competitors (2×2 grid on phone), shop tabs in Customers (`Shop info / Location / Competitors`), and Master Vault tabs (2+1 grid on phone) all sit inside one outlined container with outlined cells and `--wash` + `--accent-edge` + bold active state.
  - **E (Customers Report a rival modal + blurred backdrops):** Removed inline `.cform` (`hasInlineCform: false`); added top `"Report a rival"` button opening centered blurred dialog (`repModalOpen: true, repBlur: "blur(4px)"`, same `blur(4px)` on every dialog across all 3 files); submitting toasts `"Sent to your admin for approval"` and renders under `"Waiting for approval"` (`hasWaiting: true`).
  - **F (Card spacing):** Distinct `1px solid var(--line)` rounded cards (`11px` radius, `12–15px` padding) with `14px` gaps and section headers outside cards across Competitors, Customers, and Master Vault.
  - **G (Bigger outlined buttons):** Every button outlined (`1px` border, icon + label), verified `pcBtnH: 36` on PC and `phBtnH: 44`, `phTabH: 44`, `phStabH: 44` on Phone across all 3 files.
  - **H (Master Vault scope):** Shows OUR products and **Main warehouse only** (`hasMainWhOnly: true`, zero regional/branch warehouse); Categories manager splits into `"Our categories"` and collapsed-by-default `"Competitor-only categories"` (`compCollapsedDefault: true`; expanding in Cigarette example shows `Rokok Putih`, `cigCompShowsPutih: true`); product form category picker lists `"Our categories"` first.
  - **I (No second Sales Terminal):** Third tab renamed `"Preview: terminal tabs"` (`tab3Text`) with the banner `"Shows how the real Sales Terminal tabs will look - not a second terminal."` directly under it.
  - **J (Quality & phone fit):** Zero blue/green/alert/confirm/prompt, `phOverflow: false` on all 3 files, `ERRORS: []`.

## Task 82 - Fix the Task 80 plan's permission bug + PROVE the draft rules in the emulator (rules-test only)
**Status:** DONE
**Written:** 2026-11-19 10:35 WIB. Claude's review of your Task 80 (df5a12d1).
**Touch only:** `rules-test/test-product-categories.mjs` (new), this file. Never edit `firestore.rules` or `src/`.
1. **Bug in Part 4:** you add `'manage_product_categories'` to the DEFAULT `ROLE_PERMISSIONS` lists (`src/config/permissions.js:184-195`) AND use `matrixKnowsKey`. `injectDynamicPermissions` (`permissions.js:209`) merges a saved matrix OVER the defaults tier by tier, so for a company whose saved matrix lacks one tier, that tier keeps the default list WITH the key -> `matrixKnowsKey` turns true -> every saved tier WITHOUT the key (e.g. T2, T3) is now refused. `canHandOffAcrossRegions` (`permissions.js:422-431`) works because its key is in NO default list ("ABSENCE-MEANS-TIER-DEFAULT", comment above it). Rewrite Part 4 in your Result the same way: the key is NOT added to any default list; only `ALL_FEATURES` in SettingsView gets it.
2. Write `rules-test/test-product-categories.mjs` in the style of `rules-test/test-sell-damaged.mjs`: load `firestore.rules`, insert your Change 29 text (3a helper, 3b match, 3c the two whitelist lines) IN MEMORY, start the emulator test env with that string, and check: T2, T3 (AREA_ADMIN), T4 (FLEET_CAPTAIN) can create/update/delete `product_categories`; T5, T6 cannot write; every company member can read; another company's user cannot read; a saved matrix that lists the key for some tiers but NOT FLEET_CAPTAIN -> T4 write refused; extra field on a category doc -> refused; Sell Again `rsk-*` create with `categoryId` + `subCategoryId` -> allowed; with an unknown key -> refused.
3. Run it (same command style as the other rules-test files) and paste the pass/fail counts in the Result. A red check = fix the DRAFT text in your Result (never `firestore.rules`) and rerun.
**Done when:** Part 4 rewritten, the test file exists, every check passes, counts in the Result.
**Result:**

### 1. Rewritten Part 4 (fixes `ROLE_PERMISSIONS` merge bug — ABSENCE-MEANS-TIER-DEFAULT)
- **Do NOT add `'manage_product_categories'` to ANY default array in `ROLE_PERMISSIONS` (`src/config/permissions.js:182-204`).** Because `injectDynamicPermissions` (`src/config/permissions.js:207-210`) merges a saved Firebase matrix over `ROLE_PERMISSIONS` tier by tier, leaving the key out of every default list ensures `matrixKnowsKey` stays `false` for existing companies (even if their saved matrix is missing one tier) until Aldi deliberately toggles and saves the key in Settings.
- **In `src/config/permissions.js` (right beside `canHandOffAcrossRegions` at `L422-431`):**
  ```js
  const MANAGE_CATEGORIES_KEY = 'manage_product_categories';
  export const canManageCategories = (userRole) => {
      const role = translateLegacyRole(userRole);
      if (role === CORPORATE_TIERS.TIER_1) return true;
      const matrixKnowsKey = Object.values(ROLE_PERMISSIONS)
          .some(list => Array.isArray(list) && list.includes(MANAGE_CATEGORIES_KEY));
      if (matrixKnowsKey) return hasClearance(userRole, MANAGE_CATEGORIES_KEY);
      return role === CORPORATE_TIERS.TIER_2
          || role === CORPORATE_TIERS.TIER_3
          || role === CORPORATE_TIERS.TIER_4;   // absence means T1-T4 default
  };
  ```
- **In `src/components/SettingsView.jsx` (`ALL_FEATURES`, right after `L1723`):** add ONLY the UI row so Aldi can toggle it when he wants:
  ```js
  { id: 'manage_product_categories', label: 'Master Vault & Competitors: add, rename or delete shared categories (default Tier 4 and above)' },
  ```

### 2 & 3. Rules Emulator Proof (`rules-test/test-product-categories.mjs`)
- Created `rules-test/test-product-categories.mjs` (loads `firestore.rules` read-only and splices Change 29 parts 3a + 3b + 3c in memory; `firestore.rules` on disk untouched).
- Command run: `npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-product-categories.mjs"`
- **Result: `30 passed, 0 failed` (exit code 0):**
  - Read (6/6): T2, T3, T4, T5, T6 allowed; other company (`bossUid: ownerB`) denied.
  - Default write with no saved key (15/15): T2, T3 (`AREA_ADMIN`), T4 (`FLEET_CAPTAIN`) create/update/delete allowed; T5 (`FIELD_OPERATIVE`), T6 (`ROOKIE`), and other company denied.
  - Saved matrix override (`AREA_ADMIN` has key, `FLEET_CAPTAIN` does not) (4/4): T3 create allowed; T4 create/update/delete refused.
  - Field whitelist on `product_categories` (2/2): extra `rogueField` refused for both T3 and T4.
  - Sell Again `rsk-*` whitelist (3/3): T3 create and update with `categoryId` + `subCategoryId` allowed; create with `unknownKey` refused.

## Task 83 - PICTURE: 2 small fixes from Claude's review of Task 81 (drafts only)
**Status:** DONE
**Written:** 2026-11-19 10:35 WIB.
**Touch only:** `.claude/drafts/competitors-pro.html`, `.claude/drafts/categories-pro.html`, this file.
1. `competitors-pro.html`: on first load the selected rival (r1) sits inside a COLLAPSED group, so its row is hidden while its detail shows. Open the selected rival's group on load (Task 81 A: "the group of the selected rival opens itself") - every other group stays collapsed.
2. `categories-pro.html`: "Competitor-only" is decided by "0 of our products", so a category Aldi adds in Master Vault before giving it a product jumps into "Competitor-only categories". Store where a category came from (`origin: 'ours' | 'competitors'`): categories added in Master Vault = 'ours' (stay under "Our categories" even with 0 products, label "0 products yet"); only categories made from Competitors = 'competitors'. Seed Rokok Putih as 'competitors'.
3. Headless `ERRORS: []` for both files.
**Done when:** 1-3 done, Result lists what you checked.
**Result:**
Verified in headless Chrome (`verify-task83.mjs`, `ERRORS: []`):
1. `competitors-pro.html`: Initialized `openGroups` with `grpKey(RIVALS[0].catId, RIVALS[0].subId)` (`skm::skm-12`), so `r1` is visible and highlighted on load (`expanded: ["skm::skm-12"], r1Visible: true`) while all 5 other groups start collapsed (`collapsed: 5`).
2. `categories-pro.html`: Added `origin: 'ours' | 'competitors'` on every category (`Rokok Putih` seeded `'competitors'`, all others `'ours'`). Adding `"Toddler"` in Master Vault sets `origin: 'ours'`, keeps it under `"Our categories"` with `"0 products yet"` (`toddlerUnderOurs: true, hasZeroYet: true, compCountMilk: "0"`), while switching to Cigarette shows `Rokok Putih` under `"Competitor-only categories"` (`compCountCig: "1", putihInComp: true`).
3. Both files ran cleanly with `ERRORS: []`.

## Task 84 - PICTURES round 3: NOO stands out, Undo after a delete, Master Vault stock + all prices (drafts only) - do after 82 + 83
**Status:** DONE
**Written:** 2026-11-19 11:00 WIB. Aldi, verbatim: *"competitor screen is good, for customer i want u to make verify noo have better button visibility as i want the admin to realise if there is NOO verification to do, its hard to see and realise which of the new stores are NOO stores and old stores this is something that u need to working on and other thing that we need on this app is undo button especially when doing accidental fatal pressing like deleting data and for master vault i just want the stock number to be visible and also show all the price level for that product not just the grosir one everything else looks fine for now"*.
**Touch only:** `.claude/drafts/customers-c.html`, `.claude/drafts/categories-pro.html`, `.claude/drafts/competitors-pro.html` (Undo only), this file.
1. **NOO stands out (customers-c.html):** a shop waiting for NOO verification (status PENDING) must be impossible to miss: (a) in the shop list a gold-edged "NEW · VERIFY NOO" tag + a left gold bar on the row, old shops have none; (b) a count "NOO to verify: N" in the KPI strip and on the area tree ("Needs action" includes it, tap -> filters to those shops); (c) in the shop pane a full-width banner at the top "New shop - waiting for NOO verification" with the Verify NOO button as the strongest button on the screen (filled `--wash`, `--accent-edge` border, bold, bigger), only for T4 and above; T5/T6 see "Waiting for admin to verify". After Verify -> banner gone, toast. Seed 2-3 PENDING shops.
2. **Undo after a delete (all 3 drafts):** every delete (shop, folder reset, rival price, report reject, category, sub-category, rival product) shows a toast-bar "Deleted <name> · UNDO" for 8 seconds with a countdown line; UNDO puts it back exactly (same place, same data) and reports "Restored <name>". The confirm box before a delete STAYS (Undo is the second safety, not a replacement). Write in the toast-bar's small print: "Undo for 8 seconds".
3. **Master Vault stock + all prices (categories-pro.html):** on the product cards (Preview tab and the products list in Categories) the MAIN WAREHOUSE stock is the biggest number on the card (e.g. "180 Box", red + "Low" when under the warning level), and every price level shows as a small labelled row: Distributor (cost) · Retail · Grosir · Ecer. No price hidden.
4. Same standards as Task 71 (toast on every action, no blue, no green, no `alert/confirm/prompt`, PC 1240 + phone 390 nothing cut off, Lite motion, headless `ERRORS: []` for all 3 files).
**Done when:** 1-4 done, the Result lists what you checked for each.
**Result:**
Updated `.claude/drafts/customers-c.html`, `.claude/drafts/categories-pro.html`, and `.claude/drafts/competitors-pro.html`, verified every item in headless Chrome (`verify-task84.mjs`, `ERRORS: []`) and visually checked PC 1240 + Phone 390 screenshots:
1. **NOO stands out (`customers-c.html`):**
   - Seeded 3 `PENDING` shops (`KIOS BAROKAH` in Margahayu, `CEMERLANG` in Soreang, `TOKO HARAPAN JAYA` in Muntilan).
   - (a) Every `PENDING` row gets left gold bar (`.sr.noo-row`) + gold-edged `NEW · VERIFY NOO` badge (`nooRowHasTag: true`); old (`Approved`) shops have none (`oldRowNoNooTag: true`).
   - (b) KPI strip shows clickable `NOO to verify: 3` tile (`kpiHasNoo3: true`) and Area Tree shows `NOO to verify: 3` (`treeHasNoo3: true`, also counted inside `Needs action`); tapping filters to all 3 `PENDING` shops (`filteredCount: 3`).
   - (c) Shop pane top shows full-width gold-edged `.noo-banner` (`"New shop — waiting for NOO verification"`) with strongest 44px `Verify NOO` button (`btnNooH: 44`) for T2–T4 (`t4HasBtn: true`); T5/T6 see `"Waiting for admin to verify"` with no Verify button (`t5Waiting: true`). Verifying removes banner and toasts `"KIOS BAROKAH verified as Approved NOO"` (`afterVerifyBannerGone: true`).
2. **8-second Undo after delete (all 3 drafts, confirm dialogs kept):**
   - `customers-c.html`: Shop delete (`hasShopConfirm: true`, `17 -> 16 -> UNDO -> 17`, `"Restored KIOS BAROKAH"`), folder reset to Unknown (`folderGone: true -> UNDO -> folderRestored: true`), and duplicate delete all trigger the 8s Undo toast-bar (`"Undo for 8 seconds"` + countdown line).
   - `categories-pro.html`: Empty category & sub-category delete (`hasCatConfirm: true`, `goneAfterDel: true -> UNDO -> restoredAfterUndo: true`, `"Restored TempCat"`).
   - `competitors-pro.html`: Delete rival price (`hasPriceConfirm: true`, `11000 -> null -> UNDO -> 11000`), reject report (`WAITING -> REJECTED -> UNDO -> WAITING`), and delete rival product (`hasRivalConfirm: true`, `6 -> 5 -> UNDO -> 6`, `"Restored Rival Kretek 12 (example)"`).
3. **Master Vault stock + all 4 price levels (`categories-pro.html`):**
   - Both `Preview: terminal tabs` cards and `Categories` -> `"Our products in <Cat>"` show **Main warehouse stock** as the largest number (`24px`, e.g. `180 Box`, red + `Low` badge on `DailyFit Banana Choco` `24 Box < 30`, `previewLowCount: 1`) and all 4 price levels unabbreviated (`DISTRIBUTOR (COST)`, `RETAIL`, `GROSIR`, `ECER`).
4. **Standards:** Zero `alert`/`confirm`/`prompt` (`banned: false`), zero phone overflow (`phOverflow: false`), zero blue/green, Lite motion + System/Light/Dark preserved, `ERRORS: []` across all 3 files.

## Task 85 - READ-ONLY: every "fatal press" in the real app, and the smallest Undo for each (for Aldi's undo button)
**Status:** DONE
**Written:** 2026-11-19 11:00 WIB.
**Touch only:** this file.
1. Table of every irreversible action in `src/` (each `deleteDoc(` - there are 17 - plus batch deletes, folder reset, data scrub, nuclear wipe, stock write-offs, any `writeBatch` that removes data): `file:line` / what it deletes / who can press it (tier) / is there already a confirm box (`confirmAction`, `src/components/ConfirmGate.jsx:32`) / is the data recoverable today (audit log copy? backup?).
2. For each, pick the smallest Undo: (a) DELAYED write - the delete only runs after the 8-second Undo toast closes (nothing touches the database while Undo is open; risk: app closed inside 8 s = delete not done), or (b) SOFT delete - mark `deletedAt` and hide it, a real delete later (needs rules + every reader to skip it), or (c) not undoable - say why (money / stock ledger lines that must never vanish).
3. Which ones touch money or stock (sales, consignment, receivables, opname): those need extra care - say what an Undo would break.
4. One paragraph recommendation for Aldi in plain English.
**Done when:** parts 1-4 with `file:line` on every claim and a `could not check:` line.
**Result:**

### 1 & 2. Every irreversible action in `src/` (all 17 `deleteDoc(` + all batch/transaction deletes, folder reset, data scrub, nuclear wipe, and stock write-offs)

*Note on recoverability today:* `logAudit` (`src/App.jsx:3318-3344`) writes only a one-line text sentence — it never stores a copy of the deleted document. `AuditVaultView` (`src/components/AuditVaultView.jsx:46-56`) can only restore `products` and `customers` from a previously downloaded/archived JSON snapshot (never `transactions`, `motorists`, `benchmarks`, `procurement`, `mapSettings`, `samplings`, or `places`).

| # | `file:line` | What it deletes / alters | Who can press it (tier) | Confirm box today? | Recoverable today? | Smallest Undo |
|---|---|---|---|---|---|---|
| **1** | `src/App.jsx:2745` (`handleResetEOD`) | Deletes 1 `eod_reports/{id}` doc so salesman can resubmit | Vault-unlocked admin (`isAdmin`, `EODReconciliationView.jsx:974, 1074`) | Yes (`confirmAction`, `App.jsx:2743` or parent once-confirm) | **No** (`logAudit` text only) | **DELAYED write** (unverified reports only); **Not undoable** once verified (already credited stock/cash/bounty) |
| **2** | `src/App.jsx:2897` (auth login) | Deletes `system_admins_invites/{email}` on claim | Automatic on invited T1 sign-in | No (automatic) | N/A (consumed invite) | **Not undoable** (internal auth handshake, not a user button) |
| **3–4** | `src/App.jsx:3014-3015` (Ghost Killer) | Deletes `employee_directory/{uid}` & `/{email}` when `motorists/{id}` is missing | Automatic on revoked staff sign-in | No (automatic) | **No** (admin must re-create staff) | **Not undoable** (automatic security cleanup) |
| **5** | `src/App.jsx:3824` (`deleteProduct`) | Deletes Master Vault `products/{id}` | Vault-unlocked T1/T2 (`isAdmin`, `App.jsx:5218`) | Yes (`confirmAction`, `App.jsx:3822`) | Older manual/AuditVault backup only (`AuditVaultView.jsx:46-50`) | **DELAYED write** if unused; **SOFT delete** (`deletedAt`) safer if vans/branches/history reference `productId` |
| **6** | `src/components/BranchWarehouseManager.jsx:892` (`handleDeleteRequest`) | Deletes `stock_requests/{orderId}` | Unreachable from UI (dead handler; zero callers in file) | Yes (`confirmAction`, `L888`) | **No** (`logAudit` text only) | **Not undoable** (or remove dead handler; stock paper-trail) |
| **7** | `src/components/CrownTransferProtocol.jsx:118` (`handleExecuteTransfer`) | Deletes `system_admins/{uid}` to hand over System Owner crown | T1 System Owner (`isSystemOwner`) | Yes (OTP + `confirmAction`, `L106`) | **No** (logs out in 5s; only new owner/Console can restore) | **Not undoable** (security ownership transfer) |
| **8** | `src/components/CustomerManager.jsx:48` (`handleDeleteBenchmark`) | Deletes shop rival row `customers/{cid}/benchmarks/{id}` | Any user who opens shop detail (`L175`; rules enforce write) | Yes (`confirmAction`, `L47`) | **No** (no audit log, not in backup) | **DELAYED write** (8s Undo toast; zero money/stock link) |
| **9** | `src/components/CustomerManager.jsx:806` (`handleDeleteDuplicate`) | Deletes duplicate shop `customers/{id}` | Vault-unlocked T1/T2 (`isAdmin`, `L1340`) | Yes (`confirmAction`, `L795` + far-apart warning) | Older manual/AuditVault backup only (`AuditVaultView.jsx:51-55`) | **DELAYED write** (8s Undo toast; hide row locally, delete after 8s) |
| **10** | `src/components/CustomerManager.jsx:1115` (`handleDelete`) | Deletes shop profile `customers/{id}` | Vault-unlocked T1/T2 (`isAdmin`, `L1804`) | Yes (`confirmAction`, `L1115`) | Older manual/AuditVault backup only (`AuditVaultView.jsx:51-55`) | **DELAYED write** (8s Undo toast; zero rules changes) |
| **11** | `src/components/LandlordDashboard.jsx:59` (`handleSaveSeats`) | Deletes `licenses/{bossUid}` (removes seat cap when saved blank) | T1 System Owner (`isSystemOwner`) | **No** | Re-typing seat number restores it | **DELAYED write** (or 8s Undo toast re-saving previous seat number) |
| **12** | `src/FleetCanvasManager.jsx:596` (`handleResetVaultPassword`) | Deletes employee's vault password doc | Vault-unlocked T1/T2 (`isAdmin`, `L1537`) | Yes (`promptAction` typing `"confirm"`, `L590-592`) | **No** (employee creates a new password next login) | **Not undoable** (security credential reset — never cache password hash in memory) |
| **13** | `src/MapMissionControl.jsx:561` (`handleDeleteBorder`, `L588`) | Deletes 1 map border `mapSettings/bnd_{id}` | Company Owner (`L972`; rules enforce owner) | Yes (`confirmAction`, `L589`) | **No** (must re-upload GeoJSON) | **DELAYED write** (8s Undo toast; keep border in memory until 8s ends) |
| **14** | `src/MapMissionControl.jsx:1282` (`handleDeleteStore`) | Deletes shop `customers/{id}` from Map sheet | Vault-unlocked T1/T2 (`isAdmin`, `L1372, 1390`) | Yes (`confirmAction`, `L1278`) | Older manual/AuditVault backup only (no `logAudit` here) | **DELAYED write** (8s Undo toast — same as #10) |
| **15** | `src/RestockVaultView.jsx:594` (`removePlace`) | Deletes factory/warehouse/courier `places/{id}` | HQ (`mayEditRegistry`, T1–T3, `L590, 1658`) | Yes (`confirmAction`, `L592`) | **No** (`logAudit` text only) | **DELAYED write** (8s Undo toast; lookup-only, old Surat Jalan unchanged) |
| **16** | `src/RestockVaultView.jsx:796` (`handleDeleteTarget`) | Deletes production target `production_targets/{id}` | Restock Vault user (T1–T3, `L1925`) | Yes (`confirmAction`, `L794`) | **No** (no audit log) | **DELAYED write** (8s Undo toast; pure goal counter) |
| **17** | `src/RestockVaultView.jsx:830` (`handleDeleteRequest`) | Deletes outbound branch log `stock_requests/{orderId}` | Restock Vault user (T1–T3, `L1824`) | Yes (`confirmAction`, `L828`) | **No** (`logAudit` text only) | **Not undoable** (stock movement paper-trail; does not reverse warehouse math) |
| **18** | `src/App.jsx:918, 928, 931` (`handleWipeData`) | **Nuclear wipe:** chunked batch-deletes ALL `products`, ALL `customers` + `benchmarks`, or both | Vault-unlocked T1/T2 (`SettingsView.jsx:1455-1466`) | Yes: 1.6s `HoldButton` + **2x** `confirmAction` (`App.jsx:902, 904`) | Only from a prior backup (and `benchmarks` are NOT backed up) | **Not undoable** (mass multi-collection wipe; keep hold + double confirm, auto-export backup first) |
| **19** | `src/App.jsx:1270` (owner migration) | `batch.delete` old `employee_directory/{email}` after copying to `/{uid}` | Automatic on new T2 first Vault setup | No (automatic) | Data copied to `/{uid}` in same batch | **Not undoable** (internal atomic migration) |
| **20** | `src/App.jsx:3502` (`handleDeleteSingleTransaction`) | Batch-deletes 1 `transactions/{id}` + decrements `sales_stats` (`untallyOps`) | Vault-unlocked T1/T2 (`isAdmin`, `HistoryReportView.jsx:768, 773`) | Yes (`confirmAction`, `App.jsx:3496`) | **No** (`transactions` not in AuditVault restore) | **Not undoable** (money ledger; should be void/reversal instead of hard delete) |
| **21** | `src/App.jsx:3528` (`handleDeleteConsignmentData`) | Chunked batch-deletes ALL Titip/consignment `transactions` for a shop + `untallyOps` | Unreachable from UI (`ConsignmentFinanceView.jsx:53` never calls prop) | Yes (`confirmAction`, `App.jsx:3524`) | **No** (`logAudit` text only) | **Not undoable** (receivables ledger; remove unused handler or void only) |
| **22** | `src/App.jsx:3548` (`handleDeleteHistory`) | Chunked batch-deletes ALL `transactions` for `(shop, salesman)` + `untallyOps` | Vault-unlocked T1/T2 (`isAdmin`, `HistoryReportView.jsx:1242, 1246`) | Yes (`confirmAction`, `App.jsx:3535`) | **No** (`logAudit` text only) | **Not undoable** (bulk money ledger deletion) |
| **23** | `src/App.jsx:4121` (`handleDeleteSampling`) | `runTransaction`: deletes `samplings/{id}` AND restores qty to Master Vault or van `activeCanvas` | Vault-unlocked T1/T2 (`isAdmin`, `SamplingManager.jsx:396, 399`) | Yes (`confirmAction`, `App.jsx:4090`) | **No** (`logAudit` text only) | **DELAYED write** (delay running `runTransaction` for 8s; never undo after stock is already merged) |
| **24** | `src/FleetCanvasManager.jsx:465` (email change) | `batch.delete` old `employee_directory/{oldEmail}` on email edit | `canEditFleet` (T1–T4) | No (part of save) | Re-editing email restores key | **Not undoable** (key-move inside edit save) |
| **25** | `src/FleetCanvasManager.jsx:554-558` (`handleDeleteAgent`) | `writeBatch` deletes `motorists/{id}`, `employee_directory/{email}`, and frees `seats/{n}` | `canEditFleet` (T1–T4, `L1528`) | Yes (`confirmAction`, `L551`) | **No** (active van stock, debts & career stats lost) | **DELAYED write** if van & debt are 0; **SOFT delete** (`status: 'TERMINATED'` + `locked: true`) much safer when staff has stock/debt/history |
| **26** | `src/FleetCanvasManager.jsx:721-755` (`handleClearCanvas`) | `runTransaction` empties van `activeCanvas` and returns stock to Branch/Master Vault | `canEditFleet` (T1–T4, `L725, 1561`) | Yes (`confirmAction`, `L734`) | Partial (stock stays in warehouse; exact van mix lost) | **DELAYED write** (delay `runTransaction` 8s; unsafe to undo after commit) |
| **27** | `src/components/CustomerManager.jsx:533-550` (`handleDeleteFolder` — **Folder Reset**) | Chunked batch resets Prov/Kab/Kec of every shop in folder to `'Unknown ...'` | Vault-unlocked T1/T2 (`isAdmin`, `L312, 317`) | Yes (`confirmAction`, `L535`) | **No** (overwrites areas; only older backup has them) | **DELAYED write** (8s Undo toast before `commitInChunks`) |
| **28** | `src/components/CustomerManager.jsx:897-957` (`handleEnterpriseDataScrub` — **Data Scrub**) | Chunked batch fills unknown Prov/Kab/Kec from GPS/address + uppercases all shops | Vault-unlocked T1/T2 (`isAdmin`, `L1222`) | Yes (`confirmAction` with counts, `L944`) | Older manual/AuditVault backup only | **DELAYED write** (8s Undo toast before `commitInChunks`) |
| **29** | `src/MapMissionControl.jsx:575` (`handleWipeAll`) | Chunked batch deletes ALL map borders `mapSettings/bnd_*` | Company Owner (`L859`) | Yes (`confirmAction`, `L570`) | **No** (must re-upload GeoJSON) | **DELAYED write** (8s Undo toast before `commitInChunks`) |
| **30** | `src/MapMissionControl.jsx:716` (`handleDeleteFolder`) | Chunked batch deletes all `mapSettings/bnd_*` in a folder | Company Owner (`L886`) | Yes (`confirmAction`, `L704`) | **No** (must re-upload GeoJSON) | **DELAYED write** (8s Undo toast before `commitInChunks`) |
| **31** | `src/RestockVaultView.jsx:819` (`handleDeletePO`) | `writeBatch` deletes `procurement/{id}` AND subtracts `qtyReceived` from `products/{id}.stock` | Restock Vault user (T1–T3, `L1815`) | Yes (`confirmAction`, `L804`) | **No** (`logAudit` stores PO number only) | **DELAYED write** (8s pause before `batch.commit()`; unsafe to undo after stock changes) |
| **32** | `src/StockOpnameView.jsx:866-1002` (`executeResolution` — **Stock Write-offs**: `SAMPLING`, `SELL`, `REPAIR`, `RTV`, `PENALTY`) | `writeBatch` subtracts `damagedStock`, logs `quarantine_logs`, and creates/increments `dmg-*`/`rsk-*`, restores stock (`REPAIR`), writes off (`RTV`), or charges agent `cukaiDebts` (`PENALTY`) | T1–T2 (`isHighCommand`; T3 may run `SELL` only, `L262`) | Yes (`confirmAction`, `L887`) | **No** (logged in `quarantine_logs`, no reverse action) | **Not undoable** post-commit (stock + money debt ledger; only a pre-commit 8s **DELAYED write** is safe) |
| **33** | `src/components/LandlordDashboard.jsx:261, 263` (`handleDelete`) | `writeBatch` deletes tenant's `employee_directory` doc(s) | T1 System Owner (`L362`) | Yes (`confirmAction`, `L253`) | **No** (vault data orphaned until re-provisioned) | **DELAYED write** (8s Undo toast before `batch.commit()`) |
| **34** | `src/App.jsx:3397-3402` (`handleDeleteMascotMessage`) | Removes a quote from `settings/general.mascotMessages` | Vault-unlocked T1/T2 (`SettingsView.jsx:870`) | **No** | **No** | **DELAYED write** (8s Undo toast) |
| **35** | `src/components/SettingsView.jsx:1884-1894` (`handleDeleteTier`) | Removes a `CUSTOM_*` role tier (persists on Save Matrix `L1903, 1907`) | Vault-unlocked T1/T2 (`L1986, 2094`) | Yes (`confirmAction`, `L1886`) | Reloading before Save restores it; after Save, **No** | **DELAYED write** (local Undo toast before Save Matrix) |

### 3. Actions that touch money or stock — and what an Undo would break
- **Transactions & History deletes (`App.jsx:3502, 3528, 3548` — #20, #21, #22):** Deleting a `SALE` or `Titip` receipt also subtracts it from monthly `sales_stats` (`untallyOps`, `App.jsx:3442`), does **not** put packs back in the van or warehouse, and changes a shop's unpaid `Titip` balance (`ConsignmentFinanceView`) and EOD cash totals (`EODReconciliationView`). Re-inserting a deleted receipt after another salesman collected Titip or closed EOD would double-count debt or make EOD cash disagree with the ledger. *Fix:* never hard-delete money receipts in the first place — replace with a **Void / Reversal** entry (or delay the write 8s before anything hits Firestore, never undo after commit).
- **EOD Reset (`App.jsx:2745` — #1):** Deleting an already-`VERIFIED` EOD doc lets the salesman submit EOD a second time, which can re-credit returned stock or shift career totals. Only unverified (`PENDING`) EOD reports are safe for an 8s delayed delete.
- **Sampling delete (`App.jsx:4121` — #23), Clear Canvas (`FleetCanvasManager.jsx:721` — #26), Delete PO (`RestockVaultView.jsx:819` — #31), Product delete (`App.jsx:3824` — #5), Delete Agent (`FleetCanvasManager.jsx:554` — #25):** All read or mutate live `products.stock`, branch inventory, or `motorists.activeCanvas`. If the delete commits immediately and someone tries to "Undo" 5 seconds later, another salesman or admin could already have sold or loaded those packs in between, creating negative stock or phantom packs. **Delaying the commit for 8 seconds** (nothing touches Firestore while the Undo toast is up) completely avoids that race — except for **Product delete** and **Agent delete** where **SOFT delete** (`deletedAt` / `TERMINATED`) is even safer so historical references never break.
- **Quarantine / Opname Write-Offs (`StockOpnameView.jsx:866-1002` — #32) & Outbound Shipment delete (`RestockVaultView.jsx:830` — #17):** `executeResolution` simultaneously reduces `damagedStock`, writes an immutable `quarantine_logs` audit row, adds sellable/promo stock (`dmg-*` / `rsk-*` / `REPAIR`), or charges a salesman real rupiah in `cukaiDebts[PENALTY_*]`. Undoing after commit would leave orphan notifications, broken `cukaiDebts` if the salesman already paid his bounty, or negative `rsk-*` stock if a van already loaded the damaged lot.

### 4. Plain-English recommendation for Aldi
For almost every everyday delete in KPM — deleting a shop, resetting a folder to Unknown, deleting a duplicate, removing a rival price/product, deleting a category/sub-category, removing a map border, or deleting a restock place/target — the smallest, cleanest Undo is a **Delayed Write**: keep your confirm box first, then hide the item on screen and show the 8-second **"Deleted · UNDO"** bar, and only send the real delete to Firebase when those 8 seconds run out (if you press Undo, nothing ever touched the database, and we need zero `firestore.rules` changes). Use the exact same 8-second pause before committing stock actions like Delete Sampling, Clear Van, or Delete PO so live stock numbers never get tangled in a race. For **Products** and **Staff accounts**, Soft Delete (archiving them instead of erasing them) is safer long-term so old receipts and vans never lose their links, and for **Money & Quarantine ledger lines** (sales receipts, Titip history, opname write-offs/penalties, and the full Nuclear Wipe), keep them **not undoable** after they land — use a Void/reversal record for mistakes instead of erasing history.

**could not check:** Live production Firestore data volume, whether any custom company `permission_matrix` in production grants `isAdmin`-gated screens differently, or whether `firestore.rules` on the live console differs from `firestore.rules` on disk (read-only audit of `src/` only).

## Task 86 - READ-ONLY: build plan for the real Undo (the "delayed write" deletes only)
**Status:** DONE
**Written:** 2026-11-19 11:45 WIB. From your Task 85 map (4b07368b). Aldi wants an Undo after accidental deletes. Plan ONLY the rows you marked "DELAYED write" that touch no money and no stock: #8 benchmark, #9 duplicate shop, #10 + #14 shop delete, #13 + #29 + #30 map borders, #15 place, #16 production target, #27 folder reset, #28 data scrub, #34 mascot message. Leave every money/stock/security row out.
**Touch only:** this file.
1. ONE shared helper (name, file, signature): hides the item on screen at once, shows the 8-second "Deleted <name> · UNDO" bar, runs the real write only when the 8 s end, cancels on UNDO; what happens if the screen closes or the phone goes offline inside the 8 s (say plainly: the delete is then NOT done, and the item comes back next load - is that safe for each row?).
2. Per row: `file:line` of the current `deleteDoc` / batch, the exact change (wrap the write in the helper), and what the screen must hide meanwhile (lists that read the same data).
3. The toast: the app's toast is `notify()` (`src/components/Toast.jsx:50`) - can it carry an UNDO button and an 8-second countdown, or does it need a sibling component? `file:line`.
4. The `logicFixes.selfcheck.mjs` lines: one regression guard (every listed site goes through the helper), one behaviour check (helper with fake timers: UNDO inside 8 s = no write; no UNDO = exactly one write).
**Done when:** parts 1-4 with `file:line` on every claim and a `could not check:` line.
**Result:**

### 1. Shared helper: `scheduleDelayedWrite` in `src/utils/delayedWrite.js` (new file)
- **Signature & exports:**
  ```js
  export const UNDO_MS = 8000;
  export function scheduleDelayedWrite({
    key,              // e.g. `cust:${id}`, `bench:${id}`, `border:${id}`, `place:${id}`, `target:${id}`, `folder:${level}:${name}`, `scrub:all`, `mascot:${idx}`
    label,            // human name shown in "Deleted <label> · UNDO" and "Restored <label>"
    onOptimistic,     // optional sync callback run immediately to update local state
    commit,           // async () => { /* real deleteDoc / commitInChunks / setDoc + logAudit */ }
    onUndo,           // optional sync callback run if user presses UNDO (or if commit throws)
    durationMs = UNDO_MS,
    timers = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout }, // injectable for selfcheck
  })
  export function undoPendingWrite(key)       // cancels timer, runs onUndo(), toasts "Restored <label>", returns true
  export function flushPendingWrite(key)      // runs commit() immediately (used if a second delete replaces the active bar)
  export function isPendingUndo(key)          // boolean reader for filter hooks
  export function getPendingPatch(key)        // returns optimistic patch data (for #27 folder reset & #28 data scrub)
  export function usePendingUndo()            // React hook via useSyncExternalStore subscribing to pending keys/patches
  ```
- **Lifecycle:**
  1. Confirm dialog (`confirmAction`, `src/components/ConfirmGate.jsx:32`) still runs **before** `scheduleDelayedWrite` is called.
  2. When called: if another undo bar is currently counting down, `scheduleDelayedWrite` flushes the previous pending write (`flushPendingWrite(prevKey)`) so rapid deletes never silently drop an earlier delete.
  3. Adds `key` to the module-level `pendingMap`, runs `onOptimistic?.()`, notifies React subscribers (`usePendingUndo()`), and opens the 8-second Undo toast-bar via `notifyUndo({ key, label, durationMs, onUndo: () => undoPendingWrite(key) })`.
  4. **If UNDO is pressed inside 8 s:** `clearTimeout`, deletes `key` from `pendingMap`, calls `onUndo?.()`, closes the Undo bar, and calls `notify(\`Restored \${label}.\`)`. **Zero Firestore writes happen.**
  5. **When 8 s expire without UNDO:** deletes `key` from `pendingMap`, closes the Undo bar, and runs `await commit()`. If `commit()` throws, runs `onUndo?.()` and `notify(\`Could not delete \${label}: \${err.message}\`)`.
- **What happens if the screen closes or the phone goes offline inside the 8 seconds:**
  - **Switching screens/tabs inside the app** (e.g. Customers -> Map Mission Control): the timer and `pendingMap` live at module scope in `src/utils/delayedWrite.js` and the bar lives in `<ToastHost />` (`src/main.jsx:11`), so switching tabs inside KPM does **not** cancel the delete or hide the Undo bar.
  - **Closing the browser tab / killing the app inside the 8 s:** the 8-second timer dies with the tab, so **the delete is NOT done, and the item comes back on the next load**.
  - **Phone goes offline inside the 8 s:** if the app stays open when the 8 s end, Firestore's IndexedDB persistence queues `commit()` and syncs when signal returns; if the phone goes offline *and* the tab is closed before the 8 s end, the delete is NOT done and the item comes back next load.
  - **Is "item comes back next load" safe for every row?** **Yes, 100% safe for all 12 rows (#8, #9, #10, #13, #14, #15, #16, #27, #28, #29, #30, #34):** none of them touch money, stock, or auth credentials, so failing closed (keeping the shop, benchmark, folder name, map border, place, production target, or mascot quote) never corrupts balances or inventory — matching `ConfirmGate.jsx:29-30` (*"silently NOT destroying data beats silently destroying it"*).

### 2. Per-row wiring (`file:line`, exact change, and what the screen hides meanwhile)

| Row | Current write (`file:line`) | Exact change (wrap in `scheduleDelayedWrite`) | What the screen must hide / overlay meanwhile |
|---|---|---|---|
| **#8 Benchmark** | `src/components/CustomerManager.jsx:48` (`await deleteDoc(doc(db, .../benchmarks, id))`) | After `confirmAction` (`L47`), call `scheduleDelayedWrite({ key: \`bench:\${id}\`, label: b.product \|\| 'benchmark', commit: () => deleteDoc(doc(db, \`artifacts/\${appId}/users/\${user.uid}/customers/\${customer.id}/benchmarks\`, id)) })` | In `CustomerDetailView` (`CustomerManager.jsx:26, 160`), filter `benchmarks.filter(b => !isPendingUndo(\`bench:\${b.id}\`))`. |
| **#9 Duplicate shop** | `src/components/CustomerManager.jsx:806` (`await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', store.id))`) | After `confirmAction` (`L795`), run `setDupReport(...)` (`L811-813`) in `onOptimistic` (restoring previous `dupReport` in `onUndo`), and move `deleteDoc` (`L806`) + `logAudit("CUSTOMER_DELETE_DUPLICATE", ...)` (`L807`) into `commit` with `key: \`cust:\${store.id}\`, label: store.name`. | `dupReport` row hides via `L811-813`; filter `customers` in `src/hooks/useDatabaseSync.js:37, 250` by `!isPendingUndo(\`cust:\${c.id}\`)` so `displayCustomers` (`src/App.jsx:3905, 5130, 5139, 5505, 5697`) hides the shop across Customers, Map, Journey, and Sales Terminal at once. |
| **#10 Shop delete (Directory)** | `src/components/CustomerManager.jsx:1115` (`await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', id))`) | Keep `confirmAction("Delete profile?")` (`L1115`), then call `scheduleDelayedWrite({ key: \`cust:\${id}\`, label: name, onOptimistic: () => { if (selectedCustomer?.id === id) setSelectedCustomer(null); }, commit: async () => { await deleteDoc(...); logAudit("CUSTOMER_DELETE", \`Deleted \${name}\`); } })`. | Same shared `!isPendingUndo(\`cust:\${c.id}\`)` filter in `useDatabaseSync.js:37, 250` hides the shop card (`CustomerManager.jsx:1804`), folder counts (`L308`), and map pin immediately. |
| **#14 Shop delete (Map sheet)** | `src/MapMissionControl.jsx:1282` (`await deleteDoc(doc(db, \`artifacts/\${appId}/users/\${userId}/customers\`, store.id))`) | Keep `confirmAction` (`L1278`), run `setSelectedStore(null)` (`L1284`) in `onOptimistic` (restoring `setSelectedStore(store)` in `onUndo`), and move `deleteDoc` (`L1282`) into `commit` under `key: \`cust:\${store.id}\`, label: store.name`. | Same shared `!isPendingUndo(\`cust:\${c.id}\`)` filter removes the store marker from `MapMissionControl` (`customers` prop at `App.jsx:5139`) and `CustomerManager`. |
| **#13 Single map border** | `src/MapMissionControl.jsx:561` (called from `handleDeleteBorder` at `L588-595`) | Keep `confirmAction` (`L589`); in `onOptimistic` save `prev = safeBoundaries` and call `setBoundaries(updated)` (`L591`); in `onUndo` call `setBoundaries(prev)`; in `commit` run `saveBorderCache(appId, updated)` (`L592`) + `await deleteBoundaryFromFirebase(idToRemove)` (`L561, 593`). | `safeBoundaries` (`MapMissionControl.jsx:463`) drops the border immediately from the Leaflet canvas and `Active Borders` list (`L856, 972`). |
| **#29 Wipe all map borders** | `src/MapMissionControl.jsx:575-578` (`handleWipeAll`, `commitInChunks` delete) | Keep `confirmAction` (`L570`); in `onOptimistic` save `prev = safeBoundaries` and call `setBoundaries([])` (`L583`); in `onUndo` call `setBoundaries(prev)`; in `commit` run `await commitInChunks(db, writeBatch, operations)` (`L578`) + `clearBorderCache(appId)` (`L584`). | `safeBoundaries` (`L463, 856`) empties immediately on map and sidebar; `prev` array restores all polygons on UNDO. |
| **#30 Map border folder** | `src/MapMissionControl.jsx:716-719` (`handleDeleteFolder`, `commitInChunks` delete) | Keep `confirmAction` (`L704`); in `onOptimistic` save `prev = safeBoundaries` and call `setBoundaries(updatedList)` (`L708-709`); in `onUndo` call `setBoundaries(prev)`; in `commit` run `saveBorderCache(appId, updatedList)` (`L710`) + `await commitInChunks(db, writeBatch, operations)` (`L719`). | `safeBoundaries` (`L463`) and `existingFolders` (`L476, 870`) hide the folder and all its polygons immediately. |
| **#15 Restock place** | `src/RestockVaultView.jsx:594` (`removePlace`, `await deleteDoc(doc(db, .../places, place.id))`) | Keep `confirmAction` (`L592`); wrap `deleteDoc` (`L594`) + `logAudit("PLACE_REMOVED", ...)` (`L595`) in `scheduleDelayedWrite({ key: \`place:\${place.id}\`, label: place.name, ... })`. | Filter `places` (`RestockVaultView.jsx:204, 284`) by `!isPendingUndo(\`place:\${p.id}\`)` so the registry table (`L1658`) and supplier/warehouse dropdowns hide it at once. |
| **#16 Production target** | `src/RestockVaultView.jsx:796` (`handleDeleteTarget`, `await deleteDoc(doc(db, .../production_targets, targetId))`) | Keep `confirmAction` (`L794`); wrap `deleteDoc` (`L796`) in `scheduleDelayedWrite({ key: \`target:\${targetId}\`, label: targetLabel, ... })`. | Filter `targets` (`RestockVaultView.jsx:208, 279`) by `!isPendingUndo(\`target:\${t.id}\`)` so the target card (`L1925`) hides at once. |
| **#27 Customer folder reset** | `src/components/CustomerManager.jsx:541-550` (`handleDeleteFolder`, `commitInChunks` update to `'Unknown ...'`) | Keep `confirmAction` (`L535`); in `onOptimistic` save a patch map `{ [store.id]: updateData }` on key `folder:${level}:${folderName}` and update `customProv`/`customKab`/`customKec` (`L553-555`, restoring them in `onUndo`); in `commit` run `await commitInChunks(db, writeBatch, operations)` (`L550`). | Overlay pending `folder:*` patches onto `customers` in `useDatabaseSync.js:37, 250` so the folder vanishes from `FolderCard` (`CustomerManager.jsx:306`) and its shops show under `Unknown ...` during the 8 s. |
| **#28 Enterprise Data Scrub** | `src/components/CustomerManager.jsx:956-957` (`handleEnterpriseDataScrub`, `commitInChunks` update) | Keep `confirmAction` (`L944`); in `onOptimistic` save patch map `{ [c.id]: w.data }` on key `scrub:all`; in `commit` run `await commitInChunks(db, writeBatch, operations)` (`L957`) + `logAudit("ENTERPRISE_DATA_SCRUB", summary)` (`L960`). | Overlay pending `scrub:all` patches onto `customers` in `useDatabaseSync.js:37, 250` so folder tree & shop cards reflect scrubbed areas immediately and revert if UNDO is pressed. |
| **#34 Mascot message** | `src/App.jsx:3401` (`handleDeleteMascotMessage`, `setDoc(..., { mascotMessages: updatedMessages }, { merge: true })`) | Add `if (!await confirmAction(\`Delete mascot line "\${msgToDelete}"?\`)) return;` at `App.jsx:3398`, then wrap `setDoc` (`L3401`) in `scheduleDelayedWrite({ key: \`mascot:\${msgToDelete}\`, label: 'mascot dialogue', ... })`. | Filter `activeMessages` (`src/App.jsx:1822`) by `!isPendingUndo(\`mascot:\${m}\`)` so `SettingsView.jsx:863, 870` and `App.jsx:3362` skip the deleted line during the 8 s. |

### 3. Toast architecture (`src/components/Toast.jsx:50-173`) — inside `Toast.jsx`, no second host
- **Why `notify()` itself must NOT be altered and no second host should be added to `src/main.jsx`:**
  1. `src/components/Toast.jsx:22-23` states: *"ONE mechanism, matching the gate: a module-level singleton, one host mounted in main.jsx as a sibling of `<App />`, and a plain function call at the call sites. Do not add a second."*
  2. `src/config/integration.audit.mjs:460-478` (Group 13) asserts exact regexes on `src/components/Toast.jsx`: `notify` must stay non-async and have `>= 2` occurrences of `return undefined;` (`L460-462`), must contain `const bad = isFailure(text);` and `pushToast({ id: nextId++, text, bad })` (`L469`), must contain `recordMissed(text, bad); if (!pushToast)` (`L473`), and must keep `const FADE_MS = 5000;` with `timers.current.set(item.id, setTimeout(() => dismiss(item.id, true), FADE_MS));` while forbidding `item.sticky` (`L476-477`).
- **Exact design in `src/components/Toast.jsx`:**
  - Keep `notify(message)` (`Toast.jsx:50-61`) and the top 5-second `items` strip (`Toast.jsx:85-104, 142-170`) **byte-identical**.
  - Export `notifyUndo({ key, label, durationMs = 8000, onUndo })` and `clearUndoToast(key)` from `src/components/Toast.jsx` using a module singleton `pushUndo` wired inside the existing `<ToastHost />` (`Toast.jsx:63`).
  - Inside `<ToastHost />`, render the bottom Undo bar (`fixed bottom-5 left-1/2 -translate-x-1/2 z-[10000]`) when `undoItem` is present: drawn gold check (`svg.kpm-ck`), `"Deleted ${undoItem.label}"`, subtitle `"Undo for 8 seconds"`, outlined `UNDO` button (`min-h-[44px] sm:min-h-[36px]`, calls `undoItem.onUndo()`), and the 8-second bottom countdown line (`@keyframes kpm-undo-cd { from { transform: scaleX(1); } to { transform: scaleX(0); } }`, disabled under `.lite-mode` and `prefers-reduced-motion`).

### 4. `src/config/logicFixes.selfcheck.mjs` guards (one REGRESSION + one BEHAVIOUR check)
```js
section('DELAYED-WRITE 8-SECOND UNDO (NON-MONEY / NON-STOCK DELETES)');
{
  const dw = read('src/utils/delayedWrite.js');
  const tj = read('src/components/Toast.jsx');
  const cm = read('src/components/CustomerManager.jsx');
  const mm = read('src/MapMissionControl.jsx');
  const rv = read('src/RestockVaultView.jsx');
  const app = read('src/App.jsx');

  ok('REGRESSION: ToastHost exports notifyUndo without touching notify() 5s contract, and all 12 delayed-write sites route through scheduleDelayedWrite',
     tj.includes('export function notifyUndo(') &&
     tj.includes('Undo for 8 seconds') &&
     dw.includes('export function scheduleDelayedWrite(') &&
     (cm.match(/scheduleDelayedWrite\(/g) || []).length >= 5 && // #8 bench, #9 dup, #10 shop, #27 folder reset, #28 data scrub
     (mm.match(/scheduleDelayedWrite\(/g) || []).length >= 4 && // #13 border, #14 map shop, #29 wipe borders, #30 border folder
     (rv.match(/scheduleDelayedWrite\(/g) || []).length >= 2 && // #15 place, #16 production target
     app.includes('handleDeleteMascotMessage') &&
     /handleDeleteMascotMessage[\s\S]{0,600}scheduleDelayedWrite\(/.test(app));

  const { scheduleDelayedWrite, undoPendingWrite, isPendingUndo } = await import('../utils/delayedWrite.js');
  const queue = [];
  const fakeTimers = {
    setTimeout: (fn, ms) => { const id = queue.length + 1; queue.push({ id, fn, ms, cleared: false }); return id; },
    clearTimeout: (id) => { const t = queue.find((x) => x.id === id); if (t) t.cleared = true; },
  };
  let writes = 0, undone = 0;
  scheduleDelayedWrite({
    key: 'cust:s1', label: 'AMANAH BARU', timers: fakeTimers,
    commit: () => { writes++; },
    onUndo: () => { undone++; },
  });
  const pendingDuringWindow = isPendingUndo('cust:s1');
  undoPendingWrite('cust:s1');
  queue.forEach((t) => { if (!t.cleared) t.fn(); }); // simulate 8s passing after UNDO
  const writesAfterUndo = writes;

  scheduleDelayedWrite({
    key: 'cust:s2', label: 'ANEKA BARU', timers: fakeTimers,
    commit: () => { writes++; },
  });
  queue.forEach((t) => { if (!t.cleared) t.fn(); }); // simulate 8s expiring with no UNDO

  ok('BEHAVIOUR: pressing UNDO inside 8s performs 0 writes and restores state; letting 8s expire performs exactly 1 write',
     pendingDuringWindow === true &&
     undone === 1 &&
     writesAfterUndo === 0 &&
     writes === 1 &&
     isPendingUndo('cust:s2') === false);
}
```

**could not check:** Did not edit `src/` or run `logicFixes.selfcheck.mjs` against `src/utils/delayedWrite.js` (read-only planning task; `src/` was not modified).

## Task 87 - PICTURE: 2 nits from Claude's review of Task 84 (drafts only)
**Status:** DONE
**Written:** 2026-11-19 11:45 WIB.
**Touch only:** `.claude/drafts/categories-pro.html`, `.claude/drafts/customers-c.html`, this file.
1. `categories-pro.html` "Preview: terminal tabs": row 1 shows a category with 0 products (add "Toddler" in Categories, it appears as an empty terminal tab). The real terminal builds tabs from products, so only categories that HAVE products may show there.
2. `customers-c.html` `toast()`: unlike the other two files it skips `void t.offsetWidth` after removing the classes, so a second toast right after the first may not restart the 8-second countdown line. Make it match the other two files.
3. Headless `ERRORS: []` for both.
**Done when:** 1-3 done, Result lists what you checked.
**Result:**
Verified in headless Chrome (`verify-task87.mjs`, `ERRORS: []`):
1. `categories-pro.html`: `renderSalesTerminalPreview` now filters `const termCats = ourCats.filter((c) => productsInCat(c.id).length > 0);`. Adding `"Toddler"` (0 products) keeps it under `"Our categories"` (`inOurCats: true`) while `"Preview: terminal tabs"` row 1 shows only `["ALL", "KID", "ADULT", "ELDER", "BUNDLES"]` (`toddlerInRow1: false`).
2. `customers-c.html`: Aligned `toast()` to `t.classList.remove('on', 'has-undo'); void t.offsetWidth;` (`hasReflow: true, active: true` on consecutive undo toasts), matching `categories-pro.html` and `competitors-pro.html`.
3. Headless Chrome check passed with `ERRORS: []` on both files.

## Task 88 - PICTURE: clear words for the 2 approval queues + every feature on the phone (customers-c.html only) - DO THIS BEFORE 86/87
**Status:** DONE
**Written:** 2026-11-19 11:54 WIB. Aldi, verbatim: *"make a better description for these so that the users now what is this confirmation not just no pic and also reword the Grosir? doesnt sounds professional there make sure all the features is available on phone as well"* (he was looking at the "Waiting for a salesman (2) · ASSIGN PIC" queue with the salesman picker + Give).
**Touch only:** `.claude/drafts/customers-c.html`, this file.
1. **Every "Grosir ask" wording becomes "Grosir price request"** (L583, L712, L726, L776, L1035 today - grep for all). Shop-list badge "GROSIR?" -> "GROSIR REQUESTED". Queue header "Grosir asks (N) · price tier" -> "Grosir price requests (N)" with a one-line description under it: "A salesman asked to sell to this shop at the Grosir (wholesale) price. Approve to switch the shop's price, or keep its current price." Buttons: "Keep <Retail>" -> "Keep <Retail> price", "Confirm Grosir" -> "Approve Grosir price". Toasts say the same words.
2. **"Waiting for a salesman (N) · assign PIC" -> "Shops without a salesman (N)"** with a one-line description: "Nobody is in charge of these shops, so they get no visits and no stock package. Pick the salesman who will look after each shop and press Assign." Each card shows WHY it is there in small text (e.g. "Salesman removed from the team" or "New shop, no salesman chosen yet" - seed both). Button "Give" -> "Assign"; toast "<Shop> is now handled by <Salesman>". Shop-list badge "No salesman" stays, KPI line "1 Grosir ask · 2 no salesman" -> "1 Grosir price request · 2 shops without a salesman". Area facts "ASKS" -> "REQUESTS". Give the NOO queue the same kind of one-line description ("New shops opened by a salesman. Check the details and press Verify NOO to make the shop official.").
3. **Phone parity:** list EVERY feature reachable on the PC frame (search, Folder, Admin tools: tier repair / duplicates / data scrub / KML import, Add customer, Rename, Reset to Unknown, Needs action + its 3 queues, NOO to verify, Verify NOO, Approve/Keep Grosir, Assign salesman, shop tabs Shop info / Location / Competitors, Report a rival, Open Competitors, Copy GPS, Directions, WhatsApp, Open in Map, Move folder, Edit shop, Delete, Undo) and prove each one is reachable AND works in the phone frame (390 px) by your headless script (click path per feature). Anything missing or cut on the phone: add it there (a "More" menu is fine for rare admin actions). Put the table (feature / PC path / phone path / OK) in the Result.
4. Same standards: toast on every action, no blue, no green, no `alert/confirm/prompt`, 44 px phone buttons, nothing cut at 390, headless `ERRORS: []`.
**Done when:** 1-4 done, the phone-parity table in the Result shows every feature OK.
**Result:**
Updated `.claude/drafts/customers-c.html` and verified every wording rule + all 25 phone features in headless Chrome (`verify-task88.mjs`, `ERRORS: []`):
1. **"Grosir price request" wording (`wording.hasGrosirBadge / hasGrosirHead / hasGrosirDesc / hasGrosirBtns / hasShopGrosirFact = true`):**
   - Replaced every `"Grosir ask"` / `"Grosir?"` across KPI strip, `nodeTitle`, Needs action 4-cell summary (`Grosir requests`), queue header (`Grosir price requests (1)` + description `"A salesman asked to sell to this shop at the Grosir (wholesale) price. Approve to switch the shop's price, or keep its current price."`), buttons (`Keep Retail price` / `Approve Grosir price`), shop-list badge (`GROSIR REQUESTED`), Shop info profile cell (`Grosir price request`), and toasts (`"Approved Grosir price for <Shop>"` / `"Kept <Retail> price for <Shop>"`).
2. **"Shops without a salesman (N)" + NOO description + Area facts (`wording.hasNoSalesmanHead / hasNoSalesmanDesc / hasReasonRemoved / hasReasonNew / hasAssignBtn / hasNooDesc / hasRequestsFact = true`):**
   - Renamed queue to `"Shops without a salesman (2)"` with description `"Nobody is in charge of these shops, so they get no visits and no stock package. Pick the salesman who will look after each shop and press Assign."`
   - Seeded both card reasons (`CEMERLANG`: `"Salesman removed from the team"`; `TOKO HARAPAN JAYA`: `"New shop, no salesman chosen yet"`), changed button `"Give"` -> `"Assign"`, toast `"<Shop> is now handled by <Salesman>"`, KPI subtitle `"1 Grosir price request · 2 shops without a salesman"`, area facts `"ASKS"` -> `"REQUESTS"`, and added the NOO queue description (`"New shops opened by a salesman. Check the details and press Verify NOO to make the shop official."`).
3. **Full Phone Parity Table (390 px `#ph` frame — `minBtnH: 44`, `phOverflow: false`, `ERRORS: []`):**

| Feature | PC path (`#pc`) | Phone path (`#ph` 390 px) | OK |
|---|---|---|---|
| **Search** | Top bar `#q-pc` input | Top bar `#q-phone` input (full-width row) | **OK** (`parity.search: true`) |
| **+ Folder** | Top bar `[data-act="add-folder"]` -> `[data-act="confirm-add-folder"]` | Top bar `[data-act="add-folder"]` -> `[data-act="confirm-add-folder"]` | **OK** (`parity.addFolder: true`) |
| **Admin tools: Tier repair** | Top bar `Admin tools` -> `[data-act="repair-tiers"]` | Top bar `Admin tools` -> `[data-act="repair-tiers"]` | **OK** (`parity.adminTools: true`) |
| **Admin tools: Duplicates (Scan / Not duplicates / Delete + Undo)** | `Admin tools` -> `Scan now` / `Not duplicates` / `Delete` | `Admin tools` -> `Scan now` / `Not duplicates` / `Delete` + `#toastUndo` | **OK** (`parity.adminTools: true`) |
| **Admin tools: Data scrub** | `Admin tools` -> `Preview` -> `Run Data Scrub` | `Admin tools` -> `Preview` -> `Run Data Scrub` | **OK** (`parity.adminTools: true`) |
| **Admin tools: KML import** | `Admin tools` -> `Choose .kml` -> `Import 2 Pins` | `Admin tools` -> `Choose .kml` -> `Import 2 Pins` | **OK** (`parity.adminTools: true`) |
| **Add customer** | Top bar `Add customer` -> `Save customer` | Top bar `+ Add` -> `Save customer` | **OK** (`parity.addCustomer: true`) |
| **Rename folder** | Middle pane `[data-act="ren-folder"]` -> `Rename` | `Area` step -> `[data-act="ren-folder"]` -> `Rename` | **OK** (`parity.renameFolder: true`) |
| **Reset to Unknown** | Middle pane `[data-act="del-folder"]` -> `Reset to Unknown` | `Area` step -> `[data-act="del-folder"]` -> `Reset to Unknown` | **OK** (`parity.resetFolderAndUndo: true`) |
| **Needs action + 3 queues** | KPI / Tree `[data-node="NEEDS_ACTION"]` | KPI / Tree `[data-node="NEEDS_ACTION"]` (switches to `Area` step) | **OK** (`parity.needsActionQueues: true`) |
| **NOO to verify filter** | KPI / Tree `[data-node="NOO_VERIFY"]` | KPI / Tree `[data-node="NOO_VERIFY"]` (switches to `Area` step) | **OK** (`parity.nooVerifyAndBanner: true`) |
| **Verify NOO** | Queue `[data-act="verify-noo"]` or shop `.btn-noo` | `Area` queue `[data-act="verify-noo"]` or `Shop` step `.btn-noo` | **OK** (`parity.nooVerifyAndBanner: true`) |
| **Approve / Keep Grosir price** | Queue or Shop info `[data-act="grosir-yes/no"]` | `Area` queue or `Shop` info (spans 2 cols at 390px) `[data-act="grosir-yes/no"]` | **OK** (`parity.needsActionQueues: true`) |
| **Assign salesman** | Queue `[data-f="owner-pick"]` + `[data-act="give-agent"]` | `Area` queue `[data-f="owner-pick"]` (44px) + `Assign` | **OK** (`parity.needsActionQueues: true`) |
| **Shop tabs (Shop info / Location / Competitors)** | Right pane `.stabs [data-stab="shop/loc/comp"]` | `Shop` step `.stabs [data-stab="shop/loc/comp"]` (44px) | **OK** (`parity.locationTabActions: true`) |
| **Report a rival** | Competitors tab `[data-act="open-report-rival"]` -> `Send report` | `Shop` -> `Competitors` -> `[data-act="open-report-rival"]` -> `Send report` | **OK** (`parity.competitorsTabActions: true`) |
| **Open Competitors** | Competitors tab `[data-act="open-competitors"]` | `Shop` -> `Competitors` -> `[data-act="open-competitors"]` | **OK** (`parity.competitorsTabActions: true`) |
| **Copy GPS** | Location tab `[data-act="copy-gps"]` | `Shop` -> `Location` -> `[data-act="copy-gps"]` | **OK** (`parity.locationTabActions: true`) |
| **Directions** | Location tab `[data-act="directions"]` | `Shop` -> `Location` -> `[data-act="directions"]` | **OK** (`parity.locationTabActions: true`) |
| **WhatsApp** | Location tab `[data-act="wa-chat"]` | `Shop` -> `Location` -> `[data-act="wa-chat"]` | **OK** (`parity.locationTabActions: true`) |
| **Open in Map** | Location tab `[data-act="open-map"]` | `Shop` -> `Location` -> `[data-act="open-map"]` | **OK** (`parity.locationTabActions: true`) |
| **Move folder** | Shop info `.acts [data-f="move-kec"]` | `Shop` -> `Shop info` -> `.acts [data-f="move-kec"]` (44px) | **OK** (`parity.shopInfoActions: true`) |
| **Edit shop** | Shop info / Location `[data-act="edit-shop"]` -> `Update profile` | `Shop` -> `Shop info` / `Location` -> `[data-act="edit-shop"]` -> `Update profile` | **OK** (`parity.shopInfoActions: true`) |
| **Delete shop** | Shop info `.acts [data-act="del-shop"]` -> `Delete` | `Shop` -> `Shop info` -> `[data-act="del-shop"]` -> `Delete` | **OK** (`parity.shopInfoActions: true`) |
| **8-second Undo** | Bottom toast-bar `#toastUndo` (`UNDO`) | Bottom toast-bar `#toastUndo` (`UNDO`) after shop/folder/dup delete | **OK** (`parity.shopInfoActions / resetFolderAndUndo: true`) |

## Task 89 - READ-ONLY: paste-ready Console steps for Change 29 (product categories rules)
**Status:** DONE
**Written:** 2026-11-19 18:05 WIB (Claude, quota at 95%; Antigravity leads until Sat 2026-11-21). Claude reviewed 86, 87, 88: all OK, drafts only, nothing pushed.
**Touch only:** `.claude/drafts/console-change-29.md` (new), this file.
1. Read the Task 80 plan (Step 0 rules) + Task 82 fix + `rules-test/test-product-categories.mjs`. Write the exact text Aldi pastes into the Firebase Console Rules editor: WHERE (quote the existing line it goes after), WHAT (the block), and a 3-line "after publish, check this" list.
2. Do NOT edit `firestore.rules`. Run `rules-test/test-product-categories.mjs` against the emulator once and paste the pass/fail count.
3. Plain English, numbered steps a non-programmer can follow; no "kamu".
**Done when:** the file exists, every pasted block matches the draft rules the emulator test proved, test count in the Result.
**Result:**
1. Created `.claude/drafts/console-change-29.md` with 3 numbered plain-English Console steps (no `"kamu"`), quoting the exact surrounding lines in `firestore.rules`:
   - **Step 1 of 3 (`categoryManager` helper):** paste after the closing `}` of `function sellDamagedHolder(bossUid)` (`firestore.rules:155`) and before `function isSalesman(bossUid) {` (`firestore.rules:157`).
   - **Step 2 of 3 (`rsk-*` Sell Again whitelist):** replace `firestore.rules:668-676` inside `match /products/{productId}` to add `'categoryId', 'subCategoryId',` right after `'category',` on both `allow create` (`L669`) and `allow update` (`L674`).
   - **Step 3 of 3 (`match /product_categories/{catId}`):** paste after the closing `}` of `match /products/{productId}` (`firestore.rules:678`) and before `// [CHANGE 24 — DRAFT] the Sell Again holder writes its own line` (`firestore.rules:679`).
   - Includes the 3-line **"After publish, check this"** checklist at the bottom.
2. Emulator run (`npx firebase emulators:exec --only firestore --project demo-kpm-rules "node rules-test/test-product-categories.mjs"`): **`30 passed, 0 failed` (exit code 0)**. `firestore.rules` on disk untouched.

## Task 90 - READ-ONLY: check the Task 86 Undo plan against the real code
**Status:** DONE
**Written:** 2026-11-19 18:05 WIB (Claude).
**Touch only:** this file.
1. `src/utils/delayedWrite.js` does NOT exist today (Claude checked). Say in the plan which file is NEW and which existing files change, with `file:line` for each of the 12 delete rows (#8 ... #34).
2. For each row: confirm the delete is NOT money and NOT stock (quote the line). Any row that touches money or stock -> move it out of the plan, say why.
3. Name the ONE row to build first (smallest, most used) and its self-check line for `src/config/logicFixes.selfcheck.mjs`.
**Done when:** the table has file:line for all 12 rows and one "build first" pick.
**Result:**

### 1. Which file is NEW vs which existing files change
- **NEW file to create (1):**
  - `src/utils/delayedWrite.js` (**NEW** — does not exist on disk today): exports `scheduleDelayedWrite`, `undoPendingWrite`, `flushPendingWrite`, `isPendingUndo`, `getPendingPatch`, and `usePendingUndo`.
- **EXISTING files that change (7):**
  1. `src/components/Toast.jsx:50-63, 118-171` — keeps `notify()` (`L50-61`) and the 5-second top strip (`L85-104`) untouched; exports `notifyUndo` / `clearUndoToast` and renders the bottom 8-second Undo toast-bar inside `<ToastHost />` (`L63`).
  2. `src/hooks/useDatabaseSync.js:37, 250` — filters `customers` by `!isPendingUndo(\`cust:\${c.id}\`)` and overlays pending `#27` / `#28` area patches so every consumer of `customers` / `displayCustomers` (`src/App.jsx:3905, 5130, 5139, 5505, 5697`) hides a pending-delete shop during the 8-second window.
  3. `src/components/CustomerManager.jsx:26, 46-49, 533-559, 788-819, 897-966, 1115` — wraps rows **#8**, **#9**, **#10**, **#27**, **#28**.
  4. `src/MapMissionControl.jsx:463, 558-595, 702-726, 1277-1289` — wraps rows **#13**, **#14**, **#29**, **#30**.
  5. `src/RestockVaultView.jsx:204, 208, 279, 284, 589-601, 793-801` — wraps rows **#15**, **#16**.
  6. `src/App.jsx:1822, 3397-3403` — wraps row **#34** (`handleDeleteMascotMessage`) and filters `activeMessages` (`L1822`).
  7. `src/config/logicFixes.selfcheck.mjs` — adds the regression and behaviour checks at the end of the file.

### 2. Verification of all 12 rows against real code (quoted lines + money/stock check)

Every single one of the 12 rows was checked against today's code. **0 of the 12 touch money (`transactions`, `sales_stats`, `cukaiDebts`) or stock (`products.stock`, `damagedStock`, `branches/*/inventory`, `motorists.activeCanvas`, `procurement`, `samplings`)** — all 12 stay in the plan:

| Row | Existing file & exact `file:line` | Quoted write line in today's code | Touches money or stock? | Verdict |
|---|---|---|---|---|
| **#8 Benchmark** | `src/components/CustomerManager.jsx:48` (`handleDeleteBenchmark` at `L46-49`, button at `L175`) | `await deleteDoc(doc(db, \`artifacts/\${appId}/users/\${user.uid}/customers/\${customer.id}/benchmarks\`, id));` | **No** — deletes only a rival price note in subcollection `customers/{cid}/benchmarks/{id}`. | **Keep in plan** |
| **#9 Duplicate shop** | `src/components/CustomerManager.jsx:806` (`handleDeleteDuplicate` at `L788-819`, button at `L1340`) | `await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', store.id));` | **No** — deletes only `customers/{store.id}`; `L801` confirms sales history and debt stay in `transactions`. | **Keep in plan** |
| **#10 Shop delete (Directory)** | `src/components/CustomerManager.jsx:1115` (`handleDelete` at `L1115`, button at `L1804`) | `const handleDelete = async (id, name) => { if (await confirmAction("Delete profile?")) { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', id)); logAudit("CUSTOMER_DELETE", \`Deleted \${name}\`); } };` | **No** — deletes only the profile document `customers/{id}`; `transactions` and `products` are untouched. | **Keep in plan (BUILD FIRST)** |
| **#13 Single map border** | `src/MapMissionControl.jsx:561` (`deleteBoundaryFromFirebase` at `L558-567`, called by `handleDeleteBorder` at `L588-595`, button at `L972`) | `await deleteDoc(doc(db, \`artifacts/\${appId}/users/\${userId}/mapSettings\`, \`bnd_\${id}\`));` | **No** — deletes only one GeoJSON boundary document `mapSettings/bnd_{id}`. | **Keep in plan** |
| **#14 Shop delete (Map sheet)** | `src/MapMissionControl.jsx:1282` (`handleDeleteStore` at `L1277-1289`, button at `L1390`) | `await deleteDoc(doc(db, \`artifacts/\${appId}/users/\${userId}/customers\`, store.id));` | **No** — deletes only `customers/{store.id}`; sales and stock are untouched. | **Keep in plan** |
| **#15 Restock place** | `src/RestockVaultView.jsx:594` (`removePlace` at `L589-601`, button at `L1658`) | `await deleteDoc(doc(db, \`artifacts/\${appId}/users/\${activeUserId}/places\`, place.id));` | **No** — deletes only an address registry doc `places/{place.id}`; old Surat Jalan keep their saved text (`L592`). | **Keep in plan** |
| **#16 Production target** | `src/RestockVaultView.jsx:796` (`handleDeleteTarget` at `L793-801`, button at `L1925`) | `await deleteDoc(doc(db, \`artifacts/\${appId}/users/\${activeUserId}/production_targets\`, targetId));` | **No** — deletes only a monthly goal doc `production_targets/{targetId}`; never touches `products.stock` or `procurement`. | **Keep in plan** |
| **#27 Customer folder reset** | `src/components/CustomerManager.jsx:541-550` (`handleDeleteFolder` at `L533-559`, button at `L317`) | `if (level === 'Provinsi') updateData.province = 'Unknown Provinsi'; if (level === 'Kabupaten') updateData.region = 'Unknown Kabupaten'; if (level === 'Kecamatan') updateData.city = 'Unknown Kecamatan'; return { type: 'update', ref, data: updateData }; ... await commitInChunks(db, writeBatch, operations);` | **No** — updates only area strings (`province` / `region` / `city`) on `customers/{id}`. | **Keep in plan** |
| **#28 Enterprise Data Scrub** | `src/components/CustomerManager.jsx:930-932, 956-957` (`handleEnterpriseDataScrub` at `L897-966`, button at `L1222`) | `data: { province: prov.toUpperCase(), region: kab.toUpperCase(), city: kec.toUpperCase(), updatedAt: serverTimestamp() } ... await commitInChunks(db, writeBatch, operations);` | **No** — normalizes only `province`, `region`, `city`, and `updatedAt` on `customers/{id}`. | **Keep in plan** |
| **#29 Wipe all map borders** | `src/MapMissionControl.jsx:574-578` (`handleWipeAll` at `L569-586`, button at `L859`) | `const operations = safeBoundaries.map(b => ({ type: 'delete', ref: doc(db, \`artifacts/\${appId}/users/\${userId}/mapSettings\`, \`bnd_\${b.id}\`) })); await commitInChunks(db, writeBatch, operations);` | **No** — batch-deletes only `mapSettings/bnd_*` polygon docs and clears `borderCache`. | **Keep in plan** |
| **#30 Map border folder** | `src/MapMissionControl.jsx:715-719` (`handleDeleteFolder` at `L702-726`, button at `L886`) | `const operations = bordersInside.map(b => ({ type: 'delete', ref: doc(db, \`artifacts/\${appId}/users/\${userId}/mapSettings\`, \`bnd_\${b.id}\`) })); await commitInChunks(db, writeBatch, operations);` | **No** — batch-deletes only `mapSettings/bnd_*` polygon docs inside `folderName`. | **Keep in plan** |
| **#34 Mascot message** | `src/App.jsx:3400-3401` (`handleDeleteMascotMessage` at `L3397-3403`, button at `src/components/SettingsView.jsx:870`) | `const updatedMessages = currentMessages.filter(m => m !== msgToDelete); await setDoc(doc(db, \`artifacts/\${appId}/users/\${user.uid}/settings/general\`), { mascotMessages: updatedMessages }, {merge: true});` | **No** — updates only `settings/general.mascotMessages` dialogue strings. | **Keep in plan** |

### 3. The ONE row to build first + its `src/config/logicFixes.selfcheck.mjs` line
- **Build first:** **Row #10 — Customer Directory shop delete (`src/components/CustomerManager.jsx:1115`, `handleDelete`)**, together with the new `src/utils/delayedWrite.js`, `notifyUndo` in `src/components/Toast.jsx:63`, and the `!isPendingUndo(\`cust:\${c.id}\`)` filter in `src/hooks/useDatabaseSync.js:37, 250`.
- **Why #10 first:** It is a 1-line function (`CustomerManager.jsx:1115`), its `Del` button (`CustomerManager.jsx:1804`) sits on every shop card in the Customer Directory (the single easiest fatal button to press by mistake in daily use), it touches zero money and zero stock, and wiring it proves the entire `scheduleDelayedWrite` + `notifyUndo` + `useDatabaseSync` pipeline before expanding to the other 11 rows.
- **Self-check lines for `src/config/logicFixes.selfcheck.mjs`:**
  ```js
  ok('REGRESSION: CustomerManager handleDelete (#10) routes through scheduleDelayedWrite after confirmAction, and ToastHost renders the 8-second Undo bar',
     /const handleDelete = async \(id, name\) => \{[\s\S]{0,260}confirmAction\("Delete profile\?"\)[\s\S]{0,260}scheduleDelayedWrite\(\{[\s\S]{0,260}key:\s*`cust:\$\{id\}`/.test(read('src/components/CustomerManager.jsx')) &&
     read('src/components/Toast.jsx').includes('export function notifyUndo(') &&
     read('src/hooks/useDatabaseSync.js').includes('isPendingUndo'));
  ```

## Task 91 - BUILD: Undo for Row #10 only (shop delete, `CustomerManager.jsx:1115`)
**Status:** DONE
**Written:** 2026-11-19 18:10 WIB (Claude). Claude reviewed 89 (every pasted line matches the emulator-tested rules text, 0 missing) and 90 (OK).
**Touch only:** `src/utils/delayedWrite.js` (new), `src/components/Toast.jsx`, `src/components/CustomerManager.jsx`, `src/config/logicFixes.selfcheck.mjs`, `src/config/patchNotes.js`, this file.
1. Build exactly the Task 86 plan for Row #10: the delete waits 8 s, the toast shows "Undo"; Undo = nothing written. No other row.
2. Trap: the tab closes or the app goes offline inside the 8 s. Say what happens (write lost? written on next load?) and pick the safe answer: the delete must either happen or visibly not happen - never a shop that looks deleted but comes back silently.
3. One line in `logicFixes.selfcheck.mjs` (regression guard + behaviour check), one patch-notes line (en + id, plain words).
4. Gates after the LAST edit: `node src/config/undef.check.mjs` (clean), `node src/config/logicFixes.selfcheck.mjs`, `npm run build`, `node src/config/integration.audit.mjs` - all green, counts in the Result.
**Done when:** 1-4 done, committed locally. NEVER push.
**Result:**
1. **Row #10 Delayed-Write Undo built:**
   - `src/utils/delayedWrite.js` (`L1-175`): exports `UNDO_MS = 8000`, `registerUndoToastBridge`, `usePendingUndo`, `isPendingUndo`, `undoPendingWrite`, `flushPendingWrite`, `flushAllPendingWrites`, and `scheduleDelayedWrite`.
   - `src/components/Toast.jsx` (`L65-77`, `L195-225`): registers the toast bridge (`registerUndoToastBridge({ notify, notifyUndo, clearUndoToast })`), keeps `notify()` and the 5-second top strip untouched, and renders the 8-second bottom Undo toast-bar (`Deleted <name> · Undo for 8 seconds · [UNDO]`) inside `<ToastHost />`.
   - `src/components/CustomerManager.jsx` (`L29`, `L190-196`, `L1121-1133`): calls `usePendingUndo()`, filters `rawCustomers` by `!isPendingUndo(\`cust:\${c.id}\`)` so a pending-delete shop disappears from the directory immediately, and routes `handleDelete` (`L1121`) through `scheduleDelayedWrite({ key: \`cust:\${id}\`, label: name || 'shop', commit: async () => { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customers', id)); logAudit("CUSTOMER_DELETE", \`Deleted \${name}\`); } })` after `confirmAction("Delete profile?")`. Pressing **UNDO** inside 8 s cancels the timer, unhides the shop, and performs **0 Firestore writes**.
2. **Trap analysis & safe handling (tab close or offline inside the 8 s):**
   - **What would happen without a guard:** Because the 8-second timer lives in memory (`setTimeout`), closing the tab inside the 8 s would lose the timer and the shop would silently come back on next load; going offline inside the 8 s would either queue an unconfirmed write or leave the shop hidden until refresh.
   - **Safe answer implemented (`src/utils/delayedWrite.js:68-78, 92-97, 130-134, 161-175`):**
     - **Offline before or during the 8 s -> visibly does NOT happen:** If `navigator.onLine === false` when Delete is pressed (`L131`), `scheduleDelayedWrite` refuses before hiding the shop and shows the red failure strip `"Failed to delete <name>: you are offline. Nothing was deleted."`. If the browser fires the `offline` event during the 8-second countdown (`L162`) or is offline when the timer expires (`L96`), `cancelBecauseOffline` cancels the timer, closes the Undo bar, immediately restores the shop on screen, and shows `"Failed to delete <name>: you are offline. Nothing was deleted."`.
     - **Tab close / reload during the 8 s while online -> delete happens immediately before unload:** `window.addEventListener('beforeunload', ...)` (`L165`) and `window.addEventListener('pagehide', ...)` (`L172`) call `flushAllPendingWrites()` synchronously so `commit()` (`deleteDoc`) fires into Firestore's persistent IndexedDB cache (`src/config/firebase.js:65`) before unload, and `beforeunload` sets `e.preventDefault(); e.returnValue = ''` to warn the browser while the write flushes.
3. **Self-check & patch notes:**
   - `src/config/logicFixes.selfcheck.mjs:14729-14783` (`CUSTOMER DIRECTORY SHOP DELETE 8-SECOND UNDO (Task 91, 2026-11-19)`): 1 `REGRESSION` check + 1 `BEHAVIOUR` check (verifies Undo inside 8 s -> 0 writes & restored; 8 s expiry -> 1 write; offline -> visibly refused).
   - `src/config/patchNotes.js:6-8`: added `2026-11-19` entry (`en` + `id`, plain words, no `"kamu"`).
4. **5 BUILD gates after last edit (all green):**
   - `node src/config/undef.check.mjs`: **`clean`** (`no new undefined identifiers in src (4 pinned)`)
   - `node src/config/logicFixes.selfcheck.mjs`: **`3031 passed, 0 failed, 3031 checks`**
   - Every `src/config/*.selfcheck.mjs` (14 suites): **all 14 exited 0 (`0 RED`)**
   - `npm run build`: **exit 0** (`built in 15.47s`)
   - `node src/config/integration.audit.mjs`: **`726 passed, 0 failed, 726 checks`**

## Task 92 - READ-ONLY: Step 1 build checklist (Master Vault categories), ready for after the Console publish
**Status:** DONE
**Written:** 2026-11-19 18:10 WIB (Claude).
**Touch only:** this file.
1. From the Task 80 plan + Task 82 fix: an ordered build checklist, each step = file:line today, what changes, which self-check line proves it.
2. Mark which steps NEED Change 29 live in the Console (they fail without it) and which can be built before.
3. List every place that reads `product.category` today (the old field) so none breaks when `categoryId` / `subCategoryId` arrive.
**Done when:** checklist with file:line for every step + the "needs Console first" marks + the old-field read list.
**Result:**

### 1 & 2. Ordered Step 1 build checklist (from Task 80 + Task 82 fix, with Console Change 29 dependency marks)

| Step | Console dependency | `file:line` today | What changes | Self-check line (`src/config/logicFixes.selfcheck.mjs`) that proves it |
|---|---|---|---|---|
| **1.1** | **[CAN BUILD BEFORE CONSOLE PUBLISH]** | `src/utils/productCategories.js` *(new file)* | Create pure helpers: `normCatName(s)`, `findDuplicateCategory(cats, name, skipId)`, `findDuplicateSub(cat, name, skipId)`, `resolveCategoryName(prod, cats)` (`cat?.name \|\| prod.type \|\| prod.category \|\| 'MISC'`), `resolveSubName(prod, cats)`, `categoryUsageCount(catId, inventory)`, `subUsageCount(subId, inventory)`. | `normCatName('Kid - Gold.') === 'kidgold' && categoryUsageCount('kid', prods) === 2 && subUsageCount('kid-gold', prods) === 1 && categoryUsageCount('putih', prods) === 0 && resolveCategoryName(prods[2], cats) === 'SKT'` |
| **1.2** | **[CAN BUILD BEFORE CONSOLE PUBLISH]** *(Task 82 fix)* | `src/config/permissions.js:422-431` (leave `ROLE_PERMISSIONS` at `L182-204` untouched) + `src/components/SettingsView.jsx:1723` | Add `MANAGE_CATEGORIES_KEY = 'manage_product_categories'` and `canManageCategories(userRole)` using the **ABSENCE-MEANS-TIER-DEFAULT** pattern (do **not** add the key to any default `ROLE_PERMISSIONS` list so `injectDynamicPermissions` at `L207-210` never triggers a partial-matrix lockout; default = T1–T4). Add the toggle row to `ALL_FEATURES` in `SettingsView.jsx:1723`. | `!Object.values(ROLE_PERMISSIONS).some(l => l.includes('manage_product_categories')) && canManageCategories('DEVELOPER') === true && canManageCategories('COMPANY_OWNER') === true && canManageCategories('AREA_ADMIN') === true && canManageCategories('FLEET_CAPTAIN') === true && canManageCategories('FIELD_OPERATIVE') === false && canManageCategories('ROOKIE') === false` |
| **1.3** | **[NEEDS CONSOLE CHANGE 29 FIRST]** *(fails for T3–T6 with `permission-denied` without Change 29 part 3b)* | `src/hooks/useDatabaseSync.js:34-62, 88-108, 290-302` | Add `[productCategories, setProductCategories] = useState([])`, subscribe `onSnapshot(collection(db, basePath, 'product_categories'), ...)`, clean up the listener on unmount, and return `productCategories`. | `sync.includes("'product_categories'") && sync.includes('productCategories')` |
| **1.4** | **[NEEDS CONSOLE CHANGE 29 FIRST]** *(T3/T4 category writes fail with `permission-denied` without Change 29 parts 3a + 3b)* | `src/App.jsx:606, 5150-5232` | Destructure `productCategories` from `useDatabaseSync`; add `handleSaveCategory` and `handleDeleteCategory` (refusing delete when `categoryUsageCount > 0` or `subUsageCount > 0` and enforcing exact `['name', 'normName', 'subs', 'createdAt', 'updatedAt', 'updatedBy']` whitelist); pass `productCategories` and `canManageCategories(userRole)` down to `ResidentEvilInventory` and `MerchantSalesView`. | `app.includes("'product_categories'") && app.includes('canManageCategories') && app.includes('categoryUsageCount')` |
| **1.5** | **[CAN BUILD BEFORE CONSOLE PUBLISH]** *(T1/T2 write `products/{id}` under existing `isCompanyTopTier(bossUid)` rule at `firestore.rules:662`)* | `src/App.jsx:3708-3719, 3754-3755` (`handleSaveProduct`) + `src/App.jsx:5282-5286` (product form) | Replace free-text `<input name="type" .../>` (`L5285`, when `!isPromo(editingProduct)`) with searchable Category picker (`Our categories` first, `Competitor-only categories` under a divider) + linked Sub-category picker + inline `"+ New sub-category"`. In `handleSaveProduct` (`L3708`), save `categoryId`, `subCategoryId`, and **dual-write** `type: resolvedCatName` (leaving `if (promo) Object.assign(data, { kind: 'promo', unit: 'pcs', type: 'PROMO' })` at `L3716` byte-identical). | `app.includes('categoryId') && app.includes('subCategoryId') && app.includes("kind: 'promo', unit: 'pcs', type: 'PROMO'")` |
| **1.6** | **[CAN BUILD BEFORE CONSOLE PUBLISH]** *(UI + legacy fallback; category CRUD inside modal needs 1.4 / Change 29)* | `src/components/ResidentEvilInventory.jsx:155, 230, 246-265, 296-305, 337-338, 352` | Add `"Categories"` manager modal (`origin: 'ours' \| 'competitors'`, `"Our categories"` vs collapsed `"Competitor-only categories"`, add/rename/delete with usage-count refusal & duplicate warning, 8-second Undo on empty delete). Group `sections` (`L246-254`) by `resolveCategoryName(item, productCategories)` and render `Category › Sub` on detail (`L155`) and rows (`L337-338, 352`), showing Main warehouse stock as the primary number and all 4 price levels. | `inv.includes('resolveCategoryName') && inv.includes('resolveSubName') && inv.includes('categoryUsageCount')` |
| **1.7** | **[CAN BUILD BEFORE CONSOLE PUBLISH]** | `src/components/ExamineModal.jsx:135` | Replace `<span>TYPE: {product.type}</span>` with `<span>TYPE: {[resolveCategoryName(product, productCategories), resolveSubName(product, productCategories)].filter(Boolean).join(' › ')}</span>`. | `read('src/components/ExamineModal.jsx').includes('resolveCategoryName')` |
| **1.8** | **[CAN BUILD BEFORE CONSOLE PUBLISH]** | `src/MerchantSalesView.jsx:104, 1689-1690, 2691-2699, 2905` | Add `activeSubCategory` state (`'ALL'`). Build Row-1 category tabs (`L1690`) using `resolveCategoryName(i, productCategories)` (hiding 0-product categories); render Row-2 single-line horizontally scrollable sub-category tabs for the picked category (`overflow-x-auto flex-nowrap`); update `filteredItems` (`L1689`) to filter by `resolveCategoryName(i, productCategories) === activeCategory` + `activeSubCategory`; show `Category › Sub` at `L2905`. | `sales.includes('resolveCategoryName') && sales.includes('activeSubCategory')` |
| **1.9** | **[NEEDS CONSOLE CHANGE 29 FIRST]** *(T3 `QUARANTINE_SELL` fails with `permission-denied` without Change 29 part 3c adding `'categoryId', 'subCategoryId'` to `firestore.rules:669, 674`)* | `src/StockOpnameView.jsx:950-955` (`executeResolution`, `QUARANTINE_SELL`) | Add `'categoryId', 'subCategoryId'` to the `keep` array at `L950` (`['type', 'category', 'categoryId', 'subCategoryId', 'images', ...]`) so `rsk-*` damaged-pack lots inherit their parent product's category & sub-category. Keep `L940` (`QUARANTINE_SAMPLING`, `kind: 'promo', type: 'PROMO'`) untouched. | `op.includes("'categoryId', 'subCategoryId'") && (read('firestore.rules').match(/'categoryId',\s*'subCategoryId'/g) \|\| []).length >= 2` |
| **1.10** | **[CAN BUILD BEFORE CONSOLE PUBLISH]** | `src/components/DashboardBenchmarks.jsx:160-166` | Change `L164` from `const type = (item.type \|\| '').toLowerCase();` to `const type = (p.type \|\| resolveCategoryName(p, productCategories) \|\| item.type \|\| '').toLowerCase();` using `const p = prod.get(item.productId)` already resolved on `L160`. | `read('src/components/DashboardBenchmarks.jsx').includes('resolveCategoryName')` |
| **1.11** | **[NEEDS CONSOLE CHANGE 29 FIRST]** *(T1/T2 owner passes `users/{bossUid}`, but any shared restore/wipe helper touching `product_categories` expects Change 29 part 3b live)* | `src/App.jsx:774, 916-933, 957-960, 1014-1019, 4320-4326` | Include `productCategories` in full backup (`L774`), granular `products` / `both` export (`L958`) and import (`L1014`), full system restore (`L4321`, `queueToBatch('product_categories', data.productCategories)`), and nuclear wipe (`L916-933`, delete all docs in `product_categories`). | `app.includes("queueToBatch('product_categories'")` |

---

### 3. Complete list of every place in `src/` that reads `product.category` or `product.type` today (so none breaks when `categoryId` / `subCategoryId` arrive)

Because the current codebase stores the product category string in **`product.type`** (while **`product.category`** only exists on `StockOpnameView.jsx:950` and `firestore.rules:669, 674`), **both** `product.category` and `product.type` readers are listed below:

| # | `file:line` today | Exact code today | What it does | Why it will not break when `categoryId` / `subCategoryId` arrive |
|---|---|---|---|---|
| **1** | `src/StockOpnameView.jsx:950` | `const keep = Object.fromEntries(['type', 'category', 'images', 'dimensions', 'useFrontForBack', 'sticksPerPack', 'packsPerSlop', 'slopsPerBal', 'balsPerCarton', 'hpp', 'costPrice'].filter(k => src[k] !== undefined).map(k => [k, src[k]]));` | **The ONLY place in `src/` that reads `product.category` (`src['category']`)** — copies whitelisted fields from parent product `src` onto a `QUARANTINE_SELL` (`rsk-*`) lot (`firestore.rules:669, 674`). | Step 1.9 keeps `'type'` and `'category'` in `keep` and appends `'categoryId', 'subCategoryId'` once Change 29 part 3c is live in Console. |
| **2** | `src/App.jsx:3712, 3716` | `type: formData.get('type'), ... if (promo) Object.assign(data, { kind: 'promo', unit: 'pcs', type: 'PROMO' });` | Writes `product.type` on Master Vault product save (`handleSaveProduct`). | Step 1.5 dual-writes `type: resolvedCatName` alongside `categoryId` and `subCategoryId` (and keeps `type: 'PROMO'` for promo items). |
| **3** | `src/App.jsx:5285` | `<input name="type" defaultValue={editingProduct.type} placeholder="SKT, Natural…" className={PF_INPUT}/>` | Master Vault Add/Edit Product modal input field. | Step 1.5 replaces this input with the Category + Sub-category pickers, pre-selecting `editingProduct.categoryId` or matching `editingProduct.type` by normalized name. |
| **4** | `src/components/ResidentEvilInventory.jsx:155` | `<p className="text-xs text-ink-dim mt-0.5">{[product.type, !isPromo(product) && \`\${product.sticksPerPack \|\| 16} sticks per Bks\`].filter(Boolean).join(' · ')}</p>` | Master Vault detail drawer subtitle under product name. | Step 1.6 uses `resolveCategoryName(product, productCategories)` + `resolveSubName(product, productCategories)`, which falls back to `product.type`. |
| **5** | `src/components/ResidentEvilInventory.jsx:249` | `const type = item.type \|\| "MISC";` | Master Vault `sections` memo grouping products by category header. | Step 1.6 switches to `resolveCategoryName(item, productCategories)` (falls back to `item.type \|\| 'MISC'`). |
| **6** | `src/components/ResidentEvilInventory.jsx:337-338, 352` | `const sub = !isAdmin ? item.type : inQ ? \`\${item.type \|\| ''}...\` : [item.type, ...]` and `{isAdmin && !inQ && item.type && <p ...>{item.type}</p>}` | Master Vault product row subtitle and desktop type column. | Step 1.6 formats `[resolveCategoryName(item, productCategories), resolveSubName(item, productCategories)].filter(Boolean).join(' › ')`, falling back to `item.type`. |
| **7** | `src/components/ExamineModal.jsx:135` | `<span>TYPE: {product.type}</span>` | 3D Examine box viewer header badge. | Step 1.7 renders `resolveCategoryName` › `resolveSubName` (with `product.type` fallback), plus dual-writing `type` keeps `product.type` populated. |
| **8** | `src/MerchantSalesView.jsx:1689-1690` | `const filteredItems = lotsAfterPacks(inventory.filter(i => (activeCategory === "ALL" \|\| i.type === activeCategory) && ...));` and `const categories = ["ALL", ...new Set(inventory.map(i => i.type \|\| "MISC")), ...];` | Sales Terminal top category filter pills and product grid filter. | Step 1.8 uses `resolveCategoryName(i, productCategories)` for both Row-1 tabs and `filteredItems`, and adds Row-2 `activeSubCategory` filtering. |
| **9** | `src/MerchantSalesView.jsx:2905` | `<span className="hidden lg:block truncate text-[13px] font-bold text-[var(--duke-ink-5)]">{item.type \|\| tr('MISC')}</span>` | Sales Terminal desktop product table `TYPE` column cell. | Step 1.8 displays `Category › Sub` via `resolveCategoryName` / `resolveSubName` (falling back to `item.type \|\| tr('MISC')`). |
| **10** | `src/components/DashboardBenchmarks.jsx:164` | `const type = (item.type \|\| '').toLowerCase(); if (type.includes('skm') \|\| type.includes('filter')) ...` | Command Center 30-day Filter/SKM vs Kretek volume mix benchmark (note: `tx.items` lines do not store `item.type`, so looking up `p = prod.get(item.productId)` on `L160` is needed too). | Step 1.10 checks `(p.type \|\| resolveCategoryName(p, productCategories) \|\| item.type \|\| '').toLowerCase()`, and dual-writing `product.type` preserves the category name string. |
| **11** | `src/StockOpnameView.jsx:940` | `kind: 'promo', unit: 'pcs', type: 'PROMO'` | `QUARANTINE_SAMPLING` (`dmg-*`) promo item creation from damaged stock. | Untouched — promo items stay `kind: 'promo', type: 'PROMO'` and are excluded from `product_categories`. |
| **12** | `src/config/demoSeed.js:116-123` | `type: 'SKT'`, `type: 'SKM'`, `type: 'PROMO'` on demo seed products | Demo company seeded products. | `resolveCategoryName(prod, cats)` falls back to `prod.type \|\| 'MISC'`, so demo products without `categoryId` continue grouping under `'SKT'` and `'SKM'` automatically. |

## Task 93 - READ-ONLY: where else a "deleted" shop still shows during the 8 s Undo
**Status:** DONE
**Written:** 2026-11-19 18:55 WIB (Claude). Claude reviewed 91 (5b178ee0) + 92 (52eef4af): OK; re-ran the gates itself: undef clean, selfcheck 3031/0, build 0, audit 726/0. 91 is NOT pushed yet (not rendered).
**Touch only:** this file.
1. Task 91 hides the shop only inside `CustomerManagement` (filter on `isPendingUndo`). List every OTHER screen that reads the same customers list (map, reports, sales terminal shop picker, receivables, ...) with `file:line`, and say if the shop stays visible there for the 8 s.
2. Smallest fix: one place where the filter could live so every screen gets it (e.g. where the customers snapshot is read in `src/App.jsx`), with the exact line. No edits.
3. Also say: `beforeunload` in `src/utils/delayedWrite.js` calls `e.preventDefault()` - does the browser then show its own "Leave site?" box on a normal reload? Is that box needed for the write to reach the local cache, or can it go?
**Done when:** the screen table + one fix line + the answer to 3.
**Result:**

### 1. Every OTHER screen and engine that reads the `customers` list during the 8-second Undo window

Because Task 91 (`5b178ee0`) filtered `rawCustomers` only inside `src/components/CustomerManager.jsx:194-196`, **`customers` (`src/App.jsx:604`), `displayCustomers` (`src/App.jsx:3905-3906`), `permittedCustomers` (`src/App.jsx:4483-4516`), and `displayPermitted` (`src/App.jsx:4519-4520`) still include the pending-delete shop for those 8 seconds.** Every other screen that reads them therefore still sees the shop during the 8 s if the admin switches tabs before the timer expires:

| Screen / Consumer | `file:line` where `customers` is passed | Prop / source list | How that screen reads it (`file:line`) | Stays visible there during the 8 s today? |
|---|---|---|---|---|
| **Command Center (`DashboardView`)** | `src/App.jsx:5130` | `customers={displayCustomers}` | `src/components/DashboardView.jsx:37` (forwards `customers` to `DashboardBenchmarks` and KPI shop counts) | **YES** (for 8 s until `deleteDoc` fires) |
| **Map System (`MapMissionControl`)** | `src/App.jsx:5139` | `customers={userRole === 'ADMIN' ? displayCustomers : displayPermitted}` | `src/MapMissionControl.jsx:463` (map pins, area filter, and shop sheet) | **YES** (for 8 s) |
| **Journey Plan (`JourneyView`)** | `src/App.jsx:5142` | `customers={displayPermitted}` | `src/JourneyView.jsx:153` (route shop picker, map pins, and stop cards) | **YES** (for 8 s) |
| **Fleet & Canvas (`FleetCanvasManager`)** | `src/App.jsx:5155` | `customers={customers}` | `src/FleetCanvasManager.jsx:148` (van chest `TITIP` tab reads `mappedBy` / shop owner after hand-off) | **YES** (for 8 s) |
| **Agent Profile (`AgentProfileView`)** | `src/App.jsx:5183` | `customers={customers}` | `src/AgentProfileView.jsx:386` (today's route `CLOSED ?/?` counter and Titip shop lookup) | **YES** (for 8 s) |
| **Sales Terminal (`MerchantSalesView`)** | `src/App.jsx:5505` | `customers={displayCustomers}` | `src/MerchantSalesView.jsx:117` (shop search/picker dropdown, geofence pin lookup, customer brief) | **YES** (for 8 s) |
| **Sale Engine (`useTransactionEngine`)** | `src/App.jsx:3911` | `customers: displayCustomers` | `src/hooks/useTransactionEngine.js:24` (matches `storeKey(c.name)` on sale commit to update `lastOrderDate` or skip NOO creation) | **YES** (for 8 s) |
| **Receivables & Consignment (`ConsignmentFinanceView`)** | `src/App.jsx:5547` | `customers={customers}` | `src/ConsignmentFinanceView.jsx:49, 173` (`customerByName` lookup for GPS, WhatsApp phone, `tempoDays`, and `mappedBy`; note: debt rows themselves come from `consignmentTx`) | **YES** (profile metadata stays attached for 8 s) |
| **EOD Setoran (`EODReconciliationView`)** | `src/App.jsx:5587` | `customers={displayPermitted}` | `src/EODReconciliationView.jsx:163` (route completion / stores lookup) | **YES** (for 8 s) |
| **Reports (`HistoryReportView`)** | `src/App.jsx:5697` | `customers={displayCustomers}` | `src/components/HistoryReportView.jsx:200` (shop level/region lookup on transaction history) | **YES** (for 8 s) |
| **Settings -> Customer Access (`SettingsView`)** | `src/App.jsx:5725` | `customers={customers}` | `src/components/SettingsView.jsx:626` (derives `Provinsi > Kabupaten > Kecamatan` folder checkboxes from `customers`) | **YES** (for 8 s) |
| **Admin Hand-off & Grosir Approvals (`App.jsx`)** | `src/App.jsx:1987, 2203-2207` | `customers` | `handleConfirmGrosirHold` (`L1987`) and `handleAdminApproveTransfer` (`L2203`) | **YES** (for 8 s) |

### 2. Smallest fix (ONE place so every screen gets it automatically)

Put `usePendingUndo()` and the `!isPendingUndo(\`cust:\${c.id}\`)` filter in **`src/hooks/useDatabaseSync.js:37, 286`** (where `customers` leaves `useDatabaseSync` into `src/App.jsx:604`):
- At `src/hooks/useDatabaseSync.js:12`: `import { isPendingUndo, usePendingUndo } from '../utils/delayedWrite.js';`
- At `src/hooks/useDatabaseSync.js:38`: call `const undoVersion = usePendingUndo();` and memoize `const visibleCustomers = useMemo(() => (noFolders ? NO_SHOPS : customers).filter(c => !isPendingUndo(\`cust:\${c.id}\`)), [noFolders, customers, undoVersion]);`
- At `src/hooks/useDatabaseSync.js:286`: return `customers: visibleCustomers` (and then the duplicate filter in `src/components/CustomerManager.jsx:194-196` can be removed).
-Because `App.jsx:604` receives `customers` from `useDatabaseSync.js:286` and derives `displayCustomers` (`App.jsx:3905`), `permittedCustomers` (`App.jsx:4483`), and `displayPermitted` (`App.jsx:4519`) from it, **that single line hides a pending-delete shop across all 12 screens and engines at once.**

### 3. Does `e.preventDefault()` in `beforeunload` (`src/utils/delayedWrite.js:168`) trigger the browser's native "Leave site?" dialog, and can it go?

- **Yes — it triggers the browser's native `"Leave site? Changes you made may not be saved"` dialog** whenever the user reloads or closes the tab inside the 8-second Undo window (assuming the user has interacted with the page, which they just did by clicking Delete -> Confirm). That native browser dialog violates the app's zero-browser-dialog rule (`src/config/integration.audit.mjs:238`, Group 10 *"No browser dialog anywhere"*).
- **It is NOT needed for the write to reach the local cache, and `e.preventDefault(); e.returnValue = '';` can go:**
  - `src/config/firebase.js:65` initializes Firestore with `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`.
  - When `flushAllPendingWrites()` runs synchronously inside `beforeunload` / `pagehide` (`src/utils/delayedWrite.js:165-174`), calling `deleteDoc(...)` synchronously enqueues the mutation in the Firestore SDK's local queue and starts the local IndexedDB transaction during the unload turn without needing `e.preventDefault()` to block the reload with a native popup.
  - Removing `e.preventDefault(); e.returnValue = '';` at `src/utils/delayedWrite.js:168-169` (keeping only `if (pending.size > 0) flushAllPendingWrites();` on `beforeunload` and `pagehide`) flushes the delete cleanly with zero native browser dialog.

## Task 94 - BUILD (local only): the Step 1 steps marked [CAN BUILD BEFORE CONSOLE PUBLISH] in Task 92
**Status:** DONE
**Written:** 2026-11-19 18:55 WIB (Claude).
**Touch only:** the files those steps name in Task 92's checklist, `src/config/logicFixes.selfcheck.mjs`, this file. NOT `firestore.rules`. No step marked [NEEDS CONSOLE CHANGE 29 FIRST].
1. Build only those steps, in order. Each leaves its self-check line.
2. Nothing new may show to users yet unless it works without Change 29 live (old products with only `product.category` must still show and sell - check the 12 readers from Task 92).
3. Gates after the LAST edit (undef clean, selfcheck, build, audit) - counts in the Result. Commit locally. NEVER push.
**Done when:** those steps built, gates green, the 12 old-field readers still pass.
**Result:**
1. **Built the 7 `[CAN BUILD BEFORE CONSOLE PUBLISH]` steps in order (zero `[NEEDS CONSOLE CHANGE 29 FIRST]` steps touched, `firestore.rules` untouched):**
   - **Step 1.1 (`src/utils/productCategories.js:1-60`):** Created pure helpers `normCatName`, `findDuplicateCategory`, `findDuplicateSub`, `resolveCategoryName` (falls back through `cat?.name || prod.type || prod.category || 'MISC'`), `resolveSubName`, `categoryUsageCount`, and `subUsageCount`.
   - **Step 1.2 (`src/config/permissions.js:433-447`, `src/components/SettingsView.jsx:1724`):** Added `MANAGE_CATEGORIES_KEY = 'manage_product_categories'` and `canManageCategories(userRole)` using the **ABSENCE-MEANS-TIER-DEFAULT** pattern (T1–T4 `true`, T5–T6 `false`, absent from default `ROLE_PERMISSIONS` arrays), plus the toggle row in `SettingsView.jsx` `ALL_FEATURES`.
   - **Step 1.5 (`src/App.jsx:34, 3746-3751`):** In `handleSaveProduct`, non-promo saves now persist `categoryId` + `subCategoryId` and **dual-write** `data.type` (`resolveCategoryName({ ...editingProduct, ...data }, [])`), keeping `if (promo) Object.assign(data, { kind: 'promo', unit: 'pcs', type: 'PROMO' })` at `L3717` and the existing `<input name="type" .../>` form field at `L5292` working before Change 29 is published in the Console.
   - **Step 1.6 (`src/components/ResidentEvilInventory.jsx:4, 66, 156, 231, 250-258, 340-356, 386`):** Updated `sections`, `ItemInspector`, and product row subtitles/columns to resolve `Category › Sub` through `resolveCategoryName` / `resolveSubName` (with full fallback to legacy `item.type` / `item.category`) and wired `categoryUsageCount`.
   - **Step 1.7 (`src/components/ExamineModal.jsx:4, 11, 136`):** Updated `TYPE:` badge to `[resolveCategoryName(product, productCategories), resolveSubName(product, productCategories)].filter(Boolean).join(' › ')`.
   - **Step 1.8 (`src/MerchantSalesView.jsx:28, 58, 105, 1691-1699, 2700-2717, 2920`):** Added `activeSubCategory` state (`'ALL'`), built Row-1 category tabs and `filteredItems` via `resolveCategoryName(i, productCategories)`, added Row-2 single-line horizontally scrollable sub-category tabs when the picked category has sub-categories, and formatted the desktop `TYPE` cell via `resolveCategoryName` / `resolveSubName`.
   - **Step 1.10 (`src/components/DashboardBenchmarks.jsx:9, 165`):** Updated the 30-day Filter/SKM vs Kretek volume mix benchmark to read `(p.type || resolveCategoryName(p) || item.type || '').toLowerCase()`.
2. **All 12 legacy `product.category` / `product.type` readers from Task 92 verified working without Change 29 live:**
   - Old products with only `product.type` (e.g. `'SKT'`, `'SKM'`) or only `product.category` (e.g. `'Mild'`), promo items (`kind: 'promo', type: 'PROMO'`), and `StockOpnameView.jsx:950` (`rsk-*` lots) all resolve and sell with zero Firestore queries to `product_categories`.
3. **Self-checks & 5 BUILD gates after last edit (all green):**
   - Added 7 checks in `src/config/logicFixes.selfcheck.mjs:14784-14841` (`STEP 1 PRE-CONSOLE: PRODUCT CATEGORIES HELPERS, PERMISSIONS & LEGACY READERS (Task 94, 2026-11-20)` — one per step 1.1, 1.2, 1.5, 1.6, 1.7, 1.8, 1.10).
   - `node src/config/undef.check.mjs`: **`clean`** (`no new undefined identifiers in src (4 pinned)`)
   - `node src/config/logicFixes.selfcheck.mjs`: **`3038 passed, 0 failed, 3038 checks`**
   - Every `src/config/*.selfcheck.mjs` (14 suites): **all 14 exited 0 (`0 RED`)**
   - `npm run build`: **exit 0** (`built in 16.39s`)
   - `node src/config/integration.audit.mjs`: **`726 passed, 0 failed, 726 checks`**

## Task 95 - BUILD (local only): Task 93's fixes for the shop Undo
**Status:** DONE
**Written:** 2026-11-20 08:35 WIB (Claude). Claude reviewed 93 (8bf3afc4) + 94 (b89dcfa5) and pushed both LIVE as 1b13865f, with one fix: `DashboardBenchmarks.jsx` went back to `(p.type || p.category || item.type || '')` - `resolveCategoryName({})` returns 'MISC', so the sale line's own type was never reached for a deleted product. Check pinned in `logicFixes.selfcheck.mjs:14839`.
**Touch only:** `src/hooks/useDatabaseSync.js` (or the exact file Task 93 named), `src/utils/delayedWrite.js`, `src/components/CustomerManager.jsx`, `src/components/ResidentEvilInventory.jsx`, `src/config/logicFixes.selfcheck.mjs`, this file.
1. Move the `isPendingUndo` filter to the ONE line Task 93 named, so every screen hides the shop for the 8 s; remove the now-double filter in `CustomerManager.jsx`.
2. Remove `e.preventDefault(); e.returnValue = '';` from the `beforeunload` handler; keep `flushAllPendingWrites()`.
3. Remove the dead `usedCatCounts` + `void usedCatCounts;` in `ResidentEvilInventory.jsx` (Task 94 left it unused).
4. One self-check line per point. Gates after the LAST edit (undef clean, selfcheck, build, audit) - counts in the Result. Commit locally. NEVER push.
**Done when:** 1-4 done, gates green.
**Result:**
1. **Global 8-second pending-delete filter (`src/hooks/useDatabaseSync.js:9, 39, 287-294`, `src/components/CustomerManager.jsx:23, 191`):**
   - Moved `usePendingUndo()` and `!isPendingUndo(\`cust:\${c.id}\`)` into `useDatabaseSync.js` (`visibleCustomers`), so every consumer of `customers`, `displayCustomers`, `permittedCustomers`, and `displayPermitted` hides the pending-delete shop during the 8-second Undo window.
   - Removed the duplicate `isPendingUndo` / `usePendingUndo` filter from `CustomerManager.jsx`.
2. **Clean `beforeunload` (`src/utils/delayedWrite.js:165-167`):**
   - Removed `e.preventDefault(); e.returnValue = '';` from `beforeunload` so reloading inside the 8 s never shows a native `"Leave site?"` browser dialog, while keeping `flushAllPendingWrites()` to enqueue the pending write into Firestore's persistent local cache before unload.
3. **Dead code cleanup (`src/components/ResidentEvilInventory.jsx:4, 247-255`):**
   - Removed `usedCatCounts`, `void usedCatCounts;`, and the unused `categoryUsageCount` import.
4. **Self-checks & 5 BUILD gates after last edit (all green):**
   - Added 3 checks in `src/config/logicFixes.selfcheck.mjs:14842-14859` (one per point 1–3) and updated Task 91/94 regression guards (`L14741`, `L14830`).
   - `node src/config/undef.check.mjs`: **`clean`** (`no new undefined identifiers in src (4 pinned)`)
   - `node src/config/logicFixes.selfcheck.mjs`: **`3041 passed, 0 failed, 3041 checks`**
   - Every `src/config/*.selfcheck.mjs` (14 suites): **all 14 exited 0 (`0 RED`)**
   - `npm run build`: **exit 0** (`built in 11.56s`)
   - `node src/config/integration.audit.mjs`: **`726 passed, 0 failed, 726 checks`**

## Task 96 - BUILD (local only): Undo for the NEXT delete row from Task 90's table
**Status:** DONE
**Written:** 2026-11-20 08:35 WIB (Claude).
**Touch only:** the one component file that row names, `src/config/logicFixes.selfcheck.mjs`, `src/config/patchNotes.js`, this file. Do after 95.
1. Pick the smallest, most-used row left in Task 90's table (not #10). Say which and why in the Result.
2. Use `scheduleDelayedWrite` exactly as #10 does (key prefix per collection, e.g. `prod:`/`user:`). No new helper. Hide the record through the same shared filter style Task 95 used, if that row's list has one; else say what stays visible.
3. Self-check line + one patch-notes line (en + id, plain words). Gates green, counts in the Result. Commit locally. NEVER push.
**Done when:** that one row has the 8 s Undo, gates green.
**Result:**
1. **Picked Row #14 — Shop delete from the Map sheet (`src/MapMissionControl.jsx:1278-1290`, `handleDeleteStore`):**
   - *Why:* It is the smallest (12-line) and highest-frequency shop delete left in Task 90's table (every admin opening a store pin on Map System sees its Delete button), touches zero money and zero stock, and shares the `cust:` collection prefix with #10 so Task 95's global `useDatabaseSync.js` filter hides the shop across every screen automatically.
2. **Implementation (`src/MapMissionControl.jsx:22, 1278-1290`):**
   - `handleDeleteStore` now routes through `scheduleDelayedWrite({ key: \`cust:\${storeId}\`, label: storeName, onOptimistic: () => setSelectedStore(null), commit: async () => { await deleteDoc(doc(db, \`artifacts/\${appId}/users/\${userId}/customers\`, storeId)); } })` after `confirmAction(...)`.
   - `onOptimistic` closes the Map store sheet immediately, and Task 95's `!isPendingUndo(\`cust:\${c.id}\`)` in `src/hooks/useDatabaseSync.js:288` hides the pin and shop across Map System, Customer Directory, Sales Terminal, Journey Plan, and all other screens during the 8-second Undo window.
3. **Self-check, patch notes, & 5 BUILD gates after last edit (all green):**
   - `src/config/logicFixes.selfcheck.mjs:14860-14867` (`MAP SHOP DELETE 8-SECOND UNDO (Task 96, 2026-11-20)`): verifies `handleDeleteStore` routes through `scheduleDelayedWrite` with `cust:` key and optimistic sheet close, paired with `useDatabaseSync.js` global filtering.
   - `src/config/patchNotes.js:6-8`: added `2026-11-20` entry (`en` + `id`, plain words, no `"kamu"`).
   - `node src/config/undef.check.mjs`: **`clean`** (`no new undefined identifiers in src (4 pinned)`)
   - `node src/config/logicFixes.selfcheck.mjs`: **`3042 passed, 0 failed, 3042 checks`**
   - Every `src/config/*.selfcheck.mjs` (14 suites): **all 14 exited 0 (`0 RED`)**
   - `npm run build`: **exit 0** (`built in 10.63s`)
   - `node src/config/integration.audit.mjs`: **`726 passed, 0 failed, 726 checks`**

## Task 98 - READ-ONLY: real Stock Opname "New count" vs the approved picture - every difference
**Status:** DONE
**Written:** 2026-11-20 09:00 WIB (Claude). Do after 95 + 96. Aldi, verbatim: *"UI for stock opname new count is different from your draft that u show me isnt it its looks worst on the real app as well as the stock count and the quarantine segment is not redesigned yet and still have the game chest we need to redesign that as well"*.
**Touch only:** this file.
1. Approved picture = `.claude/drafts/stock-opname-pro.html` (the v4 he approved; it went live as c25814d7). Real code = `src/StockOpnameView.jsx` (+ any component it renders for "New count").
2. Table: each part of the picture (header, list, product in hand, count inputs, buttons, spacing, words) | how the real app does it today (`file:line`) | SAME / DIFFERENT / MISSING. PC 1440 and phone 390 both.
3. Same table for the "Stock count" part and the Quarantine part: list every place that still uses the game look (chest, gamified words, glow, game icons) with `file:line`.
4. No edits. Rank the differences by how much they hurt a real user (worst first).
**Done when:** the 3 tables + the ranked list are in the Result.
**Result:**

### 1. New Count — Approved Picture (`.claude/drafts/stock-opname-pro.html`) vs Real App (`src/StockOpnameView.jsx`, `src/styles/theme.css`) — PC 1440 & Phone 390

| Part of picture | Picture (`.claude/drafts/stock-opname-pro.html`) | How real app does it today (`file:line`) | Status |
|---|---|---|---|
| **Top header & tabs** (`L170-173`, Phone `L261`) | Clean hairline bar: `"Stock Opname"` title + underline tabs (`Monitor`, `HQ Audits`, `Quarantine`, `New Count`), single border-bottom | Heavy dark card (`bg-[var(--sunk)] border p-4 rounded-xl shadow-lg`), uppercase `"WAREHOUSE OPNAME"` + mono `"AUDITING: ..."` + pill-box tabs (`L1236-1269`); on Review only, `.kpm-wl-fold` collapses title (`theme.css:6397`) | **DIFFERENT** |
| **Summary strip** (`L174-180`, Phone `L262`) | 12-segment progress meter + `5 of 12 counted \| 2 need you \| −5 Bks · Rp 50.000 short \| +3 Bks newly damaged` on `--panel` | `.kpm-oc-sum` (`L2069-2073`) on `--raised`: omits segment progress meter, omits `-N Bks` next to `short`, omits `+N Bks newly damaged` | **DIFFERENT / MISSING** |
| **Left product list** (`L183-200`) | `420px` `--panel` column, rounded search + pill chips (`All 12`, `Needs you 2`, `Left 7`), **section group headers (`Cigarettes / Bks`, `Promo / pcs`)**, single-row items with verdict (`−5` / check / dot / `—`) | `340px`/`380px` `--raised` column (`L2076-2105`); search + chips match style (`theme.css:6416-6427`), but **flat ungrouped list (no `Cigarettes / Bks` or `Promo / pcs` headers)** | **DIFFERENT / MISSING** |
| **Product-in-hand shell & spacing** (`L202-237`) | Airy `--ground` pane (`26px 36px` padding, `22px` vertical gaps), no inner border box, clean `Count again` + `Next` action row above footer | Wrapped in `bg-[var(--sunk)] rounded-xl border shadow-inner` (`L1716`), redundant bottom bar (`L2111-2117`), `Next` sits detached above the footer (`L2057-2063`) | **DIFFERENT** |
| **Product header** (`L204-208`) | `52px` icon, `20px` title + `1 Bal = ...` subtitle + `1 of 12` | `44px` icon (`kpm-oc-ic.big`), `16px` title + `1 Bal = ...` + `1 of N` (`L1811-1818`) | **SAME (slightly smaller)** |
| **Count inputs (`Good` / `Damaged`)** (`L210-219`, Phone `L275-278`) | `64px` `--inset` boxes (`28px` value, `52px` `−/+`, gold focus ring); `Good` helper `101 Bal · 5 Slop · 6 Bks`; `Damaged` helper **`was 5 · +3 new`** or **`none`** (`type 0 if none` on blind) | `48px` `--sunk` boxes (`20px` text, `L1822-1840`); `Good` shows Bal/Slop/Bks helper (`L1829`); `Damaged` has **no** `was X · +Y new` or `none` / `type 0 if none` helper; label says `"Good stock"` instead of `"Good"` | **DIFFERENT** |
| **System vs You counted vs Difference bar** (`L221-225`) | **ONE** clean 3-column bar: `System (10.161)` \| `You counted (10.156)` \| `Difference (-5 Bks Rp 50.000)` | Old 4-cell uppercase mono plate grid (`EXPECTED GOOD`, `EXPECTED DAMAGED`, `GOOD MATCH/DIFFERENCE`, `DAMAGED MATCH/DIFFERENCE`, `L1860-1891`) + separate `"Short by ..."` line above it (`L1842-1844`) | **DIFFERENT** |
| **Why short (Variance cause)** (`L227-230`) | Question `"Why is it 5 short?"` + 5 horizontal **segmented pill buttons** (`Miscount`, `Unrecorded sale`, `Breakage`, `Theft`, `Unknown`) | **Slot-machine reel spinner (`.kpm-dmg-win` / `.kpm-dmg-reel`) with tiny `▲`/`▼` buttons** saying `"TAP TO SAY WHAT HAPPENED"` (`L1939-1968`) | **DIFFERENT** |
| **What happened to new damage** (Phone `L279-282`) | Question `"What happened to the 3 new?"` + **segmented pill toggles with counts** (`Torn 2`, `Water 1`, `Expired`, `Pest`, `Defect`) | **Collapsed accordion (`N DAMAGED` `▾`, `L1985-2001`) hiding a second slot-machine reel (`.kpm-dmg-reel`) + dots + `1 / 5` counter (`L2013-2046`)** | **DIFFERENT** |
| **Recount prompt** (`L233`, Phone `L312`) | Quiet `"Count again"` button in `.act` footer | Boxy alert card (`"COUNT THIS ONE AGAIN. Most differences are miscounts..."` + `"CLEAR AND COUNT AGAIN"` button, `L1911-1921`) | **DIFFERENT** |
| **Bottom footer bar** (`L240-245`) | Clean `--panel` bar (`5 of 12 counted · 2 need you`, `Reset`, `Submit to HQ`) | Heavy uppercase tracking-widest bar (`0 OF 12 COUNTED`, `RESET`, uppercase `SUBMIT TO HQ`, `L2111-2117`) | **DIFFERENT** |
| **Phone 390 layout** (`L258-316`) | List fills screen; picking a product opens a **dimmed bottom sheet (`.dim-under` + `.sheet` with grabber)**, 2-col `Good` / `Damaged`, compact `row2` (`Cam` + `Next` / `Redo` + `Next`), blind notice banner | **No bottom sheet (`L2100`)**: expands full `hand(r)` inline inside the clicked list row (`!wideScreen && on`), pushing rows off-screen and forcing narrow scrolling inside the reel/4-plate blocks | **MISSING / DIFFERENT** |

### 2. "Stock count" (`Monitor` & `HQ Audits`) + `Quarantine` — Every Remaining Game-Look Element

| Area | Game-look element today | Exact `file:line` | What replaces it in the professional look |
|---|---|---|---|
| **Tab shell (`Warehouse Opname`, `HQ Recon Board`, `Quarantine Vault`, `Supply Telemetry`)** | Dark rounded header slab (`bg-[var(--sunk)] rounded-xl shadow-lg`), uppercase mono titles/subtitles (`tracking-widest`), boxed tab switcher | `src/StockOpnameView.jsx:1236-1269` | Plain `"Stock Opname"` title + clean hairline underline tabs on every tab (matching `OpnameWorklist.jsx` + `stock-opname-pro.html`) |
| **Quarantine crates & Ender-style squares (`CrateVault`)** | **Minecraft/game 3D hazard crates (`kpm-chest`, `kpm-c3 hazard`, `kpm-vault kpm-sbox`), pulsing biohazard lid (`SIGN_PULSE`), `.slot` item grid (`"press a square for its actions"`), spring scale shrink/grow** | `src/StockOpnameView.jsx:1419`, `src/components/WarehouseChest.jsx:141-223`, `src/styles/theme.css:5573-5630` | Master-detail or ruled warehouse tabs + product table/list (zero 3D crates, zero square slots) |
| **Biohazard spinning icon & glow** | `<Biohazard className="kpm-hazard">` icon + orange radial spotlight gradient (`rgba(249,115,22,0.05)`) + `kpm-rim-neon` + `shadow-lg` on `PENALTY CHARGE` | `src/StockOpnameView.jsx:1241, 1262, 1379, 1437` | Plain icon stroke + hairline border button (`border-[var(--danger)]`) with zero radial glow or neon rim |
| **Game / Sci-Fi / Military wording** | `"Quarantine Vault"`, `"EXECUTE PROTOCOL"`, `"TARGET ASSET"`, `"LIQUIDATION HISTORY"`, `"Bounty Charged To"`, `"Supply Telemetry"`, `"REAL-TIME FACILITY OVERWATCH"`, `"HQ Recon Board"`, `"God Mode Edit Vault Stock"`, `"Audit Payload sent to HQ! Awaiting Commander approval."` | `src/StockOpnameView.jsx:776, 1079, 1094, 1134, 1140, 1229, 1240-1248, 1322, 1388, 1479, 1483` | Plain business words (`Damaged Stock`, `Confirm`, `Product`, `Action history`, `Charged to`, `Live stock monitor`, `Stock count review`, `Owner stock adjustment`) |
| **Monitor cards (`viewMode === 'monitor'`)** | Pulsing `BarChart animate-pulse`, faint giant `100px` background icon watermark, `animate-pulse` red-glow `"LOW STOCK"` badge, dark slab `rounded-xl shadow-lg` cards | `src/StockOpnameView.jsx:1242, 1286-1367` | Clean tabular stock table / KPI bar without pulsing glow badges or watermarks |
| **Audit History cards (`auditSubTab === 'history'`)** | Heavy `shadow`, circle status badge, `UNACCOUNTED SHRINKAGE DETECTED`, tiny `10px` uppercase mono pills | `src/StockOpnameView.jsx:1530-1705` | Clean expandable rows matching `OpnameWorklist.jsx` (`13-14px` body font, ruled dividers) |
| **Branch Warehouse Stock Chest (`WarehouseChest`)** | Related screen outside Stock Opname: still renders the **3D Ender chest + floating End stone island + green-iris Eye of Ender latch + End motes** (`BranchWarehouseManager` Stock tab) | `src/components/BranchWarehouseManager.jsx:1288`, `src/components/WarehouseChest.jsx:41-132`, `src/hooks/useSound.js:53-54` | Flagged separately — `BranchWarehouseManager` is outside `StockOpnameView` |

### 3. Differences Ranked by How Much They Hurt a Real User (Worst First)

1. **Quarantine still uses 3D hazard crates + square inventory grid (`WarehouseChest.jsx:141-223`, `StockOpnameView.jsx:1419`)** — hides product names behind tiny icons (`"press a square for its actions"`), requires extra taps to inspect HPP loss, and is the #1 unfinished game artifact.
2. **Phone 390 has no bottom sheet (`StockOpnameView.jsx:2100` vs `stock-opname-pro.html:272-315`)** — expanding the huge comparison/reel card inline inside the product list breaks phone scanning and squeezes touch controls.
3. **Why-short & Damage-kind controls still use slot-machine reels (`StockOpnameView.jsx:1939-2052`) instead of segmented pills (`stock-opname-pro.html:227-230, 279-282`)** — forces slow `▲`/`▼` tapping one item at a time behind a collapsed accordion instead of seeing all 5 causes at once and tapping directly.
4. **4-plate uppercase grid (`EXPECTED GOOD / EXPECTED DAMAGED / GOOD / DAMAGED`, `L1860-1891`) + separate `Short by` line (`L1842`) instead of one 3-cell `System / You counted / Difference` bar (`L221-225`)** — visually cluttered and disconnects the rupiah loss from the count comparison.
5. **Summary strip missing the progress meter, `−N Bks short`, and `+N Bks newly damaged` (`L2069-2073`), plus flat product list missing `Cigarettes` / `Promo` section headers (`L2088-2104`)** — weakens at-a-glance status and mixes pcs promo items directly into Bks cigarette rows.
6. **Top tab bar (`L1236-1269`) and Quarantine/Monitor wording + neon/pulse glow (`L1240-1248, 1332, 1379, 1437`)** — causes a jarring clash when switching between `HQ Audits` (`OpnameWorklist`) and the other three tabs (`New Count`, `Quarantine`, `Monitor`).

## Task 99 - PICTURE (drafts only): Quarantine in the professional look, no game chest
**Status:** DONE
**Written:** 2026-11-20 09:00 WIB (Claude). Do after 98.
**Touch only:** `.claude/drafts/quarantine-pro.html` (new), this file.
1. Read A-Brain `Wiki/Concepts/Aldi's Design Taste.md` and `Design Inspiration Sources.md` first. Same standard as `stock-opname-pro.html` and `customers-c.html`: slate + gold, no blue, no green, no chest, no game words, plain English labels.
2. Every feature the real Quarantine has today (Task 98's list) must be in the picture: damaged stock per product, each way out (Repair, Sell Again as RUSAK, Return to vendor, write-off...), who/when history. Nothing dropped.
3. PC 1440 + phone 390 frames, 44 px phone buttons, toast on every action, no `alert/confirm/prompt`, headless `ERRORS: []`.
**Done when:** the picture works in both frames and the Result has a feature-by-feature "real app -> picture" table.
**Result:**
Created `.claude/drafts/quarantine-pro.html` (dual-mounted PC 1440 + Phone 390, Warm Stone / Espresso System/Light/Dark, Motion/Lite switch, T2 Owner vs T3 Sell-Again role toggle, in-page blurred confirm dialogs, self-drawing gold check toast, zero 3D chests/glow/blue/green/alert/confirm/prompt) and verified in headless Chrome (`verify-task99.mjs`, `ERRORS: []`, `minPhBtn: 44`, `phOverflow: false`) + visual inspection of PC, Phone list, Phone detail, and Action history screenshots.

### Feature-by-feature: Real App (`src/StockOpnameView.jsx` + `WarehouseChest.jsx`) -> Picture (`.claude/drafts/quarantine-pro.html`)

| Real app feature (`file:line`) | Picture implementation (`.claude/drafts/quarantine-pro.html`) | Status |
|---|---|---|
| Top tab & sub-tab switcher (`Active Quarantine` / `Liquidation History`, `StockOpnameView.jsx:1241, 1383-1390`) | Plain `"Stock Opname"` header + underline `"Quarantine"` tab + outlined segmented control `"Damaged stock"` / `"Action history (N)"` (T3 hides Action history, matching real rules) | **Kept & restyled** |
| Sunk Capital KPI (`StockOpnameView.jsx:1405-1412`) | Compact top-right summary `"Sunk value (HPP) Rp X · N Bks in <Warehouse>"` updated live on every resolution | **Kept & restyled** |
| Facility / warehouse selector (`CrateVault` 3D crates, `StockOpnameView.jsx:1419`, `WarehouseChest.jsx:141-223`) | Outlined wrapping warehouse tabs (`Master Vault`, `BANDUNG`, `MUNTILAN`) with live damaged `Bks` count pills — **zero 3D crates or inventory square slots** | **Replaced chest** |
| Product list & damaged qty + HPP loss (`CrateVault` squares + `line()`, `StockOpnameView.jsx:1420`) | Master-detail product list with search box (`"Search damaged products"`), HPP/Bks sub-line, damaged `Bks` + HPP total per product, and full product detail card on the right (Phone: pushes cleanly to detail view with `"Back to list"`) | **Kept & restyled** |
| **Repair** (`REPAIR`, Master Vault only, `StockOpnameView.jsx:909-911, 1198-1204, 1442`) | `"Repair to good stock"` (shown on `Master Vault` only) -> qty + optional note -> in-page confirm -> moves back to good stock (`HPP loss = Rp 0`), logs to history, toast | **Kept (plain English)** |
| **Sell Again as RUSAK** (`SELL`, Full vs Lower price, hidden on `damagedFrom` lots, `StockOpnameView.jsx:945-958, 1171-1196, 1428`) | `"Sell again as RUSAK"` (hidden on `Already RUSAK lot`, shown for T2 & T3) -> `"Full price · Rp X"` vs `"Lower price"` segmented control + validation (`0 < p < full`) -> confirms & logs | **Kept & restyled** |
| **Convert to Sample** (`SAMPLING`, 1 Bks = 1 pcs, Master asks destination warehouse, `StockOpnameView.jsx:926-943, 1150-1169, 1423`) | `"Convert to sample (pcs)"` -> asks destination warehouse when on `Master Vault` + required reason -> confirms & logs | **Kept (no biohazard glow)** |
| **Return to Factory / RTV** (`RTV`, Surat Jalan Retur ref, `StockOpnameView.jsx:964-967, 1206-1211, 1434`) | `"Return to factory (RTV)"` -> asks `Surat Jalan Retur` reference -> writes off HPP & logs | **Kept & restyled** |
| **Penalty / Charge staff** (`PENALTY`, agent picker + EOD deduction warning, `StockOpnameView.jsx:968-999, 1213-1226, 1437`) | `"Charge staff"` (replaces `"Penalty Charge"` / `"Bounty"` + drops `kpm-rim-neon` glow) -> staff picker + EOD Setoran warning -> confirms & logs | **Kept (plain English)** |
| **Action History** (`quarSubTab === 'history'`, warehouse filter + who/when/HPP, `StockOpnameView.jsx:1394-1401, 1457-1488`) | `"Action history"` sub-tab with warehouse dropdown + method filter pills (`All`, `Repair`, `Sell again`, `Sample`, `RTV`, `Staff charge`), method badge, timestamp, warehouse, `"Recorded by"`, note, and `"Value (HPP)"` | **Kept & enhanced** |

## Task 97 - BUILD (local only): the approved queue wording in the REAL Customer Directory
**Status:** DONE
**Written:** 2026-11-20 09:15 WIB (Claude). Do after 98 + 99. Aldi: *"yea let antigravity do most of the job we have limited quota"* (his yes). His screenshot of the live app shows the OLD words: "SHOPS WAITING FOR A SALESMAN · 132 · NO PACKAGE UNTIL THEY HAVE ONE", "Choose salesman", "GIVE".
**Touch only:** `src/components/CustomerManager.jsx` (the queue near L1607 + any "Grosir ask"/"Grosir?" wording in that file), `src/config/logicFixes.selfcheck.mjs`, `src/config/patchNotes.js`, this file.
1. Words exactly as approved in `.claude/drafts/customers-c.html` (Task 88): header "Shops without a salesman (N)"; description under it "Nobody is in charge of these shops, so they get no visits and no stock package. Pick the salesman who will look after each shop and press Assign."; button "Give" -> "Assign"; toast "<Shop> is now handled by <Salesman>".
2. WHY each shop is there, one small line per card, from REAL data only (e.g. its salesman is no longer on the team / never had one). If the data cannot tell, show nothing - never invent a reason.
3. Every "Grosir ask" / "Grosir?" in that file -> "Grosir price request" / "GROSIR REQUESTED"; buttons "Keep <tier> price" / "Approve Grosir price".
4. Words only + the reason line: no layout redesign, no logic change to who sees or assigns. Phone 390: nothing cut, 44 px buttons.
5. Self-check lines + one patch-notes line (en + id). Gates after the LAST edit (undef clean, selfcheck, build, audit) - counts in the Result. Commit locally. NEVER push.
**Done when:** 1-5 done, gates green.
**Result:**
Updated `src/components/CustomerManager.jsx`, `src/config/patchNotes.js`, and `src/config/logicFixes.selfcheck.mjs`:
- Added `export const noSalesmanWhy = (c) => ...` (`L192-198`): derives the reason strictly from real shop fields (`Pending approval`, `Folder "..." has no assigned salesman`, `Previous salesman is no longer active` when `assignedAt` exists without active `agentId`, `Verified NOO has not been assigned yet` when `nooAgentName && !assignedAt`, or `''` when unknown — never invents a reason).
- Applied the approved Task 88 wording across both queues (`Grosir price requests (N)`, `Keep <tier> price`, `Approve Grosir price`, `Shops without a salesman (N)`, `Assign`, `<Shop> is now handled by <Salesman>`), updated the shop card `"Grosir?"` badge to `"GROSIR REQUESTED"`, and ensured `flex-wrap`, `min-w-0`, and `min-h-[44px]` button targets on mobile.
- Added `2026-11-20` EN + ID entry in `src/config/patchNotes.js` (`L7`) and Stage C + Task 97 regression checks in `src/config/logicFixes.selfcheck.mjs`.
- **Gates (after last edit):** `undef.check.mjs` -> `clean`; `logicFixes.selfcheck.mjs` -> `3044 passed, 0 failed`; all 14 `src/config/*.selfcheck.mjs` -> exit `0`; `npm run build` -> exit `0` (`18.72s`); `integration.audit.mjs` -> `726 passed, 0 failed`.
- **Lab visual check (`?shell&customers&admin&grosirask&ownerask`):** `ERRORS: []` in both PC (1440) and Phone (390) frames (`minH: 44`, `overflow: false`).

## Task 100 - BUILD (local only): Stock Opname New Count matches `.claude/drafts/stock-opname-pro.html`
**Status:** OPEN
**Written:** 2026-11-20 08:57 WIB (Alucard-Lead). Addresses Aldi's 2026-11-20 note (*"real Stock Opname New count looks worse than the approved picture"*) using Task 98's audit.
**Touch only:** `src/StockOpnameView.jsx` (New Count UI + top tab bar styling/wording only — keep Quarantine/Monitor logic untouched), `src/styles/theme.css` (only if needed for opname-pro classes), `src/config/logicFixes.selfcheck.mjs`, `src/config/patchNotes.js`, this file.
1. Apply Task 98's ranked differences #1–#5 on `New Count`: replace dark/heavy KPI strip (`L1294-1315`), large warehouse tile bar (`L1281-1292`), and 4-plate `EXPECTED GOOD / EXPECTED DAMAGED / GOOD / DAMAGED` cards (`L1860-1891`) with the calm `stock-opname-pro.html` layout (compact pill warehouse strip, 3-cell `System / You counted / Difference` bar + progress meter + `−N Bks short` / `+N Bks newly damaged` strip, `Cigarettes` / `Promo` section headers, `-` / input / `+` stepper rows with `min-h-[44px]` on Phone 390).
2. No Firestore write changes (`submitOpname` / lot math untouched), no `alert`/`confirm`/`prompt`, no blue/green/neon glow.
3. Add regression assertions in `logicFixes.selfcheck.mjs` + 1 EN/ID line in `patchNotes.js`; run all 5 gates (`undef`, `selfcheck` + all `*.selfcheck.mjs`, `build`, `integration.audit.mjs`) and render PC 1440 + Phone 390 in `ponder-lab`. Commit locally, NEVER push.
**Done when:** New Count matches `stock-opname-pro.html`, all gates pass, lab screenshots verified, Result written.
**Result:**

## Task 101 - BUILD (local only): Complete Step 1 Master Vault Categories + Sales Terminal 2-row tabs [WAIT FOR DEMO CONSOLE CHANGE 29]
**Status:** OPEN
**Written:** 2026-11-20 08:57 WIB (Alucard-Lead). Continues `NEXT-SESSION.md` Step 1 after Aldi pastes Change 29 into demo project `kpm-demo-f4d74` Console.
**Touch only:** `src/components/MasterVault.jsx`, `src/MerchantSalesView.jsx`, `src/App.jsx`, `src/config/logicFixes.selfcheck.mjs`, `src/config/patchNotes.js`, this file.
1. Wait until Aldi confirms Change 29 is published on `kpm-demo-f4d74` (do not push live rules-dependent UI ahead of Console publish).
2. Wire the `[NEEDS CONSOLE CHANGE 29 FIRST]` pieces from Task 80/92: Master Vault category manager + `"Our categories"` vs `"Competitor-only"` sections, two-level `Category › Sub-category` picker on the product form (writing both `categoryId`/`subCategoryId` AND legacy `type` per Trap #1), and 2-row category tabs in `src/MerchantSalesView.jsx`.
3. Run all 5 gates + `ponder-lab` PC/Phone visual checks, add `patchNotes.js` + `logicFixes.selfcheck.mjs` coverage, commit locally, NEVER push.
**Done when:** Step 1 category flows work in lab + gates green + Result written.
**Result:**
