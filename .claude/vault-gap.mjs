#!/usr/bin/env node
/* Vault gap check — the curator's detection half.
 *
 * The failure it exists for: 2026-08-04 -> 2026-08-10, 178 commits landed in kpm-inventory and
 * NOTHING was written to A-Brain. PROGRESS.md felt like the knowledge was safe; it was not.
 * Aldi called that an emergency when it surfaced.
 *
 * Pure git arithmetic — no model call, so running it costs nothing. Drafting the missing vault
 * page still needs a model; that half is deliberately not here.
 *
 * Run by hand:  node .claude/vault-gap.mjs
 * Thresholds chosen so the real incident screams (178 commits / 6 days) and a normal day is
 * silent: at the moment this was written the live gap was 1 commit, 0 days.
 */
import { execFileSync } from 'node:child_process';

const KPM = 'D:/APP DEVELOPMENT/kpm inventory main FILES/kpm-inventory-main';
const VAULT = 'D:/APP DEVELOPMENT/kpm inventory main FILES/A-Brain';

const WARN_COMMITS = 15; // 178 in the real incident; a busy honest day sits well under this
const WARN_DAYS = 2;

const git = (repo, args) => {
  try {
    return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
  } catch {
    return ''; // missing repo/git -> treated as unknown below, never a crash
  }
};

const lastVaultISO = git(VAULT, ['log', '-1', '--format=%aI']);
if (!lastVaultISO) {
  console.log('VAULT-GAP: UNKNOWN — could not read A-Brain git history. Check the vault path.');
  process.exit(0);
}

const commits = git(KPM, ['log', `--since=${lastVaultISO}`, '--oneline'])
  .split('\n').filter(Boolean).length;
const days = Math.floor((Date.now() - new Date(lastVaultISO)) / 86400000);
const lastVaultSubject = git(VAULT, ['log', '-1', '--format=%h %s']);

if (commits >= WARN_COMMITS || days >= WARN_DAYS) {
  console.log(
    `VAULT-GAP: BEHIND — ${commits} kpm commit(s) and ${days} day(s) since the last A-Brain write.\n` +
    `Last vault commit: ${lastVaultSubject}\n` +
    `What changed is in: git -C "${KPM}" log --since=${lastVaultISO} --oneline\n` +
    `Write the missing pages, then git add + commit in the vault (writing is not saving).`
  );
} else {
  console.log(`VAULT-GAP: OK — ${commits} commit(s), ${days} day(s) since ${lastVaultSubject}`);
}
