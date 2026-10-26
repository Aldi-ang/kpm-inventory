import { useState, useEffect, useMemo } from 'react';
import { collection, doc, getDocs, onSnapshot, query, orderBy, setDoc, where } from 'firebase/firestore'; // 🚀 IMPORTED 'where'
import { applyDocChanges } from '../utils/docChanges';
import { ACCESS_DOC_ID, accessFor, grantQueries, seesEveryShop } from '../utils/customerAccess.js';
import { notify } from '../components/Toast.jsx';
import { isPromo } from '../utils/helpers';

const NO_SHOPS = [];   // one stable empty list, so screens keyed on `customers` do not re-run every render

export default function useDatabaseSync(db, appId, user, userId, userRole, location) {
    // Data States
    /* `products` is the whole collection. `inventory` - what every cigarette screen, sum and the Sales Terminal reads -
       never holds a promo item, so no Bks / revenue / price-tier / pita cukai path can count one; promoItems go only
       where a screen asks for them (logicFixes "PROMO ITEMS"). */
    const [products, setProducts] = useState([]);
    const inventory = useMemo(() => products.filter((p) => !isPromo(p)), [products]);
    const promoItems = useMemo(() => products.filter(isPromo), [products]);
    const [customers, setCustomers] = useState([]); 
    const [transactions, setTransactions] = useState([]);
    const [samplings, setSamplings] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [procurements, setProcurements] = useState([]); 
    const [motorists, setMotorists] = useState([]);
    const [career, setCareer] = useState({});
    const [agentInventories, setAgentInventories] = useState({}); 
    const [eodReports, setEodReports] = useState([]);
    const [transferRequests, setTransferRequests] = useState([]);
    const [adminCanvas, setAdminCanvas] = useState([]);
    const [adminPromo, setAdminPromo] = useState([]);   // the boss vehicle's promo goods, pcs - the terminal's give row (stage 4)
    const [branchStock, setBranchStock] = useState({});
    const [appSettings, setAppSettings] = useState({ mascotImage: '', companyName: 'KPM Inventory', mascotMessages: [] });
    const [editCompanyProfile, setEditCompanyProfile] = useState({ name: "", address: "", phone: "" });

    useEffect(() => {
        if (!user || !userId || userId === 'default') return;
        const basePath = `artifacts/${appId}/users/${userId}`;
        
        // 1. Settings
        const unsubSettings = onSnapshot(doc(db, basePath, 'settings', 'general'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setAppSettings(data);
                setEditCompanyProfile({
                    name: data?.companyName || "KPM Inventory",
                    address: data?.companyAddress || "",
                    phone: data?.companyPhone || ""
                });
            } else {
                setDoc(doc(db, basePath, 'settings', 'general'), { companyName: 'KPM Inventory' });
            }
        }, (err) => console.warn("Settings listener:", err.code));

        // 🚀 TIME-GATE ENGINE: Calculate the exact timestamp for 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 2. Core Collections (Static data like Inventory and Customers load fully)
        const unsubInv = onSnapshot(collection(db, basePath, 'products'), (snap) => setProducts(snap.docs.map(d => ({id: d.id, ...d.data()}))), (err) => console.warn("Inventory listener:", err.code));
        /* CUSTOMERS IS THE ONE COLLECTION THAT CANNOT AFFORD A FULL RE-MAP, and that is not a
           style preference — see docChanges.js. Every outlet carries its store photo as base64
           INSIDE the document, so re-running `d.data()` over ~100 outlets rebuilds several
           megabytes of string on the main thread. That is what ran the instant a new outlet was
           registered, on the phone, right as the manifest came back. Only this listener is
           changed: the others carry small documents and are not worth the extra moving part.

           `custFirst` is load-bearing. This effect re-subscribes whenever the signed-in user or
           the vault owner changes, and the first snapshot of a NEW subscription reports every
           document as `added` — applied incrementally on top of the PREVIOUS tenant's list, that
           would splice one company's outlets into another's. So the first snapshot per
           subscription is still a full re-map (which costs the same, since everything is new),
           and only the snapshots after it are incremental. The flag lives in the effect closure,
           so each subscription gets its own. */
        /* (the customers listener moved to its own effect below - it waits for the customer access doc) */
        const unsubMotorists = onSnapshot(collection(db, basePath, 'motorists'), (snap) => setMotorists(snap.docs.map(d => ({id: d.id, ...d.data()}))), (err) => console.warn("Motorists listener:", err.code));
        // 🚀 CAREER LEDGER (Phase 2): no time gate — bounded by headcount, not history.
        const unsubCareer = onSnapshot(collection(db, basePath, 'career'), (snap) => setCareer(Object.fromEntries(snap.docs.map(d => [d.id, d.data()]))), (err) => console.warn("Career listener:", err.code));
        
        // 🛡️ FIREWALL ACTIVE: All transaction/log data is strictly gated to the last 7 days!
        const unsubTrans = onSnapshot(query(collection(db, basePath, 'transactions'), where('timestamp', '>=', sevenDaysAgo), orderBy('timestamp', 'desc')), (snap) => setTransactions(snap.docs.map(d => ({id: d.id, ...d.data()}))), (err) => console.warn("Transactions listener:", err.code));
        const unsubSamp = onSnapshot(query(collection(db, basePath, 'samplings'), where('timestamp', '>=', sevenDaysAgo), orderBy('timestamp', 'desc')), (snap) => setSamplings(snap.docs.map(d => ({id: d.id, ...d.data()}))), (err) => console.warn("Samplings listener:", err.code));
        /* 💸 ADMIN ONLY, same pattern the procurement listener below already uses.
           Audit logs are written far more often than sales — every save, every restore, every
           permission change — so this was the single largest listener in the app, and every
           salesman's phone was paying for all of it on every cold start.

           Nothing non-admin reads them: SafetyStatus (the only agent-visible consumer, via
           DashboardView) looks exclusively for backup and mirror entries, which are admin
           actions. A salesman's copy was always empty of anything he could act on. */
        let unsubLogs = () => {};
        if (userRole === 'ADMIN') {
            unsubLogs = onSnapshot(query(collection(db, basePath, 'audit_logs'), where('timestamp', '>=', sevenDaysAgo), orderBy('timestamp', 'desc')), (snap) => setAuditLogs(snap.docs.map(d => ({id: d.id, ...d.data()}))), (err) => console.warn("Audit logs listener:", err.code));
        }
        // 🚀 FIX: Procurement is HQ-only (see RestockVaultView, "HQ ONLY: FACTORY PROCUREMENT
        // ENGINE"). Firestore rules allow it for the vault owner / distributor admin only, so
        // subscribing every tier threw an uncaught permission-denied in the snapshot listener
        // for Tier 3-6 — the error that surfaced on their landing screen (Journey Plan).
        // The error callback keeps any future denial from becoming an uncaught rejection.
        let unsubProc = () => {};
        if (userRole === 'ADMIN') {
            unsubProc = onSnapshot(query(collection(db, basePath, 'procurement'), where('timestamp', '>=', sevenDaysAgo), orderBy('timestamp', 'desc')), (snap) => setProcurements(snap.docs.map(d => ({id: d.id, ...d.data()}))), (err) => console.warn("Procurement listener:", err.code));
        }
        const unsubEod = onSnapshot(query(collection(db, basePath, 'eod_reports'), where('timestamp', '>=', sevenDaysAgo), orderBy('timestamp', 'desc')), (snap) => setEodReports(snap.docs.map(d => ({id: d.id, ...d.data()}))), (err) => console.warn("EOD reports listener:", err.code));
        const unsubTransfers = onSnapshot(query(collection(db, basePath, 'account_transfers'), where('timestamp', '>=', sevenDaysAgo), orderBy('timestamp', 'desc')), (snap) => setTransferRequests(snap.docs.map(d => ({id: d.id, ...d.data()}))), (err) => console.warn("Account transfers listener:", err.code));

        /* 3. Notifications are NOT listened to here. App.jsx's own listener (systemNotifs) feeds
           the bell. This one downloaded the same seven days a second time on every phone and then
           filtered on targetRole/targetId - fields no notification carries - so it always came out
           empty and nothing read it. 1,260 reads per app open at 100 users
           (load-test/hundred-users.mjs, 2026-10-19). */

        // 4. Admin Vehicle Canvas
        const unsubAdminVeh = onSnapshot(doc(db, basePath, 'motorists', 'ADMIN_VEHICLE'), (snap) => {
            if (snap.exists()) {
                setAdminCanvas(snap.data().activeCanvas || []);
                setAdminPromo(snap.data().promoCanvas || []);
            } else if (userRole === 'ADMIN') {
                setDoc(doc(db, basePath, 'motorists', 'ADMIN_VEHICLE'), {
                    name: "Admin (Boss Vehicle)",
                    role: "Canvas",
                    status: "Active",
                    email: user.email || "admin@system.local",
                    activeCanvas: [],
                    allowedPayments: ['Cash', 'QRIS', 'Transfer', 'Titip'],
                    allowedTiers: ['Retail', 'Grosir', 'Ecer']
                });
            }
        }, (err) => console.warn("Admin vehicle canvas listener:", err.code));

        return () => { 
            unsubSettings(); unsubInv(); unsubTrans(); unsubSamp(); 
            unsubLogs(); unsubProc(); unsubMotorists(); unsubCareer();
            unsubAdminVeh(); unsubEod(); unsubTransfers();
        };
    }, [user, db, appId, userId, userRole]);

    /* ── CUSTOMERS, LIMITED BY FOLDER (P2) ──────────────────────────────────────────────────
       Aldi, 2026-10-20: *"bandung team may only see bandung's customer and not muntilan one"*. While
       settings/customer_access is `on`, firestore.rules CHANGE 17 hands T3-T6 only the shops in their
       team's ticked Kecamatan - and refuses the whole every-shop query, because rules are not filters.
       So a limited phone asks one Kabupaten at a time (`city in`, max 30), plus, for the team's admin,
       his team's temporary folder; the pieces are merged by id. T1/T2 and "off" keep the one query.
       Nothing subscribes until the access doc has answered: asking for every shop first would be
       refused, and the refusal kills that listener for good. */
    const [customerAccess, setCustomerAccess] = useState(undefined);   // undefined = not read yet, null = no doc
    useEffect(() => {
        if (!user || !userId || userId === 'default') return;
        return onSnapshot(doc(db, `artifacts/${appId}/users/${userId}/settings`, ACCESS_DOC_ID),
            (snap) => setCustomerAccess(snap.exists() ? snap.data() : null),
            (err) => { console.warn("Customer access listener:", err.code); setCustomerAccess(null); });
    }, [user, db, appId, userId]);
    const scope = accessFor(customerAccess, userRole, location);
    const custKey = seesEveryShop(userRole) || customerAccess === null || (customerAccess && !scope) ? 'all'
        : customerAccess === undefined ? ''
        : JSON.stringify({ team: scope.team, admin: scope.admin, q: grantQueries(scope.grant) });
    /* a team with no ticks and no temporary folder asks nothing - and the list left from before the switch must not show */
    const noFolders = !!scope && !scope.admin && grantQueries(scope.grant).length === 0;

    useEffect(() => {
        if (!user || !userId || userId === 'default' || !custKey) return;
        const ref = collection(db, `artifacts/${appId}/users/${userId}/customers`);
        const fail = (err) => {
            console.warn("Customers listener:", err.code);
            if (custKey !== 'all') notify(`Your shop list could not load (${err.code}). Tell your admin.`);
        };
        if (custKey === 'all') {
            /* `custFirst` is load-bearing - see the comment above the customers state's old home. */
            let custFirst = true;
            return onSnapshot(query(ref, orderBy('name', 'asc')), (snap) => {
                if (custFirst) { custFirst = false; setCustomers(snap.docs.map(d => ({id: d.id, ...d.data()}))); return; }
                setCustomers(prev => applyDocChanges(prev, snap.docChanges()));
            }, fail);
        }
        const { team, admin, q } = JSON.parse(custKey);
        const queries = q.map(g => query(ref, where('province', '==', g.province), where('region', '==', g.region), where('city', 'in', g.cities)));
        if (admin) queries.push(query(ref, where('holdTeam', '==', team)));
        if (queries.length === 0) return;   // a team with no ticks: `noFolders` below hands out an empty list
        const parts = queries.map(() => []);
        const unsubs = queries.map((qq, i) => onSnapshot(qq, (snap) => {
            parts[i] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const byId = new Map();
            for (const c of parts.flat()) byId.set(c.id, c);
            /* orderBy('name') used to sort AND drop a shop with no name field; same here */
            setCustomers([...byId.values()].filter(c => c.name !== undefined).sort((a, b) => String(a.name).localeCompare(String(b.name))));
        }, fail));
        return () => unsubs.forEach(u => u());
    }, [db, appId, user, userId, custKey]);

    /* ── EVERY REGIONAL WAREHOUSE'S SHELF ──────────────────────────────────────────────────
       Aldi, 2026-08-26: *"the data taken to make this panel actually should be the same with the
       one that we have on the stock opname monitor ... there are only 3 teams, bandung, HQ, and
       muntilan, means that there are only 3 warehouses"*.

       He is pointing at the rule that already works, so this uses the same one rather than a new
       one: StockOpnameView derives the warehouse list from the ROSTER — every distinct motorist
       `location` that is not Headquarters. There is no branch registry to read, and Firestore
       cannot list subcollections from a client, so the roster is the only honest source. HQ is not
       in this map: Headquarters IS the master vault, which is already `inventory`.

       ⚠️ ONE LISTENER PER BRANCH. That is fine at three and would not be at three hundred; if the
       roster ever grows that far this needs to become an on-demand read for the selected branch,
       the way the Stock Opname monitor already does it.
       ⚠️ Keyed on the branch NAMES, not on the motorists array, or every unrelated roster edit
       would tear down and rebuild every listener. */
    const branchKey = [...new Set(
        (motorists || [])
            .map(m => m && m.location)
            .filter(loc => loc && loc !== 'Headquarters' && loc !== 'UNASSIGNED' && loc !== 'UNASSIGNED AREA')
    )].sort().join('|');

    useEffect(() => {
        /* no reset when the roster empties. Clearing state synchronously inside an effect is a
           second render for nothing, and a branch that leaves the roster is filtered at READ
           time instead — see how DashboardView narrows this map to the current warehouse list,
           which also stops a deleted branch stock from ever leaking into a total. */
        if (!db || !appId || !userId || userId === 'default' || !branchKey) return;
        const names = branchKey.split('|');
        const unsubs = names.map(name => onSnapshot(
            collection(db, `artifacts/${appId}/users/${userId}/branches/${name}/inventory`),
            (snap) => setBranchStock(prev => ({
                ...prev,
                /* a branch shelf holds promo rows too (kind 'promo', pcs - stage 2); every reader of this map sums Bks */
                [name]: snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => !isPromo(r)),
            })),
            (err) => console.warn(`Branch stock listener (${name}):`, err.code)
        ));
        return () => unsubs.forEach(u => u());
    }, [db, appId, userId, branchKey]);

    // 🚀 THE TIME MACHINE: On-Demand Historical Fetcher
    // Bypasses the 7-day firewall to pull specific date ranges for auditing
    const fetchHistoricalTransactions = async (startDate, endDate) => {
        if (!db || !appId || !userId || userId === 'default') return [];
        try {
            const q = query(
                collection(db, `artifacts/${appId}/users/${userId}/transactions`),
                where('timestamp', '>=', startDate),
                where('timestamp', '<=', endDate),
                orderBy('timestamp', 'desc')
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({id: d.id, ...d.data()}));
        } catch (err) {
            console.error("Time Machine Error:", err);
            return [];
        }
    };

    return {
        fetchHistoricalTransactions, // 🚀 EXPORT THE ENGINE
        inventory, setInventory: setProducts, promoItems,
        customers: noFolders ? NO_SHOPS : customers, setCustomers, customerAccess,
        transactions, setTransactions,
        samplings, setSamplings,
        auditLogs, setAuditLogs,
        procurements, setProcurements,
        motorists, setMotorists,
        career, setCareer,
        agentInventories, setAgentInventories,
        eodReports, setEodReports,
        transferRequests, setTransferRequests,
        adminCanvas, setAdminCanvas,
        adminPromo,
        branchStock,
        appSettings, setAppSettings,
        editCompanyProfile, setEditCompanyProfile
    };
}