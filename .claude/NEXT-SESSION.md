# NEXT SESSION — copy one block, paste, go

Paste into a fresh session **after `/clear`**. Each block is self-contained: it names the file,
the fix, the trap, and how it must be verified. You should not have to explain anything.

**Working directory (always):** `D:\APP DEVELOPMENT\kpm inventory main FILES\kpm-inventory-main`
**Vault:** `D:\APP DEVELOPMENT\kpm inventory main FILES\A-Brain`
**Alucard skill:** `C:\Users\ASUS\.claude\skills\alucard\SKILL.md`

Alucard runs **Karpathy + Caveman by default** now — neither needs asking for.

---

# ▶ JOB 1 — hand-off matches by NAME *(do this one first)*

```
/alucard Fix the store hand-off matching stores by NAME instead of by id.

WHERE: src/App.jsx:1628 (and the customer lookup at :1634, and the request written at :1534-1543)

WHAT IS WRONG: handleAdminApproveTransfer reassigns EVERY transaction whose customerName
lowercases to request.storeName. The request only ever stored storeName - no customerId. Line
1634 then resolves the customer with customers.find(...), which returns the FIRST match only.

WHY IT MATTERS: two shops called "Toko Jaya" in different cities. Approving the hand-off of one
reassigns BOTH shops' sales. One agent loses his receivable, another is credited with debt he
never carried. Aldi's book really does contain three shops sharing a name - it is recorded in
MerchantSalesView.jsx:525-527.

FIX: store customerId on the request at :1534, filter on t.customerId === request.customerId at
:1628 and c.id === request.customerId at :1634. Fall back to the name match ONLY when
customerId is absent, so requests created before this change still work.

RULES: read the file before editing. Smallest patch. Touch nothing else. Leave a regression
guard AND a behaviour check in src/config/logicFixes.selfcheck.mjs - a fix without one is not
finished. Then run the verify chain and paste the numbers.
```

---

# ▶ JOB 2 — the two name-join bugs in the sale engine *(pair them, same file)*

```
/alucard Fix both customer-name join bugs in src/hooks/useTransactionEngine.js. They are two
lines apart and share one root cause, so do them together.

BUG A - src/hooks/useTransactionEngine.js:329
customers.find(c => c.name.toLowerCase() === input || c.name.toLowerCase().includes(input))
That is a SUBSTRING match. Typing "SARI" for a walk-in binds the sale - and its Titip debt - to
"WARUNG SARI RASA", a store that bought nothing. MerchantSalesView.jsx:531 already does this
correctly (exact match only, with a comment about three shops sharing a name); the engine redoes
the lookup loosely and overrides that care.
FIX: exact trimmed-lowercase equality only.

BUG B - src/hooks/useTransactionEngine.js:331-339
When there is no existing customer, a tier suffix is welded onto the name: "WARUNG BU SARI"
becomes "Warung Bu Sari (Retail)". That suffixed name is used BOTH as the transaction's
customerName AND as the new customer document's name (:272 / :287), so a NOO outlet is created
with the suffix permanently. Next visit the agent types the plain name, the exact-match readers
at MerchantSalesView.jsx:105 and :152 miss, and the debt / last order / visit history are all
invisible.
FIX: drop the suffix - the tier is already on every cart line as priceTier.

RULES: read the file first. Smallest patch. Both bugs leave a regression guard AND a behaviour
check in src/config/logicFixes.selfcheck.mjs. Then run the verify chain and paste the numbers.
```

---

# ▶ JOB 3 — Consignment Risk reads Rp 0

```
/alucard Fix the Consignment Risk (Titip) card showing Rp 0 for debt older than a week.

WHERE: src/AgentProfileView.jsx:530, rendered at :1154, list at :1167-1168

WHAT IS WRONG: activeTitipResponsibility = Math.max(0, titipIssued - titipCollected), and both
halves accumulate only from the `transactions` prop - which useDatabaseSync.js:72 hard-gates to
the last 7 days with where('timestamp','>=',sevenDaysAgo).

WHY IT MATTERS: Rp 5.000.000 of Titip left on the 5th reads Rp 0 on the 17th. Worse, the card
contradicts itself on screen: :512-513 add every in-window CONSIGNMENT_PAYMENT to titipCollected
unconditionally, while :514 decrements storeDebt only when the matching Titip sale is still in
the window - so a payment against an old debt drives the headline to zero while the list right
below it still shows the store owing. Neither carries a "last 7 days" label.

FIX: read the outstanding figure from the career ledger or a dedicated unbounded query, not the
7-day prop. Drop the Math.max(0, ...) clamp so an impossible negative shows instead of hiding.
useDatabaseSync.js:147 fetchHistoricalTransactions already exists and bypasses the 7-day gate.

RULES: read the file first. Smallest patch. Regression guard AND behaviour check in
src/config/logicFixes.selfcheck.mjs. Verify chain, paste the numbers.
```

---

# ▶ JOB 4 — the rank engine has never read your targets

```
/alucard Fix the tier rules loader calling a function that was never imported.

WHERE: src/MapMissionControl.jsx:1512 and :1514, import list at :14

WHAT IS WRONG: both lines call getDoc(...), and the firebase/firestore import at line 14 is
{ doc, collection, getDocs, setDoc, deleteDoc, updateDoc, writeBatch } - getDoc is NOT in it and
is bound nowhere else in the file. Every call throws ReferenceError into the bare catch(e) {} at
:1516, which reports nothing. So `rules` stays {} forever and runSimulation falls through to the
hardcoded defaultTargets at :1615: [2500000, 1000000, 500000, 250000, 0].

WHY IT MATTERS: set Mythic to Rp 10.000.000 in Settings, run Audit Season Ranks, and the engine
silently uses 2.500.000 instead - so every store between the two is promoted to Mythic and
carries that rank into pricing and the map. This has been true since the file shipped.

SECOND PROBLEM ON THE SAME LINES: :1514 builds doc(db, 'artifacts/{appId}/users/{userId}',
'appSettings') = 5 path segments, which is a collection path and invalid for doc().

FIX: add getDoc to the import at :14, fix the :1514 path to an even segment count, and replace
the empty catch with a notify so the next failure is visible.

RULES: read the file first. Smallest patch. Regression guard AND behaviour check in
src/config/logicFixes.selfcheck.mjs - and add an "is it imported" assertion, because this exact
bug shape is why that guard exists. Verify chain, paste the numbers.
```

---

# ▶ JOB 5 — firestore.rules *(highest risk, do alone, never deploy)*

```
/alucard Draft the two firestore.rules fixes. EMULATOR FIRST. DO NOT DEPLOY - show me the diff
and tell me what would break.

A6 - firestore.rules:138. customerAccessLevel() reads the RAW stored role tag, and new agents
are saved as 'AGENT' (FleetCanvasManager.jsx:91, :184, :193, :205). The client translates legacy
tags first (config/permissions.js:26-35). So matrix['AGENT'] misses, perms is [], and the
fallback at :144 returns 'global' = full customer write access, while the UI shows view-only.
The tier dropdown never offers 'AGENT' as an option, so an untouched dropdown keeps the bad tag.
FIX: translate legacy tags inside the rules before the lookup, AND make the no-match branch DENY.
RISK: flipping that fallback can lock real staff out. Emulator must show WHO.

A7 - firestore.rules:214. allow create on employee_directory/{email} checks only
request.resource.data.bossUid == request.auth.uid; the document id (the email) is unconstrained.
Anyone signed in can pre-claim a colleague's email and capture their whole session, and it cannot
be repaired from inside the app.
FIX: require the created doc to be keyed by an email the caller is entitled to write.
RISK: the naive version (email == auth.token.email) would ALSO block the boss creating an agent
record, since that path writes bossUid = his own uid for someone else's email. Check which branch
covers the boss BEFORE writing the rule.

RULES: firestore.rules is a DRAFT. Never run firebase against a live project - emulator only.
Never change an allow line silently. Report, do not deploy.
```

---

# ▶ JOB 6 — build tukar barang *(feature, not a bug fix)*

```
/alucard Build the healthy-for-healthy exchange (tukar barang).

WHAT: a store swaps healthy goods for a DIFFERENT healthy product. Both already paid for, so
nothing is owed either way except a price difference.

MONEY RULE - already locked, do not re-open: new goods cost MORE, the customer pays the
difference. New goods cost LESS, nothing comes back. No refund, no credit. See
A-Brain/Wiki/Concepts/Sale Is Final - no refund, no credit.md.

DESIGN, already agreed: do NOT build a third retur mode. A swap is a return line plus a sale line
in ONE basket, total = the difference. Gate it behind its own per-agent grant, exactly like the
cash-refund flag shipped in 6bea493 - default OFF, checkbox in Fleet & Roster, admin always true,
read with === true so a missing field denies, and refuse it at submit as well as hiding the UI.

WARNING: mixed baskets are what caused the worst bug in this app (one Utang Barang line forcing
the whole cart to Cash, fixed in fd562f4). Keep the guard tight and test a mixed basket.

RULES: read MerchantSalesView.jsx and useTransactionEngine.js before writing. Smallest patch.
Regression guard AND behaviour check in src/config/logicFixes.selfcheck.mjs. Verify chain.
```

---

# ▶ IF YOU JUST WANT TO CARRY ON

```
/alucard keep fixing the logic review list, plan A, money first
```

`PROGRESS.md` loads on its own and holds the running order, the traps and the verify chain.

---

# ▶ IF YOU WANT TO TEST INSTEAD OF BUILD

`A-Brain\Backlog\TESTS - check these when you feel like it.md`

⚠️ Those tests need the **new build**. Testing the live app checks old code — every one will
"fail" for the wrong reason.

---

## The verify chain — expected: build clean · 599/0 · 59/0

```bash
npm run build; node src/config/integration.audit.mjs; node src/config/logicFixes.selfcheck.mjs
```

## Standing rules, already baked in — no need to repeat them

- **Karpathy default** — read before editing, smallest patch, nothing extra, "done" = a check.
- **Caveman default** — short replies. **Except questions, which stay descriptive**, and every
  reply ends with what was just done.
- **A fix is not finished** without a regression guard + a behaviour check in the self-check file.
- **Never deploy `firestore.rules`.** Draft, show, Aldi deploys.
- **Never rename the RETUR/RETURN writers** — `HistoryReportView:186/:255/:265/:271` read `'RETUR'`
  and would break. Widen the four debt readers instead. RETUR totals are positive, RETURN negative.
- **Sale is final** — no refund, no credit, no responsibility.
