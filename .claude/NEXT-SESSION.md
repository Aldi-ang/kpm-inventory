# NEXT SESSION — copy one of these

Paste a block below into a fresh session **after `/clear`**. Each one is self-contained.

**Working directory (always this one):**

```
D:\APP DEVELOPMENT\kpm inventory main FILES\kpm-inventory-main
```

**The other two paths, for reference — never guess them:**

| What | Path |
|---|---|
| Vault (decisions, backlog, tests) | `D:\APP DEVELOPMENT\kpm inventory main FILES\A-Brain` |
| Alucard skill | `C:\Users\ASUS\.claude\skills\alucard\SKILL.md` |

---

## ▶ 1. THE NORMAL ONE — keep fixing

```
/alucard keep fixing the logic review list, plan A, money first
```

That's it. `PROGRESS.md` loads on its own and carries everything: what is fixed, what is next,
which traps to avoid, and the verify chain. Alucard now runs Karpathy + Caveman by default, so
neither needs asking for.

---

## ▶ 2. IF YOU WANT TO NAME THE JOB

```
/alucard fix the store hand-off matching by name (App.jsx:1628). read the file first, smallest
patch, leave a line in logicFixes.selfcheck.mjs, then verify.
```

Swap the target for any of these — they are the next ones in damage order:

| Target | What breaks |
|---|---|
| `App.jsx:1628` | hand-off matches by NAME → same-named shops in other cities handed over too |
| `AgentProfileView.jsx:530` | Consignment Risk built from the 7-day feed, clamped at zero |
| `useTransactionEngine.js:329` | substring customer match binds a sale to the wrong store |
| `useTransactionEngine.js:331` | tier suffix welded onto new customer names, breaks every join |
| `MerchantSalesView.jsx:1078` | tier promotion on hardcoded 10/200/800 packing |
| `MapMissionControl.jsx:1512` | `getDoc` never imported — rank engine never read your targets |
| `BranchWarehouseManager.jsx:158` | unsanitised slash in an area name strands stock |

---

## ▶ 3. IF YOU WANT THE RULES FIXED (needs care)

```
/alucard draft the firestore.rules fixes A6 and A7. emulator test them. DO NOT deploy —
show me the diff and what would break.
```

⚠️ Both can lock people out if wrong. A6 flips an unknown role from *allow* to *deny*; A7 could
block you creating new agents. **Emulator before writing, never after.**

---

## ▶ 4. IF YOU WANT THE SWAP FEATURE

```
/alucard build tukar barang — swap healthy goods for different healthy goods. behind its own
grant like the cash refund one. customer pays if the new goods cost more, nothing comes back
if they cost less.
```

That last sentence is your own locked rule, so the hard half is already decided.

---

## ▶ 5. WHEN YOU WANT TO TEST INSTEAD OF BUILD

Your test list, no order, no deadline:

```
D:\APP DEVELOPMENT\kpm inventory main FILES\A-Brain\Backlog\TESTS - check these when you feel like it.md
```

⚠️ Those tests need the **new build**. Testing the live app checks old code and every one will
"fail" for the wrong reason.

---

## The verify chain — I run this after every change, you can run it any time

```bash
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

Expect: **build clean · 599/0 · 59/0**. Any red = something regressed.

---

## Standing rules now baked into alucard (you don't need to repeat them)

- **Karpathy on by default** — read before editing, smallest patch, touch nothing extra, define
  "done" as a check that can be run.
- **Caveman on by default** — short replies, fragments... **except questions, which stay
  descriptive**, and every reply ends with what was just done.
- **A fix is not finished** until it leaves a regression guard + a behaviour check in
  `logicFixes.selfcheck.mjs`.
- **Never deploy `firestore.rules`.** Draft, show, you deploy.
- **Never rename the RETUR/RETURN writers** — four readers break. Widen the readers instead.
- **Sale is final** — no refund, no credit, no responsibility. Locked in the vault.
