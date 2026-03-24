import { defineConfig } from 'vite'
import react      from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [tailwindcss(), react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'pieces/**/*.svg'],
    manifest: {
      name:             'Tamerlane Siege',
      short_name:       'Tamerlane',
      description:      'Play Timur Chess — the medieval chess variant with 112 squares, citadels, and multiple kings',
      theme_color:      '#1A1510',
      background_color: '#1A1510',
      display:          'standalone',
      start_url:        '/',
      icons: [
        {
          src:   'icon-192.svg',
          sizes: '192x192',
          type:  'image/svg+xml',
          purpose: 'any maskable',
        },
        {
          src:   'icon-512.svg',
          sizes: '512x512',
          type:  'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      runtimeCaching: [
        {
          // Cache piece SVGs — they never change at a given URL
          urlPattern: /\/pieces\//,
          handler:    'CacheFirst',
          options: {
            cacheName: 'pieces-cache',
            expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
          },
        },
        {
          // Cache other static assets
          urlPattern: /\/assets\//,
          handler:    'CacheFirst',
          options: {
            cacheName: 'assets-cache',
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
      ],
    },
  }), cloudflare()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})