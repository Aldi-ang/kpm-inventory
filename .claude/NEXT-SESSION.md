# Next session — one job

Copy the block below. It is the only thing on this page you should paste.

---

FINISH ROUND 7 OF `MANUAL_TEST_CHECKLIST.md` WITH ALDI, BEFORE ANY CODE. Walk him through the
sections below one at a time, waiting for his answer on each. Do not start the coding job further
down until he says the round is done or tells you to skip it.

  **Section A — DONE 2026-09-07.** The picker passed on every point. Do not re-ask it.

  **Section B — NEVER RUN.** Fleet & Canvas -> edit a person:
    1. a "Hand-off approval branches" chip row appears under Allowed Price Tiers;
    2. nothing ticked -> the line reads "this person follows the default";
    3. tick BANDUNG on one account -> the line names that branch; Save;
    4. reopen -> BANDUNG is still ticked (if not, the save is dropping the field);
    5. edit somebody ELSE'S phone number, save, reopen -> their chips are unchanged.
       ⚠️ Item 5 is the `null`-not-`[]` trap. If editing a phone number strips a regional admin's
       approval power, this is the only place it shows.

  **Section C — 2 of 4 DONE.** Confirmed on screen: Aldi (Tier 1) gets the approval bell, and a
  named branch approver gets it with a working Authorize button. STILL OWED, and this is the half
  that catches the feature doing the opposite of what he asked:
    - **displacement.** Tick ONE person for BANDUNG, send a hand-off into a BANDUNG store, accept
      it. **Bandung's own regional admin must go silent.** His runs so far used the HEADQUARTERS
      regional admin, who is either the named approver or the default holder — both are supposed to
      see it, so those runs cannot tell a working displacement rule from a broken one.
    - **the plain agent.** A Tier 5/6 who accepts a store must still get NO Authorize button.
      ⚠️ A regional admin who accepts one SHOULD now get it — `ad4f18b`, his decision. Section C
      item 4 in the checklist was rewritten to say so. Do not report that as a bug.

  **Section D — NEVER RUN.** Approve a hand-off from one account, then press Authorize from another
  account on the same request. It must say "Already handled … Somebody else got there first."
  ⚠️ If it goes through twice the store gets a second hand-off record and a second round of
  notifications, and the A -> B -> C chain on the store card grows a hop that never happened. Stop
  and report it.

  **Section E — SKIP** unless something was pushed. Nothing has been; everything is local.

  ✅ ONE MORE HE OWES, and it is the most important thing shipped yesterday. `994d3d6` closed a
  privilege escalation. He confirmed the header now reads MY RECEIVABLES for a Tier 4 — ask him to
  also confirm his OWN Tier 1 session still skips the PIN within five minutes of unlocking. The fix
  was written so his convenience is untouched, and a check pins it, but nobody has watched it.

THEN THE CODING JOB: Product Performance reports unpaid consignment as finished revenue. Split it,
and decide what the months already written are allowed to say.

ALDI'S REPORT, verbatim 2026-09-05: *"this shouldnt be categorize as sales yet, because it is
account receivable and customer can also return the good right so there should be another parts of
the panel saying that there are account receivable pending in some stores but also finished sales as
well"*. His screenshot shows Rp 1.229.000 presented as revenue when most of it is unpaid `Titip`.

IT IS NOT A PANEL FIX. THE PANEL NEVER SEES A TRANSACTION. `ProductPerformancePanel.jsx:44` reads a
pre-aggregated monthly rollup document through `statsPath(...)`, deliberately — reading a year live
off `transactions` is thousands of document reads and Aldi pays for every one. The merge happens
long before the panel:

  - `src/utils/salesRollup.js:88-90` — `salesDelta` accumulates `{ qty, revenue }` per product and
    nothing else. There is no paymentType dimension anywhere in the rollup.
  - `src/utils/salesRollupWrite.js:37-38` — writes exactly those two fields into `byProduct` and
    `byDay`.

So the split is created at WRITE time and carried through: `salesRollup.js` splits the delta,
`salesRollupWrite.js` increments the new fields, `sumRange` carries them, and the panel plus
`ponder/stages/ProductPerformanceTable.jsx` render two figures instead of one. THAT IS FIVE FILES,
over the 3-file rule — name them to Aldi before starting, do not discover it halfway.

CHECK THIS BEFORE DESIGNING ANYTHING. Does a later `CONSIGNMENT_PAYMENT` also enter the rollup? Look
at `SALE_TYPES` in `salesRollup.js:42-46`. If a Titip sale books revenue at placement AND its
payment books revenue again, the panel is already double-counting, and that is a separate and larger
money bug that must be settled first. Settle this question before writing a line.

THE TRAP THAT MAKES A LAZY BUILD WRONG — HISTORICAL ROLLUPS HAVE NO SPLIT. Every month already
written carries only `{ qty, revenue }`. Add the new fields and past months silently report zero
receivable and 100% finished sales: a confident wrong number, which is worse than today's honest
merge. Decide explicitly and tell Aldi which you chose — backfill from `transactions`, or label
pre-change months as "not separated" in the UI. Do not let old documents answer a question they were
never asked.

RETURNS ARE PART OF HIS SENTENCE. He said "customer can also return the good right". There is a
related open bug in the queue below — `returnTotal` is written at `useTransactionEngine.js:492`,
`:569` and `:590` and read by no money calculation. Check whether the rollup fix needs it before
treating them as separate jobs.

Leave the fix in `src/config/logicFixes.selfcheck.mjs`: slice each assertion to its own anchors,
assert the anchors were FOUND before slicing, re-run the arithmetic on real numbers, and trial it RED
before green. Copy the modified source files aside and `git checkout --` them rather than stashing —
a stash can take the check file with it, and then the trial cannot fail and proves nothing.

STANDING RULE, his words 2026-09-06: "well now we will start working on localhost again dont need to
push the update everytime". Commit locally and stop. A push is something he asks for by name.

Then rewrite `.claude/NEXT-SESSION.md` with the next single job.

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### What shipped 2026-09-07 (13 commits, all local, none pushed)

`2e5a8ac` store cards name the current holder from the roster · `4bd0f52` + `9388ba2` test personnel
save with no email/phone, real staff still need both · `7d9b5ba` self-proxy personnel get no login
mapping · `0cb7efa` responsibility line + hand-off chain at every tier ✅seen · `d439853` PROGRESS.md
208KB->34KB · `4641b5f` the hand-off request carries a stock snapshot · `5a59eaf` journey-map button ·
`dda8ec6` a map pin is compulsory on an outlet (**applies to EDITS too** — narrow to the create
branch if that blocks him, do not delete the guard) · `5973fc2` branch approvers can see their queue
✅seen · `a8fea37` the alert dot was shaking the tab strip · `2f77cb2` the approver sees the offer
✅seen · `ad4f18b` a branch approver may authorise a store handed to them (**his decision**) ·
`994d3d6` 🔴 vault-grace privilege escalation ✅seen.

### Bug 3 — the tutorial book: white line, and the close button does nothing

- **Close button exists** at `src/ponder/PonderBook.jsx:1025`, calls `shut`. It does not respond;
  Aldi closes the book by clicking outside instead. Prime suspect is the scrim at `:1103`
  (`absolute inset-0 ... backdrop-blur-sm`) painting over the button and swallowing the click —
  the same class of stacking fault as the notification bell in `4bb9ad7`. Verify by rendering and
  using `document.elementFromPoint` on the button's centre; do not guess.
- **A white vertical line** on the book background, visible in his screenshot 2. NOT located yet —
  no `bg-white` or `border-white` in `PonderBook.jsx`. Look at the page/spine edges and the
  stage CSS before editing anything.
- ⚠️ Two audit checks guard the Ponder scene splits — search `strandedBeats` in
  `integration.audit.mjs`. Do not weaken them.

### Housekeeping — same `animate-ping` shape, unchecked

`AgentProfileView.jsx:1333` uses `-top-2 -right-2 animate-ping`, the exact geometry that was
shaking the Hand-offs tab strip. Untouched on purpose: check whether its parent scrolls before
deciding. If it does, the fix is `a8fea37`'s — inset it far enough that the 2x ring clears the edge.

### Housekeeping — the preview pane cannot see the dev server

`vite --host` serves HTTPS with a self-signed certificate and the in-app browser refuses both
`https://localhost:5173` and `http://localhost:5173`. Every visual claim this session had to be
handed back to Aldi to check by eye. Worth one session to fix properly.
</details>
