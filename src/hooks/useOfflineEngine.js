import { useState, useEffect, useRef } from 'react';
import { openDB } from 'idb';

const DB_NAME = 'kpm_ghost_ledger';
const DB_VERSION = 1;

/* ── IS THERE ACTUALLY AN INTERNET? ────────────────────────────────────────
   Aldi's report: "last time flight recorder will changed into red cloud logo but now its
   doesnt show it, instead it just stays green". Cause: `navigator.onLine` only answers
   "does a network interface exist", NOT "can I reach anything". His PC has a virtual WSL
   adapter on 172.27.240.1, so switching the wifi off leaves that flag TRUE and the badge
   green — while nothing can actually be sent.

   That matters more than a wrong colour: with the badge lying, it is his only signal that
   work is being queued rather than saved.

   So a real probe. Notes on the choices, because each one is load-bearing:
   - It must NOT be same-origin. This app is a PWA and the service worker would serve its own
     cached file happily with the wifi off — a probe that the cache can answer proves nothing.
   - `no-cors` gives an opaque response we never read; we only care that the request completed.
     Offline it rejects, which is the whole signal.
   - A 204 is headers and no body, so the cost to a salesman's data plan is as close to zero
     as a network check gets.
   - `navigator.onLine === false` is still trusted immediately: the flag lies by saying YES,
     never by saying NO. */
const REACHABILITY_URL = 'https://www.gstatic.com/generate_204';
const PROBE_EVERY_MS = 30000;
const PROBE_TIMEOUT_MS = 5000;

export async function canReachInternet() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    try {
        await fetch(REACHABILITY_URL, { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal });
        return true;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

export default function useOfflineEngine() {
    // 1. HARDWARE SENSORS
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    /* Mirrors isOnline so the probe can tell a real change from a repeat without depending on
       stale state inside the interval closure — and so the log only fires on an actual flip. */
    const onlineRef = useRef(navigator.onLine);
    const [syncLogs, setSyncLogs] = useState([]);
    const [pendingCount, setPendingCount] = useState({ transactions: 0, noo: 0 });
    const [pendingTxData, setPendingTxData] = useState([]); // 🚀 WAITING ROOM DATA

    // 2. INITIALIZE THE VAULT (IndexedDB)
    const initDB = async () => {
        return openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Table for offline receipts
                if (!db.objectStoreNames.contains('transactions')) {
                    db.createObjectStore('transactions', { keyPath: 'localId', autoIncrement: true });
                }
                // Table for blind-drop store registrations
                if (!db.objectStoreNames.contains('noo_profiles')) {
                    db.createObjectStore('noo_profiles', { keyPath: 'localId', autoIncrement: true });
                }
                // The Flight Recorder (Sync History)
                if (!db.objectStoreNames.contains('sync_logs')) {
                    db.createObjectStore('sync_logs', { keyPath: 'id', autoIncrement: true });
                }
            }
        });
    };

    // 🚀 RADIO TRANSMITTER: Alerts the whole app when IndexedDB changes
    const broadcastUpdate = () => window.dispatchEvent(new Event('ghost-ledger-updated'));

    // 3. THE FLIGHT RECORDER (Logs events to local storage)
    const logSyncEvent = async (message, type = 'INFO') => {
        try {
            const db = await initDB();
            const logEntry = {
                timestamp: new Date().toISOString(),
                message,
                type // 'INFO', 'SUCCESS', 'ERROR', 'OFFLINE'
            };
            await db.add('sync_logs', logEntry);
            loadLogs();
            broadcastUpdate(); // 🚀 RADIO SIGNAL 1
        } catch (err) {
            console.error("Flight Recorder Error:", err);
        }
    };

    const loadLogs = async () => {
        try {
            const db = await initDB();
            const logs = await db.getAll('sync_logs');
            // Sort newest first, keep only the last 50 events so the phone doesn't bloat
            setSyncLogs(logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50));
        } catch (err) {
            console.error("Failed to load logs:", err);
        }
    };

    const updatePendingCount = async () => {
        try {
            const db = await initDB();
            const txs = await db.getAll('transactions'); // 🚀 GET ALL RECEIPTS
            const nooCount = await db.count('noo_profiles');
            
            setPendingCount({ transactions: txs.length, noo: nooCount });
            setPendingTxData(txs); // 🚀 SEND TO FRONTEND
        } catch (err) {}
    };

    // 4. THE QUARANTINE ZONE (Saving data while offline)
    const saveOfflineTransaction = async (txData) => {
        const db = await initDB();
        await db.add('transactions', { ...txData, offlineTimestamp: new Date().toISOString() });
        await logSyncEvent(`🖨️ OFFLINE LOG: Saved receipt for ${txData.customerName}`, 'OFFLINE');
        updatePendingCount();
        broadcastUpdate(); // 🚀 RADIO SIGNAL 2
    };

    const saveOfflineNOO = async (nooData) => {
        const db = await initDB();
        await db.add('noo_profiles', { ...nooData, offlineTimestamp: new Date().toISOString() });
        await logSyncEvent(`📍 BLIND DROP: Saved NOO for ${nooData.name}`, 'OFFLINE');
        updatePendingCount();
        broadcastUpdate(); // 🚀 RADIO SIGNAL 3
    };

    // 5. THE EXTRACTION PIPELINE (Getting data out when internet returns)
    const getPendingData = async () => {
        const db = await initDB();
        const transactions = await db.getAll('transactions');
        const nooProfiles = await db.getAll('noo_profiles');
        return { transactions, nooProfiles };
    };

    const clearProcessedItem = async (storeName, localId) => {
        const db = await initDB();
        await db.delete(storeName, localId);
        updatePendingCount();
        broadcastUpdate(); // 🚀 RADIO SIGNAL 4
    };

    const clearFlightRecorder = async () => {
        const db = await initDB();
        await db.clear('sync_logs');
        loadLogs();
        broadcastUpdate(); // 🚀 RADIO SIGNAL 5
    };

    // 6. THE HARDWARE LISTENER (Watches the phone's 4G/WiFi chip)
    useEffect(() => {
        /* One place that changes the flag, so the badge and the log can never disagree. */
        const apply = (next) => {
            if (onlineRef.current === next) return;
            onlineRef.current = next;
            setIsOnline(next);
            logSyncEvent(
                next ? "📡 SIGNAL ACQUIRED: Entering Online Mode" : "⚠️ CONNECTION LOST: Entering Offline Mode",
                next ? 'INFO' : 'OFFLINE'
            );
        };

        /* The browser events are kept because they are INSTANT, but they are only half the
           story: `offline` is trustworthy on its own, while `online` merely means an adapter
           came up — so that one is confirmed by a probe before the badge goes green. */
        const handleOnline = () => { probe(); };
        const handleOffline = () => { apply(false); };

        let stopped = false;
        const probe = async () => {
            const ok = await canReachInternet();
            if (!stopped) apply(ok);
        };

        // 🚀 RADIO RECEIVER: Listens for updates from other files
        const handleLedgerUpdate = () => {
            updatePendingCount();
            loadLogs();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('ghost-ledger-updated', handleLedgerUpdate); // 🚀 RADIO ATTACHED
        
        // Initial boot check
        updatePendingCount();
        loadLogs();

        /* Probe once on boot — this is what corrects a badge that booted green on a machine
           whose wifi is already off — then on a slow heartbeat, because with the flag lying
           there is no event coming to tell us the connection died. */
        probe();
        const heartbeat = setInterval(probe, PROBE_EVERY_MS);

        return () => {
            stopped = true;
            clearInterval(heartbeat);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('ghost-ledger-updated', handleLedgerUpdate); // 🚀 RADIO DETACHED
        };
    }, []);

    return {
        isOnline,
        syncLogs,
        pendingCount,
        pendingTxData, // 🚀 EXPORT THE DATA TO APP.JSX
        saveOfflineTransaction,
        saveOfflineNOO,
        getPendingData,
        clearProcessedItem,
        logSyncEvent,
        clearFlightRecorder,
        updatePendingCount
    };
}