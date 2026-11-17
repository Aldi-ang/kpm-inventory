# Antigravity's tasks, written by Claude

Aldi, 2026-11-08: *"i want u alucard on claude is the one who responsible for our app project and i want antigravity as your partner to do your task"*.
Aldi, 2026-11-16: *"u should give another jobs for antigravity until all the usage runout from it so that we can save some quota here"* - so this file is now a QUEUE: do Task 1, commit, then go straight on to Task 2, then Task 3. Do not wait for Claude between them.
Aldi, 2026-11-16 20:15: *"keep giving antigravity jobs without i need to ask everytime if its running out of quota i'll tell u"* - Claude keeps at least 2 OPEN tasks here. Work them top to bottom; when the last one is DONE, stop and wait for Claude to refill.

**Your jobs are THINKING jobs** (Aldi, 2026-11-10): reading code, audits, reviews. Never a browser, never a click-through.
**Previous task (the 39 Fleet self-checks): DONE, reviewed by Claude 2026-11-16 (commit ca4921ca): count adds up (2981 - 3 merged + 4 new = 2982), no check weakened. Its Result table is in that commit.**

## Rules for every task below
- READ-ONLY on the app: never edit anything in src/, firestore.rules, A-Brain. Never build, deploy, push, or open a browser.
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
**Status:** OPEN
**Written:** 2026-11-17 06:40 WIB, by Claude. Same rules as above (read-only, touch only this file, commit it alone, "Antigravity:").

Claude shipped the menu tour you supplied the data for (Tasks 5 and 13): `src/components/DemoMission.jsx` (the tour state, `seen()` / `shows()` / `aim()`, the LANJUT / LEWATI keys), `src/config/demoMission.js` (`TOUR`, `tourBeat`, `nav()`, `UNLOCK`), `src/styles/theme.css` (`html.kpm-tour`). Review it read-only, as a visitor would meet it:
1. **Per tier** - T2 owner, T4 regional admin (Hendra), T6 motorist (Dika), from `src/config/demoLogins.js`: which menu items does the tour walk (the shell renders `visibleMenu`, `src/components/BiohazardTheme.jsx` ~L526), and is every `TOUR` line TRUE for that tier? Example: the Settings line says "serta aturan perusahaan" - can a T6 change company rules there? For each line that is wrong for a tier: the tier, why (file:line), and a corrected Indonesian sentence (a full sentence, "Anda", never "kamu", named with the `${L}` the menu shows).
2. **Screen names** - every place the guide names a screen in words (`GO` and `BEFORE` in DemoMission.jsx, the `nav()` labels in demoMission.js) against the name the menu shows (`tr(item.label)`, `src/config/lang.js`). List each mismatch with file:line and the words to use (example: GO 3 says "Fleet & Canvas" - what does the menu show in Indonesian?).
3. **A press during the tour** - what happens when the visitor presses the RINGED menu item instead of LANJUT, on the PC (menu held open by `html.kpm-tour`) and on the phone (the drawer closes on a press, BiohazardTheme.jsx ~L925)? Trace it through the code: does the tour stay on that item, move on, or break? Anything that goes wrong, with file:line.
Do NOT change the code. Done when: three tables (tier x line truth, name mismatches, press-during-tour trace) in the Result.

**Result:**
