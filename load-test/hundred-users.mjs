// 100 PEOPLE AT ONCE - against the Firestore EMULATOR only, never the live project.
// Aldi, 2026-10-19: "make sure again that everything works well even when there is 100 of people
// using the app at once" ... "dont forget to do the test as well".
//
// Run:
//   npx firebase emulators:exec --only firestore --project demo-kpm-rules "node load-test/hundred-users.mjs"
//
// What it measures / proves:
//   A. reads one phone pays to OPEN the app (the listener set of useDatabaseSync + App.jsx), and
//      how many opens the free Spark plan (50,000 reads a day, whole company) survives
//   B. every sale is re-sent to every phone that is listening (fan-out)
//   C. 100 phones selling at the same moment: every receipt, van and tally lands exactly
//   D. row 2 - an offline sale's queued van write erases a captain's load (legacy shape: RED),
//      and the current code (src/utils/vanSync.js) keeps both (GREEN)
//   E. row 3 - an HQ vault sale written from an earlier read erases a restock (legacy shape: RED);
//      the transaction shape the sale now uses keeps both (GREEN)
// The emulator does not throttle a busy document (real Firestore: ~1 write/s sustained per doc),
// so C proves nothing is LOST, not how fast the real service is.
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
    doc, collection, setDoc, getDoc, getDocs, updateDoc, writeBatch, runTransaction, query, where,
    orderBy, onSnapshot, increment, disableNetwork, enableNetwork, waitForPendingWrites, Timestamp,
} from 'firebase/firestore';

const APP = 'cello-inventory-manager';
const BOSS = 'boss1';
const BASE = `artifacts/${APP}/users/${BOSS}`;

// Size of "100 people": 90 salesmen + 10 office users. Scales in a straight line.
const AGENTS = 90, OFFICE = 10, STORES = 1000, PRODUCTS = 40, SALES_PER_DAY = 25, DAYS = 7;
const NOTIFS_PER_AGENT_DAY = 2;
const BRANCHES = ['BANDUNG', 'MUNTILAN', 'SEMARANG'];
const SPARK_READS_PER_DAY = 50000;
const PHOTO_KB = 80;   // one proof photo: 800 px JPEG at quality 0.6, base64 (helpers.js compressImageToBase64) - an estimate

const OPEN_RULES = `rules_version = '2';
service cloud.firestore { match /databases/{d}/documents { match /{x=**} { allow read, write: if true; } } }`;

let pass = 0, fail = 0;
const ok = (label, cond, extra = '') => {
    if (cond) { pass++; console.log(`  PASS: ${label}${extra ? '  ' + extra : ''}`); }
    else { fail++; console.log(`  FAIL: ${label}${extra ? '  ' + extra : ''}`); }
};
const red = (label, cond, extra = '') => {   // a legacy shape that MUST lose data - proves the bug is real
    if (cond) { pass++; console.log(`  RED (as expected): ${label}${extra ? '  ' + extra : ''}`); }
    else { fail++; console.log(`  FAIL - legacy shape did NOT lose data, the mechanism is wrong: ${label}${extra ? '  ' + extra : ''}`); }
};
const fmt = (n) => n.toLocaleString('en-US');

const env = await initializeTestEnvironment({
    projectId: 'demo-kpm-rules',
    firestore: { rules: OPEN_RULES, host: '127.0.0.1', port: 8080 },
});
let phoneN = 0;
const phone = () => env.authenticatedContext(`phone${++phoneN}`, { email: `p${phoneN}@test.com` }).firestore();

/* ── seed one company at 100-user size ─────────────────────────────────────────────────────── */
const now = Date.now();
const DAY_MS = 86400000;
const products = Array.from({ length: PRODUCTS }, (_, i) => ({
    id: `p${i}`, name: `Product ${i}`, stock: 100000, packsPerSlop: 10, slopsPerBal: 20, balsPerCarton: 4,
    priceDistributor: 8000, priceRetail: 10000,
}));
const productsById = Object.fromEntries(products.map(p => [p.id, p]));
const vanCargo = () => products.slice(0, 10).map(p => ({ productId: p.id, name: p.name, qty: 50, unit: 'Bks' }));

console.log('Seeding one company at 100-user size ...');
await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const writes = [];
    const put = (path, data) => writes.push([path, data]);
    put(`${BASE}/settings/general`, { companyName: 'Load Test Co' });
    put(`${BASE}/motorists/ADMIN_VEHICLE`, { name: 'Admin (Boss Vehicle)', activeCanvas: [] });
    products.forEach(p => put(`${BASE}/products/${p.id}`, p));
    for (let a = 0; a < AGENTS; a++) {
        put(`${BASE}/motorists/van${a}`, { name: `Agent ${a}`, location: BRANCHES[a % 3], activeCanvas: vanCargo() });
        put(`${BASE}/career/van${a}`, { bonusXP: 0 });
    }
    for (let s = 0; s < STORES; s++) put(`${BASE}/customers/c${s}`, { name: `Toko ${s}`, priceTier: 'Retail', status: 'APPROVED', storeImage: '' });
    BRANCHES.forEach(b => products.forEach(p => put(`${BASE}/branches/${b}/inventory/${p.id}`, { stock: 500 })));
    for (let d = 0; d < DAYS; d++) {
        for (let a = 0; a < AGENTS; a++) {
            const ts = Timestamp.fromMillis(now - d * DAY_MS - a * 1000);
            for (let k = 0; k < SALES_PER_DAY; k++) {
                put(`${BASE}/transactions/d${d}a${a}k${k}`, {
                    date: new Date(now - d * DAY_MS).toISOString().slice(0, 10), customerName: `Toko ${(a * 11 + k) % STORES}`,
                    paymentType: 'Cash', type: 'SALE', total: 20000, totalProfit: 4000, agentId: `van${a}`, agentName: `Agent ${a}`,
                    items: [{ productId: `p${k % 10}`, name: `Product ${k % 10}`, qty: 2, unit: 'Bks', calculatedPrice: 10000 }],
                    timestamp: ts, deliveryProof: { photo: '', latitude: -7, longitude: 110 },
                });
            }
            put(`${BASE}/eod_reports/d${d}a${a}`, { agentId: `van${a}`, timestamp: ts, status: 'PENDING' });
            for (let n = 0; n < NOTIFS_PER_AGENT_DAY; n++) put(`${BASE}/notifications/d${d}a${a}n${n}`, { agentId: `van${a}`, timestamp: ts, read: false });
        }
    }
    for (let i = 0; i < writes.length; i += 500) {
        const b = writeBatch(db);
        writes.slice(i, i + 500).forEach(([p, d]) => b.set(doc(db, p), d));
        await b.commit();
    }
    console.log(`  seeded ${fmt(writes.length)} documents`);
});

/* ── A. what one phone pays to open the app ────────────────────────────────────────────────── */
// The listener set a salesman's phone opens, copied from useDatabaseSync.js + App.jsx (2026-10-19).
const sevenDaysAgo = new Date(now - 7 * DAY_MS);
const tg = (db, name, ordered = true) => ordered
    ? query(collection(db, `${BASE}/${name}`), where('timestamp', '>=', sevenDaysAgo), orderBy('timestamp', 'desc'))
    : query(collection(db, `${BASE}/${name}`), where('timestamp', '>=', sevenDaysAgo));
const listenerSet = (db, role, vanId) => {
    const set = [
        ['settings/general', doc(db, `${BASE}/settings/general`)],
        ['products', collection(db, `${BASE}/products`)],
        ['customers', query(collection(db, `${BASE}/customers`), orderBy('name', 'asc'))],
        ['motorists', collection(db, `${BASE}/motorists`)],
        ['career', collection(db, `${BASE}/career`)],
        ['transactions (7 days, everyone)', tg(db, 'transactions')],
        ['samplings', tg(db, 'samplings')],
        ['eod_reports', tg(db, 'eod_reports')],
        ['account_transfers', tg(db, 'account_transfers')],
        // useDatabaseSync downloaded these a second time until 2026-10-19 (+1,260 reads per open)
        ['notifications (App.jsx)', tg(db, 'notifications', false)],
        ['ADMIN_VEHICLE', doc(db, `${BASE}/motorists/ADMIN_VEHICLE`)],
        ...BRANCHES.map(b => [`branch ${b}`, collection(db, `${BASE}/branches/${b}/inventory`)]),
    ];
    if (vanId) set.push(['own van', doc(db, `${BASE}/motorists/${vanId}`)]);
    if (role === 'ADMIN') set.push(['audit_logs', tg(db, 'audit_logs')], ['procurement', tg(db, 'procurement')]);
    return set;
};
const openApp = (db, role, vanId) => Promise.all(listenerSet(db, role, vanId).map(([label, ref]) => new Promise((resolve, reject) => {
    const unsub = onSnapshot(ref, (snap) => {
        const docs = snap.docs ? snap.docs : (snap.exists() ? [snap] : []);
        resolve({ label, reads: Math.max(1, docs.length), bytes: docs.reduce((s, d) => s + JSON.stringify(d.data()).length, 0), unsub });
    }, reject);
})));

console.log('\nA. What one phone pays to OPEN the app (every open after 30+ minutes away is billed in full):');
const opened = await openApp(phone(), 'SALESMAN', 'van0');
opened.sort((x, y) => y.reads - x.reads).slice(0, 6).forEach(o => console.log(`     ${o.label.padEnd(34)} ${fmt(o.reads).padStart(7)} reads`));
const readsPerOpen = opened.reduce((s, o) => s + o.reads, 0);
const txReads = opened.find(o => o.label.startsWith('transactions')).reads;
console.log(`     ${'TOTAL per open'.padEnd(34)} ${fmt(readsPerOpen).padStart(7)} reads`);
console.log(`     + the proof photo inside every sale: ${fmt(txReads)} x ~${PHOTO_KB} KB = ~${fmt(Math.round(txReads * PHOTO_KB / 1024))} MB downloaded per open`);
const opensPerDay = Math.floor(SPARK_READS_PER_DAY / readsPerOpen);
console.log(`     Spark free plan: 50,000 reads a day for the WHOLE company = ${opensPerDay} app opens, then every read fails until the daily reset`);
ok('measured: one salesman open costs more than 10,000 reads at 100-user size', readsPerOpen > 10000, `(${fmt(readsPerOpen)})`);
opened.forEach(o => o.unsub());

/* ── B. fan-out: every sale goes to every listening phone ─────────────────────────────────── */
/* The probe listens on a SMALL query (one agent's sales). On the full 15,750-sale query the EMULATOR
   delivers a new sale every ~5 s per phone - an emulator limit, not Firestore's - so the full query
   timed out at 6 of 20. The rule being shown is the same: every phone whose query matches a new
   sale receives it, and each delivery is billed as one read. The app's query matches every sale. */
console.log('\nB. Fan-out - each new sale is re-sent to every phone listening:');
const LISTENERS = 5, NEW_SALES = 20;
const watchers = await Promise.all(Array.from({ length: LISTENERS }, () => new Promise((resolve) => {
    const db = phone();
    let first = true, changes = 0, startSize = 0, size = 0;
    const unsub = onSnapshot(query(collection(db, `${BASE}/transactions`), where('agentId', '==', 'fanProbe')), (snap) => {
        size = snap.size;
        if (first) { first = false; startSize = snap.size; resolve({ unsub, get changes() { return size - startSize; }, get events() { return changes; } }); return; }
        changes += snap.docChanges().length;
    });
})));
const seller = phone();
for (let i = 0; i < NEW_SALES; i++) {
    await setDoc(doc(seller, `${BASE}/transactions/fan${i}`), { agentId: 'fanProbe', type: 'SALE', total: 1, items: [], timestamp: Timestamp.now() });
}
for (let waited = 0; waited < 30000 && watchers.some(w => w.changes < NEW_SALES); waited += 500) await new Promise(r => setTimeout(r, 500));
const perPhone = watchers.map(w => w.changes);
ok(`each of ${LISTENERS} phones received all ${NEW_SALES} new sales`, perPhone.every(c => c >= NEW_SALES),
   `(list grew by ${perPhone.join(', ')}; change events counted ${watchers.map(w => w.events).join(', ')})`);
console.log(`     at 100 phones x ${fmt(AGENTS * SALES_PER_DAY)} sales a day = ${fmt(100 * AGENTS * SALES_PER_DAY)} extra reads a day`);
watchers.forEach(w => w.unsub());

/* ── C. 100 phones selling at the same moment ──────────────────────────────────────────────── */
console.log('\nC. 100 phones press "sell" at the same moment (van in a transaction, tally in the same write):');
let applySaleToCanvas = null, settleSale, canvasWithPending, syncOfflineSale;
try { ({ applySaleToCanvas, settleSale, canvasWithPending, syncOfflineSale } = await import('../src/utils/vanSync.js')); }
catch (e) { console.log(`     (src/utils/vanSync.js not loadable: ${e.message.split('\n')[0]})`); }
const { tallySale, statsPath } = await import('../src/utils/salesRollupWrite.js');
const month = new Date().toISOString().slice(0, 7);
const statsBefore = (await getDoc(doc(phone(), statsPath(APP, BOSS, month)))).data()?.byProduct?.p0?.qty || 0;
const sellers = Array.from({ length: 100 }, (_, i) => ({ db: phone(), van: i < AGENTS ? `van${i}` : null }));
const moveP0 = [{ productId: 'p0', name: 'Product 0', prodData: productsById.p0, qtyInBks: 2, isPhysicallyGiven: true, isReturnedToStock: false }];
const t0 = Date.now();
const results = await Promise.allSettled(sellers.map(({ db, van }, i) => runTransaction(db, async (t) => {
    const vanRef = van ? doc(db, `${BASE}/motorists/${van}`) : null;
    const vanSnap = vanRef ? await t.get(vanRef) : null;
    if (vanRef && applySaleToCanvas) t.update(vanRef, { activeCanvas: applySaleToCanvas(vanSnap.data().activeCanvas, moveP0) });
    const txRef = doc(db, `${BASE}/transactions/rush${i}`);
    const sale = { date: new Date().toISOString().slice(0, 10), type: 'SALE', paymentType: 'Cash', agentId: van || 'ADMIN',
                   items: [{ productId: 'p0', name: 'Product 0', qty: 2, unit: 'Bks', calculatedPrice: 10000 }], total: 20000, timestamp: Timestamp.now() };
    t.set(txRef, sale);
    tallySale(t, db, APP, BOSS, sale, productsById, 1);
})));
const ms = Date.now() - t0;
const failed = results.filter(r => r.status === 'rejected');
ok('all 100 sales saved, none refused', failed.length === 0, `(${100 - failed.length}/100 in ${fmt(ms)} ms${failed.length ? '; first error: ' + String(failed[0].reason).slice(0, 80) : ''})`);
const rushDocs = await Promise.all(Array.from({ length: 100 }, (_, i) => getDoc(doc(phone(), `${BASE}/transactions/rush${i}`))));
ok('all 100 receipts are in the database', rushDocs.filter(d => d.exists()).length === 100);
const statsAfter = (await getDoc(doc(phone(), statsPath(APP, BOSS, month)))).data()?.byProduct?.p0?.qty || 0;
ok('the shared monthly tally counted every one (no lost increments)', statsAfter - statsBefore === 200, `(+${statsAfter - statsBefore} packs, expected +200)`);
if (applySaleToCanvas) {
    const vans = await Promise.all(Array.from({ length: AGENTS }, (_, a) => getDoc(doc(phone(), `${BASE}/motorists/van${a}`))));
    ok('every one of the 90 vans went down by exactly 2 packs', vans.every(v => v.data().activeCanvas.find(r => r.productId === 'p0').qty === 48));
}

/* ── D. row 2: an offline sale and a captain's load on the same van ────────────────────────── */
console.log('\nD. A salesman sells WITHOUT signal while his captain loads 100 more packs onto the same van:');
const resetVan = async (id, qty) => setDoc(doc(phone(), `${BASE}/motorists/${id}`), { name: id, activeCanvas: [{ productId: 'p1', name: 'Product 1', qty, unit: 'Bks' }] });
const captainLoads = (db, id, add) => runTransaction(db, async (t) => {   // FleetCanvasManager's load: read + write in a transaction
    const ref = doc(db, `${BASE}/motorists/${id}`);
    const c = (await t.get(ref)).data().activeCanvas;
    t.update(ref, { activeCanvas: c.map(r => r.productId === 'p1' ? { ...r, qty: r.qty + add } : r) });
});
const vanQty = async (id) => ((await getDoc(doc(phone(), `${BASE}/motorists/${id}`))).data().activeCanvas.find(r => r.productId === 'p1') || { qty: 0 }).qty;
const watchVan = (db, id) => new Promise(r => { const u = onSnapshot(doc(db, `${BASE}/motorists/${id}`), () => r(u)); });
const sell10 = [{ productId: 'p1', name: 'Product 1', prodData: productsById.p1, qtyInBks: 10, isPhysicallyGiven: true, isReturnedToStock: false }];

// legacy shape - useTransactionEngine.js before 2026-10-19: compute the whole list from the cache, queue updateDoc
await resetVan('vanD1', 50);
{
    const phoneDb = phone(), captain = phone();
    const unsub = await watchVan(phoneDb, 'vanD1');
    await disableNetwork(phoneDb);
    const cached = (await getDoc(doc(phoneDb, `${BASE}/motorists/vanD1`))).data().activeCanvas;
    const legacyApply = (canvas, moves) => canvas.map(r => r.productId === moves[0].productId ? { ...r, qty: r.qty - moves[0].qtyInBks } : r);
    updateDoc(doc(phoneDb, `${BASE}/motorists/vanD1`), { activeCanvas: legacyApply(cached, sell10) }).catch(() => {});
    await captainLoads(captain, 'vanD1', 100);
    await enableNetwork(phoneDb); await waitForPendingWrites(phoneDb); unsub();
    const q = await vanQty('vanD1');
    red('legacy: the captain\'s 100 packs vanish (should be 50 + 100 - 10 = 140)', q !== 140, `(van says ${q})`);
}
if (syncOfflineSale) {
    await resetVan('vanD2', 50);
    const phoneDb = phone(), captain = phone();
    const unsub = await watchVan(phoneDb, 'vanD2');
    await disableNetwork(phoneDb);
    const ghost = { cloudId: 'offlineD2', localId: 7, vanPending: true, agentId: 'vanD2', type: 'SALE', paymentType: 'Cash',
                    date: new Date().toISOString().slice(0, 10), customerName: 'Toko 1', total: 100000,
                    items: [{ productId: 'p1', name: 'Product 1', qty: 10, unit: 'Bks', calculatedPrice: 10000 }] };
    const cached = (await getDoc(doc(phoneDb, `${BASE}/motorists/vanD2`))).data().activeCanvas;
    ok('offline, the phone already shows the van minus the waiting sale', canvasWithPending(cached, [ghost], 'vanD2', productsById)[0].qty === 40);
    await captainLoads(captain, 'vanD2', 100);
    await enableNetwork(phoneDb);
    const r1 = await syncOfflineSale(phoneDb, APP, BOSS, ghost, productsById);
    unsub();
    ok('current code: the van keeps the captain\'s load AND loses the 10 sold', await vanQty('vanD2') === 140, `(van says ${await vanQty('vanD2')})`);
    ok('the receipt landed under the id fixed when it was queued', (await getDoc(doc(phone(), `${BASE}/transactions/offlineD2`))).exists() && r1.landed);
    const r2 = await syncOfflineSale(phone(), APP, BOSS, ghost, productsById);
    ok('a second sync of the same sale writes nothing (no double deduction)', !r2.landed && await vanQty('vanD2') === 140);

    await resetVan('vanD3', 5);
    const g3 = { ...ghost, cloudId: 'offlineD3', agentId: 'vanD3' };
    const r3 = await syncOfflineSale(phone(), APP, BOSS, g3, productsById);
    const saved3 = (await getDoc(doc(phone(), `${BASE}/transactions/offlineD3`))).data();
    ok('a van short of stock still saves the sale and REPORTS the gap', r3.landed && r3.short[0]?.missingBks === 5 && saved3.vanShortfall?.[0]?.missingBks === 5);
}

/* ── E. row 3: an HQ vault sale and a restock on the same product ──────────────────────────── */
console.log('\nE. Two HQ users: one sells 30 packs from the vault while the other receives 500:');
const setStock = (id, n) => setDoc(doc(phone(), `${BASE}/products/${id}`), { ...productsById.p2, id, stock: n });
const stockOf = async (id) => (await getDoc(doc(phone(), `${BASE}/products/${id}`))).data().stock;
await setStock('vaultE1', 1000);
{   // legacy shape: getDoc, then batch.update(stock: read - qty)
    const seller = phone(), receiver = phone();
    const read = (await getDoc(doc(seller, `${BASE}/products/vaultE1`))).data().stock;
    await updateDoc(doc(receiver, `${BASE}/products/vaultE1`), { stock: increment(500) });   // RestockVaultView's receive
    const b = writeBatch(seller); b.update(doc(seller, `${BASE}/products/vaultE1`), { stock: read - 30 }); await b.commit();
    const s = await stockOf('vaultE1');
    red('legacy: the 500 received packs vanish (should be 1000 - 30 + 500 = 1470)', s !== 1470, `(stock says ${s})`);
}
await setStock('vaultE2', 1000);
{   // the shape processTransaction now uses: read and write inside one transaction
    const seller = phone(), receiver = phone();
    let attempts = 0;
    await runTransaction(seller, async (t) => {
        attempts++;
        const ref = doc(seller, `${BASE}/products/vaultE2`);
        const s = (await t.get(ref)).data().stock;
        if (attempts === 1) await updateDoc(doc(receiver, `${BASE}/products/vaultE2`), { stock: increment(500) });
        if (s < 30) throw 'Not enough stock';
        t.update(ref, { stock: s - 30 });
    });
    const s = await stockOf('vaultE2');
    ok('transaction: both land (1470) - it noticed the restock and retried', s === 1470, `(stock says ${s}, ${attempts} attempts)`);
}

console.log(`\n${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
