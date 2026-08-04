/* Self-check for the rail's day figures.
   Run: node src/config/dayStats.selfcheck.mjs

   These numbers get glanced at, not audited, so a wrong one is believed. The two that
   actually bite are the local-vs-UTC day boundary (WIB is UTC+7, so a UTC boundary rolls
   over at 07:00 local, mid-route) and the same-time-yesterday window. */
import assert from 'node:assert';
import { dayStats, txSeconds, agoLabel } from '../utils/dayStats.js';

const at = (d, h, m = 0) => {
  const x = new Date(2026, 7, d, h, m, 0, 0);        // local time, month is 0-based -> August
  return Math.floor(x.getTime() / 1000);
};
const tx = (seconds, total, customerName = 'Warung A', extra = {}) =>
  ({ timestamp: { seconds }, total, customerName, ...extra });

const NOW = new Date(2026, 7, 5, 19, 0, 0, 0);       // 5 Aug 2026, 7pm local

/* 1. today sums only today; yesterday sums only up to the SAME clock time */
const rows = [
  tx(at(5, 9),  100000, 'Bu Sari'),
  tx(at(5, 14), 200000, 'Pak Budi'),
  tx(at(5, 18), 300000, 'Bu Sari'),        // same store twice -> one store
  tx(at(4, 9),  150000, 'Bu Sari'),        // yesterday, inside the window
  tx(at(4, 18), 250000, 'Pak Budi'),       // yesterday, inside the window
  tx(at(4, 21), 999999, 'Pak Budi'),       // yesterday AFTER 7pm -> must be excluded
  tx(at(3, 12), 888888, 'Pak Budi'),       // two days ago -> excluded entirely
];
const s = dayStats(rows, NOW);
assert.equal(s.today, 600000);
assert.equal(s.yesterday, 400000, 'the 9pm sale must not count against a 7pm comparison');
assert.equal(s.pct, 50);
assert.equal(s.stores, 2, 'the same customer twice is one store');
assert.equal(s.storesYesterday, 2);
assert.equal(s.storesDelta, 0);

/* 2. the last sale is the latest by time, not the last in the array */
const shuffled = [tx(at(5, 18), 300000, 'Bu Sari'), tx(at(5, 9), 100000, 'Pak Budi')];
assert.equal(dayStats(shuffled, NOW).last.customerName, 'Bu Sari');

/* 3. a return nets out of the day's takings rather than inflating it */
const withReturn = [tx(at(5, 9), 500000), tx(at(5, 10), -120000, 'Bu Sari', { type: 'RETURN' })];
assert.equal(dayStats(withReturn, NOW).today, 380000);

/* 4. no yesterday to compare -> null, NOT 0. "+0%" reads as flat when the truth is
      unknown, and that is the difference between informing and misleading. */
assert.equal(dayStats([tx(at(5, 9), 100000)], NOW).pct, null);
assert.equal(dayStats([], NOW).pct, null);
assert.equal(dayStats([], NOW).today, 0);

/* 5. the day boundary is LOCAL midnight. A sale at 00:30 local on the 5th belongs to the
      5th; under helpers.getCurrentDate()'s UTC boundary it would land on the 4th, because
      WIB is UTC+7 and the UTC day has not turned over yet. */
const justAfterLocalMidnight = dayStats([tx(at(5, 0, 30), 70000)], NOW);
assert.equal(justAfterLocalMidnight.today, 70000, 'a 00:30 local sale is today');
const justBeforeLocalMidnight = dayStats([tx(at(4, 23, 30), 70000)], NOW);
assert.equal(justBeforeLocalMidnight.today, 0, 'a 23:30 sale yesterday is not today');

/* 6. the three timestamp shapes the app really produces */
assert.equal(txSeconds({ timestamp: { seconds: 42 } }), 42);              // offline queue
assert.equal(txSeconds({ timestamp: { toMillis: () => 42000 } }), 42);    // Firestore
assert.equal(txSeconds({ timestamp: new Date(42000) }), 42);              // plain Date
assert.equal(txSeconds({ timestamp: null }), null);                       // unresolved
assert.equal(txSeconds({}), null);
// an unresolved serverTimestamp must be skipped, never counted as epoch zero
assert.equal(dayStats([{ timestamp: null, total: 999 }], NOW).today, 0);

/* 7. elapsed time reads as elapsed time */
assert.equal(agoLabel(Math.floor(NOW.getTime() / 1000) - 30, NOW), 'just now');
assert.equal(agoLabel(Math.floor(NOW.getTime() / 1000) - 18 * 60, NOW), '18 min ago');
assert.equal(agoLabel(Math.floor(NOW.getTime() / 1000) - 60 * 60, NOW), '1 hour ago');
assert.equal(agoLabel(Math.floor(NOW.getTime() / 1000) - 3 * 3600, NOW), '3 hours ago');
assert.equal(agoLabel(null), '');

console.log('day-stats self-check: 7/7 pass');
