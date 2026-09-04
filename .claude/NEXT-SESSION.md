# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

**Current as of 2026-09-04 19:30 WIB.** Two of five scenes done (`regional-warehouse` 78eee2a,
`stock-by-warehouse` f21b3d3). Three left. One scene per session.

---

```
Split `product-performance` into one idea per beat. Third scene of the sweep Aldi asked for:
*"there is too much words but too little showing"*, *"make sure that for almost every sentence there
is some textbox to highlights and explain not just sentence reading"*, *"also apply this logic to
other tutorial as well"*.

THE MEASUREMENTS THAT RANK WHAT IS LEFT (re-run the one-liner at the bottom):
    scene                    beats  avg chars  >150ch  keys
    regional-warehouse  ✅       28         83       1    26
    stock-by-warehouse  ✅       51         64       1    18
    product-performance ← THIS   12        137       3    10
    goods-received               11        131       2     9
    shipment-plan                13        128       2    10
Target the shape the two finished ones now have: avg well under 100 characters, one sentence per
beat, close to one distinct key per beat, and holds around 2400–4000ms instead of 6000+.

START BY READING THE STAGE, NOT THE SCENE. `ProductPerformanceTable.jsx` carries 14 anchors and the
scene names 10, so some sentences already have somewhere to go. List the unused anchors first and
split onto those; add markup only where a sentence genuinely has nothing to point at. That is how
`stock-by-warehouse` needed almost no new markup at all.

🔴 THE TRAP, AND IT IS NOT THEORETICAL — `stock-by-warehouse` shipped with it. A beat may not point
inside something that is closed. That scene had `act: 'close'` on a beat focusing
`item:bandung-choco`, an item in BANDUNG's drawer. The drawer collapses with a `0fr` grid track
instead of unmounting, so the element EXISTS: `querySelector` finds it, the audit's `resolvesKey`
finds its key in the source, and the highlight draws a ring with no height around something nobody
can see. **Presence is not visibility.**
  Two checks now catch that class (`integration.audit.mjs`, search `strandedBeats`): one replays
  each scene's `act` script and demands any `item:`/`drawer:` key be inside whatever is open at that
  beat; the other pins every `item:` key to a product that exists in the demo world. If
  `product-performance` has any hidden or toggled region, extend the FIRST check to cover it rather
  than trusting a DOM query.

⚠️ DO NOT TRY TO VERIFY BY WALKING THE SCENE IN THE BROWSER. It was tried and abandoned: clicking
through the step buttons stalls past the 45-second tool limit because the pane does not composite
(rAF fires zero times, real `computer` clicks time out). A screenshot at `?step=N` still works, and
is worth one look. The replay check above is the real verification — exact rather than sampled, and
it cannot go stale. See `A-Brain/Wiki/Concepts/Looking at the App.md`.
    preview_start "ponder-lab", then
        http://localhost:4190/tools/ponder-lab.html?scene=product-performance&step=6

LANGUAGE RULES ARE ENFORCED BY THE AUDIT AND ARE NOT OPTIONAL: everyday Indonesian; feature and
column names left in the English they are printed in, wrapped in `**`; and NO second or first person
anywhere — not `kamu`, not the polite `Anda`, not `saya`/`kita`. The subject is the warehouse, the
shipment, the product or the app. Check whether any string in this scene is load-bearing for another
check before rewording it — `stock-by-warehouse` has two formula strings pinned by check 631.

DONE WHEN: avg beat under ~100 chars, no beat over 150 unless it is genuinely one idea, close to one
key per beat, and 722/722 audit + 988/988 selfcheck.

Re-measure with:
  node -e "const fs=require('fs');const d='src/ponder/scenes';for(const f of fs.readdirSync(d).filter(x=>x.endsWith('.js'))){const s=fs.readFileSync(d+'/'+f,'utf8');const t=[...s.matchAll(/text: '([^']*)'/g)].map(m=>m[1]);if(!t.length)continue;console.log(f,t.length,Math.round(t.reduce((a,x)=>a+x.length,0)/t.length),t.filter(x=>x.length>150).length,new Set([...s.matchAll(/focus: '([^']+)'/g)].map(m=>m[1])).size)}"

Then rewrite .claude/NEXT-SESSION.md with the next single job — pull from the queue below.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### The last two scenes, in rank order

`goods-received` (11 beats, avg 131, 2 over 150, 9 keys), then `shipment-plan` (13, 128, 2, 10).
Same treatment, one per session. When all five are done the sweep Aldi asked for is complete.

### Then the Backlog — do not invent a job

`A-Brain/Backlog/` is the real to-do list. Open `SWEEP 2026-08-18 — START HERE.md` first; it ranks
75 confirmed problems, several HIGH and independently verified. Aldi picks, not you.

### Sound thread — CLOSED, do not reopen

*"its still not silent on the phone but not a big deal actually skip it and move on"*. Background in
`A-Brain/Wiki/Concepts/Sounds Come From Aldi.md`. `tools/sfx-draft.mjs` and `tools/sfx-draft.html`
are dead and can be deleted whenever.

### 7 Days to Die track — separate, not this repo

Its notes and its own one-job prompt are at `C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md`
and `NEXT-JOB.md`. Nothing there is owed to this repo.

</details>
