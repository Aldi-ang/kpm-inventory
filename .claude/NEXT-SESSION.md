# The one job for next session

/alucard talk like caveman ultra to reduce token usage and increase token efficiency also use
ponytail ultra and use karpathy guidelines

## Read this before you write a single word to Aldi

Hard WORDS are the problem, not long sentences. Say "the screen went blank and froze", not "the
root unmounted". Say "the app forgets who you are", not "the credential is destroyed". Keep file
names, function names, numbers and error text exactly as they are — that is how he finds things.

---

Build the per-tier switch for the expected number in Stock Count, and rename the default tiers.
**He already decided both on 2026-08-19.** Nothing here needs his approval before you start; his
exact words are in `.claude/PROGRESS.md`. This is a build job, not a research job.

WHAT HE WANTS. While an agent counts stock, tiers 1, 2 and 3 see the number the system expects
next to what they typed. Tiers 4, 5 and 6 do not — they count blind, and the expected number only
appears after they have typed theirs, which the screen already does. His reason, verbatim:
*"encourage them to really count the number right"*.

WHERE THE PIECES ARE.

- The list of what each tier may do is `ROLE_PERMISSIONS` at `src/config/permissions.js:56`. Each
  tier is an array of plain strings such as `'view_eod'`. Tier 1 holds only `'ALL_ACCESS'` and is
  handled separately at `src/config/permissions.js:104`, so tier 1 needs no new entry.
- The check is `hasClearance(userRole, 'the_key')` at `src/config/permissions.js:90`.
- The expected number is drawn as `SYS: {item.expectedStock}` at `src/StockOpnameView.jsx:992`.
  **Confirm first whether that line is the live counting row or the review list shown afterwards**
  — the review list must keep showing it for everyone. Gate the live counting row only. Search
  `src/StockOpnameView.jsx` for the other `expectedStock` uses (`228`, `292`, `294`) — those are
  the saved snapshot and the maths, never the display, and must not be touched.
- The default tier names are `DYNAMIC_TIERS` at `src/config/permissions.js:12`.

THE RENAME, labels only:

| line | now | becomes |
|---|---|---|
| `permissions.js:13` | `T2: OWNER` | `T2: OWNER` (unchanged) |
| `permissions.js:14` | `T3: REGIONAL` | `T3: HQ SALES MANAGER` |
| `permissions.js:15` | `T4: CAPTAIN` | `T4: REGIONAL ADMIN` |
| `permissions.js:16` | `T5: OPERATIVE` | `T5: SALES CANVAS` |
| `permissions.js:17` | `T6: ROOKIE` | `T6: SALES MOTORIST` |

TRAP 1, the one that will make you claim a false success. Both of these lists get **overwritten
from Firebase** by `injectDynamicPermissions()` at `src/config/permissions.js:81`. If Aldi has ever
saved the permission screen, his saved copy replaces the defaults, so a key you add to
`ROLE_PERMISSIONS` will be **missing** on his real account and the number will stay hidden for
tier 2 and 3 no matter what your code says. Decide how a saved matrix picks up a brand-new key —
the honest options are (a) treat the key as ON when the tier's saved list predates it, or (b) tell
him he must open the permission screen once and press save. Say which one you chose and why.

TRAP 2. Do NOT touch the ids in `CORPORATE_TIERS` at `src/config/permissions.js:2`. Those strings
are stored on every user document in Firebase. Changing `FLEET_CAPTAIN` to anything would strip
those people of every permission they have. Labels change; ids never do.

TRAP 3. `DYNAMIC_TIERS` also carries a `color:` on each row, and three of them are off-palette
(`text-purple-400`, `text-blue-400`, `text-emerald-400`). The palette law is no blue, no green.
That is a separate job in the queue — mention it, do not fix it inside this one.

LEAVE A CHECK in `src/config/logicFixes.selfcheck.mjs`. Next free section is **S27** (S26 is the
offline tab catcher). Make it fail first. Pin: the new key is present for tier 2 and tier 3 and
absent for tier 4, 5 and 6; the counting row is wrapped in a `hasClearance(...)` call on that exact
key; the five labels read exactly as the table above; and the six `CORPORATE_TIERS` ids are
byte-for-byte unchanged.

Run: `npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs`

ALREADY SETTLED, do not work it out again:
- The offline black screen is fixed. `LazyTabBoundary` in `src/App.jsx` catches a tab that fails
  to download and shows a Try Again button. Pinned by S26.
- **The Sales Terminal keeps a draft** in `localStorage` (`kpm_sales_draft_v1`), because leaving
  the tab unmounts the screen. Typed fields only; measured ones (GPS, proximity, territory) are
  deliberately excluded and S29 guards each one by name. Adding a new typed field means adding it
  to the draft AND to S29's TYPED list.
- **Offline can only be tested from a real build.** `npm run preview -- --host`, entry `kpm-preview`
  in `.claude/launch.json`. `npm run dev` cannot do it at any setting: it has no built modules to
  cache. His phone also caches the app, so send him `/?fresh=1` or he sees the old copy and reports
  "no change" - that happened on 2026-08-20.
- **A finished sale must never wait for optional work.** `setReceiptData` and the button release
  run immediately after `committed = true` in `handleFinalDeal`; the IOU ledger and the tier
  auto-promoter run after. S30 pins that order by offset. Do not move anything back above it.
- **`useOfflineEngine()` shares ONE `isOnline` at module scope** (`useSyncExternalStore`). It is
  called from two places and used to keep two copies with two probes; they disagreed for 30s and
  froze a sale. Never reintroduce a per-instance copy.
- **`navigator.onLine` is a liar and it froze a sale.** It says a network exists, not that packets
  arrive. Use `canReachInternet()` from `useOfflineEngine.js`, or `isOnline`. Trusting a NO is fine;
  trusting a YES is the bug. Full story: `A-Brain/Wiki/Concepts/A Network Is Not The Internet.md`,
  pinned by S27.
- **A slice end must never be a raw `indexOf` result.** Files here are CRLF; `'
}
'` never matches,
  `indexOf` returns -1, and `slice(from, -1)` hands back the whole file. Twelve S26 checks passed
  that way for a day. Anchor on CRLF-safe text and pin the slice's length.
- Every EOD save goes through one `submit(...payloads)` gate (`4c12840`, check S25).
- `eodBountyLines()` and `tierPrice()` in `helpers.js` are the only places a shortfall becomes
  rupiah and a tier becomes a price.
- Checks are aimed at one element or one block, never at a word that appears all over the file.

When you finish, rewrite this file with the next single job.

---

<details>
<summary>The queue underneath — promote ONE next time, never paste this part</summary>

**Decided but unbuilt:** the whole app says TITIP, never consignment. Labels only — code names such
as `CONSIGNMENT_PAYMENT` stay. Subtitles were a maybe-later, not a job.

Six reported items from 2026-08-19, evidence with file and line numbers in
`.claude/SWEEP-2026-08-19.md`. One is now fixed. Ranked by what they cost him:

- The forced Google sign-in — cause UNKNOWN, first guess thrown out. DANGER: removing the `await`
  from the two `deleteDoc` lines at `src/App.jsx:2333-2334` lets the code reach `signOut(auth)` at
  `src/App.jsx:2336` and wipes his sign-in for good with no signal. Do not take that shortcut.
- Wrong agent name — confirmed, and it is a DATA problem not a display problem. The name is copied
  into each sale when the sale is saved; for tier 1 that is the Google account name. Old records
  keep the wrong name for good, so he must decide about repairing them before any code is written.
  He also asked for ONE EMAIL, ONE PROFILE — a bigger identity change, not a label fix.
- Reconcile and Clear — no tier check at `FleetCanvasManager.jsx:1056`, but `firestore.rules:479`
  already refuses the save for a plain tier 3 or 4, so it is a button that lies rather than lost
  data. His rule: tier 1 only, returns go through EOD, red sold rows stay until EOD is done.
- Unreadable colours — fixed colour codes (`bg-[#1a1a1a]`, `bg-black/40`, `bg-[#111]`) in
  `src/StockOpnameView.jsx` that never change with the theme. Also the three off-palette tier
  colours in `DYNAMIC_TIERS`, and `text-emerald-500` at `src/StockOpnameView.jsx:995`.
- IOU in the map customer panel — asked for, located, not built.
- ~~Black screen with no signal~~ — FIXED 2026-08-19, S26.

Older, still open: gold on gold on the admin side; the `bg-black/N` sweep; the `agentData` memo is
missing `inventory` so `itemsBks` uses fallback pack sizes; Lite Mode stops `transition-duration`
but not `transition-delay`; Force Reset is a 24px destructive button; `getCurrentDate()` uses UTC
in 26 places when his day starts at 07:00; the Sampling, Customers and Stock Opname redesigns.

THE LAST JOB — merge to main. "we might it later if we done with everything". Not yet.

</details>
