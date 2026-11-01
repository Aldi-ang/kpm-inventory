/* SessionStart hook - prints the HEAD of .claude/PROGRESS.md instead of `cat`-ing all of it.

   His 2026-11-01: "the model does not eat so much of the quota just to read everything again". The file had grown to
   374 KB (line 3, the chain of previous stamps, alone was 94,505 chars), so Claude Code saved the whole hook output to
   a file and showed a 2 KB preview: a fresh session saw no state at all and went and read the file itself.

   The FILE is untouched - two tracks write it and the rule is add, never rewrite. Only this view is short: the title,
   the CURRENT stamp, the newest entries of both tracks in file order, and where the rest is.

   Test: node .claude/startup-cost.test.mjs */
import fs from 'node:fs';

const MAX = 12000, ENTRIES = 10;
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
console.log(out.join('\n'));
