import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * GitHub Pages does no SPA rewriting: a deep link like /Beezy_App/book is a
 * plain 404, and that is what a tester gets when they reopen the installed app
 * on any route but the root. Pages does serve 404.html for unmatched paths, so
 * shipping a copy of index.html under that name hands control to the client
 * router instead.
 */
function pagesSpaFallback(): Plugin {
  return {
    name: 'pages-spa-fallback',
    apply: 'build',
    closeBundle() {
      const dir = resolve('dist');
      copyFileSync(resolve(dir, 'index.html'), resolve(dir, '404.html'));
    },
  };
}

/**
 * GitHub Pages serves this repo at /Beezy_App/, so every asset URL, the
 * service worker scope, and the manifest start_url must carry that prefix.
 * Override with BASE_PATH=/ when serving from a custom domain later.
 */
const base = process.env.BASE_PATH ?? '/Beezy_App/';

/**
 * Surfaced in the UI so a tester reporting a bug can say which build they are
 * on. GITHUB_SHA is set by Actions; local builds fall back to 'dev'.
 */
const version = process.env.npm_package_version ?? '0.0.0';
const buildId = (process.env.GITHUB_SHA ?? 'dev').slice(0, 7);

const icon = (size: number, maskable = false) => ({
  src: `${base}icons/${maskable ? 'maskable' : 'icon'}-${size}.png`,
  sizes: `${size}x${size}`,
  type: 'image/png',
  ...(maskable ? { purpose: 'maskable' as const } : {}),
});

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    pagesSpaFallback(),
    react(),
    tailwind(),
    VitePWA({
      // 'prompt' rather than 'autoUpdate': testers get an explicit
      // "update available" affordance instead of silent stale caching.
      registerType: 'prompt',
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png', 'brand/**/*'],
      manifest: {
        id: base,
        name: 'Beezy Luxury Detailing',
        short_name: 'Beezy',
        description: 'Mobile luxury auto detailing in Greater New Orleans. Book, track, and manage your service.',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0A0A0A',
        theme_color: '#0A0A0A',
        categories: ['lifestyle', 'business', 'productivity'],
        icons: [
          icon(72), icon(96), icon(128), icon(144), icon(152),
          icon(192), icon(384), icon(512), icon(1024),
          icon(192, true), icon(512, true),
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}', 'brand/logo-*.png', 'icons/icon-{32,180,192}.png'],
        globIgnores: [
          // iOS loads splash screens from <link> tags at launch, outside the
          // service worker, so precaching them only inflates first install.
          'icons/splash-*.png',
          // Gallery photography is runtime-cached on demand (Phase 3).
          'brand/photos/**',
        ],
        cleanupOutdatedCaches: true,
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            // Portfolio photography: immutable once published, cache on first
            // view rather than paying for it during install.
            urlPattern: /\/brand\/photos\/.*\.webp$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'beezy-photos',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
