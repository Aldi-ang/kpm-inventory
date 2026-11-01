/* THE SEAT LIMIT - his "subscription manager just for tier 1" (2026-10-28 answers: every login incl. the T2 owner is
   one seat, a locked login keeps its seat, an email change moves the same seat, only removing the person frees it).
   Rules cannot count, so each login HOLDS a numbered seat doc seats/<bossUid>_<n> (firestore.rules CHANGE 20); his
   licence is licenses/<bossUid> { seats }. No licence = no limit. Fleet & Roster and the Landlord screen both number
   seats through here. */
export const seatDocId = (bossUid, n) => `${bossUid}_${n}`;

/* The lowest free seat numbers in 1..limit, up to `count`. None while the taken count is at or over the limit:
   a company whose licence he set below its head count loses nobody, it just adds nobody until it is under.
   ponytail: the rules only check "n <= limit and n is free", so an over-limit company could still fill a freed low
   number from outside the app - its ceiling is the head count it had on licence day. */
export function freeSeats(takenNs, limit, count = 1) {
  const taken = new Set(takenNs), out = [];
  if (taken.size >= limit) return out;
  for (let n = 1; out.length < count && n <= limit; n++) if (!taken.has(n)) out.push(n);
  return out;
}

export const seatsUsedText = (used, limit) => `${used} of ${limit} seats used`;
export const seatsFullMsg = (used, limit) => `${seatsUsedText(used, limit)}. Ask KPM to add seats.`;
