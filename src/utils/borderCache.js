// 🗄️ BORDER CACHE 2.0: IndexedDB-backed cache for map borders.
// localStorage has a hard ~5MB quota — 80+ GeoJSON borders exceed it, throwing
// QuotaExceededError and leaving a permanently STALE cache (the bug that hid the
// Kota Magelang border from the CRM). IndexedDB has no practical size limit here.
const DB_NAME = 'cello_border_cache';
const STORE = 'borders';

const openCacheDB = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});

export const saveBorderCache = async (appId, borders) => {
    const key = `cello_map_bnd_${appId}`;
    try {
        const idb = await openCacheDB();
        await new Promise((resolve, reject) => {
            const tx = idb.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(borders, key);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        idb.close();
    } catch (e) {
        console.warn('Border cache save skipped (non-fatal):', e);
    }
    // Free any legacy localStorage copy so the 5MB quota is released for the rest of the app.
    try { localStorage.removeItem(key); } catch (e) {}
};

export const loadBorderCache = async (appId) => {
    const key = `cello_map_bnd_${appId}`;
    try {
        const idb = await openCacheDB();
        const result = await new Promise((resolve, reject) => {
            const tx = idb.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        idb.close();
        if (Array.isArray(result) && result.length > 0) return result;
    } catch (e) {}
    // 🔄 LEGACY MIGRATION: read the old localStorage cache once, promote it to IndexedDB.
    try {
        const legacy = localStorage.getItem(key);
        if (legacy) {
            const parsed = JSON.parse(legacy);
            if (Array.isArray(parsed) && parsed.length > 0) {
                saveBorderCache(appId, parsed); // fire & forget (also removes the legacy key)
                return parsed;
            }
            localStorage.removeItem(key);
        }
    } catch (e) { try { localStorage.removeItem(key); } catch (e2) {} }
    return [];
};

export const clearBorderCache = async (appId) => {
    const key = `cello_map_bnd_${appId}`;
    try { localStorage.removeItem(key); } catch (e) {}
    try {
        const idb = await openCacheDB();
        await new Promise((resolve, reject) => {
            const tx = idb.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(key);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        idb.close();
    } catch (e) {}
};
