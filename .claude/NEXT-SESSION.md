# 👉 NEXT SESSION — copy the block below. Nothing else on this page matters.

```
/alucard Fix the store hand-off matching stores by NAME instead of by id.

WHERE: src/App.jsx:1628, the customer lookup at :1634, and the request written at :1534-1543.

WHAT IS WRONG: handleAdminApproveTransfer reassigns EVERY transaction whose customerName
lowercases to request.storeName. The request only ever stored storeName - there is no
customerId on it. Line 1634 then resolves the customer with customers.find(...), which
returns the FIRST match only.

WHY IT MATTERS: two shops called "Toko Jaya" in different cities. Approving the hand-off of
one reassigns BOTH shops' sales. One agent loses his receivable, another is credited with
debt he never carried. This is not hypothetical - MerchantSalesView.jsx:525-527 records that
Aldi's own book has three shops sharing a name, 14.5 km apart.

FIX: store customerId on the request at :1534, filter on t.customerId === request.customerId
at :1628 and c.id === request.customerId at :1634. Fall back to the name match ONLY when
customerId is absent, so requests created before this change still work.

RULES: read the file before editing. Smallest patch that works. Touch nothing else. Leave a
regression guard AND a behaviour check in src/config/logicFixes.selfcheck.mjs - a fix without
one is not finished. Then run the verify chain and paste the numbers:
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
Expected: build clean, 599/0, 59/0.

When it is committed, rewrite this file (.claude/NEXT-SESSION.md) with the NEXT single job.
```

---

<details>
<summary>Why this file only ever holds one job</summary>

Aldi, 2026-08-18: *"i just want u to make 1 prompt for next session and i want u to update it on
every new session so that i dont have to find that file and pasting wrong prompts, just prepare
me 1 each time instead."*

**So: one block, always the next job, rewritten at the end of every session.** Never a menu — a
menu is how the wrong prompt gets pasted. If a session finishes the job in this file and starts
another, this file gets rewritten before that session ends.

**Standing rules, already defaults in alucard — no need to put them in the prompt:**
Karpathy (read first, smallest patch, nothing extra, "done" = a check that runs) · Caveman
(short replies, but questions stay descriptive and every reply ends with what was just done) ·
a fix is not finished without its self-check line · never deploy `firestore.rules` · never
rename the RETUR/RETURN writers · sale is final, no refund, no credit.

**Where things are:** repo `D:\APP DEVELOPMENT\kpm inventory main FILES\kpm-inventory-main` ·
vault `D:\APP DEVELOPMENT\kpm inventory main FILES\A-Brain` · alucard
`C:\Users\ASUS\.claude\skills\alucard\SKILL.md`.

**The queue after this one** (do NOT paste these — they are here so the next session knows what
to write into this file next, in damage order):

1. ✅ *this file* — hand-off by name, `App.jsx:1628`
2. the two name-join bugs in the sale engine, `useTransactionEngine.js:329` + `:331` — pair them,
   same root cause, same file. Trap: dropping the tier suffix alone is not the whole fix.
3. Consignment Risk reads Rp 0, `AgentProfileView.jsx:530` — 7-day feed + a clamp, and the card
   contradicts itself on screen.
4. `getDoc` never imported, `MapMissionControl.jsx:1512` — the rank engine has never once read
   his configured targets.
5. the two `firestore.rules` holes, `:138` and `:214` — **alone, emulator first, never deploy.**
   A6's fallback flip can lock real staff out; A7's naive patch would block him creating agents.
6. build *tukar barang* — money rule already locked: customer pays if the new goods cost more,
   nothing comes back if they cost less.

Full detail on all 74 problems: the artifact, and `A-Brain/Backlog/SWEEP*.md`.
His test list, whenever he feels like it: `A-Brain/Backlog/TESTS - check these when you feel like it.md`.
</details>
