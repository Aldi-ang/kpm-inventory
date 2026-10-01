/* Build config for the Ponder lab ONLY. See tools/ponder-lab.jsx for why it exists.

   Deliberately NOT the app's vite.config.js: that one installs a service worker and a
   self-signed HTTPS certificate, both of which exist for testing on Aldi's phone and both of
   which would put this harness behind the same secure-context wall the app is already behind.
   Nothing here touches dist/ — it writes dist-ponderlab/, which is gitignored. */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import tw from '../tailwind.config.js';

export default defineConfig({
  plugins: [react()],
  /* LAB ONLY: the app's Tailwind never scans tools/, so classes used only by the bell proposals
     (lab-bell.jsx) would not exist. Same plugins as postcss.config.js, one extra content path. */
  css: { postcss: { plugins: [tailwindcss({ ...tw, content: [...tw.content, './tools/lab-bell.jsx'] }), autoprefixer()] } },
  /* LAB ONLY. `?gudang` mounts the real branch warehouse screen, whose listener returns early
     without a masterUserId — so with no database it can only ever render its loading state. The
     stub serves fixtures through the real listener instead. dist/ is built by vite.config.js and
     never sees this. */
  resolve: {
    alias: [
      { find: 'firebase/firestore', replacement: fileURLToPath(new URL('./lab-firestore-stub.js', import.meta.url)) },
      /* `?shell` mounts the app shell, which imports `../config/firebase` for `auth`. That module
         boots Firebase on import and needs firestore factories the stub above does not have. */
      { find: /^(\.\.\/)+config\/firebase(\.js)?$/, replacement: fileURLToPath(new URL('./lab-firebase-stub.js', import.meta.url)) },
      /* `?shell&bell=a|b` — the two-part bell proposals in the real header (lab-bell.jsx). Only
         BiohazardTheme imports it as `./NotificationBell`; with no `bell=a|b` the real one renders. */
      { find: /^\.\/NotificationBell(\.jsx)?$/, replacement: fileURLToPath(new URL('./lab-bell.jsx', import.meta.url)) },
    ],
  },
  /* `npm run build` rewrites dist/ while the lab is up, and vite's watcher dies on the busy file
     (EBUSY on dist/kpm-final-logo.png, 2026-09-15). The lab never serves dist/. */
  server: { watch: { ignored: ['**/dist/**', '**/dist-ponderlab/**'] } },
  build: {
    outDir: 'dist-ponderlab',
    emptyOutDir: true,
    rollupOptions: { input: 'tools/ponder-lab.html' },
  },
});
