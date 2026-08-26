import { useState, useEffect } from 'react';
import { collection, doc, getDocs, onSnapshot, query, orderBy, setDoc, where } from 'firebase/firestore'; // 🚀 IMPORTED 'where'
import { applyDocChanges } from '../utils/docChanges';

export default function useDatabaseSync(db, appId, user, userId, userRole, agentProfileId) {
    // Data States
    const [inventory, setInventory] = useState([]);
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
    const [notifications, setNotifications] = useState([]);
    const [adminCanvas, setAdminCanvas] = useState([]);
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
        const unsubInv = onSnapshot(collection(db, basePath, 'products'), (snap) => setInventory(snap.docs.map(d => ({id: d.id, ...d.data()}))), (err) => console.warn("Inventory listener:", err.code));
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
        let custFirst = true;
        const unsubCust = onSnapshot(query(collection(db, basePath, 'customers'), orderBy('name', 'asc')), (snap) => {
            if (custFirst) { custFirst = false; setCustomers(snap.docs.map(d => ({id: d.id, ...d.data()}))); return; }
            setCustomers(prev => applyDocChanges(prev, snap.docChanges()));
        }, (err) => console.warn("Customers listener:", err.code));
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

        /* 3. Notifications (Filtered + Time-Gated)

           ⚠️ DO NOT server-side filter this on targetRole/targetId. Those fields DO NOT
           EXIST on a notification document — every write in App.jsx sets `agentId` instead
           (App :1470, :1500, :1513). A `where('targetId', ...)` query therefore matches
           nothing at all, silently.

           This was attempted in this session and reverted. The warning above the second
           notification listener in App.jsx :300 records an earlier attempt that also
           "dropped notifications it shouldn't have" — same root cause.

           Filtering here IS still worth doing, but the write side has to agree on one field
           name first, and old documents need that field backfilled. Until then, permissive
           is correct: a missed hand-off request costs more than the reads do. */
        const unsubNotifs = onSnapshot(query(collection(db, basePath, 'notifications'), where('timestamp', '>=', sevenDaysAgo), orderBy('timestamp', 'desc')), (snap) => {
            const myNotifs = snap.docs.map(d => ({id: d.id, ...d.data()})).filter(n => {
                if (userRole === 'ADMIN' && n.targetRole === 'ADMIN') return true;
                if (agentProfileId && n.targetId === agentProfileId) return true;
                return false;
            });
            setNotifications(myNotifs);
        }, (err) => console.warn("Notifications listener:", err.code));

        // 4. Admin Vehicle Canvas
        const unsubAdminVeh = onSnapshot(doc(db, basePath, 'motorists', 'ADMIN_VEHICLE'), (snap) => {
            if (snap.exists()) {
                setAdminCanvas(snap.data().activeCanvas || []);
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
            unsubLogs(); unsubCust(); unsubProc(); unsubMotorists(); unsubCareer();
            unsubAdminVeh(); unsubEod(); unsubTransfers(); unsubNotifs();
        };
    }, [user, db, appId, userId, userRole, agentProfileId]);

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
                [name]: snap.docs.map(d => ({ id: d.id, ...d.data() })),
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
        inventory, setInventory,
        customers, setCustomers,
        transactions, setTransactions,
        samplings, setSamplings,
        auditLogs, setAuditLogs,
        procurements, setProcurements,
        motorists, setMotorists,
        career, setCareer,
        agentInventories, setAgentInventories,
        eodReports, setEodReports,
        transferRequests, setTransferRequests,
        notifications, setNotifications,
        adminCanvas, setAdminCanvas,
        branchStock,
        appSettings, setAppSettings,
        editCompanyProfile, setEditCompanyProfile
    };
}