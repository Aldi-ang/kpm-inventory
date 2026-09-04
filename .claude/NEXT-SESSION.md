# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Wire the field terminal's SFX. The sounds are settled material now, not a design question — the
rail key is Aldi's own recording and the opening is built from it. This job is his pick turned
into code.

🔴 READ HIS ANSWER FIRST, DO NOT GUESS. Two things are outstanding:
   (1) rail key: `key` (181ms, the press AND its release) or `key-short` (91ms, press only)
   (2) opening:  `boot-a` (421ms, plain) or `boot-b` (421ms, plus a soft latch tick)
   He reviews them here — audio is embedded, no server needed:
   https://claude.ai/code/artifact/b91d3b94-74cf-4487-ae3e-118d9a5f1b7a

🔴 THE SYNTHESIS ERA IS OVER. `tools/sfx-draft.mjs` generated seven synthesised takes and he
   answered *"all bad nvm"*. Its header now says so. Do not ship its output, do not improve it,
   do not synthesise a replacement for anything — that is round 3 of the mistake `src/ponder/sfx.js`
   already records twice. Every sound from here is cut from his recording or derived from it.

THE MATERIAL, and how to reproduce it exactly:
  Source archived at `RE UI/SFX/2026-09-04_ponder-rail-key_source.mp4` (the TempState original will
  be cleared by Windows; this copy is the one that lasts). The burst sits at 1.455s — two hits, the
  press at -13dB and its release at -30dB 115ms later, on a digitally silent floor, so both are
  system audio and the release belongs to the sound.

    ffmpeg -y -i "<source>.mp4" -vn -ac 1 -ar 44100 raw.wav
    # key (181ms, both hits)
    ffmpeg -y -ss 1.450 -t 0.182 -i raw.wav \
      -af "afade=t=in:st=0:d=0.004,afade=t=out:st=0.160:d=0.022,volume=10dB" key.wav
    # key-short (91ms, press only)
    ffmpeg -y -ss 1.450 -t 0.092 -i raw.wav \
      -af "afade=t=in:st=0:d=0.004,afade=t=out:st=0.074:d=0.018,volume=10dB" key-short.wav
    # boot-a: the click an octave down (which doubles its length), softened, short tail
    ffmpeg -y -i key.wav -af "asetrate=44100*0.5,aresample=44100,lowpass=f=2600,\
      aecho=0.9:0.55:58:0.20,afade=t=out:st=0.34:d=0.10,volume=6dB,alimiter=limit=0.71" -t 0.44 boot-a.wav
    # boot-b: boot-a plus one soft latch tick at 150ms
    ffmpeg -y -i boot-a.wav -i key-short.wav -filter_complex \
      "[1:a]adelay=150|150,volume=-11dB,highpass=f=900[t];[0:a][t]amix=inputs=2:normalize=0,\
       alimiter=limit=0.71[o]" -map "[o]" -t 0.44 boot-b.wav
    # encode as the app ships them
    ffmpeg -y -i <x>.wav -codec:a libmp3lame -q:a 3 -ac 1 public/sounds/<x>.mp3

  ⚠️ NEVER CUT WITHOUT A FADE. A trim on a non-zero sample is a step, and a step is a click — an
  earlier cut here produced a -0.7dB transient at the seam, which is louder than the sound itself.
  Levels: keys at -3dB peak, where `book-page.mp3` already sits; the openings sit softer on purpose.

WHERE EACH ONE GOES — the wiring, four files:
  1. RAIL KEY -> inside `go()` in `src/ponder/PonderPad.jsx` (~line 139), NOT on the button's
     onClick. The swipe on `.pp-stage` also routes through `go()`, and a swipe that changes section
     in silence is the same action behaving two ways.
     ⚠️ `go()` returns early on `i === cur` and out-of-range. Sound goes AFTER those guards, or the
     key you are already on makes a noise for nothing.
  2. OPENING -> the phone branch in `PonderBook.jsx` (~line 332), `if (phone) { setPadOpen(true); }`.
     The desk plays `bookOpen()` one line below; the phone plays nothing today, which is the gap.
     The panel's arrival runs ARRIVE_BASE 932 * PACE 2.5 = 2330ms and the opening is 421ms, so it
     leads the animation rather than filling it — fire it with the state, not on a timer.
  3. Registry: copy the chosen mp3s into `public/sounds/`, add them to `SOURCES` in
     `src/hooks/useSound.js` plus the per-name volume map below it, then export one arrow per sound
     from `src/ponder/sfx.js` beside `bookPick`/`bookOpen`/`bookPage`/`bookClose`. Name them for the
     PANEL — padKey, padBoot — or the next reader assumes they are paper. `playSound` already solves
     pooling, the unlock gesture and Lite Mode silence; do not build a second sound system.

STILL SILENT, and deliberately not guessed at — ASK before building any of these:
  · the panel leaving, and the X in the status bar (silent today)
  · pressing Buka, which still plays the paper `ponder-open.mp3` on a slate panel
  · closing a lesson on the phone — `src/ponder/PonderOverlay.jsx:373` calls `bookClose()` and
    never checks the width, so the tech panel exits on paper. This is the bug Aldi reported by ear:
    *"the ponder panel close, it sound like book close on the phone also"*. It must go tech on the
    phone and stay paper on the desk, where a book really is closing — reuse `PHONE_Q` from
    PonderBook, do not invent a second breakpoint.
  If he says yes, derive them from the SAME click with ffmpeg, the way boot-a was.

DONE WHEN: both call sites fire; a swipe and a rail tap sound identical; 719/719 audit and 988/988
selfcheck, plus one new check in the pad block of integration.audit.mjs pinning that the pad plays
its OWN sound names and never click/tap/commit/vaultb/book-* — that is the regression this prevents.

VERIFY: sound cannot be screenshotted, so verify what can. `read_network_requests` with urlPattern
"/sounds/" proves the right mp3 is fetched on the right event; decoding it in the page (fetch ->
AudioContext.decodeAudioData) proves it is neither silent nor clipping. That is proof of SHAPE — the
listening test is Aldi's alone.
⚠️ The Browser pane does NOT composite (rAF fires zero times) and `agent-browser` hangs the full
1800s. Both are written up in `A-Brain/Wiki/Concepts/Looking at the App.md`.
    preview_start "ponder-lab", then http://localhost:4190/tools/ponder-lab.html?book
    Below 767px is the phone, and the pad is phone-only.

Then rewrite .claude/NEXT-SESSION.md with the next single job — pull from the queue below.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Delete `tools/sfx-draft.mjs` and `tools/sfx-draft.html` once the sounds are settled.

They generated the seven synthesised takes Aldi rejected. The header says superseded, which stops a
future session shipping them, but the files are dead weight the moment the real sounds are wired.
Not deleted yet only because the review artifact is still live and the comparison may still matter.

### The rest of the Ponder work is closed.

The riffle removal was confirmed on screen, the terminal is locked to one palette in both themes
(`f748410`), and the two-glyph split is Aldi's own call (`0eef44b` in A-Brain). After the SFX, the
next job comes from `A-Brain/Backlog/` or from Aldi. Do not invent one from a code smell.

### 7 Days to Die track — separate, not this repo

Its notes and its own one-job prompt are at `C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md`
and `NEXT-JOB.md`. Nothing there is owed to this repo.

</details>
