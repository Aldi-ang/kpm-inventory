# PROGRESS — read this, search for nothing

**Updated: 2026-08-15 08:09 WIB (KPM app session)** · branch `phase0-solid-ground` · last code commit: run `git log -1`
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

## ▶ NOW

**The app shell redesign is SHIPPED and committed. Nothing is in flight, `src/` is clean.**
The desk dock (Label B, square cells, glass), the header band, the logout containment, and the
phone's duplicate-totem fix. **374/374.**

**✅ HE HAS SEEN IT AND APPROVED IT** — *"it looks fine"* — after one overlap fix. That matters
because **no frame was ever captured on this machine**: the Browser pane is not displayed, and the
dev server is HTTPS on purpose (the phone needs a secure context — **never "fix" it to http**),
which the in-app browser refuses. The audit reads source; the built CSS was confirmed to contain
every rule; **his eyes are the only check that has ever run on the appearance.**
⚠️ **If he says "localhost not working", the answer is `https://`** — plain `http` on 5173 refuses
the connection. That cost a round trip once.

**If he reports something looks wrong, believe the screenshot over any measurement.** That
happened three times in one afternoon and the screenshot was right every time. Check in this
order:
1. Desk hover label invisible → something re-clips it. Walk every ancestor's `overflow`;
   `getBoundingClientRect` reports layout position and knows nothing about an ancestor clip.
2. Cells oblong instead of square → `--cap` is not reaching the grid.
3. Sidebar or header gone in Lite Mode → the glass lost its opaque fallback. Both have one.
4. Header sits wrong against the dock → the number is the `112px` left margin on `.kpm-topbar`,
   and it must stay >= `.kpm-rail-pod`'s width or the open dock paints over the title.

## ❓ WAITING ON ALDI — verbatim, do not paraphrase

- ✅ **TEST — the phone's duplicate corner icon.** Fixed and committed (`3a9e4c5`); **he says it is
  STILL THERE**. The dev server was fetched live at 08:20 and IS serving both `display: none`
  rules, so the code is right and his phone is showing cached CSS. Waiting on a forced reload.
  ⚠️ If it survives a genuinely fresh load, the element is NOT `.kpm-rail-totem` and the whole
  diagnosis restarts — find what else paints the active tab's icon on a phone.
- ✅ **TEST — the logout word is now "Exit", not "LOG OUT".** Arithmetic forced it (32px available,
  52px needed). He has not given a verdict. The alternative, offered and unanswered: put logout on
  the same slide-out plate as every other mark, which keeps "Log out" in full.
- ❓ **Offered, unanswered:** the "Authorized Biometric Devices" card in `SettingsView.jsx` is
  painted **bright blue** (`bg-blue-50`, `text-blue-600`) against his own no-blue palette law. Not
  touched — it is outside what he asked for.

**ANSWERED 2026-08-15, do not re-ask:**
- 🔴 **21st.dev theme publish → NO.** His word, 2026-08-15: *"21 dev is no"*. **Closed. Never run
  `/21st:21st-design-sync` on this project.** The palette stays private.
- 🔑 **"Biometric is gone" and "the 5-minute grace period is gone" are ONE fact, not two bugs.**
  Passkeys are bound to the hostname that made them and the grace record is `localStorage` under
  the key `kpm-vault-grace` — **both are per-web-address**. `192.168.1.109` is a different address
  from the Vercel one, so it starts blank, like a brand-new phone. Nothing was lost or reset.
  Grace starts working on the LAN address after the first unlock there; biometric never can (see
  the log entry). **Expect this to be re-reported — the symptom looks like data loss.**
- **Phone ribbon position → stays device-scoped.** Read from his *"1. yes"*, which by his own
  numbering answered this one. If he ever says otherwise, user-scoped means moving it to Firestore.
- 🔴 **The music does NOT stop — the previous claim in this file was WRONG.** His words: *"music
  didnt sotp when sidebar shrink actually, it work in the background wheni even close the player
  which is good, no adjustment needed"*. The MusicPlayer-unmounts theory was never tested on a real
  device. **Nothing to build.**
- ✅ **The Firebase authorized domain is DONE** — *"already"*. `192.168.1.109` can sign in.

## 📓 LOG — newest first, about five entries; `git log` keeps the rest

### 2026-08-15 08:09 (KPM app session) — the phone was printing the active icon twice, and biometric was never a Firebase problem

**374/374, `src/` clean.** His screenshots: *"there is a duplicate logo of the active segment in
the top left of the sidebar panel i want u to delete that, because it is not aesthetic"*.

**`.kpm-rail-totem` had a rule for a desk that hovers (it BECOMES the collapsed circle) and a rule
for a desk that cannot (hidden) — and no rule at all for a phone, which matches neither media
query.** A bare `<span>` renders inline, so it drew the active tab's own icon a second time above
the grid. Hidden at file scope now; the hover-desk block still turns it back on because it is later
at equal specificity. **Deleting the span was the wrong fix** — it would have taken the PC's
collapsed circle with it.
🔑 **The shape to remember: when a class is only ever styled inside media queries, ask what it
looks like OUTSIDE them, because that is a real screen too.** Now a check.
⚠️ That check failed on its first run: I anchored it on `@media (min-width: 1024px) {`, which
occurs several times, and `.search` returns the FIRST — the gate landed 28,000 characters early.
**Fourth time this week a regex anchor has been wrong. Count the occurrences, do not assume one.**

**His biometric question — answered, nothing to build.** *"why biometric keep resetting ... is
there any problem with the biometric data inside the firebase?"* **No.** The device list is in
Firestore and [firebase.js:37](../src/config/firebase.js:37) hardcodes `appId`, so the path is
identical on every site. The cause is [App.jsx:1118](../src/App.jsx:1118) —
`rp: { id: window.location.hostname }` — which locks each passkey to the exact hostname it was
created on. Registered at the Vercel address, opened at `192.168.1.109`: different host, so the
phone reports no key. **It can never work there anyway**: WebAuthn requires a real *domain* (an IP
is rejected outright) and refuses to run on a page with a certificate warning, which is what his
"Not Secure" address bar is. **Biometric is Vercel-only; the LAN IP is PIN-only, by design.**
No new file was created this session.

### 2026-08-15 03:05 — the logout capsule stayed inside the dock, and the word had to shrink

His last open item: *"when it expand the animation go outside the sidebar box"*. `.kpm-expand`
grows to 136px and the pod is 100px, so the red slab crossed the capsule's edge. The rail now gets
its own narrower expansion, scoped — `.kpm-expand` is shared and every other site has the room.

⚠️ **THREE OF HIS ASKS CONFLICTED AND ONLY ARITHMETIC COULD SETTLE IT.** Inside the dock, 24px of
clear air between glyph and word (he asked for that a round earlier), and the words "LOG OUT".
Measured with the real face at 10px/.12em: at 96px wide there are **32px left for text**, and
"LOG OUT" needs **52**, "LOGOUT" 48, **"EXIT" 26**. So the word is the only variable that could
give. The full phrase moved to `title` and `aria-label`, where it costs no width.
**If anyone lengthens that label, the capsule leaves the dock again** — there is a check on it.
**373/373.** He may prefer the alternative: put logout back on the same slide-out plate as every
other mark, which keeps "Log out" in full because the plate lands outside the capsule by design.
He chose the expand animation deliberately, so it was not swapped without asking.

### 2026-08-15 02:35 — the dock is as tall as its buttons. Second attempt; the first broke it.

His two reports were ONE bug: *"i dont want bottom panel to collapse with the sidebar panel"* and
*"it looks better when the sidebar panel height follow how many buttons are there instead of
expanding all the way to the bottom of the screen while there is so much blank space above it"*.
A full-height pod reserved height it never used — the grid is capped and centred and the foot has
`margin-top: auto`, so the leftover opened as a gap BETWEEN them (the blank space), and the bottom
of the same pod reached into the L-Click/SCROLL strip (the collision).

🔴 **IT TOOK THREE ATTEMPTS AND THE REAL CAUSE WAS NEITHER OF MY FIRST TWO GUESSES.** His reports:
*"it brokes"*, then *"break no change"*.

**The actual mechanism, MEASURED in an isolated box chain (same nesting, 768px frame):**
`grid-auto-rows: minmax(0, 1fr)` **resolves only against a DEFINITE height.** While the pod was
`height: 100%` the grid inherited one and cells came out 44x44. The moment the pod became
`max-content` — which is what his "follow how many buttons" ask required — the grid's height went
**indefinite**, and every `1fr` row collapsed to its icon:

| grid's flex | cell size | square? | pod |
|---|---|---|---|
| `flex: 1 1 0%` | 44 x **17** | no | 342px |
| `flex: 0 1 var(--cap)` | 44 x **44.9** | yes | **593px** |

So the fix is a **definite flex-basis on the grid**: `flex: 0 1 var(--cap, auto)`. `0 1` keeps it
shrinkable, so a short screen squeezes the rows rather than clipping a tab off the bottom where it
cannot be reached.

⚠️ **Two wrong turns on the way, both worth not repeating.** First I put `height: max-content` on
**`[data-kpm-rail]`**, the PANEL — which is `position: fixed` + `inset-y-0` + `display: flex` +
`overflow: hidden` all at once. Asking that to size itself from its content is asking a clipping
box to measure the thing it clips. The panel paints nothing, so its height costs nothing; only the
POD needed to change. Second, I shipped that as a fix without being able to see it, and he had to
report the same break twice.
⚠️ Cascade note: the pod's `height: 100%` from the appearance block still exists. `height:
max-content` wins only because it is LATER at equal specificity. Do not move it above that block.

⚠️ **THREE AUDIT CHECKS BROKE ON PROSE TODAY, NOT ON CODE** — including `railGateAt`, which
allowed 2400 characters between a media query and a rule inside it until a comment pushed the rule
out of reach. **A regex that spans the gap from a selector to its declaration breaks when someone
edits the comment in between.** Anchor on the value or on something short and unique.

### 2026-08-15 01:55 — the header became the dock's twin; slate was hiding in `index.css`

**He has now SEEN both and approved:** *"it looks fine"*. One fix on top of it, from his
screenshot: *"i dont want the new header panel to collapse with the sidebar when open"* — the
header's left margin cleared the **closed** 60px circle but not the **open** 100px pane, so the
dock painted over the status dot and the first letter of the title. **76px → 112px**, static on
purpose: shifting the header sideways on every dock hover would make the title jump each time the
pointer passes the logo, which is worse than the overlap. ⚠️ That number tracks `.kpm-rail-pod`'s
width — change one, change both.

⚠️ **A lesson about the audit itself, worth more than the fix:** two checks failed because their
regexes spanned the gap from a selector to its declaration, and I had put a long comment in that
gap. **A check that reaches across prose breaks when the prose is edited.** Anchor on the value,
which is unique, not on a span from the selector.


His ask: *"lets rework the top UI format bro ... i want it to be in theme with this app and also
change the background"*. The band was a hairline rule on a flat wall while the dock had become a
floating capsule — one side of the shell floated, the other was a line. The header is a pane on
the same lit ground now, with **weaker glass than the dock on purpose** (blur 18 vs 30): the dock
is what you reach for, the header is what you read.
The ghost watermark kept its job and lost its redundancy — he pushed back on deleting it
(*"well it change according to the choosen app section"*) and he was right, so it is the section's
**icon** now instead of its **name**, which it was printing 24px from the real title and directly
behind the bell.
🔴 **Two defects found by the craft floor, not by looking for them:** every scrollbar in the app
was slate (`#cbd5e1 / #94a3b8 / #475569 / #64748b`) — **slate IS the blue the palette law bans** —
and the caret and text selection were browser-default blue. They survived every sweep because the
banned-hue check read the shell, App and the player, and **`src/index.css` is none of the three**.
It is read by the audit now. The clock also had no plate while its three neighbours did.

### 📋 THE DECISIONS THAT SHIPPED (reference only; do not re-ask, do not re-derive)

**Artifact (his decision board):** https://claude.ai/code/artifact/c0af9545-8a29-40b9-a787-2f33d8835082
**Prototype source:** `<scratchpad>/dock-options.html`. **All of this is now IN `src/`.**

**The measured geometry, already ported to `theme.css`:**
  · dock **100px** wide (was 118) · collapsed circle still **56px**, inset 22px each side
  · cells **44 x 44 square**, `gap: 4px` on BOTH axes → pitch 48px in both directions
  · `--cap` on the grid = `rows*44 + (rows-1)*4 + 8`, set from the row count. **This is
    load-bearing**: 1fr rows stretch to fill a tall screen, which silently un-squares the cells
    and undoes the whole change. Cap it or lose it.
  · one column (<=10 tabs): pod stays **64px**, cells **56 square** — no horizontal neighbour to
    be even with, so it matches the collapsed circle instead
  · labels: col-1 `left: calc(200% + 8px)`, col-2 `calc(100% + 4px)`, foot `calc(100% + 22px)`,
    one-column `calc(100% + 4px)`. Measured: col-1 clears col-2 by 26px, nothing clipped.
  · Label B plate: rests at `translate(-22px,-50%)` opacity 0 → slides RIGHT to `0`. Enter
    `opacity 300ms / transform 520ms var(--ease)`; exit stays `180/240ms`. Gap 22px = the travel.
**✅ ALL PORTED AND COMMITTED.** The `overflow-hidden` bug below was the first thing fixed.

**Where the shell's design lives — check here before grepping:**

| What | File | The rule that matters |
|---|---|---|
| Dock geometry, glass, label | `src/styles/theme.css` | the two `@media (min-width: 1024px)` blocks |
| Header band + ghost + clock chip | `src/styles/theme.css` | `.kpm-topbar`, `.kpm-topbar-ghost`, `.kpm-chip.kpm-clock` |
| **The ground, scrollbar, caret, selection** | **`src/index.css`** | **newly audited — slate hid here for months** |
| Rail markup, `--cap`, `is-two`, logout | `src/components/BiohazardTheme.jsx` | the `kpm-rail-grid` nav and the foot |
| Every trap above, as a check | `src/config/integration.audit.mjs` | group G25 |
| **Biometric / passkeys** | `src/App.jsx` :1107 register · :1157 unlock | **`rp.id = window.location.hostname`** — a passkey is locked to the host it was made on, so it is Vercel-only. Not a Firebase problem. |

**HIS LOCKED DECISIONS — already built; listed so they are never re-asked:**
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

✅ **All three of the "still unfixed" bugs this block used to list are FIXED and are checks now**
(the grid's `overflow-hidden` erasing the hover label, `transition-all` beating the stylesheet, and
`.hot` leaking a fingertip affordance onto the desk). Column-1 labels sit at `calc(200% + 8px)`.

### ⤵ Earlier 2026-08-14 entries trimmed (17:45, 14:40, 13:55, 13:20, 12:40, 11:43, 11:20)

Every one is a step toward the dock that has now SHIPPED, so they describe a state that no longer
exists. `git log --oneline` names them; `A-Brain/Archive/PROGRESS-archive-2026-08-14.md` and
`A-Brain/Wiki/Log.md` hold the reasoning. Four findings from that stretch outlived their entries
and are stated above or encoded as checks:
- **`.kpm-rail-pod > *` scores as ONE class** — the universal selector contributes nothing — so it
  tied with an inline `<style>`'s `.boot-3` and lost on order. **A filled (`forwards`) animation
  also outranks every normal declaration**, so `opacity: 0` could not hold it either. The
  `[data-kpm-rail] ` prefix makes it two. The header lost the identical fight to `lg:px-8`.
- **A mock verifies nothing it does not contain, and a measurement taken mid-animation is a guess.**
  The harness was missing the component's own inline `<style>` and was read before the 0.25s delay.
- **The longest tab name clears the panel edge by 21px** — a longer one is sliced off silently, so
  names are capped at 27 chars.
- **On-disk skills in `~/.claude/skills/` are a different thing from what `ListSkills` reports**
  (that is the claude.ai registry). "A skill is unavailable" is a fact about one session, never
  about the machine.

Full record of the sidebar work: `A-Brain/Backlog/PC sidebar hover-expand and top panel redesign.md`.

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

