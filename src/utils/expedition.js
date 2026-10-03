/* THE EXPEDITION: where each salesman was last seen, where he has been today, where he goes next.

   Built only from what the app already holds - nothing new is written:
   - LAST SEEN = motorists/{id}.currentLocation, stamped on every sale and every app open (the
     telemetry effect in App.jsx). A phone sends nothing while it is locked, so this is always
     "last seen N min ago", never a live dot.
   - TODAY'S TRAIL = his SALES today, in order, at each shop's saved pin. Not pathHistory: that field
     grows forever and nothing bounds it (A-Brain Brainstorm/2026-10-02_expedition-map.md); the sales
     are already in memory.
   - TODAY'S ROUND = his own shops due today, the rule Journey Plan uses (JourneyView.jsx: visitFreq 7
     = every day, else visitDay = today's weekday).
   - NEXT = the nearest shop of that round he has not sold to yet. No round set for today -> the
     terminal's own suggestion, nextStop() over his whole list. */
import { km, nextStop } from './nextStop.js';
import { isSale } from './salesRollup.js';
import { storeKey, getLocalDayKey } from './helpers.js';
import { txDate } from './period.js';
import { normalizeRegion } from '../config/permissions.js';

/* WHO SEES WHOM (his A, 2026-10-02: "team member only can see other team member within the same regional
   group"). The boss's tiers see the whole company; everyone else sees his own region's salesmen only - decided
   by the same Reporting Authority switch the Reports screen reads (HistoryReportView.jsx). A viewer below global
   whose own region is unknown sees nobody, never everybody: fail closed, like Reports. */
export const visibleTeam = (motorists = [], { global, viewerId }) => {
    if (global) return motorists;
    const me = motorists.find((m) => m.id === viewerId);
    if (!me?.location) return [];
    const mine = normalizeRegion(me.location);
    return motorists.filter((m) => normalizeRegion(m.location) === mine);
};

const AT_SHOP_M = 150;      // his last point this close to his last sale = still at that shop...
const AT_SHOP_MIN = 10;     // ...but only while that point is this fresh
/* ON THE MAP only while his position is this fresh (his "there should be no data for their location right now
   because they are offline and not working", 2026-10-03 20:00): a phone sends a point only with a sale or an app
   open, so an old point is where he WAS - seven salesmen stood all evening where they opened the app that morning */
export const LIVE_MIN = 120;

const metres = (a, b) => Math.round(km(a.lat, a.lng, b.lat, b.lng) * 1000);
const pin = (c) => (c?.latitude && c?.longitude ? { lat: Number(c.latitude), lng: Number(c.longitude) } : null);
export const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/* exact name, not nextStop's loose `includes`: "andi" must not claim Andika's round (the ghost bug
   JourneyView.jsx records, 2026-09-22) */
const his = (c, name) => {
    const a = String(c?.assignedAgent || '').trim().toLowerCase();
    return !!a && a !== 'unassigned' && a === String(name || '').trim().toLowerCase();
};

export function expedition(motorists = [], customers = [], transactions = [], now = new Date()) {
    const today = getLocalDayKey(now);
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
    const byKey = new Map(customers.map((c) => [storeKey(c.name), c]));

    return motorists
        .filter((m) => m?.id && m.id !== 'master_owner' && m.currentLocation?.lat)   // the boss's own pings are not a salesman
        .map((m) => {
            const at = { lat: Number(m.currentLocation.lat), lng: Number(m.currentLocation.lng) };
            const seenAt = m.currentLocation.timestamp ? new Date(m.currentLocation.timestamp) : null;
            const seen = !!seenAt && !Number.isNaN(seenAt.getTime());
            const out = seen && getLocalDayKey(seenAt) === today;
            const mins = seen ? Math.max(0, Math.round((now - seenAt) / 60000)) : null;

            /* today's sales, oldest first, one entry per shop (a second sale at the same shop is not a new stop) */
            const done = [];
            transactions
                .filter((t) => t?.agentId === m.id && isSale(t) && getLocalDayKey(txDate(t)) === today)
                .sort((a, b) => txDate(a) - txDate(b))
                .forEach((t) => {
                    const k = storeKey(t.customerName);
                    if (done.some((d) => d.key === k)) return;
                    const c = byKey.get(k);
                    done.push({ key: k, name: c?.name || t.customerName, ...(pin(c) || {}) });
                });

            /* the round still ahead, nearest-first from where he was last seen; a shop with no pin still counts, last */
            const round = customers.filter((c) => his(c, m.name) && c.status !== 'PENDING' && (c.visitFreq === 7 || c.visitDay === weekday));
            const left = round.filter((c) => !done.some((d) => d.key === storeKey(c.name)));
            const ahead = [];
            let from = at;
            const pinned = left.filter(pin), loose = left.filter((c) => !pin(c));
            while (pinned.length) {
                let best = 0;
                pinned.forEach((c, i) => { if (metres(from, pin(c)) < metres(from, pin(pinned[best]))) best = i; });
                const c = pinned.splice(best, 1)[0];
                ahead.push({ key: storeKey(c.name), name: c.name, ...pin(c) });
                from = pin(c);
            }
            loose.forEach((c) => ahead.push({ key: storeKey(c.name), name: c.name }));

            const planned = round.length > 0;
            if (!planned) {
                const s = nextStop(customers, { latitude: at.lat, longitude: at.lng }, m.name, now);
                if (s) ahead.push({ key: storeKey(s.customer.name), name: s.customer.name, ...pin(s.customer) });
            }
            const next = ahead[0] || null;
            const last = done[done.length - 1];

            const state = !out ? 'off'
                : planned && !next ? 'home'
                : next && last?.lat && mins <= AT_SHOP_MIN && metres(at, last) <= AT_SHOP_M ? 'at'
                : next ? 'go' : 'idle';

            return {
                id: m.id, name: m.name || 'Agent', ini: initials(m.name),
                photo: m.profileImage || m.photoURL || m.photoUrl || m.profilePic || m.photo || m.image || m.avatar || null,
                at, seenAt: seen ? seenAt : null, mins, out, live: seen && mins <= LIVE_MIN, state, done, ahead, next, planned,
                of: planned ? done.length + ahead.length : null,          // "5/8" only when a round exists
                metresToNext: next?.lat ? metres(at, next) : null,
            };
        })
        .sort((a, b) => (b.out - a.out) || a.name.localeCompare(b.name));
}

export const agoLabel = (mins) => mins == null ? 'never' : mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.floor(mins / 60)} h ago` : `${Math.floor(mins / 1440)} d ago`;
