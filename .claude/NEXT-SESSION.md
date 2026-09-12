# The one job

**A red alarm strip paints OVER every dialog box. The toast column sits one layer above the
confirm dialog, and the low-stock alarm never clears itself, so a "critically low" strip can lie
across the top of a dialog the user is trying to read.**

⚠️ **Before this job: read Aldi's test results for `8ed215f` and `a2b4eae` (✅ TEST from
2026-09-12, listed under "Shipped" below).** If he reports the phantom `ANOTHER AGENT` banner
still shows on a store created today, THAT is the job — start from `git show 8ed215f` and the
PHANTOM COMPETITOR section of `logicFixes.selfcheck.mjs`. Otherwise do the job below.

---

## Paste this to start the next session

> /alucard
>
> Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
>
> **The symptom:** the low-stock alarm strip (`⚠️ BOSS! <product> is critically low (N Bks left).
> Restock needed!`) stays on screen until clicked, and it is drawn ABOVE the confirm dialog. So while
> a dialog is open, a red strip can sit across its top edge. It does not block clicks (the column is
> `pointer-events-none`), it only paints over.
>
> **The lines, all verified 2026-09-12:**
> - `src/components/Toast.jsx:114` — the toast column: `fixed inset-x-0 top-0 z-[10000]`.
> - `src/components/ConfirmGate.jsx:124` — the dialog layer: `z-[9999]`. One below the toasts.
> - `src/utils/toastSeverity.js:26` — `isSticky(message)`: anything that is not a recognised SUCCESS
>   word is sticky. The alarm text has no success word, so it IS sticky — that question is answered.
> - `src/components/Toast.jsx:92` — `if (!item.sticky)` sets the auto-dismiss timer; a sticky toast
>   has a close button (`:156`) and clears only on click. This is deliberate. Do not change it.
> - `src/App.jsx:1365` — where the alarm is raised.
>
> **The safe half, and the whole job:** put the toast column UNDER the dialog layer. `z-[9998]` on
> `Toast.jsx:114`. A dialog then covers the strip while it is open; when the dialog closes, the strip
> is still there, still waiting to be clicked. Nothing about the strip's lifetime changes.
>
> **Order:** guard first in `src/config/toastSeverity.selfcheck.mjs` or `logicFixes.selfcheck.mjs`
> (the toast column's z-index must be LOWER than ConfirmGate's, read both numbers from source), prove
> it RED, then the one-line edit, then `npm run build; node src/config/integration.audit.mjs`.
> `integration.audit.mjs` group 13 asserts the toast host calls `isSticky` — leave that alone.
>
> **Render it.** This is a visual change. Open a dialog with a sticky toast up and take a frame
> before and after. A z-index edit that is not seen is not verified. The viewing path is in
> `A-Brain/Wiki/Concepts/Looking at the App.md`.
>
> **Trap:** the toast column is above the dialog on purpose for ONE reason nobody has written down;
> check `git log -S'z-[10000]' -- src/components/Toast.jsx` first. If a commit message says why, stop
> and ask Aldi before moving it.
>
> Rewrite this file with the next single job before closing.

---

## Shipped 2026-09-12, later — `8ed215f` and `a2b4eae`

**`8ed215f` — creating a store is not visiting it.** The customer form stamped `lastVisit` with
today in three places (`CustomerManager.jsx:248`, `:1018`, `:1037`) and never `lastVisitedBy`, so
`MerchantSalesView.jsx:552` read a fresh store as "claimed by another agent". The form now leaves
`lastVisit` blank; every reader already has a branch for blank. PHANTOM COMPETITOR section in
`logicFixes.selfcheck.mjs`: 1 red before, 1426/1426 after. Stores created earlier on 2026-09-12
keep the stamp until midnight.

**`a2b4eae` — the alarm says `(300 Bks left)`, not `(300 left)`.** `App.jsx:1365`. Guard: THE
ALARM SAYS 300 OF WHAT in `logicFixes.selfcheck.mjs`, 1427/1427.

**✅ TEST owed by Aldi:** create a new store in the customer directory, then sell to it the same
day. No red `ANOTHER AGENT` banner. Side effect to expect: that new store shows as NEVER VISITED in
the Journey view and as due-now on the map until the first real sale — that is the truth now.

## Shipped 2026-09-12 — `9b31bf0`

The four `|| 50` / `|| 5` call sites are gone. `ResidentEvilInventory.jsx`, `useTransactionEngine.js`,
`MerchantSalesView.jsx`, `StockOpnameView.jsx` all call `isLowStock(product, appSettings)` from
`src/utils/stockThreshold.js`. `appSettings` is threaded into the two that lacked it (a prop from
`App.jsx` for ResidentEvilInventory; an option for useTransactionEngine). Section 7 of
`stockThreshold.selfcheck.mjs` guards all four: 8 red before, 36/36 green after. Build clean,
`integration.audit.mjs` 722/722 — that also clears the audit owed on `44058b1`.

**Tested by Aldi 2026-09-12 20:50, both screens LOW.** Closed.

Same session, at his "yes": `A-Brain/automation/heredoc-gate.mjs` is a PreToolUse hook on Bash in
this repo's `.claude/settings.json`. It refuses a heredoc whose body has a backslash or is over 40
lines, and `node -e` / `python -c` holding a backtick or `${`. The way out is the Write tool, then
run the file. Do not work around it.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Still ship-blocking, and both are his call

* **Rank Config cross-tenant gap.** `artifacts/cello-inventory-manager/settings/{achievements,
  rpg_ranks}` is ONE document shared by every company. Rules coverage was fixed; the shared path was
  not. Safe for one customer, not two — between tobacco competitors that is a confidentiality breach,
  not a bug. **Pasal 10 ayat (3) of the contract draft promises per-customer separation, so this is a
  clause he cannot honestly sign twice until it is fixed.**
* **PBKDF2.** The SHA-256 master-password hash is unsalted and single-round. `crypto.subtle` already
  offers PBKDF2; a per-company salt and about 100k iterations turns a claim that invites inspection
  into one that survives it. Offered, never answered.

### Business track — CLOSED and PARKED, do not reopen

All prices in one place: `A-Brain/Wiki/Entities/KPM Price Sheet.md`. Rp 5 juta/bulan recommended at
25-30 users, **Aldi leans Rp 10 juta** as intent, floor Rp 2 juta, perpetual Rp 250 juta, copyright
**not for sale**, final PPh Rp 0. Legal research: `Brainstorm/2026-09-10_riset-hukum-menjual-kpm.md`.
Contract draft: `Brainstorm/2026-09-10_draft-13-pasal-kontrak-kpm.md`. His private brief:
<https://claude.ai/code/artifact/4fed138f-1639-4317-b41f-41bbf6613305>

### Rebuild sales totals — DONE, stop asking

Aldi pressed it 2026-09-09 and 2026-09-10. **Do not put this on a list again.**

### Day one — the rest of the walk, ranked

1. **New personnel default to `T3: HQ SALES MANAGER`** even when the role picker says Sales Motorist.
   Looked for on 2026-09-12 and NOT found in two greps: `LandlordDashboard.jsx:14` defaults to tier
   2, `FleetCanvasManager.jsx:150` `defaultAgentState` has `role: 'Motorist'` and no tier at all.
   Next place to look: how a `motorists` record acquires its tier — the sign-in "ghost profile"
   path in `App.jsx`, and `povPreview.js`. Reproduce it on screen before writing a brief for it.
2. **The GPS placeholder reads as a value** (`CustomerManager.jsx:1440`, `placeholder="-7.6043,
   110.2055"`, empty `value`), then Save fails with "This outlet has no map pin"
   (`CustomerManager.jsx:956`). The same form's first refusal is `SSOT Violation: You must specify
   the complete Matrix Location...` — jargon in front of a shop owner.

### Phone, at 375x812

* The only way to open the menu is a 14x66px sliver at the right edge (`.kpm-edge-ribbon`,
  `w-[14px] h-[132px]`, `top:-66px`, half of it above the viewport).
* The notification bell is off-screen, x 398 to 445 against a 375 viewport.

### Wording — cheap, each one read by a customer

`49 Bks left in the vehicle` while selling from Master Vault, `Surya 16 (Available: 100 )` with a
trailing space and no unit, the salesperson printed as `ADIKARYASUKSES99`, the EOD verify confirm
claiming "clears their inventory" on a stamps-only card, the EOD `MATCHES` column showing a dash when
the numbers are equal, the audit receipt printing `BAYAR : CASH` on an audit that collected Rp 0.

### Closed — do not reopen

**Money.** A cash refund does not reduce omzet. A completed sale is a closed contract; a retur is the
salesman's private arrangement. Buyback is off for everyone including the owner; Exchange stays.
`A-Brain/Wiki/Concepts/A sale is a closed contract — no cash goes back.md`. Not a bug.

**The sale-proof camera.** `284ea64` plus `1857b97`. T4 to T6 open a real `getUserMedia` view and
have no file input in the DOM in ANY build; T1 to T3 keep the picker. **Do not reintroduce a
build-mode escape hatch.** To let a tier attach a file, turn `photo_pick_from_gallery` ON in the
matrix, test, turn it off. Untouched on purpose: the GPS-bypass proof photo at
`MerchantSalesView.jsx:1839` and the NOO storefront photo at `:2914`.

**What "low" means.** Settled 2026-08-25, adopted everywhere 2026-09-12. Own MIN. ALERT (Bks) if
set, else the company default (qty + unit, default 3 Bal) converted per product. Blank means "use
the company default". `A-Brain/Wiki/Entities/What Counts As Low.md`.

### Appearance — deferred on purpose, last

About 180 blue and green Tailwind classes in app UI: `MapMissionControl.jsx` 58,
`FleetCanvasManager.jsx` 50, `JourneyView.jsx` 33, `ConsignmentFinanceView.jsx` 33. Receipt and
surat-jalan blues are legal.

### Still owed from earlier sessions

Round 7 Section D of `MANUAL_TEST_CHECKLIST.md` has never been run. C4 needs a second BANDUNG account.
`cdaabc7`, `967e447`, `83f5041` are unverified by eye. Bug 3, the geofence bypass routing, is still
unanswered — the GPS-bypass approvals were among the nine paths `da71cbd` re-routed, so re-check
before treating it as open.

</details>
