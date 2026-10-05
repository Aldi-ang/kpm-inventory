import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { execSync } from 'node:child_process'

/* WHICH BUILD IS THIS? Aldi tests on a phone, and this app is a PWA that stores every chunk for
   offline use. A fix can be live on the server and absent on the device, and the two look
   identical from the outside - on 2026-08-20 that cost three rounds of "it is still broken" with
   no way to tell a real failure from a stale cache. The Flight Recorder now prints this, so he
   can read it out and we know in one message. */
const BUILD_ID = (() => {
    try { return execSync('git rev-parse --short HEAD').toString().trim(); }
    catch { return 'nogit'; }   // a build outside a checkout must still build
})();

/* 🔎 `--mode httpdev` SERVES PLAIN HTTP, AND IT IS FOR THE AGENT'S BROWSER ONLY.

   The https below is what lets Aldi test on a real phone, and it stays the default. But its
   certificate is self-signed, and the in-app browser will not click through a certificate warning
   the way a phone can - so every visual claim about this app had to be handed back to him to check
   by eye, which is the opposite of his standing rule: "if the browser is broken then fix it until u
   can see it".

   `http://localhost` is a SECURE CONTEXT by specification, exactly like https. So crypto.subtle
   still exists, the master password still hashes, and login still works - the whole reason https
   was turned on in the first place applies to the PHONE, which arrives on a LAN address, and not to
   localhost. Nothing about the app changes; only the transport to this one machine does.

   Start it with the `kpm-dev-http` entry in .claude/launch.json, on its own port so it can run
   beside the https server rather than fighting it for 5173. */
export default defineConfig(({ mode }) => {
const httpDev = mode === 'httpdev';
return {
  /* httpdev also points the app at the LOCAL FIREBASE EMULATOR, which is the other half of letting
     the agent see this app. It can reach the screens now, but it must not sign in with real
     credentials - so the only honest way past the login is a fake local account in a fake local
     database. firebase.js already reads VITE_USE_EMULATOR; this sets it for THIS MODE ONLY, so
     `npm run dev` still talks to the live project exactly as before and Aldi's phone testing is
     untouched. Requires `firebase emulators:start --only auth,firestore` to be running. */
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
    ...(httpDev ? { 'import.meta.env.VITE_USE_EMULATOR': JSON.stringify('true') } : {}),
  },
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
  /* HEAVY APP 5 (2026-09-30, his "it takes a while to load ... it started smoother after some time"). The main file
     was ONE 1.27 MB piece, and every push changed its name, so after every push the phone fetched and re-read all of
     it - Firebase and React included, which had not changed. Split into three: Firebase and React now keep the same
     file name from push to push (the name is a fingerprint of the content), so the phone keeps them and only the
     app's own code is new. Nothing is loaded later than before; the three load side by side at the first screen. */
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules[\\/](@firebase|firebase|idb)[\\/]/.test(id)) return 'firebase';
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
        },
      },
    },
  },
  /* the lab build (tools/ponder-lab.config.mjs) rewrites dist-ponderlab/ inside this tree, and `npm run build` rewrites
     dist/; watching them killed this dev server mid-session (EBUSY on dist-ponderlab/Bit_Capybara_Fortnite_Dance_Video.mp4,
     2026-10-05 07:19). The dev server serves neither */
  server: { https: !httpDev, host: true, watch: { ignored: ['**/dist/**', '**/dist-ponderlab/**'] } },
  plugins: [
    ...(httpDev ? [] : [basicSsl()]),
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
        globPatterns: ['**/*.{js,css,html,ico}', 'sprites/*.png', 'sounds/*.mp3', 'coin-sprite.png'],
        /* SIGN-IN MUST REACH FIREBASE (2026-10-01, his Samsung: "i press sign in it loads a little while and comeback
           to the sign in screen and not redirecting to google"). The offline helper answers every page navigation
           with the stored app, and sign-in starts by opening OUR /__/auth/handler (authDomain is this site, proxied
           to Firebase by vercel.json) - so the helper served the app instead of Firebase's handler and Google was
           never reached. /__/ is Firebase's; the helper must never answer it. */
        navigateFallbackDenylist: [/^\/__\//]
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
};
});
