/* THE DEMO'S /api ON THIS MACHINE - so the demo app on the emulator (launch `demo-app-emulator`, 5176) can reach
   api/demo-switch.js and api/demo-reset.js the way Vercel serves them. vite's httpdev mode forwards /api here.

     node tools/demo-api-emulator.mjs          (needs `demo-emulator` running; serves http://127.0.0.1:5177)

   Same fences as tools/demo-reset-emulator.mjs: it refuses unless both emulator addresses are this machine, and the
   key it hands the functions is a throwaway made here - the emulator never checks it. */
import { createServer } from 'node:http';
import { generateKeyPairSync } from 'node:crypto';

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
for (const h of [process.env.FIRESTORE_EMULATOR_HOST, process.env.FIREBASE_AUTH_EMULATOR_HOST]) {
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(h)) { console.error(`REFUSED: ${h} is not this machine`); process.exit(1); }
}
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
process.env.DEMO_FIREBASE_KEY = JSON.stringify({ type: 'service_account', project_id: 'kpm-demo-f4d74', client_email: 'emulator@kpm-demo-f4d74.iam.gserviceaccount.com', private_key: privateKey });

const FNS = { 'demo-switch': (await import('../api/demo-switch.js')).default, 'demo-reset': (await import('../api/demo-reset.js')).default };

createServer(async (req, res) => {
    const fn = FNS[(req.url || '').split('?')[0].replace(/^\/api\//, '')];
    let raw = '';
    for await (const c of req) raw += c;
    const out = { status(c) { res.statusCode = c; return out; }, json(o) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return out; } };
    if (!fn) return out.status(404).json({ ok: false, reason: 'no such function' });
    try { await fn({ method: req.method, headers: req.headers, body: raw ? JSON.parse(raw) : {} }, out); }
    catch (e) { console.error(e); out.status(500).json({ ok: false, reason: e.message }); }
    console.log(req.method, req.url, res.statusCode);
}).listen(5177, '127.0.0.1', () => console.log('demo /api on http://127.0.0.1:5177'));
