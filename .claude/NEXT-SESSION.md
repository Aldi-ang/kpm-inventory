# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-09-01 15:40 WIB. 697/697 audit · 970/970 selfcheck. Branch `phase0-solid-ground`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers.** The audit refuses to run against a stale `dist/`.

## Reaching the app from his phone — settled, do not re-derive

PC holds **192.168.1.143** (cable) and **192.168.1.144** (Wi-Fi), reserved on the router by MAC and
registered in Firebase. `npm run dev` is **https only**: `https://192.168.1.144:5173`, tap through
the self-signed warning. **A change needs two reloads on the phone** — the dev server installs a
service worker on purpose. His test phone is an **iPhone**, so camera barcode scanning is impossible
there; the typed shipment number is the iPhone path.

Ponder lab: `npx vite build --config tools/ponder-lab.config.mjs; python -m http.server 4187 -d dist-ponderlab`,
then **`/tools/ponder-lab.html?places`** (Master Vault desk) or `?gudang&tier=AREA_ADMIN`. The server
root is a directory listing, not the app.

⚠️ **Call `resize_window` before reading any rect** — the pane opens at a zero viewport and still
returns plausible numbers. And `innerText` comes back UPPERCASED by the CSS on these desks.

---

## THE ONE JOB — ten copies of the same conversion, and one of them is wrong

His rule, stated twice now, most recently 2026-09-01: *"we should have 1 data to be used many times
on the other components"*. The intake desk now obeys it. Almost nothing else does.

`convertToBks(qty, unit, product)` at **`src/utils/helpers.js:195`** is the one function. It reads
`packsPerSlop`, `slopsPerBal` and `balsPerCarton` off the product, with 10/20/4 as fallbacks. These
places re-implement it inline instead of calling it:

| file | lines |
|---|---|
| `src/App.jsx` | `1947`, `3198`, `3342`, `3411`, `3746`, `3761` |
| `src/MerchantSalesView.jsx` | `114`, `626`, `752` |
| `src/AgentProfileView.jsx` | `488`, `565` |
| `src/EODReconciliationView.jsx` | `222` |

**Two of them are already producing wrong numbers, and those are the job:**

- **`src/AgentInventoryView.jsx:81` — `if (unit === 'Slop') mult = 10;`** No product lookup at all.
  Every product that is not ten packs to a slop is counted wrong on that screen, silently.
- **`src/MerchantSalesView.jsx:1238` and `:1256` — `qtyInBks *= 800`** for Karton, hardcoded. 800 is
  the default 4 × 20 × 10; the two lab products are 400 and 600. Same silent miscount.

The fix is `convertToBks(qty, item.unit, product)` in each place, and the smallest useful version is
those two files first — they are wrong, the rest are merely duplicated.

⚠️ **THE TRAP.** The inline copies are not all identical, and replacing them blind will change
behaviour that is currently correct. `MerchantSalesView.jsx:752` sits inside `updateCartItem`, where
the multiplier feeds `calculatedPrice`, and the retur/exchange path deliberately forces that price
to 0. `App.jsx:3342` and `:3411` compute a multiplier against the OLD product data and the NEW one
on either side of an edit, and swapping them for one call would collapse a deliberate before/after
pair. **Read each site's surrounding function before touching it, and convert the sites that are
plainly wrong before the ones that are merely repetitive.**

⚠️ **`convertToBks` returns `qty` untouched when the product is missing**, which silently prices a
Karton as one Bks. Every call must pass `product || {}` so the 10/20/4 fallback applies instead.

**Pin it in group 59**, which already asserts the intake desk reads its rates from the one converter.

<details>
<summary>Queued — do not start these</summary>

- 🔴 **If he has answered the two questions in `PROGRESS.md` about the 15-second Access Denied on his
  phone, that jumps ahead of the job above.** The answer decides between a dropped session and a
  wrong screen shown while the tier check was still running. The full write-up is in the commit
  message of `a0da5ce` and in `PROGRESS.md`.
- **G1 + G2, the money item.** `batchNo` captured at `RestockVaultView.jsx:1944`, required by the
  meter at `:455`, written at `:656` — and dies at the HQ door, because
  `branches/{loc}/inventory/{productId}` holds one `stock` number. 🔴 **Ask him the staleness
  threshold in days first; do not invent one.**
- 🔴 **The label print-and-scan test is still not done.** His words: *"i havent do the test btw"*.
  Not possible on the iPhone.
- **An arrived box that is never counted has no alert.** Needs a threshold in days too.
- **The two colour faults, app-wide.** **90 uncoloured `placeholder=` in 18 files** and **~107 bare
  `text-orange` used as ink in 15**. Fixed pattern: `placeholder:text-ink-dim
  placeholder:opacity-100 placeholder:italic`, `text-orange` → `text-accent-ink`. **`border-orange`
  and `bg-orange` stay — those are edges.** ⚠️ A blind regex is wrong.
- **Ponder caption static on phones, moving on PC.** DECIDED 2026-08-31, not built.
- **The request card's status badge and button stack oddly at 375px** — pre-existing.
- **G5** shrinkage · **G4** records joined by name not id · **Siapkan Pengiriman and the shipping
  modal, still untested by anyone.**
- **The quota meter is FIXED, do not re-investigate.** Id `76c7cf4f-4c24-4984-aada-3aa91f53a148` in
  `C:/Users/ASUS/.claude/9router-claude-id.txt` — note the `.claude/`.

</details>

**Before you finish: rewrite this file with the next single job.**
