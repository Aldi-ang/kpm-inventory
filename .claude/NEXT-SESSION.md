# 👉 NEXT SESSION — copy the block below. Nothing else on this page matters.

```
/alucard Fix the two name bugs in the sale engine. Same file, same root cause, do them together.

WHERE: src/hooks/useTransactionEngine.js, handleMerchantSale, lines 360-375. The register calls
these :329 and :331 - those numbers are STALE, the function moved. Read the file, do not trust
any line number in this prompt.

BUG A - the lookup matches on PART of a name, line 362:
  customers.find(c => c.name.toLowerCase() === inputTrimmed || c.name.toLowerCase().includes(inputTrimmed))
An agent types "SARI" for a walk-in. The book holds "WARUNG SARI RASA". The sale and its
Rp 2.000.000 Titip debt are booked to a shop that bought nothing. Worse: the sales screen is
already careful here - MerchantSalesView.jsx:530 only auto-picks on an EXACT single match,
with a comment about three shops sharing a name 14.5 km apart - and then the engine redoes the
lookup loosely and overrides that care.

BUG B - the price tier is welded onto the store name, lines 365-371:
  if (hasEcer) finalName += " (Individual)"; else if (hasGrosir) ... else finalName += " (Retail)";
A store not yet in the book is saved as "Warung Bu Sari (Retail)". Next visit the agent types
"WARUNG BU SARI", nothing matches, and the debt, the last order and the visit history all
vanish from the panel. Through the NOO modal the customer DOCUMENT is created with the suffix,
permanently.

FIX: exact match only for A - same rule as MerchantSalesView.jsx:530. Stop appending the suffix
for B - the tier is already on every cart line as item.priceTier, so nothing is lost.

THE TRAP, and it is the whole job: dropping the suffix alone SPLITS existing shops. Every row
already written says "Warung Bu Sari (Retail)"; new rows will say "Warung Bu Sari". The
receivables screen groups by name (ConsignmentFinanceView.jsx:162-225), so one shop becomes two
rows with half the balance each and no error anywhere. Decide and say in the reply how old names
are handled - strip a trailing " (Retail|Individual|Wholesale)" when comparing is the smallest
answer - and put THAT in a behaviour check, not just the suffix removal.

Second trap: c.name.toLowerCase() throws if any customer document has no name field. Guard it
the way the rest of the file does, (c.name || '').

CONTEXT ALREADY ESTABLISHED, do not re-derive: no transaction in this app carries a customerId,
only customerName and agentId. See A-Brain/Wiki/Concepts/A Store Name Is Not a Store.md before
proposing anything id-based.

Verify chain, paste the numbers:
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
Expected: build clean, 599/0, 72/0 plus whatever you add.

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

**Write the block from the CODE, not from the register.** The job before this one prescribed a
fix that could not be built: it said to filter transactions on `t.customerId`, and no transaction
in this app has ever carried that field. Had it been followed literally, the hand-off would have
been approved, both agents notified, and zero rows moved. Line numbers in the register are stale
too. Open the file, then write the brief.

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

1. ✅ done 2026-08-18, commit `505ddcf` — hand-off by name, `App.jsx`. Scoped by `fromAgentId`,
   not by a customerId that does not exist.
2. 👉 *this file* — the two name bugs in `useTransactionEngine.js`, `handleMerchantSale`.
3. Consignment Risk reads Rp 0, `AgentProfileView.jsx:530` — 7-day feed + a clamp, and the card
   contradicts itself on screen.
4. `getDoc` never imported, `MapMissionControl.jsx:1512` — the rank engine has never once read
   his configured targets.
5. the two `firestore.rules` holes, `:138` and `:214` — **alone, emulator first, never deploy.**
   A6's fallback flip can lock real staff out; A7's naive patch would block him creating agents.
6. build *tukar barang* — money rule already locked: customer pays if the new goods cost more,
   nothing comes back if they cost less.
7. re-key `ConsignmentFinanceView` on customer id — the receivables screen still groups by name,
   so two same-named shops under ONE agent remain merged. Known, unfixed, and the reason the
   hand-off fix could only go halfway.

Full detail on all 74 problems: the artifact, and `A-Brain/Backlog/SWEEP*.md`.
His test list, whenever he feels like it: `A-Brain/Backlog/TESTS - check these when you feel like it.md`.
</details>
