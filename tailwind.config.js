/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      /* Phase 3 — semantic colours backed by the CSS variables in
         src/styles/theme.css. Using these instead of `slate-*` is what removes
         the blue: `slate` is a blue-tinted grey (slate-900 is #0f172a, visibly
         navy), and it is used ~8.500 times across ~147 files. Migrate screen by
         screen in Phase 4; nothing breaks while both systems coexist. */
      colors: {
        ground:   'var(--ground)',
        sunk:     'var(--sunk)',
        panel:    'var(--panel)',
        raised:   'var(--raised)',
        inset:    'var(--inset)',
        line:     'var(--line)',
        'line-2': 'var(--line-2)',
        'line-3': 'var(--line-3)',
        ink: {
          DEFAULT:   'var(--ink)',
          muted:     'var(--ink-muted)',
          dim:       'var(--ink-dim)',
          disabled:  'var(--ink-disabled)',
          inverse:   'var(--ink-inverse)',
        },
        gold:     'var(--gold)',
        /* readable stand-ins for gold/red AS TEXT or AS A BORDER. --gold measures 1,19:1 on the
           light ground, so it may fill a plate but must never label one. */
        'accent-ink':  'var(--accent-ink)',
        'accent-edge': 'var(--accent-edge)',
        'danger-ink':  'var(--danger-ink)',
        'gold-ink': 'var(--gold-ink)',
        orange:   'var(--orange)',
        'orange-ink': 'var(--orange-ink)',
        danger: {
          DEFAULT:  'var(--danger)',
          text:     'var(--danger-text)',
          plate:    'var(--danger-plate)',
          'plate-ink': 'var(--danger-plate-ink)',
          rail:     'var(--danger-rail)',
          badge:    'var(--danger-badge)',
          well:     'var(--danger-well)',
        },
        verified: 'var(--verified)',
        'verified-fill': 'var(--verified-fill)',
        tier: {
          iron:   'var(--tier-iron)',
          steel:  'var(--tier-steel)',
          silver: 'var(--tier-silver)',
          gold:   'var(--tier-gold)',
          apex:   'var(--tier-apex)',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        body:    'var(--font-body)',
        mono:    'var(--font-mono)',
      },
      backgroundImage: {
        hatch:       'var(--hatch)',
        'hatch-gold':'var(--hatch-gold)',
        'grad-panel':'var(--grad-panel)',
        'grad-steel':'var(--grad-steel)',
        burn:        'var(--burn)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        /* The Ponder tutorial. Every one of these is transform+opacity only, and every one is
           allowed to arrive already finished: Lite Mode sets animation-duration to .001s, so the
           END state has to be the readable one. His call for Lite Mode, 2026-08-27: *"then snap
           the book and close it right back thats fine"*. */
        'ponder-in':    'ponderIn 260ms cubic-bezier(0.23,1,0.32,1) both',
        'ponder-ring':  'ponderRing 420ms cubic-bezier(0.23,1,0.32,1) both',
        'ponder-open':  'ponderOpen 460ms cubic-bezier(0.23,1,0.32,1) both',
        /* A new sheet arriving. NOT a flip — a flip is what the cover does; a page you turn TO
           slides into place. The two halves come out of the fold in opposite directions. */
        /* a spark leaving the pages on hover. Infinite, but only ever applied under group-hover —
           four looping animations in a top bar that is always on screen is a battery cost nobody
           asked for. Lite Mode collapses it to 0.001s, so it lands on its last keyframe and is
           simply not there, which is the correct fate for decoration. */
        'book-spark':     'bookSpark 1500ms linear infinite',
        'ponder-slide':   'ponderSlide 320ms cubic-bezier(0.23,1,0.32,1) both',
        'ponder-slide-l': 'ponderSlideL 320ms cubic-bezier(0.23,1,0.32,1) both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        /* a caption arriving beside the thing it points at */
        /* rises out of the page block and fades. The sideways wander is a per-spark custom property
           so one keyframe serves all four; scale never starts at 0, because nothing in this world
           appears out of nothing. */
        /* 🔴 `translateZ(14px)` IS IN BOTH TRANSFORM STOPS ON PURPOSE. The glyph is `preserve-3d`, so
           its children sort by depth rather than document order, and the cover swings its right half
           toward the viewer — at z=0 the sparks were simply behind it. The depth cannot live on the
           element, because this keyframe animates `transform` and would erase it on frame one, which
           is exactly the fault fixed in PonderOverlay this morning. */
        bookSpark: {
          '0%':   { opacity: '0', transform: 'translateZ(14px) translate(0, 0) scale(0.5)' },
          '18%':  { opacity: '1' },
          '70%':  { opacity: '0.85' },
          '100%': { opacity: '0', transform: 'translateZ(14px) translate(var(--spark-drift, 0px), -21px) scale(1)' },
        },
        ponderIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        /* the highlight landing on a column: settles onto it rather than blinking on.
           Never from scale(0) — nothing in the world appears out of nothing. */
        ponderRing: {
          '0%':   { opacity: '0', transform: 'scale(1.05)' },
          '55%':  { opacity: '1', transform: 'scale(0.995)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        /* the whole book arriving from the chip that opened it */
        ponderOpen: {
          '0%':   { opacity: '0', transform: 'translateY(10px) scale(0.94)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        /* a sheet settling into place, out of the fold */
        ponderSlide: {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        ponderSlideL: {
          '0%':   { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
      }
    },
  },
  plugins: [],
}