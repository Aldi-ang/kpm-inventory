/* SEED THE LOCAL FIREBASE EMULATOR — fake company, fake people, fake money.

   Why this exists: the agent can open this app in a browser but must never sign in with real
   credentials, so every screen behind the login was unverifiable and every appearance check went
   back to Aldi by eye. A fake local database with a fake account is the only honest way past it.
   His call, 2026-09-08: *"okay sure make the emulator for better efficiency for both of us"*.

   NOTHING HERE CAN REACH LIVE DATA. It writes to 127.0.0.1:8080, which is the Firestore emulator,
   over plain REST, authorised by the emulator's own `Bearer owner` token - a string that means
   nothing to a real Firebase project. If the emulator is not running the fetch fails and the
   script stops; there is no code path here that resolves to a real project.

   Usage, from the repo root, with `firebase emulators:start --only auth,firestore` running:

     node tools/seed-emulator.mjs                     # directory row only, keyed by EMAIL
     node tools/seed-emulator.mjs --uid <uid>         # ...plus the whole company under that uid

   Two passes on purpose. The Auth emulator assigns the uid when the fake account is created in
   the browser, so the email-keyed row goes in first to let that login through (App.jsx reads
   employee_directory by uid AND by email, and a COMPANY_OWNER row keyed by email is enough), then
   the second pass fills the company once the uid is known. Re-running is safe: every write is a
   full document overwrite at a fixed id, so the seed is idempotent.                             */

const PROJECT = 'cello-inventory-manager';   // must match `appId` in src/config/firebase.js
const APP_ID  = 'cello-inventory-manager';
const HOST    = 'http://127.0.0.1:8080';
const BASE    = `${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;

const arg = (name) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : null;
};
const EMAIL = arg('email') || 'adikaryasukses99@gmail.com';
const UID   = arg('uid');

/* JS value -> Firestore REST typed value. Deliberately small: the seed only uses these shapes,
   and a general converter would be code with one caller. */
const val = (v) => {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(val) } };
    if (typeof v === 'object') return { mapValue: { fields: fields(v) } };
    return { stringValue: String(v) };
};
const fields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, val(v)]));

let written = 0;
const put = async (path, data) => {
    // PATCH to a fully-qualified document name creates or replaces it at that exact id.
    const res = await fetch(`${BASE}/${path}`, {
        method: 'PATCH',
        /* `Bearer owner` is the Firestore EMULATOR's admin token. It bypasses firestore.rules,
           which the emulator otherwise enforces exactly as production does - the first run of this
           script was refused by the real rules, which is the emulator behaving correctly. The
           string is meaningless to a real Firebase project, so this header cannot become a way to
           write live data even by accident. */
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
        body: JSON.stringify({ fields: fields(data) }),
    });
    if (!res.ok) throw new Error(`${res.status} ${path}\n${await res.text()}`);
    written++;
    return res.json();
};

/* ── the fake company ──────────────────────────────────────────────────────────────────────── */

const PRODUCTS = [
    { id: 'p_surya12',  name: 'SURYA 12',        stock: 240, priceDistributor: 24500, priceEcer: 29000, priceRetail: 27500, priceGrosir: 26500, sticksPerPack: 12, category: 'SKM' },
    { id: 'p_surya16',  name: 'SURYA 16',        stock: 180, priceDistributor: 31000, priceEcer: 37000, priceRetail: 35000, priceGrosir: 33500, sticksPerPack: 16, category: 'SKM' },
    { id: 'p_gudgar',   name: 'GUDANG GARAM FI', stock:  96, priceDistributor: 27000, priceEcer: 32000, priceRetail: 30500, priceGrosir: 29000, sticksPerPack: 12, category: 'SKM' },
    { id: 'p_sampoerna',name: 'SAMPOERNA MILD',  stock:   8, priceDistributor: 29500, priceEcer: 35000, priceRetail: 33000, priceGrosir: 31500, sticksPerPack: 16, category: 'SKM' },
];

const MOTORISTS = [
    { id: 'm_budi', name: 'BUDI SANTOSO', userRole: 'TIER_5', location: 'HEADQUARTERS', plate: 'B 1234 XYZ', phone: '081200000001', email: 'budi.test@example.com',
      activeCanvas: [ { productId: 'p_surya12', name: 'SURYA 12', qty: 20, unit: 'Bks', priceTier: 'Retail', calculatedPrice: 27500 },
                      { productId: 'p_surya16', name: 'SURYA 16', qty: 10, unit: 'Bks', priceTier: 'Retail', calculatedPrice: 35000 } ] },
    { id: 'm_sari', name: 'SARI WULANDARI', userRole: 'TIER_4', location: 'BANDUNG', plate: 'D 5678 ABC', phone: '081200000002', email: 'sari.test@example.com',
      approvalRegions: ['BANDUNG'], activeCanvas: [] },
];

const CUSTOMERS = [
    { id: 'c_makmur', name: 'TOKO MAKMUR JAYA', status: 'APPROVED', address: 'Jl. Merdeka 12', phone: '081300000001', location: 'HEADQUARTERS', ownerAgentId: 'm_budi' },
    { id: 'c_berkah', name: 'WARUNG BERKAH',    status: 'APPROVED', address: 'Jl. Melati 4',   phone: '081300000002', location: 'HEADQUARTERS', ownerAgentId: 'm_budi' },
    { id: 'c_sinar',  name: 'KIOS SINAR',       status: 'NOO_ACTIVE', address: 'Jl. Kenanga 9', phone: '081300000003', location: 'BANDUNG', ownerAgentId: 'm_sari' },
];

/* Two consignment placements and one cash sale. `type` is left off the sales on purpose: that is
   what a real sale looks like, and salesRollup's isSale() reads a missing type as 'SALE'. */
const day = (n) => `2026-09-${String(n).padStart(2, '0')}`;
const TRANSACTIONS = [
    { id: 't_1', date: day(2), customerName: 'TOKO MAKMUR JAYA', paymentType: 'Titip', total: 550000, agentId: 'm_budi',
      items: [ { productId: 'p_surya12', name: 'SURYA 12', qty: 20, unit: 'Bks', priceTier: 'Retail', calculatedPrice: 27500 } ] },
    { id: 't_2', date: day(4), customerName: 'WARUNG BERKAH', paymentType: 'Cash', total: 350000, agentId: 'm_budi',
      items: [ { productId: 'p_surya16', name: 'SURYA 16', qty: 10, unit: 'Bks', priceTier: 'Retail', calculatedPrice: 35000 } ] },
    { id: 't_3', date: day(6), customerName: 'KIOS SINAR', paymentType: 'Titip', total: 305000, agentId: 'm_sari',
      items: [ { productId: 'p_gudgar', name: 'GUDANG GARAM FI', qty: 10, unit: 'Bks', priceTier: 'Retail', calculatedPrice: 30500 } ] },
];

const run = async () => {
    /* The directory row that lets the fake account in. COMPANY_OWNER is the branch in App.jsx that
       sets userRole ADMIN and leaves bossUid null, so the tenant is the signer's own uid. Written
       under the EMAIL id because the uid does not exist until the account is created in the
       browser. */
    const owner = { role: 'COMPANY_OWNER', name: 'ALDI (LOCAL TEST)', email: EMAIL, status: 'ACTIVE', subscriptionStatus: 'ACTIVE' };
    await put(`artifacts/${APP_ID}/employee_directory/${encodeURIComponent(EMAIL)}`, owner);

    if (!UID) {
        console.log(`seeded ${written} document(s): the directory row for ${EMAIL}.`);
        console.log('Now sign in through the Auth emulator, then re-run with --uid <the uid> to fill the company.');
        return;
    }

    await put(`artifacts/${APP_ID}/employee_directory/${UID}`, { ...owner, uid: UID });

    /* THE VAULT, SEEDED AS DATA RATHER THAN TYPED INTO THE FORM.

       After login the app shows INITIALIZE VAULT and asks for a master password. Typing one into
       a login form is not something the agent does, even a fake one - so the same value the app
       would have stored is computed here and written directly. App.jsx's hashSecretWord is
       SHA-256 over word.toLowerCase().trim(), hex; crypto.subtle in the browser and node's
       webcrypto produce the identical digest, so the app cannot tell this from a real setup.

       The password is `Emulator-1!` (Level 5: 8+ chars, upper, lower, number, symbol - the app
       refuses anything weaker) and the recovery word is `emulator`. Both are meaningless outside
       this fake local database. */
    const sha256Hex = async (word) => {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(word).toLowerCase().trim()));
        return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const root = `artifacts/${APP_ID}/users/${UID}`;
    await put(`${root}/settings/admin`, {
        pin: await sha256Hex('Emulator-1!'),
        recoveryHash: await sha256Hex('emulator'),
        failedRecoveryAttempts: 0,
        lockoutStatus: 'NONE',
    });

    for (const p of PRODUCTS)     await put(`${root}/products/${p.id}`, p);
    for (const m of MOTORISTS)    await put(`${root}/motorists/${m.id}`, m);
    for (const c of CUSTOMERS)    await put(`${root}/customers/${c.id}`, c);
    for (const t of TRANSACTIONS) await put(`${root}/transactions/${t.id}`, t);

    console.log(`seeded ${written} documents under ${root}`);
    console.log(`  ${PRODUCTS.length} products, ${MOTORISTS.length} agents, ${CUSTOMERS.length} shops, ${TRANSACTIONS.length} transactions`);
    console.log('  vault master password: Emulator-1!   recovery word: emulator');
};

run().catch((e) => {
    console.error('SEED FAILED:', e.message);
    console.error('Is the emulator running?  firebase emulators:start --only auth,firestore');
    process.exit(1);
});
