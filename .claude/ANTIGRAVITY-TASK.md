# Antigravity's task, written by Claude

Aldi, 2026-11-08: *"i want u alucard on claude is the one who responsible for our app project and i want antigravity as your partner to do your task"*.
Claude writes ONE task here. Antigravity does it, writes the Result, sets Status to DONE. Status is OPEN, DONE or NONE.

**Status:** DONE
**Written:** 2026-11-11 05:47 WIB, by Claude.
**Your jobs are THINKING jobs from now on** (Aldi, 2026-11-10: *"next time we just give antigravity job thats need
thinking, not physical like this, it takes so much time"*): reading code, audits, research, reviews, small code fixes.
Never a browser, never clicking through a website, never anything that needs his sign-in. If a task seems to need one,
stop and write that in the Result.

**Previous task (media, round 4): DONE and used.** Your 8 voice takes and the idle / talk clips are live in the app
since a7e0ab7 (reviewed 62369ce). Aldi is remaking the deal clip himself. Nothing more to do there.

**Task:** READ-ONLY. Settle the 38 "❔ not confirmed" findings of the August sweep. Aldi asked (2026-11-08): *"check the
notes, fixes and test it yourself all of that"*. Claude checked the other 36 already. These 38 sit in code that was
rewritten after August, so a line number in the note no longer points at anything.

**Where they are:** A-Brain `Backlog/`, the seven `SWEEP - *.md` notes (not `SWEEP 2026-08-18 - START HERE.md`, not
`SWEEP - 22 claims that got KILLED.md`). Each note starts with a block "## Status, checked against the app 2026-11-08".
Every line in it marked ❔ is one finding: the number is the finding's `## N.` section in the same note.

**For each ❔ finding:** read its section; find the code TODAY by the names it uses (not the August line number;
`git log -S "<text>"` tells when a line went away); answer FIXED (file:line of what stops it), OPEN (file:line that
still does it), GONE (what replaced it), or CAN'T TELL (why) - one plain sentence each.

## Never
Edit app code or A-Brain. Build, deploy or push. Open a browser. Guess: an answer you did not read in today's code is
CAN'T TELL.

**Touch only:** this file (the Result below).

**Done when:** every one of the 38 has an answer; the Result is one table per note (Finding | Answer | file:line | one
sentence), with the count of each answer at the top; Status here is DONE. Commit THIS file by name, message starting
`Antigravity:`. Do not push. Then tell Aldi: "done, ask Claude to check it".

**Result:**

**Counts:** FIXED: 1 · OPEN: 37 · GONE: 0 · CAN'T TELL: 0 (Total: 38)

### 1. `SWEEP - agent profile ranks and awards.md` (4 findings)
| Finding | Answer | file:line | One sentence |
| --- | --- | --- | --- |
| #2 | OPEN | `src/AgentProfileView.jsx:442-563` | `(transactions \|\| []).forEach` clamps `Math.max(0, titipIssued - titipCollected)` at `:562`, so unpaid consignment debt older than the 7-day feed vanishes and out-of-window repayments can zero the headline. |
| #3 | OPEN | `src/AgentProfileView.jsx:587-609` | The `stats` `useMemo` reads `useCareerLedger` and `career?.[activeAgent.id]` (`:587-588`), but its dependency array (`:609`) omits `career` and `useCareerLedger`. |
| #4 | OPEN | `src/AgentProfileView.jsx:282,341,393,637-644` | The rank-up `useEffect` (`:637-644`) runs whenever `canEditProfile` (`:209`) rather than own profile only, and all three `master_owner` writes (`:282`, `:341`, `:393`) still call `setDoc` without `{ merge: true }`. |
| #5 | OPEN | `src/AgentProfileView.jsx:363` | `handleGrantAward` still writes `grantedBy: userId, grantedByName: activeAgent.name \|\| 'Admin'`, storing the vault owner ID alongside the recipient's name. |

### 2. `SWEEP - App.jsx admin handlers.md` (12 findings)
| Finding | Answer | file:line | One sentence |
| --- | --- | --- | --- |
| #4 | OPEN | `src/App.jsx:2242-2290` | `handleApproveTransfer` still creates both notification docs (`:2243`, `:2255`, `:2267`, `:2278`) before `commitInChunks` (`:2290`), leaving notifications sent if the batch fails. |
| #6 | OPEN | `src/App.jsx:3703-3744,5262` | The product edit modal includes `<input name="stock" .../>` (`:5262`) and `handleSaveProduct` reads `stock` (`:3703-3704`) into `data` passed directly to `updateDoc` (`:3743`). |
| #7 | OPEN | `src/App.jsx:2504-2508` | `handleVerifyEOD` runs `t.update(txRef, { 'forensicData.eodCredited': true })` for each ID in `creditedTxIds` without reading via `t.get(txRef)` to verify the transaction still exists. |
| #8 | OPEN | `src/App.jsx:4386-4400` | `handleImportSharedConfig` overwrites `settings/general` without `{ merge: true }` (`:4387`) and sets imported product docs (`:4395-4400`) without stripping `stock`, `minStock`, or `damagedStock`. |
| #9 | OPEN | `src/App.jsx:1239-1272,1482-1489` | `handleChangePin` (`:1482-1489`) opens Setup Mode whose `handleSetupSecurity` calls `setDoc(vaultDoc, security)` without `{ merge: true }` (`:1272`), replacing `passkeys` with only `[passkey]` (`:1239-1248`). |
| #10 | OPEN | `src/App.jsx:818-829` | `handleMasterProtocol` queues three downloads via `setTimeout` (`:819-821`) and immediately sets `sessionStatus` (`:826`) and logs `MASTER_BACKUP` (`:828`) before any download runs. |
| #11 | OPEN | `src/App.jsx:1434-1445,1470-1479` | Recovery OTP now passes `to_email: user.email` (`:1443`), but `newOtp` is still generated in the browser (`:1434`), held in React state (`:1435`), and verified client-side (`:1471`). |
| #12 | OPEN | `src/App.jsx:3501-3543` | `handleDeleteConsignmentData` (`:3502`, no success toast at `:3519-3520`) and `handleDeleteHistory` (`:3526`) both filter only the 7-day `transactions` prop, and `handleDeleteHistory` reports `Deleted ${targets.length} records` (`:3541`). |
| #13 | OPEN | `src/App.jsx:4120` | `handleUpdateSampling` still sets `const newQty = parseInt(updatedData.qty);`, dropping fractional pack quantities. |
| #14 | OPEN | `src/App.jsx:2745,2762,2805-2812` | `handleRecalculateCareer` reads `eod_reports` via `getDocs` (`:2762`), writes `{ base, baseThrough: cutoffDay, live: {} }` (`:2805-2812`), and intentionally leaves `credited` untouched (`:2745`), keeping the snapshot-to-commit race open. |
| #15 | OPEN | `src/App.jsx:4091-4114,4147-4176` | `handleDeleteSampling` skips van stock restoration when `!agentDoc.exists()` (`:4092-4105`) yet still deletes the sample (`:4110`) and shows `Sample deleted & stock restored.` (`:4113`). |
| #17 | OPEN | `src/App.jsx:3000-3011,3066-3105` | `handleLogin` notifies on sign-in failure (`:3291-3292`), but in `unsubAuth` a failed `liveProfileRef` fetch still only logs `console.warn` (`:3010`) and the outer `Traffic Cop Error` catch (`:3066-3105`) drops to `UNAUTHORIZED` without notifying the user. |

### 3. `SWEEP - history reports and audit vault.md` (5 findings)
| Finding | Answer | file:line | One sentence |
| --- | --- | --- | --- |
| #2 | OPEN | `src/components/HistoryReportView.jsx:142-156,251-259` | `reportData` builds folders from current `boss.location` (`:142-149`) and `motorist.location` (`:150-156`), while `contextualTransactions` still filters `selectedAgent` by stored `t.agentName` (`:252`) and `ADMIN` regions by `isMasterVaultPlace(selectedRegion)` (`:255`). |
| #4 | OPEN | `src/components/HistoryReportView.jsx:395-401` | `handleEditSubmit` updates the transaction doc and `sales_stats` via `tallySaleOp`, without adjusting product `stock` or recomputing `totalProfit`. |
| #5 | OPEN | `src/components/HistoryReportView.jsx:289` | `stats` still subtracts every `RETUR` from `payments['Cash']` regardless of the transaction's payment `method`. |
| #6 | OPEN | `src/components/AuditVaultView.jsx:28,149,159` | `snapshotId` and `snapshotPath` appear only in `AuditVaultView.jsx` and are never written by any logger, so Revert and the snapshot badge can never appear. |
| #7 | OPEN | `src/components/AuditVaultView.jsx:79-82,171` | The `onSnapshot` error callback only runs `console.error` and `setLoading(false)` (`:79-82`), setting no error state so denied reads render `/// Sector Empty ///` (`:171`). |

### 4. `SWEEP - permission rules versus the screen.md` (4 findings)
| Finding | Answer | file:line | One sentence |
| --- | --- | --- | --- |
| #1 | OPEN | `firestore.rules:200-209,261-300,765-778` | `customerAccessLevel` (`:200-209`) still checks raw `profile.get('userRole', 'NONE')` with no legacy tag mapping and defaults to `'global'`; CHANGE 17 (`:261-300`) adds folder limits only when `settings/customer_access.on == true`, leaving the old path active otherwise and on `create` (`:769`). |
| #3 | OPEN | `src/AgentProfileView.jsx:829,1007` | Shared `settings/{docId}` was closed (`firestore.rules:544-546`) and writes moved to `users/{userId}/settings/progression` (`:157,379`), but the UI still gates Rank Config on `edit_rank_config` while `firestore.rules:958` has `allow write: if false` on `settings/{docId}` (allowing only T1/T2 via `:561-562`). |
| #4 | OPEN | `src/AgentProfileView.jsx:209,1025` | `AgentProfileView.jsx` still gates `Grant Award` on `edit_agent_roles` (`:1025`) and profile edits on `canEditProfile` (`:209`), whereas `firestore.rules:986-994` sets `allow write: if false` on `career/{agentId}` and has no `create` rule on `awards` (only T1/T2 catch-all and `:879` `canEditRoster == true` on `motorists`). |
| #6 | OPEN | `firestore.rules:206-208` | `src/config/permissions.js:387-391` ranks `customers_edit_global` above `customers_edit_own_region` above `customers_view_only`, while `firestore.rules:206-208` still checks `'customers_view_only'` before `'customers_edit_own_region'` and `'global'`. |

### 5. `SWEEP - the map screen.md` (5 findings)
| Finding | Answer | file:line | One sentence |
| --- | --- | --- | --- |
| #8 | OPEN | `src/MapMissionControl.jsx:16,1417-1425` | `TierAutomationEngine` `catch` now calls `notify` (`:1425`) instead of failing silently, but `getDoc` is still omitted from the `firebase/firestore` import at `:16`, so `:1417-1419` still throw and tier rules never load. |
| #10 | OPEN | `src/MapMissionControl.jsx:1476,1544,1919-1927,2337` | `MapMissionControl` passes the filtered `mapPoints` (`:1919-1927`) into `<TierAutomationEngine mapPoints={mapPoints} .../>` (`:2337`), so `runDataCleanse` (`:1476`) and `runSimulation` (`:1544`) still process only stores matching active filters. |
| #11 | OPEN | `src/MapMissionControl.jsx:648-663` | `toggleFolderVisibility` still runs un-awaited per-border `saveBoundaryToFirebase(target)` inside `forEach` (`:656-662`) where write failures are only logged via `console.error` (`:532`). |
| #12 | OPEN | `src/MapMissionControl.jsx:801` | `handleFileUpload` still checks duplicates against `b.name === name && (b.folderName \|\| b.level) === targetFolder`, scoped only to `targetFolder`. |
| #15 | OPEN | `src/MapMissionControl.jsx:1786-1817` | `handleSaveNewStore` still saves new stores (`:1792-1805`) with no duplicate check (`findShop` is imported at `:17` but unused here) and without setting `region` or `city`. |

### 6. `SWEEP - the sales terminal.md` (2 findings)
| Finding | Answer | file:line | One sentence |
| --- | --- | --- | --- |
| #11 | OPEN | `src/MerchantSalesView.jsx:3192,3351` | The receipt modal still sets `activeTier` from `receiptData.items?.[0]?.priceTier \|\| 'Retail'` (`:3192`), so an IOU-fulfillment first line sets the whole nota's `Tipe Harga` (`:3351`) and catalogue column prices to Retail. |
| #13 | OPEN | `src/MerchantSalesView.jsx:3220-3229` | When `!inventory.find(...)` (`:3221`), the receipt modal still multiplies and divides by hardcoded `10` (`:3222-3226`) instead of using stored pack sizes. |

### 7. `SWEEP - warehouse and restock.md` (6 findings)
| Finding | Answer | file:line | One sentence |
| --- | --- | --- | --- |
| #2 | FIXED | `src/components/BranchWarehouseManager.jsx:767-769` | `handleConfirmReceipt` reads `orderSnap` inside `runTransaction` and throws if `orderData.status === 'DELIVERED' \|\| orderData.status === 'DISPUTED'`, blocking double-crediting. |
| #3 | OPEN | `src/components/BranchWarehouseManager.jsx:286,599,773` | `branchLocation` (`:286`), branch inventory listener (`:599`), and `handleConfirmReceipt` (`:773`) still interpolate `userLocation`/`order.branch` into `branches/.../inventory` without `.replace(/\//g, '-')`. |
| #4 | OPEN | `src/RestockVaultView.jsx:827-834,1824` | Outbound rows render `Hapus` (`:1824`) wired to `handleDeleteRequest(po.id)` (`:827-834`), which deletes `stock_requests/{orderId}` without blocking `IN_TRANSIT` orders or reversing HQ stock. |
| #5 | OPEN | `src/RestockVaultView.jsx:1174-1183` | `producedFor` (`:1174-1183`) still totals monthly target progress from `procurements`, which `src/hooks/useDatabaseSync.js:109` queries with `where('timestamp', '>=', sevenDaysAgo)`. |
| #6 | OPEN | `src/RestockVaultView.jsx:275,280,285,1700-1703` | Listener error callbacks in `RestockVaultView.jsx` (`:275,:280,:285`), `BranchWarehouseManager.jsx` (`:574,:587,:604`), and `useDatabaseSync.js:109` only `console.warn`, so denied reads render the normal empty state. |
| #7 | OPEN | `src/RestockVaultView.jsx:606,634,709` | `Number(...) \|\| 0` guards at `:452`, `:634`, and `:709` (and `src/utils/helpers.js:284-285`) prevent `NaN`, but `:606` still only checks `totalItemsReceived + promoPcs <= 0` so a cart with a blank-quantity line saves that line as `0`. |


