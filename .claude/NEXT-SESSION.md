# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-09-02 16:23 WIB. 714/714 audit · 1000/1000 selfcheck. Branch `phase0-solid-ground`.**

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

## ⚠️ THE BOOK IS THE LIVE FRONT — and one named fault is still open

Four passes: `9a9cb62` (rebuilt as a stack of sheets), `c0ce49f` (fast swipe, riffling ribbons),
`bedf40b` (the close as a real fold), `0bab85f` (the X button's second cause, and a closed arrival).
**He has not judged the fourth.**

🔴 **STILL OPEN, and it is the next job unless he says otherwise: the PHONE's closed pose.**
On a phone the cover shuts to `-90` — edge-on, therefore invisible — so a closed book there shows
the bare leather board instead of the cover's face with its icon and TUTORIAL. The DESK arrival is
correct and verified (leather, gold spine, ribbons, no spread). Not a one-line change: the cover
hinges at the spine, and on a phone the spine is the stage's LEFT edge, so any rotation toward -180
swings it a whole page-width off the book — which was the original phone-close fault. Hinging that
one element at its RIGHT edge is the likely shape, because -180 about that edge maps it back onto
itself. `A-Brain/Wiki/Concepts/The Book as a Stack of Sheets.md` has the full reasoning.

Read that vault page BEFORE touching the book. It holds the technique, the arithmetic, and every
fault already found and fixed. Re-deriving any of it costs a session. `framer-motion@^13.1.1` is
installed and still unused.

⚠️ **Six traps this file has already charged for.**
1. `new Map()` here resolves to the lucide Map ICON, not the constructor.
2. A parent's `translateZ` is applied AFTER the child's rotation — put a folding element's depth on
   the element that rotates.
3. `getBoundingClientRect()` returns PAINTED geometry. Measuring a book that is mid-flight read
   17×36 instead of 351×731 and produced a departure that went nowhere. Finish an element's own
   animations before measuring it.
4. A "still broken" report after a fix is not evidence the fix was wrong — reproduce from scratch.
   Two causes with one symptom happened here, and reverting the first fix would have lost both.
5. The Browser pane does not paint between tool calls: `requestAnimationFrame` never fires (45s
   timeout) and animations sit at `currentTime: 0`. To inspect a motion, freeze it — `setTimeout(30)`
   then `getAnimations().forEach(a => { a.pause(); a.currentTime = N })`.
6. A literal duplicating a named constant is a silent override — a hardcoded 90ms floor beat the
   named 60 and every check still passed, because the checks read the name.

⚠️ **He tests on a PWA.** A change needs a hard reload twice on the phone or the service worker
serves the old bundle — worth saying to him before he reports something unfixed.

If he says nothing about the book, do the job below.

---

## THE ONE JOB — the Ponder caption stops moving on phones, and keeps moving on PC

**He decided this on 2026-08-31 and it was never built.** Recorded in his own terms: *the ponder
caption becomes static on phones and keeps moving on PC, built with `/emil design`*.

**What the caption is:** the teaching sentence that appears during a tutorial scene in
`src/ponder/PonderOverlay.jsx`. It has two placements. Beside its subject — a small box that moves
to sit next to whatever the beat is highlighting, with a pointer that aims four ways. Or the **wide
bottom bar**, a fixed strip across the bottom of the stage.

**What already happens, and what you must measure before changing anything.** The near-caption
already refuses a stage too narrow to stand beside anything: `if (boxW > W * 0.x) return null;` in
`PonderOverlay.jsx`, which is why on a 375px phone most beats already fall through to the bottom
bar. **So the phone may already be most of the way there.** Measure first, at 375x812, across a
whole scene: which beats still place a moving caption, and does the bar itself re-animate on every
beat. Do not rewrite a placement that is already correct — the job is what MOVES on a phone, not
where the box sits.

**Why he wants it:** a caption that jumps position on every beat, on a screen that small, makes the
reader hunt for the sentence instead of reading it. On a desk there is room for the box to point at
its subject, and there the movement is the whole value.

**The traps.**
- ⚠️ **The caption is placed in `top`, never in a transform** — audit group 56 asserts this, because
  an animation on the element overwrites a transform on its first frame and the caption disappears.
  Whatever "static" turns into, it must not become a transform.
- ⚠️ **A still frame cannot prove a motion.** Build it, then get eyes on a whole scene at 375px in
  the lab, pumping frames as described above.
- ⚠️ Group 56 checks the placement logic by name. Several will need updating rather than loosening.
- A fix is not finished until it leaves a line in `src/config/logicFixes.selfcheck.mjs`: one
  regression guard and one behaviour check.

<details>
<summary>Queued — do not start these</summary>

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

**Re-checked 2026-09-02 12:05 WIB — brief unchanged.** The modified `src/ponder/PonderBook.jsx`
and `src/ponder/pageModel.js` are the parallel KPM session's in-flight work, not this note's. A
7DTD modding session also ran on this repo and touched no project file.

**Re-checked 2026-09-02 15:48 WIB — brief unchanged.** The modified files in the working tree
belong to the parallel KPM session. The 7DTD modding session keeps its own notes at
`C:\Users\ASUS\AppData\RoamingDaysToDie\MODS-NOTES.md` and touches no project file.

**Re-checked 2026-09-02 15:48 WIB — brief unchanged.** The modified files in the working tree
belong to the parallel KPM session. The 7DTD modding session keeps its own notes at
`%APPDATA%\7DaysToDie\MODS-NOTES.md` and touches no project file.

**Re-checked 2026-09-02 15:54 WIB — brief unchanged.** Working-tree edits belong to the parallel
KPM session. The 7DTD session logs to `%APPDATA%\7DaysToDie\MODS-NOTES.md`.
