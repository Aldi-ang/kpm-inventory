# Next session — one job

Copy the block below. It is the only thing on this page you should paste.

---

FIRST, BEFORE ANY CODE: Aldi is PART WAY THROUGH Round 7 of `MANUAL_TEST_CHECKLIST.md`. Pick it up
at **Section B** and walk him through B, C, D and E one section at a time, waiting for his answer on
each. Do not start the coding job below until he says it is done, or tells you to skip it.

  SECTION A IS DONE, 2026-09-07 — the hand-off picker passed on every point. His words: *"i check
  already and my tier 5 test account are limited to seeing team member only ... great job, no
  tickbox nothing, tickbox only showing on upper tier"*. Do not re-ask A.

  TWO BUGS CAME OUT OF SECTION A AND ARE ALREADY FIXED. Do not re-find them:
    - `2e5a8ac` the consignment list labelled stores with the Google account name, and named the
      seller of the newest row rather than the current holder. Now: `ownerAgentId` first, roster
      name second (`ConsignmentFinanceView.jsx`, `rosterNameById` + `handedOwnerByStore`).
    - `4bd0f52` a phone number is no longer required to save a person, and the refusal names the
      empty field. Email and Name stay required — the email IS the document id of
      `employee_directory/<email>`, and a blank name undoes `2e5a8ac`.
    - `9388ba2` supersedes `7d9b5ba`'s trigger: a **BLANK** address saved by a global admin now
      resolves to that admin's own, because his existing test personnel have no address at all and
      the matching-only rule never reached them. Phone is **required again for everybody except a
      self-proxy** — his correction: *"make sure that email and phone number is still required for
      tier below 1"*. Name is unconditional.
    - `7d9b5ba` personnel saved under the signed-in admin's OWN email are that admin in another form:
      roster record, no `employee_directory` entry, and the duplicate-email refusal stands down for
      that case only. This also closed a live foot-gun — the directory maps one email to one agentId,
      so a test person on his address repointed his own login at it and would demote him out of
      Tier 1 on next sign-in.

  ✅ NO LEFTOVER TO CLEAN — checked and dismissed 2026-09-07. A stale
  `employee_directory/<his email>` was suspected, but the OLD duplicate-email guard tested the
  motorist roster, and his own owner record already holds that address, so every attempt to save a
  test person on it was refused before any write. Confirmed by the fact that he is signing in as
  Tier 1 right now: the create branch used a bare `set` with no merge, so one such save would have
  overwritten his `role: 'COMPANY_OWNER'` record and demoted him at the next sign-in
  (`App.jsx:2452-2468` merges the email doc over the uid doc, then routes on `activeData.role`).

    - `0cb7efa` every consignment names its responsible agent at EVERY tier — the `isAdmin &&`
      wrapper is gone from both the list card and the detail panel — with the hand-off chain
      "A → B → C" beneath it from the new `handoffChainByStore` memo. **The only fix of the day
      Aldi CONFIRMED ON SCREEN**, by screenshot: *"i verify that the info is there already"*, showing
      "MANAGED BY: [TEST] SALES CANVAS" over "[TEST] OWNER → [TEST] SALES CANVAS" on both stores.

    - `4641b5f` the Incoming Hand-offs card now shows the debt, the total packs and one line per
      product, from a `stockSnapshot` frozen onto the request document by the sender. The receiver
      could not look it up — until approval the store is not theirs and `myTransactions` filters
      every row out. Pre-change requests say so instead of rendering zeroes; the empty note no
      longer draws a bare `""`.

  🔴 OPEN, ASKED AND UNANSWERED — the second half of that same message: *"i want u to add redirect
  location on the journey map just to make sure that this area is not too far from the agent journey
  if they want to check, just for further convenience"*. A button on the hand-off card that opens the
  **Journey tab** focused on that shop. Not started, because it is FOUR files (over the 3-file rule)
  and one behaviour is genuinely undecided:
    - `src/App.jsx` — a focus-store state for the journey tab, like the existing `setFocusStore`
      that already serves `receivables` notifications (`handleNotificationClick`);
    - `src/JourneyView.jsx` — consume it and `flyTo`; it is the `'journey'` tab and already receives
      `customers` and `setActiveTab`;
    - `src/ConsignmentFinanceView.jsx` — the button on the incoming card;
    - `src/config/logicFixes.selfcheck.mjs`.
  ⚠️ THE TRAP: **not every shop has GPS.** `CustomerManager.jsx:70` gates on
  `customer.latitude && customer.longitude` and falls back to the address string. A button that
  silently flies to the map centre when a shop has no coordinates is worse than no button — it
  shows the receiver a location that is not the shop. Ask Aldi what it should do in that case
  before building; the question was put to him and he has not answered.

  ⚠️ NO FIX SINCE `0cb7efa` HAS BEEN SEEN ON SCREEN. Both are proven by checks and by nothing else. The
  preview pane refuses the dev server's self-signed certificate, so ask Aldi to look, or fix the
  viewing path first (`A-Brain/Wiki/Concepts/Looking at the App.md`).

  Sections C and D need TWO accounts signed in at once, and Section C needs a person with a branch
  ticked in "Hand-off approval branches". Tell him that before you start asking.

🔴 HE ALSO OWES ONE DECISION, ASK EARLY: may you trim `.claude/PROGRESS.md`? It is 205,634 bytes /
3,051 lines, the SessionStart hook prints the whole thing (measured: a 200,816-byte dump), and it
re-prints on startup, resume, `/clear` AND compact. At 33 sessions in one day that is roughly 1.6M
tokens of pure startup. The file's own rule says trim LOG to ~5 entries. Trim per-track — keep the
newest few 🟠 KPM entries and the newest few 🔵 7DTD entries separately, never re-sort across them.

THEN THE CODING JOB: Product Performance reports unpaid consignment as finished revenue. Split it,
and decide what the months already written are allowed to say.

ALDI'S REPORT, verbatim 2026-09-05: *"this shouldnt be categorize as sales yet, because it is
account receivable and customer can also return the good right so there should be another parts of
the panel saying that there are account receivable pending in some stores but also finished sales as
well"*. His screenshot shows Rp 1.229.000 presented as revenue when most of it is unpaid `Titip`.

IT IS NOT A PANEL FIX. THE PANEL NEVER SEES A TRANSACTION. `ProductPerformancePanel.jsx:44` reads a
pre-aggregated monthly rollup document through `statsPath(...)`, deliberately - reading a year live
off `transactions` is thousands of document reads and Aldi pays for every one. The merge happens
long before the panel:

  - `src/utils/salesRollup.js:88-90` - `salesDelta` accumulates `{ qty, revenue }` per product and
    nothing else. There is no paymentType dimension anywhere in the rollup.
  - `src/utils/salesRollupWrite.js:37-38` - writes exactly those two fields into `byProduct` and
    `byDay`.

So the split is created at WRITE time and carried through: `salesRollup.js` splits the delta,
`salesRollupWrite.js` increments the new fields, `sumRange` carries them, and the panel plus
`ponder/stages/ProductPerformanceTable.jsx` render two figures instead of one. THAT IS FIVE FILES,
over the 3-file rule - name them to Aldi before starting, do not discover it halfway.

CHECK THIS BEFORE DESIGNING ANYTHING. Does a later `CONSIGNMENT_PAYMENT` also enter the rollup? Look
at `SALE_TYPES` in `salesRollup.js:42-46`. If a Titip sale books revenue at placement AND its
payment books revenue again, the panel is already double-counting, and that is a separate and larger
money bug that must be settled first. Settle this question before writing a line.

THE TRAP THAT MAKES A LAZY BUILD WRONG - HISTORICAL ROLLUPS HAVE NO SPLIT. Every month already
written carries only `{ qty, revenue }`. Add the new fields and past months silently report zero
receivable and 100% finished sales: a confident wrong number, which is worse than today's honest
merge. Decide explicitly and tell Aldi which you chose - backfill from `transactions`, or label
pre-change months as "not separated" in the UI. Do not let old documents answer a question they were
never asked.

RETURNS ARE PART OF HIS SENTENCE. He said "customer can also return the good right". There is a
related open bug in the queue below - `returnTotal` is written at `useTransactionEngine.js:492`,
`:569` and `:590` and read by no money calculation. Check whether the rollup fix needs it before
treating them as separate jobs.

Leave the fix in `src/config/logicFixes.selfcheck.mjs`: slice each assertion to its own anchors,
assert the anchors were FOUND before slicing, re-run the arithmetic on real numbers, and trial it RED
before green. Copy the modified source files aside and `git checkout --` them rather than stashing -
a stash can take the check file with it, and then the trial cannot fail and proves nothing.

STANDING RULE, his words 2026-09-06: "well now we will start working on localhost again dont need to
push the update everytime". Commit locally and stop. A push is something he asks for by name. The
login fix is deployed and confirmed; nothing is owed there. Full write-up:
`A-Brain/Wiki/Concepts/The Cross-Site Login Block.md`

Then rewrite `.claude/NEXT-SESSION.md` with the next single job.

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Bug 2 — PROMOTED, it is the job above.

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

### Housekeeping — the preview pane cannot see the dev server

`vite --host` serves HTTPS with a self-signed certificate and the in-app browser refuses both
`https://localhost:5173` and `http://localhost:5173`. Every visual claim this session had to be
handed back unverified because of it. Worth one session to fix properly.
</details>
