/* WHERE EVERY PAGE OF THE TUTORIAL BOOK IS, AND NOTHING ELSE.

   Pulled out of PonderBook.jsx so it can be RUN rather than read. The book's arithmetic is the one
   part of it a screenshot cannot check: a chapter that lands on the wrong sheet looks exactly like
   a chapter that lands on the right one until you press its ribbon, and the fault is silent — the
   reader simply arrives somewhere else. `logicFixes.selfcheck.mjs` walks all seventeen chapters
   through these four functions at both widths.

   Pure on purpose: `sections` comes in as an argument, so the checks run the real list from the
   registry and nothing here has to know that a registry exists. */

/* One continuous run of pages, cover to endpaper — NOT one run per section.

   🔴 THIS IS FORCED BY THE DATA. Counted 2026-09-01: of the seventeen sections, seventeen hold four
   entries or fewer, so every one is a single page on a desk and sixteen are a single page on a
   phone. Scoping pages to a section, as the book did before, left the drag gesture with nothing to
   drag to on every screen but one. The leaves are the chapters instead, and the drag walks the book. */
export const buildPages = (sections, perPage, withChapters) => {
  const out = [{ k: 'cover' }];
  for (const s of sections) {
    /* A phone reads one page at a time, so a chapter opening would cost a whole extra turn to reach
       the cards it introduces. It is `hidden lg:block` there anyway. */
    if (withChapters) out.push({ k: 'chapter', s });
    const n = Math.max(1, Math.ceil(s.entries.length / perPage));
    for (let p = 0; p < n; p++) out.push({ k: 'cards', s, p });
  }
  out.push({ k: 'end' });
  return out;
};

/* Desk: a sheet carries two pages, one per face. Phone: a sheet carries the page being read and a
   blank back, because a single-page reader never sees the reverse — pairing content onto it would
   silently skip every other page. */
export const asLeaves = (pages, spread) => {
  if (!spread) return pages.map(p => [p, null]);
  const out = [];
  for (let i = 0; i < pages.length; i += 2) out.push([pages[i], pages[i + 1] || null]);
  return out;
};

/* The last sheet that may be turned. Turning the one after it would put the endpaper on the left and
   nothing at all on the right, which is a reader standing past the back cover. */
export const maxTurnOf = (pages, spread) =>
  spread ? Math.floor((pages.length - 2) / 2) : pages.length - 2;

/* Where a chapter lives, counted in sheets. On a desk the chapter opening is the LEFT page of its
   spread, which is the back of sheet n-1, so the sheet number is half its page index rounded up; on
   a phone the cards page IS the spread, so the page index is the sheet number. */
export const turnFor = (pages, spread, maxTurn, id) => {
  const i = pages.findIndex(p => p.s && p.s.id === id && p.k === (spread ? 'chapter' : 'cards'));
  if (i < 0) return 1;
  return Math.min(maxTurn, Math.max(1, spread ? Math.ceil(i / 2) : i));
};

/* The page the reader is looking at: the right-hand one, at both widths. */
export const facingPage = (pages, spread, turn) =>
  pages[spread ? turn * 2 : turn] || pages[1];

/* ── HOW A PAGE TURN IS TIMED ────────────────────────────────────────────────────────

   Aldi, 2026-09-02: *"i want to put full realism of this book ... i want the animation to be 4
   quick page swipe, this way it will make it realistic"* — a ribbon used to turn every sheet
   between here and there, uncapped, getting faster with distance so the longest run in the book
   still landed inside a second. `riffle()` did that arithmetic.

   Aldi, 2026-09-03: reversed. A ribbon jumps STRAIGHT to its chapter now instead of flipping
   through every page in between — `riffle()` is gone, and PonderBook.jsx commits the target turn
   directly. TURN_FULL_MS is the one piece of that arithmetic still alive: a NEIGHBOUR turn
   (next/prev, arrow keys, a drag release) still runs one sheet at a time through seek(), and still
   takes the full deliberate duration below. */
export const TURN_FULL_MS = 340;
/* The floor under any single sheet's animation duration. play() clamps to it so a drag released a
   frame from landing — or any other very-short step — never renders faster than the eye can
   register. A second literal floor written elsewhere once silently overrode this one; there must
   be exactly one. */
export const RIFFLE_MIN_MS = 60;
