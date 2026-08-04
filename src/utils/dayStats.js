/* What the sales terminal's rail shows when nothing is hovered: how the day is going, and
   how it compares to yesterday.

   The comparison is against the SAME TIME yesterday, not yesterday's finished total.
   Comparing a half-run Tuesday to a completed Monday would flatter every morning and
   punish every afternoon, and a salesman would learn to ignore it inside a week.

   The day boundary is LOCAL midnight, deliberately not helpers.getCurrentDate(). That
   helper is UTC, and WIB is UTC+7, so a UTC day boundary rolls over at 07:00 local —
   right in the middle of a morning route. The comment on getCurrentDate says as much. */

/* Firestore hands back a Timestamp, the offline queue writes a plain {seconds}, and a
   serverTimestamp() that has not resolved yet is null. Handle all three rather than
   assuming, because the offline path is the one that is hardest to notice breaking. */
export const txSeconds = (tx) => {
  const t = tx?.timestamp;
  if (!t) return null;
  if (typeof t.seconds === 'number') return t.seconds;
  if (typeof t.toMillis === 'function') return Math.floor(t.toMillis() / 1000);
  if (t instanceof Date) return Math.floor(t.getTime() / 1000);
  return null;
};

export function dayStats(transactions = [], now = new Date()) {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);

  const dayStart = Math.floor(midnight.getTime() / 1000);
  const secondsIn = Math.floor(now.getTime() / 1000) - dayStart;
  const prevStart = dayStart - 86400;
  const prevCutoff = prevStart + secondsIn;      // the same clock time, one day back

  let today = 0;
  let yesterday = 0;
  const storesToday = new Set();
  const storesYesterday = new Set();
  let last = null;
  let lastAt = -1;

  for (const tx of transactions) {
    const s = txSeconds(tx);
    if (s == null) continue;
    /* Returns carry a negative total, so summing everything nets refunds out of the day's
       takings — which is what "taken" honestly means for a man counting his cash box. */
    const total = Number(tx.total) || 0;

    if (s >= dayStart) {
      today += total;
      if (tx.customerName) storesToday.add(tx.customerName);
      if (s > lastAt) { lastAt = s; last = tx; }
    } else if (s >= prevStart && s <= prevCutoff) {
      yesterday += total;
      if (tx.customerName) storesYesterday.add(tx.customerName);
    }
  }

  /* null, not 0 or Infinity, when there is nothing to compare against. A "+0%" on a day
     with no history reads as "flat" when the truth is "unknown", and the rail says so. */
  const pct = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : null;

  return {
    today,
    yesterday,
    pct,
    stores: storesToday.size,
    storesYesterday: storesYesterday.size,
    storesDelta: storesToday.size - storesYesterday.size,
    last,
    lastAt: lastAt >= 0 ? lastAt : null,
  };
}

/* "18 min ago" beats a timestamp here: the salesman wants elapsed time, not a clock read. */
export function agoLabel(seconds, now = new Date()) {
  if (seconds == null) return '';
  const mins = Math.max(0, Math.floor((Math.floor(now.getTime() / 1000) - seconds) / 60));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`;
}
