import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cluesintelligence.lifescore',
  appName: 'LIFE SCORE',
  webDir: 'dist',

  server: {
    // Load the live Vercel-hosted app instead of bundled files
    url: 'https://clueslifescore.com',
    cleartext: false,
  },

  android: {
    // Allow mixed content for any HTTP resources referenced by HTTPS pages
    allowMixedContent: false,
    // Override user agent to identify app traffic
    appendUserAgent: 'LifeScoreApp/1.0',
    // Background color while loading
    backgroundColor: '#0a0a0a',
  },
};

export default config;
