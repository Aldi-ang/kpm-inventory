/* COMPETITORS (Step 2, Change 30). Pure helpers shared by CompetitorsView, useDatabaseSync and the self-checks.
   Firestore shape (artifacts/{appId}/users/{bossUid}/):
     competitors/{rivalId}                        name, brand, normName, categoryId, subCategoryId, pairedProductId, ...
     competitors/{rivalId}/region_prices/{REGION} region, Retail, Grosir, Ecer, updatedAt, updatedBy, updatedByUid, sourceReportId
     competitor_reports/{reportId}                a salesman's field report, status pending -> approved_price | approved_note | rejected
   THE REGION TRAP: T4-T6 may read ONE region_prices doc per rival (their own) and may only QUERY reports by their own
   region or their own uid. A whole-collection list from them is refused by the rules, so the listener plan below is the
   only one that works for them. Three customer types only - there is no price per stick anywhere. */

export const CUST_TYPES = ['Retail', 'Grosir', 'Ecer'];
export const SHELF_OPTIONS = ['Eye level', 'Top shelf', 'Bottom shelf', 'Counter / till'];
export const PROMO_OPTIONS = ['None', 'Poster', 'Discount', 'Free gift'];
export const SPEED_OPTIONS = ['Fast', 'Medium', 'Slow'];
export const REPORT_STATUSES = ['pending', 'approved_price', 'approved_note', 'rejected'];

/* the region_prices doc id and every report's `region`: the profile location, trimmed and upper-cased */
export const regionKeyOf = (loc) => String(loc ?? '').trim().toUpperCase();

/* duplicate matching: lower-case, drop "(example)", keep letters and digits only */
export const normRivalName = (s) => String(s ?? '').toLowerCase().replace(/\(example\)/g, '').replace(/[^a-z0-9]/g, '');

export function findNearRival(rivals = [], name = '', skipId = null) {
    const k = normRivalName(name);
    if (!k) return null;
    return (rivals || []).find((r) => {
        if (!r || r.id === skipId) return false;
        const n = r.normName || normRivalName(r.name);
        return n && (n === k || n.includes(k) || k.includes(n));
    }) || null;
}

/* which listeners a viewer may open. allRegions: every rival's whole region_prices list + every report.
   Otherwise: one doc per rival (own region) + reports where region == own, + reports where reportedByUid == own uid. */
export function listenerPlan({ seesAll, myRegion, uid }) {
    const reg = regionKeyOf(myRegion);
    if (seesAll) return { prices: 'all', reports: [{ kind: 'all' }] };
    const reports = [];
    if (reg) reports.push({ kind: 'where', field: 'region', value: reg });
    if (uid) reports.push({ kind: 'where', field: 'reportedByUid', value: uid });
    return { prices: reg ? { doc: reg } : 'none', reports };
}

/* a region price entry -> a clean write payload. Only the 3 customer types, only numbers above 0. */
export function cleanPriceEntry(entry = {}) {
    const out = {};
    CUST_TYPES.forEach((ct) => {
        const v = Math.round(Number(entry?.[ct]));
        if (Number.isFinite(v) && v > 0) out[ct] = v;
    });
    return out;
}

/* how many rivals carry a different price for the same customer type in two or more regions */
export function regionGapCount(rivals = [], pricesByRival = {}) {
    return (rivals || []).filter((r) => {
        const regs = pricesByRival?.[r.id] || {};
        return CUST_TYPES.some((ct) => {
            const vals = Object.values(regs).map((p) => Number(p?.[ct]) || 0).filter((v) => v > 0);
            return new Set(vals).size > 1;
        });
    }).length;
}

export const ourPriceOf = (prod, ct) => Number(prod?.[`price${ct}`]) || 0;

/* "Rival Rp 500 cheaper" / "Cello Rp 500 cheaper" / "Same price" - null when either side has no price */
export function priceVerdict(ourP, rivalP, fmt = (n) => String(n)) {
    const o = Number(ourP) || 0, r = Number(rivalP) || 0;
    if (!o || !r) return null;
    if (r < o) return { side: 'rival', text: `Rival ${fmt(o - r)} cheaper`, pct: Math.round(((o - r) / o) * 100) };
    if (r > o) return { side: 'ours', text: `Cello ${fmt(r - o)} cheaper`, pct: Math.round(((r - o) / o) * 100) };
    return { side: 'same', text: 'Same price', pct: 0 };
}

/* the fields a report create may carry - firestore.rules CHANGE 30 refuses anything else */
export const REPORT_FIELDS = ['rivalId', 'newRivalName', 'categoryId', 'subCategoryId', 'newCategoryName', 'newSubCategoryName',
    'region', 'shopId', 'shopName', 'customerType', 'price', 'shelf', 'promo', 'speed', 'note', 'photo', 'status',
    'reportedByUid', 'reportedByName', 'createdAt'];
/* the fields an approval / rejection may change */
export const REVIEW_FIELDS = ['status', 'priceAction', 'rejectReason', 'reviewedBy', 'reviewedByUid', 'reviewedAt'];

/* BACKUP SHAPE: each rival carries its region prices as `regionPrices: { REGION: entry }` (like customers[i].benchmarks).
   restoreOps() turns that back into the two collections: [{ path: 'competitors', id, data }, { path: 'competitors/<id>/region_prices', id, data }] */
export function withRegionPrices(rivals = [], pricesByRival = {}) {
    return (rivals || []).map((r) => {
        const regionPrices = {};
        Object.entries(pricesByRival?.[r.id] || {}).forEach(([reg, e]) => {
            const { id: _drop, ...rest } = e || {};
            regionPrices[reg] = rest;
        });
        return { ...r, regionPrices };
    });
}
export function restoreOps(list = []) {
    const ops = [];
    (Array.isArray(list) ? list : []).forEach((r) => {
        if (!r || !r.id) return;
        const { regionPrices, id, ...data } = r;
        ops.push({ path: 'competitors', id, data });
        Object.entries(regionPrices || {}).forEach(([reg, e]) => {
            if (reg) ops.push({ path: `competitors/${id}/region_prices`, id: reg, data: { ...e, region: reg } });
        });
    });
    return ops;
}

export function buildReport(f = {}, { region, uid, name, createdAt }) {
    const price = Math.round(Number(f.price));
    if (!Number.isFinite(price) || price <= 0) return { error: 'Enter the price you saw, in Rp.' };
    if (!CUST_TYPES.includes(f.customerType)) return { error: 'Pick Retail, Grosir or Ecer.' };
    const reg = regionKeyOf(region);
    if (!reg) return { error: 'Your profile has no region yet. Ask your admin to set your location first.' };
    const rivalId = f.rivalId || null;
    const newRivalName = rivalId ? '' : String(f.newRivalName || '').trim();
    if (!rivalId && !newRivalName) return { error: 'Pick a rival or type the new product name.' };
    return { data: {
        rivalId, newRivalName, categoryId: f.categoryId || '', subCategoryId: f.subCategoryId || '',
        newCategoryName: '', newSubCategoryName: '',
        region: reg, shopId: f.shopId || null, shopName: String(f.shopName || '').trim(), customerType: f.customerType, price,
        shelf: SHELF_OPTIONS.includes(f.shelf) ? f.shelf : SHELF_OPTIONS[0],
        promo: PROMO_OPTIONS.includes(f.promo) ? f.promo : 'None',
        speed: SPEED_OPTIONS.includes(f.speed) ? f.speed : 'Medium',
        note: String(f.note || '').trim(), photo: !!f.photo, status: 'pending',
        reportedByUid: uid, reportedByName: String(name || ''), createdAt,
    } };
}
