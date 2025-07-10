import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['explosion.svg'],
      manifest: {
        name: '💥 Stopwatch Timer 💥',
        short_name: '💥 Timer',
        description: 'An explosive countdown timer with dramatic sound effects',
        theme_color: '#ff4444',
        background_color: '#1e3c72',
        display: 'standalone',
        icons: [
          {
            src: 'explosion.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
})
