# The one job for next session

/alucard talk like caveman ultra to reduce token usage and increase token efficiency also use
ponytail ultra and use karpathy guidelines

## Read this before you write a single word to Aldi

Hard WORDS are the problem, not long sentences. Say "the screen went blank and froze", not "the
root unmounted". Keep file names, function names, numbers and error text exactly as they are.

🔒 **NO WORKFLOWS, NO SUBAGENTS.** Settled 2026-08-20: *"dont use workflow"* … *"okay then no
workflow"*. Do not use one, do not propose one, do not ask. See Alucard §9a.

🔴 **DIAGNOSE FIRST, THEN CHANGE.** His instruction, 2026-08-20: *"i want u to check whats wrong
first then make the changes"* … *"its part of your learning as well"*. On any screen he names:
report the findings ranked with file and line, and write NO code — **not even a check** — until he
picks the order.

⚠️ **HIS SCREENSHOTS CAN BE FROM AN OLD BUILD.** It happened twice on 2026-08-20 — two things
were already fixed. The Flight Recorder header prints the build id (git short hash). **Ask for it
before believing a screenshot.** Current build: `c6ad61a`.

---

# THE JOB: finish Stock Opname

He said it plainly: *"stock opname is the most important lets fix that"*. Colours and the per-tier
rule are DONE. **Four findings remain, and he has never ranked them — ask him first.**

## The four, in the order I would do them

**1 · THE ROW LIES WHEN THERE IS DAMAGED STOCK.** Wrong maths people act on, and tier 3+ now see
it earlier in the count, so more eyes land on it.

- `SYS EXPECTED` prints **healthy stock only** — `src/StockOpnameView.jsx:1094` (live counting
  row) and `:992` (review list, reading `item.expectedStock`).
- `TOTAL FOUND` is `good + damaged`, and `getVariance()` (`:188`) compares against
  `item.stock + item.damagedStock`.
- So 100 healthy + 5 damaged, counted correctly, prints **`SYS 100 → FND 105 → VAR 0`**. The
  variance is right; the EXPECTED figure is the one leaving damage out.
- The saved record has the same split — `:227-233` stores `expectedStock` and
  `expectedDamagedStock` separately but a single `totalFound`.
- **Decide with him:** show expected as `healthy + damaged` (one number, matching the variance), or
  show both side by side. Do not guess — it changes what an agent signs off on.

**2 · THE EXPECTED NUMBER MOVES WHILE HE COUNTS.** The counting row reads `item.stock` live, but
the snapshot that is saved is taken at SUBMIT (`:227`). A sale mid-count moves the target. Consider
snapshotting when the count STARTS.

**3 · OLD AUDITS OVERWRITE INSTEAD OF ADJUSTING.** `:292-299`. Records with a snapshot correctly
`increment(counted - expected)`; ones without do an absolute `set`, wiping any concurrent change.
Legacy only, low risk, but real.

**4 · THE SYSTEM REDESIGN — his real ask, not started.** *"i want system like tokopedia and
indomaret level"* … *"we need better system for the stock opname to reach that level"*. My proposal,
unranked by him:
- Count in **sessions** — pick a shelf or category, count it, close it. Today it is every product
  at once with no save point.
- **Progress you can see** — "18 of 47 counted", and resume tomorrow without losing typed work.
- **Scan, not scroll** — the search box exists; a barcode scan jumping to the row is the difference.
- **Fix the maths first** (finding 1). No polish matters while the numbers lie.
- **Sign-off with a reason** — a difference needs a cause picked from a list, not just a number.

Run after every change:
`npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs`

---

## DESIGN LAWS SET ON 2026-08-20 — do not re-litigate, do not undo

- **Amber draws lines, it does not fill boxes.** His words: *"stop fill the background with amber
  color, better use it in all situation or most situation for the line only to looks more
  expensive"*, and *"dont use put amber and black, too dominant … dark is 90% 5% light and other
  color can be variative"*. A chip, pill, badge or disc is **dark surface + 1px coloured edge +
  coloured ink**. Gold fills ONLY a selected tab, a primary button, or a bar whose LENGTH is the
  data. **S37 pins this as a number: at most 18 gold fills in `StockOpnameView.jsx`. Lower it,
  never raise it.**
- **Ink on a PLATE is not ink on a PANEL.** `--accent-ink` is *gold-as-text* and in dark mode it is
  the SAME hex as `--gold` (#D08A2E) — gold on gold measured **1.00**, the identical colour. On any
  filled plate use **`--gold-ink`** or **`--duke-on-fill`**. This bug appeared four separate times.
- **The third accent is violet**: `--alt-ink` / `--alt-edge`, both themes, ink and edges only.
  Blue and green are banned by the palette law; warm is taken by gold and red. Measured 9.10:1
  dark, 5.67:1 light.
- **In light mode `--sunk` (#B9B0A0) is DARKER than the panel.** A control on it reads as a hole.
  Buttons belong on `--raised` (#EDE7D8 light / #1B1917 dark).
- **No `filter`, ever.** The audit rule *"nothing depends on a shadow, a blur or a filter"* exists
  because Lite Mode deletes all four and a screen once collapsed into one column. An exemption was
  available for the neon rim and was NOT taken.
- **Tints use `color-mix(in_srgb,var(--x)_12%,transparent)`, never `/N`.** Tailwind cannot parse
  `var()` through the opacity modifier — 35 classes in this app once painted nothing.
- **Motion:** `.kpm-rim-neon` (one 1px red arc, 5s, on the penalty button only) and `.kpm-hazard`
  (breathes 3.6s, opacity floor 0.72, never blinks). **Both are removed outright in Lite Mode and
  under reduced-motion** — never frozen, a stopped animation reads as a bug.

---

## THE OTHER OPEN JOBS

**TIER 1 = ONE PROFILE — stages B and C.** He chose MERGE over hide. He is three documents in
`motorists`: `master_owner` (the person), `ADMIN_VEHICLE` (his van, auto-created at
`useDatabaseSync.js:126`) and `VAULT` (his warehouse). **Stage A is done** (`447e3dd`, S33): the
roster folds them and carries the van's load onto his one entry. Nothing is written or deleted yet.
- **B:** copy the van's `activeCanvas`, `allowedPayments`, `allowedTiers` onto `master_owner`,
  after a backup.
- **C:** only once he confirms B — flip the writes and delete `ADMIN_VEHICLE`.
- **C before B shows his van as EMPTY.** 60 sites across 10 files read these ids. The order is not
  optional. `TIER_ONE_ID`, `TIER_ONE_ALIAS_IDS` and `resolveTierOneId` are in `permissions.js`.

**TITIP everywhere, never "consignment"** — labels only; code names like `CONSIGNMENT_PAYMENT` stay.

**Tier renames he decided 2026-08-19, still unbuilt** — `DYNAMIC_TIERS` in `permissions.js`:
T3 → `HQ SALES MANAGER`, T4 → `REGIONAL ADMIN`, T5 → `SALES CANVAS`, T6 → `SALES MOTORIST`.
**Labels only — never touch the ids in `CORPORATE_TIERS`, they are on every user document.**

**The forced Google sign-in** — cause UNKNOWN. ⚠️ DANGER: removing the `await` from the two
`deleteDoc` lines at `src/App.jsx:2333-2334` lets execution reach `signOut(auth)` at `:2336` and
destroys his sign-in permanently with no signal.

**Wrong agent name** — a DATA problem. The name is copied into each sale at save time; old records
keep the wrong one for good. He must decide about repairing them first. He also asked for ONE
EMAIL, ONE PROFILE, which is the tier-1 merge above.

**Reconcile and Clear** — no tier check at `FleetCanvasManager.jsx:1056`; `firestore.rules:479`
already refuses the save, so it is a button that lies rather than lost data. His rule: tier 1 only.

**IOU in the map customer panel** — asked for, located, not built.

Older: gold on gold on the admin side · the `bg-black/N` sweep on OTHER screens · the `agentData`
memo missing `inventory` so `itemsBks` uses fallback pack sizes · Lite Mode stops
`transition-duration` but not `transition-delay` · Force Reset is a 24px destructive button ·
`getCurrentDate()` is UTC in 26 places · the Sampling and Customers redesigns.

**LAST OF ALL — merge to main.** *"we might it later if we done with everything"*. Not yet.

---

## SETTLED TODAY — do not work these out again

- **Never `await` a Firestore WRITE in an offline branch.** MEASURED with `disableNetwork()`:
  `setDoc`/`updateDoc` stay pending forever, `getDoc` resolves from cache. This froze every offline
  sale by an agent with a vehicle for three rounds (`useTransactionEngine.js:192`). S32 slices the
  offline branch and fails on ANY awaited write, at any line.
- **A finished sale never waits for optional work.** `setReceiptData` + the button release run
  immediately after `committed = true` in `handleFinalDeal`; the IOU ledger and auto-promoter run
  after. S30 pins the order by offset.
- **`useOfflineEngine()` shares ONE `isOnline`** at module scope via `useSyncExternalStore`. Two
  copies with two probes disagreed for 30s and froze a sale. Never reintroduce a per-instance copy.
- **`navigator.onLine` lies** — it says a network exists, not that packets arrive. Use
  `canReachInternet()` or `isOnline`. Trusting a NO is fine; trusting a YES is the bug.
- **The Sales Terminal keeps a draft** in `localStorage` (`kpm_sales_draft_v1`) — typed fields only,
  never measured ones (GPS, proximity, territory). Adding a typed field means adding it to the
  draft AND to S29's TYPED list. **He confirmed this working.**
- **The lazy-tab catcher** `LazyTabBoundary` (S26) — a failed tab download shows a retry, not a
  black screen. Its retry probes the real internet before reloading.
- **A slice end must never be a raw `indexOf` result.** Files here are CRLF; a missed anchor
  returns -1 and `slice(from, -1)` hands back the whole file. Twelve S26 checks passed that way for
  a day.
- **There are TWO css files in `dist/assets/`.** `head -1` picked the wrong one and reported six
  working classes as missing. Check both.
- **Offline can only be tested from a real build** — `npm run preview -- --host`, entry
  `kpm-preview` in `.claude/launch.json`. Send him `/?fresh=1` or his phone serves the old copy.
- **His LAN address moves.** Read the `Network:` line vite prints, never a written-down number.

When you finish, rewrite this file with the next single job.
