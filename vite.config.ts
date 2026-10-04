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
        // Pre-cache only the app shell: index.html, core CSS, and critical vendor chunks.
        // Lazy-loaded tab chunks (Results, JudgeTab, AskOlivia, etc.) are cached on first
        // use via runtimeCaching below — NOT pre-cached on install.
        globPatterns: ['**/*.html', '**/index-*.js', '**/index-*.css', '**/react-vendor-*.js', '**/supabase-*.js', '**/app-data-*.js', '**/logo-{192,512}.png', '**/maskable-*.png', '**/icon-*.png', '**/favicon*.png', '**/apple-touch-icon.png'],
        runtimeCaching: [
          {
            // Lazy-loaded JS/CSS chunks: cache on first use (StaleWhileRevalidate)
            // so second visit loads instantly, but first visit only fetches what's needed.
            urlPattern: /\/assets\/.*\.(js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'lazy-chunks',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
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
    // Performance: split large dependencies and app modules into their own chunks
    // (index.js was 708KB, AskOlivia.js was 541KB).
    // Vite 8 bundles with Rolldown: `rollupOptions` became `rolldownOptions`, and the
    // deprecated `manualChunks` function became `codeSplitting.groups` (vite.dev/guide/migration,
    // 4 Oct 2026). Same chunk names, same order of precedence (higher priority wins), because
    // the PWA precache `globPatterns` above match them (react-vendor-*, supabase-*, app-data-*).
    // Each group also takes the modules its captured files import (Rolldown's default,
    // includeDependenciesRecursively: true), which Rolldown says avoids circular chunks.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // Vendor chunks — split large external dependencies
            {
              name: 'react-vendor',
              test: (id: string) => id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'),
              priority: 80,
            },
            { name: 'supabase', test: (id: string) => id.includes('node_modules/@supabase/'), priority: 70 },
            { name: 'simli', test: (id: string) => id.includes('node_modules/simli-client/'), priority: 60 },
            { name: 'stripe', test: (id: string) => id.includes('node_modules/stripe/'), priority: 50 },
            // Shared Supabase utilities (withRetry, etc.) — own chunk so console
            // errors don't misleadingly show as "gamma-service"
            { name: 'supabase-lib', test: (id: string) => id.includes('/lib/supabase'), priority: 40 },
            // App chunks — split large internal modules
            {
              name: 'llm-evaluators',
              test: (id: string) => id.includes('/services/llmEvaluators') || id.includes('/services/opusJudge'),
              priority: 30,
            },
            { name: 'gamma-service', test: (id: string) => id.includes('/services/gammaService'), priority: 20 },
            {
              name: 'app-data',
              test: (id: string) => id.includes('/data/') || id.includes('/shared/metrics'),
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
