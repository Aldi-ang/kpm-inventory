# The one job for next session

/alucard

**Watch Aldi test the tier POV switch on a real screen. It has never run. Then G6.**

Built 2026-08-23 (`51c1d78`), verified by 679 checks and a clean build and by **nothing else** —
Chrome was not connected when it was written. Two commits are waiting to be seen:

| commit | what to look at |
|---|---|
| `51c1d78` | the tier POV switch |
| `080fda8` | the damage line refusing on sight instead of at submit |

**The commit messages hold the whole story.** Do not re-derive it from the code.

## ✅ TEST LIST — read it to him one line at a time, in this order

**Getting there:** he opens the Claude **side panel** in Chrome and signs in there (installed and
enabled is NOT enough), then `navigate` to `https://localhost:5173/`. The in-app browser is
useless — it refuses the self-signed certificate. Sidebar rail: click **(34, 43)**.

1. **The door only he has.** At the foot of the rail his profile photo now has a thin gold ring.
   Press it → a panel opens saying **LIHAT SEBAGAI** with five tiers. *(If there is no ring, the
   email check failed — that is the first thing to debug, not the panel.)*
2. **Wear tier 5.** Pick SALES CANVAS. The app should land on Journey, the sidebar should shrink
   to a salesman's marks, and a gold bar should appear at the bottom: **MELIHAT SEBAGAI: …**
3. **The vault key stays behind.** While wearing tier 5, the music player should be gone and no
   admin-only panel should be reachable. This is the single most important line on this list.
4. **Hop without leaving.** Press the ringed face again, pick REGIONAL ADMIN. It should switch
   straight across — no logout, no reload.
5. **The fake staff exist.** Open Fleet & Canvas as owner. There should be `[TEST]` rows for
   exactly the tiers he tried, and none for the ones he did not. They are deletable like any agent.
6. **Refresh is the way out.** Reload the page. He must be himself again, with no bar.
7. **Nobody else sees it.** If a second account is handy, its photo must have no ring.
8. **The damage line.** Stock Opname → a row with damaged stock → sort MORE kinds than the
   damaged total. The line must go red and say **"4 SORTED MORE THAN THE TOTAL"** immediately —
   not `9 OF 5 SORTED`, and not silence until submit.

⚠️ **Writes are live and he approved that.** A test sale made while wearing a costume lands in
his real revenue, signed `[TEST] SALES CANVAS`. Say it once before he starts; do not re-ask.

## Then: G6 — damaged stock has no route home

📄 `A-Brain/Wiki/Concepts/The Eight Warehouse Gaps.md`. Damaged units are counted, sorted by
cause and credited to `damagedStock` — and then they sit there forever. There is no way to write
them off, send them back to the factory, or liquidate them. **Ask him which of those three he
actually does** before designing anything; the answer decides the whole shape.

Remaining after that, in order: **G3** suggested order quantity · **G5** accuracy and shrinkage
panel · **G1** batch identity through the chain · **G4** ids instead of names.

## Verify

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```
Currently **599/599** and **679/679**. Lift every constant from source rather than retyping it, and
**break the shipped rule on purpose and watch the check go red before trusting it** — that probe
has now caught two decorative checks, one incomplete fix, and two of this session's own checks
that were passing for the wrong reason.

**When you finish, rewrite this file with the next single job.**

<details>
<summary>The rest of the queue — do not paste this, it is here so the next session knows what to promote</summary>

⚠️ **ALSO STILL UNSEEN ON A REAL SCREEN:** the arrival check and the HQ branch-shelf panel
(`ccdb5b8`). Both need a branch with stock and a shipment in transit — the POV switch does not
help with that; only real data does.

⛔ **Rejected, do not propose again:** counting sessions · barcode scanning · ABC cycle counting ·
bin/rack locations · demand forecasting · automatic reordering without a person · a freshness
threshold or any blocking on stock age (**two checks refuse this**) · anything framed as a supplier
or carrier claim — **there is no third party in this chain, the factory is his own** · the
Firebase emulator (**closed 2026-08-23, he said build against live**).

- **TIER 1 = ONE PROFILE, stages B and C** — B copies the van's `activeCanvas`, `allowedPayments`,
  `allowedTiers` onto `master_owner` after a backup; C deletes `ADMIN_VEHICLE`.
  **C before B shows his van as EMPTY.** Stage A is done (`447e3dd`).
- **Tier renames** — `DYNAMIC_TIERS` labels only: T3 `HQ SALES MANAGER`, T4 `REGIONAL ADMIN`,
  T5 `SALES CANVAS`, T6 `SALES MOTORIST`. Never touch the ids in `CORPORATE_TIERS`.
  *(The POV picker already prints whatever he renames them to.)*
- **TITIP everywhere, never "consignment"** — labels only, code names stay.
- **Reconcile and Clear** — no tier check at `FleetCanvasManager.jsx:1056`; the rules already
  refuse the save, so it is a button that lies rather than lost data. Tier 1 only.
- **The forced Google sign-in** — cause unknown. ⚠️ DANGER: removing `await` from the two
  `deleteDoc` lines in `src/App.jsx` (search `deleteDoc(uidRef)`) reaches `signOut(auth)` and
  destroys his sign-in.
- **A sale can be booked to the wrong store** · **Opening Journey Plan can reassign stores** ·
  **IOU in the map customer panel** · **wrong agent name on old sales** · Sampling and Customers
  redesigns.
- **Merge to main** — last of all. *"we might it later if we done with everything"*.

</details>
