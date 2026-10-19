# Alucard — Lessons

Alucard writes here; it may never edit `SKILL.md`.

**Status: WORKING. The cap is gone as of 2026-08-24.** It jammed twice under the old rule
(2026-08-10, 2026-08-18) for the same reason both times: a cap of 5 with every entry useful has
nothing to evict, so the loop went silent without erroring. The file is now bounded by
USEFULNESS instead of by a number — see `SKILL.md` §8a–8c.

Rules, short version:

- **Every entry opens with a `**Status:**` line.** `LIKELY` = written, never fired, a hypothesis
  about your own behavior. `LIVE` = has a recorded `Fired:` date. `RETIRED (YYYY-MM-DD) — why` =
  no longer applies. A resolved status without its date is invalid.
- **No cap.** Before appending, archive every entry RETIRED *before today* to
  `A-Brain/Wiki/Lessons-Archive.md`. Same-day retirements stay until tomorrow so parallel
  sessions can see them.
- **A rule that never fires is broken, not archivable.** LIKELY for 14+ days of real work → the
  trigger is wrong or the rule is a platitude. Retire it, or convert it into something structural
  (an audit check, a self-check, a hook) and retire the prose.
- One entry per invocation at most. `Would have prevented:` must name a cost that actually
  happened — an entry that cannot is a platitude, do not write it.
- Never edit or delete a past entry; supersede it with a forward link.

Format:

```
### YYYY-MM-DD — <short lesson>
**Status:** LIKELY
**Trigger:** <the checkpoint this fires at — plan time / before a mutating action / before a completion claim>
**Lesson:** <what to do differently>
**Would have prevented:** <the specific cost that actually happened>
Seen: YYYY-MM-DD
Fired:
```

---

<!-- entries below this line -->

### 2026-08-19 — a slice end must never be a raw indexOf result
**Status:** LIVE
**Trigger:** before trusting any check that slices a source file to scope an assertion — the
moment an `indexOf` result is handed to `slice` as its end.
**Lesson:** assert the anchor was FOUND first. `indexOf` returns -1, and `slice(from, -1)` means
"to one before the end of the file", so a missed anchor silently returns everything. Anchor on
CRLF-safe text, and pin the slice's own length as a check.
**Would have prevented:** S26 used `'
}
'` as its end anchor. Every file in this repo is CRLF,
so it never matched: the "class" slice was 267 KB — the rest of App.jsx — not the 1.9 KB class.
All twelve checks passed by finding their strings somewhere else in the file and read green for a
whole day, including in two reports to Aldi. S28 then repeated it, anchoring on 'If Sold', which
also matches a comment eighty lines above the row.
Seen: 2026-08-19
Fired: 2026-08-24 (G3 + POV check blocks both assert the anchor was found before slicing - `fStart > -1 && fEnd > fStart`, and the PovBanner slice pins its own length)
Fired: 2026-09-06 (both new hand-off slices assert their anchors first - handleRequestTransfer's body and the picker's own select - and the handler slice pins its own length between 500 and 6000 chars)
Fired: 2026-09-07 (both new check sections assert their anchors before slicing and pin the slice length - the store-label block between const rosterNameById and const activeCustomer, and the save-guard block between const handleSaveAgent and const isDupPlate)
Fired: 2026-09-08 (handleAdminApproveTransfer's slice was a fixed `apFrom + 6000` window, which silently shrinks in scope every time the handler grows - and it grew by 16 comment lines this session. Re-anchored to `const handleSubmitEOD` with both ends asserted and the length pinned to 3000-12000.)
Fired: 2026-09-20 (the EOD stamp-sum slice ended at `indexOf('const total')`, which had matched reportSection's `const totalBksDecimal` 300 lines away; deleting reportSection turned the anchor red - the slice had been reading past the loop for weeks. Re-anchored to the loop's own last line `expectedCukai = Math.max(0, calcTotal`; the new handleVerifyEOD slice asserts both anchors and pins 6000-30000 chars.)
Fired: 2026-09-30 (TWICE: the new switch section asserts every slice's ends; and two OLD bay helpers `fnOf(src, name)` with a raw `indexOf('\n  }\n')` end ran to EOF after a `git stash` round-trip rewrote LoadingBay.jsx to CRLF - a correct file went red. Hardened: CRLF stripped, both ends asserted, proven green on a CRLF copy)
Fired: 2026-10-12 (the A4 company-ink guard asserts from > -1 && to > from and pins the sheet slice above 3000 chars; its first end anchor reached into the format picker and was narrowed to the first no-print bar)

### 2026-08-18 — scope a guard to the ELEMENT, not to a string that appears on it
**Status:** LIVE
**Trigger:** before adding a regression guard that greps a source file for a colour, class or
literal — the moment the assertion is about ONE element but the search is file-wide.
**Lesson:** slice the source to that element first (from its handler or a unique attribute to the
end of its tag), then assert inside the slice. A file-wide match will find a lookalike.
**Would have prevented:** three attempts at one guard tonight. `bg-[var(--danger)]` also matched
inside `hover:bg-[var(--danger)]`, inflating a sweep from 11 real hits to 17; then a glow guard
matched the WANTED total's drop-shadow; then the same guard matched the Pay Bounty button, which
legitimately uses the same rgba. Each one looked like a real finding until it was opened.
Seen: 2026-08-18 (three times in one session)
Seen: 2026-09-04 (same root, a WRITE this time rather than a guard: a global `sed s|719/719|720/720|`
on PROGRESS.md to update the header total also rewrote 719/719 inside an EARLIER entry, where 719
was the correct number at the time. It silently falsified a past record and needed its own fix
commit, a93ba8e. An unanchored pattern finds a lookalike whether it is reading or writing — anchor
the substitution to the line that owns it, or edit that one line by hand.)
Fired: 2026-08-19 (S26 - the boundary guards slice from `class LazyTabBoundary` and from `<LazyTabBoundary` to their own closers, not file-wide; `<Suspense` appears elsewhere in App.jsx and would have matched)
Fired: 2026-08-24 (twice - a PovBanner `onClose` guard matched the PICKER's close button further down the file until it was scoped to the banner's own function body; and the `handleLoadCanvas` guard went red against correct code because stripComments keeps a comment's newlines, so the five-line note ate the whole slice window)
Fired: 2026-09-01 (group 58's ban on the scan writing a status matched `status: 'ARRIVED'` inside the TIMELINE entry, which is a log line and not the document's state - it went red against correct code until it was scoped to the updateDoc payload, the slice before `workflowTimeline:`)
Fired: 2026-09-01 (the new drag guard used a 900-character distance window instead of a slice - `!/onMove[\s\S]{0,900}?setTurned/` - and stayed GREEN when `setTurned` was injected into `onMove`, because the comment above the line pushed it past the window. Re-scoped to onMove's own body between asserted anchors, then re-trialled: red.)
Fired: 2026-09-06 (a file-wide grep for `handoffEligibility` in a 9000-line App.jsx would have passed on an import alone; scoped to handleRequestTransfer's body, and the picker guard scoped to the hand-off select rather than to `dropdownAgents`, which is a DIFFERENT control further up the same file)
Fired: 2026-09-08 (the guard asserting the receiver clause is GONE from handleAdminApproveTransfer went red against correct code - the warning comment written above the fixed line quotes the clause it tells you not to restore, so a raw grep could not tell a warning about a line from the line. Re-scoped through `code()`, which the same file already uses for the queue-side assertions.)
Fired: 2026-09-09 (INVERTED FORM — the POV guard read `previewing = null }) {`, anchoring on the closing brace of a props list. Appending `masterUserId` after it turned a check about the tier preview red for a change about vault routing. Not a lookalike found, a real element MISSED: an anchor on a neighbouring character breaks in both directions. Re-scoped to the prop itself.)
Fired: 2026-09-16 (the SESUAIKAN guard is scoped to the GANTI/HAPUS row's own span, the sheet guards to `function CornerSheet` onward, and the pipeline-order guard to scanNotaToBase64's body between its export and compressImageToBase64 - a file-wide `scanPixels(` would have matched the old path too)
Fired: 2026-09-18 (a LOOK, not a guard, this time: `.flex.gap-2` matched the title <h2> and `.flex.gap-1` the DEL button as well as the groups — two frames drew the wrong element until the selectors were scoped to `div.flex.gap-2` / `div.flex.gap-1`; the guards were written against the scoped strings from the start)
Fired: 2026-09-18 evening (again a look: `div.flex.items-center.gap-4{flex-wrap:wrap}` was meant for the quarantine info line and also caught the audit row header, so the icon wrapped above BANDUNG in the AFTER frame — one extra render round; re-scoped to `div.flex.items-center.gap-3.mt-1.font-mono`)
Fired: 2026-09-20 (two theme guards sliced from their block to the END of theme.css — `.kpm-folders {` and `.kpm-led-line {` to EOF — so the player card's blur, a new block appended after the docket, failed BOTH; scoped each to its own block with the end anchor asserted — `.kpm-folders {` → `.kpm-docket {`, `.kpm-led-line {` → `.kpm-folders {`)
Fired: 2026-09-24 (the Player Card no-shadow guard sliced theme.css from its heading to END OF FILE, so the new bay CSS appended after it went red; the slice now ends where the bay begins)
Fired: 2026-09-30 (the "Quarantine squares never drag" guard pins the q grid's own opening tag and counts `startDrag(e, 'wh')` exactly once, not a file-wide absence)
Fired: 2026-10-12 (the tutorial-book guard reads each page button's OWN className - a `<button[^>]*>` match stopped at the `=>` inside the card's onClick and failed on correct code; the amber-button guard likewise scoped to each button's tag, not the file)

### 2026-08-18 — build the viewing path; never report a look you did not get
**Status:** LIVE
**Trigger:** before saying any visual change works — a theme, a layout, a published Artifact.
**Lesson:** get eyes on it. The KPM path is documented (`A-Brain/Wiki/Concepts/Looking at the App.md`,
`tools/theme-lab-server.mjs`); for a JS-built page, execute it in Node with a stubbed `document`.
Handing the look back to Aldi unverified is the LAST resort, after the harness has been tried.
**Would have prevented:** 2026-08-16 — told him light mode was fixed, then the shell, then the
background, having rendered nothing. His reply: *"the background is still black on light mode, why
are u rushing things that havent done"*.
Seen: 2026-07-30, 2026-08-02, 2026-08-16
Fired: 2026-08-18 (carried forward from the archived entry; the fires that earned it are in Lessons-Archive.md)
Fired: 2026-08-24 (refused to claim the new Settings permission row worked while the Master Vault password screen was up - reported it unseen instead; got eyes on it later the same session once he opened the vault himself, and it was correct)
Fired: 2026-09-02 (the tech-pad draft was rendered at phone width before it was reported - the display painted behind its own housing and was invisible while the DOM was entirely correct; nothing but the frame could have caught it)
Fired: 2026-09-06 (the greyed-out picker option is behind Firebase auth inside a selected consignment store; reported unverified in the commit, the note and the reply rather than claimed)
Fired: 2026-09-09 (built the headless-Chrome harness for the sale-proof camera and looked at both themes before claiming it; the frame is what showed the gold TAKE PHOTO plate and the danger well were on palette)
Fired: 2026-09-13 (BEFORE and AFTER frames of the toast-over-dialog fix rendered through a new `?toast` ponder-lab mount, both themes, before the claim; the AFTER frame is what showed the dialog border drawn over the dimmed strip)
Fired: 2026-09-14 (top bar at 375 rendered BEFORE and AFTER in dark, AFTER in light, and at 1280 to prove the desk did not move - before the wrap was claimed)
Fired: 2026-09-16 (the corner sheet was rendered headless AND exercised in the pane at a measured 375 - drag, PUTAR, PAKAI, output 378x311 -> 321x407 - before SESUAIKAN was claimed to work; the iframe wrapper that would have given a 375 PNG never finished loading and was dropped, not reported as proof)
Fired: 2026-09-21 (the 900 ms VERIFIED seal fell between two pane screenshots four times; the timer was held at 20 s from the console and the frame taken before the seal was reported as playing - the DOM read alone would have been a measurement, not a look)
Fired: 2026-09-24 (round 4: twelve frames at 1440/518 dark/light; the both-closed frame caught a clipped DITOLAK chip that every check had passed)
Fired: 2026-09-30 (the End island: headless frames at PC + phone read back before the publish; the first frame showed the island running into the caption and the underside sparkling, both fixed and re-shot)
Fired: 2026-09-30 10:05 (v26 healthy doors: the first frame of the vault wheel read as a gun sight and the moving doors showed black teeth - both redrawn before he saw them)
Fired: 2026-10-01 21:18 (version line: the first frames showed the sign-in line in a bordered box that read as a second button, and capitals under a mixed-case row - both fixed before he saw them)
Fired: 2026-10-02 (showcase hero: three looks shot headless at a real 390 dpr 2 and at 1440, every frame Read before the boards went out; the first look found the copy pushed off-screen while docW still read 390)
Fired: 2026-10-03 (rajangan research page: artifact link needs sign-in in the browser pane, so it was served through a temporary vite lab entry and looked at 390 px, dark and light, before the claim)
Fired: 2026-10-13 (demo door boards shot headless + Read before the ask; the first read caught the fonts falling back)
Fired: 2026-10-16 (presentation v7: twelve headless frames at 390 + 1440 Read before the publish; the first 1440 read showed every 3D floor spilling over the text under it - fixed by measuring the turned floor, re-shot)

### 2026-08-24 — a handoff that promises a fix must be run against the check that governs it
**Status:** LIVE
**Trigger:** before writing `.claude/NEXT-SESSION.md`, or any brief that tells a future session
"the fix is X" — the moment a specific edit is named as the job.
**Lesson:** run the governing check against a TRIAL of that exact edit before promising it, and
paste the real output into the brief. A plan derived by reading tokens is a hypothesis; the check
is the authority. If the trial cannot be run, write the brief as a question, not as an instruction.
**Would have prevented:** the 2026-08-23 brief promised the brown sweep was "a two-line token
swap, not 217 edits" and shipped that as the paste-ready prompt. On 2026-08-24 the trial failed
four contrast pairs, and the feasibility windows proved NO colour could satisfy both rules. The
next session opened at 87% quota, spent it discovering the job was impossible, and shipped no
pixels. One trial run at write time would have turned the brief into the right question instead.
Seen: 2026-08-24
Fired: 2026-08-31 (the 2026-08-30 brief said beats 5 and 6 of product-performance.js "both use at: 'bottom' now"; the file still said at: 'near' - the interrupted command never landed and the brief recorded the intention as the state)
Fired: 2026-09-06 (NEXT-SESSION.md written as a QUESTION, not an instruction - the replace-vs-add answer changes the notification target and the button gating, so no specific edit could be promised)
Fired: 2026-09-12 (NEXT-SESSION.md names CustomerManager.jsx:248/:1037 and MerchantSalesView.jsx:552 — all three read from the live file before being written into the brief)
Fired: 2026-09-13 (the new brief names `CustomerManager.jsx:935/:956/:1440` and the `placeholder:italic` precedent in 4 sibling inputs — all read from the live files — and records that `logicFixes.selfcheck.mjs:5957` anchors on the literal `SSOT Violation` and must be re-anchored before the reword)
Fired: 2026-09-16 (the Sales Terminal brief names `App.jsx:4856/:4874`, `MerchantSalesView.jsx:42/:2202/:1863/:2964` and `ponder-lab.jsx:571/:578/:607` - every one grepped from the live files before it was written; the old queue line `MerchantSalesView.jsx:2202` re-verified rather than copied)
Fired: 2026-09-24 (the brief said handleLoadCanvas is "not edited" AND "MUAT VAN calls it once per product" - it took no arguments, so both could not hold; read the code before trusting it, changed only its inputs and report, said so in the commit; the new brief names lines read live)
Fired: 2026-09-30 (the regional-warehouse brief was about to name `?shell&gudang`; tools/ponder-lab.jsx has only `?gudang`, OUTSIDE the shell - the brief now tells the next session to add the shell mount first)
Fired: 2026-10-12 (the demo brief promises no edit - it is a design round ending in his pick - and tells the next session to re-read every file:line in the older blocks from live code)

### 2026-08-25 — a check that greps source also reads the comment explaining the bug
**Status:** LIVE
**Trigger:** writing a regression guard that asserts a bad pattern is ABSENT from a file —
`!/emerald-/.test(src)`, `!/getRandomColor\(/`, `!/box-shadow/`. Any "the broken form must not
come back" check in this repo, which is most of how it verifies itself.
**Lesson:** strip comments before testing. The file that had the bug removed is exactly the file
that now explains, in prose, which pattern was removed and why — so the guard matches the
apology instead of the code and fails on a file that is correct. Add
`const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'')` and test
`code(src)`. Same trap when slicing a region to scan: start the slice at the first RULE, never at
a heading inside a comment, or the opening `/*` is outside the slice and the stripper sees no
pair to remove.
**Would have prevented:** 2026-08-25, the dashboard rebuild. Three guards failed on their first
run against correct code: SafetyStatus.jsx names `text-emerald-500` and DashboardView.jsx names
`getRandomColor()` inside the comments recording their removal. Three turns of patching checks.
Seen: 2026-08-25
Fired: 2026-08-27 — G53 was written without the `noCmt` that G48 already carries, so the shipping
modal comment "the original was `text-white` on `bg-black/50`" failed the check forbidding those
two classes on a correct file. Fix the check, never the comment.
Fired: 2026-09-09 (twice in one turn on the Titip revenue rule. A regression check `!/itemsReturned/.test(read(salesRollup))` failed on correct code because the comment above salesDelta explains at length why the subtraction was removed; then `<DashboardView[^]*handleRebuildSalesStats=` matched the comment documenting that exact bug at the SettingsView call site. Both fixed by wrapping the read in `code()`.)
Fired: 2026-09-29 (the new resource==null guard tests code(rules), so the CHANGE 12 comment quoting the old `email == request.auth.token.email ||` cannot satisfy or break it)
Fired: 2026-10-02 (bell self-check: !/isSticky/ went red on the toastSeverity.js header comment; wrapped in code() before trusting it)
Fired: 2026-10-11 07:25 (the message-strip guards read Toast.jsx and useSound.js through code() - both new comments name `commit` and `tap`)


### 2026-08-27 — a check anchored on display copy fires on every wording change
**Status:** LIVE
A check that greps for a user-visible string is really two assertions welded together: the
invariant, and the exact words it happens to be phrased in. Only the first one is the point.
Anchor on the CLAIM (`/last 7 days/`), never on its punctuation or language.
**Would have prevented:** 2026-08-27, the Sebaran Stok session. The check tying the panel's
printed window to the 7-day transactions listener anchored on the literal `Terjual = 7 hari
terakhir`. It fired TWICE on pure copy edits — first when a retitle made it `terjual · 7 hari
terakhir`, then again when Aldi asked for English labels. Two full `npm run build` + audit cycles
and two repair edits, neither of which touched a single line of logic. Re-anchored on the claim
the second time; should have been written that way the first.
Seen: 2026-08-27
Fired: 2026-08-31 (Aldi renamed the registry tab twice in one hour — Tempat, then Daftar, then Data Induk. The guards that shipped with it pin the tab label against every message that points at it, and pin the wording nowhere)
Fired:

---
Fired: 2026-09-13 (found at plan time for the NEXT job, not after: `logicFixes.selfcheck.mjs:5957` orders two guards by `indexOf('SSOT Violation')`, so rewording that refusal would go red on correct code — the brief tells the next session to re-anchor on the predicate first)

### 2026-08-27 — a harness that does not reproduce the ANCESTOR is testing a different page
**Status:** LIVE
**Trigger:** before claiming a component works from a frame rendered in an isolated harness —
any lab, storybook page or scratch file that mounts the component somewhere other than where the
app mounts it.
**Lesson:** copy the ancestor chain, not just the markup and the stylesheet. `backdrop-filter`,
`filter`, `transform`, `contain` and `will-change` each make a containing block, so a `fixed`
child measures against THAT element instead of the viewport. Anything that escapes its parent —
a modal, a popover, a tooltip — belongs in `createPortal(…, document.body)` and should be checked
for it, because the isolated harness is exactly where this is invisible.
**Would have prevented:** 2026-08-27. The tutorial book was rendered, screenshotted in two themes
and shipped as verified. In the app it mounts inside the glass top bar, whose `backdrop-filter`
turned `inset-0` into a 90px strip of chrome, and Aldi got a torn ribbon across his header:
*"the book is broken bruh, check it before u give it to me"*. The lab had no glass ancestor and
showed it perfectly every time. Third variant of this trap in two days — the others were a harness
with invented markup and one whose viewport was silently 518px wide.
Seen: 2026-08-27
Fired: 2026-08-31 (the surat jalan modal mounted alone in the ponder lab rendered perfectly white; the bug lives in a rule scoped to .biohazard-content, the shell wrapper the lab did not have. The lab now carries the class AND a verbatim copy of the rule, pinned by a selfcheck)
Fired: 2026-09-15 (fourth variant, and this time on a PROPOSAL not a claim: tabs-options.png was rendered in the bare ?places mount, desk 325 px; inside the shell's p-6 and App.jsx's border-4 p-4 the desk is 271 px, so the fix Aldi approved as two rows ships as three. `?shell&places` now mounts the desk inside the real wrappers; the same rule applies to a DECIDE frame as to a "works" frame)
Fired: 2026-09-17 (?shell&terminal mounts MerchantSalesView inside the App.jsx:4874 bare box copied verbatim, inside the shell, before any 375 number is trusted)
Fired: 2026-09-18 (?shell&eod mounts EODReconciliationView with no wrapper inside the real shell as App.jsx:5022 does, before any 375 number was trusted; the deck strip and the 110 px name column are shell numbers, not harness numbers)
Fired: 2026-09-29 (the quarantine prototype's widths - bay 1019 / 365, boxes 460 / 419 - were read off the real bay in `?shell&fleet` before a line of the section was drawn)
Fired: 2026-09-30 (the lab had only ?gudang, OUTSIDE the shell; ?shell&gudang was added with App.jsx:5031's box copied before any desk width was measured - 1240 / 394)
Fired: 2026-10-04 (Journey test ran in ?shell&journey, the real shell mount, never a bare one)

### 2026-08-27 — an inherited explanation is a hypothesis, whether it is a prior diagnosis or a known artifact
**Status:** LIVE
**Trigger:** two moments. Starting work from a handed-down diagnosis — a resume brief, a previous
session's note, a bug report that already names the cause. And the mirror image: about to explain
away something that looks wrong by citing a known measurement artifact ("headless timing lies",
"that's just the transition mid-flight", "the harness always does that").
**Lesson:** measure before you act on it, and measure before you dismiss with it. A named artifact
is the most dangerous cover a real bug can have, because the dismissal is *usually* correct and
costs nothing to say. Ask the running browser a question that separates the two — `getComputedStyle`
against the inline style, `rect.width` against `offsetWidth`, the same value read twice with a
forced re-measure in between. If the artifact is real the second read matches; if it is a bug the
numbers move.
**Would have prevented:** 2026-08-27, the Goods Received caption session — twice, in opposite
directions. The resume brief stated the cause confidently: *"`EST_H = 150` is almost certainly the
lie ... these captions are three and four lines tall, so the room test approves a space the box
does not fit in."* Measured, the caption was **109px** — EST_H was too LARGE, and the real fault was
a CSS keyframe ending on `transform: none` erasing the inline `translateY(-100%)`. Implementing the
brief as written would have shipped a second broken build to Aldi, and that diagnosis had already
survived a full session as the plan of record. Then, after the fix, the highlight ring came back
60px short and my first instinct was the artifact already written down in these very lessons —
headless frames lie about animation clocks. Forcing a re-measure moved the number from 60 to 0,
which no artifact does: a fifth real bug, the modal's own `scale(0.94)` being measured through.
Seen: 2026-08-27
Seen: 2026-09-08 (a handed-down brief said to "send a hand-off into a BANDUNG store"; it was
  written into a test step for Aldi verbatim. ConsignmentFinanceView:474 routes on the RECEIVER's
  location, not the store's, so the run would have proved nothing and the result would have been
  trusted. Caught only because the same predicate was read later for a different question.)
Fired: 2026-09-04; 2026-09-27 (the chest brief named seesEveryRegion for a T1-T4 rule; his own sentence and the tier labels said T4 is in - built on isFleetManagementTier)
Fired: 2026-09-08 (two inherited verdicts re-tested, both wrong. "480_Overengineered collides with nothing - proved across all eight classes" was an XML proof being cited against a Harmony-patch question collision-check structurally cannot see. And "the crossbow is not fixable from configuration, vanilla works only because it is the item the game ships" collapsed on reading fix.dll: CrossbowFixMod hard-codes the single literal gunBowT3CompoundCrossbow.)
Fired: 2026-09-12 (the four `|| 50`/`|| 5` lines in NEXT-SESSION.md re-grepped before editing; all four at the stated lines)
Fired: 2026-09-13 (the 2026-09-12 brief named `Toast.jsx → z-[9998]` as "the safe half, the whole job"; grepping every `z-[` first found four other full-screen layers at 9999 and five notify() calls raised while the vault gate is up — the brief was wrong and the dialog was lifted instead)
Fired: 2026-09-14 (both queued phone claims re-measured before acting: the brief itself called the ribbon claim an artifact and it WAS - top 340 - but the bell claim, also inherited, was real and worse than written, 442 not 398)
Fired: 2026-09-16 (the brief said helpers.js:~340-450; grepped the three exports first - 340/386/412 - and read only that window)
Fired: 2026-09-18 (the EOD brief said "EOD has tables — stack them under lg"; grep found no <table> in EODReconciliationView.jsx or the three flow components, so the SIDEWAYS RATCHET fact did not apply to the salesman side and no table work was planned from it)
Fired: 2026-09-28 (the vault brief ranked H1 stale shortcut / H2 other account / H3 rewrite; re-reading the save box against the check box found a fourth it never named - login maxLength 15, reset box 25)
Fired: 2026-09-30 (the brief said "check first" whether the stock rows carry damagedStock - they do, but displayInventory spreads the MASTER row, so a branch would have shown HQ's damage; built on the branch rows instead)
Fired: 2026-09-30 (heavy-app brief finding 3 said build "checking…" - measured first: it already painted in 6.7 ms since dfc2392, so no code; and the brief's roster fix would have skipped a person if the one-card count used the moved stage - counted from the drag start instead)
Fired: 2026-10-01 (the fingerprint brief's top suspect - the update swap empties the list - was run in the lab twice, fast and throttled: it unlocked on the OLD code; the failure class was forced instead (t5-stale) and the fix proven on that, with the unreproduced part said out loud)
Fired: 2026-10-05 (near miss: the Consensus brief PDF first printed Leffingwell 1999 as VERIFIED, a citation carried over from the earlier research that I never opened; caught on the look at the page, relabelled LIKELY, reprinted once)
Fired: 2026-10-05 (the brief said reuse useScenePlayer "where it fits" - read it first: beat-indexed, the replay needs any t, so the page clock was ported instead; the "Selling moment red before 10:00" note checked: 49/49 at 15:57)
Fired: 2026-10-10 (the handoff said "Journey Plan / Day Replay read today, his worry is real" - checked in code: the replay already has a date picker (DayReplay.jsx:303), so the worry is right for Journey and half right for the replay)

Fired: 2026-10-13 (the brief said "restore at App.jsx:4153 already takes data.mapBorders || data.mapSettings" - read, it wrote borders into the unread mapBorders folder and `{ id: d.id, ...d.data() }` let the border's own id overwrite the bnd_ doc id; a round-trip check bnd_17 -> file -> bnd_17 was written instead of trusting it. Same session, a behaviour check fed dayLog raw Dates where the client reads timestamp.seconds and saw every sale at 07:00 - a fixture must carry the shape the app READS, not the shape the writer sent)
### 2026-08-30 — write NEXT-SESSION.md BEFORE PROGRESS.md, not after

**Status:** LIVE
**Trigger:** closing a session, at the moment the notes are about to be written.
**Do:** write `.claude/NEXT-SESSION.md` FIRST, then `.claude/PROGRESS.md`, then commit both. The
Stop hook compares modification times, not content — if PROGRESS is touched first it is "older
than" the brief and the hook blocks the turn even when both are correct and committed together.
**Would have prevented:** four blocked turns in one session, 2026-08-30. Every one of them was a
false alarm: the note was current, complete and in the same commit as the brief. Each cost a full
turn to re-check the file, re-read the hook, edit a timestamp and re-commit — on a plan where cost
is context size x turns taken, that is the most expensive kind of nothing.
**Note:** when the change genuinely does not move where work stands, `touch` the file and say so
in one line rather than inventing a log entry the hook asked for but the work did not earn.
Seen: 2026-08-30 (x4 in one session)
Fired: 2026-09-01 (wrote NEXT-SESSION.md, then PROGRESS.md, then committed both together — the Stop hook did not fire once)
Fired: 2026-09-09 (MISSED — wrote PROGRESS.md first, then NEXT-SESSION.md; caught it at bookkeeping time and `touch`ed PROGRESS.md before the Stop hook could block. The order is still the cheap fix; the touch is the repair, not the practice)
Fired: 2026-09-12 (NEXT-SESSION rewritten first, PROGRESS entry second, same session)
Fired: 2026-09-13 (twice — at the mid-job stop and at the close; NEXT-SESSION first both times, the Stop hook only fired once, on the first uncommitted edit before any note existed)
Fired: 2026-09-16 (NEXT-SESSION rewritten first, PROGRESS entry second, both in the code commit a267298)
Fired: 2026-09-21 (NEXT-SESSION rewritten first, PROGRESS entry second, after 084b05a)
Fired: 2026-09-23 (NEXT-SESSION rewritten first, PROGRESS entry second, one commit with the prototype)
Fired: 2026-09-30 (NEXT-SESSION rewritten first, PROGRESS entry second, one commit 4fc8997)
Fired: 2026-09-30 07:45 (again: NEXT-SESSION first, PROGRESS second, one commit 561913b)

### 2026-08-31 — prove the meter can speak before trusting it to stop you

**Status:** LIVE
**Trigger:** the first time in a session you are about to rely on an automatic guard to interrupt
you — a quota hook, a budget warning, a Stop hook, a watchdog. The moment the plan is "it will
tell me when."
**Do:** run it once, by hand, and look at what it prints. A guard that exits silently when it is
unconfigured is indistinguishable from a guard reporting that everything is fine, and the second
reading is the one you will make. If it cannot speak, say so in the first reply and switch to the
version of the discipline that needs no meter.
**Would have prevented:** 2026-08-30, the session ran to 95% of the 5-hour plan quota with work
still going and Aldi had to interrupt it himself; the notes that came back were partial and the
next-session prompt never landed. `.claude/plan-quota.mjs` warns at 70/85/95 and its 95% branch
prints the exact stop-and-write order he asked for — and it has never once run, because
`9router-claude-id.txt` has never existed and the hook exits on its second line without it. One
manual run, at any point in months of sessions, would have printed nothing and shown that.
Seen: 2026-08-31
Fired: 2026-08-31 (found by running the hook by hand; the notes discipline was made structural
instead — check-progress.mjs now gates on BOTH notes, commit 8df0d2a)

### 2026-08-31 — open the program and read the PATH before iterating on a config file's contents
**Status:** LIVE
**Trigger:** about to change what is inside a config file, credential file, id file or dotfile that
some script reads — especially the second time, after the first value "did not work".
**Do:** open the reader first and copy the literal path out of it. One `grep` for the constant is
cheaper than one wrong edit, and a wrong-path edit is invisible: the file saves, the program is
unaffected, and the failure looks exactly like a wrong value. Say the path back in the note, so the
next session inherits the checked one instead of the plausible one.
**Would have prevented:** 2026-08-31. `.claude/plan-quota.mjs` reads
`C:/Users/ASUS/.claude/9router-claude-id.txt`. The brief, the PROGRESS entry and Aldi himself were
all working on `C:/Users/ASUS/9router-claude-id.txt`, one folder up, which nothing opens. Four
connection uuids were written into a decoy across several sessions; one of them had been correct
the whole time. A previous session then concluded from that decoy's absence that "the hook has
never run" and wrote it into the vault as a root cause. One `grep ID_FILE` at any point would have
ended it. Fixed in `7ca7b03`; the vault page is corrected.
Seen: 2026-08-31
Fired: 2026-08-31 (the fix itself — the path was read out of the hook before anything was written)



<!-- ARCHIVE LEDGER. Kept at the BOTTOM on purpose: these sat between two entries and the health
     check counted them as part of the one above, reporting a 12-line entry as over length. -->

<!-- archived 2026-09-28 to A-Brain/Wiki/Lessons-Archive.md, RETIRED 2026-09-27 (platitude; the toast < dialog audit guard covers it):
     2026-09-13 — a z-index move crosses every layer between the old number and the new one -->

<!-- archived 2026-09-13 to A-Brain/Wiki/Lessons-Archive.md, RETIRED 2026-09-12 (converted into
     A-Brain/automation/heredoc-gate.mjs, a PreToolUse hook on Bash):
     2026-09-01 — never send JavaScript through `node -e` inside a double-quoted shell string -->


<!-- archived 2026-08-12 to A-Brain/Wiki/Lessons-Archive.md, zero fires:
     2026-08-11 — a fixed element anchored to a resizable container must be checked at EVERY size
     2026-08-18 — PORT the solved layout (rule also lives in SKILL.md §4) -->
<!-- archived 2026-08-14 to A-Brain/Wiki/Lessons-Archive.md, zero fires:
     2026-08-12 — price a fan-out against the quota BEFORE launching -->
<!-- archived 2026-08-18 to A-Brain/Wiki/Lessons-Archive.md, HAD fired, by oldest last-fire
     (2026-07-29, and skill installs have not come up since):
     2026-07-29 — install commands need an explicit cwd, and -g when the goal is PATH -->
<!-- archived 2026-08-18 to A-Brain/Wiki/Lessons-Archive.md, HAD fired - first use of the new §8
     rule, which archives one anyway at 5/5-all-fired instead of going silent:
     2026-07-30 — verify JS-rendered Artifacts in Node (superseded in part, and 5x over length).
     Its live half continues as "build the viewing path" above. -->


### 2026-09-01 — a file can hold a solved half and an unsolved half, and a sweep cannot tell them apart
**Status:** LIVE
**Trigger:** before any find-and-replace across a whole file — the moment a regex or a
`str.replace` is about to run on source you are only redesigning PART of.
**Lesson:** assert the expected match COUNT before writing, and when the file contains a region
that is already approved, split the text at that boundary and sweep only your half. `git diff` on
a 1,400-line JSX file will not make an unintended restyle visible, and a check that counts
occurrences of a class will not either — both halves still have it.
**Would have prevented:** the phone-size edit on the branch warehouse titles matched **6**
occurrences, not 4. Two of them were `Stock by Warehouse` and `Shipment Plan` — the HQ half,
rebuilt and approved on 2026-08-27 and explicitly out of scope. The assert caught it; without it
both approved panels would have silently changed size at 375px, with 680/680 still green, while I
was measuring the other half of the same screen.
Seen: 2026-09-01
Fired: 2026-09-01 (the desk rebuild split BranchWarehouseManager at the HQ marker before replacing the branch region, and the title resize split it again - the HQ half was never in either sweep)

### 2026-09-01 — a viewport of zero returns rectangles, and they are all lies
**Status:** LIVE
**Trigger:** before reading `getBoundingClientRect()`, an offset, a gap or any layout number out of
the in-app browser pane — the first measurement of a session, and again after the pane is reopened.
**Lesson:** read `innerWidth` in the same probe that reads the rect, and call `resize_window` to a
real size before trusting either. A hidden or freshly-opened pane can report `innerWidth === 0`
while still laying out and still returning plausible-looking rectangles. Presence and absence of a
conditionally rendered element stay trustworthy at any size — React does not consult the viewport —
so a probe can prove a gate closed a button while proving nothing at all about how wide it is.
**Would have prevented:** 2026-09-01. A `w-full py-3.5` button measured 44×92 and read as a real
layout bug worth chasing; after `resize_window(1280×900)` the same button measured 825×46. Two
probes spent on a number that was an artifact of a pane nobody had sized.
Seen: 2026-09-01
Fired: 2026-09-14 (the phone-bell job: `resize_window` 375×812 first, `innerWidth` read in the same probe as the rects — 375, so the numbers counted. Bell 442..489 was real; the queued ribbon `top:-66px` measured 340 and was the hidden-pane artifact this entry describes, sitting in the queue for days)
Fired: 2026-09-17 (resize_window 375x812 first, innerWidth read in the same probe as every rect on the Sales Terminal mount)
Fired: 2026-09-18 (EOD Setoran: resize_window 375x812 first, innerWidth read in the same probe as every rect; the first card-3 probe read 41x69 boxes and was a mid-transition scale of 0.93, re-read at 44x74 after the transform settled)

### 2026-09-14 — a design decision put to Aldi is an image, or it is not a decision
**Status:** LIVE
**Trigger:** the moment a reply is about to carry a 🔴 DECIDE between layouts, controls, or any
thing he would look at — before the options are typed as prose, a table, or class names.
**Lesson:** render each option at the real width (lab `?css=` override, or his frames), compose
them side by side with the recommended one marked and one plain sentence each, send the image,
and let the reply carry only the question. A table of trade-offs is a decision he cannot make.
**Would have prevented:** 2026-09-14, the Restock Vault tab strip. Three options were sent as a
table of class names and severities; he did not pick, and answered instead: "give me ilustration
or image or anything to show me what is the recommended changes instead of telling me with your
technical AI sentence that i wont understand". One turn wasted, the third time he has had to ask
for plain terms, and the rendering that finally worked (four iframes, one PNG) took one turn.
Seen: 2026-09-14
Fired: 2026-09-14 (the same session — tabs-options.png, four real renders through the new ?css= switch, A marked, sent before the question was asked again) · 2026-09-15 (re-asked the letter with tabs-options.png re-sent, not described); 2026-09-22 09:30 (two PC boards shot headless at his 2000×1000, TODAY beside A and B, his own screenshot as board 2's TODAY)
Fired: 2026-09-17 (every Sales Terminal fix goes to him as a TODAY/AFTER frame pair rendered through ?css= at a measured 375, never as a table)
Fired: 2026-09-18 (EOD Setoran on the phone — two boards, five frames rendered through ?look= at a pinned 375 inside the shell, TODAY beside each fix, sent as one PNG before the question was asked; no product code changed)
Fired: 2026-09-18 (Customers round two — three boards, ten frames through seven ?look= entries at a pinned 375 as tier 1, TODAY beside each option, one PNG; the hold offered as live links on his phone because a still cannot show motion)
Fired: 2026-09-21 (stage B of the player card — two boards, seven frames at a pinned 375 with TODAY beside each option and the cost under each caption, the motion as live lab links; he decided both in six words, 35 minutes later: "i like all the recommended option")
Fired: 2026-09-29 (Fleet & Roster quarantine: his design drawn as a pressable section at PC and phone, v15, before the one 🔴 question)
Fired: 2026-09-29 16:00 (his "where should i put it?" answered as a board of the three button spots at 430, his own spot included, plus the live page for the motion)
Fired: 2026-09-30 (regional warehouse + Stock Opname: two live boards on prototype v22, TODAY beside A/B, the recommended frames sent as images before the question)
Fired: 2026-10-02 (the two-part bell: two boards, TODAY beside A and B at a real 390 and 1440, sent before the question)
Fired: 2026-10-02 10:50 (customer showcase hero: A/B/C drawn at 390 and 1440 on two boards, A marked, sent with the live link before the question)
Fired: 2026-10-03 (map keys + shop marks put as a board + a live page, not words)
Fired: 2026-10-04 18:20 (visit signs: Today / A / B / C drawn on the live page at map size + zoomed, board PNG sent before the question)
Fired: 2026-10-10 (demo freeze-time: No fix / A / B / C drawn as a grid of Day 1 / Day 2 / a visitor's sale, gold = works, red = breaks, sent inline before the question)
Fired: 2026-10-13 (demo front door + switch: two boards, TODAY beside A/B/C, sent before the question)

### 2026-09-01 — never rename or move files inside a directory a package manager owns
**Status:** LIVE
**Trigger:** before renaming, moving or deleting anything inside a folder that a manager deploys
into — Vortex, npm/node_modules, pip site-packages, a game launcher's mod folder, any sync client.
**Lesson:** the manager tracks the paths it wrote, not the contents. A rename makes its record
point at a path that no longer exists, so the next deploy or purge deletes the files it still
thinks it owns and re-installs a second copy under the original name. The folder survives; its
contents do not. Fix the ordering INSIDE the manager, or take the folder away from the manager
entirely (purge, then manage by hand). Never both.
**Would have prevented:** 2026-09-01, Aldi's 7 Days to Die mods. Renaming `AAY-PROJECT Z` to
`AA0-PROJECT Z` to fix a load-order crash worked for exactly one launch. Vortex then deployed a
second Project Z at `AAY-`, and emptied the renamed folder — `blocks.xml`, `buffs.xml` and
`Localization.csv` all gone, with the folder still present so it looked installed. Four other
mods were left as hollow shells the same way. Cost: about four hours across six failed launches,
a wrong diagnosis blaming three different mods in turn, and a full purge-and-rebuild of 38 mods
from their archives.
Seen: 2026-09-01
Fired: 2026-09-02 (governed the whole book-turn rewrite: every patch went to a file via Write, or through a quoted python heredoc, instead of `node -e "..."`. The one place a double-quoted `node -e` was still used, it ate two template literals and left `[{ transform:  }, { transform:  }]` in the settle - caught by reading the block back, not by the build.)
Fired: 2026-09-02 (same shape, different layer: a patch written through a python heredoc had `
` inside a JS regex literal turned into a REAL newline, so the audit shipped `/block\.forEach\([\s\S]*?<newline>\}\);/` and failed to parse. The rule is not about the shell specifically - it is that any layer between you and the file gets a vote on your escapes. Write the patch to a file with Write when it contains regex or template syntax.)

## 2026-09-05 — a red trial that hides its own check file cannot fail

**Status:** LIVE
**Trigger:** about to claim a self-check was "trialled RED before green" — the moment before running
the trial, and again before writing that phrase into a commit message.
**Lesson:** stash the SOURCE FILES BY PATH, never the working tree:
`git stash push -- src/A.jsx src/B.jsx` — not bare `git stash`, which takes the `.selfcheck.mjs`
along with them and runs the OLD checks against the OLD code. Then read the failure COUNT, not the
exit status. Same checkpoint, second form: an assertion anchored on a visible LABEL rather than on
the code it tests can sit entirely after the thing it is asserting about, so it passes on untouched
code. Anchor on the construct being tested — the gate string, the field name — never on the words a
user sees near it.
**Would have prevented:** 2026-09-05. Trialling the four live-test fixes, bare `git stash` reported
**0 failures** and I briefly read that as "the new checks are green against old code, odd but fine"
before noticing the check file had been stashed too. Re-run stashing only the three source files:
**11 red.** In the same batch, `Add Goods` was used as a slice anchor and begins after the
`isAdmin &&` it was written to test, so that assertion passed against code not yet written. Both
would have shipped a commit claiming a red trial that never happened.
Seen: 2026-09-05
Fired: 2026-09-12 (section 7 added to stockThreshold.selfcheck.mjs BEFORE any screen edit — 8 FAIL counted with sources untouched, 0 after; no stash needed)
Fired: 2026-09-13 (the toast/dialog z-order guard was added and run with both source files untouched — `56 passed, 1 failed`, the one FAIL being the bug — before the one-word edit; 57/57 after)
Fired: 2026-09-14 (THE BELL IS ON THE PHONE SCREEN run with BiohazardTheme.jsx untouched: 1468 passed, 2 failed, both class guards; 1470/1470 after the two-class edit)
Fired: 2026-09-16 (notaScan checks written first - red on a missing export; then 21/22 with the L-shape check red against the real code, which is what added the blob-fills-quad rule. logicFixes section trialled with the three source files git-stashed and the check file kept: 17 red, 1547/1547 after pop)
Fired: 2026-09-18 (EOD phone guards written first: 7 FAIL with the three sources untouched, 1615/1615 after; the new JSX-comment sweep was added after the fix and proven red on a throwaway src/__probe.jsx, then the probe deleted)
Fired: 2026-09-18 (Customers round two: 10 guards written first, red with the three sources untouched, 1626/1626 after; three older row guards re-pointed rather than deleted)
Fired: 2026-09-21 (the light-mode LED guard written first: 1695 passed, 1 failed with theme.css untouched; 1696/1696 after the one rule)
Fired: 2026-09-21 (stage B: five guards written first, 5 red with the four sources untouched; two of them then went red against CORRECT code — an old count of a class string my dim wrapper had changed, and an indexOf('Grant Award') that hit the award form 200 lines above the key row — both re-scoped, 1701/1701)
Fired: 2026-09-29 (no stash: firestore.rules copied aside, the `resource == null ||` clause removed with sed, logicFixes 1960 passed / 1 failed - the new guard - then restored, 1961/1961)
Fired: 2026-09-30 (24 guards written first: 23 FAIL with the sources untouched, 2020/2020 after. SECOND FORM seen: `git stash push -- <paths>` + pop on this repo (core.autocrlf=true) returns the files as CRLF - pop, then `sed -i 's/\r$//'` the popped paths, or the next check run reads a different file)
Fired: 2026-10-11 07:25 (message-strip guards written first: 5 FAIL with the four sources untouched, 2249/2249 after)

### 2026-09-03 — a motion fix is not done until you sample the property on the live page
**Status:** LIVE
**Trigger:** before claiming any animation, transition or timing fix works — after the edit,
before the report.
**Lesson:** removing the cause you were HANDED is not the same as fixing the symptom. Sample the
animated property on the running page across the whole flight (`setInterval` + `getComputedStyle`)
and read the two curves against each other. A duration is not a schedule — the easing decides
where the distance is spent, so an element can finish MOVING before it finishes LIGHTING.
**But check the clock before you trust the sample.** In the preview pane the document timeline
stalls: `document.getAnimations()` then shows every animation as `playState:'running'` with
`currentTime:0`, transitions report their START value forever, and `requestAnimationFrame` never
fires — while `visibilityState` still says `'visible'`. That reads exactly like a rule that is not
applying, and it is not. Clock-independent reads: `style.transition='none'` + `void el.offsetWidth`
+ `getComputedStyle` for transitions, and a negative `animationDelay` with
`animationPlayState:'paused'` to pin a keyframe for a screenshot.
**Would have prevented:** 2026-09-03, tech pad round 6. Ask 4 arrived with its cause already
located (opacity .16s racing transform .30s) and an instruction not to re-diagnose. Replacing both
with one keyframe set fixed exactly that and left the animation still invisible: measured on the
page, the panel reached opacity 1 at scale .993 of 1.0, because the ease-out curve spent ~80% of
the travel in the first 30% of the time. Reporting it done there would have cost a round 7 on the
same ask.
Seen: 2026-09-03, 2026-09-03 (again, same draft - a correctly applied latch transform read as an
identity matrix under the stalled clock, and the first conclusion drawn from it was wrong)
Fired: 2026-09-03 (round 8 - re-measured with the transition disabled instead of reporting the latch
as broken; the declared transform and the neighbour-rect comparison both confirmed it was applying)
Fired: 2026-10-06 (showcase round 3 - each new scene sampled twice 2.4 s apart in moving mode, 5/5 changed, before claiming they move)
Fired: 2026-09-04 (riffle removal - a screenshot after the landing looks identical whether or not the
Fired: 2026-09-18 (the charge line: hovered the row at 1280 with a real pointer, forced a paint with a screenshot, then read background-size 100% 3px and the lamp rgb(0,0,0) — the same read before the paint would have shown the START value, the pane does not advance a transition until it paints)
Seen: 2026-09-26 (the roster "one person per swipe" was claimed to him from the COMPUTED style - scroll-snap-type x mandatory, snap-stop always - and a real 300 px touch drag later moved it two people; fixed in kpm 48d50bc with a JS pager, proven by a dispatched touch drag). A computed style is proof of a rule, not of a gesture.
Fired: 2026-09-23 (the chest-to-van flight sampled at 0/200/450/1050 ms — x 117→215→341, opacity 0→1→0, packs removed; Lite Mode read back as opacity 1 / animation none on every square)
Fired: 2026-09-24 (far/near cards read with transition none + getComputedStyle: picked 206 px at opacity 1, the other three 176 px at .72 - not from a screenshot mid-glide)
Fired: 2026-09-29 (the phone frame read 976 px wide after the width switch - the hidden pane's stalled max-width transition; re-read with transitions off: 430 / bay 366)
Fired: 2026-09-29 16:00 (the switch effects shot mid-flight in headless Chrome at 160-260 ms: the first frames showed the tape sweep running past the box and a purple column outside the squares - both fixed and re-shot before the publish)
book flipped through, so the claim was settled by reading document.getAnimations() during the turn:
zero animations for a ribbon jump, exactly one at dur 340 for a neighbour turn)
Fired: 2026-09-30 (the island bob frozen at 0 / 2500 ms and read back as matrix ty 0 / -5; Lite Mode read as animation none)
Fired: 2026-10-03 (the chest hop and lid sampled every 20 ms with the clock frozen, round 4)
Fired: 2026-10-03 23:24 (the coin path sampled on the built lab at 7 frozen times, not claimed from the CSS)
Fired: 2026-10-04 (visit-sign acts: 8 statuses x 7 frozen moments per look read before any claim; caught the shutter scaling from the sign's top, not its own)

## 2026-09-03 — removing a mod is a schema change to data already written

**Status:** LIKELY
**Trigger:** before disabling, removing or reordering any mod, plugin or extension on a system
that has already saved data through it.
**Do:** ask what SHAPE that component wrote into storage - array sizes, container capacities, id
assignments - not just what features it adds. If it sized anything, removing it makes the existing
data unreadable, and most engines silently DISCARD what they cannot parse rather than failing loudly.
**Would have prevented:** disabling a 7 Days to Die mod that enlarged crafting queues, purely as a
UI test. The next chunk load threw `TileEntityWorkstation.read` index-out-of-bounds, the game
dropped the tile entity and saved the emptied chunk two minutes later. Aldi lost every melted
resource and every mod stored in his forge, permanently. An earlier removal in the same session had
already turned a placed block into a different mod's block by shifting block IDs - the same class of
mistake, and the first one should have been the warning.

### 2026-09-03 — derive the coordinate model from the file's own working layouts first
**Status:** LIVE
**Trigger:** before placing or moving any element by pixel coordinates in a layout file you
cannot render — XUi, SVG, canvas, absolute-positioned CSS.
**Lesson:** pick the coordinate model by checking it explains a layout in that same file that
already works, then place. Write the geometry check before the edit, not after.
**Would have prevented:** assumed a grid's `pos` was its top-left corner and put the skill
window's search box at y=-43, inside icons that actually run to -44.5. The model was refutable
from the file itself: `windowTrader` fits 15 x 43px cells at x=23 in a 645px window, which
overflows by 23px under top-left and lands exactly at 1.5..646.5 under centre-anchored.
Two vanilla windows agreed. Only the geometry check caught it.
Seen: 2026-09-03
Fired: 2026-09-03 (caught the overlap before it shipped; re-placed at -45 and re-ran red-then-green)

### 2026-09-03 — a log from a session that has not ended is not evidence of absence
**Status:** LIVE
**Trigger:** before reporting that a log, report, or output file shows no errors — the moment
the claim is "clean", "zero", "nothing found" about a file another process may still be writing.
**Lesson:** prove the writer finished before reading absence out of its output. Check the
process is gone, or that the file carries its own end-marker (7DTD logs end with Unity's
allocator dump). A grep for errors is only evidence of absence over a COMPLETE file; over a live
one it is evidence of nothing. Presence of a match is still valid — only absence needs this.
**Would have prevented:** told Aldi "newest run is clean - zero errors, all three mods loaded"
about `output_log_client__2026-09-03__08-39-03.txt`. The finished file is 3,872 lines and the
NullReferenceException flood starts at line 1292; the game was still running when I grepped it.
He then had to tell me his game was crashing, having been told it was fine. The same session
also shipped the crash itself, cleared as safe by three load-time checks (no blocks.xml, no
storage resize, DLL loads clean) that were each correct and none of which could see a per-frame
runtime NullReference - re-enabling a mod that changes entity behaviour needs one play session,
not a load-time audit.
Seen: 2026-09-03
Fired: 2026-09-08 (step 3 of the Dying Light job is a grep for ABSENCE in a 7DTD log - NEXT-JOB.md now tells the next session to read the tail for Unity's allocator dump first, and to ask Aldi to quit rather than report a zero from a log still being written)

### 2026-09-03 — republishing an artifact starts with a full Read, not with proving the file matches
**Status:** LIVE
**Trigger:** before the first `Artifact` publish of a session that carries a `url` — any republish
to an artifact this conversation has not itself published yet.
**Lesson:** do `action:"read"` on the URL FIRST, then Read every line of the saved file it names,
line 1 included, before touching the local copy. The gate is a Read of that file, not knowledge of
its contents: a `diff` proving the local file is byte-identical to the published one does not
satisfy it, re-Reading a copy an earlier refusal handed you does not satisfy it, and once a publish
has been refused the identical bytes are rejected as "resent unchanged" until a FRESH fetch lands.
Read line 1 explicitly — it is the whole minified frame-runtime on one line, so an `offset:2` read
looks complete and leaves the gate closed.
**Would have prevented:** 2026-09-03, round 10 of the tech pad. The edit and its verification took
four tool calls. The republish took eight: a read, a diff, a refusal, a 687-line read, a refusal
naming line 1, a one-line read, a refusal demanding a fresh fetch, a second read, then the publish.
About 45 KB of runtime preamble came into context twice for a four-line CSS change.
Seen: 2026-09-03
Fired: 2026-09-03 (written from the run that cost it)
Fired: 2026-09-29 (v15: `Artifact read` on the url first, the saved index.html diffed to the old scratchpad copy - identical but the skeleton - then published from that copy on the first try)
tail -3 lessons.md; echo "--- lessons entries: $(grep -c '^\*\*Status:\*\*' lessons.md)"
Fired: 2026-09-30 (v25: read the url, diffed the saved file to the rebuild - only the island lines differ - Read all 1194 lines, published on the first try)
Fired: 2026-10-04 (Day Replay v3: read the url, diffed to the last vault commit - skeleton only - all 692 lines Read, published first try)

### 2026-09-04 — a correlation with no mechanism is not a diagnosis, at any sample size
**Status:** LIVE
**Trigger:** before naming a cause out loud — the moment you are about to say "X is the problem",
disable something permanently, or tell Aldi a mod is incompatible.
**Lesson:** state the MECHANISM in one sentence — this thing does that, which produces this exact
error — before the verdict. No mechanism means it is still a hypothesis, so say "correlates with"
and name the test that separates it. Sample count does not substitute: two candidates that move
together produce a perfect correlation for whichever one you happened to toggle.
**Would have prevented:** 7DTD, `EModelBase.CrouchUpdate` NPE. Four sessions matched
`LootableZombieCorpses` exactly - ON 1449, ON 534, OFF 0, ON 249 - so it was declared incompatible
with 3.2.0 and retired, with no mechanism for why a corpse-search patch would null an entity model.
It was innocent. Session five crashed 593 times with it disabled. The real cause had a mechanism
that fits every row: the Dying Light pack's runtime DLL was stripped for being wrong-build, so its
zombies spawn with half-built models. Aldi lost two play sessions and his zombie-looting feature
to a verdict that only ever had a count behind it.
Seen: 2026-09-04
Fired: 2026-09-28 (the vault length cut stated with its mechanism - box maxLength 15 cuts a 16-25 char password before verifySecret - and sent as [likely] with his character count as the test, not as the cause)
tail -14 "C:/Users/ASUS/.claude/skills/alucard/lessons.md"
Seen: 2026-09-01
Fired: 2026-09-02 (THIRD occurrence, and the prose is not working — twice in one session a python heredoc ate escapes
Seen: 2026-09-12 (FOURTH. A quoted heredoc <<'EOF' — the thing the Lesson line still recommends — collapsed a \n to

### 2026-09-04 — count the ModInfo.xml files before judging an archive as one mod
**Status:** LIVE
**Trigger:** before summarising or recommending for/against any downloaded archive — the moment
you are about to quote its item/block/DLL totals as if they belong to a single mod.
**Lesson:** `find . -name ModInfo.xml` first. A zip holding several is a MODPACK, and its totals
are the sum of parts that may already be installed. A pack that bundles its own copy of a mod the
user runs cannot be "added" at all — it can only replace, which is a completely different
recommendation and a completely different risk.
**Would have prevented:** told Aldi that `AEC-x-Project-Z` was one experimental overhaul with
12,288 items and 13,299 recipes, and advised against it on search-lag grounds. It is a 13-mod pack
that ships its OWN `TFP_Harmony` and `ProjectZ 3.1.2` — older than his installed 3.2 — plus a
`RecipeSearchOptimizer` that targets the exact lag I used as the argument against it. The totals
were right and the conclusion was wrong. He caught it: *"aec x project z i think support both of
the mod together right?"*
Seen: 2026-09-04
Fired: 2026-09-04 (caught only after his pushback; the structure check took one command and would
have led with "this replaces your Project Z" instead of "this is too big")

### 2026-09-05 — before deleting a write that looks like corruption, find who READS the field
**Status:** LIVE
**Trigger:** before removing or disabling an existing write — the moment a fix is described as
"just delete these lines" or "stop touching that record".
**Lesson:** grep every reader of the field first. A write that corrupts one meaning of a field is
often the only thing supplying another meaning to a screen. Deleting it fixes the record and blanks
the screen, and the blanked screen is usually the worse bug — nobody notices wrong attribution,
everybody notices missing money.
**Would have prevented:** 2026-09-05. The store-transfer item was offered to Aldi as "4 lines to
delete" — the rewrite at `App.jsx:1746-1749` that overwrites the agent on every past sale. He said
build it. One grep before editing found `ConsignmentFinanceView.jsx:59` scoping receivables by
`t.agentId`: that rewrite is also what hands the store's outstanding debt to the new agent. The
promised delete would have hidden a real store's debt from the agent who now owns it, in an app he
is preparing to sell.
**Also:** the check files are readers too. Removing a mechanism kills every assertion that pinned
its shape, and a dead guard looks exactly like a passing one if it lives in a file you did not run.
Grep the `*.selfcheck.mjs` / audit files for the identifiers you are deleting, and replace each
orphaned assertion with its successor rather than letting it be quietly deleted.
Seen: 2026-09-05, 2026-09-05 (the same removal killed two assertions that pinned `heldBySender` and
the ADMIN legacy-row branch; caught only because they happened to live in the file being run)
Fired: 2026-09-05
Fired: 2026-09-30 (before removing the van box's damaged row, PER/6 and the ResizeObserver: grepped every check and ponder scene that read them - 8 checks retargeted, no ponder beat pointed at dmg:van)
Seen: 2026-09-05

### 2026-09-06 — when the symptom is on a screen you cannot see, buy one observation before building
**Status:** LIVE
**Trigger:** about to explain a VISUAL or timing symptom in a running system you have no way to
observe — a game, a device, someone else's browser — using only static config files as evidence.
The moment you catch yourself writing "X is Y" about rendering, animation or state you have never
watched, this fires.
**Lesson:** static files tell you what a value IS, never what the running system DOES with it. Ask
the person who can see it for ONE discriminating observation first, and make it a question whose
two answers point at different causes: "does it look different immediately after you equip it,
versus after you change ammo?" One sentence, one reply, and the search space collapses. Build after
that answer, not before it. This is not the same as inheriting someone else's diagnosis
([[an inherited explanation is a hypothesis]]) - here the bad hypothesis is your own, and the
correction is available for free from the only person holding a screen.
**Would have prevented:** 2026-09-06, the 7DTD crossbow. From the item XML I concluded "the
magazine count IS the drawn bolt stack" and stated it as fact. On that basis I shipped **three**
different builds of the same mod part in one session - cap the bonus 14 to 3, then zero it and
substitute reload speed, then delete the whole override when Aldi said put it back - each with its
own check assertions written, proven falsifiable, and then thrown away. Aldi ended it with one
sentence: *"when i swap to other tool then back to the crossbow there will be 1 ammo only but when
u change ammo it become like that"*. The same magazine draws 1 bolt on equip and 16 after an ammo
change, so it was never the count - it is the ammo-change path failing to clear the old meshes, and
he had a free workaround the whole time. Asking that question after his first screenshot would have
cost one sentence instead of three rebuilds, and he would not have had to say "bruh" twice.
Seen: 2026-09-06
Fired: 2026-09-08 (twice. The Drone Warehouse cut was settled by reading the ORIGINAL screenshot file in Screenshots/ - real 2560x1440 - after four turns of contradictory arithmetic on the cropped paste. And the "-1.2 at the crosshair" looting bug was left UNRESOLVED with three questions for Aldi rather than a sixth config theory.)
Fired: 2026-09-28 (the blank intro name and the missing shortcut animation: no theory built - one finger-drag question on the home-screen app separates canvas-off from canvas-on)

### 2026-09-06 — an escape valid in the writing language is not valid in the written one
**Status:** LIVE
**Trigger:** before running any script that writes source code in ANOTHER language — the moment a
string literal in the generator carries a backslash escape destined for the generated file.
**Lesson:** write the character itself, never its escape sequence. Then grep the WRITTEN file for a
stray backslash before building. The generator resolves its own escapes, so a doubled escape in the
script lands as literal text in the output, and the output's language may not accept that form at
all — JavaScript has no capital-U unicode escape, so it degrades to visible garbage instead of
erroring, and the build stays green.
**Would have prevented:** a Python patch script put a capital-U emoji escape into App.jsx. Node read
it as the letter U followed by digits, so a live notification title said "U0001f6e1 Transfer Needs
Approval". Build passed, audit passed, 1073 self-checks passed. The repair then reported 33
replacements when 4 were intended, which cost a full `git diff` audit of every deleted line to prove
=== tail ===
nothing pre-existing had been corrupted. Writing this very entry hit the same fault a third time,
inside the Python heredoc that was meant to record it.
Seen: 2026-09-06 (three times in one session — the write, the repair, and the lesson about it)
Fired: 2026-09-06 (fourth time, same day: an em dash escape landed in JSX TEXT rather than a JS string. JSX text is not a string literal, so it would have rendered the backslash-u verbatim. The grep this lesson prescribes is what found it.)
Seen: 2026-08-24

### 2026-09-07 — stop the preview server before starting a build in the same repo
**Status:** LIVE
**Trigger:** before running `npm run build`, a full test suite, or any other long check — the moment
the command is typed in a repo where this session has started a dev/preview server.
**Lesson:** stop it first (`preview_stop`), then build. A dev server holds the same `node_modules`,
watches the same tree and competes for the same cores, and the build does not fail — it *hangs*,
which reads as a slow machine rather than a conflict. Also stop it because the port is the one Aldi
runs his own `npm run dev` on: leaving it up silently pushes him to 5174 and breaks his bookmark.
**Would have prevented:** a `npm run build && integration.audit.mjs` that ran clean in ~2 minutes
earlier in the session hit the 300s timeout, went to the background, produced a zero-byte output
file, and needed two TaskStop calls and a re-run — about three wasted turns, in the same session
where Aldi had just said *"i dont know why but suddently quota finishes so fast with just simple
work"*.
Seen: 2026-09-07
Fired: 2026-09-12 (no preview started this session; build launched cold)
Fired: 2026-09-18 (ponder-lab stopped with preview_stop before npm run build; the packed build on 4173 picked up dist without a restart)
Fired: 2026-09-18 (second time today: lab stopped with preview_stop before the round-two build)
Fired: 2026-09-20 (ponder-lab AND kpm-preview stopped with preview_stop before npm run build; kpm-preview restarted on the fresh dist and the address read off preview_logs)
Seen: 2026-10-05 (missed: a kpm-dev the session did not start was up; a LAB build rewrote dist-ponderlab and Vite died on EBUSY mid-test. Made structural in kpm `25a47db`: vite.config.js `server.watch.ignored` covers dist/ and dist-ponderlab/; two lab builds + one npm run build then ran with the dev server up and it stayed running. The prose still owns the HANG half)
Fired: 2026-10-11 14:02 (kpm-preview-http stopped with preview_stop before the ponder-lab build)
Fired: 2026-09-21 (ponder-lab stopped with preview_stop before npm run build; kpm-preview started after, the address read off preview_logs)
Fired: 2026-09-29 (build + audit ran before ponder-lab was started; the lab was stopped with preview_stop after the walk)
Fired: 2026-09-30 (kpm-preview-http stopped with preview_stop before each npm run build)
Fired: 2026-10-02 (lab stopped before both bell builds, restarted for the walk)
Fired: 2026-10-03 (Journey map build: ponder-lab stopped with preview_stop before each npm run build, restarted for the shooter)
Fired: 2026-10-03 23:15 (the ponder-lab preview another session left on 4190 stopped before `npm run build`; build 0:40, audit 722/722)
Fired: 2026-10-05 (his kpm-dev on 5173 was not started by this session; lab + app builds ran beside it (25a47db ignores dist/), 0 EBUSY)
Fired: 2026-10-05 21:00 (same kpm-dev left up; 4 lab builds + npm run build beside it, 0 EBUSY, no hang)
Fired: 2026-10-11 07:25 (no preview server up; npm run build ran cold, 0 hang)

### 2026-09-08 — a one-word answer is not an implementation spec; enumerate the field's real values first
**Status:** LIVE
**Trigger:** about to encode a short answer from Aldi — "strict", "only admins", "just the active
ones" — as a condition on an existing field. The moment a status, role or flag VALUE is about to be
typed into a comparison.
**Lesson:** grep every value that field is actually written with, across every writer, before
choosing the comparison. Then decide deliberately whether the rule is a WHITELIST or a REFUSAL. A
whitelist silently excludes the values you did not find — including the blank one on every row
written before the field existed — and it fails closed, which on a money path means refusing real
work with no error. State the rule as what it REFUSES wherever the safe default is "allow".
**Would have prevented:** 2026-09-08. He answered "make it strict" for "consignment is only for
registered stores". The obvious encoding was `status === 'NOO_ACTIVE'`. Four statuses exist —
`APPROVED` and `PENDING` from the registry screen, `NOO_ACTIVE` and `WALK_IN` from the sale engine —
and shops written before the field existed carry none, so that one line would have refused
consignment to almost every real shop in his book: a larger money bug than the one being fixed. One
grep found all four. The guard shipped as a `WALK_IN` refusal instead.
Seen: 2026-09-08
Fired: 2026-09-08 (caught before the line was written, by grepping the writers rather than trusting
  the two status names already in front of me)

### 2026-09-08 — a check that calls a function reading module state is scoped by SECTION ORDER, not by its own arguments
**Status:** LIVE
**Trigger:** before trusting a new behaviour check — the moment one calls a project function rather than computing the answer from its own fixtures.
**Lesson:** ask what module-level state that function reads, and whether an EARLIER section of the same file mutates it. If it does, assert the pure function underneath instead. `canEditFleetRoster` consults `ROLE_PERMISSIONS`; `defaultFleetAccess` consults nothing.
**Would have prevented:** the no-floor lock asserted `canEditFleetRoster(TIER_4) === true`, which is true in a clean process and FALSE at line 4839 of `logicFixes.selfcheck.mjs`, because earlier sections call `injectDynamicPermissions` and mutate the matrix the function reads. It went red against correct code and cost a diagnosis. The direction it failed in was luck: the same staleness could have made a floor-detecting check pass while a floor was present, and a guard that cannot fail is the one thing worse than one that fails wrongly.
Seen: 2026-09-08
Fired: 2026-09-08 (fired on its own session: the sandbox-settings diff came back pointing at JumpStrength, which has no path to loot time; reading the 151-byte .ttp.meta first gave level 143 vs level 2 and the real cause)
Fired: 2026-09-09 (the new canPickFromGallery behaviour checks call injectDynamicPermissions, which mutates ROLE_PERMISSIONS for everything after them — placed the block LAST in logicFixes.selfcheck.mjs and said so in a comment, so no later section inherits the injected matrix)
Fired: 2026-10-13 08:10 (the shared-list check imports both real modules and compares identity, not a copy of the list)

### 2026-09-09 — a number or a selected-state read off a screenshot is not evidence, it is a guess
**Status:** LIVE
**Trigger:** before writing down any finding whose evidence is a digit, a total, or which control
looks active — the moment a claim's proof is "the screenshot showed X".
**Lesson:** the pane returns downscaled frames, so glyphs blur and one accent looks like another.
Read the value out of the DOM (`innerText`, `aria-selected`, a computed style) before the finding
is written. A frame is proof of an APPEARANCE; only a read is proof of a VALUE — and a walk whose
entire output is findings has nothing else to be right about.
**Would have prevented:** the day-one walk, twice in twenty minutes. A 0.5-scale frame read
`47 Bks left in the vehicle` after a 1 Bks sale from a stock of 50, which looked like a 3-unit
stock leak in the money path; `innerText` said `49`, correct. Minutes earlier the Restock Vault tab
strip looked like it kept MASUK highlighted after switching to KIRIM; `aria-selected` was `true` on
Kirim with the brighter colour, also correct. Either one, written up, would have sent the next
session hunting a bug that does not exist, in the two areas — stock arithmetic and navigation
state — where a false report costs the most.
Seen: 2026-09-09
Fired: 2026-09-09 (caught both on the walk itself: every number in the report was re-read from the DOM before it was written, including the Rp 26.000 that turned out to be the real finding)
Seen: 2026-10-04 (SECOND FORM - a number written from memory, not from a screenshot: commit bcae573 first said "outline overlap at most 0.83" with no run behind it; measured 0.73 and amended before any reply. A digit in a commit message or caption is a claim like any other: run it, paste the output's number)

### 2026-09-09 — a button you cite as the repair path has to be PRESSED, not located
**Status:** LIVE
**Trigger:** before telling Aldi that existing data will be repaired by something already in the
app — a rebuild, a backfill, a migration, a "just press X". The moment a claim leans on an
affordance rather than on an edit you made.
**Lesson:** open the screen and run it, on real data, and read the number afterwards. Grepping the
handler and finding the JSX is not evidence the control renders: a prop handed to the wrong
component disables the whole block with no error anywhere, and the build, the linter and a
`no-undef` gate all stay green because every identifier really does exist. If it cannot be pressed
in this environment, say the repair path is UNVERIFIED rather than naming it as the plan.
**Would have prevented:** the Titip revenue change. Three times — in the plan, in the reply, and in
`NEXT-SESSION.md` — the answer to "what about his past months?" was "the Settings rebuild repairs
them, no migration needed". `handleRebuildSalesStats` and `isRebuildingStats` were being passed to
`<DashboardView>`, which reads neither, while `SettingsView` gates the entire block on
`isSystemOwner && handleRebuildSalesStats` — so the button had never rendered for anybody, and the
promise was false every time it was made. Found only by going to press it. Had the session stopped
at "the maths is right and the rebuild exists", he would have shipped a correct new rule over a
book that stayed permanently wrong, with every check green.
Seen: 2026-09-09
Fired: 2026-09-09 (fired on its own session - the repair path was pressed rather than cited, the cached month moved 26000/2 Bks to 2000/1 Bks, and the missing button was found and fixed in the same commit)
node "D:/APP DEVELOPMENT/kpm inventory main FILES/A-Brain/automation/lessons-health.mjs" 2>&1 | head -2
Fired: 2026-10-13 08:10 (Lock on a demo login and Reset demo now were pressed on the emulator, not located - the press is what showed the answer text and the 404 report)

### 2026-09-10 — a handoff corrected in place still carries the instruction it corrected
**Status:** LIVE
**Trigger:** plan time, reading `.claude/NEXT-SESSION.md` or any brief that was amended after it
was first written — before acting on any single instruction inside it.
**Lesson:** read the WHOLE brief before starting, and when two sections disagree, the LATER one is
the correction and wins. Then say in one clause which instruction was dropped and why, so the next
session does not re-add it. A brief written in one pass and amended in another does not delete the
superseded sentence; it appends the correction underneath, and the superseded sentence is usually
the one written in imperative "do this" form, which is exactly what a skimming read acts on first.
**Would have prevented:** today's brief said *"Then draft two documents, in Indonesian: the contract
clauses ... and the one-page proposal template"*, and four paragraphs later said *"The uncle-facing
documents come LATER and are a separate job: a demo script, and the one-page proposal. Do not write
those tomorrow."* Acting on the first would have produced exactly the document Aldi had spent a
message explaining he did not want yet — a price put in front of family before they have a reason
to want the thing. Caught only because the whole file was read before the first write.
Seen: 2026-09-10
Fired: 2026-09-12 (brief section titled "NOT part of this job" was amended in place to say re-test coba baru; the later text wins — re-test IS the job) · 2026-09-15 (phone-sweep brief read whole; no contradiction found)
Fired: 2026-09-12 (brief section titled "NOT part of this job" was amended in place to say re-test coba baru; the later text wins — re-test IS the job)
Fired: 2026-09-17 (Sales Terminal brief read whole before the first write; no contradiction found - the af4d5e2 paragraph is a pre-step, not a competing instruction)
Fired: 2026-09-24 (v5 brief read whole; "FIRST read his verdict" and "WHEN HE SAYS GO" agree - sfx/settings still version 2, so nothing to build)
Fired: 2026-09-24 (round-4 paste read whole; TEST-first and BUILD agree - no answer had arrived, so nothing to fix first)
Fired: 2026-09-26 (round-5 paste read whole; TEST-first and BUILD agree - no answer had arrived; "fixtures through __labFixtures" read against the code: titip + bounties are props, so they went into the lab mount, said in the shooter's header)
Fired: 2026-09-28 (vault incident brief read whole with its NEW FACT block; the amended block and the old hypotheses agree - PC rejects too, so H1 is not the whole cause)
Fired: 2026-09-29 (vault reset/lock paste read whole against NEXT-SESSION.md: both say the self-delete hole is fixed, only the guard was left - no contradiction)
Fired: 2026-09-30 (heavy-app brief read whole: the 14:00 answers block amends the 13:55 "ask for the ranking first" - the later block wins, no ranking asked)
Fired: 2026-10-04 (Journey test brief read whole: the 10:20 ONE JOB and the QUEUED popup block agree - test first, popup after)
Fired: 2026-10-05 (Day Replay brief read whole: 12:50 / 12:45 / 10:55 / 06:00 / 19:40 / 16:05 blocks chained - the later updates (look C signs, the RETUR swap, Rajdhani, rank medals) won over the 16:05 text)
Fired: 2026-10-11 07:25 (the sound-bake brief read whole: its 22:26 block ("ASK, not build" for the capybara + intro) overrides the 22:05 block's capy1..4 + vault-intro bake - the later block won)
Fired: 2026-10-12 (batch-2 brief read whole: the 18:10 / 18:12 / 18:20 blocks chained; item 5 listed as a pure bug turned out a design pick (App.jsx:4552), said so)
Fired: 2026-10-13 (demo brief read whole: 20:05 block + queue agree; no test answers in PROGRESS, so design first)

### 2026-09-26 — an output path built from import.meta.url needs fileURLToPath, never URL.pathname
**Status:** LIVE
**Trigger:** before running any script (a shooter, a baker, an exporter) that builds a write path from `import.meta.url`
- especially one copied from an older script.
**Lesson:** `new URL(import.meta.url).pathname` keeps a space as `%20`; `fs.mkdirSync(..., { recursive: true })` then
happily creates a parallel tree named `D:/APP%20DEVELOPMENT/...` and every write "succeeds" there. Use
`fileURLToPath(import.meta.url)`, and after the first run `ls` the folder you EXPECT the files in, not the one the
script printed.
**Would have prevented:** round 5's twelve frames written into a stray `D:/APP%20DEVELOPMENT` tree (plus a Chrome
profile), three failed frame reads, and a cleanup turn - copied from `shoot-round4.mjs`, which carries the same line.
Seen: 2026-09-26
Fired: 2026-09-26 (three new shooters - round5b, sale-lines, eod-draft - built on fileURLToPath; every frame landed in the vault folder on the first run)
Fired: 2026-10-03 (shoot.mjs uses fileURLToPath(import.meta.url))
Fired: 2026-10-04 (test-journey.mjs + make-board.mjs on fileURLToPath; every frame landed in built8/)
Fired: 2026-10-11 07:25 (sfx-bake's new KENNEY path goes through fileURLToPath; msg-*.mp3 landed in public/sounds, no %20 tree (checked with ls))
Fired: 2026-10-15 07:40 (7 vault scripts + vault-push now find A-Brain via fileURLToPath(import.meta.url); every hook printed the same output from "D:\APP DEVELOPMENT\..." paths)

### 2026-09-17 — a TODAY frame shot wider than the phone hides the very defect the board exists to show
**Status:** LIVE
**Trigger:** before composing any TODAY / AFTER board from headless frames — the moment the first
"today" PNG is placed next to a proposal.
**Lesson:** a 518 px headless frame does not merely crop the phone, it RE-LAYS-OUT: text that wraps
at 375 sits on one line at 518, a 32 px control that is cramped at 375 has room. The TODAY frame
then looks fine and the fix looks like vanity. Pin the app to the phone width inside the window
(`#root{width:375px}` + the fixed sheets, recorded in Looking at the App) or take the numbers from
the pane and say the frame is not the phone. Check ONE thing before composing: does the TODAY frame
show the defect the pane measured (the wrap, the overflow, the cramped row)? If not, the frame is
wrong, not the measurement.
**Would have prevented:** 2026-09-17, the Sales Terminal boards. The first `wares-today` PNG at
518 showed "CELLO GREEN 16" on one line and the steppers with room beside it — the pane had measured
a 98 px name column and a two-line wrap. Caught by looking before composing; without the pin the
board would have asked Aldi to fix a wrap he could not see.
Seen: 2026-09-17
Fired:2026-09-18 · 2026-09-19 (the store card boards: the first `today` PNG after a cold vite start was caught mid fade — the whole card dim beside a bright A; read back before sending, one frame reshot) 2026-09-22, 2026-10-06
Fired: 2026-10-02 (bell TODAY shot through CDP device metrics at a real 390, not a window crop)
Fired: 2026-10-02 (phone sweep, last five screens: every TODAY frame at CDP 390 + touch, 1440 separately)
Fired: 2026-10-02 (phone sweep 1-4: TODAY and AFTER both at CDP 390, never a crop)
Fired: 2026-10-03 (the phone TODAY frame shot at 390 beside the new looks)
Fired: 2026-10-13 (door TODAY + looks at a 390x844 frame, the real phone height)

### 2026-09-18 — a ✅ TEST line is a checklist he can run, not a hash and a screen name
**Status:** LIVE
**Trigger:** before sending any reply that carries a ✅ TEST marker — at the moment the line is written.
**Lesson:** the ✅ TEST line in the REPLY carries the same plain-word checklist that PROGRESS.md keeps
under WAITING ON ALDI (what to open, what he should see, in his app's words). A commit hash, a screen
name and a URL are pointers to the checklist, not the checklist; the reply-size cap trims the work
narration, never the ask.
**Would have prevented:** 2026-09-18 09:30 — the reply ended "✅ TEST Customers (`a9822ff`) on your
phone at https://…" and he answered *"btw what is the test customer u mean?"* — one round trip, and
the test still not run.
Seen: 2026-09-18
Fired: 2026-09-19 20:20 ("✅ TEST d7f2193 stands as written, at the new address" — a pointer to an earlier reply; he answered "what is the test?"); 2026-09-22 07:40 (the four owed commits re-asked as one walk with the address read from preview_logs, not a pointer to PROGRESS.md)
Fired: 2026-09-23 (the prototype ✅ TEST written as six steps, after the same six were run with real drags)
Fired: 2026-09-24 (MUAT VAN pick written as tap-by-tap steps, not a pointer to the card)
Fired: 2026-09-24 (the bay test written as four steps in his words, with the warning that steps 3-4 move real stock)

### 2026-09-20 — a synthetic drill does not walk the finger path; a tap or hold mechanic gets one REAL tap before its ✅ TEST
**Status:** LIVE
**Trigger:** before writing a ✅ TEST line for anything that reacts to pointerdown / pointerup / a hold timer —
at the moment "watched in the lab" is about to be written.
**Lesson:** the lab's `&tab=` drill presses buttons with `.click()`: no pointerdown, no pointerup, no timer,
no class set by hand. It exercises the destination, never the transition. A mechanic that lives in the pointer
path (FolderCard's tap → mark the list → enter) is only watched when a real `left_click` in the pane goes
through the SAME transition the user will take (the same two pages, not a different pair). Sample the arriving
elements' opacity and animation-name after it.
**Would have prevented:** 2026-09-19 20:00, Sampling B (d7f2193) shipped "watched in the lab" via the drill;
the month › date transition carried a stale `.kpm-leaving` mark and the date folders faded out on arrival. Aldi
found it on his own screen and sent a recording (23:36); the fix (6379364) cost a round trip and the trust of a
"watched" line.
Seen: 2026-09-20
Fired: 2026-09-20 (the player card: real `left_click`s in the pane through open → ✓ ✓ → ✕ (the dialog gate asked, the reason typed, SAVE) → the plate, and all-✓ → the scan + VERIFIED, in dark and light, before the ✅ TEST line; the first pass found the gate unmounted in the lab shell and the ✕ silently cancelling - a drill would have reported "watched"); 2026-09-27 (the chest: a real mouse drag at 1440 and a real finger drag at 430 over CDP input, each read back from __labWrites, before the ✅ TEST)
Fired: 2026-10-05 (the sign-word hold: real CDP touchStart / 650 ms / touchEnd on the lab build before the ✅ TEST - red first on the old build, where the release opened the popup)

### 2026-09-22 — a board caption's number is typed AFTER the pane measures that option, never from the plan's arithmetic
**Status:** LIVE
**Trigger:** before composing a board — the moment a px figure, a "fits" or a "scrolls again" is typed into a caption
for an option that has not yet been opened in the pane.
**Lesson:** open every option in the pane (or shoot it) and read the number off the DOM before its caption is written.
The caption is the cost line he decides on; a planned number is a guess wearing a measurement's clothes.
**Would have prevented:** 2026-09-22 09:25. Board 1's B caption was written from the plan ("card 880 → 740 px … the 6th
line pushes the plate 60 px under the screen edge") before B was ever opened. Measured: 737 px, 64 px ABOVE the edge
with five lines, 8 px with six — B fits. The caption would have told him B fails on his screen, and he would have picked
A for a reason that was false. Caught only because the numbers were checked before the compose step.
Seen: 2026-09-22
Fired: 2026-09-22 09:30 (board 1 recomposed with B measured at 737 px, 64 above the edge; the caption corrected before the send), 2026-10-06
Fired: 2026-09-29 (the spot board: "A is 40 px taller on the phone" typed after the probe read 314 vs 275; C's Quarantine note measured wrapping the pages row to 90 px and shortened before the frame)
Fired: 2026-09-30 (every height in the v22 brainstorm note - desk 453/427, crates 225/173 - was read off the rendered board, not planned; the first render showed an open lid rising over the bar above, which no plan had)
Fired: 2026-10-02 (bell board: "switch keys 48 tall" was the plan; measure.json read 46, caption fixed before the send)
Fired: 2026-10-03 ("58×58 each" in the board caption read from measure.json, not the plan)
Fired: 2026-10-13 (captions fill their px from the rendered frames in-page (722/1098/650, 37/23/47))

### 2026-09-22 — a 🔴 DECIDE is written for someone who has never heard the word, or it is not a decision yet
**Status:** LIVE
**Trigger:** the moment a 🔴 DECIDE line is about to name a mechanism (a hash, a salt, PBKDF2, a tenant, a rule, a path) instead of what happens to him if he says yes and if he says no.
**Lesson:** before sending, read the DECIDE as Aldi: every term he could not explain to a friend is replaced by a picture of the
thing (the blender that turns a password into mush; the flat and the lobby of the building) and each option ends with "what
changes for you" and "what happens if no". The name of the mechanism goes in the vault note, never in the ask. A DECIDE he
has to ask about is not a decision put to him; it is a turn spent, then another.
**Would have prevented:** 2026-09-22. The security question was sent three times — 10:05 ("PBKDF2, the Rank Config
cross-tenant gap"), 11:00 (same words), 11:50 ("salt + PBKDF2", "a place in the database that any company could read") — and
he asked twice: *"i dont know what u said about something that i need to decide"*, then *"i dont understand what should i
decide can u explain in detail"*. The fourth send, written as the blender and the apartment building with a YES / NO / LATER
per item and a recommendation, is the one he could answer. Two of his turns and three of mine for one question. The memory
file already says this three times (2026-09-12 was the third); it did not fire because the ask was compressed by caveman ultra
and looked short enough to be clear. Short is not the same as plain.
Seen: 2026-09-22
Fired: 2026-09-22
Fired: 2026-09-23 (the carried look 1 / look 2 question re-asked as what he sees — grey stone or the app's slate and gold — no mechanism named)
Fired: 2026-09-28 (the lock rule asked as "locked for good vs 15 minutes, what happens to you" - no fingerprint, no field name)
Fired: 2026-10-10 (the freeze-clock question put as "what the demo shows on day 2" and "where a visitor's sale lands", no serverTimestamp / Date shift named)
### 2026-09-22 — a headless screenshot over an EXISTING png can leave the old file in place
**Status:** LIVE
**Trigger:** before sending, opening or captioning any frame or board a shoot script just printed as "shot" / "composed".
**Lesson:** delete the target png before the Chrome `--screenshot` call (`rmSync(path, { force: true })`), or check its
mtime after. The script's own log line proves only that Chrome was launched, never that the file on disk is the new one.
**Would have prevented:** 2026-09-22. `board.mjs` was re-run after the PC board was changed from a row of three 0,42-scale
frames to a readable stacked column; node printed "composed board-pc 1488x1911" and the png on disk kept its 18:12 mtime and
its old row layout. It was read back and looked wrong before it reached him, so the cost was three turns — but a board that
arrives as the previous version is a decision made on the wrong picture, and the caption would have carried numbers the
frame does not show. The same silent no-op hit board-phone.png in the next run, and again through a `dir` parameter in
`page()` that shadowed the directory variable, so the delete landed in a folder named "row".
Seen: 2026-09-22
Fired: 2026-09-27 (the chest shooter deletes every old png before it shoots), 2026-10-06
Fired: 2026-09-30 (shoot-isle.mjs rmSync-es each png before the capture)
Fired: 2026-10-02 (shoot-bell.mjs rmSync-es each png before the capture; mtimes read after)
Fired: 2026-10-02 (phone sweep: ps-measure + board.mjs rmSync every png first; board mtime printed and read back)
Fired: 2026-10-02 (board-after: png deleted first, mtime printed, read back before sending)
Fired: 2026-10-02 (shoot-hero.mjs rmSync-es every png before the capture; board mtimes read after)
Fired: 2026-10-03 (shoot.mjs deletes each frame before capture; board.png removed before the rerun)
Fired: 2026-10-04 (test-journey.mjs rmSync-es every frame; board.png deleted first, mtime printed 04:16:44Z)
Fired: 2026-10-04 (board-flash.png removed before the Chrome --screenshot, size read after)
Fired: 2026-10-04 (shoot-signs.mjs rmSync-es every png before capture; mtimes listed after each run)
Fired: 2026-10-13 (shoot.mjs rmSync-es both boards, mtime printed)

### 2026-09-22 — a listener on the thing being dragged dies when the drag re-draws the page
**Status:** LIVE
**Trigger:** before claiming a drag-and-drop works, whenever the move/drop handler lives on the dragged element or on the list that owns it.
**Lesson:** put pointermove and pointerup on the WINDOW, and find the drop target by comparing rectangles. Any gesture
that can re-render its own container mid-drag (turning a page, a filter, a live update arriving) destroys the source
node, and with it the listener and the browser pointer capture - the box keeps following the cursor and the drop
silently does nothing, which reads as "the feature is broken" rather than as a wiring fault.
**Would have prevented:** 2026-09-22. The chest prototype grew hold-a-box-over-a-page-number-to-turn-the-page; the page
turned, the ghost followed the finger, and the drop landed nowhere. Two test rounds went into hunting the drop logic
before the cause turned out to be that the square the finger started on no longer existed. The same session had already
lost a round to document.elementFromPoint returning null in a non-compositing pane - same family: the DOM you ask at
drop time is not the DOM you started with.
Seen: 2026-09-22
Fired: 2026-09-23 (the van-loading prototype: move/drop on the window, the van page turns under a held box and redraws its squares, the drop still landed — real pointer drags in the pane)Last checked: 2026-09-22 21:05 — one new entry (a listener on the dragged element dies when the drag re-draws the page); fired today: 09-14 (the decision went as pressable pictures, not prose), 09-17 (phone frames at 518), 09-22 (every caption number measured after the option was drawn), and the 2026-09-22 headless-screenshot entry from this morning (the boards were re-shot after deleting the target); earlier: 2026-09-22 18:25 — one new entry (a headless screenshot over an existing png can leave the old file in place); fired today: 09-14 (the two boards are pictures, not prose), 09-17 (the phone frames shot at 518, never look=pin), 09-22 (every caption number measured in the pane after the option was drawn), 09-22 (the DECIDE written without a mechanism name); the three 09-22 retirements stay until tomorrow, nothing archived; earlier: 2026-09-22 12:20 — one new entry (a 🔴 DECIDE is written for someone who has never heard the word; the security question needed four sends and two of his asks); the 09-22 caption entry set LIVE (Seen the same day, fired on board 1); fired today: 09-14 (the frame inside the real wrappers), 09-18 (the ✅ TEST as a checklist), 09-21 (boards side by side, decided in one line); earlier: 2026-09-21 07:55 — one new entry (elementFromPoint cannot prove paint order under pointer-events:none); the 09-06 sentinel entry archived; the two 09-07 never-fired entries retired (Stop-hook mtime, viewer-first); fired today: 08-18 (the seal held for a frame before any claim), 08-30 (NEXT-SESSION first), 09-05 (the LED light-mode guard red before the rule), 09-07 (the lab stopped before the build), 09-18 (the ✅ TEST as a checklist), 09-20 (real taps through the ticks and the confirm); earlier: 2026-09-20 14:50 — one new entry (a backslash escape typed into a tool input arrives as the character); the 09-05 entry archived, the 09-06 sentinel entry retired (never fired in 14 days; its check exists), the 09-18 ✅ TEST entry set LIVE; fired today: 08-18 (two file-tail theme guards scoped), 08-19 (the stamp-sum's lookalike end anchor), 09-07 (both servers stopped before the build), 09-20 (real taps through the card before the ✅ TEST); earlier: one new entry (the context percentage is a reading); earlier: one new entry (a real tap before a ✅ TEST on a tap mechanic); earlier: one new entry (the tier with the most keys); earlier: no new entry; the 09-17 TODAY-frame lesson fired once more (a cold-load dim frame, reshot); a count carried from the compaction summary ("six stores") was wrong (four) and the caption was written from the probe — the 08-27 inherited-hypothesis lesson, no new rule

### 2026-09-28 — never `git add` a whole Raw folder a headless browser has run in
**Status:** LIVE
**Trigger:** committing lab frames or a walk script in A-Brain `Raw/<date>-*/` after a shooter or test ran there.
Fired: 2026-10-05 (sign-hold folder added by name: probe, hold.json, 5 frames; built8's re-shot frames restored, not committed)
**Lesson:** the shooters launch Chrome with `--user-data-dir` BESIDE the shots (`Raw/<dir>/profile/`), and a run that ends
before Chrome lets go leaves hundreds of cache files there. Add the files by name (`test-*.mjs shoot-*.mjs shots test-shots`),
never the folder, and read `git show --stat HEAD` for a file count before calling the vault commit done.
**Would have prevented:** 2026-09-28, Agent Inventory v4.1. `git add Raw/2026-09-27-agent-chest` committed 271 browser-profile
files (cache, local state) into the vault; caught only because the commit output ran to 48 KB, then amended out before any
push. An older `Raw/2026-09-26-ponder-loading-bay/shots/profile/` still sits untracked, the same trap waiting.
Seen: 2026-09-28
Fired: 2026-09-30 (vault a960b5d: files added by name, stat 13 files, profile-isle/ left out)
Fired: 2026-10-02 (phone sweep vault commit: files by name, ps-profile/ and sheets/prof/ left out)
Fired: 2026-10-02 (vault 2f4e9ee: 54 files by name, 0 profile/err files)
Fired: 2026-10-05 (Day Replay vault commit: 25 frames + shooter + results.json added by name, profile/ left out, stat 27 files, 0 profile)
Fired: 2026-10-12 (vault 0c41f85: Raw/2026-10-12-batch 5 files by name, the walks' profile-walk / profile-share left in the scratchpad, stat 10 files)
Fired: 2026-10-05 21:35 (fullscreen vault commit: files by name, built8 + day-replay re-shots restored, stat 10 files, 0 profile)

### 2026-10-02 — "no sideways scroll" from scrollWidth is blind inside a clipping parent
**Status:** LIVE
**Trigger:** before writing "fits at 390" / "no sideways scroll" from `scrollWidth === innerWidth` on a page whose hero or shell has `overflow: hidden`.
**Lesson:** also read the right edge of the text blocks (copy, dock) against innerWidth in the same probe. A grid track widened by an over-wide child pushes its text off-screen and the clip keeps scrollWidth at 390. Fix shape: `grid-template-columns: minmax(0, 1fr)` + `min-width: 0` on the wide child.
**Would have prevented:** 2026-10-02, showcase hero A: the 3D table at 1.16x the stage width widened the phone grid to 481 px, the headline ran 107 px off the screen, and measure.json still said docW 390. Caught only by Reading the frame; one extra render round.
Seen: 2026-10-02
Fired: 2026-10-02 18:50 (expedition map: shoot-exp.mjs reads panelRight / panelBottom beside docW on every frame)
Fired: 2026-10-05 (replay phone check reads the right edge of every text in the panel beside docW - caught 1045 px from the chip strip, which scrolls by design and is now measured as a box)
Seen: 2026-10-11 09:20 (a second form: under mobile emulation a too-wide card made the browser widen the PAGE itself to 401 px, so innerWidth = scrollWidth = 401 and the check "passed" on a 375 px phone. Compare against the emulated width, or test every element's right edge against clientWidth - that found it)

### 2026-10-02 — an Artifact with its own picture is published from the scratchpad, not from the vault
**Status:** LIVE
**Trigger:** before the first `Artifact` publish of a vault prototype (A-Brain `Raw/...`) that passes `files` (a ground image, a texture, a data file).
**Lesson:** copy the page AND every supporting file into one scratchpad folder first, then publish from there. `files` sources must sit under the repo or the scratchpad; the vault is neither, so the page path alone works and the picture beside it is refused.
**Would have prevented:** 2026-10-02 18:54, the expedition map: the first publish with `ground.jpg` from `A-Brain/Raw/2026-10-02-expedition/` was refused ("outside the working directory"), one extra copy + publish round while Aldi waited for the boards.
Seen: 2026-10-02
Fired: 2026-10-04 (Day Replay: page + ground.jpg + coin-sprite.png copied to one scratchpad folder, published with files on the first try)

Last checked: 2026-10-14 — no lesson (auto, 45-turn session)
Fired: 2026-10-03 (map-keys prototype + ground.jpg published from scratchpad/mapkeys)
Fired: 2026-10-03 (round 6 crowd + selling scenes: page + ground.jpg copied to scratchpad/r6, published on the first try)
Fired: 2026-10-04 (Day Replay v3: page + ground.jpg + coin-sprite.png from scratchpad/replay3, first try)

### 2026-09-28 — the shape of a stored record names the code that wrote it
**Status:** LIVE
**Trigger:** diagnosing a record that holds something other than what it should (a password, a setting, a count) while more than one build of the app can be live - before ranking suspects or asking Aldi for a test.
**Lesson:** read the record itself first and date each field's FORM - which build writes this field as a string, which as an object, which ones write `updatedAt`. The mix names the writer. Never rule out a stale stored copy because the device is a PC: every browser that ever opened this PWA runs a stored copy until it reloads.
**Would have prevented:** 2026-09-28, the master vault. The brief demoted "old stored copy" because "the PC also rejects"; I then ranked a 15-vs-25 length cut first and asked him to count his password (10 - a dead end). His Console screenshot showed `pin` new form + `recoveryHash` old form + `updatedAt` 10:12:47: an old-copy reset, then a new-copy unlock - the PC was running the 6 Sep copy. Asking for that one screenshot first would have saved two turns and a wrong top suspect.
Seen: 2026-09-28
Fired:
Fired: 2026-10-11 16:00 (demo reset: every record shape - owner/staff rows, vaults, assignedAgent, currentLocation, branch stock - copied from the code that writes it; the five that were first guessed were exactly the five the tier walk broke on)

### 2026-09-28 — innerText is the RENDERED text: match it case-insensitively, and count a "no" only after a "yes" matched
**Status:** LIVE
**Trigger:** a lab walk that proves a button or label is ABSENT by matching `innerText` (or `textContent` vs a CSS `uppercase` class) with a regex.
**Lesson:** `innerText` returns the text AFTER `text-transform`, so `Reset vault tries` reads `RESET VAULT TRIES` and a case-sensitive regex says "absent" for every card. Match with `/i`, and run the same probe on a card where the thing MUST be present before trusting any "absent" result - a probe that has never said yes proves nothing when it says no.
**Would have prevented:** 2026-09-28, vault password per person. The Fleet & Roster walk counted 0 reset buttons on the owner, T3 and T5 cards and I read that as the gate working; the same probe then said 0 on Yoga's T2 card, where the button was visibly there. Three "passes" were blind; the whole walk had to be re-run with `/i`.
Seen: 2026-09-28
Fired: 2026-09-29 (every lab probe matched /i, and each "no button" card was read in the same loop that said yes on Sinta: owner + Yoga empty, Sinta 3 buttons, at 1440 and 430)
Fired: 2026-10-05 (Map System shooter: /Areas/ against the dock's uppercase AREAS pressed nothing, every phone sheet read "closed"; /i fixed it)
Fired: 2026-10-02 (the opposite slip: the cropper's zoom probe matched /x/ against an uppercase "1.00X" and read "none" before and after a pinch - fixed with /i, then it read 1.00 -> 3.00)

### 2026-09-29 — a page read back from an Artifact has no skeleton: give the lab copy its meta tags
**Status:** LIVE
**Trigger:** before the one look at a prototype saved by `Artifact read` (or stripped for republish) and served from the lab at a phone width.
**Lesson:** the publish skeleton adds `<meta charset>` and the viewport meta; a stripped copy has neither, so the lab shows mojibake (`Ā·`) and lays the page out at 980 px inside a 430 viewport. Prepend both tags to the LAB copy only (never to the file you publish), then look.
**Would have prevented:** 2026-09-29, the biohazard board: the first phone look read `innerWidth` 980 and every `·` as `Ā·` - one wasted screenshot round and nearly a false "fits at 430".
Seen: 2026-09-29
Fired: 2026-09-29 15:30 (the Fleet & Roster quarantine section: the lab copy got both meta tags from the splice script, the published file none; first phone read was a real 366 px bay)
Fired: 2026-10-02 (shoot-hero.mjs wraps the to-be-published page in lab.html with charset + viewport; the published file has neither; first phone read was innerWidth 390)
Fired: 2026-10-03 (MISSED, then caught at this read: the two meta tags went into the PUBLISHED rajangan page, not a lab copy; removed and republished as v3)

### 2026-09-29 — a headless frame "at 170 ms" is not at 170 ms: freeze the clock before shooting a moment
**Status:** LIVE
**Trigger:** before capturing or labelling any mid-animation frame for a board, a check or a claim - the moment a shooter does `click; sleep(ms); captureScreenshot`.
**Lesson:** a capture takes tens to hundreds of ms and each earlier capture shifts every later one, so slept frames land late and a label like "0.17 s" is a guess. Pause every animation in the subtree and set one time on all of them (`el.getAnimations({ subtree: true }).forEach(a => { a.pause(); a.currentTime = ms; })`), shoot, move the time, shoot again. Label only frozen frames with a time.
**Would have prevented:** 2026-09-29, the quarantine scan (v17). The slept board showed the scan already finished at "0.30 s" and "0.47 s", so the middle of the transition was never seen, and it hid a real bug: the square query also animated the old-box snapshot, which faded the old box behind the line. The frozen frames at 170 / 300 / 430 ms showed it on the first look; the slept ones would have gone to Aldi labelled with times they did not show.
Seen: 2026-09-29
Fired: 2026-09-29 (the fix itself - the board re-shot from frozen moments before it was sent)
Fired: 2026-09-30 (frozen with getAnimations().pause(); NEW: only the FIRST freeze of a press is a true moment - the switch's own timers run on while its animations are paused, so each moment was shot from a fresh press, shoot-moments.mjs)
Fired: 2026-10-03 (moment frames frozen with getAnimations().currentTime, not a sleep)
Fired: 2026-10-03 (round 6 board: 7 moments per scene set with getAnimations().currentTime; the frozen 1.20 s caught C's chest jump covering the man)
Fired: 2026-10-03 23:20 (built selling scene. SECOND FORM: freezing by `querySelector` then measuring by `querySelector` again read a REBUILT copy of the marker twice - the 1.05 s and then the 1.5 s frame came back as frame 0. Hold the frozen element (`window.__frozen = e`), measure that, check `isConnected`, and refuse an element with no animations attached yet)
Fired: 2026-10-04 (Journey test: 4 moment frames frozen on window.__frozen with isConnected checked; 2 retakes on a rebuilt marker)
Fired: 2026-10-04 (signs moments sheet: every act paused at its currentTime on a held element, isConnected true, 0 running)
Fired: 2026-10-05 (every replay frame frozen through the replay clock (seek + paused animations), and the seek now reads its clock back)

### 2026-09-30 — a thing drawn "in the middle" is measured against the middle before he sees it
**Status:** LIVE
**Trigger:** before publishing or sending any frame with a seal, a seam, a logo or a split meant to sit on a container's centre line.
**Lesson:** compute its centre (rect left + the pseudo's used left + width / 2) minus the container's middle and print it; anything but 0.00 is a defect. Overlaps between two halves (widths like 50.5%) silently move the seam and whatever rides on one half.
**Would have prevented:** 2026-09-30, prototype v24-v26: the quarantine seal sat 4.6 px left of the middle and the healthy teeth beside the lock, because both doors were 50.5% wide. Two rounds of frames went out; he caught it by eye ("the line is not in the middle it is annoying to watch"), one more round with him. v27 measured 0.00 on every lock and seam.
Seen: 2026-09-30
Fired: 2026-10-12 (HUB pin A: pin / roof / word centre offsets printed 0 px in the built lab before the commit, plus a selfcheck re-measuring every piece on x = 25)

### 2026-09-30 — a performance suspect is ruled out by switching it off, never by counting it
**Status:** LIVE
**Trigger:** before writing "ruled out", "only N run" or "that is not it" about any performance suspect (animations, timers, re-renders, listeners).
**Lesson:** pause or block that one thing, re-measure the same window, and report the drop. A count says how many, not how much: one animation can cost more than the other nine together.
**Would have prevented:** 2026-09-30, the heavy-app diagnosis ruled animations out because "only 4 run at rest on Fleet & Roster and 13 on Agent Inventory", and the 18:25 reply told Aldi so, against his own suspicion ("heavy for all the smoothness"). The switch-off test the same evening: ONE of them (the biohazard sign fill pulse) took Agent Inventory from 97% to 29% idle CPU on a 6x-slow phone, and the hidden mascot sprite costs 16 points on every screen. He was right; the count was the wrong instrument.
Seen: 2026-09-30
Fired: 2026-10-01 (item 6 re-measured before building: the pulse badges were worth 2 points after fixes 1-5, so skipped; the same run found the coin spin, 30% -> 9%, hidden behind the sign pulse)
Fired: 2026-10-12 (sidebar drag: the blur was switched off and re-measured, 3 interleaved runs - no main-thread drop)

### 2026-10-01 — never poll the live site in a loop; read the deploy status instead
**Status:** LIVE
**Trigger:** after a push, the moment you are about to check that the live site carries the new build.
**Lesson:** read the commit's deploy status (public GitHub API: /repos/<owner>/<repo>/commits/<sha>/status -> Vercel "Deployment has completed"), then make ONE request to the live site. A curl loop every few seconds looks like a bot.
**Would have prevented:** 2026-10-01 08:34 - after two 5-second polling loops (07:57, 08:29) the live site started answering this network with "Vercel Security Checkpoint" (403 challenge), so the sign-in fix could not be verified live, and his phone may have hit the same wall if it shares the network.
Seen: 2026-10-01
Fired: 2026-10-01 (four pushes 09:25-10:46 read via the GitHub status API, one live curl at most - no checkpoint)
Fired: 2026-10-01 19:46 (ec122c1: GitHub status loop only, then one live read of index + entry - build id found, no checkpoint)
Fired: 2026-10-02 07:42 (0217969: GitHub status read every 15 s until "Deployment has completed", then one live read of index + entry - no checkpoint)
Fired: 2026-10-05 21:25 (50d98a9: GitHub status every 20 s until "Deployment has completed", then one read each of index, entry, Journey chunk - kx-rp-fs found, no checkpoint)
Fired: 2026-10-12 08:01 (f3d33b7: GitHub status every 20 s -> completed in 4 reads, then one read each of index, CSS, entry - CSS name equals the local build, entry carries f3d33b7, no checkpoint)
Fired: 2026-10-11 14:33 (3827f75: GitHub status every 20 s until Deployment has completed, then one live read of index + entry - 3827f75 found, no checkpoint)
Fired: 2026-10-14 05:45 (51ee975: GitHub status every 20 s until both projects completed, then one POST per site - real 404 "not the demo project", demo 401 "sign in with Google first", no checkpoint)
Fired: 2026-10-14 20:51 (d2261c8: GitHub status every 20 s until both completed, then one read of index + entry - the hidden-tab guard found, no checkpoint)
Fired: 2026-10-14 21:06 (ff5b97b: GitHub status until both completed, then one read of index + the AgentProfileView chunk - the 56 px frame class found, no checkpoint)

### 2026-10-01 — a line that holds a regex literal is edited with Edit, never with sed
**Status:** LIVE
**Trigger:** before a mutating action on a check file (`*.selfcheck.mjs`, `integration.audit.mjs`) or any line holding a `/.../` literal with escaped brackets or `\s` - the moment a `sed -i` replace is about to be typed for it.
**Lesson:** sed reads the backslashes in its PATTERN as its own escapes, so a "retarget the dependency list" replace matched the `\s*` instead of the bracket and rewrote `\{\s*const` into `\{[gateUp, vaultPath]*const` - a check that still parses and now tests something else. Use Edit with the exact old line, then grep the edited line back before running the checks.
**Would have prevented:** 2026-10-01 12:00, the T3-T6 entry-lock retargets: one logicFixes check garbled by sed and a second sed in the same command silently changed nothing - an extra build-and-check round to find both.
Seen: 2026-10-01
Fired: 2026-10-15 07:40 (cloud build: skill-index's `/\\/g` and cloud-start's `why()` regex lines written with Edit, not a script; both ran green in the fake-cloud test)

### 2026-10-02 — a lab probe never deletes or rewrites a node the app drew
**Status:** LIVE
**Trigger:** before a mutating action inside a page under test - the moment a probe is about to `.remove()`, `innerHTML =` or move an element the app rendered (a toast in the way, a banner over a frame).
**Lesson:** React owns those nodes; deleting one makes its next update throw `removeChild ... not a child of this node` and the screen under test silently stops rendering - the walk then "proves" a bug the app does not have. Hide with a style (`el.style.visibility = 'hidden'`) or shoot around it, never delete.
**Would have prevented:** 2026-10-02, Master Vault walk: a toast-removal line made the phone list read 0 rows, every product step fail and the desk drag read "does not turn" - one full rerun (~90 s plus a build) before the EXC line in the log named the cause.
Seen: 2026-10-02
Fired: 2026-10-02 (phone sweep: the low-stock strip over the Command Center frame was left alone and shot around, no node touched)

### 2026-10-03 — a motion sample's baseline is the rest state BEFORE the trigger, never the animation's own first frame
**Status:** LIVE
**Trigger:** before claiming a tap, hover or state-change animation is smooth or correct from frozen samples — the moment the sample loop is written.
**Lesson:** read the moved thing's position once at rest BEFORE the trigger, then every step, then after the fill ends, then once under the mouse. Step-to-step deltas and "relative to T=0" are blind to a jump the animation itself causes at frame 0 — e.g. a transform on a 0-height wrapper makes it the containing block of its absolutely placed children, so they leap the moment the animation starts and stay there while its fill lasts. Read one frozen frame at full size too; a thumbnail hid it.
**Would have prevented:** Journey map chest, page v3 (2026-10-03 08:56): every tapped chest was thrown 28 px above its ring and sign for as long as the hop's fill lasted; the round-3 board showed it and was captioned anyway. His reply to v3: "make sure the animation is smooth and correct". Caught in round 4 only because one frame was opened at full size.
Seen: 2026-10-03
Fired: 2026-10-03 (the built chest: rest read every frame BEFORE the burst, then 40 ms samples, then after the swap to the still icon - 0.00 px; the first pane run read 0 px for the hop itself because the hidden pane's clock does not run, so the proof moved to headless)
Fired: 2026-10-03 (round 6: chest and man read at rest before each replay and after the fill - 0.00 px in A, B, C)
Fired: 2026-10-03 23:24 (built: chest rest read before a moment and after the still icon came back - 0.00 px)

### 2026-10-03 — a "phone" in headless Chrome is a desktop until the touch media is emulated too
**Status:** LIVE
**Trigger:** before trusting any headless number or frame labelled "phone" — the moment a shooter sets `Emulation.setDeviceMetricsOverride({ mobile: true })`.
**Lesson:** `mobile: true` changes the viewport only; `(hover: hover)` and `(pointer: fine)` still match, so every phone-only or mouse-only CSS branch measures as the PC. Also send `Emulation.setTouchEmulationEnabled` and `Emulation.setEmulatedMedia` (hover none, pointer coarse, any-hover none, any-pointer coarse), and assert one phone-only rule is live before reading a number.
**Would have prevented:** Journey map lag fix, 2026-10-03 17:45: the first "after" run still showed the flowing line running and ~2,900 ms busy per 3 s, which read as "the fix did nothing" until the media was found - a rebuild and four probe runs.
Seen: 2026-10-03
Fired: 2026-10-03 (round 6: touch + hover/pointer media sent, `(hover: none)` asserted true before reading phone numbers)
Fired: 2026-10-03 23:20 (built6 shooter: `(hover: none)` true at 390 before any phone number)
Fired: 2026-10-04 (Journey test: `(hover: none)` asserted true as the first phone check)
Fired: 2026-10-04 (shoot-signs: touch + hover/pointer media sent, (hover: none) true before the 390 board)
Fired: 2026-10-05 (sign hold probe: touch + hover/pointer media sent, (hover: none) and (pointer: coarse) asserted at 390)
Fired: 2026-10-05 (Day Replay shooter: touch + hover/pointer media sent, (hover: none) and (pointer: coarse) asserted at 390 before any phone number)
Fired: 2026-10-12 (drag probe: touch + hover/pointer media sent, (hover: none) and (pointer: coarse) asserted before any number)

### 2026-10-03 — an Artifact file opened locally has no viewport meta, so a headless "phone" lays it out at 980 px
**Status:** LIVE
**Trigger:** before trusting any headless phone number or frame of a page written to the Artifact contract (no doctype, no head) — the moment the shooter navigates to the file.
**Lesson:** the publish skeleton adds the doctype and `<meta name="viewport">`; the local file has neither, so a 390 px phone emulation renders it at 980 px (and in quirks mode). Load a lab copy wrapped in the skeleton (doctype + charset + viewport-fit=cover meta) and assert one phone-only rule is live (a grid that should drop to 2 columns) before reading a number. scrollWidth said "0 overflow" on the wrong layout because the wide part sat inside `overflow: hidden`.
**Would have prevented:** 2026-10-03 22:15, round 6: the first phone run reported 0 overflow with the map at 5 columns of 189 px; one extra shooter run, and the false pass would have gone into the reply.
Seen: 2026-10-03
Fired: 2026-10-04 (Day Replay shooter serves the page wrapped in doctype + viewport meta; phone layout asserted live before any 390 frame)
Fired: 2026-10-04 (signs shooter wraps the page in the skeleton; phone class + 92/112/112 grid asserted live at 390)

### 2026-10-04 — a browser check that counts what is in VIEW needs a floor, or it passes on an empty frame
**Status:** LIVE
**Trigger:** before trusting a headless check that compares two counts or asserts "none overlap" over elements on screen (flags vs grey rings, men on chests, tags 1..n) — the moment its first PASS prints.
**Lesson:** require the thing counted to be present (`count > 0`, `men.length >= 2`) inside the same condition, and print the counts in the data column. A map zoomed past the subject, a cluster that swallowed it, or an off-screen frame makes both sides 0 and the equality true.
**Would have prevented:** 2026-10-04, Journey map test run 1: "a red flag on every nobody-shop chest" passed as 0 === 0 and "no man on a chest at z16" passed with zero men in view. Caught only by reading the data column before the table went to Aldi; a pass table claiming flags and overlaps were verified would have shipped.
Seen: 2026-10-04
Fired: 2026-10-04 (signs board: cells 32 / signs 64 / map signs 8 printed beside every pass)
Fired: 2026-10-05 (sign hold probe: every word count requires words > 0 in the DOM - 18 at 1440, 4 at 390)

### 2026-10-04 — a screencast frame comes at its own size, not the device's pixels
**Status:** LIVE
**Trigger:** before reading pixels out of `Page.startScreencast` frames (brightness, diffs, crops) with a box measured by `getBoundingClientRect` - the moment the crop is computed.
**Lesson:** scale the box by `img.naturalWidth / innerWidth`, never by the emulated deviceScaleFactor; then check one crop by eye or by its mean (a crop past the frame's edge reads black).
**Would have prevented:** 2026-10-04, the flash probe: the phone "before" run cropped at 2x a frame that was 1x, read mean brightness 16 over mostly empty canvas, and reported "no flash" - caught only because 16 was too dark for the map seen in every other frame.
Seen: 2026-10-04
Fired: 2026-10-04 (signs brightness at deviceScaleFactor 2: crop scaled by naturalWidth / 1440 before any pixel read)


### 2026-10-05 — a Leaflet marker missing from the DOM is not a marker missing from the map
**Status:** LIVE
**Trigger:** before trusting a probe that decides a shop / pin is "not drawn" (off the round, filtered out, hidden) because its element is absent from the page.
**Lesson:** the cluster layer (react-leaflet-cluster) removes every marker outside the visible bounds from the DOM, so "no element" also means "off-screen". Decide "not drawn" AFTER flying to the thing: if its marker shows up at the centre, it was only off-screen.
**Would have prevented:** 2026-10-05 07:35, shop search probe: "Toko Berkah Jaya" was taken as off today's round, the "not on the round" message "failed", and two probe runs went to finding that every lab shop rides every day.
Fired: 2026-10-05 (team probe: men sit inside cluster bubbles at the lab zoom - 0 .kx-sm both before and after - so the check moved to a frame, not to DOM absence)
Seen: 2026-10-05

### 2026-10-05 — a class stylesheet loaded after Tailwind must not set `display` on an element that uses `hidden lg:*`
**Status:** LIVE
**Trigger:** before writing a CSS rule for an element whose JSX carries a Tailwind visibility class (`hidden`, `lg:hidden`, `hidden lg:flex`).
**Lesson:** a plain class rule and Tailwind's `.hidden` have the same specificity, and a stylesheet imported from a component lands AFTER Tailwind, so its `display` wins and the element shows at the width that should hide it. Leave `display` to the Tailwind classes (style only direction / gap), or scope the rule inside the same media query.
**Would have prevented:** 2026-10-05, Map System: `.ms-card { display: flex }` put the PC-only Areas card on the phone over the top bar; one lab rebuild + reshoot to find it (the overlap measure caught it, a quick look would not have).
Seen: 2026-10-05
Fired: 2026-10-13 08:10 (door list/grid rules carry no display; a logicFixes check now pins it)

### 2026-10-05 — a frozen-frame check reads back the state it set, or it is measuring playback
**Status:** LIVE
**Trigger:** before trusting a headless check that first SETS state through a page hook (seek a clock, toggle Lite, inject a fixture) - the moment the setter call is written into the shooter.
**Lesson:** read the state back in the same evaluate and stop the run if it did not take; and refuse a lab bundle older than the newest source file. A setter that throws only adds a line to the error list at the end - every check after it still runs on whatever the page does by itself, and a page that plays on its own hands out plausible PASSes.
**Would have prevented:** 2026-10-05 Day Replay, first shooter run: the lab bundle predated the clock hook, all 18 seeks threw, 22 checks passed on plain playback and 11 failed - it read as 11 bugs and cost a diagnosis round. Now structural in A-Brain `Raw/2026-10-05-day-replay-built/shoot-replay-built.mjs` (STALE LAB BUNDLE guard + seek readback); copy both into the next shooter.
Seen: 2026-10-05
Fired: 2026-10-05 21:10 (walk-fullscreen.mjs: freeze() reads the seek back in the same evaluate; stale-bundle guard first - 4 rebuilds, never a stale run)
Fired: 2026-10-11 14:03 (?capy lab: play() wrap + idle-timer clamp read back in the same evaluate before the tap; lab bundle built after the last source edit)

### 2026-10-05 — a swap test switches to an input SMALLER than the one on screen
**Status:** RETIRED (2026-10-19) — never fired in 14 days; no data-swap control was built since (presentation work only). Its walk lives on in the Day Replay fullscreen swap walk (Budi 11 -> Ari 3).
**Trigger:** before a completion claim on any control that replaces the data a view shows (a man picker, a day picker, a tab that swaps a list) - the moment the walk's swap step is written.
**Lesson:** swap to an input with FEWER items than the current one (fewer stops, fewer rows), not just a different one. State kept per position (a phase string 's8', a picked index, a scroll offset) survives the swap and is read against the new, shorter data before the next frame corrects it. Reset that state when its source changes (React's adjust-during-render), and make the walk prove it.
**Would have prevented:** the Day Replay's date picker shipped in kpm `a4afcf2` (2026-10-05 16:20) with a latent crash - a day with fewer stops read `stops[8].kind` and blanked the whole page; its 38/38 walk never changed the day. Found only at 21:05 by the fullscreen swap walk (Budi 11 stops -> Ari 3), fixed in `50d98a9`.
Seen: 2026-10-05

### 2026-10-06 — a test drag goes at finger speed, or the tap after it is testing a fling
**Status:** LIVE
**Trigger:** before writing a drag into a walk script (CDP `Input.dispatchTouchEvent` / `dispatchMouseEvent`) - the moment touchStart / touchMove / touchEnd are typed.
**Lesson:** send the move as many small steps over ~300 ms and hold still before the end. ONE instant touchMove is a fling; the next tap only stops the fling and fires no click - real phone behaviour, so it reads as a page bug. Before a third fix, log the events (pointerdown / up / click) instead of guessing.
**Would have prevented:** 2026-10-06 showcase scene 03 - "Play after a drag does nothing on the phone" cost two wrong fixes (a redraw guard, `touch-action: manipulation`) before a 30-line event probe showed pointerdown + pointerup with no click, and a slow drag clicked fine.
Seen: 2026-10-06
Fired: 2026-10-12 (drag probe: 40 steps of 4 px with 8 ms gaps, held 120 ms before the end)

### 2026-10-06 — an `if false` under a catch-all is not a lock; read the parent match before quoting a rule as a guarantee
**Status:** LIKELY
**Trigger:** before a completion claim — the moment a rules line (`allow ... if false`, a region check) is about to be quoted to Aldi or put on a customer page as "X cannot happen".
**Lesson:** Firestore rules OR together. Walk up from the line to every enclosing `match`, above all a `/{document=**}` catch-all, and name who it lets through; the claim becomes "cannot, except <who>".
**Would have prevented:** 2026-10-06, the round-3 brief (NEXT-SESSION 09:21) told the Cello presentation to say sales records "cannot be edited or deleted" from `firestore.rules:557`; the owner catch-all at :343 grants exactly that. A false Bukti nearly went onto a paying customer's page.
Seen: 2026-10-06
Fired:

### 2026-10-10 — a time stamp in a note is written by `date`, never typed
**Status:** LIVE
**Trigger:** before a mutating action that writes a clock time into a vault note, PROGRESS.md or a commit (a heredoc, an Edit, a stamp line).
**Lesson:** put a placeholder (`@@T@@`) in the text and replace it with `sed ... $(date +%H:%M)` in the same command, or copy the time from a `date` output printed in THIS turn. A time typed from "about now" is a guess, and the slip happens on a fast turn when the last clock read is minutes old.
**Would have prevented:** 2026-10-10, the demo session: three vault stamps typed ahead of the clock (19:45 at 19:31, 19:52 at 19:49, 19:55 at 19:50), each one needing a fix and an amend commit after the `date` output showed the truth.
Seen: 2026-10-10 · 2026-10-10 21:49 (third: "21:55" typed into this file's own footer by sed) · 2026-10-10 20:06 (again, one hour later: "20:08" typed into an Edit of PROGRESS + NEXT-SESSION at 20:06 - the Edit tool cannot run `date`, so read the clock in the SAME turn first)
Fired: 2026-10-11 07:25 (every stamp in this session's vault + PROGRESS + NEXT-SESSION writes came from new Date() inside the writing script, none typed)
Seen: 2026-10-11 19:48 (missed: round-8 notes stamped 19:55 / 19:58 from a guess while the clock said 19:48 - the date call ran only AFTER the commit; fixed in kpm f1fa3c4 + vault 8f08cb2)
Seen: 2026-10-12 18:09 (missed again: PROGRESS + NEXT-SESSION stamped "18:20" and "18:05" from a guess, the clock said 18:09 / 18:03 - fixed in a follow-up notes commit. Fifth time: this wants a hook that rejects a typed future time in a stamp line, not more prose)

### 2026-10-10 — a vault commit names its files; never `commit -a`, and read what is already staged
**Status:** LIVE
**Trigger:** before a mutating action that commits in the A-Brain repo (a note, an index line) - the moment `git commit` is typed.
**Lesson:** `git add <the files I wrote>` then `git diff --cached --stat` BEFORE `git commit -m`; never `-a` / `-am`. The vault always carries tracked frames a shooter re-wrote and files another session staged, and both ride along silently.
**Would have prevented:** 2026-10-10, the demo session: `git commit -qam` on a one-line stamp fix swept in `Raw/2026-10-05-map-system/built/pc-area.png`; the redo with `reset --soft` still carried `pc-card-tools.png`, which was already staged - two unrelated pictures in "my" commits, one of them still there (`60d0f57`).
Seen: 2026-10-10
Fired: 2026-10-11 07:25 (vault commit: the three notes added by name, `git diff --cached --stat` read before the commit)

### 2026-10-11 — a studio that holds a DECIDED card has no button that resets every card
**Status:** LIKELY
**Trigger:** before publishing a tuning studio (a sound studio, a look studio - any page that saves one settings doc) where at least one card is already decided or baked.
**Lesson:** no global reset. A reset belongs to one card, or not at all - the lists already star my pick, which is the way back. And read the saved doc after each of his saves, comparing EVERY card to the last save, not only the card he talked about.
**Would have prevented:** 2026-10-11, sound studio round 4/5: his 09:57 save went out with the intro he had decided at 09:41 (and the message chime he had changed) put back to my picks - the exact values "My picks" sets. Caught only because the whole doc was diffed against the 09:41 one; he now has to answer a question he had already answered.
Seen: 2026-10-11

### 2026-10-11 — before telling him where a character will be HEARD, list every road that shows the character
**Status:** LIVE
**Trigger:** before a completion claim or a ✅ TEST line that says a character / sound plays somewhere ("the capybara talks", "the bell rings on every screen").
**Lesson:** grep every component that SHOWS the character and every event that feeds it, and check each one actually calls the sound - a character usually appears through more roads than the one you just rewired. Name in the ✅ TEST only the roads that were checked.
**Would have prevented:** 2026-10-11, the capybara voice push: the ✅ TEST said "the capybara (corner merchant / sales terminal) talks"; his phone test came back *"the capy shows up and there is no voice"* - CapybaraMascot.jsx's own idle lines and CAPY_COMMS lines never called speakMumble at all, and one grep before the claim shows it.
Seen: 2026-10-11
Fired: 2026-10-11 14:05 (✅ TEST names four roads, each checked in the built lab: idle line, string CAPY_COMMS, deal object silent, peek silent)

### 2026-10-11 — data written with admin rights proves nothing about what a signed-in tier can read
**Status:** LIKELY
**Trigger:** before a completion claim on data written with admin rights (a seed, a reset, a migration, `Bearer owner`, firebase-admin) that people will read through the app.
**Lesson:** sign in through the CLIENT as each tier that reads it, on the emulator with the real rules, and open their screens. The admin write and its own counts skip every rule and every shape the screens expect.
**Would have prevented:** 2026-10-11 demo reset: logicFixes 2275/0 and the admin-SDK emulator run 17/17 were both green while the T2 dashboard read Rp 0, the T6 vault would not open, Journey called 91 shops ghosts and no team or Day Replay existed - five wrong shapes, every one found only by the tier walk, any one of which would have shipped on the green runs.
Seen: 2026-10-11

### 2026-10-11 — a new preset must fit the studio page's own limits, not only the synth
**Status:** LIKELY
**Trigger:** before publishing a tuning studio round that adds presets (a voice, a look) whose numbers sit outside the values earlier rounds used.
**Lesson:** grep the page for every limit on those keys - slider min/max AND the restore clamp (`sane()` / LIM) - and run one save -> reload round trip on the new preset, comparing the numbers that come back.
**Would have prevented:** 2026-10-11 round 7: The Duke (92 Hz) and Esquie / Video mumble (mouth .74 / .7) were outside the page's 100 Hz / .8 floors - a Save would have come back as 100 Hz / .8, a different voice than the one he picked, and the bake would have used it. Caught only because the artifact tool forced a full read of the live page before republishing.
Seen: 2026-10-11

### 2026-10-12 — an Edit never ends on a space
**Status:** LIKELY
**Trigger:** before a mutating action - an Edit whose old or new text would end (or start) on whitespace, typically mid-way through a className line.
**Lesson:** end the replaced text on a visible character (extend it to the next class or the closing quote). After any Edit on a class string, grep the commit's added lines for two classes glued together (a `]` followed straight by a letter) before committing.
**Would have prevented:** 2026-10-12 kpm `6dd3cb7`: the WhatsApp Share edit ended on `text-[10px] ` and the space was dropped, shipping `text-[10px]shadow-md` (the button lost its size and shadow); found only by reading the commit diff, fixed in a second commit `7098386`.
Seen: 2026-10-12

### 2026-10-12 — a walk that fakes the callback never ran the callback
**Status:** LIVE
**Trigger:** before a completion claim on code that hands a callback (a saver, an onDone, a writer) to a helper whose walk used a stand-in for it.
**Lesson:** run `node src/config/undef.check.mjs` after the edit (it names any identifier the scope does not have), and either drive the REAL callback once in a walk or say in the claim that it was not run. A green walk with a fake callback proves the helper, not the line that calls it.
**Would have prevented:** 2026-10-12 kpm `6dd3cb7` went live with `userId` (not in scope in MerchantSalesView) inside the WhatsApp saver - the 9/9 share walk used a fake saver; his Save on the live site failed ("userId is not defined"), fixed in `2490f5a`. undef.check flagged it but was not run (and is red on `__BUILD_ID__`, so nobody runs it).
Seen: 2026-10-12
Fired: 2026-10-12 (undef.check run after every edit of the three fixes, clean each time)

### 2026-10-12 — one run of a speed A/B is noise until the variants are repeated, interleaved
**Status:** LIKELY
**Trigger:** before writing down or reporting that switching something off made a page faster or slower (a blur, an animation, a listener) - the moment a single before/after pair prints.
**Lesson:** run each variant at least 3 times, interleaved (A B A B A B, not AAA BBB), and name a winner only when the ranges do not overlap. Also assert the page actually loaded (the element exists, the server answered 200) before reading any number - a dead page prints believable frame counts.
**Would have prevented:** 2026-10-12 sidebar drag: the first real run showed the blur costing 26% (1470 vs 1094 ms busy) and it was about to go into PROGRESS as the cause; three interleaved runs gave 878-1139 vs 927-1259 - no difference, the real cost was the re-render. Before that, two probe runs read numbers off a page that never loaded (python missing, HTTP 000) and printed 171 frames anyway.
Seen: 2026-10-12
Fired:

### 2026-10-13 — a board page opened from file:// draws the app in the fallback font
**Status:** LIKELY
**Trigger:** before composing any board whose frames link the app's built CSS - the moment the shooter navigates to the page.
**Lesson:** the built CSS loads Rajdhani from absolute `/assets/...` urls, and a file:// page (origin null) cannot fetch them from the lab server either - Chrome blocks cross-origin fonts. Serve the board pages from the lab itself (copy into `dist-ponderlab/<dir>/`, open `http://localhost:4187/<dir>/...`) and have the shooter print `document.fonts.check('700 13px Rajdhani')` per frame; `false` means the frame is not the app.
**Would have prevented:** 2026-10-13 demo door: the first shoot of both boards came out in a Consolas-like fallback on every label; caught by `fonts.check` + the read-back, one extra shoot. The 2026-10-12 active-tabs board used the same file:// pattern.
Seen: 2026-10-13
Fired:

### 2026-10-14 — a symptom he reports a second time means the last fix measured the wrong layer
**Status:** LIKELY
**Trigger:** before writing any fix for a symptom he has reported before (grep the vault and PROGRESS.md for his words first) - and before the completion claim on any sound, timing or animation fix.
**Lesson:** list every layer between the code and his eyes or ears (plan -> files -> browser scheduling -> tab state -> device) and measure the one the last fix did NOT. A check that re-runs the layer already fixed passes and proves nothing new.
**Would have prevented:** 2026-10-11 and 2026-10-12, two capybara "1 or 2 words" fixes both changed the speech plan and both passed; the 2026-10-14 measure showed the plan was right all along (0 of 51,300 plans short) and a hidden Chrome tab bunched the syllable timers (4/4 lines heard as 2 sounds) - a third report and a third session.
Seen: 2026-10-14
Fired:

### 2026-10-15 — a yes to an automatic push is not a yes to a push now
**Status:** LIKELY
**Trigger:** before a mutating action that pushes any repo (`git push` typed for kpm or A-Brain) - name the sentence of his that covers THIS push, this time.
**Lesson:** his approvals are per action. A yes to a future mechanism ("A-Brain uploads itself at the end of every session", a Stop hook not built yet) or to one planned push (build step 7) does not cover an extra push mid-session. No sentence of his names this push -> commit locally, ask, push only on his word.
**Would have prevented:** 2026-10-14 23:14, a second A-Brain push of my own note (53031e4) started right after the approved step-7 push; it hung on a GitHub approval window on his screen, which he declined - *"i havent approve the second github upload"*.
Seen: 2026-10-15

### 2026-10-18 — a read-back that prints the inserted line must GATE the commit, not ride in the same command
**Status:** LIVE
**Trigger:** before a mutating action that inserts text into a vault or repo file with sed/awk and commits it - the moment the insert and `git commit` are about to share one `&&` chain.
**Lesson:** `sed "174a\\$L"` in double quotes hands sed a literal `$L` (the backslash escapes the `$`). Insert with Edit (or `awk -v`), read the line back in its own call, and commit only after reading it. Same family: never pass JS with template literals (backticks, `${}`) through a double-quoted `node -e "..."` - bash runs the backticks as command substitution. Code text goes in with Edit or a script file. The `node -e` half is ENFORCED: A-Brain `automation/heredoc-gate.mjs` (rule 3) blocks it - it had a hole (stopped reading at the first `\"`), fixed 2026-10-19 on his *"yes make sure that lesson learnt and dont do it again"*, test `heredoc-gate.test.mjs` 8/8, live block seen 2026-10-19.
**Would have prevented:** 2026-10-18 14:57, A-Brain `223f56a` shipped two index lines reading `$L`; the read-back printed it, but the commit had already run in the same chain - fix commit `5733ca4`. 2026-10-19 06:55 and 07:00: two `node -e` edits of `tests/pc-drag.mjs` - one wrote `await ev();` (the backtick string ran as a command), one aborted the whole batch; 3 extra runs.
Seen: 2026-10-18, 2026-10-19
Fired: 2026-10-18 15:17 (model-switcher links: `awk -v` insert, read back in its own call, commit `55be9dc` only after the three lines printed right)
