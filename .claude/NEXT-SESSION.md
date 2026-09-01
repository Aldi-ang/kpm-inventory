# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-09-01 20:35 WIB. 705/705 audit · 977/977 selfcheck. Branch `phase0-solid-ground`.**

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

## THE ONE JOB — the tutorial only shows the tab, and everyone sees every tutorial

Two halves of one request, 2026-09-01. Do them together; they touch the same three files.

### Half one — the stage has nothing inside the tabs to point at

His words, from the phone: *"why the ponder for regional warehouse is too much telling and showing,
like that i see on the phone all the timeframe is only showing the highlights of the tab only and
not the features inside"*.

`src/ponder/stages/RegionalWarehouseStage.jsx` mounts the real nav strip and then a **one-line
string per tab** as the body. So a beat can name the scan button, the typed fallback or the blind
count, but the ring has nothing to land on except the word *Incoming*. The wording pass already
folded four of those beats into one; the rest needs the stage to actually render the controls.

**The pattern to follow is already in this repo:** `StockByWarehouseTable.jsx` is one component used
by BOTH the real screen and the tutorial, which is why that scene can point at a real column. Do the
same for the branch desk — extract the small pieces the scene names (the scan button, the typed
number box, the count panel, the locked address line, a stock card, a ledger row, the read-only
marker on Data Induk) so the tutorial and `BranchWarehouseManager.jsx` render the same markup.

⚠️ **Do NOT hand-build a replica in the stage.** The comment at the top of that file explains why,
and it is right: a second copy of the screen is a second thing to keep correct. Extract, don't copy.

### Half two — every tier sees every tutorial

His words: *"i think each tier only can access the ponder for the components that they can access
only, so regional admin only can see ponder for regional warehouse and not the whole restock vault
ponder"*.

`PonderBook.jsx:234` takes only `activeTab` and renders all of `SECTIONS`. The mechanism is already
here: every `id` in `sections.js` is an `activeTab` value, and the sidebar filters those same ids
with `hasClearance(userRole, feature)` (`BiohazardTheme.jsx`, the nav list around `:380`).

⚠️ **SECTION-LEVEL GATING IS THE WRONG SHAPE AND WILL LOOK RIGHT.** The Regional Warehouse entry
lives INSIDE the Restock Vault section, so hiding whole sections hides it from the exact people it
was written for. It needs a `feature` on the ENTRY as well, and the entries filtered too.

⚠️ **Read `ROLE_PERMISSIONS` in `src/config/permissions.js` before choosing the feature strings.**
Guessing which permission separates HQ from a branch admin risks hiding a tutorial from the people
who need it, and that failure is silent. Pass `userRole` down from `BiohazardTheme.jsx:1006`, and
give the ponder lab a role too or `?book` stops rendering.

**Pin both in group 56.**

- **The phone book close: the second moving edge is gone; the page turn itself is unjudged.** He
  reported *"there is no cover in the book bruv ... they found in the middle"*, and he was right on
  both counts — the cover clip was closing in from the right while the page turned away from the
  left, and a phone draws no cover to begin with (the leather there is the board behind the single
  page). The clip no longer animates below `lg`; measured holding at `inset(0px round 14px)` across
  a whole close. **What nobody has measured is how the page's own turn reads.** If he says it is
  still wrong, the remaining suspects are the `-90deg` end angle and the two shade planes fading on
  top of a `preserve-3d` layer. ⚠️ Ask him to watch it; a still frame cannot prove a motion.

<details>
<summary>Queued — do not start these</summary>

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
