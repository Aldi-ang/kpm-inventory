import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp4,mp3}'],
        maximumFileSizeToCacheInBytes: 15000000 
      },
      manifest: {
        name: 'KPM System', // <--- CHANGED: This is what Windows actually reads!
        short_name: 'KPM', 
        description: 'Resident Evil styled offline inventory manager',
        theme_color: '#000000',
        background_color: '#0f0e0d',
        display: 'standalone', 
        orientation: 'portrait',
       icons: [
          {
            src: '/favicon.ico',   // <--- The native Windows icon
            sizes: 'any',          // Tells Windows it can scale it however it wants
            type: 'image/x-icon'   // Strict Windows icon format
          },
          {
            src: '/app-icon.png',  // Keep the PNGs for Android/Chrome internal UI
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/app-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
})