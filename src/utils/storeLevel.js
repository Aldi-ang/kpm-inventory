/* A SHOP'S LEVEL FROM THE OWNER'S TARGETS - Settings > Tier Automation Rules (SettingsView handleSaveTierRules writes
   appSettings/tierRules: { rules: { <level id>: { type: 'omset' | 'volume', omsetTarget, volumeTarget, volumeUnit, timeframe } } }).
   The level list itself (highest first) is settings/tiers (App.jsx tierSettings; Mythic, Epic, Grandmaster, Bronze, Unranked
   by default).

   His "make sure ... especially the leveling system that we design" (2026-11-09). The sale's old promoter (MerchantSalesView)
   checked each target's name against the PRICE levels (Retail / Grosir), so no target ever counted and a fixed table scored
   the one sale's total: one big sale made a shop Mythic, the next small one Unranked. It also counted only the 7 days of
   sales a phone keeps, a Bal as 200 packs for every product, and it lost the visit date when anything failed.

   The rules here: walk the ladder from the top; the first level whose target the shop's SALES reach inside that target's own
   window wins. Omset = the sale totals; volume = each line in the target's unit, by that product's own pack sizes
   (convertToBks). A target of 0 or blank is "not set" and skipped. Nothing reached = the bottom level. A sale only ever
   RAISES a level (nextLevel): lowering is the owner's Season Rank Audit on the map. */
import { storeKey, convertToBks } from './helpers.js';

const DAY = 86400e3;
const isOmset = (rule) => String(rule?.type || 'omset').toLowerCase().includes('omset');

/* '90', '3 bulan', '2 weeks', '1 tahun' -> days; anything unreadable -> 90, the Settings default */
export const windowDays = (timeframe) => {
    if (timeframe == null || timeframe === '') return 90;
    const s = String(timeframe).toLowerCase();
    const n = parseInt(s.replace(/[^0-9]/g, ''), 10) || 90;
    if (s.includes('month') || s.includes('bulan')) return n * 30;
    if (s.includes('year') || s.includes('tahun')) return n * 365;
    if (s.includes('week') || s.includes('minggu')) return n * 7;
    return n;
};

export const targetOf = (rule) =>
    Number(String(isOmset(rule) ? (rule?.omsetTarget || rule?.target || 0) : (rule?.volumeTarget || rule?.target || 0)).replace(/[^0-9]/g, '')) || 0;

/* when a sale happened: a {seconds} stamp (every sale since the engine), a number, or an old date string */
export const saleTime = (t) => {
    const ts = t?.timestamp;
    if (ts?.seconds) return ts.seconds * 1000;
    if (typeof ts === 'number') return ts < 1e12 ? ts * 1000 : ts;
    for (const s of [ts, t?.date]) {
        if (!s) continue;
        const ms = new Date(s).getTime();
        if (!isNaN(ms)) return ms;
    }
    return 0;
};

/* the one rule that belongs to a level: keyed by its id (as Settings saves it), or naming it */
const ruleFor = (rules, id) => {
    const want = String(id).toLowerCase();
    for (const [key, rule] of Object.entries(rules || {})) {
        if (rule && String(rule.tierId || rule.targetTier || rule.tier || key).toLowerCase() === want) return rule;
    }
    return null;
};

/* one sale line in the target's unit, by that product's pack sizes; promo goods never count */
const unitsOf = (line, product, unit) => {
    if (line?.promo || line?.isPromo) return 0;
    const bks = convertToBks(Number(line?.qty) || 0, line?.unit || 'Bks', product);
    const per = convertToBks(1, unit, product) || 1;
    return bks / per;
};

/* -> { level, metric, target } (metric/target of the level reached; none reached = the bottom level, no numbers) */
export function earnedLevel({ rules, ladder, sales = [], shopName, products = [], now = Date.now() }) {
    const ids = (ladder || []).map((l) => (typeof l === 'string' ? l : l?.id)).filter(Boolean);
    if (!ids.length) return { level: null };
    const want = storeKey(shopName);
    const mine = sales.filter((t) => t && storeKey(t.customerName || t.customer) === want
        && String(t.type || (Number(t.total) < 0 ? 'RETUR' : 'SALE')).toUpperCase() === 'SALE');
    const byId = new Map(products.map((p) => [p.id, p]));
    for (const id of ids.slice(0, -1)) {
        const rule = ruleFor(rules, id);
        const target = rule ? targetOf(rule) : 0;
        if (!target) continue;
        const from = now - windowDays(rule.timeframe) * DAY;
        const unit = rule.volumeUnit || 'Bks';
        let metric = 0;
        for (const t of mine) {
            const at = saleTime(t);
            if (at < from || at > now + DAY) continue;
            if (isOmset(rule)) metric += Number(String(t.total).replace(/[^0-9-]/g, '')) || 0;
            else for (const line of (Array.isArray(t.items) ? t.items : Object.values(t.items || {}))) metric += unitsOf(line, byId.get(line?.productId), unit);
        }
        if (metric >= target) return { level: id, metric, target };
    }
    return { level: ids[ids.length - 1] };
}

/* a sale may only raise a level: the level to WRITE, or null. A level not on the ladder (an old 'Silver') ranks as the bottom. */
export function nextLevel(current, earned, ladder) {
    const ids = (ladder || []).map((l) => (typeof l === 'string' ? l : l?.id)).map((s) => String(s).toLowerCase());
    const rank = (lvl) => { const i = ids.indexOf(String(lvl ?? '').toLowerCase()); return i < 0 ? ids.length - 1 : i; };
    if (!earned || !ids.includes(String(earned).toLowerCase())) return null;
    return rank(earned) < rank(current) ? earned : null;
}

/* the names a saved sale may carry for one shop: the terminal's name, and the old "(Retail)"-style suffixes (storeKey) */
export const nameVariants = (name) => {
    const base = String(name ?? '').trim().replace(/\s*\((?:Retail|Individual|Wholesale)\)$/i, '').trim();
    return base ? [base, `${base} (Retail)`, `${base} (Wholesale)`, `${base} (Individual)`] : [];
};
