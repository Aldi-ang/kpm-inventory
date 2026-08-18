# NEXT SESSION — copy the block below, paste it, go

---

The app's day rolls over at 07:00, not midnight. An agent who starts early watches his own morning
disappear off the route board.

WHERE: `getCurrentDate()` in `src/utils/helpers.js` stamps every transaction's `date` field, and it
is computed in UTC (`new Date().toISOString().split('T')[0]`). WIB is UTC+7, so that string only
changes at 07:00 local. Every screen that groups by `t.date` therefore treats "today" as 07:00 →
07:00. Read the files, do not trust line numbers.

WHAT HE SEES: a sale at 06:30 is filed under yesterday. The store shows as visited and the route
board counts it. At 07:00 the date flips and those early stores go back to looking unvisited, and
the "stores conquered today" number drops mid-morning. Nothing is lost, but the app looks like it
forgot what he already did.

**The money is safe and that is already checked — do not re-audit it.** The EOD screen compares
real timestamps against the local day, not this string, so early-morning cash lands in the right
EOD. Say that back to Aldi when this ships; it is the reassuring half.

THE FIX: `getLocalDayKey()` already exists in the same file and already does local-time day keys.
The route board and the visited-store logic should key on that.

THE TRAP, and it is the whole job: **every row already written carries a UTC-stamped `date`.**
Switching the stamp makes new rows disagree with old ones by up to seven hours, and any screen
comparing a new `date` against an old one silently mismatches for that window. Decide and say
which you are doing:
  (a) change only the READERS — the route board derives its day from the row's `timestamp` in
      local time and stops trusting the `date` string. Old and new rows both work, nothing written
      changes. Recommended.
  (b) change the WRITER too, and accept a seam in the data at the switchover date.
Whichever you pick, the behaviour check must run a 06:30 WIB sale and prove it counts as today,
plus one written before the change and one after, proving both land on the same day.

Second trap: `getCurrentDate` has many callers. Do not "fix" it in place — that changes the stamp
for everything at once, which is option (b) applied by accident. Grep its callers first and say how
many there are.

CONTEXT ALREADY ESTABLISHED, do not re-derive: `getLocalDayKey()` in `src/utils/helpers.js` is the
local-day helper and `dayStats.js` already uses local midnight deliberately (its comment explains
why). `storeKey` is the one name rule; `convertToBks` the one pack-size rule. Backlog source:
`A-Brain/Backlog/The app day rolls over at 7am instead of midnight.md`.

Verify chain, paste the numbers:
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs; node src/config/dayStats.selfcheck.mjs
Expected: build clean, 599/0, 240/0 plus whatever you add, 7/7.

When it is committed, rewrite this file (.claude/NEXT-SESSION.md) with the NEXT single job.

---

<details>
<summary>Queue behind it — for the next session to promote from, not to paste</summary>

- `What the agent counts at EOD is never used for anything.md`
- `TESTS - check these when you feel like it.md`
- `Three screens he asked to redesign - Sampling, Customers, Stock Opname.md` — design work, needs
  `Wiki/Concepts/Aldi's Design Taste.md` read first.
- Done 2026-08-18: pack-size maths · stock-count approval · Clear Canvas · offline sales (3 bugs) ·
  branch shipping · two debt numbers · silent failures.
- The price ladder `priceRetail / priceEcer / priceGrosir` is written five times in
  `MerchantSalesView.jsx`. None wrong today, no helper yet.
- **Tell him before he presses it:** the RPG Migration button re-banks XP; after `a3a9cf6` those
  numbers come out higher for shops whose history was split by spelling.
</details>
