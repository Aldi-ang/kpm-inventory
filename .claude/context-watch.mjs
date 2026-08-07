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
let WINDOW = 200_000;
try {
  const s = JSON.parse(fs.readFileSync('C:/Users/ASUS/.claude/settings.json', 'utf8'));
  if (Number.isFinite(s.autoCompactWindow)) WINDOW = s.autoCompactWindow;
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

const used = Math.round(chars / 4);            // ~4 chars per token
const pct = Math.round((used / WINDOW) * 100);
const left = Math.max(0, WINDOW - used);
const k = (n) => Math.round(n / 1000) + 'k';

/* Under 55% there is nothing worth saying, and saying it would itself cost tokens. */
if (pct < 55) process.exit(0);

const head = `[context-watch] ~${k(used)} of ${k(WINDOW)} used (${pct}%), ~${k(left)} left.`;

/* Aldi skims and has said so. A warning he scrolls past is a warning that did not happen, so
   the banner is prescribed here verbatim rather than left to phrasing — it must be the first
   thing on screen, alone on its line, and it must not drift between sessions. */
if (pct >= 80) {
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
