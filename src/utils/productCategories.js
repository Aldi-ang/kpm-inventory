/* SHARED 2-LEVEL PRODUCT CATEGORY & SUB-CATEGORY HELPERS (Task 94).
   ─────────────────────────────────────────────────────────────────
   Pure helpers used by Master Vault, Sales Terminal, ExamineModal, and DashboardBenchmarks.
   - Works seamlessly before AND after Firestore `product_categories` documents exist:
     every reader falls back through `cat?.name || prod?.type || prod?.category || 'MISC'`. */

export function normCatName(s) {
    return String(s ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}

export function findDuplicateCategory(cats = [], name = '', skipId = null) {
    const n = normCatName(name);
    if (!n) return null;
    return (cats || []).find((c) => c && c.id !== skipId && (c.normName || normCatName(c.name)) === n) || null;
}

export function findDuplicateSub(cat = null, name = '', skipId = null) {
    const n = normCatName(name);
    if (!n || !cat || !Array.isArray(cat.subs)) return null;
    return cat.subs.find((s) => s && s.id !== skipId && (s.normName || normCatName(s.name)) === n) || null;
}

export function resolveCategoryName(prod, cats = []) {
    if (!prod) return 'MISC';
    if (prod.categoryId && Array.isArray(cats) && cats.length > 0) {
        const hit = cats.find((c) => c && c.id === prod.categoryId);
        if (hit && hit.name) return String(hit.name);
    }
    const legacy = String(prod.type || prod.category || '').trim();
    return legacy || 'MISC';
}

export function resolveSubName(prod, cats = []) {
    if (!prod) return '';
    if (prod.subCategoryId && Array.isArray(cats) && cats.length > 0) {
        for (const c of cats) {
            if (!c || !Array.isArray(c.subs)) continue;
            const sub = c.subs.find((s) => s && s.id === prod.subCategoryId);
            if (sub && sub.name) return String(sub.name);
        }
    }
    return String(prod.subCategoryName || prod.subCategory || '').trim();
}

export function categoryUsageCount(catId, inventory = []) {
    if (!catId || !Array.isArray(inventory)) return 0;
    return inventory.filter((p) => p && p.categoryId === catId).length;
}

export function subUsageCount(subId, inventory = []) {
    if (!subId || !Array.isArray(inventory)) return 0;
    return inventory.filter((p) => p && p.subCategoryId === subId).length;
}
