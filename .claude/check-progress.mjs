/* Stop hook — refuses to end a turn that changed the project but left the notes stale.

   Aldi's rule: notes get written every time, not when someone remembers. A reminder that
   can be forgotten is the thing that cost him 60% of a budget hunting for lost state.

   🔴 BOTH NOTES COUNT, not only PROGRESS.md. On 2026-08-30 a session ran to 95% of the plan
   quota, Aldi interrupted it himself, and what came back was a PROGRESS entry with no usable
   prompt for the next session — the half this hook could not see. His words, 2026-08-31:
   *"it still failed to write the full prompt and notes for the next session update"*. So the
   gate is now the OLDER of the two files: a current PROGRESS.md cannot cover for a stale brief.

   Wired in .claude/settings.json as a Stop hook. Run by hand to test:
     echo '{}' | node .claude/check-progress.mjs "D:/APP DEVELOPMENT/.../kpm-inventory-main"
*/
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || process.cwd());
const note = path.join(root, '.claude', 'PROGRESS.md');
const brief = path.join(root, '.claude', 'NEXT-SESSION.md');

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

if (!fs.existsSync(brief)) {
  block(`.claude/NEXT-SESSION.md is missing — it is the one prompt Aldi pastes to start the next `
      + `session. Write it before finishing: one job, self-contained, no menu.`);
}

/* The OLDER of the two. A fresh PROGRESS.md next to a brief from three sessions ago is exactly
   the state that reads as "notes were written" and is not. */
const noteTime = Math.min(fs.statSync(note).mtimeMs, fs.statSync(brief).mtimeMs);
const stale = fs.statSync(note).mtimeMs < fs.statSync(brief).mtimeMs
  ? '.claude/PROGRESS.md' : '.claude/NEXT-SESSION.md';

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
  } else if (p !== note && p !== brief && st.mtimeMs > newest) {
    newest = st.mtimeMs;
    newestFile = path.relative(root, p).replace(/\\/g, '/');
  }
};
for (const w of ['src', 'public', 'functions', '.claude', 'firestore.rules', 'package.json'])
  walk(path.join(root, w));

if (newest <= noteTime) process.exit(0);

block(
  `You changed ${newestFile} but ${stale} is older than that edit.\n\n`
  + `Those two files are the ONLY things a cleared session reads to find out where work stands `
  + `and what to do next. Stale notes are what made Aldi burn 60% of a budget searching for his `
  + `own progress, and an out-of-date NEXT-SESSION.md is what left him pasting the wrong prompt.\n\n`
  + `Write NEXT-SESSION.md FIRST, then PROGRESS.md — this hook compares modification times, so `
  + `touching PROGRESS first makes it "older than" the brief and blocks again.\n\n`
  + `NEXT-SESSION.md: ONE job, self-contained — exact file and line, what the code does, the `
  + `smallest fix, and the trap that would make a lazy patch wrong. Never a menu.\n\n`
  + `PROGRESS.md, then finish:\n`
  + `  - set the header timestamp to ${now} WIB\n`
  + `  - update NOW and WAITING ON ALDI (open questions verbatim — a summarised question gets asked twice)\n`
  + `  - add ONE short LOG entry at the top, dated ${now}\n`
  + `  - add any new file to the "Where things live" table\n`
  + `  - trim LOG to about five entries; git log keeps the rest\n\n`
  + `If the change genuinely does not affect where work stands, just touch the timestamp and say so in the log.`
);
