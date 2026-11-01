// node .claude/startup-cost.test.mjs - checks the two start-up savers (2026-11-01): the cold-session guard in
// context-watch.mjs and the short PROGRESS view in progress-head.mjs. Fake transcripts only; nothing real is touched.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (name, cond, why = '') => { if (cond) pass++; else { fail++; console.log('FAIL', name, why); } };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kpm-startup-'));
const transcript = (tokens, minutesAgo) => {
  const f = path.join(tmp, `t-${tokens}-${minutesAgo}.jsonl`);
  fs.writeFileSync(f, JSON.stringify({ type: 'assistant', timestamp: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    message: { usage: { input_tokens: 10, cache_read_input_tokens: tokens, output_tokens: 5 }, content: [] } }) + '\n');
  return f;
};
let n = 0;
const watch = (tokens, minutesAgo, prompt, session = `test-${process.pid}-${n++}`) => execFileSync('node', [path.join(DIR, 'context-watch.mjs')],
  { input: JSON.stringify({ transcript_path: transcript(tokens, minutesAgo), session_id: session, prompt }), encoding: 'utf8' });
const blocked = (s) => s.includes('"decision":"block"');

const same = `test-${process.pid}-again`;
const first = watch(300_000, 120, 'continue the work', `${same}-2`);
const second = watch(300_000, 120, 'continue the work', `${same}-2`);
ok('BEHAVIOUR: big + idle 2 h -> blocked, and the reason names the new-session step', blocked(first) && first.includes('NEXT-SESSION.md') && first.includes('New session'), first.slice(0, 120));
ok('BEHAVIOUR: the same message typed again within 2 minutes goes through', !blocked(second), second.slice(0, 120));
ok('BEHAVIOUR: /clear is never stopped (blocking it would lock him into the expensive path)', !blocked(watch(800_000, 600, '/clear')));
ok('BEHAVIOUR: a small idle session is not stopped', !blocked(watch(50_000, 600, 'continue')));
ok('BEHAVIOUR: a big session that replied 5 minutes ago is not stopped (its cache is still warm)', !blocked(watch(500_000, 5, 'continue')));
for (const f of fs.readdirSync(os.tmpdir()).filter((x) => x.startsWith(`kpm-cold-guard-test-${process.pid}`))) fs.rmSync(path.join(os.tmpdir(), f), { force: true });

const head = execFileSync('node', [path.join(DIR, 'progress-head.mjs')], { encoding: 'utf8' });
const progress = fs.readFileSync(path.join(DIR, 'PROGRESS.md'), 'utf8');
const newest = progress.split('\n').find((l) => l.startsWith('## '));
ok('BEHAVIOUR: the start-up view is short, carries the newest entry and the current stamp, and drops the old stamp chain',
   head.length < 14_000 && head.includes(newest) && /\*\*Updated: /.test(head) && !head.includes('previous stamp:'), `${head.length} chars`);
ok('REGRESSION: the SessionStart hook runs progress-head.mjs, not cat on the whole PROGRESS.md',
   /node \\"\$\{CLAUDE_PROJECT_DIR\}\/\.claude\/progress-head\.mjs\\"/.test(fs.readFileSync(path.join(DIR, 'settings.json'), 'utf8')) &&
   !/cat \\"\$\{CLAUDE_PROJECT_DIR\}\/\.claude\/PROGRESS\.md\\"/.test(fs.readFileSync(path.join(DIR, 'settings.json'), 'utf8')));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
