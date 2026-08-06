/* Where he goes next.

   Computed here, from data the terminal already holds — his GPS fix, the customer list, and
   who each store is assigned to. No journey-plan props are needed, which is what makes this
   cheap: the answer is already in the room, it was simply never asked for.

   The rule is the same one the terminal already enforces when he picks a customer by hand:
   his own stores and unclaimed ones are fair game, another agent's are not. Suggesting a
   teammate's store as "next" would push him into exactly the territory override the app
   warns about. */

const km = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const mine = (cust, agentName) => {
    const a = String(cust?.assignedAgent || '').trim();
    if (!a || a.toLowerCase() === 'unassigned') return true;      // unclaimed is fair game
    const me = String(agentName || '').trim().toLowerCase();
    if (!me) return false;
    const his = a.toLowerCase();
    return me.includes(his) || his.includes(me);                   // same loose match the picker uses
};

/* Returns the nearest unvisited store he is allowed to sell to, plus how many are left.
   null when there is nothing to suggest — no fix yet, or the round is done. */
/* THIS WEEK, not today. The round is weekly, so a store called on Tuesday should not be
   offered again on Thursday just because "today" is a different day — that would walk him
   in circles round the three nearest shops and never reach the far end of his territory. */
const VISIT_CYCLE_DAYS = 7;

const visitedWithinCycle = (cust, now) => {
    if (!cust?.lastVisit) return false;
    const seen = new Date(`${cust.lastVisit}T00:00:00`);
    if (Number.isNaN(seen.getTime())) return false;       // unparseable date is not a visit
    const days = (now - seen) / 86400000;
    return days >= 0 && days < VISIT_CYCLE_DAYS;
};

export function nextStop(customers = [], agentLocation = null, agentName = '', now = new Date()) {
    if (!agentLocation?.latitude || !agentLocation?.longitude) return null;

    const open = [];

    for (const c of customers) {
        if (!c?.latitude || !c?.longitude) continue;      // cannot navigate to it
        if (c.status === 'PENDING') continue;             // quarantined, same as everywhere else
        if (visitedWithinCycle(c, now)) continue;         // done this cycle
        if (!mine(c, agentName)) continue;                // someone else's territory
        open.push({
            customer: c,
            metres: Math.round(km(agentLocation.latitude, agentLocation.longitude, c.latitude, c.longitude) * 1000),
            assigned: !!String(c.assignedAgent || '').trim() &&
                      String(c.assignedAgent).trim().toLowerCase() !== 'unassigned',
        });
    }

    if (!open.length) return null;

    /* HIS OWN STORES FIRST, then by distance. An unclaimed shop 200m away is not a better
       next stop than the one he is actually responsible for 800m away — his round is a list
       of obligations, and proximity only orders them, it does not outrank them. */
    open.sort((a, b) => (b.assigned - a.assigned) || (a.metres - b.metres));

    return { ...open[0], remaining: open.length };
}

/* The same URL MapMissionControl :1266 already uses. Coordinates when we have them, the
   address as a fallback — a maps app can find "Warung Bu Sari, Bekasi" but not an empty
   string, so the fallback is worth having. */
export function directionsUrl(cust) {
    if (cust?.latitude && cust?.longitude) {
        return `https://www.google.com/maps/dir/?api=1&destination=${cust.latitude},${cust.longitude}`;
    }
    const where = [cust?.address, cust?.name].filter(Boolean).join(' ');
    return where ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(where)}` : null;
}

export const metresLabel = (m) =>
    m == null ? '' : m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
