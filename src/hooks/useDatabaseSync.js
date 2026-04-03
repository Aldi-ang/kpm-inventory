import { useState, useEffect } from 'react';
import { collection, doc, getDocs, onSnapshot, query, orderBy, setDoc } from 'firebase/firestore';

export default function useDatabaseSync(db, appId, user, userId, userRole, agentProfileId) {
    // Data States
    const [inventory, setInventory] = useState([]);
    const [customers, setCustomers] = useState([]); 
    const [transactions, setTransactions] = useState([]);
    const [samplings, setSamplings] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [procurements, setProcurements] = useState([]); 
    const [motorists, setMotorists] = useState([]); 
    const [agentInventories, setAgentInventories] = useState({}); 
    const [eodReports, setEodReports] = useState([]);
    const [transferRequests, setTransferRequests] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [adminCanvas, setAdminCanvas] = useState([]);
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
        });

        // 2. Core Collections
        const unsubInv = onSnapshot(collection(db, basePath, 'products'), (snap) => setInventory(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubTrans = onSnapshot(query(collection(db, basePath, 'transactions'), orderBy('timestamp', 'desc')), (snap) => setTransactions(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubSamp = onSnapshot(query(collection(db, basePath, 'samplings'), orderBy('timestamp', 'desc')), (snap) => setSamplings(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubLogs = onSnapshot(query(collection(db, basePath, 'audit_logs'), orderBy('timestamp', 'desc')), (snap) => setAuditLogs(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubCust = onSnapshot(query(collection(db, basePath, 'customers'), orderBy('name', 'asc')), (snap) => setCustomers(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubProc = onSnapshot(query(collection(db, basePath, 'procurement'), orderBy('timestamp', 'desc')), (snap) => setProcurements(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubMotorists = onSnapshot(collection(db, basePath, 'motorists'), (snap) => setMotorists(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubEod = onSnapshot(query(collection(db, basePath, 'eod_reports'), orderBy('timestamp', 'desc')), (snap) => setEodReports(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubTransfers = onSnapshot(query(collection(db, basePath, 'account_transfers'), orderBy('timestamp', 'desc')), (snap) => setTransferRequests(snap.docs.map(d => ({id: d.id, ...d.data()}))));

        // 3. Notifications (Filtered)
        const unsubNotifs = onSnapshot(query(collection(db, basePath, 'notifications'), orderBy('timestamp', 'desc')), (snap) => {
            const myNotifs = snap.docs.map(d => ({id: d.id, ...d.data()})).filter(n => {
                if (userRole === 'ADMIN' && n.targetRole === 'ADMIN') return true;
                if (agentProfileId && n.targetId === agentProfileId) return true;
                return false;
            });
            setNotifications(myNotifs);
        });

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
        });

        return () => { 
            unsubSettings(); unsubInv(); unsubTrans(); unsubSamp(); 
            unsubLogs(); unsubCust(); unsubProc(); unsubMotorists(); 
            unsubAdminVeh(); unsubEod(); unsubTransfers(); unsubNotifs(); 
        };
    }, [user, db, appId, userId, userRole, agentProfileId]);

    return {
        inventory, setInventory,
        customers, setCustomers,
        transactions, setTransactions,
        samplings, setSamplings,
        auditLogs, setAuditLogs,
        procurements, setProcurements,
        motorists, setMotorists,
        agentInventories, setAgentInventories,
        eodReports, setEodReports,
        transferRequests, setTransferRequests,
        notifications, setNotifications,
        adminCanvas, setAdminCanvas,
        appSettings, setAppSettings,
        editCompanyProfile, setEditCompanyProfile
    };
}