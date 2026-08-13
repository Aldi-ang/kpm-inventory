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
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}