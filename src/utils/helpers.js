import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

export const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(number || 0);
};

/* Grouped digits without a currency symbol — for XP/EXP and other plain counts, where
   `1000000` is genuinely hard to read but "Rp" would be wrong. Same id-ID grouping as
   formatRupiah so thousands separators look consistent across the app ("1.000.000"). */
export const formatNumber = (number) =>
  new Intl.NumberFormat('id-ID').format(Number(number) || 0);

/* Strip grouping back to a raw number. Pairs with formatNumber for "display grouped, store raw"
   inputs: a grouped string can't go into type="number", so those fields are type="text" and
   sanitise on change. Keeps digits only — a stray dot from typing is grouping, never a decimal,
   because every value this is used for (XP, thresholds) is a whole number. */
export const parseGroupedNumber = (value) => Number(String(value ?? '').replace(/\D/g, '')) || 0;

/* 🚀 A store is identified by its NAME in this app — no transaction carries a customerId, only
   customerName and agentId. So every comparison between two store names has to agree on one
   form, or one shop quietly becomes two.

   Trailing " (Retail)", " (Individual)" and " (Wholesale)" are LEGACY. The sale engine used to
   weld the price tier onto the name of a store it had never seen, so rows written before that
   fix carry the suffix and rows written after do not. Stripping it here is what keeps those two
   halves on ONE receivable. Never strip anywhere but the end — "Warung (Retail) Jaya" is a real
   name, not a tier. */
export const storeKey = (name) => String(name ?? '')
    .trim()
    .replace(/\s*\((?:Retail|Individual|Wholesale)\)$/i, '')
    .trim()
    .toLowerCase();

export const getCurrentDate = () => new Date().toISOString().split('T')[0];

// getCurrentDate() above is UTC — fine for record-keeping timestamps, wrong for "what day is it
// for this agent right now." WIB is UTC+7, so toISOString() flips to tomorrow at 07:00 local,
// right in the middle of a morning route. Uses local Date methods instead, no hardcoded offset.
export const getLocalDayKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getRandomColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
};

// 🚀 SHARED FIX: A raw '/' in a user-typed email (a typo, or a stray character from
// autofill/autocomplete) silently turns a single Firestore document ID into extra path
// segments once it's interpolated into a doc() call — e.g. "name@gmail/com" instead of
// "name@gmail.com" makes doc(db, 'artifacts/x/employee_directory', email) throw
// "Invalid document reference... must have an even number of segments", a raw SDK crash
// with no useful message for a non-technical user. A period is completely safe in a
// Firestore document ID (only '/' splits it) — so this only rejects the one character
// that actually breaks the write, rather than doing full RFC email validation.
export const isSafeDocIdEmail = (email) => /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(String(email || ''));

/* The inverse of convertToBks: turn a flat Bks figure back into the units a salesman
   actually counts in. 9.892 Bks means nothing at a glance; "12 Karton 1 Bal 4 Slop 2 Bks"
   is what he would say out loud, and it is how he checks the van without opening a box.

   Largest unit first, remainder cascading down, so the result is unique — 1 Bal and
   20 Slop are the same quantity but only one of them is how anyone describes it. */
export const splitToUnits = (totalBks, product) => {
    const per = {
        Karton: convertToBks(1, 'Karton', product || {}),
        Bal:    convertToBks(1, 'Bal',    product || {}),
        Slop:   convertToBks(1, 'Slop',   product || {}),
    };
    let rest = Math.max(0, Math.floor(Number(totalBks) || 0));
    const out = {};
    for (const unit of ['Karton', 'Bal', 'Slop']) {
        const size = per[unit];
        // a product with nonsense packing must not divide by zero and produce Infinity
        out[unit] = size > 0 ? Math.floor(rest / size) : 0;
        rest -= out[unit] * size;
    }
    out.Bks = rest;
    return out;
};

/* A cart line carries the whole master product on `item.product` so pricing and the stock
   guard can read it while the basket is open. That object holds up to six per-face photos
   as base64 data URIs, and writing it into the transaction blew straight past Firestore's
   1 MiB per-document limit the moment Aldi photographed his products:

     "Document ... cannot be written because its size (1.119.320 bytes) exceeds the
      maximum allowed size of 1.048.576 bytes"

   The sale simply failed. Nothing downstream needs the embedded copy — the receipt looks
   the product back up from `inventory` by productId — so it is stripped here, in ONE place
   every write path routes through, rather than in each of them. `prodData`, `qtyInBks` and
   `isPhysicallyGiven` are engine scratch fields and go with it. */
export const stripCartItemForStorage = (item) => {
    const copy = { ...item };
    delete copy.product;
    delete copy.prodData;
    delete copy.qtyInBks;
    delete copy.isPhysicallyGiven;
    return copy;
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

// 🚀 SHARED FIX: was copy-pasted identically in RestockVaultView.jsx,
// StockOpnameView.jsx, and components/BranchWarehouseManager.jsx. Downscales an
// uploaded image to a max width of 800px and re-encodes it as a compressed JPEG
// data URL, so photo uploads (damaged-goods proof, receiving docs, etc.) stay small
// enough for the 1MB Firestore document cap.
export const compressImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

/* Display name for a stored paymentType. The database still holds 'IOU Fulfillment' — that
   literal is compared in HistoryReportView and FleetCanvasManager and sits on every past
   record, so it must never change. Only what a human reads changes here.
   Aldi, 2026-08-18: "what IOU again i forgot" -> "yeah utang barang should do". */
export const paymentLabel = (method) =>
    method === 'IOU Fulfillment' ? 'Utang Barang Lunas' : (method || '');
