import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'logo-512.png'],
      manifest: false, // Use our custom manifest.json in public folder
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}', '**/logo-{192,512}.png', '**/maskable-*.png', '**/icon-*.png', '**/favicon*.png', '**/apple-touch-icon.png'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.openai\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // Supabase: never cache authenticated responses in service worker.
            // All Supabase data is user-specific; caching risks leaking data
            // between users on shared devices.
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: true, // Enable PWA in dev mode for testing
      },
    }),
  ],
  build: {
    // Phase 1 Performance Optimization (2026-02-02)
    // Removed chunkSizeWarningLimit to expose true bundle warnings
    // Added manualChunks for vendor code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - external dependencies (safe to split)
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
        }
      }
    }
  },
})
