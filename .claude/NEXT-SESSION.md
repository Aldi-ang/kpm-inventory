# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-09-01 20:55 WIB. 705/705 audit · 977/977 selfcheck. Branch `phase0-solid-ground`.**

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

## THE ONE JOB — rebuild the tutorial book on the Framer interactive-book model

Aldi, 2026-09-01, after three failed passes at the phone close: *"the only way to do this is the
follow this one https://framer.com/m/InteractiveBook-xGXc.js@uLOYl8huI2w4XDdONaRK and i want u to
change the pc version with this one also, i want this 3D style and also i want the page to be drag
able to change the page left and right with smooth motion"*.

**This replaces the close-animation patching, which is closed.** Three attempts failed and they
shared one assumption: that a single-page phone layout could close with a page turn. It cannot —
there is no second half to close onto and no cover. Do not tune the old motion again.

**What he is asking for, in his order:** the Framer component's look and behaviour · the SAME thing
on the PC, not a phone-only variant · real 3D pages · **drag** to turn pages left and right, with
motion that does not stutter.

**READ THE COMPONENT FIRST.** It is a Framer code module at that URL. Fetch it and study how it does
the turn — the geometry, the hinge, how it maps drag distance to rotation, how it decides to settle
forward or snap back. Two things to settle before writing anything:

- ⚠️ **LICENCE.** It is someone else's component on Framer's marketplace. Follow the TECHNIQUE, do
  not paste the file into this repo, and do not import it from framer.com at runtime — this app is
  an offline PWA and cannot depend on a third-party host loading.
- ✅ **`framer-motion` IS APPROVED AND ALREADY INSTALLED** — his answer, 2026-09-01: *"yes u can add
  framer motion"*. It is `^13.1.1` in `package.json`, and the build plus both check suites were run
  after installing it, so the tree is clean before a single line of book code is written. **Nothing
  imports it yet.**
  ⚠️ **Lite Mode still has to win.** `liteOn()` and `reduced()` already skip the book's animation
  entirely, and that must stay true — he keeps Lite Mode for cheap Android phones, and a drag
  handler that ignores it puts the cost straight back. Wire the new motion behind the same two
  switches the old one used.

**What survives from the current book and must not be lost:** the ribbon column (17 sections, the
only way to change section on a phone) · two cards a page on a phone so nothing runs off the bottom
· opening on the section you are standing in · the fly-in and fly-back to the chip, which is the one
part of the close he has never complained about and described himself as *"close and shrink and go
to its perspective place"* · Lite Mode and reduced-motion still skipping the animation entirely.

⚠️ **A STILL FRAME CANNOT PROVE A MOTION, and this whole job is motion.** Three of today's passes
were reported wrong by him after passing every check here. Build it, then ask him to watch it before
claiming anything.

**Group 56 pins the book. Expect several of its checks to go red — they name the current geometry by
its exact expressions. Update them to the new mechanism; do not loosen them to fit.**

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
