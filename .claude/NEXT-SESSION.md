# Next session — copy the block below, paste it, go

Rewrite this file before you finish. One job only, never a menu.

**The ponder sweep is COMPLETE** (2026-09-04). All five scenes split, 722/722 · 988/988. The next
job comes from the Backlog, and the block below is a decision, not a build.

---

```
Pick the next real job with Aldi, from A-Brain/Backlog/ — do not invent one from a code smell.

The tutorial work is finished: all five ponder scenes were split to one idea per beat, and there is
nothing queued behind it. `A-Brain/Backlog/` is the actual to-do list and it is long, so this
session starts by READING and RANKING, then asking him to choose. Do not start coding first.

START HERE: `A-Brain/Backlog/SWEEP 2026-08-18 - START HERE.md`. It ranks 75 confirmed problems from
a review sweep, with detail files hanging off it. Several are HIGH and were independently verified
by a second agent. Read that file, then list the open items and their status:

  node -e "const fs=require('fs');const d=process.argv[1];for(const f of fs.readdirSync(d).filter(x=>x.endsWith('.md'))){const s=fs.readFileSync(d+'/'+f,'utf8');const g=(k)=>((s.match(new RegExp('^'+k+': *(.*)$','m'))||[])[1]||'').trim();const st=g('status');if(/^(Done|Ready to Deploy|Parked)/.test(st))continue;console.log((g('priority')||'-').padEnd(8),(st||'-').slice(0,28).padEnd(30),f)}" "D:/APP DEVELOPMENT/kpm inventory main FILES/A-Brain/Backlog"

⚠️ CHECK THE STATUS FIELD BEFORE PROPOSING ANYTHING. The index table inside `Backlog/index.md` is
older than the files and lists items as To Do that are already Done — "Shipping stock to a branch
can erase sales made while the photo uploads" reads HIGHEST in the index and is `Done - 655e7f1` in
its own file. The per-file `status:` is the truth; the index is a summary that drifted.

⚠️ AND READ THE WHOLE FILE, NOT THE TITLE. Several of these items were re-checked after they were
written and the correction is at the BOTTOM. The same shipping item downgrades itself from HIGHEST
to MEDIUM three sections in, and then says the one-line fix it recommends is not enough because the
same absolute-write pattern exists in at least four other files. A title is a first draft of a
finding.

WHAT TO BRING HIM: three or four candidates, each in one line - what breaks, who notices, and how
big the fix looks. He picks. Then rewrite this file with the one he chose, spelled out the way the
ponder briefs were: exact file and line, what the code does now, the smallest fix, and the trap
that would make a lazy patch wrong.

STANDING CONTEXT WORTH KNOWING BEFORE READING CODE:
  · Firestore rules are a DRAFT until Aldi deploys them by hand. Never run `firebase deploy`.
  · `increment()` is used for stock in exactly ONE file (RestockVaultView.jsx); absolute
    read-modify-write is the dominant pattern app-wide. Several backlog items are instances of
    that one shape, so fixing them one file at a time may be the wrong unit of work.
  · The Browser pane does not composite - rAF fires zero times, real `computer` clicks time out,
    and `agent-browser` hangs the full 1800s. Screenshots, `read_page`, `getComputedStyle`,
    `document.getAnimations()` and DOM queries all work. See
    `A-Brain/Wiki/Concepts/Looking at the App.md`.

Then rewrite .claude/NEXT-SESSION.md with the single job he picked.
```

---

<details>
<summary>Queue — do NOT paste these; promote one only when the job above is finished</summary>

### Ponder sweep — DONE, do not redo

All five scenes split to one idea per beat on 2026-09-04: `regional-warehouse` (78eee2a),
`stock-by-warehouse` (f21b3d3), then `product-performance` / `goods-received` / `shipment-plan`
(50fb09f). 69 beats across the book before, 168 after; average 136 characters down to 68; beats over
150 characters 19 down to 3; 80 distinct focus keys.

Two audit checks now guard the class of bug this uncovered — search `strandedBeats` in
`integration.audit.mjs`. Do not weaken them.

### Sound thread — CLOSED, do not reopen

*"its still not silent on the phone but not a big deal actually skip it and move on"*. Background in
`A-Brain/Wiki/Concepts/Sounds Come From Aldi.md`. `tools/sfx-draft.mjs` and `tools/sfx-draft.html`
are dead and can be deleted whenever.

### 7 Days to Die track — separate, not this repo

Its notes and its own one-job prompt are at `C:\Users\ASUS\AppData\Roaming\7DaysToDie\MODS-NOTES.md`
and `NEXT-JOB.md`. Nothing there is owed to this repo.

</details>
