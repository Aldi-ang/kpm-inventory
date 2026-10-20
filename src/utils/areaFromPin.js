/* WHERE A SHOP IS, FROM ITS PIN AND HIS MAP BORDERS.

   Aldi, 2026-10-20: "for easier jobs on the motorist and canvas i want the stores to be automatically autofilled on
   where is their kecamatan, kabupaten, and province according to their location inside map system and journey map
   ... because the salesman wont be looking at the map all the time".

   A shop registered from the Sales Terminal saved its GPS pin and NO area, so it landed in the directory's Unknown
   folder; the directory then guessed the area on screen from the borders, in the border's own spelling ("Jawa
   Tengah"), next to the typed "JAWA TENGAH" folder. Every saver now asks this file once, and the answer is written
   in capitals - the directory form's own rule (CustomerManager handleSubmit).

   The point-in-border test moved here from CustomerManager.jsx unchanged. JourneyView.jsx and MapMissionControl.jsx
   still carry their own copies. The borders are the Map System's: users/<owner>/mapSettings/bnd_<id>, the shape in
   `geometryString` (see mapBorders.js). */
import { collection, getDocs } from 'firebase/firestore';
import { loadBorderCache, saveBorderCache } from './borderCache.js';

export const isPointInPolygon = (point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i][0], yi = polygon[i][1], xj = polygon[j][0], yj = polygon[j][1];
        let intersect = ((yi > point[1]) !== (yj > point[1])) && (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

export const checkPointInGeoJSON = (lng, lat, geometry) => {
    if (!geometry || !geometry.coordinates) return false;
    const point = [lng, lat];
    try {
        if (geometry.type === 'Polygon') return isPointInPolygon(point, geometry.coordinates[0]);
        if (geometry.type === 'MultiPolygon') {
            for (let poly of geometry.coordinates) {
                const ring = Array.isArray(poly[0][0]) && typeof poly[0][0][0] === 'number' ? poly[0] : poly;
                if (isPointInPolygon(point, ring)) return true;
            }
        }
    } catch(e) { }
    return false;
};

/* the shop fields each border level fills (a Desa border fills nothing - the directory has no village level) */
const FIELD = { Provinsi: 'province', Kabupaten: 'region', Kecamatan: 'city' };

/* { province, region, city } of the borders the pin sits in, in capitals; '' for a level no border covers, and
   all three '' for a missing pin or 0,0 (the Atlantic - a zeroed record, refused by the directory form too). */
export const areaFromPin = (lat, lng, borders) => {
    const out = { province: '', region: '', city: '' };
    const la = Number(lat), lo = Number(lng);
    if (lat == null || lng == null || lat === '' || lng === '' || !Number.isFinite(la) || !Number.isFinite(lo) || (la === 0 && lo === 0)) return out;
    for (const b of borders || []) {
        const field = FIELD[b?.level];
        if (!field || out[field]) continue;
        if (checkPointInGeoJSON(lo, la, b.feature || b.geometry)) out[field] = String(b.name || '').trim().toUpperCase();
    }
    return out;
};

/* His borders into `set`: the device's cached copy first (instant, and the only copy offline), then the server's.
   Same two steps CustomerManager.jsx always used; the server copy refreshes the cache. */
export const watchBorders = async (db, appId, userId, set) => {
    try {
        const cached = await loadBorderCache(appId);
        if (cached.length > 0) set(cached);
    } catch (e) { /* no cache yet */ }
    if (!db || !appId || !userId || userId === 'default') return;
    try {
        const borders = [];
        const snap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/mapSettings`));
        snap.forEach(d => {
            if (!d.id.startsWith('bnd_')) return;
            const data = d.data();
            if (data && data.geometryString) {
                try { data.geometry = JSON.parse(data.geometryString); borders.push(data); } catch (e) { /* a broken shape is skipped */ }
            }
        });
        if (borders.length > 0) {
            set(borders);
            saveBorderCache(appId, borders);
        }
    } catch (e) { /* offline: the cached copy stands */ }
};
