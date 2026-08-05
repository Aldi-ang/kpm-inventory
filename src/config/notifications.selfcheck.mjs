/* Self-check for the notification merge.
   Run: node src/config/notifications.selfcheck.mjs

   Notifications moved from one collection-wide query filtered in the client, to one query
   per way a user can be addressed. The failure this guards is silent and expensive: a
   dropped notification is a missed HQ geofence-bypass approval, and the salesman stands
   outside the shop waiting for something that already happened. */
import assert from 'node:assert';
import { mergeNotifications, notifMs } from '../utils/notifications.js';

const S = (sec) => ({ seconds: sec });
const now = 1_000_000;
const cutoff = (now - 7 * 86400) * 1000;

/* 1. an admin matches BOTH queries — the same notification must appear once, not twice */
const both = [
  [{ id: 'a', timestamp: S(now), targetRole: 'ADMIN' }],
  [{ id: 'a', timestamp: S(now), targetId: 'me' }],
];
assert.equal(mergeNotifications(both, cutoff).length, 1, 'admin must not see a duplicate');

/* 2. both streams are represented, newest first */
const two = [
  [{ id: 'old', timestamp: S(now - 100) }],
  [{ id: 'new', timestamp: S(now) }],
];
assert.deepEqual(mergeNotifications(two, cutoff).map(n => n.id), ['new', 'old']);

/* 3. anything past the cut is dropped, anything inside is kept */
const spanning = [[
  { id: 'inside',  timestamp: S(now - 86400) },
  { id: 'outside', timestamp: S(now - 30 * 86400) },
]];
assert.deepEqual(mergeNotifications(spanning, cutoff).map(n => n.id), ['inside']);

/* 4. THE ONE THAT MATTERS: a serverTimestamp() that has not resolved yet has no timestamp.
      That is the NEWEST notification - the one just written, the approval being waited on -
      so it must be kept and sorted to the top, never silently dropped by the time filter. */
const pending = [[
  { id: 'settled', timestamp: S(now - 60) },
  { id: 'pending', timestamp: null },
]];
const out = mergeNotifications(pending, cutoff);
assert.deepEqual(out.map(n => n.id), ['pending', 'settled'],
  'an unresolved serverTimestamp must sort to the top, not vanish');

/* 5. empty and malformed inputs must not throw — a listener error mid-flight hands us junk */
assert.deepEqual(mergeNotifications([], cutoff), []);
assert.deepEqual(mergeNotifications([[], []], cutoff), []);
assert.deepEqual(mergeNotifications([[null, undefined, { noId: true }]], cutoff), []);
assert.deepEqual(mergeNotifications(undefined, cutoff), []);

/* 6. the three timestamp shapes Firestore really produces */
assert.equal(notifMs({ timestamp: S(5) }), 5000);
assert.equal(notifMs({ timestamp: { toMillis: () => 5000 } }), 5000);
assert.equal(notifMs({ timestamp: new Date(5000) }), 5000);
assert.equal(notifMs({}), 0);

console.log('notifications self-check: 6/6 pass');
