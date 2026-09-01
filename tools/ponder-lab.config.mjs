/* Build config for the Ponder lab ONLY. See tools/ponder-lab.jsx for why it exists.

   Deliberately NOT the app's vite.config.js: that one installs a service worker and a
   self-signed HTTPS certificate, both of which exist for testing on Aldi's phone and both of
   which would put this harness behind the same secure-context wall the app is already behind.
   Nothing here touches dist/ — it writes dist-ponderlab/, which is gitignored. */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  /* LAB ONLY. `?gudang` mounts the real branch warehouse screen, whose listener returns early
     without a masterUserId — so with no database it can only ever render its loading state. The
     stub serves fixtures through the real listener instead. dist/ is built by vite.config.js and
     never sees this. */
  resolve: {
    alias: {
      'firebase/firestore': fileURLToPath(new URL('./lab-firestore-stub.js', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist-ponderlab',
    emptyOutDir: true,
    rollupOptions: { input: 'tools/ponder-lab.html' },
  },
});
