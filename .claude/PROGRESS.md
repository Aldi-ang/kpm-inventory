# PROGRESS — read this, search for nothing

**Updated: 2026-08-27 08:40 WIB (🟠 KPM app session)** · ✅ **SEBARAN STOK NOW SHOWS ITS OWN WORKING** — **631/631** · plain-English columns, per-item rate + depletion · branch `phase0-solid-ground`

## 🟢 2026-08-27 08:40 — VAGUE LABELS GONE; THE ESTIMATE SHOWS ITS WORKING. **631/631.**

**NOW:** nothing blocked. He read the panel, could not tell what two columns meant, and asked for
the calculation to be visible. All four asks done and driven live.

**The renames — his rule: *"use english terms if its shorter and direct"*, *"dont make vague terms"***

| was | now | why |
|---|---|---|
| Gudang | **Warehouse** | |
| Di gudang | **In stock** | |
| **Di jalan** | **Shipping** | his: *"shipping in progress or somewords that is easier to understand"* |
| **Di tangan agen** | **Agent inventory** | his words exactly |
| Terjual | **Sold (7d)** | the window is IN the header now, not a footnote |
| — | **Avg / month** | NEW |
| **Sisa hari** | **Est. days left** | *"potential time left before depletion"*. `Est.` is load-bearing — a bare "Days left" reads as measured fact |

**Per ITEM now, not just per warehouse** — the drawer carries Avg/month and Est. days left for
every product. **This immediately paid for itself on his own data:** Master Vault's row says
**348 days left**, but open it and **Cello Chocolate has 20** (1.464 ÷ (500÷7)). The warehouse
total was hiding the only product that is actually moving behind four that are not. That is the
thing he was reaching for when he said *"not just all product as a whole"*.

**The footnote is now the formula, written out**: where the numbers come from, both divisions
longhand, what `≈` means, what `—` means (no rate — NOT "lasts forever"), and why the estimate
ignores Shipping and Agent inventory (they answer "how long does the shelf last", and stock on a
truck is not on the shelf).

**⚠️ Left alone deliberately:** `BranchWarehouseManager.jsx:1121` still says "Di jalan" — that is
the BRANCH user's reorder-advice panel, all-Indonesian for a branch reader. Not the same screen,
not his complaint. Rename it only if he asks.

**Audit note:** the terjual check FIRED again on the rename (it anchors the label to the listener
window) and was re-anchored to the new "last 7 days" wording. New check 631: the two divisions must
stay printed beside the numbers they produced.

## 🟢 2026-08-27 08:14 — TIMESTAMP ONLY. No code changed since `d042520`.

He asked what the difference is between **di jalan** and **di tangan agen**. Answered in chat, no
edit. Keeping the answer here because it is the panel's whole vocabulary and a cleared session
should not have to re-derive it:

> A pack travels `di gudang HQ` → **di jalan** → `di gudang cabang` → **di tangan agen** → `terjual`,
> and is counted in exactly ONE column at a time.
> **Di jalan** = shipped, still with the courier, not yet counted in by the branch — `stock_requests`
> still IN_TRANSIT. Nobody can sell it.
> **Di tangan agen** = already arrived and now loaded on a salesman's vehicle — `motorists[].activeCanvas`,
> grouped by the motorist's location. This is the sellable stock.
> The master vault prints **—** for di jalan, never 0: shipments only run HQ → cabang, so the column
> does not apply there and a 0 would be a measurement nobody took.

## 🟢 2026-08-27 08:12 — SEBARAN STOK REDESIGNED. `d042520`. **630/630.**

**NOW:** nothing is blocked and nothing is half-done. Six commits today, all driven in his live
Chrome against his real data: `76de71a` `20c4a0a` `4cc71af` `b667e78` `d042520` (+ notes).
The Restock Vault desk has its 4th tab, Tujuan comes from the roster, and the HQ logistics screen
is now one panel — **Sebaran Stok** — that nothing else duplicates.

**🔴 WAITING ON ALDI — verbatim, do not paraphrase**

> *(nothing open.)* Every question asked this session was answered in it: he chose **MOVE it into
> the tab** for the request queue, and **Delete it** for the old Isi Gudang Cabang panel.

**✅ THE ONE THING NEITHER OF US COULD TEST**
The **Siapkan Pengiriman** button and the shipping modal behind it. He has **zero** open branch
requests — all six in the Buku are DELIVERED — and fake rows must never be written into his live
Firestore to make one. **The next real branch request is the test.**

**What changed today, shortest form** — `git show <sha>` carries each full story
- `76de71a` Request tab (a MOVE off the branch screen, −332 lines there), Tujuan from the roster,
  Sebaran Stok built on the dashboard's own `supplyByProduct`
- `20c4a0a` 🔴 Tujuan was offering **Headquarters** as a shippable cabang beside the real HQ entry.
  Found by looking at the screen; every static check passed it. Fixed by EXPORTING supply.js's
  `NON_BRANCH` instead of keeping a second, shorter copy of the rule
- `4cc71af` banner deleted, Sebaran Stok became the title, every warehouse opens into its shelf.
  🔴 Also found by looking: every Master Vault row printed *"10.900 TANPA ASAL"* in danger red —
  the arrivals machinery has no data for the master vault, which is stocked by `procurements`
- `b667e78` Isi Gudang Cabang deleted (his call), taking `viewBranch`, `branchesSeen` and one
  Firestore listener with it
- `d042520` the panel was a `<table>` in a rounded box, so every row rule was sliced at the corner
  — his *"looks cutted"*. Rebuilt on a grid; the drawer animates on `grid-template-rows` 0fr→1fr

**Where things live**

| What | Where |
|---|---|
| The 4-tab desk (Masuk · Kirim · **Request** · Buku) | `src/RestockVaultView.jsx` |
| Shipping modal + the fulfilment handlers | `src/RestockVaultView.jsx` (moved here from BranchWarehouseManager) |
| Sebaran Stok — the whole HQ logistics screen | `src/components/BranchWarehouseManager.jsx`, the `isAdmin && logistics.length > 0` block |
| The supply maths, shared with the dashboard | `src/utils/supply.js` — `supplyByProduct`, `warehouseList`, `NON_BRANCH` |
| Checks for all of it | `src/config/integration.audit.mjs` groups **54** and **55** |

**Traps this session paid for**
- **A check that greps source also reads the comment explaining the fix.** G53 had no `noCmt`;
  my comment quoting `text-white` failed the check forbidding it. G48 already knew this.
- **Two checks fired on pure copy/signature tweaks** and were re-anchored on the CLAIM, not the
  punctuation (`7 hari terakhir`) and on the ARRAY, not the callback (`r.detail.map(`).
- **`.claude/NEXT-SESSION.md`'s trap list is a map of closed paths.** It said the vault gate
  cannot be opened from here; I spent ~10 tool calls and a 1800s stall proving it right.

## 🟢 2026-08-27 07:55 — DRIVEN LIVE. `20c4a0a`. **628/628.** One bug caught on screen.

He unlocked Chrome so all three were driven against his real data. Everything renders.

**The bug only the screen could find:** Tujuan offered FOUR destinations — Gudang Pusat (HQ),
BANDUNG, **Headquarters**, MUNTILAN. The first and third are the same place. The roster union
filtered on its own short list (`!== 'UNASSIGNED'`) while supply.js already owned the real rule
behind `NON_BRANCH`. Fixed by EXPORTING that constant, not by lengthening the copy. `20c4a0a`.

**Verified on screen, against his data**
- 4 tabs: `MASUK 0 · KIRIM 0 · REQUEST 0 · BUKU 6`. Request's empty state is correct — all 6
  requests in the book are DITERIMA, so there is genuinely nothing open.
- Buku rows + drawer still work after the row became a flex pair for the Siapkan button.
- Tujuan = Gudang Pusat (HQ) · BANDUNG · MUNTILAN. **BANDUNG is the proof** — every request in
  the book goes to MUNTILAN, so Bandung could not have appeared before.
- Sebaran Stok cross-checks EXACTLY: master di gudang 24.921 = the five Masuk shelf figures summed
  (1.586+1.464+10.900+9.988+983). Sisa hari 348 = 24.921 ÷ (500/7). Totals add.
- Light mode clean — `text-gold` is a token that flips to near-black, so the palette law holds.

**🔴 STILL UNPROVEN:** the Siapkan button and the shipping modal. There is no PENDING request in
his data and I will not write fake ones into his live Firestore. **First real branch request that
arrives is the test.**

## 🟢 2026-08-27 07:40 — REQUEST TAB + ROSTER TUJUAN + SEBARAN STOK. `76de71a`. **627/627.**

**NOW:** all three builds from `.claude/NEXT-SESSION.md` are done and committed. **The only thing
left is HIS eyes on it** — the vault gate re-locks on a new tab and cannot be opened from here, so
nothing below has been seen rendering.

**Read `git show 76de71a`** for the full story. It carries every decision and every trap. Do not
re-derive them from the diff.

**The one-line version of each**
- **Request tab** — HQ's fulfilment queue MOVED off the branch screen onto the desk as its 4th tab.
  A move, not a copy: the rows are `bookRows` filtered, only the shipping modal travelled.
  BranchWarehouseManager lost 332 lines.
- **Tujuan** — now the motorists roster UNIONED with branches seen on past requests.
- **Sebaran Stok** — one row per warehouse: di gudang · di jalan · di tangan agen · terjual ·
  sisa hari. Runs the dashboard's own `supplyByProduct`, so the two screens cannot disagree.

**⚠️ TERJUAL IS 7 DAYS**, because the transactions listener is capped at 7 days. Check 55 ties the
label to the listener so widening the cap fails loudly.

**Two audit counts moved on purpose** (delete-marks 13→12, camera rule 2→3) and **one check was
fixed**: the G53 palette check had no `noCmt`, so it failed against the comment explaining the fix.
Group 48 already paid for that trap; G53 was written without the lesson.

**What he still has to test** — the list is in the session reply, and none of it is verified:
the 4th tab appears and lists open requests; Siapkan opens the shipping modal and ships; Tujuan on
Kirim lists every roster team; Sebaran Stok numbers look right against what he knows.


## 🟢 2026-08-26 22:05 — RESUME BRIEF WRITTEN. `775c791`. Session ready to clear.

**No app code changed since `999b5a7`.** This entry exists so a cleared session knows the notes are
current and where to start.

**👉 START HERE NEXT SESSION: `.claude/NEXT-SESSION.md`** — it carries the three queued builds in
his order, the collection behind every number, the sidebar answer, and the traps. This file
(`PROGRESS.md`) is the state; that file is the plan. Read both, read no code to orient.

**The prompt he was given to paste after `/clear`:**
> Read .claude/NEXT-SESSION.md first, then run:
> npm run build; node src/config/integration.audit.mjs
>
> Continue the Restock Vault work. Build order:
> 1. The Minta tab (the desk's 4th tab)
> 2. Tujuan from the motorists roster, not from past shipments
> 3. The Global Logistics Command readout
>
> Before you touch the shell, ask me how wide my browser window is.

**Tree is clean** apart from `.claude/settings.json`, which was already modified before today.


## 🟢 2026-08-26 21:03 — DOUBLE SCROLLBAR KILLED, SIDEBAR EXPLAINED. `999b5a7`. **616/616.**

**NOW:** Restock Vault done and driven live. Five commits today: `aea7de4` `4387c86` `390d5fa`
`284602b` `999b5a7`. **Next build: the desk's 4th tab (Minta).** Nothing is blocked.

**What just landed**
- **Double scrollbar** — his *"why do we have double slider"*. Restock Vault was the only tab that
  both scrolled itself AND guessed its height from `100vh`; the guess ran ~38px taller than the
  shell's padded workspace, so the workspace overflowed by that sliver and drew a second bar.
  `lg:h-[calc(100vh-140px)]` → **`lg:h-full`** at `App.jsx:4424`. Scroll stays on that box — the tab
  strip and the completeness footer are pinned by it.
- ⚠️ **I broke the build and almost reported it green.** The note explaining the fix was a JSX
  comment placed after `&& (` — a second expression inside those parentheses, which does not parse.
  Committed a "build green" message before checking, then amended. **Run the build BEFORE writing
  the claim, every time.** The warning now sits in the comment itself.

**🟢 SIDEBAR — ANSWERED, no longer blocking**
It is **not gone**. It is the collapsed capsule: a **black circle with a package icon at the very
top-left** (totem at x=4, y=12, 56×56, `pointer-events:auto`). Hovering it expands the rail to
351px. **Proved** by forcing `width:351px`: rail → 351, pod → x=0, **all 17 marks visible**.
⚠️ My earlier "pod at x=-124" reading was **junk** — measured mid-transition (380ms width animation,
220ms delay). Do not chase it again.
⚠️ **Synthetic hover never fires `:hover` here**, so this can only be confirmed by a human.
🔴 **The one remaining unknown:** `.kpm-rail-totem { display:none }` in the BASE block means the
circle only exists at **≥1024px**. Below that the rail is a phone drawer parked off-screen right and
**no hamburger was found**. If his window is narrower than 1024px, that is a real bug. His question
was *"the real question is where is the side bar?"* — answer given; awaiting only his window width.

**HIS QUEUE, verbatim, none built yet**
> "redesign the request panel as well or maybe just add it on the panel that we just made, just add
> extra tab for request"

Closes the old Active Pipeline question — it becomes the desk's 4th tab (Minta), carrying
**"Siapkan Pengiriman"** (`BranchWarehouseManager.jsx:1350`), the only way HQ ships a request.

> "make sure that every team registered on the fleet and roster have their own storage option"

🔴 Find where fleet/roster teams are registered first. Today Tujuan is derived from
`stockRequests[].branch` — a team never shipped to is invisible.

> "for the global logistic command i want u to redesign that ... regional warehouse current stock,
> on field, sold as well ... so HQ know how many bks should be send to them again"

Shape agreed: **di gudang · di jalan · di tangan agen · terjual**. 🔴 Name the collection for
on-field and sold before promising either number.

**📍 DATA MAP for that readout — traced 2026-08-26 21:1x, 3 of 4 columns are sourceable:**

| Column | Source | Verdict |
|---|---|---|
| **di gudang** | `artifacts/{appId}/users/{uid}/branches/{name}/inventory` — already live in `branchStock` (`useDatabaseSync.js:175`), keyed by branch name | ✅ loaded already |
| **di jalan** | `stock_requests` where `status==='IN_TRANSIT'` && `branch===name`, sum `fulfilledItems[].qty` — already live in RestockVaultView | ✅ loaded already |
| **di tangan agen** | `motorists/{id}.activeCanvas`, grouped by `motorists[].location` (that field IS the branch — `App.jsx:492`, `:4455`) | ✅ available, needs the roster list App.jsx already holds |
| **terjual** | `artifacts/{appId}/users/{uid}/transactions` | 🔴 **NO branch/location/region field on a transaction.** Cannot be split per warehouse directly. |

🔴 **The one real gap.** *Terjual per gudang* has to be derived by joining a transaction to its
agent and reading that agent's `.location`. **Confirm the transaction actually carries an agent id
before building the column** — if it does not, the honest move is to ship three columns and say why
the fourth is missing, never a number that cannot be sourced.

**Roster:** teams/agents live in `artifacts/{appId}/users/{uid}/motorists`, each with `.location`.
That is also the answer for *"every team registered on the fleet and roster have their own storage
option"* — Tujuan should list `[...new Set(motorists.map(m => m.location))]`, NOT the branches
derived from past `stock_requests`, which is what it uses today and which hides any team never
shipped to.

**Also queued:** Branch Manager redesign · split Stok Kritis + per-warehouse minimum · the four
inline `minStock` fallbacks.

**Where things live (new since 20:41)**
| Thing | Path |
|---|---|
| the Restock Vault page wrapper (one scrollbar) | `src/App.jsx:4424` |
| the rail, totem and capsule CSS | `src/styles/theme.css:1877-1971` |
| all 8 guards | `src/config/integration.audit.mjs` → group **53** |

⚠️ **The "L-CLICK / SCROLL / NAVIGATE" strip is NOT his app** — it is the Claude-in-Chrome overlay
drawn into his real Chrome while the extension is attached. Zero matches in the DOM. Never hunt it.

