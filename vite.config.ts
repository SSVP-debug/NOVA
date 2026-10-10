import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

// Set VITE_BASE=/NOVA/ when hosting under a sub-path (for example GitHub Pages project sites). Default: site root.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  worker: { format: 'es', rollupOptions: { output: { entryFileNames: 'assets/ai-model-[hash].js' } } },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    // Offline-first: the whole app and the content packs are precached by the service worker.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,woff2}'],
        // The optional model engine is big: it is NOT saved with the app. It is saved the first time
        // the student downloads the model, so offline works afterwards.
        globIgnores: ['**/assets/ai-model-*.js'],
        maximumFileSizeToCacheInBytes: 40 * 1024 * 1024,
        runtimeCaching: [{
          urlPattern: ({ url }: { url: URL }) => /\/assets\/ai-model-[^/]+\.js$/.test(url.pathname) || /\/ort\/[^/]+$/.test(url.pathname),
          handler: 'CacheFirst',
          options: { cacheName: 'nova-model-engine', cacheableResponse: { statuses: [0, 200] } },
        }],
      },
      manifest: {
        name: 'NOVA - Your Personal Learning Twin',
        short_name: 'NOVA',
        description: 'An offline, on-device learning assistant that adapts to each student.',
        theme_color: '#0f766e',
        background_color: '#eef3f8',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
});
