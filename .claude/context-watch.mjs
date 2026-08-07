/* UserPromptSubmit hook — measures how full the context actually is, every time Aldi types.

   Claude cannot see its own token usage and cannot clear itself. But the live transcript is
   on disk, and Claude Code hands this hook its path. So the fullness can be MEASURED rather
   than guessed, and the recommendation to clear can arrive BEFORE a big job starts instead
   of after the budget is gone.

   Silent below the first threshold: this output is added to context on every single message,
   so when there is nothing to say it must cost nothing.

   Test:  echo "{\"transcript_path\":\"<some>.jsonl\"}" | node .claude/context-watch.mjs
*/
import fs from 'node:fs';

let hook = {};
try { hook = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
const tp = hook.transcript_path;
if (!tp || !fs.existsSync(tp)) process.exit(0);

/* The window Claude Code will auto-compact at. Reading it means this self-adjusts the day
   Aldi changes the setting, instead of quietly measuring against a stale number. */
/* NO CLAMP. A clamp to 200k was added earlier today on the assumption that the real window was
   200k; Aldi's own UI then showed "459.7k / 1.0M (46%)" while this reported 80%. His window
   really is 1M. Guessing a ceiling made it over-report and cost him a needless clear — the
   mirror image of the under-reporting bug it was meant to fix. Trust the setting. */
let WINDOW = 200_000;
try {
  const s = JSON.parse(fs.readFileSync('C:/Users/ASUS/.claude/settings.json', 'utf8'));
  if (Number.isFinite(s.autoCompactWindow) && s.autoCompactWindow > 0) WINDOW = s.autoCompactWindow;
} catch { /* default stands */ }

const lines = fs.readFileSync(tp, 'utf8').split('\n');

/* Everything before the last compaction is on disk but is NOT sent any more. Measuring the
   whole file would report a session as full immediately after it was emptied. */
let start = 0;
for (let i = lines.length - 1; i >= 0; i--) {
  if (!lines[i]) continue;
  if (lines[i].includes('"isCompactSummary":true') || lines[i].includes('"isCompactSummary": true')) {
    start = i;
    break;
  }
}

let chars = 0;
for (let i = start; i < lines.length; i++) {
  if (!lines[i]) continue;
  let m; try { m = JSON.parse(lines[i]); } catch { continue; }
  const c = m.message?.content;
  if (typeof c === 'string') { chars += c.length; continue; }
  if (!Array.isArray(c)) continue;
  for (const b of c) {
    if (b.type === 'text') chars += (b.text || '').length;
    else if (b.type === 'thinking') chars += (b.thinking || '').length;
    else if (b.type === 'tool_use') chars += JSON.stringify(b.input || {}).length;
    else if (b.type === 'tool_result') {
      chars += typeof b.content === 'string' ? b.content.length
        : Array.isArray(b.content) ? b.content.reduce((a, x) => a + (x.text || '').length, 0) : 0;
    }
  }
}

/* The character count above is a guess and it guesses LOW — it estimated 160k on a conversation
   Claude Code itself measured at 459.7k, because it only sees message text and never the system
   prompt, tool schemas or attachments.

   But the transcript already carries the real numbers. Every assistant line has `message.usage`,
   and for the MOST RECENT one, input + cache_read + cache_creation IS the context that was
   actually sent on that request. That is measured, not inferred, so it is what we report.
   Reading backwards also makes the compaction scan above irrelevant here: whatever the last
   request sent already reflects any compaction that happened before it. */
let real = 0;
for (let i = lines.length - 1; i >= 0; i--) {
  if (!lines[i]) continue;
  let m; try { m = JSON.parse(lines[i]); } catch { continue; }
  const u = m.message?.usage;
  if (!u) continue;
  real = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) +
         (u.cache_creation_input_tokens || 0) + (u.output_tokens || 0);
  if (real > 0) break;
}

// fall back to the character estimate only when no usage line exists at all (a brand-new session)
const used = real > 0 ? real : Math.round(chars / 4);
const pct = Math.round((used / WINDOW) * 100);
const left = Math.max(0, WINDOW - used);
const k = (n) => Math.round(n / 1000) + 'k';

/* Under 55% there is nothing worth saying, and saying it would itself cost tokens. */
if (pct < 55) process.exit(0);

const head = `[context-watch] ~${k(used)} of ${k(WINDOW)} used (${pct}%), ~${k(left)} left.`;

/* Aldi skims and has said so. A warning he scrolls past is a warning that did not happen, so
   the banner is prescribed here verbatim rather than left to phrasing — it must be the first
   thing on screen, alone on its line, and it must not drift between sessions. */
/* Aldi's standing instruction, 2026-08-07: "before each token usage run out, i want u to stop
   the work and make notes before the usage run out and stuck on the screen" — because when the
   window dies mid-task the screen sticks, he force-retries, and the next session finds NO note
   covering the work that was in flight, so it re-derives everything. That re-derivation is the
   real cost.

   He said 95-98%. This fires at 93 on purpose: a PROGRESS.md write begun at 97% may not fit in
   what is left, and a note that does not land is the exact failure he asked to prevent. Firing
   early is what makes his instruction achievable rather than merely stated. */
if (pct >= 93) {
  console.log(`${head}

🔴 END OF CONTEXT WINDOW. This is the CONVERSATION filling up — it is NOT the 5-hour plan
quota, which nothing here can measure and which /clear does not help. Do not confuse the two
when talking to Aldi. Do this in THIS order, nothing else:

1. Write .claude/PROGRESS.md NOW, before any other tool call. Not a summary of this reply —
   the real state: what landed, what is half-done, what the next session must not re-derive,
   and the exact next command. If code changed, commit it in the same turn.
2. Then reply with ONLY this line, alone, nothing above it:

🔴🔴🔴 **CLEAR NOW — type \`/clear\`** · context ${pct}% full, notes are saved 🔴🔴🔴

3. Then at most two short lines: what is safely committed, and what he does next.

Start NO new work, no matter how small it looks, and do not answer a new question with tool
calls — an unfinished turn here strands him with a stuck screen and no notes.
NEVER recommend /compact: it bills roughly ${k(used)} tokens, clearing bills nothing.`);
} else if (pct >= 80) {
  console.log(`${head}

STOP. Before doing ANY work, before any tool call, the reply must OPEN with exactly this,
alone on its own line, nothing above it:

🔴🔴🔴 **CLEAR NOW — type \`/clear\`** · context ${pct}% full 🔴🔴🔴

Then at most two short lines: what is already saved in PROGRESS.md, and what he does next.
Nothing else. He skims, so anything longer buries the one instruction that matters.

If this request is a NEW task -> do not start it at all. Clearing is free and PROGRESS.md
restores where things stand.
If it is the MIDDLE of something in flight -> finish only the smallest useful piece, write
.claude/PROGRESS.md, then repeat the banner at the end.
NEVER recommend /compact here: it bills roughly ${k(used)} tokens, clearing bills nothing.`);
} else {
  console.log(`${head}

Open the reply with this line, alone, before anything else:

🟡 **Context ${pct}% full — good moment to \`/clear\` after this**

Then judge THIS request against the ~${k(left)} left before starting. A fix-and-verify cycle on
the sales terminal runs roughly 30-60k. If the job plausibly needs more than that headroom, say
so in one line and tell him to clear FIRST rather than stopping halfway through.`);
}
