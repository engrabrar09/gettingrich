/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// GitHub Pages serves project sites from /<repo-name>/, so every asset URL needs
// that prefix. This MUST match the repository name or the deployed app 404s on
// every asset. Override with VITE_BASE when deploying elsewhere.
const base = process.env.VITE_BASE ?? '/gettingrich/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The analytics module is shared verbatim with Supabase Edge Functions.
      // See shared/analytics/README.md for the constraints that keeps it portable.
      '@analytics': fileURLToPath(new URL('./shared/analytics', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['shared/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
  },
})
