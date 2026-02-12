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
    // Performance: dynamic chunk splitting to reduce bundle warnings
    // index.js was 708KB, AskOlivia.js was 541KB
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks — split large external dependencies
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
          // App chunks — split large internal modules
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
