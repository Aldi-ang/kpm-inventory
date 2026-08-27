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
import { X, ChevronLeft, ChevronRight, Globe, Package, FileText, Truck, User, MapPin, Clock, Eye, Check, Lock } from 'lucide-react';
import { SECTIONS, getScene } from './registry.js';
import PonderOverlay from './PonderOverlay.jsx';
import { bookOpen, bookPage, bookPick, bookClose } from './sfx.js';

const ICONS = { Globe, Package, FileText, Truck, User, MapPin, Clock, Eye, Check };
const Icon = ({ name, ...rest }) => {
  const C = ICONS[name] || Globe;
  return <C {...rest} />;
};

const liteOn = () => typeof document !== 'undefined'
  && document.documentElement.classList.contains('lite-mode');
const reduced = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PER_PAGE = 4;
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

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

/* ── The closed book, as an object rather than an icon ───────────────────────────────────────── */
function BookGlyph() {
  return (
    <span className="relative block h-[26px] w-[34px] [perspective:640px]">
      <span className="absolute inset-y-[3px] left-[6px] right-[1px] rounded-r-[3px]" style={{ background: PAPER_2 }} />
      <span className="absolute inset-y-[6px] left-[7px] right-[4px] rounded-r-[2px]" style={{ background: PAPER }} />
      <span
        className="absolute inset-0 origin-left rounded-r-[4px] border border-accent-edge
                   transition-transform duration-300 ease-out
                   group-hover:[transform:rotateY(-54deg)] group-focus-visible:[transform:rotateY(-54deg)]"
        style={{ background: LEATHER }}>
        <span className="absolute left-[7px] right-[5px] top-[8px] h-[2px] rounded-full bg-orange" />
        <span className="absolute left-[7px] right-[9px] top-[13px] h-[2px] rounded-full" style={{ background: BOOK_DIM }} />
      </span>
      <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-[2px] bg-orange" />
    </span>
  );
}

/* ── The top-bar entry ────────────────────────────────────────────────────────────────────────
   Never opens itself. His rule, 2026-08-27: *"nope dont push newcomer towards the scene let them
   figure out by pressing the tutorial button"*. Nothing here remembers who has watched what. */
export default function PonderBookButton() {
  const [libOpen, setLibOpen] = useState(false);
  const [sceneId, setSceneId] = useState(null);
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
                   hover:border-accent-edge hover:text-accent-ink
                   active:scale-[0.97] transition-[transform,color,border-color] duration-150 ease-out"
      >
        <BookGlyph />
        <span className="hidden xl:inline font-mono text-[10px] uppercase tracking-widest">Tutorial</span>
      </button>

      {libOpen && (
        <Library
          anchorRef={chipRef}
          onClose={() => setLibOpen(false)}
          onPick={(id) => { bookPick(); setLibOpen(false); setSceneId(id); }}
        />
      )}

      <PonderOverlay
        sceneId={sceneId}
        open={!!sceneId}
        onClose={() => setSceneId(null)}
        onBack={() => { setSceneId(null); bookOpen(); setLibOpen(true); }}
      />
    </>
  );
}

/* ── The spread ───────────────────────────────────────────────────────────────────────────────── */
function Library({ anchorRef, onClose, onPick }) {
  const [secId, setSecId] = useState(SECTIONS[0].id);
  const [page, setPage] = useState(0);
  const bookRef = useRef(null);
  const scrimRef = useRef(null);
  const closingRef = useRef(false);

  const section = useMemo(() => SECTIONS.find(s => s.id === secId) || SECTIONS[0], [secId]);
  const pages = Math.max(1, Math.ceil(section.entries.length / PER_PAGE));
  const shownEntries = section.entries.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  /* THE ZOOM IS DRIVEN BY THE WEB ANIMATIONS API, and that choice is the whole reason it works.

     The first version flipped a state flag inside a requestAnimationFrame and let CSS transition
     from it. That frame got cancelled by its own effect cleanup and the book rendered at opacity 0
     — a completely invisible spread, with nothing thrown and every check green. `element.animate()`
     starts the moment it is called: there is no later frame to lose.

     The keyframes are computed from the chip's REAL rectangle, so the book grows out of the little
     book that was pressed and shrinks back into it. A fixed origin would have been three fewer
     lines and would have thrown the book at a corner that means nothing. */
  const flightFrom = useCallback(() => {
    const el = bookRef.current, chip = anchorRef?.current;
    if (!el || !chip) return null;
    const b = el.getBoundingClientRect(), a = chip.getBoundingClientRect();
    if (!b.width || !a.width) return null;
    /* A uniform scale, floored well above zero. Nothing in the real world appears out of nothing,
       and a book at scale(0.03) is a dot. */
    const s = Math.max(a.width / b.width, 0.11);
    const tx = (a.left + a.width / 2) - (b.left + b.width / 2);
    const ty = (a.top + a.height / 2) - (b.top + b.height / 2);
    return `translate(${Math.round(tx)}px, ${Math.round(ty)}px) scale(${s.toFixed(3)})`;
  }, [anchorRef]);

  const still = liteOn() || reduced();

  useLayoutEffect(() => {
    if (still) return;
    const el = bookRef.current;
    const from = flightFrom();
    if (!el || !from || typeof el.animate !== 'function') return;
    el.animate(
      [{ transform: `perspective(1800px) ${from} rotateY(-26deg)`, opacity: 0 },
       { transform: 'perspective(1800px) translate(0px, 0px) scale(1) rotateY(0deg)', opacity: 1 }],
      { duration: 460, easing: EASE, fill: 'both' },
    );
    scrimRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out', fill: 'both' });
  }, [still, flightFrom]);

  const shut = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    bookClose();
    if (liteOn() || reduced()) { onClose(); return; }
    const el = bookRef.current;
    const from = flightFrom();
    if (!el || !from || typeof el.animate !== 'function') { onClose(); return; }
    scrimRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'both' });
    const anim = el.animate(
      [{ transform: 'perspective(1800px) translate(0px, 0px) scale(1) rotateY(0deg)', opacity: 1 },
       { transform: `perspective(1800px) ${from} rotateY(-22deg)`, opacity: 0 }],
      { duration: 340, easing: EASE, fill: 'both' },
    );
    anim.onfinish = onClose;
    anim.oncancel = onClose;
  }, [onClose, flightFrom]);

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
    ? { background: PAPER, color: BOOK_INK, borderColor: 'var(--accent-edge)', transform: 'translateX(7px)' }
    : { background: LEATHER, color: '#B8AC96', borderColor: 'rgba(0,0,0,.5)' };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Tutorial book"
         onMouseDown={shut}
         className="fixed inset-0 z-[9000] flex items-center justify-center p-3 sm:p-6">

      <div ref={scrimRef} className="absolute inset-0 bg-[var(--duke-scrim-hi)] backdrop-blur-sm" />

      {/* THE BOOK ITSELF. Big on purpose — his words were *"so black and small"*, and a spread that
          does not take the screen is a dialog wearing a book costume. */}
      <div ref={bookRef} onMouseDown={(e) => e.stopPropagation()}
           style={{ background: LEATHER, transformOrigin: 'center center' }}
           className="relative w-[min(1240px,96vw)] h-[min(780px,88vh)] flex rounded-[14px] p-[10px]
                      border border-accent-edge
                      shadow-[0_2px_2px_rgba(0,0,0,0.35),0_40px_90px_-30px_rgba(0,0,0,0.95)]">

        {/* Tabs, cut into the cover's left edge like the reference book */}
        <div className="hidden lg:flex flex-col gap-1.5 w-[126px] shrink-0 pt-10 pr-[6px]">
          {SECTIONS.map(s => (
            <button key={s.id} type="button" onClick={() => pickSection(s.id)}
              style={tab(s)}
              className="flex items-center gap-2 h-9 pl-3 pr-2 rounded-l-md border border-r-0
                         font-mono text-[10px] uppercase tracking-widest text-left
                         transition-transform duration-200 ease-out hover:translate-x-[4px]">
              <Icon name={s.icon} size={12} className="shrink-0" />
              <span className="truncate">{s.short || s.label}</span>
            </button>
          ))}
        </div>

        {/* The page block: two cream pages, a fold that darkens toward the spine, and stacked
            edges on the outside so it reads as many sheets rather than one card. */}
        <div className="relative flex-1 min-w-0 rounded-[6px] overflow-hidden"
             style={{ background: PAPER, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.18)' }}>

          <div className="absolute inset-0 pointer-events-none"
               style={{ background:
                 'linear-gradient(90deg, rgba(0,0,0,.10) 0%, rgba(0,0,0,0) 7%, rgba(0,0,0,0) 43%, rgba(0,0,0,.16) 50%, rgba(0,0,0,0) 57%, rgba(0,0,0,0) 93%, rgba(0,0,0,.10) 100%)' }} />
          <span className="hidden lg:block absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-orange/60 pointer-events-none" />

          <div className="relative h-full flex flex-col lg:grid lg:grid-cols-2">

            {/* LEFT PAGE — the chapter opening itself */}
            <div key={`l-${section.id}`} className="hidden lg:flex flex-col justify-between p-9 animate-ponder-leaf">
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

            {/* RIGHT PAGE — the entries */}
            <div key={`r-${section.id}-${page}`} className="flex flex-col min-h-0 p-6 sm:p-9 animate-ponder-leaf">
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

              <div className="flex-1 min-h-0 overflow-y-auto mt-5 -mx-1 px-1">
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
                  {page + 1} / {pages}
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
        </div>
      </div>
    </div>,
    document.body,
  );
}
