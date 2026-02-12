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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.openai\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true, // Enable PWA in dev mode for testing
      },
    }),
  ],
  build: {
    // Performance Optimization: Code splitting to reduce bundle warnings
    // index.js was 708KB, AskOlivia.js was 541KB
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks - split large external dependencies
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase';
          }
          if (id.includes('node_modules/simli-client/')) {
            return 'simli';
          }
          if (id.includes('node_modules/stripe/')) {
            return 'stripe';
          }
          // Split large app modules into separate chunks
          if (id.includes('/services/llmEvaluators') || id.includes('/services/opusJudge')) {
            return 'llm-evaluators';
          }
          if (id.includes('/services/gammaService')) {
            return 'gamma-service';
          }
          if (id.includes('/data/') || id.includes('/shared/metrics')) {
            return 'app-data';
          }
        }
      }
    }
  },
})
