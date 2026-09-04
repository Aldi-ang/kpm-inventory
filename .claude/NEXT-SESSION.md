# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Wire the field terminal's tech SFX — but ONLY the takes Aldi approved, and only after he has said
which. The draft exists and he has heard it; this job is his verdict turned into code.

🔴 FIRST: ASK WHICH TAKE, OR READ HIS ANSWER. Do not guess and do not wire all three keys.
    node tools/sfx-draft.mjs        # regenerates tools/sfx-draft/ (gitignored, ~1s)
    preview_start "ponder-lab", then http://localhost:4190/tools/sfx-draft.html
  Seven drafts, committed as a generator at `tools/sfx-draft.mjs` (6dd879a):
    key-a  90ms  rail key, dry tick, the safe one
    key-b 110ms  rail key, with a small pitched blip
    key-c  95ms  rail key, softer, more switch than beep     <- pick exactly ONE of these three
    boot  760ms  the panel powering on (scan-in)
    down  480ms  the panel leaving (deploy shut)
    open  260ms  pressing Buka, to replace the paper ponder-open.mp3
    back  300ms  closing a lesson, to replace the paper book-close
  If he wants changes rather than a pick, edit the `SOUNDS` block in tools/sfx-draft.mjs and
  re-render — the synthesis kit above it (tone/noise/env/finish) is documented for exactly that.
  Do NOT hand-tune by ear you do not have; change the number he named and let him listen again.

WHERE EACH ONE GOES — five call sites, four files:
  1. RAIL KEY -> inside `go()` in `src/ponder/PonderPad.jsx` (~line 139), NOT on the button's
     onClick. The swipe on `.pp-stage` (onTouchStart/onTouchEnd) also routes through `go()`, and a
     swipe that changes section in silence is the same action behaving two ways.
     ⚠️ `go()` returns early on `i === cur` and on out-of-range. Put the sound AFTER those guards
     or pressing the key you are already on makes a noise for nothing.
  2. SCAN-IN -> the arrival in PonderPad. ARRIVE_BASE 932 * PACE 2.5 = 2330ms; `boot` is 760ms and
     deliberately leads the animation rather than filling it.
  3. DEPLOY SHUT -> `leave()` in PonderPad (~line 131). ⚠️ It has an `instant()` branch for Lite
     Mode and reduced motion that calls `onClose()` immediately. Lite Mode drops MOTION, not sound,
     and `playSound` already handles its own silencing — so the sound goes before the branch, not
     inside the animated half only.
  4. CLOSE X -> `onClick={leave}` (~line 217) already routes through `leave()`, so 3 covers it.
     Verify rather than adding a second call.
  5. THE BUG HE REPORTED BY EAR -> `src/ponder/PonderOverlay.jsx:373` calls `bookClose()` when a
     lesson exits. That fires on the phone too, so the tech panel's own flow ends on a paper
     sound: *"the ponder panel close, it sound like book close on the phone also"*. It must become
     the tech sound ON THE PHONE and stay `bookClose()` on the desk, where a book really is
     closing. PonderBook already computes `phone` from `PHONE_Q = '(max-width: 767px)'` — reuse
     that test, do not invent a second breakpoint.

HOW TO WIRE, and do not build a second sound system:
  Copy the chosen mp3s into `public/sounds/`, add them to `SOURCES` in `src/hooks/useSound.js`
  (name -> '/sounds/x.mp3') plus the per-name volume map below it, then export one arrow per sound
  from `src/ponder/sfx.js` in the same shape as `bookPick`/`bookOpen`/`bookPage`/`bookClose`.
  `playSound` already solves pooling, the browser unlock gesture and Lite Mode silence.
  Name them for the PANEL, not the book — e.g. padKey, padBoot, padDown, padOpen, padBack — or the
  next reader will assume they are paper.

DONE WHEN: five call sites fire; a swipe and a rail tap sound identical; closing a lesson on a
phone is tech and on a desk is still paper; 719/719 audit and 988/988 selfcheck, plus one new
check in the pad block of integration.audit.mjs pinning that the pad's sounds are its OWN names —
that the panel never plays click/tap/commit/vaultb/book-* is the whole regression this prevents.

VERIFY: sound cannot be screenshotted, so verify what CAN be. `read_network_requests` with
urlPattern "/sounds/" proves the right mp3 is fetched on the right event, and decoding it in the
page (fetch -> AudioContext.decodeAudioData -> duration/peak) proves the file is neither silent nor
clipping. That is proof of SHAPE; the listening test is Aldi's and only his.
⚠️ The Browser pane does NOT composite — rAF fires zero times in it — and `agent-browser` hangs the
full 1800s. Both are written up in `A-Brain/Wiki/Concepts/Looking at the App.md`. Screenshots,
read_page, getComputedStyle and document.getAnimations() all work.

Then rewrite .claude/NEXT-SESSION.md with the next single job — pull from the queue below.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### The queue is empty after the job above.

Every Ponder question from the 2026-09-02/03 rounds is closed: the riffle removal was confirmed on
screen, the terminal was locked to one palette in both themes (`f748410`), and the two-glyph split
was confirmed as Aldi's own call (`0eef44b` in A-Brain) — *"icon should be different because they
have different theme and color"*.

After the SFX job, the next one comes from `A-Brain/Backlog/` — the real to-do list — or from Aldi
directly. Do not invent one from a code smell.

### 7 Days to Die track — separate, not this repo

Its notes and its own one-job prompt are at `C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md`
and `NEXT-JOB.md`. Nothing there is owed to this repo.

</details>
