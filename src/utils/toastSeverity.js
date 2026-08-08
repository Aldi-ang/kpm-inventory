/* Which reports are allowed to disappear on their own.

   This is the only judgement call in the toast job, so it lives in a plain .js file that node
   can import — src/config/toastSeverity.selfcheck.mjs runs it against real messages taken out
   of the app. Keeping it in Toast.jsx would have made it unreachable from a self-check, which
   is the same reason findDuplicates.js sits out here.

   The direction is the safety decision. A message auto-dismisses ONLY if it is recognisably a
   success and is not also a failure. Everything else — every refusal, every warning, and
   anything these lists do not recognise — stays on screen until it is clicked away. Wrong in
   that direction costs Aldi one extra click. Wrong the other way loses him a "stock did not
   save" he needed to read, which is the failure this whole file exists to end.

   FAILURE is checked first and wins outright. Without it "Could not complete the sync" fades,
   because it contains the word "complete" — a real message shape, caught by the self-check
   before it ever shipped. Never reorder these two tests.

   Both languages, because the messages are written in both. */

const FAILURE = /\b(fail|fails|failed|failure|error|denied|invalid|cannot|can't|couldn't|unable|insufficient|unauthori[sz]ed|revoked|suspended|expired|rejected|incorrect|wrong|missing|gagal|ditolak|kadaluarsa|salah|habis)\b|\bcould not\b|\bnot (enough|found|allowed)\b|\bnot\s+(?:been\s+)?\w+ed\b|\bbelum\b|\btidak (bisa|cukup|ditemukan)\b|⚠|❌/i;

const SUCCESS = /\b(success|successful|saved|complete|completed|added|created|updated|sent|approved|granted|authorized|unlocked|established|accepted|berhasil|tersimpan|selesai|terkirim|disetujui|ditambahkan)\b|^✅/i;

/* True = the toast stays until he clicks it. This is what Toast.jsx puts on each item, and
   integration.audit.mjs group 13 asserts the host still calls exactly this. */
export function isSticky(message) {
    const text = String(message ?? '').trim();
    if (FAILURE.test(text)) return true;
    return !SUCCESS.test(text);
}

/* Narrower than isSticky on purpose. isSticky answers "may this clear itself?", and its answer
   for anything unrecognised is no — which is right for a toast and useless as a filter, because
   most of the mascot's lines are unrecognised flavour.

   This answers the different question "is this a failure?", and only a recognised one counts.
   App.jsx uses it so the 68 places that still report through the mascot alone — "Sync Failed!
   Retrying later.", "Mirror failed.", "Gagal menghitung ulang karir" — also raise a strip that
   cannot disappear on its own. The mascot keeps every line; he just stops being the only
   witness to the ones that matter. Widening this makes him double-report ordinary news, so
   widen it only for text that genuinely means something went wrong. */
export function isFailure(message) {
    return FAILURE.test(String(message ?? '').trim());
}

export default isSticky;
