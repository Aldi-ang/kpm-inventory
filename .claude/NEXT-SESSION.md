# The one job for next session

/alucard

**Build the tier POV switch. Every open question on it is answered — start coding.**

Asked for by Aldi 2026-08-23, in full:

> *"i want one extra admin tier 1 features where i can change the account tier in an instant to
> see their POV ui instead of login and logout each time waste a time TBH can u design this
> featue"*

and then, approving the design and adding to it:

> *"yes make all of it and make this option hidden on the sidebar because not all employee can
> open setting right on recent system, maybe add some cool animated button to change the tier
> control manually for my adikaryasukses99@gmail.com only because it is my tier 1 account, other
> account cant do this, and saving is needed for further testing actually, without disturbing
> other gmail account what if we can make like test account for each tier to test this out but
> these account only can be accessed from my tier 1 account more like fake agent account for test"*

## What he approved

1. **A POV switch.** Pick a tier, the whole UI redraws as that tier sees it. Snap back to owner.
2. **Hidden from the sidebar.** Not a nav item — *"not all employee can open setting right"*.
   It lives somewhere only he would find, and it renders for **`adikaryasukses99@gmail.com` only**,
   checked on the email, not on the tier.
3. **A cool animated button** for the switch. His words. The design stack in alucard §1a loads
   automatically; the palette law still applies and it must survive Lite Mode.
4. **A permanent, undismissable banner** while previewing — *MELIHAT SEBAGAI: SALES CANVAS ·
   KEMBALI KE OWNER*. Forgetting the costume is the whole risk.
5. **Never survives a reload.** Refresh returns him to owner.
6. **WRITES ARE ALLOWED** — he overruled the safer default: *"saving is needed for further
   testing actually"*. That decision is what makes the trap below the most important part.
7. **Fake test accounts, one per tier**, reachable only from his tier-1 account —
   *"more like fake agent account for test"*.

## ✅ THE LIVE-DATA QUESTION IS ANSWERED — DO NOT ASK IT AGAIN

He was told plainly that fake accounts with saving enabled write real sales, stock, audits and EOD
records into the live database, and that they would land in his revenue, his leaderboards and his
weekly counts. He answered:

> *"oh thats fine if its impacting the real stock and real counting for the data actually no worry
> about that, we dont need emulator"*

**That is his decision and it is final. Build against the live database.** He owns the business and
the books; the risk was named once, in full, and he accepted it. Re-raising it costs him a session
and reads as not listening. The emulator is **off the table** unless he brings it up himself.

He was also right about the half that this does fix, and it is worth keeping:

> *"this way the system wont be confused to write which name on the receipt and all of that right"*

Correct — a dedicated test identity per tier stops a test sale being attributed to a real agent on
a nota, in the audit log or on a leaderboard. Borrowing a real account would be worse.

**One cheap thing to do anyway, not a re-litigation and not a blocker:** stamp every document a
test account writes with `isTest: true`. It changes nothing today, costs one field, and means that
if he ever does want them gone they can be found in one query instead of by memory. If it gets in
the way, drop it.

**The honest limit still holds and is worth repeating once in the UI, not in a question:** the
switch changes what the SCREEN shows, never what the rules allow. Firestore evaluates his real
tier-1 account, so a POV preview can never prove the server would refuse a tier 5.

## Also outstanding, small

**The `9 of 5 sorted` finding, approved to fix** — sorting more damaged kinds than the damaged
total shows a full bar and no error until submit. Make the line refuse visibly the moment it goes
over. Ten minutes. `damageBlocked()` already computes the refusal; the line just does not read it.

## Verify

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```
Currently **599/599** and **632/632**. Lift every constant from source rather than retyping it, and
**break the shipped rule on purpose and watch the check go red before trusting it** — that probe
has caught two decorative checks and one incomplete fix this week.

**When you finish, rewrite this file with the next single job.**

<details>
<summary>The rest of the queue — do not paste this, it is here so the next session knows what to promote</summary>

📄 **The roadmap is `A-Brain/Wiki/Concepts/The Eight Warehouse Gaps.md`.** Remaining, in order:
**G6** damaged stock has no route home · **G3** suggested order quantity · **G5** accuracy and
shrinkage panel · **G1** batch identity through the chain · **G4** ids instead of names.
G7 (clock) and G2 (stock age) are done. G8 as originally written was deleted — no government angle
on excise bands.

⚠️ **STILL UNSEEN ON A REAL SCREEN:** the arrival check and the HQ branch-shelf panel (`ccdb5b8`).
Both need a branch with stock and a shipment in transit. **Chrome testing is proven and the recipe
is in PROGRESS.md** — he opens the Claude side panel and signs in there, then `navigate` reaches
the dev server. The in-app browser is useless: it refuses the self-signed certificate.

⛔ **Rejected, do not propose again:** counting sessions · barcode scanning · ABC cycle counting ·
bin/rack locations · demand forecasting · automatic reordering without a person · a freshness
threshold or any blocking on stock age (**two checks refuse this**) · anything framed as a supplier
or carrier claim — **there is no third party in this chain, the factory is his own**.

- **TIER 1 = ONE PROFILE, stages B and C** — B copies the van's `activeCanvas`, `allowedPayments`,
  `allowedTiers` onto `master_owner` after a backup; C deletes `ADMIN_VEHICLE`.
  **C before B shows his van as EMPTY.** Stage A is done (`447e3dd`).
- **Tier renames** — `DYNAMIC_TIERS` labels only: T3 `HQ SALES MANAGER`, T4 `REGIONAL ADMIN`,
  T5 `SALES CANVAS`, T6 `SALES MOTORIST`. Never touch the ids in `CORPORATE_TIERS`.
- **TITIP everywhere, never "consignment"** — labels only, code names stay.
- **Reconcile and Clear** — no tier check at `FleetCanvasManager.jsx:1056`; the rules already
  refuse the save, so it is a button that lies rather than lost data. Tier 1 only.
- **The forced Google sign-in** — cause unknown. ⚠️ DANGER: removing `await` from the two
  `deleteDoc` lines at `src/App.jsx:2333-2334` reaches `signOut(auth)` and destroys his sign-in.
- **A sale can be booked to the wrong store** · **Opening Journey Plan can reassign stores** ·
  **IOU in the map customer panel** · **wrong agent name on old sales** · Sampling and Customers
  redesigns.
- **Merge to main** — last of all. *"we might it later if we done with everything"*.

</details>
