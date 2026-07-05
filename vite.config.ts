import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Lima — Farm Weather & Irrigation',
        short_name: 'Lima',
        description:
          'Weather-smart irrigation and planting decisions for smallholder farmers.',
        theme_color: '#2B1D14',
        background_color: '#FAF3E7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // The 3D scene is decorative and OFF by default — don't make
        // metered-data users pre-download ~800 KB for it. It is cached at
        // runtime on first use instead (see src/sw.ts).
        globIgnores: ['**/Hero3D-*.js'],
        maximumFileSizeToCacheInBytes: 3_000_000,
      },
    }),
  ],
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 1100,
  },
});
