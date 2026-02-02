import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
