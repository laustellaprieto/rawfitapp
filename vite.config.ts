import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: { chunkSizeWarningLimit: 900 },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'RawFit · Kit de Seguimiento',
        short_name: 'RawFit',
        description:
          'Registra tus hábitos, medidas, fotos de progreso y entrenamientos. Todo se guarda en tu dispositivo. Por Stella Prieto (@rawfit.stella).',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#111111',
        theme_color: '#111111',
        categories: ['health', 'fitness', 'lifestyle'],
        shortcuts: [
          { name: 'Hábitos de hoy', short_name: 'Hoy', url: '/' },
          { name: 'Registrar entreno', short_name: 'Entreno', url: '/#entreno' },
          { name: 'Registrar medidas', short_name: 'Medidas', url: '/#progreso' },
        ],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
});
