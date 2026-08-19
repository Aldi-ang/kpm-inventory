# The one job for next session

STOP. Do NOT paste a build job yet. Two questions are open and both were "answered" by an
automated event, not by Aldi. Read the WAITING ON ALDI section in `.claude/PROGRESS.md` first,
ask him Q1 and Q2 in plain text, and wait for him to type an answer. Item 6 depends on Q1.

Once he has answered, run the job below.

---

/anthropic-skills:caveman ultra, /ponytail:ponytail ultra

The Sales Terminal goes to a dead black screen with no signal, and the whole app dies with it.
Aldi found it on his phone in airplane mode: "its all black screen cant move cant do anything".

READ FIRST: `.claude/SWEEP-2026-08-19.md`, the `locate:offline-terminal` section and the
refutation that follows it. Every claim below is cited there with file:line. Do not re-derive it.

WHAT IS BROKEN: `MerchantSalesView` is code-split — `const MerchantSalesView = lazy(() =>
import('./MerchantSalesView'))` at `src/App.jsx:41` — and renders inside the one app-wide
`<Suspense>` that opens at `src/App.jsx:4008` and closes at `src/App.jsx:4530`. Suspense absorbs
a *suspension*. It does not catch a *rejection*. Offline the dynamic import cannot fetch the
chunk, the promise rejects, and the rejection escapes render. There is no error boundary anywhere
in `src/` — grep for `ErrorBoundary`, `componentDidCatch`, `getDerivedStateFromError` returns zero
hits, and `src/main.jsx:57` renders `<App/>` bare. React answers an uncaught render error by
unmounting the entire root, so `#root` empties and the page is a dead dark body until reload.

THE FIX: one error boundary wrapping the `<Suspense>` at `src/App.jsx:4008`. It must render
something a person can act on — the screen name, "this screen could not load offline", and a
retry that re-mounts the child. A boundary rendering a blank div is the same bug in a new colour.

THE TRAP: an error boundary MUST be a class component. `getDerivedStateFromError` and
`componentDidCatch` have no hook equivalent and `useErrorBoundary` does not exist in React. Do
not write it with hooks and do not add a dependency — it is about 20 lines of class.

SECOND TRAP: this does NOT explain the forced Google re-login he also reported, and that
diagnosis was REFUTED. DANGER: dropping the `await` on `deleteDoc` at `src/App.jsx:2333-2334`
lets control reach `signOut(auth)` at `src/App.jsx:2336`, which offline destroys the credential
and makes the reported re-login PERMANENT. The offline catch already calls `setUser(currentUser)`
at `src/App.jsx:2387` and `src/App.jsx:2411`, so `user` is not left null. Do not touch the auth
handler in this job. That cause is still unknown and gets its own investigation.

THIRD TRAP: he tests on the LAN dev server (`https://192.168.1.141:5173`, see the comment at
`vite.config.js:7`). `npm run dev` registers NO service worker — `vite.config.js:21` has no
`devOptions` block — so in dev nothing is precached and the chunk fetch always fails offline. A
production build DOES precache `MerchantSalesView` and serves `index.html` via a NavigationRoute.
The boundary is still the real fix, but tell him plainly that offline behaviour can only be judged
from a production build, and that `devOptions: { enabled: true }` is what would make his phone
test meaningful. Do not silently change how he tests — say it and let him choose.

LEAVE A CHECK: `src/config/logicFixes.selfcheck.mjs`, next section is S26 (S25 is the EOD
submitting gate). Prove it red first — a guard that an error boundary class exists and that the
lazy `<Suspense>` is wrapped by it, and a behaviour check that `getDerivedStateFromError` returns
a state that renders a retry affordance rather than null.

Run: `npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs`

CONTEXT ALREADY ESTABLISHED, do not re-derive:
- Every EOD write on `EODReconciliationView` goes through one `submit(...payloads)` gate holding a
  `submitting` flag (`4c12840`, check S25).
- `eodBountyLines()` and `tierPrice()` in `helpers.js` are the ONLY places a shortfall becomes
  rupiah and a tier becomes a price.
- Penalty pricing is a COMPANY SETTING (`appSettings.penaltyPriceTier`) — `bf75678`.
- Guards are scoped to the ELEMENT or the BLOCK, never a string that appears file-wide.

When you finish, rewrite this file with the next single job.

---

<details>
<summary>The queue underneath — promote ONE next time, never paste this part</summary>

All six of his 2026-08-19 items are investigated and NONE are fixed. Full evidence with file:line
in `.claude/SWEEP-2026-08-19.md`. Ranked by harm:

1. Offline black screen — the job above.
2. The forced Google re-login — cause UNKNOWN, first diagnosis refuted, obvious fix is a landmine.
3. Wrong agent name — CONFIRMED and it is a DATA problem, not a display problem. Every site prints
   the `agentName` baked into the transaction at write time; for tier 1 that is the Google
   `displayName`. Historical documents carry the wrong name permanently, so a backfill decision is
   needed before code. He also asked for ONE EMAIL ONE PROFILE — an identity-model change.
4. Reconcile and Clear — no tier gate at `FleetCanvasManager.jsx:1056`, but `firestore.rules:479`
   already blocks a plain Tier 3/4 write, so it is UI-says-yes / server-says-no rather than data
   destruction. His policy call is already clear: tier 1 only, returns go through EOD, red sold
   rows persist until EOD is done.
5. Contrast — hardcoded non-token plates (`bg-[#1a1a1a]`, `bg-black/40`, `bg-[#111]`) in
   `src/StockOpnameView.jsx` that never flip with the theme.
6. Titip wording and IOU in the map customer panel — blocked on Q2.
7. Stock Opname redesign — blocked on Q1, and the premise needs correcting first: the panel
   ALREADY hides the expected number until the counter types one.

Older, still open: gold-ink-on-gold-plate on the admin side; the `bg-black/N` sweep; `agentData`
useMemo missing `inventory` in its deps so `itemsBks` ships fallback pack multipliers; Lite Mode
kills `transition-duration` but not `transition-delay`; Force Reset is a 24px destructive target;
`getCurrentDate()` is UTC across 26 call sites when the day rolls at 07:00; the Sampling,
Customers and Stock Opname redesigns.

THE LAST JOB — merge to main. "we might it later if we done with everything". Not yet.

</details>
