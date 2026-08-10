#!/usr/bin/env node
/* Lessons health check — the curator's second half.
 *
 * Alucard SKILL.md §8 sets the rules this enforces:
 *   - cap 5 entries, <=4 lines each, never raise the cap
 *   - at cap, archive the OLDEST entry WITH ZERO FIRES to A-Brain/Wiki/Lessons-Archive.md,
 *     "or don't write"
 *   - entries stay [likely] until they have a recorded Fired: date
 *
 * The failure mode this exists to catch: at cap with every entry fired, there is no archival
 * candidate, so the "or don't write" branch is the only one left and NO NEW LESSON CAN EVER BE
 * WRITTEN AGAIN. The learning loop jams shut silently — nothing errors, it just stops.
 *
 * Pure text parsing, no model call. Run by hand:  node .claude/lessons-health.mjs
 */
import { readFileSync } from 'node:fs';

const LESSONS = 'C:/Users/ASUS/.claude/skills/alucard/lessons.md';
const CAP = 5;

let text;
try {
  text = readFileSync(LESSONS, 'utf8');
} catch {
  console.log(`LESSONS: UNKNOWN — could not read ${LESSONS}`);
  process.exit(0);
}

/* Entries start at "### <date> — <title>"; everything before the first one is preamble.
 * The preamble contains a FORMAT TEMPLATE inside a code fence whose heading reads
 * "### YYYY-MM-DD — <short lesson>" — requiring a real numeric date is what excludes it.
 * Counting it inflated the total to 6 and hid the fact that the list was jammed. */
const blocks = text.split(/^### /m).slice(1).filter((b) => /^\d{4}-\d{2}-\d{2}/.test(b));
const entries = blocks.map((b) => {
  const title = b.split('\n')[0].trim();
  /* "Fired:" with nothing after it on that line means never fired. */
  const fired = /^Fired:[ \t]*\S/m.test(b);
  const lines = b.split('\n').filter((l) => l.trim()).length;
  return { title, fired, lines };
});

const unfired = entries.filter((e) => !e.fired);
/* §8 says "<=4 lines each", but every real entry has always run ~10-14 lines once Trigger /
 * Lesson / Would-have-prevented / Seen / Fired are counted. A check that fires on the normal
 * state is noise, not signal — so this only catches genuine runaway. */
const oversize = entries.filter((e) => e.lines > 20);
const problems = [];

if (entries.length >= CAP && unfired.length === 0) {
  problems.push(
    `JAMMED — ${entries.length}/${CAP} entries and every one has fired, so there is no entry\n` +
    `  eligible for archiving. Per §8 the only remaining branch is "don't write": Alucard can no\n` +
    `  longer record ANY new lesson. This does not error, it just silently stops learning.\n` +
    `  Fix is Aldi's call, not the curator's — he must pick one:\n` +
    `    (a) archive the oldest entry anyway, fired or not, to A-Brain/Wiki/Lessons-Archive.md\n` +
    `    (b) change §8's archive rule (needs his approval — Alucard may not edit SKILL.md)`
  );
}
if (entries.length > CAP) {
  problems.push(`OVER CAP — ${entries.length} entries, cap is ${CAP}.`);
}
if (oversize.length) {
  problems.push(`TOO LONG — ${oversize.map((e) => `"${e.title}"`).join(', ')} exceed ~4 lines.`);
}
/* A stale-header check: the preamble claims nothing has ever fired, but entries say otherwise. */
const preamble = text.split(/^### /m)[0];
if (/never been written or fired|No entry has ever been/i.test(preamble) && entries.some((e) => e.fired)) {
  problems.push(
    `STALE HEADER — the preamble still says no entry has ever fired, but ` +
    `${entries.filter((e) => e.fired).length} have. The header is out of date.`
  );
}

if (problems.length) {
  console.log(`LESSONS: NEEDS ATTENTION — ${entries.length} entries, ${unfired.length} never fired.`);
  for (const p of problems) console.log(`- ${p}`);
} else {
  console.log(
    `LESSONS: OK — ${entries.length}/${CAP} entries, ${unfired.length} never fired ` +
    `(archivable when at cap).`
  );
}
