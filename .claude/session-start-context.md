## Standing rules — kpm-inventory

### Cheap resume — the single most expensive habit here

**Run the check. Do not read the code.**
```powershell
npm run build; node src/config/integration.audit.mjs
```
115 checks over the BUILT output. Answers "is the terminal intact?" in seconds.
`MerchantSalesView.jsx` is ~2.000 lines — reading it to orient yourself is what costs Aldi
25-30% of a session before any work happens. The `*.selfcheck.mjs` files in `src/config/` do
the same for the money paths. Aldi is on **PowerShell**: `;` not `&&`.

**Compress the resume memory before the session ends, not when asked.**
`project_kpm_merchantsales_redesign_brief.md` — keep under ~100 lines. Keep: first command,
current state, what is next, traps. Cut: commit history (`git log` is free), anything the
audit already asserts, any narrative of how a decision was reached.

**A trap encoded as a passing check beats a trap in prose** — a check cannot go stale
silently. Fixing something subtle? Add a check, not a paragraph.

### Talking to Aldi

He is 14, owns this app, makes every real decision, and **skims**.

- Open every reply with ONE bold line naming what he must do. Nothing needed? Say that.
- Mark every ask: `🔴 DECIDE` / `❓ ANSWER` / `✅ TEST`. Group them, never mid-paragraph.
- Define any technical term before using it. An approval he did not understand is not one.
- Name components by what they DO on screen, not by their filename.

### Caveman mode — always on, full intensity

Terse. Drop articles, filler, hedging, pleasantries. Fragments fine. Technical terms exact,
code blocks and quoted errors unchanged. Pattern: `[thing] [action] [reason]. [next step].`

Drop caveman for: security warnings, irreversible-action confirmations, multi-step sequences
where fragment order risks misread. Commits and PR text: write normal. "stop caveman" ends it.

### Karpathy discipline

1. State assumptions; present alternatives rather than picking silently; push back if simpler.
2. Minimum code that works. No speculative features or single-use abstractions.
3. Surgical. Don't improve adjacent code. Remove only what YOUR change orphaned.
4. Turn tasks into verifiable criteria; a verify step per item.

### A-Brain — `D:\APP DEVELOPMENT\kpm inventory main FILES\A-Brain`

For status, decisions, incidents, "what should I work on" — not code structure (that is
Graphify). `Wiki/Index.md`, `Backlog/Backlog.base` (the real to-do list), `runs/`,
`Personal-Context.md`. Asked for his to-do list? Check `Backlog/` before this repo's memory.

### Two traps that each cost a session

**Design work does not land in the repo.** Before telling him nothing was done, check
`~/.claude/plans/` and the session JSONLs — `git log` only shows shipped code.

**Never `SendUserFile` an HTML prototype with `display:"render"`.** Prototypes build their
DOM in JS; the panel does not run scripts, so it shows a black frame and reads as "you lost
everything". Publish it and give the artifact URL.
