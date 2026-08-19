# The one job for next session

## Read this before you write a single word to Aldi

He asked for one change in how you talk, 2026-08-19: "too many hard to understand words, too many
unfamiliar terms". Short sentences were not the problem. Hard WORDS were. Cut the vocabulary, not
just the length.

Say "the screen went blank and froze", not "the root unmounted". Say "the app forgets who you
are", not "the credential is destroyed". Say "I argued against my own answer to check it", not
"adversarial pass". Say "a fix that would make it worse", not "landmine". Keep file names,
function names, numbers and error text exactly as they are — that is how he finds things.

---

/anthropic-skills:caveman ultra, /ponytail:ponytail ultra

The Sales Terminal goes black and freezes when there is no signal, and the whole app dies with it.
Aldi found it on his phone with airplane mode on: "its all black screen cant move cant do
anything".

READ FIRST: `.claude/SWEEP-2026-08-19.md`, the `locate:offline-terminal` part and the check that
follows it. Every fact below is in there with the file and line number. Do not work it out again.

WHAT IS BROKEN. `MerchantSalesView` is loaded on demand, not at startup — `const MerchantSalesView
= lazy(() => import('./MerchantSalesView'))` at `src/App.jsx:41`. It is drawn inside the one
`<Suspense>` block that opens at `src/App.jsx:4008` and closes at `src/App.jsx:4530`. `<Suspense>`
handles a screen that is still LOADING. It does not handle a screen that FAILED to load. With no
signal the file cannot be fetched, the load fails, and the failure escapes. Nothing in the whole
`src/` folder catches it — searching for `ErrorBoundary`, `componentDidCatch` and
`getDerivedStateFromError` finds nothing, and `src/main.jsx:57` draws `<App/>` with nothing around
it. When React meets a failure nobody catches, it throws away the entire page. That is the black
screen.

THE FIX. Add one catcher around the `<Suspense>` at `src/App.jsx:4008`. When it catches, it must
show something he can act on: which screen failed, a plain line such as "this screen could not
load without signal", and a button to try again. A catcher that shows an empty box is the same bug
in a new colour.

TRAP 1. In React this catcher can only be written as a `class`. `getDerivedStateFromError` and
`componentDidCatch` do not exist as hooks, and `useErrorBoundary` is not a real thing. Do not try
to write it with hooks and do not install anything — it is about 20 lines.

TRAP 2. This does NOT explain the other half of his report, where the app makes him sign in with
Google again. That cause is still unknown, and the first guess at it was checked and thrown out.
DANGER: removing the `await` from the two `deleteDoc` lines at `src/App.jsx:2333-2334` lets the
code run on to `signOut(auth)` at `src/App.jsx:2336`. With no signal that wipes his sign-in for
good, turning an occasional annoyance into a permanent one. The offline path already calls
`setUser(currentUser)` at `src/App.jsx:2387` and `src/App.jsx:2411`. Do not touch the sign-in code
in this job.

TRAP 3. He tests on the development server over his home wifi (`https://192.168.1.141:5173`, see
the note at `vite.config.js:7`). `npm run dev` does not install the offline helper — there is no
`devOptions` block at `vite.config.js:21` — so in that mode nothing is stored for offline use and
the fetch always fails. A real build DOES store `MerchantSalesView` and serve the page offline.
The catcher is still the right fix, but tell him plainly that offline behaviour can only be judged
from a real build, and that adding `devOptions: { enabled: true }` is what would make his phone
test mean something. Do not change how he tests without saying so.

LEAVE A CHECK in `src/config/logicFixes.selfcheck.mjs`. The next free section is S26 (S25 is the
EOD submit gate). Make it fail first — one check that the catcher class exists and wraps the
`<Suspense>`, and one that `getDerivedStateFromError` returns a state which draws a try-again
button rather than nothing.

Run: `npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs`

ALREADY SETTLED, do not work it out again:
- Every EOD save on `EODReconciliationView` goes through one `submit(...payloads)` gate that holds
  a `submitting` flag (`4c12840`, check S25).
- `eodBountyLines()` and `tierPrice()` in `helpers.js` are the only places a shortfall turns into
  rupiah and a tier turns into a price.
- What a penalty is priced at is a company setting (`appSettings.penaltyPriceTier`) — `bf75678`.
- Checks are aimed at one element or one block, never at a word that appears all over the file.

When you finish, rewrite this file with the next single job.

---

<details>
<summary>The queue underneath — promote ONE next time, never paste this part</summary>

HE DECIDED TWO THINGS ON 2026-08-19. His exact words are in `.claude/PROGRESS.md`. Neither is
built yet.

1. Stock count, expected number = a per-tier switch in the permission matrix. ON by default for
   tier 1, 2, 3 (number shown side by side while counting). OFF by default for tier 4, 5, 6
   (blind — the number only appears after they type one, which the panel already does). His
   reason: "encourage them to really count the number right". Same job: change the default tier
   NAMES to T2 OWNER, T3 HQ SALES MANAGER, T4 REGIONAL ADMIN, T5 SALES CANVAS, T6 SALES MOTORIST.
2. The whole app says TITIP, never consignment. Labels only — code names such as
   `CONSIGNMENT_PAYMENT` stay. Subtitles were a maybe-later, not a job.

All six of his reported items are investigated, none fixed. Evidence with file and line numbers in
`.claude/SWEEP-2026-08-19.md`. Ranked by how much they cost him:

- The forced Google sign-in — cause UNKNOWN, first guess thrown out, obvious fix is dangerous.
- Wrong agent name — confirmed, and it is a DATA problem not a display problem. The name is copied
  into each sale when the sale is saved; for tier 1 that is the Google account name. Old records
  keep the wrong name for good, so he must decide about repairing them before any code is written.
  He also asked for ONE EMAIL, ONE PROFILE — a bigger identity change, not a label fix.
- Reconcile and Clear — no tier check at `FleetCanvasManager.jsx:1056`, but `firestore.rules:479`
  already refuses the save for a plain tier 3 or 4, so it is a button that lies rather than lost
  data. His rule is already clear: tier 1 only, returns go through EOD, red sold rows stay until
  EOD is done.
- Unreadable colours — fixed colour codes (`bg-[#1a1a1a]`, `bg-black/40`, `bg-[#111]`) in
  `src/StockOpnameView.jsx` that never change with the theme.
- IOU in the map customer panel — asked for, located, not built.

Older, still open: gold on gold on the admin side; the `bg-black/N` sweep; the `agentData` memo is
missing `inventory` so `itemsBks` uses fallback pack sizes; Lite Mode stops `transition-duration`
but not `transition-delay`; Force Reset is a 24px destructive button; `getCurrentDate()` uses UTC
in 26 places when his day starts at 07:00; the Sampling, Customers and Stock Opname redesigns.

THE LAST JOB — merge to main. "we might it later if we done with everything". Not yet.

</details>
