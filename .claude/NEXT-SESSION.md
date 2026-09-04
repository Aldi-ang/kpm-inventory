# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

---

```
Apply the Regional Warehouse treatment to `stock-by-warehouse`. Aldi asked for it across the whole
book — *"also apply this logic to other tutorial as well"* — and this is the worst offender, so it
goes first. One scene per session; do not start a second.

WHAT THE RULE IS, in his words: *"there is too much words but too little showing"* and *"make sure
that for almost every sentence there is some textbox to highlights and explain not just sentence
reading"*. A beat says one thing and points at the one thing it is talking about. A sentence that
cannot point at anything does not belong in a scene.

THE MEASUREMENTS THAT RANK THE WORK (regenerate with the one-liner at the bottom):
    scene                    beats  avg chars  beats >150ch  focus keys
    regional-warehouse  ✅ done   28         83             1          26
    stock-by-warehouse  ← THIS    23        142            11          17
    product-performance          12        137             3          10
    goods-received               11        131             2           9
    shipment-plan                13        128             2          10
`stock-by-warehouse` has ELEVEN beats over 150 characters and 17 keys for 23 beats, so several
paragraphs share one highlight. Target the shape regional-warehouse now has: avg well under 100
characters, and close to one distinct key per beat.

⚠️ THE STAGE IS ALREADY RICH HERE, WHICH MAKES THIS THE EASIER HALF. `StockByWarehouseTable.jsx`
carries **36** `data-ponder` anchors — the most in the app — while the scene only names 17. So the
first move is NOT to add markup: read the stage, list the anchors nobody points at, and split the
long beats onto them. Add an anchor only where a sentence has genuinely nothing to aim at.

HOW REGIONAL WAREHOUSE WAS DONE, as the worked example (78eee2a):
  · `src/ponder/stages/RegionalWarehouseStage.jsx` — demo panels carrying the SCREEN'S OWN WORDS
    ("Scan barang sampai", "Qty (Bks)", "Buku Besar"), one anchor per thing a sentence mentions.
    A tutorial that renames a button teaches a button that does not exist.
  · `src/ponder/scenes/regional-warehouse.js` — 10 paragraphs became 28 beats, holds cut to
    2400–4200ms because a short sentence does not need five seconds.

🔴 THE TRAP THAT A GREEN AUDIT WILL NOT CATCH. The focus-key check in `integration.audit.mjs`
(search `resolvesKey`) reads SOURCE TEXT, so it passes for any key spelled anywhere in the stage —
including one inside a branch that is not currently rendered. Regional Warehouse only renders the
open tab, so beats had to drive the tab: the stage reads the `step` prop the overlay already passes
(`PonderOverlay.jsx:547`) and derives the tab from the key's prefix. Check whether the stock table
hides anything behind a toggle, an expander or a filter before trusting the audit.

VERIFY AT RUNTIME, not by regex — this is the check that actually proved the last one. Load the
lab, walk every beat, and assert each focus key resolves to a MOUNTED element:
    preview_start "ponder-lab", then
        http://localhost:4190/tools/ponder-lab.html?scene=stock-by-warehouse
    (`?step=N` freezes one beat for a screenshot.)
  In the page: import the scene module, click each `Step N` button — they are found by
  `aria-label`/`title`, NOT by textContent — and for each step query
  `[data-ponder="<key>"]`. Report resolved vs missing. Regional Warehouse: 28 beats, 26 distinct
  keys, zero missing.
  ⚠️ The Browser pane does not composite (rAF fires zero times, real `computer` clicks time out) —
  DOM queries, screenshots and `read_page` all work. See `A-Brain/Wiki/Concepts/Looking at the App.md`.

DONE WHEN: avg beat length under ~100 chars, no beat over 150 unless it is genuinely one idea,
close to one distinct key per beat, every key resolves at runtime, and 720/720 audit + 988/988
selfcheck. Language rules are enforced by the audit and are not optional: everyday Indonesian,
feature names left in English wrapped in `**`, and NO second or first person at all — not `kamu`,
not the polite `Anda`, not `saya`/`kita`. The subject is the warehouse, the shipment or the app.

Re-measure with:
  node -e "const fs=require('fs');const d='src/ponder/scenes';for(const f of fs.readdirSync(d).filter(x=>x.endsWith('.js'))){const s=fs.readFileSync(d+'/'+f,'utf8');const t=[...s.matchAll(/text: '([^']*)'/g)].map(m=>m[1]);if(!t.length)continue;console.log(f,t.length,Math.round(t.reduce((a,x)=>a+x.length,0)/t.length),t.filter(x=>x.length>150).length,new Set([...s.matchAll(/focus: '([^']+)'/g)].map(m=>m[1])).size)}"

Then rewrite .claude/NEXT-SESSION.md with the next single job — pull from the queue below.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### The rest of the ponder sweep, in the order the numbers rank them

`product-performance` (12 beats, avg 137, 3 long) · `goods-received` (11, 131, 2) ·
`shipment-plan` (13, 128, 2). Same treatment, one per session.

### Then the Backlog — do not invent a job

`A-Brain/Backlog/` is the real to-do list, and several items are marked HIGH and verified. Open
`SWEEP 2026-08-18 — START HERE.md` first; it ranks 75 confirmed problems. Aldi picks, not you.

### Sound thread — CLOSED, do not reopen

*"its still not silent on the phone but not a big deal actually skip it and move on"*. The paper
`book-close` on the phone stays. Background is in `A-Brain/Wiki/Concepts/Sounds Come From Aldi.md`.
`tools/sfx-draft.mjs` and `tools/sfx-draft.html` are dead and can be deleted whenever.

### 7 Days to Die track — separate, not this repo

Its notes and its own one-job prompt are at `C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md`
and `NEXT-JOB.md`. Nothing there is owed to this repo.

</details>
