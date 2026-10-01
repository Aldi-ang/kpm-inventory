/* Which reports are failures.

   This is the only judgement call left in the toast job, so it lives in a plain .js file that node
   can import — src/config/toastSeverity.selfcheck.mjs runs it against real messages taken out of
   the app. Keeping it in Toast.jsx would have made it unreachable from a self-check, which is the
   same reason findDuplicates.js sits out here.

   Until 2026-10-02 a second test here (isSticky) decided which strips stayed until clicked. His
   design ended that: every strip fades after 5 seconds and the bell's Missed list keeps every one
   of them (utils/missedLog.js), so "may this clear itself?" has the same answer for everything.

   Both languages, because the messages are written in both. */

const FAILURE = /\b(fail|fails|failed|failure|error|denied|invalid|cannot|can't|couldn't|unable|insufficient|unauthori[sz]ed|revoked|suspended|expired|rejected|incorrect|wrong|missing|gagal|ditolak|kadaluarsa|salah|habis)\b|\bcould not\b|\bnot (enough|found|allowed)\b|\bnot\s+(?:been\s+)?\w+ed\b|\bbelum\b|\btidak (bisa|cukup|ditemukan)\b|⚠|❌/i;

/* "Is this a failure?" — only a recognised one counts. Three readers:
   - App.jsx triggerCapy: his pick A (2026-10-02) - a failure goes to the top panel ONLY, the
     capybara says everything else. Widening this moves ordinary news off the capybara.
   - Toast.jsx: a failure's strip gets the red edge and the error sound while it is up.
   - the bell's Missed list: a failure's row gets the red edge. */
export function isFailure(message) {
    return FAILURE.test(String(message ?? '').trim());
}
