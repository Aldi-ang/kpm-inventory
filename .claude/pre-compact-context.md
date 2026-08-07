## COMPACTING NOW — what the summary must keep, and what it must drop

The context is full. Everything below survives only if the summary carries it, so write the
summary for the assistant who wakes up next, not as a record of what happened.

### Drop hard — this is where the waste is

- **Every file you read.** The content is on disk. Note the PATH and one line on why it
  mattered. Never carry source into the summary.
- **Every command output that passed.** "audit 115/115, six self-checks pass" replaces pages.
- **Every tool call that found nothing**, every superseded attempt, every intermediate state.
- **Any narrative of how a decision was reached.** Keep only the decision and its reason.
- **Anything already written to a memory file, the resume brief, or an audit check** — those
  are the durable copies and they are cheaper to re-read than to re-summarise.

### Keep, in this order

1. **What Aldi is waiting on.** Any open `🔴 DECIDE` / `❓ ANSWER` / `✅ TEST` — verbatim.
   An unanswered question that gets summarised away is a question asked twice.
2. **Work in flight.** Anything edited but not yet built, verified or committed, and exactly
   what remains. Half-finished work that is forgotten becomes a silent regression.
3. **Facts discovered this session that are NOT yet written down** — a field name, a wrong
   assumption corrected, why something failed. If it is worth keeping, it belongs in a memory
   file; say so in the summary so the next turn writes it there.
4. **Aldi's decisions and his exact words** where wording matters — his phrasing carries
   intent that a paraphrase loses.
5. **The last few commits** by subject line only. `git log --oneline` gives the rest free.

### Then, immediately after compacting

Do not re-read the codebase to re-orient. Run:
```powershell
npm run build; node src/config/integration.audit.mjs
```
That is what the checks are for. Reading `MerchantSalesView.jsx` to find out where things
stand is the exact habit that costs Aldi a quarter of a session.

If the resume brief has drifted past ~100 lines, compress it before continuing.
