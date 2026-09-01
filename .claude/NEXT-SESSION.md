# NEXT SESSION — read this, then `.claude/PROGRESS.md`. Read no code to orient.

**Written 2026-09-01 14:06 WIB. 692/692 audit · 970/970 selfcheck. Branch `phase0-solid-ground`.**

## First command

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

PowerShell: `;` not `&&`. **Quote BOTH numbers.** The audit refuses to run against a stale `dist/`.

## Reaching the app from his phone — settled 2026-09-01, do not re-derive

The PC now holds **192.168.1.143** (cable) and **192.168.1.144** (Wi-Fi), reserved on the router by
MAC, and both are registered in Firebase authorized domains. **`npm run dev` serves https only**, so
the phone opens `https://192.168.1.144:5173` and taps through the self-signed certificate warning.
The old `.109` is dead. The dev server installs a service worker on purpose, so **a change needs two
reloads on the phone** before it appears.

**The ponder lab index is `/tools/ponder-lab.html`, not `/`.** Server root is a directory listing.

⚠️ **The browser pane opens at a ZERO viewport and every rect it returns is a lie** until
`resize_window` is called — measured: 44×92 became 825×46. Presence/absence of a conditional
element is still trustworthy at any size. And `innerText` on these desks comes back UPPERCASED by
the CSS, so a case-sensitive text probe returns a false negative.

---

## THE ONE JOB — the 15-second Access Denied on his phone

His report, 2026-09-01, signing in as Tier 1 on an iPhone in Safari: *"i was on access denied for
around 15 second then back to the normal login screen"*. The sidebar half of that report is already
fixed (`BiohazardTheme.jsx`, `shellHidden`). This half is not, and it was deliberately not guessed at.

**Read his answer in `PROGRESS.md` under WAITING ON ALDI before touching anything.** The question
asked was which screen appeared after the fifteen seconds, and it splits the job in two:

**If he says the Google sign-in screen** — the session was dropped. Something called `signOut(auth)`
or the Firebase auth token failed to persist. The three `signOut` calls in the auth handler are
`App.jsx:2373` (SUSPENDED), `:2417` (profile SUSPENDED) and `:2430` (the Ghost Killer, which fires
when `trueBossUid` exists but the live motorist doc does not). Any of those would also have shown a
`notify()` first — ask whether he saw a message. If none of them ran, suspect Safari dropping the
auth persistence, which is a different investigation entirely.

**If he says the "Open the vault" master-password screen** — the app DID recognise him as Tier 1,
just slowly, and Access Denied was a wrong screen shown while the check was still running. Then the
job is: the auth handler has no "still checking" state. `trueRole` starts at `'ADMIN'`
(`App.jsx:244`), `setUser(currentUser)` and `setUserRole('UNAUTHORIZED')` land together at
`App.jsx:2466` and `:2512`, and the lockout renders at `App.jsx:4248` the moment `user` exists and
the role is UNAUTHORIZED. A first pass that failed and a second that succeeded would produce exactly
his fifteen seconds.

⚠️ **THE TRAP THAT MAKES A LAZY PATCH WRONG.** The obvious fix — hold a spinner until the role
resolves — quietly changes two other things. `trueRole` defaults to `'ADMIN'`, so anything that
gates on "role not resolved yet" must not start treating tier 2 as unresolved on first paint. And
`UNAUTHORIZED` is the app's hard stop for an email that is genuinely not in the employee directory
(`App.jsx:4248`); a patch that delays or softens it must still show it, unchanged, once the lookups
have actually resolved to nothing. Do not turn a security gate into a timing race.

⚠️ **`getDocOfflineSafe` (`App.jsx:189`) never returns a fake "does not exist".** It throws
`offline-no-cache` when there is nothing cached, so a failed read lands in the catch at
`App.jsx:2478`, not in the not-found branch. Which means Access Denied was reached either by the
lookups genuinely resolving to nothing, or by a non-offline error such as `permission-denied`.
Rule that out before building anything: it is a Firestore rules question, and **rules are a draft
he deploys himself**.

<details>
<summary>Queued — do not start these</summary>

- **G1 + G2, the money item.** `batchNo` captured at intake — `RestockVaultView.jsx:1944`, required
  by the completeness meter at `:455`, written at `:656` — dies at the HQ door, because
  `branches/{loc}/inventory/{productId}` holds one `stock` number. 🔴 **Ask him the staleness
  threshold in days before any code; do not invent one.** Do not promise a shape before reading it.
- 🔴 **The label print-and-scan test is still not done** — he said so himself, 2026-09-01. And it
  cannot be done on the iPhone: `BarcodeDetector` is Chrome-on-Android only, and iOS forces every
  browser onto WebKit. The typed shipment number is the iPhone path. Camera scanning on iPhone would
  need a decoder library (~200KB) — costed only if he asks.
- **An arrived box that is never counted has no alert.** Sharper now the gate has shipped; a scan is
  what starts that clock. Needs a threshold in days too.
- **The two colour faults, still app-wide.** **90 uncoloured `placeholder=` in 18 files** (browser
  default `rgb(156,163,175)`, 1,36:1 on the light well) and **~107 bare `text-orange` used as ink in
  15** (1,08:1). Fixed once in `BranchWarehouseManager.jsx`: `placeholder:text-ink-dim
  placeholder:opacity-100 placeholder:italic`, `text-orange` → `text-accent-ink`. **`border-orange`
  and `bg-orange` stay — those are edges.** ⚠️ A blind regex is wrong: `text-orange` on a scrim is
  correct.
- **Ponder caption static on phones, moving on PC.** DECIDED 2026-08-31, not built. Today
  `PonderOverlay.jsx` HIDES it: `if (boxW > W * 0.7) return null;`. The job is a third state.
- **The request card's status badge and button stack oddly at 375px** — pre-existing, `ml-auto`.
- **Landed cost spreads shipping/labour/excise equally per UNIT** — unconfirmed decision, not a bug.
- **G5** shrinkage · **G4** records joined by name not id · **Siapkan Pengiriman and the shipping
  modal, still untested by anyone.**
- **9router dies at login.** `start /min` throws the error away. Fix drafted, **not applied**.
- **The quota meter is FIXED, do not re-investigate.** Id `76c7cf4f-4c24-4984-aada-3aa91f53a148` in
  `C:/Users/ASUS/.claude/9router-claude-id.txt` — note the `.claude/`.

</details>

**Before you finish: rewrite this file with the next single job.**
