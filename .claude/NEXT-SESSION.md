# Next session — one job

Copy the block below. It is the only thing on this page you should paste.

---

Job: the notification bell was fixed WITHOUT ever being looked at. Prove it renders, or fix it for
real. This is the only unverified thing in the repo right now.

WHAT SHIPPED, unproven — `4bb9ad7`, `src/components/NotificationBell.jsx`:

  The badge counts correctly and always did; the panel never appeared. Diagnosis was that the panel
  was an absolutely-positioned child of the header, and the header sits inside
  `src/components/BiohazardTheme.jsx:941` — `relative z-10 flex-1 flex flex-col overflow-hidden`.
  `overflow-hidden` crops any child reaching past that box, and `relative z-10` caps how high any
  descendant can be lifted, so the panel's own `z-[9999]` could never win.

  The fix renders the panel through `createPortal` into `document.body`, `position: 'fixed'`, using
  the bell button's `getBoundingClientRect()` read at open time. `panelRef` was added to the
  outside-click handler because the panel is no longer inside `dropdownRef`, and without it the
  first click inside the panel closes it on `mousedown` before the row's `onClick` can run.

FIRST STEP, before touching any code:

  Render it. `preview_start`, log in, press the bell. A self-check can only pin structure — that the
  portal is used, that the positioning is fixed, that the old absolute classes are gone. Structure
  is not appearance. There are 11 assertions on this in `logicFixes.selfcheck.mjs` under "THE FIRST
  LIVE HAND-OFF" and every one of them passes on a panel that renders three metres off-screen.

  If it opens correctly: this job is DONE, say so, and promote the damaged-goods job from the queue
  below. Do not go looking for a second bug in a working bell.

IF IT STILL DOES NOT APPEAR, the second cause is already narrowed:

  In DevTools → Elements, search `Inbox Alerts`.
    - PRESENT in the DOM  -> it renders and something still hides it. With a body portal the
      remaining suspects are a transform/filter on `<body>` or a wrapper, or another fixed overlay
      painting above it. Check computed `z-index` and the element at those coordinates
      (`document.elementFromPoint`), do not guess.
    - ABSENT from the DOM -> `isOpen` never flips, so it was never a CSS problem and the portal was
      the wrong fix. Look at the click path, and be honest in the commit that the first diagnosis
      was wrong rather than stacking a second fix on top of it.

TRAPS:

  - Do NOT revert the portal just because the panel is still invisible. It removed a real clip
    (`BiohazardTheme.jsx:941`); putting it back re-adds a second bug behind the first.
  - The bell is shared. It carries stock requests, EOD, approvals and transfers, not just the
    hand-off. Never judge it fixed by one feature's flow — Aldi's own correction, 2026-09-05.
  - More than 3 files touched means stop and name each one before continuing.

Leave the fix in `src/config/logicFixes.selfcheck.mjs` the way `4bb9ad7` did: slice each assertion
to its own anchors, assert the anchors were FOUND before slicing, and trial it RED before green —
stashing ONLY the source files, never the check file itself, or the trial cannot fail and proves
nothing.

Then rewrite `.claude/NEXT-SESSION.md` with the next single job.

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### C — damaged goods handed back are still billed

`returnTotal` is written at `useTransactionEngine.js:492`, `:569`, `:590` and read by no money
calculation. `ConsignmentFinanceView.jsx` subtracts `amountPaid` alone while the loop below it DOES
remove the returned packs from the shelf. The goods leave and the bill stays. Trap: a standalone
`RETURN` transaction is already saved with a negative total and subtracts itself; only the return
inside a `CONSIGNMENT_PAYMENT` is broken, so a blind fix double-counts. The Backlog says merge the
two duplicate debt calculators first — untrialled, count the call sites before believing it.

**Now more urgent than when it was written:** `4bb9ad7` gave field agents the Store Audit button, so
agents — not just admins — can now trigger this path.

### A — Journey Plan reassigns stores by itself

`JourneyView.jsx:561-583`. Any store whose agent is no longer on staff is fuzzy-matched to whoever's
name partly contains it ("Andika" matches "Andi"), written with `updateDoc(...).catch(() => {})`, no
message. Same family as the hand-off bug — code deciding on its own who owns a store. Read
`A-Brain/Wiki/Concepts/Ownership Moves, History Does Not.md` first.

### Aldi's own list

`A-Brain/Backlog/Deploy the store hand-off write rule.md` — the view-only refusal exists in the
handler; Firestore still allows it. His deploy, not yours.

### 7 Days to Die track — separate repo

`C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md` and `NEXT-JOB.md`.

</details>
