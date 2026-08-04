/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// GitHub Pages serves project sites from /<repo-name>/, so every asset URL needs
// that prefix. This MUST match the repository name or the deployed app 404s on
// every asset. Override with VITE_BASE when deploying elsewhere.
const base = process.env.VITE_BASE ?? '/gettingrich/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // injectManifest, NOT generateSW: a generated worker cannot carry a
      // `push` handler, and push is the entire point of having one here.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      // Serves the worker in `vite dev` so push can be exercised locally
      // instead of only after a deploy.
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        name: 'Portfolio Tracker',
        short_name: 'Portfolio',
        description:
          'Track investments across equities, metals and crypto with technical analysis and alerts.',
        // Must match `base`, or iOS opens the site root instead of the app.
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f7f7f8',
        theme_color: '#2563eb',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            // Android crops icons to a circle; the maskable variant has the
            // padding to survive it.
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The analytics module is shared verbatim with Supabase Edge Functions.
      // See shared/analytics/types.ts for the constraints that keep it portable.
      '@analytics': fileURLToPath(new URL('./shared/analytics', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['shared/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
  },
})
