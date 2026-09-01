# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-09-01 18:11 WIB. 702/702 audit · 977/977 selfcheck. Branch `phase0-solid-ground`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers.** The audit refuses to run against a stale `dist/`.

## Reaching the app from his phone — settled, do not re-derive

⚠️ **THE PC IS ON TWO DIFFERENT NETWORKS, and only one of them is the one that was set up.**
Ethernet: **192.168.1.143**, gateway 192.168.1.1 — reserved by MAC and registered in Firebase.
Wi-Fi: **192.168.100.155**, gateway **192.168.100.1** — a DIFFERENT router, no reservation, not in
Firebase. `192.168.1.144` no longer exists; it was the Wi-Fi address before the adapter joined the
other network, and a phone pointed at it gets a white screen. **Read `ipconfig` before quoting an
address; the reservation covers one router only.** `npm run dev` is **https only** —
`https://192.168.1.143:5173`, tap through the self-signed warning. **A change needs two reloads on the phone.** His test phone is an
**iPhone**, so camera barcode scanning is impossible there — the typed shipment number is that path.

Ponder lab: `npx vite build --config tools/ponder-lab.config.mjs; python -m http.server 4187 -d dist-ponderlab`,
then **`/tools/ponder-lab.html?places`** · `?gudang&tier=AREA_ADMIN` · `?book` · `?scene=…&step=N`.

⚠️ **`resize_window` before reading any rect** — the pane opens at a zero viewport and still returns
plausible numbers. `innerText` comes back UPPERCASED by the CSS on these desks.

---

## THE ONE JOB — ten copies of the unit conversion, and two of them are wrong

His rule, stated twice: *"we should have 1 data to be used many times on the other components"*.
The intake desk obeys it now. Almost nothing else does.

`convertToBks(qty, unit, product)` at **`src/utils/helpers.js`** is the one function. It reads
`packsPerSlop`, `slopsPerBal` and `balsPerCarton` off the product, 10/20/4 as fallbacks. These
re-implement it inline: `App.jsx` `1947` `3198` `3342` `3411` `3746` `3761` ·
`MerchantSalesView.jsx` `114` `626` `752` · `AgentProfileView.jsx` `488` `565` ·
`EODReconciliationView.jsx` `222`.

**Two are producing wrong numbers today, and those are the job:**

- **`AgentInventoryView.jsx:81` — `if (unit === 'Slop') mult = 10;`** No product lookup at all.
  Every product that is not ten packs to a slop is counted wrong there, silently.
- **`MerchantSalesView.jsx:1238` and `:1256` — `qtyInBks *= 800`** for a karton, hardcoded. 800 is
  the 4 × 20 × 10 default; the two lab products are 400 and 600.

Do those two first — they are wrong, the rest are merely repetitive.

⚠️ **THE TRAP.** The inline copies are not identical and a blind replace changes working
behaviour. `MerchantSalesView.jsx:752` sits inside `updateCartItem`, where the multiplier feeds
`calculatedPrice` and the retur/exchange path deliberately forces that to 0. `App.jsx:3342` and
`:3411` compute a multiplier against the OLD product data and the NEW one either side of an edit;
collapsing them into one call destroys a deliberate before/after pair. Read each site's function
before touching it.

⚠️ **`convertToBks` returns `qty` untouched when the product is missing**, which silently prices
a karton as one bks. Every call must pass `product || {}` so the fallback applies.

**Pin it in group 59**, which already asserts the intake desk reads its rates from the one converter.

<details>
<summary>Queued — do not start these</summary>

- 🔴 **IF HE HAS SAID YES TO THE FOLLOW-CAMERA, THAT JUMPS AHEAD OF THE JOB ABOVE.** Asked whether
  Ponder should get a separate phone build or a camera that scrolls the stage to the highlighted box,
  the recommendation given was the camera, and the reasons are the ones to hold to: a second tutorial
  is a second thing to keep in step with every screen change, the desk needs it too, and the
  highlight's rect is ALREADY measured every beat in `PonderOverlay.jsx` (`spot`, and `measure()`
  above it), so following it is a `scrollIntoView`-shaped change on `scrollRef`, not a new component.
  ⚠️ **The trap:** `scrollRef` is the `absolute inset-0 overflow-auto` div that holds the stage, and
  the highlight is a SIBLING of it at `z-20` positioned in stage coordinates. Scroll the container and
  the ring must be re-measured, or it will sit where the subject used to be — the same 6%-out bug the
  comments at `measure()` already record. Scroll first, measure after, never the other way round.

- **The book's closing animation on a phone.** `flightFrom` in `PonderBook.jsx` measures the closed
  book as `b.width / 2 + 62` — the desk geometry. A phone renders no left half, so it aims at a
  rectangle that is not on screen. Plausible mechanism for his *"closed animation also broken in the
  phone"*, not yet proven; a still frame cannot prove an animation, so plan how to capture it first.
- **Ten copies of the unit conversion**, and two are wrong today: `AgentInventoryView.jsx:81`
  hardcodes `mult = 10` with no product lookup, `MerchantSalesView.jsx:1238`/`:1256` hardcode
  `*= 800`. The one converter is `helpers.js:195`. ⚠️ The inline copies are not identical — one
  feeds a price the retur path deliberately zeroes, two compute old-vs-new multipliers either side
  of an edit. Read each site's function before touching it.
- **G1 + G2, the money item.** `batchNo` at `RestockVaultView.jsx:1944`, meter at `:455`, written at
  `:656`, dies at the HQ door because `branches/{loc}/inventory/{productId}` holds one `stock`
  number. 🔴 **Ask him the staleness threshold in days first.**
- 🔴 **The label print-and-scan test is still not done.** Not possible on the iPhone.
- **An arrived box that is never counted has no alert.**
- **The two colour faults, app-wide.** 90 uncoloured `placeholder=` in 18 files, ~107 bare
  `text-orange` used as ink in 15. **`border-orange` and `bg-orange` stay — those are edges.**
- **Ponder caption static on phones, moving on PC.** DECIDED 2026-08-31, not built.
- **G5** shrinkage · **G4** records joined by name not id · **Siapkan Pengiriman, untested.**
- **The quota meter is FIXED, do not re-investigate.** Id `76c7cf4f-4c24-4984-aada-3aa91f53a148` in
  `C:/Users/ASUS/.claude/9router-claude-id.txt` — note the `.claude/`.

</details>

**Before you finish: rewrite this file with the next single job.**

---

**Checked 2026-09-01 18:07 WIB — brief unchanged, still the job above.** The modified
`src/ponder/stages/StockByWarehouseTable.jsx` in the working tree belongs to the KPM session
running in parallel, not to this note. A 7DTD modding session was also open on this repo and
touched no project files.
