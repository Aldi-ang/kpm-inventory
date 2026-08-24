# The one job for next session

/alucard

**Get his answer on tier 3, then look at the new Settings row on a real screen. Then G6.**

## 🔴 THE ANSWER HE OWES — ask this first, it is a security hole

His live **tier 3** can open **Settings**, which is the permission matrix itself. A tier 3 can
therefore grant themselves anything, including everything tier 1 has. On top of the built-in
tier-3 list his saved matrix also gives them:

> **Master Vault · Stock Opname · Customers · Sampling · Audit Logs · Settings**

Found 2026-08-24 with the POV switch, on its first run. **Do not change his matrix for him** —
it decides what his real staff can open, and a wrong guess locks someone out mid-shift. Ask which
of the six to untick, then he does it in Settings › Permissions (or he says "all six" and it is
one visit). **Settings is the one that cannot wait.**

## ✅ THEN TEST — the Settings row has never been seen

`7496258` added **Fleet & canvas authority** to the permission matrix: VIEW & EDIT / VIEW ONLY,
per tier, sitting directly under the Fleet toggle. It could not be checked on a screen because the
**Master Vault password** screen came up and Claude may not type it — that is a hard rule, not a
preference. He unlocks the vault, then:

1. Settings › Permissions → under **Fleet**, a row called **Fleet & canvas authority** with a
   dropdown on every tier. Tiers 1–3 read **View & edit**, tiers 4–6 read **View only**.
2. Check it on the **phone list** too, not only the wide table — they are two separate renders.
3. ⚠️ **TIER 4 IS CLAUDE'S CALL, NOT HIS.** A captain runs a squad but does not hire or fire it.
   One dropdown if he disagrees — say so rather than assuming he agreed.
4. Wear tier 6 with the POV switch → Fleet & Canvas: **no add button, no edit or delete pencils,
   no Load button, no Reconcile & Clear**. That is the hole he found, shut.
5. Press **Deploy matrix** once. Until he saves, every tier is running on the built-in default.

## Then: G6 — damaged stock has no route home

📄 `A-Brain/Wiki/Concepts/The Eight Warehouse Gaps.md`. Damaged units are counted, sorted by cause
and credited to `damagedStock` — then they sit there forever. No write-off, no return to the
factory, no liquidation. **Ask him which of those three he actually does** before designing
anything; the answer decides the whole shape.

After that, in order: **G3** suggested order quantity · **G5** accuracy and shrinkage panel ·
**G1** batch identity through the chain · **G4** ids instead of names.

## Verify

```
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```
Currently **599/599** and **711/711**. Lift every constant from source rather than retyping it, and
**break the shipped rule on purpose and watch the check go red before trusting it** — that probe
has now caught two decorative checks, one incomplete fix, and three checks of Claude's own that
were passing for the wrong reason.

**When you finish, rewrite this file with the next single job.**

<details>
<summary>The rest of the queue — do not paste this, it is here so the next session knows what to promote</summary>

✅ **The POV switch works and is proven on glass** (2026-08-24, all 8 steps). Chrome testing recipe:
he opens the Claude **side panel** and signs in there, then `navigate` to `https://localhost:5173/`.
The in-app browser refuses the self-signed certificate. **The vault password is his to type.**

⚠️ **STILL UNSEEN ON A REAL SCREEN:** the arrival check and the HQ branch-shelf panel (`ccdb5b8`).
Both need a branch with stock and a shipment in transit — the POV switch does not help, only data
does. Also the **branch stock-age line** and **blind counting**, which the POV switch now CAN reach
(wear tier 3 for the branch view, tier 5/6 for blind).

⛔ **Rejected, do not propose again:** counting sessions · barcode scanning · ABC cycle counting ·
bin/rack locations · demand forecasting · automatic reordering without a person · a freshness
threshold or any blocking on stock age (**two checks refuse this**) · anything framed as a supplier
or carrier claim — **there is no third party in this chain, the factory is his own** · the
Firebase emulator (**closed 2026-08-23, build against live**).

- **TIER 1 = ONE PROFILE, stages B and C** — B copies the van's `activeCanvas`, `allowedPayments`,
  `allowedTiers` onto `master_owner` after a backup; C deletes `ADMIN_VEHICLE`.
  **C before B shows his van as EMPTY.** Stage A is done (`447e3dd`).
- **Tier renames** — `DYNAMIC_TIERS` labels only. He has already renamed T3 → `HQ SALES MANAGER`
  and T4 → `REGIONAL ADMIN` in his live app; the POV picker and the test agents follow those names
  automatically now. Never touch the ids in `CORPORATE_TIERS`.
- **TITIP everywhere, never "consignment"** — labels only, code names stay.
- ~~Reconcile and Clear has no tier check~~ — **FIXED in `7496258`.**
- **The forced Google sign-in** — cause unknown. ⚠️ DANGER: removing `await` from the two
  `deleteDoc` lines in `src/App.jsx` (search `deleteDoc(uidRef)`) reaches `signOut(auth)` and
  destroys his sign-in.
- **A sale can be booked to the wrong store** · **Opening Journey Plan can reassign stores** ·
  **IOU in the map customer panel** · **wrong agent name on old sales** · Sampling and Customers
  redesigns.
- **His own older test list**, five items, none done: `A-Brain/Backlog/TESTS - check these when you
  feel like it.md` — IOU+Titip in one visit · buyback raises van stock · buyback shows as a loss ·
  agent ranks look sane · sector settings survive a reload.
- **Merge to main** — last of all. *"we might it later if we done with everything"*.

</details>
