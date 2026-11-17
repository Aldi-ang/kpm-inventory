# Antigravity's tasks, written by Claude

Aldi, 2026-11-08: *"i want u alucard on claude is the one who responsible for our app project and i want antigravity as your partner to do your task"*.
Aldi, 2026-11-16: *"u should give another jobs for antigravity until all the usage runout from it so that we can save some quota here"* - so this file is now a QUEUE: do Task 1, commit, then go straight on to Task 2, then Task 3. Do not wait for Claude between them.
Aldi, 2026-11-16 20:15: *"keep giving antigravity jobs without i need to ask everytime if its running out of quota i'll tell u"* - Claude keeps at least 2 OPEN tasks here. Work them top to bottom; when the last one is DONE, stop and wait for Claude to refill.

**Your jobs are THINKING jobs** (Aldi, 2026-11-10): reading code, audits, reviews. Never a browser, never a click-through.
**Previous task (the 39 Fleet self-checks): DONE, reviewed by Claude 2026-11-16 (commit ca4921ca): count adds up (2981 - 3 merged + 4 new = 2982), no check weakened. Its Result table is in that commit.**

**NEW 2026-11-17 08:58 - BUILD tasks.** Aldi: *"your quota is almost finish i want u to make antigrav work 75% of your work if possible make sure u give the exact notes and information before its working and you are here to check make sure all the quota for antigrav is depleted first"*. A task marked **BUILD** may edit the files in its own "Touch only" list - nothing else - and run `npm run build` and the checks. It still never pushes, never deploys, never touches firestore.rules or A-Brain, never opens a browser. Claude reads every BUILD commit (`git show`) and re-runs the gates before anything goes live.

## BUILD rules (only for a task marked BUILD)
- classNames, words and the checks it names - NEVER a handler, an `onClick=`/`onChange=` body, a `name=` on an input, a Firestore call, or a `data-guide=` / `data-mission=` / `data-mark=` attribute.
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
**Status:** OPEN
**Written:** 2026-11-17 12:45 WIB, by Claude. Same rules as above (read-only, touch only this file).

Exactly Task 20's four tables for `src/MapMissionControl.jsx` (the `activeTab === 'map_war_room'` screen, App.jsx L5137). Every press that writes to Firestore gets **Yes** with the exact collection + field it writes. Demo guide marks (`data-mission=` / `data-guide=` / `data-mark=`); every selfcheck pin on this file (grep logicFixes.selfcheck.mjs + integration.audit.mjs for `MapMissionControl`); the filled-button list (`bg-gold`, `bg-[var(--gold)]`, `bg-orange-*`, `bg-amber-*`, `from-amber-*`) with file:line. Also: which parts are the map library itself (Leaflet or similar - the restyle must not touch them) and which are KPM's own panels around it.
Do NOT change the code. Done when: four tables + filled-button list + map-library-vs-KPM list in the Result.

## Task 32 - the same map for Agent Profile (segment 10 of 12)
**Status:** OPEN
**Written:** 2026-11-17 12:45 WIB, by Claude. Same rules as above (read-only, touch only this file).

Exactly Task 20's four tables for `src/AgentProfileView.jsx` (the `activeTab === 'agent_profile'` screen, App.jsx L5165) - the screen in Claude's lab frame today: Agent Directory list on the left, the person card (avatar frame, rank, XP bar), the RANK CONFIG / AVATAR / LEADERBOARD / GRANT AWARD keys, LIVE FINANCIAL MATRIX. Every press that writes (avatar upload, award, rank config) gets **Yes** with collection + field. Demo guide marks, selfcheck pins, filled-button list with file:line (LEADERBOARD is filled amber today), and which elements are game art he built (avatar frames, rank colours) - the redesign must keep those, so name each.
Do NOT change the code. Done when: four tables + filled-button list + game-art list in the Result.

## Task 33 - BUILD: no amber-filled button on Stock Opname and Receivables & Consignment
**Status:** OPEN
**Written:** 2026-11-17 12:45 WIB, by Claude. BUILD rules apply.
**Touch only:** `src/StockOpnameView.jsx`, `src/ConsignmentFinanceView.jsx`, `src/config/logicFixes.selfcheck.mjs`, this file.

Same job as Task 28, two other screens. Aldi, 2026-11-17: *"i really hate the simple amber fill button dont make it again"*.
1. FIRST list every filled button in both files: `rg -n "bg-gold|bg-\[var\(--gold\)\]|bg-orange-|bg-amber-|from-amber-" src/StockOpnameView.jsx src/ConsignmentFinanceView.jsx`. For each hit decide: FILLED BUTTON (a `<button>` whose resting background is the fill) or NOT (hover-only `hover:`/`group-hover:` fills, badges, bars, progress fills, header strips, anything inside a print area). Put the whole list with the verdict in the Result BEFORE editing.
2. Each FILLED BUTTON: exactly Task 28 point 1 (remove the fill, its `text-[var(--gold-ink)]`/`text-gold-ink`, any `shadow-*` glow, any `transition-*` / `hover:opacity-*` / `active:scale-*`; add `kpm-edge-btn` at the front, `danger` for delete/reject, `quiet` for a secondary press; keep size, padding, width, flex, gap, rounded, font). Never a handler, never `disabled=`, never a `data-*`.
3. A print block (anything under a `print-` class or inside a receipt / Surat Jalan that prints) is NOT touched: the receipt keeps company colours (a locked rule).
4. In logicFixes.selfcheck.mjs, right AFTER the Task 28 check (`REGRESSION: no amber-filled button on Reports or Customers`), add ONE check `REGRESSION: no amber-filled button on Stock Opname or Receivables (his 2026-11-17 "dont make it again")` in the same style: read both files, `.replace` ONLY the exact NOT strings from point 1 (a comment names each line), `!fill.test(...)` per file, and a minimum `kpm-edge-btn` count per file equal to the number you converted.
5. Red-then-green proof exactly like Task 28 point 4 (stash the two .jsx, check FAILS; pop, PASSES). Paste both outputs.
Done when: the four BUILD checks are green, the list with verdicts and the red-then-green proof are in the Result. If a file has zero filled buttons, say so, add no check for that file, and still do the other.
