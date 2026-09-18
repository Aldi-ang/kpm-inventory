# The one job

**2026-09-18 21:10 — 5 = A and 6 = A are DECIDED (minus the LED); the NIXIE COUNTER is his ask and is built LIVE in `tools/lab-nixie.jsx` (`?shell&nixie`, `&nixify`); board 7 sent; his YES/NO + ❓ "does the Agent Inventory LED become nixie too" are owed.** When he says YES: move `NIXIE_CSS` into `src/styles/theme.css` (no shadow, no filter — G30) and `NixieCount` into `src/components/NixieCount.jsx`; use it for the count card's DIFFERENCE (20 px, signed) and the audit item's three plates (20 / 20 / 26); build 5A (amber until `recount.confirmed || recount.disagreement || damageBlocked`, `kpm-plate` on the plates, the `isRevealed` block as a grid-rows fold) and 6A (the itemized row `flex-col` on the phone with the three plates carrying EXPECTED / FOUND / DIFFERENCE); also `max-h-[40vh]` at `StockOpnameView.jsx:1326` → `lg:max-h-[40vh]` (a second scroller on the phone, found 19:35). If he says the Agent Inventory LED becomes nixie: `RollingCount` in `AgentInventoryView.jsx` → `NixieCount`, and `.kpm-led` / `.kpm-roll` retire once nothing uses them. Guards first, red → green; build + audit; 375 AND 1280 both tiers; one SHIPPED board; ✅ TEST; delete `tools/lab-nixie.jsx` and the `op-*` looks.

**The 19:20 note — the Stock Opname FLOOR is SHIPPED (`f72ef35`: his board 2 = A, board 3 = A, plus the size rules); the two LOOKS he refused are re-boarded and his letters are owed.** His words: *"too much red and not really have any animation or effect"* (the count card), *"too compact in a small space"* (the audit item). Board 5 = the count card look: **A** amber until the count is sure (red only for a confirmed difference / a refused submit), plates with the top light (`.kpm-plate` gradient), DIFFERENCE as an LED (`.kpm-led` + `.kpm-roll` digits), the verdict block folds open on the first typed number (`grid-template-rows 0fr → 1fr`, 260 ms, the ADMIN TOOLS fold) / **B** no bar, no edge, one stamp drops onto the corner. Board 6 = the audit item look: **A** name on its own line, three plates EXPECTED · FOUND · DIFFERENCE (16 px figures, the salesman's words), pills, Good / Damaged as two rows / **B** the difference at 28 px leads. Live: `?shell&opname&look=op-5a|op-5b&tab=count:400/3` and `?shell&opname&admin&look=op-6a|op-6b&tab=hq%20audits,bandung`. **When he answers, build in `src/StockOpnameView.jsx`:** for 5A the colour rule is STATE, not CSS — `hasTyped && !matched` today paints danger; it becomes accent while `recount.needsRecount` and danger only when `recount.confirmed || recount.disagreement` or `damageBlocked`; the plates get `kpm-plate`; the Difference value becomes a `.kpm-led` with the RollingCount pattern from `AgentInventoryView.jsx` (`RollingCount`); the `isRevealed` block wraps in a `grid transition-[grid-template-rows]` fold seeded open on the desk (`lg:` no transition) — guards first, red with the sources untouched. For 6A the itemized row `flex justify-between items-center mb-2 border-b` becomes `flex-col` on the phone with the SYS/FND/variance spans as three plates carrying the words EXPECTED / FOUND / DIFFERENCE (`lg:` back to the old row). Then build + audit, re-measure 375 AND 1280 both tiers, one SHIPPED board, commit, ✅ TEST in plain words, delete the four looks.

**The earlier note (18:58) — kept for the mount and the recipe:** Stock Opname is MEASURED and BOARDED, his answers are owed. Four boards sent (`board1..4.png`, scratchpad `op/`): 1 the T5 count card TODAY/AFTER (YES/NO), 2 the damage-kinds reel A (44 px arrows, row 92) / B (arrows gone, tap the name), 3 the boss's four tabs A (two rows of two) / B (one row of four), 4 the boss's lists TODAY/AFTER (YES/NO). Every option is a live look: `?shell&opname&look=op-1|op-2a|op-2b&tab=count:400/3,3%20damaged` and `?shell&opname&admin&look=op-3a|op-3b|op-4&tab=hq%20audits,bandung` on the lab (`preview_start ponder-lab`, `--host`, read the address off `preview_logs`). Measurements + the rejected paths: `A-Brain/Brainstorm/2026-09-18_stock-opname-di-hp.md`. **When he answers:** the looks become classes in `src/StockOpnameView.jsx` with `lg:` resets (title `text-xl lg:text-2xl`; every `text-[10px]`/`text-[9px]` on the phone → `text-[11px] lg:text-[10px]` etc.; `min-h-[40px]` → `min-h-11`; the upload label `min-h-11`; the footer Reset `flex-none lg:flex-none` + Submit `px-4 lg:px-8`; the reel `--dmg-row` via a phone-only rule in `theme.css` under `max-width:1023px` for A, or `hidden lg:flex` on the arrow column + `self-stretch` on the face button for B; the strip `grid grid-cols-2 gap-1 lg:flex` for A; every `<select>` `min-h-11`; the audit item name `lg:truncate`; the quarantine info line `flex-wrap lg:flex-nowrap`), guards written FIRST and red with the sources untouched → green, `npm run build; node src/config/integration.audit.mjs` (stop the lab first), re-measure at 375 AND 1280 (both tiers), one SHIPPED board, commit, ✅ TEST in plain words, delete the six looks from `tools/lab-looks.js`. **Also owed before that counts:** ❓ his phone — NEW or OLD Customers page (the server was OFF 18:07–18:35; it is up again, same address) · ✅ EOD `84e102f` · ✅ Customers `5d7a9d0`. Next screen after Stock Opname: Journey Plan.

⚠️ **The earlier note (SESSION CLOSED 2026-09-18 16:55)** — kept for the checks: at his *"just prepare notes and prompt for later i'll try again"*; plan quota 93 % (resets ~18:20 WIB), weekly 61 %. **FIRST THING NEXT SESSION — before the sweep:** his phone at `https://192.168.1.132:4173` still showed the OLD Customers page after `5d7a9d0` (his 16:48 screenshot: three gold buttons beside the title, DEL / EDIT on the rows) even after a reload; a private tab could not sign in (Safari Private Browsing blocks the storage Firebase's Google sign-in needs — never use it as a test again). He was told to delete the site's Website Data (Settings → Safari → Advanced → Website Data → `192.168.1.132`) and reopen in a normal tab. Read his reply. If it is STILL old, the server is suspect, not the phone: run `curl -sk https://192.168.1.132:4173/ | grep -o 'index-[^"]*\.js'` and compare with `dist/index.html` (built 16:40, `index-2b8lX-YD.js`, which DOES contain "Admin tools"); confirm with `preview_list` that the process on 4173 is `kpm-preview` (`npm run preview -- --host`, cwd this repo) and not something older — if in doubt `preview_stop` it and `preview_start kpm-preview` again, then read the `Network:` line. The PWA worker has `skipWaiting` + `clientsClaim` (checked in `dist/sw.js`), so two normal reloads after the data wipe must show the new build. Only when he confirms the new page do the two ✅ TESTs below count.

**The Stock Opname screen on the phone — the sweep moves on.** Customers round two is DONE (commit below, his "Board 1 = A, Board 2 and 3 also A", 2026-09-18 16:26; ✅ TEST owed on his phone). The sweep order he set on 2026-09-15: Sales Terminal ✓ → Customers ✓✓ → Agent Inventory ✓ → EOD Setoran ✓ → **Stock Opname** → Journey Plan → Sampling → Agent Profile. Same method, one morning per screen: mount in the lab, measure at 375 in the real shell — **as the tier that actually uses it AND as tier 1**, because the Customers sideways move lived only in the boss's header and two T5 measurements missed it — propose as frames, build what he picks.

Open the session by reading his test replies first. TWO ✅ TESTs are owed on `https://192.168.1.132:4173` (read the address off the kpm-preview server's `Network:` line before writing it anywhere): the EOD Setoran commit `84e102f` and the Customers round-two commit below. If he reports a miss, fix that first.

**Why it costs him money:** Stock Opname is where the count is taken against the book — a salesman (T5) counting blind, the boss / area admin monitoring pending audits and quarantine. A miscount that cannot be entered on a phone becomes a paper count re-typed later. Never measured at 375 inside the shell after the `p-2` cut.

## The mount (exact, read from the live files 2026-09-18 14:00)

`App.jsx:5068` `{activeTab === 'stock_opname' && (` → `:5069` `<StockOpnameView` with NO wrapper — a direct child of the shell's `biohazard-content`, like EOD. Lazy-loaded at `App.jsx:46`. Component `src/StockOpnameView.jsx:194`: `({ inventory = [], transactions = [], db, storage, appId, user, userRole: liveRole, isAdmin, logAudit, triggerCapy, motorists = [], appSettings })` — 1737 lines. `:206` `userRole = liveRole || user?.userRole || 'AGENT'` (App passes `userRole={userRole}` AND `user={{ ...user, userRole }}`); `:209` `canSeeExpectedCount(userRole)` — T3 and above see the expected number beside each line, a T5 counts blind. `:222` `viewMode = isHighCommand ? 'monitor' : 'count'` — TWO screens in one file again: the counter's COUNT flow and the boss's MONITOR (pending audits `:269`, quarantine logs `:276`, branch inventory per facility `:289`). Sweep the T5 COUNT flow first (`userRole="FIELD_OPERATIVE"`, `isAdmin={false}`, `user={{ uid: 'lab-t5', displayName: 'Lab Salesman', email: 'lab@example.com', location: 'MUNTILAN', userRole: 'FIELD_OPERATIVE' }}`), then the boss as `&admin` (`userRole="ADMIN"`, `isAdmin`) — measure BOTH before proposing. The branch-inventory listener at `:231` runs only for `isAreaAdmin` and reads `artifacts/lab/users/<masterId>/branches/MUNTILAN/inventory` — a COLLECTION, so the stub wants an ARRAY fixture keyed by the path tail: `FIXTURES['branches/MUNTILAN/inventory'] = [...]` (`tools/lab-firestore-stub.js:35` matches `path.endsWith(key)`); `pending_audits` and `quarantine_logs` the same way for the boss. `inventory={[...LAB_PRODUCTS, ...LAB_VAN_EXTRA]}`, `transactions={LAB_AGENT_TXNS}`, `motorists={LAB_MOTORISTS}`, `db={{}} appId="lab"`, `logAudit={() => {}}`, `triggerCapy={() => {}}`, `appSettings={{}}`, `storage={{}}`. It writes through `addDoc` (`:582`, `:585`) — the stub already has `addDoc`; record nothing, the lab is for looking. In `tools/ponder-lab.jsx` `ShellLab()` add `q.has('opname')` before the `eod` branch (that block is the pattern). Already seen from the file, unmeasured: `:1582` a 40 px button at 10 px type.

## How to measure and propose — the recipe is settled, do not re-derive it

`preview_start ponder-lab` (it runs with `--host` now, so his phone can open `http://192.168.1.132:4190/tools/ponder-lab.html?…` — read the address off `preview_logs` first) → the lab page is `http://localhost:4190/tools/ponder-lab.html` (the root `/` serves the real app and dies on the stub — a blank page with a `connectFirestoreEmulator` error means the wrong URL; a blank page with `Failed to reload … 500` in the console means a SYNTAX ERROR in a source file — `preview_logs` names the file and line) → `resize_window` 375×812 → `?shell&opname` and `?shell&opname&admin` → the probe reads `innerWidth` in the SAME call as every rect; both themes (`&light`); list every control under 44, every text under 11, anything wider than 375 (read the shell scroller's `scrollWidth` — it was 521 on the boss's Customers page while every element's own rect looked fine), the row height, and whether the component is a fixed-height box (Agent Inventory was `h-[850px]`, EOD's deck `h-[344px]` → two scrollers). ⚠️ THE PANE DOES NOT ADVANCE A TRANSITION UNTIL IT PAINTS: a rect, a transform, a border colour or a grid-template-rows read within seconds of a press can be the START value (the EOD box read 41×89 for 44×96; the ⋯ key's amber border read as line-2 after 400 ms and was amber the moment a screenshot forced a paint). Take a `computer` screenshot, THEN read the property. Headless PNG at `--window-size=518,1250` with `look=pin` (`#root{width:375px}`), cropped to 375 in the compose page (`object-fit:none; object-position:0 -Npx`); captions ABOVE the frames. `?tab=<label>,…` presses buttons by label (textContent, not aria-label — the ⋯ key is pressed as `%E2%8B%AF`), `cursor-pointer` cards when no button carries the label, and `type:<value>` types into the first enabled visible input; `&held` puts `lab-held` on the first `.kpm-key` for a held-state still. Boards: TODAY beside each fix through `?look=<name>` entries in `tools/lab-looks.js` (write them, ship, delete them — the contract at the top of that file), YES/NO or a letter per board, recommended one marked. The TODAY frame must show the defect the pane measured — if the defect sits below 812, shoot taller and say so in the caption. No code before he answers. Then classes with `lg:` resets, element-scoped guards written FIRST and red with the sources untouched → green, `npm run build; node src/config/integration.audit.mjs` (stop the lab first), re-measure at 375 and 1280, one SHIPPED board (dark / light / desk), commit, ✅ TEST line with the checklist written out in plain words.

Traps. (a) `index.css` `button:has(> svg:only-child)` forces inline-flex + 44 px on any button whose only ELEMENT child is an icon — put the label in a `<span>`. (b) Inputs with no `bg-` class are white in dark mode; `bg-[var(--inset)]` on a raised card, `bg-[var(--raised)]` inside an inset block, `text-[var(--ink)]` always — Stock Opname has count inputs, check every one. (c) `code()` in the selfcheck strips block-comment spans; a negative guard must run on `code(a)` or your own explanatory comment fails it. (d) A `{/* JSX comment */}` as the first thing inside `return (` or `cond ? (` is a parse error — logicFixes sweeps for it; run the selfcheck before touching the pane. (e) The lab stub's `onSnapshot` answers a DOCUMENT listener when the fixture is a plain object, a collection when it is an array. (f) Every frame at a MEASURED 375 inside the shell. (g) Phone-only 11 px type is `text-[11px] lg:text-[10px]` so the desk stays pixel-identical. (h) SIDEWAYS RATCHET (logicFixes): no `<table>` under lg may carry a bare `min-w-[Npx]`; only `HistoryReportView.jsx:500` / `:808` may — Stock Opname's monitor side may have tables; grep `<table` first. (i) Utility-class selectors like `.flex.gap-2` match MORE than the group you mean (the title `<h2>` and the DEL button both carried them) — scope a guard or a look to the tag (`div.flex.gap-2`) or to a real class. (j) One set of buttons for both widths: the phone relocates the SAME elements with `contents lg:flex` on their wrappers and grid placement on the row — never a second copy of the buttons.

## Paste this to start the next session

```
/alucard
Read `.claude/NEXT-SESSION.md` first — it is the whole job, do not re-read source to re-orient.
FIRST read my replies: (1) my phone — NEW or OLD Customers page; if OLD, the server checks at the top of the note; (2) the two ✅ TESTs (EOD `84e102f`, Customers `5d7a9d0`) — a miss is fixed first; (3) my four Stock Opname letters (board 1 YES/NO, 2 A/B, 3 A/B, 4 YES/NO). Then BUILD what I picked in `src/StockOpnameView.jsx` (+ `theme.css` for the reel), exactly as the top paragraph of the note lists the classes — phone-only with `lg:` resets, one set of elements for both widths, guards first (red with the sources untouched → green), stop the lab, `npm run build; node src/config/integration.audit.mjs`, re-measure 375 AND 1280 as T5 and as the boss, one SHIPPED board (dark / light / desk), commit, ✅ TEST in plain words, delete the six `op-*` looks from `tools/lab-looks.js`. Then rewrite this file: Journey Plan on the phone is next.

Traps. `button:has(> svg:only-child)` beats `lg:hidden` — label in a span. Bare inputs are white in dark mode — surface tokens on every box. A negative guard runs on `code(a)`. No `{/* */}` before the root element in `return (` or `? (`. The pane does not advance a transition until it paints — screenshot, then read. Scope selectors to the tag, never to utilities alone. The stub paints the count rows and the audit rows one tick late — `?tab=` presses poll for them now. The boss's `<select>` is the tap target, its padded wrapper is not.
Rewrite this file with the next single job before closing.
```

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
