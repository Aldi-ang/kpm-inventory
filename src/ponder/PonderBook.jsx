/* THE BOOK — the tutorial index, living in the app's top bar.

   His ask, 2026-08-27: *"i want the tutorial book on the very top of the screen for every
   components, since we have a lot of space there ... make sure the book animation also open when
   hovered with all the effect and cool gaming animation then book open animation and zoom in to
   view the tutorial to choose from, and inside the book i want every section of this app tutorials
   to be put there"*, with a Minecraft dictionary-book spread as the reference.

   Three things that reference gets right and are copied here: **tabs that stick out of the left
   edge** so the sections are visible without opening anything; **a two-page spread**, so a chapter
   can introduce itself on one side while its contents sit on the other; and **page arrows that
   live in the bottom corners** where a thumb would be.

   What is NOT copied is its palette. That book is green on parchment; green is against the palette
   law here, so the spread is built from this app's own surfaces with a gold spine and a gold rule.
   Take the shape and the motion; never import the colours.

   LITE MODE. His call: *"for lite mode then snap the book and close it right back thats fine"*.
   Lite Mode already sets every transition to .001s, so the book snaps for free — the only thing
   this file does about it is skip the close DELAY, because a 260ms wait with no animation behind
   it is just a slow app. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/* ── The closed book, as an object rather than an icon ─────────────────────────────────────────
   A flat glyph would have been one line of code and it would not have been what he asked for. The
   cover is a real element hinged on the spine, so hovering lifts it and you see pages behind. It
   is transform + opacity only, so it costs nothing to animate and it arrives already open-or-shut
   in Lite Mode instead of freezing halfway. */
function BookGlyph({ tilt = false }) {
  return (
    <span className="relative block h-[26px] w-[34px] [perspective:640px]">
      <span className="absolute inset-y-[3px] left-[6px] right-[1px] rounded-r-[3px] bg-raised border border-line-2" />
      <span className="absolute inset-y-[6px] left-[7px] right-[4px] rounded-r-[2px] bg-panel" />
      <span
        className={`absolute inset-0 origin-left rounded-r-[4px] border border-accent-edge bg-panel
                    transition-transform duration-300 ease-out
                    ${tilt ? '[transform:rotateY(-54deg)]' : 'group-hover:[transform:rotateY(-54deg)] group-focus-visible:[transform:rotateY(-54deg)]'}`}>
        <span className="absolute left-[7px] right-[5px] top-[8px] h-[2px] rounded-full bg-orange/80" />
        <span className="absolute left-[7px] right-[9px] top-[13px] h-[2px] rounded-full bg-line-3" />
      </span>
      <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-[2px] bg-orange" />
    </span>
  );
}

/* ── The topbar entry ─────────────────────────────────────────────────────────────────────────
   Never opens itself. His rule for the whole tutorial system, 2026-08-27: *"nope dont push
   newcomer towards the scene let them figure out by pressing the tutorial button"*. Nothing here
   stores whether anyone has seen anything. */
export default function PonderBookButton() {
  const [libOpen, setLibOpen] = useState(false);
  const [sceneId, setSceneId] = useState(null);

  const openLib = useCallback(() => { bookOpen(); setLibOpen(true); }, []);

  return (
    <>
      <button
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
function Library({ onClose, onPick }) {
  const [secId, setSecId] = useState(SECTIONS[0].id);
  const [page, setPage] = useState(0);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);

  const section = useMemo(() => SECTIONS.find(s => s.id === secId) || SECTIONS[0], [secId]);
  const pages = Math.max(1, Math.ceil(section.entries.length / PER_PAGE));
  const shownEntries = section.entries.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const shut = useCallback(() => {
    bookClose();
    if (liteOn() || reduced()) { onClose(); return; }
    setClosing(true);
    closeTimer.current = setTimeout(onClose, 260);
  }, [onClose]);

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

  /* OPENING IS A KEYFRAME, CLOSING IS A TRANSITION, and that split is deliberate.

     The first version drove both directions off one state flipped inside a requestAnimationFrame.
     It worked most of the time and then rendered a fully invisible book — the rAF that was meant
     to flip it open got cancelled, nothing errored, and the whole spread sat at opacity 0. A
     keyframe cannot lose that race: it starts when the element mounts and always finishes.

     Closing still has to be a transition, because a keyframe with `fill: both` would outrank the
     inline style trying to reverse it. So the animation CLASS is dropped at the same moment the
     closing style is applied: the element falls back to its resting style and transitions from
     there. A half-open book that cannot be shut is worse than no animation at all. */
  const still = liteOn() || reduced();
  const openStyle = closing
    ? { transformOrigin: 'top right',
        transition: still ? 'none' : 'transform 260ms cubic-bezier(0.23,1,0.32,1), opacity 200ms ease-out',
        transform: 'translateY(14px) scale(0.93)', opacity: 0 }
    : { transformOrigin: 'top right' };

  return (
    <div role="dialog" aria-modal="true" aria-label="Tutorial book"
         onMouseDown={shut}
         className="fixed inset-0 z-[9000] flex items-center justify-center p-3 sm:p-6
                    bg-[var(--duke-scrim-hi)] backdrop-blur-sm">

      <div onMouseDown={(e) => e.stopPropagation()} style={openStyle}
           className={`relative w-full max-w-5xl max-h-[92vh] flex flex-col ${closing || still ? '' : 'animate-ponder-open'}`}>

        {/* Tabs stick OUT of the left edge on a desk, exactly as the reference book does, so the
            sections are readable before anything is opened. Under lg there is no room beside the
            book, so they become a scrolling row above it — the same list, not a smaller one. */}
        <div className="lg:hidden -mx-1 mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {SECTIONS.map(s => (
            <button key={s.id} type="button" onClick={() => pickSection(s.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border
                          font-mono text-[10px] uppercase tracking-widest whitespace-nowrap
                          active:scale-[0.97] transition-[transform,color,border-color,background-color] duration-150
                          ${s.id === secId ? 'border-accent-edge bg-raised text-accent-ink'
                                           : 'border-line-2 bg-panel text-ink-muted'}`}>
              <Icon name={s.icon} size={12} />
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-h-0 lg:flex">
          {/* In the FLOW, not absolutely positioned outside the book. Hanging them off the left
              edge put them under the window edge the moment the book reached its max width — at
              1280px they were sliced in half by the viewport. Tabs and book are one centred row. */}
          <div className="hidden lg:flex flex-col gap-1.5 w-[124px] shrink-0 pt-8">
            {SECTIONS.map(s => (
              <button key={s.id} type="button" onClick={() => pickSection(s.id)}
                className={`group/tab flex items-center gap-2 h-9 pl-3 pr-2 rounded-l-lg border border-r-0
                            font-mono text-[10px] uppercase tracking-widest text-left
                            transition-[transform,color,border-color,background-color] duration-200 ease-out
                            ${s.id === secId
                              ? 'border-accent-edge bg-raised text-accent-ink translate-x-[6px]'
                              : 'border-line-2 bg-panel text-ink-muted hover:translate-x-[3px] hover:text-ink'}`}>
                <Icon name={s.icon} size={12} className="shrink-0" />
                <span className="truncate">{s.short || s.label}</span>
              </button>
            ))}
          </div>

          {/* The book body. One gold spine down the middle on a desk; on a phone the right page
              is the only page, because a two-page spread at 375px is two unreadable columns. */}
          <div className="relative flex-1 min-w-0 h-full flex flex-col lg:grid lg:grid-cols-2 overflow-hidden
                          rounded-2xl lg:rounded-l-none border border-line-2 bg-panel
                          shadow-[0_1px_1px_rgba(0,0,0,0.20),0_28px_60px_-34px_rgba(0,0,0,0.9)]">

            {/* LEFT PAGE — the chapter opening itself */}
            <div key={`l-${section.id}`} className="hidden lg:flex flex-col justify-between p-7 border-r border-line-2 bg-raised animate-ponder-leaf">
              <div>
                <span className="h-12 w-12 rounded-xl bg-panel border border-line-2 flex items-center justify-center">
                  <Icon name={section.icon} size={22} className="text-accent-ink" />
                </span>
                <h2 className="font-display text-3xl font-black text-ink uppercase tracking-[0.12em] leading-none mt-4">{section.label}</h2>
                <div className="h-[3px] w-12 bg-orange rounded-full mt-3" />
                <p className="text-[13px] text-ink-muted leading-relaxed mt-4 max-w-[34ch]">{section.blurb}</p>

                <ul className="mt-7 space-y-2.5">
                  {section.entries.map((e, i) => (
                    <li key={i} className="flex items-baseline gap-2 text-[12px]">
                      <span className="font-mono text-ink-muted tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      <span className={`truncate ${e.soon ? 'text-ink-muted' : 'text-ink'}`}>{e.title}</span>
                      <span className="flex-1 border-b border-dotted border-line-2 translate-y-[-3px]" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{e.soon ? 'segera' : 'siap'}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                Bab {SECTIONS.indexOf(section) + 1} / {SECTIONS.length}
              </p>
            </div>

            {/* RIGHT PAGE — the entries */}
            <div key={`r-${section.id}-${page}`} className="flex flex-col min-h-0 p-5 sm:p-7 animate-ponder-leaf">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Panduan</p>
                  <h3 className="font-display text-xl font-black text-ink uppercase tracking-[0.12em] leading-none mt-1 lg:hidden">{section.label}</h3>
                </div>
                <button type="button" onClick={shut} aria-label="Close" title="Close"
                  className="shrink-0 h-9 w-9 rounded-lg border border-line-2 bg-raised text-ink-muted
                             hover:text-ink active:scale-[0.97] transition-[transform,color] duration-150 ease-out
                             inline-flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto mt-4 -mx-1 px-1">
                <div className="grid sm:grid-cols-2 gap-3">
                  {shownEntries.map((e, i) => {
                    const ready = !e.soon && !!getScene(e.sceneId);
                    return (
                      <button key={i} type="button" disabled={!ready}
                        onClick={() => ready && onPick(e.sceneId)}
                        className={`text-left p-4 rounded-xl border transition-[transform,border-color,background-color] duration-200 ease-out
                                    ${ready ? 'border-line-2 bg-raised hover:border-accent-edge hover:-translate-y-[2px] active:scale-[0.985] cursor-pointer'
                                            : 'border-line-2/60 bg-panel cursor-not-allowed'}`}>
                        <span className={`h-9 w-9 rounded-lg border flex items-center justify-center
                                          ${ready ? 'border-line-2 bg-panel' : 'border-line-2/60 bg-inset'}`}>
                          {ready ? <Icon name={e.icon} size={16} className="text-accent-ink" />
                                 : <Lock size={14} className="text-ink-muted" />}
                        </span>
                        <span className={`block font-display text-[15px] font-black uppercase tracking-wider mt-3 ${ready ? 'text-ink' : 'text-ink-muted'}`}>
                          {e.title}
                        </span>
                        <span className="block text-[12px] text-ink-muted leading-snug mt-1.5">{e.desc}</span>
                        {!ready && (
                          <span className="inline-block mt-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted border border-line-2 rounded px-1.5 py-0.5">
                            belum ditulis
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Page corners. Present even at one page, and disabled rather than hidden — a
                  control that vanishes teaches nothing about whether there is more. */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-line-2">
                <button type="button" disabled={page === 0}
                  onClick={() => { bookPage(); setPage(p => Math.max(0, p - 1)); }}
                  aria-label="Previous page"
                  className="h-9 w-9 rounded-lg border border-line-2 bg-raised text-ink-muted
                             disabled:opacity-40 disabled:cursor-not-allowed
                             hover:text-ink active:scale-[0.97] transition-[transform,color] duration-150 ease-out
                             inline-flex items-center justify-center">
                  <ChevronLeft size={16} />
                </button>
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted tabular-nums">
                  {page + 1} / {pages}
                </span>
                <button type="button" disabled={page >= pages - 1}
                  onClick={() => { bookPage(); setPage(p => Math.min(pages - 1, p + 1)); }}
                  aria-label="Next page"
                  className="h-9 w-9 rounded-lg border border-line-2 bg-raised text-ink-muted
                             disabled:opacity-40 disabled:cursor-not-allowed
                             hover:text-ink active:scale-[0.97] transition-[transform,color] duration-150 ease-out
                             inline-flex items-center justify-center">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* The spine. A 3px rule down the fold — the same gold rule this app uses everywhere,
                and the only gold surface on the book, because amber is an edge here and not a fill.
                It lives INSIDE the book because `left-1/2` has to mean the fold; outside it, it
                measured the tabs-plus-book row and landed in the middle of the left page. */}
            <span className="hidden lg:block pointer-events-none absolute inset-y-6 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-orange" />
          </div>
        </div>
      </div>
    </div>
  );
}
