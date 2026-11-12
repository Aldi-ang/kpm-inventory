/* SessionStart hook - prints the HEAD of .claude/PROGRESS.md instead of `cat`-ing all of it.

   His 2026-11-01: "the model does not eat so much of the quota just to read everything again". The file had grown to
   374 KB (line 3, the chain of previous stamps, alone was 94,505 chars), so Claude Code saved the whole hook output to
   a file and showed a 2 KB preview: a fresh session saw no state at all and went and read the file itself.

   The FILE is untouched - two tracks write it and the rule is add, never rewrite. Only this view is short: the title,
   the CURRENT stamp, the newest entries of both tracks in file order, and where the rest is.

   Test: node .claude/startup-cost.test.mjs */
import fs from 'node:fs';

/* 2026-11-12, his "i clear and say continue last time, and it waste my 13% of my 5 hours quota ... make it more straight
   forwards": 4 entries, not 10 (the older ones are answered questions), and THE ONE JOB is printed here too, so
   "continue" starts from this text with no tool call. NEXT-SESSION.md had reached 733 KB - opening it was the 13%. */
const MAX = 7000, ENTRIES = 4, JOB_MAX = 7000;
let src;
try { src = fs.readFileSync(new URL('./PROGRESS.md', import.meta.url), 'utf8'); } catch { process.exit(0); }
const lines = src.split('\n');
const out = [];
let i = 0;
for (; i < lines.length && !lines[i].startsWith('## '); i++) out.push(lines[i].split(' · previous stamp:')[0]);
let entries = 0, size = out.join('\n').length;
for (; i < lines.length; i++) {
  if (lines[i].startsWith('## ') && ++entries > ENTRIES) break;
  if (size + lines[i].length > MAX) break;
  out.push(lines[i]); size += lines[i].length + 1;
}
const older = lines.slice(i).filter((l) => l.startsWith('## ')).length;
if (older) out.push('', `... ${older} older entries are in .claude/PROGRESS.md - never read it whole (${Math.round(src.length / 1024)} KB); grep it for the one line you need. Every version is in git log.`);
try {
  const job = fs.readFileSync(new URL('./NEXT-SESSION.md', import.meta.url), 'utf8');
  out.push('', '## THE ONE JOB - this is .claude/NEXT-SESSION.md, whole. "continue" = start from this text; do not open the file', '', job.slice(0, JOB_MAX).trimEnd());
  if (job.length > JOB_MAX) out.push('', `WARNING: NEXT-SESSION.md is ${Math.round(job.length / 1024)} KB; only its first ${JOB_MAX} characters are shown. It must hold ONE job. Before anything else, move everything under the job to the top of .claude/NEXT-SESSION-archive.md (never read either file whole).`);
} catch { /* no brief yet */ }
console.log(out.join('\n'));
