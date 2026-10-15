/* Cloud-only start-up (SessionStart hook). On the PC it exits at once.
 *
 * A Claude Code cloud session (CLAUDE_CODE_REMOTE=true) is a fresh Ubuntu VM holding only this
 * repo. This makes it look like Aldi's PC before Alucard needs it:
 *   1. A-Brain cloned next to the app, where every hook and script looks for it
 *   2. ~/.claude/skills/alucard and the auto-memory folder pointing at this repo's copies,
 *      the way the PC's junctions do
 *   3. graphify installed
 *   4. the memory index printed (a PC session loads it from the memory folder by itself)
 *
 * All SessionStart hooks run in parallel, so vault-gap and lessons-health found no A-Brain and
 * stayed quiet; after a fresh clone they run here instead.
 *
 * Unknown until a real cloud session tries it: the cloud's GitHub proxy serves "the repositories
 * attached to the session", so cloning A-Brain from a kpm-only session may be refused. The
 * failure line below says so plainly instead of leaving Alucard to guess.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

if (process.env.CLAUDE_CODE_REMOTE !== 'true') process.exit(0);

const APP = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const VAULT = join(dirname(APP), 'A-Brain');
let hookInput = '';
try { hookInput = readFileSync(0, 'utf8'); } catch { /* no stdin */ }
const run = (cmd, args, timeout) =>
  execFileSync(cmd, args, { encoding: 'utf8', timeout, input: hookInput, stdio: ['pipe', 'pipe', 'pipe'] });
// Whole message: git's first stderr line is often a harmless warning, the real error comes after.
const why = (e) => String(e.stderr || e.message).trim().replace(/\s*\n\s*/g, ' / ').slice(0, 300);

// 2 before 1: lessons-health below reads lessons.md through the home-folder link.
// 'junction' is ignored off Windows; on Windows it lets this run without admin rights (tests).
const point = (path, target) => {
  try {
    if (existsSync(path) && readdirSync(path).length) return; // already linked, or real files
    mkdirSync(dirname(path), { recursive: true });
    rmSync(path, { recursive: true, force: true });
    symlinkSync(target, path, 'junction');
  } catch (e) { console.log(`CLOUD: could not link ${path} (${why(e)})`); }
};
point(join(homedir(), '.claude/skills/alucard'), join(APP, '.claude/skills/alucard'));
point(join(homedir(), '.claude/projects', APP.replace(/[^A-Za-z0-9]/g, '-'), 'memory'), join(APP, '.claude/memory'));

// 1. ponytail: full shallow clone (~200 MB, Raw/ pictures included); add a sparse filter if start-up gets slow.
if (!existsSync(VAULT)) {
  try {
    run('git', ['clone', '-q', '--depth', '1', 'https://github.com/Aldi-ang/A-Brain.git', VAULT], 240000);
    for (const s of ['vault-gap.mjs', 'lessons-health.mjs']) {
      try { process.stdout.write(run('node', [join(VAULT, 'automation', s)], 15000)); }
      catch (e) { console.log(`CLOUD: ${s} failed (${why(e)})`); }
    }
  } catch (e) {
    console.log(`CLOUD: A-Brain clone FAILED (${why(e)}). This session has no vault notes, no lessons `
      + `check and no recall graph - tell Aldi before answering anything from the vault.`);
  }
}

// 3. Same version as the PC.
try { run('graphify', ['--version'], 15000); } catch {
  try { run('pip', ['install', '-q', '--break-system-packages', 'graphifyy==0.9.26'], 180000); }
  catch (e) { console.log(`CLOUD: graphify install FAILED (${why(e)}) - grep instead this session.`); }
}

// 4.
const index = join(APP, '.claude/memory/MEMORY.md');
if (existsSync(index)) process.stdout.write(`\n# Auto-memory index (.claude/memory/)\n\n${readFileSync(index, 'utf8')}`);
