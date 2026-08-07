/* Runs the real duplicate-finding logic against fixtures. `node src/config/findDuplicates.selfcheck.mjs`
   This is the whole reason findDuplicates.js is a pure module with no React and no Firestore in it.

   Every case here is a real shape from this app: a re-imported KML repeats a name exactly, a
   salesman re-registering a store he could not find retypes it slightly differently, and the three
   creation paths stamp their dates in three different formats. */
import assert from 'node:assert/strict';
import { findDuplicates, normaliseName, metresBetween, createdMillis, groupKey } from '../utils/findDuplicates.js';

let n = 0;
const t = (label, fn) => { fn(); n++; console.log(`  ok   ${label}`); };

// a Jakarta-ish anchor; +0.0001 latitude is about 11 metres
const LAT = -6.200000, LNG = 106.816666;
const near = (dLat = 0.0001, dLng = 0) => ({ latitude: LAT + dLat, longitude: LNG + dLng });

t('a clean list reports nothing', () => {
    assert.deepEqual(findDuplicates([]), []);
    assert.deepEqual(findDuplicates([{ id: 'a', name: 'TOKO SATU', ...near(0) }]), []);
    assert.deepEqual(findDuplicates([
        { id: 'a', name: 'TOKO SATU', ...near(0) },
        { id: 'b', name: 'TOKO DUA', latitude: -6.9, longitude: 107.9 },
    ]), []);
});

t('the same name twice is caught - the re-imported KML case', () => {
    const g = findDuplicates([
        { id: 'a', name: 'TOKO SUMBER JAYA' },
        { id: 'b', name: 'TOKO SUMBER JAYA' },
    ]);
    assert.equal(g.length, 1);
    assert.equal(g[0].members.length, 2);
    assert.equal(g[0].reason, 'name');
});

t('punctuation, case and spacing do not hide a match', () => {
    assert.equal(normaliseName('Toko  Sumber-Jaya!'), 'TOKO SUMBER JAYA');
    const g = findDuplicates([
        { id: 'a', name: 'Toko Sumber-Jaya' },
        { id: 'b', name: 'TOKO  SUMBER JAYA' },
    ]);
    assert.equal(g.length, 1);
});

t('blank names never match each other', () => {
    assert.deepEqual(findDuplicates([{ id: 'a', name: '' }, { id: 'b', name: '   ' }]), []);
});

t('two shops in one building are caught even with different names', () => {
    const g = findDuplicates([
        { id: 'a', name: 'TOKO BUDI', ...near(0) },
        { id: 'b', name: 'WARUNG BUDIONO', ...near(0.0001) },   // ~11m
    ]);
    assert.equal(g.length, 1);
    assert.equal(g[0].reason, 'location');
    assert.ok(g[0].widestMetres <= 40 && g[0].widestMetres > 0, `got ${g[0].widestMetres}m`);
});

t('genuinely different shops down the road are left alone', () => {
    // ~110m apart, comfortably outside the 40m default
    assert.deepEqual(findDuplicates([
        { id: 'a', name: 'TOKO BUDI', ...near(0) },
        { id: 'b', name: 'TOKO SITI', ...near(0.001) },
    ]), []);
});

t('the radius is honourable - widening it catches the neighbour', () => {
    const pair = [
        { id: 'a', name: 'TOKO BUDI', ...near(0) },
        { id: 'b', name: 'TOKO SITI', ...near(0.001) },
    ];
    assert.equal(findDuplicates(pair).length, 0);
    assert.equal(findDuplicates(pair, { radiusMetres: 200 }).length, 1);
});

t('a chain links up - A matches B by name, B matches C by distance', () => {
    const g = findDuplicates([
        { id: 'a', name: 'TOKO RANTAI', ...near(0) },
        { id: 'b', name: 'TOKO RANTAI', ...near(0.0001) },
        { id: 'c', name: 'KIOS LAIN', ...near(0.00015) },
    ]);
    assert.equal(g.length, 1, 'all three belong to one group');
    assert.equal(g[0].members.length, 3);
    assert.equal(g[0].reason, 'both');
});

t('oldest first, across all three date shapes the app writes', () => {
    const g = findDuplicates([
        { id: 'newest', name: 'TOKO WAKTU', createdAt: '2026-03-01T00:00:00.000Z' },
        { id: 'oldest', name: 'TOKO WAKTU', mappedAt: { seconds: 1600000000 } },   // 2020
        { id: 'middle', name: 'TOKO WAKTU', createdAt: '2021-01-01T00:00:00.000Z' },
    ]);
    assert.deepEqual(g[0].members.map(m => m.id), ['oldest', 'middle', 'newest']);
});

t('a store with no date sinks below the dated ones, never above', () => {
    const g = findDuplicates([
        { id: 'undated', name: 'TOKO KOSONG' },
        { id: 'dated', name: 'TOKO KOSONG', createdAt: '2026-03-01T00:00:00.000Z' },
    ]);
    assert.deepEqual(g[0].members.map(m => m.id), ['dated', 'undated']);
    assert.equal(createdMillis({ id: 'x' }), null);
});

t('bad coordinates are ignored, not treated as (0,0)', () => {
    // (0,0) is off West Africa - if nulls leaked through as zeroes these would "match"
    assert.deepEqual(findDuplicates([
        { id: 'a', name: 'SATU', latitude: null, longitude: null },
        { id: 'b', name: 'DUA', latitude: undefined, longitude: undefined },
    ]), []);
    assert.deepEqual(findDuplicates([
        { id: 'a', name: 'SATU', latitude: 'abc', longitude: 'def' },
        { id: 'b', name: 'DUA', latitude: '', longitude: '' },
    ]), []);
});

t('coordinates stored as strings still work - Firestore has both in this app', () => {
    const g = findDuplicates([
        { id: 'a', name: 'SATU', latitude: String(LAT), longitude: String(LNG) },
        { id: 'b', name: 'DUA', latitude: String(LAT + 0.0001), longitude: String(LNG) },
    ]);
    assert.equal(g.length, 1);
});

t('the input list is never mutated - this runs against live app state', () => {
    const input = [
        { id: 'b', name: 'TOKO X', createdAt: '2026-03-01T00:00:00.000Z' },
        { id: 'a', name: 'TOKO X', createdAt: '2020-01-01T00:00:00.000Z' },
    ];
    const snapshot = JSON.stringify(input);
    findDuplicates(input);
    assert.equal(JSON.stringify(input), snapshot, 'findDuplicates reordered or edited its input');
});

t('biggest pile first, so the worst offender is on top', () => {
    const g = findDuplicates([
        { id: 'p1', name: 'PAIR' }, { id: 'p2', name: 'PAIR' },
        { id: 't1', name: 'TRIO' }, { id: 't2', name: 'TRIO' }, { id: 't3', name: 'TRIO' },
    ]);
    assert.deepEqual(g.map(x => x.members.length), [3, 2]);
});

/* Straight from Aldi's real data: three "warung sembako sumber rejeki" 14.5km apart. A generic
   Indonesian shop name repeating across a city is a coincidence, not a double-registration, and
   offering a delete button on it is how a live store gets destroyed. */
t('same name but far apart is flagged, not presented as a duplicate', () => {
    const g = findDuplicates([
        {id:'a', name:'WARUNG SEMBAKO SUMBER REJEKI', latitude:-6.20, longitude:106.81},
        {id:'b', name:'WARUNG SEMBAKO SUMBER REJEKI', latitude:-6.20, longitude:106.94}, // ~14km
    ]);
    assert.equal(g.length, 1);
    assert.equal(g[0].sameNameFarApart, true);
    assert.ok(g[0].widestMetres > 10000);
});

t('a genuine double-registration in the same doorway is NOT flagged', () => {
    const g = findDuplicates([
        {id:'a', name:'TOKO ASLI', ...near(0)},
        {id:'b', name:'TOKO ASLI', ...near(0.0001)},   // ~11m
    ]);
    assert.equal(g[0].sameNameFarApart, false);
});

t('coincidences sink below real duplicates in the report', () => {
    const g = findDuplicates([
        {id:'far1', name:'WARUNG UMUM', latitude:-6.20, longitude:106.81},
        {id:'far2', name:'WARUNG UMUM', latitude:-6.20, longitude:106.94},
        {id:'far3', name:'WARUNG UMUM', latitude:-6.20, longitude:107.02},
        {id:'real1', name:'TOKO NYATA', ...near(0)},
        {id:'real2', name:'TOKO NYATA', ...near(0.0001)},
    ]);
    // the 3-member coincidence must NOT outrank the 2-member real pair
    assert.equal(g[0].members.length, 2, 'real duplicate should be first');
    assert.equal(g[0].sameNameFarApart, false);
    assert.equal(g[g.length-1].sameNameFarApart, true);
});

t('distances line up with members, oldest first is always 0', () => {
    const g = findDuplicates([
        {id:'old', name:'TOKO JARAK', ...near(0), createdAt:'2020-01-01T00:00:00.000Z'},
        {id:'new', name:'TOKO JARAK', ...near(0.001), createdAt:'2026-01-01T00:00:00.000Z'},
    ], {radiusMetres:5000});
    assert.equal(g[0].distances.length, g[0].members.length);
    assert.equal(g[0].distances[0], 0);
    assert.ok(g[0].distances[1] > 100 && g[0].distances[1] < 130, 'got '+g[0].distances[1]);
});

t('a store with no coordinates gets a null distance, not a wrong one', () => {
    const g = findDuplicates([
        {id:'a', name:'TOKO KOORD', ...near(0)},
        {id:'b', name:'TOKO KOORD'},
    ]);
    assert.deepEqual(g[0].distances.filter(d => d === null).length, 1);
});

/* The "not duplicates" decision has to survive rescans, or at a few thousand stores he re-judges
   the same false positives forever and stops using the tool. */
t('a group key is stable no matter what order the members arrive in', () => {
    const a = groupKey({members:[{id:'x'},{id:'a'},{id:'m'}]});
    const b = groupKey({members:[{id:'m'},{id:'x'},{id:'a'}]});
    assert.equal(a, b);
    assert.equal(a, 'a|m|x');
});

t('two different groups never share a key', () => {
    assert.notEqual(groupKey({members:[{id:'a'},{id:'b'}]}),
                    groupKey({members:[{id:'a'},{id:'c'}]}));
});

t('a third store joining a cleared pair changes the key, so it comes back', () => {
    const pair = groupKey({members:[{id:'a'},{id:'b'}]});
    const trio = groupKey({members:[{id:'a'},{id:'b'},{id:'c'}]});
    assert.notEqual(pair, trio, 'a new member is new information and must resurface');
});

t('the key survives a real scan result', () => {
    const g = findDuplicates([
        {id:'zzz', name:'TOKO KUNCI'}, {id:'aaa', name:'TOKO KUNCI'},
    ]);
    assert.equal(groupKey(g[0]), 'aaa|zzz');
});

t('junk groups do not blow up the key', () => {
    assert.equal(groupKey(null), '');
    assert.equal(groupKey({}), '');
});

t('haversine is sane', () => {
    assert.equal(Math.round(metresBetween(LAT, LNG, LAT, LNG)), 0);
    assert.ok(Math.abs(metresBetween(LAT, LNG, LAT + 0.001, LNG) - 111) < 3);
});

t('junk in the list does not crash the scan', () => {
    assert.doesNotThrow(() => findDuplicates([null, undefined, { id: 'a', name: 'TOKO' }, {}]));
});

console.log(`\n${'='.repeat(58)}\n${n} passed, 0 failed, ${n} checks`);
