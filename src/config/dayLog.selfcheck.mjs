/* Self-check for the Day Log - the record the Day Replay plays (src/utils/dayLog.js).
   Run: node src/config/dayLog.selfcheck.mjs

   Getting this wrong does not throw: it shows the boss a day that did not happen - another man's report
   under this man's name, an undone report still standing, a shop cut in half at its own " - ". */
import assert from 'node:assert';
import fs from 'node:fs';
import { dayLog, readReport, replayTimeline, VISIT_TAGS, SCENE } from '../utils/dayLog.js';

const DAY = '2026-10-05';
const at = (h, m) => ({ seconds: Math.floor(new Date(2026, 9, 5, h, m).getTime() / 1000) });
const shop = (id, name, lat = -7.58, lng = 110.29) => ({ id, name, latitude: lat, longitude: lng });
const customers = [shop('c1', 'Toko Berkah Jaya'), shop('c2', 'Warung A - B', -7.59), shop('c3', 'Toko Makmur', -7.6), shop('c4', 'Warung Pojok', 0, 0)];
const man = { id: 'm2', name: 'Budi Santoso', email: 'Budi@kpm.id', pathHistory: [{ lat: -7.57, lng: 110.28, timestamp: new Date(2026, 9, 5, 7, 45).toISOString() }] };

/* 1. the sentence: cut on the KNOWN tag, so a shop with its own " - " and a note with its own ": " both survive */
assert.deepEqual(readReport('Visited Warung A - B - Stock Full (No Order) 🛑: masih 6: slop'), { shop: 'Warung A - B', tag: 'Stock Full (No Order) 🛑', note: 'masih 6: slop' });
assert.equal(readReport('Visited Toko X - Something Else: hi'), null, 'an unknown tag is not guessed');
assert.equal(readReport('Undid visit for Toko X'), null);

const logs = [
  /* an old entry (sentence only), his by email - case and spaces do not matter */
  { action: 'VISIT_REPORT', details: 'Visited Warung A - B - Stock Full (No Order) 🛑: masih 6 slop', user: ' budi@kpm.id', timestamp: at(8, 41) },
  /* a new entry: fields win, so a renamed shop still finds its pin by id */
  { action: 'VISIT_REPORT', details: 'Visited Toko Makmur Lama - New Request 📝: minta menthol', storeId: 'c3', tag: 'New Request 📝', agentId: 'm2', user: 'budi@kpm.id', timestamp: at(9, 30) },
  /* reported, undone, reported again: only the second stands */
  { action: 'VISIT_REPORT', details: 'Visited Toko Berkah Jaya - Competitor Issue ⚠️: promo', user: 'budi@kpm.id', timestamp: at(10, 0) },
  { action: 'VISIT_UNDO', details: 'Undid visit for Toko Berkah Jaya', user: 'budi@kpm.id', timestamp: at(10, 2) },
  { action: 'VISIT_REPORT', details: 'Visited Toko Berkah Jaya - Repeat Order 📦: kamis', user: 'budi@kpm.id', timestamp: at(10, 5) },
  /* not his: another man's report (by email) and one whose agentId is someone else even though the email matches */
  { action: 'VISIT_REPORT', details: 'Visited Toko Makmur - Store Closed 🔒: tutup', user: 'ari@kpm.id', timestamp: at(9, 0) },
  { action: 'VISIT_REPORT', details: 'Visited Toko Makmur - Store Closed 🔒: tutup', agentId: 'm5', user: 'budi@kpm.id', timestamp: at(9, 1) },
  /* unreadable: counted, never guessed */
  { action: 'VISIT_REPORT', details: 'Visited Toko Makmur - Mystery: ?', user: 'budi@kpm.id', timestamp: at(9, 2) },
  /* not a visit at all */
  { action: 'GPS_PIN_DRAGGED', details: 'x', user: 'budi@kpm.id', timestamp: at(9, 3) },
];
const transactions = [
  { customerName: 'Toko Berkah Jaya', agentId: 'm2', type: 'SALE', total: 250000, timestamp: at(8, 12) },
  { customerName: 'toko makmur', agentId: 'm2', type: 'RETUR', total: 0, timestamp: at(9, 5) },
  { customerName: 'Toko Berkah Jaya', agentId: 'm5', type: 'SALE', total: 1, timestamp: at(8, 30) },        // another man's
  { customerName: 'Toko Berkah Jaya', agentId: 'm2', type: 'SALE', total: 1, timestamp: { seconds: at(8, 12).seconds - 86400 } },   // yesterday
  { customerName: 'Warung Pojok', agentId: 'm2', type: 'CONSIGNMENT_PAYMENT', total: 9, timestamp: at(9, 50) },   // not a visit kind
];
const d = dayLog({ man, day: DAY, transactions, logs, customers });

/* 2. the day, in order, his only */
assert.deepEqual(d.events.map((e) => `${e.time} ${e.kind} ${e.name}`), [
  '08:12 sold Toko Berkah Jaya',
  '08:41 full Warung A - B',
  '09:05 swap Toko Makmur',
  '09:30 request Toko Makmur',
  '10:05 order Toko Berkah Jaya',
]);
assert.equal(d.skipped, 1, 'the one unreadable report is counted, so the screen can say so');
assert.equal(d.events[1].note, 'masih 6 slop');
assert.equal(d.events[3].lat, -7.6, 'the renamed shop found its pin by storeId');
assert.equal(d.events[0].tx.total, 250000, 'a sale carries its record (the receipt reads it)');

/* 3. the start: his first position that day; a first position AFTER his first stop is not the start */
assert.equal(d.start.time, '07:45');
assert.equal(dayLog({ man: { ...man, pathHistory: [{ lat: 1, lng: 1, timestamp: new Date(2026, 9, 5, 11, 0).toISOString() }] }, day: DAY, transactions, logs, customers }).start, null);
assert.equal(dayLog({ man, day: '2026-10-04', transactions, logs: [], customers }).start, null, "yesterday's day has no start point");

/* 4. the clock: one function of t - scenes hold, walks follow the gap, scrubbing back is a pure read */
const stops = [d.start, ...d.events.filter((e) => e.lat)];
const tl = replayTimeline(stops);
assert.equal(tl.segs.filter((s) => s.kind === 'scene').length, stops.length - 1);
const sc = tl.sceneSeg(1);
assert.equal(sc.t1 - sc.t0, SCENE);
assert.equal(tl.clockAt(sc.t0 + 500), tl.T[1], 'the clock stands still while a scene plays');
assert.equal(tl.tAtClock(tl.T[2]), tl.sceneSeg(2).t0, 'a time on the timeline lands on that stop');
assert.equal(tl.curAt(tl.sceneSeg(2).t0 - 1), 1, 'walking towards stop 2 = still under stop 1');
assert.equal(tl.curAt(0), 0);
assert.ok(tl.day0 <= tl.T[0] && tl.day1 >= tl.T[tl.T.length - 1]);
/* drag the timeline to the clock shown at any moment = back at that clock (a stop snaps within 1 minute of it) */
for (let t = 0; t < tl.total; t += 97) assert.ok(Math.abs(tl.clockAt(tl.tAtClock(tl.clockAt(t))) - tl.clockAt(t)) <= 1, `clock round trip at t=${t}`);

/* 5. the tag list is the form's: a tag added to the Visit Report and not here would be read as nothing */
const jv = fs.readFileSync(new URL('../JourneyView.jsx', import.meta.url), 'utf8');
const quick = JSON.parse(jv.match(/const QUICK_TAGS = (\[[^\]]*\])/)[1]);
assert.deepEqual(['Routine Check', ...quick], VISIT_TAGS);
assert.ok(/useState\("Routine Check"\)/.test(jv), "the form's default tag is Routine Check");

console.log('dayLog selfcheck: all pass');
