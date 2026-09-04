# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Close out the field terminal's sound thread. The rail key shipped on 2026-09-04 (7380a92) playing
Aldi's own recording. Three moments are still silent or wrong, and he has deprioritised the whole
area — *"most of the time phone user wont be using their volume on this app anyway"* — so this job
is a decision first and a small amount of code second.

🔴 ASK HIM, THEN DO ONE OF TWO THINGS. Do not start building sounds on your own judgement.

  THE ONE THAT IS A BUG, NOT A GAP — mention this first, because he reported it himself by ear:
  *"the ponder panel close, it sound like book close on the phone also"*.
  `src/ponder/PonderOverlay.jsx:373` calls `bookClose()` when a lesson exits and never checks the
  screen width, so the phone's slate terminal ends its flow on a paper sound. Even if he wants NO
  new sounds, this one is still wrong: the cheapest correct fix is to fall silent on a phone rather
  than play paper. Reuse `PHONE_Q = '(max-width: 767px)'` from PonderBook — do not invent a second
  breakpoint. Ask which he prefers: silent on the phone, or a tech sound derived from his click.

  THE TWO THAT ARE MERELY SILENT: the panel leaving (and the X in the status bar), and pressing
  Buka — which still plays the paper `ponder-open.mp3` on a slate panel. Both are only worth doing
  if he says so.

  IF HE WANTS SOUNDS: derive them from HIS click, never synthesise. The recipe that produced the
  parked opening is in the commit message of 72a3dab and the source is archived at
  `RE UI/SFX/2026-09-04_ponder-rail-key_source.mp4`. `boot-a` and `boot-b` were already built and
  parked, not rejected — he said *"forget the panel open for now"*, which is not the same as bad.

  IF HE WANTS NONE: say so in `src/ponder/sfx.js` as a dated line so the question is not reopened,
  fix the PonderOverlay bug the silent way, and stop.

🔴 EITHER WAY, DELETE THE DEAD GENERATOR when the thread closes: `tools/sfx-draft.mjs` and
`tools/sfx-draft.html`. They produced seven synthesised takes and he answered *"all bad nvm"*. The
header says SUPERSEDED, which stops a future session shipping them, but they are dead weight and
the live review artifact no longer points at them.
Artifact (still live, now showing his click):
https://claude.ai/code/artifact/b91d3b94-74cf-4487-ae3e-118d9a5f1b7a

🔴 NEVER SYNTHESISE A SOUND HERE. Three rounds have now lost to it — round 1 reused the till's
sounds (*"u re crazy using sales SFX for the book"*), round 2 synthesised paper (*"SFX sound really
bad as well"*), round 5 synthesised seven tech takes (*"all bad nvm"*). The audit check 'every
tutorial sound is one of his own files, and none of them is a sales sound' enforces it; do not
weaken it to make something pass.
📓 READ FIRST, it is one page and it is the whole thread:
`A-Brain/Wiki/Concepts/Sounds Come From Aldi.md` — the rule, the three rounds, the ffmpeg cut
method (silencedetect → 5ms envelope dump → fades → match the family's level), why a derived sound
is still his sound, and the REJECTED ON PURPOSE list so nothing here gets re-proposed.

⚠️ WHAT CANNOT BE VERIFIED HERE, so do not claim it. `playSound` returns early until
`unlockSounds()` has run, `main.jsx` arms that on the first real user gesture, and the ponder lab
has its own entry point that never calls it — while the Browser pane cannot deliver a trusted click
at all (a real `computer` click times out; the pane does not composite). So audibility is Aldi's
test on his phone, always. What you CAN verify, and should: that the mp3 resolves
(`fetch('/sounds/x.mp3')` → 200 `audio/mpeg`), that it decodes to the duration and peak you intended
(`AudioContext.decodeAudioData`), and that the calling function still does its job afterwards.
    preview_start "ponder-lab", then http://localhost:4190/tools/ponder-lab.html?book
    Below 767px is the phone. The pad needs ~2.4s to finish arriving before its rail accepts a tap —
    a click sent earlier looks like it did nothing, and that is the animation, not a bug.

DONE WHEN: his answer is implemented, the PonderOverlay phone bug is gone either way, the dead
generator is deleted, 720/720 audit and 988/988 selfcheck (a new sound adds checks; a deletion may
remove the two that name the draft files — account for every delta rather than accepting the total).

Then rewrite .claude/NEXT-SESSION.md with the next single job — pull from the queue below.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### After the sound thread, the queue is empty — go to the Backlog, do not invent.

Every Ponder question from the 2026-09-02/04 rounds is closed: the riffle removal is confirmed on
screen, the terminal is locked to one palette in both themes (`f748410`), the two-glyph split is
Aldi's own call (`0eef44b` in A-Brain), and the rail key ships his own recording (`7380a92`).

The next job comes from `A-Brain/Backlog/` — the real to-do list — or from Aldi directly. Do not
promote a code smell into a job.

### 7 Days to Die track — separate, not this repo

Its notes and its own one-job prompt are at `C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md`
and `NEXT-JOB.md`. Nothing there is owed to this repo.

</details>
