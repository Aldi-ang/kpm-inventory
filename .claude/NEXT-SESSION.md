# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Give the field terminal its own tech SFX. Aldi asked for it on 2026-09-04: "there is one thing
that needed to be added is actually a tech SFX when interacting with the tech ponder panel".

🔴 CHECK FIRST WHETHER THE FILES ARRIVED. This job is blocked on Aldi dropping mp3s into
`public/sounds/`. Run `ls public/sounds` and compare against the list below. If the new files are
not there, do NOT start — ask him for them and stop. Everything else about this job is already
decided; the files are the only missing input.

🔴 TWO THINGS ARE BANNED, AND BOTH ARE BANNED BECAUSE HE ALREADY REJECTED THEM ONCE. Read the
header comment of `src/ponder/sfx.js` before touching anything — it is a scar, not documentation.
  1. DO NOT SYNTHESISE A SOUND. Round 2 of the book's audio built paper out of filtered noise. It
     needed no files and it was correctly silent in Lite Mode, and he still killed it: "SFX sound
     really bad as well". The note's own conclusion: synthesis was the clever answer to the wrong
     question. No oscillators, no WebAudio noise, no "placeholder beep".
  2. DO NOT REUSE AN EXISTING SOUND. Round 1 re-pointed the app's own SFX and got "u re crazy
     using sales SFX for the book, use paper or book SFX la bro". Every file in public/sounds
     already carries a meaning: click = a toast appearing (Toast.jsx:67), tap = examining an item
     (MerchantSalesView.jsx:2383), commit = a transaction (MerchantSalesView.jsx:1537), vaultb =
     the vault gate (VaultGate.jsx:319), error = a failure, sign = signing, book-page/open/close =
     paper, ponder-open = pressing a tutorial entry. An ear taught that a rail key is a
     transaction is an ear taught wrong.

THE FOUR SILENT MOMENTS, in the order they matter — all in `src/ponder/PonderPad.jsx`:
  1. RAIL KEY (line ~279, `onClick={() => go(i)}`) — the seventeen keys down the right edge, and
     the most-pressed control on the panel. Also reached by the swipe on `.pp-stage`
     (`onTouchStart`/`onTouchEnd`), so hang the sound inside `go()`, NOT on the button's onClick,
     or a swipe changes section in silence and the same action has two different behaviours.
  2. ARRIVAL — the scan-in. `ARRIVE_BASE = 932` scaled by `PACE`; the panel powers on with a
     travelling scan bar and nothing to hear.
  3. EXIT — the deploy shut, `LEAVE_BASE = 380` scaled by `PACE`.
  4. CLOSE BUTTON (line ~217, `onClick={leave}`) — the X in the status bar. May share the exit
     sound; it triggers the same departure.
  Already has a sound and is NOT part of this job: the Buka entry buttons call `bookPick()`.
  Flag to Aldi whether a paper-ish `ponder-open.mp3` still belongs on a tech panel — his call,
  not a fix to make quietly.

WHAT THE FILES MUST BE, and tell him this rather than guessing: SHORT. The rail key is pressed
seventeen times in a row while reading, so anything over ~250ms stacks on itself and turns into a
smear. The book's clips were trimmed on the way in for exactly this reason — the originals ran
4,7s, 6,5s and 5,9s of mostly silence, and an untrimmed page turn started over a second after the
click that caused it, which reads as an unresponsive app. Trim each new file to its burst with a
~70ms fade before shipping it, and keep the untrimmed original.

HOW TO WIRE IT — the plumbing already exists, do not build a second one:
  `src/hooks/useSound.js` holds the `SOURCES` map (name -> '/sounds/x.mp3') and a per-name volume
  map below it. `playSound(name)` handles pooling, the browser's unlock gesture, and silence in
  Lite Mode. `src/ponder/sfx.js` is the thin layer that names them for the tutorial
  (`bookPick`, `bookOpen`, `bookPage`, `bookClose`). Add the pad's names there in the same shape —
  one exported arrow per sound — and import them in PonderPad.jsx. That is the whole change.

DONE WHEN: each of the four moments plays its own file; a swipe and a rail tap sound identical;
719/719 audit and 988/988 selfcheck, plus one new audit check in the pad block of
`integration.audit.mjs` asserting the pad's sounds are its OWN names and not any of the reused
ones above (that is the regression this job exists to prevent).

VERIFY: sound cannot be screenshotted, so verify what CAN be — that the call fires on the right
event and the file resolves. `read_network_requests` with urlPattern "/sounds/" shows the mp3
actually being fetched when you click. The pane does NOT composite (rAF is dead in it) and
`agent-browser` hangs 1800s — see `A-Brain/Wiki/Concepts/Looking at the App.md`. Then hand the
listening test to Aldi; an ear is his, not yours.
    preview_start "ponder-lab", then http://localhost:4190/tools/ponder-lab.html?book
    Below 767px is the phone, and the pad is phone-only.

Then rewrite .claude/NEXT-SESSION.md with the next single job — pull from the queue below.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### The queue is empty after the job above.

Every Ponder question opened in the 2026-09-02/03 rounds is now closed: the riffle removal was
confirmed on screen (2026-09-04), the terminal was locked to one palette in both themes
(`f748410`), and the two-glyph split was confirmed as Aldi's own decision (`0eef44b` in A-Brain) —
*"icon should be different because they have different theme and color"*.

After the SFX job, the next one has to come from `A-Brain/Backlog/` — the real to-do list — or from
Aldi directly. Do not invent one from a code smell.

### 7 Days to Die track — separate, not this repo

Its notes and its own one-job prompt are at `C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md`
and `NEXT-JOB.md`. Nothing there is owed to this repo.

</details>
