import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  /* DEV ONLY — this never reaches a build. `npm run dev` now serves https://, because
     `crypto.subtle` (which hashes the master password) exists only in a SECURE CONTEXT:
     https, or localhost. Aldi's PC is localhost so it always worked; his phone reaches
     http://192.168.1.141:5173, which is neither, so login threw and — until 2026-08-10 —
     did so silently. This is the fix for testing on a real phone.

     The certificate is self-signed, so the phone shows a "not private" warning once and he
     taps through. That warning is expected and is not a problem with the app.
     To undo: delete the import, this comment and the `server` block. Nothing else depends
     on it, and production is unaffected — Vercel already serves https.

     📍 NEVER TRUST A WRITTEN-DOWN ADDRESS. The .141 above is what the router handed this PC
     in August 2026; it changed to .109 on 2026-08-19 and cost a test session. `host: true` makes
     vite print the real one as "Network:" every time `npm run dev` starts — read that line, or
     run `ipconfig`. */
  server: { https: true, host: true },
  plugins: [
    basicSsl(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      /* DEV ONLY — Aldi tests offline on a real phone, and `npm run dev` normally installs no
         service worker at all. That means nothing is stored for offline use on the dev server,
         every screen fails to download the moment signal drops, and an airplane-mode test there
         proves nothing about the built app. This makes the dev server behave like a real build.
         Turned on 2026-08-19 on his word: "sure so that i can test the offline mode".

         The cost, and it is real: the dev server now serves screens from that offline store, so
         after an edit the phone can show an OLD copy until it is reloaded twice, or until the
         tab is closed and reopened. If a change refuses to appear, that is this, not a bug.
         Production is unaffected — devOptions applies to the dev server only.
         To undo: delete this comment and the devOptions line. */
      devOptions: { enabled: true },
      workbox: {
        /* sprites/ only - the full-size masters in public/ are megabytes each and
           must never enter the precache. Add new art under sprites/, resized. */
        globPatterns: ['**/*.{js,css,html,ico}', 'sprites/*.png', 'sounds/*.mp3', 'coin-sprite.png']
      },
      manifest: {
        name: 'KPM Inventory by AK', // <--- CHANGED: Full name for PC/Installation prompts
        short_name: 'KPM by AK',     // <--- CHANGED: Shorter name for mobile home screens
        description: 'Resident Evil styled offline inventory manager',
        theme_color: '#000000',
        background_color: '#0f0e0d',
        display: 'standalone', 
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any' // <--- Tells Chrome to respect the transparent cut-out
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any' // <--- Removed 'maskable' so Android/PC doesn't force a background
          }
        ]
      }
    })
  ]
})