/* Finds stores that are probably the same shop recorded twice.

   Why this exists: `handleImportKML` in CustomerManager mints a fresh auto-ID document for every
   placemark with no dedup check of any kind, so importing one KML twice duplicates every pin in
   it. Three separate NOO paths also create stores with fresh auto-IDs and no existence check.
   Nothing in the app has ever been able to SHOW Aldi the result.

   This module only reports. It never writes, deletes or merges — deciding which copy keeps its
   sales history and its outstanding debt is a human judgement about real money, and it is
   deliberately not automated here.

   Pure functions on purpose: no React, no Firestore. That is what lets findDuplicates.selfcheck.mjs
   run the real logic against fixtures instead of trusting it by eye. */

/* Two stores count as the same shop if their names match once punctuation and spacing stop
   mattering, OR if they sit close enough together to be one building. Either is enough, because
   the two failure modes are different: a re-imported KML repeats the name exactly, while a
   salesman re-registering a store he could not find usually retypes the name slightly wrong. */
export const normaliseName = (name) =>
    String(name ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

/* Metres between two points. A fourth copy of haversine in this codebase — MerchantSalesView,
   nextStop.js and MapMissionControl each keep a private one. Not consolidated here because that
   would mean editing three working files for a feature that does not need them touched.
   ponytail: fold all four into utils/helpers.js the next time one of those files is open anyway. */
export const metresBetween = (aLat, aLng, bLat, bLng) => {
    const R = 6371e3;
    const φ1 = aLat * Math.PI / 180;
    const φ2 = bLat * Math.PI / 180;
    const dφ = (bLat - aLat) * Math.PI / 180;
    const dλ = (bLng - aLng) * Math.PI / 180;
    const h = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const hasCoords = (c) => Number.isFinite(Number(c?.latitude)) && Number.isFinite(Number(c?.longitude));

/* A stable name for one group, so a "these are not duplicates" decision can be remembered and
   the same false positive stops being re-reviewed on every scan. Sorted, so it does not depend
   on the order members happen to come back in.

   Membership is deliberately part of the key: if a THIRD store later joins a pair he already
   cleared, the key changes and the group returns for a fresh look. That is correct — the new
   store is new information, and silently swallowing it would hide a real duplicate behind an
   old decision. */
export const groupKey = (group) =>
    (group?.members ?? []).map(m => String(m?.id ?? '')).sort().join('|');

/* Beyond this, two shops sharing a name are almost certainly two different shops. A genuine
   double-registration lands within metres of itself — the same salesman, standing in the same
   doorway, filing twice. 500m is already far past that. */
export const FAR_APART_METRES = 500;

/* Oldest-first, so the UI can suggest "this is probably the original" without deciding anything.
   The three creation paths stamp different fields, and KML/engine writes land as Firestore
   Timestamps rather than strings, so all three shapes have to be understood here. */
export const createdMillis = (c) => {
    const raw = c?.createdAt ?? c?.mappedAt;
    if (!raw) return null;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') { const t = Date.parse(raw); return Number.isNaN(t) ? null : t; }
    if (typeof raw?.seconds === 'number') return raw.seconds * 1000;          // Firestore Timestamp
    if (typeof raw?.toMillis === 'function') { try { return raw.toMillis(); } catch { return null; } }
    return null;
};

/**
 * @param {Array} customers  the live customer list
 * @param {{radiusMetres?: number}} opts
 * @returns {Array<{reason:'name'|'location'|'both', members:Array, widestMetres:number|null}>}
 *          groups of 2+ stores, largest group first. Never mutates the input.
 */
export function findDuplicates(customers, { radiusMetres = 40 } = {}) {
    const list = Array.isArray(customers) ? customers.filter(Boolean) : [];
    if (list.length < 2) return [];

    // union-find, so A~B by name and B~C by distance puts all three in one group
    const parent = list.map((_, i) => i);
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[rb] = ra; };
    const why = new Map();                        // root -> Set of reasons, merged as groups join
    const note = (i, reason) => {
        const r = find(i);
        if (!why.has(r)) why.set(r, new Set());
        why.get(r).add(reason);
    };

    // pass 1: identical normalised name. Blank names are never grounds for a match.
    const byName = new Map();
    list.forEach((c, i) => {
        const key = normaliseName(c.name);
        if (!key) return;
        if (byName.has(key)) { union(byName.get(key), i); note(i, 'name'); }
        else byName.set(key, i);
    });

    /* pass 2: close enough to be one building.
       ponytail: plain O(n^2) over stores that have coordinates. At a few thousand stores this is
       a few million cheap comparisons and runs in well under a second on a phone. Grid-bucket by
       rounded lat/lng if the customer list ever reaches five figures. */
    const located = list.map((c, i) => ({ c, i })).filter(({ c }) => hasCoords(c));
    for (let a = 0; a < located.length; a++) {
        for (let b = a + 1; b < located.length; b++) {
            const A = located[a], B = located[b];
            if (find(A.i) === find(B.i) && why.get(find(A.i))?.has('location')) continue;
            const d = metresBetween(Number(A.c.latitude), Number(A.c.longitude),
                                    Number(B.c.latitude), Number(B.c.longitude));
            if (d <= radiusMetres) { union(A.i, B.i); note(A.i, 'location'); }
        }
    }

    const groups = new Map();
    list.forEach((c, i) => {
        const r = find(i);
        if (!groups.has(r)) groups.set(r, []);
        groups.get(r).push(c);
    });

    const out = [];
    for (const [root, members] of groups) {
        if (members.length < 2) continue;
        const reasons = why.get(root) ?? new Set();
        const withCoords = members.filter(hasCoords);
        let widest = null;
        for (let a = 0; a < withCoords.length; a++) {
            for (let b = a + 1; b < withCoords.length; b++) {
                const d = metresBetween(Number(withCoords[a].latitude), Number(withCoords[a].longitude),
                                        Number(withCoords[b].latitude), Number(withCoords[b].longitude));
                if (widest === null || d > widest) widest = d;
            }
        }
        const sorted = [...members].sort((x, y) => {
            const mx = createdMillis(x), my = createdMillis(y);
            if (mx === null && my === null) return 0;
            if (mx === null) return 1;                 // undated sinks below dated
            if (my === null) return -1;
            return mx - my;                            // oldest first = probably the original
        });
        const reason = reasons.size === 2 ? 'both' : (reasons.values().next().value ?? 'name');
        const widestM = widest === null ? null : Math.round(widest);

        /* Distance of each copy from the oldest one, so the odd one out is visible at a glance
           instead of hidden inside a single "widest" number. Index-aligned with `members`. */
        const first = sorted.find(hasCoords);
        const distances = sorted.map(m => (hasCoords(m) && first)
            ? Math.round(metresBetween(Number(first.latitude), Number(first.longitude),
                                       Number(m.latitude), Number(m.longitude)))
            : null);

        /* THE FALSE-POSITIVE GUARD. Indonesian shop names repeat constantly — "warung sembako
           sumber rejeki" is about as distinctive as "corner shop". Three of those 14.5km apart
           are three real shops, not one shop recorded three times. Matching on name alone across
           that kind of distance is a coincidence, and presenting it as a duplicate is how someone
           ends up deleting a live store. The report must say so on the group itself. */
        out.push({
            reason,
            members: sorted,
            widestMetres: widestM,
            distances,
            sameNameFarApart: reason === 'name' && widestM !== null && widestM > FAR_APART_METRES,
        });
    }

    /* Likely-real duplicates first, coincidental name collisions last. He should not have to
       scroll past three unrelated warungs to reach the pair that actually is one shop twice. */
    return out.sort((a, b) =>
        (a.sameNameFarApart ? 1 : 0) - (b.sameNameFarApart ? 1 : 0) ||
        b.members.length - a.members.length);
}
