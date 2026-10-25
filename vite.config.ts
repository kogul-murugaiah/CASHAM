import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['casham-logo.webp'],
      manifest: {
        name: 'CASHAM',
        short_name: 'CASHAM',
        description: 'A comprehensive wealth tracking and budget planning application.',
        theme_color: '#134e4a',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          {
            src: 'casham-logo.webp',
            sizes: '192x192',
            type: 'image/webp',
            purpose: 'any'
          },
          {
            src: 'casham-logo.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  appType: 'spa',
  define: {
    APP_VERSION: JSON.stringify(pkg.version),
    APP_BUILD_DATE: JSON.stringify(new Date().toISOString().split('T')[0]),
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['react-icons'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-xlsx': ['xlsx'],
        },
      },
    },
  },
});

