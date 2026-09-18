# The one job

**2026-09-19 02:58 — SESSION CLOSED at his *"after this prepare for notes and prompt we continue tomorrow"*. THE NEXT JOB is the JOURNEY PLAN STORE CARD REDESIGN, his words verbatim:** *"i think i want u to redesign the store card, and make it compact as well so that it doesnt take so much space because there is so many buttons there but of course make sure that stores with critical alert are still showing critical animation or lighting on its each store card"*. A design job → boards first, no code before he answers (his 2026-09-14 rule; a 🔴 DECIDE comes as frames at 375 with TODAY beside each option). Read his ✅ TEST of `056d8e3` FIRST (the checklist in the Shipped entry below); a miss is fixed before the redesign. ❓ phone NEW/OLD Customers still unanswered; older ✅ TESTs (`bcb08c4`, `a13744a`, `f72ef35`, EOD `84e102f`, Customers `5d7a9d0`) still owed — all on `https://192.168.1.112:4173` (read the address off `preview_logs` after `preview_start kpm-preview`; it dies when a session closes).

**The card TODAY (`src/JourneyView.jsx`, shipped `056d8e3`, measured at 375 inside the shell):** 317 px folded / 377 open, 334 wide. Top to bottom: a 44 px strip (● WHO | #STOP, RANK pill, PRICE pill — wraps to two rows when the three do not fit), the name (16 px, whole) with a ⋯ key (44 × 44) beside it, the status pill (11 px, full sentence: "⚠️ CRITICAL: OVERDUE BY 11 DAYS" / "EXPIRING SOON (2 Days Left)" / "STATUS: SAFE (5 Days Left)"), the address box (11 px), ENGAGE TARGET (283 × 44, orange→red gradient), then RADAR / NAVIGATE / LOG (76 / 114 / 76 × 44), then the ⋯ fold with ↑ ↓ (44) + the assign `<select>` (44). SIX buttons + a select + a ⋯ per card — his "so many buttons". A visited card is greyscale at 70 % with a CLAIMED BY FLEET stamp and REVERSE CLEARANCE (283 × 44). The desk card is 383 with the tool bar on top — the desk stays as it is unless he says otherwise.

**What "critical" is in code:** `getBountyStatus(customer)` at `JourneyView.jsx:717` → `{ text, color, border, flashing }`: never visited or overdue (`daysLeft <= 0`) → `bg-red-600 … border-red-500, flashing: true`; `daysLeft` 1–2 → yellow "EXPIRING SOON"; else green "SAFE". The pill at `:1599` (phone/desk card) and `:1245` (the pin popup) carries `animate-pulse` when `flashing` — that is the only "critical animation" today, and it is a blink (the same loop he erased elsewhere on 2026-09-18 with *"too much of those blinking light"*). His new sentence ASKS for a critical signal on the card: *"critical animation or lighting on its each store card"* — so the card's critical state gets an instrument, not a pill that blinks. Candidates to board (all in the control system, palette law: red is for a problem that is SURE — an overdue store qualifies): the card edge lit `--danger` with a slow breathing glow (a `kpm-*` class in theme.css, Lite-safe: the state class carries the colour, the animation only the breath); a red lamp in the strip (`.kpm-well` style, steady red for critical, amber for expiring, black for safe — "a light blinks only while something is happening"); a nixie count of overdue days (`NixieCount`, the instrument he standardised) in the strip. Board the LOOK of the critical state as its own board.

**Compact candidates to board (measure each through `?look=` first):** A — one row per job: the strip becomes [lamp · WHO #STOP · RANK · PRICE]; name + ⋯; status as ONE short line beside a lamp ("OVERDUE 11 D" / "DUE IN 2 D" / "OK 5 D" — plain words, one language, the sibling screens' style); address; ONE key row: ENGAGE (flex-[2]) + NAVIGATE (flex-1) at 44; RADAR and LOG move into the ⋯ fold with ↑ ↓ and ASSIGN (so the fold reads: MOVE UP / MOVE DOWN / SHOW ON MAP / LOG A VISIT / ASSIGN TO …). Est. ~230 px. B — as A but the address folds too (the name is what he finds the shop by; NAVIGATE opens the map) → ~195 px. C — a two-line row (name + status lamp on line 1, ENGAGE · NAVIGATE · ⋯ on line 2) with everything else behind the ⋯ → ~120 px; the boards must show a 20-store day (measure the page height: today 4 stores = 2,303 px). Recommend A unless he says the address is rarely read. Ask ONE question with the boards: which buttons does a salesman press every day — ENGAGE and NAVIGATE (assumed) — because the compact design is decided by that answer, not by the pixels. Both tiers: the boss's card carries the assign box; measure `&admin` too.

**Then, when he answers:** guards first in `src/config/logicFixes.selfcheck.mjs` (red with the sources untouched), the new critical instrument as a `theme.css` class (no shadow/filter dependence, audit G30; the state rule owns the colour so Lite keeps the light and loses only the breath), `npm run build; node src/config/integration.audit.mjs` (stop the lab first), 375 both tiers + 1280 (the desk card must stay 383 with the tool bar on top unless he asked for the desk too), one SHIPPED board, commit, `preview_start kpm-preview`, ✅ TEST in plain words, delete the looks, rewrite this file (the screen after this is Sampling — its mount facts are below).

## Parked: the screen after the store card — the Sampling mount (read from the live files 2026-09-19 02:48, unmeasured)

`App.jsx:5087` `{activeTab === 'sampling' && (` → a fragment: the EDIT FOLDER modal (App-owned, `editingFolder`), `<SampleEntryModal isOpen initialData inventory onSubmit onClose />` (`:5104`), then `showSamplingAnalytics ? <SamplingAnalyticsView samplings inventory onBack /> : <SamplingFolderView samplings isAdmin onRecordSample onDelete onEdit onEditFolder onShowAnalytics />` (`:5113` / `:5116`). All four live in `src/components/SamplingManager.jsx` (611 lines): `SamplingAnalyticsView` `:20`, `SamplingCartView` `:192` (the record-a-sample cart, opened from `onRecordSample`?), `SamplingFolderView` `:330`, `SampleEntryModal` `:512`. Props are plain arrays and callbacks — NO Firestore reads inside (App owns `samplings`), so the lab mount needs only fixtures: `samplings={[…]}` (date + location folders, a few items each with product / qty / the salesman), `inventory={[...LAB_PRODUCTS, ...LAB_VAN_EXTRA]}`, `isAdmin={q.has('admin')}`, callbacks `() => {}`, and `&analytics` to mount the boss's charts, `&entry` to open the modal (`isOpen`). ⚠️ `:389` has a `<table className="w-full text-sm text-left">` — the SIDEWAYS RATCHET guard bans a bare `min-w-[Npx]` on a table under lg; check the shell's `scrollWidth` at the folder level and inside a folder. Only 11 `lg:`/`md:` in the file → desk-first, expect the same defect family (10 px labels, sub-44 keys, a table that slides). In `tools/ponder-lab.jsx` `ShellLab()` add `q.has('sampling')` before the `journey` branch (that block is the pattern).

## How to measure and propose — the recipe is settled, do not re-derive it

`preview_start ponder-lab` (it runs with `--host` now, so his phone can open `http://<pc address>:4190/tools/ponder-lab.html?…` — read the address off `preview_logs` first) → the lab page is `http://localhost:4190/tools/ponder-lab.html` (the root `/` serves the real app and dies on the stub — a blank page with a `connectFirestoreEmulator` error means the wrong URL; a blank page with `Failed to reload … 500` in the console means a SYNTAX ERROR in a source file — `preview_logs` names the file and line; `does not provide an export named` means the stub lacks a firestore function the screen imports — add a no-op export) → `resize_window` 375×812 → `?shell&sampling` and `&admin` → the probe reads `innerWidth` in the SAME call as every rect; both themes (`&light`); list every control under 44, every text under 11, anything wider than 375 (read the shell scroller's `scrollWidth` — it was 387 on Journey Plan and 521 on the boss's Customers page while every element's own rect looked fine), the row height, and whether the component is a fixed-height box. ⚠️ THE PANE DOES NOT ADVANCE A TRANSITION UNTIL IT PAINTS: take a `computer` screenshot, THEN read the property. Headless PNG at `--window-size=518,H` with `look=pin` (`#root{width:375px}`), cropped to 375 in the compose page; captions ABOVE the frames (`jp/shoot.mjs` in the 2026-09-19 scratchpad is the whole recipe: shoot + compose in one file; `jp/shipped.mjs` the SHIPPED board). `?tab=<label>,…` presses buttons by label (textContent, `startsWith`), `cursor-pointer` cards when no button carries the label, and `type:<value>` types into the first enabled visible input; `&held` puts `lab-held` on the first `.kpm-key`. Boards: TODAY beside each fix through `?look=<name>` entries in `tools/lab-looks.js` (write them, ship, delete them — the contract at the top of that file), YES/NO or a letter per board, recommended one marked. The TODAY frame must show the defect the pane measured. No code before he answers. Then classes with `lg:` resets, element-scoped guards written FIRST and red with the sources untouched → green, `npm run build; node src/config/integration.audit.mjs` (stop the lab first), re-measure at 375 and 1280, one SHIPPED board (dark / light / desk), commit, `preview_start kpm-preview` (it dies when a session closes — check `preview_list`), ✅ TEST line with the checklist written out in plain words.

Traps. (a) `index.css` `button:has(> svg:only-child)` forces inline-flex + 44 px on any button whose only ELEMENT child is an icon — put the label in a `<span>`. (b) Inputs with no `bg-` class are white in dark mode; `bg-[var(--inset)]` on a raised card, `bg-[var(--raised)]` inside an inset block, `text-[var(--ink)]` always. (c) `code()` in the selfcheck strips block-comment spans; a negative guard must run on `code(a)` or your own explanatory comment fails it. (d) A `{/* JSX comment */}` as the first thing inside `return (` or `cond ? (` is a parse error — logicFixes sweeps for it; run the selfcheck before touching the pane. (e) The lab stub's `onSnapshot` answers a DOCUMENT listener when the fixture is a plain object, a collection when it is an array; `getDocs` returns empty. (f) Every frame at a MEASURED 375 inside the shell. (g) Phone-only 11 px type is `text-[11px] lg:text-[10px]` so the desk stays pixel-identical. (h) SIDEWAYS RATCHET (logicFixes): no `<table>` under lg may carry a bare `min-w-[Npx]`; only `HistoryReportView.jsx:500` / `:808` may — Sampling HAS a table (`:389`). (i) Utility-class selectors like `.flex.gap-2` match MORE than the group you mean — scope a guard or a look to the tag or to a real class; a probe selector too (`div.max-w-full` matched the SHELL, not the crumb, on 2026-09-19). (j) One set of buttons for both widths: the phone relocates the SAME elements (`contents lg:flex`, `order-last lg:order-none`, a grid-rows fold with `lg:block` / `lg:contents`) — never a second copy. (k) A `<select>` will not shrink below its longest option — three in one row overflow; stack them. (l) A desk negative margin (`-mx-4`) on the phone's `p-2` shell is a sideways move — `lg:-mx-4`. (m) Tailwind's preflight resets `text-transform: none` on `<button>` — a heading wrapped in a button loses its `uppercase` unless the button carries it too (caught by the frame on 2026-09-19).

## Paste this to start the next session

```
/alucard
Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
FIRST read my replies: (1) ✅ Journey Plan `056d8e3` — the checklist in the note; (2) my phone — NEW or OLD Customers page (if OLD, the server checks in the 16:55 note); (3) the older ✅ TESTs (`bcb08c4`, `a13744a`, `f72ef35`, EOD `84e102f`, Customers `5d7a9d0`) — a miss is fixed first. Then THE JOB: redesign the Journey Plan STORE CARD — compact (too many buttons), and every store with a critical alert must still show a critical animation or lighting on its card. Mount `?shell&journey&tab=unmapped%20provinsi,bandung` (both tiers), measure, board the compact options AND the critical look as frames at 375 with TODAY beside them, ask me which buttons a salesman presses every day; no code before I answer. Then rewrite this file.

Traps. `button:has(> svg:only-child)` beats `lg:hidden` — label in a span. Bare inputs are white in dark mode — surface tokens on every box. A negative guard runs on `code(a)`. No `{/* */}` before the root element in `return (` or `? (`. The pane does not advance a transition until it paints — screenshot, then read. Scope selectors to the tag, never to utilities alone (a probe too). A `<select>` is the tap target, its padded wrapper is not. A button resets `uppercase` — carry it on the button. A light blinks only while something is happening — a critical state is a steady light or a breath, never `animate-pulse`. The desk card stays 383 with its tool bar on top unless I say otherwise.
Rewrite this file with the next single job before closing.
```

## Shipped 2026-09-19 02:47 — Journey Plan on the phone + the map tiles (`056d8e3`) — ✅ TEST owed

His words: *"board 1 = B, board 2 = B, board 3 yes, btw fix the map because it said api key needed or something"*. `JourneyView.jsx`: `feedOpen` (seeded from the width) folds the picker panel under a 44 px title key that prints `{selectedDay} · {journeyWhere(prov, kab, kec)}` (`helpers.journeyWhere`, tested); `actsOpen` + `components/MoreKey.jsx` (lifted out of CustomerManager) put the SAME tool bar (↑ ↓ `w-11 h-11 lg:w-6 lg:h-6`, the assign `<select>` `min-h-11`) at the card's foot on the phone (`order-last lg:order-none grid lg:flex`, `0fr → 1fr`, 200 ms, a document `pointerdown` outside `[data-acts]` folds it); the NO INTEL band is a 44 px strip carrying the badges when there is no photo (`min-h-11 lg:h-24`, the texture box `hidden lg:flex`, the badge stack `static … lg:absolute`); the name `lg:truncate` with the ⋯ beside it; the address `text-[11px] lg:text-[10px]`; pickers `flex-col lg:flex-row`, every `<select>` `min-h-11 lg:min-h-0` at 11 px; the column rule `lg:border-r lg:pr-4`; the path row `max-w-full lg:w-max` with 44 px keys; the reel `flex-wrap lg:flex-nowrap lg:overflow-x-auto` (no `-mx-4`), each sector card `basis-[calc(50%-6px)] lg:basis-auto`; the feed card and the store block `p-3 lg:p-5`; legend key + map keys 44 (`[&>button]:min-h-11 …`). Tiles: `Canvas/World_Dark_Gray_Base … maxNativeZoom={16} attribution='© Esri'` here and in `MapMissionControl.jsx` (its light layer → `World_Light_Gray_Base`); no `cartocdn` left in src. Measured after at 375 (both tiers): scrollWidth 375, nothing under 44, nothing under 11 but BY FLEET; feed 123 folded / 429 open; card 317 / 377; desk at 1280 identical (heading 24, panel open, tool bar on top with 24 px arrows, card 383). Guards 1660 (15 red first; the old MoreKey guard re-pointed), audit 722, build green, packed build `index-C0W5EfJA.js` on `https://192.168.1.112:4173`. Lab: `jp-floor` / `jp-fold` / `jp-card` deleted; `?shell&journey` stays. Left at 10 px on purpose: the four hover-only map key labels, the pin popup, the BY FLEET stamp.

## Shipped 2026-09-18 22:18 — the nixie face and the dot lights (`bcb08c4`) — ✅ TEST owed

His words: *"change the fonts for the nixie tube because it is not clear, and also fix the light mode nixie tube it is unclear as well, and just erase the dot light and use another creative design"*. The nixie digits are the condensed display face with a fixed orange ink (`--nixie-ink`), light mode reads; the Agent Inventory LED window is the same nixie counter; the Customers pending pill is steady; the finance ping ring is gone; the two live-state dots stay. Guards 1645, audit 722, packed build `index-C2eN5eOO.js`. ✅ TEST: *"open Stock Opname on the phone in LIGHT mode — the DIFFERENCE counter is orange on black and easy to read; the digits are tall and narrow; open Agent Inventory — the Quarantine number is now the same glass counter, no blinking red dot; open Customers — the red pending pill on a folder row no longer blinks"*.

## Shipped 2026-09-18 21:50 — the nixie counter + amber count card + one-thing-per-line audit item (`a13744a`) — ✅ TEST owed

5 = A, 6 = A (his letters), the NIXIE COUNTER his ask (`components/NixieCount.jsx`, `.kpm-nixie*`, `helpers.nixieDigits`) on the count card's DIFFERENCE and the boss's three audit plates; the count card is amber until the second count confirms a difference; the verdict block folds open; the audit item is one thing per line on the phone; the itemized list no longer scrolls in its own box (`max-h-[40vh]` → `lg:`). Guards 1645 (8 red first), audit 722.

## Shipped 2026-09-18 19:20 — the Stock Opname floor (`f72ef35`) — ✅ TEST owed

His board 2 = A (44 px reel arrows, row 92), board 3 = A (the boss's tabs 2 × 2), plus the size rules (title one line, 11 px, 44 px, pickers 44, names wrap, SUBMIT one line). Guards 1636 (10 red first), audit 722. Stock Opname mount: `?shell&opname` (T5 in BANDUNG, counts blind) / `&admin` (the boss: HQ AUDITS + QUARANTINE fed by the array fixtures `pending_audits` / `quarantine_logs`); `?tab=count:400/3,3%20damaged` fills the first card. ⚠️ **From the 16:55 note, still live if his phone shows the OLD Customers page:** the server is suspect, not the phone — `curl -sk https://192.168.1.132:4173/ | grep -o 'index-[^"]*\.js'` against `dist/index.html`; `preview_list` must show `kpm-preview` on 4173; if in doubt `preview_stop` + `preview_start kpm-preview`, read the `Network:` line. Safari Private Browsing cannot sign in (blocks the storage Google sign-in needs) — never a test again.

## Shipped 2026-09-18 ~16:45 — Customers round two on the phone (his A / A / A)

His words: "Board 1 = A, Board 2 and 3 also A". `CustomerManager.jsx`: `adminTools(phone)` renders the boss's four tools once for two places — the desk's gold row beside the title (`hidden lg:flex gap-2`, byte-identical classes) and a phone-only fold under the gold ADD NEW CUSTOMER bar (`lg:hidden`, a 44 px `kpm-btn block` "Admin tools ▾/▴" with `aria-expanded`, the four as `kpm-btn block` rows, `grid-template-rows 0fr → 1fr` 200 ms, `inert` while folded; labels "Find Duplicates / Data Scrub / Import map" on the phone, unchanged on the desk). Every folder row is `grid-cols-[auto_1fr_auto] lg:block`: its first cell and right column are `contents lg:flex…`, so on the phone the well (`row-span-2`), the name, the count, the pending badge (`col-start-2 row-start-3`, 11 px), a `MoreKey` ⋯ (`col-start-3 row-start-1 row-span-2`, 44×44, `data-acts`, stops propagation, `aria-expanded`) and the SAME DEL / EDIT group relocated to `col-span-3 row-start-4` as a fold (`overflow-hidden lg:contents` inner, `border-t`, both buttons `flex-1 min-h-[44px] text-[11px]`, DEL `border-[var(--danger)] text-[var(--danger-ink)]`, every one with an `lg:` reset) are placed by the row's own grid. The shop card: `MoreKey` beside the map pin, the bottom admin row is the same fold (`mt-auto lg:flex …`), Del danger-edged on the phone. `actsOpen` holds one id; a document `pointerdown` outside `[data-acts]` folds it. `theme.css` `.kpm-key`: a first background layer `linear-gradient(90deg, var(--amber), var(--amber))` sized `0 3px` → `100% 3px` on `:active` (and on `:hover` for real pointers), 360 ms `cubic-bezier(.2,.8,.2,1)`; the `.kpm-well` lamp no longer lights on a `.kpm-key` (the old `:active` / `:hover` amber rules are gone). Measured after at 375 as tier 1: shell scrollWidth 375 (was 521), title one line, ADMIN TOOLS 359×44 → three 44 px rows at 12 px, ⋯ 44×44 at the row's right, strip DEL 163×44 (danger edge) / EDIT 163×44, outside tap folds it, nothing under 11 px, nothing past 375; light frame shot. Desk at 1280: header row 44 with the three gold buttons inline, DEL/EDIT inline 51/55×44 at 10 px, no ⋯, no fold; hover on a row read `background-size 100% 3px` with the lamp black. Guards 1626 (10 red with the sources untouched → green; three older row guards re-pointed to the new strings), audit 722. Lab: `tools/lab-looks.js` back to `pin` only; `&admin`, `&held`, `--host` stay. ✅ TEST owed on his phone (`https://192.168.1.132:4173`, packed build rebuilt): "open Customers as tier 1 — the title sits on one line and the page does NOT move sideways; under the gold ADD NEW CUSTOMER bar there is one row ADMIN TOOLS, tap it and FIND DUPLICATES / DATA SCRUB / IMPORT MAP slide open, tap again and they fold; on a folder row DEL and EDIT are gone, a ⋯ key sits at the right, tap it and DEL / EDIT slide open under the row (DEL with a red edge), tap anywhere else and they fold; open a folder down to the shops — each shop card has the ⋯ too, with MAP / EDIT / DEL under it; press and HOLD any row: it sinks and an amber line runs along its bottom edge from left to right, and the little lamp on the icon stays black".

## Shipped 2026-09-18 ~14:05 — EOD Setoran on the phone (his board 1 YES + board 2 B)

His words: "board 1 yes, board 2 B because it have more space for long product name". `EODCardDeck.jsx`: the deck is `relative mb-[33px] lg:mb-0 lg:h-[344px]` — on the phone as tall as the card on top, the cards behind `absolute … bottom-0 overflow-hidden [&>*]:invisible` (blank card backs, 11 px peeks), the card on top `relative`, the flying card `absolute inset-x-0 top-0` unclipped; the count rows `flex-wrap` with the name `basis-full` on its own line and a `w-24 h-11 ml-auto` box (96×44) + `w-12` unit on the right (`lg:` resets every one); both lists `lg:max-h-[…]` so nothing scrolls inside a card on the phone; Landed / Less / Not yet `min-h-11 lg:min-h-0`; the "Actually got" box `h-11 lg:h-auto`; names `lg:truncate`. Four 10 px labels → `text-[11px] lg:text-[10px]` (Step 1/2/3, the line under the title, the two waiting/closed lines). Left alone: the 8 px SEALED on the wax seal. Measured after at 375 (dark; light frame shot): deck 226 = Cash card, gap 33; card 3 rows one line each at 232 px, box 96×44, KARTON whole, list 333 = 333 (no inner scroll), nothing wider than 375, only SEALED under 11. Desk at 1280 unchanged: deck 344, cards absolute, buttons 29, box 74, list 152 max, labels 10. Guards 1615 (red 7 first + the new JSX-comment sweep proven red on a probe file), audit 722. Lab: `?shell&eod` (`&admin` for the review side, unmeasured), `?tab=type:<v>`; `tools/lab-looks.js` back to `pin` only. ✅ TEST owed on his phone (`https://192.168.1.132:4173`, packed build rebuilt): "open EOD Setoran as a salesman — under the Cash card no other card's row shows through, just blank card edges; count the cash, put it in the letter, then on the Transfer card the three buttons LANDED / LESS / NOT YET are easy to hit; on Goods returned all four products are on one screen, each name on its own line in full, a big count box under it on the right, and KARTON is spelled out whole; nothing slides sideways".

## Shipped 2026-09-18 11:11 — key caps, the stacked competitor table, the LED count (`832ea7c`)

His words: *"board 3 = B, board 4 =B, 5 = B, 6 = B make sure that the animation is clear and HD and
smooth ,just to let u now that sideways swipe is inconvenience for phone so make sure that most of
the segment doesnt have that"*. theme.css: `.kpm-key` (4 px edge on the `.kpm-key.kpm-hot` pair,
sinks 2 px, staggered rise-in), `.kpm-well` (lamp black → amber), `.kpm-stamp`, `.kpm-plate`,
`.kpm-led` + `.kpm-roll` (odometer; `--led-ink` fixed). CustomerManager: rows/cards `kpm-key
kpm-hot`, FOLDER `.kpm-btn`, competitor table stacked under lg, five boxes tokened + 44, map button
ink. AgentInventoryView: `RollingCount`. Guards 1606 (red 12), audit 722. Lab: `?shell&agent&tick`
rolls the count 10 → 15 → 10. ✅ TEST owed (above).

## Shipped 2026-09-18 09:38 — Agent Inventory on the phone (`8b9b3f9`) — CONFIRMED 10:40

His words: *"board 1 yes, board 2 B that shows "afterboard 1" when pressed"*. Under lg the fixed
`h-[850px]` box is gone (one scroller: root 1347 ≈ page 1363), header `p-3` / `gap-3`, Saleable /
Quarantine 44, names wrap (`lg:truncate`), eight 10 px labels 11 (`text-[11px] lg:text-[10px]`),
and the Projected Value box folds behind its 44 px title row (`showProjected`, seeded from the
width; "Show ▾" / "Hide ▴"; inert on the desk). Measured after at 375: header 424 → 294, first
product row 642 → 520; desk probed at 1280 unchanged (root 680, toggle 36, chips 10). Guards 1595
(red 8 first), audit 722. Lab `?shell&agent` (`b1c77d8`; stub learned document snapshots).
✅ TEST owed on his phone (`https://192.168.1.132:4173`, packed build rebuilt): *"open Agent
Inventory — the whole screen scrolls as one; PROJECTED VALUE is one line with SHOW, tap it and the
three rows open and it says HIDE; Saleable / Quarantine are easy to hit; a long product name shows
in full on two lines"*.

## Shipped 2026-09-17 10:16 — Customers on the phone (`a9822ff`)

His words: *"yes to all but on the customer directory i want the customer name to be
alphabetically in order so that its easier to find them, for the question that u ask i think just
let it be like that do not need to change anything"* and *"i want the textbox background to be
dark when use darkmode and light when use light mode because right now it is white inside dark mode
and it is too bright bro"*. Form folded behind `+ ADD NEW CUSTOMER` (48 px) under lg, Edit opens it,
save folds it; every box 44 with surface tokens; Auto-Find / My GPS a half each; folder rows;
shop cards 222 → 199; Edit / breadcrumb 44; shops A→Z (`localeCompare 'id'`). Guards 1587 (red 8
first), audit 722, desk at 1280 unchanged. Lab `?shell&customers` (`6c230a6`).
✅ TEST owed on his phone (`https://192.168.1.107:4173`, packed build rebuilt).

## Shipped 2026-09-17 — the Sales Terminal on the phone (`4ba6563`) and the vault press (`dfc2392`)

His pick on the boards: *"just change into B because it fit well and doesnt take a lot of space
and bigger button as well users need it, manifest also looks better since there is more space to
press and read yes"*. Picture 96 → 64 (p-1, 56 px target), − + 44, tabs/search 44, every sheet
control 44, labels 11 (unit labels 10, one row), the customer-bar button fills its bar. Guards 1574
(red 8 first), audit 722 (G7b re-pointed), desk probed at 1280 unchanged. Left alone: the admin
field-mode toggle (27 px) and six 8.5 px eyebrow labels in the customer brief.
Vault press: the security-profile read now starts when the gate is shown; "Checking…" + spinner
on the button while anything is left; guards 1579. Not seen by eye (behind Google sign-in).
✅ CONFIRMED by Aldi 09:05: *"t1 approve, t 2 approve, t3 i just tried to close the incognito and open it again after that i manual google login , master vault panel shows up enter password and it instantly let me in after press so i havent be able to see the processing animation tho"* — the wait is gone, so the spinner had nothing to show. Lab: `?shell&terminal`, `?grip`.

## Shipped 2026-09-16 20:29 — `c5c7ed3` the phone ribbon rests a quarter of the way down

His ask: *"25% from upper right as default location instead of just 50%"*. `BiohazardTheme.jsx:285`
default `Math.round(window.innerHeight * 0.25 - RIBBON_H / 2)`; a dragged spot (`kpm-ribbon-y`)
still wins. Guard 2 red → 1552/1552, audit 722, measured 137/812 in the pane. Packed build
rebuilt and serving on `https://192.168.1.107:4173`. Sample nota re-sent (`sample-nota.png`,
cream sheet on a dark ground) for the real-phone scan test.

## Shipped 2026-09-16 — the nota scanner finds the paper, squares it, and has a corner editor

`helpers.findPaper` (Otsu → largest bright blob → hull → best quad, null on sticker / L / full
frame) · `helpers.homography` · `helpers.warpQuad` (bilinear, ≤ 800 wide; one cycle of the corner
order = a 90° turn) · `helpers.loadNotaPhoto` (one decode at ≤ 1600, shared) ·
`scanNotaToBase64(file, { corners, turns })`: photo → findPaper → warpQuad → scanPixels →
deskewAngle → JPEG 0.5, old path when no sheet. `PhotoField`: SESUAIKAN → `CornerSheet` (dialog
language, 4×44 px pointer handles, ATAS marks the top edge, PUTAR 90°, BATAL, PAKAI → rescan →
`onFile(file, scan)`), asli / scan switch. Lab `?photo` is a tilted perspective sheet; `&edit`
opens the sheet. notaScan 22/22 (10 → 22), logicFixes 1547/1547 (17 red with the sources stashed),
audit 722/722. Drag, PUTAR, PAKAI exercised in the pane at a measured 375: output 378×311 →
321×407 after one turn. Timing on the PC: findPaper 8 ms, warpQuad 19 ms at 1600×1200.

✅ CONFIRMED by Aldi 2026-09-16 20:50: *"test 1 approve, nota looks align and good"* (the sample nota,
full screen on the PC, photographed at an angle). Phone URL `https://192.168.1.107:4173` (packed build;
the PC's address changes whenever the router hands out a new one — .143 → .131 → .107 in three days;
read it from the preview server's `Network:` line before writing it anywhere). Still owed: the
goods-photo preview test, ❓ the "bandung 1 / muntilan 1" tab.

## Shipped 2026-09-15 — Restock Vault on the phone, complete

`096ac05` tabs wrap · `289161a` bigger panel, hints gone, 44 px · `3bac5b7` notice box, button
row, nota scan A · `39dc277` scan levelled (±15°) · `5319aef` photo previews (`PhotoField`).
Tests 1–4 CONFIRMED by Aldi at 09:45. Lab: `?shell&places`, `?tab=`, `?nota-scan`, `?photo`.

## Shipped 2026-09-14 — `2af2dd9` — CONFIRMED by Aldi

The bell is on the phone screen. Owed from 2026-09-13: `2771374`, `d4bd41a`; from 2026-09-12:
`8ed215f`.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Promoted and parked behind the sweep

* **Lot tracking by production date — Master Vault + Regional Warehouse. MOCKED, not built.**
  His two answers: *"either FIVO or FEVO should be able to use as option"* (08:50) and *"make sure
  that the regional admin and the restock sender can choose which product with specific production
  date/batch to be sent or carried to the agent inventory"* (09:15). So: stock per batch at HQ and
  at each branch; every KIRIM line and every load-to-agent line carries a batch picker, the setting
  (FIFO oldest-first / FEFO nearest-expiry-first) pre-selects, the person can pick another; the
  surat jalan prints the date. Mock: `lot-mock.png` (scratchpad 2026-09-15). DECIDED 09:35: *"looks cool tbh u can add that lot
  tracking later"* — the mock is right, build AFTER the phone sweep. DECIDED 09:40: *"fivo or fevo doesnt do shit actually lol
  just add one of those or something and also this is should just work as recommendation and preselect
  the batch where actually the regional admin can manually choose from the selection tab"* — FIFO
  ONLY, no setting, no FEFO: the oldest production date is pre-selected as a recommendation and the
  sender picks any other batch from the list. Drop the Settings switch from the mock. Then 09:42: *"maybe just put FEVO or Manual selection just for
  ergonomics"* — so the picker itself carries a two-way control: OTOMATIS (tertua dulu — the app takes
  the oldest batch, one tap) / PILIH BATCH (the list). Plain words on screen, never the acronym
  (clear-terms rule); he may rename them. Facts: intake lines have `batchNo` (required,
  `RestockVaultView.jsx:493`), stock is one number (`:625` increment; engine `:371`). Touches:
  intake (productionDate required), Master Vault stock, Branch Warehouse stock, KIRIM, load to
  agent, surat jalan, Agent Inventory, the sale engine (money — two independent checks), Stock
  Opname, reports; migration = one "unknown batch" per product. Brainstorm §2 has the models.
* **PhotoField on the other photo boxes — one per screen AS THE SWEEP REACHES IT**, his
  "add preview on all photo attachment on this app": customer storefront `CustomerManager.jsx:1337`;
  sale proof `MerchantSalesView.jsx:2202`, NOO storefront `:2964` (⚠️ T4–T6 camera-only, no file
  input in the DOM — `284ea64`/`1857b97`, do not reintroduce a picker), `:1863`; product image
  `ResidentEvilInventory.jsx:297`; logos `SettingsView.jsx:412`, `:1238`; avatar/logo/border
  `AgentProfileView.jsx:895`, `:904`, `:1066`; face `App.jsx:4750`. Each keeps its own tier rule;
  `scan` only for documents (nota), never for goods, faces or logos.
* **Nota scanner, if his real-nota test shows a miss:** findPaper assumes the sheet is the BRIGHT
  class and the table darker. A white desk merges table and sheet → the quad fills the frame →
  null → old path (the editor still opens with the frame as the default corners). If that is what
  his phone shows, the next step is an edge-based finder (Sobel + the same hull/quad), not a
  threshold tweak. Corner precision is ± one sample step (≈ 5 px at 1600) — inside the sheet, so
  the warp loses a hair of margin, never a band of table.
* **Parked, his words:** *"i was thinking on redesign the method the regional admin fill the
  agent inventory but we'll decide first if this really needed or not in the app"* — not a job
  until he says so.
* **The fleet form's tier picker paints T3 for a value that is not an option.**
  `src/FleetCanvasManager.jsx:149-153` `defaultAgentState.userRole: 'AGENT'`; `:843` the tier
  `<select>` is `value={newAgent.userRole || 'AGENT'}`; `src/config/permissions.js:2-9` has no
  `'AGENT'` id, so the browser paints the first option (`AREA_ADMIN`, "T3: HQ SALES MANAGER")
  while the state keeps `'AGENT'`, which `:72` normalises to T5 at read time. Form shows T3, saves
  a T5. ❓ for Aldi: which tier should a new Sales Motorist get by default — T5 (today, hidden) or
  T6 (what the label says)? Diff `ROLE_PERMISSIONS[FIELD_OPERATIVE]` vs `[ROOKIE]` before
  describing the change. Do NOT delete `:72` — old records rely on it. Edit paths `:374`, `:389`.

### Still ship-blocking, and both are his call

* **Rank Config cross-tenant gap.** `artifacts/cello-inventory-manager/settings/{achievements,
  rpg_ranks}` is ONE document shared by every company. Rules coverage was fixed; the shared path was
  not. Safe for one customer, not two — between tobacco competitors that is a confidentiality breach,
  not a bug. **Pasal 10 ayat (3) of the contract draft promises per-customer separation, so this is a
  clause he cannot honestly sign twice until it is fixed.**
* **PBKDF2.** The SHA-256 master-password hash is unsalted and single-round. `crypto.subtle` already
  offers PBKDF2; a per-company salt and about 100k iterations turns a claim that invites inspection
  into one that survives it. Offered, never answered.

### Business track — CLOSED and PARKED, do not reopen

All prices in one place: `A-Brain/Wiki/Entities/KPM Price Sheet.md`. Rp 5 juta/bulan recommended at
25-30 users, **Aldi leans Rp 10 juta** as intent, floor Rp 2 juta, perpetual Rp 250 juta, copyright
**not for sale**, final PPh Rp 0. Legal research: `Brainstorm/2026-09-10_riset-hukum-menjual-kpm.md`.
Contract draft: `Brainstorm/2026-09-10_draft-13-pasal-kontrak-kpm.md`. His private brief:
<https://claude.ai/code/artifact/4fed138f-1639-4317-b41f-41bbf6613305>

### Rebuild sales totals — DONE, stop asking

Aldi pressed it 2026-09-09 and 2026-09-10. **Do not put this on a list again.**

### Phone — the lab instruments that exist now

* `?shell` — the app shell (top bar, ribbon). `?places` — Restock Vault. `?gudang` — branch
  warehouse. `?nota`, `?label`, `?scan`, `?perf`, `?plan`, `?minkirim`, `?toast`, `?nota-scan`,
  `?photo` (`&busy`, `&edit`).
* `?css=<rules>` on any mount — render a proposed change before writing it.
* `preview_start` ponder-lab → `resize_window` 375×812 → probe with `innerWidth` in the same call.
  Headless Chrome crops under ~518; an iframe wrapper does NOT work headless (the frames never
  finish loading) — shoot at 518 for the file, measure at 375 in the pane.

### Wording — cheap, each one read by a customer

The EOD verify confirm claiming "clears their inventory" on a stamps-only card, the EOD `MATCHES`
column showing a dash when the numbers are equal, the audit receipt printing `BAYAR : CASH` on an
audit that collected Rp 0.

### Closed — do not reopen

**Money.** A cash refund does not reduce omzet. A completed sale is a closed contract; a retur is the
salesman's private arrangement. Buyback is off for everyone including the owner; Exchange stays.
`A-Brain/Wiki/Concepts/A sale is a closed contract — no cash goes back.md`. Not a bug.

**The sale-proof camera.** `284ea64` plus `1857b97`. T4 to T6 open a real `getUserMedia` view and
have no file input in the DOM in ANY build; T1 to T3 keep the picker. **Do not reintroduce a
build-mode escape hatch.** To let a tier attach a file, turn `photo_pick_from_gallery` ON in the
matrix, test, turn it off. Untouched on purpose: the GPS-bypass proof photo at
`MerchantSalesView.jsx:1863` and the NOO storefront photo at `:2964`.

**What "low" means.** Settled 2026-08-25, adopted everywhere 2026-09-12. Own MIN. ALERT (Bks) if
set, else the company default (qty + unit, default 3 Bal) converted per product. Blank means "use
the company default". `A-Brain/Wiki/Entities/What Counts As Low.md`.

### Appearance — deferred on purpose, last

About 180 blue and green Tailwind classes in app UI: `MapMissionControl.jsx` 58,
`FleetCanvasManager.jsx` 50, `JourneyView.jsx` 33, `ConsignmentFinanceView.jsx` 33. Receipt and
surat-jalan blues are legal.

### Still owed from earlier sessions

Round 7 Section D of `MANUAL_TEST_CHECKLIST.md` has never been run. C4 needs a second BANDUNG account.
`cdaabc7`, `967e447`, `83f5041` are unverified by eye. Bug 3, the geofence bypass routing, is still
unanswered — the GPS-bypass approvals were among the nine paths `da71cbd` re-routed, so re-check
before treating it as open.

</details>
