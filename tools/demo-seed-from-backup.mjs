/* THE PUBLIC DEMO'S DATA, made from his real backup - his picks 2026-10-10: "A is better option,
   just keep the store name btw but slightly change the price of each products just make it easier to compute".

     node tools/demo-seed-from-backup.mjs "C:/Users/ASUS/Downloads/FOLDER_RECOVERY--SAFE_<ts>.json"
       -> demo/seed.json   (the backup itself NEVER enters the repo or the vault)

   What survives is an ALLOWLIST, never a denylist - a field the app adds next month stays out until
   someone decides it is safe:
   - products: real names, photos, pack sizes, stock; each price x1.05 then rounded to Rp 500
     (Rp 5.000 at 50k and up), kept strictly distributor < grosir < retail < ecer.
   - shops: real names (his call), town / region / type / level; each pin moved 150-400 m (same town);
     the map folders renamed "Folder 1..n"; the salesman on each shop replaced by demo-agent-1..n.
     Phones, addresses, photos, notes, contact names, debts, competitor notes, visit history: dropped.
   - activity log: dropped (real people's actions). Company name: "DSM Demo".
   The seed's safety is re-checked on every run of src/config/logicFixes.selfcheck.mjs ("The demo seed"). */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { restorableBorders } from '../src/utils/mapBorders.js';

const src = process.argv[2];
if (!src) { console.error('usage: node tools/demo-seed-from-backup.mjs <FOLDER_RECOVERY--SAFE_*.json>'); process.exit(1); }
const backup = JSON.parse(readFileSync(src, 'utf8'));
if (backup.meta?.type !== 'RECOVERY') { console.error(`not a RECOVERY backup (meta.type = ${backup.meta?.type})`); process.exit(1); }

const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
/* the same id always moves the same way, so a re-run does not shuffle the map */
const rand = (id, salt) => { let h = 2166136261; for (const ch of `${id}|${salt}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 100000) / 100000; };

const PRODUCT_KEYS = ['id', 'name', 'type', 'description', 'images', 'useFrontForBack', 'dimensions', 'defaultZoom', 'taxStamp',
    'packsPerSlop', 'slopsPerBal', 'balsPerCarton', 'sticksPerPack', 'minStock', 'stock', 'damagedStock', 'badStock', 'createdAt', 'updatedAt'];
const PRICES = ['priceDistributor', 'priceGrosir', 'priceRetail', 'priceEcer'];
const nudge = (p) => { const step = p * 1.05 >= 50000 ? 5000 : 500; return Math.round((p * 1.05) / step) * step; };
const products = backup.inventory.map((p) => {
    const out = pick(p, PRODUCT_KEYS);
    const v = PRICES.map((k) => nudge(Number(p[k]) || 0));
    for (let i = v.length - 2; i >= 0; i--) if (v[i] >= v[i + 1]) v[i] = v[i + 1] - (v[i + 1] >= 50000 ? 5000 : 500);
    PRICES.forEach((k, i) => { out[k] = v[i]; });
    return out;
});

/* PROMO GOODS (2026-10-26, his "make sure the new master vault is uploaded in the demo"): one of each goods type, so
   the demo's Master Vault shows the 3D goods. Their own key, never `inventory`: everything that reads that list (the
   made-up sales, the branch stock, the canvases in api/_demoCompany.js) is cigarette-only. */
const promo = [['tshirt', 'T-shirt Cello', 40], ['poster', 'Poster Cello', 120], ['hat', 'Hat Cello', 25], ['lighter', 'Lighter Cello', 300],
    ['ashtray', 'Ashtray Cello', 60], ['mug', 'Mug Cello', 30]]
    .map(([goods, name, stock]) => ({ id: `demo-promo-${goods}`, name, kind: 'promo', unit: 'pcs', type: 'PROMO', goods, stock, minStock: 5,
        images: {}, dimensions: { w: 90, h: 100, d: 3 } }));

const SHOP_KEYS =['id', 'name', 'city', 'province', 'region', 'storeType', 'tier', 'priceTier', 'pricingTier', 'status', 'visitFreq',
    'catchmentScale', 'lifetimeXP', 'seasonXP', 'lastXPUpdate', 'createdAt', 'updatedAt'];
const folders = [...new Set(backup.customers.map((c) => c.mapFolder).filter(Boolean))];
const agents = [...new Set(backup.customers.map((c) => c.assignedAgent).filter(Boolean))];
let minMove = Infinity, maxMove = 0;
const shops = backup.customers.map((c) => {
    const out = pick(c, SHOP_KEYS);
    if (c.mapFolder) out.mapFolder = `Folder ${folders.indexOf(c.mapFolder) + 1}`;
    if (c.assignedAgent) out.assignedAgent = `demo-agent-${agents.indexOf(c.assignedAgent) + 1}`;
    const lat = Number(c.latitude), lng = Number(c.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) {
        const d = 150 + 250 * rand(c.id, 'd'), a = 2 * Math.PI * rand(c.id, 'a');
        out.latitude = +(lat + (d * Math.cos(a)) / 111320).toFixed(6);
        out.longitude = +(lng + (d * Math.sin(a)) / (111320 * Math.cos((lat * Math.PI) / 180))).toFixed(6);
        const moved = Math.hypot((out.latitude - lat) * 111320, (out.longitude - lng) * 111320 * Math.cos((lat * Math.PI) / 180));
        minMove = Math.min(minMove, moved); maxMove = Math.max(maxMove, moved);
    }
    return out;
});

/* his map borders (2026-10-13, his "just use 2 area that i insert on the map system"): the shapes he drew are public
   geography, kept with the keys the Map System draws from. A backup made before the backup fix has none. */
const BORDER_KEYS = ['id', 'name', 'level', 'folderName', 'color', 'isHidden', 'geometryString'];
const mapBorders = restorableBorders(backup).map((b) => pick(b, BORDER_KEYS));
const droppedKeys = [...new Set(restorableBorders(backup).flatMap((b) => Object.keys(b).filter((k) => !BORDER_KEYS.includes(k))))];

const seed = {
    meta: { type: 'DEMO_SEED', from: backup.meta.ts, note: 'made by tools/demo-seed-from-backup.mjs - no phones, addresses, photos, notes or exact pins' },
    appSettings: { companyName: 'DSM Demo' },
    tierSettings: backup.tierSettings,
    inventory: products,
    promo,
    customers: shops,
    mapBorders,
};
mkdirSync('demo', { recursive: true });
writeFileSync('demo/seed.json', JSON.stringify(seed, null, 1));
console.log(`demo/seed.json: ${products.length} products, ${shops.length} shops (${agents.length} salesmen -> demo-agent-1..${agents.length}, ${folders.length} map folders), pins moved ${Math.round(minMove)}-${Math.round(maxMove)} m`);
console.log(`  ${mapBorders.length} map borders${mapBorders.length ? ': ' + mapBorders.map((b) => `${b.name} (${b.level})`).join(', ') : ' - the backup was made before the backup fix, make a fresh one'}${droppedKeys.length ? `; border keys left out: ${droppedKeys.join(', ')}` : ''}`);
products.forEach((p, i) => console.log(`  ${p.name}: ${PRICES.map((k) => backup.inventory[i][k]).join(' / ')}  ->  ${PRICES.map((k) => p[k]).join(' / ')}`));
