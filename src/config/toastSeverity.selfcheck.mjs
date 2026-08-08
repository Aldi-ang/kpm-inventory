/* node src/config/toastSeverity.selfcheck.mjs
   ────────────────────────────────────────────
   Every message below is a real one, copied out of the app, not invented for the test. The
   question this answers is the only judgement call in the toast job: which reports are allowed
   to vanish after 3.5 seconds without Aldi ever seeing them.

   Getting a STICKY one wrong is the expensive direction — that is a failure he never reads,
   which is precisely the silent-failure bug the whole toast job replaced. Getting a FADE one
   wrong just costs him a click. So when in doubt, a message belongs in STICKY. */

import { isSticky, isFailure } from '../utils/toastSeverity.js';

/* isFailure decides which of the 68 mascot-only reports in App.jsx also raise a strip. Too
   narrow and a real failure is announced solely by a bubble that can be walked over; too wide
   and every piece of good news is reported twice. Both lists are real mascot lines. */
const MASCOT_FAILURES = [
    '❌ Sync Failed! Retrying later.',
    'Mirror failed. Check console.',
    '❌ Gagal menghitung ulang karir: quota exceeded',
    '⚠️ BOSS! Sampoerna Mild is critically low (3 left). Restock needed!',
    '⚠️ PROTOCOL ALERT: TIME FOR USB SAFE BACKUP!',
];
const MASCOT_CHATTER = [
    '📡 SIGNAL ACQUIRED! Pushing 12 offline records to HQ...',
    '✅ Sync Complete! 12 items secured in Master Vault.',
    'Map Icons Exported!',
    'Executive Targets Updated! 🎯',
    "Let's DANCE! 🕺💃",
    'Access Granted. Welcome back, Boss.',
    'New dialogue added!',
    'Admin session ended.',
    'Transfer request for Warung Bu Sri sent to Alex!',
    'Deep-fetching system databases and intelligence... ⏳',
];

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
    /* The three real messages the Master Vault product save now sends. The middle one is why
       "not <something>ed" had to join the failure list: it contains the word "saved", so a
       failure whose error text carried no failure word of its own faded away. A save that did
       not happen, clearing itself off the screen after 3.5 seconds. */
    'Sampoerna Mild is on this device only — it has NOT reached the server yet, and will sync when the connection returns.\nStock 1000 Bks · 1 Karton = 800 Bks · 1 Bal = 200 Bks.',
    '"Sampoerna Mild" was NOT saved. boom',
    '"Sampoerna Mild" was NOT saved. Missing or insufficient permissions.',
    'Could not save this product. boom',
    'Stock belum masuk ke server.',
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
    /* The successful half of the same Master Vault save. It names the stock he typed as well as
       the packing — reporting only the packing is what made him think the app had confirmed
       something he had not touched. */
    'Sampoerna Mild saved.\nStock 1000 Bks · 1 Karton = 800 Bks · 1 Bal = 200 Bks.',
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

console.log('\nmascot lines that must ALSO raise a strip');
for (const m of MASCOT_FAILURES) {
    report(isFailure(m) === true, JSON.stringify(m).slice(0, 74),
        'the mascot would be the only witness, and he can be walked over or suppressed');
}

console.log('\nmascot lines that must NOT be repeated as a strip');
for (const m of MASCOT_CHATTER) {
    report(isFailure(m) === false, JSON.stringify(m).slice(0, 74),
        'every piece of ordinary news would be reported twice');
}

/* A classifier that answers "sticky" to everything passes the STICKY block and would look
   healthy on a glance at the totals. Assert both directions actually fire. */
console.log('\nthe test itself is not vacuous');
report(STICKY.some(m => isSticky(m)) && FADE.some(m => !isSticky(m)),
    'both answers are reachable', 'the classifier is answering one way for everything');

console.log('\n' + '='.repeat(58));
console.log(`${pass} passed, ${fail} failed, ${pass + fail} checks`);
process.exit(fail ? 1 : 0);
