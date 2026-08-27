/* Build config for the Ponder lab ONLY. See tools/ponder-lab.jsx for why it exists.

   Deliberately NOT the app's vite.config.js: that one installs a service worker and a
   self-signed HTTPS certificate, both of which exist for testing on Aldi's phone and both of
   which would put this harness behind the same secure-context wall the app is already behind.
   Nothing here touches dist/ — it writes dist-ponderlab/, which is gitignored. */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-ponderlab',
    emptyOutDir: true,
    rollupOptions: { input: 'tools/ponder-lab.html' },
  },
});
