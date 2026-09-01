# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-09-01 16:20 WIB. 702/702 audit · 970/970 selfcheck. Branch `phase0-solid-ground`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers.** The audit refuses to run against a stale `dist/`.

## Reaching the app from his phone — settled, do not re-derive

PC holds **192.168.1.143** (cable) and **192.168.1.144** (Wi-Fi), reserved on the router by MAC and
registered in Firebase. `npm run dev` is **https only**: `https://192.168.1.144:5173`, tap through
the self-signed warning. **A change needs two reloads on the phone.** His test phone is an
**iPhone**, so camera barcode scanning is impossible there — the typed shipment number is that path.

Ponder lab: `npx vite build --config tools/ponder-lab.config.mjs; python -m http.server 4187 -d dist-ponderlab`,
then **`/tools/ponder-lab.html?places`** · `?gudang&tier=AREA_ADMIN` · `?book` · `?scene=…&step=N`.

⚠️ **`resize_window` before reading any rect** — the pane opens at a zero viewport and still returns
plausible numbers. `innerText` comes back UPPERCASED by the CSS on these desks.

---

## THE ONE JOB — ACCESS DENIED flashes at the boss for fifteen seconds

His report, signing in as Tier 1 on the iPhone: *"i was on access denied for around 15 second then
back to the normal login screen"*, and later, decisively: *"since i login earlier then its login
directly to the normal login menu bypassed the google automatically"*. **That second sentence is the
answer to the old question** — the screen after the lockout was the master-password vault gate, so
he WAS recognised. An earlier pass failed, a later one succeeded, and in between the app showed him
a red ACCESS DENIED.

**Where it happens.** `App.jsx` — the auth handler starts near `:2286`. Two routes reach the
lockout:

- `:2466` / `:2512` — the `else` branch, reached only when the directory lookups actually resolved
  and found nothing. **This one is correct and must not be softened.**
- `:2478` onwards — the `catch`. It handles the offline case honestly (`OFFLINE_UNVERIFIED`, its own
  screen with a Retry button), then falls through to `setUserRole('UNAUTHORIZED')` for **every other
  error**. A `permission-denied` on `system_admins/{uid}`, or a Firestore timeout on a slow phone,
  lands there and is rendered as *"is not registered in the KPM Employee Directory"*.

**The smallest fix** is to stop the catch treating an error as a refusal: an error means *I could
not check*, which the code already argues in its own comment three lines above for the offline case.
Route it to the same can't-verify screen (`App.jsx:4260`) and widen that screen's wording so it is
honest for both causes, not only for being offline.

⚠️ **THE TRAP.** `UNAUTHORIZED` is the app's hard stop for an email that genuinely is not an
employee. It must still appear, unchanged, when the lookups resolve to nothing — the `else` branch.
Do not turn a security gate into a timing race, and do not add a blanket "checking…" state that
delays it: `trueRole` starts at `'ADMIN'` (`App.jsx:244`), so anything gating on "not resolved yet"
changes what tier 2 sees on first paint.

⚠️ **PROVE THE CAUSE BEFORE PICKING THE FIX.** He is on Safari, where you cannot read a console
easily. `getDocOfflineSafe` (`App.jsx:189`) throws rather than returning a fake "does not exist", so
the two routes are genuinely distinguishable — but only from the error code. Consider logging the
caught `error.code` into the existing Flight Recorder so he can read it out in one message, which is
what that recorder was built for.

<details>
<summary>Queued — do not start these</summary>

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
