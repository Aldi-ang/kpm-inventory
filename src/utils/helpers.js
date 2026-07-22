import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

export const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(number);
};

export const getCurrentDate = () => new Date().toISOString().split('T')[0];

export const getRandomColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
};

export const convertToBks = (qty, unit, product) => {
    if (!product) return qty;
    const packsPerSlop = product.packsPerSlop || 10;
    const slopsPerBal = product.slopsPerBal || 20;
    const balsPerCarton = product.balsPerCarton || 4;

    if (unit === 'Slop') return qty * packsPerSlop;
    if (unit === 'Bal') return qty * slopsPerBal * packsPerSlop;
    if (unit === 'Karton') return qty * balsPerCarton * slopsPerBal * packsPerSlop;
    return qty; 
};

// 🚀 SHARED FIX: Firestore hard-caps a single writeBatch at 500 operations.
// This splits any list of operations into safe chunks of 500 and commits
// them as separate sequential batches, so no caller ever has to remember
// the limit or silently fail past it.
//
// Usage:
//   await commitInChunks(db, [
//     { type: 'set', ref: someDocRef, data: {...} },
//     { type: 'update', ref: otherDocRef, data: {...} },
//     { type: 'delete', ref: anotherDocRef },
//   ]);
export const commitInChunks = async (db, writeBatch, operations) => {
    const CHUNK_SIZE = 450;
    // 🚀 FIX: Firestore ALSO hard-caps each request at 10MiB. Map borders carry huge
    // geometryString payloads, so chunking by count alone can still overflow a request
    // (the resource-exhausted errors during border uploads/restores). Cap by bytes too.
    const MAX_CHUNK_BYTES = 8 * 1024 * 1024;

    let chunk = [];
    let chunkBytes = 0;
    let committedAny = false;

    const flushChunk = async () => {
        if (chunk.length === 0) return;
        // 🚀 FIX: A brief pause between chunks so Firestore's write stream never
        // gets flooded with too many rapid-fire commits in a row (the resource-exhausted
        // error we saw during testing) — matters most once datasets get genuinely large.
        if (committedAny) await new Promise(resolve => setTimeout(resolve, 150));
        const batch = writeBatch(db);
        chunk.forEach(op => {
            if (op.type === 'set') batch.set(op.ref, op.data, op.options || {});
            else if (op.type === 'update') batch.update(op.ref, op.data);
            else if (op.type === 'delete') batch.delete(op.ref);
        });
        await batch.commit();
        committedAny = true;
        chunk = [];
        chunkBytes = 0;
    };

    for (const op of operations) {
        let opBytes = 256; // rough overhead estimate per operation
        try { if (op.data) opBytes += JSON.stringify(op.data).length; } catch (e) {}
        if (chunk.length >= CHUNK_SIZE || (chunk.length > 0 && chunkBytes + opBytes > MAX_CHUNK_BYTES)) {
            await flushChunk();
        }
        chunk.push(op);
        chunkBytes += opBytes;
    }
    await flushChunk();
};

// 🚀 SHARED FIX: Firestore hard-caps a document at 1MB, and embedded base64 photos
// eat that budget fast (docs with multiple photos risk silently failing). On Blaze
// projects, upload the photo to Storage instead and keep only the short download URL
// in Firestore. Firebase Storage requires the Blaze (pay-as-you-go) plan though — on
// Spark (free plan) projects, Storage calls fail. `usePhotoStorage` is the runtime
// switch (see appSettings.usePhotoStorage, toggled in Architect Terminal) that lets
// this behavior flip between the two without a redeploy: off = Spark-safe base64
// straight into Firestore (today's default), on = Storage upload (once Blaze is live).
export const savePhotoAndGetReference = async (storage, base64, path, usePhotoStorage) => {
    if (!usePhotoStorage) return base64; // Spark-safe: skip Storage entirely
    const fileRef = ref(storage, path);
    await uploadString(fileRef, base64, 'data_url');
    return await getDownloadURL(fileRef);
};

// Best-effort cleanup for when a photo is replaced — deletes the previously uploaded
// file so replacing a photo doesn't leave the old one billing storage forever. Only
// ever attempted when the previous value is actually a Storage download URL — a
// base64 string (saved while usePhotoStorage was off) was never uploaded, so it's
// just discarded, never passed to Storage's delete call. A missing/already-deleted
// file must also never block the caller's save.
export const deletePhotoFromStorage = async (storage, url) => {
    if (!url || !url.startsWith('https://')) return;
    try { await deleteObject(ref(storage, url)); } catch (e) { /* ignore */ }
};