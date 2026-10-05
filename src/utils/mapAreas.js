import { storeKey } from './helpers.js';
import { revenueOf } from './revenueRule.js';

/* when a transaction happened, in ms: the server timestamp first, then the typed date; 0 = unknown */
export const txTime = (t) => (t?.timestamp?.seconds ? t.timestamp.seconds * 1000 : new Date(t?.date || 0).getTime()) || 0;

/* the area a shop sits in = its OWN city (kecamatan) field, else its region - never a drawn border, so the ranking
   works before any border is imported (Map System redesign, his pick 2026-10-05) */
export const areaOf = (s) => [s?.city, s?.region].find((v) => v && v !== 'Uncategorized') || 'No area';

/* this month's money per shop key (revenueRule: a Titip placement is not money until its audit collects it) */
export const monthByShop = (transactions, now = new Date()) => {
    const out = {};
    for (const t of transactions || []) {
        if (!t) continue;
        const d = new Date(txTime(t));
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) continue;
        const k = storeKey(t.customerName);
        out[k] = (out[k] || 0) + revenueOf(t);
    }
    return out;
};

/* Map System's Areas ranking - his job for the screen, "sales performance of an area, stores level and position":
   each area's money this month (a shop counted once, by name key), its shops, the mix of their levels (one count per
   tier id, in the tiers' own order) and how many need a visit; best seller first, then the bigger area */
export const rankAreas = (shops, transactions, tierIds, now = new Date()) => {
    const money = monthByShop(transactions, now), areas = {}, counted = new Set();
    for (const s of shops || []) {
        const name = areaOf(s);
        const a = areas[name] || (areas[name] = { name, money: 0, shops: 0, late: 0, mix: tierIds.map(() => 0) });
        a.shops++;
        if (s.status === 'overdue') a.late++;
        const i = tierIds.indexOf(s.tier);
        if (i >= 0) a.mix[i]++;
        const k = storeKey(s.name);
        if (!counted.has(k)) { counted.add(k); a.money += money[k] || 0; }
    }
    return Object.values(areas).sort((x, y) => y.money - x.money || y.shops - x.shops);
};

/* "Rp 52,6 jt" / "Rp 420 rb" - a whole area's month fits a floating card */
export const rpShort = (n) => {
    const v = Number(n) || 0;
    if (Math.abs(v) >= 1e6) return `Rp ${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
    if (Math.abs(v) >= 1e3) return `Rp ${Math.round(v / 1e3).toLocaleString('id-ID')} rb`;
    return `Rp ${v.toLocaleString('id-ID')}`;
};
