/* Merging the notification streams.

   Notifications used to arrive as ONE query for the whole collection, filtered in the client.
   That billed every document in the collection to show a handful. They now arrive as one
   query per way this user can be addressed — as ADMIN, and as themselves — which means the
   merge, the de-duplication and the time cut all move here.

   This is worth testing on its own because the failure is silent and expensive: a dropped
   notification is a missed HQ geofence-bypass approval, and the salesman just stands outside
   the shop waiting for something that already happened. */

export const notifMs = (n) => {
    const t = n?.timestamp;
    if (!t) return 0;
    if (typeof t.seconds === 'number') return t.seconds * 1000;
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (t instanceof Date) return t.getTime();
    return 0;
};

/* buckets: one array per query. cutoffMs: drop anything older. */
export function mergeNotifications(buckets = [], cutoffMs = 0) {
    const seen = new Set();
    const merged = [];

    for (const bucket of buckets) {
        for (const n of bucket || []) {
            if (!n || !n.id || seen.has(n.id)) continue;   // an admin matches both queries
            seen.add(n.id);
            merged.push(n);
        }
    }

    /* A notification with no timestamp is kept, never dropped. serverTimestamp() resolves a
       beat after the write, so the newest one - the one that matters most - is exactly the
       one most likely to arrive without a time yet. Sorting it to the top is correct: it is
       the most recent thing that exists. */
    return merged
        .filter(n => !n.timestamp || notifMs(n) >= cutoffMs)
        .sort((a, b) => {
            const am = a.timestamp ? notifMs(a) : Infinity;
            const bm = b.timestamp ? notifMs(b) : Infinity;
            return bm - am;
        });
}
