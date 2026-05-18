import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['casham logo.png'],
      manifest: {
        name: 'CASHAM',
        short_name: 'CASHAM',
        description: 'A comprehensive wealth tracking and budget planning application.',
        theme_color: '#134e4a',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          {
            src: 'casham logo.png',
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  appType: 'spa',
  build: {
    outDir: 'dist',
  },
});

