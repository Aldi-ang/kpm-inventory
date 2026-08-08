/* node src/config/toastSeverity.selfcheck.mjs
   ────────────────────────────────────────────
   Every message below is a real one, copied out of the app, not invented for the test. The
   question this answers is the only judgement call in the toast job: which reports are allowed
   to vanish after 3.5 seconds without Aldi ever seeing them.

   Getting a STICKY one wrong is the expensive direction — that is a failure he never reads,
   which is precisely the silent-failure bug the whole toast job replaced. Getting a FADE one
   wrong just costs him a click. So when in doubt, a message belongs in STICKY. */

import { isSticky } from '../utils/toastSeverity.js';

/* Must stay on screen until clicked. */
const STICKY = [
    'Failed to save Achievements.',
    'Failed to save record: permission-denied',
    'Failed to grant award: network error',
    'Crop Failed: boom',
    'ACCOUNT SUSPENDED: Subscription inactive. Please contact KPM System Administration.',
    'AUTHORIZATION REVOKED: Your KPM profile was deleted by the Administrator.',
    'Could not register passkey. Check your device screen lock settings.',
    'No devices registered! Please enter your PIN, go to Settings, and register this device.',
    'Incorrect PIN. Strike 3/5.',
    'No security profile found.',
    'Request not found!',
    'Award needs a title.',
    'XP must be a nonzero number.',
    'Select a product and valid quantity.',
    'Secret recovery word is required!',
    'Hold on! A transfer request for Toko Jaya is already pending.',
    /* The case that made this file exist. It contains "complete", so a success-only test
       faded it — a sync failure disappearing after 3.5 seconds, unread. */
    'Could not complete the sync. Your last sale is still queued.',
    'Stok tidak cukup untuk penjualan ini.',
    'Gagal menyimpan data pelanggan.',
    /* Unrecognised text is not a success, so it stays. This is the default and it must hold. */
    'Go to Sales Terminal for Warung Bu Sri',
    '',
];

/* Safe to miss — nothing is lost if it fades before he looks up. */
const FADE = [
    'Security Protocol Established! Vault Unlocked.',
    'Authorization Code Accepted. You may now create new Master Credentials.',
    'Success! "Aldi Phone" is now authorized for Biometric Login.',
    'TRANSFER COMPLETE. You will now be logged out. The new owner must log in with Google to claim the Crown.',
    'Customer saved.',
    'Product updated.',
    'Request sent.',
    'Award granted.',
    'Data berhasil tersimpan.',
    'Laporan terkirim.',
    '✅ Stock opname selesai.',
];

let pass = 0;
let fail = 0;
const report = (ok, label, detail) => {
    if (ok) { pass++; console.log('  ok   ' + label); }
    else { fail++; console.log(' FAIL  ' + label + '   <-- ' + detail); }
};

console.log('\nmust stay until clicked');
for (const m of STICKY) {
    report(isSticky(m) === true, JSON.stringify(m).slice(0, 74),
        'this would fade after 3.5s and he would never read it');
}

console.log('\nsafe to fade on its own');
for (const m of FADE) {
    report(isSticky(m) === false, JSON.stringify(m).slice(0, 74),
        'this would nag him for a click he does not need');
}

/* A classifier that answers "sticky" to everything passes the STICKY block and would look
   healthy on a glance at the totals. Assert both directions actually fire. */
console.log('\nthe test itself is not vacuous');
report(STICKY.some(m => isSticky(m)) && FADE.some(m => !isSticky(m)),
    'both answers are reachable', 'the classifier is answering one way for everything');

console.log('\n' + '='.repeat(58));
console.log(`${pass} passed, ${fail} failed, ${pass + fail} checks`);
process.exit(fail ? 1 : 0);
