/* Stop hook — refuses to end a turn that changed the project but left PROGRESS.md stale.

   Aldi's rule: notes get written every time, not when someone remembers. A reminder that
   can be forgotten is the thing that cost him 60% of a budget hunting for lost state.

   Wired in .claude/settings.json as a Stop hook. Run by hand to test:
     echo '{}' | node .claude/check-progress.mjs "D:/APP DEVELOPMENT/.../kpm-inventory-main"
*/
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || process.cwd());
const note = path.join(root, '.claude', 'PROGRESS.md');

/* Claude Code sets stop_hook_active once this hook has already fired for the turn.
   Honouring it is what stops an infinite block-continue loop. */
let hook = {};
try { hook = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { /* no stdin, fine */ }
if (hook.stop_hook_active) process.exit(0);

const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 16);
const block = (reason) => {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  process.exit(0);
};

if (!fs.existsSync(note)) {
  block(`.claude/PROGRESS.md is missing — it is the file every session reads first. `
      + `Recreate it before finishing. Timestamp it ${now} WIB.`);
}

const noteTime = fs.statSync(note).mtimeMs;

/* Newest touched file anywhere that matters. dist/ and node_modules are build output —
   a build must not count as a change worth writing down. */
const SKIP = new Set(['node_modules', 'dist', '.git', 'graphify-out', 'coverage']);
let newest = 0, newestFile = '';
const walk = (p) => {
  let st;
  try { st = fs.statSync(p); } catch { return; }
  if (st.isDirectory()) {
    if (SKIP.has(path.basename(p))) return;
    for (const e of fs.readdirSync(p)) walk(path.join(p, e));
  } else if (p !== note && st.mtimeMs > newest) {
    newest = st.mtimeMs;
    newestFile = path.relative(root, p).replace(/\\/g, '/');
  }
};
for (const w of ['src', 'public', 'functions', '.claude', 'firestore.rules', 'package.json'])
  walk(path.join(root, w));

if (newest <= noteTime) process.exit(0);

block(
  `You changed ${newestFile} but .claude/PROGRESS.md is older than that edit.\n\n`
  + `That file is the ONLY thing a cleared session reads to find out where work stands. `
  + `Stale notes are what made Aldi burn 60% of a budget searching for his own progress.\n\n`
  + `Update it now, then finish:\n`
  + `  - set the header timestamp to ${now} WIB\n`
  + `  - update NOW and WAITING ON ALDI (open questions verbatim — a summarised question gets asked twice)\n`
  + `  - add ONE short LOG entry at the top, dated ${now}\n`
  + `  - add any new file to the "Where things live" table\n`
  + `  - trim LOG to about five entries; git log keeps the rest\n\n`
  + `If the change genuinely does not affect where work stands, just touch the timestamp and say so in the log.`
);
