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
export function nextStop(customers = [], agentLocation = null, agentName = '', now = new Date()) {
    if (!agentLocation?.latitude || !agentLocation?.longitude) return null;

    const today = now.toLocaleDateString('en-CA');   // local, not UTC — see dayStats
    const open = [];

    for (const c of customers) {
        if (!c?.latitude || !c?.longitude) continue;      // cannot navigate to it
        if (c.status === 'PENDING') continue;             // quarantined, same as everywhere else
        if (c.lastVisit === today) continue;              // already done today
        if (!mine(c, agentName)) continue;                // someone else's territory
        open.push({
            customer: c,
            metres: Math.round(km(agentLocation.latitude, agentLocation.longitude, c.latitude, c.longitude) * 1000),
        });
    }

    if (!open.length) return null;
    open.sort((a, b) => a.metres - b.metres);

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
