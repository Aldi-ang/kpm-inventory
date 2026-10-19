/* WHAT A SALE DOES TO THE VAN — and how a sale made WITHOUT SIGNAL reaches it.

   The van's cargo is one array (`motorists/{id}.activeCanvas`), so every write replaces the whole
   list and the last writer wins. Online that is safe only inside a transaction. Offline it was not
   safe at all: the sale computed the new list from the phone's cached copy and Firestore queued
   that whole list. If a captain loaded or unloaded the same van while the phone had no signal, the
   queued list landed on top when signal came back and his change vanished from the books - at EOD
   it showed as a shortage on the salesman. (2026-10-19 100-users check, row 2;
   load-test/hundred-users.mjs reproduces it.)

   So an offline sale no longer touches the van. It waits in the Ghost Ledger with
   `vanPending: true`, the phone shows the van minus those waiting sales (canvasWithPending), and
   the sync lands receipt + tally + van in ONE transaction against the server's current van
   (syncOfflineSale). */
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { convertToBks } from './helpers.js';
import { tallySale } from './salesRollupWrite.js';

/* The rule itself. `short` lists every product the van did not hold enough of; that row drops
   to zero instead of throwing, so the sync can still save the money and REPORT the gap. */
export const settleSale = (canvas, moves) => {
    const short = [];
    const updated = (canvas || []).map(row => {
        const given = moves.filter(m => m.productId === row.productId && m.isPhysicallyGiven);
        if (given.length === 0) return row;

        const rowSize = convertToBks(1, row.unit, given[0].prodData || {});
        const remainingBks = (row.qty * rowSize) - given.reduce((sum, m) => sum + m.qtyInBks, 0);
        if (remainingBks < 0) {
            short.push({ productId: row.productId, name: given[0].name, missingBks: -remainingBks });
            return { ...row, qty: 0 };
        }
        return { ...row, qty: remainingBks / rowSize };
    });

    // Buyback: resellable packs come back onto the van. New line if he was not carrying it.
    moves.filter(m => m.isReturnedToStock).forEach(m => {
        const idx = updated.findIndex(row => row.productId === m.productId);
        if (idx >= 0) {
            const row = updated[idx];
            updated[idx] = { ...row, qty: row.qty + (m.qtyInBks / convertToBks(1, row.unit, m.prodData)) };
        } else {
            updated.push({ productId: m.productId, name: m.name, qty: m.qtyInBks, unit: 'Bks' });
        }
    });

    return { canvas: updated.filter(row => row.qty > 0), short };
};

/* The online sale's form: a short van refuses the sale before anything is written. */
export const applySaleToCanvas = (canvas, moves) => {
    const { canvas: updated, short } = settleSale(canvas, moves);
    if (short.length) throw `Vehicle doesn't have enough ${short[0].name} left!`;
    return updated;
};

/* Moves from a STORED sale (the Ghost Ledger copy). `product` was stripped before it was stored,
   so pack sizes come from the products list. Same two flags the sale screen decides. */
export const movesFromSale = (tx, productsById) => (tx.items || []).map(item => {
    const prodData = (productsById || {})[item.productId] || {};
    return {
        productId: item.productId,
        name: item.name,
        prodData,
        qtyInBks: convertToBks(item.qty, item.unit, prodData),
        isPhysicallyGiven: !(tx.type === 'RETUR' || item.fulfillment === 'IOU'),
        isReturnedToStock: tx.type === 'RETUR' && item.condition !== 'DAMAGED',
    };
});

/* What the van holds on THIS phone: the server's list minus the sales still waiting in the
   Ghost Ledger. Never throws - a screen must not crash on a short van; the sync reports it.
   ponytail: for the instant between a sale landing and its queue item clearing, that sale is
   subtracted twice; the next ledger update clears it. */
export const canvasWithPending = (canvas, pendingTxs, vanId, productsById) => {
    let out = canvas || [];
    for (const tx of pendingTxs || []) {
        if (!tx.vanPending || !vanId || tx.agentId !== vanId) continue;
        out = settleSale(out, movesFromSale(tx, productsById)).canvas;
    }
    return out;
};

/* One sale made without signal, landed in ONE transaction: the receipt, its tally and the van,
   against the van as the server holds it NOW. Safe to repeat - the receipt's id was fixed when it
   was queued, so a second run finds it and writes nothing (transactions are create-only in the
   rules anyway). Returns { landed, short }; a non-empty `short` is a gap the caller must report. */
export const syncOfflineSale = (db, appId, userId, tx, productsById) => runTransaction(db, async (t) => {
    const basePath = `artifacts/${appId}/users/${userId}`;
    const txRef = doc(db, `${basePath}/transactions`, tx.cloudId);
    const vanRef = doc(db, `${basePath}/motorists`, tx.agentId);

    const txSnap = await t.get(txRef);
    if (txSnap.exists()) return { landed: false, short: [] };
    const vanSnap = await t.get(vanRef);

    const payload = { ...tx };
    delete payload.localId;
    delete payload.cloudId;    // the id is the document name, not a field
    delete payload.vanPending;

    const settled = vanSnap.exists()
        ? settleSale(vanSnap.data().activeCanvas, movesFromSale(tx, productsById))
        : { canvas: null, short: [] };

    t.set(txRef, {
        ...payload,
        timestamp: serverTimestamp(),   // true server time so it sorts into the reports
        syncedAt: serverTimestamp(),
        ...(settled.short.length ? { vanShortfall: settled.short } : {}),
    });
    // filed on the day the sale was MADE: the tally reads payload.date before the timestamp
    tallySale(t, db, appId, userId, payload, productsById, 1);
    if (settled.canvas) t.update(vanRef, { activeCanvas: settled.canvas });

    return { landed: true, short: settled.short };
});
