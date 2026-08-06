/* Self-check for "where he goes next".
   Run: node src/config/nextStop.selfcheck.mjs

   This one sends a man driving. Getting it wrong does not throw an error — it quietly sends
   him to a store a teammate already covered, or past the one he should have stopped at. */
import assert from 'node:assert';
import { nextStop, directionsUrl, metresLabel } from '../utils/nextStop.js';

const HERE = { latitude: -6.2000, longitude: 106.8000 };
const NOW = new Date(2026, 7, 6, 10, 0, 0, 0);
const today = NOW.toLocaleDateString('en-CA');

/* roughly 1km north per 0.009 degrees of latitude */
const store = (name, dLat, extra = {}) => ({
  id: name, name,
  latitude: HERE.latitude + dLat, longitude: HERE.longitude,
  assignedAgent: 'Ali', ...extra,
});

const near = store('Near', 0.009);        // ~1 km
const far  = store('Far',  0.045);        // ~5 km

/* 1. the nearest allowed store wins, and the count is of what is LEFT to do */
const r1 = nextStop([far, near], HERE, 'Ali', NOW);
assert.equal(r1.customer.name, 'Near');
assert.equal(r1.remaining, 2);
assert.ok(r1.metres > 900 && r1.metres < 1100, `expected ~1000m, got ${r1.metres}`);

/* 2. a store already visited today is not "next" */
const done = store('Done', 0.001, { lastVisit: today });
assert.equal(nextStop([done, near], HERE, 'Ali', NOW).customer.name, 'Near',
  'a store visited today must not be suggested again');

/* 3. TERRITORY. Another agent's store is never suggested — that would push him into the
      override the app warns about. Unclaimed stores ARE fair game. */
const theirs = store('Theirs', 0.001, { assignedAgent: 'Budi' });
assert.equal(nextStop([theirs, near], HERE, 'Ali', NOW).customer.name, 'Near');
const free = store('Free', 0.001, { assignedAgent: 'Unassigned' });
assert.equal(nextStop([free, near], HERE, 'Ali', NOW).customer.name, 'Free');
const blank = store('Blank', 0.001, { assignedAgent: '' });
assert.equal(nextStop([blank, near], HERE, 'Ali', NOW).customer.name, 'Blank');
/* the loose match the customer picker already uses, so both agree on who owns what */
assert.equal(nextStop([store('Mine', 0.001, { assignedAgent: 'ali' })], HERE, 'Ali Kurniawan', NOW)
  .customer.name, 'Mine');

/* 4. unusable or quarantined records are skipped rather than crashing */
const noCoords = { id: 'x', name: 'No Coords', assignedAgent: 'Ali' };
const pending  = store('Pending', 0.001, { status: 'PENDING' });
assert.equal(nextStop([noCoords, pending, near], HERE, 'Ali', NOW).customer.name, 'Near');
assert.equal(nextStop([noCoords, pending], HERE, 'Ali', NOW), null);

/* 5. null, not a guess, when there is nothing to say. No GPS fix means no distances, and a
      finished round means nothing is left — both must be silent rather than wrong. */
assert.equal(nextStop([near], null, 'Ali', NOW), null, 'no fix -> no suggestion');
assert.equal(nextStop([near], { latitude: 0 }, 'Ali', NOW), null, 'half a fix is no fix');
assert.equal(nextStop([], HERE, 'Ali', NOW), null);
assert.equal(nextStop([done], HERE, 'Ali', NOW), null, 'round finished -> nothing next');

/* 6. directions: coordinates when we have them, the address when we do not */
assert.equal(directionsUrl({ latitude: -6.2, longitude: 106.8 }),
  'https://www.google.com/maps/dir/?api=1&destination=-6.2,106.8');
assert.ok(directionsUrl({ name: 'Warung Bu Sari', address: 'Bekasi' })
  .includes('Warung%20Bu%20Sari'));
assert.equal(directionsUrl({}), null, 'nothing to navigate to must be null, not a broken link');

/* 7. metres read as a salesman would say them */
assert.equal(metresLabel(240), '240 m');
assert.equal(metresLabel(1200), '1.2 km');
assert.equal(metresLabel(null), '');

console.log('next-stop self-check: 7/7 pass');
