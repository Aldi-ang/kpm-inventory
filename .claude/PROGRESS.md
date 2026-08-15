# PROGRESS — read this, search for nothing

**Updated: 2026-08-15 22:41 WIB (KPM app session)** · branch `phase0-solid-ground` · last code commit: run `git log -1`
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

**🔴 LIGHT MODE IS THE LIVE FRONT, AND IT IS NOW ACTUALLY ON.** Phase 6 is complete; the switch
bug is fixed (group 38) and the sales terminal is converted as his chosen pilot (group 39).
**526/526 · `node src/config/contrast.selfcheck.mjs` must also pass — it measures both themes.**

**▶ NEXT: the other 29 screens.** He has seen ONE converted screen. Ranked by hardcoded colour
count in the earlier survey below: `MapMissionControl` · `CustomerManager` · `FleetCanvasManager` ·
`JourneyView` · `StockOpnameView` · `ConsignmentFinanceView` · `SamplingManager` ·
`RestockVaultView` · `EODReconciliationView` · `AgentProfileView` · `App.jsx`.
⚠️ **Do not repeat the terminal's two mistakes:** sweep colour NAMES as well as hexes, and check
HUE separation against the ground, not only contrast. Both are written up in the log entry below
and in [[The KPM Control System]] in the vault.

### 🔴 SETTINGS IN LIGHT MODE — *"the settingview still looks unclear"*. FIXED, 527/527

**It was not the text. Every ink/surface pair in the control system already passed.** A scan of
`theme.css` — pairing each rule's `color:` with the background of its nearest ancestor selector —
found only one real text failure. The cause was **STATE, not text**:

⚠️ **A GOLD PLATE STOOD OFF THE PANEL AT 6,61:1 IN DARK AND 1,61:1 IN LIGHT.** Gold is the app's
only accent and it marks every ON there is — a live readout, the chosen side of a switch, a filled
toggle. In light they were all dissolving into the surface behind them. **Nothing was watching for
it, because every check asked "can this text be read" and none asked "can this state be seen".**
The old comment on the light `--gold` said it never has to darken *because it is never text* —
true, and exactly the wrong question.
**Light gold now inverts: a dark amber plate carrying pale ink** (4,13:1 on a panel, 3,12:1 on an
inset). `--knob-on` was added for the switch knob — pale in BOTH themes, dark value identical to
what it replaced — because a near-black knob on a dark track would have been invisible.
Also fixed: `.kpm-hold:hover` used the FILLED plate's pale ink while the plate is still clipped
away, so the word vanished under the pointer in light (1,60:1). And the matrix header's rank names
moved `--ink-muted` → `--ink` (4,23:1 on `--sunk`).
⚠️ **The knob-against-track ratio is deliberately NOT checked** — 2,25:1 in dark since he approved
it, because that switch carries its state by WHERE THE KNOB IS, which is also why it survives Lite
Mode. Asserting 3:1 there would fail a control that works.
**Residual 2, both understood:** `--ink-disabled` (WCAG-exempt) and `.kpm-hold[data-phase]`, where
the scan cannot see that `> .fill` has covered the button.

### ✅ THE APP SHELL IS ON THE LIGHT PALETTE TOO — 527/527, 137 sites in `App.jsx`

His screenshot, 2026-08-15: *"the panel inside is already on white mode, now u need to change the
outside panel as well, including the top panel, and left dashboard that shows 4 option"*.
**The shell was built in the SAME wood-and-brass language as the terminal**, hardcoded the same
way — so it converted onto the same `--duke-*` tokens with the same role-aware script, plus six
new `--shell-*` tokens for its cream labels and its orange. 110 hexes + 27 colour names.
⚠️ **Dark values are the exact hexes they replace, as before — dark mode has not moved.**

▶ **NOT DONE, and visible in light: `bg-white/5` ×15 and `border-white/10` ×8 in `App.jsx`.**
These are the glass/frost effects on the header band and the dock. A white veil over a DARK ground
is a highlight; over a pale ground it is nothing at all, so the glass simply stops reading in
light mode. They need a token pair like the wells did (`rgba(255,255,255,.05)` dark →
`rgba(46,38,26,.06)` light). **Straightforward, just not landed this session.**
▶ Also left: a handful of one-off hexes the map did not cover — `#8b5cf6` / `#ec4899` are the
Mythic rank frame and are ALLOWED by the palette law, so leave those.
⚠️ `npx eslint src/App.jsx` reports **51 pre-existing errors** — verified unchanged by stashing
this work and re-running. Not this session's, do not "fix" them inside a colour commit.

### Where things live

| File | What it owns |
|---|---|
| `src/styles/theme.css` | all tokens, both themes, + the `--duke-*` block for the terminal |
| `src/components/AuthoritySelect.jsx` | **NEW 2026-08-15** — the custom listbox in the permission matrix |
| `src/config/contrast.selfcheck.mjs` | measures every text/surface pair in BOTH themes |
| `src/config/integration.audit.mjs` | 526 checks; groups 38 (light switch) and 39 (Duke's Ledger) |
| `index.html` | the pre-paint theme stamp — must agree with `App.jsx`'s theme effect |

### Phase 6 — complete, kept for reference

| Settings tab | Off-token colours | State |
|---|---|---|
| Architect (Tier 1) | 0 | ✅ template, `b25c526` + `7166366` |
| **Security & Data** | **0** | ✅ **DONE 2026-08-15, group 33, 17 checks** |
| **General & Brand** | **0** | ✅ **DONE 2026-08-15, group 34, 18 checks** |
| **Tiers & Logic** | **0** | ✅ **DONE 2026-08-15, group 35, 21 checks, `50d2ea9`** |
| **`PermissionMatrixEditor`** | **0** | ✅ **DONE 2026-08-15, group 37, 19 checks, `8cb33c9`** |
| **Command Center chrome** | **0** | ✅ **DONE 2026-08-15, group 36, 12 checks, `6f29fda`** |

## 🎉 PHASE 6 IS COMPLETE. `SettingsView.jsx` IS FULLY ON THE CONTROL SYSTEM.

**LIGHT MODE IS NOW THE FRONT** — his stated order, and every screen converted above gets it
mostly free (one token name resolves to both themes; no `dark:` variant was written).

### 🔴 LIGHT MODE HAD NEVER ONCE BEEN TURNED ON — fixed 2026-08-15, group 38, 513/513

`App.jsx`'s theme effect ADDED `dark` and, for light, only REMOVED it. theme.css puts the dark
values on bare `:root` and the light values on `:root.light`, so **removing `dark` left every
token still holding its dark value.** Turning the switch off produced a hybrid nobody designed:
Tailwind's handful of `dark:` variants flipped to their light form while every surface, line and
ink stayed dark. The entire light palette — fully built, contrast-measured by
`contrast.selfcheck.mjs` — had never been on screen once.
Fixed with `classList.toggle('dark', darkMode)` + `classList.toggle('light', !darkMode)`, plus a
pre-paint stamp in `index.html` (React sets the class after mount, so a light-mode user watched a
dark load and a flip on every launch) and the `theme-color` meta so the phone's address bar
follows too. Five checks in group 38.
⚠️ **The failure had no symptom any CSS check could have caught** — both files were internally
consistent. What was missing was the class that joins them.

**▶ WHAT IS LEFT IS THE LONG TAIL, AND IT IS BIG: ~3.500 hardcoded colour utilities across 30
files** (`bg-slate-800`, `text-gray-400`, `bg-white` …) with **no light variant at all** — they
will look identical in both themes. Only 8 files use `dark:` at all. Measured counts, worst first:
`HistoryReportView` 480 · `MapMissionControl` 442 · `CustomerManager` 384 · `FleetCanvasManager`
380 · `JourneyView` 287 · `StockOpnameView` 271 · `ConsignmentFinanceView` 262 · `SamplingManager`
255 · `RestockVaultView` 193 · `EODReconciliationView` 164 · `MerchantSalesView` 139 ·
`AgentProfileView` 110 · `App.jsx` 109.
⚠️ **`HistoryReportView`'s count is misleading** — much of it is the printed nota, which is OUT of
scope and keeps KPM company blue. See [[project_kpm_receipt_is_company_theme]].
✅ **ORDER — HE CHOSE, 2026-08-15: the sales terminal first, as a pilot**, so he can look at one
fully converted screen before committing to thirty.

### 🔴 THE TERMINAL IS NOT A SLATE SCREEN — measured before touching it, 2026-08-15

The 139 Tailwind palette classes counted in `MerchantSalesView.jsx` are **almost all inside the
printed nota**, which is out of scope. The terminal's app UI is coloured by **465 HARDCODED HEX
LITERALS across 47 distinct colours** — `#3e3226` ×56, `#8b7256` ×51, `#ff9d00` ×49, `#d4af37`
×31, `#5c4b3a` ×26 … **That is the Duke's Ledger wood-and-brass identity**, which he designed,
integrated and hand-tested. It is not legacy slate awaiting a sweep.

**So "light mode for the terminal" means giving Duke's Ledger a light variant, NOT converting it
onto the app's steel/gold tokens.** Converting it would delete a look he approved.

Three things the next session must know before starting:

1. **~95 of the 465 are already system-token VALUES typed out as hex** — `#7a736a` = `--ink-dim`,
   `#e8e4de` = `--ink`, `#26231f` = `--line`, `#3e3a35` = `--line-2`, `#a39b90` = `--ink-muted`,
   `#57514a` = `--ink-disabled`, `#b4524a` = `--danger`, `#e08c82` = `--danger-ink`, `#1e1512` =
   `--danger-well`, `#8e4038` = `--danger-plate`, `#f7f2ee` = `--danger-plate-ink`. These need no
   new tokens and no design work — they already have correct light values. Do these first.
2. **THE REPLACEMENT MUST BE ROLE-AWARE, KEYED ON THE UTILITY PREFIX, NOT ON THE HEX.** `#ff9d00`
   appears as `bg-`, `from-`, `border-` AND `text-`. As a fill it can stay bright in light mode;
   as TEXT it must darken or it vanishes on pale wood — this is the `-ink` law that group 32
   already caught once. So `text-[#ff9d00]` → an `-ink` token, `bg-[#ff9d00]` → the fill token.
   One token per hex is WRONG here.
3. **DO NOT TOUCH:** `#ffffff` / `#000000` inside `.a4-print-jail` and the print `<style>` string
   (the nota), and `#25D366` (WhatsApp brand). Everything from the `print-modal-wrapper` line
   onward is mixed — the merchant bubble and the scrollbar there ARE app UI and do convert.

## ✅ THE LIGHT DUKE'S LEDGER IS BUILT — 524/524, contrast self-check passes

**467 sites converted, 54 new `--duke-*` tokens, group 39.** His answer on the near-identical
browns: *"keep them separate, must be difference for a reasons right"* — kept separate.

⚠️ **DARK MODE IS PROVEN UNCHANGED.** Every token's dark value is the exact hex it replaced; a
diff of all 465 arbitrary-value sites against `HEAD` before the change reported **0 mismatches**.
**He only has to test LIGHT mode.**

**The role split is the load-bearing idea and a later "tidy-up" will want to undo it.** One hex
served as a fill AND as text — `#ff9d00` is 24 text sites and 21 fill/edge sites. As a fill it
survives a pale ground; as text it does not. So tokens are named by ROLE (`-ink` / `-edge` /
fill), and a check now fails if an ink token is ever painted as a surface or vice versa.

**Two things the measurement caught that the eye did not:**
· The first light palette had **six failing pairs** — amber text 3,03:1, brass 3,60:1, red 4,32:1,
  three borders under 3:1. The whole surface ladder was lifted a step and the accent inks driven
  much darker than they "looked" right. **Gold and red in light mode, for the third time.**
· ⚠️ `contrast.selfcheck.mjs` read only the FIRST `:root` block — the new palette added a second
  one, so all 54 tokens would have gone unmeasured while it still printed *"all pairs pass"*.
  Fixed to read every block. **A measuring tool that quietly measures less than it claims.**

### 🔴 HIS THREE REPORTS ON THE FIRST LOOK — all fixed, 526/526

*"especially for numbers, like the price because it little bit dark"* · *"the customer textbox …
is very dark letter causing very hard to see"* · *"skt textbox also too dark"*.

**Two separate causes, and the second is the one worth remembering:**

1. **The bench was too dark, so every ink had to be too dark to clear it.** Lifting the nine
   surface values one step is what buys an ink its brightness back — the surfaces are the lever,
   not the inks. Prices additionally got `--duke-price-ink`, which sits in WCAG's **3:1** band,
   legitimate because those figures are large and black-weight. That band is the whole difference
   between a number that reads as amber and one that reads as brown. A check holds it to the
   large sites only.
2. ⚠️ **THE FIRST SWEEP REPLACED EVERY `#hex` AND WALKED PAST EVERY COLOUR NAME.** `bg-black` and
   `text-white` are not hexes. So the boxes he types into kept a **black ground** while the text
   in them flipped to dark ink — dark on black. **A palette sweep that covers only hexes converts
   exactly the half that makes the other half unreadable.** 34 more sites converted: wells, bars,
   scrims, badges, stages. `text-black` and `bg-white` are deliberately still allowed — black on
   an amber plate and black on a white field are correct in both themes.

⚠️ **A regression I caused and the diff caught, not the screen:** `--duke-price-ink` first carried
its LIGHT value in both blocks, which would have dulled two price figures in **dark** mode. The
multiset diff against the pre-change revision is the only thing that saw it.

🔴 **A REAL FINDING HE SHOULD DECIDE ON — the terminal's DARK contrast was already below target
in 13 pairs before any of this.** Not introduced here; these are the shipped values. The two that
are certainly real: the workhorse text `#8b7256` on a panel measures **3,52:1** (needs 4,5) and
the structural line `#3e3226` on a panel measures **1,28:1** (needs 3). The self-check now prints
these as `note`, not `FAIL` — fixing them means changing colours he hand-tested, which is his
call, not the checker's.

---

### (resolved) the near-identical browns
🔴 **DECISION HE OWES BEFORE THE SWEEP:** several wood tones differ by one or two channel steps
(`#2a231d` / `#2a2520` / `#2b2318` / `#2b2417`, one or two uses each). **Collapsing them** gives a
much smaller token set but means dark mode shifts imperceptibly — and he would have to re-test the
terminal in DARK as well, which he has already done once. **Keeping them distinct** guarantees
dark mode is byte-identical and only light mode needs testing, at the cost of ~23 wood tokens.
**Recommend keeping them distinct** — his testing time costs more than token names do.
✅ **TEST FIRST:** flip the theme switch. Login screen, app shell, dock, header and all of Settings
should go **steel grey (not white)**. Everything else will still be dark — that is expected and is
the list above, not a new bug.

**495/495, `src/` clean.** The rack's spacing ladder was rebuilt on 2026-08-15 after his report
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

- ✅ **ANSWERED AND DONE — *"fix the dark contrast"*, 527/527, contrast self-check passes in BOTH
  themes.** From **129 sites below target down to 52**, and of those 52 only **3 are genuinely
  short**. ⚠️ **The real work was finding out which pairs EXIST.** The 13 I had reported were from
  a hand-written pair list and several were pairings the screen never draws — a check that asserts
  an imaginary pairing is worse than none, because someone eventually "fixes" a colour that was
  fine. A scan now walks the JSX for every ink and the surface it actually sits under (nearest
  ancestor by indentation) and measures only what renders. `contrast.selfcheck.mjs` was rewritten
  from that scan and now ENFORCES dark as well as light.
  ⚠️ **`--duke-edge-1` was deliberately NOT raised.** A divider owes no contrast ratio; taking the
  terminal's seams to 3:1 would turn every one into a bright tan line and rebuild a look he signed
  off. Controls got their own `--duke-edge-ctl` (15 sites) — the edge of a box you type in is what
  actually owes 3:1.
  ⚠️ **Raising the wood inks broke them on the CREAM CARDS**, which are light in both themes. One
  token cannot serve a near-black ground and a near-white card: `--duke-on-paper`,
  `--duke-on-paper-dim`, `--duke-amber-on-paper`, `--duke-edge-on-paper` now exist for that.
- ✅ **ANSWERED AND DONE — the quiet text, `--ink-dim`.** His word: *"i dont know what is that
  problem u mentioned but if it needs fix then do it"*. **527/527, contrast passes in BOTH themes,
  terminal scan down to 18 sites from 129.**
  ⚠️ **"META TEXT ONLY" IS NOT A WCAG EXEMPTION, AND THAT COMMENT IS HOW IT SURVIVED.** The token
  carried `/* 4,0:1 — meta text only */`, which reads like a documented decision and is in fact a
  documented defect: a 10px label is small text and owes 4,5:1 like body copy. **89 uses across
  every screen**, so it was raised once at the source rather than worked around per-screen.
  Dark `#7A736A` → `#928B81`. ⚠️ **THE LIGHT THEME HAD THE SAME UNTESTED FAULT** — `#4E4A45`
  measured 3,76:1 on `--inset` and 4,07:1 on `--ground`; its claimed "5,0:1" had been taken against
  `--panel` alone, the easiest surface it lands on. Now `#3F3B36`. It sits close to `--ink-muted`
  in light and that is accepted, not missed: on a steel ground there is little room below muted
  before the floor, and dim-vs-muted is carried by size and weight anyway.
  ⚠️ **`--ink-disabled` was deliberately NOT raised.** WCAG exempts disabled controls; looking
  unavailable is the whole job. Its own rule — *never carries meaning alone* — is what makes that
  safe. It is excluded from the self-check on purpose, with the reason written beside it.
  **Residual 18 sites, all understood:** 13 scan artifacts (a base text colour paired with the
  opposite branch of a conditional, or a background painted by a CSS class the scan cannot see —
  each spot-checked by hand), 2 `--ink-disabled` (exempt), and 3 near misses on his signature amber
  (3,99:1 on a mid plank ×2, 4,07:1 on brass ×1) which cannot be fixed without changing the amber.
- 🔴 **OPEN, OFFERED 2026-08-15 20:46 — the price PLATE.** Told him plainly: *a bright amber can
  never be readable as text on a pale ground* — which is why the app's own palette law says gold is
  decoration, not text. If the price still does not pop for him in light mode, the real answer is a
  plate (dark number on a small amber chip), which is a LAYOUT change, not a colour one. **Offered,
  not started.**
- ✅ **TEST — the light terminal, his own list, 5 items.** Price reads burnt orange with no fuzzy
  edge · "Rp 17.400" the same · "CELLO TEH MANIS" reads clearly RED not brown · the customer name,
  SKT, and Search Wares boxes have dark letters on a pale field · **dark mode looks exactly as it
  always did** (that last one is proven by diff, but his eyes are the only appearance test that
  has ever run here).

- ✅ **1. THE DUPLICATE "Global (default)" IS FIXED — 498/498, group 37 + 3 checks.** His find:
  *"there is 2 default here"*. Cause: `getCustomerAccessLevel()` (permissions.js:120) returns
  `'global'` when it finds none of the three customer-edit perms, so **"never set" and "Global" are
  ONE state wearing two names** — and the `none` line could never be chosen, because selecting it
  produced the other one. **Fixed on the READ side, not the menu:** both selects now fall back to
  `|| 'customers_edit_global'`, so an unset tier lands on the Global line; then the `none` option
  was removed. Deleting the option alone would have blanked the control for every unset tier.
  ⚠️ **Reporting authority was NOT the same shape** — the earlier note guessed wrong. Its `none`
  really means no access (`changeReportAccess` clears the perm and nothing defaults it back), so
  its "No Access" option stays, and a check now holds that line.
  ✅ **TEST:** Settings → Tiers & Logic → the matrix. Customer directory access should show ONE
  "Global" line, on both the phone list and the desktop grid, and every tier should show a filled
  box — never an empty one. Set one tier to Own Region, Deploy, reopen: it must still read Own Region.
- ✅ **2. THE DROPDOWN IS REDESIGNED AND ANIMATED — 508/508, `src/components/AuthoritySelect.jsx`.**
  A native `<select>` draws its open list in the OPERATING SYSTEM, out of CSS's reach, so this had
  to become a real component. Trigger keeps `.kpm-inline` (every matrix size rule still applies);
  `.kpm-pick` + `.kpm-picklist` in theme.css. Amber fill + a tick mark the saved choice, a rail
  marks the arrow-key cursor, chevron flips, list scales in from the trigger's edge at 160ms.
  ⚠️ **The list is portalled to `<body>` and `position: fixed`** — the desktop matrix sits inside
  `overflow-x: auto`, which would have CLIPPED an in-place popup. The price is it must close on
  any scroll or resize; both are checked.
  ⚠️ **Both views now read ONE options list each** (`CUSTOMER_ACCESS_OPTIONS` /
  `REPORT_ACCESS_OPTIONS`). Two copies of the wording is how the duplicate above was born.
  Keyboard: arrows, Home/End, Enter/Space, Escape, Tab, type-ahead. Focus never leaves the
  trigger (`role="combobox"` + `aria-activedescendant`), so it cannot trap a keyboard.
  ✅ **TEST — this component has never been rendered on this machine.** Open Settings → Tiers &
  Logic → the matrix. On both the phone list AND the desktop grid: click a dropdown, it should
  open **downward, hugging the control, not clipped by the edge of the grid**; the current choice
  carries a tick and an amber bar. Arrow keys should move a marker, Enter should pick, Escape
  should cancel with no change. Scroll the grid sideways with one open — it should CLOSE, not
  float. Then Deploy and reopen to confirm the choice stuck.

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
- ✅ **TEST — THE MATRIX DENSITY, THIRD PASS (`9c9f561`, 495/495).** His screenshot: *"there is
  so much space bro … make the space more even between the buttons and description"* + *"feature
  modul and its tier is too far from each other causing the textbox on the bottom collapse with
  each other"*. **This one still needs his eyes — it was adjusted three times from screenshots.**
  Row 56→40px (4px padding round a 32px control + `line-height: 1.15`); description column
  42%→30%; and 🔴 **the two authority dropdowns were OVERLAPPING** — a `<select>` with no width
  sizes to its LONGEST OPTION, and under `table-layout: fixed` the column cannot grow, so it
  spilled over its neighbour. `width: 100%` **plus `min-width: 0`** — width alone still loses to
  the intrinsic minimum, which is the part worth remembering.
- ✅ **TEST — THE MATRIX NO LONGER SLIDES SIDEWAYS (`6acbe3a`, 493/493).** He asked twice:
  *"i dont want to slide the matric panel left and right"* then *"if possible eliminates side
  slide especially when we have 5 tiers only"*.
  🔴 **NARROWING COLUMNS COULD NEVER HAVE FIXED IT** — a width FLOOR of any size (800px, then
  560px) still overflows once there are enough ranks. The answer had to stop being a smaller
  number and become **no number**: `table-layout: fixed` + `width: 100%` divides the space the
  table HAS instead of measuring what its content wants. Feature column 42%, ranks split the rest.
  At 5 ranks that is ~90px a column against the ~52px a switch needs. Comfortable to ~a dozen
  ranks at 1024px; `overflow-x` remains only as a net.
  ⚠️ **The check asserts the ABSENCE of a `min-width` floor** as well as the fixed layout —
  re-adding one silently restores the drag, which is how it came back the first time.
- ✅ **TEST — THE SWITCH GLOW (`e4b9d95`).** *"yeah of course do use the shadow for normal
  mode"*. Amber halo on the ON knob. **Nothing was written to keep it out of Lite Mode** —
  `html.lite-mode *::after` already forces `box-shadow: none !important`.
  ⚠️ **THE RULE THAT MAKES THIS SAFE, and it is the one to remember:** the glow is DECORATION.
  Position + amber fill already carry the state twice over, so Lite Mode dropping the halo costs
  atmosphere and no meaning. The emerald toggles it replaced were the opposite — the glow WAS the
  state — which is what made the grid unreadable. **Never let a shadow become load-bearing.**
  The system-wide "nothing depends on a shadow" check now carries ONE named-selector exemption,
  not a relaxed pattern. It also now strips `transition:` declarations before testing — a
  transition list paints nothing, and leaving them in produced a false positive whose obvious
  "fix" would have been widening the exemption until the check meant nothing.
- ✅ **TEST — THE MATRIX SWITCH, SECOND PASS (`857ea97`, 493/493).** *"it look so kaku and the
  motion and the color is not good enough"* + *"too big and too much space between each tiers"*.
  🔴 **HALF THE STIFFNESS WAS A REAL BUG:** the press animated `width`/`height`/`margin-top` —
  three LAYOUT properties, so every frame re-ran layout instead of riding the compositor. **Only
  transform and opacity belong in an animation.** Press is a `scale(.92)` now. A check forbids it
  coming back.
  The other half was two motion calls: the colour **cross-faded** through a muddy middle (now
  `clip-path` wipes it from the left so the amber arrives WITH the knob), and the knob **stopped
  dead** (now overshoots ~6% and settles; fill is 20ms faster so it is already there on landing).
  Size: cell padding 12→6px, toggle floor 44→40px (**scoped to this grid — it is `hidden lg:block`
  so it never sees a thumb**), table floor 800→560px, switch 52×26→40×20. Column ~68→~52px.
- ✅ **TEST — THE MATRIX TOGGLES ARE A REAL SWITCH NOW (`912796b`, 490/490).** Built from the
  video he recorded: *"i want u to make the toggle button for the matric to be like this video,
  amber suit our system well so use it on this button as well"*. Amber filled pill, knob **taller
  than its track and proud of both ends** (32 in a 26, travelling 24) — that overhang is the
  detail that makes it read as a switch and not a coloured bar.
  🔑 **It replaced two swapped lucide glyphs, and that is the real upgrade** — two different
  icons cannot slide, so the old control had nothing but colour to say which way it was set.
  ⚠️ **The glow behind the knob in his video is DELIBERATELY absent** — it is a shadow, Lite Mode
  strips it, and a glowing "allowed" is exactly what made this grid unreadable an hour earlier.
  Position carries the state; amber is decoration on top of it.
- ✅ **TEST — THE SIDEBAR, and it is the one most likely to still be wrong (`8a3d94d`, 489/489).**
  His report: *"when i hover the sidebar, and release it, the sidebar will remain open and i cant
  press any button on the features panel"* + *"i want the features to be use able even when the
  sidebar is open"* + *"smoothen the autoclose mechanic"*.
  🔑 **CAUSE 1 — `:focus-within` matches ANY focus, and a MOUSE CLICK on a nav mark focuses it.**
  The dock was pinned open by the focus its own click had put inside it. Now `:has(:focus-visible)`
  — keyboard-only. **All five rules in that pair were switched together**; leaving one behind
  draws the capsule open inside a panel that has already closed.
  🔑 **CAUSE 2 — events belonged to the PANEL (351px), not the capsule (100px).** The other 251px
  is label room, so an open dock laid an invisible sheet over a third of the workspace. Events are
  on `.kpm-rail-pod` now **and only while open** — at rest the pod is still 100px with children at
  `opacity: 0`, so unconditional events would make invisible buttons hittable.
  Autoclose: open instant, close 220ms delay then 380ms.
  ✅ **Also test the keyboard**: Tab into the dock — it must still open and stay open.
- ✅ **TEST — THE CUSTOMER TIER PANEL, now one line per rank (`8a3d94d`).** *"too large, better
  redesign it to make it smaller compact minimalistic"*. Badge · colour · name · kind on one
  wrapping row; labels said once in the caption. Delete went back to the icon + hover-sweep (a
  one-line row has no room for a word), so **group 25's count went UP for the first time, 13→14**.
- ✅ **TEST — THE PERMISSION MATRIX (`8cb33c9`, 488/488, group 37).** *"then we can move on with
  the matrix"*. **Test BOTH views** — the phone rank-picker strip and the wide-screen grid,
  including **dragging a column header to reorder ranks**, rename, add, delete, and both authority
  dropdowns. Nothing here has been pressed.
  🔑 **THE REAL BUG WAS NOT COLOUR: every ALLOWED permission was emerald with a `drop-shadow`
  glow, and Lite Mode strips shadow AND colour — so in Lite Mode allowed and blocked were the
  same glyph in the same colour.** An authority grid that cannot be read. ON is an inset well
  with an amber mark now: material first.
  Rank names came from a raw Tailwind class stored as **data**, which is how purple/yellow/cyan/
  emerald labels were on screen at once **without ever appearing in a className** — invisible to
  every palette check. Field removed with its render.
  ⚠️ **TWO NEEDLE LESSONS, both from this commit:** `type="button"` written BEFORE `data-kpm-del`
  silently unmarks a delete button (group 25's needle anchors right after the tag name); and
  **do NOT wrap that count in `strip()`** — strip's comment pair swallows real code in
  `CustomerManager.jsx` and hides a genuinely lost button. Both are commented in place.
- ✅ **TEST — THE COMMAND CENTER HEADER AND TAB LIST (`6f29fda`, 465/465, group 36).** His two
  screenshots. The open tab was `bg-blue-600` and Tier 1 was `bg-red-600`; the clearance line
  pulsed red forever; Lock Terminal was red as well.
  🔑 **THE PART WORTH REMEMBERING: the pill also carried `shadow-md`, and Lite Mode strips shadow
  AND colour — so in Lite Mode the open tab and the closed tabs were IDENTICAL.** Selection is
  material first now (raised surface + a rail). *Strip every colour and the open row must still be
  the open row* — that is the contract that makes Lite Mode a performance mode and not a broken
  one, and a check now states it.
  Tier 1 keeps its distinction as a red EDGE (red is a rail, never a fill). `aria-current="page"`
  drives both the CSS and the screen reader so they cannot drift. Lock Terminal is amber: locking
  PROTECTS the app, and red there was teaching the eye that red means "important".
  ⚠️ One check failed first and was right: `--danger-text` for the clearance line would have been
  **invisible in light mode** — only the `-ink` tokens darken. Group 32 caught it.
- ✅ **TEST — TIERS & LOGIC, the whole tab (`50d2ea9`, 453/453).** Converted, and **four things
  changed beyond colour** because the old markup broke rules he had already set — all four need
  his eyes: **(1)** the tier row's sideways scrollbar is gone, fields wrap instead (he has rejected
  that pattern twice); **(2)** Export/Import were two bare glyphs, one of which REPLACES every
  tier — they carry words now; **(3)** the paintbrush toggle became a button that says *"Turn it
  off"* rather than a switch showing where it is; **(4)** Save logic moved below the rules it
  commits. **Nothing here has been pressed — add a rank, rename one, delete one, flip the
  paintbrush, save a rule.**
  🔑 **Red marks ONE group on that tab** — the automatic promotions, the only thing there that acts
  without anyone pressing anything. Deliberate, and a check holds it at exactly two hazard marks.
  ⚠️ Two things stay off-token on purpose and are checked: a tier's own colour (a real pin on a
  real map — customer data, not palette) and the `type="color"` picker's native chrome.
- ❓ **Raised, unanswered:** the 19px module titles are display-face CAPS with letter-spacing. Caps
  read slower than sentence case at that size. Left alone because it is this app's character —
  **if the tabs still feel heavy after he looks, that is the next thing to try.**
- ✅✅ **THE SIZE SLIDER IS FIXED — HIS WORDS, 2026-08-15: *"slider is fixed"*. CLOSED.**
  **The cause was STATEMENT ORDER, and it is worth remembering as a class:** the dispatch was the
  LAST statement in the slider's `onChange`, behind
  `setDoc(doc(db, ...))`. `doc()` throws SYNCHRONOUSLY on a bad path, which skips everything after
  it — while `setAppSettings` one line earlier had already moved the number. Slider moves, mascot
  never hears. `callMascot()` is now first and a check asserts nothing gets in front of it.
  Also closed: an explicit peek now clears `suppressed` (the sales terminal's mute), which would
  otherwise swallow every peek and look identical to a dead button.
  ⚠️ **`SettingsView` has `if (!isAdmin) return (...)` at line 95** — every hook below it is
  conditionally called, 10 eslint errors. New state went ABOVE it and the peek timer is a
  module-level variable, not a `useRef`, so this change added no hook and no lint error.
- ✅ **The picture is back** — `121de10` reverted (`ad2a6536`), on his watermark reason.
  🔴 **THE LESSON, and it is why a note here was wrong: AN OPEN RENDER GATE IS NOT VISIBILITY.**
  I had written that the mascot was "already on screen in Settings", reasoning only from the gate
  at `App.jsx:4503` (`user && !showAdminLogin`). He disproved it by looking: *"slider moved but
  mascot still not showing btw"*. The gate is open and he is still not there — `CapybaraMascot`
  parks at `opacity-0 translate-x-[200%]` and leaves it only during a peek, which its own timer
  schedules **every 90-210 SECONDS**. Third time this week that reasoning from source lost to him
  looking at the screen. A check in group 34 now carries it so it cannot go stale.
  **How it was built, if it ever needs changing:** `CAPY_COMMS` — the window event that already
  existed — took a new `peek` field, a duration in ms carrying NO message. A blank message
  resolves `spriteToShow` to `kpm-merch-idle` and renders no bubble, which is *"just the idle
  animation"*. **No debounce was needed:** the receiver already clears the previous event's timers
  before setting its own, so a whole drag leaves one window, counted from the last move.
- ✅ **THE A4 RECEIPT WATERMARK — BUILT 2026-08-15, `7823a6d`, 430/430.** ✅ **TEST: open any A4
  nota and look at the bottom-right corner.** Thermal slips are deliberately untouched.
  *"change the picture into watermarks and i want u to move the watermark panel just below the
  signature and bank panel"* + *"B is good enough"* (the small corner mark, not a full-page wash).
  🔑 **WHAT HE WAS ACTUALLY POINTING AT with *"the picture is following the mascot image"* was a
  COUPLING, and that is the part worth keeping:** one picture had two unrelated jobs — uploading it
  replaced the animated capybara with a still photo AND was the only candidate for the nota's mark,
  so a printed business document moved whenever he changed the mascot's face. Now split: the crop
  writes **`receiptWatermark`**, `App.jsx` passes **no `staticImageSrc`**, and both readers fall
  back to `mascotImage` once so an older upload migrates instead of looking deleted.
  Panel moved out of the Mascot band into **Company · 03**, under Signature & bank; cukai fine is
  now Company · 04. 64px at 28% opacity, inline-styled (printing clones the node into a fresh
  window where a print stylesheet would beat a utility class), A4 only, nothing renders when unset.
  ⚠️ **The nota keeps KPM company blue — the palette law stops at the print block.**
- ✅ **"VIEW RECEIPT" BUILT 2026-08-15, `dc238ba`, 432/432.** *"can u add view receipt button just
  below the mascot watermark photo panel?"* — own shelf under the picker. Opens a scaled A4 sample
  sheet (`src/components/ReceiptPreview.jsx`) so he can check the mark without printing.
  ⚠️ **IT FOUND A BUG IN THE COMMIT BEFORE IT.** The mark had been anchored to `.print-receipt`,
  which for A4 is only the outer modal shell — the sheet is `.a4-print-jail` inside a scrolling
  wrapper — so it sat level with the action buttons, not on the paper. Inside the sheet now, which
  also makes it A4-only by construction.
  🔑 **Geometry lives in `src/config/receiptWatermark.js` and BOTH screens import it.** A preview
  is only useful if it agrees with what prints; two hand-typed opacities drift the first time one
  is nudged, and a preview that lies is worse than none because he would trust it. A check asserts
  the preview declares no opacity of its own.
  ⚠️ The preview says **SAMPLE** twice, on purpose — letterhead/signature/bank/mark are his REAL
  settings, so the invented goods are the one part that could mislead, and a preview mistaken for
  a real nota is a document that gets handed to a customer.
  ❓ **Untested on paper — the 64px / 28% numbers are judgement, not measurement.** If it prints
  too faint or too strong, both live in that one config file.
  ⚠️ The print block is **NOT app UI** — the nota keeps KPM's company blue and the palette law
  stops at its edge, so the watermark must not be dragged onto the amber/cream tokens. ⚠️ The
  mascot's own wrapper carries `hide-on-print`; the watermark is a separate element, not that one.
  The image to draw is `appSettings.mascotImage`, falling back to `/mr capy.png`.
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

### 2026-08-15 20:46 (KPM app session) — light mode switched on for the first time, and the terminal got a light bench

`60236ab` → `f79456b`. **526/526, contrast self-check passes, `src/` clean.** Four fronts closed
in one run; the middle two are the ones worth not re-deriving.

**The duplicate "Global (default)" was one state wearing two names.** `getCustomerAccessLevel()`
resolves an absent permission to `'global'`, so "never set" and "Global" were the same authority
and the second line could never be picked. Collapsed on the READ side before removing the option —
deleting the option first would have blanked the control for every unset tier. Reporting Authority
looked identical and is NOT: there `'none'` genuinely means no access.

**The authority dropdowns became a component** (`AuthoritySelect.jsx`). A native `<select>` draws
its open list in the OS, out of CSS's reach — restyling was never possible. Drawing it ourselves
means owing back arrows/Home/End/Enter/Escape/Tab/type-ahead and an announcement that matches what
is saved. ⚠️ **A popup inside `overflow-x: auto` is CLIPPED** — portal to `<body>` + `position:
fixed`, and then it must close on any scroll.

**🔴 LIGHT MODE HAD NEVER ONCE BEEN ON.** The theme effect added `dark` and, for light, only
removed it — but the dark values live on bare `:root`. Every hour spent on the light palette had
been invisible. One line. **The failure had no symptom a CSS check could catch: both files were
internally consistent, and what was missing was the class that joins them.**

**The terminal pilot: 467 sites, 54 `--duke-*` tokens, dark mode provably unchanged** (multiset
diff vs the pre-change revision, 0 drift). Three lessons, each caught by a different thing:
· **A hex-only sweep converts exactly the half that makes the other half unreadable** — `bg-black`
  and `text-white` are NAMES, so his textboxes kept black grounds while their text flipped dark.
  Found by HIM, in minutes.
· **Hue, not lightness.** Amber and the wood are both ~41°. On a dark bench the lightness gap does
  all the work; on a pale one there is neither gap, so a price dissolves into the plank while
  measuring as a pass. Found by his SCREENSHOTS — no number reports this.
· **`contrast.selfcheck.mjs` was reading only the FIRST `:root` block**, so all 54 new tokens would
  have gone unmeasured while it printed *"all pairs pass"*. Found by a token appearing to have no
  value. **A measuring tool that quietly measures less than it claims.**

### 2026-08-15 14:31 (KPM app session) — the mascot comes back, and steps out when you size him

`ad2a6536`. **422/422, `src/` clean.** Both halves of his last message, and the second one
corrected me.

**The picture is back.** `121de10` reverted in full — the 96px preview, its `.kpm-portrait` rule,
and its check. New information, not a reversal for its own sake: *"we might need this mascot photo
for our watermark in our A4 printable receipt"*. A watermark nobody can see before it prints is
one you discover on paper.

**The slider now calls him out for 5 seconds, idle, silent.** And the reason it was needed is the
entry that matters: **an open render gate is not visibility.** I had reasoned from
`App.jsx:4503` — `user && !showAdminLogin`, open on this screen — that the mascot was already
there, and deleted the preview partly on that basis. He looked, and it was not: `CapybaraMascot`
sits at `opacity-0 translate-x-[200%]` and leaves it only during a peek its own timer schedules
**every 90-210 seconds**. Three checks in group 34 hold the fix and the reason.

Built on the `CAPY_COMMS` event that already existed rather than a new prop threaded down through
Settings: it takes a `peek` duration carrying no message, and a blank message is exactly what
resolves the sprite to `kpm-merch-idle` with no bubble. No debounce was written — the receiver
clears the previous event's timers before setting its own, so a whole drag leaves one window.

⚠️ **Pre-existing lint debt found, NOT touched** (Karpathy rule 3 — surgical): `SettingsView.jsx`
has 10 `react-hooks/rules-of-hooks` errors around lines 1212-1240 and `CapybaraMascot.jsx` has 2,
all present at `a317aeb` before this change and unchanged by it. Verified by linting the stashed
tree. Hooks called conditionally are a real class of bug; they are just not this commit's.

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

### ⤵ The 2026-08-15 morning Phase-6 entries trimmed (09:25, 09:05, 08:51, 08:40, 08:36)

Red rationed off the upholstery, the wipes made hold-to-confirm, Option C for the rack, the
12/16/20/40 spacing ladder, and two timestamp-only fires. All SHIPPED and all held by checks in
groups 30-34, which is a stronger record than prose. `git log --oneline` names the commits.

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

