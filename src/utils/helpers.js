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

/* 🚀 What a store is CALLED on screen. storeKey answers "same shop?"; this answers "what do I
   print?". Same suffix rule, but the name keeps its capitals and its spacing — "Warung Bu Sari
   (Retail)" shows as "Warung Bu Sari", not "warung bu sari".

   Nothing in the database is rewritten. Aldi asked for the old names cleaned up on 2026-08-18;
   rewriting the customer documents is a live-data migration, and this reaches the same screens
   with no write at all. The one place the raw name must survive is the backup: App.jsx exports
   the in-memory customer list and a restore writes it straight back with set(), so a display
   name reaching that path would turn one restore into a silent permanent rename of every shop. */
export const storeLabel = (name) => String(name ?? '')
    .trim()
    .replace(/\s*\((?:Retail|Individual|Wholesale)\)$/i, '')
    .trim();

/* WHAT DAY IS IT, WHERE THE AGENT IS STANDING.

   ⚠️ THERE WAS NEVER A 7AM RULE. It was described for months as "the app day rolls over at 7am",
   as though someone had chosen that, and it was only ever a symptom: this used to be
   `new Date().toISOString().split('T')[0]`, which is the **UTC** date. WIB is UTC+7, so the UTC
   date flips at 07:00 local — mid morning route. One bug wearing two names.

   The cure was already written and simply never adopted: `getLocalDayKey` sat directly below the
   broken helper, with a comment describing exactly this, while all 26 call sites went on using
   the UTC one. Fixed at the definition rather than at the call sites — a guard in the shared
   function is a smaller diff than a guard in every caller, and every caller wanted local anyway:
   backup filenames, the `date` stamped on a transaction, and the default date on a report picker
   all mean "today, here".

   LOCAL, not a hardcoded +7. Indonesia has no daylight saving, so a fixed offset would be correct
   for WIB today — but it would silently mis-stamp a phone in WITA or WIT, and a device already
   knows its own zone. No offset to keep in sync with reality.

   ⚠️ OLD RECORDS WERE NOT REWRITTEN. A transaction saved before this fix keeps the UTC `date` it
   was written with, so anything sold between midnight and 07:00 WIB in the past is still filed
   under the previous day. Going forward it is right; backwards it is unchanged, deliberately —
   repairing history means rewriting the `date` on every historical transaction from its
   `timestamp`, and that is Aldi's decision, not a side effect of this fix. */
export const getLocalDayKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/* The name 26 call sites already use. Same function, one behaviour — prefer `getLocalDayKey` in
   new code, and never reintroduce a second date helper: the duplicate that used to live at
   `AgentInventoryView.jsx:6` kept its own UTC copy and survived every fix aimed at this one. */
export const getCurrentDate = () => getLocalDayKey();

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

/* Which products came back short, named one by one. Aldi's rule, in his words: a single goods
   total hides a one-product shortfall — which is why the EOD goods card counts line by line in
   the first place, and why the admin's report card must not undo that by showing one number.

   Both lists are van rows: productId, name, qty, unit. The counted list is built FROM the
   expected list, so a row keeps its own unit and never needs converting. A product that was
   never counted carries its expected qty forward — silence is not zero, so it is not short. */
export const shortStockRows = (expected = [], counted = []) => {
    const countedByProduct = {};
    (counted || []).forEach(row => {
        countedByProduct[String(row?.productId)] = Number(row?.qty) || 0;
    });
    return (expected || []).reduce((rows, item) => {
        const pid = String(item?.productId);
        if (!(pid in countedByProduct)) return rows;
        const expectedQty = Number(item?.qty) || 0;
        const countedQty  = countedByProduct[pid];
        if (countedQty < expectedQty) {
            rows.push({
                productId: pid,
                name: item?.name || pid,
                unit: item?.unit || 'Bks',
                expected: expectedQty,
                counted: countedQty,
                short: expectedQty - countedQty,
            });
        }
        return rows;
    }, []);
};

/* Every bounty line one EOD report mints: priced, labelled, dated. Aldi, 2026-08-18, verbatim:
   "if there is missing pack then agent needs to buy the missing pack on retail price as a
   compensation, well u can add that to the bounties and the bounties panel need to specify how
   the bounties number are calculated, for example missing pita = 5000 (4 agustus 2026), cello
   chocolate 5 bks = 50,000 (7 agustus 2026), transfer loss 30,000 (8agustus 2026) this kind of
   detailed needed".

   So ONE KEY PER REASON. A single lump sum cannot be explained to the man paying it, and the
   agent is entitled to see the arithmetic on his own name.

   - Cash and transfer are floored at zero SEPARATELY: extra cash does not quietly settle a
     missing transfer.
   - Goods are billed at the packs that did not come back, priced on the company's chosen tier
     (Retail unless SettingsView says otherwise). The short quantity is converted to packs first —
     a short Slop is ten packs.
   - A product with no price on that tier still gets a line, at Rp 0, saying so. The gap must be
     visible on the board rather than silently absent; the board handles Rp 0 fines on purpose. */
/* What one pack costs at a given price tier. Aldi, 2026-08-18: "we should add this to the setting
   about this logic so that company can change how this logic going to work, can be retail,
   wholesale or ecer its companies decision, i just want to make sure that this app is flexible
   enought so that i can sell it to multiple company instead of one only."

   Retail is the default because that is the rule he gave for his own company. A tier the product
   has no price for falls back to Retail rather than charging nothing — a penalty that silently
   becomes zero is worse than one priced on the wrong tier, because nobody notices it.

   ponytail: MerchantSalesView and useTransactionEngine still each carry their own copy of this
   mapping for SALES. Those are not touched here; folding them in is a separate, wider change. */
export const PRICE_TIERS = ['Retail', 'Grosir', 'Ecer', 'Distributor'];

export const tierPrice = (product = {}, tier = 'Retail') => {
    const field = { Retail: 'priceRetail', Grosir: 'priceGrosir', Ecer: 'priceEcer', Distributor: 'priceDistributor' }[tier];
    return Number((field && product?.[field]) || product?.priceRetail || 0);
};

export const eodBountyLines = (report = {}, inventory = [], priceTier = 'Retail') => {
    const date = report.dayKey || '';
    const id = report.id || '';
    const lines = [];

    const cashShort     = Math.max(0, -Number(report.cashVariance || 0));
    const transferShort = Math.max(0, -Number(report.transferVariance || 0));
    if (cashShort > 0)     lines.push({ key: `PENALTY_EOD_${id}_CASH`,     amount: cashShort,     label: 'Cash short',     date });
    if (transferShort > 0) lines.push({ key: `PENALTY_EOD_${id}_TRANSFER`, amount: transferShort, label: 'Transfer short', date });

    const tier = PRICE_TIERS.includes(priceTier) ? priceTier : 'Retail';
    shortStockRows(report.expectedStock, report.remainingStock).forEach(row => {
        const product = (inventory || []).find(p => p && p.id === row.productId) || {};
        const price = tierPrice(product, tier);
        const packs = convertToBks(row.short, row.unit, product);
        lines.push({
            key: `PENALTY_EOD_${id}_GOODS_${row.productId}`,
            amount: Math.round(packs * price),
            /* The tier is named on the line. A man being charged for stock is entitled to know
               which price list the number came off. */
            label: `${row.name} ${row.short} ${row.unit}${price > 0 ? ` @ ${tier}` : ` (no ${tier} price set)`}`,
            date,
        });
    });

    return lines;
};
