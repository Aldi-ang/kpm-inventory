# The one job

**Walk the paths a new customer hits on day one, in the emulator, and write down everything that
breaks. Do not fix as you go — collect first, then rank.**

Aldi is selling this app before 30 September 2026. The three classes above this in the agreed order
(money lies, data loss, branch leaks) are either fixed or blocked on his answer — see the queue. Day
one is what is left, and it is the class that ends a sale before any of the others matter: if
onboarding breaks, nothing else gets looked at.

**You can do this without him.** `37f34ee` set up a local Firebase emulator with a fake company, so
every screen behind the login is reachable from here. Recipe:

```
npx firebase emulators:start --only auth,firestore     # background Bash task
node tools/seed-emulator.mjs                           # directory row, keyed by email
```

`preview_start` the **`kpm-dev-http`** launch entry (port 5174 — plain http, the only mode wired to
the emulator). Then from the page console, because a popup cannot complete in a single-tab pane:

```js
const h = window.__kpmEmulatorAuth;
const cred = h.credential(JSON.stringify({ sub: 'x', email: 'adikaryasukses99@gmail.com', email_verified: true }));
const res = await h.signIn(h.auth, cred);   // res.user.uid — the emulator picks it, not you
```

Re-run `node tools/seed-emulator.mjs --uid <that uid>`, then open the vault and reload:

```js
localStorage.setItem('kpm-vault-grace', JSON.stringify({ uid: '<that uid>', at: Date.now() }));
```

## Aldi will be at this one — 2026-09-08, *"lets do the test tomorrow"*

So split it rather than doing it all headless. **The agent walks first, alone, and writes the list.**
Then hand him only the things that need a human: anything that needs a real Google account, a real
phone, or his judgement on whether a screen reads right. He should not sit and watch a walk he could
be told the result of.

## The paths, in the order a real customer meets them

Check each at **desktop AND at 375x812** — he asked for both: *"make sure both phone and PC looks
good and work well"*. Working matters more than pretty; he deferred appearance, not usability.

1. **First sign-in** on an empty tenant — before any product or person exists. Does the app explain
   what to do next, or present an empty screen with no way forward?
2. **Add the first product.** Master Vault. Including the units — Slop, Bal, Karton — because every
   quantity in the app converts through them.
3. **Add the first person.** Fleet & Canvas. Give them a branch and a tier.
4. **Load their van**, then **make the first sale** — Cash, then Titip to a registered shop.
5. **The first EOD** — submit, then verify it.
6. **The first consignment audit** — some sold, some left on the shelf, some damaged. This is the
   path `f46bc4a` just fixed, so confirm the report moves the way it should.
7. **Product Performance and the Dashboard** after all of the above. Do the two agree with each
   other and with what was actually sold?

## What to write down for each break

File and line if you find it, what the customer would see, and which class it falls in — money,
data loss, branch leak, day one, or appearance. **Do not fix more than one thing before reporting**,
because the ranking is his and a session that fixes eagerly spends the deadline on his behalf.

⚠️ Step 7 has an open thread already: the dashboard showed **Rp 0** against three seeded
transactions. `txDate` (`src/utils/period.js:90`) dates a sale by `timestamp` first and falls back
to `date`; `dayOf` (`salesRollup.js:57`) does the opposite. For records written since the
`getLocalDayKey` fix the two agree, so this is probably only that the seed carries no `timestamp`
and no `sales_stats` — but confirm it rather than assume, because "the report disagrees with the
transactions" is the bug class that just cost a fix.

⚠️ The offline drain changed on 2026-09-08 (`e9b04e5`): the cloud document id is now decided when a
sale is QUEUED, and each chunk is acknowledged as it lands. If step 4 or 5 touches offline
behaviour, that is the shape it now has.

⚠️ Mixed line endings in this repo: `AgentInventoryView.jsx` and `FleetCanvasManager.jsx` are CRLF,
`App.jsx` is LF. Match the file or the edit anchor silently misses.

Then rewrite this file with the next single job.

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### The plan Aldi agreed to, 2026-09-08 — ship before end of September

Goal is NOT "no bugs". It is: no bug on the paths his customer actually walks, everything else
written down and ranked. Fix order, by what a bug there costs the customer:

1. **Lies about money** — the job above is #1. Then: is Titip revenue booked at placement correct?
   (his call, unanswered)
2. **Loses data** — offline drain, half-committed batches. Salesmen on phones in bad signal is the
   normal case here.
3. **Leaks across branches** — bug 3 below.
4. **Blocks day one** — first login, first product, first staff member, first sale, first EOD.
5. Everything else, appearance included.

Full reasoning, options and what was ruled out: `A-Brain/Brainstorm/2026-09-08_shipping-readiness.md`.

### ANSWERED 2026-09-08 — the emulator is BUILT, see the recipe above the fold

*"okay sure make the emulator for better efficiency for both of us i guess"* — done in `37f34ee`,
proven end to end: sign-in completes, the Dashboard renders the seeded company, and the layout was
checked at desktop and 375x812. Nothing to decide here any more; just use it.

⚠️ The dev door onto `window` is guarded by five assertions, two of them RED-trialled. Do not
loosen the gate to make something convenient work — it needs BOTH `import.meta.env.DEV` and
`VITE_USE_EMULATOR`, and only vite's `httpdev` mode sets the second. `npm run dev` must keep talking
to the live project, because that is what Aldi's phone testing measures.

### Bug 3 — the geofence bypass goes to the owner, globally

His rule, 2026-09-08: *"every geofencing bypass approval is the responsibility for each regional
admin and each regional admin only have responsibility to approve or reject the bypass for their own
team inside their regional area only other tier shouldnt be receiving this"*, plus *"make sure that
there is only 1 request each time, salesperson should not be able to spam the request"*.

* `src/MerchantSalesView.jsx:822` writes to `gps_bypasses`; `:829` writes the bell with
  `agentId: "ADMIN"`, `linkToTab: "fleet"` — one owner-addressed notification with no region on it.
* `src/FleetCanvasManager.jsx:132` subscribes to the whole collection with no region filter, and the
  approve/reject buttons at `:1073`/`:1084` sit on the owner-only Fleet & Canvas screen.
* `src/MerchantSalesView.jsx:822` calls `addDoc` with no check for an existing PENDING request.

FOUR FILES AT LEAST, over the 3-file rule — name them to him first. And settle before designing:
does a bypass use `canApproveHandoffFrom` (which honours the Fleet & Canvas per-person chips), or a
plain "Tier 4 of that region" rule? His sentence says *regional admin*, not *named approver*, and
those stop being the same set the moment anybody is named. The region must be resolved at WRITE time
and stored on the document, never looked up at read time from a roster that may have moved them.

### Owed him from fixes already shipped

Tests 1 and 2 PASSED 2026-09-08 (`d84bc4c` hand-off, `9a35e8e` POV). Still unverified by eye:
`cdaabc7`, `967e447`, `83f5041` — the Ecer/consignment sale rules. `adf9560` is a decision recorded
in checks, so there is nothing on screen to look at.

**Bug 4 is ANSWERED and closed — do not reopen.** No tier floor on a named approver: *"since the one
who can edit the fleet and roster is tier 3 and above then we dont need any floor for this, let the
company decide and make it most flexible"*. A rank test on the `named` branch of
`canApproveHandoffFrom` looks like a missing check and is a reversal — six assertions go red if one
is added, two of which predate the question. Reopens only if `defaultFleetAccess` stops cutting at
Tier 4, because that gate is what makes no-floor safe.

### HQ 3 and HQ TEST are Ecer consignments already written

`967e447` and `83f5041` stop new ones. Neither touches the Rp 1.000.000 against HQ 3 or the
Rp 1.055.000 against HQ TEST. His money, his call, and he was told it would not be touched without
him naming it. The HQ 3 hand-off request also still reads APPROVED with the shop never moved —
`cdaabc7` stops new ones lying, it does not repair that record. Do NOT register HQ 3 as a shop: an
earlier session said to, which was wrong by his own design — an Ecer sale is a person, not a store.

### Round 7 is unfinished, and C4 is untestable

Section B PASSED. Section D of `MANUAL_TEST_CHECKLIST.md` has never been run. C4 needs two different
Bandung people; BANDUNG has exactly one account, `kaldi0470@gmail.com`, used as both receiver and
named approver. Ask him to create the second account. The displacement rule is asserted in
`logicFixes.selfcheck.mjs` as of `adf9560`, so it is checked in code meanwhile. Also owed: F, the
Tier 1 half of the `994d3d6` vault-grace fix — unlock the vault, return inside five minutes, confirm
no PIN prompt.

### Housekeeping

* `returnTotal` is written at `useTransactionEngine.js:535`, `:612`, `:633` and read by no money
  calculation. Related to the job above; check whether it should be.
* `AgentProfileView.jsx:1333` uses the `-top-2 -right-2 animate-ping` geometry that shook the
  Hand-offs tab strip. Check whether its parent scrolls; if it does, `a8fea37`'s inset is the fix.
* The tutorial book: the close button at `PonderBook.jsx:1025` does nothing (prime suspect is the
  scrim at `:1103` swallowing the click — verify with `document.elementFromPoint`), plus an
  unlocated white vertical line. Two audit checks guard the Ponder scene splits — search
  `strandedBeats` in `integration.audit.mjs`, do not weaken them. Appearance, so it waits.

</details>
