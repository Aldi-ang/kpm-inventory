/* THE DEMO BUILD NEVER CARRIES THE REAL PROJECT, AND THE REAL BUILD NEVER CARRIES THE DEMO.

   Aldi's public demo (his picks 2026-10-06 "Stays for everyone", 2026-10-10 "B") is the same app on
   its own Firebase project, kpm-demo-f4d74, switched by VITE_DEMO=1 in src/config/firebase.js. One
   wrong switch = strangers write into his real company, or his salesmen sign in to the demo. So this
   reads the BUILT bundles - the bundle is the thing that ships, not the source:

     npm run build                                              -> dist/
     npx cross-env VITE_DEMO=1 vite build --outDir dist-demo    -> dist-demo/
     node src/config/demoBuild.check.mjs

   "artifacts/cello-inventory-manager/..." (appId) is NOT a real-project marker and is not checked:
   it is only a folder name inside whichever database the build opens, kept the same on purpose so
   firestore.rules deploys to the demo unchanged. */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REAL = ['AIzaSyC9Qr2w0K_RbygNvrzVW1ALE8SmLH6qK_4', '168352992942', 'cello-inventory-manager.firebaseapp.com', 'cello-inventory-manager.firebasestorage.app'];
const DEMO = ['AIzaSyCstVo9iVwhA_ivYsmT9A-UAbBYL-VMFgc', '804156513194', 'kpm-demo-f4d74'];
const EMAIL = ['service_b564nlp'];   // his EmailJS account: a stranger in the demo must never spend it

const bundle = (dir) => {
    if (!existsSync(dir)) { console.error(`FAIL no build at ${dir}/ - run the two builds in the header first`); process.exit(1); }
    return readdirSync(dir, { recursive: true }).filter((f) => /\.(js|html)$/.test(f)).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
};
const real = bundle('dist'), demo = bundle('dist-demo');

let fails = 0;
const check = (ok, name) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) fails++; };
const has = (text, list) => list.filter((m) => text.includes(m));

check(has(real, REAL).length === REAL.length, `the real build opens the real project (${has(real, REAL).length}/${REAL.length} markers - proves the scan read a real bundle)`);
check(has(real, DEMO).length === 0, `the real build carries nothing of the demo project (found: ${has(real, DEMO).join(', ') || 'none'})`);
check(demo.includes('kpm-demo-f4d74'), 'the demo build opens the demo project');
check(has(demo, REAL).length === 0, `the demo build carries nothing of the real project (found: ${has(demo, REAL).join(', ') || 'none'})`);
/* The EmailJS ids stay IN the demo bundle (the minifier keeps code after an early return) - no new
   exposure, the live site's public bundle already carries them. What must hold is the GUARD: both
   send sites stop on IS_DEMO first (App.jsx vault recovery, CrownTransferProtocol.jsx). The real build
   drops the `if (false)` body, so its message is the proof the guard is compiled into the demo only. */
const OFF = ['recovery emails are switched off', 'DEMO: EMAILS ARE SWITCHED OFF'];
check(has(demo, OFF).length === OFF.length, `the demo build stops both email sends before his EmailJS account (${has(demo, OFF).length}/${OFF.length} guards)`);
check(has(real, OFF).length === 0 && has(real, EMAIL).length === EMAIL.length, 'the real build still sends the vault-recovery email, no demo guard in it');

console.log(fails ? `\n${fails} FAILED` : '\nall pass');
process.exit(fails ? 1 : 0);
