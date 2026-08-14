# PROGRESS — read this, search for nothing

**Updated: 2026-08-14 17:50 WIB (KPM app session)** · branch `phase0-solid-ground` · last code commit: run `git log -1`
**Lancelot session last wrote 2026-08-13 23:40 WIB** — see the entry further down. Two clocks, one file.

> ✅ **ARCHIVED 2026-08-14 on Aldi's word.** This file had reached 3,489 lines and was read in
> full at every session start — ~58,000 tokens of his budget spent before he typed anything.
> Everything before the current day now lives in
> `A-Brain/Archive/PROGRESS-archive-2026-08-14.md`. **Do not load that file to orient** — search
> it only when tracing a specific past decision.
>
> 📏 **KEEP THIS FILE UNDER ~350 LINES.** When it passes that, cut the oldest day into the same
> archive rather than letting it grow back. This file holds WHERE THE WORK STANDS; the archive
> and `A-Brain/Wiki/Log.md` hold how it got there.

### 🔴 ~20:00 WIB — THE DOCK REDESIGN IS DECIDED. NOT YET BUILT IN THE APP. Prototype only.

**Artifact (his decision board):** https://claude.ai/code/artifact/c0af9545-8a29-40b9-a787-2f33d8835082
**Source:** `<scratchpad>/dock-options.html`. Nothing in `src/` has been touched for any of this.

**▶ START HERE NEXT SESSION — his last instruction, verbatim, 2026-08-14 ~20:10:**
*"Label B is good, but make the sidebar thinner, and reduce space between each column, it should
look better when each button have the same spacing between vertical and horizontal space make the
space between columns to be the same with the row to be more even, take notes and do this after
quota reset"*.

**LABEL B IS CONFIRMED. Nothing above it needs re-deciding.** The open work is geometry only.

**The insight to lead with, because it is not obvious and it decides the numbers:** he is asking
for even spacing, and the reason it looks uneven is that **the buttons are not square**. They are
currently **54px wide and about 30px tall**, so the icon-to-icon pitch is ~56px across and ~34px
down — nearly double in one direction. Shrinking the column gap alone cannot fix that; the gap is
already only 2px. **Thinning the dock is what evens it**, which is exactly what he asked for in
the same breath. Trust his eye here: he diagnosed the right fix from the symptom.

**⚠️ AND THE TRAP: on his real screen the rows STRETCH.** `grid-auto-rows: minmax(0,1fr)` makes
9 rows share ~580px, so each row is ~65px tall — wider than any thin dock would make the buttons,
so thinning alone makes it MORE uneven, not less. Even spacing therefore needs the row height
CAPPED to the button width, i.e. square cells:
  · marks **44 x 44**, gap **4px on BOTH axes**, pod width **100px** (4 + 44 + 4 + 44 + 4)
  · pitch becomes 48px in both directions — even by construction, not by taste
  · 9 rows x 48 = 432px inside ~580px, so it still never scrolls; the spare height goes to the
    foot or centres the column. **Do NOT let the rows go back to 1fr** or the evenness is lost.
  · one-column mode: keep the pod at 64px so the collapsed 56px circle still fits, marks 56 wide.
Take these numbers to the prototype FIRST — he judges by looking, and the artifact is already
built for exactly this comparison.

**HIS LOCKED DECISIONS — build these, do not re-ask:**
1. **Two columns when nav tabs exceed 10**, one column at 10 or fewer (so a low tier never sees
   two). Music, profile and logout stay **one per row**. Column gap **2px**, row gap 4px.
2. **Label B's look** (square 4px plate, `#0f0e0d`, `--line-2` border) with **Label A's motion** —
   slides **left to right** out from under the dock edge, and **slower**: enter `opacity 300ms /
   transform 520ms` on `var(--ease)`, exit stays quick at `180/240ms`. Travel **22px**, and the
   gap must equal the travel or it reads as sluggish rather than natural.
3. **Glass tint 0.02** over a 30px blur, saturate 1.9, brightness 1.06, with the bright top lip.
4. **Logout keeps its old `.kpm-expand` grow-sideways animation**, but the label takes a fixed
   80px from the right edge (NOT the old `68%`, which is a share and crowds the glyph as the
   capsule grows). 24px of clear air.
5. **Apple-dock magnification: REJECTED** — *"for double column it look really bad"*. The code is
   in the prototype under `.magnify` if it is ever wanted for a single column.

**⚠️ THREE BUGS FOUND THAT ARE LIVE IN THE APP AND STILL UNFIXED:**
- **`.kpm-rail-grid` is `overflow-hidden`, and the hover label is a child of the mark — so the
  desk label has NEVER been visible.** Rows are `1fr` and cannot overflow, so the clip guards
  nothing. Removing it is the fix. This is the single most important item.
- **`transition-all duration-200` on the nav mark (JSX ~line 572)** beats `.kpm-rail-mark`'s
  per-property rule on file order, so the tuned transitions never applied either.
- **`.hot` (icon `scale(1.42)`, lift 4px) is a FINGERTIP affordance** leaking onto the desk.

**Two column-1 labels need `left: calc(200% + 6px)`, column-2 `calc(100% + 4px)`** or the label
lands on top of column 2 — measured, clears by 18px.

### ✅ 17:45 WIB — his last open item closed: the icon was taller than its own button. `f6c5dbe`

**366/366, `src/` clean.** The one item from his list that was only half done — *"button for each
should be spacier"* — is finished, and it was a real defect, not a preference. Measured in a
browser at 1366x768 with all **seventeen** marks: plates were **21.8px tall around a 27px icon**.

No scrollbar and no `min-height` were available (his rule, and a floor clips a tab into being
unreachable), so the height came from the three things spending it: gap 8px→4px, grid padding
8px→4px, and the foot 221px→167px. **After: 29.7px rows, 4.8px of plate around every icon**, no
scroll, nothing clipped, plates now 56px wide — matching the collapsed circle exactly.

Two things learned that are now checks, not prose:
- **A second column is impossible here.** The pod is 64px by design; the extra 228px of the open
  panel is the room the label pills slide into. Two columns would be 21px each.
- **The longest tab name clears the panel edge by 21px.** "Receivables & Consignment" ends at
  x=271 of 292, and the panel clips — a longer name is sliced off silently. Capped at 27 chars.

Full record: `A-Brain/Backlog/PC sidebar hover-expand and top panel redesign.md`.

**NOTHING IS IN FLIGHT.** Open asks for Aldi are unchanged and listed below.

### ✅ 14:40 WIB — the specificity tie that shipped twice, and the skills were installed all along.

🔴 **CORRECTION TO THE 13:20 ENTRY: the design skills DO exist.** `~/.claude/skills/` already held
`emil-design-eng`, `impeccable`, `ui-ux-pro-max`, `design`, `ui-styling`,
`make-interfaces-feel-better` and the rest of Emil's set. The 13:20 claim that they "do not
exist" was drawn from `ListSkills`/`SuggestSkills`, which report the **claude.ai** registry — a
different thing from the on-disk user skills. Pulled all three repos fresh at his request: 9
updated, `ask-sonner` new, **30 skills on disk**. No `design-critique` exists in any of them.
⚠️ They still did not appear in THIS session's invocable list — a restart is the thing to try, and
"a skill is unavailable" is a fact about one session, never about the machine.

**🔑 THE SAME CASCADE TIE SHIPPED TWICE IN ONE DAY, and the second time I had "verified" it.**
`.kpm-rail-pod > *` counts as **one class** — the universal selector scores zero — so it tied
with `.boot-3` and lost on order, because the boot animations live in an inline `<style>` that
lands after theme.css. The animation kept running, and a filled animation outranks every normal
declaration, so `opacity: 0` could not hold it either. That is why his music/face/logout stayed
lit around a closed capsule after the morning's "fix". `[data-kpm-rail] ` prefix makes it two.
The header padding lost the identical fight (`.kpm-topbar` vs Tailwind's `lg:px-8`) — doubled.

⚠️ **THE HARNESS LET IT THROUGH, and that is the more useful lesson.** It was missing the
component's own inline `<style>`, so there was no animation to lose to; and the reading was taken
**before the 0.25s delay had elapsed**, so opacity read 0 and looked right. Both fixed: the boot
keyframes are in `harness.html` now, and readings are taken after the animations finish.
**A mock verifies nothing it does not contain, and a measurement taken mid-animation is a guess.**

Also: the pod pads itself 12px so the bottom group stops hanging off the capsule's end.
Measured after animations complete — closed: all three blocks opacity 0. Open: capsule 12→708
with the bottom group at 479→700, inside it.

### ✅ 13:55 WIB — the dock floats and moves to the corner. `93b5c2f`, 364/364. HIS TWO DECISIONS, BOTH ANSWERED.

**He chose "float it"** for the blank-column question, which is also what the component's sheet
said: *"set it to Fixed, and pin to your chosen edge"*. So the desk rail is `position: fixed` and
**reserves nothing** — measured, the main content starts at 0 and spans the full 1280.
⚠️ `margin-right: -228px` is RETIRED with it: an out-of-flow box cannot push its siblings. If
`position` ever goes back to relative, that trick must come back or every hover shoves the app
sideways. And the `pointer-events: none` at rest is now **load-bearing**, not polish — a fixed
panel over the content that took clicks would swallow every click down the left edge.

**He also chose to leave the wider SALES layout alone** — *"It's fine, just the sidebar"*. The
cream-panel-dominates / empty-right-column / no-column-rhythm critique was offered and declined.
**Do not reopen it unprompted.**

**Then his own suggestion, and it is a good one:** *"the top part of the app is very spacey what
if u put the single button when unopen on the left top instead of the middle left?"*. Circle now
at (4, 12), 56 square. Because the closed circle and the open capsule share a top edge, **only the
height animates** — it unfurls downward out of the logo. `.kpm-topbar` takes 76px of left padding
so the header gives up that corner.

### ✅ 13:20 WIB — his four screenshot reports. Three fixed (`9e975aa`, 364/364), the fourth is a DECISION.

1. **Left torch stood in the doorway.** The arch is `left: 4%` **plus a fixed 124px**; the torch
   was at `21%` of the same box. They only clear each other past ~729px and the ledger column
   never is. Anchored to the arch's right edge in px now. ⚠️ Mixing % and px positioning in one
   scene is the bug class, not this one instance.
2. **The hover label already exists** — he could not see it because of (3).
3. **🔑 Music, face and logout stayed visible around a CLOSED capsule and were not clickable.**
   Cause: `boot-1/2/3` (the arrival animations) run `forwards`, and **a filled animation outranks
   a normal declaration in the cascade**, so `opacity: 0` never reached the three blocks carrying
   one. It reached the marks, which carry none — which is exactly the split he photographed.
   Fixed by switching the boot animation off on the DESK (`.kpm-rail-pod > * { animation: none }`),
   not with `!important`: the capsule unfurling is the arrival here. Phone untouched.
   Circle also went 72 → **56 inside a 64px column** — *"button is too big"*.
4. **HIS DESIGN QUESTION IS OPEN, do not answer it for him.** *"the sidebar have it own space but
   it just blank while its closed ... so much item on the left while the right it is just one big
   panel ... i want ... more balance and more organic"*. The Totem sheet he pasted says **"set it
   to Fixed, and pin to your chosen edge"** — a floating dock reserves NO column, which is the
   blank strip he is looking at. Three options were put to him; **the answer decides the work.**

⚠️ **The seven skills he named do not exist** (`/emil-design-eng`, `/design:design-critique`,
`/design`, `/ui-styling`, `/ui-ux-pro-max`, `/make-interfaces-feel-better`, `/impeccable`).
`ListSkills` and `SuggestSkills` both come back empty for design/UI. He asked to "add them to this
workspace" — **they cannot be installed from here.** The nearest real thing is a project skill
written into this repo, and he has not said yes to that yet.

### 🔑 12:40 WIB — BROWSER ACCESS IS FIXED. It found two real bugs in an hour. `c53025b` + `a611857`, 364/364.

**🔴 THE ONE THING TO CARRY FORWARD: you can look at this app now. Use it.**

The in-app browser will not accept the dev server's self-signed certificate (HTTPS is deliberate,
`vite.config.js:17`, the phone needs it — never "fix" that). **Plain HTTP is not blocked.** So:

    # 1. copy the built stylesheet next to a mock page
    cp dist/assets/*.css <scratchpad>/
    # 2. serve it
    python -m http.server 5199 --bind 127.0.0.1     (run in the scratchpad, background)
    # 3. preview_start { url: "http://127.0.0.1:5199/harness.html" }   → navOk: true

`harness.html` in this session's scratchpad is a faithful copy of the shell's markup — real class
strings, real built CSS, no React and **no login**, which is what makes it usable at all. Measure
with `javascript_tool`. **`:hover` cannot be forced from script, but `:focus-within` can** — call
`.focus()` on a mark and the open state is reachable. Kill transitions first with an injected
`*{transition:none!important}` or you measure a frame mid-animation.
⚠️ Screenshots still need Aldi to DISPLAY the pane. Everything else is scriptable.

**Bug 1 — the desk panel was 176px wide, the PHONE's width, not 144.** `w-[176px] lg:w-[144px]`
on the element fought a width rule in the stylesheet for the same property, and the phone value
won on the desk. So yesterday's "144px so the logout button stops being clipped" **never once took
effect**. The check that was supposed to protect it asserted the class was PRESENT in the source —
which says nothing about whether it WINS. Width classes deleted; theme.css owns it at every size.

**Bug 2 — the hover label was `position: relative`, not absolute.** `.kpm-rail-mark > *` sets
relative to lift icons above their plate; equal specificity, later in the file, so it won. The
label sat inside the capsule and, being a flex child, pushed the icon off centre. Now scoped to
`.kpm-rail-mark > .kpm-rail-word`.

🔑 **Both are the same lesson, and it is worth more than either fix: a check that greps the SOURCE
for a class proves the class was typed, not that it applies.** Assert the outcome, or measure it.

**Then his Totem spec, from the component's own description** (`a611857`): **solid, no blur** —
which supersedes his earlier "transparant but blurred" and removes the Lite Mode fallback problem
entirely; the **label is its own pill** that slides 6px out; **the logo is the trigger**, so at
rest the panel takes no pointer events and is not an invisible wall down the screen edge; icons
**cascade** in via `--i` set in the JSX; and **every control is a mark now** — the gold unlock
block and the `.kpm-expand` logout are gone, logout keeping its red on icon and label pill.

Measured after: closed **72px**, pointer-events none, surface `rgb(20,17,14)`, blur `none`. Open
**300px**, main column's left edge **unmoved at 72**. Longest label's pill 128 wide, ending at 200
inside a 300 window — not clipped.

### ✅ 11:43 WIB — the sidebar no longer paints over the vault gate. `06f299b`, 363/363.

**He reported this twice and the first answer was WRONG.** *"why did u change our login screen
after google login tho, these sidebar format shouldnt be showing"*, answered from the diff as old
un-converted UI. Then, with a screenshot: *"why sidebar keep showing in login screen"*. A diff
proves what changed; it cannot prove what is correct.

🔑 **A z-index only competes inside its own stacking context.** The gate is a CHILD of
`<BiohazardTheme>`, so it lands in the content div, and that div is `relative z-10` — a stacking
context. Its `z-[9999]` is settled against its siblings in there, then the whole context is stamped
at 10. The panel is a sibling of that div at `z-[90]`. 90 beats 10. **Raising the gate's number can
never fix it.** Fix: `{user && !showAdminLogin && (` on the panel, the guard the edge ribbon
already had. Two checks carry the reason so nobody reaches for a bigger number.

⚠️ **Known cost, his call if he wants it back:** MusicPlayer lives inside the panel, so opening
the vault gate now unmounts it and the music stops. Moving the player out of the rail is the fix
if he objects.

**PROGRESS.md was NOT trimmed.** The 🔴 above asks his permission to archive it; deleting 3,000
lines of his history on a hook's say-so is not mine to do. It stays until he answers.

### ✅ 11:20 WIB — the PC sidebar shipped in the format his VIDEO asks for. `16c8ff9`, 362/362.

**The reference video can be watched. `ffmpeg` is on this machine.**

    ffmpeg -i clip.mp4 -vf "fps=1,scale=900:-1" -frames:v 12 f%02d.png

Six seconds became six frames, and the frames contradicted the guess made from his words: *"shrink
in to 1 button big"* had been written down as *one button WIDE* (a narrow column of icons). It is
**one single circle**. The whole menu appears only on hover. Everything built on the wrong reading
was redone this morning. The law is now in `A-Brain/Wiki/Concepts/Aldi's Design Taste.md`: **his
reference is the artefact, not his sentence about the artefact.**

**What the desk sidebar is now**, three states:
- **at rest** — one circle, centred on the left edge, carrying the ACTIVE TAB's own mark.
- **pointer on the rail** — a full-height translucent, blurred capsule; every mark fades up in one
  column, the music button among them.
- **pointer on a mark** — that mark's name prints beside the capsule, on the app's own background.

**The two numbers that must stay in step: 272 painted, 72 occupied, `margin-right: -200px`.** The
rail's margin box never changes, so opening it never moves the main UI.

`.kpm-rail-pod` is new and is the capsule; the panel around it is the window. One element cannot
both clip (`overflow-hidden` is load-bearing there) and let the label escape. On a phone the pod is
`display: contents` — the signed-off phone layout does not know it exists.

⚠️ **The panel now paints NOTHING of its own**, so anything that hides the pod's glass hides the
whole sidebar. Two checks pin it: the appearance sits OUTSIDE the `hover: hover` gate (a touch
laptop matches `lg:` but not that), and Lite Mode gets solid ground because it deletes
`backdrop-filter`.

**The music player lost its desk accordion** — it opened downwards into a panel that is now 72px
wide and 72px tall. The pill answers both widths. Net −48 lines in that file.

**Not seen with eyes.** The Browser pane still refuses the dev server's self-signed HTTPS cert
(`chrome-error://chromewebdata`), and screenshots need the pane displayed. Verified by build,
362 checks and the built CSS. **Aldi has to look at this one.**

### ✅ 23:40 WIB (Lancelot session) — the two potongan methods BUILT. A-Brain `8b20e34`. 103 checks green.

**Zero files in this repo were touched by this track**, as always — the work is `Lancelot.gs` and
the concept page in the A-Brain repo, plus `~/.claude/agents/lancelot.md` (global config, NOT a
git repo, so that one edit is on disk and uncommitted by nature).

Built the two items the 14:05 entry was waiting on his go-ahead for:

1. **`caraHitung`** (`total` | `per gulungan`, default per gulungan) — a new NOTA column,
   **appended, never inserted**, because `pasangSheet` rewrites row 1 in place and a mid-list
   column would silently relabel every stored value to its right. On `total`, `tulisNota_` writes
   per-row TARA/NETTO/JUMLAH **blank** and **refuses the nota** unless `totalNetto` and
   `totalJumlah` are copied off the paper. On `per gulungan`, `taraBulat_` rounds the derived tara
   to a whole kg (26 → tara 3 → netto 23, his own nota).
   🔑 **The rounding is on the TARA, not the netto** — the paper's `TARA (10%)` column carries whole
   numbers. Both readings match every row he has sent; they differ only when the potongan lands
   exactly on `.5`. Never runs when the tara is printed: a printed tara is copied.
2. **`BIAYA` child table + empty `M_BIAYA` master.** `NO NOTA · NO · JENIS BIAYA · KETERANGAN ·
   JUMLAH`. `TAMBAHAN` on NOTA is now only the list's total, and `cekKualitas` fails **BERAT** when
   they disagree — `DIBAYAR` is computed from `TAMBAHAN`, so a hand-edited biaya row is a money bug.
   M_BIAYA ships **empty on purpose** (13:40 law: he names his own categories).

🔴 **The bug this closes:** `cekKualitas` asserted `(bruto − tara) = netto` per row, so a
total-level nota — whose per-row netto is correctly blank — raised a **BERAT alarm on every
gulungan, every night**. The nightly check was calling his most accurate data an error.

**103 self-check cases green (was 82)**, and four mutations were run to prove the new ones can go
red: rounding removed, `caraHitungRapi_` broken, the blank-biaya filter disabled, and a column
inserted mid-header. Each turned exactly the expected cases red and nothing else.

⚠️ **NOT covered by any runnable check:** the `tulisNota_` TOTAL path and the `cekKualitas` skips
both need a real sheet, so they are **[likely], not [certain]** until he runs them.

**✅ TEST, in order:** re-paste `Lancelot.gs` → `pasangSheet` (creates BIAYA + M_BIAYA and the CARA
HITUNG dropdown) → `lancelotSelfCheck` (must say SEMUA BENAR) → `cekKualitas` (must NOT report
BERAT on a total-level nota).

**❓ STILL OWED BY ALDI — unchanged, none of it blocked this build:**
(a) the `-AGEN` pairing suffix (`JUAL-07` → `JUAL-07-AGEN`);
(b) is `AGEN` always filled on a sale nota?;
(c) the Pak Mul nota is filed on disk but still **not written to the sheet** — everything it needed
is now built, so it can go in as the first live test once he re-pastes.

**▶ NEXT (was item 3 of the 14:05 list, deliberately not built):** `NOTA CETAK` printing the biaya
list beside the gulungan rows and continuing downward past them. It is presentation only — the data
it needs now exists.

### 🟢 13:51 WIB (Lancelot session) — no file changes this turn; those `src/**` edits are the app's

The Stop hook named `src/styles/theme.css`, then `src/config/integration.audit.mjs` on the next
turn. **The Lancelot track touched neither** — it touches
zero files in this repo, and this turn wrote nothing but this note. That file belongs to the 🟠 KPM
app track; whoever owns it should log it. This is rule 4 of the protocol block below working as
intended: the hook fires on *any* changed file in this repo, which is not evidence of who changed
it. Lancelot state is unchanged since the 14:05 entry — build paused at Aldi's word,
*"well lets build later usage almost depleted"*, quota 77%.

## 🧭 WHICH TRACK IS WHICH — check this before editing anything below

Two unrelated systems log into this one file. **Never edit an entry from the other track**, and
never merge, re-sort or "tidy" across them: the timestamps interleave, so a chronological cleanup
is exactly what collapses one track into the other. Add your own entry at the top and leave every
paragraph you did not write alone.

| Track | What it is | Its log entries (by heading time) |
|---|---|---|
| 🟠 **KPM app** — this repo | The React inventory app. Files: `src/**`, `firestore.rules`, `.claude/**`. Verified by `npm run build` + `node src/config/integration.audit.mjs`. | 14:10, 13:25, 07:45, 07:43, 08:36, 13:20 (freeze), 08:20, 03:28, 03:12, 03:10, 21:06, 20:56, 20:52, 20:42, 20:22, and the CLOSED entries |
| 🟢 **Lancelot / tobacco ledger** — NOT this repo | Aldi's tembakau bookkeeping in Google Sheets + Apps Script (`Lancelot.gs`), the Drive nota inbox, and the A-Brain vault. **Touches zero files in this repo.** | 17:15, 13:40, 13:18, 13:14, 13:11, 07:52, 07:24, 01:05, 00:37, 20:05, and 13:20 / 08:02 (tab audit) |

Two headings read `13:20` and belong to **different tracks** — one is the customers-listener
freeze fix in the app, one is the sheet's tab audit. Read the first line of an entry before
assuming which is which; that collision is the most likely place for the two to get mixed up.

The KPM app's own audit is the tiebreaker for this track: if a change is real, it is asserted in
`src/config/integration.audit.mjs`, currently **258 checks**. Nothing in the tobacco track appears
there, and nothing should.

## 📌 HOW TO WRITE IN THIS FILE WHEN OTHER SESSIONS ARE ALSO WRITING — read before editing

Aldi's instruction, 2026-08-12: *"make sure that on the progress.md u put another paragraph that
didnt disturb the notes made from the KPM app, i want alucard have this thinking to not collapse
the notes from another session, because there will be more than 1 alucard use is several sessions"*.

**More than one session writes this file at the same time.** Today two ran in parallel: the KPM app
work (`src/`, this repo) and the Lancelot tobacco ledger (`A-Brain/`, a different repo). Neither one
owns the file. This block was written after an `Edit` failed with "file has been modified since
read" mid-sentence — the collision is not hypothetical.

The rules, in order:

1. **Add, never rewrite.** `Edit` with a unique anchor. Never `Write` this whole file, and never
   regenerate it from what you remember — you will silently delete a section you never read.
2. **Prepend your entry; leave every other entry byte-for-byte alone.** Even if another session's
   entry looks stale, wrong, or superseded, it is not yours to fix. Say so inside your own entry.
3. **Label whose work it is** in the first line of your entry — `(KPM app session)` or
   `(Lancelot session)`. An unlabelled entry gets blamed on the wrong session by whoever reads next.
4. **Never claim another session's diffs.** Before writing "I changed X", check `git status` against
   what you actually edited. The Stop hook fires on ANY changed file in this repo, including files a
   different session touched — that is not evidence you touched them. This happened twice today.
5. **Do not trim the LOG while another session is running**, and never trim entries that are still
   uncommitted — `git log` cannot give back what was never committed.
6. **Re-read immediately before you edit.** The header timestamp moving is the tell that someone
   else wrote in the meantime. If an `Edit` fails as stale, re-read and re-apply — do not force it.
7. **The quota is one shared pool.** Two sessions running hard halve each other's runway, and the
   `[plan-quota]` percentage covers both. Size your work against the whole pool, not your own chat.

