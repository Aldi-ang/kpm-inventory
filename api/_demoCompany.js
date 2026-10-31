/* THE DEMO COMPANY, AS DATA — what one reset writes, built without touching Firebase.

   Aldi, 2026-10-10 20:22: *"yes visitor can do anything but reset every 24 hours, this way it is stays
   fresh everyday ... for manual reset im expecting tier 1 account to be able to do that, anyway tier 1
   account is still adikaryasukses99@gmail.com, visitor is tier2 and below"*. Design + his earlier picks:
   A-Brain Brainstorm/2026-10-06_public-demo.md ("20:22 - DECIDED", "The reset - my design choice").

   2026-10-13, his "makesure that the demo is fully realistic 100%": TWO TEAMS (Muntilan = the app's
   Headquarters, Bandung = the branch - TEAMS below), a face, a bio, a rank, a worn frame and earned
   badges for every person (PROFILE + api/_demoFaces.js), and four weeks of history - sales, visit
   reports, end-of-day reports (verified, two still waiting), goods in and a branch request - so Reports,
   Day Replay, Journey, the leaderboard and Agent Profile all have something to show.

   Pure on purpose: the same seed and the same moment give the same company, byte for byte. That is
   what makes "a second reset leaves the same counts" checkable in plain node (logicFixes "THE DEMO
   RESET") and what lets api/demo-reset.js stay a thin writer. The `_` keeps Vercel from serving
   this file as a route.

   Paths and shapes are the app's own, never guessed: products / customers / settings as App.jsx's
   restore writes them; staff as FleetCanvasManager.jsx's save; vaults as utils/vaultDoc.js; the month
   tally through the app's own salesDelta; a visit report as JourneyView.jsx confirmCheckIn + App.jsx
   logAudit write it; an EOD report as EODReconciliationView.jsx submits it and App.jsx handleVerifyEOD
   stamps it; the career ledger as handleVerifyEOD credits it (src/config/career.js); goods in as
   RestockVaultView.jsx saves a surat jalan; a branch request as BranchWarehouseManager.jsx sends one. */
import { salesDelta } from '../src/utils/salesRollup.js';
import { careerXP, rankLadder, computeDayXP, checkBadges, DEFAULT_BADGES, DEFAULT_RANKS } from '../src/config/career.js';
import { borderDocId } from '../src/utils/mapBorders.js';
import { MASTER } from '../src/utils/supply.js';
import { FACES } from './_demoFaces.js';

export const DEMO_PROJECT = 'kpm-demo-f4d74';
export const APP_ID = 'cello-inventory-manager';          // the folder name inside the demo database, as in firebase.js
export const T1_EMAIL = 'adikaryasukses99@gmail.com';     // his Gmail - the only caller allowed to press "Reset demo now"
/* the five logins + the public vault password live in src/config/demoLogins.js - the demo's picker lists the same people */
import { OWNER_UID, VAULT_PASSWORD, LOGINS } from '../src/config/demoLogins.js';
export { OWNER_UID, VAULT_PASSWORD, LOGINS };
export const RECOVERY_WORD = 'demo';

/* THE TWO TEAMS. A person's `location` is their team (the roster's tabs key on province + location -
   FleetCanvasManager placeOf); Headquarters loads vans from the main warehouse, Bandung from its own
   (branches/BANDUNG/inventory). A shop belongs to a team by where it is. Yogyakarta and the shops with no
   region are not in the demo (his "yogyakarta is not included"). */
export const TEAMS = [
    { location: 'Headquarters', province: 'JAWA TENGAH', town: 'Muntilan, Kabupaten Magelang', has: (c) => c.region === 'MAGELANG' },
    { location: 'BANDUNG', province: 'JAWA BARAT', town: 'Bandung', has: (c) => c.province === 'JAWA BARAT' },
];
const teamOf = (location) => TEAMS.find((t) => t.location === location);

/* Practice staff (his "c is good"): visitors may lock, move and edit these freely - no sign-in of their own.
   With the logins they give each team a regional admin, a canvas and a motorist (his 09:31 rule). */
export const PRACTICE = [
    { agentId: 'demo-agent-3', email: 'budi.demo@example.com', name: 'BUDI SANTOSO', userRole: 'FIELD_OPERATIVE', role: 'Canvas', location: 'Headquarters' },
    { agentId: 'demo-agent-4', email: 'ari.demo@example.com', name: 'ARI WIBOWO', userRole: 'ROOKIE', role: 'Motorist', location: 'BANDUNG' },
    { agentId: 'demo-agent-5', email: 'dewi.demo@example.com', name: 'DEWI LESTARI', userRole: 'FLEET_CAPTAIN', role: 'Canvas', location: 'BANDUNG', approvalRegions: ['BANDUNG'] },
];

/* who sells which shops: each team's towns cut between its canvas and its motorist. The 11 Magelang shops
   with no kecamatan stay unassigned - the owner still has new shops to hand out, as in a real company. */
const ROUTE = (c) => c.province === 'JAWA BARAT'
    ? (c.region === 'KOTA BANDUNG' || c.region === 'KOTA CIMAHI' ? 'demo-agent-4' : 'demo-agent-1')
    : c.city === 'MUNTILAN' ? 'demo-agent-2'
    : c.city === 'MERTOYUDAN' || c.city === 'MUNGKID' ? 'demo-agent-3' : null;

/* WHO EACH PERSON IS. `career` = their record from before the reset's four weeks, in the career ledger's own
   `base` terms (career.js totals); the rest of each total is derived the way a real record grows (a pack
   is ~Rp 12.000, a shop day is ~5 shops, the pita cukai is clean on most days). `frame` only when they
   wear a lower frame than their rank gives (Rina likes the marble). */
const PROFILE = {
    master_owner: { join: '2019-02-01', collected: 25e9, days: 1600, titip: 9e8, streak: 120,
        bio: 'Started KPM in 2019 with one motorbike in Muntilan. Runs the headquarters warehouse in Muntilan and the branch in Bandung.' },
    'demo-agent-6': { join: '2021-03-15', collected: 5.8e9, days: 960, titip: 3.1e8, streak: 64, frame: 'platinum',
        bio: 'Joined in 2021 as a canvas salesman. HQ sales manager since 2024: plans both teams\' weekly routes and reads every end-of-day report.',
        awards: [{ title: 'Top Region - Q2 2026', reason: 'The HQ team beat the quarter target by 18%.', xp: 2500, at: '2026-07-03' }] },
    'demo-agent-7': { join: '2022-01-10', collected: 3.1e9, days: 720, titip: 1.6e8, streak: 41,
        bio: 'Regional admin of the Muntilan HQ team. Ten years in cigarette distribution around Magelang. Approves hand-offs and stock counts.',
        awards: [{ title: 'Zero-Variance Audit', reason: 'Three stock counts in a row without one missing pack.', xp: 1500, at: '2026-08-22' }] },
    'demo-agent-1': { join: '2023-05-08', collected: 1.25e9, days: 420, titip: 1.8e7, streak: 27,
        bio: 'Canvas salesman for Bandung. Covers Soreang, Baleendah, Margahayu and Lembang from the van, Monday to Saturday.',
        awards: [{ title: 'Bandung Expansion', reason: 'Opened 12 new shops in Soreang and Baleendah.', xp: 1000, at: '2026-05-30' }] },
    'demo-agent-2': { join: '2025-10-20', collected: 1.6e8, days: 148, titip: 0, streak: 12,
        bio: 'Motorist around Muntilan town since October 2025. Knows every warung on the Muntilan - Mertoyudan road.',
        awards: [{ title: 'Rookie of the Month - September 2026', reason: 'Most shops visited of all new motorists.', xp: 500, at: '2026-10-01' }] },
    'demo-agent-3': { join: '2024-02-12', collected: 6.2e8, days: 285, titip: 6e6, streak: 19,
        bio: 'Canvas van for Mertoyudan and Mungkid. Keeps the displays tidy and the payments on time.' },
    'demo-agent-4': { join: '2026-06-01', collected: 4.5e7, days: 72, titip: 0, streak: 9,
        bio: 'New motorist for Kota Bandung and Cimahi. Still learning the routes, already fast on the Sales Terminal.' },
    'demo-agent-5': { join: '2022-08-01', collected: 2.2e9, days: 560, titip: 4.2e7, streak: 38,
        bio: 'Regional admin of the Bandung branch: the Bandung warehouse, the team\'s stock requests and their hand-offs.' },
};
/* `collected` in PROFILE = the career total THROUGH today, so the base gets what the seeded week (live) did not add: a
   bigger or smaller week (qtyOf, 2026-10-31) then moves no one across a rank line */
const baseOf = (p, live) => ({ collected: Math.max(0, p.collected - live.collected), itemsBks: Math.round(p.collected / 12000), titipCollected: p.titip,
    daysVerified: p.days, cleanCukaiDays: Math.round(p.days * 0.93), storesServed: p.days * 5 });

/* the Visit Report tags (dayLog.js VISIT_TAGS = the form's default + JourneyView QUICK_TAGS) with a few true-to-life notes */
const VISIT_NOTES = [
    ['Stock Full (No Order) 🛑', ['Still has 6 slop on the shelf, come back Thursday.', 'Bought from us on Monday, shelf still full.', 'Owner says sales are slow this week.']],
    ['Routine Check', ['Display tidy, price stickers still on.', 'Poster replaced, shelf restocked by the owner.']],
    ['Competitor Issue ⚠️', ['Another distributor offered 5% off per carton.', 'Competitor van came yesterday with a promo.']],
    ['New Request 📝', ['Asks for 2 bal of Cello Chocolate next visit.', 'Wants to try American Spirit, 1 slop.']],
    ['Store Closed 🔒', ['Closed - family event.', 'Closed for Friday prayer, will come back.']],
];

const WIB = 7 * 3600e3;
export const wibDay = (now) => new Date(now.getTime() + WIB).toISOString().slice(0, 10);
const atWib = (day, minutes) => new Date(Date.parse(`${day}T00:00:00Z`) - WIB + minutes * 60e3);
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
const hhmm = (d) => new Date(d.getTime() + WIB).toISOString().slice(11, 19);
export const HISTORY_DAYS = 28;

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

/* HOW MUCH A SHOP TAKES - 2026-10-31, his "how better if we can add the total sales into milyar omset instead of just few
   puluh juta": a warung orders in SLOP (5-30 slop = 50-300 Bks a brand), a grosir in BAL (3-10 bal = 300-1.000 Bks), the
   import priced per piece a few. Four sellers x 25 days then land near Rp 1,5-2 miliar a month. One r() call either way,
   so the routes and visit notes after it stay the same draw. */
const qtyOf = (p, tier, r) => ((p[PRICE_FIELD[tier]] || p.priceRetail) > 50000 ? 1 + Math.floor(r() * 4)
    : tier === 'Grosir' ? 100 * (3 + Math.floor(r() * 8)) : 10 * (5 + Math.floor(r() * 26)));

/* one salesman's day: 4-6 of his shops as a short route (nearest next) from 08:30 WIB, each a sale, then one or
   two more shops on the way home that bought nothing - those get a Visit Report instead */
const dayRound = (day, man, shops, products) => {
    const r = rng(day + man.agentId);
    const left = shops.filter((c) => c.assignedAgent === man.agentId && Number(c.latitude) && Number(c.longitude) && c.name);
    if (!left.length) return { sales: [], visits: [] };
    const stops = 4 + Math.floor(r() * 3), extra = 1 + Math.floor(r() * 2);
    const route = [left.splice(Math.floor(r() * left.length), 1)[0]];
    while (route.length < stops + extra && left.length) {
        const last = route[route.length - 1];
        const d = (c) => (c.latitude - last.latitude) ** 2 + (c.longitude - last.longitude) ** 2;
        left.sort((x, y) => d(x) - d(y));
        route.push(left.shift());
    }
    const sales = route.slice(0, stops).map((shop, i) => {
        const tier = PRICE_FIELD[shop.priceTier] ? shop.priceTier : 'Retail';
        const picks = [...products].sort(() => r() - 0.5).slice(0, 1 + Math.floor(r() * 3));
        const items = picks.map((p) => line(p, qtyOf(p, tier, r), tier));
        return {
            id: `demo-${day}-${man.agentId}-${i + 1}`, shop,
            data: {
                date: day, customerName: shop.name, paymentType: 'Cash', items,
                total: items.reduce((s, x) => s + x.qty * x.calculatedPrice, 0),
                totalProfit: items.reduce((s, x) => s + x.profitSnapshot, 0),
                type: 'SALE', timestamp: atWib(day, 8 * 60 + 30 + i * 55 + Math.floor(r() * 15)),
                agentId: man.agentId, agentName: man.name, tempoDays: null, territoryOverride: null, deliveryProof: null, demo: true,
            },
        };
    });
    const visits = route.slice(stops).map((shop, i) => {
        const [tag, notes] = VISIT_NOTES[Math.floor(r() * VISIT_NOTES.length)];
        return { shop, tag, note: notes[Math.floor(r() * notes.length)], at: atWib(day, 8 * 60 + 30 + (stops + i) * 55 + Math.floor(r() * 15)) };
    });
    return { sales, visits };
};

/* `vault` = { pin, recoveryHash } fingerprints made by the caller with the app's own hashSecret
   (src/utils/secretHash.js) - computed once per reset, so this stays synchronous and pure. */
export function buildDemoCompany(seed, now, vault) {
    const day = wibDay(now);
    const root = `artifacts/${APP_ID}`, home = `${root}/users/${OWNER_UID}`;
    const products = seed.inventory.map(revive);
    const docs = [];
    const put = (path, data) => docs.push({ path, data });

    const owner = LOGINS[0], hq = teamOf('Headquarters');
    /* bossUid = the owner's own uid, as App.jsx's account migration writes it. The rules list a
       company's collections (transactions, ...) through isSalesman(), which reads THIS row by email
       and compares its bossUid - without it the owner's dashboard reads Rp 0 (emulator, 2026-10-11). */
    const ownerRow = { role: 'COMPANY_OWNER', name: owner.name, email: owner.email, status: 'ACTIVE', subscriptionStatus: 'ACTIVE', bossUid: OWNER_UID, demoLogin: true, locked: false };
    put(`${root}/employee_directory/${OWNER_UID}`, { ...ownerRow, uid: OWNER_UID });
    put(`${root}/employee_directory/${owner.email}`, ownerRow);
    put(`${home}/settings/admin`, { ...vault, failedRecoveryAttempts: 0, lockoutStatus: 'NONE', lockedUntil: 0 });
    /* useCareerLedger: rank and badges come from the career record (Settings "Career history"), not from the last 7 days */
    /* the Command Center's targets sized to the demo's own month (qtyOf): left blank, the app's defaults (Rp 500 jt,
       50 bal a day) put the line at 310% and pinned it flat at the top from the 12th */
    put(`${home}/settings/general`, { ...revive(seed.appSettings), useCareerLedger: true, targetMonthlyRevenue: 1500000000, targetDailyBal: 35 });
    put(`${home}/settings/tiers`, { list: revive(seed.tierSettings) });
    /* his own map borders, where the Map System reads them (the seed carries them once a real backup has them) */
    for (const b of seed.mapBorders || []) put(`${home}/mapSettings/${borderDocId(b)}`, b);

    const staff = [...LOGINS.slice(1).map((l) => ({ ...l, demoLogin: true })), ...PRACTICE.map((p) => ({ ...p, demoLogin: false }))];
    const shops = seed.customers.map(revive).filter((c) => TEAMS.some((t) => t.has(c))).map((c) => {
        const { assignedAgent, ...rest } = c;
        return ROUTE(c) ? { ...rest, assignedAgent: ROUTE(c) } : rest;
    });
    const sellers = new Set(shops.map((c) => c.assignedAgent).filter(Boolean));
    /* the app keeps the salesman's NAME on a shop (JourneyView's agentsList is names) */
    const nameOf = Object.fromEntries(staff.map((m) => [m.agentId, m.name]));

    for (const p of products) put(`${home}/products/${p.id}`, p);
    /* the promo goods: products too, but only here - `products` above feeds the made-up sales and stock, cigarette-only */
    for (const p of (seed.promo || []).map(revive)) put(`${home}/products/${p.id}`, p);
    /* a field man outside Headquarters loads his van from his branch warehouse (FleetCanvasManager's
       selectedAgentUsesBranch); an empty one would show the Bandung team 0 of everything */
    for (const place of new Set(staff.map((m) => m.location).filter((l) => l !== 'Headquarters'))) {
        for (const p of products) put(`${home}/branches/${place}/inventory/${p.id}`, { name: p.name, stock: Math.min(300, p.stock || 0) || 300 });
    }

    /* FOUR WEEKS, Monday to Saturday, and today (the sample day carries the run's own date - his 19:44 pick B) */
    const days = [];
    for (let i = HISTORY_DAYS; i >= 1; i--) { const d = addDays(day, -i); if (new Date(`${d}T00:00:00Z`).getUTCDay() !== 0) days.push(d); }
    days.push(day);
    const rounds = days.flatMap((d) => staff.filter((m) => sellers.has(m.agentId)).map((m) => ({ day: d, man: m, ...dayRound(d, m, shops, products) })));
    const sales = rounds.flatMap((x) => x.sales);
    for (const s of sales) put(`${home}/transactions/${s.id}`, s.data);

    /* VISIT REPORTS: the activity log of that day (audit_vault/<day>/logs, what Day Replay reads) and, for the last
       7 days, the activity list too (audit_logs) - App.jsx logAudit writes both. The shop keeps its latest one. */
    const lastVisit = {};
    const weekAgo = addDays(day, -7);
    rounds.forEach((x) => x.visits.forEach((v, i) => {
        const log = { action: 'VISIT_REPORT', details: `Visited ${v.shop.name} - ${v.tag}: ${v.note}`, user: x.man.email, timestamp: v.at,
            timeStr: hhmm(v.at), isSavePoint: false, storeId: v.shop.id, tag: v.tag, agentId: x.man.agentId };
        const id = `visit-${x.day}-${x.man.agentId}-${i + 1}`;
        put(`${home}/audit_vault/${x.day}/logs/${id}`, log);
        if (x.day > weekAgo) put(`${home}/audit_logs/${id}`, log);
        lastVisit[v.shop.id] = { day: x.day, ...v, by: x.man.name };
    }));
    for (const c of shops) {
        const v = lastVisit[c.id];
        put(`${home}/customers/${c.id}`, {
            ...c, ...(c.assignedAgent ? { assignedAgent: nameOf[c.assignedAgent] } : {}),
            ...(v ? { lastVisit: v.day, lastVisitNote: `[${v.tag}] ${v.note}`, lastVisitTag: v.tag, lastVisitedBy: v.by } : {}),
            /* a New Request stays open on the shop (the "!" on the map) until someone presses Request done - JourneyView */
            ...(v && v.tag.includes('📝') && v.day >= addDays(day, -3) ? { openRequest: { note: v.note, day: v.day, by: v.by } } : {}),
        });
    }

    /* END OF DAY: the last 6 days the app reads (eod_reports, 7-day window), one CASH & STOCK report per seller
       per day; the boss verified all but the newest for Agus (Bandung) and Dika (HQ) - those two wait for him. */
    const recent = days.filter((d) => d < day && d > addDays(day, -7));
    const waiting = new Set([`${recent[recent.length - 1]}|demo-agent-1`, `${recent[recent.length - 1]}|demo-agent-2`]);
    const liveOf = {};
    rounds.filter((x) => recent.includes(x.day) && x.sales.length).forEach((x) => {
        const cash = x.sales.reduce((s, t) => s + t.data.total, 0);
        const report = {
            cash, transfer: 0, cukai: 0, remainingStock: [], expectedCash: cash, expectedTransfer: 0, expectedStock: [],
            cashVariance: 0, transferVariance: 0, goodsShort: false, countStatus: 'CLEAN', damagedStockToReturn: [], deployedSamples: [],
            reportType: 'CASH_STOCK', agentId: x.man.agentId, agentName: x.man.name, dayKey: x.day,
            storesServed: x.sales.length, cukaiRemaining: 0, titipCollected: 0,
            itemsBks: x.sales.reduce((s, t) => s + t.data.items.reduce((q, i) => q + i.qty, 0), 0),
            timestamp: atWib(x.day, 17 * 60 + 30),
        };
        const id = `eod-${x.day}-${x.man.agentId}`;
        if (waiting.has(`${x.day}|${x.man.agentId}`)) { put(`${home}/eod_reports/${id}`, { ...report, status: 'PENDING' }); return; }
        const { total: dayXP, breakdown: xpBreakdown } = computeDayXP(report, {});
        put(`${home}/eod_reports/${id}`, { ...report, status: 'VERIFIED', verified: { cash: true, transfer: true, stock: true }, rejected: {},
            verifiedAt: atWib(x.day, 19 * 60 + 10), dayXP, xpBreakdown });
        (liveOf[x.man.agentId] = liveOf[x.man.agentId] || []).push({ day: x.day, report, dayXP });
    });

    /* THE CAREER LEDGER per person: `base` = their years before these weeks, `live` = the reports verified above,
       credited / streak / season exactly as handleVerifyEOD moves them. Rank, frame and badges follow from it. */
    const people = [{ agentId: 'master_owner', name: owner.name, email: owner.email, location: 'Headquarters' }, ...staff];
    const career = {};
    for (const m of people) {
        const p = PROFILE[m.agentId];
        const live = { collected: 0, itemsBks: 0, titipCollected: 0, storesServed: 0, daysVerified: 0, cleanCukaiDays: 0 };
        let streak = 0, last = '', season = null;
        const credited = {};
        for (const v of liveOf[m.agentId] || []) {
            live.collected += v.report.cash; live.itemsBks += v.report.itemsBks; live.storesServed += v.report.storesServed;
            live.daysVerified += 1; live.cleanCukaiDays += 1;
            credited[`${v.day}:CASH_STOCK`] = true;
            streak = last && Date.parse(v.day) - Date.parse(last) === 86400000 ? streak + 1 : 1;
            last = v.day;
            season = { key: v.day.slice(0, 7), score: (season?.key === v.day.slice(0, 7) ? season.score : 0) + v.dayXP };
        }
        const awards = p.awards || [];
        const c = {
            base: baseOf(p, live), baseThrough: addDays(day, -7), live, credited, joinDate: p.join,
            streakBest: Math.max(p.streak, streak), ...(last ? { lastVerifiedDay: last, streakCurrent: streak, season } : {}),
            ...(awards.length ? { bonusXP: awards.reduce((s, a) => s + a.xp, 0), awardCount: awards.length } : {}),
        };
        c.unlocks = checkBadges(DEFAULT_BADGES, c);
        career[m.agentId] = c;
        put(`${home}/career/${m.agentId}`, c);
        awards.forEach((a, i) => put(`${home}/career/${m.agentId}/awards/award-${i + 1}`, {
            title: a.title, reason: a.reason, xp: a.xp, cosmetic: null, grantedBy: OWNER_UID, grantedByName: owner.name, grantedAt: atWib(a.at, 10 * 60) }));
    }
    /* the frame each person wears: their rank's own material (rankBorders.jsx ids = the rank names), stamped with
       borderTier so the profile's rank-up switch leaves it alone */
    const look = (id) => {
        const { currentTier } = rankLadder(careerXP(career[id]), DEFAULT_RANKS);
        return { profileImage: FACES[id], bio: PROFILE[id].bio, borderStyle: PROFILE[id].frame || currentTier.name.toLowerCase(), borderTier: currentTier.id,
            joinDate: PROFILE[id].join, createdAt: new Date(`${PROFILE[id].join}T02:00:00Z`) };
    };

    /* the owner's own profile (Agent Profile reads motorists/master_owner) and his van, which the app would otherwise
       create on first open with no place - the third "UNASSIGNED AREA" tab on the roster (useDatabaseSync.js) */
    /* title = his place in App.jsx's location-ping words: the demo's owner is T2 (T1 is his Gmail only) */
    put(`${home}/motorists/master_owner`, { id: 'master_owner', name: owner.name, email: owner.email, userRole: 'COMPANY_OWNER', title: 'T2 · OWNER',
        location: 'Headquarters', province: hq.province, status: 'Active', allowedPayments: ['Cash', 'Titip', 'Transfer'], allowedTiers: ['Grosir', 'Retail'],
        canEditRoster: true, allowRetur: true, ...look('master_owner') });
    put(`${home}/motorists/ADMIN_VEHICLE`, { name: 'Admin (Boss Vehicle)', role: 'Canvas', status: 'Active', email: owner.email, activeCanvas: [],
        allowedPayments: ['Cash', 'QRIS', 'Transfer', 'Titip'], allowedTiers: ['Retail', 'Grosir', 'Ecer'], location: 'Headquarters', province: hq.province });

    const today = sales.filter((s) => s.data.date === day);
    for (const m of staff) {
        /* 3 bal a brand left in the van: a man who sells ~15 bal a day (qtyOf) does not drive home with 4 slop */
        const canvas = sellers.has(m.agentId) ? products.slice(0, 3).map((p) => ({ productId: p.id, name: p.name, qty: 300, unit: 'Bks', priceTier: 'Retail', calculatedPrice: p.priceRetail })) : [];
        /* where his phone "was" at each sale TODAY, in App.jsx's location-ping shape (pathHistory = today's points only):
           expedition() puts only a man with a currentLocation on the map, and Day Replay starts his day from pathHistory */
        const path = today.filter((s) => s.data.agentId === m.agentId).map((s) => ({ lat: s.shop.latitude, lng: s.shop.longitude, timestamp: s.data.timestamp.toISOString() }));
        put(`${home}/motorists/${m.agentId}`, {
            id: m.agentId, name: m.name, email: m.email, phone: '', vehicle: m.role === 'Canvas' ? 'Van' : 'Motor', role: m.role, userRole: m.userRole,
            location: m.location, province: teamOf(m.location).province, allowedPayments: ['Cash'], allowedTiers: ['Retail', 'Ecer', 'Grosir'],
            /* Dika may take a retur: the mission's step 5 is a shop handing him a damaged pack (src/config/demoMission.js) */
            allowRetur: m.agentId === 'demo-agent-2', allowCashRefund: false,
            status: 'Active', activeCanvas: canvas, approvalRegions: m.approvalRegions || null, demoLogin: m.demoLogin, ...look(m.agentId),
            ...(path.length ? { currentLocation: path[path.length - 1], pathHistory: path } : {}),
        });
        put(`${root}/employee_directory/${m.email}`, {
            bossUid: OWNER_UID, agentId: m.agentId, role: m.role, userRole: m.userRole, status: 'Active', location: m.location,
            email: m.email, name: m.name, locked: false, demoLogin: m.demoLogin,
        });
        /* uid + email = whose vault it is, as App.jsx's vault setup writes it; the vault_keys rule reads resource.data.uid */
        if (m.demoLogin) put(`${home}/vault_keys/${m.agentId}`, { ...vault, failedRecoveryAttempts: 0, lockoutStatus: 'NONE', lockedUntil: 0, uid: m.uid, email: m.email });
    }

    /* GOODS IN at the Muntilan HQ warehouse (Restock Vault's surat jalan book) - three deliveries from the factory.
       The factory is a registered place too (kind 'pabrik', as Data Induk saves it): MASUK's Asal lists only those, so
       without it a visitor found Asal empty and could not finish mission step 1 (his 2026-10-25 "add option for the asal
       like for example segment produksi pusat or something and tujuan is master vault") */
    const FACTORY = { name: 'Produksi Pusat', address: 'Malang, Jawa Timur' };
    put(`${home}/places/produksi-pusat`, { ...FACTORY, kind: 'pabrik', updatedAt: atWib(days[0], 8 * 60) });
    const hendra = LOGINS.find((l) => l.tier === 'T4').name;
    const past = days.slice(0, -1);
    [12, 5, 2].map((n) => past[past.length - n]).forEach((d, k) => {
        const items = products.slice(1).filter((_, i) => (i + k) % 2 === 0).map((p, i) => ({
            cartId: k * 10 + i + 1, id: p.id, name: p.name, batchNo: `B${d.replace(/-/g, '').slice(2)}-${i + 1}`, qtyReceived: 10000 + 5000 * ((i + k) % 3), basePrice: p.priceDistributor || 0, unit: 'Bks' }));
        const totalBasePrice = items.reduce((s, i) => s + i.qtyReceived * i.basePrice, 0), shippingCost = 350000, laborCost = 150000;
        put(`${home}/procurement/sj-${d}`, {
            batchId: `BATCH-${d.replace(/-/g, '')}`, supplierName: FACTORY.name, deliveredBy: 'Factory driver', receivedBy: hendra, destination: MASTER,
            poNumber: `SJ-${d.replace(/-/g, '').slice(2)}`, supplierSjNo: `MLG/${d.slice(5, 7)}/${100 + k * 7}`, poDate: d, shippingCost, exciseTax: 0, laborCost,
            expiryDate: '', courier: 'Factory truck', items, totalBasePrice, trueLandedTotal: totalBasePrice + shippingCost + laborCost,
            timestamp: atWib(d, 9 * 60 + 15), date: d, hasReceipt: false, receiptUrl: null, packagePhotoUrl: null, recordedBy: hendra,
            originAddress: FACTORY.address, destinationAddress: hq.town, incomplete: null,
        });
    });

    /* THE BANDUNG BRANCH ASKS HQ FOR STOCK: one on the road (HQ shipped it yesterday), one sent this morning */
    const dewi = PRACTICE.find((p) => p.agentId === 'demo-agent-5');
    const asked = (d, mins) => new Date(atWib(d, mins)).toISOString();
    const want = (k) => products.slice(1, 4).map((p, i) => ({ productId: p.id, name: p.name, qty: 200 + 100 * ((i + k) % 3), unit: 'Bungkus' }));
    const shipDay = recent[recent.length - 1], askDay = recent[recent.length - 2] || shipDay;
    put(`${home}/stock_requests/REQ_${askDay.replace(/-/g, '')}`, {
        id: `REQ_${askDay.replace(/-/g, '')}`, branch: 'BANDUNG', requestedBy: dewi.email, requestedByName: dewi.name, requestedItems: want(0),
        deliveryAddressText: 'Gudang Bandung, Jl. Soekarno-Hatta, Bandung', status: 'IN_TRANSIT',
        senderName: hendra, courier: 'KPM van', trackingNo: `KPM-${shipDay.replace(/-/g, '').slice(2)}`, packagePhotoUrl: null,
        fulfilledItems: want(0), fulfilledAt: atWib(shipDay, 14 * 60), fulfilledBy: LOGINS[2].email,
        workflowTimeline: [{ status: 'PENDING', time: asked(askDay, 8 * 60), msg: 'Request submitted to HQ.' },
            { status: 'IN_TRANSIT', time: asked(shipDay, 14 * 60), msg: `Shipped via KPM van (Resi: KPM-${shipDay.replace(/-/g, '').slice(2)}) by ${hendra}.` }],
        timestamp: atWib(askDay, 8 * 60),
    });
    put(`${home}/stock_requests/REQ_${day.replace(/-/g, '')}`, {
        id: `REQ_${day.replace(/-/g, '')}`, branch: 'BANDUNG', requestedBy: dewi.email, requestedByName: dewi.name, requestedItems: want(1),
        deliveryAddressText: 'Gudang Bandung, Jl. Soekarno-Hatta, Bandung', status: 'PENDING',
        workflowTimeline: [{ status: 'PENDING', time: asked(day, 7 * 60 + 40), msg: 'Request submitted to HQ.' }], timestamp: atWib(day, 7 * 60 + 40),
    });

    /* the month tallies Reports reads - the app's own salesDelta, summed per month (the reset starts from empty) */
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const months = {};
    for (const s of sales) {
        const d = salesDelta(s.data, byId, 1);
        if (!d) continue;
        const m = (months[d.month] = months[d.month] || { month: d.month, byProduct: {}, byDay: {} });
        m.byDay[d.day] = m.byDay[d.day] || {};
        for (const [id, v] of Object.entries(d.byProduct)) {
            for (const bucket of [m.byProduct, m.byDay[d.day]]) {
                bucket[id] = bucket[id] || { qty: 0, revenue: 0 };
                bucket[id].qty += v.qty; bucket[id].revenue += v.revenue;
            }
        }
    }
    for (const m of Object.values(months)) put(`${home}/sales_stats/${m.month}`, m);

    return { day, logins: LOGINS, docs };
}
