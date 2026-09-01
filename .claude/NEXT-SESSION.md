# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-09-01 08:55 WIB. 680/680 audit · 970/970 selfcheck. Branch `phase0-solid-ground`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers.** The audit refuses to run against a stale `dist/`.

## To LOOK at a screen without signing in

```
npx vite build --config tools/ponder-lab.config.mjs; python -m http.server 4187 -d dist-ponderlab
```

`?gudang` the regional warehouse desk (`&tier=AREA_ADMIN` for the HQ case) · `?places` the Master
Vault desk · `?nota` the surat jalan · `?scene=regional-warehouse&step=N` the new tutorial.
Add `&light`, `&lite`, `&probe`.

⚠️ **The frame lies, and it lied again today.** A tutorial highlight looked like it spanned the
whole tab row; measured, it was 1107→1237 against a tab at 1113→1231 — the wide box was the stage
container. **Drive it with `element.click()` and read `getBoundingClientRect()`.**

---

## THE ONE JOB — the Master Vault desk is mixed-language, and he has now ruled that it cannot be

His rule, 2026-09-01: *"if the restock vault is in english then this regional warehouse should be
in english as well if indo then indo"*. The regional warehouse desk directly below it **is English
now, on his instruction**. The Master Vault desk is neither — measured across
`src/RestockVaultView.jsx`:

| | Words |
|---|---|
| **English** | Batch No · Date · Extra Costs · Qty Received · Select Product · Metadata · Shipping (Rp) · Labor (Rp) · Tax (Rp) · Target Month · Adjust Batches · Update Document Proof |
| **Indonesian** | Barang · Jenis · Jumlah · Nama · Nota · Kirim · Hapus · Proses · Tanggal · Ongkos kirim · Pita cukai · Nilai barang · Siapkan · Kelengkapan |
| **Both at once** | "Nama Pengirim (Sender Name)" · "Nomor Resi / Tracking No" · "Surat Jalan / Delivery No" |

Two desks on one page, one in English and one in a mixture, is exactly what his rule exists to stop.

🔴 **BRING HIM THE NAMES, DO NOT RENAME ANYTHING.** Only Aldi names the categories in his own
trade — that law is why *Tempat* became **Data Induk** and why *Stock on Hand* became **Stock**.
Produce a table of every visible label with a proposed English name beside it, in one message, and
let him strike through what he does not like.

⚠️ **Three things are NOT up for renaming.** **Data Induk** — he chose it from four options on
2026-08-31. The **printed surat jalan** — it is a document for Indonesian drivers and warehouse
staff, and the palette law already stops at the print block for the same reason. And the
**branch-facing body copy** ("Hitung dulu, jangan lihat surat jalan") — his 2026-08-27 rule is
*"teaching just use indonesia, for terms for the features and components just use english"*, so
labels go English and instructions stay Indonesian.

**Pin it the way group 57 is pinned** — that group went red on all four of its first checks before
the edit, which is the only reason its green means anything.

---

<details>
<summary>Queued — do not start these</summary>

- **The two colour faults, still app-wide.** **90 uncoloured `placeholder=` in 18 files** (falling
  back to the browser's `rgb(156,163,175)`, which is slate — 1,36:1 on the light well) and **~107
  bare `text-orange` used as ink in 15** (1,08:1). Fix shipped once in
  `BranchWarehouseManager.jsx`: `placeholder:text-ink-dim placeholder:opacity-100
  placeholder:italic`, and `text-orange` → `text-accent-ink`. **`border-orange` and `bg-orange`
  stay — those are edges.** ⚠️ A blind regex is wrong: a `text-orange` on a scrim is correct.
- **G1 + G2, the money item.** `batchNo` captured at intake, never copied onto
  `branches/{loc}/inventory`; nothing enforces oldest-ships-first. **His standing call: this jumps
  the queue whenever he wants money before paint.**
- **Ponder caption static on phones, moving on PC.** DECIDED 2026-08-31, not built. Today
  `PonderOverlay.jsx` HIDES it: `if (boxW > W * 0.7) return null;`. The job is a third state.
- **The request card's status badge and button stack oddly at 375px** — pre-existing, `ml-auto`
  pushes the button to its own line. Not touched today.
- **Landed cost spreads shipping/labour/excise equally per UNIT** — a decision he has not been
  asked to confirm, not a bug.
- **G5** shrinkage · **G4** records joined by name not id · **Siapkan Pengiriman and the shipping
  modal, still untested by anyone.**
- **9router dies at login.** `start /min` throws the error away. A fix is drafted and **not
  applied** — it edits a file that runs at every login and he has not said yes.
- **The quota meter is FIXED, do not re-investigate.** Id `76c7cf4f-4c24-4984-aada-3aa91f53a148` in
  `C:/Users/ASUS/.claude/9router-claude-id.txt` — note the `.claude/`.

</details>

**No Firestore rules change is needed.** `places` falls through the `users/{bossUid}/{document=**}`
catch-all, and the new tier gate is app-side only. Nothing to deploy.

**Before you finish: rewrite this file with the next single job.**
