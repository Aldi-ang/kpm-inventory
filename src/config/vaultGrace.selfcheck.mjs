/* Self-check for the vault grace period. Run: node src/config/vaultGrace.selfcheck.mjs
   Every assert here is a way the vault could be left open when it should not be. */

import assert from 'node:assert';
import { readFileSync } from 'node:fs';

/* Read the source rather than importing it: vaultGrace.js is browser code and this file must run
   under plain node with no bundler. The logic under test is pure, so it is evaluated directly. */
const src = readFileSync(new URL('../utils/vaultGrace.js', import.meta.url), 'utf8');

const GRACE_MS = 5 * 60 * 1000;
assert.ok(
  /VAULT_GRACE_MS\s*=\s*5\s*\*\s*60\s*\*\s*1000/.test(src),
  'the grace period must stay 5 minutes — his number, not a default'
);

const body = src.slice(src.indexOf('export function graceIsValid'));
const fnText = body.slice(body.indexOf('{'), body.indexOf('\n}') + 2);
const graceIsValid = new Function('record', 'nowMs', 'uid', `const VAULT_GRACE_MS=${GRACE_MS};` + fnText.slice(1, -2));

const NOW = 1_000_000_000;
const UID = 'user-abc';
let n = 0;
const ok = (cond, what) => { assert.ok(cond, what); n++; };

ok(graceIsValid({ uid: UID, at: NOW - 1000 }, NOW, UID) === true, 'a fresh unlock is inside the window');
ok(graceIsValid({ uid: UID, at: NOW - (GRACE_MS - 1) }, NOW, UID) === true, 'one ms before expiry still counts');
ok(graceIsValid({ uid: UID, at: NOW - GRACE_MS }, NOW, UID) === false, 'exactly 5 minutes is expired, not valid');
ok(graceIsValid({ uid: UID, at: NOW - (GRACE_MS + 1) }, NOW, UID) === false, 'past the window the gate returns');
ok(graceIsValid({ uid: 'someone-else', at: NOW - 1000 }, NOW, UID) === false, 'another account never inherits the session');
ok(graceIsValid({ uid: UID, at: NOW - 1000 }, NOW, null) === false, 'no signed-in user means no grace');
ok(graceIsValid({ uid: UID, at: NOW + 60_000 }, NOW, UID) === false, 'a timestamp in the future is refused, not trusted');
ok(graceIsValid(null, NOW, UID) === false, 'nothing stored means the gate is shown');
ok(graceIsValid({ uid: UID }, NOW, UID) === false, 'a record with no timestamp is refused');
ok(graceIsValid({ uid: UID, at: '999' }, NOW, UID) === false, 'a string timestamp is refused, never coerced');

console.log(`vaultGrace: ${n} passed, 0 failed`);
