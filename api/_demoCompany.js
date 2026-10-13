/* THE DEMO COMPANY, AS DATA — what one reset writes, built without touching Firebase.

   Aldi, 2026-10-10 20:22: *"yes visitor can do anything but reset every 24 hours, this way it is stays
   fresh everyday ... for manual reset im expecting tier 1 account to be able to do that, anyway tier 1
   account is still adikaryasukses99@gmail.com, visitor is tier2 and below"*. Design + his earlier picks:
   A-Brain Brainstorm/2026-10-06_public-demo.md ("20:22 - DECIDED", "The reset - my design choice").

   Pure on purpose: the same seed and the same moment give the same company, byte for byte. That is
   what makes "a second reset leaves the same counts" checkable in plain node (logicFixes "THE DEMO
   RESET") and what lets api/demo-reset.js stay a thin writer. The `_` keeps Vercel from serving
   this file as a route.

   Paths are the app's own, never guessed: products / customers / settings/general / settings/tiers
   as App.jsx's restore writes them; staff as FleetCanvasManager.jsx's save writes them (a motorists
   profile + employee_directory/<email>); vaults as utils/vaultDoc.js names them; the month tally as
   utils/salesRollupWrite.js does, through the app's own salesDelta. */
import { salesDelta } from '../src/utils/salesRollup.js';

export const DEMO_PROJECT = 'kpm-demo-f4d74';
export const APP_ID = 'cello-inventory-manager';          // the folder name inside the demo database, as in firebase.js
export const T1_EMAIL = 'adikaryasukses99@gmail.com';     // his Gmail - the only caller allowed to press "Reset demo now"
/* the five logins + their public passwords live in src/config/demoLogins.js - the demo's front door signs in with the same list */
import { OWNER_UID, LOGIN_PASSWORD, VAULT_PASSWORD, LOGINS } from '../src/config/demoLogins.js';
export { OWNER_UID, LOGIN_PASSWORD, VAULT_PASSWORD, LOGINS };
export const RECOVERY_WORD = 'demo';
/* Practice staff (his "c is good"): visitors may lock, move and edit these freely - no sign-in of their own. */
export const PRACTICE = [
    { agentId: 'demo-agent-3', email: 'budi.demo@example.com', name: 'BUDI SANTOSO', userRole: 'FIELD_OPERATIVE', role: 'Motorist', location: 'MAGELANG' },
    { agentId: 'demo-agent-4', email: 'ari.demo@example.com', name: 'ARI WIBOWO', userRole: 'ROOKIE', role: 'Motorist', location: 'MAGELANG' },
    { agentId: 'demo-agent-5', email: 'dewi.demo@example.com', name: 'DEWI LESTARI', userRole: 'FIELD_OPERATIVE', role: 'Motorist', location: 'MAGELANG' },
];

const WIB = 7 * 3600e3;
export const wibDay = (now) => new Date(now.getTime() + WIB).toISOString().slice(0, 10);
const atWib = (day, minutes) => new Date(Date.parse(`${day}T00:00:00Z`) - WIB + minutes * 60e3);

/* a small seeded generator: same day + same salesman -> the same route, so a second reset is identical */
const rng = (text) => {
    let h = 2166136261;
    for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};

/* the backup exports Firestore timestamps as { type, seconds, nanoseconds }; the admin SDK stores a Date as a timestamp */
const revive = (v) => {
    if (Array.isArray(v)) return v.map(revive);
    if (!v || typeof v !== 'object') return v;
    if (v.type === 'firestore/timestamp/1.0' && typeof v.seconds === 'number') return new Date(v.seconds * 1000 + Math.round((v.nanoseconds || 0) / 1e6));
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)]));
};

const PRICE_FIELD = { Retail: 'priceRetail', Grosir: 'priceGrosir', Ecer: 'priceEcer' };
const line = (p, qty, tier) => {
    const price = p[PRICE_FIELD[tier]] || p.priceRetail;
    const dist = p.priceDistributor || 0;
    return { productId: p.id, name: p.name, qty, unit: 'Bks', priceTier: tier, calculatedPrice: price, distributorPriceSnapshot: dist, profitSnapshot: (price - dist) * qty };
};

/* one salesman's day: up to 6 of his shops as a short route (nearest next), 08:30 WIB onward */
const daySales = (day, man, shops, products) => {
    const r = rng(day + man.agentId);
    const left = shops.filter((c) => c.assignedAgent === man.agentId && Number(c.latitude) && Number(c.longitude) && c.name);
    if (!left.length) return [];
    const route = [left.splice(Math.floor(r() * left.length), 1)[0]];
    while (route.length < 6 && left.length) {
        const last = route[route.length - 1];
        const d = (c) => (c.latitude - last.latitude) ** 2 + (c.longitude - last.longitude) ** 2;
        left.sort((x, y) => d(x) - d(y));
        route.push(left.shift());
    }
    return route.map((shop, i) => {
        const tier = PRICE_FIELD[shop.priceTier] ? shop.priceTier : 'Retail';
        const picks = [...products].sort(() => r() - 0.5).slice(0, 1 + Math.floor(r() * 3));
        const items = picks.map((p) => line(p, 2 + Math.floor(r() * 9), tier));
        return {
            id: `demo-${day}-${man.agentId}-${i + 1}`,
            pin: { lat: shop.latitude, lng: shop.longitude },
            data: {
                date: day, customerName: shop.name, paymentType: 'Cash', items,
                total: items.reduce((s, x) => s + x.qty * x.calculatedPrice, 0),
                totalProfit: items.reduce((s, x) => s + x.profitSnapshot, 0),
                type: 'SALE', timestamp: atWib(day, 8 * 60 + 30 + i * 55 + Math.floor(r() * 15)),
                agentId: man.agentId, agentName: man.name, tempoDays: null, territoryOverride: null, deliveryProof: null, demo: true,
            },
        };
    });
};

/* `vault` = { pin, recoveryHash } fingerprints made by the caller with the app's own hashSecret
   (src/utils/secretHash.js) - computed once per reset, so this stays synchronous and pure. */
export function buildDemoCompany(seed, now, vault) {
    const day = wibDay(now);
    const root = `artifacts/${APP_ID}`, home = `${root}/users/${OWNER_UID}`;
    const products = seed.inventory.map(revive), shops = seed.customers.map(revive);
    const docs = [];
    const put = (path, data) => docs.push({ path, data });

    const owner = LOGINS[0];
    /* bossUid = the owner's own uid, as App.jsx's account migration writes it. The rules list a
       company's collections (transactions, ...) through isSalesman(), which reads THIS row by email
       and compares its bossUid - without it the owner's dashboard reads Rp 0 (emulator, 2026-10-11). */
    const ownerRow = { role: 'COMPANY_OWNER', name: owner.name, email: owner.email, status: 'ACTIVE', subscriptionStatus: 'ACTIVE', bossUid: OWNER_UID, demoLogin: true, locked: false };
    put(`${root}/employee_directory/${OWNER_UID}`, { ...ownerRow, uid: OWNER_UID });
    put(`${root}/employee_directory/${owner.email}`, ownerRow);
    put(`${home}/settings/admin`, { ...vault, failedRecoveryAttempts: 0, lockoutStatus: 'NONE', lockedUntil: 0 });
    put(`${home}/settings/general`, revive(seed.appSettings));
    put(`${home}/settings/tiers`, { list: revive(seed.tierSettings) });
    const sellers = new Set(shops.map((c) => c.assignedAgent).filter(Boolean));
    const staff = [...LOGINS.slice(1).map((l) => ({ ...l, demoLogin: true })), ...PRACTICE.map((p) => ({ ...p, demoLogin: false }))];
    /* the seed keeps demo-agent-N; the app keeps the salesman's NAME on a shop (JourneyView's agentsList is names) */
    const nameOf = Object.fromEntries(staff.map((m) => [m.agentId, m.name]));

    for (const p of products) put(`${home}/products/${p.id}`, p);
    /* a field man outside Headquarters loads his van from his branch warehouse (FleetCanvasManager's
       selectedAgentUsesBranch); an empty one would show the Magelang team 0 of everything */
    for (const place of new Set(staff.map((m) => m.location).filter((l) => l !== 'Headquarters'))) {
        for (const p of products) put(`${home}/branches/${place}/inventory/${p.id}`, { name: p.name, stock: Math.min(300, p.stock || 0) || 300 });
    }
    for (const c of shops) put(`${home}/customers/${c.id}`, c.assignedAgent ? { ...c, assignedAgent: nameOf[c.assignedAgent] || c.assignedAgent } : c);

    /* B (his 19:44 pick): the sample day carries the run's own date */
    const sales = staff.filter((m) => sellers.has(m.agentId)).flatMap((m) => daySales(day, m, shops, products));

    for (const m of staff) {
        const province = shops.find((c) => c.assignedAgent === m.agentId)?.province || 'JAWA TENGAH';
        const canvas = sellers.has(m.agentId) ? products.slice(0, 3).map((p) => ({ productId: p.id, name: p.name, qty: 40, unit: 'Bks', priceTier: 'Retail', calculatedPrice: p.priceRetail })) : [];
        /* where his phone "was" at each sale, in App.jsx's location-ping shape: expedition() puts only a man with a
           currentLocation on the map, and Day Replay starts his day from pathHistory */
        const path = sales.filter((s) => s.data.agentId === m.agentId).map((s) => ({ ...s.pin, timestamp: s.data.timestamp.toISOString() }));
        put(`${home}/motorists/${m.agentId}`, {
            id: m.agentId, name: m.name, email: m.email, phone: '', vehicle: m.role === 'Canvas' ? 'Van' : 'Motor', role: m.role, userRole: m.userRole,
            location: m.location, province, allowedPayments: ['Cash'], allowedTiers: ['Retail', 'Ecer', 'Grosir'], allowRetur: false, allowCashRefund: false,
            joinDate: '2026-01-05', status: 'Active', activeCanvas: canvas, approvalRegions: m.approvalRegions || null, createdAt: now, demoLogin: m.demoLogin,
            ...(path.length ? { currentLocation: path[path.length - 1], pathHistory: path } : {}),
        });
        put(`${root}/employee_directory/${m.email}`, {
            bossUid: OWNER_UID, agentId: m.agentId, role: m.role, userRole: m.userRole, status: 'Active', location: m.location,
            email: m.email, name: m.name, locked: false, demoLogin: m.demoLogin,
        });
        /* uid + email = whose vault it is, as App.jsx's vault setup writes it; the vault_keys rule reads resource.data.uid */
        if (m.demoLogin) put(`${home}/vault_keys/${m.agentId}`, { ...vault, failedRecoveryAttempts: 0, lockoutStatus: 'NONE', lockedUntil: 0, uid: m.uid, email: m.email });
    }

    for (const s of sales) put(`${home}/transactions/${s.id}`, s.data);

    /* the month tally Reports reads - the app's own salesDelta, summed (the reset starts from empty, so no increments) */
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const byProduct = {}, byDay = {};
    let month = null;
    for (const s of sales) {
        const d = salesDelta(s.data, byId, 1);
        if (!d) continue;
        month = d.month;
        byDay[d.day] = byDay[d.day] || {};
        for (const [id, v] of Object.entries(d.byProduct)) {
            for (const bucket of [byProduct, byDay[d.day]]) {
                bucket[id] = bucket[id] || { qty: 0, revenue: 0 };
                bucket[id].qty += v.qty; bucket[id].revenue += v.revenue;
            }
        }
    }
    if (month) put(`${home}/sales_stats/${month}`, { month, byProduct, byDay });

    return { day, logins: LOGINS, docs };
}
