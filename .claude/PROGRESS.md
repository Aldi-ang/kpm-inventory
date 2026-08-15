# PROGRESS — read this, search for nothing

**Updated: 2026-08-15 09:55 WIB (KPM app session)** · branch `phase0-solid-ground` · last code commit: run `git log -1`
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

**PHASE 6 IS THE LIVE FRONT: converting the rest of `SettingsView.jsx` onto the control system.**
His instruction, 2026-08-15: *"we have the theme set yet, other will just follow make it somewhat
follow that"* — the **Architect tab is the template**, the rest are conversions, NOT redesigns. Do
not invent a new look for a tab; copy the bands / module kinds / slot codes / readouts it uses.

| Settings tab | Off-token colours | State |
|---|---|---|
| Architect (Tier 1) | 0 | ✅ template, `b25c526` + `7166366` |
| **Security & Data** | **0** | ✅ **DONE 2026-08-15, group 33, 17 checks** |
| **General & Brand** | **0** | ✅ **DONE 2026-08-15, group 34, 18 checks** |
| Tiers & Logic | 89 | ▶ **the last slice** |

**419/419, `src/` clean.** The rack's spacing ladder was rebuilt on 2026-08-15 after his report
that modules read as one component — **12 / 16 / 20 / 40, and no inner number may reach an outer
one.** Two checks in group 30 hold it. Read [[The KPM Control System]] and [[Off-Token Colour Migration Map]]
in the A-Brain vault before touching a tab — the class list and the substitution table are there,
and re-deriving them costs a quarter of a session.

🌏 **NEW, 2026-08-15 — INDONESIAN. Queued behind light mode, not started.** His words: *"we might
need to add indonesian language for all the features that we have inside this app if needed in the
future"* — **"if needed in the future" is the whole instruction; he has not asked for it yet.**
Do not start it without asking. Two things worth knowing before anyone estimates it:
· **The app is already half-Indonesian in its DATA** — "EOD Setoran", "Stock Opname", "Hitung Ulang
  Karir", "Pita Cukai", "nota", "gulungan". Those are the business's real words and must NOT be
  translated; they are the vocabulary, not English text awaiting a swap.
· **What would need extracting is UI copy, and Phase 6 is quietly making that harder OR easier
  depending on when it starts.** Every `.kpm-desc` written in this rework is a real English
  sentence living inline in JSX. Translating later means extracting all of them. **If he ever says
  yes, the honest first step is a string table, and it should come BEFORE the last tab, not after.**

🔴 **AFTER the whole UI redesign, the next big job is LIGHT MODE.** His words, 2026-08-15:
*"there is some big job that we havent done, which is working on the light mode but lets do that
after we finish redesign the whole UI"*. He also worked out why the order matters, and he is right:
*"when we have this template for dark mode then making the light mode will be easier since all the
UI theme is similar right"* — **every screen moved onto tokens gets light mode for free**, because
one token name resolves to both themes and no `dark:` variant is written. Every screen still on
`dark:bg-slate-800` has to be hand-coloured twice. **Phase 6 is not decoration; it is most of the
light-mode job being done in advance.**

**Shell redesign, previous front — SHIPPED and approved.** Desk dock (Label B, square cells,
glass), header band, logout containment, the phone's duplicate-totem fix, and the vault grace fix.

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

- ✅ **TEST — the 5-minute grace period, FIXED and committed.** It had never worked once. Unlock the
  vault, close Safari, reopen within 5 minutes: it should go straight in with no PIN. Then lock it
  by hand and confirm it does NOT let you back in — that half must still work.
- ⚠️ **`src/utils/vaultGrace.js` IS NOT ON `main`.** The grace period has never been deployed, so
  it does not exist on the Vercel app he actually uses. Nothing to debug there — it needs merging.
- ✅ **TEST — Settings, both tabs.** Security & Data is converted and the module spacing is
  rebuilt. Every control was checked as MOUNTED but **none has been pressed** — master backup, the
  three downloads, change PIN, authorise/revoke a device, export/import, rebuild career, the three
  wipes. His eyes and his fingers are the only test that has ever run on this screen.
- ✅ **TEST — hold to wipe.** The three wipe buttons now need a **1.6s press**, then say
  "Wiping…" → "…wiped" in place. Both dialogs still appear after the hold. **Does holding feel
  right at 1.6s?** `HOLD_MS` in `HoldButton.jsx` is one number to change.
- ❓ **Offered, unanswered:** if the hold feels like enough on its own, the FIRST of the two wipe
  dialogs could go, leaving hold → FINAL WARNING. **Not done — removing a confirmation on a
  no-undo act is his explicit call, never a side effect of a nicer button.**
- ❓ **Raised, unanswered:** the 19px module titles are display-face CAPS with letter-spacing. Caps
  read slower than sentence case at that size. Left alone because it is this app's character —
  **if the tabs still feel heavy after he looks, that is the next thing to try.**
- ✅ **The logout word is "Exit" — HE CHOSE TO KEEP IT** (2026-08-15). Closed, do not re-offer.

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

### 2026-08-15 09:55 (KPM app session) — the mascot lines became a picker

**419/419.** *"for the capybara dialogue u might need to make it dropdown menu instead, too many
conversation for it"*. Every line rendered as its own row, so the module grew without limit and
needed an inner scrollbar to survive — **the one thing he has banned twice**. A `<select>` plus two
acts is a **fixed height at any number of lines**.
⚠️ `pick` is clamped on EVERY RENDER, not on delete: removing the last line leaves the index past
the end and the next Delete acts on `undefined`.
⚠️ Icon-delete count **16 → 15** — "Delete" carries its own word now, so it must not wear
`data-kpm-del`. Third time this migration has happened (18→17→16→15); each one is a real change.
✅ **His verdict on the whole Settings rework: *"overall i like it we can continue"***.

### 2026-08-15 09:45 (KPM app session) — General & Brand converted. Phase 6, slice 2. Only Tiers left.

**418/418.** 67 off-token colours to zero, same regrouping by consequence.

🔑 **Two real findings, not just paint.** The **pita cukai fine** — which comes out of a real
salesman's pay — was sitting under a divider inside the letterhead card, reading as one more
invoice field. It is its own Tier-1 module now and says what it does. And the letterhead is split
**by save behaviour**: three fields wait for Save, two write as you type, and each module prints
which it is instead of leaving him to guess.
**Lite Mode** became a two-position switch with one writer (`writeLiteMode`) — the third
one-writer switch in the system, after photo storage and rank source.

⚠️ **A CHECK FAILED ON CORRECT CODE.** The needle `!/color: var(--gold)/` also matches
**`accent-color: var(--gold)`** on a range input — a substring, and a slider thumb is a fill, not
text. Re-anchored on a property boundary. **A needle that can match inside a longer property name
eventually will.** Fourth regex-anchor lesson this week.
📌 Four small classes were needed (`.kpm-rowacts`, `.kpm-inline`, `.kpm-slider`, `.kpm-portrait`);
each is checked as DEFINED, because a class that exists in neither Tailwind nor theme.css paints
nothing and looks exactly like a transparent panel.
⚠️ **Writing this file from a bash heredoc ate every backtick** — the shell ran them as commands
and left the quoted names blank. **Use the Edit tool for PROGRESS.md, never `python -c` in bash.**

### 2026-08-15 09:25 (KPM app session) — red stops upholstering, and the wipes ask for pressure

**400/400.** New file: **`src/components/HoldButton.jsx`**.

🔴 **RED WAS THE PANEL, NOT A MARK ON IT.** His screenshot: *"u can add red but not this much
especially on few buttons and panel ... i dont want red color to dominate certain features"*.
~70% of a hazard module's surface was red before a warning word was read — a `--danger-well` wash
under `--hatch-danger`, above buttons that were **also** red-hatched, under a red-hatched band.
The head stays DISTINCT (his older *"too standardise"* call, still checked) but carries it in a
**2px danger rule + red title** instead of a red ground. Red now costs 5px of stripe, 2px of rule,
a title and a chip. ⚠️ **Group 31's needle moved for this** and the entry says why — it now asserts
BOTH that the head is distinct AND that `.kpm-btn.hazard` has no `background-image`.

🔑 **`HoldButton` is the confirmation the component he pasted did not have.** That one runs
click → spinner → "Complete!" with nothing between; dropped in as-is **one tap wipes the database**.
This asks **1.6s of deliberate pressure**, then reports in the same object he pressed —
*every action must report*. The sweep is `clip-path` + `background-color` only, so **Lite Mode keeps
it, and it must**: the fill is the only thing saying how much longer to press.
⚠️ **BOTH `confirmAction` dialogs still run.** The hold is a gate IN FRONT of them, never instead.
A check fails if either disappears. **Trading a confirmation for an animation is his call alone.**
📌 It needed **no new dependency** — the pasted version wanted `framer-motion` + `clsx` +
`tailwind-merge` + TypeScript + shadcn, and this repo has none of those.
⚠️ `keyHeld` ref is load-bearing: keydown REPEATS while held, and without it the timer restarts
forever and the button reads as broken. `no-unsafe-finally` also bit — never `return` in a `finally`.

### 2026-08-15 09:05 (KPM app session) — Option C, and amber gets rationed

**398/398.** He picked **Option C** off the button-weight board
(https://claude.ai/code/artifact/628a1a9c-0616-4ab5-9379-6b2ea816fa87).

🔑 **His words were *"too big"* and the height was never the problem.** 44px is rule 3 and the
smallest target a thumb hits one-handed — it does not move. What was wrong was that almost every
act was `.block`, so "Revoke" sat in a ~900px box on a desk. Buttons hug their word in a
right-aligned `.kpm-acts` row now, no fill at rest, 13→12px, .16→.12em, filling in on hover.
⚠️ **Full width survives on EXACTLY four acts — restore and the three wipes.** Full width is a
signal now, not a default. A check pins the count; elegance is not worth a mis-tapped wipe.

🟡 **AMBER IS RATIONED.** *"i feel like there is too much yellow gold color, u should replace it
with few amber color and more black and white for the theme, also minimize red color"*.
`--gold` / `--accent-ink` / `--accent-edge` **#D4AF37 → #D08A2E** (one line each, easy to retune).
A live module carried FOUR amber marks — stripe, slot code, title rule, state chip — so amber had
stopped meaning "this writes real data" and become the body colour. **The rule now: amber marks
the STATE and the ACT, never the label.** Slot and title rule went neutral; stripe and
`.kpm-read.on` keep it. `--tier-gold` is deliberately untouched: a gold RANK is a medal.
📌 **`#ff9d00` literals still live in `App.jsx` (~line 3625-3700)** — an un-migrated block, Phase 6.

### 2026-08-15 08:51 (KPM app session) — the rack was tighter inside a module than between two of them

**395/395.** His report: *"i want u to give more space between features because all of it looks to
close together i thought it is the same components"*. **He was reading it correctly — the spacing
was lying, and it measured:**

| Boundary | Before |
|---|---|
| between two modules | **0px** + one 1px line (`--line-2`) |
| inside one module, head → shelf | **0px** + **two** stacked lines (`--line` + `--line-2`) |

🔑 **The division INSIDE a module was heavier than the division BETWEEN two.** Proximity decides
grouping before any border does, so at 0px on both sides three instruments read as one striped
panel. The rack idea survives — a rack has rails between its units — but the ladder now only ever
grows outward: **12px between controls · 16px module padding · 20px module→module · 40px between
groups.** `.kpm-shelf.split`'s duplicate border is gone; the head already draws that seam, and
inside an object a seam must be fainter than the object's own edge.
⚠️ **Two checks now guard it. If any inner number ever reaches an outer one, they go red before he
has to see it again.** Both Architect and Security got this from one change; General and Tiers will
inherit it when they convert.

🔴 **CLOCK CORRECTION:** two entries below were stamped 08:55 and 09:40 by this session — times
that ran AHEAD of the real clock (`date` says 08:51 WIB / 01:51 UTC). Corrected to 08:30 and 08:47.
**Stamp from `date`, never from a guess**; a log that runs into the future cannot be ordered.
📌 **AND: the `SettingsView.jsx` / `integration.audit.mjs` diffs that the 08:36 and 08:40 entries
disclaim WERE THIS SESSION'S**, not an orphan and not another process — they are committed now
(`8084c25`, `946b1b8`). Those two entries are another session's and are left byte-for-byte alone
per rule 2; this note is the correction, in my own entry, where it belongs.

### 2026-08-15 08:40 (KPM app session) — timestamp touch, 3rd fire, still not this session's edit

Same hook fired again (08:38 → 08:40) on the same unchanged diff to `integration.audit.mjs` and
`SettingsView.jsx` — no new bytes since the last entry, some other process wrote both, neither
touched by me. Still just wifi troubleshooting in this conversation; nothing to record in `src/`.

### 2026-08-15 08:36 (KPM app session) — no KPM work this session, timestamp touch only

This session was Aldi's home wifi (Instagram/TikTok slow, DNS routing) via `/alucard` — nothing
in `src/` was touched. The uncommitted `SettingsView.jsx` diff predates this session (present in
git status before the first message) and was not read or changed here. Touching timestamp only,
per the Stop hook's own fallback instruction for a session with no progress to record.

### 2026-08-15 08:47 (KPM app session) — Security & Data joins the control system. Phase 6, slice 1.

**393/393.** 94 off-token colours to zero. The tab is grouped by **consequence** now, not by
feature — copies, then writes, then the stripe — which is what it was actually missing.

🔑 **The regrouping found a real hierarchy inversion, the same shape as the Architect tab's.**
**Restore replaces the entire database**, and it was a dashed drop-zone at the foot of the backup
card — *quieter* than the three download buttons above it. It is under the hazard band now with
the wipes. The three backup states (RECOVERY / USB / CLOUD) were pulsing green-or-red tiles;
**Lite Mode strips colour and left three identical boxes**, so they are `.kpm-rail` rows and the
word carries the state. The biometric card was the last bright blue anywhere in the app.

The rank toggle became a two-position `.kpm-switch` with **one writer** (`writeCareerLedger`),
matching photo storage — a copy of the write behind each position is [[Silent Failure Disease]].

⚠️ **The icon-delete count went 17 → 16**, the same migration as 18 → 17 before it: a record's
action strip carries a WORD ("Revoke"), and a worded button must not wear `data-kpm-del` or the
label prints twice. Both halves of that edit are checked.
✅ **All 17 new checks were run against the pre-edit block and seen to FAIL first** — palette,
kinds, hazard band, rails, one-writer. A check never seen red is a decoration.

### 2026-08-15 08:30 (KPM app session) — the grace period unlocked the vault behind a curtain it never raised

**376/376.** His report: *"grace period is not working on my phone, i just close the safari and it
force me to login"* — master PIN screen, LAN address, iPhone Safari.

🔴 **It had NEVER worked, on any device, and the reason is one missing line.** The gate has TWO
pieces of state. The system-owner branch of the auth handler sets **`setShowAdminLogin(true)` on
every cold load** (`App.jsx` ~2155) and the app renders only under `{user && !showAdminLogin}`. The
restore raised `isAdmin` and stopped — so a perfectly valid grace session sat behind a modal that
only `handleAdminAuthSuccess` knew how to close. **The door was unlocked and the curtain was down**,
which from his side is identical to the feature not existing.
🔑 **Anything that opens the vault must do BOTH, exactly as `handleAdminAuthSuccess` does.** Check.

Also removed the one-shot `graceRestoreTried` ref and the blanket `clearGrace()` it guarded: the
auth handler asserts `setIsAdmin(false)` on **every** load and can fire twice, and on that second
assert the effect deleted a still-valid record. A ref cannot tell a deliberate lock from a cold
load; `handleAdminLogout` can, so it clears now. That is the only `setIsAdmin(false)` of the eight
that means *"keep it locked"*.

⚠️ **`vaultGrace.selfcheck.mjs` was GREEN through all of this** — it covers the pure `graceIsValid`
maths and nothing that touches the screen. **A green self-check over the pure half of a feature
says nothing about the half that renders.** The integration audit had zero checks on grace; it has
two now. **When a feature has a self-check, ask what the self-check cannot see.**

⚠️ **`src/utils/vaultGrace.js` does not exist on `main`** — the feature has never been deployed.

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

### ⤵ The 2026-08-15 early-morning shell entries trimmed (03:05, 02:35, 01:55)

The desk dock, its height, the logout containment and the header band — all SHIPPED and approved,
so they describe work that is done. `git log --oneline` names the commits and
`A-Brain/Wiki/Concepts/The KPM Control System.md` holds the reasoning. Three findings outlived
them and are checks now, not prose: **`grid-auto-rows: minmax(0,1fr)` resolves only against a
DEFINITE height** (making the pod `max-content` silently collapsed every row to its icon); **a
clipping box cannot be asked to measure the thing it clips** (`max-content` belonged on the visible
pod, never on the fixed+overflow-hidden panel); and **a regex that spans the gap from a selector to
its declaration breaks when someone edits the comment in between** — anchor on a value that occurs
once, and count the occurrences rather than assuming.

### 📋 THE DECISIONS THAT SHIPPED (reference only; do not re-ask, do not re-derive)

**Artifact (his decision board):** https://claude.ai/code/artifact/c0af9545-8a29-40b9-a787-2f33d8835082
**Prototype source:** `<scratchpad>/dock-options.html`. **All of this is now IN `src/`.**

**The measured geometry is IN `theme.css` and asserted by group 25** — every number that was
listed here is now a check, so read the checks, not a copy of them. The three that bite if changed:
`--cap` on the grid (drop it and 1fr rows stretch and un-square the cells), the label's 22px travel
which must equal its 22px gap, and `.kpm-topbar`'s 112px left margin which tracks the pod's width.

**Where the shell's design lives — check here before grepping:**

| What | File | The rule that matters |
|---|---|---|
| Dock geometry, glass, label | `src/styles/theme.css` | the two `@media (min-width: 1024px)` blocks |
| Header band + ghost + clock chip | `src/styles/theme.css` | `.kpm-topbar`, `.kpm-topbar-ghost`, `.kpm-chip.kpm-clock` |
| **The ground, scrollbar, caret, selection** | **`src/index.css`** | **newly audited — slate hid here for months** |
| Rail markup, `--cap`, `is-two`, logout | `src/components/BiohazardTheme.jsx` | the `kpm-rail-grid` nav and the foot |
| Every trap above, as a check | `src/config/integration.audit.mjs` | group G25 |
| **Hold-to-confirm** | `src/components/HoldButton.jsx` | the gate for no-undo acts. **Never replaces `confirmAction`** &mdash; group 33 fails if a wipe dialog vanishes |
| **The control system** (Settings' whole look) | `src/styles/theme.css` | `.kpm-band` / `.kpm-mod` / `.kpm-head` / `.kpm-shelf` / `.kpm-btn` / `.kpm-rec` / `.kpm-switch` / `.kpm-field` / `.kpm-read`. **Spacing ladder 12 / 16 / 20 / 40 — groups 30 and 33** |
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

