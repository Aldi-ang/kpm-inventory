# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-09-02 17:40 WIB. 714/714 audit · 1000/1000 selfcheck. Branch `phase0-solid-ground`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers.** The audit refuses to run against a stale `dist/`.

## Reaching the app from his phone — settled, do not re-derive

⚠️ **THE PC IS ON TWO DIFFERENT NETWORKS, and only one of them is the one that was set up.**
Ethernet: **192.168.1.143**, gateway 192.168.1.1 — reserved by MAC and registered in Firebase.
Wi-Fi: **192.168.100.155**, gateway **192.168.100.1** — a DIFFERENT router, no reservation, not in
Firebase. `192.168.1.144` no longer exists; a phone pointed at it gets a white screen. **Read
`ipconfig` before quoting an address; the reservation covers one router only.** `npm run dev` is
**https only** — `https://192.168.1.143:5173`, tap through the self-signed warning. **A change needs
two reloads on the phone.** His test phone is an **iPhone**, so camera barcode scanning is
impossible there — the typed shipment number is that path.

Ponder lab (serve on **localhost only**, a 0.0.0.0 bind is refused):
`npx vite build --config tools/ponder-lab.config.mjs; python -m http.server 4187 --bind 127.0.0.1 -d dist-ponderlab`,
then **`/tools/ponder-lab.html?book`** · `?book&lite` · `?places` · `?gudang&tier=AREA_ADMIN` ·
`?scene=…&step=N`.

⚠️ **`resize_window` before reading any rect** — the pane opens at a zero viewport and still returns
plausible numbers. ⚠️ **The pane's animation clock only advances when it PAINTS**: an animation sits
at `currentTime: 0` forever between calls, so take repeated screenshots to pump frames, or the turn
looks broken when it is fine.

---

## 🔴 THE ONE JOB — draft the TECH PAD, then build it with the PC riffle removal

**First: ask him the one question he has not answered** (it is in the note below, and it decides the
whole look). Then make the round-3 artifact. **Still no KPM code until he approves a draft** —
*"make me some draft first so that i can choose rather that build and keep changing it"*.

**Read first, it saves re-deriving three rounds:**
`A-Brain/Brainstorm/2026-09-02_phone-tutorial-shell.md`.
Live drafts: manual <https://claude.ai/code/artifact/2cc96364-ff22-4221-b93c-05a7c1cb2bb3> ·
four shells <https://claude.ai/code/artifact/2a41b123-dac8-4c56-89d0-8f4bcd846026>

### Where the design actually stands

🔴 **DECIDED — the hanging ribbon is GONE.** The page block already is the progress meter; the
ribbon was a second meter for the same fact, and it was the one that lied.

🔴 **DECIDED — the fore-edge thumb index STAYS.** *"this small book model with little section on
the right will work well ... basically change the size and model of the section will work"*. Three
rounds in, the only navigation idea he has praised on sight. On a pad it becomes correct rather than
a compromise: a channel of section keys down the right edge, inside thumb reach.

🔴 **DIRECTION — a tech pad, not a book.** Not because futuristic looks cool: **a book is a
physical metaphor and metaphors carry obligations** — cover, spine, two halves, a closing motion —
and every one of those has cost a phone bug because 375px cannot afford them. A pad owes none of it,
and a field terminal suits a warehouse app better than a leather manual.

**Carry forward from the manual:** tilt-reactive light (the one thing a desk monitor cannot do) ·
the fore-edge index · progress as an edge meter, not a widget · a real 3D transition — a pad can
slide panels in depth without owing anyone a hinge.
**Drop:** the ribbon · the cover · the spine · the fold.

### ⚠️ ASK HIM THIS BEFORE DRAWING ANYTHING

**"Futuristic" normally arrives as glow, scanlines and CYAN — and cyan is blue, which the palette law
forbids.** The pad has to be futuristic in **form** (depth, precision, mechanism, exact alignment)
and never in **colour**: slate, gold, amber. Field instrument, not sci-fi prop. **He was asked
directly at 17:40 and had not answered when the session ended.** Do not guess it — the answer
changes the entire look, and this is round three.

### 🔴 Ships in the SAME pass, already decided: take the riffle out of the PC

A ribbon jumps straight to its chapter instead of turning N pages. Remove `riffle()`, `RIFFLE_*` and
the plan from `src/ponder/pageModel.js`; in `PonderBook.jsx`, `seek()` stops setting a rate and the
step effect goes. **The page turn, the 3D fold and the drag are untouched.** Group 56's
uncapped-riffle check and the nine riffle assertions in `logicFixes.selfcheck.mjs` come out with it —
delete them, do not loosen them.

⚠️ **Six traps this file has already charged for.**
1. `new Map()` here resolves to the lucide Map ICON, not the constructor.
2. A parent's `translateZ` is applied AFTER the child's rotation — put a folding element's depth on
   the element that rotates.
3. `getBoundingClientRect()` returns PAINTED geometry. A book measured mid-flight read 17×36 instead
   of 351×731 and produced a departure that went nowhere. Finish an element's own animations first.
4. A "still broken" report after a fix is not evidence the fix was wrong — reproduce from scratch.
   Two causes with one symptom happened here; reverting the first fix would have lost both.
5. The Browser pane does not paint between tool calls: `requestAnimationFrame` never fires (45s
   timeout) and animations sit at `currentTime: 0`. Freeze a motion instead — `setTimeout(30)` then
   `getAnimations().forEach(a => { a.pause(); a.currentTime = N })`.
6. A literal duplicating a named constant is a silent override — a hardcoded 90ms floor beat the
   named 60 and every check still passed, because the checks read the name.

⚠️ **He tests on a PWA.** A change needs a hard reload twice on the phone or the service worker
serves the old bundle — say so before he reports something unfixed.

<details>
<summary>Queued — do not start these</summary>

- **The Ponder caption static on phones, moving on PC.** Decided 2026-08-31, never built. Measure at
  375x812 first: the near-caption already bails to the bottom bar (`if (boxW > W * 0.x) return null;`
  in `PonderOverlay.jsx`), so the phone may be most of the way there. The caption is placed in `top`,
  never a transform — group 56 asserts it.
- **G1 + G2, the money item.** `batchNo` at `RestockVaultView.jsx:1944`, meter at `:455`, written at
  `:656`, dies at the HQ door because `branches/{loc}/inventory/{productId}` holds one `stock`
  number. 🔴 **Ask him the staleness threshold in days first.**
- 🔴 **The label print-and-scan test is still not done.** Not possible on the iPhone.
- **An arrived box that is never counted has no alert.**
- **The two colour faults, app-wide.** 90 uncoloured `placeholder=` in 18 files, ~107 bare
  `text-orange` used as ink in 15. **`border-orange` and `bg-orange` stay — those are edges.**
- **G5** shrinkage · **G4** records joined by name not id · **Siapkan Pengiriman, untested.**
- **The quota meter is FIXED, do not re-investigate.** Id `76c7cf4f-4c24-4984-aada-3aa91f53a148` in
  `C:/Users/ASUS/.claude/9router-claude-id.txt` — note the `.claude/`.

</details>

**Before you finish: rewrite this file with the next single job.**
