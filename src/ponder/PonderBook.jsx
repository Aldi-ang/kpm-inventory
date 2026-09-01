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
/* OPENS ON THE SECTION YOU ARE STANDING IN. His ask, 2026-08-27: *"i want the book when press is
   auto redirect to the features that we use right now for example im on the restock vault then it
   should redirect directly to the restock vault section of the book"*. This is the whole reason
   every section id in sections.js is an `activeTab` value and not a category someone invented. */
/* 🔴 `closeOnMount` IS HOW THE BOOK SHUTS AFTER A SCENE, and it works because `shut` below names
   BOTH ends of every animation it starts. The leaf goes OPEN → SHUT, the book FLAT → the chip, the
   slab SLAB_OPEN → SLAB_SHUT, all under `fill: 'both'` — so none of them need the opening sequence
   to have run first to know where they begin. Mounting straight into the close is therefore not a
   trick; it is the same close, entered from a book that was already open somewhere else.

   Aldi, 2026-08-31: *"i want the book shuts and fly to also happen when user close the ponder
   panel"*. Before this, picking a scene unmounted the Library on the spot, so the shut-and-fly it
   already owned only ever played if you closed the BOOK and never if you read something in it. */
function Library({ anchorRef, initialSection, onClose, onPick, closeOnMount = false }) {
  const [secId, setSecId] = useState(
    () => (SECTIONS.some(s => s.id === initialSection) ? initialSection : SECTIONS[0].id));
  const [page, setPage] = useState(0);
  const bookRef = useRef(null);
  const leafRef = useRef(null);   // the right half, hinged at the spine
  /* The two shading planes. A page turning away from the light DARKENS, and its far side brightens
     as it comes round — that one cue is most of the difference between a sheet of paper and a
     rotating rectangle, and its absence is what read as cheap. Refs rather than CSS, because they
     have to run on the leaf's clock. */
  const shadeFrontRef = useRef(null);
  const shadeBackRef = useRef(null);
  /* The cover slab. See the note where it is rendered — it is why a shut book looks shut. */
  const slabRef = useRef(null);
  const scrimRef = useRef(null);
  const closingRef = useRef(false);

  const section = useMemo(() => SECTIONS.find(s => s.id === secId) || SECTIONS[0], [secId]);
  /* 🔴 A PHONE GETS TWO CARDS TO A PAGE, NOT FOUR, AND IT TURNS THE PAGE INSTEAD OF SCROLLING.
     Aldi, 2026-09-01, from his iPhone: *"even the book cutted in half"*. Measured at 375x812: the
     card grid is one column below sm, so four cards ran to 680px and the page's content ended 30px
     BELOW the bottom of the screen — and on a real phone the browser bar takes more than that again.

     Scrolling inside the book is not the fix and never was: *"i dont want to see any of the scroll
     inside this book"*. A book that has run out of room turns the page, so the page count is what
     bends. Everything else — the ‹ 1/2 › control, the leaf, the shut — already works off `pages`. */
  const perPage = (typeof matchMedia === 'function' && !matchMedia('(min-width: 640px)').matches) ? 2 : PER_PAGE;
  const pages = Math.max(1, Math.ceil(section.entries.length / perPage));
  /* Clamped, because `page` is state and the section can change under it — a stale page 3 on a
     two-page section would render an empty spread rather than the last page. */
  const safePage = Math.min(page, pages - 1);
  const shownEntries = section.entries.slice(safePage * perPage, safePage * perPage + perPage);

  /* THE ZOOM IS DRIVEN BY THE WEB ANIMATIONS API, and that choice is the whole reason it works.

     The first version flipped a state flag inside a requestAnimationFrame and let CSS transition
     from it. That frame got cancelled by its own effect cleanup and the book rendered at opacity 0
     — a completely invisible spread, with nothing thrown and every check green. `element.animate()`
     starts the moment it is called: there is no later frame to lose.

     The keyframes are computed from the chip's REAL rectangle, so the book grows out of the little
     book that was pressed and shrinks back into it. A fixed origin would have been three fewer
     lines and would have thrown the book at a corner that means nothing. */
  /* 🔴 IT IS THE CLOSED BOOK THAT FLIES, NOT THE CONTAINER. When the cover is shut the visible
     book is only the left half plus the tab column — `SLAB_SHUT` below is the same measurement —
     so scaling the whole 1040px container onto the chip aimed the wrong rectangle and the book
     drifted sideways as it shrank. The maths maps the CLOSED book's centre onto the chip's centre,
     and it has to subtract where that centre lands after scaling about the container's middle. */
  const flightFrom = useCallback(() => {
    const el = bookRef.current, chip = anchorRef?.current;
    if (!el || !chip) return null;
    const b = el.getBoundingClientRect(), a = chip.getBoundingClientRect();
    if (!b.width || !a.width) return null;
    const closedW = b.width / 2 + 62;                 // must match SLAB_SHUT
    const s = Math.max(a.height / b.height, 0.03);    // height, because a closed book is portrait
    const dx = (closedW / 2) - (b.width / 2);         // closed centre, relative to container centre
    const tx = (a.left + a.width / 2) - (b.left + b.width / 2) - dx * s;
    const ty = (a.top + a.height / 2) - (b.top + b.height / 2);
    return `translate(${Math.round(tx)}px, ${Math.round(ty)}px) scale(${s.toFixed(3)})`;
  }, [anchorRef]);

  /* The leather starts six pixels into the ribbon column, so it has to follow the column's width
     when the phone narrows it — otherwise the cover sits 34px out and the ribbons stop reading as
     tabs cut into its edge. One number, two widths. */
  const narrow = typeof matchMedia === 'function' && !matchMedia('(min-width: 1024px)').matches;
  const coverLeft = narrow ? 82 : COVER_LEFT;

  const still = liteOn() || reduced();

  /* 🔴 IT HINGES AT THE SPINE. THE WHOLE BOOK DOES NOT TURN.

     Aldi, 2026-08-27: *"why did u flip the book like that ... it should flipped to the middle like
     how the book works not to the side like that, use book logic"*. He is right, and the previous
     version was not a small miss: it rotated the ENTIRE spread about its own centre, which is a
     card being turned over, not a book being closed. Nothing about it obeyed how a book works.

     A book closes because its right half swings LEFT about the spine and comes to rest on the left
     half. So the right page is its own hinged leaf with `transform-origin` at the spine, and it
     travels 0° → -180°. Past 90° its front face turns away and its BACK face — the front cover —
     is what you see, which is the closed book. The left half never moves, exactly as it does not
     on a desk.

     TWO ELEMENTS, TWO ANIMATIONS, ONE CLOCK. The leaf swings; the whole book flies. They are
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
      [{ transform: SHUT, offset: 0 },
       { transform: 'rotateY(3deg)', offset: 0.88 },
       { transform: OPEN, offset: 1 }],
      { duration: T.leafOpen, delay: T.leafOpenDelay, easing: HINGE, fill: 'both' },
    );
    shade(shadeFrontRef.current, [{ opacity: 0.62 }, { opacity: 0.62, offset: 0.35 }, { opacity: 0 }],
          T.leafOpen, T.leafOpenDelay);
    shade(shadeBackRef.current, [{ opacity: 0 }, { opacity: 0.55, offset: 0.55 }, { opacity: 0.75 }],
          T.leafOpen, T.leafOpenDelay);
    slabRef.current?.animate([{ clipPath: SLAB_SHUT }, { clipPath: SLAB_OPEN }],
      { duration: T.leafOpen, delay: T.leafOpenDelay, easing: HINGE, fill: 'both' });
    scrimRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out', fill: 'both' });
  }, [still, flightFrom]);

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
      [{ transform: OPEN }, { transform: SHUT }],
      { duration: T.leafShut, easing: HINGE, fill: 'both' },
    );
    shade(shadeFrontRef.current, [{ opacity: 0 }, { opacity: 0.62 }], T.leafShut, 0);
    shade(shadeBackRef.current, [{ opacity: 0.75 }, { opacity: 0 }], T.leafShut, 0);
    slabRef.current?.animate([{ clipPath: SLAB_OPEN }, { clipPath: SLAB_SHUT }],
      { duration: T.leafShut, easing: HINGE, fill: 'both' });
    /* ...and only once it is shut does it go back to the shelf. */
    const anim = el.animate(
      [{ transform: FLAT }, { transform: from }],
      { duration: T.flyOut, delay: T.flyOutDelay, easing: AWAY, fill: 'both' },
    );
    anim.onfinish = onClose;
    anim.oncancel = onClose;
  }, [onClose, flightFrom, closeOnMount]);

  /* Mounted purely to close. A layout effect rather than a plain one, so the shut starts in the
     same frame the spread is painted — a plain effect gives one frame of a book sitting open and
     doing nothing, which reads as a flicker rather than as a book being shut. */
  useLayoutEffect(() => { if (closeOnMount) shut(); }, [closeOnMount, shut]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') shut();
      if (e.key === 'ArrowRight' && page < pages - 1) { bookPage(); setPage(p => p + 1); }
      if (e.key === 'ArrowLeft' && page > 0) { bookPage(); setPage(p => p - 1); }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [shut, page, pages]);

  const pickSection = (id) => { if (id === secId) return; bookPage(); setSecId(id); setPage(0); };

  if (typeof document === 'undefined') return null;

  const tab = (s) => s.id === secId
    ? { background: 'linear-gradient(90deg, #FF8C1A 0%, #D98A2E 55%, #B9772A 100%)',
        color: '#241D16', transform: 'translateX(8px)' }
    : { background: 'linear-gradient(90deg, #4A3A2A 0%, #3A2E22 60%, #2E251B 100%)', color: '#C4B69C' };

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

        {/* 🔴 THE COVER IS ITS OWN ELEMENT SO IT CAN BE CLIPPED, and that is the difference between
            a book that looks shut and one that looks half-open. When the leaf swings closed it lands
            on the left half and VACATES the right half — but the cover used to be the container's
            own background, so the vacated half stayed on screen as a dark slab beside the closed
            book. Nothing about that read as a closed book.

            As a sibling it can be clipped to the left half in step with the leaf. Clipping a
            SIBLING is safe; clipping the container would have flattened `preserve-3d` and undone
            the hinge, which is the trap noted on the stage below. */}
        <span ref={slabRef} aria-hidden="true"
              style={{ background: LEATHER, clipPath: 'inset(0 0 0 0 round 14px)', left: coverLeft }}
              className="absolute inset-y-0 right-0 rounded-[14px] border border-accent-edge pointer-events-none
                         shadow-[0_2px_2px_rgba(0,0,0,0.35),0_40px_90px_-30px_rgba(0,0,0,0.95)]" />

        {/* Tabs, cut into the cover's left edge like the reference book */}
        {/* 🔴 RIBBONS, AND NO SCROLLING. His ask: *"the section also make it like book ribbons u
            know to make it more natural and make these section into one line with no scrollable so
            resize the spacing"*. A scrolling list of tabs is a sidebar wearing a book costume; a
            book has ribbons, and you can see all of them at once or they are not much use as
            bookmarks. Seventeen at 26px plus 2px of gap is 474px, which fits the shortest book this
            can be, so `overflow` is gone rather than hidden — there is nothing left to scroll. */}
        {/* 🔴 THE PHONE KEEPS THE RIBBONS. His report, 2026-09-01: *"i cant see the left book with
            all the section ribbons"*. They were `hidden lg:flex`, and on a phone that is not a
            cosmetic loss — the ‹ › control only turns pages WITHIN a section, so with the ribbons
            gone there was no way to reach another section at all. The left page stays hidden (two
            520px pages do not go into 375), so the ribbons take the place the left page would have
            had: 84px on a phone, the full 118 on a desk. */}
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

        {/* 🔴 THE PAGE BLOCK IS A REAL 3D STAGE NOW. No `overflow-hidden` on this element: it
            carries `preserve-3d`, and a clip here collapses the hinge back into a flat rotation in
            several engines — which is exactly the bug being fixed. Clipping happens on each face
            instead, where it has no 3D children to flatten. */}
        <div className="relative z-10 flex-1 min-w-0"
             style={{ transformStyle: 'preserve-3d', perspective: '1500px' }}>

          {/* 🔴 THE PAGE EDGES BELONG TO THE HALF THEY ARE THE EDGE OF. They used to be three spans
              pinned to the stage, so when the cover shut they stayed put — two cream strips hanging
              in the dark beside a closed book, which is what he saw: *"i dont want to see any of
              the scroll inside this book"*. They were never scrollbars; they were paper that forgot
              to move. The LEFT half keeps its own, and the right half's live inside the leaf below
              so they turn with it. Closed, the fore-edge ends up opposite the spine, which is where
              a fore-edge goes. */}
          <span className="pointer-events-none absolute inset-y-[8px] -left-[5px] w-[6px] rounded-l-[3px]"
                style={{ background: EDGES }} />
          <span className="pointer-events-none absolute -bottom-[5px] left-[10px] right-1/2 h-[5px]"
                style={{ background: EDGES_H }} />

          {/* THE LEFT HALF. It never moves — a book does not close by swinging both halves. */}
          <div className="absolute inset-y-0 left-0 hidden lg:block w-1/2 rounded-l-[6px]"
               style={{ background: PAPER, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)' }}>
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: 'linear-gradient(90deg, rgba(0,0,0,.12) 0%, rgba(0,0,0,0) 15%, rgba(0,0,0,0) 82%, rgba(0,0,0,.20) 100%)' }} />

            {/* LEFT PAGE — the chapter opening itself.
                🔴 KEYED ON THE SECTION AGAIN, but the motion is a SHEET SLIDING, not a 3D flip.
                His ask: *"replace that into book page paper slide instead"*. A flip is what the
                COVER does; a page you turn TO arrives by sliding into place. The two halves slide
                out of the fold in opposite directions, which is how paper settles when a spread
                opens.
                And the flicker this used to cause was never the keyframe — it was the whole book
                replaying on every render, fixed at module scope above. */}
            <div key={`l-${section.id}`} className="relative h-full flex flex-col justify-between p-9 animate-ponder-slide-l">
              <div>
                <span className="h-14 w-14 rounded-xl flex items-center justify-center border"
                      style={{ background: PAPER_2, borderColor: 'rgba(0,0,0,.16)' }}>
                  <Icon name={section.icon} size={26} style={{ color: '#8A5A12' }} />
                </span>
                <h2 className="font-display text-4xl font-black uppercase tracking-[0.1em] leading-none mt-5"
                    style={{ color: BOOK_INK }}>{section.label}</h2>
                <div className="h-[3px] w-14 bg-orange rounded-full mt-4" />
                <p className="text-[14px] leading-relaxed mt-5 max-w-[36ch]" style={{ color: BOOK_DIM }}>{section.blurb}</p>

                <ul className="mt-9 space-y-3">
                  {section.entries.map((e, i) => (
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
                Bab {SECTIONS.indexOf(section) + 1} / {SECTIONS.length}
              </p>
            </div>

          </div>

          {/* 🔴 THE RIGHT HALF, HINGED AT THE SPINE. `transform-origin` is the fold, so 0° → -180°
              lays this leaf exactly onto the left half — which is how a book closes. Past 90° its
              front face turns away and the cover on its back is what you see. The previous version
              rotated the WHOLE spread about its own centre, which is a card being turned over.
              A gold rule marks the fold, and it belongs to the leaf so it travels with it. */}
          <div ref={leafRef}
               className="absolute inset-y-0 left-0 w-full lg:left-1/2 lg:w-1/2"
               style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d', willChange: 'transform' }}>

            {/* this half's own paper, turning with it */}
            <span className="pointer-events-none absolute inset-y-[8px] -right-[5px] w-[6px] rounded-r-[3px]"
                  style={{ background: EDGES }} />
            <span className="pointer-events-none absolute -bottom-[5px] left-0 right-[10px] h-[5px]"
                  style={{ background: EDGES_H }} />

            {/* FRONT OF THE LEAF — the right page */}
            <div className="absolute inset-0 rounded-r-[6px] overflow-hidden"
                 style={{ background: PAPER, backfaceVisibility: 'hidden',
                          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)' }}>
              <div className="absolute inset-0 pointer-events-none"
                   style={{ background: 'linear-gradient(90deg, rgba(0,0,0,.20) 0%, rgba(0,0,0,0) 16%, rgba(0,0,0,0) 86%, rgba(0,0,0,.10) 100%)' }} />
              <span className="hidden lg:block absolute inset-y-6 left-0 w-[2px] bg-orange pointer-events-none" />
              {/* the light leaving this face as it turns away */}
              <span ref={shadeFrontRef} className="absolute inset-0 pointer-events-none z-20"
                    style={{ background: 'linear-gradient(90deg, #000 0%, rgba(0,0,0,.55) 60%, rgba(0,0,0,.35) 100%)', opacity: 0 }} />

            {/* Keyed on the section AND the page — both are a new sheet arriving. */}
            <div key={`r-${section.id}-${page}`} className="relative h-full flex flex-col min-h-0 p-6 sm:p-9 animate-ponder-slide">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: BOOK_DIM }}>Panduan</p>
                  <h3 className="font-display text-2xl font-black uppercase tracking-[0.1em] leading-none mt-1 lg:hidden"
                      style={{ color: BOOK_INK }}>{section.label}</h3>
                </div>
                <button type="button" onClick={shut} aria-label="Close" title="Close"
                  style={{ background: PAPER_2, color: BOOK_INK, borderColor: 'rgba(0,0,0,.2)' }}
                  className="shrink-0 h-9 w-9 rounded-lg border active:scale-[0.97]
                             transition-transform duration-150 ease-out inline-flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto mt-5 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="grid sm:grid-cols-2 gap-4">
                  {shownEntries.map((e, i) => {
                    const ready = !e.soon && !!getScene(e.sceneId);
                    return (
                      <button key={i} type="button" disabled={!ready}
                        onClick={() => ready && onPick(e.sceneId)}
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

              <div className="flex items-center justify-between pt-4 mt-4 border-t" style={{ borderColor: 'rgba(0,0,0,.16)' }}>
                <button type="button" disabled={page === 0}
                  onClick={() => { bookPage(); setPage(p => Math.max(0, p - 1)); }}
                  aria-label="Previous page"
                  style={{ background: PAPER_2, color: BOOK_INK, borderColor: 'rgba(0,0,0,.2)' }}
                  className="h-9 w-9 rounded-lg border disabled:opacity-35 disabled:cursor-not-allowed
                             active:scale-[0.97] transition-transform duration-150 ease-out inline-flex items-center justify-center">
                  <ChevronLeft size={16} />
                </button>
                <span className="font-mono text-[10px] uppercase tracking-widest tabular-nums" style={{ color: BOOK_DIM }}>
                  {safePage + 1} / {pages}
                </span>
                <button type="button" disabled={page >= pages - 1}
                  onClick={() => { bookPage(); setPage(p => Math.min(pages - 1, p + 1)); }}
                  aria-label="Next page"
                  style={{ background: PAPER_2, color: BOOK_INK, borderColor: 'rgba(0,0,0,.2)' }}
                  className="h-9 w-9 rounded-lg border disabled:opacity-35 disabled:cursor-not-allowed
                             active:scale-[0.97] transition-transform duration-150 ease-out inline-flex items-center justify-center">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            </div>

            {/* BACK OF THE LEAF — the front cover, and therefore the closed book. Its gold spine
                sits on the element's RIGHT edge because a 180° turn puts that edge on the left of
                the screen, which is where a spine belongs. */}
            <div className="absolute inset-0 rounded-[6px] border border-accent-edge overflow-hidden"
                 style={{ background: LEATHER, transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
              <span className="absolute inset-y-5 right-[6px] w-[3px] rounded-full bg-orange" />
              {/* and arriving on this one as it comes round */}
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
    </div>,
    document.body,
  );
}
