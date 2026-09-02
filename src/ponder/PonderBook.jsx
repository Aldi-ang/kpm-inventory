/* THE BOOK — the tutorial index, living in the app's top bar.

   His ask, 2026-08-27: *"i want the tutorial book on the very top of the screen for every
   components"*, then, after seeing it: *"when we press the book, it should open the book and zoomed
   in to our screen taking most space then close and shrink and go to its perspective place when
   close"*, and *"the book look so bad there, its so black and small and doesnt look like a book"*.

   🔴 THREE THINGS THAT WERE WRONG THE FIRST TIME, all fixed here:

   1. **It rendered inside the top bar.** `position: fixed` measures against the viewport only while
      no ancestor makes a containing block — and `backdrop-filter` does. The top bar is glass. So
      `inset-0` resolved to a 90px strip of chrome and the whole spread shipped as a torn ribbon
      across the header. It is PORTALLED to document.body now. A component mounted anywhere must
      assume nothing about where.
   2. **It flew from nowhere.** The zoom now starts from the chip's real measured rectangle, so the
      book grows out of the little book you pressed and shrinks back into it on the way out.
   3. **It was black.** A book is PAPER. This one is cream in both themes — deliberately exempt
      from the light/dark palette, the same exemption the printed nota already has, and cream is on
      the palette anyway (slate/rust/gold/cream). Dark mode gets the leather cover and the shadow,
      not black pages.

   LITE MODE. His call: *"for lite mode then snap the book and close it right back thats fine"*.
   No animation is constructed at all there — not a fast one, none — and the close returns
   immediately instead of waiting for something that is not playing. */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Lock,
         LayoutGrid, Map, Route, Truck, Package, Boxes, PackagePlus, Store, Receipt,
         Wallet, ClipboardList, Users, Gift, BarChart3, ScrollText, Settings, User } from 'lucide-react';
import { SECTIONS, getScene } from './registry.js';
import { buildPages, asLeaves, maxTurnOf, turnFor, facingPage,
         riffle, TURN_FULL_MS } from './pageModel.js';
import PonderOverlay from './PonderOverlay.jsx';
import { bookOpen, bookPage, bookPick, bookClose } from './sfx.js';

/* The SIDEBAR's own icons, so a chapter looks like the thing you click to reach it. Any name the
   nav uses can be added here; a name that is not here falls back rather than crashing. */
const ICONS = { LayoutGrid, Map, Route, Truck, Package, Boxes, PackagePlus, Store, Receipt,
                Wallet, ClipboardList, Users, Gift, BarChart3, ScrollText, Settings, User };
const Icon = ({ name, ...rest }) => {
  const C = ICONS[name] || Package;
  return <C {...rest} />;
};

const liteOn = () => typeof document !== 'undefined'
  && document.documentElement.classList.contains('lite-mode');
const reduced = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PER_PAGE = 4;
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

/* 🔴 THESE LIVE AT MODULE SCOPE, AND THAT IS A BUG FIX, NOT TIDYING.

   `T` was an object literal declared inside the component, so React built a NEW one on every
   render. It sat in the open animation's dependency array, that array therefore changed on every
   render, and the effect re-ran — replaying the entire fly-in-and-open sequence every time anyone
   pressed a section. Aldi: *"animation is reset everytime i press the section"*.

   Nothing here depends on props or state, so nothing here belongs inside the component. Strings
   compare by value and were harmless; the object was not. Anything that ends up in a dependency
   array has to be stable, and the cheapest way to be stable is to not be recreated. */
const SHUT = 'rotateY(-180deg)';
const OPEN = 'rotateY(0deg)';
const FLAT = 'translate(0px, 0px) scale(1)';
/* The cover's own width. Shut, the book is the left half plus the tab column; open, the whole
   spread. Expressed as a clip so nothing reflows. */
/* 🔴 WHERE THE COVER STARTS, AND IT IS NOT WHERE THE CONTAINER STARTS.

   His note, 2026-08-28: *"there should be no background brown here, because the book is not that
   long right and there is no background for the book, instead the ribbon for the section should be
   floating so cut the brown background where the book ends not where the ribbon ends"*.

   The ribbon column is a flex item INSIDE the book container, and the leather was `inset-0` — so the
   cover stretched out to include the ribbons and the book read as 118px wider than it is. Ribbons on
   a real book hang OUT past the page edge; that is the whole reason you can grab one. So the leather
   now starts here, six pixels into the column, and the ribbons stick out over the scrim. */
const COVER_LEFT = 116;   // px from the container's left edge; the ribbon column is 118 wide
const SLAB_OPEN = 'inset(0 0 0 0 round 14px)';
/* The shut cover has to stop at the CENTRE FOLD, and the fold did not move when the cover's left
   edge did — so this offset is measured from the slab's own box, which is now 116px narrower.
   Was `50% - 62px` when the slab spanned the whole container; half of 116 is 58, so the same screen
   position is `50% + 58 - 62`. Verified in the lab rather than trusted: `?book`. */
const SLAB_SHUT = 'inset(0 calc(50% - 4px) 0 0 round 14px)';
/* A PHONE CLOSES TO A SPINE, NOT TO A HALF. Aldi, 2026-09-01: *"just made the animation of close
   book like a closing of long vertical book ... the background of the book is making it look
   broke"*. The desk's shut state clips the cover to the LEFT HALF, because on a desk that half is
   a page you can see. A phone renders no left page at all, so clipping to 50% left a brown slab
   standing over a gap where nothing had ever been drawn. That gap is the broken background. What a
   tall book leaves behind when it shuts is its spine, so that is what the phone clips to. */
const SLAB_SHUT_SPINE = 'inset(0 calc(100% - 30px) 0 0 round 14px)';
/* Sequenced by DELAY, not by offsets inside a shared clock — that is what makes one beat finish
   before the next begins. The totals sit just under his sound files, 1,30s and 1,16s. */
const T = {
  flyIn: 460, leafOpen: 620, leafOpenDelay: 380,      // 1000ms — lands shut, THEN opens
  leafShut: 520, flyOut: 480, flyOutDelay: 500,       //  980ms — shuts, THEN leaves
};
/* Paper has mass: a hinge eases in AND out, where something flying to a stop only eases out. */
const HINGE = 'cubic-bezier(0.62, 0.02, 0.28, 1)';
const AWAY = 'cubic-bezier(0.55, 0, 0.85, 0.35)';
/* A ribbon tail: a V cut into the free end, the one shape that says fabric rather than tab. */
const RIBBON = 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 9px 50%)';
const shade = (el, frames, duration, delay) => el && el.animate(frames,
  { duration, delay, easing: 'linear', fill: 'both' });

/* THE BOOK'S OWN PALETTE, and it is theme-exempt on purpose.

   [[Aldi's Design Taste]] already records that a screen can opt out of the theme entirely — the
   printed nota does. A book is the same argument: paper is paper in a dark room. Cream pages, dark
   ink, a leather cover and the app's gold. Nothing here is blue or green, so the palette law is
   intact; what is suspended is only the light/dark swap. */
const PAPER = '#EFE8D8';
const PAPER_2 = '#E4DAC6';
const BOOK_INK = '#2A241D';
const BOOK_DIM = '#6E6455';
const LEATHER = '#241D16';
/* THICKNESS. His note: *"book must be 3D with its thickness"*. A stack of sheets seen edge-on is
   not a flat tan band — it is fine alternating lines, and that is the only cheap thing that reads
   as "many pages" rather than "one thick card". */
const EDGES = 'repeating-linear-gradient(180deg, #E9E1CF 0 2px, #CBBFA4 2px 3px)';
const EDGES_H = 'repeating-linear-gradient(90deg, #E9E1CF 0 2px, #CBBFA4 2px 3px)';

/* 🔴 THE SECOND WRITTEN EXEMPTION TO THE AMBER LAW, AND IT IS THE ONLY ONE BESIDES THE PAGES.

   The law, his words on 2026-08-21: *"stop using amber background i said, i hate it"* — amber is an
   edge and an ink, never a fill, and the one legal gold fill is a 3px rule whose LENGTH is the data.
   A glow is unambiguously a fill, so it needed asking rather than assuming. Asked and granted
   2026-08-28, against the reference he sent twice (youtu.be/vhG5usAFL_g): an open book on a dark
   ground with warm light climbing out of the gutter, sparks drifting up off the paper, and finally a
   camera push into a white-out.

   **The exemption is bounded to THIS glyph's hover.** Two thirds of that video is already built —
   the white-out and the push are the book opening, which flies from this chip. Only the light and
   the sparks are new, they exist only while the pointer is on the chip, and they are gone in Lite
   Mode. If a gold fill ever appears anywhere else, it is not covered by this. */
/* Two layers, because one could not do both jobs. The first version was a single wide ellipse
   centred low, and at 21px it pooled along the bottom and touched the chip's own border — which
   reads as a smudge under the icon, not as light. So: PAGES is the paper itself catching the light,
   clipped to the page block so it can never spill onto the chip; HALO is the small amount of spill
   around it, kept to 3px so it stays inside the button. */
const PAGES = 'radial-gradient(ellipse 86% 76% at 46% 46%, rgba(255,232,178,.88) 0%, ' +
              'rgba(255,206,122,.66) 44%, rgba(255,186,80,.20) 74%, rgba(255,186,80,0) 100%)';
const HALO  = 'radial-gradient(ellipse 78% 62% at 58% 42%, rgba(255,206,120,.42) 0%, ' +
              'rgba(255,184,74,.13) 46%, rgba(255,178,60,0) 74%)';

/* Four sparks, hand-placed rather than random: at 21px wide a random scatter clumps often enough
   that some hovers would show one spark and some four. `x` is where it starts across the page
   block, `drift` how far it wanders sideways on the way up. Position lives in `left`/`bottom` and
   NEVER in transform — the keyframe animates transform, and this session proved an animation's
   final keyframe erases whatever transform an element was carrying. */
const SPARKS = [
  { x: 7,  drift: '3px',  dur: '1500ms', delay: '0ms' },
  { x: 12, drift: '-2px', dur: '1720ms', delay: '380ms' },
  { x: 16, drift: '4px',  dur: '1380ms', delay: '760ms' },
  { x: 10, drift: '-3px', dur: '1840ms', delay: '1120ms' },
];

/* ── The closed book on the shelf ──────────────────────────────────────────────────────────────
   🔴 PORTRAIT, AND THAT IS THE POINT. It used to be 34x26 — landscape, wider than tall, which no
   closed book has ever been. Aldi: *"i want the book size to match the real book, this sizing is
   very different to start with sc1"*. A closed book here is half the spread: 520 x 760, so 0,68
   wide-to-tall. This is 21 x 30 — the same ratio. The big book and the small one are now the same
   object at two sizes, which is what makes the flight between them read as one movement.

   The pale sliver that used to sit on the right was reported as *"the scroll white indicator looks
   really bad"* — a flat cream bar reads as a scrollbar, not as paper. Page edges are fine
   alternating lines now, the same texture the big book uses.

   HOVER: the cover lifts on its spine, the whole book rises a little, and a specular band sweeps
   across the leather. Transform and opacity only, so Lite Mode simply shows it at rest. */
function BookGlyph() {
  return (
    <span className="relative block h-[30px] w-[21px] [perspective:420px]"
          style={{ transformStyle: 'preserve-3d' }}>
      {/* the page block, edge-on */}
      <span className="absolute inset-y-[2px] left-[5px] right-0 rounded-r-[2px]"
            style={{ background: EDGES_H }} />
      {/* the cover, hinged on the spine */}
      <span
        className="absolute inset-0 origin-left rounded-r-[3px] overflow-hidden border border-accent-edge
                   transition-transform duration-[420ms] ease-out
                   group-hover:[transform:rotateY(-38deg)] group-focus-visible:[transform:rotateY(-38deg)]"
        style={{ background: LEATHER }}>
        <span className="absolute left-[5px] right-[3px] top-[7px] h-[2px] rounded-full bg-orange" />
        <span className="absolute left-[5px] right-[7px] top-[11px] h-[1px] rounded-full" style={{ background: BOOK_DIM }} />
        {/* the light. It lives off the left edge and crosses the cover on hover. */}
        <span className="absolute inset-y-[-40%] w-[10px] -left-[14px] rotate-[18deg]
                         transition-transform duration-[620ms] ease-out
                         group-hover:translate-x-[34px] group-focus-visible:translate-x-[34px]"
              style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,240,210,.55) 50%, rgba(255,255,255,0) 100%)' }} />
      </span>
      {/* the spine */}
      <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-[2px] bg-orange" />

      {/* THE LIGHT OUT OF THE GUTTER, and the sparks it throws. See GLOW above for the exemption
          this is built under. Drawn in FRONT so it reads at 21px — behind the cover it would only
          be visible through the 38 degrees the cover happens to open, which at this size is nothing.
          Kept inside the glyph's own box on purpose: the top bar is glass and clips, so a spark that
          escaped upward would be sliced off mid-flight. Twenty pixels of rise is plenty here. */}
      <span aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0
                       transition-opacity duration-[420ms] ease-out
                       group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="absolute -inset-[3px]" style={{ background: HALO }} />
        {/* clipped to the page block exactly, so the light is the PAPER and never the chip */}
        <span className="absolute inset-y-[2px] left-[5px] right-0 rounded-r-[2px]"
              style={{ background: PAGES }} />
      </span>

      {/* 🔴 THE SPARKS ARE SIBLINGS OF THE COVER, NOT CHILDREN OF THE GLOW, AND THEY CARRY THEIR OWN
          DEPTH — both of those are bug fixes rather than structure for its own sake.

          Inside the glow wrapper they were painted behind the cover: this glyph is `preserve-3d`, so
          children sort by DEPTH and not by document order, and a cover rotated -38 degrees about its
          left edge swings its right half toward the viewer. Three of the four sparks vanished under
          it and only the one clear of the cover's projected edge ever showed. An opacity wrapper
          could not fix that either, because a group with opacity flattens the 3D context it sits in.

          So the depth lives in `bookSpark`'s own keyframes — `translateZ(14px)` in both transform
          stops. Put it on the element instead and the animation's transform would erase it on the
          first frame, which is precisely the fault fixed in the overlay this morning. Geometry that
          has to survive an animation belongs INSIDE it. */}
      {SPARKS.map((s, i) => (
        <span key={i} aria-hidden="true"
              /* A DEEP AMBER CORE IN A PALE HALO, and that order matters. The first version was the
                 reverse — a cream core on cream pages that the lit paper swallowed whole, so four
                 sparks rendered and animated correctly and not one of them was visible. Amber reads
                 against the lit page, the halo reads against the dark chip above it, and between
                 them a spark stays legible for its whole climb. */
              className="pointer-events-none absolute h-[2px] w-[2px] rounded-full bg-[#F0900E] opacity-0
                         shadow-[0_0_4px_1.5px_rgba(255,238,196,0.95)] motion-reduce:hidden
                         group-hover:animate-book-spark group-focus-visible:animate-book-spark"
              style={{ left: s.x, bottom: 8, '--spark-drift': s.drift,
                       animationDuration: s.dur, animationDelay: s.delay }} />
      ))}
    </span>
  );
}

/* ── The top-bar entry ────────────────────────────────────────────────────────────────────────
   Never opens itself. His rule, 2026-08-27: *"nope dont push newcomer towards the scene let them
   figure out by pressing the tutorial button"*. Nothing here remembers who has watched what. */
export default function PonderBookButton({ activeTab }) {
  const [libOpen, setLibOpen] = useState(false);
  const [sceneId, setSceneId] = useState(null);
  /* 🔴 THE BOOK COMES BACK TO SHUT ITSELF. Aldi, 2026-08-31: *"i want the book shuts and fly to
     also happen when user close the ponder panel"*. Closing a scene used to leave nothing on
     screen — the Library had already been unmounted the moment the scene was picked, so the
     shut-and-fly it owns never ran on that path. It is re-mounted now, in close-only mode, the
     instant the panel finishes its own exit. Every scene reachable from here was opened from the
     book (`setSceneId` is only ever called by `onPick`), so no flag is needed to tell where the
     reader came from. `onBack` is untouched: that one is going back INTO the book, not out of it. */
  const [bookShutting, setBookShutting] = useState(false);
  const chipRef = useRef(null);

  const openLib = useCallback(() => { bookOpen(); setLibOpen(true); }, []);

  return (
    <>
      <button
        ref={chipRef}
        type="button"
        onClick={openLib}
        aria-label="Tutorial book"
        title="Tutorial — panduan setiap bagian aplikasi"
        className="kpm-chip group shrink-0 inline-flex items-center gap-2 h-9 px-2.5 rounded-lg
                   border border-line-2 bg-raised text-ink-muted
                   hover:border-accent-edge hover:text-accent-ink hover:-translate-y-[1px]
                   active:scale-[0.97] transition-[transform,color,border-color] duration-200 ease-out"
      >
        {/* 🔴 THE BOOK LEAVES ITS SLOT. His ask: *"rather than it close and shrink and gone, i
            rather make the book fly from its original position to the big screen, then when it
            close it fly back to the original position, the small version of book on its space"*.
            Two objects that cross-fade are two objects; one object that moves is a book being
            picked up. So while the big one is out, the small one is not here — and it reappears at
            the exact moment the flight lands. */}
        <span style={{ visibility: libOpen || bookShutting ? 'hidden' : 'visible' }}>
          <BookGlyph />
        </span>
        <span className="hidden xl:inline font-mono text-[10px] uppercase tracking-widest">Tutorial</span>
      </button>

      {(libOpen || bookShutting) && (
        <Library
          anchorRef={chipRef}
          initialSection={activeTab}
          closeOnMount={bookShutting}
          onClose={() => { setLibOpen(false); setBookShutting(false); }}
          /* A spread that exists only to shut itself must not accept a pick: the scrim is already
             fading and the book is on its way to the chip, so a click landing on a page would open
             a scene out of something the reader can no longer see. */
          onPick={bookShutting ? () => {}
                               : (id) => { bookPick(); setLibOpen(false); setSceneId(id); }}
        />
      )}

      <PonderOverlay
        sceneId={sceneId}
        open={!!sceneId}
        onClose={() => { setSceneId(null); setBookShutting(true); }}
        onBack={() => { setSceneId(null); bookOpen(); setLibOpen(true); }}
      />
    </>
  );
}

/* ── The spread ───────────────────────────────────────────────────────────────────────────────── */

/* 🔴 THE BOOK IS A STACK OF LEAVES, AND THE LEAVES ARE THE CHAPTERS.

   Aldi, 2026-09-01, after three failed passes at the old close: *"the only way to do this is the
   follow this one https://framer.com/m/InteractiveBook-xGXc.js@uLOYl8huI2w4XDdONaRK and i want u to
   change the pc version with this one also, i want this 3D style and also i want the page to be drag
   able to change the page left and right with smooth motion"*.

   The component was fetched and read, not copied — it is someone else's asset on Framer's
   marketplace and this app is an offline PWA that cannot load a third-party host at runtime. What
   was taken is the TECHNIQUE, and it is four things:

     1. every sheet is ONE element with TWO faces, `backface-visibility: hidden`, the back one
        pre-rotated `rotateY(180deg) translateZ(0.01px)` — the 0.01px is what stops the two faces
        z-fighting on a sheet lying face-on;
     2. `transform-origin: left center` on the sheet and `preserve-3d` on it AND its parent, so the
        hinge is the spine and the rotation has real depth rather than a squashed scaleX;
     3. the sheets are offset in Z by a fraction of a pixel each, so the stack has THICKNESS, and
        the sheet currently moving is lifted in `z-index` so it cannot clip through the ones below;
     4. one rotation, `rotateY: 0 → -180deg`, is the whole page turn.

   🔴 AND THE LEAVES HAD TO BECOME THE CHAPTERS, WHICH THE DATA FORCED. Counted before a line of this
   was written: of the seventeen sections, SEVENTEEN hold four entries or fewer, so every one of them
   is a single page on a desk and sixteen of them are a single page on a phone. Leaving pages scoped
   to a section would have shipped a drag gesture with nothing to drag to — dead on every screen but
   one. So the book is one continuous run of pages: cover, then each chapter's opening and its cards,
   then the endpaper. The ribbons become what they look like — a bookmark that jumps to a chapter —
   and the drag walks the whole book.

   The spread is two faces of two different sheets, exactly as on a desk: the LEFT page is the back
   of the sheet you already turned, the RIGHT page is the front of the one you have not. There is no
   separate "left half" element any more, because there is nothing left for one to do. */
/* The arithmetic itself lives in pageModel.js so the self-check can RUN it. */

/* How far a sheet has to travel before letting go turns it rather than putting it back. A third of
   the way is forgiving in the direction that matters: a brush snaps back, a pull goes over. */
const TURN_AT = 0.34;
/* And how fast it has to be MOVING when it is let go, in pixels per millisecond. Distance alone
   cannot tell a hard flick from a hesitant pull: a decisive swipe that covers only a fifth of the
   page is unmistakably a page turn, and a distance-only rule sent it back. 0.45 px/ms is roughly
   a page's width in half a second — brisk, not violent. */
const FLICK_V = 0.45;

/* OPENS ON THE SECTION YOU ARE STANDING IN. His ask, 2026-08-27: *"i want the book when press is
   auto redirect to the features that we use right now for example im on the restock vault then it
   should redirect directly to the restock vault section of the book"*. This is the whole reason
   every section id in sections.js is an `activeTab` value and not a category someone invented. */
/* 🔴 `closeOnMount` IS HOW THE BOOK SHUTS AFTER A SCENE, and it works because `shut` below names
   BOTH ends of every animation it starts. The cover goes OPEN → SHUT, the book FLAT → the chip, the
   slab SLAB_OPEN → SLAB_SHUT, all under `fill: 'both'` — so none of them need the opening sequence
   to have run first to know where they begin. Mounting straight into the close is therefore not a
   trick; it is the same close, entered from a book that was already open somewhere else.

   Aldi, 2026-08-31: *"i want the book shuts and fly to also happen when user close the ponder
   panel"*. Before this, picking a scene unmounted the Library on the spot, so the shut-and-fly it
   already owned only ever played if you closed the BOOK and never if you read something in it. */
function Library({ anchorRef, initialSection, onClose, onPick, closeOnMount = false }) {
  /* The leather starts six pixels into the ribbon column, so it has to follow the column's width
     when the phone narrows it — otherwise the cover sits 34px out and the ribbons stop reading as
     tabs cut into its edge. One number, two widths. */
  const narrow = typeof matchMedia === 'function' && !matchMedia('(min-width: 1024px)').matches;
  const coverLeft = narrow ? 82 : COVER_LEFT;
  /* 🔴 A PHONE GETS TWO CARDS TO A PAGE, NOT FOUR. Aldi, 2026-09-01, from his iPhone: *"even the
     book cutted in half"*. Measured at 375x812: the card grid is one column below sm, so four cards
     ran to 680px and the page's content ended 30px BELOW the bottom of the screen. Scrolling inside
     the book is not the fix and never was — *"i dont want to see any of the scroll inside this
     book"*. A book that has run out of room turns the page, so the page count is what bends. */
  const perPage = (typeof matchMedia === 'function' && !matchMedia('(min-width: 640px)').matches) ? 2 : PER_PAGE;
  const spread = !narrow;

  const pages = useMemo(() => buildPages(SECTIONS, perPage, spread), [perPage, spread]);
  const leaves = useMemo(() => asLeaves(pages, spread), [pages, spread]);
  /* The last sheet you may turn. Turning the one after it would put the endpaper on the left and
     nothing at all on the right, which is a reader standing past the back cover. */
  const maxTurn = maxTurnOf(pages, spread);

  /* Where a chapter lives, counted in sheets. On a desk the chapter opening is the LEFT page of its
     spread, which is the back of sheet n-1, so the sheet number is half its page index rounded up;
     on a phone the cards page IS the spread, so the page index is the sheet number. */
  const chapterTurn = useCallback((id) => turnFor(pages, spread, maxTurn, id), [pages, spread, maxTurn]);

  const startId = SECTIONS.some(s => s.id === initialSection) ? initialSection : SECTIONS[0].id;
  const [turned, setTurned] = useState(() => chapterTurn(startId));
  /* Clamped, because the sheet count is state and `pages` changes under it when the phone turns
     sideways — a stale sheet 12 in a shorter book renders an empty spread rather than the last page. */
  const safeTurn = Math.min(Math.max(turned, 1), maxTurn);

  const bookRef = useRef(null);
  const leafRef = useRef(null);   // the COVER, hinged at the spine — it is not a page
  const stackRef = useRef(null);  // the sheets, hinged on the same spine
  /* 🔴 A PLAIN OBJECT, AND `new Map()` IS A TRAP IN THIS FILE. `Map` here is the lucide ICON
     imported at the top for the Map War Room's ribbon, not the global constructor — so `new Map()`
     threw *TypeError: p1 is not a constructor* and the whole book rendered as a black screen, with
     the build green and every check passing. A shadowed global fails at run time only. */
  const leafEls = useRef({});
  /* The two shading planes. A page turning away from the light DARKENS, and its far side brightens
     as it comes round — that one cue is most of the difference between a sheet of paper and a
     rotating rectangle, and its absence is what read as cheap. Refs rather than CSS, because they
     have to run on the cover's clock. */
  const shadeFrontRef = useRef(null);
  const shadeBackRef = useRef(null);
  /* The cover board. See the note where it is rendered — it is why a shut book looks shut. */
  const slabRef = useRef(null);
  const scrimRef = useRef(null);
  const closingRef = useRef(false);

  /* The right-hand page is where the reader is standing, so the ribbon lights from it rather than
     from a second piece of state that could disagree with the page on screen. */
  const facing = facingPage(pages, spread, safeTurn);
  const section = facing.s || SECTIONS[0];
  const secId = section.id;

  /* THE CLOSE, AT THE WIDTH IT IS ACTUALLY HAPPENING AT.

     On a desk the cover is the right half and it travels 0 to -180 degrees about the centre fold, so
     it lands face down on the left half. That is a book closing, and it is correct there.

     On a phone the cover is the WHOLE page and its hinge is already the left edge. Sending it to
     -180 degrees swings it out past the spine onto nothing, which is the close he called broken.
     -90 degrees is the same hinge stopped where the page is edge-on: it turns away and disappears
     into the spine, which is what a tall book does when you shut it while holding it. */
  /* 🔴 A TURNED SHEET GOES EDGE-ON ON A PHONE, NOT FACE-DOWN. Measured at 375x812 the moment the
     stack first rendered there: a phone spine is the stage LEFT edge, so a sheet at -180 lies one
     whole page OUTSIDE the book, and it came out as a cream slab standing over the ribbon column
     and the scrim. Exactly the fault he named on the close - *"the background of the book is
     making it look broke"* - arriving a second time through a different element.

     -90 is the same hinge stopped where the page is edge-on: it turns away into the spine and is
     gone, which is what a tall book does, and it is the geometry he already accepted for the cover.
     One constant, both widths; every other line of the turn is shared. */
  const FLIP = spread ? -180 : -90;

  const leafShutTo = narrow ? 'rotateY(-90deg)' : SHUT;
  const slabShutTo = narrow ? SLAB_SHUT_SPINE : SLAB_SHUT;

  /* 🔴 IT IS THE CLOSED BOOK THAT FLIES, NOT THE CONTAINER. When the cover is shut the visible
     book is only the left half plus the tab column — `SLAB_SHUT` is the same measurement — so
     scaling the whole 1040px container onto the chip aimed the wrong rectangle and the book drifted
     sideways as it shrank. The maths maps the CLOSED book's centre onto the chip's centre, and it
     has to subtract where that centre lands after scaling about the container's middle. */
  const flightFrom = useCallback(() => {
    const el = bookRef.current, chip = anchorRef?.current;
    if (!el || !chip) return null;
    const b = el.getBoundingClientRect(), a = chip.getBoundingClientRect();
    if (!b.width || !a.width) return null;
    const closedW = narrow ? coverLeft + 30 : b.width / 2 + 62;   // must match the shut clip above
    const s = Math.max(a.height / b.height, 0.03);    // height, because a closed book is portrait
    const dx = (closedW / 2) - (b.width / 2);         // closed centre, relative to container centre
    const tx = (a.left + a.width / 2) - (b.left + b.width / 2) - dx * s;
    const ty = (a.top + a.height / 2) - (b.top + b.height / 2);
    return `translate(${Math.round(tx)}px, ${Math.round(ty)}px) scale(${s.toFixed(3)})`;
  }, [anchorRef, narrow, coverLeft]);

  const still = liteOn() || reduced();

  /* 🔴 IT HINGES AT THE SPINE. THE WHOLE BOOK DOES NOT TURN.

     Aldi, 2026-08-27: *"why did u flip the book like that ... it should flipped to the middle like
     how the book works not to the side like that, use book logic"*. A book closes because its right
     half swings LEFT about the spine and comes to rest on the left half. Past 90° the cover's face
     is what you see, which is the closed book. The left half never moves.

     TWO ELEMENTS, TWO ANIMATIONS, ONE CLOCK. The cover swings; the whole book flies. They are
     started in the same tick with the same duration and complementary offsets, so the book is shut
     before it leaves and open only after it lands. They are not chained — a chain has to resume
     exactly where the last one stopped, and drift there shows as a jump. */
  useLayoutEffect(() => {
    if (still || closeOnMount) return;      // mounted to close: there is no arrival to play
    const el = bookRef.current, leaf = leafRef.current;
    const from = flightFrom();
    if (!el || !from || typeof el.animate !== 'function') return;
    /* The closed book flies in and STOPS. No fade at either end: a book that dissolves is not a
       book being carried, and the chip's own copy is hidden for exactly this span so there is
       never two of them. */
    el.animate(
      [{ transform: from }, { transform: FLAT }],
      { duration: T.flyIn, easing: EASE, fill: 'both' },
    );
    /* Only then does the cover swing open — and it travels a little past flat before settling,
       which is what a cover dropped open actually does. */
    leaf?.animate(
      [{ transform: leafShutTo, offset: 0 },
       { transform: 'rotateY(3deg)', offset: 0.88 },
       { transform: OPEN, offset: 1 }],
      { duration: T.leafOpen, delay: T.leafOpenDelay, easing: HINGE, fill: 'both' },
    );
    shade(shadeFrontRef.current, [{ opacity: 0.62 }, { opacity: 0.62, offset: 0.35 }, { opacity: 0 }],
          T.leafOpen, T.leafOpenDelay);
    shade(shadeBackRef.current, [{ opacity: 0 }, { opacity: 0.55, offset: 0.55 }, { opacity: 0.75 }],
          T.leafOpen, T.leafOpenDelay);
    /* 🔴 ONE THING MOVES ON A PHONE, AND IT IS THE PAGE. Aldi, 2026-09-01, watching the close:
       *"there is no cover in the book bruv, there is animation from the right side going left but
       there is left side going right and they found in the middle, the book doesnt look natural at
       all"*. A phone draws no cover to animate — the leather is the board BEHIND the single page
       there, not a flap over it — so animating its clip was animating something that is not the
       thing he is looking at. The board stays put; the page alone turns edge-on into the spine. */
    if (!narrow) {
      slabRef.current?.animate([{ clipPath: slabShutTo }, { clipPath: SLAB_OPEN }],
        { duration: T.leafOpen, delay: T.leafOpenDelay, easing: HINGE, fill: 'both' });
    }
    scrimRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out', fill: 'both' });
  }, [still, flightFrom, leafShutTo, slabShutTo, narrow]);

  const shut = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    /* On the closeOnMount path the panel that just left already played this, 240ms ago, as its own
       exit began. Playing it again here is the same book closing twice. */
    if (!closeOnMount) bookClose();
    if (liteOn() || reduced()) { onClose(); return; }
    const el = bookRef.current;
    const from = flightFrom();
    if (!el || !from || typeof el.animate !== 'function') { onClose(); return; }
    scrimRef.current?.animate([{ opacity: 1 }, { opacity: 0 }],
                              { duration: T.flyOut, delay: T.flyOutDelay, easing: 'ease-in', fill: 'both' });
    /* The cover swings shut where the book stands, and NOTHING else moves while it does. */
    leafRef.current?.animate(
      [{ transform: OPEN }, { transform: leafShutTo }],
      { duration: T.leafShut, easing: HINGE, fill: 'both' },
    );
    /* 🔴 AND THE SHEETS GO UNDER IT. The old right-hand page was drawn on the cover's own front
       face, so it left when the cover left. The sheets are their own stack now and they stay put —
       which would leave a lit spread standing beside a closed book, the same half-open fault the
       clipped board was added to fix. They go dark and out on the cover's clock instead. Their
       resting opacity is 1 in CSS and never in a keyframe: Lite Mode returns above without
       animating anything, and an animation that OWNS visibility is how the wax seal once vanished
       entirely under `animation: none`. */
    stackRef.current?.animate([{ opacity: 1 }, { opacity: 0, offset: 0.55 }, { opacity: 0 }],
      { duration: T.leafShut, easing: 'ease-in', fill: 'both' });
    shade(shadeFrontRef.current, [{ opacity: 0 }, { opacity: 0.62 }], T.leafShut, 0);
    shade(shadeBackRef.current, [{ opacity: 0.75 }, { opacity: 0 }], T.leafShut, 0);
    if (!narrow) {
      slabRef.current?.animate([{ clipPath: SLAB_OPEN }, { clipPath: slabShutTo }],
        { duration: T.leafShut, easing: HINGE, fill: 'both' });
    }
    /* ...and only once it is shut does it go back to the shelf. */
    const anim = el.animate(
      [{ transform: FLAT }, { transform: from }],
      { duration: T.flyOut, delay: T.flyOutDelay, easing: AWAY, fill: 'both' },
    );
    anim.onfinish = onClose;
    anim.oncancel = onClose;
  }, [onClose, flightFrom, closeOnMount, leafShutTo, slabShutTo, narrow]);

  /* Mounted purely to close. A layout effect rather than a plain one, so the shut starts in the
     same frame the spread is painted — a plain effect gives one frame of a book sitting open and
     doing nothing, which reads as a flicker rather than as a book being shut. */
  useLayoutEffect(() => { if (closeOnMount) shut(); }, [closeOnMount, shut]);

  /* ── THE TURN ─────────────────────────────────────────────────────────────────────────────────
     🔴 THE DRAG WRITES THE TRANSFORM STRAIGHT ONTO THE ELEMENT, NEVER THROUGH STATE. His ask:
     *"i want the page to be drag able to change the page left and right with smooth motion"*, and
     "smooth" is the load-bearing word. A pointermove that calls setState re-renders four sheets and
     every card on them on each frame of the gesture, which is exactly how a drag stutters on the
     cheap Android this app is built for. The same rule the scene player's progress bar follows.

     🔴 AND THE POSITION COMMITS WHEN THE GESTURE DECIDES, NOT WHEN THE ANIMATION ENDS.

     Aldi, 2026-09-02: *"when i slide it too quickly, animation broke and the book snapped itself
     into next page instead"*. Three faults, all one cause — the first version only called
     `setTurned` from `anim.onfinish`, so for the ~520ms a settle was playing the book still
     believed it was on the old sheet:

       1. the second swipe grabbed the SAME sheet that was already flying away;
       2. a WAAPI animation under `fill: 'both'` outranks an inline style, so the sheet ignored the
          finger entirely until its animation ended — the page simply did not follow;
       3. and then the old animation finished, `setTurned` fired with ITS target, and the book
          jumped. That jump is the snap he saw.

     Committing at the moment the gesture decides fixes all three: React re-renders the sheet at its
     resting flipped transform while the animation is still holding the same value, so nothing moves
     on screen, and the very next gesture already reads the new position. `posRef` carries it
     synchronously because two flicks can land inside one React batch.

     🔴 AND A FLICK COUNTS EVEN WHEN IT IS SHORT. Distance alone cannot tell a fast, deliberate
     swipe from a hesitant one — a hard flick that travels 20% of the page is unmistakably a page
     turn, and under a distance-only rule it snapped back, which is the other half of "animation
     broke". Speed at the moment of release decides it too. */
  const dragRef = useRef(null);
  const movedRef = useRef(false);
  const animsRef = useRef({});      // k -> the animation currently owning that sheet
  const posRef = useRef(safeTurn);  // the committed position, readable inside one React batch
  const rateRef = useRef(TURN_FULL_MS);
  const stepping = useRef(false);
  const [goal, setGoal] = useState(null);

  useLayoutEffect(() => { posRef.current = safeTurn; }, [safeTurn]);

  const at = (k) => leafEls.current[k] || null;
  const zOf = (k, flipped) => (flipped ? k : leaves.length - k) * 0.4;
  const past = (deg) => deg < FLIP / 2;   // half way round is where the sheet changes sides
  /* 🔴 AND ON A PHONE A TURNED SHEET IS GONE, NOT EDGE-ON. Measured at 375x812 as soon as the stack
     was looked at there: a sheet held at -90 still projects a 24px cream wedge, because perspective
     gives an edge-on plane a receding far edge rather than a line — and that wedge stood over the
     ribbon column for the whole time the book was open. It has turned INTO the spine; it is not
     there any more. Owned by the sheet's own style so Lite Mode, which never animates, still
     resolves it — the wax-seal rule: the state carries the visibility, the animation only moves. */
  const dim = (deg) => (!spread && deg <= FLIP ? 0 : 1);
  const put = (el, deg, z) => {
    if (!el) return;
    el.style.transform = `translateZ(${z}px) rotateY(${deg}deg)`;
    el.style.opacity = '1';        // a sheet under the finger is always on screen
  };

  const commit = useCallback((n) => {
    const t = Math.min(Math.max(n, 1), maxTurn);
    posRef.current = t;
    setTurned(t);
  }, [maxTurn]);

  /* One sheet, one arc. `done` is called the moment the arc lands, and the element is left standing
     on the values it landed on rather than having them cleared — React writes the identical pair on
     its next render, so nothing moves, and an arc that commits nothing still ends somewhere defined. */
  const play = useCallback((k, from, to, ms, done) => {
    const el = at(k);
    const dur = Math.max(90, ms);
    const rest = () => {
      if (!el) return;
      el.style.transform = `translateZ(${zOf(k, past(to))}px) rotateY(${to}deg)`;
      el.style.opacity = String(dim(to));
    };
    animsRef.current[k]?.cancel();
    delete animsRef.current[k];
    if (!el || still || typeof el.animate !== 'function') { rest(); done(); return; }
    const anim = el.animate(
      [{ transform: `translateZ(${zOf(k, past(from))}px) rotateY(${from}deg)` },
       { transform: `translateZ(${zOf(k, past(to))}px) rotateY(${to}deg)` }],
      { duration: dur, easing: HINGE, fill: 'both' },
    );
    /* The phone's sheet leaves at the very end of its own arc, never across it — a page that fades
       while it turns is a page dissolving, which is the note the fly-in already carries. */
    const fade = dim(from) === dim(to) ? null : el.animate(
      [{ opacity: dim(from) }, { opacity: dim(to) }],
      { duration: dur * 0.22, delay: dur * 0.78, easing: 'linear', fill: 'both' },
    );
    animsRef.current[k] = anim;
    anim.onfinish = () => {
      done();
      requestAnimationFrame(() => {
        /* Only clean up if this animation still owns the sheet. A faster gesture may have taken it
           over already, and cancelling THAT one would drop the page mid-turn. */
        if (animsRef.current[k] !== anim) return;
        anim.cancel(); fade?.cancel(); delete animsRef.current[k]; rest();
      });
    };
  }, [leaves.length, still, FLIP, spread]);

  const stopRun = useCallback(() => { stepping.current = false; setGoal(null); }, []);

  /* 🔴 A RIBBON TURNS THE PAGES, IT DOES NOT TELEPORT. His ask, 2026-09-02: *"if i change the ribbon
     section by 4 ribbons far then the book will turn 4 times to reach that page ... this way it
     will make it realistic"*. `riffle()` in pageModel.js decides how many turns and how fast, and
     the self-check runs it on real distances. Lite Mode has no motion to spend, so it arrives. */
  const seek = useCallback((n) => {
    const t = Math.min(Math.max(n, 1), maxTurn);
    if (t === posRef.current) return;
    if (still) { bookPage(); commit(t); return; }
    const plan = riffle(posRef.current, t);
    rateRef.current = plan.ms;
    if (plan.jumpTo !== posRef.current) commit(plan.jumpTo);
    setGoal(t);
  }, [maxTurn, still, commit]);

  /* One step per render: play a sheet, commit, and let the re-render bring this effect back for the
     next one. Reading the goal through state rather than a loop is what keeps each turn on its own
     frame — a loop would start all four in the same tick and they would land as one. */
  useEffect(() => {
    if (goal === null) return;
    if (goal === safeTurn) { setGoal(null); return; }
    if (stepping.current) return;
    const dir = goal > safeTurn ? 1 : -1;
    stepping.current = true;
    bookPage();
    const k = dir > 0 ? safeTurn : safeTurn - 1;
    play(k, dir > 0 ? 0 : FLIP, dir > 0 ? FLIP : 0, rateRef.current,
         () => { stepping.current = false; commit(safeTurn + dir); });
  }, [goal, safeTurn, play, commit, FLIP]);

  /* The ‹ › and the arrow keys aim at where the run is HEADING, not at where the book is standing,
     so pressing next four times quickly asks for four sheets rather than re-asking for one. */
  const turn = useCallback((dir) => seek((goal ?? posRef.current) + dir), [seek, goal]);

  const onDown = (e) => {
    if (still || e.button > 0) return;
    stopRun();                       // a hand on the page outranks a bookmark run
    dragRef.current = { x: e.clientX, lx: e.clientX, lt: e.timeStamp, v: 0, k: null, dir: 0, p: 0 };
    movedRef.current = false;
  };
  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.dir) {
      if (Math.abs(dx) < 10) return;                 // a tap is not a drag
      const fwd = dx < 0;
      const pos = posRef.current;
      if (fwd ? pos + 1 > maxTurn : pos - 1 < 1) { dragRef.current = null; return; }
      d.dir = fwd ? 1 : -1;
      d.k = fwd ? pos : pos - 1;
      movedRef.current = true;
      /* Take the sheet off its own animation before touching it: a filling animation outranks an
         inline style, so a sheet still flying would ignore the finger for the rest of its arc. */
      animsRef.current[d.k]?.cancel();
      delete animsRef.current[d.k];
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    const dt = Math.max(1, e.timeStamp - d.lt);
    d.v = (e.clientX - d.lx) / dt;                   // px per ms, signed, latest sample only
    d.lx = e.clientX; d.lt = e.timeStamp;
    /* Forward: 0 → FLIP as the finger crosses one page. Backward: the sheet already turned comes
       back up the same arc. Clamped at both ends, because a long swipe that wound a sheet past
       FLIP would read as the paper tearing off its hinge. */
    const w = Math.max(1, stackRef.current ? stackRef.current.getBoundingClientRect().width : 1);
    const p = Math.min(1, Math.max(0, (d.dir > 0 ? -dx : dx) / w));
    d.p = p;
    const deg = d.dir > 0 ? FLIP * p : FLIP * (1 - p);
    put(at(d.k), deg, zOf(d.k, past(deg)));
  };
  const onUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || !d.dir) return;
    const flick = (d.dir > 0 ? -d.v : d.v) >= FLICK_V;
    const done = d.p >= TURN_AT || flick;
    const deg = d.dir > 0 ? FLIP * d.p : FLIP * (1 - d.p);
    const to = d.dir > 0 ? (done ? FLIP : 0) : (done ? 0 : FLIP);
    /* Only the arc that is LEFT gets played, so a page released at 90% finishes in a blink instead
       of restarting a full-length turn from where it already is. */
    const ms = Math.round(TURN_FULL_MS * (done ? 1 - d.p : d.p));
    if (done) commit(posRef.current + d.dir);
    play(d.k, deg, to, ms, () => {});
    /* Cleared a tick later, which is after the click this gesture would otherwise have fired. */
    setTimeout(() => { movedRef.current = false; }, 0);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') shut();
      if (e.key === 'ArrowRight') turn(1);
      if (e.key === 'ArrowLeft') turn(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [shut, turn]);

  /* A ribbon is a bookmark: it turns the pages between here and there. It does not jump. */
  const pickSection = (id) => { if (id === secId) return; seek(chapterTurn(id)); };

  if (typeof document === 'undefined') return null;

  const tab = (s) => s.id === secId
    ? { background: 'linear-gradient(90deg, #FF8C1A 0%, #D98A2E 55%, #B9772A 100%)',
        color: '#241D16', transform: 'translateX(8px)' }
    : { background: 'linear-gradient(90deg, #4A3A2A 0%, #3A2E22 60%, #2E251B 100%)', color: '#C4B69C' };

  /* ── THE FACES ────────────────────────────────────────────────────────────────────────────────
     One page of the book, whichever face of whichever sheet it lands on. Written once because a page
     is a page: the same chapter opening is a left page on a desk and is not rendered at all on a
     phone, and neither of those is a reason for a second copy of the markup. */
  const face = (pg) => {
    if (!pg) return null;
    if (pg.k === 'cover') return null;               // the leather is the cover element, not a page
    if (pg.k === 'end') {
      return (
        <div className="relative h-full flex flex-col items-center justify-center gap-3 p-9">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: BOOK_DIM }}>Tamat</span>
          <span className="h-[3px] w-10 rounded-full bg-orange" />
          <p className="text-[13px] text-center max-w-[28ch]" style={{ color: BOOK_DIM }}>
            Tarik halaman ke kanan untuk kembali, atau pilih pita di sebelah kiri.
          </p>
        </div>
      );
    }
    if (pg.k === 'chapter') {
      const s = pg.s;
      return (
        <div className="relative h-full flex flex-col justify-between p-9">
          <div>
            <span className="h-14 w-14 rounded-xl flex items-center justify-center border"
                  style={{ background: PAPER_2, borderColor: 'rgba(0,0,0,.16)' }}>
              <Icon name={s.icon} size={26} style={{ color: '#8A5A12' }} />
            </span>
            <h2 className="font-display text-4xl font-black uppercase tracking-[0.1em] leading-none mt-5"
                style={{ color: BOOK_INK }}>{s.label}</h2>
            <div className="h-[3px] w-14 bg-orange rounded-full mt-4" />
            <p className="text-[14px] leading-relaxed mt-5 max-w-[36ch]" style={{ color: BOOK_DIM }}>{s.blurb}</p>

            <ul className="mt-9 space-y-3">
              {s.entries.map((e, i) => (
                <li key={i} className="flex items-baseline gap-2 text-[13px]">
                  <span className="font-mono tabular-nums" style={{ color: BOOK_DIM }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="truncate" style={{ color: e.soon ? BOOK_DIM : BOOK_INK }}>{e.title}</span>
                  <span className="flex-1 border-b border-dotted translate-y-[-3px]" style={{ borderColor: 'rgba(0,0,0,.25)' }} />
                  <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: BOOK_DIM }}>{e.soon ? 'segera' : 'siap'}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: BOOK_DIM }}>
            Bab {SECTIONS.indexOf(s) + 1} / {SECTIONS.length}
          </p>
        </div>
      );
    }
    const s = pg.s;
    const shownEntries = s.entries.slice(pg.p * perPage, pg.p * perPage + perPage);
    return (
      <div className="relative h-full flex flex-col min-h-0 p-6 sm:p-9">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: BOOK_DIM }}>Panduan</p>
            <h3 className="font-display text-2xl font-black uppercase tracking-[0.1em] leading-none mt-1 lg:hidden"
                style={{ color: BOOK_INK }}>{s.label}</h3>
          </div>
          <button type="button" onClick={shut} aria-label="Close" title="Close"
            style={{ background: PAPER_2, color: BOOK_INK, borderColor: 'rgba(0,0,0,.2)' }}
            className="shrink-0 h-9 w-9 rounded-lg border active:scale-[0.97]
                       transition-transform duration-150 ease-out inline-flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 mt-5 -mx-1 px-1">
          <div className="grid sm:grid-cols-2 gap-4">
            {shownEntries.map((e, i) => {
              const ready = !e.soon && !!getScene(e.sceneId);
              return (
                <button key={i} type="button" disabled={!ready}
                  /* A drag that began on a card is a page turn, not a pick. `movedRef` clears a tick
                     after the pointer goes up, which is after the click this suppresses. */
                  onClick={() => { if (movedRef.current) return; if (ready) onPick(e.sceneId); }}
                  style={{ background: ready ? PAPER_2 : 'rgba(0,0,0,.04)',
                           borderColor: ready ? 'rgba(0,0,0,.22)' : 'rgba(0,0,0,.12)' }}
                  className={`text-left p-4 rounded-xl border transition-transform duration-200 ease-out
                              ${ready ? 'hover:-translate-y-[3px] active:scale-[0.985] cursor-pointer' : 'cursor-not-allowed'}`}>
                  <span className="h-10 w-10 rounded-lg border flex items-center justify-center"
                        style={{ background: PAPER, borderColor: 'rgba(0,0,0,.18)' }}>
                    {ready ? <Icon name={e.icon} size={17} style={{ color: '#8A5A12' }} />
                           : <Lock size={15} style={{ color: BOOK_DIM }} />}
                  </span>
                  <span className="block font-display text-[16px] font-black uppercase tracking-wider mt-3"
                        style={{ color: ready ? BOOK_INK : BOOK_DIM }}>{e.title}</span>
                  <span className="block text-[12.5px] leading-snug mt-1.5" style={{ color: BOOK_DIM }}>{e.desc}</span>
                  {!ready && (
                    <span className="inline-block mt-3 font-mono text-[9px] uppercase tracking-widest border rounded px-1.5 py-0.5"
                          style={{ color: BOOK_DIM, borderColor: 'rgba(0,0,0,.2)' }}>belum ditulis</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* The ‹ › run the same turn the drag does — for a mouse, and for anyone who cannot drag. */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t" style={{ borderColor: 'rgba(0,0,0,.16)' }}>
          <button type="button" disabled={safeTurn <= 1} onClick={() => turn(-1)}
            aria-label="Previous page"
            style={{ background: PAPER_2, color: BOOK_INK, borderColor: 'rgba(0,0,0,.2)' }}
            className="h-9 w-9 rounded-lg border disabled:opacity-35 disabled:cursor-not-allowed
                       active:scale-[0.97] transition-transform duration-150 ease-out inline-flex items-center justify-center">
            <ChevronLeft size={16} />
          </button>
          <span className="font-mono text-[10px] uppercase tracking-widest tabular-nums" style={{ color: BOOK_DIM }}>
            {safeTurn} / {maxTurn}
          </span>
          <button type="button" disabled={safeTurn >= maxTurn} onClick={() => turn(1)}
            aria-label="Next page"
            style={{ background: PAPER_2, color: BOOK_INK, borderColor: 'rgba(0,0,0,.2)' }}
            className="h-9 w-9 rounded-lg border disabled:opacity-35 disabled:cursor-not-allowed
                       active:scale-[0.97] transition-transform duration-150 ease-out inline-flex items-center justify-center">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  /* Only the sheets around the reader are built. Eighteen live card grids would be eighteen times
     the DOM for a book that shows two pages, and this app is built for cheap Android phones. The
     window is four: the one under the left page, the left page, the right page, and the one beneath
     it that a forward drag reveals. The stack's THICKNESS is the paper block below, not real sheets. */
  const near = [];
  for (let k = safeTurn - 2; k <= safeTurn + 1; k++) if (k >= 0 && k < leaves.length) near.push(k);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Tutorial book"
         onMouseDown={shut}
         className="fixed inset-0 z-[9000] flex items-center justify-center p-3 sm:p-6">

      <div ref={scrimRef} className="absolute inset-0 bg-[var(--duke-scrim-hi)] backdrop-blur-sm" />

      {/* THE BOOK ITSELF. Big on purpose — his words were *"so black and small"*, and a spread that
          does not take the screen is a dialog wearing a book costume. */}
      <div ref={bookRef} onMouseDown={(e) => e.stopPropagation()}
           style={{ transformOrigin: 'center center' }}
           className="relative w-[min(1040px,95vw)] h-[min(760px,90vh)] flex rounded-[14px] p-[10px]">

        {/* 🔴 THE BOARD IS ITS OWN ELEMENT SO IT CAN BE CLIPPED, and that is the difference between
            a book that looks shut and one that looks half-open. When the cover swings closed it
            lands on the left half and VACATES the right half — but the board used to be the
            container's own background, so the vacated half stayed on screen as a dark slab beside
            the closed book. Clipping a SIBLING is safe; clipping the container would have flattened
            `preserve-3d` and undone every hinge in here. */}
        <span ref={slabRef} aria-hidden="true"
              style={{ background: LEATHER, clipPath: 'inset(0 0 0 0 round 14px)', left: coverLeft }}
              className="absolute inset-y-0 right-0 rounded-[14px] border border-accent-edge pointer-events-none
                         shadow-[0_2px_2px_rgba(0,0,0,0.35),0_40px_90px_-30px_rgba(0,0,0,0.95)]" />

        {/* 🔴 RIBBONS, AND NO SCROLLING. His ask: *"the section also make it like book ribbons u
            know to make it more natural and make these section into one line with no scrollable so
            resize the spacing"*. Seventeen at 26px plus 2px of gap is 474px, which fits the shortest
            book this can be, so `overflow` is gone rather than hidden. */}
        {/* 🔴 THE PHONE KEEPS THE RIBBONS. His report, 2026-09-01: *"i cant see the left book with
            all the section ribbons"*. They were `hidden lg:flex`, and on a phone that is not a
            cosmetic loss — the drag walks the book ONE page at a time, so without the ribbons
            reaching chapter fourteen would be thirteen swipes. */}
        <div className="relative z-10 flex flex-col justify-center gap-[2px] w-[84px] lg:w-[118px] shrink-0 py-4 pr-[6px]">
          {SECTIONS.map(s => (
            <button key={s.id} type="button" onClick={() => pickSection(s.id)}
              style={{ ...tab(s), clipPath: RIBBON }}
              className="flex items-center gap-1.5 h-[26px] shrink-0 pl-3.5 pr-2
                         font-mono text-[9px] uppercase tracking-[0.14em] text-left
                         transition-transform duration-200 ease-out hover:translate-x-[5px]">
              <Icon name={s.icon} size={11} className="shrink-0" />
              <span className="truncate">{s.short || s.label}</span>
            </button>
          ))}
        </div>

        {/* 🔴 THE PAGE BLOCK IS A REAL 3D STAGE. No `overflow-hidden` on this element: it carries
            `preserve-3d`, and a clip here collapses every hinge back into a flat rotation in several
            engines. Clipping happens on each face instead, where it has no 3D children to flatten.
            `touch-pan-y` so a vertical scroll of the page behind still belongs to the browser while
            a horizontal drag belongs to the book. */}
        <div className="relative z-10 flex-1 min-w-0 select-none touch-pan-y"
             style={{ transformStyle: 'preserve-3d', perspective: '1500px' }}
             onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>

          {/* 🔴 THE PAPER BLOCK — the stack's thickness, drawn rather than built. Eighteen real
              sheets at 0.4px of Z each is seven pixels of edge nobody can read; two gradients are
              the same seven pixels at none of the cost. They also belong to the half they are the
              edge OF: the left set to the half that never moves, the right set inside the stack so
              it travels with the sheets. */}
          <span className="pointer-events-none absolute inset-y-[8px] -left-[5px] w-[6px] rounded-l-[3px]"
                style={{ background: EDGES }} />
          <span className="pointer-events-none absolute -bottom-[5px] left-[10px] right-1/2 h-[5px]"
                style={{ background: EDGES_H }} />

          {/* THE SHEETS. Hinged at the spine — the centre fold on a desk, the left edge on a phone.
              One element, one origin, both widths. */}
          <div ref={stackRef}
               className="absolute inset-y-0 left-0 w-full lg:left-1/2 lg:w-1/2"
               style={{ transformStyle: 'preserve-3d' }}>
            <span className="pointer-events-none absolute inset-y-[8px] -right-[5px] w-[6px] rounded-r-[3px]"
                  style={{ background: EDGES }} />
            <span className="pointer-events-none absolute -bottom-[5px] left-0 right-[10px] h-[5px]"
                  style={{ background: EDGES_H }} />

            {near.map(k => {
              const flipped = k < safeTurn;
              const front = leaves[k][0];
              const back = leaves[k][1];
              return (
                <div key={k}
                     ref={(el) => { if (el) leafEls.current[k] = el; else delete leafEls.current[k]; }}
                     className="absolute inset-0"
                     style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d',
                              /* A turning sheet is lifted so it cannot clip through the block below
                                 it — the one line of the reference that is not obvious on sight. */
                              zIndex: flipped ? k : leaves.length - k,
                              transform: `translateZ(${zOf(k, flipped)}px) rotateY(${flipped ? FLIP : 0}deg)`,
                              opacity: dim(flipped ? FLIP : 0),
                              willChange: 'transform' }}>
                  {/* FRONT — the right-hand page */}
                  <div className="absolute inset-0 rounded-r-[6px] overflow-hidden"
                       style={{ background: PAPER, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)' }}>
                    <div className="absolute inset-0 pointer-events-none z-10"
                         style={{ background: 'linear-gradient(90deg, rgba(0,0,0,.20) 0%, rgba(0,0,0,0) 16%, rgba(0,0,0,0) 86%, rgba(0,0,0,.10) 100%)' }} />
                    <span className="hidden lg:block absolute inset-y-6 left-0 w-[2px] bg-orange pointer-events-none z-10" />
                    {face(front)}
                  </div>
                  {/* BACK — the left-hand page of the next spread. Pre-rotated, and pushed a
                      hundredth of a pixel off its twin so the two faces cannot z-fight face-on. */}
                  <div className="absolute inset-0 rounded-l-[6px] overflow-hidden"
                       style={{ background: PAPER, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg) translateZ(0.01px)',
                                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)' }}>
                    <div className="absolute inset-0 pointer-events-none z-10"
                         style={{ background: 'linear-gradient(90deg, rgba(0,0,0,.12) 0%, rgba(0,0,0,0) 15%, rgba(0,0,0,0) 82%, rgba(0,0,0,.20) 100%)' }} />
                    {face(back)}
                  </div>
                </div>
              );
            })}

            {/* the light the closing cover takes off the pages underneath it */}
            <span ref={shadeFrontRef} className="absolute inset-0 pointer-events-none z-[60]"
                  style={{ background: 'linear-gradient(90deg, #000 0%, rgba(0,0,0,.55) 60%, rgba(0,0,0,.35) 100%)', opacity: 0 }} />
          </div>

          {/* 🔴 THE COVER, AND IT IS NOT A PAGE. It hinges on the same spine and carries only its own
              face: at 0° nothing faces you, so the spread underneath shows through; past 90° the
              leather is what you see, which is the closed book. Lifted 20px in Z so it paints over
              the sheets it is swinging onto, and it never takes a pointer — the drag belongs to the
              paper. Its gold spine sits on the element's RIGHT edge because a 180° turn puts that
              edge on the left of the screen, which is where a spine belongs. */}
          <div className="absolute inset-y-0 left-0 w-full lg:left-1/2 lg:w-1/2 pointer-events-none"
               style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}>
            <div ref={leafRef} className="absolute inset-0"
                 style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d', willChange: 'transform' }}>
              <div className="absolute inset-0 rounded-[6px] border border-accent-edge overflow-hidden"
                   style={{ background: LEATHER, transform: 'rotateY(180deg)', backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden' }}>
                <span className="absolute inset-y-5 right-[6px] w-[3px] rounded-full bg-orange" />
                <span ref={shadeBackRef} className="absolute inset-0 pointer-events-none z-20"
                      style={{ background: 'linear-gradient(270deg, rgba(0,0,0,.75) 0%, rgba(0,0,0,.25) 70%, rgba(0,0,0,0) 100%)', opacity: 0 }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <span className="h-16 w-16 rounded-2xl border border-accent-edge flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,.28)' }}>
                    <Icon name={section.icon} size={28} style={{ color: '#C98A2E' }} />
                  </span>
                  <span className="font-display text-[15px] font-black uppercase tracking-[0.34em]"
                        style={{ color: '#BFB29A' }}>Tutorial</span>
                  <span className="h-[3px] w-10 rounded-full bg-orange" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
