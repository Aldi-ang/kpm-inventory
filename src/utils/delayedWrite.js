import { useSyncExternalStore } from 'react';

/* 8-SECOND DELAYED WRITE FOR NON-MONEY / NON-STOCK DELETES (Task 91).
   ───────────────────────────────────────────────────────────────────
   After the user confirms a delete, the record hides on screen immediately and an 8-second
   "Deleted <name> · UNDO" bar appears at the bottom of <ToastHost />. Nothing touches Firestore
   while the bar is counting down:
   - Pressing UNDO inside 8 s cancels the timer, unhides the record, and reports "Restored <name>."
     with zero database writes.
   - Letting the 8 s finish executes commit() once.
   - Trap safety (never a shop that looks deleted but comes back silently):
     1. Offline before or during the 8 s: if navigator.onLine === false when Delete is pressed,
        or if the browser goes offline before the 8 s finish, the delete is cancelled at once,
        the record reappears on screen, and a red failure strip tells the user nothing was deleted.
     2. Tab close / reload inside the 8 s while online: beforeunload + pagehide flush all pending
        writes immediately so commit() fires into Firestore's persistent local cache before unload
        (and beforeunload warns the browser if a write is in flight). */

export const UNDO_MS = 8000;

let toastBridge = {
    notify: () => undefined,
    notifyUndo: () => undefined,
    clearUndoToast: () => undefined,
};

export function registerUndoToastBridge(bridge) {
    if (bridge) toastBridge = { ...toastBridge, ...bridge };
}

const reportToast = (msg) => toastBridge.notify(msg);
const notifyUndo = (payload) => toastBridge.notifyUndo(payload);
const clearUndoToast = (key) => toastBridge.clearUndoToast(key);

const pending = new Map();
let version = 0;
const subs = new Set();

const emit = () => {
    version += 1;
    subs.forEach((fn) => fn());
};

const defaultTimers = {
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id) => globalThis.clearTimeout(id),
};

const defaultIsOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

export function subscribePendingUndo(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
}

export function getPendingUndoVersion() {
    return version;
}

export function usePendingUndo() {
    return useSyncExternalStore(subscribePendingUndo, getPendingUndoVersion, getPendingUndoVersion);
}

export function isPendingUndo(key) {
    return pending.has(key);
}

function cancelBecauseOffline(key) {
    const entry = pending.get(key);
    if (!entry) return false;
    entry.timers.clearTimeout(entry.timerId);
    pending.delete(key);
    clearUndoToast(key);
    if (entry.onUndo) entry.onUndo();
    emit();
    reportToast(`Failed to delete ${entry.label}: you are offline. Nothing was deleted.`);
    return true;
}

export function undoPendingWrite(key) {
    const entry = pending.get(key);
    if (!entry) return false;
    entry.timers.clearTimeout(entry.timerId);
    pending.delete(key);
    clearUndoToast(key);
    if (entry.onUndo) entry.onUndo();
    emit();
    reportToast(`Restored ${entry.label}.`);
    return true;
}

export function flushPendingWrite(key) {
    const entry = pending.get(key);
    if (!entry) return false;
    entry.timers.clearTimeout(entry.timerId);
    if (!entry.isOnline()) return !cancelBecauseOffline(key);
    pending.delete(key);
    clearUndoToast(key);
    emit();
    const onFail = (err) => {
        if (entry.onUndo) entry.onUndo();
        emit();
        reportToast(`Failed to delete ${entry.label}: ${err?.message || 'unknown error'}`);
    };
    try {
        const res = entry.commit();
        if (res && typeof res.catch === 'function') res.catch(onFail);
    } catch (err) {
        onFail(err);
    }
    return true;
}

export function flushAllPendingWrites() {
    for (const k of [...pending.keys()]) {
        flushPendingWrite(k);
    }
}

export function scheduleDelayedWrite({
    key,
    label,
    onOptimistic,
    commit,
    onUndo,
    durationMs = UNDO_MS,
    timers = defaultTimers,
    isOnline = defaultIsOnline,
}) {
    const cleanLabel = String(label || 'record');
    if (!isOnline()) {
        reportToast(`Failed to delete ${cleanLabel}: you are offline. Nothing was deleted.`);
        return false;
    }

    for (const prevKey of [...pending.keys()]) {
        if (prevKey !== key) flushPendingWrite(prevKey);
    }
    if (pending.has(key)) {
        const prev = pending.get(key);
        prev.timers.clearTimeout(prev.timerId);
        pending.delete(key);
    }

    const timerId = timers.setTimeout(() => {
        flushPendingWrite(key);
    }, durationMs);

    pending.set(key, { key, label: cleanLabel, timerId, timers, isOnline, commit, onUndo });
    if (onOptimistic) onOptimistic();
    emit();
    notifyUndo({
        key,
        label: cleanLabel,
        durationMs,
        onUndo: () => undoPendingWrite(key),
    });
    return true;
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('offline', () => {
        for (const k of [...pending.keys()]) cancelBecauseOffline(k);
    });
    window.addEventListener('beforeunload', (e) => {
        if (pending.size > 0) {
            flushAllPendingWrites();
            e.preventDefault();
            e.returnValue = '';
        }
    });
    window.addEventListener('pagehide', () => {
        if (pending.size > 0) flushAllPendingWrites();
    });
}
