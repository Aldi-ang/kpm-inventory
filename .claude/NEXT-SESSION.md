# The one job

**The phone sweep, screen 2: the Sales Terminal at 375 px.** Restock Vault is done
(`096ac05` tabs wrap, `289161a` bigger panel + hints gone + 44 px sizes) and awaits his ✅ TEST on
the phone. Order he chose (*"A is good and do 1"*, 2026-09-15): Sales Terminal → Customers →
Agent Inventory → EOD Setoran → Stock Opname → Journey Plan → Sampling → Agent Profile, then the
other eight.

🔴 **His two work rules, both from this sweep:** a decision comes as ONE IMAGE (*"give me
ilustration or image … instead of telling me with your technical AI sentence"*), and explanatory
hints are not wanted (*"since we have the ponder tools we dont need any hints panel"*) — a REPORT
(what is missing, what just happened) stays; a paragraph that explains how the screen works goes.

⚠️ **Before this job:** read his ✅ TEST of `289161a` on his phone (Restock Vault: two tab rows,
wider desk, no hint under the form, no intro paragraph on Data Induk). Still owed from earlier:
`2771374`, `d4bd41a`, `8ed215f`.

---

## Paste this to start the next session

> /alucard
>
> Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
>
> **The Sales Terminal on a 375 phone.** `src/MerchantSalesView.jsx` — no lab mount exists for
> it (it needs a signed-in salesman, a customer list and live stock). Two instruments, in this
> order:
> 1. **His frame.** Ask in one line for a screenshot of the Sales Terminal at 375 (F12 →
>    Ctrl+Shift+M → 375, or his phone). If he already sent one above this block, read it first.
> 2. **The lab, if a mount is cheap.** `tools/ponder-lab.jsx` — `?shell&places` (line ~485) is the
>    pattern: the real `BiohazardTheme` shell, then App.jsx's wrapper classes copied VERBATIM
>    (pinned by a check — a stale copy measured 303 px instead of 323 today), then the real
>    component with fixtures and `db={null} user={null}`. Before building one, check whether
>    `MerchantSalesView` bails without `db`: grep its `onSnapshot`/`useEffect` guards. If a mount
>    needs more than ~30 lines of fixtures, do not build it — his frame is the instrument.
>
> **What to look for, from the two screens already swept:** anything `flex` with no wrap holding
> more than the phone is wide (the Restock Vault strip was 436 px in 271); `absolute`/`fixed`
> elements under stacked fields (painted over the next control); `truncate` on names (he ruled:
> wrap, never cut — 2026-08-17); `py-2.5` inputs and `py-3` buttons under 44 px; direction words
> ("di kiri", "di kanan") that lie on a phone; explanatory hint paragraphs (delete, per his rule
> above; keep reports). Measure with `getBoundingClientRect` + `innerWidth` in the same probe.
>
> **What the terminal already decided for the phone — read before proposing anything:** the
> customer bar above the drag handle is fixed on purpose and must stay ONE line (`237bf6f`, his
> condition); the field terminal is the phone's tutorial shell; T4–T6 open a real camera, no
> file input (`284ea64`, `1857b97` — do not touch). `MANUAL_TEST_CHECKLIST.md` and
> `SALES_TERMINAL_TEST_LIST.md` at repo root list what is already pinned.
>
> **Deliver as one picture:** today + each option at 375, side by side, recommended one marked,
> one plain sentence each (`rv-findings.cjs` in the 2026-09-15 scratchpad is the generator; headless
> Chrome `--window-size=1620,1040 --virtual-time-budget=15000 --screenshot`; a third iframe of 1100
> px stayed black — render the PC frame on its own). SendUserFile `display: render`. Rules-only
> fixes (44 px, wrap, direction words) ship without a question, with the same self-check shape as
> section RESTOCK VAULT ON THE PHONE in `src/config/logicFixes.selfcheck.mjs`: red before, green
> after, then `npm run build; node src/config/integration.audit.mjs` (722), `graphify update .`.
>
> ⚠️ TRAP: `BiohazardTheme.jsx:1059` is now `p-2 lg:p-6` — every screen already gained 32 px on
> the phone. Measure the terminal AFTER that, not from an old frame.
>
> Rewrite this file with the next single job before closing.

---

## Shipped 2026-09-15 — Restock Vault on the phone, complete

`096ac05` tabs wrap (his A). `289161a`: shell `p-6` → `p-2 lg:p-6` (EVERY screen), the Restock
Vault panel `border-2 lg:border-4 p-2 lg:p-4`, desk 271 → 323 px, tabs two rows at 44 px; the
empty-cart hint and the Data Induk intro paragraph deleted (his rule); the completeness report
kept at ONE line on the phone (audit G60 caught a draft that let it wrap — the footer is pinned);
NAMA input 44 px; registered names wrap; the ASAL field hint `static lg:absolute` (it painted over
the ⇄ button); "di kiri" → "di daftar barang" in the empty table. Guard 1492/1492, audit 722/722.
Lab `c0ea921`: `?shell&places` (the desk inside the real wrappers), `?tab=` (presses buttons in
order, one per microtask), watcher ignores `dist/`. Proof: `tabs-shipped.png`, `rv-shipped.png`,
`rv-pc.png`. ✅ TEST owed on his phone.

## Shipped 2026-09-14 — `2af2dd9` — CONFIRMED by Aldi

The bell is on the phone screen: `flex-wrap` on the top bar row (`BiohazardTheme.jsx:951`),
`ml-auto` on the control cluster (`:995`). Owed from 2026-09-13: `2771374`, `d4bd41a`; from
2026-09-12: `8ed215f`.

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
