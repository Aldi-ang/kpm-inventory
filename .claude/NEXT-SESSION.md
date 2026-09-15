# The one job

**Finish Restock Vault on the phone, then move to the Sales Terminal.** He chose **A** (tabs
wrap) and **1** (one screen at a time, salesmen's screens first) on 2026-09-15 — *"A is good and
do 1"*. `096ac05` shipped the wrap. Four things remain on this screen; two need his answer, two
are rules. Then the sweep moves on: Sales Terminal → Customers → Agent Inventory → EOD Setoran →
Stock Opname → Journey Plan → Sampling → Agent Profile.

🔴 **His work rule — obey it before the first proposal:** *"give me ilustration or image or
anything to show me what is the recommended changes instead of telling me with your technical AI
sentence that i wont understand"*. A 🔴 DECIDE on a screen is ONE IMAGE: today and each option
rendered at 375, side by side, the recommended one marked, one plain sentence under each.

⚠️ **Before this job: read his two answers to `rv-findings.png` (asked 2026-09-15 08:00).**
🔴 *"cut the frame on the phone?"* (YES/NO, recommended yes) and ❓ the hint wording (A / B / C).
✅ TEST still owed from earlier: `2771374`, `d4bd41a`, `8ed215f`.

---

## Paste this to start the next session

> /alucard
>
> Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
>
> **If he has not answered `rv-findings.png` above this block, ask once, one line:** YES/NO on
> cutting the phone frame, and the letter for the hint wording (A = *"→ Siap. Pilih barang dari
> daftar, atau isi rutenya dulu."* one string, recommended; B = *"di atas"* on the phone and
> *"di kiri"* on the PC, two strings; C = his own words). If he answered, act on it.
>
> **The instrument:** `preview_start` ponder-lab → `http://localhost:4190/tools/ponder-lab.html?shell&places`
> (NOT the bare root — `/` serves the app's own index.html and dies on the firestore stub).
> `&tab=data,daftarkan%20pabrik` opens the Data Induk tab and its factory form. `&css=<rules>`
> renders a proposed change before it is written. `resize_window` 375×812 and read `innerWidth`
> in the same probe. For a PNG: a scratch HTML with one 375×812 `<iframe>` per option
> (`rv-findings.cjs` in the 2026-09-15 scratchpad writes it), rendered by headless Chrome
> `"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu
> --hide-scrollbars --window-size=1620,1040 --virtual-time-budget=15000 --screenshot=out.png
> file:///.../page.html`. Send with SendUserFile `display: render`. Never `npm run build` while
> the lab is up without the watcher ignore (it is in `tools/ponder-lab.config.mjs` now).
>
> **Measured 2026-09-15 at 375 inside the real shell (`?shell&places`):** desk 52..323 (271 wide);
> tabs on THREE rows (Masuk/Kirim · Request/Buku · Data Induk), each 42 px tall; hint `<p>` at
> `src/RestockVaultView.jsx:2187` is 238 wide holding 364 of text (`truncate sm:whitespace-normal`
> cuts it on the phone); NAMA input in the new-place form 41 px tall; registered names at `:1623`
> (`text-sm text-ink truncate`) in 157 px boxes; the orange `hint="Belum ada pabrik terdaftar…"`
> (`:1283`, `:1924`) paints over the ⇄ swap button under ASAL.
>
> 1. **If YES to the frame cut:** `src/components/BiohazardTheme.jsx:1059` `p-6` → `p-2 lg:p-6`;
>    `src/App.jsx:4804` the Restock Vault panel `border-4` → `border-2 lg:border-4` and `p-4` →
>    `p-2 lg:p-4`. Measured with `?css=`: desk 271 → 324, tabs back to TWO rows. ⚠️ TRAP: `:1059`
>    is the shell wrapper for EVERY screen — the cut widens all 16 on the phone, not just this one.
>    That is the point of the sweep, but say it to him in one line and re-measure `?shell` (the
>    top bar) at 375 after; the desk at 1280 must not move (title 25..787, strip 787..1255).
> 2. **Hint wording (his letter):** `:2189` string; and drop `truncate` from `:2187` so the line
>    wraps on the phone instead of ending in "…". One string if A.
> 3. **Rules, no question:** inputs `py-2.5` → `min-h-[44px]` in the Data Induk forms (`:1519`,
>    `:1524`, `:1562` are the buttons around them — measure, do not trust the line numbers); the
>    tab buttons at `:1484` `py-3` → add `min-h-[44px]`; `:1623` `truncate` → `break-words`; the
>    ASAL hint overlap — find who renders `hint=` (grep `hint &&` in the same file) and give it
>    `relative`/its own line instead of an absolute position. ⚠️ TRAP: `truncate` on the product
>    name in the wares list is a DIFFERENT element and was a data-entry hazard he already ruled on
>    (taste file 2026-08-17: wrap, never cut) — do not touch it here, it is already right.
> 4. **Guard:** extend section RESTOCK VAULT TABS WRAP ON THE PHONE (2026-09-15) in
>    `src/config/logicFixes.selfcheck.mjs` (it slices from the "ONE nav" comment to `{t.label}`),
>    red before each edit, green after. Then `npm run build; node src/config/integration.audit.mjs`
>    (722 now), `graphify update .`, commit, one proof PNG (phone 375 + PC 1280 side by side, the
>    pattern is `tabs-shipped.html` in the 2026-09-15 scratchpad).
>
> **Then the Sales Terminal.** No lab mount exists for it (`MerchantSalesView.jsx`); his frame at
> 375 is the instrument (F12 → Ctrl+Shift+M → 375) — ask him for it in one line, and put every
> finding in front of him as a picture before proposing anything.
>
> Rewrite this file with the next single job before closing.

---

## Shipped 2026-09-15 — `096ac05` (tabs wrap) · `c0ea921` lab (`?shell&places`, `?tab=`)

Restock Vault tab strip: `flex flex-wrap w-full lg:w-auto` on `RestockVaultView.jsx:1478`,
`flex-auto lg:flex-none` on each button. 375 in the bare lab: 3+2 rows, all five inside the edge.
1280: one line beside the title, unchanged. Guard 3 red → 1477/1477; audit 722/722. Proof
`tabs-shipped.png` sent. Then `rv-findings.png` (four frames inside the REAL shell) with the two
questions above. Lab gained `?shell&places` (the desk inside the real wrappers — 271 px, which is
why his phone shows three tab rows where the bare lab showed two) and `?tab=` (presses buttons in
order, one per microtask; timers and plain loops both lose the race in headless Chrome).

## Shipped 2026-09-14 — `2af2dd9` — CONFIRMED by Aldi

The bell is on the phone screen: `flex-wrap` on the top bar row (`BiohazardTheme.jsx:951`),
`ml-auto` on the control cluster (`:995`). Confirmed with his Chrome device-toolbar frames at 420
and 375. Owed from 2026-09-13: `2771374`, `d4bd41a`; from 2026-09-12: `8ed215f`.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Promoted and parked behind the sweep

* **The fleet form's tier picker paints T3 for a value that is not an option.**
  `src/FleetCanvasManager.jsx:149-153` `defaultAgentState.userRole: 'AGENT'`; `:843` the tier
  `<select>` is `value={newAgent.userRole || 'AGENT'}`; `src/config/permissions.js:2-9` has no
  `'AGENT'` id, so the browser paints the first option (`AREA_ADMIN`, "T3: HQ SALES MANAGER")
  while the state keeps `'AGENT'`, which `:72` normalises to T5 at read time. Form shows T3, saves
  a T5. ❓ for Aldi: which tier should a new Sales Motorist get by default — T5 (today, hidden) or
  T6 (what the label says)? Diff `ROLE_PERMISSIONS[FIELD_OPERATIVE]` vs `[ROOKIE]` before
  describing the change. Do NOT delete `:72` — old records rely on it. Edit paths `:374`, `:389`.

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

### Phone — the lab instruments that exist now

* `?shell` — the app shell (top bar, ribbon). `?places` — Restock Vault. `?gudang` — branch
  warehouse. `?nota`, `?label`, `?scan`, `?perf`, `?plan`, `?minkirim`, `?toast`.
* `?css=<rules>` on any mount — render a proposed change before writing it.
* `preview_start` ponder-lab → `resize_window` 375×812 → probe with `innerWidth` in the same call.
  Headless Chrome crops under ~518; use an iframe wrapper for a 375 PNG.

### Wording — cheap, each one read by a customer

The EOD verify confirm claiming "clears their inventory" on a stamps-only card, the EOD `MATCHES`
column showing a dash when the numbers are equal, the audit receipt printing `BAYAR : CASH` on an
audit that collected Rp 0.

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
