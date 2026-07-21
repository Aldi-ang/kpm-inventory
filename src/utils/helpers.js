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