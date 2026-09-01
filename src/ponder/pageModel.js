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
