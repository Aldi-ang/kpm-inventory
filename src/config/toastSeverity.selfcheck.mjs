/* node src/config/toastSeverity.selfcheck.mjs
   ────────────────────────────────────────────
   Every message below is a real one, copied out of the app, not invented for the test. Since
   2026-10-02 (his design) every strip fades after 5 seconds and the bell's Missed list keeps all of
   them, so the one question left is isFailure: which lines are failures. Three things hang on it -
   the capybara hands a failure to the top panel and says nothing (his pick A), the strip gets the red
   edge and the error sound, and the Missed row gets the red edge. Too narrow and a failure reads as
   news; too wide and ordinary news leaves the capybara for the top panel. */

import { readFileSync } from 'node:fs';
import { isFailure } from '../utils/toastSeverity.js';

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

/* Strips that must read as failures: red edge, error sound, a red row in the Missed list. A plain
   refusal with no failure word ("Award needs a title.") shows orange - it is still in the list. */
const FAILURE_STRIPS = [
    'Failed to save Achievements.',
    'Failed to save record: permission-denied',
    'Failed to grant award: network error',
    'Crop Failed: boom',
    'ACCOUNT SUSPENDED: Subscription inactive. Please contact KPM System Administration.',
    'AUTHORIZATION REVOKED: Your KPM profile was deleted by the Administrator.',
    'Could not register passkey. Check your device screen lock settings.',
    'Incorrect PIN. Strike 3/5.',
    'Request not found!',
    /* The case that made this file exist. It contains "complete", so a success-only test
       faded it — a sync failure disappearing after 3.5 seconds, unread. */
    'Could not complete the sync. Your last sale is still queued.',
    'Stok tidak cukup untuk penjualan ini.',
    'Gagal menyimpan data pelanggan.',
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

/* Good news — never painted as a failure. */
const SUCCESSES = [
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

console.log('\nstrips that read as failures');
for (const m of FAILURE_STRIPS) {
    report(isFailure(m) === true, JSON.stringify(m).slice(0, 74),
        'a failure would show as ordinary news - no red edge, no error sound');
}

console.log('\ngood news is never painted as a failure');
for (const m of SUCCESSES) {
    report(isFailure(m) === false, JSON.stringify(m).slice(0, 74),
        'a success would arrive red with the error sound');
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

/* A classifier that answers "failure" to everything passes the failure block and would look
   healthy on a glance at the totals. Assert both directions actually fire. */
console.log('\nthe test itself is not vacuous');
report(FAILURE_STRIPS.some(m => isFailure(m)) && SUCCESSES.some(m => !isFailure(m)),
    'both answers are reachable', 'the classifier is answering one way for everything');

/* A strip is up for 5 seconds, and a confirm dialog is modal: whatever was on screen when
   the question opened has to sit UNDER it, or the low-stock alarm lies across the top of the
   question he is trying to read. Both numbers are read from the two host lines so the check
   cannot drift from the code, and each anchor is asserted before its number is trusted. */
console.log('\nthe dialog paints over the toast column, never under it');
{
    const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
    const toastHost = read('../components/Toast.jsx')
        .match(/className="pointer-events-none fixed inset-x-0 top-0 z-\[(\d+)\]/);
    const gate = read('../components/ConfirmGate.jsx')
        .match(/className="fixed inset-0 z-\[(\d+)\] flex items-center justify-center bg-black\/75/);
    report(!!toastHost, 'the toast column host line is where the check expects it',
        'anchor missed, so the number below is read from nothing');
    report(!!gate, 'the ConfirmGate layer line is where the check expects it',
        'anchor missed, so the number below is read from nothing');
    const toastZ = toastHost ? Number(toastHost[1]) : NaN;
    const gateZ = gate ? Number(gate[1]) : NaN;
    report(toastZ < gateZ, `toast column z-[${toastZ}] sits below the dialog z-[${gateZ}]`,
        'a strip paints across the top edge of an open dialog');
}

console.log('\n' + '='.repeat(58));
console.log(`${pass} passed, ${fail} failed, ${pass + fail} checks`);
process.exit(fail ? 1 : 0);
