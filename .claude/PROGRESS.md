# PROGRESS — read this, search for nothing

**Updated: 2026-08-16 09:21 WIB (KPM app session)** · branch `phase0-solid-ground` · last code commit: run `git log -1`
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

### 🔴 THREE NEW LIGHT-MODE COMPLAINTS — NOT STARTED. Plan quota hit 97%, session stopped here.

He sent three screenshots and three sentences at 09:21 WIB, right as the quota alarm fired.
**Nothing was investigated, nothing was changed.** His words, verbatim — do not paraphrase, do not
merge them into one "contrast pass", they are three different problems:

1. *"i want the transparant example text inside the text to be more clear in the light mode"*
   — screenshot: the form fields **OFFICIAL ADDRESS** and **CONTACT NUMBER**. The greyed example
   text inside an empty box (the **placeholder**) is pale slate on the beige field. Start at the
   placeholder colour token in `theme.css`, light theme only.

2. *"i want the black color text need to be clearer maybe add little bit thickness in color could
   help? nah i'll just let u think about that"*
   — screenshot: the striped banner **THIS DEVICE · NOTHING HERE LEAVES THE PHONE**. He is asking
   for more weight/darkness on the dark text. ⚠️ **The stripes behind it are half the problem** —
   text sitting on a moving-contrast pattern reads as washed out even when the ink is dark enough.
   Measure the ink against BOTH stripe colours before touching the font weight.

3. *"yellow color glow inside the sidebar on light mode is not good because it is not clear, feels
   like the color is menyatu with the background human eyes hard to see light on light combination
   like that"*
   — screenshot: the sidebar's active-item **glow**, amber on a light background. `menyatu` =
   *blends into / merges with*. Light-on-light. The glow is doing nothing in light mode; the honest
   fix is probably a different signal there (ring, solid chip, darker gold), not a brighter glow.
   ⚠️ Palette law still holds: no blue, no green, and gold is never text on light.

**All three are LIGHT MODE ONLY.** Do not touch the dark theme values.
**Run `node src/config/contrast.selfcheck.mjs` before and after** — that is the check that goes red.

### ✅ THE SLIDING CLOCK IS BUILT — 563/563, audit group 45. Committed this session (`git log -1`).

Closes open question 0. His answer: *"create one using CSS like u recommended before"* → **option A**,
no `motion`, no `react-use-measure`. Then he extended it mid-session: *"i want the clock to swapped
into dates for 5 second then animate back in into clock display can u do that, and use this date
format 16 agustus 2026, i want this action works on press"*. **Both are done.**

🔴 **THE CLOCK HAD NEVER TICKED.** `new Date()` was written inline in the header — no state, no
timer — so it printed whatever time the shell last happened to re-render at. Nothing errored; a
frozen clock still looks like a clock. `ShellClock` is now its own component in the same file:
⚠️ **putting the timer in the header would have re-rendered every screen in the app once a second.**

**How the motion works, both layers the same way:** a strip behind a clipping window, moved by
`transform`, driven by a CSS custom property the JSX writes. **`html.lite-mode *` already kills
`transition` outright, so Lite Mode gets the snap for free** — that is the whole reason the library
was refused, since it can not reach a JS spring.
▸ digits: a 0-9 reel per position, `--d` × one row · ▸ faces: clock and date **in the same grid
cell**, so the chip is `120 × 36` in BOTH states and the header cluster never moves.

**Measured live against the built stylesheet** (`--d` 0/1/7 → `0 / -14.95 / -104.65px`, exactly one
and seven rows of 14.95; both faces ±25.29 = one window; lite-mode → `0.001s`).
🔴 **NO FRAME WAS CAPTURED — the Browser pane will not composite and there is no headless browser
installed.** Geometry, state and timing are proven; **appearance is not.** His eyes are the check
that has not run.

⚠️ Deliberate, tell him: the resting chip is now **~40px wider**, because the grid cell is sized for
the longest date it can show. That is what buys "no jump on press"; the alternative is a reflow of
the right-hand cluster on every press.
⚠️ `.kpm-chip.kpm-clock:hover` — the rule that reset the clock's hover, reasoned *"it is a readout,
not a control"* — **was deleted on purpose.** It answers a press now.
✅ **TEST:** press the clock in the header. Date should rise into place reading **`16 agustus 2026`**,
the small line should show the time, and it should slide back by itself after 5s. Press again inside
the 5s → it should go back immediately. Then Lite Mode: everything **snaps**, no slide, no colour
change. Seconds now tick, in both themes.
❓ **STILL UNANSWERED: seconds in the header.** Built as `HH:MM:SS` because that is what the
component he pasted shows. **One line reverts it** — drop `second: '2-digit'` in `ShellClock`.

### ✅ HIS FOUR 08:23 REPORTS — all fixed, 548/548

1. **"system active button on top is not visible on light mode"** — it was `text-[#f0e2c0]/70`,
   cream at 70% on a cream header. ⚠️ **A hex WITH an alpha compiles fine**, so nothing errored; it
   just printed cream on cream. Now `--ink-dim`: **light 6,75:1 · dark 5,87:1**, measured live.
2. **"the border name text even not visible"** — `text-white` on the rank-frame labels, plus three
   more `text-white` siblings in the same file (an input, a number, a mono field). → `text-ink`.
3. + 4. **"add background inside the border panel" / "border colour itself is not clear ...
   especially the diamond one"** — 🔑 **NOT a colour bug.** Those frames are drawn to sit around a
   PHOTO in a near-black app: Diamond is white marble, Platinum is white-on-black stripe. On a
   cream page the pale ones simply cease to exist, and no per-frame tweak fixes that without
   redesigning frames he made. **Each preview tile is now a `kpm-dark-island`** with
   `--duke-well-solid` behind it, so every frame is previewed on the ground it was built for,
   identically in both themes.
   ⚠️ **Reach for the island whenever a thing is DESIGNED for one theme rather than themed.**

### ✅ THE PAGE IS CREAM IN THE REAL APP — `f44978f`, seen on screen, 2026-08-16 08:18

**Two elements were covering a correct body**, and no file-reading could have found either: the
shell's root wrapper (`bg-black`) and the content wrapper (`bg-gradient-to-br … to-black/80`, a
background **image**). Both gone. **`BODY` is the only full-screen painter now.**
🔧 **`node tools/dev-proxy.mjs` → `http://localhost:4183`** opens the REAL app in a browser that
refuses the dev server's self-signed cert. **Use it before claiming any visual fix.** The dev
server stays HTTPS.
▸ **Still dark on purpose:** the Dashboard and the other five unconverted screens paint their own
full-bleed panels over the cream. That is the remaining screen work, not a regression.

**🔴 LIGHT MODE IS THE LIVE FRONT, AND IT IS NOW ACTUALLY ON.** Phase 6 is complete; the switch
bug is fixed (group 38) and the sales terminal is converted as his chosen pilot (group 39).
**543/543 · `node src/config/contrast.selfcheck.mjs` must also pass — it measures both themes.**

### ✅ LIGHT MODE IS DONE AND WAS LOOKED AT — `634e901`. 543/543, both themes measured in a browser.

*"use the light theme that we apply to the setting panel to its background as well"* +
*"this task is finish until the background is light color and on theme with the panel"*.

🔴 **THE APP WAS CARRYING TWO LIGHT THEMES AND NOBODY HAD PUT THEM SIDE BY SIDE.** The modules he
approves are **cream** (`#f6f1e4 · #e6dfcd · #d8cdb6`); the app's own surfaces were a colder,
darker **steel** (`#B4B0A9 · #C6C2BB · #D2CEC7`). One screen, two families — which is why the page
read as a different app to the panels on it even after it stopped being black.

**The whole ladder moved together and every step was kept.** Lifting only the page would have put
the ground ABOVE the panels and deleted the one thing that makes a panel read as a panel.

| | light | dark |
|---|---|---|
| page | **`#d2c9b4`** | `#0b0a09` |
| panel | `#e1dac8` | `#121110` |
| panel lifts off page | **1,18** | 1,05 |
| gold ON-plate vs panel | **5,26** | 6,61 |
| all 19 head/nav/module/switch/chip pairs | **pass** | **pass** |

⚠️ **Lifting a light surface only ever HELPS the dark inks on it** — that is why this direction was
safe. The pale inks all live on dark plates, which did not move.

Also landed, all found **by looking**, none of them things a ratio could have caught:
▸ `.kpm-chip` (SYNCED + the clock) was raw dark hexes — black pills punched in the cream header.
Its resting ink was a **fossil**: `#8b7256` is what `--duke-ink-3` was before *"fix the dark
contrast"* moved it. **A frozen copy does not follow a token when the token is corrected.**
▸ The gold bloom at `.16` was **amplified by the header's `saturate(1.5)`** into a yellow stain.
Now `.09`. Gold on cream needs a fraction of what gold on near-black needed.
▸ The scrollbar was three fixed browns — a dark bar down a cream page. **On the palette, but only
in one theme.** Plus the selection ink. Both are token pairs now.

🔴 **THREE AUDIT CHECKS FAILED CORRECTLY IN ONE DAY, ALL FOR THE SAME REASON: they pinned a HEX,
so replacing the hex correctly broke the check protecting it.** Groups 25, 32 and the G25 scrollbar
clause now assert **relationships** (light is darker than dark; the token is a real pair) and leave
the numbers to `contrast.selfcheck.mjs`. Group 39 already carried this lesson in its own words —
**do not write another check that freezes a value.**

### 🔴 NONE OF THIS HAS EVER REACHED `main` — checked 2026-08-16 08:05 WIB

*"app havent been updated"*. **He is right, for the deployed app.** `main` is at `3231f21` and has
**zero** of the light work; `phase0-solid-ground` is **425 commits ahead**. Vercel builds `main`,
so the live app has none of Phase 0–6, the control system, or the light theme.
▸ **The dev server IS current** — verified by curling it: 2 declarations + 2 `var()` usages of
`--ground-base`. So a black page on localhost is a stale tab, not stale code.
▸ **`git log HEAD..main` = 0** — a merge would be a clean fast-forward, nothing on main gets
reverted. ⚠️ **NOT DONE. 425 commits to production is his call, not an inference from "integrate".**
⚠️ Merging does NOT deploy Firestore rules — those stay a draft he deploys by hand.

### ✅ THE LIGHT PALETTE IS APPROVED — his words, 2026-08-16

*"regarding the color i like it we can use this color"*, after looking at the showroom.
**Locked, do not re-litigate:** `--ground #D2C9B4` · `--panel #E1DAC8` · `--raised #EDE7D8` ·
`--inset #C6BDA9` · `--sunk #B9B0A0`. This closes the 2026-08-13 *"light mode is white"* thread.

### 🔴 A SCREEN CAN BE EXEMPT FROM THE THEME — `fdc9bbb`, 548/548

*"for the master vault panel, let the textbox to stay dark, light or dark mode should not affect
the loading screen"*. **He thinks in SCREENS, not components** — once a screen is exempt,
everything inside it is, including whatever is added later.
⚠️ **The first `.kpm-dark-island` COPIED a list of ~20 tokens** and missed every app-level one, so
`.kpm-field`'s input (painted with `--inset`) still flipped inside a near-black card. **A list of
exceptions is complete only on the day it is written.** The island is now a second selector on
BOTH dark `:root` blocks, so it rides the palette instead of copying it and cannot fall behind.
▸ Measured: card, field bg/ink/border, label and button are **byte-identical in light, dark AND
lite**.
⚠️ `contrast.selfcheck.mjs` matched the literal string `:root {`, which stopped existing — it
parsed ZERO dark tokens and cried 88 failures. **It now aborts if it parses under 50 tokens.**
⚠️ **5th shell-escaping failure of the session:** the note above was first written via a bash
heredoc and the backticks ran as command substitution, deleting every code span. **Markdown with
backticks goes through the Edit tool, never through a shell string.**

### 🔴 35 CLASSES WERE PAINTING NOTHING — `a5d0beb`, group 44. **547/547**

Found while surveying the next screen; **jumped the queue because it is in screens already signed
off.** Tailwind's `/N` opacity modifier needs a colour it can PARSE, and `var(--x)` is opaque to
it — so **`bg-[var(--duke-amber)]/10` matches no rule at all.** Not a wrong colour: no colour.
**35 distinct classes, 54 sites**, in `App.jsx` AND `MerchantSalesView.jsx`. The vault's amber
buttons had no background and no border; the gate's inputs had no border; the nota's paper tints
were absent. Six were mine from that night; the rest had been dead for weeks.
▸ Fixed to `color-mix(in_srgb,var(--x)_N%,transparent)`. **Verified by listing the emitted
DECLARATIONS** — 35 asked, 35 emitted, 0 missing. Group 44 verified RED at 55 sites pre-fix.
⚠️ **NOTHING CAUGHT IT BECAUSE EVERY CHECK IN THE AUDIT GREPS THE SOURCE.** The source was correct
*as text*. **When the question is "does this render", `dist/assets/*.css` is the only witness.**
⚠️ **Four wrong readings in that one investigation came from shell-escaping regexes inside
`node -e`.** Probes with regexes go in a scratchpad `.mjs`, and **always include a control whose
answer you already know** — one bad reading agreed with the hypothesis under test.

### ▶ NEXT SCREEN: the survey changed the plan. **Six of ten have NO dark mode at all.**

Zero `dark:` variants, zero tokens — hardcoded dark panels, so **in light mode they stay black**:
`MapMissionControl` · `FleetCanvasManager` · `JourneyView` · `StockOpnameView` ·
`EODReconciliationView` · `RestockVaultView`. The other four (`HistoryReportView`,
`CustomerManager`, `SamplingManager`, `ConsignmentFinanceView`) DO have both themes — they are
just off-palette. **670 banned-hue sites (blue/indigo/emerald/green) across the ten.**
▸ **Pilot chosen: `EODReconciliationView`** — smallest of the six that is genuinely broken
(12 panels, 44 banned). Survey done, conversion NOT started.
⚠️ `emerald` = verified/closed, `blue` = Digital Transfers. Both banned. Plan was gold for
verified, brass for digital — **not yet run past Aldi.**

### 🔴 LITE MODE MAY NEVER CHANGE A COLOUR — his law, 2026-08-16, group 43. **545/545**

*"the lite light moe causing the system acitve settings text to gone, since it causing the
background for that top panel to be black"* → *"lite item use to sacrifice the animation but not
the color"*. The header and dock need an opaque fallback because Lite Mode strips the blur — but
it was `#14110e`, fixed, so **light + Lite painted the bar black under light ink**. Five sites →
`--glass-solid` (`#14110e` dark / `#e3dbca` light). Measured: SETTINGS **15,25:1** in light+Lite,
dark+Lite byte-identical.
⚠️ **THREE AUDIT CHECKS WERE PINNING THAT LITERAL — they were protecting the bug.** Shape 7, 4th
time in two days. **Group 43 asserts the LAW, not a value**, and was verified RED against the
pre-fix file.
▸ Type bumped on his ask: `.kpm-desc` 13→14px, mono eyebrow + caption 10→11px, **tracking eased
with the size** (.26→.24em, .22→.2em). The gate card's 9px is his and untouched.

✅ **VAULT IS CURRENT — A-Brain `da2a46a` + the taste ripple, 0 deletions.** The 20-commit
gap is closed. New page [[Looking at the App]]; `Aldi's Design Taste` now records that the
2026-08-13 *"light mode is white"* question is **CLOSED** (he chose the modules' cream family, so
the Phase-3 bench-steel law is superseded — the "no `#FFFFFF` surface" half survives).

### 🔧 THERE IS A WINDOW ONTO THE APP NOW — `b08d8db`. USE IT BEFORE CLAIMING ANY COLOUR IS FIXED.

```bash
npm run build; PORT=4181 node tools/theme-lab-server.mjs   # -> http://localhost:4181/
```
His instruction, after three wrong claims in a row: *"if the browser is broken then fix it until
u can see it"*. Every colour call on this project until 2026-08-16 was made **blind** — the dev
server is HTTPS with a self-signed cert (his phone needs a secure context; **that rule stands, do
not "fix" it to http**) and the in-app browser refuses it, and the app needs a Google sign-in.

`tools/theme-lab.html` renders the control-system markup against the **real built stylesheet** on
plain HTTP. Flip themes in-page, then read computed colours with `javascript_tool` and compute
ratios. ⚠️ **Rebuild first — the lab reads `dist/`.**

⚠️ **THREE TRAPS, ALL HIT ON DAY ONE, ALL NOW GUARDED:**
1. **Read colours at t=0 of a transition and you get the PREVIOUS theme's values.** `.kpm-btn` has
   a 120ms colour transition; this nearly shipped a false *"the buttons don't flip in dark"* bug.
   **Inject `transition:none !important` before measuring.**
2. **Vite code-splits CSS.** "Newest file in `dist/assets`" was a 124-rule chunk with no tokens —
   a full sweep returned *"no failures, both themes"* because it was measuring an **unstyled
   page**. The server now picks the sheet that declares `--ground`, and the page refuses to render
   without it. **A lab that measures nothing must never look like a lab that found nothing.**
3. Port already in use → pass `PORT=`.

### 🔴 THE PAGE ITSELF WAS THE LAST LITERAL — `39ad446`. Read this before hunting any colour bug.

His screenshot, 2026-08-16: *"settingview is not even done, look at ther black background, it
should be light color with the RE9 arklab theme"* — **with every module on that screen already
cream.** The cause was not in SettingsView. `body` in `src/index.css` pinned its own near-black
and its own hardcoded gradient, so the page never changed theme.

🔑 **THE HEADER AND THE DOCK ARE GLASS, AND THAT IS WHY THEY LOOKED BROKEN TOO.** `.kpm-topbar`
sets `background-color: transparent` and blurs what is behind it. Neither bar was "still dark" —
both were faithfully showing a black page through themselves.
⚠️ **When three surfaces are wrong at once, look for the one thing behind all three.**

Now `--ground-base` / `-hi` / `-lo` / `--ground-glow` / `-glow-2`, plus `--glass-edge` / `-edge-2`
for the two floating panes' outlines (cream at 12% over steel is 1,06:1 — they had no outline).
The light ground keeps the **geometry**: lit corner top-left where the logo is, falling away to
the far corner. Steel, never white — the cream modules need a ground to be lifted off.

**▶ NEXT: the ten unconverted screens — see the measured table further down.** ⚠️ Start with the
PANELS (`bg-slate-*`), not the accents; the accents follow the panel. Use
`node src/config/theme.grounds.mjs <file>` to separate them.

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

▶ Also left: a handful of one-off hexes the map did not cover — `#8b5cf6` / `#ec4899` are the
Mythic rank frame and are ALLOWED by the palette law, so leave those.
⚠️ `npx eslint src/App.jsx` reports **51 pre-existing errors** — verified unchanged by stashing
this work and re-running. Not this session's, do not "fix" them inside a colour commit.

### ✅ THE WHITE FILM IS GONE — `ca40e61`, 533/533, contrast passes both themes

**The glass was worse than "it stops reading".** It was not on the header band at all — the 52
white-film sites were the PRODUCT EDITOR MODAL and the login card. Every field in that modal —
name, stock, type, all four prices — used `bg-white/5` as its fill *and* `border-white/10` as its
border, and the modal panel itself is `--duke-well-solid`, which flips to cream. So in light mode
that modal was **a blank cream box containing invisible boxes to type in.**

**This was the THIRD spelling of the same bug.** Sweep 1 replaced hexes and walked past colour
NAMES. Sweep 2 swept names and walked past **names with an alpha**. The lesson is not "sweep
alphas too" — it is that a colour is only convertible once you know **what it sits on**. The same
rgba is a highlight or nothing at all depending on the ground.

Eight new tokens, dark values byte-identical to the rgba they replaced:
`--duke-veil` · `--duke-veil-2` · `--duke-veil-edge` · `--duke-veil-edge-2` · `--duke-veil-edge-3`
· `--duke-lift` (the 1px ring + outer glow) · `--duke-frame` (the 4px chassis) · `--duke-on-plank`.
⚠️ **The fill and the edge are SEPARATE tokens although dark serves them the same rgba** — an edge
says where a control begins and owes 3:1 (light measures 3,42:1); a fill owes nothing. One token
would have looked right until the ground went pale.

🔴 **FOUR DELIBERATE DARK-MODE CHANGES — he may reject any of them, all in the product editor and
the login card.** 14 cold slate labels → `--duke-ink-8`, 2 grey button labels → `--duke-ink-2`
(slate IS the blue the palette law bans), the Unlock outline white → brass with a gold hover, and
Update Database → `--duke-on-plank`. That last is **the wells' bug running backwards**: the plank
under the label is hardcoded near-black in BOTH themes and was wearing an ink that flips to
near-black, so in light its label went dark on dark. **An ink only flips when its ground does.**

▶ **NEXT IN `App.jsx`, NOT DONE: 30 Tailwind accent NAMES used as text** — `text-red-500` ×5,
`text-orange-500` ×5, `text-orange-400` ×5, `text-amber-400` ×4, `text-red-400` ×3,
`text-amber-500` ×2, `hover:text-red-500` ×2, `text-yellow-400`, `text-red-600`, `text-orange-700`,
and one `text-blue-500` which breaks the palette law outright. These do not change theme, so on a
pale ground they are the exact complaint he already filed once (*"price and running low text
color"*). ⚠️ **Each needs its GROUND checked first** — several sit on red/amber PLATES where they
are correct and must be left alone. That is the `pairs.mjs` ancestor walk, not a blind sweep.

### ✅ THE VAULT GATE STAYS BLACK — `26615d7`, 536/536

His screenshot, 2026-08-16: *"light mode or not, login background should not change like this
should stay black"*. The gate backdrop was `--duke-well-solid`, which flips to cream.
⚠️ **The comment directly above that line already said the point of it was SOLID BLACK.** The
token flipped out from under a stated intent — the failure a token system has that a literal
does not.

**The background was the half he could see.** All 17 tokens inside the gate flip, and the card is
a literal near-black in BOTH themes, so every ink on it went near-black too. Look at his
screenshot: MASTER VAULT, the button label, "Lost your key?" — all barely there.

🔑 **THE PATTERN, and it will come up again: a THEME ISLAND, not 40 conversions.**
`.kpm-dark-island` in theme.css re-declares the tokens back to their **dark** values for the whole
subtree. Anything added inside later is dark-correct without anyone remembering the rule. Three
screens carry it: the vault gate, Access Denied, Can't Verify You Yet.
⚠️ Reach for this **whenever a screen's ground is fixed while the page around it themes.** The
sign-in screen in `BiohazardTheme.jsx` was already safe — its backdrop is a literal `#050403` and
`.kpm-mod.gate` prints literal hexes. Group 41 pins that card as a literal so a later "tidy-up"
cannot tokenise the flip back in.

### ✅ SETTINGSVIEW + THE SHELL'S ACCENTS — `63f8f14`, 541/541

*"yea fix all of the color for light mode and the adjustment as well for the outside panel, we can
start from the settingview"*. **SettingsView was four lines** — the whole screen is already on the
control system; only its lockscreen still had literals. The shell was the real work: **42 sites**.

🔑 **THE RULE, and it is the whole method from here on: the GROUND decides, not the colour.**
`text-orange-400` is CORRECT on a black disc and INVISIBLE on the cream panel. Same class,
opposite verdict. Converting an accent that sits on a plate is work that changes nothing and
risks a screen he has signed off; missing one on a flipping surface is invisible text.

🔧 **THE TOOL THAT SEPARATES THEM IS NOW IN THE REPO — do not rebuild it.**
```bash
node src/config/theme.grounds.mjs src/SomeView.jsx
```
It walks the JSX by indentation, resolves each accent's nearest ancestor background, and groups
by ground with a verdict. ⚠️ It cannot see two things: a subtree wearing `.kpm-dark-island` stays
dark whatever its tokens say, and a class with a `dark:` twin is already the light value.

Slate was still here **in three shapes at once**, which is why it kept surviving sweeps: a class,
the `#0f172a` Lite-Mode blur fallback painting every backdrop navy with `!important`, and **the
colour a new rank was born with** in two files. The four rank identities (Mythic, Epic,
Grandmaster, Bronze) are untouched — the palette law does not reach them.
⚠️ The Restricted Access medallion is written **twice** (App.jsx + SettingsView) and had already
drifted. A check now holds them identical.

### 🔴 WHAT "ALL THE COLOURS" ACTUALLY IS — measured 2026-08-16, not guessed

**Ten screens have never been converted at all.** They are not "accents to fix" — they are built
from `bg-slate-800` / `bg-slate-900` panels, i.e. the blue the palette law bans, plus some
`bg-blue-600` and `bg-emerald-*`. **The panel is the work; the accents follow it.**

| screen | on an unconverted panel | already flips | on plates |
|---|---|---|---|
| `MapMissionControl` | **157** | 4 | 30 |
| `EODReconciliationView` | 90 | 7 | 48 |
| `FleetCanvasManager` | 89 | 0 | 40 |
| `StockOpnameView` | 83 | 2 | 54 |
| `JourneyView` | 68 | 8 | 45 |
| `CustomerManager` | 41 | 3 | 75 |
| `ConsignmentFinanceView` | 33 | 3 | 40 |
| `HistoryReportView` | 30 | 9 | 84 |
| `SamplingManager` | 19 | **16** | 38 |
| `RestockVaultView` | 3 | 0 | 9 |

⚠️ **This is several sessions, one screen at a time — same shape as the terminal pilot.** Do NOT
batch them: he has to look at each one. `AgentProfileView` is already clean (0 sites).

### Where things live

| File | What it owns |
|---|---|
| `src/styles/theme.css` | all tokens, both themes, + the `--duke-*` block for the terminal |
| `src/components/AuthoritySelect.jsx` | **NEW 2026-08-15** — the custom listbox in the permission matrix |
| `src/config/contrast.selfcheck.mjs` | measures every text/surface pair in BOTH themes |
| `src/config/integration.audit.mjs` | 526 checks; groups 38 (light switch) and 39 (Duke's Ledger) |
| `index.html` | the pre-paint theme stamp — must agree with `App.jsx`'s theme effect |
| `src/index.css` | **the page ground** — `body` paints `--ground-base` + the lit-corner gradient |
| `src/components/BiohazardTheme.jsx` | **the SHELL that actually covers the page** — root wrapper, dock, drawer, status strip |
| `tools/dev-proxy.mjs` | **NEW 2026-08-16** — plain HTTP in front of the HTTPS dev server, so a browser can open the REAL app |
| `.claude/launch.json` | **theme-lab entry added 2026-08-16** — `preview_start {name:"theme-lab"}` opens the lab on 4180 without a shell |
| `tools/theme-showroom.html` | **NEW 2026-08-16** — every colour in place, both themes; the page Aldi comments on |
| `tools/theme-lab.html` + `theme-lab-server.mjs` | the measurement harness (`/lab`); serves the showroom at `/` |
| `tools/make-preview.mjs` | flattens either page into one file that opens from disk, no server |
| `src/config/theme.grounds.mjs` | resolves each accent's ancestor background — run before converting any screen |

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

### 🔴 OPEN — asked 2026-08-16, NOT answered

0. ✅ **ANSWERED AND BUILT — see the entry at the top. He chose A (pure CSS) and added the
   press-to-flip. Only the SECONDS half is still open.** Kept below for the reasoning:
   **He pasted a 21st.dev/motion-primitives `SlidingNumber` component and
   said *"and change the clock UI into this"*. Three facts made the paste-in wrong
   for this repo, and he was asked to choose before anything was installed:**
   - ⚠️ **The guide assumes TypeScript + shadcn + `@/components/ui/`.** This repo is **JavaScript**
     (`.jsx`), has its own `.kpm-*` control system instead of shadcn, uses `src/components/`, and
     has **no `@/` alias**. It cannot be copy-pasted; it has to be ported.
   - 🔴 **IT WOULD BREAK LITE MODE.** The component animates with **JS-driven transforms**
     (`useSpring` → `style.transform`), and `html.lite-mode *` can only force `animation`/
     `transition` to none — **it cannot stop a JS animation.** On the setting that exists for
     cheap phones, the digits would slide forever on a 1s timer. His law: *"lite mode means
     performance"*, *"nothing rotates"*.
   - It adds **`motion` (~50KB) + `react-use-measure`** to an offline-first app, for a clock.
   - **Options put to him — A: a pure-CSS slide (recommended; no deps, and Lite Mode kills it for
     free because it IS a CSS animation). B: install the libraries and hand-write a Lite guard.
     C: park it, do the Dashboard first.**
   - ❓ **Also unanswered: does he want SECONDS in the header?** The current clock is date + time,
     no seconds. The pasted design is `HH:MM:SS` and re-renders the shell **once per second** —
     a real battery cost on exactly the phones Lite Mode is for.

1. **The banned hues on `EODReconciliationView`.** On that screen `emerald` means *verified /
   shift closed* and `blue` means *Digital Transfers*. Both are banned, but they carry DIFFERENT
   meanings, so making both gold would delete the distinction. **Proposed: verified → gold, digital
   → brass (the quieter gold).** He has not answered. **Do not convert that screen until he does.**

2. **Merging to `main`.** He said *"okay u may integrate this now, app havent been updated"* — but
   `main` is at `3231f21` with **zero** of this work and the branch is **425 commits ahead**.
   ⚠️ **"Integrate" was NOT treated as authorisation to merge 425 commits to production.** Offered:
   confirm on localhost first, then open a **PR** (like PR #3) for him to merge himself.
   ▸ `git log HEAD..main` = 0, so it would be a clean fast-forward; nothing on main gets reverted.
   ▸ Merging does **not** deploy Firestore rules — those stay a draft he deploys by hand.

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

## 📓 LOG

- **2026-08-16 09:21 WIB (KPM)** — Sliding clock shipped and committed (CSS reel + press-to-flip
  date, 563/563). Found and fixed the real bug behind it: the header clock had never ticked. Then
  Aldi filed three light-mode legibility complaints (placeholder text, dark text on the striped
  banner, sidebar glow) — captured verbatim in ▶ NOW, **not started**, plan quota hit 97%. — newest first, about five entries; `git log` keeps the rest

- **2026-08-16 09:22 (KPM app)** — Sliding clock built, option A, pure CSS, no new dependency.
  Found and fixed that the header clock never ticked at all. Added press-to-flip to
  `16 agustus 2026`, self-returning after 5s, both faces in one grid cell so nothing moves.
  Audit group 45, 563/563. **Uncommitted — he has not asked.** No frame captured: the Browser
  pane will not composite and no headless browser is installed. Vault: A-Brain `524fc47`.

### 2026-08-16 08:18 (KPM app session) — the app was finally OPENED, and two skins were painting over the page

🔴 **The whole night's "the background is still black" was TWO ELEMENTS COVERING A CORRECT BODY**,
and neither was findable from the files. His words: *"why dont u open the localhost then look at
it yourself"* — after which he signed in himself so the real app could be inspected.

- `tools/dev-proxy.mjs` terminates TLS in front of the HTTPS dev server so a browser that
  distrusts the self-signed cert can open the app. ⚠️ **The dev server is untouched and stays
  HTTPS — that rule is his.**
- **`BiohazardTheme.jsx` root wrapper had `bg-black`**, full viewport. Measured live: `body` was
  already correct cream `rgb(210,201,180)` with this on top at `rgb(0,0,0)`. Now `bg-transparent`,
  because `body` paints the ground *and* the lit-corner gradient — an opaque wrapper of any colour
  hides it, which is why the glass header and dock had been blurring a flat wall all along.
- **The content wrapper had `bg-gradient-to-br from-transparent to-black/80`** — a background
  **IMAGE**, which is exactly why fixing the first one measured correct and still looked black.
  Deleted; it duplicated a falloff `index.css` already does.
- ⚠️ **RULE: when a surface still looks wrong after its `background-color` checks out, read
  `background-image` before assuming the measurement lied.**
- Verified by sweeping every element wider than 60% / taller than 50% of the viewport: **`BODY` is
  now the only full-screen painter.** Rest of the shell converted with them (drawer scrim, foot
  rule, avatar rings, screen title, status strip).
- Earlier in the same session: 35 dead `bg-[var(--x)]/N` classes (group 44), Lite Mode may never
  change a colour (group 43), the dark island now rides the dark `:root` blocks, the showroom page.
- **548/548 · contrast passes both themes · eslint unchanged.**
- ⚠️ **Found, NOT fixed:** the Dashboard hotlinks a background wallpaper from `wallpapers.com` at
  runtime — a third-party image in a business app, same class as the Shutterstock clip he was
  warned about. Needs his call.
- ⚠️ Same JSX mistake as the night before: `{/* comment */}` directly before the returned element
  is two nodes and 500'd the whole app until the braces came off.

### 2026-08-16 07:40 (KPM app session) — /alucard wifi troubleshooting, no KPM code touched

`/alucard` wifi troubleshooting again (3rd recurrence — Instagram/TikTok slow on his home wifi).
Nothing in `src/` touched by me; `integration.audit.mjs` mtime changed from some other process.
Diagnosis this round: his router is a Linksys E1000 v2 (2011, discontinued, single 2.4GHz band,
no 5GHz). DNS fix (phone + router-level) and one reboot each bought temporary relief, then it came
back — points to router hardware (memory leak / connection-table overflow under load), not a
config problem. Told him: daily reboot as a workaround, or replace the router as the real fix.
Waiting on him to confirm reboot fixes it again (would confirm the theory) or to decide.

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

### ⤵ The 2026-08-15 mid-morning Phase-6 entries trimmed (09:55, 09:45)

The mascot line picker, and General & Brand converted as Phase 6 slice 2. Both superseded —
Phase 6 is complete and the light theme has since been rebuilt on top of it. `git log` has them.

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

