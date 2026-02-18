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
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})