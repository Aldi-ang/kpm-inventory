import { useState, useEffect } from 'react';
import { openDB } from 'idb';

const DB_NAME = 'kpm_ghost_ledger';
const DB_VERSION = 1;

export default function useOfflineEngine() {
    // 1. HARDWARE SENSORS
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncLogs, setSyncLogs] = useState([]);
    const [pendingCount, setPendingCount] = useState({ transactions: 0, noo: 0 });

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
            const txCount = await db.count('transactions');
            const nooCount = await db.count('noo_profiles');
            setPendingCount({ transactions: txCount, noo: nooCount });
        } catch (err) {}
    };

    // 4. THE QUARANTINE ZONE (Saving data while offline)
    const saveOfflineTransaction = async (txData) => {
        const db = await initDB();
        await db.add('transactions', { ...txData, offlineTimestamp: new Date().toISOString() });
        await logSyncEvent(`🖨️ OFFLINE LOG: Saved receipt for ${txData.customerName}`, 'OFFLINE');
        updatePendingCount();
    };

    const saveOfflineNOO = async (nooData) => {
        const db = await initDB();
        await db.add('noo_profiles', { ...nooData, offlineTimestamp: new Date().toISOString() });
        await logSyncEvent(`📍 BLIND DROP: Saved NOO for ${nooData.name}`, 'OFFLINE');
        updatePendingCount();
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
    };

    const clearFlightRecorder = async () => {
        const db = await initDB();
        await db.clear('sync_logs');
        loadLogs();
    };

    // 6. THE HARDWARE LISTENER (Watches the phone's 4G/WiFi chip)
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            logSyncEvent("📡 SIGNAL ACQUIRED: Entering Online Mode", 'INFO');
        };
        const handleOffline = () => {
            setIsOnline(false);
            logSyncEvent("⚠️ CONNECTION LOST: Entering Offline Mode", 'OFFLINE');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Initial boot check
        updatePendingCount();
        loadLogs();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return {
        isOnline,
        syncLogs,
        pendingCount,
        saveOfflineTransaction,
        saveOfflineNOO,
        getPendingData,
        clearProcessedItem,
        logSyncEvent,
        clearFlightRecorder,
        updatePendingCount
    };
}